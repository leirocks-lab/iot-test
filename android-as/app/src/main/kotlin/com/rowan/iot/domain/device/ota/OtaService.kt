package com.rowan.iot.domain.device.ota

import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull

/**
 * One application-owned task workflow per authorized scope. Future native wiring must retain
 * this owner across RN/view lifetimes. Views pause observation; they do not cancel tasks.
 * No production permit issuer/registry/bridge is installed here. All permits default to absent.
 * pollOnce is a bounded read primitive; a future native scheduler controls observation ticks.
 */
class OtaService(
    private val repository: OtaRepository,
    private val currentScopeValid: () -> Boolean,
    private val currentEvidence: () -> OtaOnlineEvidence? = { null },
    private val startPermit: () -> OtaStartPermit? = { null },
    private val cancelPermit: () -> OtaCancelPermit? = { null },
    private val nowMillis: () -> Long = { System.nanoTime() / 1_000_000 },
    private val policy: OtaPolicy = OtaPolicy(),
) : AutoCloseable {
    private val operation = Mutex()
    private val monitor = Any()
    private val mutable = MutableStateFlow(OtaState())
    val state = mutable.asStateFlow()
    private var closed = false
    private var createLatched = false
    private var cancelLatched = false
    private var polls = 0
    private var lastPollAt: Long? = null
    private var offerGeneration = 0L
    private var startedOfferGeneration = -1L

    private fun update(change: (OtaState) -> OtaState) = synchronized(monitor) {
        if (!closed) mutable.value = change(mutable.value)
    }
    private fun expire() = update { OtaState(observing = false, sessionExpired = true, error = OtaError.SCOPE_CHANGED) }
    private fun scopeValid(): Boolean {
        if (synchronized(monitor) { closed || mutable.value.sessionExpired }) return false
        val valid = try { currentScopeValid() } catch (_: Exception) { false }
        if (!valid) expire()
        return valid
    }
    private suspend fun checkCurrent(): Boolean { currentCoroutineContext().ensureActive(); return scopeValid() }
    private fun revoked(error: Exception) = error is ApiFailure && error.code in setOf(401, 403, 499, 1491, 1492, 1501, 1502, 1511, 1513, 1521, 1522, 1531, 1532)
    private fun validId(id: String) = id.isNotBlank() && id != "." && id != ".." && id.none(Char::isISOControl)

    suspend fun loadCandidate(kind: OtaKind) = operation.withLock {
        if (!checkCurrent()) return@withLock
        update { it.copy(busy = true, error = null) }
        try {
            val candidate = withTimeoutOrNull(policy.requestTimeoutMillis) { repository.check(kind) } ?: throw Unconfirmed()
            if (!checkCurrent()) return@withLock
            if (candidate.kind != kind || candidate.device.id != repository.scope.resourceId || !validId(candidate.firmware.id) || candidate.firmware.version.isBlank())
                throw InvalidResponse()
            synchronized(monitor) { offerGeneration++ }
            update { it.copy(candidate = candidate, error = null) }
        } catch (error: CancellationException) { throw error }
        catch (error: Exception) {
            if (!scopeValid() || revoked(error)) expire()
            else update { it.copy(error = if (error is InvalidResponse) OtaError.INVALID_RESPONSE else OtaError.READ_FAILED) }
        } finally { update { it.copy(busy = false) } }
    }

    private fun startAllowed(offer: OtaOffer): Boolean {
        val permit = try { startPermit() } catch (_: Exception) { null } ?: return false
        val evidence = try { currentEvidence() } catch (_: Exception) { null } ?: return false
        return permit.scope == repository.scope && permit.kind == offer.kind && permit.firmwareId == offer.firmware.id &&
            permit.expiresAtMillis > nowMillis() && permit.evidence == evidence &&
            evidence.source == OtaEvidenceSource.REPORTED_CURRENT && evidence.online == true && !evidence.stale &&
            evidence.connectionEpoch > 0 && evidence.authorityRevision >= 0
    }
    suspend fun start() = operation.withLock {
        if (!checkCurrent()) return@withLock
        val initial = mutable.value
        val selected = initial.candidate
        if (selected == null) { update { it.copy(error = OtaError.NO_CANDIDATE) }; return@withLock }
        val freshAfterTerminal = initial.lastConfirmed?.terminal == true && synchronized(monitor) { offerGeneration > startedOfferGeneration }
        if (initial.task != null && !freshAfterTerminal || createLatched && !freshAfterTerminal || initial.resultUnknown) {
            update { it.copy(error = if (it.resultUnknown) OtaError.RESULT_UNKNOWN else OtaError.TASK_ALREADY_EXISTS) }; return@withLock
        }
        if (!startAllowed(selected)) { update { it.copy(error = OtaError.START_NOT_PERMITTED) }; return@withLock }
        currentCoroutineContext().ensureActive()
        if (!scopeValid()) return@withLock
        createLatched = true
        update { it.copy(busy = true, error = null) }
        try {
            val id = withTimeoutOrNull(policy.requestTimeoutMillis) { repository.start(selected.kind, selected.firmware.id) } ?: throw Unconfirmed()
            if (!scopeValid()) return@withLock
            if (!validId(id)) throw InvalidResponse()
            synchronized(monitor) { polls = 0; lastPollAt = null; startedOfferGeneration = offerGeneration; cancelLatched = false }
            // Publishing the created task is independent of observation lifecycle. A
            // pause/resume that happened during PUT remains authoritative at ACK time.
            update { it.copy(task = OtaTask(id, selected.kind, selected.firmware.id), lastConfirmed = null, resultUnknown = false, error = null) }
            currentCoroutineContext().ensureActive()
        } catch (error: CancellationException) {
            if (scopeValid()) update { it.copy(resultUnknown = true, error = OtaError.RESULT_UNKNOWN) }
            throw error
        } catch (error: Exception) {
            if (!scopeValid() || revoked(error)) expire()
            else {
                // Explicit pre-acceptance business rejection permits a fresh user attempt.
                // Uncertain transport/malformed ACK must never create another task.
                val rejected = error is ApiFailure && error.code in setOf(400, 1512, 1514, 1515, 1516)
                if (rejected) createLatched = false
                update { it.copy(resultUnknown = !rejected, error = if (rejected) OtaError.READ_FAILED else OtaError.RESULT_UNKNOWN) }
            }
        } finally { update { it.copy(busy = false) } }
    }

    suspend fun pollOnce() = operation.withLock {
        if (checkCurrent()) queryLocked(requireObserving = true)
    }
    /** Requires operation mutex. Every status GET, including cancel readback, shares this budget. */
    private suspend fun queryLocked(requireObserving: Boolean) {
        if (!checkCurrent()) return
        val initial = mutable.value
        val task = initial.task ?: return
        if (initial.lastConfirmed?.terminal == true || requireObserving && !initial.observing) return
        val allowed = synchronized(monitor) {
            val now = nowMillis()
            when {
                closed || mutable.value.sessionExpired -> false
                polls >= policy.maxPolls -> { mutable.value = mutable.value.copy(observing = false, resultUnknown = true, error = OtaError.POLL_LIMIT); false }
                lastPollAt?.let { now < it || now - it < policy.pollIntervalMillis } == true -> false
                else -> { polls++; lastPollAt = now; true }
            }
        }
        if (!allowed) return
        update { it.copy(busy = true, error = null) }
        try {
            val result = withTimeoutOrNull(policy.requestTimeoutMillis) { repository.query(task.taskId) } ?: throw Unconfirmed()
            if (!checkCurrent()) return
            val cancelUnconfirmed = cancelLatched && !result.terminal
            update { it.copy(lastConfirmed = result, resultUnknown = cancelUnconfirmed, observing = it.observing && !result.terminal,
                error = if (cancelUnconfirmed) OtaError.RESULT_UNKNOWN else null) }
        } catch (error: CancellationException) {
            if (scopeValid()) update { it.copy(resultUnknown = true, error = OtaError.RESULT_UNKNOWN) }
            throw error
        } catch (error: Exception) {
            if (!scopeValid() || revoked(error)) expire()
            else update { it.copy(resultUnknown = true, observing = it.observing && !(error is ApiFailure && error.code == 1533), error = OtaError.RESULT_UNKNOWN) }
        } finally { update { it.copy(busy = false) } }
    }

    suspend fun cancel() = operation.withLock {
        if (!checkCurrent()) return@withLock
        val current = mutable.value
        val task = current.task ?: return@withLock
        if (current.lastConfirmed?.terminal == true) return@withLock
        if (cancelLatched) { update { it.copy(error = OtaError.RESULT_UNKNOWN) }; return@withLock }
        val permit = try { cancelPermit() } catch (_: Exception) { null }
        if (permit == null || permit.scope != repository.scope || permit.taskId != task.taskId || permit.expiresAtMillis <= nowMillis()) {
            update { it.copy(error = OtaError.CANCEL_NOT_PERMITTED) }; return@withLock
        }
        currentCoroutineContext().ensureActive()
        if (!scopeValid()) return@withLock
        cancelLatched = true
        update { it.copy(busy = true, error = null) }
        try {
            withTimeoutOrNull(policy.requestTimeoutMillis) { repository.cancel(task.taskId); true } ?: throw Unconfirmed()
            if (!checkCurrent()) return@withLock
            // DELETE ACK is only a cancellation request. Until OTA-05 says terminal,
            // retain the previous confirmed result and never repeat this DELETE.
            update { it.copy(resultUnknown = true, error = OtaError.RESULT_UNKNOWN) }
            queryLocked(requireObserving = false)
        } catch (error: CancellationException) {
            if (scopeValid()) update { it.copy(resultUnknown = true, error = OtaError.RESULT_UNKNOWN) }
            throw error
        } catch (error: Exception) {
            if (!scopeValid() || revoked(error)) expire()
            else update { it.copy(resultUnknown = true, error = OtaError.RESULT_UNKNOWN) }
        } finally { update { it.copy(busy = false) } }
    }

    fun stopObserving() = update { it.copy(observing = false) }
    fun resumeObserving() = synchronized(monitor) {
        if (!closed && !mutable.value.sessionExpired && mutable.value.lastConfirmed?.terminal != true) {
            if (!mutable.value.observing) polls = 0 // Explicit new observation window, never a task retry.
            mutable.value = mutable.value.copy(observing = true)
        }
    }
    override fun close() = synchronized(monitor) {
        if (!closed) {
            val pending = mutable.value.busy && (createLatched || cancelLatched)
            closed = true
            mutable.value = mutable.value.copy(observing = false, busy = false,
                resultUnknown = mutable.value.resultUnknown || pending,
                error = if (pending) OtaError.RESULT_UNKNOWN else mutable.value.error)
        }
    }
    private class Unconfirmed : Exception()
    private class InvalidResponse : Exception()
}

package com.rowan.iot.domain.device.ota

import com.rowan.iot.domain.network.ApiFailure
import java.net.SocketTimeoutException
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

/** Fake repositories/permits only: never creates or cancels a real OTA task. */
class OtaServiceTest {
    private class Repository : OtaRepository {
        override val scope = OtaScope(7, "http-resource", "native-user")
        val calls = mutableListOf<String>()
        var offer = OtaOffer(OtaKind.MCU, OtaFirmware("firmware", "1.2.3", "Public fixture note"), OtaDevice("http-resource", "Fixture", "fixture-mac"))
        var result = OtaResult.UPDATING
        var checkHook: suspend () -> Unit = {}
        var startHook: suspend () -> String = { "task" }
        var queryHook: suspend () -> Unit = {}
        var cancelHook: suspend () -> Unit = {}
        override suspend fun check(kind: OtaKind): OtaOffer { calls += "CHECK:${kind.wire}"; checkHook(); return offer.copy(kind = kind) }
        override suspend fun start(kind: OtaKind, firmwareId: String): String { calls += "START:${kind.wire}:$firmwareId"; return startHook() }
        override suspend fun query(taskId: String): OtaResult { calls += "QUERY:$taskId"; queryHook(); return result }
        override suspend fun cancel(taskId: String) { calls += "CANCEL:$taskId"; cancelHook() }
    }
    private class Fixture(policy: OtaPolicy = OtaPolicy()) {
        val repo = Repository()
        var now = 0L
        var current = true
        var evidence = OtaOnlineEvidence(OtaEvidenceSource.REPORTED_CURRENT, true, false, 4, 12)
        var startPermit: OtaStartPermit? = null
        var cancelPermit: OtaCancelPermit? = null
        val service = OtaService(repo, currentScopeValid = { current }, currentEvidence = { evidence },
            startPermit = { startPermit }, cancelPermit = { cancelPermit }, nowMillis = { now }, policy = policy)
        fun grantStart() { startPermit = OtaStartPermit(repo.scope, repo.offer.kind, repo.offer.firmware.id, evidence, now + 10_000) }
        fun grantCancel() { cancelPermit = OtaCancelPermit(repo.scope, "task", now + 10_000) }
        suspend fun started() { service.loadCandidate(OtaKind.MCU); grantStart(); service.start() }
        suspend fun updating() { started(); service.pollOnce() }
        fun count(prefix: String) = repo.calls.count { it.startsWith(prefix) }
    }

    @Test fun noProductionStartPermitMeansNoTaskPublication() = runBlocking {
        val f = Fixture(); f.service.loadCandidate(OtaKind.MCU); f.service.start()
        assertEquals(0, f.count("START")); assertNull(f.service.state.value.task); assertNotNull(f.service.state.value.error)
    }
    @Test fun startRequiresAnExplicitLoadedFirmwareCandidate() = runBlocking {
        val f = Fixture(); f.grantStart(); f.service.start()
        assertEquals(0, f.count("START")); assertNull(f.service.state.value.task)
    }
    @Test fun validNativeGrantCreatesOnlyTheSelectedCandidateAndDoesNotInventDeviceSuccess() = runBlocking {
        val f = Fixture(); f.started()
        assertEquals(listOf("CHECK:mcu", "START:mcu:firmware"), f.repo.calls)
        assertEquals("task", f.service.state.value.task?.taskId)
        assertNull(f.service.state.value.lastConfirmed)
        assertFalse(f.service.state.value.resultUnknown)
    }
    @Test fun aKnownActiveTaskCannotBeCreatedTwice() = runBlocking {
        val f = Fixture(); f.started(); f.service.start(); f.service.resumeObserving(); f.service.start()
        assertEquals(1, f.count("START")); assertEquals("task", f.service.state.value.task?.taskId)
    }
    @Test fun expiredWrongAccountAndWrongFirmwareGrantsCannotStart() = runBlocking {
        for (kind in 0..3) {
            val f = Fixture(); f.service.loadCandidate(OtaKind.MCU); f.grantStart()
            val p = f.startPermit!!
            f.startPermit = when (kind) {
                0 -> p.copy(expiresAtMillis = f.now)
                1 -> p.copy(scope = OtaScope(8, "http-resource", "another-user"))
                2 -> p.copy(firmwareId = "unselected-firmware")
                else -> p.copy(kind = OtaKind.WIFI)
            }
            f.service.start(); assertEquals(0, f.count("START"))
        }
    }
    @Test fun unknownOfflineStaleStaticOrSupersededOnlineEvidenceCannotAuthorizeStart() = runBlocking {
        for (variant in 0..6) {
            val f = Fixture(); f.service.loadCandidate(OtaKind.MCU)
            f.evidence = when (variant) {
                0 -> f.evidence.copy(online = null)
                1 -> f.evidence.copy(online = false)
                2 -> f.evidence.copy(stale = true)
                3 -> f.evidence.copy(source = OtaEvidenceSource.DEVICE_METADATA)
                4 -> f.evidence.copy(connectionEpoch = 0)
                else -> f.evidence
            }
            f.grantStart()
            if (variant == 5) f.evidence = f.evidence.copy(connectionEpoch = 5)
            if (variant == 6) f.evidence = f.evidence.copy(authorityRevision = 13)
            f.service.start(); assertEquals(0, f.count("START"))
        }
    }
    @Test fun unknownCreateResultNeverRecreatesTheTaskOnRetryOrResume() = runBlocking {
        val f = Fixture(); f.service.loadCandidate(OtaKind.MCU); f.grantStart()
        f.repo.startHook = { throw SocketTimeoutException() }
        f.service.start(); f.service.stopObserving(); f.service.resumeObserving(); f.service.start(); f.service.pollOnce()
        assertTrue(f.service.state.value.resultUnknown); assertNull(f.service.state.value.task)
        assertEquals(1, f.count("START")); assertEquals(0, f.count("QUERY")); assertEquals(0, f.count("CANCEL"))
    }
    @Test fun cancellationAfterCreateDispatchCannotCauseMutationReplay() = runBlocking {
        withTimeout(5000) {
            val f = Fixture(); f.service.loadCandidate(OtaKind.MCU); f.grantStart()
            val entered = CompletableDeferred<Unit>(); val complete = CompletableDeferred<Unit>()
            f.repo.startHook = { entered.complete(Unit); withContext(NonCancellable) { complete.await() }; "task" }
            val creating = launch { f.service.start() }
            entered.await(); creating.cancel(); complete.complete(Unit); creating.join()
            f.service.resumeObserving(); f.service.start()
            assertEquals(1, f.count("START")); assertEquals(0, f.count("CANCEL"))
            assertNull(f.service.state.value.lastConfirmed)
        }
    }
    @Test fun statusPollsAreAtLeastThreeSecondsApart() = runBlocking {
        val f = Fixture(); f.started(); f.service.pollOnce(); f.now = 2999; f.service.pollOnce()
        assertEquals(1, f.count("QUERY")); f.now = 3000; f.service.pollOnce(); assertEquals(2, f.count("QUERY"))
    }
    @Test fun pollingPolicyCannotSpecifyAnUnboundedOrSubThreeSecondLoop() {
        assertTrue(runCatching { OtaPolicy(pollIntervalMillis = 2999) }.isFailure)
        assertTrue(runCatching { OtaPolicy(maxPolls = 0) }.isFailure)
    }
    @Test fun everyDeclaredTerminalResultStopsFurtherPollingWithoutDelete() = runBlocking {
        for (result in listOf(OtaResult.SUCCESS, OtaResult.FAILED, OtaResult.CANCELLED)) {
            val f = Fixture(); f.repo.result = result; f.started(); f.service.pollOnce()
            f.now = 6000; f.service.resumeObserving(); f.service.pollOnce()
            assertEquals(result, f.service.state.value.lastConfirmed)
            assertEquals(1, f.count("QUERY")); assertEquals(0, f.count("CANCEL"))
        }
    }
    @Test fun backgroundOrLeavingStopsObservationWithoutCancellingOrForgettingTheTask() = runBlocking {
        val f = Fixture(); f.updating(); f.service.stopObserving(); f.now = 3000; f.service.pollOnce()
        assertEquals(1, f.count("QUERY")); assertEquals("task", f.service.state.value.task?.taskId)
        f.service.resumeObserving(); f.service.pollOnce(); assertEquals(2, f.count("QUERY"))
        f.service.close(); f.now = 6000; f.service.pollOnce()
        assertEquals(2, f.count("QUERY")); assertEquals(0, f.count("CANCEL")); assertEquals(1, f.count("START"))
    }
    @Test fun concurrentPollingHasOnlyOneRequestInFlight() = runBlocking {
        withTimeout(5000) {
            val f = Fixture(); f.started(); val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
            f.repo.queryHook = { entered.complete(Unit); finish.await() }
            val first = async { f.service.pollOnce() }; entered.await()
            val second = async(start = CoroutineStart.UNDISPATCHED) { f.service.pollOnce() }
            assertEquals(1, f.count("QUERY")); finish.complete(Unit); first.await(); second.await()
            assertEquals(1, f.count("QUERY"))
        }
    }
    @Test fun pollFailureKeepsTheLastConfirmedResultAndCanOnlyRetryTheRead() = runBlocking {
        val f = Fixture(); f.updating(); f.now = 3000; f.repo.queryHook = { throw SocketTimeoutException() }; f.service.pollOnce()
        assertEquals(OtaResult.UPDATING, f.service.state.value.lastConfirmed); assertTrue(f.service.state.value.resultUnknown)
        f.repo.queryHook = {}; f.now = 6000; f.service.pollOnce()
        assertEquals(OtaResult.UPDATING, f.service.state.value.lastConfirmed); assertFalse(f.service.state.value.resultUnknown)
        assertEquals(1, f.count("START")); assertEquals(0, f.count("CANCEL"))
    }
    @Test fun aBoundedPollWindowNeverRestartsOrCancelsTheTaskWhenExhausted() = runBlocking {
        val f = Fixture(OtaPolicy(maxPolls = 2)); f.started(); f.service.pollOnce(); f.now = 3000; f.service.pollOnce(); f.now = 6000; f.service.pollOnce()
        assertEquals(2, f.count("QUERY")); assertEquals(1, f.count("START")); assertEquals(0, f.count("CANCEL"))
        assertEquals(OtaResult.UPDATING, f.service.state.value.lastConfirmed)
        assertTrue(f.service.state.value.resultUnknown); assertFalse(f.service.state.value.observing)
    }
    @Test fun updatingWithMissingExpiredOrWrongScopeCancellationGrantDoesNotSendDelete() = runBlocking {
        for (variant in 0..3) {
            val f = Fixture(); f.updating()
            if (variant != 0) {
                f.grantCancel()
                f.cancelPermit = when (variant) {
                    1 -> f.cancelPermit!!.copy(expiresAtMillis = f.now)
                    2 -> f.cancelPermit!!.copy(taskId = "another-task")
                    else -> f.cancelPermit!!.copy(scope = OtaScope(8, "http-resource", "another-user"))
                }
            }
            f.service.cancel()
            assertEquals(0, f.count("CANCEL")); assertEquals(OtaResult.UPDATING, f.service.state.value.lastConfirmed)
            assertNotNull(f.service.state.value.error)
        }
    }
    @Test fun explicitlyPermittedCancellationMustBeConfirmedByTheResultEndpoint() = runBlocking {
        val f = Fixture(); f.updating(); f.grantCancel(); f.now = 3000; f.repo.result = OtaResult.CANCELLED
        f.service.cancel()
        assertEquals(listOf("CANCEL:task", "QUERY:task"), f.repo.calls.takeLast(2))
        assertEquals(OtaResult.CANCELLED, f.service.state.value.lastConfirmed)
        f.now = 6000; f.service.pollOnce(); assertEquals(2, f.count("QUERY"))
    }
    @Test fun cancelAcknowledgementWithUpdatingReadbackIsNotDeviceCancellationOrPermissionToReplay() = runBlocking {
        val f = Fixture(); f.updating(); f.grantCancel(); f.now = 3000; f.service.cancel(); f.now = 6000; f.service.cancel()
        assertEquals(1, f.count("CANCEL")); assertEquals(OtaResult.UPDATING, f.service.state.value.lastConfirmed)
        assertTrue(f.service.state.value.resultUnknown)
    }
    @Test fun cancelTaskMissingOrTransportUnknownNeverAppearsCancelledAndIsNotReplayed() = runBlocking {
        for (error in listOf(ApiFailure(1523, "fixture task missing"), SocketTimeoutException())) {
            val f = Fixture(); f.updating(); f.grantCancel(); f.repo.cancelHook = { throw error }; f.now = 3000
            f.service.cancel(); f.service.stopObserving(); f.service.resumeObserving(); f.service.cancel()
            assertEquals(1, f.count("CANCEL")); assertEquals(OtaResult.UPDATING, f.service.state.value.lastConfirmed)
            assertNotNull(f.service.state.value.error)
        }
    }
    @Test fun lateOldAccountOrRevokedScopeCannotPublishOrDispatchAnyMoreRequests() = runBlocking {
        for (variant in 0..2) {
            withTimeout(5000) {
                val f = Fixture(); f.updating(); val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
                f.repo.result = OtaResult.SUCCESS
                f.repo.queryHook = {
                    entered.complete(Unit); withContext(NonCancellable) { finish.await() }
                    if (variant == 1) throw ApiFailure(403, "fixture scope revoked")
                    if (variant == 2) throw ApiFailure(1532, "fixture device unbound")
                }
                f.now = 3000; val late = async { f.service.pollOnce() }; entered.await()
                if (variant == 0) f.current = false
                finish.complete(Unit); late.await()
                val calls = f.repo.calls.size
                f.service.resumeObserving(); f.service.pollOnce(); f.service.start(); f.service.cancel()
                assertTrue(f.service.state.value.sessionExpired); assertNull(f.service.state.value.task)
                assertEquals(calls, f.repo.calls.size)
            }
        }
    }

    @Test fun createAcknowledgementCannotResumeObservationPausedWhileStartWasInFlight() = runBlocking {
        withTimeout(5000) {
            val f = Fixture()
            f.service.loadCandidate(OtaKind.MCU)
            f.grantStart()
            val entered = CompletableDeferred<Unit>()
            val finish = CompletableDeferred<Unit>()
            f.repo.startHook = { entered.complete(Unit); finish.await(); "task" }
            val creating = async(start = CoroutineStart.UNDISPATCHED) { f.service.start() }
            try {
                entered.await()
                f.service.stopObserving()
                assertFalse(f.service.state.value.observing)
            } finally { finish.complete(Unit) }
            creating.await()

            assertEquals("The native owner must still retain the confirmed created task", "task", f.service.state.value.task?.taskId)
            assertFalse("A delayed create ACK cannot reverse a later lifecycle pause", f.service.state.value.observing)
            f.now = 3000
            f.service.pollOnce()
            assertEquals(1, f.count("START"))
            assertEquals(0, f.count("QUERY"))
            assertEquals(0, f.count("CANCEL"))
        }
    }
}

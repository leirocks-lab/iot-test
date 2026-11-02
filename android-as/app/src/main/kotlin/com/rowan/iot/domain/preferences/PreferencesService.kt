package com.rowan.iot.domain.preferences

import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withTimeoutOrNull

data class PreferencesState(
    val preferences: UserPreferences? = null,
    val busy: Boolean = false,
    val resultUnknown: Boolean = false,
    val sessionExpired: Boolean = false,
    val error: String? = null,
)

/** Shared by every page bound to one native account revision. No account/HTTP lock nesting. */
class PreferencesTransactionGate {
    internal val operation=Mutex()
    internal var resultUnknown=false // Access only while holding operation, through actual I/O completion.
}

/**
 * One account-bound preferences workflow. No tokens or second login state. The native
 * account owner injects the atomic persistence/publication boundary. This service's
 * confirmed result describes stored settings, never proof that a UI language/theme
 * has already been applied by either host or RN.
 */
class PreferencesService(
    private val repository: PreferencesRepository,
    private val currentAccountValid: () -> Boolean,
    private val commitSettings: suspend (expectedRevision: Long, rawJson: String, expectedSettingsPublication: Long) -> Unit,
    private val timeoutMillis: Long = 20_000,
    private val transactionGate: PreferencesTransactionGate = PreferencesTransactionGate(),
    private val settingsPublication: () -> Long = { 0 },
) {
    init { require(timeoutMillis > 0) }
    private val operation get()=transactionGate.operation
    private val mutable = MutableStateFlow(PreferencesState())
    val state = mutable.asStateFlow()

    suspend fun load() = execute(null)
    suspend fun save(patch: PreferencesPatch) = execute(patch)

    private fun expire() {
        mutable.value = PreferencesState(sessionExpired = true, error = "登录会话已变化，请重新进入")
    }
    private suspend fun checkCurrent(): Boolean {
        currentCoroutineContext().ensureActive()
        if (currentAccountValid()) return true
        expire()
        return false
    }

    private suspend fun execute(patch: PreferencesPatch?) {
        // A queued caller's cancellation owns no state and must not cancel/mark the
        // operation currently holding this mutex. No publication occurs before lock.
        operation.lock()
        var dispatched = false
        var acknowledged = false
        var sharedStateCaptured=false
        try {
            if (!checkCurrent()) return
            val publication=settingsPublication()
            // Page state is a projection; only the shared permit owns unknown authority.
            mutable.value=mutable.value.copy(resultUnknown=transactionGate.resultUnknown)
            sharedStateCaptured=true
            if (patch != null) {
                if (mutable.value.preferences == null || mutable.value.resultUnknown) {
                    mutable.value = mutable.value.copy(error = "请先读取设置并核对上次操作结果")
                    return
                }
                patch.toJson() // Validate before a mutation can be dispatched.
            }
            mutable.value = mutable.value.copy(busy = true, error = null)
            val confirmed = withTimeoutOrNull(timeoutMillis) {
                if (patch != null) {
                    if (!checkCurrent()) return@withTimeoutOrNull null
                    dispatched = true
                    repository.patch(patch)
                    acknowledged = true
                    if (!checkCurrent()) return@withTimeoutOrNull null
                }
                val actual = repository.load()
                if (!checkCurrent()) return@withTimeoutOrNull null
                if (patch != null && !patch.matches(actual)) throw PreferencesReadbackUnknown()
                commitSettings(repository.expectedRevision, actual.rawJson, publication)
                if (!checkCurrent()) return@withTimeoutOrNull null
                actual
            }
            if (!currentAccountValid()) { expire(); return }
            if (confirmed == null) {
                mutable.value = mutable.value.copy(busy = false, resultUnknown = dispatched || mutable.value.resultUnknown,
                    error = if (dispatched) "设置结果未确认，请读取核对；不会自动重复提交" else "读取设置超时，请重试")
            } else {
                mutable.value = PreferencesState(preferences = confirmed)
            }
        } catch (error: CancellationException) {
            if (!currentAccountValid()) expire()
            else mutable.value = mutable.value.copy(busy = false, resultUnknown = dispatched || mutable.value.resultUnknown,
                error = if (dispatched) "设置结果未确认，请读取核对；不会自动重复提交" else "读取已取消，可重试")
            throw error
        } catch (error: Exception) {
            if (!currentAccountValid() || error is ApiFailure && error.code == 499) expire()
            else {
                // An explicit pre-acceptance rejection is distinct from a transport
                // unknown. After ACK even an error on GET/commit is an unknown save.
                val rejected = !acknowledged && error is ApiFailure && error.code in 400..499 && error.code != 408
                val unknown = mutable.value.resultUnknown || dispatched && !rejected
                mutable.value = mutable.value.copy(busy = false, resultUnknown = unknown,
                    error = when {
                        unknown -> "设置结果未确认，请读取核对；不会自动重复提交"
                        error is ApiFailure && error.code == 400 -> "设置选项无效"
                        error is ApiFailure && error.code in setOf(401, 403) -> "设置访问权限已失效，请重新进入"
                        else -> "设置操作失败，请重试；已保留最近确认值"
                    })
            }
        } finally {
            if (mutable.value.busy) mutable.value = mutable.value.copy(busy = false)
            if(sharedStateCaptured)transactionGate.resultUnknown=mutable.value.resultUnknown
            operation.unlock()
        }
    }
    private class PreferencesReadbackUnknown : Exception()
}

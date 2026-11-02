package com.rowan.iot.domain.device.state

import kotlinx.coroutines.flow.StateFlow

/** LIVE means a valid requested cloud Shadow snapshot, never proof of physical device online. */
enum class DeviceReadPhase { AUTHORIZING, CONNECTING, READING, LIVE, RECOVERING, FORBIDDEN, UNAVAILABLE }
enum class DeviceReadFailure { AUTHORIZATION, CONFIGURATION, CONNECTION, INITIALIZATION_TIMEOUT, SNAPSHOT_TIMEOUT, PROTOCOL }
enum class DeviceReadCloseReason { NO_ACCOUNT, ACCOUNT_CHANGED, RELEASED, OWNER_CLOSED, DUPLICATE_OBSERVER }

data class DeviceReadMetadata(val title: String, val productId: String, val category: String, val bindingRole: String?)

/** Immutable merged read view. No token, endpoint, user identity, prepared connection or credential. */
data class DeviceReadSnapshot(
    val accountRevision: Long,
    val resourceId: String,
    val authorityRevision: Long,
    val connectionEpoch: Long? = null,
    val metadata: DeviceReadMetadata? = null,
    val reportedJson: String = "{}",
    val online: Boolean? = null,
    val phase: DeviceReadPhase = DeviceReadPhase.AUTHORIZING,
    val stale: Boolean = false,
    val snapshotAvailable: Boolean = false,
    val failure: DeviceReadFailure? = null,
)

sealed interface DeviceObservationState {
    data class Current(val snapshot: DeviceReadSnapshot) : DeviceObservationState
    data class Closed(val reason: DeviceReadCloseReason) : DeviceObservationState
}

interface DeviceReadHandle : AutoCloseable {
    val state: StateFlow<DeviceObservationState>
    /** Pure current snapshot; closed/old-account observers cannot recover cached private state. */
    fun getSnapshot(): DeviceReadSnapshot
    /** Re-authorize in native scope. Does not grant commands or replay any publication. */
    fun retry()
    override fun close()
}

/** Local bounded-work policy, not MQTT wire fields or advertised device response timing. */
data class DeviceReadPolicy(
    val mailboxCapacity: Int = 32,
    val pendingMessageCapacity: Int = 32,
    val initializationTimeoutMillis: Long = 30_000,
    val snapshotTimeoutMillis: Long = 10_000,
) {
    init {
        require(mailboxCapacity > 0 && pendingMessageCapacity > 0)
        require(initializationTimeoutMillis > 0 && snapshotTimeoutMillis > 0)
    }
}

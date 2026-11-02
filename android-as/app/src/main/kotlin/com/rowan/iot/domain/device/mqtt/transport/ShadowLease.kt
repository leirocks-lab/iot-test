package com.rowan.iot.domain.device.mqtt.transport

import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flow

enum class ReadyReason { INITIAL, RECONNECTED, CREDENTIALS_RENEWED, KEY_MIGRATED, BUFFER_RECOVERY }
sealed interface LeaseState {
    data object Connecting : LeaseState
    data object Subscribing : LeaseState
    data class Recovering(val kind: BrokerFailureKind) : LeaseState
    /** Only the transport and four subscriptions are ready. Owner must create a fresh reducer and get. */
    data class Ready(val epoch: Long, val key: BrokerKey, val reason: ReadyReason) : LeaseState
    data class Failed(val kind: BrokerFailureKind) : LeaseState
    data object Closed : LeaseState
}

data class BrokerMessage(val epoch: Long, val topic: String, val payload: ByteArray)

interface ShadowLease : AutoCloseable {
    val resource: LeaseResource
    val observerID: String
    val state: StateFlow<LeaseState>
    /** One concurrent consumer; cancellation of collection does not release this lease. */
    val messages: Flow<BrokerMessage>
    suspend fun get(expectedEpoch: Long)
    suspend fun update(expectedEpoch: Long, payload: ByteArray)
    /** Explicit credential/authorization recovery only. Never replays a previous publication. */
    fun retry()
    override fun close()
}

internal class PoolLease(
    private val owner: SharedBrokerPool,
    override val resource: LeaseResource,
    override val observerID: String,
    capacity: Int,
) : ShadowLease {
    internal val mutableState = MutableStateFlow<LeaseState>(LeaseState.Connecting)
    override val state = mutableState.asStateFlow()
    internal val queue = Channel<BrokerMessage>(capacity)
    private val collecting = AtomicBoolean()
    internal val released = AtomicBoolean()
    override val messages: Flow<BrokerMessage> = flow {
        check(collecting.compareAndSet(false, true)) { "A lease supports one concurrent message consumer" }
        try { for (message in queue) emit(message) } finally { collecting.set(false) }
    }
    override suspend fun get(expectedEpoch: Long) = owner.publish(this, expectedEpoch, false, byteArrayOf())
    override suspend fun update(expectedEpoch: Long, payload: ByteArray) = owner.publish(this, expectedEpoch, true, payload)
    override fun retry() { if (!released.get()) owner.retry(this) }
    override fun close() { if (released.compareAndSet(false, true)) owner.release(this) }
    internal fun discardBuffered() { while (queue.tryReceive().isSuccess) { /* all old-epoch messages are invalid */ } }
    internal fun closed() {
        released.set(true); discardBuffered(); mutableState.value = LeaseState.Closed; queue.close()
    }
}

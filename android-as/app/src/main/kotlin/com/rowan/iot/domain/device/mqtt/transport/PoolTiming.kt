package com.rowan.iot.domain.device.mqtt.transport

import kotlinx.coroutines.delay
import kotlinx.coroutines.yield

interface PoolTiming {
    fun nowEpochMillis(): Long
    suspend fun pause(millis: Long)
}

object SystemPoolTiming : PoolTiming {
    override fun nowEpochMillis() = System.currentTimeMillis()
    override suspend fun pause(millis: Long) { if (millis > 0) delay(millis) else yield() }
}

/** Local engineering policy, not service TTL units, device latency targets, or a firmware contract. */
data class PoolPolicy(
    val messageCapacity: Int = 64,
    val maxPayloadBytes: Int = 128 * 1024,
    val renewBeforeMillis: Long = 30_000,
    val reconnectMinMillis: Long = 1_000,
    val reconnectMaxMillis: Long = 30_000,
    val maxReconnectAttempts: Int = 5,
    val operationTimeoutMillis: Long = 10_000,
    val credentialTimeoutMillis: Long = 15_000,
) {
    init {
        require(messageCapacity > 0 && maxPayloadBytes > 0 && renewBeforeMillis >= 0)
        require(reconnectMinMillis > 0 && reconnectMaxMillis >= reconnectMinMillis && maxReconnectAttempts >= 0)
        require(operationTimeoutMillis > 0 && credentialTimeoutMillis > 0)
    }
    internal fun retryDelay(attempt: Int): Long {
        var result = reconnectMinMillis
        repeat((attempt - 1).coerceIn(0, 30)) { result = if (result >= reconnectMaxMillis / 2) reconnectMaxMillis else result * 2 }
        return result.coerceAtMost(reconnectMaxMillis)
    }
}

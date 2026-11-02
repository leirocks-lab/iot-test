package com.rowan.iot.domain.device.mqtt.transport

import java.net.URI
import java.util.Locale

/** Public connection identity, separate from the exact signed handshake URI. */
class BrokerKey(
    val accountRevision: Long,
    authority: String,
    val path: String,
    val serverClientID: String,
) {
    val authority: String = canonicalAuthority(authority)
    init {
        require(accountRevision >= 0 && path.startsWith('/') && path.none { it in "?#\u0000" }) { "Invalid broker identity" }
        require(serverClientID.isNotBlank() && '\u0000' !in serverClientID) { "Invalid server client identity" }
    }
    override fun equals(other: Any?) = other is BrokerKey && accountRevision == other.accountRevision &&
        authority == other.authority && path == other.path && serverClientID == other.serverClientID
    override fun hashCode() = 31 * (31 * (31 * accountRevision.hashCode() + authority.hashCode()) + path.hashCode()) + serverClientID.hashCode()
    override fun toString() = "BrokerKey(revision=$accountRevision, authority=$authority, path=$path, clientID=<redacted>)"
}

internal fun canonicalAuthority(authority: String): String {
    val uri = try { URI("wss://$authority") } catch (_: Exception) { throw BrokerFailure(BrokerFailureKind.CONFIGURATION) }
    require(uri.host != null && uri.rawUserInfo == null && uri.rawQuery == null && uri.rawFragment == null && uri.rawPath.isNullOrEmpty()) { "Invalid broker authority" }
    val port = if (uri.port == -1) 443 else uri.port
    require(port in 1..65535) { "Invalid broker port" }
    val host = uri.host.lowercase(Locale.ROOT).let { if (':' in it && !it.startsWith('[')) "[$it]" else it }
    return "$host:$port"
}

/** No generated toString/copy/component functions may accidentally disclose credentials. */
class BrokerOptions(
    val key: BrokerKey,
    val signedWssUri: String,
    val connectUsername: String?,
    val connectPassword: String?,
    val expiresAtEpochMillis: Long?,
) {
    init {
        val uri = try { URI(signedWssUri) } catch (_: Exception) { throw BrokerFailure(BrokerFailureKind.CONFIGURATION) }
        require(uri.scheme.equals("wss", ignoreCase = true) && uri.rawAuthority != null && uri.rawUserInfo == null && uri.rawFragment == null) { "Invalid broker handshake" }
        require(canonicalAuthority(uri.rawAuthority) == key.authority && (uri.rawPath.takeUnless { it.isNullOrEmpty() } ?: "/") == key.path) { "Broker handshake identity mismatch" }
        require(expiresAtEpochMillis == null || expiresAtEpochMillis > 0) { "Expiry must be an explicitly decoded epoch millisecond value" }
    }
    override fun toString() = "BrokerOptions(<redacted>)"
}

data class LeaseResource(val accountRevision: Long, val resourceID: String, val thingRef: String) {
    init {
        require(accountRevision >= 0 && resourceID.isNotBlank()) { "Invalid lease resource" }
        require(thingRef.isNotBlank() && thingRef.none { it in "/+#\u0000" }) { "Invalid literal thing reference" }
    }
    internal val responseTopics: Set<String> get() = setOf("get/accepted", "get/rejected", "update/accepted", "update/rejected")
        .map { "\$aws/things/$thingRef/shadow/$it" }.toSet()
    internal fun publication(operation: String) = "\$aws/things/$thingRef/shadow/$operation"
}

enum class BrokerFailureKind {
    UNAVAILABLE, TIMEOUT, AUTHORIZATION, SUBSCRIPTION_DENIED, CONFIGURATION,
    EXPIRED_CREDENTIALS, STALE_CONTEXT, DUPLICATE_OBSERVER, CLOSED, UNKNOWN_RESULT,
}

/** Adapters translate SDK failures to this finite, sanitized vocabulary; never include a raw signed URL. */
class BrokerFailure(val kind: BrokerFailureKind) : Exception("MQTT operation: ${kind.name}") {
    internal val transient: Boolean get() = kind == BrokerFailureKind.UNAVAILABLE || kind == BrokerFailureKind.TIMEOUT
}

interface BrokerListener {
    fun message(topic: String, payload: ByteArray)
    fun disconnected(failure: BrokerFailure)
}

fun interface BrokerTransportFactory {
    /** Pure construction. Networking starts only in connect, after the pool has installed ownership. */
    fun create(options: BrokerOptions, listener: BrokerListener): BrokerPort
}

interface BrokerPort {
    /** Completion means CONNACK. All methods must cooperate with cancellation and return sanitized failures. */
    suspend fun connect()
    /** Complete only after every requested topic receives a successful SUBACK; denial must be explicit. */
    suspend fun subscribe(exactTopics: Set<String>)
    suspend fun unsubscribe(exactTopics: Set<String>)
    /** Completion means PUBACK only, not device execution. No SDK offline queue or automatic command replay. */
    suspend fun publish(topic: String, payload: ByteArray, qos: Int, retain: Boolean)
    /** Immediate local teardown; implementations must not block the caller on a remote acknowledgement. */
    fun close()
}

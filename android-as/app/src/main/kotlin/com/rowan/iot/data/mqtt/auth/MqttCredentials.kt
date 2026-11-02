package com.rowan.iot.data.mqtt.auth

import java.net.URI
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.GregorianCalendar
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

enum class MqttCredentialErrorCode {
    INVALID_RESPONSE, INVALID_TARGET, CONFLICTING_TARGET, INVALID_SESSION_TOKEN, INVALID_EXPIRY,
    UNTRUSTED_TARGET, UNSUPPORTED_STS_TARGET, INVALID_TIME, EXPIRED, INVALID_LIFETIME, SIGNING_FAILED,
}

/** Fixed messages and no underlying parser/provider cause: failures never echo credential input. */
class MqttCredentialFailure(val code: MqttCredentialErrorCode) : Exception(when (code) {
    MqttCredentialErrorCode.INVALID_RESPONSE -> "MQTT连接参数格式无效"
    MqttCredentialErrorCode.INVALID_TARGET -> "MQTT安全连接目标格式无效"
    MqttCredentialErrorCode.CONFLICTING_TARGET -> "MQTT连接目标字段不一致"
    MqttCredentialErrorCode.INVALID_SESSION_TOKEN -> "MQTT临时认证参数无效"
    MqttCredentialErrorCode.INVALID_EXPIRY -> "MQTT有效期与显式编码不一致"
    MqttCredentialErrorCode.UNTRUSTED_TARGET -> "MQTT连接目标未经信任策略授权"
    MqttCredentialErrorCode.UNSUPPORTED_STS_TARGET -> "MQTT临时认证目标不受支持"
    MqttCredentialErrorCode.INVALID_TIME -> "MQTT签名时间无效"
    MqttCredentialErrorCode.EXPIRED -> "MQTT凭证已过期，请重新获取"
    MqttCredentialErrorCode.INVALID_LIFETIME -> "MQTT签名有效时长无效"
    MqttCredentialErrorCode.SIGNING_FAILED -> "MQTT安全连接参数准备失败"
})

private fun validText(value: String): Boolean = value.isNotBlank() && value.none {
    it.isISOControl() || Character.getType(it) == Character.FORMAT.toInt()
}

/** Memory only; no Serializable, generated data-class dump, or persistence adapter. */
class MqttSecret(value: String) {
    private val storage = value.also { if (!validText(it)) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_RESPONSE) }
    fun <T> withValue(use: (String) -> T): T = use(storage)
    override fun toString() = "MqttSecret(redacted)"
}

enum class ExpiryEncoding { EPOCH_MILLIS, EPOCH_SECONDS, ISO8601, UNKNOWN }

/** Unknown/absent is intentionally distinct from any known credential renewal deadline. */
sealed class MqttCredentialExpiry {
    object Absent : MqttCredentialExpiry()
    object Unknown : MqttCredentialExpiry()
    data class Known(val deadlineEpochSeconds: Double, val encoding: ExpiryEncoding) : MqttCredentialExpiry()

    companion object {
        fun decode(raw: Any?, supplied: Boolean, encoding: ExpiryEncoding): MqttCredentialExpiry {
            if (!supplied) return Absent
            fun invalid(): Nothing = throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_EXPIRY)
            return when (encoding) {
                ExpiryEncoding.UNKNOWN -> {
                    when (raw) {
                        is Number -> if (!raw.toDouble().isFinite()) invalid()
                        is String -> if (raw.isBlank()) invalid()
                        else -> invalid()
                    }
                    Unknown
                }
                ExpiryEncoding.EPOCH_MILLIS, ExpiryEncoding.EPOCH_SECONDS -> {
                    val value = (raw as? Number)?.toDouble() ?: invalid()
                    if (!value.isFinite() || value <= 0) invalid()
                    val seconds = if (encoding == ExpiryEncoding.EPOCH_MILLIS) value / 1000 else value
                    if (!seconds.isFinite()) invalid()
                    Known(seconds, encoding)
                }
                ExpiryEncoding.ISO8601 -> {
                    val value = raw as? String ?: invalid()
                    val match = Regex("\\A([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2})(?:\\.([0-9]+))?(Z|[+-][0-9]{2}:[0-9]{2})\\z").matchEntire(value) ?: invalid()
                    val zone = match.groupValues[3]
                    val offset = if (zone == "Z") 0 else {
                        val hours = zone.substring(1, 3).toInt()
                        val minutes = zone.substring(4, 6).toInt()
                        if (hours > 23 || minutes > 59) invalid()
                        (hours * 3600 + minutes * 60) * if (zone[0] == '+') 1 else -1
                    }
                    val parser = utcFormatter("yyyy-MM-dd'T'HH:mm:ss")
                    val position = ParsePosition(0)
                    val base = parser.parse(match.groupValues[1], position) ?: invalid()
                    if (position.index != match.groupValues[1].length) invalid()
                    val fraction = match.groupValues[2].takeIf { it.isNotEmpty() }?.let { "0.$it".toDoubleOrNull() ?: invalid() } ?: 0.0
                    val seconds = base.time / 1000.0 + fraction - offset
                    if (!seconds.isFinite()) invalid()
                    Known(seconds, encoding)
                }
            }
        }
    }
}

/** Fresh local formatters avoid shared mutable date state and work at Android API 24. */
internal fun utcFormatter(pattern: String): SimpleDateFormat {
    val utc = TimeZone.getTimeZone("UTC")
    return SimpleDateFormat(pattern, Locale.US).apply {
        calendar = GregorianCalendar(utc, Locale.US).apply { gregorianChange = Date(Long.MIN_VALUE); isLenient = false }
        timeZone = utc
        isLenient = false
    }
}

/** Unsigned WSS target. Default TLS port only; endpoint and raw path must agree with hostURL. */
class MqttTarget(hostUrl: String, endpoint: String, path: String) {
    val hostname: String
    val path: String

    init {
        val uri = try { URI(hostUrl) } catch (_: Exception) { throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_TARGET) }
        val host = uri.host?.lowercase(Locale.ROOT)
        val authority = uri.rawAuthority?.lowercase(Locale.ROOT)
        if (!uri.scheme.equals("wss", ignoreCase = true) || host == null || !validHostname(host) ||
            uri.port !in setOf(-1, 443) || uri.rawUserInfo != null || uri.rawQuery != null || uri.rawFragment != null ||
            !Regex("\\A/[A-Za-z0-9._~/-]*\\z").matches(path) || path.contains("//") || path.split('/').any { it == "." || it == ".." } ||
            authority !in setOf(host, "$host:443")) {
            throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_TARGET)
        }
        val endpointHost = endpoint.lowercase(Locale.ROOT)
        if (!validHostname(endpointHost) || endpointHost != host || uri.rawPath != path) {
            throw MqttCredentialFailure(MqttCredentialErrorCode.CONFLICTING_TARGET)
        }
        hostname = host; this.path = path
    }

    internal val awsRegion: String? get() = Regex("\\A[a-z0-9-]+\\.iot\\.([a-z]{2}(?:-[a-z]+)+-[0-9]+)\\.amazonaws\\.com(?:\\.cn)?\\z").matchEntire(hostname)?.groupValues?.get(1)
    override fun equals(other: Any?) = other is MqttTarget && hostname == other.hostname && path == other.path
    override fun hashCode() = 31 * hostname.hashCode() + path.hashCode()
    override fun toString() = "MqttTarget(redacted)"

    companion object {
        internal fun validHostname(value: String): Boolean = value.length <= 253 &&
            Regex("\\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+\\z").matches(value) &&
            value.split('.').all { it.length <= 63 }
    }
}

sealed class MqttAuthentication {
    class UsernamePassword(val username: MqttSecret, val password: MqttSecret) : MqttAuthentication()
    class AwsSts(val accessKeyId: MqttSecret, val secretAccessKey: MqttSecret, val sessionToken: MqttSecret) : MqttAuthentication()
    final override fun toString() = "MqttAuthentication(redacted)"
}

/** Temporary DEVICE-01 material. Decode requires an explicit expiry encoding; no unit guessing. */
class MqttCredentials private constructor(
    val resourceId: String,
    val thingRef: String,
    val clientId: String,
    val target: MqttTarget,
    val authentication: MqttAuthentication,
    val expiry: MqttCredentialExpiry,
) {
    override fun toString() = "MqttCredentials(redacted)"

    companion object {
        fun decode(raw: Any, resourceId: String, expiryEncoding: ExpiryEncoding): MqttCredentials {
            if (raw !is JSONObject || !validText(resourceId)) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_RESPONSE)
            fun text(key: String): String {
                val value = raw.opt(key) as? String ?: throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_RESPONSE)
                if (!validText(value)) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_RESPONSE)
                return value
            }
            val host = text("host"); val endpoint = text("endpoint"); val path = text("path")
            val clientId = text("clientID"); val thing = text("deviceID")
            if (thing.any { it in "/+#\u0000" }) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_RESPONSE)
            val username = MqttSecret(text("username")); val password = MqttSecret(text("password"))
            val authentication = if (raw.has("sessionToken")) {
                val token = raw.opt("sessionToken") as? String
                if (token == null || !validText(token)) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_SESSION_TOKEN)
                MqttAuthentication.AwsSts(username, password, MqttSecret(token))
            } else MqttAuthentication.UsernamePassword(username, password)
            return MqttCredentials(resourceId, thing, clientId, MqttTarget(host, endpoint, path), authentication,
                MqttCredentialExpiry.decode(raw.opt("expiresAt"), raw.has("expiresAt"), expiryEncoding))
        }
    }
}

/** Exact targets come from trusted native ownership/configuration, never RN or an unchecked host string. */
class MqttEndpointPolicy(trustedStsEndpoints: Set<String> = emptySet(), trustedPlainTargets: Set<MqttTarget> = emptySet()) {
    private val sts = trustedStsEndpoints.map { it.lowercase(Locale.ROOT) }.toSet()
    private val plain = trustedPlainTargets.toSet()
    init { if (sts.any { !MqttTarget.validHostname(it) }) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_TARGET) }
    internal fun permitsSts(target: MqttTarget) = target.hostname in sts
    internal fun permitsPlain(target: MqttTarget) = target in plain
    override fun toString() = "MqttEndpointPolicy(redacted)"
}

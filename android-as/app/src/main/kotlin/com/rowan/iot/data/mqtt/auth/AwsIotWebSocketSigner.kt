package com.rowan.iot.data.mqtt.auth

import java.net.URI
import java.security.MessageDigest
import java.util.Date
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.floor

/** The eventual WSS adapter must send this exact authority form in its upgrade Host header. */
enum class MqttCanonicalHost { HOSTNAME_ONLY, HOSTNAME_AND_DEFAULT_PORT }

sealed class MqttConnectAuthentication {
    object None : MqttConnectAuthentication()
    class UsernamePassword(val username: MqttSecret, val password: MqttSecret) : MqttConnectAuthentication()
    final override fun toString() = "MqttConnectAuthentication(redacted)"
}

/** No serialization/persistence interface; signed URI extraction is an explicit transport boundary. */
class MqttConnectionParameters internal constructor(
    val resourceId: String,
    val thingRef: String,
    val clientId: String,
    val authentication: MqttConnectAuthentication,
    val httpHostHeader: String,
    val credentialExpiry: MqttCredentialExpiry,
    /** Single signed-request lifetime, NOT an inferred STS credential deadline. */
    val signedRequestExpiresAtEpochSeconds: Double?,
    private val uri: URI,
) {
    fun <T> withUri(use: (URI) -> T): T = use(uri)
    override fun toString() = "MqttConnectionParameters(redacted)"
}

/**
 * Pure per-attempt AWS IoT SigV4 preparation. No HTTP, broker SDK, cache, retry loop or credentials store.
 * The caller supplies exact native trust and a canonical Host choice. Default 900 seconds is a
 * bounded URL signing policy, never a promise that unknown credentials have that much lifetime.
 */
object AwsIotWebSocketSigner {
    fun prepare(
        credentials: MqttCredentials,
        policy: MqttEndpointPolicy,
        canonicalHost: MqttCanonicalHost,
        nowEpochSeconds: Double = System.currentTimeMillis() / 1000.0,
        lifetimeSeconds: Int = 900,
    ): MqttConnectionParameters {
        if (!nowEpochSeconds.isFinite() || nowEpochSeconds !in -62_135_596_800.0..253_402_300_799.0) {
            throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_TIME)
        }
        if (lifetimeSeconds !in 1..900) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_LIFETIME)
        val signingTime = floor(nowEpochSeconds)
        var lifetime = lifetimeSeconds
        val expiry = credentials.expiry
        if (expiry is MqttCredentialExpiry.Known) {
            if (expiry.deadlineEpochSeconds <= nowEpochSeconds) throw MqttCredentialFailure(MqttCredentialErrorCode.EXPIRED)
            val remaining = floor(expiry.deadlineEpochSeconds - signingTime)
            if (remaining < lifetime) lifetime = remaining.toInt()
            if (lifetime <= 0) throw MqttCredentialFailure(MqttCredentialErrorCode.EXPIRED)
        }
        val target = credentials.target
        val authority = target.hostname + if (canonicalHost == MqttCanonicalHost.HOSTNAME_AND_DEFAULT_PORT) ":443" else ""
        val authentication: MqttConnectAuthentication
        val uri: URI
        val requestExpiry: Double?
        when (val auth = credentials.authentication) {
            is MqttAuthentication.UsernamePassword -> {
                if (!policy.permitsPlain(target)) throw MqttCredentialFailure(MqttCredentialErrorCode.UNTRUSTED_TARGET)
                uri = safeUri("wss://$authority${target.path}")
                authentication = MqttConnectAuthentication.UsernamePassword(auth.username, auth.password)
                requestExpiry = null
            }
            is MqttAuthentication.AwsSts -> {
                if (!policy.permitsSts(target)) throw MqttCredentialFailure(MqttCredentialErrorCode.UNTRUSTED_TARGET)
                val region = target.awsRegion
                if (target.path != "/mqtt" || region == null) throw MqttCredentialFailure(MqttCredentialErrorCode.UNSUPPORTED_STS_TARGET)
                try {
                    val time = utcFormatter("yyyyMMdd'T'HHmmss'Z'").format(Date(signingTime.toLong() * 1000))
                    if (!Regex("\\A[0-9]{8}T[0-9]{6}Z\\z").matches(time)) throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_TIME)
                    val date = time.take(8)
                    val scope = "$date/$region/iotdevicegateway/aws4_request"
                    val credential = auth.accessKeyId.withValue { "$it/$scope" }
                    val parameters = listOf("X-Amz-Algorithm" to "AWS4-HMAC-SHA256", "X-Amz-Credential" to credential,
                        "X-Amz-Date" to time, "X-Amz-Expires" to lifetime.toString(), "X-Amz-SignedHeaders" to "host")
                    val encoded = parameters.map { percentEncode(it.first) to percentEncode(it.second) }
                        .sortedWith(compareBy<Pair<String, String>> { it.first }.thenBy { it.second })
                    val query = encoded.joinToString("&") { "${it.first}=${it.second}" }
                    val canonical = listOf("GET", "/mqtt", query, "host:$authority\n", "host", hash(byteArrayOf())).joinToString("\n")
                    val toSign = listOf("AWS4-HMAC-SHA256", time, scope, hash(canonical.toByteArray(Charsets.UTF_8))).joinToString("\n")
                    val signature = auth.secretAccessKey.withValue { secret ->
                        var key = mac(("AWS4" + secret).toByteArray(Charsets.UTF_8), date)
                        for (part in listOf(region, "iotdevicegateway", "aws4_request")) key = mac(key, part)
                        hex(mac(key, toSign))
                    }
                    // AWS IoT appends the STS token AFTER signing; it is not in the canonical query.
                    val token = auth.sessionToken.withValue(::percentEncode)
                    uri = safeUri("wss://$authority/mqtt?$query&X-Amz-Signature=$signature&X-Amz-Security-Token=$token")
                    authentication = MqttConnectAuthentication.None
                    requestExpiry = signingTime + lifetime
                } catch (failure: MqttCredentialFailure) { throw failure }
                catch (_: Exception) { throw MqttCredentialFailure(MqttCredentialErrorCode.SIGNING_FAILED) }
            }
        }
        return MqttConnectionParameters(credentials.resourceId, credentials.thingRef, credentials.clientId, authentication,
            authority, expiry, requestExpiry, uri)
    }

    private fun safeUri(value: String): URI = try { URI(value) }
        catch (_: Exception) { throw MqttCredentialFailure(MqttCredentialErrorCode.INVALID_TARGET) }

    private fun percentEncode(value: String): String = buildString {
        val alphabet = "0123456789ABCDEF"
        for (byte in value.toByteArray(Charsets.UTF_8)) {
            val code = byte.toInt() and 255
            if (code in 65..90 || code in 97..122 || code in 48..57 || code in listOf(45, 46, 95, 126)) append(code.toChar())
            else { append('%'); append(alphabet[code ushr 4]); append(alphabet[code and 15]) }
        }
    }
    private fun hash(value: ByteArray): String = hex(MessageDigest.getInstance("SHA-256").digest(value))
    private fun mac(key: ByteArray, value: String): ByteArray = Mac.getInstance("HmacSHA256").run {
        init(SecretKeySpec(key, "HmacSHA256")); doFinal(value.toByteArray(Charsets.UTF_8))
    }
    private fun hex(value: ByteArray): String = buildString {
        val alphabet = "0123456789abcdef"
        for (byte in value) { val code = byte.toInt() and 255; append(alphabet[code ushr 4]); append(alphabet[code and 15]) }
    }
}

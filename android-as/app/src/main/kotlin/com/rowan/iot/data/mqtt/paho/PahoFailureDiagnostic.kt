package com.rowan.iot.data.mqtt.paho

import com.rowan.iot.domain.device.mqtt.transport.BrokerFailureKind
import java.io.IOException
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.ProtocolException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.security.cert.CertificateException
import java.util.IdentityHashMap
import javax.net.ssl.SSLException
import org.eclipse.paho.client.mqttv3.MqttException

/** Fixed labels only. OTHER/IO deliberately do not guess a WebSocket cause from SDK text. */
enum class PahoFailureCause { DNS, CONNECT, TLS, TIMEOUT, WEBSOCKET, IO, OTHER }

/** Safe diagnostic payload: no Throwable, message, host, URI, client ID, credentials or stack. */
data class PahoFailureDiagnostic(
    val kind: BrokerFailureKind,
    val reasonCode: Int?,
    val causeCategory: PahoFailureCause,
)

/**
 * Inspect types and numeric SDK codes only. A wrapper IOException must not hide a
 * nested DNS/TLS/timeout type. The first specific type wins; no exception escapes.
 * Cause traversal is local, identity-checked and capped at eight nodes, never retained.
 */
internal fun pahoFailureDiagnostic(kind: BrokerFailureKind, error: Throwable?): PahoFailureDiagnostic {
    val seen = IdentityHashMap<Throwable, Boolean>()
    var current = error
    var reasonCode: Int? = null
    var category = PahoFailureCause.OTHER
    for (depth in 0 until 8) {
        val cause = current ?: break
        if (seen.put(cause, true) != null) break
        if (reasonCode == null && cause is MqttException) reasonCode = cause.reasonCode
        val candidate = when (cause) {
            is UnknownHostException -> PahoFailureCause.DNS
            is ConnectException, is NoRouteToHostException -> PahoFailureCause.CONNECT
            is SSLException, is CertificateException -> PahoFailureCause.TLS
            is SocketTimeoutException -> PahoFailureCause.TIMEOUT
            // At this adapter's WSS-only boundary this is a typed protocol failure,
            // not proof of a particular handshake header or HTTP status.
            is ProtocolException -> PahoFailureCause.WEBSOCKET
            is IOException -> PahoFailureCause.IO
            else -> PahoFailureCause.OTHER
        }
        if (category == PahoFailureCause.OTHER ||
            category == PahoFailureCause.IO && candidate != PahoFailureCause.OTHER && candidate != PahoFailureCause.IO) {
            category = candidate
        }
        current = try { cause.cause } catch (_: Throwable) { null }
    }
    if (category == PahoFailureCause.OTHER) {
        category = when (reasonCode) {
            MqttException.REASON_CODE_CLIENT_TIMEOUT.toInt(), MqttException.REASON_CODE_WRITE_TIMEOUT.toInt() -> PahoFailureCause.TIMEOUT
            MqttException.REASON_CODE_SSL_CONFIG_ERROR.toInt() -> PahoFailureCause.TLS
            else -> PahoFailureCause.OTHER
        }
    }
    return PahoFailureDiagnostic(kind, reasonCode, category)
}

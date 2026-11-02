package com.rowan.iot.data.mqtt.paho

import com.rowan.iot.domain.device.mqtt.transport.BrokerFailure
import com.rowan.iot.domain.device.mqtt.transport.BrokerFailureKind
import com.rowan.iot.domain.device.mqtt.transport.BrokerListener
import com.rowan.iot.domain.device.mqtt.transport.BrokerOptions
import com.rowan.iot.domain.device.mqtt.transport.BrokerPort
import com.rowan.iot.domain.device.mqtt.transport.BrokerTransportFactory
import java.io.IOException
import java.net.URI
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import org.eclipse.paho.client.mqttv3.DisconnectedBufferOptions
import org.eclipse.paho.client.mqttv3.IMqttActionListener
import org.eclipse.paho.client.mqttv3.IMqttAsyncClient
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken
import org.eclipse.paho.client.mqttv3.IMqttToken
import org.eclipse.paho.client.mqttv3.MqttAsyncClient
import org.eclipse.paho.client.mqttv3.MqttCallback
import org.eclipse.paho.client.mqttv3.MqttClientPersistence
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttException
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.logging.LoggerFactory
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence

/**
 * SDK boundary only. The native pool owns account/epoch, authorization, subscriptions,
 * timeout/retry/renewal and command unknown results. This adapter never reconnects or replays.
 * Client construction is injectable using Paho's real interface, not a parallel SDK facade.
 */
class PahoBrokerTransportFactory(
    private val clientFactory: (String, String, MqttClientPersistence) -> IMqttAsyncClient = { uri, clientID, persistence -> MqttAsyncClient(uri, clientID, persistence) },
    private val teardown: (() -> Unit) -> Unit = PahoTeardown::schedule,
    private val diagnostics: (PahoFailureDiagnostic) -> Unit = {},
) : BrokerTransportFactory {
    init { PahoLogging.install() }

    override fun create(options: BrokerOptions, listener: BrokerListener): BrokerPort {
        validateHandshake(options)
        // Must happen before constructing any SDK object that obtains its logger.
        PahoLogging.install()
        val client = try { clientFactory(options.signedWssUri, options.key.serverClientID, MemoryPersistence()) }
        catch (error: Exception) { throw sdkFailure(error, diagnostics) }
        return try { PahoBrokerPort(options, client, listener, teardown, diagnostics) }
        catch (error: Exception) { scheduleTeardown(client, teardown); throw sdkFailure(error, diagnostics) }
    }

    private fun validateHandshake(options: BrokerOptions) {
        val uri = try { URI(options.signedWssUri) } catch (_: Exception) { throw BrokerFailure(BrokerFailureKind.CONFIGURATION) }
        // Paho 1.2.5 WebSocketHandshake omits a port only for 80, so WSS emits :443.
        // Its custom headers append, not replace; a second Host would not repair signing.
        if (uri.scheme != "wss" || uri.port != 443 || uri.rawAuthority != options.key.authority ||
            uri.rawUserInfo != null || uri.rawFragment != null || uri.rawPath != options.key.path || uri.rawQuery == "") {
            throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
        }
        val username = options.connectUsername
        val password = options.connectPassword
        if ((username == null) != (password == null) ||
            username != null && (username.isBlank() || username.any { it.isISOControl() }) ||
            password != null && (password.isBlank() || password.any { it.isISOControl() }) ||
            uri.rawQuery != null && (username != null || password != null)) {
            throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
        }
    }
}

private object PahoLogging {
    @Synchronized fun install() { LoggerFactory.setLogger(PahoNoopLogger::class.java.name) }
}

/** Independent of a cancelled application scope, so local SDK cleanup still runs after shutdown. */
private object PahoTeardown {
    private val worker = Executors.newSingleThreadExecutor { work -> Thread(work, "rowan-mqtt-teardown").apply { isDaemon = true } }
    fun schedule(work: () -> Unit) { worker.execute { work() } }
}

private fun scheduleTeardown(client: IMqttAsyncClient, schedule: (() -> Unit) -> Unit) {
    val work = {
        // Do not wait for remote DISCONNECT completion indefinitely (zero would mean
        // an unbounded token wait). All SDK calls here run on the teardown worker.
        try { client.disconnectForcibly(0L, 100L) } catch (_: Exception) { /* Still force local close; never restore ownership or replay. */ }
        try { if (client is MqttAsyncClient) client.close(true) else client.close() } catch (_: Exception) { /* Already closed logically; no raw SDK diagnostic escapes the worker. */ }
        Unit
    }
    try { schedule(work) }
    catch (_: Exception) { PahoTeardown.schedule(work) }
}

private enum class Operation { CONNECT, SUBSCRIBE, UNSUBSCRIBE, PUBLISH }

private class PahoBrokerPort(
    private val options: BrokerOptions,
    private val client: IMqttAsyncClient,
    private val listener: BrokerListener,
    private val teardown: (() -> Unit) -> Unit,
    private val diagnostics: (PahoFailureDiagnostic) -> Unit,
) : BrokerPort {
    private enum class Phase { NEW, CONNECTING, CONNECTED, DISCONNECTED, CLOSED }
    private class Pending(val continuation: CancellableContinuation<Unit>, val operation: Operation) {
        val sdkCompleted = AtomicBoolean()
        val terminal = AtomicBoolean()
        fun finish(failure: BrokerFailure? = null) {
            if (!terminal.compareAndSet(false, true) || !continuation.isActive) return
            continuation.resumeWith(if (failure == null) Result.success(Unit) else Result.failure(failure))
        }
    }
    private val monitor = Any()
    private var phase = Phase.NEW
    private var lossDelivered = false
    private val pending = linkedSetOf<Pending>()

    init {
        client.setBufferOpts(DisconnectedBufferOptions().apply {
            isBufferEnabled = false; isPersistBuffer = false; isDeleteOldestMessages = false
        })
        client.setCallback(object : MqttCallback {
            override fun messageArrived(topic: String?, message: MqttMessage?) {
                val live = synchronized(monitor) { phase == Phase.CONNECTED }
                if (live && topic != null && message != null) listener.message(topic, message.payload.copyOf())
            }
            override fun connectionLost(cause: Throwable?) {
                val failure = sdkFailure(cause, diagnostics)
                val waiting = synchronized(monitor) {
                    if (phase == Phase.CLOSED || lossDelivered) return
                    phase = Phase.DISCONNECTED; lossDelivered = true
                    pending.toList().also { pending.clear() }
                }
                waiting.forEach { it.finish(failure) }
                // Never hold this monitor while entering pool ownership/listener code.
                if (synchronized(monitor) { phase != Phase.CLOSED }) listener.disconnected(failure)
            }
            override fun deliveryComplete(token: IMqttDeliveryToken?) = Unit // Action callback owns its matching PUBACK waiter.
        })
    }

    override suspend fun connect() = await(Operation.CONNECT) { callback ->
        val config = MqttConnectOptions().apply {
            isCleanSession = true
            mqttVersion = MqttConnectOptions.MQTT_VERSION_3_1_1
            isAutomaticReconnect = false
            isHttpsHostnameVerificationEnabled = true
            // Default platform trust chain + HTTPS hostname verification. No permissive verifier/factory.
            options.connectUsername?.let { userName = it }
            // Paho 1.2.5 setPassword unconditionally clones the supplied char[].
            // STS must retain the default null fields without invoking either setter.
            options.connectPassword?.let { password = it.toCharArray() }
        }
        client.connect(config, null, callback)
    }

    override suspend fun subscribe(exactTopics: Set<String>) {
        val topics = validatedTopics(exactTopics)
        await(Operation.SUBSCRIBE, topics.size) { callback -> client.subscribe(topics, IntArray(topics.size) { 1 }, null, callback) }
    }

    override suspend fun unsubscribe(exactTopics: Set<String>) {
        val topics = validatedTopics(exactTopics)
        await(Operation.UNSUBSCRIBE) { callback -> client.unsubscribe(topics, null, callback) }
    }

    override suspend fun publish(topic: String, payload: ByteArray, qos: Int, retain: Boolean) {
        if (qos != 1 || retain || !validTopic(topic)) throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
        val bytes = payload.copyOf()
        await(Operation.PUBLISH) { callback -> client.publish(topic, bytes, 1, false, null, callback) }
    }

    private fun validatedTopics(topics: Set<String>): Array<String> {
        if (topics.isEmpty() || topics.any { !validTopic(it) }) throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
        return topics.sorted().toTypedArray()
    }
    private fun validTopic(topic: String) = topic.isNotBlank() && topic.none { it in "+#\u0000" || it.isISOControl() }

    private suspend fun await(operation: Operation, grantCount: Int = 0, start: (IMqttActionListener) -> IMqttToken) {
        suspendCancellableCoroutine<Unit> { continuation ->
            val waiter = Pending(continuation, operation)
            val initial = synchronized(monitor) {
                when {
                    phase == Phase.CLOSED -> BrokerFailure(BrokerFailureKind.CLOSED)
                    operation == Operation.CONNECT && phase != Phase.NEW -> BrokerFailure(BrokerFailureKind.CONFIGURATION)
                    operation != Operation.CONNECT && phase != Phase.CONNECTED -> BrokerFailure(BrokerFailureKind.UNAVAILABLE)
                    else -> { if (operation == Operation.CONNECT) phase = Phase.CONNECTING; pending += waiter; null }
                }
            }
            if (initial != null) { waiter.finish(initial); return@suspendCancellableCoroutine }
            continuation.invokeOnCancellation {
                waiter.terminal.set(true)
                synchronized(monitor) { pending.remove(waiter) }
                // IMqttToken has no cancellation API. This is a waiter cancellation,
                // not proof the broker refused the request. Pool owns subscription cleanup.
            }
            if (!continuation.isActive) return@suspendCancellableCoroutine
            fun complete(failure: BrokerFailure?) {
                if (!waiter.sdkCompleted.compareAndSet(false, true)) return
                val result = synchronized(monitor) {
                    pending.remove(waiter)
                    if (phase == Phase.CLOSED) BrokerFailure(BrokerFailureKind.CLOSED)
                    else {
                        if (operation == Operation.CONNECT && phase != Phase.CONNECTING) BrokerFailure(BrokerFailureKind.UNAVAILABLE)
                        else {
                            if (operation == Operation.CONNECT) phase = if (failure == null) Phase.CONNECTED else Phase.DISCONNECTED
                            failure
                        }
                    }
                }
                waiter.finish(result)
            }
            val callback = object : IMqttActionListener {
                override fun onSuccess(token: IMqttToken?) {
                    val failure = if (operation == Operation.SUBSCRIBE) {
                        val grants = try { token?.grantedQos } catch (_: Exception) { null }
                        if (grants == null || grants.size != grantCount || grants.any { it != 1 }) BrokerFailure(BrokerFailureKind.SUBSCRIPTION_DENIED) else null
                    } else null
                    complete(failure)
                }
                override fun onFailure(token: IMqttToken?, exception: Throwable?) = complete(sdkFailure(exception, diagnostics))
            }
            try {
                if (operation != Operation.CONNECT && !client.isConnected) complete(BrokerFailure(BrokerFailureKind.UNAVAILABLE))
                else if (synchronized(monitor) { phase == Phase.CLOSED }) complete(BrokerFailure(BrokerFailureKind.CLOSED))
                else start(callback)
            } catch (error: Exception) { complete(sdkFailure(error, diagnostics)) }
        }
    }

    override fun close() {
        val waiting = synchronized(monitor) {
            if (phase == Phase.CLOSED) return
            phase = Phase.CLOSED
            pending.toList().also { pending.clear() }
        }
        waiting.forEach { it.finish(BrokerFailure(BrokerFailureKind.CLOSED)) }
        scheduleTeardown(client, teardown)
    }
    override fun toString() = "PahoBrokerPort(redacted)"
}

/** Never attach an SDK exception as cause or inspect its message/toString (it can contain signed URIs). */
private fun sdkFailure(error: Throwable?, diagnostics: (PahoFailureDiagnostic) -> Unit): BrokerFailure {
    val kind = if (error is BrokerFailure) error.kind else if (error is MqttException) when (error.reasonCode) {
        MqttException.REASON_CODE_NOT_AUTHORIZED.toInt(), MqttException.REASON_CODE_FAILED_AUTHENTICATION.toInt() -> BrokerFailureKind.AUTHORIZATION
        MqttException.REASON_CODE_CLIENT_TIMEOUT.toInt(), MqttException.REASON_CODE_WRITE_TIMEOUT.toInt() -> BrokerFailureKind.TIMEOUT
        MqttException.REASON_CODE_SUBSCRIBE_FAILED.toInt() -> BrokerFailureKind.SUBSCRIPTION_DENIED
        MqttException.REASON_CODE_BROKER_UNAVAILABLE.toInt(), MqttException.REASON_CODE_SERVER_CONNECT_ERROR.toInt(),
        MqttException.REASON_CODE_CLIENT_NOT_CONNECTED.toInt(), MqttException.REASON_CODE_CONNECTION_LOST.toInt(),
        MqttException.REASON_CODE_CLIENT_ALREADY_DISCONNECTED.toInt(), MqttException.REASON_CODE_CLIENT_DISCONNECTING.toInt() -> BrokerFailureKind.UNAVAILABLE
        MqttException.REASON_CODE_CLIENT_CLOSED.toInt() -> BrokerFailureKind.CLOSED
        else -> BrokerFailureKind.CONFIGURATION
    } else if (error is IOException || error == null) BrokerFailureKind.UNAVAILABLE else BrokerFailureKind.CONFIGURATION
    // Paho can wrap transient resolver/socket failures with generic reason 0.
    // Reuse the same bounded type walk as diagnostics; never infer retryability from text.
    // All explicit SDK reason mappings (especially AUTH) retain their precedence.
    val diagnostic = pahoFailureDiagnostic(kind, error)
    val mappedKind = if (error is MqttException && error.reasonCode == MqttException.REASON_CODE_CLIENT_EXCEPTION.toInt()) {
        when (diagnostic.causeCategory) {
            PahoFailureCause.DNS, PahoFailureCause.CONNECT, PahoFailureCause.IO -> BrokerFailureKind.UNAVAILABLE
            PahoFailureCause.TIMEOUT -> BrokerFailureKind.TIMEOUT
            else -> kind // TLS/protocol/unknown remain configuration failures for generic reason 0.
        }
    } else kind
    // Observer failures must never replace SDK outcomes or leak their own raw cause.
    try { diagnostics(diagnostic.copy(kind = mappedKind)) } catch (_: Throwable) { /* Diagnostic only. */ }
    return BrokerFailure(mappedKind)
}

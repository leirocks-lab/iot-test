package com.rowan.iot.data.mqtt.paho

import com.rowan.iot.domain.device.mqtt.transport.*
import java.lang.reflect.Proxy
import java.util.ResourceBundle
import kotlinx.coroutines.*
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.logging.Logger
import org.eclipse.paho.client.mqttv3.logging.LoggerFactory
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.junit.Assert.*
import org.junit.Test

/** Uses the real 1.2.5 interfaces with dynamic proxies; no SDK client, socket or environment. */
class PahoBrokerTransportFactoryTest {
    private val topic = "\$aws/things/public-thing/shadow/get/accepted"
    private fun options(uri: String = "wss://mqtt.example.test:443/mqtt?X-Amz-Signature=public-fixture", username: String? = null, password: String? = null) =
        BrokerOptions(BrokerKey(3, "mqtt.example.test:443", "/mqtt", "server-issued-client"), uri, username, password, null)

    private class Operation(val kind: String, val listener: IMqttActionListener, val args: Array<out Any?>, val token: IMqttDeliveryToken) {
        override fun toString() = "Operation(redacted)"
    }
    private class Sdk {
        val operations = mutableListOf<Operation>()
        var callback: MqttCallback? = null
        var buffer: DisconnectedBufferOptions? = null
        var connected = false
        var closes = 0
        var forceDisconnects = 0
        var throwNext: Throwable? = null
        var setupFailure: Throwable? = null
        var inlineSuccess = false
        var grants = intArrayOf(1)
        var uri: String? = null
        var clientId: String? = null
        var persistence: MqttClientPersistence? = null

        val client: IMqttAsyncClient = Proxy.newProxyInstance(IMqttAsyncClient::class.java.classLoader, arrayOf(IMqttAsyncClient::class.java)) { proxy, method, raw ->
            val args = raw ?: emptyArray()
            when (method.name) {
                "toString" -> "SdkProxy(redacted)"
                "hashCode" -> System.identityHashCode(proxy)
                "equals" -> proxy === args[0]
                "getClientId" -> "server-issued-client"
                "getServerURI" -> uri
                "isConnected" -> connected
                "setCallback" -> { callback = args[0] as? MqttCallback; null }
                "setBufferOpts" -> { setupFailure?.let { throw it }; buffer = args[0] as DisconnectedBufferOptions; null }
                "disconnectForcibly" -> { forceDisconnects++; connected = false; null }
                "close" -> { closes++; connected = false; null }
                "getBufferedMessageCount", "getInFlightMessageCount" -> 0
                "getPendingDeliveryTokens" -> emptyArray<IMqttDeliveryToken>()
                "connect", "subscribe", "unsubscribe", "publish" -> {
                    throwNext?.let { throwNext = null; throw it }
                    val action = args.lastOrNull() as? IMqttActionListener ?: error("Expected SDK action callback overload")
                    val token = token()
                    operations += Operation(method.name, action, args, token)
                    if (inlineSuccess) { if (method.name == "connect") connected = true; action.onSuccess(token) }
                    token
                }
                else -> error("Unexpected SDK method in isolated adapter test")
            }
        } as IMqttAsyncClient

        private fun token(): IMqttDeliveryToken = Proxy.newProxyInstance(IMqttDeliveryToken::class.java.classLoader, arrayOf(IMqttDeliveryToken::class.java)) { proxy, method, args ->
            when (method.name) {
                "toString" -> "SdkToken(redacted)"
                "hashCode" -> System.identityHashCode(proxy)
                "equals" -> proxy === args?.get(0)
                "getGrantedQos" -> grants.copyOf()
                "isComplete", "getSessionPresent" -> false
                "getMessageId" -> 1
                "getException", "getResponse", "getUserContext", "getMessage", "getActionCallback" -> null
                "getClient" -> client
                "getTopics" -> emptyArray<String>()
                "setUserContext", "setActionCallback" -> null
                else -> error("Adapter must never waitForCompletion")
            }
        } as IMqttDeliveryToken

        fun success(operation: Operation = operations.last()) {
            if (operation.kind == "connect") connected = true
            operation.listener.onSuccess(operation.token)
        }
        fun failure(error: Throwable, operation: Operation = operations.last()) { operation.listener.onFailure(operation.token, error) }
    }

    private class Fixture(val input: BrokerOptions = BrokerOptions(BrokerKey(3, "mqtt.example.test:443", "/mqtt", "server-issued-client"),
        "wss://mqtt.example.test:443/mqtt?X-Amz-Signature=public-fixture", null, null, null), diagnostics: (PahoFailureDiagnostic) -> Unit = {}) {
        val sdk = Sdk()
        val teardown = mutableListOf<() -> Unit>()
        val received = mutableListOf<Pair<String, ByteArray>>()
        val failures = mutableListOf<BrokerFailure>()
        val factory = PahoBrokerTransportFactory(clientFactory = { uri, id, persistence ->
            sdk.uri = uri; sdk.clientId = id; sdk.persistence = persistence; sdk.client
        }, teardown = { teardown += it }, diagnostics = diagnostics)
        val port = factory.create(input, object : BrokerListener {
            override fun message(topic: String, payload: ByteArray) { received += topic to payload }
            override fun disconnected(failure: BrokerFailure) { failures += failure }
        })
    }

    private suspend fun connect(f: Fixture) = coroutineScope {
        val connected = async(start = CoroutineStart.UNDISPATCHED) { f.port.connect() }
        assertEquals("connect", f.sdk.operations.last().kind)
        assertFalse(connected.isCompleted)
        f.sdk.success(); connected.await()
    }
    private suspend fun failure(kind: BrokerFailureKind, work: suspend () -> Unit) {
        val error = runCatching { work() }.exceptionOrNull()
        assertTrue("Expected sanitized BrokerFailure", error is BrokerFailure)
        assertEquals(kind, (error as BrokerFailure).kind)
        assertNull(error.cause)
    }

    @Test fun pureCreationUsesExactUriServerClientIdAndMemoryPersistenceWithoutConnecting() {
        val f = Fixture()
        assertEquals(f.input.signedWssUri, f.sdk.uri)
        assertEquals(f.input.key.serverClientID, f.sdk.clientId)
        assertTrue(f.sdk.persistence is MemoryPersistence)
        assertTrue(f.sdk.operations.isEmpty())
        assertTrue(LoggerFactory.getLogger(LoggerFactory.MQTT_CLIENT_MSG_CAT, "public-test") is PahoNoopLogger)
    }

    @Test fun connectWaitsForConnackAndConfiguresCleanMqtt311TlsAndNoReplay() = runBlocking {
        val f = Fixture()
        val attempt = async(start = CoroutineStart.UNDISPATCHED) { f.port.connect() }
        val config = f.sdk.operations.single().args[0] as MqttConnectOptions
        assertTrue(config.isCleanSession)
        assertEquals(MqttConnectOptions.MQTT_VERSION_3_1_1, config.mqttVersion)
        assertFalse(config.isAutomaticReconnect)
        assertTrue(config.isHttpsHostnameVerificationEnabled)
        assertNull(config.sslHostnameVerifier)
        assertNull(config.sslProperties)
        assertNull(config.serverURIs)
        assertNull(config.customWebSocketHeaders) // SDK appends custom Host rather than replacing its own Host.
        assertNotNull(f.sdk.buffer)
        assertFalse(f.sdk.buffer!!.isBufferEnabled)
        assertFalse(f.sdk.buffer!!.isPersistBuffer)
        assertFalse(attempt.isCompleted)
        f.sdk.success(); attempt.await()
    }

    @Test fun paho443HandshakeRejectsAuthorityWithoutExplicitPortInsteadOfRewritingItsSignature() {
        for (uri in listOf("wss://mqtt.example.test/mqtt?X-Amz-Signature=public-fixture", "wss://mqtt.example.test:0443/mqtt?X-Amz-Signature=public-fixture")) {
            val error = runCatching { Fixture(options(uri)) }.exceptionOrNull()
            assertTrue(error is BrokerFailure)
            assertEquals(BrokerFailureKind.CONFIGURATION, (error as BrokerFailure).kind)
        }
    }

    @Test fun stsSignedUriDoesNotEnterMqttConnectUsernameOrPassword() = runBlocking {
        val f = Fixture(); connect(f)
        val config = f.sdk.operations.single().args[0] as MqttConnectOptions
        assertNull(config.userName); assertNull(config.password)
    }

    @Test fun plainConnectCredentialsAreOnlyPassedForTheUnsignedBranch() = runBlocking {
        val f = Fixture(options("wss://mqtt.example.test:443/mqtt", "public-user", "public-password")); connect(f)
        val config = f.sdk.operations.single().args[0] as MqttConnectOptions
        assertEquals("public-user", config.userName)
        assertArrayEquals("public-password".toCharArray(), config.password)
        for (input in listOf(options(username = "access-key", password = "secret-key"), options("wss://mqtt.example.test:443/mqtt", "public-user", null))) {
            assertTrue(runCatching { Fixture(input) }.exceptionOrNull() is BrokerFailure)
        }
    }

    @Test fun subscribeRequiresAnAckForEveryTopicAndEveryGrantMustBeExactlyOne() = runBlocking {
        for (grants in listOf(intArrayOf(1, 1), intArrayOf(1, 0), intArrayOf(1, 2), intArrayOf(1, 128), intArrayOf(1), intArrayOf())) {
            val f = Fixture(); connect(f)
            f.sdk.grants = grants
            val operation = async(start = CoroutineStart.UNDISPATCHED) { runCatching { f.port.subscribe(setOf(topic, topic.replace("get/accepted", "get/rejected"))) } }
            val call = f.sdk.operations.last()
            assertEquals("subscribe", call.kind)
            assertArrayEquals(intArrayOf(1, 1), call.args[1] as IntArray)
            assertFalse(operation.isCompleted)
            f.sdk.success(call)
            val result = operation.await()
            if (grants.contentEquals(intArrayOf(1, 1))) assertTrue(result.isSuccess)
            else { assertTrue(result.exceptionOrNull() is BrokerFailure); assertEquals(BrokerFailureKind.SUBSCRIPTION_DENIED, (result.exceptionOrNull() as BrokerFailure).kind) }
        }
    }

    @Test fun unsubscribeWaitsForItsOwnActionCallback() = runBlocking {
        val f = Fixture(); connect(f)
        val operation = async(start = CoroutineStart.UNDISPATCHED) { f.port.unsubscribe(setOf(topic)) }
        assertEquals("unsubscribe", f.sdk.operations.last().kind)
        assertFalse(operation.isCompleted)
        f.sdk.success(); operation.await()
    }

    @Test fun publishCompletionIsPubackOnlyAndPayloadIsDetachedBeforeSdkOwnership() = runBlocking {
        val f = Fixture(); connect(f)
        val bytes = byteArrayOf(1, 2)
        val operation = async(start = CoroutineStart.UNDISPATCHED) { f.port.publish(topic.replace("get/accepted", "get"), bytes, 1, false) }
        bytes[0] = 9
        val call = f.sdk.operations.last()
        assertEquals("publish", call.kind); assertArrayEquals(byteArrayOf(1, 2), call.args[1] as ByteArray)
        assertEquals(1, call.args[2]); assertEquals(false, call.args[3]); assertFalse(operation.isCompleted)
        f.sdk.success(); operation.await()
        assertEquals(1, f.sdk.operations.count { it.kind == "publish" })
    }

    @Test fun invalidDeliveryFlagsOrWildcardTopicsNeverReachSdk() = runBlocking {
        val f = Fixture(); connect(f)
        for ((qos, retain) in listOf(0 to false, 2 to false, 1 to true)) failure(BrokerFailureKind.CONFIGURATION) { f.port.publish("literal/topic", byteArrayOf(1), qos, retain) }
        for (filter in listOf("a/#", "a/+", "a\u0000b")) {
            failure(BrokerFailureKind.CONFIGURATION) { f.port.subscribe(setOf(filter)) }
            failure(BrokerFailureKind.CONFIGURATION) { f.port.publish(filter, byteArrayOf(1), 1, false) }
        }
        assertEquals(listOf("connect"), f.sdk.operations.map { it.kind })
    }

    @Test fun cancellingOneSubscribeDoesNotCloseTheSharedClientOrCompleteAnotherWaiter() = runBlocking {
        val f = Fixture(); connect(f)
        val first = async(start = CoroutineStart.UNDISPATCHED) { f.port.subscribe(setOf(topic)) }
        val old = f.sdk.operations.last(); first.cancelAndJoin()
        val next = async(start = CoroutineStart.UNDISPATCHED) { f.port.subscribe(setOf(topic)) }
        f.sdk.success(old); assertFalse(next.isCompleted)
        assertEquals(0, f.sdk.closes); assertEquals(0, f.sdk.forceDisconnects); assertTrue(f.teardown.isEmpty())
        f.sdk.success(); next.await()
    }

    @Test fun cancellingPublishDoesNotReplayOrDisconnectAndLatePubackIsIgnored() = runBlocking {
        val f = Fixture(); connect(f)
        val first = async(start = CoroutineStart.UNDISPATCHED) { f.port.publish("literal/topic", byteArrayOf(1), 1, false) }
        val old = f.sdk.operations.last(); first.cancelAndJoin(); f.sdk.success(old)
        val second = async(start = CoroutineStart.UNDISPATCHED) { f.port.publish("literal/topic", byteArrayOf(2), 1, false) }
        assertFalse(second.isCompleted); f.sdk.success(); second.await()
        assertEquals(2, f.sdk.operations.count { it.kind == "publish" }); assertTrue(f.teardown.isEmpty()); assertEquals(0, f.sdk.closes)
    }

    @Test fun closeMarksClosedAndFailsWaitersBeforeAnyPotentiallyBlockingSdkTeardown() = runBlocking {
        val f = Fixture(); connect(f)
        val pending = async(start = CoroutineStart.UNDISPATCHED) { runCatching { f.port.publish("literal/topic", byteArrayOf(1), 1, false) } }
        val old = f.sdk.operations.last()
        f.port.close(); f.port.close()
        assertEquals(1, f.teardown.size)
        assertEquals(0, f.sdk.closes); assertEquals(0, f.sdk.forceDisconnects)
        val error = pending.await().exceptionOrNull() as BrokerFailure
        assertEquals(BrokerFailureKind.CLOSED, error.kind)
        failure(BrokerFailureKind.CLOSED) { f.port.subscribe(setOf(topic)) }
        failure(BrokerFailureKind.CLOSED) { f.port.publish("literal/topic", byteArrayOf(2), 1, false) }
        f.sdk.success(old)
        f.teardown.single().invoke()
        assertEquals(1, f.sdk.closes)
    }

    @Test fun inboundPayloadIsDetachedAndCallbacksAfterCloseAreSuppressed() = runBlocking {
        val f = Fixture(); connect(f)
        val message = MqttMessage(byteArrayOf(7))
        val callback = f.sdk.callback!!
        callback.messageArrived(topic, message); message.payload[0] = 0
        assertArrayEquals(byteArrayOf(7), f.received.single().second)
        f.port.close()
        callback.messageArrived(topic, MqttMessage(byteArrayOf(9)))
        callback.connectionLost(MqttException(MqttException.REASON_CODE_CONNECTION_LOST.toInt()))
        assertEquals(1, f.received.size); assertTrue(f.failures.isEmpty())
    }

    @Test fun disconnectIsSanitizedAndDoesNotInitiateAutomaticReconnectOrReplay() = runBlocking {
        val f = Fixture(); connect(f)
        f.sdk.connected = false
        f.sdk.callback!!.connectionLost(MqttException(MqttException.REASON_CODE_CONNECTION_LOST.toInt(), IllegalStateException("public-fixture-sensitive-cause")))
        assertEquals(BrokerFailureKind.UNAVAILABLE, f.failures.single().kind); assertNull(f.failures.single().cause)
        assertFalse(f.failures.single().toString().contains("public-fixture-sensitive-cause"))
        failure(BrokerFailureKind.UNAVAILABLE) { f.port.publish("literal/topic", byteArrayOf(1), 1, false) }
        assertEquals(listOf("connect"), f.sdk.operations.map { it.kind })
    }

    @Test fun callbackAndSynchronousSdkFailuresMapToFiniteFailuresWithoutRawCauses() = runBlocking {
        for ((reason, expected) in listOf(MqttException.REASON_CODE_NOT_AUTHORIZED to BrokerFailureKind.AUTHORIZATION,
            MqttException.REASON_CODE_FAILED_AUTHENTICATION to BrokerFailureKind.AUTHORIZATION,
            MqttException.REASON_CODE_CLIENT_TIMEOUT to BrokerFailureKind.TIMEOUT,
            MqttException.REASON_CODE_BROKER_UNAVAILABLE to BrokerFailureKind.UNAVAILABLE)) {
            val f = Fixture()
            val attempt = async(start = CoroutineStart.UNDISPATCHED) { runCatching { f.port.connect() } }
            f.sdk.failure(MqttException(reason.toInt(), IllegalStateException("public-fixture-sensitive-cause")))
            val error = attempt.await().exceptionOrNull() as BrokerFailure
            assertEquals(expected, error.kind); assertNull(error.cause); assertFalse(error.toString().contains("public-fixture-sensitive-cause"))
        }
        val f = Fixture(); f.sdk.throwNext = IllegalArgumentException("wss://public-fixture-sensitive-url")
        failure(BrokerFailureKind.CONFIGURATION) { f.port.connect() }
    }

    @Test fun inlineAndDuplicateSdkCallbacksCompleteOnlyTheOriginalOperationOnce() = runBlocking {
        val f = Fixture(); f.sdk.inlineSuccess = true
        f.port.connect(); f.port.publish("literal/topic", byteArrayOf(1), 1, false)
        val old = f.sdk.operations.last()
        f.sdk.success(old); f.sdk.failure(MqttException(MqttException.REASON_CODE_CONNECTION_LOST.toInt()), old)
        assertTrue(f.failures.isEmpty()); assertEquals(2, f.sdk.operations.size)
    }

    @Test fun noopLoggerHasPublicNoargConstructionAndNeverFormatsSensitiveArguments() {
        val logger = PahoNoopLogger::class.java.getConstructor().newInstance()
        val bomb = object { override fun toString(): String = error("No SDK logger may inspect values") }
        for (method in Logger::class.java.methods.filter { it.declaringClass == Logger::class.java }) {
            val args = method.parameterTypes.map { type -> when {
                type == Integer.TYPE -> 7
                type == String::class.java -> "public-fixture-sensitive-value"
                type == ResourceBundle::class.java -> null
                type.isArray -> arrayOf(bomb)
                Throwable::class.java.isAssignableFrom(type) -> IllegalStateException("public-fixture-sensitive-cause")
                else -> error("Logger API changed")
            } }.toTypedArray()
            val result = method.invoke(logger, *args)
            if (method.name == "isLoggable") assertEquals(false, result)
            if (method.name == "formatMessage") { assertTrue(result is String); assertFalse((result as String).contains("public-fixture-sensitive-value")) }
        }
    }

    @Test fun diagnosticUsesFiniteCauseCategoriesWithoutRawSdkDetails() {
        val cases = listOf(
            java.net.UnknownHostException("public-sensitive-host") to PahoFailureCause.DNS,
            java.net.ConnectException("public-sensitive-host") to PahoFailureCause.CONNECT,
            java.net.NoRouteToHostException("public-sensitive-host") to PahoFailureCause.CONNECT,
            javax.net.ssl.SSLHandshakeException("public-sensitive-host") to PahoFailureCause.TLS,
            java.security.cert.CertificateException("public-sensitive-cert") to PahoFailureCause.TLS,
            java.net.SocketTimeoutException("public-sensitive-url") to PahoFailureCause.TIMEOUT,
            java.net.ProtocolException("public-sensitive-websocket") to PahoFailureCause.WEBSOCKET,
            java.io.IOException("public-sensitive-io") to PahoFailureCause.IO,
            IllegalStateException("public-sensitive-other") to PahoFailureCause.OTHER,
        )
        for ((cause, category) in cases) {
            val received = mutableListOf<PahoFailureDiagnostic>()
            val factory = PahoBrokerTransportFactory(clientFactory = { _, _, _ ->
                throw MqttException(MqttException.REASON_CODE_SERVER_CONNECT_ERROR.toInt(), cause)
            }, diagnostics = { received += it })
            val failure = runCatching { factory.create(options(), silentListener()) }.exceptionOrNull() as BrokerFailure
            assertEquals(BrokerFailureKind.UNAVAILABLE, failure.kind)
            assertEquals(BrokerFailureKind.UNAVAILABLE, received.single().kind)
            assertEquals(MqttException.REASON_CODE_SERVER_CONNECT_ERROR.toInt(), received.single().reasonCode)
            assertEquals(category, received.single().causeCategory)
            assertFalse(received.single().toString().contains("public-sensitive"))
            assertNull(failure.cause)
        }
    }

    @Test fun diagnosticsCoverCallbackSynchronousAndConnectionLossSdkFailures() = runBlocking {
        val received = mutableListOf<PahoFailureDiagnostic>()
        val callback = Fixture(diagnostics = { received += it })
        val attempt = async(start = CoroutineStart.UNDISPATCHED) { runCatching { callback.port.connect() } }
        callback.sdk.failure(MqttException(MqttException.REASON_CODE_CLIENT_TIMEOUT.toInt()))
        assertEquals(BrokerFailureKind.TIMEOUT, (attempt.await().exceptionOrNull() as BrokerFailure).kind)
        assertEquals(PahoFailureCause.TIMEOUT, received.removeAt(0).causeCategory)
        val synchronous = Fixture(diagnostics = { received += it })
        synchronous.sdk.throwNext = MqttException(MqttException.REASON_CODE_CONNECTION_LOST.toInt(), java.io.IOException("public-sensitive-sync"))
        failure(BrokerFailureKind.UNAVAILABLE) { synchronous.port.connect() }
        assertEquals(PahoFailureCause.IO, received.removeAt(0).causeCategory)
        val disconnect = Fixture(diagnostics = { received += it }); connect(disconnect)
        disconnect.sdk.callback!!.connectionLost(MqttException(MqttException.REASON_CODE_CONNECTION_LOST.toInt(), java.net.SocketTimeoutException()))
        assertEquals(BrokerFailureKind.UNAVAILABLE, disconnect.failures.single().kind)
        assertEquals(PahoFailureCause.TIMEOUT, received.single().causeCategory)
    }

    @Test fun sdkSetupFailureAlsoNotifiesDiagnosticsAndSchedulesTeardown() {
        val sdk = Sdk().apply { setupFailure = IllegalArgumentException("public-sensitive-setup") }
        val received = mutableListOf<PahoFailureDiagnostic>()
        val teardown = mutableListOf<() -> Unit>()
        val factory = PahoBrokerTransportFactory(clientFactory = { _, _, _ -> sdk.client },
            teardown = { teardown += it }, diagnostics = { received += it })
        val error = runCatching { factory.create(options(), silentListener()) }.exceptionOrNull() as BrokerFailure
        assertEquals(BrokerFailureKind.CONFIGURATION, error.kind)
        assertEquals(PahoFailureCause.OTHER, received.single().causeCategory)
        assertNull(received.single().reasonCode)
        assertEquals(1, teardown.size)
    }

    @Test fun throwingDiagnosticObserverCannotReplaceSdkOperationResult() = runBlocking {
        val f = Fixture(diagnostics = { throw IllegalStateException("observer failure") })
        val attempt = async(start = CoroutineStart.UNDISPATCHED) { runCatching { f.port.connect() } }
        f.sdk.failure(MqttException(MqttException.REASON_CODE_NOT_AUTHORIZED.toInt()))
        assertEquals(BrokerFailureKind.AUTHORIZATION, (attempt.await().exceptionOrNull() as BrokerFailure).kind)
        val creation = PahoBrokerTransportFactory(clientFactory = { _, _, _ -> throw java.net.UnknownHostException() },
            diagnostics = { throw IllegalStateException("observer failure") })
        assertEquals(BrokerFailureKind.UNAVAILABLE, (runCatching { creation.create(options(), silentListener()) }.exceptionOrNull() as BrokerFailure).kind)
    }

    @Test fun diagnosticsNeverReadMessagesToStringOrRawStackAndBoundCauseWalk() {
        val bomb = object : java.io.IOException() {
            override val message: String get() = error("Must not read SDK message")
            override fun toString(): String = error("Must not format SDK throwable")
            override fun getStackTrace(): Array<StackTraceElement> = error("Must not inspect SDK stack")
        }
        val received = mutableListOf<PahoFailureDiagnostic>()
        val factory = PahoBrokerTransportFactory(clientFactory = { _, _, _ -> throw MqttException(32103, bomb) }, diagnostics = { received += it })
        assertTrue(runCatching { factory.create(options(), silentListener()) }.exceptionOrNull() is BrokerFailure)
        assertEquals(PahoFailureCause.IO, received.single().causeCategory)
        val cycle = IllegalStateException("public-sensitive-cycle")
        val other = IllegalStateException("public-sensitive-cycle-2", cycle)
        cycle.initCause(other)
        val cyclic = PahoBrokerTransportFactory(clientFactory = { _, _, _ -> throw cycle }, diagnostics = { received += it })
        assertTrue(runCatching { cyclic.create(options(), silentListener()) }.exceptionOrNull() is BrokerFailure)
        assertEquals(PahoFailureCause.OTHER, received.last().causeCategory)
        assertFalse(received.toString().contains("public-sensitive"))
    }


    @Test fun genericMqttReasonUsesTypedTransientCauseConsistentlyForCallbackAndSyncFailures() = runBlocking {
        val cases = listOf(
            java.net.UnknownHostException("public-sensitive-dns") to BrokerFailureKind.UNAVAILABLE,
            java.net.ConnectException("public-sensitive-connect") to BrokerFailureKind.UNAVAILABLE,
            java.net.NoRouteToHostException("public-sensitive-route") to BrokerFailureKind.UNAVAILABLE,
            java.io.IOException("public-sensitive-io") to BrokerFailureKind.UNAVAILABLE,
            java.net.SocketTimeoutException("public-sensitive-timeout") to BrokerFailureKind.TIMEOUT,
            javax.net.ssl.SSLHandshakeException("public-sensitive-tls") to BrokerFailureKind.CONFIGURATION,
            java.security.cert.CertificateException("public-sensitive-certificate") to BrokerFailureKind.CONFIGURATION,
            java.io.IOException("public-sensitive-wrapper", javax.net.ssl.SSLHandshakeException("public-sensitive-inner-tls")) to BrokerFailureKind.CONFIGURATION,
            IllegalStateException("public-sensitive-other") to BrokerFailureKind.CONFIGURATION,
        )
        for ((cause, expected) in cases) {
            for (synchronous in listOf(false, true)) {
                val events = mutableListOf<PahoFailureDiagnostic>()
                val f = Fixture(diagnostics = { events += it })
                val sdkFailure = MqttException(MqttException.REASON_CODE_CLIENT_EXCEPTION.toInt(), cause)
                if (synchronous) f.sdk.throwNext = sdkFailure
                val attempt = async(start = CoroutineStart.UNDISPATCHED) { runCatching { f.port.connect() } }
                if (!synchronous) f.sdk.failure(sdkFailure)
                val error = attempt.await().exceptionOrNull() as BrokerFailure
                assertEquals(expected, error.kind)
                assertNull(error.cause)
                assertEquals(expected, events.single().kind)
                assertEquals(0, events.single().reasonCode)
                assertFalse(events.single().toString().contains("public-sensitive"))
            }
        }
    }

    @Test fun explicitAuthenticationReasonHasPriorityOverNestedTransientCause() = runBlocking {
        for (reason in listOf(MqttException.REASON_CODE_NOT_AUTHORIZED, MqttException.REASON_CODE_FAILED_AUTHENTICATION)) {
            for (cause in listOf(java.net.UnknownHostException(), java.net.SocketTimeoutException())) {
                val events = mutableListOf<PahoFailureDiagnostic>()
                val f = Fixture(diagnostics = { events += it })
                val attempt = async(start = CoroutineStart.UNDISPATCHED) { runCatching { f.port.connect() } }
                f.sdk.failure(MqttException(reason.toInt(), cause))
                assertEquals(BrokerFailureKind.AUTHORIZATION, (attempt.await().exceptionOrNull() as BrokerFailure).kind)
                assertEquals(BrokerFailureKind.AUTHORIZATION, events.single().kind)
            }
        }
    }

    @Test fun genericReasonTypedFallbackIsBoundedAndNeverFormatsTheSdkThrowable() {
        val bomb = object : java.net.UnknownHostException() {
            override val message: String get() = error("Do not read SDK message")
            override fun toString(): String = error("Do not format SDK cause")
            override fun getStackTrace(): Array<StackTraceElement> = error("Do not inspect SDK stack")
        }
        val events = mutableListOf<PahoFailureDiagnostic>()
        fun mapped(cause: Throwable): BrokerFailure {
            val factory = PahoBrokerTransportFactory(clientFactory = { _, _, _ -> throw MqttException(0, cause) }, diagnostics = { events += it })
            return runCatching { factory.create(options(), silentListener()) }.exceptionOrNull() as BrokerFailure
        }
        assertEquals(BrokerFailureKind.UNAVAILABLE, mapped(bomb).kind)
        assertEquals(PahoFailureCause.DNS, events.single().causeCategory)
        val cycle = IllegalStateException("public-sensitive-cycle")
        val second = IllegalStateException("public-sensitive-cycle-2", cycle)
        cycle.initCause(second)
        assertEquals(BrokerFailureKind.CONFIGURATION, mapped(cycle).kind)
        assertEquals(PahoFailureCause.OTHER, events.last().causeCategory)
        assertFalse(events.toString().contains("public-sensitive"))
    }

    private fun silentListener() = object : BrokerListener {
        override fun message(topic: String, payload: ByteArray) = Unit
        override fun disconnected(failure: BrokerFailure) = Unit
    }
}


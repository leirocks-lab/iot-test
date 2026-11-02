package com.rowan.iot.domain.device.mqtt.transport

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import org.junit.Assert.*
import org.junit.Test
import kotlin.coroutines.CoroutineContext

class SharedBrokerPoolTest {
    private val a = LeaseResource(1, "http-a", "thing-a")
    private val b = LeaseResource(1, "http-b", "thing-b")
    private fun topics(thing: String) = setOf("get/accepted", "get/rejected", "update/accepted", "update/rejected")
        .map { "\$aws/things/$thing/shadow/$it" }.toSet()

    private class Clock : PoolTiming {
        var now = 1_000_000L
        private val waiting = mutableListOf<Pair<Long, CompletableDeferred<Unit>>>()
        override fun nowEpochMillis() = now
        override suspend fun pause(millis: Long) {
            val wait = (now + millis) to CompletableDeferred<Unit>()
            waiting += wait
            try { wait.second.await() } finally { waiting.remove(wait) }
        }
        fun advance(millis: Long) {
            now += millis
            waiting.toList().filter { it.first <= now }.forEach { it.second.complete(Unit) }
        }
    }
    private data class Publication(val topic: String, val bytes: ByteArray, val qos: Int, val retain: Boolean)
    private class Factory : BrokerTransportFactory {
        val ports = mutableListOf<Port>()
        var subscribeGate: CompletableDeferred<Unit>? = null
        var connectGate: CompletableDeferred<Unit>? = null
        val denied = mutableSetOf<String>()
        override fun create(options: BrokerOptions, listener: BrokerListener): BrokerPort = Port(options, listener, this).also { ports += it }
    }
    private class Port(val options: BrokerOptions, val listener: BrokerListener, private val factory: Factory) : BrokerPort {
        var connects = 0
        var closes = 0
        val subscriptions = mutableListOf<Set<String>>()
        val unsubscriptions = mutableListOf<Set<String>>()
        val publications = mutableListOf<Publication>()
        var publishGate: CompletableDeferred<Unit>? = null
        var onPublish: ((String, ByteArray) -> Unit)? = null
        override suspend fun connect() { connects++; factory.connectGate?.await() }
        override suspend fun subscribe(exactTopics: Set<String>) {
            subscriptions += exactTopics.toSet()
            factory.subscribeGate?.await()
            if (exactTopics.any { topic -> factory.denied.any { "/$it/" in topic } })
                throw BrokerFailure(BrokerFailureKind.SUBSCRIPTION_DENIED)
        }
        override suspend fun unsubscribe(exactTopics: Set<String>) { unsubscriptions += exactTopics.toSet() }
        override suspend fun publish(topic: String, payload: ByteArray, qos: Int, retain: Boolean) {
            publications += Publication(topic, payload.copyOf(), qos, retain)
            onPublish?.invoke(topic, payload)
            publishGate?.await()
        }
        override fun close() { closes++ }
    }
    private class Fixture(capacity: Int = 8, timeoutMillis: Long = 5_000, maxAttempts: Int = 2) : AutoCloseable {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)
        val clock = Clock()
        val factory = Factory()
        var revision: Long? = 1
        var loads = 0
        var provider: suspend (LeaseResource) -> BrokerOptions = { options() }
        fun options(client: String = "shared-client", expiry: Long? = null) = BrokerOptions(
            BrokerKey(1, "mqtt.example.test", "/mqtt", client),
            "wss://mqtt.example.test:443/mqtt?signature=not-a-real-credential", null, null, expiry)
        val pool = SharedBrokerPool(scope, factory, { resource -> loads++; provider(resource) }, { revision }, clock,
            PoolPolicy(messageCapacity = capacity, renewBeforeMillis = 20, reconnectMinMillis = 10, reconnectMaxMillis = 10,
                maxReconnectAttempts = maxAttempts, operationTimeoutMillis = timeoutMillis, credentialTimeoutMillis = timeoutMillis))
        override fun close() { pool.close(); scope.cancel() }
    }
    private suspend fun ready(lease: ShadowLease) = withTimeout(5_000) { lease.state.first { it is LeaseState.Ready } as LeaseState.Ready }
    private suspend fun failed(lease: ShadowLease) = withTimeout(5_000) { lease.state.first { it is LeaseState.Failed } as LeaseState.Failed }

    private class PausedDispatcher : CoroutineDispatcher() {
        private val queue = java.util.ArrayDeque<Runnable>()
        override fun dispatch(context: CoroutineContext, block: Runnable) { synchronized(queue) { queue.addLast(block) } }
        val pending: Int get() = synchronized(queue) { queue.size }
        fun drain() {
            var executed = 0
            while (true) {
                val next = synchronized(queue) { queue.pollFirst() } ?: return
                check(++executed < 20_000) { "Dispatcher failed to quiesce" }
                next.run()
            }
        }
    }

    @Test fun twoObserversOfOneResourceShareCredentialsConnectionAndSubscriptions(): Unit = runBlocking {
        Fixture().use { f ->
            val first = f.pool.observe(a, "home"); val second = f.pool.observe(a, "rn")
            ready(first); ready(second)
            assertEquals(1, f.loads); assertEquals(1, f.factory.ports.size)
            assertEquals(listOf(topics(a.thingRef)), f.factory.ports.single().subscriptions)
            first.close(); assertEquals(0, f.factory.ports.single().closes)
            assertTrue(f.factory.ports.single().unsubscriptions.isEmpty())
            second.close(); yield(); assertEquals(1, f.factory.ports.single().closes)
        }
    }
    @Test fun resourcesWithTheSameServerClientShareOnePortAndReleaseOnlyTheirOwnTopics(): Unit = runBlocking {
        Fixture().use { f ->
            val one = f.pool.observe(a, "home"); val two = f.pool.observe(b, "home")
            ready(one); ready(two)
            val port = f.factory.ports.single()
            assertEquals(setOf(topics(a.thingRef), topics(b.thingRef)), port.subscriptions.toSet())
            one.close(); yield()
            assertEquals(listOf(topics(a.thingRef)), port.unsubscriptions)
            assertEquals(0, port.closes); assertTrue(two.state.value is LeaseState.Ready)
        }
    }
    @Test fun duplicateObserverIdentityFailsInsteadOfInflatingReferenceCounts(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); ready(lease)
            assertEquals(BrokerFailureKind.DUPLICATE_OBSERVER, failed(f.pool.observe(a, "home")).kind)
            lease.close(); yield(); assertEquals(1, f.factory.ports.single().closes)
        }
    }
    @Test fun readyRequiresEveryExactResponseSubscriptionAcknowledgement(): Unit = runBlocking {
        Fixture().use { f ->
            f.factory.subscribeGate = CompletableDeferred()
            val lease = f.pool.observe(a, "home")
            yield(); assertFalse(lease.state.value is LeaseState.Ready)
            assertEquals(topics(a.thingRef), f.factory.ports.single().subscriptions.single())
            f.factory.subscribeGate!!.complete(Unit); ready(lease)
        }
    }
    @Test fun aDeniedNewResourceDoesNotKickAnExistingAuthorizedConnection(): Unit = runBlocking {
        Fixture().use { f ->
            val authorized = f.pool.observe(a, "home"); ready(authorized)
            f.factory.denied += b.thingRef
            val denied = f.pool.observe(b, "rn")
            assertEquals(BrokerFailureKind.SUBSCRIPTION_DENIED, failed(denied).kind)
            assertEquals(1, f.factory.ports.size); assertEquals(0, f.factory.ports.single().closes)
            assertTrue(authorized.state.value is LeaseState.Ready)
        }
    }
    @Test fun publishingIsRestrictedToTheLeaseTopicsEpochAndFixedDeliveryFlags(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); val epoch = ready(lease).epoch
            lease.get(epoch); lease.update(epoch, byteArrayOf(1, 2))
            val sent = f.factory.ports.single().publications
            assertEquals("\$aws/things/thing-a/shadow/get", sent[0].topic); assertTrue(sent[0].bytes.isEmpty())
            assertEquals("\$aws/things/thing-a/shadow/update", sent[1].topic)
            assertTrue(sent.all { it.qos == 1 && !it.retain })
            assertTrue(runCatching { lease.update(epoch + 100, byteArrayOf(3)) }.isFailure)
            lease.close(); assertTrue(runCatching { lease.get(epoch) }.isFailure)
            assertEquals(2, sent.size)
        }
    }
    @Test fun cancellingAWaitDoesNotCancelAnotherObserversSharedConnection(): Unit = runBlocking {
        Fixture().use { f ->
            f.factory.subscribeGate = CompletableDeferred()
            val one = f.pool.observe(a, "home"); val two = f.pool.observe(a, "rn")
            val waiting = launch(start = CoroutineStart.UNDISPATCHED) { ready(one) }; waiting.cancelAndJoin()
            f.factory.subscribeGate!!.complete(Unit)
            ready(two); assertEquals(0, f.factory.ports.single().closes)
        }
    }
    @Test fun releaseDuringUncooperativeCredentialLoadCannotCreateABrokerConnection(): Unit = runBlocking {
        Fixture().use { f ->
            val started = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
            f.provider = { started.complete(Unit); withContext(NonCancellable) { finish.await() }; f.options() }
            val lease = f.pool.observe(a, "home"); started.await(); lease.close(); finish.complete(Unit); yield()
            assertTrue(f.factory.ports.isEmpty()); assertTrue(lease.state.value is LeaseState.Closed)
        }
    }
    @Test fun accountInvalidationClosesOldLeasesAndRejectsTheirCallbacksAndNewOperations(): Unit = runBlocking {
        Fixture().use { f ->
            val old = f.pool.observe(a, "home"); val epoch = ready(old).epoch; val port = f.factory.ports.single()
            f.revision = 2; f.pool.invalidateAccount(1); yield()
            assertTrue(old.state.value is LeaseState.Closed); assertEquals(1, port.closes)
            assertTrue(runCatching { old.get(epoch) }.isFailure)
            assertEquals(BrokerFailureKind.STALE_CONTEXT, failed(f.pool.observe(a, "old-observer")).kind)
            port.listener.disconnected(BrokerFailure(BrokerFailureKind.UNAVAILABLE)); f.clock.advance(100); yield()
            assertEquals(1, f.factory.ports.size)
        }
    }
    @Test fun disconnectRefetchesCredentialsAndSubscriptionsWithoutReplayingTheLastUpdate(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); val old = ready(lease).epoch
            lease.update(old, byteArrayOf(9))
            f.factory.ports.first().listener.disconnected(BrokerFailure(BrokerFailureKind.UNAVAILABLE))
            f.clock.advance(10); yield()
            val recovered = ready(lease)
            assertNotEquals(old, recovered.epoch); assertEquals(2, f.loads)
            assertEquals(2, f.factory.ports.size)
            assertEquals(listOf(topics(a.thingRef)), f.factory.ports.last().subscriptions)
            assertTrue(f.factory.ports.last().publications.isEmpty())
        }
    }
    @Test fun oldPortCallbacksCannotAffectAReplacementConnection(): Unit = runBlocking {
        Fixture().use { f ->
            val first = f.pool.observe(a, "home"); ready(first); val oldPort = f.factory.ports.single()
            first.close(); yield()
            val next = f.pool.observe(a, "home"); val current = ready(next)
            oldPort.listener.disconnected(BrokerFailure(BrokerFailureKind.AUTHORIZATION))
            oldPort.listener.message(topics(a.thingRef).first(), byteArrayOf(99)); yield()
            assertEquals(current, next.state.value)
            assertTrue(f.factory.ports.last().publications.isEmpty())
        }
    }
    @Test fun expirationIsAlreadyDecodedEpochMillisAndNeverGuessedFromMagnitude(): Unit = runBlocking {
        Fixture().use { f ->
            f.provider = { f.options(expiry = 1234) }
            assertEquals(BrokerFailureKind.EXPIRED_CREDENTIALS, failed(f.pool.observe(a, "home")).kind)
            assertTrue(f.factory.ports.isEmpty())
        }
    }
    @Test fun renewalMovesAChangedClientIdIntoAnExistingEntryWithoutKickingIt(): Unit = runBlocking {
        Fixture().use { f ->
            var aLoads = 0
            f.provider = { resource ->
                if (resource == a && aLoads++ == 0) f.options("client-a", f.clock.now + 100)
                else f.options("client-b", if (resource == a) f.clock.now + 200 else null)
            }
            val one = f.pool.observe(a, "home"); val old = ready(one)
            val two = f.pool.observe(b, "rn"); val unaffected = ready(two)
            f.clock.advance(80); yield()
            val moved = ready(one)
            assertNotEquals(old.epoch, moved.epoch)
            assertEquals(2, f.factory.ports.size)
            assertEquals(1, f.factory.ports.first().closes); assertEquals(0, f.factory.ports.last().closes)
            assertEquals(unaffected, two.state.value)
            assertTrue(f.factory.ports.last().subscriptions.contains(topics(a.thingRef)))
        }
    }
    @Test fun sameKeyRenewalCreatesANewEpochAndDoesNotReplayCommands(): Unit = runBlocking {
        Fixture().use { f ->
            var calls = 0
            f.provider = { f.options(expiry = f.clock.now + if (calls++ == 0) 100 else 200) }
            val lease = f.pool.observe(a, "home"); val old = ready(lease).epoch
            lease.update(old, byteArrayOf(1)); f.clock.advance(80); yield()
            assertNotEquals(old, ready(lease).epoch)
            assertEquals(2, f.factory.ports.size)
            assertTrue(f.factory.ports.last().publications.isEmpty())
        }
    }
    @Test fun overflowInvalidatesOnlyTheSlowLeaseAndRequiresANewEpochSnapshot(): Unit = runBlocking {
        Fixture(1).use { f ->
            val slow = f.pool.observe(a, "slow"); val slowEpoch = ready(slow).epoch
            val fast = f.pool.observe(a, "fast"); val fastState = ready(fast)
            val received = mutableListOf<BrokerMessage>()
            val collect = launch(start = CoroutineStart.UNDISPATCHED) { fast.messages.take(2).toList(received) }
            val port = f.factory.ports.single(); val topic = topics(a.thingRef).first()
            port.listener.message(topic, byteArrayOf(1)); yield()
            port.listener.message(topic, byteArrayOf(2)); yield(); collect.join()
            assertNotEquals(slowEpoch, ready(slow).epoch)
            assertEquals(ReadyReason.BUFFER_RECOVERY, (slow.state.value as LeaseState.Ready).reason)
            assertEquals(fastState, fast.state.value); assertEquals(2, received.size)
            assertEquals(1, f.factory.ports.size); assertEquals(0, port.closes)
            assertTrue(runCatching { slow.update(slowEpoch, byteArrayOf(8)) }.isFailure)
        }
    }
    @Test fun routingCopiesInboundPayloadAndNeverRoutesAnotherDevicesTopic(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); val epoch = ready(lease).epoch
            val source = byteArrayOf(7); val port = f.factory.ports.single()
            port.listener.message(topics(b.thingRef).first(), byteArrayOf(99))
            port.listener.message(topics(a.thingRef).first(), source); source[0] = 0
            val received = withTimeout(1_000) { lease.messages.first() }
            assertEquals(epoch, received.epoch); assertArrayEquals(byteArrayOf(7), received.payload)
        }
    }
    @Test fun aLatePubackFromAnOldEpochCannotReportSuccessOrReplay(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); val old = ready(lease).epoch
            val port = f.factory.ports.single(); port.publishGate = CompletableDeferred()
            val sending = async { runCatching { lease.update(old, byteArrayOf(4)) } }; yield()
            port.listener.disconnected(BrokerFailure(BrokerFailureKind.UNAVAILABLE)); f.clock.advance(10); yield()
            port.publishGate!!.complete(Unit)
            assertTrue(sending.await().isFailure)
            assertEquals(1, port.publications.size); assertTrue(f.factory.ports.last().publications.isEmpty())
        }
    }
    @Test fun cancellingTheApplicationScopeClosesPortsWithoutWaitingForObservers(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); ready(lease)
            f.scope.cancel(); yield()
            assertEquals(1, f.factory.ports.single().closes)
            assertTrue(lease.state.value is LeaseState.Closed)
        }
    }
    @Test fun authorizationFailureNeedsExplicitRetryAndNeverLoopsAutomatically(): Unit = runBlocking {
        Fixture().use { f ->
            val lease = f.pool.observe(a, "home"); val old = ready(lease).epoch
            f.factory.ports.single().listener.disconnected(BrokerFailure(BrokerFailureKind.AUTHORIZATION))
            assertEquals(BrokerFailureKind.AUTHORIZATION, failed(lease).kind)
            f.clock.advance(10_000); yield(); assertEquals(1, f.factory.ports.size)
            lease.retry(); assertNotEquals(old, ready(lease).epoch)
            assertEquals(2, f.factory.ports.size)
        }
    }
    @Test fun credentialAndConnackTimeoutsAreBoundedAndCloseAttemptedPorts(): Unit = runBlocking {
        Fixture(timeoutMillis = 20, maxAttempts = 0).use { f ->
            f.provider = { awaitCancellation() }
            assertEquals(BrokerFailureKind.TIMEOUT, failed(f.pool.observe(a, "home")).kind)
            assertTrue(f.factory.ports.isEmpty())
        }
        Fixture(timeoutMillis = 20, maxAttempts = 0).use { f ->
            f.factory.connectGate = CompletableDeferred()
            assertEquals(BrokerFailureKind.TIMEOUT, failed(f.pool.observe(a, "home")).kind)
            assertEquals(1, f.factory.ports.single().closes)
        }
    }

    @Test fun sdkIngressRemainsBoundedWhileTheApplicationDispatcherIsBlocked(): Unit = runBlocking {
        val dispatcher = PausedDispatcher()
        val application = CoroutineScope(SupervisorJob() + dispatcher)
        val clock = Clock(); val factory = Factory()
        val options = BrokerOptions(BrokerKey(1, "mqtt.example.test", "/mqtt", "client"),
            "wss://mqtt.example.test/mqtt?signature=fake", null, null, null)
        val pool = SharedBrokerPool(application, factory, { options }, { 1L }, clock,
            PoolPolicy(messageCapacity = 2, maxPayloadBytes = 32))
        try {
            val lease = pool.observe(a, "slow")
            dispatcher.drain()
            val before = lease.state.value as LeaseState.Ready
            val port = factory.ports.single(); val topic = topics(a.thingRef).first()
            repeat(500) { port.listener.message(topic, ByteArray(8)) }
            repeat(500) { port.listener.message(topic, ByteArray(33)) }
            assertTrue("SDK ingress must not schedule one retained payload/coroutine per packet: ${dispatcher.pending}", dispatcher.pending <= 8)
            dispatcher.drain()
            val recovered = lease.state.value as LeaseState.Ready
            assertNotEquals(before.epoch, recovered.epoch)
            assertEquals(ReadyReason.BUFFER_RECOVERY, recovered.reason)
            assertEquals(1, factory.ports.size)
        } finally { pool.close(); application.cancel(); dispatcher.drain() }
    }

    @Test fun releasingASubackWaiterRemovesOnlyItsUncommittedTopicsOnASharedConnection(): Unit = runBlocking {
        Fixture().use { f ->
            val existing = f.pool.observe(a, "home"); val unaffected = ready(existing)
            val port = f.factory.ports.single()
            f.factory.subscribeGate = CompletableDeferred()
            val pending = f.pool.observe(b, "rn"); yield()
            assertTrue(port.subscriptions.contains(topics(b.thingRef)))
            pending.close(); yield()
            assertTrue("SUBSCRIBE was sent; cancellation before SUBACK must still remove those topics", port.unsubscriptions.contains(topics(b.thingRef)))
            assertTrue(port.unsubscriptions.none { batch -> batch.any { it in topics(a.thingRef) } })
            assertEquals(0, port.closes); assertEquals(unaffected, existing.state.value)
            f.factory.subscribeGate!!.complete(Unit); yield()
            assertTrue(pending.state.value is LeaseState.Closed)
        }
    }

    @Test fun subackTimeoutRemovesItsUncommittedTopicsWithoutClosingOtherResources(): Unit = runBlocking {
        Fixture(timeoutMillis = 30, maxAttempts = 0).use { f ->
            val existing = f.pool.observe(a, "home"); val unaffected = ready(existing)
            val port = f.factory.ports.single()
            f.factory.subscribeGate = CompletableDeferred()
            val pending = f.pool.observe(b, "rn")
            assertEquals(BrokerFailureKind.TIMEOUT, failed(pending).kind)
            assertTrue("Timed out SUBSCRIBE still needs cleanup", port.unsubscriptions.contains(topics(b.thingRef)))
            assertEquals(0, port.closes); assertEquals(unaffected, existing.state.value)
        }
    }

    @Test fun aCallersShorterPublishTimeoutDoesNotCloseOtherLeasesOrReplayTheCommand(): Unit = runBlocking {
        Fixture().use { f ->
            val one = f.pool.observe(a, "home"); val first = ready(one)
            val two = f.pool.observe(b, "rn"); val unaffected = ready(two)
            val port = f.factory.ports.single(); port.publishGate = CompletableDeferred()
            val error = runCatching { withTimeout(20) { one.update(first.epoch, byteArrayOf(4)) } }.exceptionOrNull()
            assertTrue("Caller cancellation must propagate as cancellation", error is CancellationException)
            assertEquals("An outer timeout is not a shared transport failure", 0, port.closes)
            assertEquals(unaffected, two.state.value)
            port.publishGate!!.complete(Unit)
            two.get(unaffected.epoch)
            assertEquals(1, port.publications.count { it.topic.endsWith("/update") })
            assertEquals(1, f.factory.ports.size)
        }
    }

    @Test fun recoveryReadyDoesNotDiscardAnImmediateResponseToTheOwnersFreshGet(): Unit = runBlocking {
        val dispatcher = PausedDispatcher()
        val application = CoroutineScope(SupervisorJob() + dispatcher)
        val factory = Factory(); val clock = Clock()
        val options = BrokerOptions(BrokerKey(1, "mqtt.example.test", "/mqtt", "client"),
            "wss://mqtt.example.test/mqtt?signature=fake", null, null, null)
        val pool = SharedBrokerPool(application, factory, { options }, { 1L }, clock, PoolPolicy(messageCapacity = 2))
        try {
            val lease = pool.observe(a, "owner"); dispatcher.drain()
            val requestedEpoch = CompletableDeferred<Long>()
            var insideDrain = false; var repliedSynchronously = false
            val port = factory.ports.single(); val response = "\$aws/things/${a.thingRef}/shadow/get/accepted"
            port.onPublish = { topic, _ ->
                if (topic.endsWith("/get")) {
                    repliedSynchronously = insideDrain
                    port.listener.message(response, byteArrayOf(42))
                }
            }
            val owner = launch(Dispatchers.Unconfined, start = CoroutineStart.UNDISPATCHED) {
                val recovered = lease.state.first { it is LeaseState.Ready && it.reason == ReadyReason.BUFFER_RECOVERY } as LeaseState.Ready
                requestedEpoch.complete(recovered.epoch)
                lease.get(recovered.epoch)
            }
            repeat(3) { port.listener.message(response, byteArrayOf(1)) }
            insideDrain = true; dispatcher.drain(); insideDrain = false
            owner.join()
            assertTrue("The regression must exercise a response before recovery notification returns", repliedSynchronously)
            val epoch = requestedEpoch.await()
            assertEquals(epoch, (lease.state.value as LeaseState.Ready).epoch)
            val received = withTimeout(1_000) { lease.messages.first() }
            assertEquals(epoch, received.epoch); assertArrayEquals(byteArrayOf(42), received.payload)
        } finally { pool.close(); application.cancel(); dispatcher.drain() }
    }
}

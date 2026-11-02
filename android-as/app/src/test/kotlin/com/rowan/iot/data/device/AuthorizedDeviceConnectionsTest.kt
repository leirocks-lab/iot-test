package com.rowan.iot.data.device

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.account.AccountSession
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.mqtt.transport.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class AuthorizedDeviceConnectionsTest {
    private fun session() = AccountSession.decode(JSONObject().put("accessToken", "fake-access")
        .put("refreshToken", "fake-refresh").put("userID", "user").put("setting", JSONObject()))
    private class Lease(override val resource: LeaseResource, override val observerID: String) : ShadowLease {
        override val state = MutableStateFlow<LeaseState>(LeaseState.Connecting)
        override val messages = emptyFlow<BrokerMessage>()
        var closes = 0
        override suspend fun get(expectedEpoch: Long) = Unit
        override suspend fun update(expectedEpoch: Long, payload: ByteArray) = error("not a control service")
        override fun retry() = Unit
        override fun close() { closes++ }
    }
    private inner class Fixture {
        val contexts = MutableStateFlow(AccountContext(7, session()))
        val device = AuthorizedDevice(7, "resource", "user", "product", "WineCooler", "Device", null)
        var calls = 0
        var thing = "thing"
        var hook: suspend () -> Unit = {}
        val gateway = object : DeviceAccessGateway {
            override suspend fun authorize(resourceId: String, expectedRevision: Long) = error("proof must come from owner")
            override suspend fun connection(device: AuthorizedDevice): PreparedDeviceConnection {
                calls++; hook()
                return PreparedDeviceConnection(device.resourceId, thing, BrokerOptions(
                    BrokerKey(7, "broker.test", "/mqtt", "server-client"),
                    "wss://broker.test:443/mqtt?signature=fake-$calls", null, null, null))
            }
        }
        val registry = AuthorizedDeviceConnections(contexts, gateway)
        val raw = mutableListOf<Lease>()
        suspend fun open(observer: String) = registry.open(device, observer) { resource, id ->
            Lease(resource, id).also { raw += it }
        }
    }
    @Test fun prefetchIsNeverReusedAsAReconnectCredential(): Unit = runBlocking {
        val f = Fixture(); val lease = f.open("home")
        assertEquals(1, f.calls)
        val first = f.registry.credentials(lease.resource)
        val second = f.registry.credentials(lease.resource)
        assertEquals(3, f.calls)
        assertNotEquals(first.signedWssUri, second.signedWssUri)
        assertNull(first.expiresAtEpochMillis)
        lease.close()
        assertTrue(runCatching { f.registry.credentials(lease.resource) }.isFailure)
    }
    @Test fun oldLeaseCloseCannotRemoveReplacementProofForSameResource(): Unit = runBlocking {
        val f = Fixture(); val old = f.open("old"); val replacement = f.open("new")
        old.close(); old.close()
        assertEquals(1, f.raw.first().closes)
        f.registry.credentials(replacement.resource)
        replacement.close()
        assertTrue(runCatching { f.registry.credentials(replacement.resource) }.isFailure)
    }
    @Test fun refreshedThingReferenceMismatchIsRejectedWithoutFabricatingAnIdentity(): Unit = runBlocking {
        val f = Fixture(); val lease = f.open("home"); f.thing = "other-thing"
        val failure = runCatching { f.registry.credentials(lease.resource) }.exceptionOrNull() as BrokerFailure
        assertEquals(BrokerFailureKind.CONFIGURATION, failure.kind)
        lease.close()
    }
    @Test fun accountChangeDuringCredentialFetchCannotReturnOldAccountOptions(): Unit = runBlocking {
        val f = Fixture(); val lease = f.open("home")
        f.hook = { f.contexts.value = AccountContext(8, session()) }
        val failure = runCatching { f.registry.credentials(lease.resource) }.exceptionOrNull() as BrokerFailure
        assertEquals(BrokerFailureKind.STALE_CONTEXT, failure.kind)
        f.registry.invalidateAccount(7)
        lease.close()
    }
    @Test fun cancelledPrefetchDoesNotRegisterOrOpenThePool(): Unit = runBlocking {
        val f = Fixture(); val entered = CompletableDeferred<Unit>()
        f.hook = { entered.complete(Unit); awaitCancellation() }
        val task = launch(start = CoroutineStart.UNDISPATCHED) { f.open("home") }
        entered.await(); task.cancelAndJoin()
        assertTrue(f.raw.isEmpty())
        assertTrue(runCatching { f.registry.credentials(LeaseResource(7, "resource", "thing")) }.isFailure)
    }
}

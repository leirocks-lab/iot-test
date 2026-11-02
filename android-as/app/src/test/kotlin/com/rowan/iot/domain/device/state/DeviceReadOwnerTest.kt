package com.rowan.iot.domain.device.state

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.account.AccountSession
import com.rowan.iot.domain.device.AuthorizedDevice
import com.rowan.iot.domain.device.DeviceAccessGateway
import com.rowan.iot.domain.device.PreparedDeviceConnection
import com.rowan.iot.domain.device.mqtt.OnlineField
import com.rowan.iot.domain.device.mqtt.ShadowProfile
import com.rowan.iot.domain.device.mqtt.ShadowValue
import com.rowan.iot.domain.device.mqtt.transport.*
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.receiveAsFlow
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class DeviceReadOwnerTest {
    private fun session(user: String = "native-user", token: String = "fake-access") = AccountSession.decode(JSONObject()
        .put("accessToken", token).put("refreshToken", "fake-refresh").put("userID", user).put("setting", JSONObject()))
    private fun readProfile() = ShadowProfile(emptyMap(), OnlineField(listOf("ConnectType"), ShadowValue.Text("online"), ShadowValue.Text("offline")))

    private class Lease(
        override val resource: LeaseResource,
        override val observerID: String,
        key: BrokerKey,
        epoch: Long,
    ) : ShadowLease {
        override val state = MutableStateFlow<LeaseState>(LeaseState.Ready(epoch, key, ReadyReason.INITIAL))
        private val incoming = Channel<BrokerMessage>(64)
        override val messages = incoming.receiveAsFlow()
        val gets = mutableListOf<Long>()
        var updates = 0
        var closes = 0
        var retries = 0
        // Exercise late producer callbacks even after this fake acknowledges close.
        var allowLateMessagesAfterClose = false
        var beforePuback: suspend (Lease, Long) -> Unit = { _, _ -> }
        var pubackGate: CompletableDeferred<Unit>? = null
        override suspend fun get(expectedEpoch: Long) {
            check((state.value as? LeaseState.Ready)?.epoch == expectedEpoch)
            gets += expectedEpoch
            beforePuback(this, expectedEpoch)
            pubackGate?.await()
        }
        override suspend fun update(expectedEpoch: Long, payload: ByteArray) { updates++; error("A read owner must never publish control") }
        override fun retry() { retries++ }
        override fun close() { closes++; state.value = LeaseState.Closed; if (!allowLateMessagesAfterClose) incoming.close() }
        suspend fun report(epoch: Long, version: Long, reported: String, suffix: String = "get/accepted") {
            val body = """{"state":{"reported":$reported},"version":$version}""".toByteArray()
            incoming.send(BrokerMessage(epoch, "\$aws/things/${resource.thingRef}/shadow/$suffix", body))
        }
        fun ready(epoch: Long, reason: ReadyReason = ReadyReason.RECONNECTED) {
            val key = (state.value as LeaseState.Ready).key
            state.value = LeaseState.Ready(epoch, key, reason)
        }
    }

    private inner class Fixture(
        pendingCapacity: Int = 8,
        snapshotTimeout: Long = 5_000,
        initial: AccountContext = AccountContext(7, session()),
    ) : AutoCloseable {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)
        val contexts = MutableStateFlow(initial)
        val proofs = mutableListOf<AuthorizedDevice>()
        val leases = mutableListOf<Lease>()
        val invalidated = mutableListOf<Long>()
        var authorizations = 0
        var connections = 0
        var opens = 0
        var autoReply = true
        var profile: suspend (AuthorizedDevice) -> ShadowProfile? = { readProfile() }
        var authorizeHook: suspend (String, Long) -> Unit = { _, _ -> }
        var connectionHook: suspend (AuthorizedDevice) -> Unit = {}
        var leaseHook: (Lease) -> Unit = {}
        val gateway = object : DeviceAccessGateway {
            override suspend fun authorize(resourceId: String, expectedRevision: Long): AuthorizedDevice {
                authorizations++
                val user = contexts.value.session!!.userId
                authorizeHook(resourceId, expectedRevision)
                return AuthorizedDevice(expectedRevision, resourceId, user, "product-verified", "WineCooler", "原生客厅设备", "sa").also { proofs += it }
            }
            override suspend fun connection(device: AuthorizedDevice): PreparedDeviceConnection {
                connections++; connectionHook(device)
                return PreparedDeviceConnection(device.resourceId, "thing-${device.resourceId}", BrokerOptions(
                    BrokerKey(device.accountRevision, "mqtt.example.test", "/mqtt", "server-client"),
                    "wss://mqtt.example.test:443/mqtt?signature=fake-sensitive", "fake-connect-user", "fake-connect-password", null))
            }
        }
        val owner = DeviceReadOwner(scope, contexts, gateway, { device, observer ->
            opens++
            val prepared = gateway.connection(device)
            Lease(LeaseResource(device.accountRevision, device.resourceId, prepared.thingRef), observer, prepared.options.key,
                100L + leases.size).also { lease ->
                lease.beforePuback = { target, epoch ->
                    if (autoReply) target.report(epoch, 1, """{"ConnectType":"online","Temperature":12}""")
                }
                leaseHook(lease)
                leases += lease
            }
        }, { revision -> invalidated += revision }, { device -> profile(device) },
            DeviceReadPolicy(mailboxCapacity = 8, pendingMessageCapacity = pendingCapacity,
                initializationTimeoutMillis = 5_000, snapshotTimeoutMillis = snapshotTimeout))
        override fun close() { owner.close(); scope.cancel() }
    }

    private fun current(handle: DeviceReadHandle) = (handle.state.value as DeviceObservationState.Current).snapshot
    private suspend fun snapshot(handle: DeviceReadHandle, predicate: (DeviceReadSnapshot) -> Boolean): DeviceReadSnapshot = withTimeout(5_000) {
        (handle.state.first { it is DeviceObservationState.Current && predicate(it.snapshot) } as DeviceObservationState.Current).snapshot
    }
    private suspend fun live(handle: DeviceReadHandle) = snapshot(handle) { it.phase == DeviceReadPhase.LIVE && it.snapshotAvailable }

    @Test fun homeAndRnShareOneNativeAuthorizationLeaseReducerAndSnapshot(): Unit = runBlocking {
        Fixture().use { f ->
            val home = f.owner.observe("resource-a", "home")
            val rn = f.owner.observe("resource-a", "rn")
            val first = live(home); val second = live(rn)
            assertEquals(1, f.authorizations); assertEquals(1, f.connections); assertEquals(1, f.opens)
            assertEquals(first, second)
            assertEquals("原生客厅设备", first.metadata!!.title)
            assertEquals(true, first.online)
            assertEquals(12, JSONObject(first.reportedJson).getInt("Temperature"))
            assertEquals(listOf(100L), f.leases.single().gets)
            assertEquals(0, f.leases.single().updates)
        }
    }

    @Test fun ownershipRevocationSynchronouslyClearsAllHandlesAndCannotBeUndoneByOldLeaseMessages(): Unit = runBlocking {
        Fixture().use { f ->
            f.leaseHook = { it.allowLateMessagesAfterClose = true }
            val home = f.owner.observe("resource-a", "home")
            val rn = f.owner.observe("resource-a", "rn")
            val other = f.owner.observe("resource-b", "other")
            val initial = live(home); live(rn); val otherBefore = live(other)
            val old = f.leases.first { it.resource.resourceID == "resource-a" }
            val ready = old.state.value as LeaseState.Ready
            assertTrue(f.owner.revokeOwnership(rn))
            // Must already be safe at method return, before an actor cleanup can be awaited.
            for (handle in listOf(home, rn)) {
                val denied = handle.getSnapshot()
                assertEquals(DeviceReadPhase.FORBIDDEN, denied.phase)
                assertEquals(DeviceReadFailure.AUTHORIZATION, denied.failure)
                assertNull(denied.metadata); assertNull(denied.online)
                assertFalse(denied.snapshotAvailable); assertFalse(denied.stale)
                assertEquals(0, JSONObject(denied.reportedJson).length())
                assertTrue(denied.authorityRevision > initial.authorityRevision)
            }
            assertEquals(1, old.closes)
            old.report(ready.epoch, 99, """{"ConnectType":"online","Temperature":99}""")
            old.state.value = ready.copy(epoch = ready.epoch + 1000)
            home.retry(); rn.retry(); repeat(10) { yield() }
            assertEquals(2, f.authorizations); assertEquals(2, f.opens)
            assertEquals(DeviceReadPhase.FORBIDDEN, home.getSnapshot().phase)
            assertEquals(0, JSONObject(rn.getSnapshot().reportedJson).length())
            assertEquals(otherBefore, other.getSnapshot())
            val otherLease = f.leases.first { it.resource.resourceID == "resource-b" }
            assertEquals(0, otherLease.closes)
            otherLease.report(otherBefore.connectionEpoch!!, 2, """{"ConnectType":"online","Temperature":17}""")
            snapshot(other) { JSONObject(it.reportedJson).optInt("Temperature") == 17 }
        }
    }

    @Test fun releasedHandleCannotRevokeAReplacementResourceAtTheSameAccountRevision(): Unit = runBlocking {
        Fixture().use { f ->
            val old = f.owner.observe("resource-a", "rn"); live(old); old.close()
            val replacement = f.owner.observe("resource-a", "rn"); val before = live(replacement)
            assertFalse(f.owner.revokeOwnership(old))
            assertEquals(before, replacement.getSnapshot()); assertEquals(0, f.leases.last().closes)
        }
    }

    @Test fun oldAccountHandleCannotRevokeNewAccountAuthorityForTheSameDevice(): Unit = runBlocking {
        Fixture().use { f ->
            val old = f.owner.observe("resource-a", "rn"); live(old)
            f.contexts.value = AccountContext(8, session("new-user")); yield()
            val replacement = f.owner.observe("resource-a", "rn"); val before = live(replacement)
            assertFalse(f.owner.revokeOwnership(old))
            assertEquals(8L, replacement.getSnapshot().accountRevision)
            assertEquals(before, replacement.getSnapshot()); assertEquals(0, f.leases.last().closes)
        }
    }

    @Test fun aHandleFromAnotherOwnerCannotBeUsedAsARevocationCapability(): Unit = runBlocking {
        Fixture().use { first -> Fixture().use { second ->
            val a = first.owner.observe("resource-a", "rn"); val b = second.owner.observe("resource-a", "rn")
            val beforeA = live(a); val beforeB = live(b)
            assertFalse(second.owner.revokeOwnership(a))
            assertEquals(beforeA, a.getSnapshot()); assertEquals(beforeB, b.getSnapshot())
            assertEquals(0, first.leases.single().closes); assertEquals(0, second.leases.single().closes)
        } }
    }

    @Test fun revocationWhileAuthorizationIgnoresCancellationCannotPublishOrOpenALateLease(): Unit = runBlocking {
        Fixture().use { f ->
            val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
            f.authorizeHook = { _, _ -> entered.complete(Unit); withContext(NonCancellable) { finish.await() } }
            val handle = f.owner.observe("resource-a", "rn"); entered.await()
            assertTrue(f.owner.revokeOwnership(handle))
            assertEquals(DeviceReadPhase.FORBIDDEN, handle.getSnapshot().phase)
            handle.retry(); finish.complete(Unit); repeat(10) { yield() }
            assertEquals(1, f.authorizations); assertEquals(0, f.opens)
            val denied = handle.getSnapshot()
            assertEquals(DeviceReadPhase.FORBIDDEN, denied.phase); assertNull(denied.metadata)
            assertEquals(0, JSONObject(denied.reportedJson).length())
        }
    }

    @Test fun forbiddenMembershipNeverRequestsCredentialsOrConnectsABroker(): Unit = runBlocking {
        Fixture().use { f ->
            f.authorizeHook = { _, _ -> throw ApiFailure(403, "forbidden") }
            val handle = f.owner.observe("not-authorized", "rn")
            val state = snapshot(handle) { it.phase == DeviceReadPhase.FORBIDDEN }
            assertEquals(1, f.authorizations); assertEquals(0, f.connections); assertEquals(0, f.opens)
            assertTrue(f.leases.isEmpty()); assertNull(state.metadata); assertNull(state.online)
            assertFalse(state.snapshotAvailable); assertEquals(0, JSONObject(state.reportedJson).length())
        }
    }

    @Test fun missingLoginOrPendingCleanupNeverStartsAuthorization(): Unit = runBlocking {
        for (context in listOf(AccountContext(7, null), AccountContext(7, null, true))) {
            Fixture(initial = context).use { f ->
                val handle = f.owner.observe("resource-a", "home")
                assertTrue(handle.state.value is DeviceObservationState.Closed)
                assertEquals(0, f.authorizations); assertEquals(0, f.opens)
                assertTrue(runCatching { handle.getSnapshot() }.isFailure)
            }
        }
    }

    @Test fun aSlowAuthorizeRemainsUnknownAndDoesNotConnectPrematurely(): Unit = runBlocking {
        Fixture().use { f ->
            val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
            f.authorizeHook = { _, _ -> started.complete(Unit); release.await() }
            val handle = f.owner.observe("resource-a", "home"); started.await()
            assertEquals(DeviceReadPhase.AUTHORIZING, current(handle).phase)
            assertNull(current(handle).online); assertFalse(current(handle).snapshotAvailable)
            assertEquals(0, f.opens)
            release.complete(Unit); live(handle)
        }
    }

    @Test fun accountChangeClosesObserversInvalidatesOldPoolAndRejectsLateAuthorization(): Unit = runBlocking {
        Fixture().use { f ->
            val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
            f.authorizeHook = { _, _ -> started.complete(Unit); withContext(NonCancellable) { release.await() } }
            val old = f.owner.observe("resource-a", "home"); started.await()
            f.contexts.value = AccountContext(8, session("other-user"))
            release.complete(Unit); yield()
            assertTrue(old.state.value is DeviceObservationState.Closed)
            assertEquals(listOf(7L), f.invalidated); assertEquals(0, f.opens)
            assertTrue(runCatching { old.getSnapshot() }.isFailure)
            f.authorizeHook = { _, _ -> }
            val next = f.owner.observe("resource-a", "home"); assertEquals(8L, live(next).accountRevision)
            assertEquals("other-user", f.proofs.last().userId)
        }
    }

    @Test fun tokenRefreshAtTheSameRevisionDoesNotForkOrReconnectDeviceAuthority(): Unit = runBlocking {
        Fixture().use { f ->
            val handle = f.owner.observe("resource-a", "home"); val before = live(handle)
            f.contexts.value = AccountContext(7, session(token = "fake-refreshed-access")); yield()
            assertEquals(1, f.authorizations); assertEquals(1, f.opens); assertEquals(0, f.leases.single().closes)
            assertEquals(before.connectionEpoch, handle.getSnapshot().connectionEpoch)
            assertEquals(true, handle.getSnapshot().online)
        }
    }

    @Test fun responseBeforeGetPubackIsHandledWithoutBlockingTheMessageOwner(): Unit = runBlocking {
        Fixture().use { f ->
            val ack = CompletableDeferred<Unit>()
            f.leaseHook = { it.pubackGate = ack }
            val handle = f.owner.observe("resource-a", "home")
            val observed = live(handle)
            assertEquals(12, JSONObject(observed.reportedJson).getInt("Temperature"))
            assertFalse(ack.isCompleted)
            assertTrue(observed.snapshotAvailable)
            ack.complete(Unit)
        }
    }

    @Test fun transportReadyAndPubackAloneDoNotInventADeviceSnapshotOrOnlineState(): Unit = runBlocking {
        Fixture().use { f ->
            f.autoReply = false
            val handle = f.owner.observe("resource-a", "home")
            val reading = snapshot(handle) { it.phase == DeviceReadPhase.READING }
            assertNull(reading.online); assertFalse(reading.snapshotAvailable)
            assertEquals(0, JSONObject(reading.reportedJson).length())
            assertEquals(listOf(100L), f.leases.single().gets)
        }
    }

    @Test fun anEmptyValidShadowSnapshotCompletesReadingWithUnknownValues(): Unit = runBlocking {
        Fixture().use { f ->
            f.autoReply = false
            val handle = f.owner.observe("resource-a", "home")
            snapshot(handle) { it.phase == DeviceReadPhase.READING }
            f.leases.single().report(100, 1, "{}")
            val observed = live(handle)
            assertNull(observed.online); assertEquals(0, JSONObject(observed.reportedJson).length())
            assertTrue(observed.snapshotAvailable)
        }
    }

    @Test fun absentReadProfileDoesNotGuessConnectTypeOrPublishControls(): Unit = runBlocking {
        Fixture().use { f ->
            f.profile = { null }
            val observed = live(f.owner.observe("resource-a", "rn"))
            assertTrue(observed.snapshotAvailable); assertNull(observed.online)
            assertEquals("online", JSONObject(observed.reportedJson).getString("ConnectType"))
            assertEquals(0, f.leases.single().updates)
            val text = observed.toString()
            assertFalse(text.contains("fake-access")); assertFalse(text.contains("fake-connect-password")); assertFalse(text.contains("signature="))
        }
    }

    @Test fun aFutureEpochMessageWaitsForReadyAndOldEpochCannotOverwriteTheNewSnapshot(): Unit = runBlocking {
        Fixture().use { f ->
            f.autoReply = false
            val handle = f.owner.observe("resource-a", "home")
            snapshot(handle) { it.phase == DeviceReadPhase.READING }
            val lease = f.leases.single()
            lease.report(200, 5, """{"Temperature":20}"""); yield()
            assertFalse(current(handle).snapshotAvailable)
            lease.ready(200)
            val observed = snapshot(handle) { it.connectionEpoch == 200L && it.snapshotAvailable }
            assertEquals(20, JSONObject(observed.reportedJson).getInt("Temperature"))
            assertTrue(lease.gets.contains(200L))
            val revision = observed.authorityRevision
            lease.report(100, 999, """{"Temperature":999}"""); yield()
            assertEquals(20, JSONObject(handle.getSnapshot().reportedJson).getInt("Temperature"))
            assertEquals(revision, handle.getSnapshot().authorityRevision)
        }
    }

    @Test fun preReadyOverflowDiscardsIncompleteHistoryAndRequiresAFreshGetResponse(): Unit = runBlocking {
        Fixture(pendingCapacity = 2).use { f ->
            f.autoReply = false
            val handle = f.owner.observe("resource-a", "home")
            snapshot(handle) { it.phase == DeviceReadPhase.READING }
            val lease = f.leases.single()
            repeat(5) { lease.report(200, it + 2L, """{"Temperature":$it}"""); yield() }
            lease.ready(200)
            val reading = snapshot(handle) { it.connectionEpoch == 200L }
            assertFalse(reading.snapshotAvailable)
            assertNull(reading.online)
            assertTrue(lease.gets.contains(200L))
            lease.report(200, 20, """{"ConnectType":"online","Temperature":42}""")
            val observed = live(handle)
            assertEquals(42, JSONObject(observed.reportedJson).getInt("Temperature"))
        }
    }

    @Test fun disconnectRetainsStaleSameAccountValuesButOnlineBecomesUnknown(): Unit = runBlocking {
        Fixture().use { f ->
            val handle = f.owner.observe("resource-a", "home"); live(handle)
            f.leases.single().state.value = LeaseState.Recovering(BrokerFailureKind.UNAVAILABLE)
            val stale = snapshot(handle) { it.stale && it.phase == DeviceReadPhase.RECOVERING }
            assertNull(stale.online)
            assertEquals(12, JSONObject(stale.reportedJson).getInt("Temperature"))
        }
    }

    @Test fun releasingOneObserverDoesNotCloseTheOtherOrExposeUpdatesToTheReleasedHandle(): Unit = runBlocking {
        Fixture().use { f ->
            val home = f.owner.observe("resource-a", "home"); live(home)
            val rn = f.owner.observe("resource-a", "rn"); live(rn)
            home.close(); yield()
            assertTrue(home.state.value is DeviceObservationState.Closed); assertEquals(0, f.leases.single().closes)
            f.leases.single().report(100, 2, """{"Temperature":13}""", "update/accepted")
            snapshot(rn) { JSONObject(it.reportedJson).optInt("Temperature") == 13 }
            assertTrue(home.state.value is DeviceObservationState.Closed)
            assertTrue(runCatching { home.getSnapshot() }.isFailure)
            rn.close(); yield(); assertEquals(1, f.leases.single().closes)
        }
    }

    @Test fun retryAfterAuthorizationFailureRechecksNativeMembershipAndUsesANewProof(): Unit = runBlocking {
        Fixture().use { f ->
            var forbidden = true
            f.connectionHook = { if (forbidden) throw BrokerFailure(BrokerFailureKind.AUTHORIZATION) }
            val handle = f.owner.observe("resource-a", "home")
            snapshot(handle) { it.phase == DeviceReadPhase.FORBIDDEN }
            assertTrue(f.leases.isEmpty())
            forbidden = false; handle.retry(); live(handle)
            assertEquals(2, f.authorizations); assertEquals(2, f.connections)
            assertNotSame(f.proofs.first(), f.proofs.last())
            assertEquals(0, f.leases.single().updates)
        }
    }

    @Test fun authorityRevisionIncreasesAndReleasedSessionCallbacksCannotAffectAReopenedDevice(): Unit = runBlocking {
        Fixture().use { f ->
            val first = f.owner.observe("resource-a", "home"); val one = live(first)
            val old = f.leases.single()
            old.report(100, 2, """{"Temperature":13}""", "update/accepted")
            val two = snapshot(first) { JSONObject(it.reportedJson).optInt("Temperature") == 13 }
            assertTrue(two.authorityRevision > one.authorityRevision)
            first.close(); yield()
            val next = f.owner.observe("resource-a", "home"); val three = live(next)
            assertTrue(three.authorityRevision > two.authorityRevision)
            assertEquals(2, f.opens); assertEquals(1, old.closes)
            assertEquals(101L, three.connectionEpoch)
            assertTrue(first.state.value is DeviceObservationState.Closed)
        }
    }

    @Test fun cancellingAViewsWaitDoesNotCancelTheApplicationOwnedReadSession(): Unit = runBlocking {
        Fixture().use { f ->
            f.autoReply = false
            val handle = f.owner.observe("resource-a", "home")
            val waiting = launch(start = CoroutineStart.UNDISPATCHED) { live(handle) }
            waiting.cancelAndJoin()
            assertEquals(0, f.leases.single().closes)
            f.leases.single().report(100, 1, """{"Temperature":12}""")
            assertTrue(live(handle).snapshotAvailable)
        }
    }

    @Test fun missingSnapshotHasABoundedUnknownResultInsteadOfSpinningForever(): Unit = runBlocking {
        Fixture(snapshotTimeout = 30).use { f ->
            f.autoReply = false
            val handle = f.owner.observe("resource-a", "home")
            val unavailable = snapshot(handle) { it.phase == DeviceReadPhase.UNAVAILABLE }
            assertEquals(DeviceReadFailure.SNAPSHOT_TIMEOUT, unavailable.failure)
            assertNull(unavailable.online); assertFalse(unavailable.snapshotAvailable)
            assertEquals(0, f.leases.single().updates)
        }
    }

    @Test fun cleanupPhaseClosesExistingObserversEvenWhenTheRevisionIsUnchanged(): Unit = runBlocking {
        Fixture().use { f ->
            val handle = f.owner.observe("resource-a", "home"); live(handle)
            f.contexts.value = AccountContext(7, null, true); yield()
            assertTrue(handle.state.value is DeviceObservationState.Closed)
            assertEquals(listOf(7L), f.invalidated)
            assertEquals(1, f.leases.single().closes)
        }
    }

    @Test fun closingTheApplicationOwnerReleasesNativeLeasesAndPreventsNewObservations(): Unit = runBlocking {
        Fixture().use { f ->
            val handle = f.owner.observe("resource-a", "home"); live(handle)
            f.scope.cancel(); yield()
            assertEquals(1, f.leases.single().closes)
            assertTrue(handle.state.value is DeviceObservationState.Closed)
            assertTrue(f.owner.observe("resource-b", "rn").state.value is DeviceObservationState.Closed)
        }
    }

    @Test fun duplicateNativeObserverCannotInflateOrReleaseAnotherHandlesAuthority(): Unit = runBlocking {
        Fixture().use { f ->
            val original = f.owner.observe("resource-a", "home"); live(original)
            val duplicate = f.owner.observe("resource-a", "home")
            assertTrue(duplicate.state.value is DeviceObservationState.Closed)
            duplicate.close(); yield()
            assertEquals(0, f.leases.single().closes)
            assertEquals(1, f.authorizations); assertEquals(1, f.opens)
            assertTrue(original.state.value is DeviceObservationState.Current)
            original.close(); yield(); assertEquals(1, f.leases.single().closes)
        }
    }

    @Test fun revokedMembershipOnRetryStopsTheOldLeaseAndRemovesPreviouslyVisibleDeviceData(): Unit = runBlocking {
        Fixture().use { f ->
            val handle = f.owner.observe("resource-a", "home"); live(handle)
            f.authorizeHook = { _, _ -> throw ApiFailure(403, "membership revoked") }
            handle.retry()
            val forbidden = snapshot(handle) { it.phase == DeviceReadPhase.FORBIDDEN }
            assertNull(forbidden.metadata); assertNull(forbidden.online)
            assertFalse(forbidden.snapshotAvailable); assertEquals(0, JSONObject(forbidden.reportedJson).length())
            assertEquals(1, f.leases.single().closes)
            assertEquals(1, f.opens); assertEquals(2, f.authorizations)
        }
    }

    @Test fun acknowledgedAuthorityStopsLiveCacheAndBlocksFeaturesUntilFreshProof():Unit=runBlocking {
        Fixture().use {f->val h=f.owner.observe("resource-a","b");live(h);val old=f.owner.captureFeatureAuthority(h)!!;val lease=f.leases.single()
            val wait=CompletableDeferred<Unit>();f.authorizeHook={_,_->wait.await()}
            assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"))
            assertTrue(lease.closes>0);assertNull(current(h).metadata);assertEquals("{}",current(h).reportedJson);assertNull(current(h).online)
            assertFalse(f.owner.featureReadCurrent(h,old));assertNull(f.owner.captureFeatureAuthority(h));wait.complete(Unit);live(h)
            assertNotNull(f.owner.captureFeatureAuthority(h));assertFalse(f.owner.featureReadCurrent(h,old))}
    }
    @Test fun lateFeatureSuccessOrFailureCannotCrossFreshAuthorizationFence():Unit=runBlocking {
        Fixture().use {f->val h=f.owner.observe("resource-a","b");live(h);val read=f.owner.captureFeatureAuthority(h)!!
            assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"));live(h)
            assertFalse(f.owner.featureReadCurrent(h,read));assertTrue(f.owner.featureReadCurrent(h,f.owner.captureFeatureAuthority(h)!!))}
    }
    @Test fun mqttFramesDoNotRotateFeatureAuthorityReceipt():Unit=runBlocking {
        Fixture().use {f->val h=f.owner.observe("resource-a","b");live(h);val read=f.owner.captureFeatureAuthority(h)!!
            f.leases.single().report(100,2,"{\"Temperature\":15}","update/accepted");snapshot(h){JSONObject(it.reportedJson).optInt("Temperature")==15}
            assertSame(read,f.owner.captureFeatureAuthority(h));assertTrue(f.owner.featureReadCurrent(h,read))}
    }
    @Test fun freshForbiddenAfterAcknowledgementDoesNotRestoreReadAuthority():Unit=runBlocking {
        Fixture().use {f->val h=f.owner.observe("resource-a","b");live(h);val old=f.owner.captureFeatureAuthority(h)!!
            f.authorizeHook={_,_->throw ApiFailure(403,"fixture")};assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"))
            snapshot(h){it.phase==DeviceReadPhase.FORBIDDEN};assertFalse(f.owner.featureReadCurrent(h,old));assertNull(f.owner.captureFeatureAuthority(h))}
    }
    @Test fun freshNetworkFailureAfterAcknowledgementKeepsCacheEmptyAndReadsBlocked():Unit=runBlocking {
        Fixture().use {f->val h=f.owner.observe("resource-a","b");live(h);f.authorizeHook={_,_->throw java.io.IOException()}
            assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"));snapshot(h){it.phase==DeviceReadPhase.UNAVAILABLE}
            assertEquals("{}",current(h).reportedJson);assertNull(current(h).metadata);assertNull(f.owner.captureFeatureAuthority(h))}
    }
    @Test fun oldAccountAndOtherResourceAreNotInvalidated():Unit=runBlocking {
        Fixture().use {f->val a=f.owner.observe("resource-a","a");val b=f.owner.observe("resource-b","b");live(a);live(b)
            val other=f.owner.captureFeatureAuthority(b)!!;assertFalse(f.owner.invalidateAcknowledgedAuthority(8,"other-user","resource-a"))
            assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"));assertSame(other,f.owner.captureFeatureAuthority(b));assertEquals(DeviceReadPhase.LIVE,current(b).phase)}
    }
    @Test fun queuedOldLeaseCannotRestoreSnapshotWhileFreshProofPending():Unit=runBlocking {
        Fixture().use {f->f.leaseHook={it.allowLateMessagesAfterClose=true};val h=f.owner.observe("resource-a","b");live(h);val old=f.leases.single()
            val wait=CompletableDeferred<Unit>();f.authorizeHook={_,_->wait.await()};assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"))
            old.report(100,99,"{\"Temperature\":99}");repeat(5){yield()};assertFalse(current(h).snapshotAvailable);assertEquals("{}",current(h).reportedJson)
            wait.complete(Unit);live(h);assertEquals(12,JSONObject(current(h).reportedJson).getInt("Temperature"))}
    }

    @Test fun uncooperativeOldAuthorizationCannotPublishAfterNewAckFence():Unit=runBlocking {
        Fixture().use {f->val h=f.owner.observe("resource-a","b");live(h);val late=CompletableDeferred<Unit>()
            f.authorizeHook={_,_->if(f.authorizations==2)withContext(NonCancellable){late.await()}}
            assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"));assertEquals(2,f.authorizations)
            assertTrue(f.owner.invalidateAcknowledgedAuthority(7,"native-user","resource-a"));live(h)
            val fresh=f.owner.captureFeatureAuthority(h)!!;val opens=f.opens;late.complete(Unit);repeat(10){yield()}
            assertSame(fresh,f.owner.captureFeatureAuthority(h));assertEquals(opens,f.opens)}
    }
}

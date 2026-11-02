package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.state.*
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

/** Public fixtures only. Fake durable medium is retained across owner reconstruction. */
class DeviceNicknameCoordinatorTest {
    private class MemoryJournal:NicknameJournal {
        val records=mutableMapOf<String,NicknameRecord>()
        var beforeReserve:(suspend()->Unit)?=null
        var failReserve=false;var failComplete=false
        override suspend fun load(key:String)=records[key]
        override suspend fun reserve(candidate:NicknameRecord):NicknameRecord {
            beforeReserve?.invoke();if(failReserve)throw IOException()
            val previous=records[candidate.key]
            return if(previous?.phase==NicknamePhase.UNKNOWN)previous else candidate.also {records[it.key]=it}
        }
        override suspend fun complete(record:NicknameRecord):Boolean {
            if(failComplete)throw IOException()
            if(records[record.key]?.operationId!=record.operationId)return false
            records[record.key]=record;return true
        }
    }
    private class Handle(scope:DeviceMoreScope):DeviceReadHandle {
        private val value=MutableStateFlow<DeviceObservationState>(DeviceObservationState.Current(DeviceReadSnapshot(
            scope.accountRevision,scope.resourceId,1,metadata=DeviceReadMetadata("old",scope.productId,"fan","sa"),phase=DeviceReadPhase.LIVE)))
        override val state:StateFlow<DeviceObservationState> =value
        override fun getSnapshot()=(value.value as DeviceObservationState.Current).snapshot
        override fun retry(){}
        override fun close(){value.value=DeviceObservationState.Closed(DeviceReadCloseReason.RELEASED)}
    }
    private class Fixture {
        val scope=DeviceMoreScope(7,"device/a","user-a","product")
        val contexts=MutableStateFlow(AccountContext(7,AccountSession("access","refresh","user-a",null,null,"{}")))
        val owner=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        val journal=MemoryJournal()
        val handle=Handle(scope)
        var page=true;var authCalls=0;var patches=0;var reads=0;var publications=0;var revocations=0
        var authError:Exception?=null;var patchError:Exception?=null;var readError:Exception?=null
        var observed:String?="new";var role:String?="sa"
        var patchGate:CompletableDeferred<Unit>?=null
        val patchStarted=CompletableDeferred<Unit>()
        val policy=NicknamePolicy {_,value->value=="new" || value==" next "}
        val binding get()=NicknameBinding(scope,handle){page}
        val access=object:DeviceAccessGateway {
            override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {
                authCalls++;authError?.let {throw it}
                return AuthorizedDevice(expectedRevision,resourceId,"user-a","product","fan","old",role)
            }
            override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection=error("No MQTT in nickname workflow")
        }
        val repository=object:NicknameRepository {
            override val scope=this@Fixture.scope
            override suspend fun patch(nickname:String) {patches++;patchStarted.complete(Unit);patchGate?.await();patchError?.let {throw it}}
            override suspend fun readNickname():String? {reads++;readError?.let {throw it};return observed}
        }
        fun coordinator(policy:NicknamePolicy?=this.policy)=DeviceNicknameCoordinator(owner,contexts,access,journal,{repository},policy,
            onConfirmed={_,_->publications++},onOwnershipRevoked={revocations++})
        fun shutdown(){owner.cancel()}
    }
    @Test fun absentPolicyDoesNotInferPermissionFromAdminRole():Unit=runBlocking {
        val f=Fixture();try {assertEquals("unsupported",f.coordinator(null).begin(f.binding,"new","intent-a").await().errorCode);assertEquals(0,f.patches);assertTrue(f.journal.records.isEmpty())}finally {f.shutdown()}
    }
    @Test fun explicitPolicyAloneDefinesValidationWithoutTrimmingOrInventedLength():Unit=runBlocking {
        val f=Fixture();f.observed=" next "
        try {val result=f.coordinator().begin(f.binding," next ","intent-b").await();assertEquals("confirmed",result.state);assertEquals(" next ",result.confirmedNickname);assertEquals(1,f.patches)}
        finally {f.shutdown()}
    }
    @Test fun rejectedPolicyInputNeverPersistsOrDispatchesMutation():Unit=runBlocking {
        val f=Fixture();try {assertEquals("invalid_input",f.coordinator().begin(f.binding,"not allowed","intent-a").await().errorCode);assertEquals(1,f.authCalls);assertEquals(0,f.patches);assertTrue(f.journal.records.isEmpty())}finally {f.shutdown()}
    }
    @Test fun writeAheadMustCompleteBeforePatchCanStart():Unit=runBlocking {
        val f=Fixture();val io=CompletableDeferred<Unit>();f.journal.beforeReserve={io.await()}
        try {val task=f.coordinator().begin(f.binding,"new","intent-a");yield();assertEquals(0,f.patches);io.complete(Unit);assertEquals("confirmed",task.await().state);assertEquals(1,f.patches)}finally {f.shutdown()}
    }
    @Test fun failedJournalReservationNeverDispatchesMutation():Unit=runBlocking {
        val f=Fixture();f.journal.failReserve=true
        try {assertEquals("storage_unavailable",f.coordinator().begin(f.binding,"new","intent-a").await().errorCode);assertEquals(0,f.patches)}finally {f.shutdown()}
    }
    @Test fun serverAcknowledgementWithoutMatchingReadBackIsUnknown():Unit=runBlocking {
        for(value in listOf(null,"old","NEW")) {
            val f=Fixture();f.observed=value
            try {assertEquals("unknown",f.coordinator().begin(f.binding,"new","intent-a").await().state);assertEquals(0,f.publications);assertEquals(NicknamePhase.UNKNOWN,f.journal.records.values.single().phase)}finally {f.shutdown()}
        }
    }
    @Test fun matchingReadBackIsCommittedBeforePublication():Unit=runBlocking {
        val f=Fixture();f.journal.failComplete=true
        try {val result=f.coordinator().begin(f.binding,"new","intent-a").await();assertEquals("unknown",result.state);assertEquals("storage_unavailable",result.errorCode);assertEquals(0,f.publications)}
        finally {f.shutdown()}
    }
    @Test fun duplicateClicksShareNativeTaskAndConflictingTargetCannotPassIt():Unit=runBlocking {
        val f=Fixture();f.patchGate=CompletableDeferred()
        try {val owner=f.coordinator();val a=owner.begin(f.binding,"new","intent-a");f.patchStarted.await()
            assertSame(a,owner.begin(f.binding,"new","intent-a"));assertEquals("busy",owner.begin(f.binding," next ","intent-b").await().errorCode)
            f.patchGate!!.complete(Unit);assertEquals("confirmed",a.await().state);assertEquals(1,f.patches)
        }finally {f.shutdown()}
    }
    @Test fun cancellingPageAwaitDoesNotCancelNativeAcceptedTask():Unit=runBlocking {
        val f=Fixture();f.patchGate=CompletableDeferred()
        try {val task=f.coordinator().begin(f.binding,"new","intent-a");f.patchStarted.await()
            val waiter=launch {task.await()};waiter.cancelAndJoin();f.page=false;f.patchGate!!.complete(Unit)
            assertEquals("confirmed",task.await().state);assertEquals(1,f.patches);assertEquals(0,f.publications)
        }finally {f.shutdown()}
    }
    @Test fun oldAccountAfterDispatchCannotReadOrPublishIntoNewAccount():Unit=runBlocking {
        val f=Fixture();f.patchGate=CompletableDeferred()
        try {val task=f.coordinator().begin(f.binding,"new","intent-a");f.patchStarted.await()
            f.contexts.value=AccountContext(8,AccountSession("b","br","user-b",null,null,"{}"))
            f.patchGate!!.complete(Unit);val result=task.await();assertEquals("unknown",result.state)
            assertEquals(0,f.reads);assertEquals(0,f.publications);assertEquals(NicknamePhase.UNKNOWN,f.journal.records.values.single().phase)
        }finally {f.shutdown()}
    }
    @Test fun sameIdentityTokenRefreshDoesNotDiscardAcceptedTask():Unit=runBlocking {
        val f=Fixture();f.patchGate=CompletableDeferred()
        try {val task=f.coordinator().begin(f.binding,"new","intent-a");f.patchStarted.await()
            f.contexts.value=AccountContext(7,AccountSession("new-access","new-refresh","user-a",null,null,"{}"))
            f.patchGate!!.complete(Unit);assertEquals("confirmed",task.await().state);assertEquals(1,f.publications)
        }finally {f.shutdown()}
    }
    @Test fun closedHandleBeforeAdmissionCannotAuthorizeOrWrite():Unit=runBlocking {
        val f=Fixture();f.handle.close()
        try {assertEquals("session_changed",f.coordinator().begin(f.binding,"new","intent-a").await().errorCode);assertEquals(0,f.authCalls);assertEquals(0,f.patches)}finally {f.shutdown()}
    }
    @Test fun freshOwnershipRejectionRevokesActualCurrentHandleButGenericPatch403DoesNot():Unit=runBlocking {
        val a=Fixture();a.authError=ApiFailure(403,"private raw")
        try {assertEquals("forbidden",a.coordinator().begin(a.binding,"new","intent-a").await().errorCode);assertEquals(1,a.revocations);assertEquals(0,a.patches)}finally {a.shutdown()}
        val b=Fixture();b.patchError=ApiFailure(403,"private raw")
        try {assertEquals("rejected",b.coordinator().begin(b.binding,"new","intent-a").await().state);assertEquals(0,b.revocations)}finally {b.shutdown()}
    }
    @Test fun explicitMore1382RevokesOwnershipAndDoesNotReadOrReplay():Unit=runBlocking {
        val f=Fixture();f.patchError=ApiFailure(1382,"raw device identity")
        try {val result=f.coordinator().begin(f.binding,"new","intent-a").await();assertEquals("forbidden",result.errorCode);assertEquals(1,f.revocations);assertEquals(0,f.reads);assertEquals(1,f.patches);assertFalse(result.toString().contains("raw"))}finally {f.shutdown()}
    }
    @Test fun unknownTransportResultReentryDoesNotReplayAndExplicitReconcileOnlyReads():Unit=runBlocking {
        val f=Fixture();f.patchError=IOException("private url")
        try {val first=f.coordinator().begin(f.binding,"new","intent-a").await();assertEquals("unknown",first.state)
            val rebuilt=f.coordinator();assertEquals("unknown",rebuilt.begin(f.binding,"new","intent-a").await().state);assertEquals(1,f.patches)
            assertEquals("confirmed",rebuilt.reconcile(f.binding).await().state);assertEquals(1,f.patches)
        }finally {f.shutdown()}
    }
    @Test fun recoveredJournalUsesStableUserResourceKeyRatherThanRevisionCollision():Unit=runBlocking {
        assertNotEquals(nicknameKey("user-a","device/a"),nicknameKey("user-b","device/a"))
        assertNotEquals(nicknameKey("ab","c"),nicknameKey("a","bc"))
        assertFalse(nicknameKey("private-user","private-device").contains("private"))
    }
    @Test fun lateReleasedPageCannotPublishConfirmedMetadata():Unit=runBlocking {
        val f=Fixture();f.patchGate=CompletableDeferred()
        try {val task=f.coordinator().begin(f.binding,"new","intent-a");f.patchStarted.await();f.handle.close();f.patchGate!!.complete(Unit)
            assertEquals("confirmed",task.await().state);assertEquals(0,f.publications)
        }finally {f.shutdown()}
    }
    @Test fun lateCompletedOldIntentCannotUndoANewerConfirmedTargetOnTheSameHandle():Unit=runBlocking {
        val f=Fixture()
        try {val owner=f.coordinator();val first=owner.begin(f.binding,"new","intent-a")
            assertEquals("confirmed",first.await().state)
            f.observed=" next ";assertEquals("confirmed",owner.begin(f.binding," next ","intent-b").await().state)
            assertSame(first,owner.begin(f.binding,"new","intent-a"));assertEquals(2,f.patches)
        }finally {f.shutdown()}
    }
    @Test fun recoveredUnknownForSameStableUserCanReconcileUnderNewRevisionWithoutPatch():Unit=runBlocking {
        val f=Fixture();f.patchError=IOException()
        try {assertEquals("unknown",f.coordinator().begin(f.binding,"new","intent-a").await().state)
            val freshScope=f.scope.copy(accountRevision=8)
            f.contexts.value=AccountContext(8,AccountSession("fresh","fresh-r","user-a",null,null,"{}"))
            var freshReads=0
            val repository=object:NicknameRepository {
                override val scope=freshScope
                override suspend fun patch(nickname:String){error("Recovery replayed PATCH")}
                override suspend fun readNickname():String {freshReads++;return "new"}
            }
            val owner=DeviceNicknameCoordinator(f.owner,f.contexts,f.access,f.journal,{repository},f.policy)
            val binding=NicknameBinding(freshScope,Handle(freshScope)){true}
            assertEquals("confirmed",owner.reconcile(binding).await().state);assertEquals(1,freshReads);assertEquals(1,f.patches)
        }finally {f.shutdown()}
    }
    @Test fun anotherStableAccountAtSameRevisionCannotReadOldUnknownTask():Unit=runBlocking {
        val f=Fixture();f.patchError=IOException()
        try {f.coordinator().begin(f.binding,"new","intent-a").await()
            val other=f.scope.copy(userId="user-b")
            f.contexts.value=AccountContext(7,AccountSession("b","br","user-b",null,null,"{}"))
            val owner=f.coordinator();val result=owner.reconcile(NicknameBinding(other,Handle(other)){true}).await()
            assertEquals("idle",result.state);assertEquals("",result.confirmedNickname);assertEquals(1,f.patches);assertEquals(0,f.reads)
        }finally {f.shutdown()}
    }
}

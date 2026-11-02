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

/** Offline controlled I/O; fake medium is retained across coordinator reconstruction, not a disk acceptance claim. */
class DeviceSelfUnbindTest {
    private class Journal:SelfUnbindJournal {
        val records=mutableMapOf<String,SelfUnbindRecord>();var failReserve=false;var failComplete=false
        var barrier:CompletableDeferred<Unit>?=null
        override suspend fun load(key:String)=records[key]
        override suspend fun reserve(candidate:SelfUnbindRecord):SelfUnbindRecord {
            barrier?.await();if(failReserve)throw IOException()
            return records[candidate.key]?.takeIf {it.phase in setOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED)}
                ?:candidate.also {records[it.key]=it}
        }
        override suspend fun complete(record:SelfUnbindRecord):Boolean {
            if(failComplete)throw IOException()
            if(records[record.key]?.operationId!=record.operationId)return false
            records[record.key]=record;return true
        }
    }
    private class Handle(scope:DeviceMoreScope):DeviceReadHandle {
        private val value=MutableStateFlow<DeviceObservationState>(DeviceObservationState.Current(DeviceReadSnapshot(scope.accountRevision,scope.resourceId,1,
            metadata=DeviceReadMetadata("public",scope.productId,"fixture",null),phase=DeviceReadPhase.LIVE)))
        override val state:StateFlow<DeviceObservationState> =value
        override fun getSnapshot()=(value.value as DeviceObservationState.Current).snapshot
        override fun retry()=Unit
        override fun close(){value.value=DeviceObservationState.Closed(DeviceReadCloseReason.RELEASED)}
    }
    private class Fixture {
        val scope=DeviceMoreScope(7,"public/device","public-user","public-product")
        val contexts=MutableStateFlow(AccountContext(7,AccountSession("public-access","public-refresh",scope.userId,null,null,"{}")))
        val app=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined);val journal=Journal();val handle=Handle(scope)
        var relationship=true;var page=true;var deletes=0;var reads=0;var invalidations=0;var lost=0;var cleaned=true;var owned=true
        var deleteError:Exception?=null;var readError:Exception?=null;var authError:Exception?=null
        var deleteBarrier:CompletableDeferred<Unit>?=null;val deleteEntered=CompletableDeferred<Unit>()
        val binding=SelfUnbindBinding(scope,handle,{relationship},{page})
        val access=object:DeviceAccessGateway {
            override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {
                authError?.let {throw it};return AuthorizedDevice(expectedRevision,resourceId,scope.userId,scope.productId,"fixture","public",null)
            }
            override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection=error("No MQTT connect in self-unbind")
        }
        val repo=object:SelfUnbindRepository {
            override val scope=this@Fixture.scope
            override suspend fun deleteSelf(){check(journal.records.values.single().phase==SelfUnbindPhase.UNKNOWN);deletes++;deleteEntered.complete(Unit);deleteBarrier?.await();deleteError?.let {throw it}}
            override suspend fun isOwned():Boolean {reads++;readError?.let {throw it};return owned}
        }
        val invalidation=object:SelfUnbindInvalidation {
            override suspend fun apply(record:SelfUnbindRecord,binding:SelfUnbindBinding):Boolean {invalidations++;return cleaned}
            override fun capture(binding:SelfUnbindBinding):String="00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002:1"
            override fun ownershipLost(binding:SelfUnbindBinding,resourceToken:String){lost++}
        }
        fun owner()=DeviceSelfUnbindCoordinator(app,contexts,access,journal,{repo},invalidation)
    }
    @Test fun durableUnknownMustFinishBeforeWireAndCommonSuccessNeedsNoData():Unit=runBlocking {
        val f=Fixture();try {
            f.journal.barrier=CompletableDeferred();val task=f.owner().begin(f.binding,"tap")
            assertEquals(0,f.deletes);f.journal.barrier!!.complete(Unit)
            assertEquals("confirmed",task.await().state);assertEquals(1,f.deletes);assertEquals(1,f.invalidations)
            assertEquals(SelfUnbindPhase.CONFIRMED,f.journal.records.values.single().phase)
        }finally {f.app.cancel()}
    }
    @Test fun failedDurableReserveCannotDelete():Unit=runBlocking {
        val f=Fixture();try {f.journal.failReserve=true;assertEquals("storage_unavailable",f.owner().begin(f.binding,"tap").await().errorCode);assertEquals(0,f.deletes)}finally {f.app.cancel()}
    }
    @Test fun acknowledgementDoesNotPretendPendingHomeCleanupCompleted():Unit=runBlocking {
        val f=Fixture();try {f.cleaned=false;val owner=f.owner()
            assertEquals("confirmed_cleanup_pending",owner.begin(f.binding,"tap").await().state)
            assertEquals(SelfUnbindPhase.ACKNOWLEDGED,f.journal.records.values.single().phase)
            f.cleaned=true;assertEquals("confirmed",owner.reconcile(f.binding).await().state);assertEquals(1,f.deletes);assertEquals(0,f.reads)
        }finally {f.app.cancel()}
    }
    @Test fun uncertainDeleteSurvivesOwnerReconstructionAndNeverReplays():Unit=runBlocking {
        val f=Fixture();try {f.deleteError=IOException()
            assertEquals("unknown",f.owner().begin(f.binding,"tap").await().state)
            val restored=f.owner();assertEquals("unknown",restored.begin(f.binding,"another").await().state)
            assertEquals("unknown",restored.reconcile(f.binding).await().state);assertEquals(1,f.deletes)
            f.owned=false;assertEquals("already_absent",restored.reconcile(f.binding).await().state);assertEquals(1,f.deletes)
        }finally {f.app.cancel()}
    }
    @Test fun failedHomeReadIsNeverProofOfAbsence():Unit=runBlocking {
        val f=Fixture();try {f.deleteError=IOException();val owner=f.owner();owner.begin(f.binding,"tap").await()
            f.readError=ApiFailure(503,"private");assertEquals("unknown",owner.reconcile(f.binding).await().state)
            assertEquals(0,f.invalidations);assertEquals(1,f.deletes)
        }finally {f.app.cancel()}
    }
    @Test fun duplicateClicksShareActualWorkerAndCancelledWaiterCannotStopIt():Unit=runBlocking {
        val f=Fixture();try {f.deleteBarrier=CompletableDeferred();val owner=f.owner();val task=owner.begin(f.binding,"tap");f.deleteEntered.await()
            assertSame(task,owner.begin(f.binding,"tap"));assertSame(task,owner.begin(f.binding,"second"))
            val waiter=launch {task.await()};waiter.cancelAndJoin();f.page=false
            f.deleteBarrier!!.complete(Unit);assertEquals("confirmed",task.await().state);assertEquals(1,f.deletes)
            f.page=true;assertSame(task,owner.begin(f.binding,"second"))
        }finally {f.app.cancel()}
    }
    @Test fun lateOldAccountAckCannotInvalidateNewAccount():Unit=runBlocking {
        val f=Fixture();try {f.deleteBarrier=CompletableDeferred();val task=f.owner().begin(f.binding,"tap");f.deleteEntered.await()
            f.contexts.value=AccountContext(8,AccountSession("b-access","b-refresh","b",null,null,"{}"));f.deleteBarrier!!.complete(Unit)
            assertEquals("confirmed_cleanup_pending",task.await().state);assertEquals(0,f.invalidations);assertEquals(0,f.reads)
        }finally {f.app.cancel()}
    }
    @Test fun relationshipRetiredDuringReserveNeverReachesWire():Unit=runBlocking {
        val f=Fixture();try {f.journal.barrier=CompletableDeferred();val task=f.owner().begin(f.binding,"tap")
            f.relationship=false;f.journal.barrier!!.complete(Unit);assertEquals("rejected",task.await().state);assertEquals(0,f.deletes)
            assertEquals(SelfUnbindPhase.REJECTED,f.journal.records.values.single().phase)
        }finally {f.app.cancel()}
    }
    @Test fun noInventedRoleRestrictionForSelfUnbind():Unit=runBlocking {
        val f=Fixture();try {assertEquals("confirmed",f.owner().begin(f.binding,"tap").await().state)}finally {f.app.cancel()}
    }
    @Test fun freshOwnershipRejectionRevokesExistingCacheWithoutDelete():Unit=runBlocking {
        val f=Fixture();try {f.authError=ApiFailure(1342,"private")
            assertEquals("forbidden",f.owner().begin(f.binding,"tap").await().errorCode);assertEquals(1,f.lost);assertEquals(0,f.deletes)
        }finally {f.app.cancel()}
    }
    @Test fun formal136xAbsenceIsNeverCountedAsThisDeleteAcknowledgement():Unit=runBlocking {
        for(code in listOf(1362,1361)) {val f=Fixture();try {f.deleteError=ApiFailure(code,"private")
            val value=f.owner().begin(f.binding,"tap").await()
            assertEquals("already_absent",value.state);assertEquals(if(code==1362)"not_bound" else "not_found",value.errorCode)
            assertEquals(SelfUnbindPhase.ALREADY_ABSENT,f.journal.records.values.single().phase);assertEquals(1,f.invalidations)
        }finally {f.app.cancel()}}
    }
    @Test fun failedAckPersistenceStillInvalidatesKnownUnboundCacheButCannotClaimCompleted():Unit=runBlocking {
        val f=Fixture();try {f.journal.failComplete=true
            val value=f.owner().begin(f.binding,"tap").await();assertEquals("confirmed_cleanup_pending",value.state)
            assertEquals("storage_unavailable",value.errorCode);assertEquals(1,f.invalidations)
            assertEquals(SelfUnbindPhase.UNKNOWN,f.journal.records.values.single().phase)
        }finally {f.app.cancel()}
    }
    @Test fun homeDirtyTicketRequiresCurrentCompleteAbsenceAndDoesNotClearLaterTicket() {
        var revision=7L;val ledger=SelfUnbindHomeLedger {r,_->r==revision}
        fun record(id:String)=SelfUnbindRecord(selfUnbindKey("u","d"),id,"u","d","p","token",SelfUnbindPhase.ACKNOWLEDGED)
        val old=ledger.request(record("old"),7);assertFalse(ledger.confirmed(old));assertFalse(ledger.acknowledge(old,setOf("d")))
        val newer=ledger.request(record("new"),7);assertTrue(ledger.acknowledge(old,emptySet()))
        assertEquals(listOf(newer),ledger.pending(7));revision=8;assertFalse(ledger.acknowledge(newer,emptySet()))
    }
    @Test fun nativeInvalidationClearsOnlyOriginalResourceAndRecoveredRecordCannotRevokeReboundHandle():Unit=runBlocking {
        val f=Fixture()
        val owner=DeviceReadOwner(f.app,f.contexts,f.access,{_,_->throw IOException()},{},{null})
        suspend fun metadata(handle:DeviceReadHandle)=withTimeout(2000) {handle.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
        try {
            val a=owner.observe(f.scope.resourceId,"a");val second=owner.observe(f.scope.resourceId,"a2");val other=owner.observe("other-device","b")
            metadata(a);metadata(second);metadata(other)
            val binding=SelfUnbindBinding(f.scope,a,{true},{true})
            val record=SelfUnbindRecord(selfUnbindKey(f.scope.userId,f.scope.resourceId),"old",f.scope.userId,f.scope.resourceId,f.scope.productId,binding.originToken,SelfUnbindPhase.ACKNOWLEDGED,resourceToken=owner.captureOwnershipReceipt(a)!!.encoded)
            val ledger=SelfUnbindHomeLedger {r,u->r==7L&&u==f.scope.userId}
            val adapter=NativeSelfUnbindInvalidation(owner,ledger){r,u->r==7L&&u==f.scope.userId}
            assertFalse(adapter.apply(record,binding)) // No real HOME consumer acknowledgement yet.
            assertEquals(DeviceReadPhase.FORBIDDEN,(second.state.value as DeviceObservationState.Current).snapshot.phase)
            assertNotEquals(DeviceReadPhase.FORBIDDEN,(other.state.value as DeviceObservationState.Current).snapshot.phase)
            a.close();second.close();val rebound=owner.observe(f.scope.resourceId,"rebound");metadata(rebound)
            val new=SelfUnbindBinding(f.scope,rebound,{true},{true});assertFalse(adapter.apply(record,new))
            assertNotEquals(DeviceReadPhase.FORBIDDEN,(rebound.state.value as DeviceObservationState.Current).snapshot.phase)
            val ticket=ledger.pending(7).single();assertTrue(ledger.acknowledge(ticket,emptySet()));assertTrue(adapter.apply(record,new))
        }finally {owner.close();f.app.cancel()}
    }
    @Test fun differentBindingCannotReceiveOldRunningTaskEvenAfterSameUserRelogin():Unit=runBlocking {
        val f=Fixture();try {
            f.deleteBarrier=CompletableDeferred();val owner=f.owner();val old=owner.begin(f.binding,"tap");f.deleteEntered.await()
            val other=SelfUnbindBinding(f.scope,f.handle,{true},{true})
            assertEquals("busy",owner.begin(other,"other-page").await().errorCode)
            f.contexts.value=AccountContext(8,AccountSession("new-access","new-refresh",f.scope.userId,null,null,"{}"))
            val newScope=DeviceMoreScope(8,f.scope.resourceId,f.scope.userId,f.scope.productId)
            val new=SelfUnbindBinding(newScope,Handle(newScope),{true},{true})
            assertEquals("busy",owner.begin(new,"new-page").await().errorCode)
            f.deleteBarrier!!.complete(Unit);assertEquals("confirmed_cleanup_pending",old.await().state);assertEquals(0,f.invalidations)
        }finally {f.app.cancel()}
    }
    @Test fun oldTerminalRecordIsHistoricalForNewIncarnationNeverNewPageSuccess():Unit=runBlocking {
        val f=Fixture();try {
            val owner=f.owner();assertEquals("confirmed",owner.begin(f.binding,"tap").await().state)
            val new=SelfUnbindBinding(f.scope,Handle(f.scope),{true},{true})
            assertEquals("historical_confirmed",owner.reconcile(new).await().state)
            assertEquals(1,f.invalidations);assertEquals(1,f.deletes)
        }finally {f.app.cancel()}
    }
    @Test fun originalResourceReceiptRetiresBWhenInitiatorHandleClosedIncludingAckStorageFailure():Unit=runBlocking {
        for(storageFailure in listOf(false,true)) {
            val f=Fixture();val readOwner=DeviceReadOwner(f.app,f.contexts,f.access,{_,_->throw IOException()},{},{null})
            suspend fun ready(h:DeviceReadHandle)=withTimeout(2000){h.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
            try {
                val a=readOwner.observe(f.scope.resourceId,"a");val b=readOwner.observe(f.scope.resourceId,"b");ready(a);ready(b)
                val binding=SelfUnbindBinding(f.scope,a,{true},{true});val ledger=SelfUnbindHomeLedger {r,u->r==7L&&u==f.scope.userId}
                val native=NativeSelfUnbindInvalidation(readOwner,ledger){r,u->r==7L&&u==f.scope.userId}
                val coordinator=DeviceSelfUnbindCoordinator(f.app,f.contexts,f.access,f.journal,{f.repo},native)
                f.deleteBarrier=CompletableDeferred();val task=coordinator.begin(binding,"tap");f.deleteEntered.await()
                a.close();f.journal.failComplete=storageFailure;f.deleteBarrier!!.complete(Unit)
                assertEquals("confirmed_cleanup_pending",task.await().state)
                val snapshot=(b.state.value as DeviceObservationState.Current).snapshot
                assertEquals(DeviceReadPhase.FORBIDDEN,snapshot.phase);assertNull(snapshot.metadata);assertEquals("{}",snapshot.reportedJson)
                assertTrue(ledger.acknowledge(ledger.pending(7).single(),emptySet()))
                f.journal.failComplete=false;f.owned=false
                val later=SelfUnbindBinding(f.scope,b,{true},{true})
                val result=coordinator.reconcile(later).await()
                assertEquals(if(storageFailure)"historical_already_absent" else "historical_confirmed",result.state);assertEquals(1,f.deletes)
            }finally {readOwner.close();f.app.cancel()}
        }
    }
    @Test fun receiptRejectsForeignOwnerInSameProcessAndNeverReusesNewResourceSerial():Unit=runBlocking {
        val f=Fixture();val first=DeviceReadOwner(f.app,f.contexts,f.access,{_,_->throw IOException()},{},{null})
        val foreign=DeviceReadOwner(f.app,f.contexts,f.access,{_,_->throw IOException()},{},{null})
        try {
            val old=first.observe(f.scope.resourceId,"old")
            withTimeout(2000){old.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
            val token=first.captureOwnershipReceipt(old)!!.encoded
            val foreignHandle=foreign.observe(f.scope.resourceId,"foreign")
            withTimeout(2000){foreignHandle.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
            assertFalse(foreign.retireOwnershipReceipt(token))
            val binding=SelfUnbindBinding(f.scope,old,{true},{true});val ledger=SelfUnbindHomeLedger {r,_->r==7L}
            val wrongAdapter=NativeSelfUnbindInvalidation(foreign,ledger){r,_->r==7L}
            val acknowledged=SelfUnbindRecord(selfUnbindKey(f.scope.userId,f.scope.resourceId),"wrong-owner",f.scope.userId,f.scope.resourceId,f.scope.productId,binding.originToken,SelfUnbindPhase.ACKNOWLEDGED,resourceToken=token)
            assertFalse(wrongAdapter.apply(acknowledged,binding));assertTrue(ledger.acknowledge(ledger.pending(7).single(),emptySet()))
            assertFalse(wrongAdapter.apply(acknowledged,binding)) // HOME acknowledgement cannot mask failed resource retirement.
            assertNotEquals(DeviceReadPhase.FORBIDDEN,(foreignHandle.state.value as DeviceObservationState.Current).snapshot.phase)
            old.close()
            val newer=first.observe(f.scope.resourceId,"new")
            withTimeout(2000){newer.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
            assertTrue(first.retireOwnershipReceipt(token));assertNotEquals(DeviceReadPhase.FORBIDDEN,(newer.state.value as DeviceObservationState.Current).snapshot.phase)
            assertTrue(first.retireOwnershipReceipt("00000000-0000-0000-0000-000000000000:00000000-0000-0000-0000-000000000000:1"))
            assertFalse(first.retireOwnershipReceipt("not-a-receipt"))
        }finally {first.close();foreign.close();f.app.cancel()}
    }
    @Test fun firstCompletionOfOldPendingAckOrAbsenceIsAlreadyHistorical():Unit=runBlocking {
        for(absent in listOf(false,true)) {
            val f=Fixture();try {
                f.cleaned=false;if(absent)f.deleteError=ApiFailure(1362,"private")
                val owner=f.owner();owner.begin(f.binding,"tap").await()
                val new=SelfUnbindBinding(f.scope,Handle(f.scope),{true},{true});f.cleaned=true
                val result=owner.reconcile(new).await()
                assertEquals(if(absent)"historical_already_absent" else "historical_confirmed",result.state)
                assertEquals(result.state,owner.reconcile(new).await().state);assertEquals(1,f.deletes)
            }finally {f.app.cancel()}
        }
    }
    @Test fun oldUnknownFirstAbsenceCompletionAlsoUsesRelationshipHistoricalFence():Unit=runBlocking {
        val f=Fixture();try {
            f.deleteError=IOException();val owner=f.owner();owner.begin(f.binding,"tap").await();f.owned=false;f.relationship=false
            val result=owner.reconcile(f.binding).await()
            assertEquals("historical_already_absent",result.state);assertEquals("absence_observed",result.errorCode);assertEquals(1,f.deletes)
        }finally {f.app.cancel()}
    }
}

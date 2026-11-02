package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.state.*
import com.rowan.iot.domain.home.*
import com.rowan.iot.domain.rooms.RoomId
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

/** Native production consumer/application composition with controlled repositories; no HTTP/SDK/storage execution. */
class SelfUnbindIntegrationTest {
    companion object {
        private const val OLD_PROCESS="00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002:1"
        private fun record(phase:SelfUnbindPhase=SelfUnbindPhase.ACKNOWLEDGED,id:String="op",device:String="d",user:String="u")=
            SelfUnbindRecord(selfUnbindKey(user,device),id,user,device,"p","old-page",phase,
                if(phase==SelfUnbindPhase.ABSENCE_OBSERVED)"not_bound" else "",OLD_PROCESS)
        private fun group(id:String)=HomeGroup(null,listOf(HomeDevice(id,"Public device")))
    }
    private class Journal:SelfUnbindRecoveryJournal {
        val records=linkedMapOf<String,SelfUnbindRecord>()
        var loads=0;var scans=0;var active=0;var maximum=0;var fail=false
        var beforeRead:suspend()->Unit={};var beforeComplete:(SelfUnbindRecord)->Unit={}
        override suspend fun unresolved(userId:String):List<SelfUnbindRecord> {
            scans++;active++;maximum=maxOf(maximum,active)
            val snapshot=records.values.filter {it.userId==userId&&it.phase in setOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED)}
            try {beforeRead();if(fail)throw IOException();return snapshot}finally {active--}
        }
        override suspend fun load(key:String):SelfUnbindRecord? {loads++;return records[key]}
        override suspend fun reserve(candidate:SelfUnbindRecord):SelfUnbindRecord {
            val old=records[candidate.key]
            return if(old?.phase in setOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED))old!! else candidate.also {records[it.key]=it}
        }
        override suspend fun complete(record:SelfUnbindRecord):Boolean {
            beforeComplete(record);if(records[record.key]?.operationId!=record.operationId)return false
            records[record.key]=record;return true
        }
    }
    private class Home:HomeRepository {
        var calls=0;var active=0;var maximum=0;val revisions=mutableListOf<Long>()
        var work:suspend()->List<HomeGroup> = {emptyList()}
        override suspend fun loadGroups(expectedRevision:Long):List<HomeGroup> {calls++;active++;maximum=maxOf(maximum,active);revisions+=expectedRevision;try{return work()}finally{active--}}
    }
    private class Fixture(seed:SelfUnbindRecord?=null) {
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        val contexts=MutableStateFlow(AccountContext(7,AccountSession("public-access","public-refresh","u",null,null,"{}")))
        val journal=Journal().also {if(seed!=null)it.records[seed.key]=seed}
        val home=Home();var visible=true;var ownerLookups=0;var deletes=0;var repositoryReads=0;var authorizations=0
        val barriers=mutableListOf<CompletableDeferred<Unit>>()
        var native:DeviceReadOwner?=null
        var authorizeWork:suspend()->Unit={};var deleteWork:suspend()->Unit={};val enteredDelete=CompletableDeferred<Unit>()
        val access=object:DeviceAccessGateway {
            override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {authorizations++;authorizeWork();return AuthorizedDevice(expectedRevision,resourceId,"u","p","fixture","Public",null)}
            override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection=error("No transport connection")
        }
        private val delegate=lazy {SelfUnbindApplication(scope,contexts,journal,access,{s->object:SelfUnbindRepository {
            override val scope=s
            override suspend fun deleteSelf(){deletes++;enteredDelete.complete(Unit);deleteWork()}
            override suspend fun isOwned():Boolean {repositoryReads++;error("Recovery must use actual HOME consumer, not a new feature GET")}
        }},{ownerLookups++;native})}
        val app get()=delegate.value
        val readScopes=HomeReadScopes {contexts.value}
        fun current(revision:Long=7)=visible&&contexts.value.revision==revision&&contexts.value.session!=null&&!contexts.value.cleanupRequired
        val tabs=HomeRoomTabs(home,7,{current()},readScopes.forRevision(7)!!)
        val consumer by lazy {SelfUnbindHomeConsumer(scope,tabs,app,7,{current()})}
        fun gate()=CompletableDeferred<Unit>().also {barriers+=it}
        fun seed(value:SelfUnbindRecord){journal.records[value.key]=value}
        suspend fun handle(observer:String="page"):DeviceReadHandle {
            if(native==null)native=DeviceReadOwner(scope,contexts,access,{_,_->throw IOException()},{},{null})
            val handle=native!!.observe("d",observer)
            withTimeout(2000){handle.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
            return handle
        }
        fun close(){visible=false;if(delegate.isInitialized())delegate.value.close();barriers.forEach {it.complete(Unit)};native?.close();scope.cancel()}
    }
    @Test fun ackRecoveryCompletesOnlyAfterActualHomeCacheInstall():Unit=runBlocking {
        val r=record();val f=Fixture(r);try {
            f.journal.beforeComplete={if(it.phase==SelfUnbindPhase.CONFIRMED){assertTrue(f.tabs.state.value.loaded);assertTrue(f.tabs.state.value.groups.isEmpty())}}
            f.consumer.appear();assertEquals(SelfUnbindPhase.CONFIRMED,f.journal.records[r.key]!!.phase)
            assertEquals(1,f.home.calls);assertEquals(0,f.ownerLookups);assertEquals(0,f.deletes);assertEquals(0,f.authorizations)
        }finally{f.close()}
    }
    @Test fun unknownRecoveryUsesHomeAbsenceNotDeleteOrBorrowedHandle():Unit=runBlocking {
        val r=record(SelfUnbindPhase.UNKNOWN);val f=Fixture(r);try {f.consumer.appear();assertEquals(SelfUnbindPhase.ALREADY_ABSENT,f.journal.records[r.key]!!.phase);assertEquals("absence_observed",f.journal.records[r.key]!!.errorCode);assertEquals(0,f.deletes);assertEquals(0,f.repositoryReads);assertEquals(0,f.ownerLookups)}finally{f.close()}
    }
    @Test fun homePresenceKeepsUnknownAndDoesNotPollAutomatically():Unit=runBlocking {
        val r=record(SelfUnbindPhase.UNKNOWN);val f=Fixture(r);try {f.home.work={listOf(group("d"))};f.consumer.appear();repeat(10){yield()};assertEquals(1,f.home.calls);assertEquals(SelfUnbindPhase.UNKNOWN,f.journal.records[r.key]!!.phase);assertEquals(1,f.app.ledger.pending(7).size)}finally{f.close()}
    }
    @Test fun failedHomeReadCannotAcknowledgeOrSpin():Unit=runBlocking {
        val r=record();val f=Fixture(r);try {f.home.work={throw IOException()};f.consumer.appear();repeat(10){f.app.requestRecovery()};assertEquals(1,f.home.calls);assertEquals(SelfUnbindPhase.ACKNOWLEDGED,f.journal.records[r.key]!!.phase);assertEquals("read_failed",f.tabs.state.value.errorCode);f.consumer.refresh();assertEquals(2,f.home.calls)}finally{f.close()}
    }
    @Test fun dirtyDuringActualReadRetiresOldResultAndCoalescesMultipleTickets():Unit=runBlocking {
        val f=Fixture();val gate=f.gate();try {
            f.home.work={if(f.home.calls==1){withContext(NonCancellable){gate.await()};listOf(group("stale"))}else emptyList()}
            f.consumer.appear();assertEquals(1,f.home.calls)
            val first=record(id="one",device="d");val second=record(id="two",device="e")
            f.seed(first);f.app.requestRecovery();f.seed(second);repeat(8){f.app.requestRecovery()}
            assertEquals(1,f.home.calls);assertEquals(1,f.home.maximum)
            gate.complete(Unit);yield()
            assertEquals(2,f.home.calls);assertTrue(f.tabs.state.value.groups.isEmpty())
            assertEquals(SelfUnbindPhase.CONFIRMED,f.journal.records[first.key]!!.phase);assertEquals(SelfUnbindPhase.CONFIRMED,f.journal.records[second.key]!!.phase)
        }finally{f.close()}
    }
    @Test fun pauseAndEarlyReturnRetainActualIoSlotUntilOldReadReturns():Unit=runBlocking {
        val r=record();val f=Fixture(r);val gate=f.gate();try {
            f.home.work={if(f.home.calls==1)withContext(NonCancellable){gate.await()};emptyList()}
            f.consumer.appear();f.consumer.leave();f.consumer.appear();assertEquals(1,f.home.calls)
            assertEquals(SelfUnbindPhase.ACKNOWLEDGED,f.journal.records[r.key]!!.phase)
            gate.complete(Unit);yield();assertEquals(2,f.home.calls);assertEquals(1,f.home.maximum);assertEquals(SelfUnbindPhase.CONFIRMED,f.journal.records[r.key]!!.phase)
        }finally{f.close()}
    }
    @Test fun closingPageNeverAcknowledgesItsLateRead():Unit=runBlocking {
        val r=record();val f=Fixture(r);val gate=f.gate();try {
            f.home.work={withContext(NonCancellable){gate.await()};emptyList()};f.consumer.appear();f.consumer.close();f.tabs.close();gate.complete(Unit);yield()
            assertEquals(SelfUnbindPhase.ACKNOWLEDGED,f.journal.records[r.key]!!.phase);assertEquals(1,f.app.ledger.pending(7).size)
        }finally{f.close()}
    }
    @Test fun oldAccountJournalSuccessAndErrorDoNotQueueNewAccountTickets():Unit=runBlocking {
        for(fail in listOf(false,true)){val f=Fixture(record());val gate=f.gate();try {
            f.journal.beforeRead={if(f.journal.scans==1)withContext(NonCancellable){gate.await()}}
            f.app.requestRecovery();f.contexts.value=AccountContext(8,AccountSession("b-access","b-refresh","b",null,null,"{}"));f.journal.fail=fail
            gate.complete(Unit);yield();assertTrue(f.app.ledger.pending(8).isEmpty());assertTrue(f.app.ledger.pending(7).isEmpty())
            assertEquals(0,f.home.calls);assertEquals(0,f.ownerLookups)
        }finally{f.close()}}
    }
    @Test fun recoveryRequestsShareOneActualJournalDrainAndOnePendingBit():Unit=runBlocking {
        val f=Fixture();val gate=f.gate();try {
            f.journal.beforeRead={if(f.journal.scans==1)withContext(NonCancellable){gate.await()}}
            f.app.requestRecovery();repeat(20){f.app.requestRecovery()};assertEquals(1,f.journal.scans)
            gate.complete(Unit);yield();assertEquals(2,f.journal.scans);assertEquals(1,f.journal.maximum)
        }finally{f.close()}
    }
    @Test fun activeDeleteIsNotReconciledAsUnknownUntilActualWorkerSettles():Unit=runBlocking {
        val f=Fixture();val gate=f.gate();try {
            val a=f.handle();val b=f.handle("b");val registration=f.app.register(a,7){true}!!
            f.deleteWork={gate.await()};val operation=f.app.begin(registration,"tap");f.enteredDelete.await()
            f.app.requestRecovery();assertTrue(f.app.ledger.pending(7).isEmpty());assertEquals(1,f.deletes)
            registration.close();a.close();gate.complete(Unit);operation.await()
            assertEquals(DeviceReadPhase.FORBIDDEN,(b.state.value as DeviceObservationState.Current).snapshot.phase)
            f.consumer.appear();assertEquals("confirmed",operation.state.value.state);assertEquals(1,f.deletes);assertEquals(0,f.repositoryReads)
        }finally{f.close()}
    }
    @Test fun registrationRequiresActualExistingOwnerAndNeverStartsOne():Unit=runBlocking {
        val f=Fixture();try {
            val fake=object:DeviceReadHandle {override val state=MutableStateFlow<DeviceObservationState>(DeviceObservationState.Closed(DeviceReadCloseReason.RELEASED));override fun getSnapshot():DeviceReadSnapshot=error("closed");override fun retry()=Unit;override fun close()=Unit}
            assertNull(f.app.register(fake,7){true});assertEquals(0,f.deletes);assertNull(f.native)
        }finally{f.close()}
    }
    @Test fun registrationReleaseRejectsNewIntentButDoesNotRetireOtherObservers():Unit=runBlocking {
        val f=Fixture();try {val a=f.handle();val b=f.handle("b");val registration=f.app.register(a,7){true}!!;registration.close()
            assertEquals("session_changed",f.app.begin(registration,"tap").await().errorCode)
            assertNotEquals(DeviceReadPhase.FORBIDDEN,(b.state.value as DeviceObservationState.Current).snapshot.phase);assertEquals(0,f.deletes)
        }finally{f.close()}
    }
    @Test fun nativeRelationshipReplacementClosesOnlyOriginalIncarnation():Unit=runBlocking {
        val f=Fixture();try {val a=f.handle();val registration=f.app.register(a,7){true}!!;assertTrue(f.app.relationshipReplaced(registration));assertTrue(a.state.value is DeviceObservationState.Closed)
            val newer=f.handle("new");assertNotNull(f.app.register(newer,7){true});assertTrue(f.app.relationshipReplaced(registration));assertTrue(newer.state.value is DeviceObservationState.Current)
        }finally{f.close()}
    }
    @Test fun fullHomeSnapshotNotSelectedRoomDeterminesAbsence():Unit=runBlocking {
        val r=record();val f=Fixture(r);try {
            val kitchen=RoomId.Text("k");val bedroom=RoomId.Text("b")
            f.home.work={listOf(HomeGroup("Kitchen",listOf(HomeDevice("other","Public")),kitchen),HomeGroup("Bedroom",listOf(HomeDevice("d","Public")),bedroom))}
            f.consumer.appear();f.tabs.select(kitchen);f.consumer.refresh()
            assertEquals(1,f.tabs.state.value.visibleGroups.size);assertEquals(SelfUnbindPhase.ACKNOWLEDGED,f.journal.records[r.key]!!.phase)
        }finally{f.close()}
    }
    @Test fun installedReadReceiptBecomesInvalidOnCancelOrNewRead():Unit=runBlocking {
        val f=Fixture();try {val old=f.tabs.reloadTracked {}!!;f.tabs.cancelLoad();var invoked=false;assertFalse(f.tabs.whileInstalled(old){invoked=true;true});assertFalse(invoked)
            val newer=f.tabs.reloadTracked {}!!;assertTrue(f.tabs.whileInstalled(newer){true});assertFalse(f.tabs.whileInstalled(old){true})
        }finally{f.close()}
    }
    @Test fun recreatedSameAccountPageWaitsForOriginalActualIo():Unit=runBlocking {
        val f=Fixture();val gate=f.gate();try {
            f.home.work={if(f.home.calls==1)withContext(NonCancellable){gate.await()};emptyList()}
            f.consumer.appear();f.consumer.close();f.tabs.close()
            val tabs=HomeRoomTabs(f.home,7,{f.current()},f.readScopes.forRevision(7)!!)
            val page=SelfUnbindHomeConsumer(f.scope,tabs,f.app,7,{f.current()});page.appear();assertEquals(1,f.home.calls)
            gate.complete(Unit);yield();assertEquals(2,f.home.calls);assertEquals(1,f.home.maximum);page.close();tabs.close()
        }finally{f.close()}
    }
    @Test fun newAccountGetsIndependentReadGateWhileOldIoCannotAckItsTicket():Unit=runBlocking {
        val f=Fixture();val gate=f.gate();try {
            f.home.work={if(f.home.calls==1)withContext(NonCancellable){gate.await()};emptyList()};f.consumer.appear();f.consumer.leave()
            f.contexts.value=AccountContext(8,AccountSession("b-access","b-refresh","b",null,null,"{}"))
            val r=record(id="b-op",user="b");f.seed(r);f.app.requestRecovery()
            val tabs=HomeRoomTabs(f.home,8,{f.current(8)},f.readScopes.forRevision(8)!!);val page=SelfUnbindHomeConsumer(f.scope,tabs,f.app,8,{f.current(8)})
            page.appear();assertEquals(2,f.home.calls);assertEquals(SelfUnbindPhase.CONFIRMED,f.journal.records[r.key]!!.phase)
            gate.complete(Unit);yield();assertEquals(listOf(7L,8L),f.home.revisions);page.close();tabs.close()
        }finally{f.close()}
    }
    @Test fun sharedReadScopeRejectsOldFactoryAndSameRevisionDifferentIdentity() {
        var source=AccountContext(7,AccountSession("a","r","u",null,null,"{}"));val slots=HomeReadScopes {source};val a=slots.forRevision(7)!!
        assertSame(a,slots.forRevision(7));source=source.copy(session=AccountSession("b","r","v",null,null,"{}"));assertNull(slots.forRevision(7))
        source=AccountContext(8,source.session);assertNotSame(a,slots.forRevision(8));assertNull(slots.forRevision(7))
    }
    @Test fun capacityRejectsBeforeCoreDispatchAndDuplicateUsesExistingSlot():Unit=runBlocking {
        val f=Fixture();try {
            f.deleteWork={throw IOException()}
            var last:NativeSelfUnbindOperation?=null
            var registration:NativeSelfUnbindRegistration?=null
            repeat(128){index->
                val handle=f.handle("capacity-$index")
                val page=f.app.register(handle,7){true}!!
                val operation=f.app.begin(page,"tap")
                assertEquals("unknown",operation.await().state)
                if(index<127){page.close();handle.close()}else{last=operation;registration=page}
            }
            assertSame(last,f.app.begin(registration!!,"tap"))
            val before=f.journal.loads;val dispatches=f.deletes
            assertEquals("busy",f.app.begin(registration!!,"new-intent").await().errorCode)
            assertEquals(before,f.journal.loads);assertEquals(dispatches,f.deletes)
        }finally{f.close()}
    }
    @Test fun concurrentDuplicateReturnsSameWrapperAndBothReceiveDurableCleanup():Unit=runBlocking {
        val f=Fixture();val barrier=java.util.concurrent.CyclicBarrier(2);val delete=f.gate()
        try {
            f.deleteWork={withContext(NonCancellable){delete.await()}}
            val registration=f.app.register(f.handle(),7){true}!!
            val results=coroutineScope {List(2){async(Dispatchers.Default){barrier.await();f.app.begin(registration,"same-tap")}}.awaitAll()}
            assertSame(results[0],results[1]);assertEquals(1,f.deletes)
            delete.complete(Unit);results[0].await();f.consumer.appear()
            withTimeout(2000){results[0].state.first {it.state=="confirmed"}}
            assertEquals("confirmed",results[1].state.value.state);assertEquals(1,f.deletes)
        }finally{f.close()}
    }
    @Test fun discoveredHistoricalJournalNeverReturnsOldBindingWrapper():Unit=runBlocking {
        val f=Fixture();try {
            f.deleteWork={throw IOException()}
            val a=f.handle();val first=f.app.register(a,7){true}!!;val old=f.app.begin(first,"old");old.await();first.close();a.close()
            val b=f.handle("new");val second=f.app.register(b,7){true}!!;val fresh=f.app.begin(second,"new")
            assertNotSame(old,fresh);fresh.await();f.consumer.appear()
            withTimeout(2000){fresh.state.first {it.state=="historical_already_absent"}}
            assertEquals("historical_already_absent",old.state.value.state);assertEquals("historical_already_absent",fresh.state.value.state);assertEquals(1,f.deletes)
        }finally{f.close()}
    }
    @Test fun sameUserNewRevisionCannotBorrowPreviousAccountWrapper():Unit=runBlocking {
        val f=Fixture();try {
            f.deleteWork={throw IOException()};val a=f.handle();val oldPage=f.app.register(a,7){true}!!
            val old=f.app.begin(oldPage,"old");old.await();oldPage.close();a.close()
            f.contexts.value=AccountContext(8,f.contexts.value.session)
            val b=f.handle("revision-eight");val page=f.app.register(b,8){true}!!;val fresh=f.app.begin(page,"new")
            assertNotSame(old,fresh);fresh.await();assertEquals("session_changed",old.state.value.state)
            val tabs=HomeRoomTabs(f.home,8,{f.current(8)},f.readScopes.forRevision(8)!!)
            val consumer=SelfUnbindHomeConsumer(f.scope,tabs,f.app,8,{f.current(8)});consumer.appear()
            withTimeout(2000){fresh.state.first {it.state=="historical_already_absent"}}
            assertEquals("session_changed",old.state.value.state);assertEquals(1,f.deletes);consumer.close();tabs.close()
        }finally{f.close()}
    }
    private class QueuedDispatcher:CoroutineDispatcher() {
        private val queue=java.util.ArrayDeque<Runnable>()
        override fun dispatch(context:kotlin.coroutines.CoroutineContext,block:Runnable){queue.addLast(block)}
        fun drain(){var budget=10000;while(queue.isNotEmpty()){check(budget-->0);queue.removeFirst().run()}}
    }
    @Test fun queuedCollectorCannotDropCoreFinalViewWhenWorkerCompletesFirst():Unit=runBlocking {
        val f=Fixture();val dispatcher=QueuedDispatcher();val scope=CoroutineScope(SupervisorJob()+dispatcher)
        try {
            val handle=f.handle();val app=SelfUnbindApplication(scope,f.contexts,f.journal,f.access,{deviceScope->object:SelfUnbindRepository {
                override val scope=deviceScope
                override suspend fun deleteSelf(){throw IOException()}
                override suspend fun isOwned()=error("No recovery feature GET")
            }},{f.native})
            val page=app.register(handle,7){true}!!;val operation=app.begin(page,"tap")
            dispatcher.drain();assertEquals("unknown",operation.await().state)
            assertEquals("unknown_result",operation.state.value.errorCode);app.close()
        }finally{scope.cancel();dispatcher.drain();f.close()}
    }


    @Test fun lateAckInvalidatesOrdinaryRecreatedPageAndRepeatedRecoveryDoesNotRestartProof():Unit=runBlocking {
        val f=Fixture();try {val a=f.handle("a");val registration=f.app.register(a,7){true}!!;val delete=f.gate();f.deleteWork={delete.await()}
            val operation=f.app.begin(registration,"tap");f.enteredDelete.await();registration.close();a.close()
            val b=f.handle("b");val bpage=f.app.register(b,7){true}!!;val old=f.native!!.captureFeatureAuthority(b)!!
            assertTrue(registration.binding.relationshipCurrent());val proof=f.gate();f.authorizeWork={proof.await()}
            delete.complete(Unit);operation.await();assertNull((b.state.value as DeviceObservationState.Current).snapshot.metadata)
            assertFalse(f.native!!.featureReadCurrent(b,old));assertNull(f.native!!.captureFeatureAuthority(b));val count=f.authorizations
            repeat(5){f.app.requestRecovery();yield()};assertEquals(count,f.authorizations);assertEquals(1,f.deletes)
            proof.complete(Unit);withTimeout(2000){b.state.first{it is DeviceObservationState.Current&&it.snapshot.metadata!=null}}
            assertFalse(f.native!!.featureReadCurrent(b,old));assertNotNull(f.native!!.captureFeatureAuthority(b));bpage.close()
        }finally{f.close()}
    }
    @Test fun confirmedPairOnNewPageRetiresWholeOldRelationshipAndOldAckDoesNotTouchReplacement():Unit=runBlocking {
        val f=Fixture();try {val a=f.handle("a");val first=f.app.register(a,7){true}!!;val delete=f.gate();f.deleteWork={delete.await()}
            val operation=f.app.begin(first,"tap");f.enteredDelete.await();first.close();a.close()
            val b=f.handle("b");val second=f.app.register(b,7){true}!!;assertTrue(first.binding.relationshipCurrent())
            assertTrue(f.app.relationshipReplaced(second));assertFalse(first.binding.relationshipCurrent());assertFalse(second.binding.relationshipCurrent())
            val replacement=f.handle("replacement");val latest=f.native!!.captureFeatureAuthority(replacement)!!;val count=f.authorizations
            delete.complete(Unit);operation.await();repeat(5){f.app.requestRecovery();yield()}
            assertSame(latest,f.native!!.captureFeatureAuthority(replacement));assertEquals(count,f.authorizations);assertEquals(1,f.deletes)
        }finally{f.close()}
    }
    @Test fun acknowledgementAfterAccountChangeDoesNotInvalidateNewAccountResource():Unit=runBlocking {
        val f=Fixture();try {val a=f.handle("a");val first=f.app.register(a,7){true}!!;val gate=f.gate();f.deleteWork={gate.await()}
            val op=f.app.begin(first,"tap");f.enteredDelete.await();f.contexts.value=AccountContext(8,AccountSession("new","refresh","new-user",null,null,"{}"))
            val before=f.authorizations;gate.complete(Unit);op.await();assertEquals(before,f.authorizations);assertEquals(1,f.deletes)
        }finally{f.close()}
    }
}

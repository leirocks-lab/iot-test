package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.state.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

/** Uses the real application/core/owner; repositories remain controlled in-memory ports. */
class NativeSelfUnbindAuthorityTest {
    private class Fixture {
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        val contexts=MutableStateFlow(AccountContext(7,AccountSession("public","public","u",null,null,"{}")))
        var authorizations=0;var deletes=0;var loads=0;var saved:SelfUnbindRecord?=null
        var read:suspend ()->Unit={};var deletion:suspend ()->Unit={throw IOException()}
        val access=object:DeviceAccessGateway {
            override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {authorizations++;return AuthorizedDevice(expectedRevision,resourceId,"u","p","public","Public",null)}
            override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection=throw IOException()
        }
        val owner=DeviceReadOwner(scope,contexts,access,{_,_->throw IOException()},{},{null})
        val journal=object:SelfUnbindRecoveryJournal {
            override suspend fun unresolved(userId:String)=emptyList<SelfUnbindRecord>()
            override suspend fun load(key:String):SelfUnbindRecord? {loads++;val old=saved;read();return old}
            override suspend fun reserve(candidate:SelfUnbindRecord)=saved?:candidate.also {saved=it}
            override suspend fun complete(record:SelfUnbindRecord):Boolean {if(saved?.operationId!=record.operationId)return false;saved=record;return true}
        }
        val app=SelfUnbindApplication(scope,contexts,journal,access,{s->object:SelfUnbindRepository {
            override val scope=s
            override suspend fun deleteSelf(){deletes++;deletion()}
            override suspend fun isOwned()=error("No status HTTP")
        }},{owner})
        suspend fun registration():NativeSelfUnbindRegistration {val handle=owner.observe("d","a");withTimeout(2000){handle.state.first {it is DeviceObservationState.Current&&it.snapshot.metadata!=null}};return app.register(handle,7){true}!!}
        fun close(){app.close();owner.close();scope.cancel()}
    }
    @Test fun idleAuthorityIsNativeAndDoesNotAuthorizeOrDispatch():Unit=runBlocking {val f=Fixture();try{val page=f.registration();val before=f.authorizations;val state=f.app.inspect(page);assertEquals("idle",state.view.state);assertTrue(state.canRequest);assertEquals(before,f.authorizations);assertEquals(0,f.deletes)}finally{f.close()}}
    @Test fun unknownJournalCannotBecomeANewWritePermit():Unit=runBlocking {val f=Fixture();try{val page=f.registration();val task=f.app.begin(page,"tap");assertEquals("unknown",task.await().state);val before=f.authorizations;val state=f.app.inspect(page);assertEquals("unknown",state.view.state);assertFalse(state.canRequest);assertEquals(before,f.authorizations);assertEquals(1,f.deletes)}finally{f.close()}}
    @Test fun lateDiskInspectionCannotReplaceANewApplicationOperationWithIdle():Unit=runBlocking {val f=Fixture();val gate=CompletableDeferred<Unit>();try{val page=f.registration();var first=true;f.read={if(first){first=false;withContext(NonCancellable){gate.await()}}};val inspection=async(start=CoroutineStart.UNDISPATCHED){f.app.inspect(page)};assertFalse(inspection.isCompleted);f.app.begin(page,"tap").await();gate.complete(Unit);val result=inspection.await();assertEquals("unknown",result.view.state);assertFalse(result.canRequest);assertEquals(1,f.deletes)}finally{gate.complete(Unit);f.close()}}
    @Test fun knownAcceptedTaskRemainsReadableAfterItsOwnOwnershipRevocation():Unit=runBlocking {val f=Fixture();try{f.deletion={};val page=f.registration();val task=f.app.begin(page,"tap");assertEquals("confirmed_cleanup_pending",task.await().state);assertEquals(DeviceReadPhase.FORBIDDEN,(page.binding.handle.state.value as DeviceObservationState.Current).snapshot.phase);val before=f.authorizations;val result=f.app.inspect(page);assertEquals("confirmed_cleanup_pending",result.view.state);assertFalse(result.canRequest);assertEquals(before,f.authorizations);assertEquals(1,f.deletes)}finally{f.close()}}
}

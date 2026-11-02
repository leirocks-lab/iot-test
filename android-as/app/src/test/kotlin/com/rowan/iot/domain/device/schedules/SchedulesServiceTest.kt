package com.rowan.iot.domain.device.schedules

import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class SchedulesServiceTest {
    private val scope=ScheduleScope(7,"fixture-device","fixture-product","fixture-model")
    private fun draft()=ScheduleDraft(ScheduleType.ONCE,"12:00",RepeatType.ONCE,"Etc/UTC",
        ActionPermit(scope,"""{"fixtureRelay":"on"}""",null))
    private fun row(id:String="existing",enabled:Boolean=false)=ScheduleRecord.decode(scope,
        draft().toCreateJson(scope).put("id",id).put("enabled",enabled).toString())
    private inner class Repository:SchedulesRepository {
        override val scope=this@SchedulesServiceTest.scope
        var rows=listOf(row())
        val calls=mutableListOf<String>()
        var getHook:suspend()->Unit={}
        var createHook:suspend()->Unit={}
        var updateHook:suspend()->Unit={}
        var enableHook:suspend()->Unit={}
        var deleteHook:suspend()->Unit={}
        override suspend fun load():List<ScheduleRecord> {calls+="GET";getHook();return rows.toList()}
        override suspend fun create(draft:ScheduleDraft):ScheduleRecord {
            calls+="POST";createHook()
            val added=ScheduleRecord.decode(scope,draft.toCreateJson(scope).put("id","created").put("enabled",true).toString())
            rows=rows+added;return added
        }
        override suspend fun update(existing:ScheduleRecord,draft:ScheduleDraft):ScheduleRecord {
            calls+="PATCH";updateHook()
            val updated=ScheduleRecord.decode(scope,draft.toUpdateJson(scope,existing).put("id",existing.id).toString())
            rows=rows.map {if(it.id==existing.id)updated else it};return updated
        }
        override suspend fun setEnabled(scheduleId:String,enabled:Boolean):Boolean {
            calls+="PUT";enableHook()
            rows=rows.map {if(it.id==scheduleId)ScheduleRecord.decode(scope,JSONObject(it.rawJson).put("enabled",enabled).toString()) else it}
            return enabled
        }
        override suspend fun delete(scheduleId:String) {calls+="DELETE";deleteHook();rows=rows.filterNot {it.id==scheduleId}}
    }

    @Test fun createPublishesOnlyAnAcknowledgedServerIdAfterReadingTheListBack():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear();service.create(draft())
        assertEquals(listOf("POST","GET"),repo.calls)
        assertTrue(service.state.value.schedules.any {it.id=="created"})
        assertFalse(service.state.value.resultUnknown);assertFalse(service.state.value.busy)
    }
    @Test fun unknownCreateCannotBeClearedByAListItemWithMatchingFieldsOrAutomaticallyReplayed():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear()
        repo.createHook={repo.rows=repo.rows+row("similar-existing",true);throw ScheduleMutationUnknown()}
        service.create(draft())
        assertTrue(service.state.value.resultUnknown)
        service.create(draft());assertEquals(1,repo.calls.count {it=="POST"})
        service.load();assertTrue(service.state.value.resultUnknown)
        service.create(draft());assertEquals(1,repo.calls.count {it=="POST"})
    }
    @Test fun enableUnknownCanBeReconciledByAnExplicitReadWithoutReissuingThePut():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear()
        repo.enableHook={repo.rows=listOf(row(enabled=true));throw ScheduleMutationUnknown()}
        service.setEnabled("existing",true)
        assertTrue(service.state.value.resultUnknown)
        service.setEnabled("existing",true);assertEquals(1,repo.calls.count {it=="PUT"})
        service.load();assertFalse(service.state.value.resultUnknown)
        assertEquals(true,service.state.value.schedules.single().enabled)
        assertEquals(1,repo.calls.count {it=="PUT"})
    }
    @Test fun acknowledgedDeleteWithFailedReadbackKeepsTheRowAndUnknownUntilAbsenceIsRead():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear();repo.getHook={throw java.io.IOException()}
        service.delete("existing")
        assertTrue(service.state.value.resultUnknown);assertEquals(1,service.state.value.schedules.size)
        service.delete("existing");assertEquals(1,repo.calls.count {it=="DELETE"})
        repo.getHook={};service.load()
        assertTrue(service.state.value.schedules.isEmpty());assertFalse(service.state.value.resultUnknown)
    }
    @Test fun cancellingAnAlreadyDispatchedCreateEndsBusyButPreservesUnknownWithoutReplaying():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear()
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        repo.createHook={entered.complete(Unit);withContext(NonCancellable){finish.await()}}
        val work=launch {service.create(draft())}
        entered.await();work.cancel();finish.complete(Unit);work.join()
        assertTrue(work.isCancelled);assertTrue(service.state.value.resultUnknown);assertFalse(service.state.value.busy)
        service.create(draft());assertEquals(1,repo.calls.count {it=="POST"})
    }
    @Test fun accountChangeRejectsALateListAndRemovesPreviousPrivateState():Unit=runBlocking {
        val repo=Repository();var current=true;val service=SchedulesService(repo,{current})
        service.load()
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        repo.getHook={entered.complete(Unit);withContext(NonCancellable){finish.await()}}
        val work=async {service.load()};entered.await();current=false;finish.complete(Unit);work.await()
        assertTrue(service.state.value.sessionExpired);assertTrue(service.state.value.schedules.isEmpty())
    }
    @Test fun duplicateSubmitDuringAnInFlightOperationDoesNotQueueAnotherExecutingRule():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear()
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        repo.createHook={entered.complete(Unit);finish.await()}
        val work=async {service.create(draft())};entered.await()
        service.create(draft());assertEquals(1,repo.calls.count {it=="POST"})
        finish.complete(Unit);work.await();assertEquals(1,repo.calls.count {it=="POST"})
    }
    @Test fun editingAKnownDisabledRuleDoesNotReenableItAndFailureDoesNotInventSuccess():Unit=runBlocking {
        val repo=Repository();val service=SchedulesService(repo,{true})
        service.load();repo.calls.clear();service.update("existing",draft())
        assertEquals(listOf("PATCH","GET"),repo.calls)
        assertEquals(false,service.state.value.schedules.single().enabled)
        repo.updateHook={throw ScheduleMutationUnknown()}
        service.update("existing",draft())
        assertTrue(service.state.value.resultUnknown)
        assertEquals(false,service.state.value.schedules.single().enabled)
    }
    @Test fun unknownModelAllowsExistingAuthorizedIdMetadataOperationsButNotArbitraryIds():Unit=runBlocking {
        val readScope=scope.copy(modelVersion=null)
        var rows=listOf(ScheduleRecord.decode(readScope,"""{"id":"existing","enabled":false,"action":{"unregistered":true}}"""))
        val calls=mutableListOf<String>()
        val repo=object:SchedulesRepository {
            override val scope=readScope
            override suspend fun load():List<ScheduleRecord> {calls+="GET";return rows}
            override suspend fun create(draft:ScheduleDraft):ScheduleRecord=error("No control permit exists")
            override suspend fun update(existing:ScheduleRecord,draft:ScheduleDraft):ScheduleRecord=error("No control permit exists")
            override suspend fun setEnabled(scheduleId:String,enabled:Boolean):Boolean {
                calls+="PUT:$scheduleId"
                rows=rows.map {ScheduleRecord.decode(readScope,JSONObject(it.rawJson).put("enabled",enabled).toString())}
                return enabled
            }
            override suspend fun delete(scheduleId:String) {calls+="DELETE:$scheduleId";rows=emptyList()}
        }
        val service=SchedulesService(repo,{true})
        service.setEnabled("existing",true);service.delete("existing")
        assertTrue(calls.isEmpty())
        service.load();calls.clear()
        service.setEnabled("not-in-loaded-list",true);service.delete("not-in-loaded-list")
        assertTrue(calls.isEmpty())
        service.setEnabled("existing",true)
        assertEquals(listOf("PUT:existing","GET"),calls)
        assertEquals(true,service.state.value.schedules.single().enabled)
        assertNull(service.state.value.schedules.single().scope.modelVersion)
        calls.clear();service.delete("existing")
        assertEquals(listOf("DELETE:existing","GET"),calls)
        assertTrue(service.state.value.schedules.isEmpty());assertFalse(service.state.value.resultUnknown)
    }
}

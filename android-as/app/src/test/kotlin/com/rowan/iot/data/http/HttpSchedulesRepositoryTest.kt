package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.device.schedules.*
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class HttpSchedulesRepositoryTest {
    private data class Call(val method:String,val path:String,val body:JSONObject?,val token:String?)
    private class Fixture(val account:AccountService,val scope:ScheduleScope,val repo:HttpSchedulesRepository)
    private val calls=mutableListOf<Call>()
    private suspend fun fixture(modelVersion:String?="fixture-model",resourceId:String="fixture/device +一",handler:suspend(Call)->JSONObject):Fixture {
        var logins=0
        val account=AccountService(HttpGateway {method,path,body,token->
            if(method=="POST"&&path=="/api/app/session") {
                logins++
                JSONObject().put("data",JSONObject().put("accessToken","fixture-access-$logins").put("refreshToken","fixture-refresh-$logins")
                    .put("userID","fixture-user-$logins").put("setting",JSONObject()))
            }else {val call=Call(method,path,body?.let {JSONObject(it.toString())},token);calls+=call;handler(call)}
        },object:SessionStorage {override fun read():String?=null;override fun write(value:String?)=Unit})
        account.login("fixture@example.test","fixture-password")
        val scope=ScheduleScope(account.revision,resourceId,"fixture-product",modelVersion)
        return Fixture(account,scope,HttpSchedulesRepository(account,scope))
    }
    private fun draft(scope:ScheduleScope)=ScheduleDraft(ScheduleType.ONCE,"12:34",RepeatType.ONCE,"Etc/UTC",
        ActionPermit(scope,"""{"fixtureRelay":"on"}""",null))
    private fun record(scope:ScheduleScope,id:String="rule/one")=ScheduleRecord.decode(scope,
        draft(scope).toCreateJson(scope).put("id",id).put("enabled",false).put("nextExecutionAt","server-next").toString())
    private val base="/api/app/devices/fixture%2Fdevice%20%2B%E4%B8%80/schedules"

    @Test fun getUsesAuthenticatedExactEndpointWithEncodedDeviceSegment():Unit=runBlocking {
        val f=fixture {JSONObject().put("data",JSONArray().put(JSONObject("""{"id":"rule","future":{"x":1}}""")))}
        val rows=f.repo.load()
        assertEquals(base,calls.single().path);assertEquals("GET",calls.single().method);assertNull(calls.single().body)
        assertEquals(f.account.session!!.accessToken,calls.single().token)
        assertEquals(1,JSONObject(rows.single().rawJson).getJSONObject("future").getInt("x"))
    }
    @Test fun createPostsOnlyDefinedBodyAndReturnsTheActualServerAssignedId():Unit=runBlocking {
        val f=fixture {call->JSONObject().put("data",JSONObject(call.body!!.toString()).put("id","server-created").put("enabled",true))}
        val result=f.repo.create(draft(f.scope))
        assertEquals("server-created",result.id);assertEquals(listOf("POST"),calls.map {it.method})
        assertEquals(base,calls.single().path)
        assertFalse(calls.single().body!!.has("id"));assertFalse(calls.single().body!!.has("nextExecutionAt"))
        assertEquals("on",calls.single().body!!.getJSONObject("action").getString("fixtureRelay"))
    }
    @Test fun updateEncodesScheduleIdCarriesRequiredFieldsAndKeepsDisabledFalse():Unit=runBlocking {
        val f=fixture {call->JSONObject().put("data",JSONObject(call.body!!.toString()).put("id","rule/one"))}
        f.repo.update(record(f.scope),draft(f.scope))
        assertEquals("PATCH",calls.single().method);assertEquals("$base/rule%2Fone",calls.single().path)
        assertEquals(false,calls.single().body!!.getBoolean("enabled"))
        for(key in listOf("type","startTime","repeatType","action","timeZone"))assertTrue(calls.single().body!!.has(key))
        assertFalse(calls.single().body!!.has("id"));assertFalse(calls.single().body!!.has("nextExecutionAt"))
    }
    @Test fun enableUsesPutWithOnlyARealBooleanAndChecksTheReturnedValue():Unit=runBlocking {
        val f=fixture {JSONObject().put("data",JSONObject().put("enabled",false))}
        assertEquals(false,f.repo.setEnabled("rule/one",false))
        assertEquals("PUT",calls.single().method);assertEquals("$base/rule%2Fone/enabled",calls.single().path)
        assertEquals(setOf("enabled"),calls.single().body!!.keys().asSequence().toSet())
        assertEquals(false,calls.single().body!!.get("enabled"))
    }
    @Test fun deleteHasNoBodyAndDoesNotRequireMutationData():Unit=runBlocking {
        val f=fixture {JSONObject("""{"code":0,"success":true}""")}
        f.repo.delete("rule/one")
        assertEquals("DELETE",calls.single().method);assertEquals("$base/rule%2Fone",calls.single().path);assertNull(calls.single().body)
    }
    @Test fun wrongUpdateResponseIdentityAndWrongEnabledResponseAreUnknown():Unit=runBlocking {
        val update=fixture {JSONObject().put("data",JSONObject().put("id","other-rule"))}
        assertTrue(runCatching {update.repo.update(record(update.scope),draft(update.scope))}.exceptionOrNull() is ScheduleMutationUnknown)
        calls.clear()
        val enabled=fixture {JSONObject().put("data",JSONObject().put("enabled",true))}
        assertTrue(runCatching {enabled.repo.setEnabled("rule",false)}.exceptionOrNull() is ScheduleMutationUnknown)
        assertEquals(listOf("PUT"),calls.map {it.method})
    }
    @Test fun lostCreateIdIsUnknownAndNeverRecoveredByLookingForASimilarRule():Unit=runBlocking {
        val f=fixture {JSONObject().put("data",JSONObject().put("enabled",true))}
        assertTrue(runCatching {f.repo.create(draft(f.scope))}.exceptionOrNull() is ScheduleMutationUnknown)
        assertEquals(listOf("POST"),calls.map {it.method})
    }
    @Test fun transportTimeoutForEveryMutationIsUnknownAndEachIsDispatchedOnce():Unit=runBlocking {
        for(operation in 0..3) {
            calls.clear()
            val f=fixture {throw java.net.SocketTimeoutException()}
            val error=runCatching {when(operation) {
                0->f.repo.create(draft(f.scope));1->f.repo.update(record(f.scope),draft(f.scope))
                2->f.repo.setEnabled("rule",true);else->f.repo.delete("rule")
            }}.exceptionOrNull()
            assertTrue(error is ScheduleMutationUnknown);assertEquals(1,calls.size)
        }
    }
    @Test fun explicitBusinessFailuresRemainTypedAndAreNeverAutomaticallyRetried():Unit=runBlocking {
        for(code in listOf(1701,1702,1703,1704,403)) {
            calls.clear();val f=fixture {throw ApiFailure(code,"fixture rejection")}
            val error=runCatching {f.repo.create(draft(f.scope))}.exceptionOrNull()
            assertEquals(code,(error as ApiFailure).code);assertEquals(listOf("POST"),calls.map {it.method})
        }
    }
    @Test fun oldScopeCannotReadOrMutateUsingANewAccountsToken():Unit=runBlocking {
        val f=fixture {JSONObject().put("data",JSONArray())}
        f.account.clearLocal();f.account.login("next@example.test","fixture-password")
        assertTrue(runCatching {f.repo.load()}.isFailure)
        assertTrue(runCatching {f.repo.create(draft(f.scope))}.isFailure)
        assertTrue(runCatching {f.repo.update(record(f.scope),draft(f.scope))}.isFailure)
        assertTrue(runCatching {f.repo.setEnabled("rule",true)}.isFailure)
        assertTrue(runCatching {f.repo.delete("rule")}.isFailure)
        assertTrue(calls.isEmpty())
    }
    @Test fun cancelledLateTransportResponseCannotReturnSchedules():Unit=runBlocking {
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val f=fixture {entered.complete(Unit);withContext(NonCancellable){finish.await()};JSONObject().put("data",JSONArray())}
        var returned=false
        val job=launch {f.repo.load();returned=true}
        entered.await();job.cancel();finish.complete(Unit);job.join()
        assertTrue(job.isCancelled);assertFalse(returned)
    }
    @Test fun invalidListAndDuplicateIdsNeverBecomeAnEmptyOrLastWinsSuccess():Unit=runBlocking {
        for(data in listOf<Any>(JSONObject(),JSONArray().put(JSONObject()),JSONArray("""[{"id":"same"},{"id":"same"}]"""))) {
            val f=fixture {JSONObject().put("data",data)}
            assertTrue(runCatching {f.repo.load()}.isFailure)
        }
    }
    @Test fun authorizedListWithUnknownModelUsesOnlyTheDefinedGetAndKeepsTheAccountGuard():Unit=runBlocking {
        val f=fixture(modelVersion=null) {JSONObject().put("data",JSONArray().put(
            JSONObject("""{"id":"existing","enabled":true,"action":{"unregistered":false}}""")))}
        val record=f.repo.load().single()
        assertNull(record.scope.modelVersion)
        assertEquals("existing",record.id)
        assertEquals(false,JSONObject(record.actionJson!!).getBoolean("unregistered"))
        assertEquals("GET",calls.single().method);assertEquals(base,calls.single().path)
        assertNull(calls.single().body);assertEquals(f.account.session!!.accessToken,calls.single().token)
        calls.clear();f.account.clearLocal();f.account.login("next@example.test","fixture-password")
        assertTrue(runCatching {f.repo.load()}.isFailure);assertTrue(calls.isEmpty())
    }
    @Test fun completeDotDeviceSegmentsCannotDispatchAListRequest():Unit=runBlocking {
        for(id in listOf(".","..")) {
            calls.clear()
            val error=runCatching {
                val f=fixture(resourceId=id) {JSONObject().put("data",JSONArray())}
                f.repo.load()
            }.exceptionOrNull()
            assertNotNull(error);assertTrue(calls.isEmpty())
        }
    }
    @Test fun completeDotScheduleSegmentsCannotDispatchEnableOrDelete():Unit=runBlocking {
        val f=fixture {call->
            if(call.method=="PUT")JSONObject().put("data",JSONObject().put("enabled",true)) else JSONObject()
        }
        for(id in listOf(".","..")) {
            calls.clear()
            assertTrue(runCatching {f.repo.setEnabled(id,true)}.isFailure)
            assertTrue(runCatching {f.repo.delete(id)}.isFailure)
            assertTrue(calls.isEmpty())
        }
    }
    @Test fun poisonedReadIdsCannotBecomePatchPathsAndValidDottedIdsRemainWritable():Unit=runBlocking {
        val f=fixture {call->JSONObject().put("data",JSONObject(call.body!!.toString()).put("id","rule..one"))}
        for(id in listOf(".","..")) {
            calls.clear()
            assertTrue(runCatching {
                val poisoned=ScheduleRecord.decode(f.scope,JSONObject().put("id",id).put("enabled",false).toString())
                f.repo.update(poisoned,draft(f.scope))
            }.isFailure)
            assertTrue(calls.isEmpty())
        }
        f.repo.update(record(f.scope,"rule..one"),draft(f.scope))
        assertEquals("$base/rule..one",calls.single().path)
        assertEquals("PATCH",calls.single().method)
    }
}

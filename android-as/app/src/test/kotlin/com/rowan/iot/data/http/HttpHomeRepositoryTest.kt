package com.rowan.iot.data.http

import com.rowan.iot.domain.rooms.RoomId
import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class HttpHomeRepositoryTest {
    private fun group(id:Any?="room/1",name:Any="Kitchen",device:Any="device/1")=JSONObject()
        .put("room",JSONObject().apply {if(id!=null)put("id",id);put("name",name)})
        .put("devices",JSONArray().put(JSONObject().put("device",JSONObject().put("id",device)).put("deviceNickname","Cooler")))
    @Test fun homeRoomIdRetainsExactTextOrIntegerType() {
        val groups=HttpHomeRepository.decodeGroups(JSONArray().put(group("42")).put(group(42,device="other")))
        assertEquals(RoomId.Text("42"),groups[0].roomId);assertEquals(RoomId.Numeric(42),groups[1].roomId)
    }
    @Test fun missingOrNullRoomDoesNotAssertUnassignedAndKeepsDevices() {
        for(raw in listOf(group().apply {remove("room")},group().put("room",JSONObject.NULL),group(null))) {
            val g=HttpHomeRepository.decodeGroups(JSONArray().put(raw)).single();assertNull(g.roomId);assertEquals(1,g.devices.size)
        }
    }
    @Test fun invalidRoomAndDeviceTypesAreRejectedRatherThanCoerced() {
        for(raw in listOf(group(true),group(1.5),group(""),group(name=JSONObject()),group(device=1),group().put("room",false)))
            assertTrue(runCatching {HttpHomeRepository.decodeGroups(JSONArray().put(raw))}.isFailure)
    }
    @Test fun duplicateRoomIdsAndDuplicateDeviceMembershipAreNotAmbiguousTabs() {
        assertTrue(runCatching {HttpHomeRepository.decodeGroups(JSONArray().put(group()).put(group(device="other")))}.isFailure)
        assertTrue(runCatching {HttpHomeRepository.decodeGroups(JSONArray().put(group()).put(group("room/2")))}.isFailure)
    }
    @Test fun opaqueIdsAreNotTrimmedParsedOrDefaulted() {
        val g=HttpHomeRepository.decodeGroups(JSONArray().put(group(" 0042/.. "))).single()
        assertEquals(RoomId.Text(" 0042/.. "),g.roomId);assertEquals("Kitchen",g.roomName)
    }
    @Test fun emptyHomeAndKnownEmptyRoomRemainDistinct() {
        assertTrue(HttpHomeRepository.decodeGroups(JSONArray()).isEmpty())
        val g=HttpHomeRepository.decodeGroups(JSONArray().put(group().put("devices",JSONArray()))).single()
        assertEquals(RoomId.Text("room/1"),g.roomId);assertTrue(g.devices.isEmpty())
        val unnamed=HttpHomeRepository.decodeGroups(JSONArray().put(group().put("devices",JSONArray().put(
            JSONObject().put("device",JSONObject().put("id","empty-nickname")).put("deviceNickname",""))))).single()
        assertEquals("empty-nickname",unnamed.devices.single().nickname)
    }
    @Test fun exactHomeReadUsesCapturedRevisionWithoutExtraRoomRequests():Unit=runBlocking {
        val calls=mutableListOf<String>()
        val gateway=HttpGateway {method,path,_,_->calls+="$method $path"
            if(path=="/api/app/session")JSONObject().put("data",JSONObject().put("accessToken","fixture").put("refreshToken","refresh").put("userID","user"))
            else JSONObject().put("data",JSONArray().put(group()))}
        val account=AccountService(gateway,object:SessionStorage {override fun read():String?=null;override fun write(value:String?) {}})
        account.login("fixture@example.test","fixture");calls.clear()
        val expected=account.revision;HttpHomeRepository(account).loadGroups(expected)
        assertEquals(listOf("GET /api/app/devices"),calls)
        account.clearLocal();calls.clear()
        assertTrue(runCatching {HttpHomeRepository(account).loadGroups(expected)}.isFailure);assertTrue(calls.isEmpty())
    }
    @Test fun lateOldAccountResponseCannotReturnMetadata():Unit=runBlocking {
        val started=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val gateway=HttpGateway {_,path,_,_->
            if(path=="/api/app/session")JSONObject().put("data",JSONObject().put("accessToken","fixture").put("refreshToken","refresh").put("userID","user"))
            else {started.complete(Unit);withContext(NonCancellable){finish.await()};JSONObject().put("data",JSONArray().put(group()))}}
        val account=AccountService(gateway,object:SessionStorage {override fun read():String?=null;override fun write(value:String?) {}})
        account.login("fixture@example.test","fixture");val expected=account.revision
        val read=async {runCatching {HttpHomeRepository(account).loadGroups(expected)}}
        started.await();account.clearLocal();finish.complete(Unit);assertTrue(read.await().isFailure)
    }
}

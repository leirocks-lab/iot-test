package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import com.rowan.iot.domain.rooms.*
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class HttpRoomRepositoryTest {
    @Test fun completeDotDeviceLocationSegmentsNeverDispatchGetOrPut():Unit=runBlocking {
        val (_,repo)=repository {error("Dot segment reached HTTP")}
        for(id in listOf(".","..")) {
            assertTrue(runCatching {repo.location(id)}.isFailure)
            assertTrue(runCatching {repo.move(id,RoomId.Text("room"))}.isFailure)
        }
        assertTrue(calls.isEmpty())
    }
    @Test fun opaqueDeviceLocationSegmentsRemainEncodedWithoutOverRejectingDots():Unit=runBlocking {
        val (_,repo)=repository {JSONObject().put("data",JSONObject().put("id","room").put("name","Study"))}
        repo.location("a..b/%2e ?")
        assertEquals("/api/app/devices/a..b%2F%252e%20%3F/location",calls.single().path)
    }
    private data class Call(val method: String, val path: String, val body: JSONObject?)
    private val calls = mutableListOf<Call>()
    private suspend fun repository(handler: suspend (Call) -> JSONObject): Pair<AccountService, HttpRoomRepository> {
        val account = AccountService(HttpGateway { method, path, body, _ ->
            if (path == "/api/app/session") JSONObject("""{"data":{"accessToken":"test","refreshToken":"test-refresh","userID":"test-user","setting":{}}}""")
            else { val call = Call(method, path, body); calls += call; handler(call) }
        }, object : SessionStorage { override fun read(): String? = null; override fun write(value: String?) {} })
        account.login("test@example.com", "password")
        return account to HttpRoomRepository(account)
    }
    private fun list(vararg rooms: String) = JSONObject().put("data", JSONArray("[${rooms.joinToString(",")}]"))
    private val a = """{"id":"room/a","name":"客厅","isDefault":false,"deviceCount":0}"""
    private val b = """{"id":42,"name":"厨房","isDefault":false,"deviceCount":2}"""

    @Test fun listRetainsOpaqueIdTypesAndUnknownCounts() = runBlocking {
        val (_, repo) = repository { list(a, """{"id":42,"name":"厨房"}""") }
        val rooms = repo.load()
        assertEquals(RoomId.Text("room/a"), rooms[0].id)
        assertEquals(RoomId.Numeric(42), rooms[1].id)
        assertNull(rooms[1].deviceCount)
        assertNull(rooms[1].isDefault)
        assertEquals("GET", calls.single().method)
        assertEquals("/api/app/user/locations", calls.single().path)
    }
    @Test fun invalidListDoesNotBecomeEmptyOrInventCounts() = runBlocking {
        for (data in listOf("{}", "[{\"id\":\"a\",\"name\":\"A\",\"deviceCount\":-1}]", "[$a,$a]")) {
            val (_, repo) = repository { JSONObject().put("data", org.json.JSONTokener(data).nextValue()) }
            assertTrue(runCatching { repo.load() }.isFailure)
        }
    }
    @Test fun createPostsOnlyNameThenVerifiesByGet() = runBlocking {
        val (_, repo) = repository { if (it.method == "GET") list(a) else JSONObject() }
        assertEquals("客厅", repo.create(" 客厅 ").single().name)
        assertEquals(listOf("POST", "GET"), calls.map { it.method })
        assertEquals(setOf("name"), calls[0].body!!.keys().asSequence().toSet())
        assertEquals("客厅", calls[0].body!!.getString("name"))
    }
    @Test fun renameEncodesOpaquePathAndDoesNotRequireMutationData() = runBlocking {
        val (_, repo) = repository { if (it.method == "GET") list(a.replace("客厅", "新客厅")) else JSONObject() }
        repo.rename(RoomId.Text("room/a"), "新客厅")
        assertEquals("PATCH", calls.first().method)
        assertEquals("/api/app/user/locations/room%2Fa", calls.first().path)
        assertEquals(setOf("name"), calls.first().body!!.keys().asSequence().toSet())
    }
    @Test fun sortingUsesFreshBaselineAndOnlyDefinedRoomsFields() = runBlocking {
        var saved = false
        val (_, repo) = repository { call ->
            if (call.method == "PUT") { saved = true; JSONObject() }
            else if (saved) list(b, a) else list(a, b)
        }
        val baseline = repo.load(); calls.clear()
        val result = repo.saveLayout(baseline, baseline.reversed().map { it.id })
        assertEquals(listOf("GET", "PUT", "GET"), calls.map { it.method })
        val body = calls[1].body!!
        assertEquals(setOf("rooms"), body.keys().asSequence().toSet())
        assertEquals(setOf("id", "name"), body.getJSONArray("rooms").getJSONObject(0).keys().asSequence().toSet())
        assertTrue(body.getJSONArray("rooms").getJSONObject(0).get("id") is Number)
        assertEquals(RoomId.Numeric(42), result[0].id)
    }
    @Test fun staleSortDoesNotOverwriteOtherTerminalChanges() = runBlocking {
        var changed = false
        val (_, repo) = repository { if (changed) list(a.replace("客厅", "另一终端"), b) else list(a, b) }
        val baseline = repo.load(); changed = true; calls.clear()
        val error = runCatching { repo.saveLayout(baseline, baseline.reversed().map { it.id }) }.exceptionOrNull()
        assertTrue(error is RoomBaselineChanged)
        assertEquals(listOf("GET"), calls.map { it.method })
    }
    @Test fun nonEmptyDefaultAndUnknownRoomDeletionAreBlockedWithoutPut() = runBlocking {
        for (unsafe in listOf(b, a.replace("false", "true"), """{"id":"room/a","name":"客厅"}""")) {
            val (_, repo) = repository { list(unsafe) }
            val baseline = repo.load(); calls.clear()
            assertTrue(runCatching { repo.saveLayout(baseline, emptyList()) }.exceptionOrNull() is RoomRuleBlocked)
            assertEquals(listOf("GET"), calls.map { it.method })
        }
    }
    @Test fun deleteOnlyAnEmptyNonDefaultRoomAndConfirmRemoval() = runBlocking {
        var saved = false
        val (_, repo) = repository { if (it.method == "PUT") { saved = true; JSONObject() } else if (saved) list(b) else list(a, b) }
        val baseline = repo.load(); calls.clear()
        assertEquals(listOf(RoomId.Numeric(42)), repo.saveLayout(baseline, listOf(RoomId.Numeric(42))).map { it.id })
        assertEquals(1, calls[1].body!!.getJSONArray("rooms").length())
    }
    @Test fun timeoutDoesNotReplayMutationAndReadbackFailureIsUnknown() = runBlocking {
        val (_, repo) = repository { throw java.net.SocketTimeoutException() }
        assertTrue(runCatching { repo.create("客厅") }.exceptionOrNull() is RoomResultUnknown)
        assertEquals(1, calls.count { it.method == "POST" })
        calls.clear()
        val (_, second) = repository { if (it.method == "POST") JSONObject() else throw ApiFailure(503, "unavailable") }
        assertTrue(runCatching { second.create("客厅") }.exceptionOrNull() is RoomResultUnknown)
        assertEquals(listOf("POST", "GET"), calls.map { it.method })
    }
    @Test fun duplicateNameAndMissingRoomKeepTheirBusinessFailures() = runBlocking {
        for (code in listOf(1421, 1431, 1432, 1441, 409, 403)) {
            calls.clear()
            val (_, repo) = repository { throw ApiFailure(code, "server rejected") }
            val error = runCatching { repo.rename(RoomId.Numeric(42), "客厅") }.exceptionOrNull()
            assertEquals(code, (error as ApiFailure).code)
            assertEquals(1, calls.size)
        }
    }
    @Test fun mutationAcceptanceWithoutMatchingReadbackIsNotReportedAsSuccess() = runBlocking {
        val (_, repo) = repository { if (it.method == "POST") JSONObject() else list(a) }
        assertTrue(runCatching { repo.create("尚未读回的新房间") }.exceptionOrNull() is RoomResultUnknown)
        assertEquals(listOf("POST", "GET"), calls.map { it.method })
    }
    @Test fun oldAccountCannotStartOrAcceptAResponse() = runBlocking {
        val (account, repo) = repository { list(a) }
        account.clearLocal(); account.login("next@example.com", "password")
        assertTrue(runCatching { repo.load() }.isFailure)
        assertTrue(calls.isEmpty())
        val started = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        val (live, waiting) = repository { started.complete(Unit); withContext(NonCancellable) { finish.await() }; list(a) }
        val work = async { runCatching { waiting.load() } }
        started.await(); live.clearLocal(); finish.complete(Unit)
        assertTrue(work.await().isFailure)
    }
    @Test fun cancelledUncooperativeTransportCannotReturnRooms() = runBlocking {
        val started = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        val (_, repo) = repository { started.complete(Unit); withContext(NonCancellable) { finish.await() }; list(a) }
        val work = async { repo.load() }
        started.await(); work.cancel(); finish.complete(Unit); work.join()
        assertTrue(work.isCancelled)
    }
    @Test fun roomSelectionUsesDefinedLocationEndpointsButNullDoesNotConfirmUnassignment():Unit = runBlocking {
        var location: Any = "room/a"
        val (_, repo) = repository { call ->
            if (call.method == "PUT") { location = call.body!!.opt("id") ?: JSONObject.NULL; JSONObject() }
            else JSONObject().put("data", if (location == JSONObject.NULL) JSONObject.NULL else JSONObject().put("id", location).put("name", "客厅"))
        }
        assertEquals(RoomId.Text("room/a"), repo.location("device/a")!!.id)
        repo.move("device/a", RoomId.Numeric(42))
        assertEquals("/api/app/devices/device%2Fa/location", calls[1].path)
        assertEquals(42L, calls[1].body!!.getLong("id"))
        // V1.4 permits omission in PUT, but ROOM-02 null is not a frozen
        // unassigned response (the real read probe also returned missing data).
        assertTrue(runCatching {repo.move("device/a", null)}.exceptionOrNull() is RoomResultUnknown)
        assertEquals(0, calls[3].body!!.length())
        assertEquals(listOf("GET","PUT","GET","PUT","GET"),calls.map {it.method})
    }
    @Test fun acceptedUnassignWithMissingNullOrEmptyReadbackIsUnknownAndNeverReplayed():Unit=runBlocking {
        for(readback in listOf(JSONObject(),JSONObject().put("data",JSONObject.NULL),JSONObject().put("data",JSONObject()))) {
            calls.clear()
            val (_,repo)=repository {call->if(call.method=="PUT")JSONObject() else readback}
            assertTrue(runCatching {repo.move("device/a",null)}.exceptionOrNull() is RoomResultUnknown)
            assertEquals(listOf("PUT","GET"),calls.map {it.method})
            assertEquals("/api/app/devices/device%2Fa/location",calls.first().path)
            assertEquals(0,calls.first().body!!.length())
        }
    }
    @Test fun knownAssignedReadbackStillConfirmsOnlyTheMatchingOpaqueRoomId():Unit=runBlocking {
        val (_,repo)=repository {call->if(call.method=="PUT")JSONObject() else JSONObject().put("data",JSONObject().put("id","room/a").put("name","Study"))}
        assertEquals(RoomLocation(RoomId.Text("room/a"),"Study"),repo.move("device/a",RoomId.Text("room/a")))
        assertEquals(listOf("PUT","GET"),calls.map {it.method})
        calls.clear()
        assertTrue(runCatching {repo.move("device/a",RoomId.Text("other"))}.exceptionOrNull() is RoomResultUnknown)
        assertEquals(listOf("PUT","GET"),calls.map {it.method})
    }
}

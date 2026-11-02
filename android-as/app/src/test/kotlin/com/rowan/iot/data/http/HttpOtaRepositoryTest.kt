package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.device.ota.*
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import java.net.SocketTimeoutException
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Contract fixtures only. No real firmware task PUT/DELETE or service credentials. */
class HttpOtaRepositoryTest {
    private data class Call(val method: String, val path: String, val body: JSONObject?, val token: String?)
    private data class Fixture(val account: AccountService, val repository: HttpOtaRepository, val scope: OtaScope, val calls: MutableList<Call>)
    private fun candidate(id: String = "http-resource") = JSONObject().put("data", JSONObject()
        .put("firmware", JSONObject().put("id", "fw-selected").put("version", "1.2.3").put("remark", "Public release note"))
        .put("device", JSONObject().put("id", id).put("name", "Fixture device").put("mac", "fixture-mac")))
    private suspend fun fixture(resource: String = "http-resource", handler: suspend (Call) -> JSONObject): Fixture {
        val calls = mutableListOf<Call>()
        val account = AccountService(HttpGateway { method, path, body, token ->
            if (path == "/api/app/session" && method == "POST") {
                val user = if (body?.optString("account") == "b@example.test") "native-b" else "native-a"
                JSONObject().put("data", JSONObject().put("userID", user).put("accessToken", "fixture-access-$user")
                    .put("refreshToken", "fixture-refresh-$user").put("setting", JSONObject()))
            } else {
                val call = Call(method, path, body?.let { JSONObject(it.toString()) }, token)
                calls += call; handler(call)
            }
        }, object : SessionStorage { override fun read(): String? = null; override fun write(value: String?) = Unit })
        account.login("a@example.test", "fixture")
        val scope = OtaScope(account.revision, resource, "native-a")
        return Fixture(account, HttpOtaRepository(account, scope), scope, calls)
    }

    @Test fun bothFirmwareChecksUseExactAuthenticatedRoutesWithoutInventingARequiredHasUpdateFlag() = runBlocking {
        val f = fixture { candidate() }
        for (kind in listOf(OtaKind.MCU, OtaKind.WIFI)) {
            val offer = f.repository.check(kind)
            assertEquals(kind, offer.kind); assertEquals("fw-selected", offer.firmware.id)
            assertEquals("1.2.3", offer.firmware.version); assertEquals("Public release note", offer.firmware.remark)
            assertEquals("http-resource", offer.device.id); assertEquals("Fixture device", offer.device.name); assertEquals("fixture-mac", offer.device.mac)
        }
        assertEquals(listOf("/api/app/devices/http-resource/ota/mcu", "/api/app/devices/http-resource/ota/wifi"), f.calls.map { it.path })
        assertTrue(f.calls.all { it.method == "GET" && it.body == null && it.token == "fixture-access-native-a" })
    }
    @Test fun malformedCandidateOrDifferentDeviceCannotBecomeAnUpToDateOrStartableOffer() = runBlocking {
        val variants = listOf(
            candidate().apply { getJSONObject("data").remove("firmware") },
            candidate().apply { getJSONObject("data").getJSONObject("firmware").put("id", "") },
            candidate().apply { getJSONObject("data").getJSONObject("firmware").put("version", 123) },
            candidate("another-resource"),
            candidate().apply { getJSONObject("data").getJSONObject("device").remove("mac") },
        )
        for (value in variants) {
            val f = fixture { value }
            val failure = runCatching { f.repository.check(OtaKind.MCU) }.exceptionOrNull()
            assertTrue(failure is ApiFailure); assertEquals(502, (failure as ApiFailure).code)
            assertEquals(listOf("GET"), f.calls.map { it.method })
        }
    }
    @Test fun startUsesTypeQueryAndOnlyFirmwareIdThenRequiresTheReturnedTaskId() = runBlocking {
        val f = fixture { JSONObject().put("data", JSONObject().put("taskID", "opaque-task")) }
        assertEquals("opaque-task", f.repository.start(OtaKind.MCU, "fw/selected"))
        assertEquals("opaque-task", f.repository.start(OtaKind.WIFI, "fw-wifi"))
        assertEquals(listOf("/api/app/devices/http-resource/ota/task?type=mcu", "/api/app/devices/http-resource/ota/task?type=wifi"), f.calls.map { it.path })
        assertTrue(f.calls.all { it.method == "PUT" && it.body!!.keys().asSequence().toSet() == setOf("firmwareID") })
        assertEquals("fw/selected", f.calls[0].body!!.getString("firmwareID"))
    }
    @Test fun opaqueResourceAndTaskIdsAreSegmentsAndOnlyTheFourDeclaredResultsDecode() = runBlocking {
        val resource = "device/a ?#ü"; val task = "task/a ?#ü"
        var result = "updating"
        val f = fixture(resource) { JSONObject().put("data", JSONObject().put("result", result)) }
        for ((wire, expected) in listOf("updating" to OtaResult.UPDATING, "success" to OtaResult.SUCCESS, "failed" to OtaResult.FAILED, "cancelled" to OtaResult.CANCELLED)) {
            result = wire; assertEquals(expected, f.repository.query(task))
        }
        assertTrue(f.calls.all { it.method == "GET" && it.path == "/api/app/devices/device%2Fa%20%3F%23%C3%BC/ota/task/task%2Fa%20%3F%23%C3%BC" })
    }
    @Test fun cancelUsesDeleteTaskBodyAndAcceptsTheCommonEnvelopeWithoutData() = runBlocking {
        val f = fixture { JSONObject().put("code", 0).put("success", true) }
        f.repository.cancel("opaque-task")
        val call = f.calls.single()
        assertEquals("DELETE", call.method); assertEquals("/api/app/devices/http-resource/ota/task", call.path)
        assertEquals(setOf("taskID"), call.body!!.keys().asSequence().toSet()); assertEquals("opaque-task", call.body!!.getString("taskID"))
    }
    @Test fun undeclaredTaskResultsOrMissingTaskIdsNeverBecomeConfirmedStatus() = runBlocking {
        for (result in listOf<Any>("download-50-percent", "UPDATING", 50, JSONObject.NULL)) {
            val f = fixture { JSONObject().put("data", JSONObject().put("result", result)) }
            val failure = runCatching { f.repository.query("task") }.exceptionOrNull()
            assertTrue(failure is ApiFailure); assertEquals(502, (failure as ApiFailure).code)
        }
        for (value in listOf<Any>("", 7, JSONObject.NULL)) {
            val f = fixture { JSONObject().put("data", JSONObject().put("taskID", value)) }
            assertTrue(runCatching { f.repository.start(OtaKind.MCU, "firmware") }.isFailure)
            assertEquals(1, f.calls.size)
        }
    }
    @Test fun aLateOldScopeReadCannotEscapeAndOldScopeCannotDispatchMutationsForTheNewAccount() = runBlocking {
        withTimeout(5000) {
            val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
            val f = fixture { entered.complete(Unit); withContext(NonCancellable) { finish.await() }; candidate() }
            val old = async { runCatching { f.repository.check(OtaKind.MCU) } }
            entered.await(); f.account.login("b@example.test", "fixture"); finish.complete(Unit)
            assertEquals(499, (old.await().exceptionOrNull() as ApiFailure).code)
            assertTrue(runCatching { f.repository.start(OtaKind.MCU, "fw-selected") }.isFailure)
            assertTrue(runCatching { f.repository.cancel("old-task") }.isFailure)
            assertEquals(listOf("GET"), f.calls.map { it.method })
            assertEquals("native-b", f.account.session?.userId)
        }
    }
    @Test fun uncertainCreateAndCancelRequestsAreNeverRetriedByTheHttpAdapter() = runBlocking {
        val f = fixture { throw SocketTimeoutException() }
        assertTrue(runCatching { f.repository.start(OtaKind.MCU, "fw-selected") }.isFailure)
        assertTrue(runCatching { f.repository.cancel("task") }.isFailure)
        assertEquals(listOf("PUT", "DELETE"), f.calls.map { it.method })
    }
    @Test fun unsafeSegmentsOrEmptyOperationIdentifiersNeverReachHttp() = runBlocking {
        val f = fixture { error("Invalid input must not dispatch") }
        for (id in listOf("", ".", "..", "bad\u0000id")) {
            assertTrue(runCatching { HttpOtaRepository(f.account, OtaScope(f.scope.accountRevision, id, "native-a")).check(OtaKind.MCU) }.isFailure)
            assertTrue(runCatching { f.repository.query(id) }.isFailure)
        }
        assertTrue(runCatching { f.repository.start(OtaKind.MCU, "") }.isFailure)
        assertTrue(runCatching { f.repository.cancel("") }.isFailure)
        assertTrue(f.calls.isEmpty())
    }
}

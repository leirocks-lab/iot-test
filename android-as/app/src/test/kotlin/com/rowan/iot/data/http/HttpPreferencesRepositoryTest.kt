package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import com.rowan.iot.domain.preferences.*
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class HttpPreferencesRepositoryTest {
    private data class Call(val method: String, val path: String, val body: JSONObject?, val token: String?)
    private val calls = mutableListOf<Call>()
    private suspend fun fixture(handler: suspend (Call) -> JSONObject): Pair<AccountService, HttpPreferencesRepository> {
        var loginNumber = 0
        val account = AccountService(HttpGateway { method, path, body, token ->
            if (path == "/api/app/session" && method == "POST") {
                loginNumber++
                JSONObject().put("data", JSONObject().put("accessToken", "fixture-access-$loginNumber")
                    .put("refreshToken", "fixture-refresh-$loginNumber").put("userID", "fixture-user-$loginNumber").put("setting", JSONObject()))
            } else {
                val call = Call(method, path, body?.let { JSONObject(it.toString()) }, token)
                calls += call; handler(call)
            }
        }, object : SessionStorage { override fun read(): String? = null; override fun write(value: String?) = Unit })
        account.login("fixture@example.test", "fixture-password")
        return account to HttpPreferencesRepository(account)
    }

    @Test fun getUsesTheExactAuthenticatedSettingEndpointAndPreservesUnknownFields(): Unit = runBlocking {
        val (account, repo) = fixture { JSONObject("""{"data":{"language":"en","future":{"value":7}}}""") }
        val value = repo.load()
        assertEquals(account.revision, repo.expectedRevision)
        assertEquals("GET", calls.single().method); assertEquals("/api/app/user/setting", calls.single().path)
        assertNull(calls.single().body); assertEquals(account.session!!.accessToken, calls.single().token)
        assertEquals(7, JSONObject(value.rawJson).getJSONObject("future").getInt("value"))
    }

    @Test fun patchUsesOnlyTypedChangesAndDoesNotRequireADataField(): Unit = runBlocking {
        val (_, repo) = fixture { JSONObject("""{"code":0,"success":true}""") }
        repo.patch(PreferencesPatch(wallpaperId = "fixture-wallpaper", notification = false))
        assertEquals("PATCH", calls.single().method); assertEquals("/api/app/user/setting", calls.single().path)
        assertEquals(setOf("wallpaper", "notification"), calls.single().body!!.keys().asSequence().toSet())
        assertEquals("fixture-wallpaper", calls.single().body!!.getString("wallpaper"))
        assertEquals(false, calls.single().body!!.getBoolean("notification"))
    }

    @Test fun malformedOrMissingGetDataNeverBecomesDefaultSettings(): Unit = runBlocking {
        for (response in listOf("{}", "{\"data\":null}", "{\"data\":[]}")) {
            val (_, repo) = fixture { JSONObject(response) }
            assertTrue(runCatching { repo.load() }.isFailure)
        }
    }

    @Test fun capturedAccountRevisionPreventsReadAndPatchUsingANewAccountsToken(): Unit = runBlocking {
        val (account, repo) = fixture { JSONObject().put("data", JSONObject()) }
        account.clearLocal(); account.login("next@example.test", "fixture-password")
        assertTrue(runCatching { repo.load() }.isFailure)
        assertTrue(runCatching { repo.patch(PreferencesPatch(theme = PreferenceTheme.DARK)) }.isFailure)
        assertTrue(calls.isEmpty())
    }

    @Test fun accountChangeDuringAnUncooperativeReadCannotReturnOldPreferences(): Unit = runBlocking {
        val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        val (account, repo) = fixture {
            entered.complete(Unit); withContext(NonCancellable) { finish.await() }
            JSONObject("""{"data":{"language":"en"}}""")
        }
        val reading = async { runCatching { repo.load() } }
        entered.await(); account.clearLocal(); finish.complete(Unit)
        assertTrue(reading.await().isFailure)
    }

    @Test fun cancellationCannotPublishAnUncooperativeLateRead(): Unit = runBlocking {
        val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        val (_, repo) = fixture {
            entered.complete(Unit); withContext(NonCancellable) { finish.await() }
            JSONObject("""{"data":{"notification":true}}""")
        }
        var returned = false
        val reading = launch { repo.load(); returned = true }
        entered.await(); reading.cancel(); finish.complete(Unit); reading.join()
        assertTrue(reading.isCancelled); assertFalse(returned)
    }

    @Test fun unknownMutationIsNeverRetriedByTheRepository(): Unit = runBlocking {
        val (_, repo) = fixture { throw java.net.SocketTimeoutException() }
        assertTrue(runCatching { repo.patch(PreferencesPatch(notification = false)) }.isFailure)
        assertEquals(listOf("PATCH"), calls.map { it.method })
    }

    @Test fun explicitBusinessRejectionKeepsItsCodeAndDoesNotReadOrReplay(): Unit = runBlocking {
        val (_, repo) = fixture { throw ApiFailure(403, "fixture rejection") }
        val error = runCatching { repo.patch(PreferencesPatch(theme = PreferenceTheme.DARK)) }.exceptionOrNull()
        assertEquals(403, (error as ApiFailure).code)
        assertEquals(listOf("PATCH"), calls.map { it.method })
    }
}

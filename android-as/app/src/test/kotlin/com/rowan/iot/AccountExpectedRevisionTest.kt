package com.rowan.iot

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/**
 * Request-boundary contracts, not a claim to force the exact repository precheck/preemption gap.
 * An expected account revision must travel into the same immutable context/token capture.
 */
class AccountExpectedRevisionTest {
    private class Storage : SessionStorage {
        @Volatile var value: String? = null
        override fun read() = value
        override fun write(value: String?) { this.value = value }
    }
    private fun session(user: String, token: String) = JSONObject()
        .put("userID", user).put("accessToken", token).put("refreshToken", "fixture-refresh-$user")
        .put("setting", JSONObject())
    private fun data(value: JSONObject = JSONObject()) = JSONObject().put("data", value)
    private val rooms = "/api/app/user/locations"

    @Test fun oldRevisionCannotDispatchAMutationUsingANewerAccountToken() = runBlocking {
        val storage = Storage()
        val mutationTokens = mutableListOf<String?>()
        val account = AccountService(HttpGateway { method, path, body, token ->
            when {
                method == "POST" && path == "/api/app/session" -> data(
                    if (body?.optString("account") == "b@example.test") session("b", "fixture-b-token")
                    else session("a", "fixture-a-token"))
                method == "POST" && path == rooms -> { mutationTokens += token; data() }
                else -> error("Unexpected isolated gateway operation")
            }
        }, storage)
        account.login("a@example.test", "fixture")
        val oldRevision = account.revision // Represents the repository's previously accepted context.
        account.login("b@example.test", "fixture")
        val newContext = account.contextSnapshot()
        val persisted = storage.value

        val rejected = runCatching {
            account.request("POST", rooms, JSONObject().put("name", "Old account intent"), expectedRevision = oldRevision)
        }.exceptionOrNull()

        assertTrue(rejected is ApiFailure)
        assertEquals(499, (rejected as ApiFailure).code)
        assertTrue("A stale operation must not reach the mutation gateway", mutationTokens.isEmpty())
        assertSame(newContext, account.contextSnapshot())
        assertEquals(persisted, storage.value)
        assertEquals("b", account.session?.userId)
    }

    @Test fun mutationAlreadyDispatchedForOldAccountNeverRebindsOrReplaysOnNewAccount() = runBlocking {
        withTimeout(5000) {
            val dispatched = CompletableDeferred<Unit>()
            val complete = CompletableDeferred<Unit>()
            val storage = Storage()
            val mutationTokens = mutableListOf<String?>()
            val account = AccountService(HttpGateway { method, path, body, token ->
                when {
                    method == "POST" && path == "/api/app/session" -> data(
                        if (body?.optString("account") == "b@example.test") session("b", "fixture-b-token")
                        else session("a", "fixture-a-token"))
                    method == "POST" && path == rooms -> {
                        mutationTokens += token
                        dispatched.complete(Unit)
                        complete.await()
                        data()
                    }
                    else -> error("Unexpected isolated gateway operation")
                }
            }, storage)
            account.login("a@example.test", "fixture")
            val expected = account.revision
            val pending = async(start = CoroutineStart.UNDISPATCHED) {
                runCatching { account.request("POST", rooms, JSONObject().put("name", "A intent"), expectedRevision = expected) }
            }
            dispatched.await()
            assertEquals(listOf("fixture-a-token"), mutationTokens)
            account.login("b@example.test", "fixture")
            val newContext = account.contextSnapshot()
            val persisted = storage.value
            complete.complete(Unit)

            val rejected = pending.await().exceptionOrNull()
            assertTrue(rejected is ApiFailure)
            assertEquals(499, (rejected as ApiFailure).code)
            assertEquals("An already sent mutation cannot migrate to B or replay", listOf("fixture-a-token"), mutationTokens)
            assertSame(newContext, account.contextSnapshot())
            assertEquals(persisted, storage.value)
            // Returning 499 fences the result; it cannot undo the already sent A operation.
        }
    }

    @Test fun sameAccountRevisionRemainsValidAfterTokenRenewalAndUsesRenewedTokenOnce() = runBlocking {
        val mutationTokens = mutableListOf<String?>()
        var refreshes = 0
        val account = AccountService(HttpGateway { method, path, _, token ->
            when {
                method == "POST" && path == "/api/app/session" -> data(session("a", "fixture-a-token"))
                method == "PATCH" && path == "/api/app/session" -> { refreshes++; data(session("a", "fixture-renewed-token")) }
                method == "POST" && path == rooms -> { mutationTokens += token; data() }
                else -> error("Unexpected isolated gateway operation")
            }
        }, Storage())
        account.login("a@example.test", "fixture")
        val expected = account.revision
        val originalPublication = account.contextSnapshot()
        account.refresh()
        assertEquals(expected, account.revision)
        assertNotSame(originalPublication, account.contextSnapshot())

        account.request("POST", rooms, JSONObject().put("name", "Current account intent"), expectedRevision = expected)

        assertEquals(1, refreshes)
        assertEquals(listOf("fixture-renewed-token"), mutationTokens)
        assertEquals("a", account.session?.userId)
    }
}

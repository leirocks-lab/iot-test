package com.rowan.iot

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import java.io.IOException
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Confirmed native settings commits preserve credential ownership; no HTTP or production seam. */
class AccountSettingsCommitTest {
    private class Storage : SessionStorage {
        @Volatile var value: String? = null
        @Volatile var failSaves = false
        val pauseNextSave = AtomicBoolean()
        val saveStarted = CompletableDeferred<Unit>()
        val completeSave = CountDownLatch(1)
        val writes = Collections.synchronizedList(mutableListOf<String?>())
        override fun read() = value
        override fun write(value: String?) {
            writes += value
            if (value != null && pauseNextSave.compareAndSet(true, false)) {
                saveStarted.complete(Unit)
                check(completeSave.await(5, TimeUnit.SECONDS)) { "Isolated physical write barrier timed out" }
            }
            if (value != null && failSaves) throw IOException("Isolated storage failure")
            this.value = value
        }
    }
    private class Fixture {
        val storage = Storage()
        val logins = AtomicInteger()
        val account = AccountService(HttpGateway { method, path, body, _ ->
            check(path == "/api/app/session") { "Settings commit must not perform HTTP" }
            val result = when (method) {
                "POST" -> {
                    logins.incrementAndGet()
                    if (body?.optString("account") == "b@example.test") session("b", "fixture-b-access", "fixture-b-refresh", 900, "Bearer")
                    else session("a", "fixture-a-access", "fixture-a-refresh", 600, "bearer")
                }
                "PATCH" -> session("a", "fixture-renewed-access", "fixture-renewed-refresh", 1200, "Bearer")
                else -> error("Unexpected isolated account HTTP operation")
            }
            JSONObject().put("data", result)
        }, storage)
        suspend fun loginA() { account.login("a@example.test", "fixture") }
        suspend fun loginB() { account.login("b@example.test", "fixture") }
    }
    companion object {
        private fun session(user: String, access: String, refresh: String, expiry: Long, type: String) = JSONObject()
            .put("userID", user).put("accessToken", access).put("refreshToken", refresh)
            .put("expiresIn", expiry).put("tokenType", type)
            .put("setting", JSONObject().put("language", "zh-CN").put("lastConfirmed", true))
        private fun confirmedSettings() = JSONObject("""{"language":"en-US","temperatureUnit":"F","futureSettings":{"enabled":true,"unknownList":[null,7,{"opaque":"kept"}]}}""")
    }

    private fun assertConfirmedSettings(value: JSONObject) {
        assertEquals(3, value.length())
        assertEquals("en-US", value.getString("language"))
        assertEquals("F", value.getString("temperatureUnit"))
        val future = value.getJSONObject("futureSettings")
        assertEquals(2, future.length())
        assertTrue(future.getBoolean("enabled"))
        val unknown = future.getJSONArray("unknownList")
        assertEquals(3, unknown.length())
        assertTrue(unknown.isNull(0))
        assertEquals(7, unknown.getInt(1))
        assertEquals(1, unknown.getJSONObject(2).length())
        assertEquals("kept", unknown.getJSONObject(2).getString("opaque"))
    }
    private fun assertLastConfirmedSettings(value: JSONObject) {
        assertEquals(2, value.length())
        assertEquals("zh-CN", value.getString("language"))
        assertTrue(value.getBoolean("lastConfirmed"))
    }

    @Test fun commitAfterRefreshPreservesLatestCredentialsAndCompleteUnknownSettingsWithoutChangingRevision() = runBlocking {
        val f = Fixture(); f.loginA()
        val expected = f.account.revision
        f.account.refresh()
        val latest = f.account.session!!
        assertEquals("fixture-renewed-access", latest.accessToken)
        val confirmed = confirmedSettings()

        f.account.commitSettings(expectedRevision = expected, settingsJson = confirmed.toString())

        val published = f.account.session!!
        assertEquals(expected, f.account.revision)
        assertEquals(latest.accessToken, published.accessToken)
        assertEquals(latest.refreshToken, published.refreshToken)
        assertEquals(latest.userId, published.userId)
        assertEquals(latest.expiresIn, published.expiresIn)
        assertEquals(latest.tokenType, published.tokenType)
        assertConfirmedSettings(published.settings())
        val disk = JSONObject(f.storage.value!!)
        assertEquals(latest.accessToken, disk.getString("accessToken"))
        assertEquals(latest.refreshToken, disk.getString("refreshToken"))
        assertEquals(latest.userId, disk.getString("userID"))
        assertEquals(latest.expiresIn, disk.getLong("expiresIn"))
        assertEquals(latest.tokenType, disk.getString("tokenType"))
        assertConfirmedSettings(disk.getJSONObject("setting"))
        assertNull(f.account.pendingLogoutCleanupRevision)
    }

    @Test fun staleSettingsCommitDoesNotWriteOrChangeNewAccount() = runBlocking {
        val f = Fixture(); f.loginA()
        val oldRevision = f.account.revision
        f.loginB()
        val current = f.account.contextSnapshot()
        val disk = f.storage.value
        val before = f.storage.writes.size

        val error = runCatching { f.account.commitSettings(expectedRevision = oldRevision, settingsJson = confirmedSettings().toString()) }.exceptionOrNull()

        assertTrue(error is ApiFailure)
        assertEquals(499, (error as ApiFailure).code)
        assertEquals(before, f.storage.writes.size)
        assertSame(current, f.account.contextSnapshot())
        assertEquals(disk, f.storage.value)
        assertEquals("b", f.account.session?.userId)
    }

    @Test fun cancellationAfterPhysicalWriteStartsPublishesConfirmedSettingsBeforeReportingCancellation() = runBlocking {
        withTimeout(5000) {
            val f = Fixture(); f.loginA(); f.account.refresh()
            val latest = f.account.session!!
            val expected = f.account.revision
            val before = f.storage.writes.size
            val confirmed = confirmedSettings()
            f.storage.pauseNextSave.set(true)
            val commit = async(start = CoroutineStart.UNDISPATCHED) { f.account.commitSettings(expectedRevision = expected, settingsJson = confirmed.toString()) }
            try {
                f.storage.saveStarted.await()
                commit.cancel()
                assertFalse("A cancelled caller must not let an entered physical write escape ownership", commit.isCompleted)
                assertLastConfirmedSettings(f.account.session!!.settings())
            } finally { f.storage.completeSave.countDown() }
            val error = runCatching { commit.await() }.exceptionOrNull()
            commit.join()

            assertTrue(error is CancellationException)
            assertEquals(expected, f.account.revision)
            val published = f.account.session!!
            assertEquals(latest.accessToken, published.accessToken)
            assertEquals(latest.refreshToken, published.refreshToken)
            assertEquals(latest.userId, published.userId)
            assertEquals(latest.expiresIn, published.expiresIn)
            assertEquals(latest.tokenType, published.tokenType)
            assertConfirmedSettings(published.settings())
            assertConfirmedSettings(JSONObject(f.storage.value!!).getJSONObject("setting"))
            assertEquals(before + 1, f.storage.writes.size)
            assertNull(f.account.pendingLogoutCleanupRevision)
        }
    }

    @Test fun newAccountWaitsForCancelledSettingsWriteAndCannotBeOverwrittenByItsLateCompletion() = runBlocking {
        withTimeout(5000) {
            val f = Fixture(); f.loginA()
            val expected = f.account.revision
            val before = f.storage.writes.size
            f.storage.pauseNextSave.set(true)
            val commit = async(start = CoroutineStart.UNDISPATCHED) { f.account.commitSettings(expectedRevision = expected, settingsJson = confirmedSettings().toString()) }
            f.storage.saveStarted.await()
            commit.cancel()
            val next = async(start = CoroutineStart.UNDISPATCHED) { f.loginB() }
            try {
                assertEquals("A queued login must not send HTTP while the settings transaction owns storage", 1, f.logins.get())
                assertEquals(before + 1, f.storage.writes.size)
                assertFalse(next.isCompleted)
            } finally { f.storage.completeSave.countDown() }
            assertTrue(runCatching { commit.await() }.exceptionOrNull() is CancellationException)
            commit.join(); next.await()

            assertEquals("b", f.account.session?.userId)
            assertEquals("fixture-b-access", f.account.session?.accessToken)
            assertEquals("b", JSONObject(f.storage.value!!).getString("userID"))
            assertEquals(2, f.logins.get())
            val tail = f.storage.writes.drop(before)
            assertEquals(3, tail.size) // A settings save, B's initial delete, B credential save; no compensation delete.
            assertConfirmedSettings(JSONObject(tail[0]!!).getJSONObject("setting"))
            assertNull(tail[1]); assertEquals("b", JSONObject(tail[2]!!).getString("userID"))
            assertNull(f.account.pendingLogoutCleanupRevision)
        }
    }

    @Test fun failedStorageWriteKeepsValidAccountAndLastConfirmedPreferencesWithoutReportingSuccess() = runBlocking {
        val f = Fixture(); f.loginA(); f.account.refresh()
        val current = f.account.contextSnapshot()
        val before = f.storage.writes.size
        val disk = f.storage.value
        f.storage.failSaves = true

        val error = runCatching { f.account.commitSettings(expectedRevision = current.revision, settingsJson = confirmedSettings().toString()) }.exceptionOrNull()

        assertTrue(error is IOException)
        assertSame(current, f.account.contextSnapshot())
        assertEquals("fixture-renewed-access", f.account.session?.accessToken)
        assertLastConfirmedSettings(f.account.session!!.settings())
        assertEquals(disk, f.storage.value) // This fixture throws before changing its backing value.
        assertEquals(before + 1, f.storage.writes.size)
        assertNull(f.account.pendingLogoutCleanupRevision)
    }

    @Test fun confirmedSettingsPublicationDoesNotSuppressRefreshForALateUnauthorizedRead() = runBlocking {
        withTimeout(5000) {
            val storage = Storage()
            val firstReadStarted = CompletableDeferred<Unit>()
            val releaseOldUnauthorized = CompletableDeferred<Unit>()
            val reads = AtomicInteger()
            val refreshes = AtomicInteger()
            val account = AccountService(HttpGateway { method, path, _, token ->
                when {
                    method == "POST" && path == "/api/app/session" -> JSONObject().put("data", session("a", "fixture-a-access", "fixture-a-refresh", 600, "Bearer"))
                    method == "PATCH" && path == "/api/app/session" -> {
                        refreshes.incrementAndGet()
                        val renewed = session("a", "fixture-renewed-access", "fixture-renewed-refresh", 1200, "Bearer")
                        renewed.remove("setting")
                        JSONObject().put("data", renewed)
                    }
                    method == "GET" && path == "/api/app/devices" -> {
                        reads.incrementAndGet()
                        if (token == "fixture-a-access") {
                            firstReadStarted.complete(Unit)
                            releaseOldUnauthorized.await()
                            throw ApiFailure(401, "Isolated expired access token")
                        }
                        check(token == "fixture-renewed-access")
                        JSONObject().put("data", JSONObject().put("ok", true))
                    }
                    else -> error("Unexpected isolated account operation")
                }
            }, storage)
            account.login("a@example.test", "fixture")
            val expected = account.revision
            val confirmed = confirmedSettings()
            val read = async(start = CoroutineStart.UNDISPATCHED) { account.request("GET", "/api/app/devices", expectedRevision = expected) }
            try {
                firstReadStarted.await()
                account.commitSettings(expectedRevision = expected, settingsJson = confirmed.toString())
            } finally { releaseOldUnauthorized.complete(Unit) }

            assertTrue(read.await().getJSONObject("data").getBoolean("ok"))
            assertEquals(1, refreshes.get())
            assertEquals(2, reads.get())
            assertEquals(expected, account.revision)
            assertEquals("fixture-renewed-access", account.session?.accessToken)
            assertConfirmedSettings(account.session!!.settings())
            assertConfirmedSettings(JSONObject(storage.value!!).getJSONObject("setting"))
            assertNull(account.pendingLogoutCleanupRevision)
        }
    }

    @Test fun lateRefreshAcceptsNewCredentialsWithoutOverwritingSettingsConfirmedWhileItWasInFlight() = runBlocking {
        for (responseContainsOldSetting in listOf(true, false)) {
            withTimeout(5000) {
                val storage = Storage()
                val refreshStarted = CompletableDeferred<Unit>()
                val releaseRefresh = CompletableDeferred<Unit>()
                val refreshes = AtomicInteger()
                val account = AccountService(HttpGateway { method, path, _, _ ->
                    check(path == "/api/app/session")
                    when (method) {
                        "POST" -> JSONObject().put("data", session("a", "fixture-a-access", "fixture-a-refresh", 600, "bearer"))
                        "PATCH" -> {
                            refreshes.incrementAndGet()
                            refreshStarted.complete(Unit)
                            releaseRefresh.await()
                            val renewed = session("a", "fixture-renewed-access", "fixture-renewed-refresh", 1200, "Bearer")
                            if (!responseContainsOldSetting) renewed.remove("setting")
                            JSONObject().put("data", renewed)
                        }
                        else -> error("Unexpected isolated account operation")
                    }
                }, storage)
                account.login("a@example.test", "fixture")
                val expected = account.revision
                val confirmed = confirmedSettings()
                val renewal = async(start = CoroutineStart.UNDISPATCHED) { account.refresh() }
                try {
                    refreshStarted.await()
                    account.commitSettings(expectedRevision = expected, settingsJson = confirmed.toString())
                    assertConfirmedSettings(account.session!!.settings())
                } finally { releaseRefresh.complete(Unit) }
                renewal.await()

                val current = account.session!!
                assertEquals(1, refreshes.get())
                assertEquals(expected, account.revision)
                assertEquals("fixture-renewed-access", current.accessToken)
                assertEquals("fixture-renewed-refresh", current.refreshToken)
                assertEquals("a", current.userId)
                assertEquals(1200L, current.expiresIn)
                assertEquals("Bearer", current.tokenType)
                assertConfirmedSettings(current.settings())
                val disk = JSONObject(storage.value!!)
                assertEquals("fixture-renewed-access", disk.getString("accessToken"))
                assertConfirmedSettings(disk.getJSONObject("setting"))
                assertNull(account.pendingLogoutCleanupRevision)
            }
        }
    }

    @Test fun refreshPublicationRejectsCapturedOldSettingsBeforeAnyPhysicalWrite():Unit=runBlocking {
        val f=Fixture();f.loginA();val captured=f.account.contextSnapshot()
        f.account.refresh();val latest=f.account.contextSnapshot();val writes=f.storage.writes.size
        try {f.account.commitSettings(captured.revision,"""{"theme":"stale"}""",expectedSettingsPublication=captured.settingsPublication);fail("Expected settings conflict")}
        catch(error:ApiFailure){assertEquals(409,error.code)}
        assertSame(latest,f.account.contextSnapshot());assertEquals(writes,f.storage.writes.size)
        assertEquals("fixture-renewed-access",f.account.session!!.accessToken)
    }
    @Test fun settingsCasAdvancesOnlySettingsPublicationAndPreservesLatestCredentialIdentity():Unit=runBlocking {
        val f=Fixture();f.loginA();val before=f.account.contextSnapshot()
        f.account.commitSettings(before.revision,"""{"future":{"kept":7},"theme":"dark"}""",expectedSettingsPublication=before.settingsPublication)
        val after=f.account.contextSnapshot();assertEquals(before.revision,after.revision)
        assertSame(before.credentialPublication,after.credentialPublication)
        assertNotEquals(before.settingsPublication,after.settingsPublication)
        assertEquals(before.session!!.accessToken,after.session!!.accessToken)
        val writes=f.storage.writes.size
        try {f.account.commitSettings(before.revision,"{}",expectedSettingsPublication=before.settingsPublication);fail("Old read overwrote settings")}
        catch(error:ApiFailure){assertEquals(409,error.code)}
        assertEquals(writes,f.storage.writes.size);assertEquals(7,f.account.session!!.settings().getJSONObject("future").getInt("kept"))
    }


    @Test fun actualPreferencesLoadCapturedBeforeRefreshCannotOverwriteRenewedSettings():Unit=runBlocking {
        val f=Fixture();f.loginA();val revision=f.account.revision
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val repository=object:com.rowan.iot.domain.preferences.PreferencesRepository {
            override val expectedRevision=revision
            override suspend fun patch(patch:com.rowan.iot.domain.preferences.PreferencesPatch)=error("Read must not mutate")
            override suspend fun load():com.rowan.iot.domain.preferences.UserPreferences {
                val captured="""{"theme":"stale","future":{"old":true}}"""
                entered.complete(Unit);finish.await()
                return com.rowan.iot.domain.preferences.UserPreferences.decode(captured)
            }
        }
        val service=com.rowan.iot.domain.preferences.PreferencesService(repository,{f.account.revision==revision},f.account::commitSettings,
            settingsPublication={f.account.contextSnapshot().settingsPublication})
        val read=async {service.load()};entered.await();f.account.refresh()
        val latest=f.account.contextSnapshot();val writes=f.storage.writes.size
        finish.complete(Unit);read.await()
        assertSame(latest,f.account.contextSnapshot());assertEquals(writes,f.storage.writes.size)
        assertNull(service.state.value.preferences);assertNotNull(service.state.value.error)
    }

}

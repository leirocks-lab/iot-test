package com.rowan.iot

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.account.LocalSessionCleanupFailure
import com.rowan.iot.domain.account.AccountSession
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class AccountServiceTest {
    @Test fun queuedOldPageLogoutDoesNotSendDeleteForANewAccount()=runBlocking {
        var deletes=0
        val account=AccountService(HttpGateway {method,_,_,_->
            if(method=="DELETE")deletes++
            JSONObject().put("data",session())
        },Storage())
        account.login("a@example.com","password");val oldPageRevision=account.revision
        account.login("b@example.com","password")
        assertTrue(runCatching {account.logout(oldPageRevision)}.isFailure)
        assertEquals(0,deletes);assertNotNull(account.session)
    }
    @Test fun failedRollbackAfterCancelledPersistenceKeepsARecoverableCleanupPhase()=runBlocking {
        val started=CompletableDeferred<Unit>();val release=java.util.concurrent.CountDownLatch(1)
        var failDelete=false
        val storage=object:SessionStorage {
            @Volatile var value:String?=null
            override fun read()=value
            override fun write(value:String?) {
                if(value!=null) {started.complete(Unit);check(release.await(5,java.util.concurrent.TimeUnit.SECONDS))}
                if(value==null&&failDelete)throw java.io.IOException("disk")
                this.value=value
            }
        }
        val account=AccountService(HttpGateway {_,_,_,_->JSONObject().put("data",session())},storage)
        val login=async {account.login("a@example.com","password")}
        started.await();failDelete=true;login.cancel();release.countDown();runCatching {login.await()};login.join()
        val cleanup=account.pendingLogoutCleanupRevision
        assertNotNull(cleanup);assertNull(account.session);assertNotNull(storage.value)
        assertTrue(runCatching {account.restore()}.isFailure)
        assertTrue(runCatching {account.login("b@example.com","password")}.isFailure)
        failDelete=false;account.retryLogoutCleanup(cleanup!!);assertNull(storage.value)
    }
    @Test fun expiredLogoutClearsOnlyTheCurrentSessionWithoutRefreshOrReplay()=runBlocking {
        val methods=mutableListOf<String>();val storage=Storage()
        val account=AccountService(HttpGateway {method,_,_,_->
            methods+=method
            if(method=="DELETE")throw com.rowan.iot.domain.network.ApiFailure(401,"expired")
            JSONObject().put("data",session())
        },storage)
        account.login("a@example.com","password")
        assertTrue("An already expired session must still complete local logout",runCatching {account.logout()}.isSuccess)
        assertNull(account.session);assertNull(storage.value)
        assertEquals(listOf("POST","DELETE"),methods)
    }
    @Test fun forbiddenOrUnknownLogoutDoesNotClaimRemoteSuccessOrEraseTheSession()=runBlocking {
        for(failure in listOf(com.rowan.iot.domain.network.ApiFailure(403,"forbidden"),java.io.IOException("network"))) {
            val storage=Storage()
            val account=AccountService(HttpGateway {method,_,_,_->
                if(method=="DELETE")throw failure
                JSONObject().put("data",session())
            },storage)
            account.login("a@example.com","password")
            assertSame(failure,runCatching {account.logout()}.exceptionOrNull())
            assertNotNull(account.session);assertNotNull(storage.value)
        }
    }
    @Test fun lateExpiredLogoutCannotClearANewAccount()=runBlocking {
        val started=CompletableDeferred<Unit>();val response=CompletableDeferred<Unit>();val storage=Storage()
        val account=AccountService(HttpGateway {method,_,body,_->
            if(method=="DELETE") {started.complete(Unit);response.await();throw com.rowan.iot.domain.network.ApiFailure(401,"expired")}
            JSONObject().put("data",session().put("userID",if(body?.optString("account")=="b@example.com")"u2" else "u1"))
        },storage)
        account.login("a@example.com","password")
        val logout=async {runCatching {account.logout()}}
        started.await();account.login("b@example.com","password");response.complete(Unit)
        assertTrue(logout.await().isFailure)
        assertEquals("u2",account.session?.userId);assertEquals("u2",JSONObject(storage.value!!).getString("userID"))
    }
    @Test fun cancelledLogoutCannotAcceptALateUncooperativeResponse()=runBlocking {
        val started=CompletableDeferred<Unit>();val response=CompletableDeferred<Unit>();val storage=Storage()
        val account=AccountService(HttpGateway {method,_,_,_->
            if(method=="DELETE") {started.complete(Unit);withContext(NonCancellable) {response.await()}}
            JSONObject().put("data",session())
        },storage)
        account.login("a@example.com","password")
        val logout=async {account.logout()};started.await();logout.cancel();response.complete(Unit)
        runCatching {logout.await()};logout.join()
        assertNotNull(account.session);assertNotNull(storage.value)
    }
    @Test fun cancelledBlockingPersistenceRemovesCiphertextBeforeAnotherLogin()=runBlocking {
        val started=CompletableDeferred<Unit>();val release=java.util.concurrent.CountDownLatch(1)
        val storage=object:SessionStorage {
            @Volatile var value:String?=null
            var hold=true
            override fun read()=value
            override fun write(value:String?) {
                if(value!=null&&hold) {started.complete(Unit);check(release.await(5,java.util.concurrent.TimeUnit.SECONDS))}
                this.value=value
            }
        }
        val account=AccountService(HttpGateway {_,_,_,_->JSONObject().put("data",session())},storage)
        val login=async {account.login("a@example.com","password")}
        started.await();login.cancel();release.countDown();runCatching {login.await()};login.join()
        assertNull(account.session);assertNull(storage.value)
        storage.hold=false
        account.login("b@example.com","password")
        assertNotNull(account.session);assertNotNull(storage.value)
    }
    @Test fun failedLogoutCleanupCanRetryLocallyWithoutSendingDeleteAgain()=runBlocking {
        var deletes=0;var fail=false
        val storage=object:SessionStorage {
            var value:String?=null
            override fun read()=value
            override fun write(value:String?) {if(value==null&&fail)throw java.io.IOException("disk");this.value=value}
        }
        val account=AccountService(HttpGateway {method,_,_,_->
            if(method=="DELETE")deletes++
            JSONObject().put("data",session())
        },storage)
        account.login("a@example.com","password");fail=true
        val failure=runCatching {account.logout()}.exceptionOrNull()
        assertTrue(failure is com.rowan.iot.domain.account.AccountLogoutCleanupFailure)
        val expected=(failure as com.rowan.iot.domain.account.AccountLogoutCleanupFailure).expectedRevision
        assertNull(account.session);assertNotNull(storage.value)
        assertTrue(runCatching {account.login("b@example.com","password")}.isFailure)
        assertTrue(runCatching {account.logout()}.isFailure)
        fail=false;account.retryLogoutCleanup(expected)
        assertNull(storage.value);assertEquals(1,deletes)
    }
    @Test fun cleanupPhaseIsVisibleBeforeTheBlockingDeleteCompletes()=runBlocking {
        val started=CompletableDeferred<Unit>();val release=java.util.concurrent.CountDownLatch(1)
        var hold=false
        val storage=object:SessionStorage {
            var value:String?=null
            override fun read()=value
            override fun write(value:String?) {
                if(hold&&value==null) {started.complete(Unit);check(release.await(5,java.util.concurrent.TimeUnit.SECONDS));throw java.io.IOException("disk")}
                this.value=value
            }
        }
        val account=AccountService(HttpGateway {_,_,_,_->JSONObject().put("data",session())},storage)
        account.login("a@example.com","password");hold=true
        val logout=async {runCatching {account.logout()}}
        started.await()
        try {
            assertNull(account.session)
            assertEquals("A null session during cleanup must always expose its recovery phase",account.revision,account.pendingLogoutCleanupRevision)
        }finally {release.countDown();logout.await()}
    }
    @Test fun restorationDuringCleanupCannotReadOldCiphertextOrAdvanceItsRevision()=runBlocking {
        val deleting=CompletableDeferred<Unit>();val readStarted=CompletableDeferred<Unit>()
        val releaseDelete=java.util.concurrent.CountDownLatch(1);val releaseRead=java.util.concurrent.CountDownLatch(1)
        var hold=false;var reads=0
        val storage=object:SessionStorage {
            var value:String?=null
            override fun read():String? {
                reads++;val saved=value
                if(hold) {readStarted.complete(Unit);check(releaseRead.await(5,java.util.concurrent.TimeUnit.SECONDS))}
                return saved
            }
            override fun write(value:String?) {
                if(hold&&value==null) {deleting.complete(Unit);check(releaseDelete.await(5,java.util.concurrent.TimeUnit.SECONDS));throw java.io.IOException("disk")}
                this.value=value
            }
        }
        val account=AccountService(HttpGateway {_,_,_,_->JSONObject().put("data",session())},storage)
        account.login("a@example.com","password");hold=true
        val logout=async {runCatching {account.logout()}};deleting.await()
        val restore=async(start=CoroutineStart.UNDISPATCHED) {runCatching {account.restore()}}
        kotlinx.coroutines.selects.select<Unit> {readStarted.onAwait {};restore.onAwait {}}
        releaseDelete.countDown()
        val failed=logout.await().exceptionOrNull() as com.rowan.iot.domain.account.AccountLogoutCleanupFailure
        releaseRead.countDown();assertTrue(restore.await().isFailure)
        assertEquals(failed.expectedRevision,account.revision)
        assertEquals(failed.expectedRevision,account.pendingLogoutCleanupRevision)
        assertEquals(0,reads)
        hold=false;account.retryLogoutCleanup(failed.expectedRevision);assertNull(storage.value)
    }
    @Test fun storageNeverRunsOnTheCallingUiThread()=runBlocking {
        val caller=Thread.currentThread().id
        val threads=java.util.Collections.synchronizedList(mutableListOf<Long>())
        val storage=object:SessionStorage {
            var value:String?=null
            override fun read():String? {threads+=Thread.currentThread().id;return value}
            override fun write(value:String?) {threads+=Thread.currentThread().id;this.value=value}
        }
        val account=AccountService(HttpGateway {_,_,_,_->JSONObject().put("data",session())},storage)
        account.restore();account.login("a@example.com","password");account.logout()
        assertTrue(threads.isNotEmpty())
        assertTrue("Blocking keychain/preferences I/O must use a worker",threads.all {it!=caller})
    }

    @Test fun unauthorizedReadAfterRenewalInvalidatesOnlyTheSameSession()=runBlocking {
        val storage=Storage()
        val account=AccountService(HttpGateway {method,_,_,_->
            if(method=="GET")throw com.rowan.iot.domain.network.ApiFailure(401,"expired")
            JSONObject().put("data",session())
        },storage)
        account.login("a@example.com","password")
        assertTrue(runCatching {account.request("GET","/api/app/devices")}.isFailure)
        assertNull(account.session);assertNull(storage.value)
    }
    @Test fun cancelledLoginDoesNotCommitAResponseFromUncooperativeTransport()=runBlocking {
        val started=CompletableDeferred<Unit>();val response=CompletableDeferred<Unit>()
        val storage=Storage()
        val account=AccountService(HttpGateway {_,_,_,_->
            started.complete(Unit)
            withContext(NonCancellable) {response.await()}
            JSONObject().put("data",session())
        },storage)
        val login=async {account.login("a@example.com","password")}
        started.await();login.cancel();response.complete(Unit)
        runCatching {login.await()};login.join()
        assertNull(account.session)
        assertNull(storage.value)
    }
    @Test fun unusableSessionMetadataIsRejectedInsteadOfInventingDefaults() {
        assertTrue(runCatching {AccountSession.decode(session().put("expiresIn",0))}.isFailure)
        assertTrue(runCatching {AccountSession.decode(session().put("tokenType","Basic"))}.isFailure)
        assertTrue(runCatching {AccountSession.decode(session().put("setting","invalid"))}.isFailure)
    }
    @Test fun failedCleanupCanRetryWithoutInvalidatingANewLogin() = runBlocking {
        var fail=false
        val storage=object:SessionStorage {
            var value:String?=null
            override fun read()=value
            override fun write(value:String?) { if(fail && value==null) throw java.io.IOException("storage"); this.value=value }
        }
        val account=AccountService(HttpGateway { _,_,_,_->JSONObject().put("data",session()) },storage)
        account.login("a@example.com","password")
        val revision=account.revision
        fail=true
        val failure=runCatching { account.clearLocal(revision) }.exceptionOrNull()
        assertTrue(failure is LocalSessionCleanupFailure)
        assertNull(account.session)
        val cleanupRevision=(failure as LocalSessionCleanupFailure).cleanupRevision
        fail=false
        account.clearLocal(cleanupRevision)
        assertNull(storage.value)
        account.login("b@example.com","password")
        assertTrue(runCatching { account.clearLocal(cleanupRevision) }.isFailure)
        assertNotNull(account.session)
    }
    @Test fun sessionRoundTripAndRefreshKeepFullSettingsAndExpiry() = runBlocking {
        val storage = Storage()
        val original = session().put("tokenType", "bearer").put("expiresIn", 604800)
            .put("setting", JSONObject("""{"language":"en","notification":false,"theme":"dark","wallpaper":{"2x":"https://example.test/bg"},"homeLayout":"layout2"}"""))
        val account = AccountService(HttpGateway { method, _, _, _ ->
            JSONObject().put("data", if (method == "PATCH") session().put("expiresIn", 600).also { it.remove("setting") } else original)
        }, storage)
        account.login("a@example.com", "password")
        val saved = JSONObject(storage.value!!)
        assertEquals(604800, saved.getLong("expiresIn"))
        assertEquals("bearer", saved.getString("tokenType"))
        assertFalse(saved.getJSONObject("setting").getBoolean("notification"))
        account.refresh()
        val refreshed = JSONObject(storage.value!!)
        assertEquals(600, refreshed.getLong("expiresIn"))
        assertEquals("layout2", refreshed.getJSONObject("setting").getString("homeLayout"))
        assertEquals("en", account.session?.language)
    }
    private class Storage : SessionStorage {
        var value: String? = null
        override fun read() = value
        override fun write(value: String?) { this.value = value }
    }
    private fun session() = JSONObject("""{"accessToken":"test","refreshToken":"refresh","userID":"u1","expiresIn":10,"setting":{"language":"zh-CN"}}""")

    @Test fun invalidEmailDoesNotReachTransport() = runBlocking {
        var calls = 0
        val account = AccountService(HttpGateway { _, _, _, _ -> calls++; session() }, Storage())
        assertTrue(runCatching { account.login("invalid", "password") }.isFailure)
        assertEquals(0, calls)
    }

    @Test fun logoutDuringLoginRejectsLateCredentials() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val response = CompletableDeferred<JSONObject>()
        val storage = Storage()
        val account = AccountService(HttpGateway { _, _, _, _ -> started.complete(Unit); response.await() }, storage)
        val login = async { runCatching { account.login("a@example.com", "password") } }
        started.await()
        account.clearLocal()
        response.complete(JSONObject().put("data", session()))
        assertTrue(login.await().isFailure)
        assertNull(account.session)
        assertNull(storage.value)
    }

    @Test fun restoreRefreshFailureClearsStoredSession() = runBlocking {
        val storage = Storage().apply { value = session().toString() }
        val account = AccountService(HttpGateway { _, _, _, _ -> throw IllegalStateException("network") }, storage)
        account.restore()
        assertNull(account.session)
        assertNull(storage.value)
    }

    @Test fun overlappingRefreshesShareOneRequestEvenIfAccessTokenDoesNotChange() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val response = CompletableDeferred<Unit>()
        var patches = 0
        val account = AccountService(HttpGateway { method, _, _, _ ->
            if (method == "PATCH") { patches++; started.complete(Unit); response.await() }
            JSONObject().put("data", session())
        }, Storage())
        account.login("a@example.com", "password")
        val first = async { account.refresh() }
        started.await()
        val second = async(start = CoroutineStart.UNDISPATCHED) { account.refresh() }
        response.complete(Unit)
        first.await(); second.await()
        assertEquals(1, patches)
        assertEquals("u1", account.session?.userId)
    }

    @Test fun queuedRefreshCannotRefreshANewAccount() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val response = CompletableDeferred<Unit>()
        val refreshedUsers = mutableListOf<String>()
        val account = AccountService(HttpGateway { method, _, body, _ ->
            if (method == "PATCH") {
                refreshedUsers += body!!.getString("userID")
                started.complete(Unit); response.await()
            }
            val data = if (method == "POST" && body?.optString("account") == "b@example.com")
                session().put("userID", "u2").put("accessToken", "b-access").put("refreshToken", "b-refresh") else session()
            JSONObject().put("data", data)
        }, Storage())
        account.login("a@example.com", "password")
        val first = async { runCatching { account.refresh() } }
        started.await()
        val queued = async(start = CoroutineStart.UNDISPATCHED) { runCatching { account.refresh() } }
        account.login("b@example.com", "password")
        response.complete(Unit)
        assertTrue(first.await().isFailure)
        assertTrue(queued.await().isFailure)
        assertEquals(listOf("u1"), refreshedUsers)
        assertEquals("u2", account.session?.userId)
    }

    @Test fun lateLogoutCannotClearNewAccount() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val response = CompletableDeferred<Unit>()
        val storage = Storage()
        val account = AccountService(HttpGateway { method, _, body, _ ->
            if (method == "DELETE") { started.complete(Unit); response.await() }
            JSONObject().put("data", if (body?.optString("account") == "b@example.com")
                session().put("userID", "u2") else session())
        }, storage)
        account.login("a@example.com", "password")
        val logout = async { runCatching { account.logout() } }
        started.await()
        account.login("b@example.com", "password")
        response.complete(Unit)
        assertTrue(logout.await().isFailure)
        assertEquals("u2", account.session?.userId)
        assertEquals("u2", JSONObject(storage.value!!).getString("userID"))
    }
}

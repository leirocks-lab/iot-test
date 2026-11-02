package com.rowan.iot

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.network.*
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.coroutines.CoroutineContext

/** Isolated tests-first draft. Nothing here sends real email/login traffic. */
class EmailLoginServiceTest {
    private class QueuedDispatcher:CoroutineDispatcher() {
        private val pending=java.util.ArrayDeque<Runnable>()
        override fun dispatch(context:CoroutineContext,block:Runnable) {synchronized(pending) {pending.addLast(block)}}
        val size:Int get()=synchronized(pending) {pending.size}
        fun next() {val action=synchronized(pending) {pending.removeFirst()};action.run()}
    }
    private data class Call(val method:String,val path:String,val body:JSONObject?,val token:String?)
    private class Storage:SessionStorage {
        @Volatile var value:String?=null
        val writes=Collections.synchronizedList(mutableListOf<String?>())
        @Volatile var hook:(String?)->Unit={}
        override fun read()=value
        override fun write(value:String?) {writes.add(value);hook(value);this.value=value}
    }
    private class Fixture {
        val storage=Storage()
        val calls=Collections.synchronizedList(mutableListOf<Call>())
        @Volatile var now=0L
        @Volatile var token="fixture-access"
        var hook:suspend (String,String)->Unit={_,_->}
        val http=HttpGateway {method,path,body,authorization->
            calls.add(Call(method,path,body?.let {JSONObject(it.toString())},authorization));hook(method,path)
            JSONObject().put("data",JSONObject().put("accessToken",token).put("refreshToken","fixture-refresh").put("userID","fixture-user"))
        }
        val account=AccountService(http,storage)
        val cooldowns=EmailCodeCooldowns {now}
        val service=EmailLoginService(account,http,cooldowns)
        fun ready(model:EmailLoginService=service,mode:LoginMode=LoginMode.CAPTCHA) {
            model.setEmail("public@example.test");model.setMode(mode);model.setConsent(true)
            if(mode==LoginMode.CAPTCHA)model.setCode("123456")else model.setPassword("fixture-password")
        }
    }
    private fun runLoginTest(work:suspend CoroutineScope.()->Unit):Unit=runBlocking {supervisorScope {work()}}
    private fun assertCode(code:Int,error:Throwable?) {assertTrue(error is ApiFailure);assertEquals(code,(error as ApiFailure).code)}
    @Test fun captchaHasExactAuth04FieldsAndNoAuth02()=runLoginTest {
        val f=Fixture();f.ready();assertTrue(f.service.login());assertEquals(1,f.calls.size)
        val call=f.calls.single();assertEquals("POST",call.method);assertEquals("/api/app/session",call.path);assertNull(call.token)
        val body=call.body!!;assertEquals(setOf("account","pin","verify","system","language"),body.keys().asSequence().toSet())
        assertEquals("123456",body.getString("pin"));assertEquals("captcha",body.getString("verify"));assertEquals("android",body.getString("system"))
    }
    @Test fun passwordKeepsExistingBodyWithoutCaptchaAlias()=runLoginTest {
        val f=Fixture();f.ready(mode=LoginMode.PASSWORD);assertTrue(f.service.login());val body=f.calls.single().body!!
        assertEquals("password",body.getString("verify"));assertEquals("fixture-password",body.getString("pin"));assertFalse(body.has("password"));assertFalse(body.has("captcha"))
    }
    @Test fun modeSwitchDiscardsBothInputs() {
        val f=Fixture();f.ready(mode=LoginMode.PASSWORD);f.service.setCode("123456");f.service.setMode(LoginMode.CAPTCHA);assertFalse(f.service.canSubmit)
        f.service.setCode("123456");assertTrue(f.service.canSubmit);f.service.setMode(LoginMode.PASSWORD);assertFalse(f.service.canSubmit)
    }
    @Test fun commonConsentGatesSendAndBothLoginModes() {
        val f=Fixture();f.ready();f.service.setConsent(false);assertFalse(f.service.canSend);assertFalse(f.service.canSubmit)
        f.service.setConsent(true);assertTrue(f.service.canSubmit);f.service.setMode(LoginMode.PASSWORD);f.service.setPassword("fixture");assertTrue(f.service.canSubmit)
    }
    @Test fun captchaAcceptsOnlySixAsciiDigits() {
        val f=Fixture();f.ready()
        for(code in listOf("","12345","1234567","１２３４５６","123 56","abcdef")) {f.service.setCode(code);assertFalse(f.service.canSubmit)}
        f.service.setCode("000001");assertTrue(f.service.canSubmit)
    }
    @Test fun auth01IsEmailLoginAndEscapesPlus()=runLoginTest {
        val f=Fixture();f.ready();f.service.setEmail("public+tag@example.test");f.service.send()
        val call=f.calls.single();assertEquals("GET",call.method);assertNull(call.body);assertNull(call.token)
        val query=call.path.substringAfter('?').split('&').associate {val pair=it.split('=',limit=2);pair[0] to java.net.URLDecoder.decode(pair[1],"UTF-8")}
        assertEquals(mapOf("account" to "public+tag@example.test","accountType" to "email","captchaType" to "login"),query);assertTrue(call.path.contains("%2B"))
    }
    @Test fun globalCooldownSurvivesFlowReopenAndCaseChange()=runLoginTest {
        val f=Fixture();f.ready();f.service.send();val next=EmailLoginService(f.account,f.http,f.cooldowns);f.ready(next);next.setEmail("PUBLIC@example.test")
        assertCode(429,runCatching {next.send()}.exceptionOrNull());assertEquals(1,f.calls.size);assertEquals(60,next.cooldownSeconds)
        f.now=59_100;assertEquals(1,next.cooldownSeconds);f.now=60_000;next.send();assertEquals(2,f.calls.size)
    }
    @Test fun forgetRegisterCooldownDoesNotBlockLogin() {
        val f=Fixture();f.cooldowns.reserve(EmailCodePurpose.REGISTER,"public@example.test");f.cooldowns.reserve(EmailCodePurpose.FORGET,"public@example.test");f.ready();assertTrue(f.service.canSend)
    }
    @Test fun failedSendKeepsCooldownWithoutReplay()=runLoginTest {
        val f=Fixture();f.ready();f.hook={_,_->throw java.io.IOException("fixture")};assertTrue(runCatching {f.service.send()}.isFailure)
        assertEquals(1,f.calls.size);assertEquals(60,f.service.cooldownSeconds)
    }
    @Test fun cancelledUncooperativeSendHoldsGlobalLeasePastSixtySeconds()=runLoginTest {
        val f=Fixture();f.ready();val started=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        f.hook={_,_->started.complete(Unit);withContext(NonCancellable){release.await()}}
        val first=async {f.service.send()};started.await();f.service.pause();f.now=61_000
        val next=EmailLoginService(f.account,f.http,f.cooldowns);f.ready(next)
        assertTrue(runCatching {next.send()}.isFailure);assertEquals(1,f.calls.size);assertTrue(f.service.busy)
        release.complete(Unit);runCatching {first.await()};assertFalse(f.service.busy);assertEquals(1,f.calls.size)
    }
    @Test fun changedEmailDoesNotAcceptLateSendResultOrPublishToNewInput()=runLoginTest {
        val f=Fixture();f.ready();val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        f.hook={_,_->entered.complete(Unit);withContext(NonCancellable){release.await()}}
        val task=async {f.service.send()};entered.await();f.service.setEmail("new@example.test");release.complete(Unit);assertTrue(runCatching {task.await()}.isFailure)
        assertEquals("new@example.test",f.service.email);assertTrue(f.service.status.isBlank());assertEquals(1,f.calls.size)
    }
    @Test fun staleExpectedAfterBDoesZeroHttpAndZeroClear()=runLoginTest {
        val f=Fixture();f.account.login("b@example.test","fixture");val writes=f.storage.writes.size;val calls=f.calls.size
        assertCode(499,runCatching {f.account.login("a@example.test",LoginCredential.Captcha("123456"),0)}.exceptionOrNull())
        assertEquals(writes,f.storage.writes.size);assertEquals(calls,f.calls.size);assertNotNull(f.account.session)
    }
    @Test fun queuedOldAAfterBStorageCommitDoesZeroClearAndZeroHttp()=runLoginTest {
        val f=Fixture();val physical=CompletableDeferred<Unit>();val release=CountDownLatch(1)
        f.storage.hook={if(it!=null){physical.complete(Unit);check(release.await(5,TimeUnit.SECONDS))}}
        val b=async {f.account.login("b@example.test","fixture")};physical.await();val writes=f.storage.writes.size;val calls=f.calls.size
        val a=async(start=CoroutineStart.UNDISPATCHED){f.account.login("a@example.test",LoginCredential.Captcha("123456"),0)}
        release.countDown();b.await();assertCode(499,runCatching {a.await()}.exceptionOrNull());assertEquals(writes,f.storage.writes.size);assertEquals(calls,f.calls.size)
    }
    @Test fun staleAlreadyDispatchedLoginCannotPersistOverB()=runLoginTest {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        f.hook={_,_->if(f.calls.size==1){entered.complete(Unit);withContext(NonCancellable){release.await()}}}
        val a=async {f.account.login("a@example.test",LoginCredential.Captcha("123456"),0)};entered.await();f.token="fixture-B";f.account.login("b@example.test","fixture")
        val writes=f.storage.writes.size;release.complete(Unit);assertCode(499,runCatching {a.await()}.exceptionOrNull())
        assertEquals("fixture-B",f.account.session!!.accessToken);assertEquals(writes,f.storage.writes.size);assertEquals(2,f.calls.size)
    }
    @Test fun inputChangeCancelsPendingLoginBeforePersistence()=runLoginTest {
        val f=Fixture();f.ready();val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        f.hook={_,_->entered.complete(Unit);withContext(NonCancellable){release.await()}}
        val task=async {f.service.login()};entered.await();f.service.setCode("654321");release.complete(Unit);assertTrue(runCatching {task.await()}.isFailure)
        assertNull(f.account.session);assertFalse(f.storage.writes.any {it!=null});assertEquals(1,f.calls.size)
    }
    @Test fun switchingModeCancelsOldPasswordWithoutSubmittingCaptcha()=runLoginTest {
        val f=Fixture();f.ready(mode=LoginMode.PASSWORD);val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        f.hook={_,_->entered.complete(Unit);withContext(NonCancellable){release.await()}}
        val task=async {f.service.login()};entered.await();f.service.setMode(LoginMode.CAPTCHA);release.complete(Unit);assertTrue(runCatching {task.await()}.isFailure)
        assertNull(f.account.session);assertFalse(f.service.canSubmit);assertEquals("password",f.calls.single().body!!.getString("verify"))
    }
    @Test fun explicitRetryAfterAuthRejectionUsesOwnReservation()=runLoginTest {
        val f=Fixture();f.ready();f.hook={_,_->throw ApiFailure(1182,"fixture")};assertTrue(runCatching {f.service.login()}.isFailure);assertTrue(f.service.canSubmit)
        f.hook={_,_->};assertTrue(f.service.login());assertEquals(2,f.calls.size)
    }
    @Test fun compensatedStorageFailureAllowsSameModelNewInputRetry()=runLoginTest {
        val f=Fixture();f.ready();var fail=true
        f.storage.hook={if(it!=null&&fail){fail=false;throw java.io.IOException("fixture")}}
        assertTrue(runCatching {f.service.login()}.isFailure);assertEquals(2L,f.account.revision);assertNull(f.account.pendingLogoutCleanupRevision)
        f.service.setCode("654321");assertTrue(f.service.canSubmit);assertTrue(f.service.login())
    }
    @Test fun physicalWriteCancellationCompensatesAndAcceptsNewCredentialRetry()=runLoginTest {
        val f=Fixture();f.ready();val physical=CompletableDeferred<Unit>();val release=CountDownLatch(1)
        f.storage.hook={if(it!=null){physical.complete(Unit);check(release.await(5,TimeUnit.SECONDS))}}
        val first=async {f.service.login()};physical.await();f.service.setCode("654321");release.countDown();runCatching {first.await()}
        assertNull(f.storage.value);assertNull(f.account.session);assertEquals(2L,f.account.revision);assertTrue(f.service.canSubmit)
        f.storage.hook={};assertTrue(f.service.login())
    }
    @Test fun returnBeforeCancelledActualHttpEndsDoesNotStrandPage()=runLoginTest {
        val f=Fixture();f.ready();val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        f.hook={_,_->entered.complete(Unit);withContext(NonCancellable){release.await()}}
        val first=async {f.service.login()};entered.await();f.service.pause();f.service.resume();assertTrue(f.service.busy)
        release.complete(Unit);runCatching {first.await()};f.service.setCode("654321");assertTrue(f.service.canSubmit)
        f.hook={_,_->};assertTrue(f.service.login())
    }
    @Test fun inactiveCompensationReceiptIsRecordedBeforeBusyReturn()=runLoginTest {
        val f=Fixture();val physical=CompletableDeferred<Unit>();val release=CountDownLatch(1);val receipt=CompletableDeferred<Unit>();val tail=CountDownLatch(1)
        val service=EmailLoginService(f.account,f.http,f.cooldowns,receiptRecorded={if(it.revision==2L){receipt.complete(Unit);check(tail.await(5,TimeUnit.SECONDS))}})
        f.ready(service);f.storage.hook={if(it!=null){physical.complete(Unit);check(release.await(5,TimeUnit.SECONDS))}}
        val first=async(Dispatchers.Default) {service.login()};physical.await();service.pause();release.countDown();receipt.await()
        service.resume();assertTrue(service.busy);tail.countDown();runCatching {first.await()};service.setCode("654321");assertTrue(service.canSubmit)
        f.storage.hook={};assertTrue(service.login())
    }
    @Test fun staleRegistrationStillPreservesExistingExpectedRevisionGuard()=runLoginTest {
        val f=Fixture();f.account.login("b@example.test","fixture");val writes=f.storage.writes.size;val calls=f.calls.size
        assertCode(499,runCatching {f.account.register("a@example.test","Rowan@123","123456","US",0)}.exceptionOrNull())
        assertEquals(writes,f.storage.writes.size);assertEquals(calls,f.calls.size)
    }
    @Test fun BSessionPreventsOldPageResumeFromAdoptingItsAuthority()=runLoginTest {
        val f=Fixture();f.ready();f.account.login("b@example.test","fixture");val writes=f.storage.writes.size;f.service.resume()
        assertFalse(f.service.canSubmit);assertTrue(runCatching {f.service.login()}.isFailure);assertEquals(writes,f.storage.writes.size)
    }
    @Test fun pendingCleanupBlocksLoginAndSend()=runLoginTest {
        val f=Fixture();f.ready();f.storage.hook={throw java.io.IOException("fixture")};runCatching {f.account.clearLocal()}
        assertNotNull(f.account.pendingLogoutCleanupRevision);f.service.resume();assertFalse(f.service.canSend);assertFalse(f.service.canSubmit);assertTrue(f.calls.isEmpty())
    }
    @Test fun fixedErrorsNeverEnumerateAccountsOrExposeBackendMessages()=runLoginTest {
        val messages=mutableMapOf<Int,String>()
        for(code in listOf(1181,1182,1183,1184)) {val f=Fixture();f.ready();f.hook={_,_->throw ApiFailure(code,"private backend")};runCatching {f.service.login()};messages[code]=f.service.status;assertFalse(f.service.status.contains("private"))}
        assertEquals(messages[1181],messages[1182]);assertEquals(messages[1183],messages[1184]);assertNotEquals(messages[1181],messages[1183])
    }
    @Test fun typedCredentialDescriptionAndReceiptContainNoPinOrTokens() {
        assertFalse(LoginCredential.Captcha("123456").toString().contains("123456"));assertEquals("AccountLoginReceipt(revision=7)",AccountLoginReceipt(7).toString())
    }
    @Test fun inputChangeAfterSendChildCompletesRejectsQueuedParentSuccess()=runLoginTest {
        for(changeMode in listOf(false,true)) {
            val f=Fixture();f.ready();val dispatcher=QueuedDispatcher()
            val send=async(dispatcher,start=CoroutineStart.UNDISPATCHED) {f.service.send()}
            assertEquals(1,dispatcher.size);dispatcher.next() // Run child HTTP/checks to completion, not parent continuation.
            assertEquals(1,dispatcher.size);assertTrue(f.service.busy);assertEquals(1,f.calls.size)
            if(changeMode)f.service.setMode(LoginMode.PASSWORD) else f.service.setEmail("new@example.test")
            dispatcher.next();assertCode(499,runCatching {send.await()}.exceptionOrNull())
            assertTrue(f.service.status.isBlank());assertFalse(f.service.busy);assertEquals(1,f.calls.size)
        }
    }
}

package com.rowan.iot.domain.account

import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.*

enum class LoginMode(val wire:String) { PASSWORD("password"), CAPTCHA("captcha") }
sealed class LoginCredential(internal val pin:String) {
    abstract val mode:LoginMode
    class Password(pin:String):LoginCredential(pin) {override val mode=LoginMode.PASSWORD}
    class Captcha(pin:String):LoginCredential(pin) {override val mode=LoginMode.CAPTCHA}
    internal val valid:Boolean get()=when(mode) {LoginMode.PASSWORD->pin.isNotBlank();LoginMode.CAPTCHA->pin.matches(Regex("[0-9]{6}"))}
    final override fun toString()="LoginCredential(<redacted>)"
}
data class AccountLoginReceipt(val revision:Long) // Native authority only, not another account/RN session.

/** Owns transient input/operation state only. AccountService alone accepts/persists a session. */
class EmailLoginService(private val account:AccountService,http:HttpGateway,cooldowns:EmailCodeCooldowns,
    private val receiptRecorded:(AccountLoginReceipt)->Unit={}) {
    private val verification=EmailVerificationService(http,EmailCodePurpose.LOGIN,cooldowns)
    private val lock=Any()
    private var boundRevision=account.contextSnapshot().revision
    private var resumed=true
    private var generation=0L
    private var active:Job?=null
    private var busyValue=false
    private var emailValue=""
    private var passwordValue=""
    private var codeValue=""
    private var modeValue=LoginMode.PASSWORD
    private var consentValue=false
    private var statusValue=""
    val email:String get()=synchronized(lock) {emailValue}
    val mode:LoginMode get()=synchronized(lock) {modeValue}
    val busy:Boolean get()=synchronized(lock) {busyValue}
    val status:String get()=synchronized(lock) {statusValue}
    val cooldownSeconds:Int get()=verification.cooldownSeconds
    private fun contextCurrentLocked():Boolean=account.contextSnapshot().let {resumed&&it.revision==boundRevision&&it.session==null&&!it.cleanupRequired}
    val canSubmit:Boolean get()=synchronized(lock) {contextCurrentLocked()&&!busyValue&&consentValue&&validEmail(emailValue)&&credentialLocked().valid}
    val canSend:Boolean get()=synchronized(lock) {contextCurrentLocked()&&!busyValue&&consentValue&&modeValue==LoginMode.CAPTCHA&&validEmail(emailValue)&&verification.sendAvailable}
    val contextCurrent:Boolean get()=synchronized(lock) {contextCurrentLocked()}
    private fun credentialLocked():LoginCredential=when(modeValue) {LoginMode.PASSWORD->LoginCredential.Password(passwordValue);LoginMode.CAPTCHA->LoginCredential.Captcha(codeValue)}
    private fun change(edit:()->Boolean) {
        val cancel=synchronized(lock) {if(edit()) {generation++;statusValue="";verification.setInput(emailValue,codeValue);active} else null}
        cancel?.cancel() // Never invoke completion handlers while holding the input monitor.
    }
    fun setEmail(value:String)=change {val next=value.trim();if(next==emailValue)false else {emailValue=next;passwordValue="";codeValue="";true}}
    fun setPassword(value:String)=change {if(value==passwordValue)false else {passwordValue=value;true}}
    fun setCode(value:String)=change {if(value==codeValue)false else {codeValue=value;true}}
    fun setConsent(value:Boolean)=change {if(value==consentValue)false else {consentValue=value;true}}
    fun setMode(value:LoginMode)=change {if(value==modeValue)false else {modeValue=value;passwordValue="";codeValue="";statusValue="";true}}
    fun pause()=change {resumed=false;passwordValue="";codeValue="";true}
    fun resume()=synchronized(lock) {
        val live=account.contextSnapshot()
        if(live.session==null&&!live.cleanupRequired) {
            resumed=true // Returning before cancelled actual I/O ends must not strand the page.
            if(!busyValue) {boundRevision=live.revision;passwordValue="";codeValue="";generation++}
            else statusValue="正在结束上一操作，请稍候"
        }
    }
    private data class Input(val email:String,val credential:LoginCredential,val revision:Long,val generation:Long)
    private fun input(sending:Boolean):Input=synchronized(lock) {
        if(busyValue)throw ApiFailure(409,"操作进行中，请稍候")
        if(!contextCurrentLocked())throw ApiFailure(499,"页面或账号已变化")
        if(!consentValue||!validEmail(emailValue))throw ApiFailure(400,"请同意协议并核对邮箱")
        if(sending) {if(modeValue!=LoginMode.CAPTCHA||!verification.sendAvailable)throw ApiFailure(429,"请等待当前发送或倒计时结束")}
        else if(!credentialLocked().valid)throw ApiFailure(400,"请核对密码或6位数字验证码")
        Input(emailValue,credentialLocked(),boundRevision,generation)
    }
    private suspend fun check(input:Input) {
        currentCoroutineContext().ensureActive()
        synchronized(lock) {if(!contextCurrentLocked()||generation!=input.generation)throw ApiFailure(499,"页面或账号已变化")}
    }
    private fun acceptOwnReceipt(receipt:AccountLoginReceipt) {
        val accepted=synchronized(lock) {
            val live=account.contextSnapshot()
            // Inactive pages retain authority only. No active flag/secret/navigation is restored.
            if(live.revision==receipt.revision&&live.session==null&&!live.cleanupRequired) {boundRevision=receipt.revision;true} else false
        }
        if(accepted)receiptRecorded(receipt) // Native-only observer seam; default no-op, outside input monitor.
    }
    private suspend fun <T> operation(work:suspend ()->T):T {
        synchronized(lock) {if(busyValue)throw ApiFailure(409,"操作进行中，请稍候");busyValue=true}
        try {
            return coroutineScope {
                val worker=async(start=CoroutineStart.LAZY) {work()}
                synchronized(lock) {active=worker};worker.start();worker.await()
            }
        }finally {
            // coroutineScope waits for all children, including uncooperative NonCancellable I/O.
            synchronized(lock) {active=null;busyValue=false;if(statusValue=="正在结束上一操作，请稍候")statusValue=""}
        }
    }
    suspend fun send() {
        val input=input(true);synchronized(lock) {statusValue="正在发送验证码…"}
        try {
            operation {check(input);verification.send();check(input)}
            currentCoroutineContext().ensureActive()
            synchronized(lock) {
                if(!contextCurrentLocked()||generation!=input.generation)throw ApiFailure(499,"页面或账号已变化")
                statusValue="验证码已发送"
            }
        }
        catch(error:Exception) {synchronized(lock) {if(generation==input.generation)statusValue="发送未确认，请等待倒计时后重试"};throw error}
    }
    suspend fun login():Boolean {
        val input=input(false);synchronized(lock) {statusValue="正在登录…"}
        try {
            val receipt=operation {check(input);account.login(input.email,input.credential,input.revision,::acceptOwnReceipt)}
            currentCoroutineContext().ensureActive()
            return synchronized(lock) {
                val live=account.contextSnapshot()
                if(!resumed||generation!=input.generation||live.revision!=receipt.revision||live.session==null||live.cleanupRequired)throw ApiFailure(499,"页面或账号已变化")
                passwordValue="";codeValue="";true
            }
        }catch(error:Exception) {
            synchronized(lock) {if(generation==input.generation)statusValue=when {
                account.pendingLogoutCleanupRevision!=null->"本地会话清理未完成，请返回入口重试清理"
                error is ApiFailure&&error.code in setOf(1181,1182)&&input.credential.mode==LoginMode.CAPTCHA->"验证码错误或已过期，请核对后重试"
                error is ApiFailure&&error.code in setOf(1183,1184)->"登录信息有误，请核对后重试"
                else->"登录未确认，请核对登录信息后重试"
            }};throw error
        }
    }
    private fun validEmail(value:String)=value.matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
}

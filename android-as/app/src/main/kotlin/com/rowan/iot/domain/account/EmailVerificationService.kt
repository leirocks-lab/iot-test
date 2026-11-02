package com.rowan.iot.domain.account

import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import java.net.URLEncoder
import kotlinx.coroutines.ensureActive

enum class EmailCodePurpose(val wireValue:String) { REGISTER("register"), FORGET("forget"), LOGIN("login") }

/** App-owned monotonic cooldowns survive leaving/reopening a flow; purposes stay isolated. */
class EmailCodeCooldowns(private val clock:()->Long={System.nanoTime()/1_000_000}) {
    private val deadlines=mutableMapOf<String,Long>()
    private val sends=mutableMapOf<String,java.util.UUID>()
    private fun key(purpose:EmailCodePurpose,email:String)="${purpose.name}:${email.lowercase(java.util.Locale.ROOT)}"
    @Synchronized fun pending(purpose:EmailCodePurpose,email:String)=sends.containsKey(key(purpose,email))
    @Synchronized fun acquireSend(purpose:EmailCodePurpose,email:String):java.util.UUID? {
        if(pending(purpose,email)||!reserveIfAvailable(purpose,email))return null
        return java.util.UUID.randomUUID().also {sends[key(purpose,email)]=it}
    }
    @Synchronized fun releaseSend(purpose:EmailCodePurpose,email:String,permit:java.util.UUID) {
        val key=key(purpose,email);if(sends[key]==permit)sends.remove(key)
    }
    @Synchronized fun remaining(purpose:EmailCodePurpose,email:String):Int =
        (((deadlines["${purpose.name}:${email.lowercase(java.util.Locale.ROOT)}"]?:0)-clock()).coerceAtLeast(0)+999).div(1000).toInt()
    @Synchronized fun reserve(purpose:EmailCodePurpose,email:String) {
        val now=clock()
        deadlines.entries.removeAll {it.value<=now}
        deadlines["${purpose.name}:${email.lowercase(java.util.Locale.ROOT)}"]=now+60_000
    }
    @Synchronized fun reserveIfAvailable(purpose:EmailCodePurpose,email:String):Boolean {
        if(remaining(purpose,email)>0)return false
        reserve(purpose,email);return true
    }
}

object AccountInput {
    fun requirePassword(password:String,confirmation:String) {
        if(password.codePointCount(0,password.length) !in 8..12 || password.none {it in 'a'..'z'||it in 'A'..'Z'} || password.none {it in '0'..'9'} || password.any {it.isWhitespace()}) {
            throw ApiFailure(400,"密码需8–12个字符，包含数字和英文字母")
        }
        if(password!=confirmation) throw ApiFailure(400,"两次密码不一致")
    }
}

/** AUTH-01/02 are encapsulated here for register, recovery and captcha-login use cases. */
class EmailVerificationService(private val http:HttpGateway,private val purpose:EmailCodePurpose,private val cooldowns:EmailCodeCooldowns) {
    private val lock=Any()
    private var email=""
    private var code=""
    private var revision=0L
    private var verified:Long?=null
    private var active=false
    val cooldownSeconds:Int get()=synchronized(lock) {cooldowns.remaining(purpose,email)}
    val sendAvailable:Boolean get()=synchronized(lock) {!active&&cooldowns.remaining(purpose,email)==0&&!cooldowns.pending(purpose,email)}
    fun setInput(account:String,captcha:String)=synchronized(lock) {
        val normalized=account.trim()
        if(email!=normalized||code!=captcha) {email=normalized;code=captcha;revision++;verified=null}
    }
    fun invalidate()=synchronized(lock) {revision++;verified=null}
    private data class Input(val email:String,val code:String,val revision:Long)
    private fun start(requireCode:Boolean,requireVerified:Boolean=false):Input=synchronized(lock) {
        if(active) throw ApiFailure(409,"操作进行中，请稍候")
        if(!email.matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))) throw ApiFailure(400,"请输入有效邮箱")
        if(requireCode&&!code.matches(Regex("[0-9]{6}"))) throw ApiFailure(400,"请输入6位验证码")
        if(requireVerified&&verified!=revision) throw ApiFailure(400,"请先校验当前邮箱验证码")
        active=true;Input(email,code,revision)
    }
    private fun check(input:Input) {if(revision!=input.revision) throw ApiFailure(499,"输入已变化，请重新校验")}
    suspend fun send() {
        val input=start(false)
        var permit:java.util.UUID?=null
        try {
            kotlinx.coroutines.currentCoroutineContext().ensureActive()
            permit=cooldowns.acquireSend(purpose,input.email)?:throw ApiFailure(429,"请等待当前发送或倒计时结束")
            http.request("GET","/api/app/captcha?account=${URLEncoder.encode(input.email,"UTF-8")}&accountType=email&captchaType=${purpose.wireValue}",null,null)
            cooldowns.reserve(purpose,input.email)
            kotlinx.coroutines.currentCoroutineContext().ensureActive()
            synchronized(lock) {check(input);verified=null}
        }finally {
            permit?.let {cooldowns.releaseSend(purpose,input.email,it)}
            synchronized(lock) {active=false}
        }
    }
    suspend fun verify() {
        val input=start(true)
        try {
            http.request("GET","/api/app/captcha/${input.code}?account=${URLEncoder.encode(input.email,"UTF-8")}&accountType=email",null,null)
            synchronized(lock) {check(input);verified=input.revision}
        } finally {synchronized(lock) {active=false}}
    }
    /** A mutation consumes verification before sending. Uncertain results are never replayed. */
    suspend fun completeVerified(action:suspend (email:String,code:String)->Unit) {
        val input=start(true,true)
        synchronized(lock) {verified=null}
        try {action(input.email,input.code);synchronized(lock) {check(input)}}
        finally {synchronized(lock) {active=false}}
    }
}

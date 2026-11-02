package com.rowan.iot.domain.account

import com.rowan.iot.domain.network.HttpGateway
import org.json.JSONObject

/** Delegates all code requests and stale-input checks to the shared verification service. */
class RecoveryService(private val http:HttpGateway,clock:()->Long={System.nanoTime()/1_000_000},cooldowns:EmailCodeCooldowns=EmailCodeCooldowns(clock)) {
    private val verification=EmailVerificationService(http,EmailCodePurpose.FORGET,cooldowns)
    val cooldownSeconds:Int get()=verification.cooldownSeconds
    fun setInput(account:String,captcha:String)=verification.setInput(account,captcha)
    suspend fun send()=verification.send()
    suspend fun verify()=verification.verify()
    suspend fun reset(password:String,confirmation:String) {
        AccountInput.requirePassword(password,confirmation)
        verification.completeVerified {email,code->
            http.request("PATCH","/api/app/user/password",JSONObject().put("account",email).put("captcha",code).put("password",password),null)
        }
    }
}

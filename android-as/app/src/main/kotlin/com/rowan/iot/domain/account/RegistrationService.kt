package com.rowan.iot.domain.account

import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import java.util.Locale

/** Reading completion is bound to an explicit region revision, not an assumed document version. */
class RegistrationService(http:HttpGateway,private val account:AccountService,cooldowns:EmailCodeCooldowns=EmailCodeCooldowns()) {
    @Volatile private var accountRevision=account.contextSnapshot().revision
    private val verification=EmailVerificationService(http,EmailCodePurpose.REGISTER,cooldowns)
    private val read=mutableSetOf<AgreementKind>()
    var regionCode:String?=null;private set
    var regionRevision=0L;private set
    private var consent=false
    val canConsent:Boolean get()=read.size==AgreementKind.entries.size
    val cooldownSeconds:Int get()=verification.cooldownSeconds
    fun setInput(email:String,code:String)=verification.setInput(email,code)
    fun selectRegion(value:String) {
        if(value !in Locale.getISOCountries()) throw ApiFailure(400,"请选择有效地区")
        if(value!=regionCode) {regionCode=value;regionRevision++;read.clear();consent=false;verification.invalidate()}
    }
    fun markRead(kind:AgreementKind,region:String,revision:Long=regionRevision) {
        if(region==regionCode&&revision==regionRevision) read+=kind
    }
    fun setConsent(value:Boolean) {
        if(value&&!canConsent) throw ApiFailure(400,"请先阅读两份协议")
        consent=value
    }
    suspend fun send()=verification.send()
    suspend fun verify()=verification.verify()
    suspend fun submit(password:String,confirmation:String) {
        val region=regionCode?:throw ApiFailure(400,"请先选择国家或地区")
        if(!canConsent||!consent) throw ApiFailure(400,"请完成两份协议阅读并同意")
        AccountInput.requirePassword(password,confirmation)
        val live=account.contextSnapshot();val expectedSession=accountRevision
        if(live.session!=null||live.cleanupRequired||live.revision!=expectedSession)throw ApiFailure(499,"页面或账号已变化")
        verification.completeVerified {email,code->account.register(email,password,code,region,expectedSession,onReserved={receipt->
            val current=account.contextSnapshot()
            if(current.revision==receipt.revision&&current.session==null&&!current.cleanupRequired)accountRevision=receipt.revision
        })}
    }
}

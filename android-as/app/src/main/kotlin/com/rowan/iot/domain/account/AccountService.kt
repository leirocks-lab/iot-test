package com.rowan.iot.domain.account

import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

interface SessionStorage {
    fun read(): String?
    fun write(value: String?)
}

data class AccountSession(
    val accessToken: String, val refreshToken: String, val userId: String,
    val expiresIn: Long?, val tokenType: String?, private val settingsJson: String,
) {
    override fun toString()="AccountSession(<redacted>)"
    val language: String get() = JSONObject(settingsJson).optString("language", "zh-CN")
    fun settings(): JSONObject = JSONObject(settingsJson)
    fun encode(): String = JSONObject().put("accessToken", accessToken).put("refreshToken", refreshToken)
        .put("userID", userId).put("expiresIn", expiresIn).put("tokenType", tokenType)
        .put("setting", settings()).toString()

    companion object {
        fun decode(data: JSONObject): AccountSession {
            val access = data.getString("accessToken")
            val refresh = data.getString("refreshToken")
            val user = data.getString("userID")
            if (access.isBlank() || refresh.isBlank() || user.isBlank()) throw ApiFailure(502, "会话响应不完整")
            val expiry = if (data.has("expiresIn") && !data.isNull("expiresIn")) data.getLong("expiresIn") else null
            if (expiry != null && expiry <= 0) throw ApiFailure(502, "会话有效期格式错误")
            if(data.has("setting")&&!data.isNull("setting")&&data.optJSONObject("setting")==null) throw ApiFailure(502,"用户设置格式错误")
            val tokenType=if(data.has("tokenType")&&!data.isNull("tokenType")) data.getString("tokenType") else null
            if(tokenType!=null&&!tokenType.equals("bearer",ignoreCase=true)) throw ApiFailure(502,"会话认证类型不支持")
            return AccountSession(access, refresh, user, expiry,
                tokenType,
                (data.optJSONObject("setting") ?: JSONObject()).toString())
        }
    }
}

/** Context identity publishes every change; credential identity records completed renewals only. */
class AccountContext(val revision: Long, val session: AccountSession?, val cleanupRequired:Boolean=false,
    internal val credentialPublication:Any=Any(), val settingsPublication:Long=0) {
    fun copy(revision:Long=this.revision,session:AccountSession?=this.session,cleanupRequired:Boolean=this.cleanupRequired,
        credentialPublication:Any=this.credentialPublication,settingsPublication:Long=this.settingsPublication)=
        AccountContext(revision,session,cleanupRequired,credentialPublication,settingsPublication)
    override fun toString()="AccountContext(revision=$revision, authenticated=${session!=null}, cleanupRequired=$cleanupRequired)"
}
class LocalSessionCleanupFailure(val cleanupRevision: Long) : Exception("本地会话清理失败")
enum class AccountLogoutResult { SERVER_CONFIRMED, ALREADY_UNAUTHENTICATED, NO_LOCAL_SESSION }
class AccountLogoutCleanupFailure(val expectedRevision:Long):Exception("本地安全会话清理未完成，请重试本地清理")

/** Publishes one immutable account/revision pair; writes and persistence are serialized. */
class AccountService(private val http: HttpGateway, private val storage: SessionStorage) {
    private val mutex = Mutex()
    private val refreshMutex = Mutex()
    private val refreshOwner=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    private val mutableContexts=MutableStateFlow(AccountContext(0,null))
    val contexts=mutableContexts.asStateFlow()
    private var context:AccountContext
        get()=mutableContexts.value
        set(value) {mutableContexts.value=value}
    val pendingLogoutCleanupRevision:Long? get()=context.takeIf {it.cleanupRequired}?.revision
    val session: AccountSession? get() = context.session
    val revision: Long get() = context.revision
    fun contextSnapshot(): AccountContext = context
    private fun requireNoPendingLogoutCleanup() {
        pendingLogoutCleanupRevision?.let {throw AccountLogoutCleanupFailure(it)}
    }
    private suspend fun readStored()=withContext(Dispatchers.IO) {storage.read()}
    private suspend fun writeStored(value:String?) {
        if(value==null) withContext(NonCancellable+Dispatchers.IO) {storage.write(null)}
        else withContext(Dispatchers.IO) {storage.write(value)}
    }

    private suspend fun persistSession(value:AccountSession,expected:Long,refreshStarted:AccountContext?=null,onCompensated:((AccountLoginReceipt)->Unit)?=null)=mutex.withLock {
        currentCoroutineContext().ensureActive()
        if(expected!=revision)throw ApiFailure(499,"会话已变化")
        val live=context
        // A settings GET/commit completed while this renewal was in flight. Its
        // confirmed preferences are newer than incidental refresh response settings.
        val saved=if(refreshStarted!=null&&live!==refreshStarted&&live.session!=null)
            value.copy(settingsJson=live.session.settings().toString()) else value
        try {
            writeStored(saved.encode())
            currentCoroutineContext().ensureActive()
            context=context.copy(session=saved,credentialPublication=Any(),settingsPublication=context.settingsPublication+1)
        }catch(error:Exception) {
            // A blocking disk write may finish after cancellation. Remove that
            // attempt's ciphertext before another account can enter this mutex.
            val ownsCompensation=revision==expected
            if(!ownsCompensation)throw ApiFailure(499,"会话已变化")
            val compensationRevision=expected+1
            context=AccountContext(compensationRevision,null,true)
            try {withContext(NonCancellable) {
                writeStored(null);context=context.copy(cleanupRequired=false)
                val clean=context
                if(ownsCompensation&&clean.revision==compensationRevision&&clean.session==null&&!clean.cleanupRequired)
                    onCompensated?.invoke(AccountLoginReceipt(compensationRevision))
            }}
            catch(_:Exception) {
                if(error is kotlinx.coroutines.CancellationException)throw error
                throw AccountLogoutCleanupFailure(context.revision)
            }
            throw error
        }
    }

    /** Called under mutex. Publish the phase and null session as one immutable snapshot. */
    private suspend fun clearLocked(expectedRevision:Long?=null,allowPendingRetry:Boolean=false) {
        val live=context
        if(expectedRevision!=null&&expectedRevision!=live.revision)throw ApiFailure(499,"会话已变化")
        if(live.cleanupRequired) {
            if(!allowPendingRetry||expectedRevision!=live.revision)throw AccountLogoutCleanupFailure(live.revision)
        }else context=AccountContext(live.revision+1,null,true)
        try { writeStored(null) }
        catch(error:kotlinx.coroutines.CancellationException) {throw error}
        catch (_: Exception) { throw LocalSessionCleanupFailure(context.revision) }
        context=context.copy(cleanupRequired=false)
    }
    suspend fun clearLocal(expectedRevision: Long? = null) = mutex.withLock {
        clearLocked(expectedRevision,allowPendingRetry=expectedRevision!=null)
    }

    suspend fun login(account:String,pin:String,verify:String="password",expectedRevision:Long=revision) {
        val credential=when(verify) {
            "password"->LoginCredential.Password(pin)
            "captcha"->LoginCredential.Captcha(pin)
            else->throw ApiFailure(400,"请输入有效邮箱和密码或验证码")
        }
        login(account,credential,expectedRevision)
    }
    suspend fun login(account:String,credential:LoginCredential,expectedRevision:Long,
        onReserved:(AccountLoginReceipt)->Unit={}):AccountLoginReceipt {
        if(!account.matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))||!credential.valid)throw ApiFailure(400,"请核对邮箱和登录信息")
        return establish("POST","/api/app/session",JSONObject().put("account",account).put("pin",credential.pin)
            .put("verify",credential.mode.wire).put("language","zh-CN").put("system","android"),expectedRevision,onReserved)
    }

    suspend fun register(email:String,password:String,captcha:String,region:String,expectedRevision:Long,onReserved:(AccountLoginReceipt)->Unit={}) {
        AccountInput.requirePassword(password,password)
        if(!email.matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))||!captcha.matches(Regex("[0-9]{6}"))||region !in java.util.Locale.getISOCountries()) throw ApiFailure(400,"注册信息无效")
        establish("PUT","/api/app/user",JSONObject().put("account",email).put("password",password).put("type","email")
            .put("captcha",captcha).put("regionCode",region).put("system","android").put("language","zh-CN"),expectedRevision,onReserved)
    }

    private suspend fun establish(method:String,path:String,body:JSONObject,expectedRevision:Long,onReserved:(AccountLoginReceipt)->Unit):AccountLoginReceipt {
        currentCoroutineContext().ensureActive()
        val expected = mutex.withLock {
            currentCoroutineContext().ensureActive()
            requireNoPendingLogoutCleanup()
            if(expectedRevision!=context.revision) throw ApiFailure(499,"会话已变化")
            // Ownership spans physical clear + publication/receipt even if the caller is cancelled.
            withContext(NonCancellable) {clearLocked(expectedRevision);onReserved(AccountLoginReceipt(context.revision))}
            currentCoroutineContext().ensureActive()
            context.revision
        }
        currentCoroutineContext().ensureActive()
        val dispatched=context
        if(dispatched.revision!=expected||dispatched.session!=null||dispatched.cleanupRequired)throw ApiFailure(499,"会话已变化")
        val response = http.request(method,path,body,null)
        currentCoroutineContext().ensureActive()
        val value = AccountSession.decode(response.getJSONObject("data"))
        persistSession(value,expected,onCompensated=onReserved)
        val committed=context
        if(committed.revision!=expected||committed.session==null||committed.cleanupRequired)throw ApiFailure(499,"会话已变化")
        return AccountLoginReceipt(expected) // Native publication is the commit point; no UI-cancel logout.
    }

    suspend fun restore() {
        currentCoroutineContext().ensureActive()
        requireNoPendingLogoutCleanup()
        val started = context
        val expected = started.revision
        if (started.session != null) {
            refreshContext(started, null)
            return
        }
        try {
            val stored = readStored() ?: return
            val value = AccountSession.decode(JSONObject(stored))
            val installed = mutex.withLock {
                requireNoPendingLogoutCleanup()
                if (expected != revision) return
                if (context.session == null) context = context.copy(session = value,credentialPublication=Any(),settingsPublication=context.settingsPublication+1)
                context
            }
            refreshContext(installed, null)
        } catch (error: kotlinx.coroutines.CancellationException) {
            throw error
        } catch(error:AccountLogoutCleanupFailure) {
            throw error
        } catch (_: Exception) {
            mutex.withLock {
                requireNoPendingLogoutCleanup()
                if (revision == expected) clearLocked(expected)
            }
        }
    }

    suspend fun refresh(ifAccessToken: String? = null) = refreshContext(context, ifAccessToken)

    private suspend fun refreshContext(requested: AccountContext, ifAccessToken: String?) = withContext(refreshOwner.coroutineContext) {
      refreshMutex.withLock {
        requireNoPendingLogoutCleanup()
        val live = context
        val expected = requested.revision
        if (live.revision != expected) throw ApiFailure(499, "会话已变化")
        val current = live.session ?: throw ApiFailure(401, "请先登录")
        // A completed overlapping renewal differs even with identical token text.
        // A settings-only publication must not suppress the necessary renewal.
        if (live.credentialPublication !== requested.credentialPublication) return@withLock
        if (ifAccessToken != null && current.accessToken != ifAccessToken) return@withLock
        try {
            val result = http.request("PATCH", "/api/app/session", JSONObject()
                .put("userID", current.userId).put("refreshToken", current.refreshToken), null).getJSONObject("data")
            result.put("userID", current.userId)
            if (!result.has("setting")) result.put("setting", current.settings())
            if (!result.has("tokenType")) result.put("tokenType", current.tokenType)
            if (!result.has("expiresIn")) result.put("expiresIn", current.expiresIn)
            val next = AccountSession.decode(result)
            persistSession(next,expected,refreshStarted=live)
        } catch (error: kotlinx.coroutines.CancellationException) {
            throw error
        } catch (error: Exception) {
            mutex.withLock {
                requireNoPendingLogoutCleanup()
                if (expected == revision) clearLocked(expected)
            }
            throw error
        }
      }
    }

    suspend fun logout(expectedRevision:Long?=null):AccountLogoutResult {
        currentCoroutineContext().ensureActive()
        requireNoPendingLogoutCleanup()
        val started = context
        if(expectedRevision!=null&&started.revision!=expectedRevision)throw ApiFailure(499,"会话已变化")
        val expected = started.revision
        val outcome=if(started.session==null) AccountLogoutResult.NO_LOCAL_SESSION else try {
            http.request("DELETE", "/api/app/session", null, started.session.accessToken)
            AccountLogoutResult.SERVER_CONFIRMED
        }catch(error:ApiFailure) {
            currentCoroutineContext().ensureActive()
            if(expected!=revision)throw ApiFailure(499,"会话已变化")
            if(error.code!=401)throw error
            AccountLogoutResult.ALREADY_UNAUTHENTICATED
        }
        currentCoroutineContext().ensureActive()
        return mutex.withLock {
            requireNoPendingLogoutCleanup()
            if (expected != revision) throw ApiFailure(499, "会话已变化")
            try {clearLocked(expected)}
            catch(error:kotlinx.coroutines.CancellationException) {throw error}
            catch(_:LocalSessionCleanupFailure) {throw AccountLogoutCleanupFailure(context.revision)}
            outcome
        }
    }

    /** Only retry disk deletion. Never resend a possibly accepted DELETE. */
    suspend fun retryLogoutCleanup(expectedRevision:Long)=mutex.withLock {
        currentCoroutineContext().ensureActive()
        if(revision!=expectedRevision||pendingLogoutCleanupRevision!=expectedRevision||session!=null)throw ApiFailure(499,"会话已变化")
        try {writeStored(null)}catch(error:Exception) {throw AccountLogoutCleanupFailure(expectedRevision)}
        context=context.copy(cleanupRequired=false)
    }

    /** Cache only a complete, read-back-confirmed settings object; never an old session copy. */
    suspend fun commitSettings(expectedRevision:Long,settingsJson:String,expectedSettingsPublication:Long?=null) {
        val normalized=withContext(Dispatchers.Default) {JSONObject(settingsJson).toString()}
        mutex.withLock {
            currentCoroutineContext().ensureActive()
            val live=context
            if(live.revision!=expectedRevision||live.cleanupRequired||live.session==null)throw ApiFailure(499,"会话已变化")
            if(expectedSettingsPublication!=null&&live.settingsPublication!=expectedSettingsPublication)
                throw ApiFailure(409,"设置已变化，请重新读取")
            val updated=live.session.copy(settingsJson=normalized)
            // Once physical persistence starts it cannot be revoked. Publish its result
            // before another account can enter; cancellation affects the waiter afterward.
            withContext(NonCancellable) {
                writeStored(updated.encode())
                context=live.copy(session=updated,settingsPublication=live.settingsPublication+1)
            }
        }
        currentCoroutineContext().ensureActive()
    }

    suspend fun request(method: String, path: String, body: JSONObject? = null, expectedRevision:Long?=null, allowReadReplay:Boolean=true): JSONObject {
        currentCoroutineContext().ensureActive()
        val started = context
        // The intent's revision and authentication token must use this SAME immutable capture.
        // A repository precheck alone can race another thread switching accounts.
        if(expectedRevision!=null&&started.revision!=expectedRevision)throw ApiFailure(499,"会话已变化")
        if(started.cleanupRequired)throw AccountLogoutCleanupFailure(started.revision)
        val current = started.session ?: throw ApiFailure(401, "请先登录")
        val expected = started.revision
        val response = try {
            http.request(method, path, body, current.accessToken)
        } catch (error: ApiFailure) {
            currentCoroutineContext().ensureActive()
            if(revision!=expected)throw ApiFailure(499,"会话已变化")
            // Mutations are not replayed: server acceptance may be unknown.
            // Some GET routes generate credentials (SHARE-01), so their owner opts out.
            if (!allowReadReplay || error.code != 401 || method != "GET" || revision != expected) throw error
            refreshContext(started, current.accessToken)
            val refreshed = context
            if (refreshed.revision != expected) throw ApiFailure(499, "会话已变化")
            currentCoroutineContext().ensureActive()
            try {
                http.request(method, path, body, refreshed.session?.accessToken ?: throw ApiFailure(401, "请先登录"))
            }catch(rejected:ApiFailure) {
                if(rejected.code==401) mutex.withLock {
                    requireNoPendingLogoutCleanup()
                    if(expected==revision)clearLocked(expected)
                }
                throw rejected
            }
        }
        currentCoroutineContext().ensureActive()
        if (expected != revision) throw ApiFailure(499, "会话已变化")
        return response
    }
}

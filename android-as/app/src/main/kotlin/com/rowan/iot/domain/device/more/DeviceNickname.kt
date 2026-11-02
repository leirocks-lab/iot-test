package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.device.AuthorizedDevice
import com.rowan.iot.domain.device.state.DeviceReadHandle
import java.security.MessageDigest
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.flow.StateFlow

/** No default role matrix, trim, character counter or empty-string normalization. */
fun interface NicknamePolicy {fun permits(proof:AuthorizedDevice,exactTarget:String):Boolean}
class NicknameBinding(val scope:DeviceMoreScope,val handle:DeviceReadHandle,val pageCurrent:()->Boolean) {
    override fun toString()="NicknameBinding(redacted)"
}
enum class NicknamePhase { UNKNOWN, CONFIRMED, REJECTED }
class NicknameRecord(
    val key:String,val operationId:String,val userId:String,val resourceId:String,val productId:String,
    val target:String,val phase:NicknamePhase=NicknamePhase.UNKNOWN,val errorCode:String="",
) {
    fun terminal(phase:NicknamePhase,error:String="")=NicknameRecord(key,operationId,userId,resourceId,productId,target,phase,error)
    override fun toString()="NicknameRecord(phase=$phase,redacted)"
}
/** Stable cross-process identity; revision remains a per-execution authorization fence. */
fun nicknameKey(userId:String,resourceId:String):String {
    val digest=MessageDigest.getInstance("SHA-256")
    for(value in listOf("rowan.nickname.v1",userId,resourceId)) {
        val bytes=value.toByteArray(Charsets.UTF_8)
        digest.update(byteArrayOf((bytes.size ushr 24).toByte(),(bytes.size ushr 16).toByte(),(bytes.size ushr 8).toByte(),bytes.size.toByte()))
        digest.update(bytes)
    }
    return digest.digest().joinToString(""){"%02x".format(it)}
}
/**
 * Implementations MUST atomically reserve, retain unresolved records across process death,
 * and CAS terminal commits by operationId. No memory-only production fallback is permitted.
 */
interface NicknameJournal {
    suspend fun load(key:String):NicknameRecord?
    suspend fun reserve(candidate:NicknameRecord):NicknameRecord
    suspend fun complete(record:NicknameRecord):Boolean
}
interface NicknameRepository {
    val scope:DeviceMoreScope
    suspend fun patch(nickname:String)
    /** Null means absent/wrong type; never a fallback name or confirmed empty. */
    suspend fun readNickname():String?
}
class NicknameView(val operationId:String,val state:String,val confirmedNickname:String="",val errorCode:String="") {
    override fun toString()="NicknameView(state=$state,errorCode=$errorCode,redacted)"
}
/** Only awaiting can be cancelled by a page; the app-owned Deferred is never exposed. */
class NicknameTask internal constructor(val state:StateFlow<NicknameView>,private val result:Deferred<NicknameView>) {
    suspend fun await():NicknameView=result.await()
}

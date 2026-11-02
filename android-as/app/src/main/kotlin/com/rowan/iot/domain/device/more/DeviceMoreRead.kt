package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.network.ApiFailure
import java.io.IOException

/** Native ownership proof for one read intent, never a write permit. */
data class DeviceMoreScope(val accountRevision:Long,val resourceId:String,val userId:String,val productId:String)

data class DeviceMoreSummary(
    val deviceNickname:String,val deviceName:String,val productName:String,val productCategory:String,
    val seriesName:String,val modelName:String,val mcuVersion:String,val wifiVersion:String,val bindingRole:String,
)
/** itemKey is a local display token, unrelated to backend member/article identities. */
data class DeviceMoreMember(val itemKey:String,val nickname:String,val bindingRole:String)
/** Content is ordinary text; this contract grants no HTML or URL execution. */
data class DeviceMoreHelp(val itemKey:String,val title:String,val content:String,val createdAt:String)
data class DeviceMoreLocation(val assignment:String,val roomName:String)

interface DeviceMoreReadRepository {
    val scope:DeviceMoreScope
    suspend fun summary():DeviceMoreSummary
    suspend fun members():List<DeviceMoreMember>
    suspend fun help():List<DeviceMoreHelp>
}

/** Fixed public vocabulary. No server text, request path or original cause escapes. */
class DeviceMoreReadFailure private constructor(val code:String,message:String,internal val ownershipRevoked:Boolean=false):Exception(message) {
    companion object {
        internal fun sessionChanged()=DeviceMoreReadFailure("session_changed","登录会话已变化，请重新进入设备")
        internal fun readFailed()=DeviceMoreReadFailure("read_failed","设备信息读取失败，请重试")
        internal fun forbidden()=DeviceMoreReadFailure("forbidden","当前账号无权访问该设备")
        internal fun lostOwnership()=DeviceMoreReadFailure("forbidden","当前账号无权访问该设备",true)
        internal fun unavailable()=DeviceMoreReadFailure("unavailable","设备信息暂时不可用，请稍后重试")
        internal fun from(error:Exception):DeviceMoreReadFailure=when {
            error is DeviceMoreReadFailure->error
            error is ApiFailure&&error.code==499->sessionChanged()
            error is ApiFailure&&error.code in setOf(1342,1352,1402,1452)->lostOwnership()
            error is ApiFailure&&error.code==403->forbidden()
            error is IOException->unavailable()
            else->readFailed()
        }
    }
}

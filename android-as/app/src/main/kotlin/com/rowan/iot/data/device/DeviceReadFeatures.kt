package com.rowan.iot.data.device

import com.rowan.iot.data.http.HttpDeviceAccess
import com.rowan.iot.data.http.HttpOtaRepository
import com.rowan.iot.data.http.HttpSchedulesRepository
import com.rowan.iot.data.mqtt.auth.ExpiryEncoding
import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.AuthorizedDevice
import com.rowan.iot.domain.device.DeviceAccessGateway
import com.rowan.iot.domain.device.ota.OtaKind
import com.rowan.iot.domain.device.ota.OtaRepository
import com.rowan.iot.domain.device.ota.OtaScope
import com.rowan.iot.domain.device.schedules.ScheduleScope
import com.rowan.iot.domain.device.schedules.SchedulesRepository
import com.rowan.iot.domain.network.ApiFailure
import java.io.IOException
import java.util.Collections
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.StateFlow

/** Display-only data. itemKey has no relationship to a write-authorized schedule ID. */
data class DeviceScheduleSummary(
    val itemKey:String,
    val name:String?,
    val type:String,
    val startTime:String?,
    val repeatType:String,
    val weekdays:List<Int>,
    val timeZone:String?,
    val nextExecutionAt:String?,
    val enabledState:String,
)

/** Candidate information only: no decision, firmware ID, current version or task control. */
data class DeviceFirmwareOffer(val kind:String,val version:String,val remark:String?,val deviceName:String)

/** A closed fixed vocabulary. No backend message, path, JSON or exception cause escapes. */
class DeviceReadFeatureFailure private constructor(val code:String,message:String,internal val ownershipRevoked:Boolean=false):Exception(message) {
    companion object {
        internal fun sessionChanged()=DeviceReadFeatureFailure("session_changed","登录会话已变化，请重新进入设备")
        internal fun readFailed()=DeviceReadFeatureFailure("read_failed","设备信息读取失败，请重试")
        internal fun unavailable()=DeviceReadFeatureFailure("unavailable","设备信息暂时不可用，请稍后重试")
        internal fun forbidden()=DeviceReadFeatureFailure("forbidden","暂无此设备的访问权限，请返回")
        internal fun lostOwnership()=DeviceReadFeatureFailure("forbidden","暂无此设备的访问权限，请返回",true)
    }
}

/**
 * Native read composition for an already-held observation. The caller still owns
 * observation/page lifetime, in-flight limits and final publication fencing. Every
 * invocation independently re-authorizes membership; this class owns no login,
 * credential, action permit, task or raw-response cache. It never requests MQTT
 * credentials and never calls any mutation repository operation.
 */
class DeviceReadFeatures(
    private val accountContexts:StateFlow<AccountContext>,
    private val access:DeviceAccessGateway,
    private val schedulesRepository:(ScheduleScope)->SchedulesRepository,
    private val otaRepository:(OtaScope)->OtaRepository,
) {
    constructor(account:AccountService):this(account.contexts,HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN),
        {HttpSchedulesRepository(account,it)},{HttpOtaRepository(account,it)})

    suspend fun schedules(deviceId:String,accountRevision:Long):List<DeviceScheduleSummary> =
        read(deviceId,accountRevision) {device,userId->
            val scope=ScheduleScope(accountRevision,deviceId,device.productId,null)
            val repository=schedulesRepository(scope)
            if(repository.scope!=scope)throw DeviceReadFeatureFailure.readFailed()
            requireCurrent(accountRevision,userId)
            val records=repository.load()
            requireCurrent(accountRevision,userId)
            if(records.any {it.scope!=scope}||records.map {it.id}.toSet().size!=records.size)
                throw DeviceReadFeatureFailure.readFailed()
            val summaries=records.map {record->
                DeviceScheduleSummary("item-${displaySequence.incrementAndGet()}",record.name,record.type?.wire?:"unknown",
                    record.startTime,record.repeatType?.wire?:"unknown",
                    Collections.unmodifiableList(record.weekdays?.toList()?:emptyList()),record.timeZone,record.nextExecutionAt,
                    when(record.enabled) {true->"enabled";false->"disabled";null->"unknown"})
            }
            requireCurrent(accountRevision,userId)
            Collections.unmodifiableList(summaries)
        }

    suspend fun firmware(deviceId:String,accountRevision:Long,kind:String):DeviceFirmwareOffer {
        val selected=OtaKind.entries.firstOrNull {it.wire==kind}?:throw DeviceReadFeatureFailure.readFailed()
        return read(deviceId,accountRevision) {_,userId->
            val scope=OtaScope(accountRevision,deviceId,userId)
            val repository=otaRepository(scope)
            if(repository.scope!=scope)throw DeviceReadFeatureFailure.readFailed()
            requireCurrent(accountRevision,userId)
            val offer=repository.check(selected)
            requireCurrent(accountRevision,userId)
            if(offer.kind!=selected||offer.device.id!=deviceId||!validText(offer.firmware.version)||!validText(offer.device.name))
                throw DeviceReadFeatureFailure.readFailed()
            DeviceFirmwareOffer(selected.wire,offer.firmware.version,offer.firmware.remark,offer.device.name)
        }
    }

    private suspend fun <T> read(deviceId:String,accountRevision:Long,work:suspend(AuthorizedDevice,String)->T):T {
        currentCoroutineContext().ensureActive()
        val source=accountContexts.value
        val userId=source.session?.userId
        if(accountRevision<0||source.revision!=accountRevision||source.cleanupRequired||userId==null)
            throw DeviceReadFeatureFailure.sessionChanged()
        if(!validText(deviceId)||deviceId=="."||deviceId=="..")throw DeviceReadFeatureFailure.readFailed()
        try {
            val proof=try {access.authorize(deviceId,accountRevision)} catch(error:ApiFailure) {
                if(error.code==403||error.code==1342)throw DeviceReadFeatureFailure.lostOwnership()
                throw error
            }
            requireCurrent(accountRevision,userId)
            if(proof.accountRevision!=accountRevision||proof.resourceId!=deviceId||proof.userId!=userId||!validText(proof.productId))
                throw DeviceReadFeatureFailure.readFailed()
            val result=work(proof,userId)
            requireCurrent(accountRevision,userId)
            return result
        }catch(error:CancellationException) {throw error}
        catch(error:Exception) {
            // Prefer the current authoritative account state over any late backend
            // error. Do not hold a second session or attach the original exception.
            requireCurrent(accountRevision,userId)
            throw when {
                error is DeviceReadFeatureFailure->error
                error is ApiFailure&&error.code==499->DeviceReadFeatureFailure.sessionChanged()
                error is ApiFailure&&error.code in setOf(1332,1342,1492,1502)->DeviceReadFeatureFailure.lostOwnership()
                error is ApiFailure&&error.code==403->DeviceReadFeatureFailure.forbidden()
                error is IOException->DeviceReadFeatureFailure.unavailable()
                else->DeviceReadFeatureFailure.readFailed()
            }
        }
    }
    private suspend fun requireCurrent(accountRevision:Long,userId:String) {
        currentCoroutineContext().ensureActive()
        val source=accountContexts.value
        if(source.revision!=accountRevision||source.cleanupRequired||source.session?.userId!=userId)
            throw DeviceReadFeatureFailure.sessionChanged()
    }
    private fun validText(value:String)=value.isNotBlank()&&value.none {it.isISOControl()}
    private companion object {val displaySequence=AtomicLong()}
}

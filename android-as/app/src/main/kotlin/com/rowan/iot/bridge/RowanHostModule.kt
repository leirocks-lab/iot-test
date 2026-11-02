package com.rowan.iot.bridge

import android.app.Activity
import android.app.Application
import android.os.Bundle
import com.facebook.react.bridge.*
import com.rowan.iot.MainApplication
import com.rowan.iot.domain.device.state.*
import com.rowan.iot.rnhost.DeviceActivity
import java.lang.ref.WeakReference
import java.util.UUID
import kotlinx.coroutines.*

class RowanHostModule(context: ReactApplicationContext) : NativeRowanHostSpec(context),Application.ActivityLifecycleCallbacks {
    private val application=context.applicationContext as MainApplication
    private val scope=CoroutineScope(SupervisorJob()+Dispatchers.Main.immediate)
    @Volatile private var invalidated=false
    private class Binding(activity:DeviceActivity,val handle:DeviceReadHandle,val projection:DeviceBridgeProjection) {
        val activity=WeakReference(activity)
        var job:Job?=null
        val featureJobs=mutableSetOf<Job>()
        val unbindLive=java.util.concurrent.atomic.AtomicBoolean(activity.nativeResumed)
        var unbindRegistration:com.rowan.iot.domain.device.more.NativeSelfUnbindRegistration?=null
        var unbindContext:SelfUnbindBridgeContext?=null
        val gate=DeviceEventGate(activity.nativeResumed)
    }
    // Registry and lifecycle operations run only on the UI queue.
    private val observations=mutableMapOf<String,Binding>()
    private val selfUnbindBridge=DeviceSelfUnbindBridge(scope,::selfUnbindContext,{title,yes,no->
        val activity=reactApplicationContext.currentActivity as? DeviceActivity?:throw IllegalStateException("page unavailable")
        val dialog=android.app.AlertDialog.Builder(activity).setTitle("解除设备关联")
            .setMessage("是否解除当前账号与“${title}”的关联？")
            .setNegativeButton("取消"){_,_->no()}.setPositiveButton("解除关联"){_,_->yes()}
            .setOnCancelListener {no()}.create()
        dialog.show();AutoCloseable {dialog.dismiss()}
    },knownObservation={id->!invalidated&&observations.containsKey(id)})
    private fun unbindPageCurrent(id:String,binding:Binding):Boolean {
        val activity=binding.activity.get()
        return observations[id]===binding&&permitted(activity)&&activity?.nativeResumed==true&&reactApplicationContext.currentActivity===activity
    }
    private fun selfUnbindContext(id:String):SelfUnbindBridgeContext? {
        val binding=observations[id]?:return null
        binding.unbindLive.set(unbindPageCurrent(id,binding))
        if(!binding.unbindLive.get())return null
        binding.unbindContext?.let {return it}
        val activity=binding.activity.get()?:return null
        val registration=application.services.selfUnbind.register(binding.handle,activity.accountRevision){!invalidated&&binding.unbindLive.get()&&binding.activity.get()?.nativeResumed==true}?:return null
        binding.unbindRegistration=registration
        return SelfUnbindBridgeContext(id,activity.accountRevision,{unbindPageCurrent(id,binding)},
            {(binding.handle.state.value as? DeviceObservationState.Current)?.snapshot?.metadata?.title?:"此设备"},
            {application.services.selfUnbind.inspect(registration)},
            {application.services.selfUnbind.begin(registration,UUID.randomUUID().toString()).state.value}).also {binding.unbindContext=it}
    }
    override fun requestDeviceSelfUnbind(observationId:String,attemptId:String,promise:Promise) {
        reactApplicationContext.runOnUiQueueThread {selfUnbindBridge.request(observationId,attemptId){promise.resolve(it.toMap())}}
    }
    override fun cancelDeviceSelfUnbindConfirmation(observationId:String,attemptId:String) {
        reactApplicationContext.runOnUiQueueThread {selfUnbindBridge.cancel(observationId,attemptId)}
    }
    override fun getDeviceSelfUnbindState(observationId:String,promise:Promise) {
        reactApplicationContext.runOnUiQueueThread {selfUnbindBridge.get(observationId){promise.resolve(it.toMap())}}
    }
    init {application.registerActivityLifecycleCallbacks(this)}
    override fun getName() = NAME
    override fun getContext(promise: Promise) {
        if(invalidated) {promise.reject("closed","宿主已关闭");return}
        val account = (reactApplicationContext.applicationContext as MainApplication).services.account.contextSnapshot()
        promise.resolve(Arguments.createMap().apply {
            putDouble("bridgeMajor", 3.0)
            putDouble("selfUnbindVersion",1.0)
            putDouble("sessionRevision", account.revision.toDouble())
            putBoolean("authenticated", account.session != null&&!account.cleanupRequired)
            putString("language", account.session?.language ?: "zh-CN")
        })
    }
    override fun observeDevice(deviceId: String, promise: Promise) {
        reactApplicationContext.runOnUiQueueThread {
            val activity=reactApplicationContext.currentActivity as? DeviceActivity
            if(!permitted(activity,deviceId)) {promise.reject("session_changed","设备页面会话已失效");return@runOnUiQueueThread}
            if(observations.size>=8) {promise.reject("unavailable","设备观察数量已达上限，请返回后重试");return@runOnUiQueueThread}
            val owner=activity!!
            val id=UUID.randomUUID().toString()
            val handle=application.services.devices.observe(deviceId,id)
            val projection=DeviceBridgeProjection(deviceId,id,owner.accountRevision)
            val binding=Binding(owner,handle,projection)
            observations[id]=binding
            val initial=projection.accept(handle.state.value)
            binding.job=scope.launch {
                handle.state.collect {state->
                    if(!permitted(binding.activity.get()))binding.featureJobs.toList().forEach {it.cancel()}
                    val previous=projection.current()
                    val next=projection.accept(if(permitted(binding.activity.get()))state
                        else DeviceObservationState.Closed(DeviceReadCloseReason.ACCOUNT_CHANGED))
                    if(next!=previous)com.rowan.iot.rnhost.RnStartupTrace.deviceRead(next.phase,next.snapshotAvailable,next.connectionEpoch,next.revision)
                    if(observations[id]===binding&&next!=previous)binding.gate.offer(next)?.let {emitOnDeviceChanged(it.toMap())}
                }
            }
            promise.resolve(initial.toMap())
        }
    }
    private fun permitted(activity:DeviceActivity?,deviceId:String?=null):Boolean = !invalidated&&scope.isActive&&activity!=null&&
        !activity.isFinishing&&!activity.isDestroyed&&activity.authorizedContext()&&(deviceId==null||activity.deviceId==deviceId)
    override fun getDeviceSnapshot(observationId:String,promise:Promise) {
        reactApplicationContext.runOnUiQueueThread {
            val binding=observations[observationId]
            if(binding==null) {promise.reject("closed","设备观察已释放");return@runOnUiQueueThread}
            val state=if(permitted(binding.activity.get()))binding.handle.state.value
                else DeviceObservationState.Closed(DeviceReadCloseReason.ACCOUNT_CHANGED)
            promise.resolve(binding.projection.accept(state).toMap())
        }
    }
    override fun retryObservation(observationId:String) {
        reactApplicationContext.runOnUiQueueThread {observations[observationId]?.let {if(permitted(it.activity.get()))it.handle.retry()}}
    }
    override fun acknowledgeDeviceEvent(observationId:String,revision:Double) {
        if(!revision.isFinite()||revision<0||revision>9_007_199_254_740_991.0||revision%1.0!=0.0)return
        reactApplicationContext.runOnUiQueueThread {
            val binding=observations[observationId]?:return@runOnUiQueueThread
            if(!permitted(binding.activity.get())) {
                val closed=binding.projection.accept(DeviceObservationState.Closed(DeviceReadCloseReason.ACCOUNT_CHANGED))
                binding.gate.offer(closed)?.let {emitOnDeviceChanged(it.toMap())}
            }
            binding.gate.acknowledge(revision.toLong())?.let {emitOnDeviceChanged(it.toMap())}
        }
    }
    override fun getDeviceSchedules(observationId:String,promise:Promise) = featureRead(observationId,promise) {activity->
        val rows=application.services.deviceReadFeatures.schedules(activity.deviceId,activity.accountRevision)
        Arguments.createArray().apply {rows.forEach {row->pushMap(Arguments.createMap().apply {
            putString("itemKey",row.itemKey);putString("name",row.name.orEmpty())
            putString("type",row.type);putString("startTime",row.startTime.orEmpty())
            putString("repeatType",row.repeatType);putString("timeZone",row.timeZone.orEmpty())
            putString("nextExecutionAt",row.nextExecutionAt.orEmpty());putString("enabledState",row.enabledState)
            putArray("weekdays",Arguments.createArray().apply {row.weekdays.forEach(::pushInt)})
        })}}
    }
    override fun getDeviceFirmware(observationId:String,kind:String,promise:Promise) {
        if(kind!="mcu"&&kind!="wifi") {promise.reject("invalid_argument","固件类型无效");return}
        featureRead(observationId,promise) {activity->
            val offer=application.services.deviceReadFeatures.firmware(activity.deviceId,activity.accountRevision,kind)
            Arguments.createMap().apply {
                putString("kind",offer.kind);putString("version",offer.version)
                putString("remark",offer.remark.orEmpty());putString("deviceName",offer.deviceName)
            }
        }
    }
    override fun getDeviceMoreSummary(observationId:String,promise:Promise) = featureRead(observationId,promise) {activity->
        val value=application.services.deviceMoreReadFeatures.summary(activity.deviceId,activity.accountRevision)
        Arguments.createMap().apply {
            putString("deviceNickname",value.deviceNickname);putString("deviceName",value.deviceName)
            putString("productName",value.productName);putString("productCategory",value.productCategory)
            putString("seriesName",value.seriesName);putString("modelName",value.modelName)
            putString("mcuVersion",value.mcuVersion);putString("wifiVersion",value.wifiVersion)
            putString("bindingRole",value.bindingRole)
        }
    }
    override fun getDeviceMembers(observationId:String,promise:Promise) = featureRead(observationId,promise) {activity->
        val rows=application.services.deviceMoreReadFeatures.members(activity.deviceId,activity.accountRevision)
        Arguments.createArray().apply {rows.forEach {row->pushMap(Arguments.createMap().apply {
            putString("itemKey",row.itemKey);putString("nickname",row.nickname);putString("bindingRole",row.bindingRole)
        })}}
    }
    override fun getDeviceHelp(observationId:String,promise:Promise) = featureRead(observationId,promise) {activity->
        val rows=application.services.deviceMoreReadFeatures.help(activity.deviceId,activity.accountRevision)
        Arguments.createArray().apply {rows.forEach {row->pushMap(Arguments.createMap().apply {
            putString("itemKey",row.itemKey);putString("title",row.title)
            putString("content",row.content);putString("createdAt",row.createdAt)
        })}}
    }
    override fun getDeviceLocation(observationId:String,promise:Promise) = featureRead(observationId,promise) {activity->
        val value=application.services.deviceMoreReadFeatures.location(activity.deviceId,activity.accountRevision)
        Arguments.createMap().apply {putString("assignment",value.assignment);putString("roomName",value.roomName)}
    }
    private fun featureCurrent(id:String,binding:Binding):Boolean = observations[id]===binding&&
        permitted(binding.activity.get())&&deviceFeatureReadAllowed(binding.handle.state.value)
    /** Only the current native page can use its observation; no device-ID RPC from RN. */
    private fun featureRead(id:String,promise:Promise,read:suspend (DeviceActivity)->Any) {
        reactApplicationContext.runOnUiQueueThread {
            val binding=observations[id]
            val activity=binding?.activity?.get()
            if(binding==null||!permitted(activity)) {
                promise.reject("closed","设备页面会话已失效");return@runOnUiQueueThread
            }
            if(!featureCurrent(id,binding)) {
                val forbidden=binding.handle.state.value is DeviceObservationState.Current
                promise.reject(if(forbidden)"forbidden" else "closed",
                    if(forbidden)"暂无此设备的访问权限，请返回" else "设备观察已关闭")
                return@runOnUiQueueThread
            }
            if(binding.featureJobs.size>=2) {
                promise.reject("unavailable","读取正在进行，请稍后重试");return@runOnUiQueueThread
            }
            val authority=application.services.devices.captureFeatureAuthority(binding.handle)
            if(authority==null){promise.reject("closed","设备授权正在重新核对，请稍后重试");return@runOnUiQueueThread}
            fun readCurrent()=featureCurrent(id,binding)&&application.services.devices.featureReadCurrent(binding.handle,authority)
            val request=bridgeReadTask(scope,{readCurrent()}, {result->
                when(result) {
                    is BridgeReadResult.Success->promise.resolve(result.value)
                    is BridgeReadResult.Failure->promise.reject(result.code,when(result.code) {
                        "timeout"->"读取超时，请重试";"closed"->"读取已结束"
                        "session_changed"->"设备页面会话已失效";"forbidden"->"暂无此设备的访问权限，请返回"
                        else->"暂时无法读取，请重试"
                    })
                }
            },failureCode={error->
                val lostOwnership=when(error) {
                    is com.rowan.iot.data.device.DeviceReadFeatureFailure->error.ownershipRevoked
                    is com.rowan.iot.domain.device.more.DeviceMoreReadFailure->error.ownershipRevoked
                    else->false
                }
                if(lostOwnership&&readCurrent())
                    application.services.devices.revokeOwnership(binding.handle)
                when(error) {
                is com.rowan.iot.data.device.DeviceReadFeatureFailure->error.code
                is com.rowan.iot.domain.device.more.DeviceMoreReadFailure->error.code
                else->"read_failed"
            }}) {read(activity!!)}
            binding.featureJobs.add(request)
            request.invokeOnCompletion {binding.featureJobs.remove(request)}
            request.start()
        }
    }
    private fun release(id:String) {observations.remove(id)?.let {
        it.unbindLive.set(false);selfUnbindBridge.release(id);it.unbindRegistration?.close();it.unbindRegistration=null;it.unbindContext=null
        it.gate.close();it.job?.cancel();it.featureJobs.toList().forEach {job->job.cancel()};it.handle.close()
    }}
    override fun releaseObservation(observationId:String) {reactApplicationContext.runOnUiQueueThread {release(observationId)}}
    override fun closeDevice(pageSessionId:String) {
        reactApplicationContext.runOnUiQueueThread {
            val activity=reactApplicationContext.currentActivity as? DeviceActivity
            if(canCloseDevicePage(pageSessionId,activity?.pageSessionId,permitted(activity),activity?.nativeResumed==true))activity?.finish()
        }
    }
    override fun invalidate() {
        invalidated=true
        application.unregisterActivityLifecycleCallbacks(this)
        reactApplicationContext.runOnUiQueueThread {selfUnbindBridge.close();observations.keys.toList().forEach(::release);scope.cancel()}
        super.invalidate()
    }
    override fun onActivityDestroyed(activity:Activity) {observations.filterValues {it.activity.get()===activity}.keys.toList().forEach(::release)}
    override fun onActivityStopped(activity:Activity) {observations.values.filter {it.activity.get()===activity}.forEach {it.gate.visibility(false)}}
    override fun onActivityResumed(activity:Activity) {
        observations.values.forEach {it.unbindLive.set(it.activity.get()===activity&&permitted(it.activity.get())&&reactApplicationContext.currentActivity===activity)}
        observations.values.filter {it.activity.get()===activity}.forEach {
            val state=it.projection.accept(it.handle.state.value)
            if(permitted(it.activity.get())) {
                it.gate.offer(state)?.let {snapshot->emitOnDeviceChanged(snapshot.toMap())}
                it.gate.visibility(true)?.let {snapshot->emitOnDeviceChanged(snapshot.toMap())}
            }
        }
    }
    override fun onActivityCreated(activity:Activity,state:Bundle?)=Unit
    override fun onActivityStarted(activity:Activity)=Unit
    override fun onActivityPaused(activity:Activity) {observations.filterValues {it.activity.get()===activity}.forEach {(id,binding)->binding.unbindLive.set(false);selfUnbindBridge.suspendObservation(id);binding.gate.visibility(false)}}
    override fun onActivitySaveInstanceState(activity:Activity,state:Bundle)=Unit
    companion object { const val NAME = "NativeRowanHost" }
}

private fun DeviceBridgeSnapshot.toMap():WritableMap=Arguments.createMap().apply {
    putString("deviceId",deviceId);putString("observationId",observationId)
    putDouble("sessionRevision",sessionRevision.toDouble());putDouble("revision",revision.toDouble())
    putDouble("authorityRevision",authorityRevision.toDouble());putDouble("connectionEpoch",connectionEpoch.toDouble())
    putString("title",title);putString("productCategory",productCategory);putString("phase",phase)
    putString("online",online);putBoolean("stale",stale);putBoolean("snapshotAvailable",snapshotAvailable);putString("errorCode",errorCode)
}

private fun SelfUnbindBridgeState.toMap():WritableMap=Arguments.createMap().apply {
    putString("observationId",observationId);putDouble("sessionRevision",sessionRevision.toDouble());putDouble("revision",revision.toDouble())
    putString("status",status);putString("errorCode",errorCode);putBoolean("canRequest",canRequest)
}

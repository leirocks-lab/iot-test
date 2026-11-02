package com.rowan.iot.bridge

import com.rowan.iot.domain.device.state.*

/** Explicit allowlist: the native reported JSON, identity and credentials never enter this DTO. */
data class DeviceBridgeSnapshot(
    val deviceId:String,val observationId:String,val sessionRevision:Long,
    val revision:Long,val authorityRevision:Long,val connectionEpoch:Long,
    val title:String,val productCategory:String,val phase:String,val online:String,
    val stale:Boolean,val snapshotAvailable:Boolean,val errorCode:String,
)

class DeviceBridgeProjection(private val deviceId:String,private val observerId:String,private val accountRevision:Long) {
    private var latest:DeviceBridgeSnapshot?=null
    private var terminal=false
    @Synchronized fun current():DeviceBridgeSnapshot=checkNotNull(latest)
    @Synchronized fun accept(state:DeviceObservationState):DeviceBridgeSnapshot {
        if(terminal)return current()
        val previous=latest
        val candidate=when(state) {
            is DeviceObservationState.Closed->closed(when(state.reason) {
                DeviceReadCloseReason.NO_ACCOUNT->"not_authenticated"
                DeviceReadCloseReason.ACCOUNT_CHANGED->"session_changed"
                else->"closed"
            })
            is DeviceObservationState.Current->{
                val value=state.snapshot
                if(value.accountRevision!=accountRevision||value.resourceId!=deviceId)closed("session_changed")
                else if(previous!=null&&(value.authorityRevision<previous.authorityRevision||
                    value.connectionEpoch!=null&&value.connectionEpoch<previous.connectionEpoch))closed("invalid_snapshot")
                else {
                    val phase=when(value.phase) {
                        DeviceReadPhase.AUTHORIZING->"authorizing"
                        DeviceReadPhase.CONNECTING->"connecting"
                        DeviceReadPhase.READING->"reading"
                        DeviceReadPhase.LIVE->"live"
                        DeviceReadPhase.RECOVERING->"recovering"
                        else->"failed"
                    }
                    val error=when {
                        value.phase==DeviceReadPhase.FORBIDDEN->"forbidden"
                        value.failure==DeviceReadFailure.INITIALIZATION_TIMEOUT||value.failure==DeviceReadFailure.SNAPSHOT_TIMEOUT->"timeout"
                        value.failure!=null->"unavailable"
                        else->""
                    }
                    DeviceBridgeSnapshot(deviceId,observerId,accountRevision,previous?.revision?:0,
                        value.authorityRevision,value.connectionEpoch?:previous?.connectionEpoch?:0,
                        value.metadata?.title?:"",value.metadata?.category?:"",phase,
                        if(value.stale||!value.snapshotAvailable)"unknown" else when(value.online){true->"online";false->"offline";null->"unknown"},
                        value.stale,value.snapshotAvailable,error)
                }
            }
        }
        val result=if(previous!=null&&candidate!=previous)candidate.copy(revision=previous.revision+1) else candidate
        latest=result
        return result
    }
    private fun closed(error:String):DeviceBridgeSnapshot {
        terminal=true
        return DeviceBridgeSnapshot(deviceId,observerId,accountRevision,latest?.revision?:0,
            latest?.authorityRevision?:0,latest?.connectionEpoch?:0,"","","closed","unknown",true,false,error)
    }
}

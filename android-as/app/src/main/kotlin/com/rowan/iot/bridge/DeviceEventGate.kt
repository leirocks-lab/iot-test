package com.rowan.iot.bridge

/** UI-thread confined. At most one native→JS event closure and one latest pending DTO per handle. */
class DeviceEventGate(private var visible:Boolean) {
    private var pending:DeviceBridgeSnapshot?=null
    private var inFlight:Long?=null
    private var acknowledged=-1L
    private var closed=false
    fun offer(value:DeviceBridgeSnapshot):DeviceBridgeSnapshot? {
        if(closed||value.revision<=acknowledged)return null
        if(pending==null||value.revision>=pending!!.revision)pending=value
        return dispatch()
    }
    fun acknowledge(revision:Long):DeviceBridgeSnapshot? {
        if(closed||inFlight!=revision)return null
        acknowledged=revision;inFlight=null
        return dispatch()
    }
    fun visibility(value:Boolean):DeviceBridgeSnapshot? {visible=value;return dispatch()}
    private fun dispatch():DeviceBridgeSnapshot? {
        if(closed||!visible||inFlight!=null)return null
        val value=pending?:return null
        if(value.revision<=acknowledged) {pending=null;return null}
        pending=null;inFlight=value.revision
        return value
    }
    fun close() {closed=true;pending=null;inFlight=null}
}

package com.rowan.iot.rnhost

import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.rowan.iot.BuildConfig

/** Development-only phase timings. Never accepts account, device, URL or exception values. */
internal object RnStartupTrace {
    fun deviceRead(phase:String,snapshotAvailable:Boolean,epoch:Long,delivery:Long) {
        if(BuildConfig.FLAVOR!="development")return
        // All fields are bridge-generated finite state/counters, never wire payloads or identifiers.
        if(phase !in setOf("authorizing","connecting","reading","live","recovering","failed","closed"))return
        Log.i("RowanDeviceRead","phase=$phase snapshot=$snapshotAvailable epoch=$epoch delivery=$delivery")
    }
    fun begin(phase:String):Long {
        if(BuildConfig.FLAVOR!="development")return -1
        val now=SystemClock.elapsedRealtime()
        Log.i("RowanStartup","$phase begin t=$now main=${Looper.myLooper()==Looper.getMainLooper()}")
        return now
    }
    fun end(phase:String,started:Long) {
        if(started<0)return
        val now=SystemClock.elapsedRealtime()
        Log.i("RowanStartup","$phase end t=$now durationMs=${now-started}")
    }
}

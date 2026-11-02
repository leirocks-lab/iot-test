package com.rowan.iot.platform.scan

import android.content.Context
import android.graphics.ImageFormat
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Size
import android.view.View
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import com.rowan.iot.domain.scan.*
import java.util.concurrent.Executor
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean

/** Page-owned platform adapter. Public UI boundary exposes no CameraX SDK type. */
class NativeQrCameraDriver(
    private val context:Context,
    private val lifecycleOwner:LifecycleOwner,
    private val worker:Executor,
    private val slot:ScanWorkSlot,
    private val decoder:ZxingQrDecoder,
    private val accepted:(Long)->Boolean,
    private val result:(Long,ScanDecision)->Unit,
) {
    private val previewView=PreviewView(context).apply {implementationMode=PreviewView.ImplementationMode.COMPATIBLE}
    val view:View get()=previewView
    private val handler=Handler(Looper.getMainLooper())
    private val main=Executor {command->if(Looper.myLooper()==Looper.getMainLooper())command.run()else handler.post(command)}
    @Volatile private var generation=0L
    @Volatile private var closed=false
    private var startingToken:Long?=null
    private var provider:ProcessCameraProvider?=null
    private var preview:Preview?=null
    private var analysis:ImageAnalysis?=null

    /** Lifecycle methods are called on main; frame callbacks run on the caller-owned bounded worker. */
    fun start(token:Long) {
        requireMain()
        if(closed||!accepted(token)||preview!=null||startingToken==token)return
        val request=++generation
        startingToken=token
        val future=try {ProcessCameraProvider.getInstance(context.applicationContext)}catch(_:Exception){startingToken=null;emit(request,token,ScanDecision.IMAGE_UNREADABLE);return}
        future.addListener({
            if(!current(request,token)||startingToken!=token)return@addListener
            startingToken=null
            try {
                val owner=future.get()
                val camera=when {
                    owner.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)->CameraSelector.DEFAULT_BACK_CAMERA
                    owner.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)->CameraSelector.DEFAULT_FRONT_CAMERA
                    else->{emit(request,token,ScanDecision.IMAGE_UNREADABLE);return@addListener}
                }
                val p=Preview.Builder().build().also {it.setSurfaceProvider(previewView.surfaceProvider)}
                val a=ImageAnalysis.Builder().setTargetResolution(Size(1280,720))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                val rejected=AtomicBoolean()
                val executor=Executor {command->
                    try {worker.execute(command)}catch(_:RejectedExecutionException) {
                        // Running the rejected callback must only dispose its image,
                        // never fall back to decoding on a caller/main thread.
                        rejected.set(true);command.run()
                    }
                }
                a.setAnalyzer(executor){image->analyze(image,request,token,rejected)}
                if(!current(request,token)){a.clearAnalyzer();return@addListener}
                provider=owner;preview=p;analysis=a
                owner.bindToLifecycle(lifecycleOwner,camera,p,a)
            }catch(_:Exception) {
                // Do not retire the token before emit; the UI owns the atomic terminal claim.
                releaseOwned();emit(request,token,ScanDecision.IMAGE_UNREADABLE)
            }
        },main)
    }
    fun stop(){requireMain();generation++;startingToken=null;releaseOwned()}
    fun close(){requireMain();closed=true;stop()}
    private fun current(request:Long,token:Long)=!closed&&generation==request&&accepted(token)
    private fun emit(request:Long,token:Long,value:ScanDecision){if(current(request,token))result(token,value)}
    private fun analyze(image:ImageProxy,request:Long,token:Long,rejected:AtomicBoolean) {
        var lease:AutoCloseable?=null
        try {
            if(!current(request,token))return
            if(rejected.get()){emit(request,token,ScanDecision.IMAGE_UNREADABLE);return}
            lease=slot.acquire()?:return
            if(image.format!=ImageFormat.YUV_420_888||image.planes.isEmpty()){emit(request,token,ScanDecision.IMAGE_UNREADABLE);return}
            if(image.width !in 1..ScanLimits.DECODE_SIDE||image.height !in 1..ScanLimits.DECODE_SIDE||image.width.toLong()*image.height>ScanLimits.DECODE_PIXELS){emit(request,token,ScanDecision.INPUT_TOO_LARGE);return}
            val plane=image.planes[0];val buffer=plane.buffer.duplicate()
            if(buffer.remaining()>ScanLimits.IMAGE_BYTES){emit(request,token,ScanDecision.INPUT_TOO_LARGE);return}
            val bytes=ByteArray(buffer.remaining());buffer.get(bytes)
            val crop=image.cropRect
            val packed=LumaPlane.copy(bytes,image.width,image.height,plane.rowStride,plane.pixelStride,
                ScanCrop(crop.left,crop.top,crop.right,crop.bottom),image.imageInfo.rotationDegrees)
            if(!current(request,token))return
            val value=decoder.luma(packed)
            if(value!=ScanDecision.NO_CODE)emit(request,token,value)
        }catch(_:Exception){emit(request,token,ScanDecision.IMAGE_UNREADABLE)}
        finally {try {lease?.close()}finally {image.close()}}
    }
    private fun releaseOwned() {
        val p=preview;val a=analysis;preview=null;analysis=null
        a?.clearAnalyzer()
        val owned=mutableListOf<UseCase>();if(p!=null)owned+=p;if(a!=null)owned+=a
        if(owned.isNotEmpty())try {provider?.unbind(*owned.toTypedArray())}catch(_:Exception){Log.w("RowanScan","camera_release_failed")}
        provider=null
    }
    private fun requireMain(){check(Looper.myLooper()==Looper.getMainLooper()){"Scanner lifecycle requires main"}}
}

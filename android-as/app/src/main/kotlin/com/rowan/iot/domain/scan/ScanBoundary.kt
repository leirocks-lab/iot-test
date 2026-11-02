package com.rowan.iot.domain.scan

import java.util.concurrent.atomic.AtomicBoolean

/** Engineering budgets, not a production QR schema. No decoded identity leaves this boundary. */
object ScanLimits {
    const val IMAGE_BYTES=8*1024*1024
    const val SOURCE_PIXELS=64L*1024*1024
    const val DECODE_SIDE=2048
    const val DECODE_PIXELS=4L*1024*1024
    const val TEXT_BYTES=512
    const val CANDIDATES=8
}
enum class ScanDecision { NO_CODE, MULTIPLE_CODES, INPUT_TOO_LARGE, IMAGE_UNREADABLE, UNSUPPORTED }
object ScanPolicy {
    fun decide(texts:List<String>):ScanDecision {
        if(texts.isEmpty())return ScanDecision.NO_CODE
        if(texts.size>ScanLimits.CANDIDATES||texts.any {it.length>ScanLimits.TEXT_BYTES||it.toByteArray(Charsets.UTF_8).size>ScanLimits.TEXT_BYTES})return ScanDecision.INPUT_TOO_LARGE
        if(texts.distinct().size>1)return ScanDecision.MULTIPLE_CODES
        // Production encoding is not frozen. No URL handler or development schema is registered.
        return ScanDecision.UNSUPPORTED
    }
}
data class ScanCrop(val left:Int,val top:Int,val right:Int,val bottom:Int)
class PackedLuma(val width:Int,val height:Int,val bytes:ByteArray) {
    override fun toString()="PackedLuma($width,$height,redacted)"
}
object LumaPlane {
    fun copy(source:ByteArray,width:Int,height:Int,rowStride:Int,pixelStride:Int,crop:ScanCrop,rotation:Int):PackedLuma {
        require(width in 1..ScanLimits.DECODE_SIDE&&height in 1..ScanLimits.DECODE_SIDE&&width.toLong()*height<=ScanLimits.DECODE_PIXELS)
        require(source.size<=ScanLimits.IMAGE_BYTES&&pixelStride>0&&rowStride>0)
        require((width-1L)*pixelStride+1<=rowStride)
        require(crop.left>=0&&crop.top>=0&&crop.right>crop.left&&crop.bottom>crop.top&&crop.right<=width&&crop.bottom<=height)
        require(rotation in setOf(0,90,180,270))
        val w=crop.right-crop.left;val h=crop.bottom-crop.top
        val last=(crop.bottom-1L)*rowStride+(crop.right-1L)*pixelStride
        require(last<source.size)
        val out=ByteArray(w*h)
        val outWidth=if(rotation==90||rotation==270)h else w
        val outHeight=if(rotation==90||rotation==270)w else h
        for(y in 0 until h)for(x in 0 until w) {
            val value=source[(crop.top+y)*rowStride+(crop.left+x)*pixelStride]
            val index=when(rotation) {90->x*h+(h-1-y);180->(h-1-y)*w+(w-1-x);270->(w-1-x)*h+y;else->y*w+x}
            out[index]=value
        }
        return PackedLuma(outWidth,outHeight,out)
    }
}

/** Only the lease which acquired the slot can release it; rejected frames own nothing. */
class ScanWorkSlot {
    private val busy=AtomicBoolean()
    fun acquire():AutoCloseable?=if(busy.compareAndSet(false,true))object:AutoCloseable {
        private val closed=AtomicBoolean()
        override fun close(){if(closed.compareAndSet(false,true))busy.set(false)}
    }else null
}

/** A picker round survives its expected temporary stop, but publishes only after resume. */
class ScanRoundGate(private val revision:Long) {
    private var generation=0L
    private var active=false
    private var picker=false
    private var closed=false
    private var terminal=false
    @Synchronized fun resume(liveRevision:Long):Long? {
        if(closed||liveRevision!=revision){invalidate();return null}
        if(!picker){generation++;terminal=false}
        active=true;return generation
    }
    @Synchronized fun pause(){active=false;if(!picker)generation++}
    @Synchronized fun token(liveRevision:Long):Long?=if(accept(generation,liveRevision))generation else null
    @Synchronized fun accept(token:Long,liveRevision:Long)=currentRound(token,liveRevision)&&!terminal
    /** The first worker claims the terminal before posting to an arbitrarily delayed main queue. */
    @Synchronized fun claimTerminal(token:Long,liveRevision:Long):Boolean {
        if(!accept(token,liveRevision))return false
        terminal=true;return true
    }
    /** Only that claimed round may publish; retry, picker, pause and account changes fence it out. */
    @Synchronized fun acceptTerminal(token:Long,liveRevision:Long)=currentRound(token,liveRevision)&&terminal
    private fun currentRound(token:Long,liveRevision:Long)=!closed&&active&&!picker&&liveRevision==revision&&token==generation
    @Synchronized fun beginPicker(liveRevision:Long):Long? {
        if(closed||!active||picker||liveRevision!=revision)return null
        generation++;terminal=false;picker=true;active=false;return generation
    }
    @Synchronized fun finishPicker(token:Long,liveRevision:Long):Boolean {
        if(closed||!active||!picker||token!=generation||liveRevision!=revision)return false
        picker=false;return true
    }
    @Synchronized fun pickerPending()=picker
    @Synchronized fun invalidate(){closed=true;active=false;picker=false;terminal=false;generation++}
}

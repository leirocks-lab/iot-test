package com.rowan.iot.platform.scan

import android.graphics.BitmapFactory
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.LuminanceSource
import com.google.zxing.NotFoundException
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.multi.qrcode.QRCodeMultiReader
import com.rowan.iot.domain.scan.*
import java.io.ByteArrayOutputStream
import java.io.InputStream

/** Native library adapter. No javase/AWT, external intents, HTTP or production parser. */
class ZxingQrDecoder {
    fun luma(image:PackedLuma):ScanDecision=decode(PlanarYUVLuminanceSource(image.bytes,image.width,image.height,0,0,image.width,image.height,false))
    fun photo(stream:InputStream,allowed:()->Boolean):ScanDecision {
        val bytes=readBounded(stream,allowed)?:return ScanDecision.INPUT_TOO_LARGE
        if(!allowed())throw InterruptedException()
        val bounds=BitmapFactory.Options().apply {inJustDecodeBounds=true}
        BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
        if(bounds.outWidth<=0||bounds.outHeight<=0)return ScanDecision.IMAGE_UNREADABLE
        if(bounds.outWidth.toLong()*bounds.outHeight>ScanLimits.SOURCE_PIXELS)return ScanDecision.INPUT_TOO_LARGE
        var sample=1
        while((bounds.outWidth.toLong()+sample-1)/sample>ScanLimits.DECODE_SIDE||
            (bounds.outHeight.toLong()+sample-1)/sample>ScanLimits.DECODE_SIDE||
            ((bounds.outWidth.toLong()+sample-1)/sample)*((bounds.outHeight.toLong()+sample-1)/sample)>ScanLimits.DECODE_PIXELS)sample*=2
        val options=BitmapFactory.Options().apply {inSampleSize=sample;inPreferredConfig=android.graphics.Bitmap.Config.ARGB_8888}
        val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,options)?:return ScanDecision.IMAGE_UNREADABLE
        try {
            if(!allowed())throw InterruptedException()
            if(bitmap.width>ScanLimits.DECODE_SIDE||bitmap.height>ScanLimits.DECODE_SIDE||bitmap.width.toLong()*bitmap.height>ScanLimits.DECODE_PIXELS)return ScanDecision.INPUT_TOO_LARGE
            val pixels=IntArray(bitmap.width*bitmap.height)
            bitmap.getPixels(pixels,0,bitmap.width,0,0,bitmap.width,bitmap.height)
            return decode(RGBLuminanceSource(bitmap.width,bitmap.height,pixels))
        }finally {bitmap.recycle()}
    }
    private fun readBounded(stream:InputStream,allowed:()->Boolean):ByteArray? {
        val out=ByteArrayOutputStream();val buffer=ByteArray(8192)
        while(true) {
            if(Thread.currentThread().isInterrupted||!allowed())throw InterruptedException()
            val count=stream.read(buffer)
            if(count<0)break
            if(count==0)continue
            if(out.size().toLong()+count>ScanLimits.IMAGE_BYTES)return null
            out.write(buffer,0,count)
        }
        return out.toByteArray()
    }
    private fun decode(source:LuminanceSource):ScanDecision=try {
        // Reader is local to a single call, never shared by photo and camera tasks.
        val results=QRCodeMultiReader().decodeMultiple(BinaryBitmap(HybridBinarizer(source)),mapOf(DecodeHintType.TRY_HARDER to true))
        if(results.size>ScanLimits.CANDIDATES)ScanDecision.INPUT_TOO_LARGE else ScanPolicy.decide(results.map {it.text})
    }catch(_:NotFoundException){ScanDecision.NO_CODE}
}

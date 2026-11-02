package com.rowan.iot.platform.scan

import android.content.Context
import android.net.Uri
import com.rowan.iot.domain.scan.*
import java.util.concurrent.ScheduledThreadPoolExecutor
import java.util.concurrent.SynchronousQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** Application-owned actual photo I/O. Pages cannot create/close/reset its admission or executor. */
class NativeQrPhotoReader(context:Context) {
    private val app=context.applicationContext
    private val decoder=ZxingQrDecoder()
    private val executor=ThreadPoolExecutor(1,1,0L,TimeUnit.MILLISECONDS,SynchronousQueue<Runnable>(),
        {task->Thread(task,"rowan-photo-actual").apply {isDaemon=true}},ThreadPoolExecutor.AbortPolicy())
    private val deadlines=ScheduledThreadPoolExecutor(1) {task->Thread(task,"rowan-photo-deadline").apply {isDaemon=true}}.apply {removeOnCancelPolicy=true}
    private val admission=ActualPhotoIo(executor,PhotoDeadlineScheduler {delay,action->
        val future=deadlines.schedule(action,delay,TimeUnit.MILLISECONDS)
        AutoCloseable {future.cancel(false)}
    })
    val busy:Boolean get()=admission.busy
    fun cancel(ticket:PhotoIoTicket)=admission.cancel(ticket)
    fun read(ticket:PhotoIoTicket,uri:Uri,current:()->Boolean,
        completion:(PhotoIoTicket,PhotoIoOutcome)->Unit):PhotoAdmission = admission.read(ticket,current,{allowed->
        // Only the user-selected system-picker content reference is accepted.
        require(uri.scheme=="content")
        app.contentResolver.openInputStream(uri)?.use {decoder.photo(it,allowed)}?:ScanDecision.IMAGE_UNREADABLE
    },completion)
}

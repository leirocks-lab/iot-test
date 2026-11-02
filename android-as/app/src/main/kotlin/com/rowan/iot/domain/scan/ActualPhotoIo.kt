package com.rowan.iot.domain.scan

import java.util.UUID
import java.util.concurrent.Executor
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

data class PhotoIoTicket(val page:UUID,val accountRevision:Long,val round:Long) {
    override fun toString()="PhotoIoTicket(redacted)"
}
enum class PhotoAdmission { ADMITTED, BUSY, STALE }
sealed interface PhotoIoOutcome {
    data class Decoded(val decision:ScanDecision):PhotoIoOutcome
    enum class Failure:PhotoIoOutcome { CANCELLED, TIMEOUT, UNAVAILABLE }
}
fun interface PhotoDeadlineScheduler {
    fun after(delayMillis:Long,action:Runnable):AutoCloseable
}

/** One APPLICATION-owned actual I/O admission. UI completion is not actual completion. */
class ActualPhotoIo(private val executor:Executor,private val deadlines:PhotoDeadlineScheduler) {
    private class Job(val ticket:PhotoIoTicket,val current:()->Boolean,completion:(PhotoIoTicket,PhotoIoOutcome)->Unit) {
        val cancelled=AtomicBoolean()
        private val delivered=AtomicBoolean()
        private val callback=AtomicReference<((PhotoIoTicket,PhotoIoOutcome)->Unit)?>(completion)
        private val timer=AtomicReference<AutoCloseable?>()
        fun allowed():Boolean {
            if(cancelled.get())return false
            return try {current()}catch(_:Exception){false}
        }
        fun installTimer(value:AutoCloseable) {
            timer.set(value)
            if(delivered.get())timer.getAndSet(null)?.close()
        }
        fun deliver(outcome:PhotoIoOutcome) {
            if(!delivered.compareAndSet(false,true))return
            timer.getAndSet(null)?.close()
            callback.getAndSet(null)?.invoke(ticket,outcome)
        }
        fun cancel(reason:PhotoIoOutcome.Failure) {cancelled.set(true);deliver(reason)}
    }
    private val lock=Any()
    private var actual:Job?=null
    val busy:Boolean get()=synchronized(lock){actual!=null}
    fun cancel(ticket:PhotoIoTicket) {
        val owned=synchronized(lock){actual?.takeIf {it.ticket==ticket}}
        // No slot release and no interruption/forced stream close here.
        owned?.cancel(PhotoIoOutcome.Failure.CANCELLED)
    }
    fun read(ticket:PhotoIoTicket,current:()->Boolean,work:(()->Boolean)->ScanDecision,
        completion:(PhotoIoTicket,PhotoIoOutcome)->Unit):PhotoAdmission {
        val currentAtAdmission=try {current()}catch(_:Exception){false}
        if(!currentAtAdmission)return PhotoAdmission.STALE
        val job=synchronized(lock) {
            if(actual!=null)return PhotoAdmission.BUSY
            Job(ticket,current,completion).also {actual=it}
        }
        try {job.installTimer(deadlines.after(8_000,Runnable {job.cancel(PhotoIoOutcome.Failure.TIMEOUT)}))}
        catch(_:Exception) {release(job);job.deliver(PhotoIoOutcome.Failure.UNAVAILABLE);return PhotoAdmission.ADMITTED}
        try {executor.execute {
            try {
                if(!job.allowed()){job.deliver(PhotoIoOutcome.Failure.CANCELLED);return@execute}
                val decision=work(job::allowed)
                job.deliver(if(job.allowed())PhotoIoOutcome.Decoded(decision)else PhotoIoOutcome.Failure.CANCELLED)
            }catch(_:Exception) {
                job.deliver(if(job.allowed())PhotoIoOutcome.Failure.UNAVAILABLE else PhotoIoOutcome.Failure.CANCELLED)
            }finally {release(job)} // Only actual completion can free an admitted/possibly blocked worker.
        }}catch(_:RejectedExecutionException) {
            // Standard Executor rejection proves no work was admitted to its worker.
            release(job);job.deliver(PhotoIoOutcome.Failure.UNAVAILABLE)
        }
        return PhotoAdmission.ADMITTED
    }
    private fun release(job:Job)=synchronized(lock){if(actual===job)actual=null}
}

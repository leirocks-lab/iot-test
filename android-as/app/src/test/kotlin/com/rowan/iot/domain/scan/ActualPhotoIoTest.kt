package com.rowan.iot.domain.scan

import java.io.InputStream
import java.util.UUID
import java.util.concurrent.*
import java.util.concurrent.atomic.*
import org.junit.Assert.*
import org.junit.Test

class ActualPhotoIoTest {
    private fun ticket(round:Long=1)=PhotoIoTicket(UUID.randomUUID(),7,round)
    private class Timer:PhotoDeadlineScheduler {
        data class Entry(val delay:Long,val action:Runnable,val closed:AtomicBoolean=AtomicBoolean())
        val entries=CopyOnWriteArrayList<Entry>()
        override fun after(delayMillis:Long,action:Runnable):AutoCloseable {
            val entry=Entry(delayMillis,action);entries+=entry;return AutoCloseable {entry.closed.set(true)}
        }
        fun fire(index:Int=entries.lastIndex,evenIfClosed:Boolean=false){val entry=entries[index];if(evenIfClosed||!entry.closed.get())entry.action.run()}
    }
    private class Queue:Executor {
        val tasks=ConcurrentLinkedQueue<Runnable>()
        val dispatched=AtomicInteger()
        override fun execute(command:Runnable){dispatched.incrementAndGet();tasks.add(command)}
        fun runNext(){tasks.remove().run()}
    }
    private class ActualThread:Executor {
        val dispatched=AtomicInteger()
        val done=CountDownLatch(1)
        override fun execute(command:Runnable){dispatched.incrementAndGet();Thread {try {command.run()}finally {done.countDown()}}.apply {isDaemon=true;start()}}
        fun awaitDone(){assertTrue(done.await(3,TimeUnit.SECONDS))}
    }
    private class BlockingStream:InputStream() {
        val entered=CountDownLatch(1);val finish=CountDownLatch(1);val closes=AtomicInteger()
        override fun read():Int {entered.countDown();if(!finish.await(3,TimeUnit.SECONDS))throw java.io.IOException("fixture wait exceeded");return -1}
        override fun close(){closes.incrementAndGet()}
    }
    @Test fun successCompletesOnceClosesTimerAndReleasesActualSlot(){
        val queue=Queue();val timer=Timer();val reader=ActualPhotoIo(queue,timer);val out=mutableListOf<PhotoIoOutcome>()
        assertEquals(PhotoAdmission.ADMITTED,reader.read(ticket(),{true},{ScanDecision.UNSUPPORTED}){_,value->out+=value})
        assertTrue(reader.busy);assertEquals(8_000L,timer.entries.single().delay);queue.runNext()
        assertEquals(listOf(PhotoIoOutcome.Decoded(ScanDecision.UNSUPPORTED)),out);assertFalse(reader.busy);assertTrue(timer.entries.single().closed.get())
        timer.fire(evenIfClosed=true);assertEquals(1,out.size)
    }
    @Test fun cancellingBlockingStreamSettlesUiButCannotReleaseActualIoAcrossPages(){
        val executor=ActualThread();val timer=Timer();val reader=ActualPhotoIo(executor,timer);val source=BlockingStream();val a=ticket();val out=CopyOnWriteArrayList<PhotoIoOutcome>()
        reader.read(a,{true},{source.use {it.read()};ScanDecision.UNSUPPORTED}){_,value->out+=value}
        try {
            assertTrue(source.entered.await(2,TimeUnit.SECONDS));reader.cancel(a)
            assertEquals(listOf(PhotoIoOutcome.Failure.CANCELLED),out);assertTrue(reader.busy);assertEquals(0,source.closes.get())
            assertEquals(PhotoAdmission.BUSY,reader.read(ticket(),{true},{error("Second page opened a stream")}){_,_->fail("Second page callback")})
            assertEquals(1,executor.dispatched.get())
        }finally {source.finish.countDown();executor.awaitDone()}
        assertFalse(reader.busy);assertEquals(1,source.closes.get());assertEquals(1,out.size)
    }
    @Test fun eightSecondTimeoutKeepsUncooperativeWorkerSlotAndDropsLateDecode(){
        val executor=ActualThread();val timer=Timer();val reader=ActualPhotoIo(executor,timer);val source=BlockingStream();val out=CopyOnWriteArrayList<PhotoIoOutcome>()
        reader.read(ticket(),{true},{source.use {it.read()};ScanDecision.UNSUPPORTED}){_,value->out+=value}
        try {
            assertTrue(source.entered.await(2,TimeUnit.SECONDS));timer.fire()
            assertEquals(listOf(PhotoIoOutcome.Failure.TIMEOUT),out);assertTrue(reader.busy)
            assertEquals(PhotoAdmission.BUSY,reader.read(ticket(),{true},{error("Overlap")}){_,_->fail("Overlap")})
        }finally {source.finish.countDown();executor.awaitDone()}
        assertEquals(1,out.size);assertFalse(reader.busy)
    }
    @Test fun repeatedNewPagesDoNotCreateMoreActualWorkersOrQueuedReads(){
        val executor=ActualThread();val timer=Timer();val reader=ActualPhotoIo(executor,timer);val source=BlockingStream();val old=ticket()
        reader.read(old,{true},{source.use {it.read()};ScanDecision.NO_CODE}){_,_->}
        try {
            assertTrue(source.entered.await(2,TimeUnit.SECONDS));reader.cancel(old);timer.fire(evenIfClosed=true)
            repeat(100){assertEquals(PhotoAdmission.BUSY,reader.read(ticket(it.toLong()),{true},{error("Per-page actual worker")}){_,_->})}
            assertEquals(1,executor.dispatched.get());assertEquals(1,timer.entries.size)
        }finally {source.finish.countDown();executor.awaitDone()}
    }
    @Test fun oldCancelAndOldTimeoutCannotClearOrCancelTheNewOwner(){
        val queue=Queue();val timer=Timer();val reader=ActualPhotoIo(queue,timer);val a=ticket();val b=ticket();val out=mutableListOf<PhotoIoOutcome>()
        reader.read(a,{true},{ScanDecision.NO_CODE}){_,_->};queue.runNext()
        reader.read(b,{true},{allowed->assertTrue(allowed());ScanDecision.UNSUPPORTED}){_,value->out+=value}
        reader.cancel(a);timer.fire(0,evenIfClosed=true)
        assertTrue(reader.busy);assertTrue(out.isEmpty());queue.runNext()
        assertEquals(listOf(PhotoIoOutcome.Decoded(ScanDecision.UNSUPPORTED)),out);assertFalse(reader.busy)
    }
    @Test fun pageBecomingStaleDuringBlockingReadCannotPublishPrivateDecodedResult(){
        val executor=ActualThread();val reader=ActualPhotoIo(executor,Timer());val source=BlockingStream();val current=AtomicBoolean(true);val out=CopyOnWriteArrayList<PhotoIoOutcome>()
        reader.read(ticket(),current::get,{source.use {it.read()};ScanDecision.UNSUPPORTED}){_,value->out+=value}
        try {assertTrue(source.entered.await(2,TimeUnit.SECONDS));current.set(false)}finally {source.finish.countDown();executor.awaitDone()}
        assertEquals(listOf(PhotoIoOutcome.Failure.CANCELLED),out);assertFalse(reader.busy)
    }
    @Test fun staleBeforeAdmissionDoesNotScheduleDispatchOrOpenAnything(){
        val queue=Queue();val timer=Timer();val reader=ActualPhotoIo(queue,timer)
        assertEquals(PhotoAdmission.STALE,reader.read(ticket(),{false},{error("Stale read")}){_,_->fail("Stale callback")})
        assertFalse(reader.busy);assertEquals(0,queue.dispatched.get());assertTrue(timer.entries.isEmpty())
    }
    @Test fun cancelledBeforeWorkerEntryRetainsAdmissionUntilEntryDrainsAndSkipsIo(){
        val queue=Queue();val timer=Timer();val reader=ActualPhotoIo(queue,timer);val key=ticket();val out=mutableListOf<PhotoIoOutcome>()
        reader.read(key,{true},{error("Cancelled read opened")}){_,value->out+=value};reader.cancel(key)
        assertTrue(reader.busy);assertEquals(listOf(PhotoIoOutcome.Failure.CANCELLED),out)
        queue.runNext();assertFalse(reader.busy);assertEquals(1,out.size)
    }
    @Test fun onlyOneConcurrentPageCanReserveTheSharedAdmission(){
        val queue=Queue();val reader=ActualPhotoIo(queue,Timer());val ready=CountDownLatch(4);val go=CountDownLatch(1);val admitted=AtomicInteger()
        val workers=(0..3).map {Thread {ready.countDown();go.await();if(reader.read(ticket(),{true},{ScanDecision.NO_CODE}){_,_->}==PhotoAdmission.ADMITTED)admitted.incrementAndGet()}.apply {isDaemon=true;start()}}
        try {assertTrue(ready.await(2,TimeUnit.SECONDS))}finally {go.countDown()}
        workers.forEach {it.join(2000);assertFalse(it.isAlive)}
        assertEquals(1,admitted.get());assertEquals(1,queue.dispatched.get());assertEquals(1,queue.tasks.size);queue.runNext()
    }
    @Test fun streamFailureIsFixedAndDoesNotLeakTheOriginalExceptionOrCause(){
        val queue=Queue();val reader=ActualPhotoIo(queue,Timer());val out=mutableListOf<PhotoIoOutcome>()
        reader.read(ticket(),{true},{throw java.io.IOException("private-uri secret-code")}){_,value->out+=value};queue.runNext()
        assertEquals(listOf(PhotoIoOutcome.Failure.UNAVAILABLE),out);assertFalse(out.toString().contains("private"));assertFalse(out.toString().contains("secret"));assertFalse(reader.busy)
    }
    @Test fun executorRejectionBeforeDispatchReleasesAndSettlesOnce(){
        val timer=Timer();val reader=ActualPhotoIo(Executor {throw RejectedExecutionException("private")},timer);val out=mutableListOf<PhotoIoOutcome>()
        assertEquals(PhotoAdmission.ADMITTED,reader.read(ticket(),{true},{error("Rejected worker")}){_,value->out+=value})
        assertFalse(reader.busy);assertEquals(listOf(PhotoIoOutcome.Failure.UNAVAILABLE),out);assertTrue(timer.entries.single().closed.get());timer.fire(evenIfClosed=true);assertEquals(1,out.size)
    }
    @Test fun deadlineSchedulerFailureDoesNotDispatchOrLeakAdmission(){
        val queue=Queue();val reader=ActualPhotoIo(queue,PhotoDeadlineScheduler {_,_->throw IllegalStateException("private")});val out=mutableListOf<PhotoIoOutcome>()
        reader.read(ticket(),{true},{error("No deadline")}){_,value->out+=value}
        assertEquals(0,queue.dispatched.get());assertFalse(reader.busy);assertEquals(listOf(PhotoIoOutcome.Failure.UNAVAILABLE),out)
    }
    @Test fun timeoutWinningInsideWorkCannotBeOverwrittenByItsReturnedSuccess(){
        val queue=Queue();val timer=Timer();val reader=ActualPhotoIo(queue,timer);val out=mutableListOf<PhotoIoOutcome>()
        reader.read(ticket(),{true},{timer.fire();ScanDecision.UNSUPPORTED}){_,value->out+=value};queue.runNext()
        assertEquals(listOf(PhotoIoOutcome.Failure.TIMEOUT),out);assertFalse(reader.busy)
    }
    @Test fun repeatedCancelSettlesOnlyOnceAndNeverEarlyReleasesItsOwner(){
        val queue=Queue();val reader=ActualPhotoIo(queue,Timer());val key=ticket();val out=mutableListOf<PhotoIoOutcome>()
        reader.read(key,{true},{error("Cancelled work")}){_,value->out+=value};repeat(3){reader.cancel(key)}
        assertEquals(listOf(PhotoIoOutcome.Failure.CANCELLED),out);assertTrue(reader.busy);queue.runNext();assertFalse(reader.busy)
    }
}

package com.rowan.iot.domain.scan

import org.junit.Assert.*
import org.junit.Test

class ScanBoundaryTest {
    private class MainQueue(val gate:ScanRoundGate) {
        val pending=mutableListOf<()->Unit>()
        val displayed=mutableListOf<ScanDecision>()
        fun post(token:Long,value:ScanDecision) {
            if(!gate.claimTerminal(token,7))return
            pending+={if(gate.acceptTerminal(token,7))displayed+=value}
        }
        fun drain(){pending.toList().also {pending.clear()}.forEach {it()}}
    }
    @Test fun blockedMainQueueDisplaysOnlyTheFirstTerminalNotLaterFrameOrException(){
        val gate=ScanRoundGate(7);val token=gate.resume(7)!!;val main=MainQueue(gate)
        main.post(token,ScanDecision.UNSUPPORTED)
        main.post(token,ScanDecision.MULTIPLE_CODES)
        main.post(token,ScanDecision.IMAGE_UNREADABLE)
        assertEquals(1,main.pending.size);assertNull(gate.token(7));assertFalse(gate.accept(token,7))
        main.drain();assertEquals(listOf(ScanDecision.UNSUPPORTED),main.displayed)
    }
    @Test fun retryRetiresQueuedTerminalAndOldExceptionCannotClaimTheNewRound(){
        val gate=ScanRoundGate(7);val old=gate.resume(7)!!;val main=MainQueue(gate)
        main.post(old,ScanDecision.UNSUPPORTED)
        val next=gate.resume(7)!!;main.post(old,ScanDecision.IMAGE_UNREADABLE);main.post(next,ScanDecision.MULTIPLE_CODES)
        assertNotEquals(old,next);main.drain();assertEquals(listOf(ScanDecision.MULTIPLE_CODES),main.displayed)
    }
    @Test fun albumAfterTerminalEstablishesANewRoundWithoutAcceptingOldFrameError(){
        val gate=ScanRoundGate(7);val old=gate.resume(7)!!;val main=MainQueue(gate)
        main.post(old,ScanDecision.UNSUPPORTED);main.drain()
        val photo=gate.beginPicker(7)!!;gate.pause();gate.resume(7);assertTrue(gate.finishPicker(photo,7))
        main.post(old,ScanDecision.IMAGE_UNREADABLE);main.post(photo,ScanDecision.NO_CODE);main.drain()
        assertEquals(listOf(ScanDecision.UNSUPPORTED,ScanDecision.NO_CODE),main.displayed)
    }
    @Test fun pausedOrClosedPageCannotDisplayAnAlreadyClaimedQueuedTerminal(){
        for(close in listOf(false,true)) {
            val gate=ScanRoundGate(7);val token=gate.resume(7)!!;val main=MainQueue(gate)
            main.post(token,ScanDecision.UNSUPPORTED);if(close)gate.invalidate()else gate.pause()
            main.drain();assertTrue(main.displayed.isEmpty());assertFalse(gate.claimTerminal(token,8))
        }
    }
    @Test fun parallelWorkersHaveExactlyOneAtomicTerminalWinner(){
        val gate=ScanRoundGate(7);val token=gate.resume(7)!!
        val ready=java.util.concurrent.CountDownLatch(4);val start=java.util.concurrent.CountDownLatch(1)
        val winners=java.util.concurrent.atomic.AtomicInteger()
        val workers=(0..3).map {Thread {ready.countDown();start.await();if(gate.claimTerminal(token,7))winners.incrementAndGet()}.apply {isDaemon=true;start()}}
        try {assertTrue(ready.await(2,java.util.concurrent.TimeUnit.SECONDS))}finally {start.countDown()}
        workers.forEach {it.join(2000);assertFalse(it.isAlive)};assertEquals(1,winners.get())
    }
    @Test fun noDetectedQrIsDifferentFromUnsupported(){assertEquals(ScanDecision.NO_CODE,ScanPolicy.decide(emptyList()));assertEquals(ScanDecision.UNSUPPORTED,ScanPolicy.decide(listOf("PUBLIC FIXTURE")))}
    @Test fun arbitraryUrlsAndOldDevelopmentJsonNeverGrantAProductionIdentity(){
        for(value in listOf("https://example.invalid/public","rowan://public","{\"type\":\"rowan.device\",\"v\":1,\"deviceId\":\"fixture\",\"productId\":\"fixture\"}","WIFI:S:public;;",""))
            assertEquals(ScanDecision.UNSUPPORTED,ScanPolicy.decide(listOf(value)))
    }
    @Test fun severalCodesAreNotSilentlySelected(){assertEquals(ScanDecision.MULTIPLE_CODES,ScanPolicy.decide(listOf("A","B")));assertEquals(ScanDecision.UNSUPPORTED,ScanPolicy.decide(listOf("A","A")))}
    @Test fun textBudgetCountsUtf8BytesNotUtf16Characters(){assertEquals(ScanDecision.UNSUPPORTED,ScanPolicy.decide(listOf("Q".repeat(512))));assertEquals(ScanDecision.INPUT_TOO_LARGE,ScanPolicy.decide(listOf("Q".repeat(513))));assertEquals(ScanDecision.INPUT_TOO_LARGE,ScanPolicy.decide(listOf("中".repeat(171))))}
    @Test fun tooManyCandidatesAreBounded(){assertEquals(ScanDecision.INPUT_TOO_LARGE,ScanPolicy.decide((0..8).map {"public-$it"}))}
    @Test fun lumaHonorsCropRowAndPixelStride(){
        val bytes=ByteArray(18);for(y in 0..2)for(x in 0..2)bytes[y*6+x*2]=(y*3+x).toByte()
        val value=LumaPlane.copy(bytes,3,3,6,2,ScanCrop(1,1,3,3),0)
        assertEquals(2,value.width);assertEquals(2,value.height);assertArrayEquals(byteArrayOf(4,5,7,8),value.bytes)
    }
    @Test fun rotationsHaveCorrectDimensionsAndPixels(){
        val expected=mapOf(0 to byteArrayOf(1,2,3,4,5,6),90 to byteArrayOf(4,1,5,2,6,3),180 to byteArrayOf(6,5,4,3,2,1),270 to byteArrayOf(3,6,2,5,1,4))
        for((rotation,pixels)in expected){val value=LumaPlane.copy(byteArrayOf(1,2,3,4,5,6),3,2,3,1,ScanCrop(0,0,3,2),rotation);assertArrayEquals(pixels,value.bytes);assertEquals(if(rotation%180==0)3 else 2,value.width);assertEquals(if(rotation%180==0)2 else 3,value.height)}
    }
    @Test fun lastRowNeedNotContainUnusedStridePadding(){assertArrayEquals(byteArrayOf(1,2,3,4),LumaPlane.copy(byteArrayOf(1,2,0,3,4),2,2,3,1,ScanCrop(0,0,2,2),0).bytes)}
    @Test fun truncatedPlanesInvalidStridesAndCropAreRejectedBeforeIndexing(){
        for(work in listOf<()->Unit>(
            {LumaPlane.copy(byteArrayOf(1),2,2,2,1,ScanCrop(0,0,2,2),0)},
            {LumaPlane.copy(ByteArray(4),2,2,1,1,ScanCrop(0,0,2,2),0)},
            {LumaPlane.copy(ByteArray(4),2,2,2,0,ScanCrop(0,0,2,2),0)},
            {LumaPlane.copy(ByteArray(4),2,2,2,1,ScanCrop(-1,0,2,2),0)},
            {LumaPlane.copy(ByteArray(4),2,2,2,1,ScanCrop(0,0,3,2),0)},
            {LumaPlane.copy(ByteArray(4),2,2,2,1,ScanCrop(0,0,2,2),45)}))assertTrue(runCatching(work).exceptionOrNull() is IllegalArgumentException)
    }
    @Test fun dimensionsAndOverflowingStrideCannotAllocateAnUnboundedPlane(){
        assertTrue(runCatching {LumaPlane.copy(byteArrayOf(),Int.MAX_VALUE,Int.MAX_VALUE,Int.MAX_VALUE,2,ScanCrop(0,0,1,1),0)}.isFailure)
        assertTrue(runCatching {LumaPlane.copy(ByteArray(4),2,2,Int.MAX_VALUE,Int.MAX_VALUE,ScanCrop(0,0,2,2),0)}.isFailure)
    }
    @Test fun packedPlaneStringNeverPrintsPixels(){assertFalse(PackedLuma(1,1,byteArrayOf(99)).toString().contains("99"))}
    @Test fun rejectedFramesCannotReleaseAnotherFramesBusyLease(){val slot=ScanWorkSlot();val owner=slot.acquire()!!;assertNull(slot.acquire());assertNull(slot.acquire());owner.close();val next=slot.acquire()!!;owner.close();assertNull(slot.acquire());next.close();assertNotNull(slot.acquire())}
    @Test fun frameFromPausedOrPreviousGenerationCannotPublish(){val gate=ScanRoundGate(7);val old=gate.resume(7)!!;gate.pause();assertFalse(gate.accept(old,7));val fresh=gate.resume(7)!!;assertFalse(gate.accept(old,7));assertTrue(gate.accept(fresh,7))}
    @Test fun accountRevisionChangeClosesTheGate(){val gate=ScanRoundGate(7);val token=gate.resume(7)!!;assertFalse(gate.accept(token,8));assertNull(gate.resume(8));assertNull(gate.resume(7));assertNull(gate.token(7))}
    @Test fun pickerRoundSurvivesExpectedStopButCannotPublishInBackground(){val gate=ScanRoundGate(7);gate.resume(7);val picker=gate.beginPicker(7)!!;gate.pause();assertFalse(gate.finishPicker(picker,7));gate.resume(7);assertTrue(gate.finishPicker(picker,7));assertTrue(gate.accept(picker,7))}
    @Test fun pickerCallbackFromOldAccountOrClosedPageIsDiscarded(){val gate=ScanRoundGate(7);gate.resume(7);val picker=gate.beginPicker(7)!!;gate.resume(7);assertFalse(gate.finishPicker(picker,8));gate.invalidate();assertFalse(gate.finishPicker(picker,7));assertNull(gate.token(7))}
    @Test fun duplicateOrOldPickerCallbacksCannotConsumeNewRound(){val gate=ScanRoundGate(7);gate.resume(7);val old=gate.beginPicker(7)!!;gate.resume(7);assertTrue(gate.finishPicker(old,7));assertFalse(gate.finishPicker(old,7));val next=gate.beginPicker(7)!!;gate.resume(7);assertFalse(gate.finishPicker(old,7));assertTrue(gate.finishPicker(next,7))}
}

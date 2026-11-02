package com.rowan.iot.bridge

import com.rowan.iot.domain.device.more.SelfUnbindView
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

/** Confirmation/promise boundary tests with injected authority, not an HTTP/platform acceptance. */
class DeviceSelfUnbindBridgeTest {
    private class Fixture {
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        var current=true;var dispatched=0;var dialogCount=0;var dismissed=0;var reads=0
        var status=SelfUnbindBridgeAuthority(SelfUnbindView("","idle"),true)
        var beforeRead:suspend ()->Unit={};var afterBegin:()->Unit={}
        var confirm:(()->Unit)?=null;var cancel:(()->Unit)?=null
        val results=mutableListOf<SelfUnbindBridgeState>()
        val context=SelfUnbindBridgeContext("obs",7,{current},{"Native public device"},{reads++;beforeRead();status},{dispatched++;afterBegin();SelfUnbindView("native-only","preparing")})
        val bridge=DeviceSelfUnbindBridge(scope,{if(it=="obs")context else null},{title,yes,no->
            assertEquals("Native public device",title);dialogCount++;confirm=yes;cancel=no
            AutoCloseable {dismissed++}
        },knownObservation={it=="obs"})
        fun request(attempt:String="a"){bridge.request("obs",attempt){results+=it}}
        fun close(){bridge.close();scope.cancel()}
    }
    @Test fun requestRequiresActualNativeAffirmativeAndGeneratesNoJsIntent() {val f=Fixture();try{f.request();assertEquals(0,f.dispatched);assertEquals(1,f.dialogCount);f.confirm!!();assertEquals(1,f.dispatched);assertEquals("preparing",f.results.single().status);assertFalse(f.results.single().canRequest)}finally{f.close()}}
    @Test fun cancelBeforeRequestPreventsLateDialogAndDispatch() {val f=Fixture();try{f.bridge.cancel("obs","a");f.request();assertEquals(0,f.dialogCount);assertEquals(0,f.dispatched);assertEquals("cancelled",f.results.single().status)}finally{f.close()}}
    @Test fun exactCancelCannotCancelANewerAttempt() {val f=Fixture();try{f.request("a");f.bridge.cancel("obs","a");f.request("b");f.bridge.cancel("obs","a");f.confirm!!();assertEquals(1,f.dispatched);assertEquals(2,f.dialogCount)}finally{f.close()}}
    @Test fun duplicateAttemptJoinsButDifferentAttemptIsBusy() {val f=Fixture();try{f.request();f.request();f.request("b");assertEquals(1,f.dialogCount);assertEquals("busy",f.results.single().errorCode);f.confirm!!();assertEquals(1,f.dispatched);assertEquals(3,f.results.size)}finally{f.close()}}
    @Test fun pageOrAccountChangeBetweenDialogAndAffirmativeCannotDispatch() {val f=Fixture();try{f.request();f.current=false;f.confirm!!();assertEquals(0,f.dispatched);assertEquals("session_changed",f.results.single().status)}finally{f.close()}}
    @Test fun pauseCancelsPendingDialogAndLateAffirmativeIsInert() {val f=Fixture();try{f.request();val old=f.confirm!!;f.bridge.suspendObservation("obs");old();assertEquals(0,f.dispatched);assertEquals(1,f.results.size);assertEquals("cancelled",f.results.single().status)}finally{f.close()}}
    @Test fun cancellationAfterDispatchDoesNotCancelOrRepeatApplicationTask() {val f=Fixture();try{f.request();f.confirm!!();f.bridge.cancel("obs","a");f.request();assertEquals(1,f.dispatched);assertEquals(1,f.dialogCount);assertEquals("preparing",f.results.last().status)}finally{f.close()}}
    @Test fun unknownAuthorityNeverPresentsAnotherConfirmation() {val f=Fixture();try{f.status=SelfUnbindBridgeAuthority(SelfUnbindView("private","unknown","unknown_result"),false);f.request();assertEquals("unknown",f.results.single().status);assertEquals(0,f.dialogCount);assertEquals(0,f.dispatched)}finally{f.close()}}
    @Test fun uncooperativePreflightCancelledBeforeItReturnsCannotOpenDialog():Unit=runBlocking {val f=Fixture();val done=CompletableDeferred<Unit>();try{f.beforeRead={withContext(NonCancellable){done.await()}};f.request();f.bridge.cancel("obs","a");f.request("b");assertEquals("busy",f.results.last().errorCode);assertEquals(1,f.reads);done.complete(Unit);yield();assertEquals(0,f.dialogCount);assertEquals(0,f.dispatched);assertEquals(2,f.results.size)}finally{done.complete(Unit);f.close()}}
    @Test fun queryReadsOnlyAuthorityAndKeepsHistoricalDistinct() {val f=Fixture();try{f.status=SelfUnbindBridgeAuthority(SelfUnbindView("private","historical_confirmed"),true);f.bridge.get("obs"){f.results+=it};assertEquals("historical_confirmed",f.results.single().status);assertEquals(0,f.dialogCount);assertEquals(0,f.dispatched);assertFalse(f.results.single().toString().contains("private"))}finally{f.close()}}
    @Test fun invalidObservationCannotBorrowAnotherContext() {val f=Fixture();try{f.bridge.request("other","a"){f.results+=it};assertEquals("closed",f.results.single().status);assertEquals(0,f.reads);assertEquals(0,f.dialogCount)}finally{f.close()}}
    @Test fun projectionIncrementsOnlyForSemanticChangeAndFailsClosedAtJsLimit() {val p=SelfUnbindBridgeProjection("obs",7,9_007_199_254_740_990L);val a=p.accept("idle","",true);assertEquals(9_007_199_254_740_991L,a.revision);assertEquals(a.revision,p.accept("idle","",true).revision);val closed=p.accept("sending","",false);assertEquals("closed",closed.status);assertFalse(closed.canRequest)}
    @Test fun cancelledQuerySettlesOnceButKeepsActualReadSlotUntilIoReturns():Unit=runBlocking {
        val f=Fixture();val gate=CompletableDeferred<Unit>();try{
            f.beforeRead={withContext(NonCancellable){gate.await()}};f.bridge.get("obs"){f.results+=it};assertEquals(1,f.reads)
            f.bridge.suspendObservation("obs");assertEquals("closed",f.results.single().status)
            f.bridge.get("obs"){f.results+=it};assertEquals("busy",f.results.last().errorCode);assertEquals(1,f.reads)
            gate.complete(Unit);yield();assertEquals(2,f.results.size)
            f.bridge.get("obs"){f.results+=it};assertEquals(2,f.reads);assertEquals("idle",f.results.last().status)
        }finally{gate.complete(Unit);f.close()}
    }
    @Test fun duplicatePromiseRecipientsAndCancelTombstonesAreBounded() {val f=Fixture();try{
        repeat(9){f.request()};assertEquals(1,f.dialogCount);assertEquals("busy",f.results.single().errorCode)
        f.confirm!!();assertEquals(1,f.dispatched);assertEquals(9,f.results.size)
        repeat(65){f.bridge.cancel("obs","attempt-$it")};f.request("new");assertEquals("busy",f.results.last().errorCode);assertEquals(1,f.dispatched)
    }finally{f.close()}}

    @Test fun ownerCancelledDuringCaptureSettlesWithoutPhysicalPreflight() {
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined);var reads=0;val results=mutableListOf<SelfUnbindBridgeState>()
        val context=SelfUnbindBridgeContext("obs",7,{true},{"Public"},{reads++;SelfUnbindBridgeAuthority(SelfUnbindView("","idle"),true)},{error("No dispatch")})
        val bridge=DeviceSelfUnbindBridge(scope,{scope.cancel();context},{_,_,_->error("No dialog")},knownObservation={it=="obs"})
        bridge.request("obs","a"){results+=it};assertEquals(1,results.size);assertEquals("closed",results.single().status);assertEquals(0,reads);bridge.close()
    }

    private class PageCycleFixture {
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        val contexts=mutableMapOf<String,SelfUnbindBridgeContext>();val results=mutableListOf<SelfUnbindBridgeState>()
        var dialogs=0;var reads=0;var dispatches=0;var captures=0
        val bridge=DeviceSelfUnbindBridge(scope,{captures++;contexts[it]},{_,_,_->dialogs++;AutoCloseable {}},knownObservation={contexts.containsKey(it)})
        fun add(id:String){contexts[id]=SelfUnbindBridgeContext(id,7,{contexts.containsKey(id)},{"Public"},{reads++;SelfUnbindBridgeAuthority(SelfUnbindView("","idle"),true)},{dispatches++;SelfUnbindView("native","preparing")})}
        fun release(id:String){contexts.remove(id);bridge.release(id)}
        fun request(id:String,attempt:String){bridge.request(id,attempt){results+=it}}
        fun close(){bridge.close();scope.cancel()}
    }
    @Test fun sixtyFiveNormalCancelReleaseCyclesDoNotPoisonSharedModule() {val f=PageCycleFixture();try{
        repeat(65){n->val id="page-$n";f.add(id);f.bridge.cancel(id,"attempt");f.request(id,"attempt");assertEquals("cancelled",f.results.last().status);f.release(id);f.bridge.cancel(id,"late")}
        f.add("next-page");f.request("next-page","fresh");assertEquals(1,f.dialogs);assertEquals(1,f.reads);assertEquals(0,f.dispatches)
    }finally{f.close()}}
    @Test fun unknownAndReleasedObservationCancelsCannotConsumeBudget() {val f=PageCycleFixture();try{
        repeat(100){f.bridge.cancel("unknown-$it","attempt")};f.add("released");f.release("released");repeat(100){f.bridge.cancel("released","late-$it")}
        f.add("active");f.bridge.cancel("active","before-request");f.request("active","before-request");assertEquals("cancelled",f.results.last().status);assertEquals(0,f.reads)
        f.request("active","fresh");assertEquals(1,f.dialogs);assertEquals(1,f.reads)
    }finally{f.close()}}
    @Test fun releasingSaturatedObservationRestoresBudgetForNewObservation() {val f=PageCycleFixture();try{
        f.add("a");repeat(65){f.bridge.cancel("a","attempt-$it")};f.request("a","fresh");assertEquals("busy",f.results.last().errorCode);assertEquals(0,f.reads)
        f.release("a");f.add("b");f.bridge.cancel("b","cancelled");f.request("b","cancelled");assertEquals("cancelled",f.results.last().status)
        f.request("b","fresh");assertEquals(1,f.dialogs)
    }finally{f.close()}}
    @Test fun missedCancellationAtFullBudgetQuarantinesOnlyThatObservationUntilRelease() {val f=PageCycleFixture();try{
        f.add("a");repeat(64){f.bridge.cancel("a","attempt-$it")};f.add("b");f.bridge.cancel("b","not-stored")
        f.release("a");f.request("b","not-stored");assertEquals("busy",f.results.last().errorCode);assertEquals(0,f.dialogs)
        f.add("c");f.request("c","fresh");assertEquals(1,f.dialogs)
        f.release("b");f.add("d");f.bridge.cancel("d","cancelled");f.request("d","cancelled");assertEquals("cancelled",f.results.last().status)
    }finally{f.close()}}
    @Test fun asynchronousAffirmativeBeginFailureIsUnknownAndCannotBeRetriedAsUnsent() {
        for(error in listOf(java.io.IOException("private begin failure"),CancellationException("private cancellation"))){
            val f=Fixture();try{f.afterBegin={throw error};f.request();val affirmative=f.confirm!!
                // The launch that presented the dialog has returned before this UI callback.
                affirmative();assertEquals(1,f.dispatched);assertEquals("unknown",f.results.single().status);assertEquals("unknown_result",f.results.single().errorCode)
                f.bridge.get("obs"){f.results+=it};assertEquals("unknown",f.results.last().status);assertFalse(f.results.last().canRequest)
                f.request("another-intent");assertEquals(1,f.dispatched);assertEquals(1,f.dialogCount);assertEquals("unknown",f.results.last().status)
                assertFalse(f.results.any {it.toString().contains("private")})
            }finally{f.close()}
        }
    }

    @Test fun pausedKnownObservationRecordsCancelWithoutCaptureAndRejectsLateResumedRequest() {val f=PageCycleFixture();try{
        var resumed=false;val id="paused"
        f.contexts[id]=SelfUnbindBridgeContext(id,7,{resumed},{"Public"},{f.reads++;SelfUnbindBridgeAuthority(SelfUnbindView("","idle"),true)},{f.dispatches++;SelfUnbindView("native","preparing")})
        f.bridge.cancel(id,"late-attempt");assertEquals(0,f.captures);assertEquals(0,f.reads)
        resumed=true;f.request(id,"late-attempt");assertEquals("cancelled",f.results.last().status);assertEquals(0,f.dialogs);assertEquals(0,f.dispatches);assertEquals(0,f.reads)
        f.request(id,"fresh-attempt");assertEquals(1,f.dialogs)
    }finally{f.close()}}

}

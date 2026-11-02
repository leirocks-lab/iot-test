package com.rowan.iot.bridge

import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

class BridgeReadTaskTest {
    @Test fun cancelledOwnerBeforeStartStillCompletesPromiseOnce():Unit=runBlocking {
        val owner=CoroutineScope(Job()+Dispatchers.Unconfined)
        owner.cancel()
        val results=mutableListOf<BridgeReadResult>()
        var reads=0
        val task=bridgeReadTask(owner,{true},results::add) {reads++;"private-result"}
        task.start();task.join()
        assertEquals(0,reads)
        assertEquals(listOf(BridgeReadResult.Failure("closed")),results)
    }
    @Test fun releasedQueuedTaskCannotHangOrDispatch():Unit=runBlocking {
        val results=mutableListOf<BridgeReadResult>()
        var reads=0
        val task=bridgeReadTask(this,{true},results::add) {reads++;"private-result"}
        task.cancel();task.start();task.join()
        assertEquals(0,reads)
        assertEquals(listOf(BridgeReadResult.Failure("closed")),results)
    }
    @Test fun changedPageAfterAwaitDiscardsResult():Unit=runBlocking {
        var current=true
        val waiting=CompletableDeferred<Unit>()
        val results=mutableListOf<BridgeReadResult>()
        val task=bridgeReadTask(this,{current},results::add) {waiting.await();"old-account-data"}
        task.start();yield();current=false;waiting.complete(Unit);task.join()
        assertEquals(listOf(BridgeReadResult.Failure("session_changed")),results)
    }
    @Test fun cancellationDuringReadSettlesOnlyOnce():Unit=runBlocking {
        val started=CompletableDeferred<Unit>()
        val results=mutableListOf<BridgeReadResult>()
        val task=bridgeReadTask(this,{true},results::add) {started.complete(Unit);awaitCancellation()}
        task.start();started.await();task.cancelAndJoin();task.cancel()
        assertEquals(listOf(BridgeReadResult.Failure("closed")),results)
    }
    @Test fun timeoutAndBackendErrorsNeverExposeOriginalException():Unit=runBlocking {
        val timeout=mutableListOf<BridgeReadResult>()
        bridgeReadTask(this,{true},timeout::add,timeoutMillis=5) {awaitCancellation()}.apply {start();join()}
        assertEquals(listOf(BridgeReadResult.Failure("timeout")),timeout)
        val errors=mutableListOf<BridgeReadResult>()
        bridgeReadTask(this,{true},errors::add) {error("private token and URL")}.apply {start();join()}
        assertEquals(listOf(BridgeReadResult.Failure("read_failed")),errors)
    }
    @Test fun successfulReadHasOneTerminalDelivery():Unit=runBlocking {
        val results=mutableListOf<BridgeReadResult>()
        bridgeReadTask(this,{true},results::add) {"display-summary"}.apply {start();join();cancel()}
        assertEquals(listOf(BridgeReadResult.Success("display-summary")),results)
    }
    @Test fun permissionFailureUsesOnlyTheFixedPublicCode():Unit=runBlocking {
        val results=mutableListOf<BridgeReadResult>()
        bridgeReadTask(this,{true},results::add,failureCode={"forbidden"}) {error("private server detail")}
            .apply {start();join()}
        assertEquals(listOf(BridgeReadResult.Failure("forbidden")),results)
    }
    @Test fun arbitraryClassifierOutputCannotBecomeAPublicError():Unit=runBlocking {
        val results=mutableListOf<BridgeReadResult>()
        bridgeReadTask(this,{true},results::add,failureCode={"private token URL"}) {error("private server detail")}
            .apply {start();join()}
        assertEquals(listOf(BridgeReadResult.Failure("read_failed")),results)
    }
}

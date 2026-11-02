package com.rowan.iot.bridge

import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

class BridgeReadLateFailureTest {
    @Test fun aLateErrorCannotExecuteTheClassifierAfterItsBindingIsNoLongerCurrent():Unit=runBlocking {
        var current=true
        var classifications=0
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val results=mutableListOf<BridgeReadResult>()
        val task=bridgeReadTask(this,{current},results::add,failureCode={
            classifications++ // Native ownership revocation is a classifier side effect.
            "forbidden"
        }) {
            entered.complete(Unit);finish.await();throw IllegalStateException("private error")
        }
        task.start();entered.await();current=false;finish.complete(Unit);task.join()
        assertEquals(0,classifications)
        assertEquals(listOf(BridgeReadResult.Failure("session_changed")),results)
    }
}

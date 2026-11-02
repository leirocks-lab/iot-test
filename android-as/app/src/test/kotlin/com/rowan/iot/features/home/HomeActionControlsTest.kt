package com.rowan.iot.features.home

import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

/** Exercises the exact controller used by HomeActivity, including suspended operation/finally. */
class HomeActionControlsTest {
    @Test fun pendingCleanupRenderThenLocalFailureStillEnablesTheSameRetryButton():Unit=runBlocking {
        var enabled=true;var text="退出登录";var pending=false;var deletes=0;var retries=0
        val renders=mutableListOf<Boolean>();val controls=HomeActionControls {enabled=it;renders+=it}
        val cleared=CompletableDeferred<Unit>();val failLocal=CompletableDeferred<Unit>()
        val work=launch(start=CoroutineStart.UNDISPATCHED) {
            controls.runLogout {
                deletes++;pending=true // Account clear publication arrives before disk deletion finishes.
                controls.selectionChanged(false);cleared.complete(Unit)
                try {failLocal.await();throw IllegalStateException("fixture disk failure")}
                catch(_:IllegalStateException) {text="重试本地清理";controls.selectionChanged(false)}
            }
        }
        cleared.await();assertFalse(enabled);assertTrue(controls.loggingOut)
        failLocal.complete(Unit);work.join()
        assertEquals("重试本地清理",text);assertTrue(enabled);assertFalse(controls.loggingOut)
        assertEquals(listOf(false,false,false,true),renders)
        controls.runLogout {if(pending){retries++;pending=false}else deletes++}
        assertEquals(1,deletes);assertEquals(1,retries);assertTrue(enabled)
    }
    @Test fun cancellationFinallyReenablesAfterALaterSelectionRender():Unit=runBlocking {
        var enabled=true;val controls=HomeActionControls {enabled=it};val started=CompletableDeferred<Unit>()
        val work=launch(start=CoroutineStart.UNDISPATCHED) {controls.runLogout {started.complete(Unit);awaitCancellation()}}
        started.await();controls.selectionChanged(false);assertFalse(enabled)
        work.cancelAndJoin();assertTrue(enabled);assertFalse(controls.loggingOut)
    }
    @Test fun duplicateLogoutWhileSuspendedNeverStartsAsecondOperation():Unit=runBlocking {
        val controls=HomeActionControls {};var calls=0;val gate=CompletableDeferred<Unit>()
        val first=launch(start=CoroutineStart.UNDISPATCHED) {controls.runLogout {calls++;gate.await()}}
        controls.runLogout {calls++};assertEquals(1,calls);assertTrue(controls.loggingOut)
        gate.complete(Unit);first.join();assertFalse(controls.loggingOut)
    }
    @Test fun preCancelledCallerDoesNotChangeAnotherPendingOperationOrButton():Unit=runBlocking {
        val renders=mutableListOf<Boolean>();val controls=HomeActionControls {renders+=it};var calls=0
        val gate=CompletableDeferred<Unit>();val live=launch(start=CoroutineStart.UNDISPATCHED) {controls.runLogout {calls++;gate.await()}}
        val before=renders.toList();val cancelledParent=Job().apply {cancel()}
        val cancelled=launch(cancelledParent,start=CoroutineStart.UNDISPATCHED) {runCatching {controls.runLogout {calls++}}}
        cancelled.join();assertEquals(before,renders);assertTrue(controls.loggingOut);assertEquals(1,calls)
        gate.complete(Unit);live.join();assertEquals(true,renders.last())
    }
    @Test fun editingBlocksDispatchAndExitRestoresAvailability():Unit=runBlocking {
        var enabled=true;var calls=0;val controls=HomeActionControls {enabled=it}
        controls.selectionChanged(true);controls.runLogout {calls++};assertFalse(enabled);assertEquals(0,calls)
        controls.selectionChanged(false);assertTrue(enabled);controls.runLogout {calls++};assertEquals(1,calls)
    }
    @Test fun unexpectedOperationFailureStillClearsBusyAndRendersRetry():Unit=runBlocking {
        var enabled=true;val controls=HomeActionControls {enabled=it}
        val failure=runCatching {controls.runLogout {throw IllegalStateException("fixture")}}.exceptionOrNull()
        assertTrue(failure is IllegalStateException);assertFalse(controls.loggingOut);assertTrue(enabled)
    }
}

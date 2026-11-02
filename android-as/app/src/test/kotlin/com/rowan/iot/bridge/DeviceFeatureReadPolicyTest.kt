package com.rowan.iot.bridge

import com.rowan.iot.domain.device.state.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.*
import org.junit.Test

/** Pure native policy + real BridgeReadTask, not a React module/runtime test. */
class DeviceFeatureReadPolicyTest {
    private fun current(
        phase:DeviceReadPhase=DeviceReadPhase.LIVE,
        failure:DeviceReadFailure?=null,
        resourceId:String="resource-a",
        online:Boolean?=true,
    )=DeviceObservationState.Current(DeviceReadSnapshot(
        accountRevision=7,resourceId=resourceId,authorityRevision=1,
        phase=phase,failure=failure,online=online,
    ))

    @Test fun closedObservationsNeverAuthorizeFeatureReads() {
        for(reason in DeviceReadCloseReason.entries)
            assertFalse(deviceFeatureReadAllowed(DeviceObservationState.Closed(reason)))
    }

    @Test fun eitherForbiddenPhaseOrAuthorizationFailureRejectsEvenAnOtherwiseLiveSnapshot() {
        assertFalse(deviceFeatureReadAllowed(current(phase=DeviceReadPhase.FORBIDDEN)))
        assertFalse(deviceFeatureReadAllowed(current(failure=DeviceReadFailure.AUTHORIZATION)))
        assertFalse(deviceFeatureReadAllowed(current(phase=DeviceReadPhase.UNAVAILABLE,failure=DeviceReadFailure.AUTHORIZATION)))
    }

    @Test fun unknownOfflineAndConnectionFailuresStillPermitFreshHttpOwnershipChecks() {
        assertTrue(deviceFeatureReadAllowed(current(online=false)))
        assertTrue(deviceFeatureReadAllowed(current(online=null)))
        assertTrue(deviceFeatureReadAllowed(current(phase=DeviceReadPhase.UNAVAILABLE,failure=DeviceReadFailure.CONNECTION,online=null)))
        assertTrue(deviceFeatureReadAllowed(current(phase=DeviceReadPhase.RECOVERING,failure=DeviceReadFailure.CONNECTION,online=null)))
        assertTrue(deviceFeatureReadAllowed(current(phase=DeviceReadPhase.AUTHORIZING,online=null)))
        assertTrue(deviceFeatureReadAllowed(current(phase=DeviceReadPhase.READING,online=null)))
    }

    @Test fun aLateSuccessCannotCrossRevocationWhileAnotherResourceCompletesNormally():Unit=runBlocking {
        // Owner tests establish that revokeOwnership publishes FORBIDDEN synchronously.
        // Here these flows are precisely the native handle state consumed by the module guard.
        val revokedOwner=MutableStateFlow<DeviceObservationState>(current())
        val otherOwner=MutableStateFlow<DeviceObservationState>(current(resourceId="resource-b"))
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val enteredOther=CompletableDeferred<Unit>();val finishOther=CompletableDeferred<Unit>()
        val denied=mutableListOf<BridgeReadResult>();val allowed=mutableListOf<BridgeReadResult>()
        val registrySame=true
        val a=bridgeReadTask(this,{registrySame&&deviceFeatureReadAllowed(revokedOwner.value)},denied::add) {
            entered.complete(Unit);finish.await();"old-private-summary"
        }
        val b=bridgeReadTask(this,{registrySame&&deviceFeatureReadAllowed(otherOwner.value)},allowed::add) {
            enteredOther.complete(Unit);finishOther.await();"other-resource-summary"
        }
        a.start();b.start();entered.await();enteredOther.await()
        revokedOwner.value=current(phase=DeviceReadPhase.FORBIDDEN,failure=DeviceReadFailure.AUTHORIZATION,online=null)
        finish.complete(Unit);finishOther.complete(Unit);a.join();b.join()
        assertEquals(listOf(BridgeReadResult.Failure("session_changed")),denied)
        assertEquals(listOf(BridgeReadResult.Success("other-resource-summary")),allowed)
        assertFalse(denied.any {it is BridgeReadResult.Success})
    }

    @Test fun closingTheHandleWhileAReadIsPendingDiscardsItsSuccess():Unit=runBlocking {
        val state=MutableStateFlow<DeviceObservationState>(current())
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val results=mutableListOf<BridgeReadResult>()
        val registrySame=true
        val task=bridgeReadTask(this,{registrySame&&deviceFeatureReadAllowed(state.value)},results::add) {
            entered.complete(Unit);finish.await();"late-summary"
        }
        task.start();entered.await();state.value=DeviceObservationState.Closed(DeviceReadCloseReason.RELEASED)
        finish.complete(Unit);task.join()
        assertEquals(listOf(BridgeReadResult.Failure("session_changed")),results)
    }

    @Test fun anAlreadyRevokedHandleDoesNotDispatchANewFeatureRead():Unit=runBlocking {
        val state=current(phase=DeviceReadPhase.FORBIDDEN,failure=DeviceReadFailure.AUTHORIZATION,online=null)
        var reads=0;val results=mutableListOf<BridgeReadResult>()
        val task=bridgeReadTask(this,{deviceFeatureReadAllowed(state)},results::add) {reads++;"private-summary"}
        task.start();task.join()
        assertEquals(0,reads)
        assertEquals(listOf(BridgeReadResult.Failure("session_changed")),results)
    }
}

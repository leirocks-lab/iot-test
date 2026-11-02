package com.rowan.iot

import com.rowan.iot.bridge.DeviceBridgeProjection
import com.rowan.iot.domain.device.state.*
import org.junit.Assert.*
import org.junit.Test

class DeviceBridgeProjectionTest {
    private fun snapshot(version:Long=3,epoch:Long?=7)=DeviceReadSnapshot(4,"device",version,epoch,
        DeviceReadMetadata("酒柜","product","category",null),"{\"private\":true}",true,DeviceReadPhase.LIVE,false,true)
    @Test fun projectsSafeMetadataWithIndependentDeliverySequence() {
        val projection=DeviceBridgeProjection("device","observer",4)
        val first=projection.accept(DeviceObservationState.Current(snapshot()))
        assertEquals(0L,first.revision);assertEquals(3L,first.authorityRevision)
        assertEquals("online",first.online);assertEquals("酒柜",first.title)
        assertFalse(first.toString().contains("private"))
        val next=projection.accept(DeviceObservationState.Current(snapshot(8,9)))
        assertEquals(1L,next.revision);assertEquals(8L,next.authorityRevision)
    }
    @Test fun closedClearsMetadataWithoutRegressingEpochOrAuthority() {
        val projection=DeviceBridgeProjection("device","observer",4)
        projection.accept(DeviceObservationState.Current(snapshot()))
        val terminal=projection.accept(DeviceObservationState.Closed(DeviceReadCloseReason.ACCOUNT_CHANGED))
        assertEquals(7L,terminal.connectionEpoch);assertEquals(3L,terminal.authorityRevision)
        assertEquals("",terminal.title);assertEquals("unknown",terminal.online)
        assertEquals("session_changed",terminal.errorCode);assertEquals("closed",terminal.phase)
        assertFalse(terminal.snapshotAvailable)
        assertEquals(terminal,projection.accept(DeviceObservationState.Current(snapshot(20,20))))
    }
    @Test fun wrongResourceAndAccountCannotPopulateObserver() {
        val projection=DeviceBridgeProjection("device","observer",4)
        val terminal=projection.accept(DeviceObservationState.Current(snapshot().copy(accountRevision=9)))
        assertEquals("closed",terminal.phase);assertEquals("session_changed",terminal.errorCode)
        assertEquals("",terminal.title)
    }
    @Test fun recoveryRetainsEpochButNeverClaimsCurrentOnline() {
        val projection=DeviceBridgeProjection("device","observer",4)
        projection.accept(DeviceObservationState.Current(snapshot()))
        val result=projection.accept(DeviceObservationState.Current(snapshot(4,null).copy(phase=DeviceReadPhase.RECOVERING,stale=true)))
        assertEquals(7L,result.connectionEpoch);assertEquals("unknown",result.online)
        assertEquals("recovering",result.phase)
    }
    @Test fun duplicateSnapshotDoesNotCreateAnArtificialDeliveryGap() {
        val projection=DeviceBridgeProjection("device","observer",4)
        val state=DeviceObservationState.Current(snapshot())
        val first=projection.accept(state)
        assertEquals(first,projection.accept(state))
        assertEquals(0L,projection.current().revision)
    }
    @Test fun regressingOwnerVersionOrEpochTerminatesAndClearsOldData() {
        for(value in listOf(snapshot(2,8),snapshot(4,6))) {
            val projection=DeviceBridgeProjection("device","observer",4)
            projection.accept(DeviceObservationState.Current(snapshot()))
            val result=projection.accept(DeviceObservationState.Current(value))
            assertEquals("invalid_snapshot",result.errorCode)
            assertEquals("closed",result.phase);assertEquals("",result.title)
            assertEquals(7L,result.connectionEpoch);assertEquals(3L,result.authorityRevision)
        }
    }
    @Test fun forbiddenSnapshotDoesNotClaimOnline() {
        val projection=DeviceBridgeProjection("device","observer",4)
        val result=projection.accept(DeviceObservationState.Current(snapshot().copy(
            phase=DeviceReadPhase.FORBIDDEN,metadata=null,online=null,snapshotAvailable=false)))
        assertEquals("failed",result.phase);assertEquals("forbidden",result.errorCode)
        assertEquals("unknown",result.online);assertEquals("",result.title)
    }
}

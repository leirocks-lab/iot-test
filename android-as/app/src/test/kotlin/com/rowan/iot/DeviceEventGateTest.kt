package com.rowan.iot

import com.rowan.iot.bridge.DeviceBridgeSnapshot
import com.rowan.iot.bridge.DeviceEventGate
import org.junit.Assert.*
import org.junit.Test

class DeviceEventGateTest {
    private fun snapshot(revision:Long)=DeviceBridgeSnapshot("d","o",1,revision,revision,1,"","","live","unknown",false,true,"")
    @Test fun stalledJavascriptHasOneInFlightAndOnlyLatestPending() {
        val gate=DeviceEventGate(true)
        assertEquals(1L,gate.offer(snapshot(1))!!.revision)
        for(i in 2L..3000L)assertNull(gate.offer(snapshot(i)))
        assertNull(gate.acknowledge(2))
        assertEquals(3000L,gate.acknowledge(1)!!.revision)
        assertNull(gate.acknowledge(1));assertNull(gate.acknowledge(3000))
    }
    @Test fun lateObservationCreatedInBackgroundDoesNotDispatchUntilVisible() {
        val gate=DeviceEventGate(false)
        assertNull(gate.offer(snapshot(1)));assertNull(gate.offer(snapshot(2)))
        assertEquals(2L,gate.visibility(true)!!.revision)
        assertNull(gate.visibility(true))
    }
    @Test fun pauseDuringFlightDoesNotScheduleMoreUntilResume() {
        val gate=DeviceEventGate(true)
        gate.offer(snapshot(1));gate.visibility(false)
        gate.offer(snapshot(4));assertNull(gate.acknowledge(1))
        assertEquals(4L,gate.visibility(true)!!.revision)
        assertNull(gate.acknowledge(4));assertNull(gate.offer(snapshot(3)))
    }
    @Test fun releaseDropsPendingAndLateAcknowledgement() {
        val gate=DeviceEventGate(true)
        gate.offer(snapshot(1));gate.offer(snapshot(2));gate.close()
        assertNull(gate.acknowledge(1));assertNull(gate.offer(snapshot(3)))
        assertNull(gate.visibility(true))
    }
}

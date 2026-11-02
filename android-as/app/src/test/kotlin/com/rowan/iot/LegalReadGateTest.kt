package com.rowan.iot

import com.rowan.iot.domain.account.LegalReadGate
import org.junit.Assert.*
import org.junit.Test

class LegalReadGateTest {
    @Test fun loadingBackgroundAndBottomAloneCannotCompleteReading() {
        var now = 0L
        val gate = LegalReadGate(60_000) { now }
        gate.setVisible(true)
        now = 90_000
        gate.reachBottom()
        assertFalse(gate.canComplete)
        gate.contentLoaded()
        gate.reachBottom()
        now += 30_000
        gate.setVisible(false)
        now += 300_000
        assertEquals(30, gate.remainingSeconds)
        assertFalse(gate.canComplete)
        gate.setVisible(true)
        now += 30_000
        assertTrue(gate.canComplete)
    }

    @Test fun elapsedTimeWithoutBottomCannotCompleteAndReloadResetsEvidence() {
        var now = 0L
        val gate = LegalReadGate(60_000) { now }
        gate.setVisible(true); gate.contentLoaded()
        now += 60_000
        assertFalse(gate.canComplete)
        gate.reachBottom()
        assertTrue(gate.canComplete)
        gate.reset()
        assertFalse(gate.canComplete)
        gate.contentLoaded()
        assertEquals(60, gate.remainingSeconds)
        assertFalse(gate.canComplete)
    }
}

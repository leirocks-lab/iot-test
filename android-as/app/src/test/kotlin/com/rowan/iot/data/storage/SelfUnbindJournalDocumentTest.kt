package com.rowan.iot.data.storage

import com.rowan.iot.domain.device.more.*
import org.junit.Assert.*
import org.junit.Test

class SelfUnbindJournalDocumentTest {
    private fun record()=SelfUnbindRecord(selfUnbindKey("u","d"),"operation","u","d","p","native-origin",resourceToken="00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002:1")
    @Test fun unknownAndAcknowledgedRoundTripExactOriginWithoutLeakingToString() {
        for(phase in listOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.CONFIRMED)) {
            val record=record().terminal(phase);val decoded=SelfUnbindJournalDocument.decode(SelfUnbindJournalDocument.encode(mapOf(record.key to record))).values.single()
            assertEquals(phase,decoded.phase);assertEquals("native-origin",decoded.originToken);assertFalse(decoded.toString().contains("native-origin"))
        }
    }
    @Test fun corruptOrDuplicateDocumentFailsClosed() {
        assertTrue(runCatching {SelfUnbindJournalDocument.decode("not-json")}.isFailure)
        val record=record();val raw=SelfUnbindJournalDocument.encode(mapOf(record.key to record));val root=org.json.JSONObject(raw)
        root.getJSONArray("records").put(root.getJSONArray("records").getJSONObject(0))
        assertTrue(runCatching {SelfUnbindJournalDocument.decode(root.toString())}.isFailure)
    }
    @Test fun invalidStableIdentityOrEmptyOriginIsRejected() {
        val value=SelfUnbindRecord("wrong","op","u","d","p","")
        assertTrue(runCatching {SelfUnbindJournalDocument.encode(mapOf(value.key to value))}.isFailure)
    }
    @Test fun engineeringBudgetNeverEvictsUnresolvedRecords() {
        val values=(0..64).associate {i->val r=SelfUnbindRecord(selfUnbindKey("u","d$i"),"op$i","u","d$i","p","origin");r.key to r}
        assertTrue(runCatching {SelfUnbindJournalDocument.encode(values)}.isFailure)
    }
    @Test fun absenceEvidenceRetainsItsReasonAndCannotMasqueradeAsAck0() {
        val record=record().terminal(SelfUnbindPhase.ABSENCE_OBSERVED,"not_bound")
        val stored=SelfUnbindJournalDocument.decode(SelfUnbindJournalDocument.encode(mapOf(record.key to record))).values.single()
        assertEquals(SelfUnbindPhase.ABSENCE_OBSERVED,stored.phase);assertEquals("not_bound",stored.errorCode)
        val invalid=record().terminal(SelfUnbindPhase.ACKNOWLEDGED,"not_bound")
        assertTrue(runCatching {SelfUnbindJournalDocument.encode(mapOf(invalid.key to invalid))}.isFailure)
    }
}

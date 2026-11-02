package com.rowan.iot.data.storage

import com.rowan.iot.domain.device.more.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Pure journal document boundaries only; not an AndroidKeyStore/disk execution test. */
class NicknameJournalDocumentTest {
    private fun record(user:String="public-user",resource:String="public-device",target:String=" public target ")=
        NicknameRecord(nicknameKey(user,resource),"public-operation",user,resource,"public-product",target)
    @Test fun documentRoundTripKeepsStableIdentityExactTargetAndUnknownPhase() {
        val value=record();val restored=NicknameJournalDocument.decode(NicknameJournalDocument.encode(mapOf(value.key to value))).values.single()
        assertEquals(value.userId,restored.userId);assertEquals(value.resourceId,restored.resourceId);assertEquals(value.target,restored.target)
        assertEquals(NicknamePhase.UNKNOWN,restored.phase);assertFalse(restored.toString().contains(value.target))
    }
    @Test fun terminalRoundTripDoesNotRevertToPending() {
        val value=record().terminal(NicknamePhase.REJECTED,"forbidden")
        val restored=NicknameJournalDocument.decode(NicknameJournalDocument.encode(mapOf(value.key to value))).values.single()
        assertEquals(NicknamePhase.REJECTED,restored.phase);assertEquals("forbidden",restored.errorCode)
    }
    @Test fun wrongIdentityKeyAndWrongTypedTargetAreNotSilentlyRestored() {
        val value=record();val raw=JSONObject(NicknameJournalDocument.encode(mapOf(value.key to value)))
        raw.getJSONArray("records").getJSONObject(0).put("target",42)
        assertTrue(runCatching {NicknameJournalDocument.decode(raw.toString())}.isFailure)
        val wrong=NicknameRecord("0".repeat(64),"op",value.userId,value.resourceId,"product","target")
        assertTrue(runCatching {NicknameJournalDocument.encode(mapOf(wrong.key to wrong))}.isFailure)
    }
    @Test fun unknownSchemaAndCorruptDocumentFailClosedWithoutReset() {
        assertTrue(runCatching {NicknameJournalDocument.decode("""{"version":2,"records":[]}""")}.isFailure)
        assertTrue(runCatching {NicknameJournalDocument.decode("{")}.isFailure)
    }
    @Test fun duplicateIdentityRecordsAreNotLastWins() {
        val value=record();val raw=JSONObject(NicknameJournalDocument.encode(mapOf(value.key to value)))
        val array=raw.getJSONArray("records");array.put(array.getJSONObject(0))
        assertTrue(runCatching {NicknameJournalDocument.decode(raw.toString())}.isFailure)
    }
    @Test fun storageBudgetRejectsWithoutDroppingUnknownRecords() {
        val oversized=record(target="Q".repeat(NicknameJournalDocument.MAX_BYTES))
        assertTrue(runCatching {NicknameJournalDocument.encode(mapOf(oversized.key to oversized))}.isFailure)
        val records=(1..65).map {record(resource="public-$it")}.associateBy {it.key}
        assertTrue(runCatching {NicknameJournalDocument.encode(records)}.isFailure)
        assertEquals(65,records.size)
    }
}

package com.rowan.iot.domain.device.schedules

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Offline native permit fixtures; not a production product/action registry. */
class ScheduleModelsTest {
    private val scope=ScheduleScope(7,"fixture-device","fixture-product","fixture-model")
    private fun permit(target:ScheduleScope=scope)=ActionPermit(target,"""{"fixtureRelay":"fixture-on"}""","fixture-mode")
    private fun draft(start:String="22:00",zone:String="America/Chicago",repeat:RepeatType=RepeatType.CUSTOM,
        days:List<Int>?=listOf(5,1,5),enabled:Boolean?=null)=ScheduleDraft(
        type=ScheduleType.PERIODIC,startTime=start,endTime="07:00",repeatType=repeat,weekdays=days,timeZone=zone,
        permit=permit(),name="Fixture rule",enabled=enabled)
    private fun existing(enabled:Any?=false):ScheduleRecord {
        val data=JSONObject("""{"id":"fixture-rule","type":"periodic","startTime":"22:00","repeatType":"custom","weekdays":[1,5],"timeZone":"America/Chicago","action":{"fixtureRelay":"fixture-on"},"future":{"version":3}}""")
        if(enabled!=null)data.put("enabled",enabled)
        return ScheduleRecord.decode(scope,data.toString())
    }

    @Test fun createUsesOnlyParameterTableFieldsAndNeverCopiesServerIdOrNextExecution() {
        val json=draft().toCreateJson(scope)
        assertEquals(setOf("type","name","startTime","endTime","repeatType","weekdays","mode","action","timeZone"),json.keys().asSequence().toSet())
        assertEquals("periodic",json.getString("type"));assertEquals("fixture-on",json.getJSONObject("action").getString("fixtureRelay"))
        assertFalse(json.has("id"));assertFalse(json.has("nextExecutionAt"));assertFalse(json.has("enabled"))
        assertEquals(false,draft(enabled=false).toCreateJson(scope).getBoolean("enabled"))
        assertEquals(true,draft(enabled=true).toCreateJson(scope).getBoolean("enabled"))
    }
    @Test fun editCarriesRequiredFieldsAndPreservesAnExistingDisabledFlagExplicitly() {
        val json=draft().toUpdateJson(scope,existing(false))
        assertEquals(false,json.getBoolean("enabled"))
        for(key in listOf("type","startTime","repeatType","action","timeZone"))assertTrue(json.has(key))
        assertFalse(json.has("id"));assertFalse(json.has("nextExecutionAt"));assertFalse(json.has("future"))
    }
    @Test fun unknownEnabledNeedsAnExplicitEditChoiceRatherThanAssumingTrue() {
        assertTrue(runCatching {draft().toUpdateJson(scope,existing(null))}.isFailure)
        assertEquals(false,draft(enabled=false).toUpdateJson(scope,existing(null)).getBoolean("enabled"))
        assertEquals(true,draft(enabled=true).toUpdateJson(scope,existing(false)).getBoolean("enabled"))
    }
    @Test fun customWeekdaysUseIsoRangeAndDeduplicateWithoutChangingTheRepeatType() {
        val json=draft().toCreateJson(scope)
        val days=json.getJSONArray("weekdays")
        assertEquals(listOf(1,5),(0 until days.length()).map {days.getInt(it)})
        for(daysInput in listOf<List<Int>?>(null,emptyList(),listOf(0),listOf(8),listOf(1,-1)))
            assertTrue(runCatching {draft(days=daysInput).toCreateJson(scope)}.isFailure)
    }
    @Test fun timeRequiresExactTwentyFourHourHHmmAndAllowsCrossMidnightWithoutComputingDates() {
        assertEquals("07:00",draft().toCreateJson(scope).getString("endTime"))
        for(time in listOf("24:00","9:00","12:60","-1:00","00:00:00"," 09:00"))
            assertTrue(runCatching {draft(start=time).toCreateJson(scope)}.isFailure)
        assertEquals("00:00",draft(start="00:00").toCreateJson(scope).getString("startTime"))
    }
    @Test fun timezoneMustBeAnAvailableExactIdAndNeverSilentlyFallsBackToGmt() {
        assertEquals("America/Chicago",draft().toCreateJson(scope).getString("timeZone"))
        for(zone in listOf("Not/AZone","america/chicago","GMT+99:99",""," "))
            assertTrue(runCatching {draft(zone=zone).toCreateJson(scope)}.isFailure)
    }
    @Test fun javaLegacyShortIdsAreRejectedWithoutRejectingRealIanaAliasesOrUtc() {
        // Java TimeZone also supports JDK 1.1 compatibility IDs. IANA backward
        // independently defines EST/MST/HST, UTC and Australia/ACT, so neither a
        // slash rule nor removing every SHORT_IDS key is a correct validator.
        // Primary sources: docs.oracle.com Java 17 ZoneId.SHORT_IDS;
        // data.iana.org/time-zones/tzdb/backward and etcetera.
        for(zone in listOf("UTC","GMT","Asia/Shanghai","America/New_York","US/Eastern","Etc/UTC",
            "Australia/ACT","CST6CDT","EST","MST","HST")) {
            assertEquals(zone,draft(zone=zone).toCreateJson(scope).getString("timeZone"))
        }
        val incorrectlyAccepted=listOf("PST","ACT").filter {zone->runCatching {draft(zone=zone).toCreateJson(scope)}.isSuccess}
        assertEquals(emptyList<String>(),incorrectlyAccepted)
    }
    @Test fun permitMustMatchEveryNativeScopeComponentAndDoesNotComeFromAReadAction() {
        val mismatches=listOf(ScheduleScope(8,scope.resourceId,scope.productId,scope.modelVersion),
            ScheduleScope(7,"other-device",scope.productId,scope.modelVersion),
            ScheduleScope(7,scope.resourceId,"other-product",scope.modelVersion),
            ScheduleScope(7,scope.resourceId,scope.productId,"other-model"))
        mismatches.forEach {assertTrue(runCatching {draft().toCreateJson(it)}.isFailure)}
        assertEquals("fixture-on",JSONObject(existing().actionJson!!).getString("fixtureRelay"))
    }
    @Test fun permitPayloadIsDetachedAndCannotBeChangedThroughAJsonReturnedToACaller() {
        val permit=permit()
        val value=draft().copy(permit=permit)
        val first=value.toCreateJson(scope);first.getJSONObject("action").put("fixtureRelay","mutated")
        assertEquals("fixture-on",value.toCreateJson(scope).getJSONObject("action").getString("fixtureRelay"))
        for(json in listOf("{}","[]","null","not-json"))assertTrue(runCatching {ActionPermit(scope,json,null)}.isFailure)
    }
    @Test fun recordsRetainUnknownFieldsAndServerNextExecutionWithoutCalculatingDstLocally() {
        val data=JSONObject("""{"id":"rule","type":"future-type","enabled":false,"repeatType":"future-repeat","action":{"unregistered":7},"timeZone":"future-zone","nextExecutionAt":"server-opaque-next","future":{"flag":true}}""")
        val record=ScheduleRecord.decode(scope,data.toString())
        assertNull(record.type);assertNull(record.repeatType)
        assertEquals(false,record.enabled);assertEquals("server-opaque-next",record.nextExecutionAt)
        assertEquals(true,JSONObject(record.rawJson).getJSONObject("future").getBoolean("flag"))
        data.getJSONObject("future").put("flag",false)
        assertEquals(true,JSONObject(record.rawJson).getJSONObject("future").getBoolean("flag"))
    }
    @Test fun requiredRequestFieldsAreValidatedWithoutInventingATypeRepeatCompatibilityMatrix() {
        for(type in ScheduleType.entries)for(repeat in RepeatType.entries) {
            val json=draft(repeat=repeat,days=if(repeat==RepeatType.CUSTOM)listOf(1) else null).copy(type=type).toCreateJson(scope)
            assertEquals(type.wire,json.getString("type"));assertEquals(repeat.wire,json.getString("repeatType"))
            assertFalse(json.has("date"));assertFalse(json.has("nextExecutionAt"))
        }
    }
    @Test fun serverOwnedFieldsAndUnknownBooleanTypesDoNotBecomeClientDefaults() {
        val record=ScheduleRecord.decode(scope,"""{"id":"rule","enabled":"false","action":{}}""")
        assertNull(record.enabled);assertNull(record.startTime);assertNull(record.nextExecutionAt)
        assertTrue(runCatching {ScheduleRecord.decode(scope,"""{"id":1}""")}.isFailure)
        assertTrue(runCatching {ScheduleRecord.decode(scope,"{}")}.isFailure)
    }
    @Test fun optionalFieldsStayOmittedAndDoNotBecomeNullOrSyntheticModes() {
        val value=ScheduleDraft(ScheduleType.ONCE,"12:00",RepeatType.ONCE,"Etc/UTC",
            ActionPermit(scope,"""{"fixtureSwitch":false}""",null))
        val json=value.toCreateJson(scope)
        assertEquals(setOf("type","startTime","repeatType","timeZone","action"),json.keys().asSequence().toSet())
        assertFalse(json.has("mode"));assertFalse(json.has("endTime"));assertFalse(json.has("weekdays"))
        assertEquals(false,json.getJSONObject("action").getBoolean("fixtureSwitch"))
    }
    @Test fun unknownModelVersionIsExplicitlyNullWhileExistingScheduleDataRemainsReadable() {
        val readScope=scope.copy(modelVersion=null)
        val record=ScheduleRecord.decode(readScope,"""{"id":"existing","enabled":false,"mode":"unregistered-mode","action":{"unregisteredRelay":7},"nextExecutionAt":"server-next"}""")
        assertNull(record.scope.modelVersion)
        assertEquals("existing",record.id);assertEquals(false,record.enabled)
        assertEquals("unregistered-mode",record.mode)
        assertEquals(7,JSONObject(record.actionJson!!).getInt("unregisteredRelay"))
        assertEquals("server-next",record.nextExecutionAt)
        assertFalse(JSONObject(record.rawJson).has("modelVersion"))
    }
    @Test fun unknownModelCannotIssueAnActionPermitOrSerializeAKnownModelsPermit() {
        val readScope=scope.copy(modelVersion=null)
        assertTrue(runCatching {ActionPermit(readScope,"""{"fixtureRelay":"on"}""",null)}.isFailure)
        assertTrue(runCatching {draft().toCreateJson(readScope)}.isFailure)
        val read=ScheduleRecord.decode(readScope,"""{"id":"existing","enabled":false,"action":{"fixtureRelay":"on"}}""")
        assertTrue(runCatching {draft().toUpdateJson(readScope,read)}.isFailure)
        assertTrue(runCatching {scope.copy(modelVersion=" ")}.isFailure)
    }
    @Test fun completeDotSegmentIdsAreNotAcceptedFromAReadListButDotsInsideIdsRemainOpaque() {
        for(id in listOf(".","..")) {
            assertTrue(runCatching {ScheduleRecord.decode(scope,JSONObject().put("id",id).toString())}.isFailure)
        }
        for(id in listOf("rule..one","a.b","rule%2Ename")) {
            assertEquals(id,ScheduleRecord.decode(scope,JSONObject().put("id",id).toString()).id)
        }
    }
}

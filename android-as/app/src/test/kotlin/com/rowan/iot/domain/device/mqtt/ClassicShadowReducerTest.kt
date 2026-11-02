package com.rowan.iot.domain.device.mqtt

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ClassicShadowReducerTest {
    @Test fun requestedEmptySnapshotIsCompleteWithoutInventingReportedValues() {
        val r=reducer()
        assertFalse(r.hasRequestedSnapshot)
        r.query(context)
        message(r,1,"""{"reported":{}}""","get/accepted")
        assertTrue(r.hasRequestedSnapshot)
        assertEquals(0,r.reported().length());assertNull(r.online())
        r.query(context);assertFalse(r.hasRequestedSnapshot)
        message(r,2,"{}","get/accepted")
        assertTrue(r.hasRequestedSnapshot)
        assertEquals(0,r.reported().length())
    }
    @Test fun unsolicitedUpdatesOrOldSnapshotsCannotCompleteANewerQuery() {
        val r=reducer()
        message(r,10,"""{"reported":{"Power":1}}""")
        assertFalse(r.hasRequestedSnapshot)
        r.query(context)
        message(r,9,"""{"reported":{"Power":0}}""","get/accepted")
        assertFalse(r.hasRequestedSnapshot)
        message(r,10,"""{"reported":{"Power":1}}""","get/accepted")
        assertTrue(r.hasRequestedSnapshot)
    }
    @Test fun malformedOrRejectedSnapshotAndDisconnectRemainIncomplete() {
        val r=reducer();r.query(context)
        message(r,1,"""{"reported":[]}""","get/accepted")
        assertFalse(r.hasRequestedSnapshot)
        message(r,1,"""{"reported":{"Power":1}}""","get/accepted")
        assertTrue(r.hasRequestedSnapshot)
        r.receive(context,"\$aws/things/thing-abc/shadow/get/rejected","""{"code":409}""".toByteArray())
        assertFalse(r.hasRequestedSnapshot)
        r.query(context);message(r,2,"""{"reported":{"Power":1}}""","get/accepted")
        assertTrue(r.hasRequestedSnapshot)
        r.disconnect(context);assertFalse(r.hasRequestedSnapshot)
        assertEquals(1,r.reported().getInt("Power"))
    }
    private val context = ShadowContext(7, 3, "resource-42", "thing-abc", "user-9")
    private val profile = ShadowProfile(mapOf(
        listOf("Power") to { value: ShadowValue -> value is ShadowValue.Number && value.value in 0.0..1.0 },
        listOf("config", "level") to { value: ShadowValue -> value is ShadowValue.Number },
    ), OnlineField(listOf("ConnectType"), ShadowValue.Text("online"), ShadowValue.Text("offline")),
        metadata = ShadowMetadata(listOf("EnduserId"), listOf("DeviceId"), listOf("CommandType"),
            ShadowValue.Text("app"), reportedThingRefPath = listOf("DeviceId")))
    private fun reducer(profile: ShadowProfile? = this.profile) = ClassicShadowReducer(context, profile)
    private fun message(r: ClassicShadowReducer, version: Int, state: String, suffix: String = "update/accepted", token: String? = null): ReceiveResult {
        val body = JSONObject().put("version", version).put("state", JSONObject(state))
        if (token != null) body.put("clientToken", token)
        return r.receive(context, "\$aws/things/thing-abc/shadow/$suffix", body.toString().toByteArray())
    }
    private fun command(r: ClassicShadowReducer, token: String = "cmd-1", power: Int = 1, now: Long = 0) =
        r.command(context, token, JSONObject().put("Power", power), now)
    private fun accept(r: ClassicShadowReducer, token: String = "cmd-1", version: Int = 11) =
        message(r, version, """{"desired":{"Power":1}}""", token = token)

    @Test fun exactTopicsAndZeroByteQuery() {
        val r = reducer()
        assertEquals(setOf("get/accepted", "get/rejected", "update/accepted", "update/rejected")
            .map { "\$aws/things/thing-abc/shadow/$it" }.toSet(), r.responseTopics)
        val query = r.query(context)
        assertEquals("\$aws/things/thing-abc/shadow/get", query.topic)
        assertEquals(0, query.payload.size)
        assertEquals(1, query.qos)
        assertFalse(query.retain)
        assertEquals(ReceiveResult.IGNORED, r.receive(context, query.topic, "{}".toByteArray()))
        assertEquals(ReceiveResult.IGNORED, r.receive(context, query.topic + "/accepted/", "{}".toByteArray()))
    }

    @Test fun desiredAndPubackDoNotChangeReportedOrProveDeviceExecution() {
        val r = reducer()
        message(r, 10, """{"reported":{"Power":0,"ConnectType":"online"}}""", "get/accepted")
        val publication = command(r)
        assertEquals(1, publication.qos)
        assertFalse(publication.retain)
        val desired = JSONObject(String(publication.payload)).getJSONObject("state").getJSONObject("desired")
        assertEquals("thing-abc", desired.getString("DeviceId"))
        assertEquals("user-9", desired.getString("EnduserId"))
        assertEquals("app", desired.getString("CommandType"))
        r.puback(context, "cmd-1")
        assertEquals(CommandPhase.SENT, r.commandState("cmd-1")?.phase)
        accept(r)
        assertEquals(CommandPhase.CLOUD_ACCEPTED, r.commandState("cmd-1")?.phase)
        assertEquals(0, r.reported().getInt("Power"))
        assertEquals(true, r.online())
        message(r, 12, """{"reported":{"Power":1}}""", token = "device-own-token")
        assertEquals(CommandPhase.TARGET_REACHED, r.commandState("cmd-1")?.phase)
        assertEquals(12L, r.commandState("cmd-1")?.targetObservedVersion)
    }

    @Test fun reportArrivingBeforeDesiredAcceptedIsRetainedForConfirmation() {
        val r = reducer()
        command(r)
        message(r, 12, """{"reported":{"Power":1}}""")
        assertEquals(CommandPhase.SENDING, r.commandState("cmd-1")?.phase)
        accept(r)
        assertEquals(CommandPhase.TARGET_REACHED, r.commandState("cmd-1")?.phase)
    }

    @Test fun newerPartialThenOlderSnapshotFillsMissingFieldsWithoutRollback() {
        val r = reducer()
        message(r, 12, """{"reported":{"config":{"level":4},"Power":1}}""")
        message(r, 10, """{"reported":{"config":{"level":2,"other":3},"Power":0,"ConnectType":"offline"}}""", "get/accepted")
        assertEquals(4, r.reported().getJSONObject("config").getInt("level"))
        assertEquals(3, r.reported().getJSONObject("config").getInt("other"))
        assertEquals(1, r.reported().getInt("Power"))
        assertEquals(false, r.online())
        assertEquals(ReceiveResult.IGNORED, message(r, 12, """{"reported":{"Power":0}}"""))
        assertEquals(1, r.reported().getInt("Power"))
    }

    @Test fun nestedNullDeletionAndRootDeletionDoNotResurrectFromOldSnapshots() {
        val r = reducer()
        message(r, 10, """{"reported":{"config":{"level":1,"other":2},"Power":0}}""", "get/accepted")
        message(r, 12, """{"reported":{"config":{"level":null}}}""")
        message(r, 11, """{"reported":{"config":{"level":9}}}""")
        assertFalse(r.reported().getJSONObject("config").has("level"))
        assertEquals(2, r.reported().getJSONObject("config").getInt("other"))
        message(r, 20, """{"reported":null}""")
        message(r, 19, """{"reported":{"Power":1}}""", "get/accepted")
        assertEquals(0, r.reported().length())
        message(r, 21, """{"reported":{"config":{"level":7}}}""")
        assertEquals(7, r.reported().getJSONObject("config").getInt("level"))
    }

    @Test fun olderParentDeletionKeepsNewerNestedField() {
        val r = reducer()
        message(r, 20, """{"reported":{"config":{"level":7}}}""")
        message(r, 18, """{"reported":{"config":null}}""", "get/accepted")
        assertEquals(7, r.reported().getJSONObject("config").getInt("level"))
    }

    @Test fun oldAndForeignContextsCannotReadWriteAcknowledgeOrMutateState() {
        val r = reducer()
        command(r)
        for (other in listOf(context.copy(accountRevision = 6), context.copy(connectionEpoch = 2),
            context.copy(resourceID = "other"), context.copy(thingRef = "other"))) {
            assertEquals(ReceiveResult.IGNORED, r.receive(other, r.responseTopics.first(), "{}".toByteArray()))
            assertFalse(r.puback(other, "cmd-1"))
            assertTrue(runCatching { r.query(other) }.isFailure)
            assertTrue(runCatching { r.command(other, "bad", JSONObject().put("Power", 1), 0) }.isFailure)
        }
        assertEquals(0, r.reported().length())
        assertEquals(CommandPhase.SENDING, r.commandState("cmd-1")?.phase)
    }

    @Test fun successiveTargetsCannotBeCompletedByOlderReportOrOldToken() {
        val r = reducer()
        command(r)
        accept(r)
        command(r, "cmd-2", 0)
        assertEquals(CommandPhase.UNKNOWN, r.commandState("cmd-1")?.phase)
        message(r, 12, """{"reported":{"Power":1}}""")
        accept(r, "cmd-2", 13)
        message(r, 12, """{"reported":{"Power":0}}""", "get/accepted")
        assertEquals(CommandPhase.CLOUD_ACCEPTED, r.commandState("cmd-2")?.phase)
        message(r, 14, """{"reported":{"Power":0}}""")
        assertEquals(CommandPhase.TARGET_REACHED, r.commandState("cmd-2")?.phase)
    }

    @Test fun sameTargetNewCommandRequiresANewReportAfterItsOwnAcceptance() {
        val r = reducer()
        command(r)
        accept(r)
        command(r, "cmd-2")
        message(r, 12, """{"reported":{"Power":1}}""")
        accept(r, "cmd-2", 13)
        assertEquals(CommandPhase.CLOUD_ACCEPTED, r.commandState("cmd-2")?.phase)
        message(r, 14, """{"reported":{"Power":1}}""")
        assertEquals(CommandPhase.TARGET_REACHED, r.commandState("cmd-2")?.phase)
    }

    @Test fun snapshotOfAlreadyMatchingValueIsNotNewDeviceConfirmation() {
        val r = reducer()
        command(r)
        accept(r)
        message(r, 12, """{"reported":{"Power":1}}""", "get/accepted")
        assertEquals(CommandPhase.CLOUD_ACCEPTED, r.commandState("cmd-1")?.phase)
    }

    @Test fun timeoutDisconnectAndCloseLeavePendingUnknownAndNeverReplay() {
        val r = reducer()
        command(r)
        r.tick(context, 1999)
        assertEquals(CommandPhase.SENDING, r.commandState("cmd-1")?.phase)
        r.tick(context, 2000)
        assertEquals(CommandPhase.UNKNOWN, r.commandState("cmd-1")?.phase)
        command(r, "cmd-2", now = 3000)
        r.disconnect(context)
        assertEquals(CommandPhase.UNKNOWN, r.commandState("cmd-2")?.phase)
        assertTrue(runCatching { r.query(context) }.isFailure)
        val next = reducer()
        command(next)
        next.close()
        assertEquals(CommandPhase.UNKNOWN, next.commandState("cmd-1")?.phase)
        assertEquals(ReceiveResult.IGNORED, message(next, 12, """{"reported":{"Power":1}}"""))
    }

    @Test fun rejectedResponsesHaveExplicitRecoveryAndNeverInventZeroState() {
        for ((code, recovery) in listOf(404 to ShadowRecovery.UNAVAILABLE, 401 to ShadowRecovery.AUTHORIZATION_REQUIRED,
            403 to ShadowRecovery.AUTHORIZATION_REQUIRED, 409 to ShadowRecovery.GET_REQUIRED)) {
            val r = reducer()
            command(r)
            val payload = """{"code":$code,"clientToken":"cmd-1"}""".toByteArray()
            r.receive(context, "\$aws/things/thing-abc/shadow/update/rejected", payload)
            assertEquals(CommandPhase.REJECTED, r.commandState("cmd-1")?.phase)
            assertEquals(recovery, r.recovery)
            assertEquals(0, r.reported().length())
            if (code == 401 || code == 403) assertTrue(runCatching { r.query(context) }.isFailure)
            if (code == 409) assertEquals(0, r.query(context).payload.size)
        }
    }

    @Test fun invalidPayloadAndUnrelatedRejectedCannotChangeStateOrCommands() {
        val r = reducer()
        command(r)
        for (raw in listOf("{}", "[]", "{", """{"version":1.5,"state":{"reported":{"Power":1}}}""",
            """{"version":-1,"state":{"reported":{"Power":1}}}""",
            """{"version":1,"state":{"reported":{"DeviceId":"foreign","Power":1}}}""")) {
            assertEquals(ReceiveResult.IGNORED, r.receive(context, "\$aws/things/thing-abc/shadow/update/accepted", raw.toByteArray()))
        }
        r.receive(context, "\$aws/things/thing-abc/shadow/update/rejected", """{"code":409,"clientToken":"other"}""".toByteArray())
        assertEquals(CommandPhase.SENDING, r.commandState("cmd-1")?.phase)
        assertEquals(0, r.reported().length())
    }

    @Test fun controlRequiresExplicitProductDictionaryAndValidatedFields() {
        assertTrue(runCatching { command(reducer(null)) }.isFailure)
        val r = reducer()
        assertNull(r.online())
        assertTrue(runCatching { r.command(context, "bad", JSONObject().put("power", 1), 0) }.isFailure)
        assertTrue(runCatching { command(r, power = 9) }.isFailure)
        assertTrue(runCatching { r.command(context, "bad", JSONObject().put("DeviceId", "other"), 0) }.isFailure)
        command(r)
        assertTrue(runCatching { command(r) }.isFailure)
        assertTrue(runCatching { command(r, "x".repeat(65)) }.isFailure)
    }

    @Test fun cachedOnlineIsUnknownAfterDisconnectCloseOrRecoveryFailure() {
        for (action in listOf<(ClassicShadowReducer) -> Unit>(
            { it.disconnect(context) }, { it.close() },
            { it.receive(context, "\$aws/things/thing-abc/shadow/get/rejected", """{"code":401}""".toByteArray()) },
            { it.receive(context, "\$aws/things/thing-abc/shadow/get/rejected", """{"code":403}""".toByteArray()) },
            { it.receive(context, "\$aws/things/thing-abc/shadow/get/rejected", """{"code":404}""".toByteArray()) },
            { it.receive(context, "\$aws/things/thing-abc/shadow/get/rejected", """{"code":409}""".toByteArray()) },
        )) {
            val r = reducer()
            message(r, 10, """{"reported":{"ConnectType":"online"}}""", "get/accepted")
            assertEquals(true, r.online())
            action(r)
            assertNull(r.online())
            assertEquals("online", r.reported().getString("ConnectType"))
        }
    }

    @Test fun unavailableRequiresRequestedFreshGetBeforeAnotherCommand() {
        val r = reducer()
        message(r, 10, """{"reported":{"Power":0,"ConnectType":"online"}}""", "get/accepted")
        r.receive(context, "\$aws/things/thing-abc/shadow/get/rejected", """{"code":404}""".toByteArray())
        assertTrue(runCatching { command(r) }.isFailure)
        message(r, 10, """{"reported":{"Power":0,"ConnectType":"online"}}""", "get/accepted")
        assertEquals(ShadowRecovery.UNAVAILABLE, r.recovery)
        r.query(context)
        message(r, 9, """{"reported":{"Power":0}}""", "get/accepted")
        assertEquals(ShadowRecovery.UNAVAILABLE, r.recovery)
        message(r, 11, """{"reported":{"Power":0,"ConnectType":"online"}}""", "get/accepted")
        assertEquals(ShadowRecovery.NONE, r.recovery)
        assertEquals(true, r.online())
        assertEquals(1, command(r).qos)
    }

    @Test fun controlRequiresExplicitVerifiedMetadataMapping() {
        // Writable fields and online values alone cannot authorize assumed wire metadata.
        val r = reducer(ShadowProfile(profile.writable, profile.connection))
        assertEquals(4, r.responseTopics.size)
        assertEquals(0, r.query(context).payload.size)
        assertTrue(runCatching { command(r) }.isFailure)
    }

    @Test fun alternateProductMappingDoesNotReserveExampleNamesOrMisidentifyDeviceIdProperty() {
        val alternate = ShadowProfile(
            writable = mapOf(listOf("DeviceId") to { value: ShadowValue -> value is ShadowValue.Text }),
            connection = OnlineField(listOf("link"), ShadowValue.Bool(true), ShadowValue.Bool(false)),
            metadata = ShadowMetadata(listOf("meta", "actor"), listOf("meta", "thing"),
                listOf("meta", "source"), ShadowValue.Number(8.0), listOf("identity", "thing")),
        )
        val r = reducer(alternate)
        val publication = r.command(context, "alternate-1", JSONObject().put("DeviceId", "display-slot-1"), 0)
        val desired = JSONObject(String(publication.payload)).getJSONObject("state").getJSONObject("desired")
        assertEquals("display-slot-1", desired.getString("DeviceId"))
        assertEquals("user-9", desired.getJSONObject("meta").getString("actor"))
        assertEquals("thing-abc", desired.getJSONObject("meta").getString("thing"))
        assertEquals(8, desired.getJSONObject("meta").getInt("source"))
        assertFalse(desired.has("EnduserId"))
        assertFalse(desired.has("CommandType"))
        assertEquals(ReceiveResult.APPLIED, message(r, 10,
            """{"reported":{"DeviceId":"display-slot-1","identity":{"thing":"thing-abc"},"link":true}}"""))
        assertEquals(true, r.online())
        assertEquals("display-slot-1", r.reported().getString("DeviceId"))
        assertEquals(ReceiveResult.IGNORED, message(r, 11,
            """{"reported":{"DeviceId":"display-slot-2","identity":{"thing":"foreign"}}}"""))
        assertEquals("display-slot-1", r.reported().getString("DeviceId"))
    }
}

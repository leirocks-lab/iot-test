package com.rowan.iot.domain.device.capabilities

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** All IDs/values here are offline fixtures, never a production product registration. */
class PublishedThingModelTest {
    private val identity = ThingModelIdentity("fixture-product", "published-fixture-2")
    private fun attribute(id: String = "fixtureFlag", type: String = "boolean", access: String = "rw") =
        JSONObject().put("identifier", id).put("dataType", type).put("access", access)
    private fun body(vararg attributes: JSONObject) = JSONObject().put("version", identity.version)
        .put("etag", "W/\"published-fixture-2\"").put("attributes", JSONArray(attributes.toList()))
        .put("services", JSONArray()).put("events", JSONArray())
    private fun parse(data: JSONObject, productId: String = identity.productId) = PublishedThingModelParser.parse(
        identity, ThingModelPayload(productId, data.toString()))
    private fun only(data: JSONObject) = parse(data).attributes.single()

    @Test fun publishedIdentityIsBoundToNativeRequestProvenanceAndExactVersion() {
        val result = parse(body(attribute()))
        assertEquals(identity, result.identity)
        assertEquals("W/\"published-fixture-2\"", result.etag)
        assertFalse(JSONObject(ThingModelPayload(identity.productId, body().toString()).dataJson).has("productID"))
        val wrongProduct = runCatching { parse(body(attribute()), "different-fixture") }.exceptionOrNull() as ThingModelFailure
        assertEquals(ThingModelFailureKind.IDENTITY_MISMATCH, wrongProduct.kind)
        val wrongVersion = runCatching { parse(body(attribute()).put("version", "different-version")) }.exceptionOrNull() as ThingModelFailure
        assertEquals(ThingModelFailureKind.IDENTITY_MISMATCH, wrongVersion.kind)
    }

    @Test fun missingBlankAndNonStringVersionsNeverCreateAPublishedModel() {
        for (value in listOf<Any?>(null, "", " ", 2, JSONObject.NULL)) {
            val data = body(attribute())
            if (value == null) data.remove("version") else data.put("version", value)
            assertTrue(runCatching { parse(data) }.exceptionOrNull() is ThingModelFailure)
        }
    }

    @Test fun parserConsumesDataOnlyAndDoesNotUnwrapOrAcceptABusinessEnvelope() {
        val envelope = JSONObject().put("code", 0).put("data", body(attribute()))
        assertTrue(runCatching { parse(envelope) }.exceptionOrNull() is ThingModelFailure)
        val invalid = runCatching { PublishedThingModelParser.parse(identity, ThingModelPayload(identity.productId, "[]")) }.exceptionOrNull()
        assertTrue(invalid is ThingModelFailure)
    }

    @Test fun booleansStayTypedAndReadPermissionNeverBecomesWritePermission() {
        val writable = only(body(attribute()))
        assertEquals(ThingValueKind.BOOLEAN, writable.kind)
        assertEquals(ThingAccess.READ_WRITE, writable.access)
        assertEquals(WriteConstraintStatus.COMPLETE, writable.writeConstraintStatus)
        assertTrue(writable.acceptsWriteCandidate(true)); assertTrue(writable.acceptsWriteCandidate(false))
        for (value in listOf<Any?>(null, "true", 1, 0, JSONObject.NULL, JSONObject())) assertFalse(writable.acceptsWriteCandidate(value))
        val readonly = only(body(attribute(access = "r")))
        assertEquals(ThingAccess.READ_ONLY, readonly.access)
        assertEquals(WriteConstraintStatus.READ_ONLY, readonly.writeConstraintStatus)
        assertFalse(readonly.acceptsWriteCandidate(true))
    }

    @Test fun accessMustBeExplicitAndNeverComesFromLabelsCategoryOrWritableHints() {
        for (access in listOf<Any?>(null, "write", "RW", true, 1)) {
            val item = attribute().put("label", "Administrator Power").put("category", "WineCooler")
            if (access == null) item.remove("access") else item.put("access", access)
            val parsed = only(body(item))
            assertEquals(ThingAccess.UNKNOWN, parsed.access)
            assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
            assertFalse(parsed.acceptsWriteCandidate(true))
            assertTrue(parsed.issues.contains(ThingModelIssue.UNKNOWN_ACCESS))
        }
    }

    @Test fun enumValuesRemainExactCaseSensitiveStringsAndNeedACompleteUniqueRange() {
        val good = only(body(attribute(type = "enum").put("range", JSONArray(listOf("fixture-on", "fixture-off")))))
        assertEquals(listOf("fixture-on", "fixture-off"), good.enumValues)
        assertTrue(good.acceptsWriteCandidate("fixture-on"))
        for (value in listOf<Any?>("FIXTURE-ON", 1, true, null)) assertFalse(good.acceptsWriteCandidate(value))
        for (range in listOf<Any?>(null, JSONArray(), JSONArray(listOf("on", "on")), JSONArray(listOf("", "off")),
            JSONArray(listOf(" ", "off")), JSONArray(listOf(1, 0)), "on/off", JSONObject().put("on", 1))) {
            val item = attribute(type = "enum")
            if (range != null) item.put("range", range)
            val parsed = only(body(item))
            assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
            assertFalse(parsed.acceptsWriteCandidate("on"))
        }
    }

    @Test fun integerBoundsStepAndUnitAreExplicitWithoutAssumingProductSemantics() {
        val parsed = only(body(attribute("fixtureTemperature", "integer").put("range", JSONArray(listOf(5, 21)))
            .put("step", 2).put("unit", "C")))
        assertEquals(ThingValueKind.INTEGER, parsed.kind)
        assertEquals(5.0, parsed.minimum!!, 0.0); assertEquals(21.0, parsed.maximum!!, 0.0)
        assertEquals(2.0, parsed.step!!, 0.0); assertEquals("C", parsed.unit)
        for (value in listOf(5, 7, 21)) assertTrue(parsed.acceptsWriteCandidate(value))
        for (value in listOf<Any?>(4, 22, 6, 7.5, "7", true, Double.NaN, Double.POSITIVE_INFINITY, null))
            assertFalse(parsed.acceptsWriteCandidate(value))
    }

    @Test fun integerWithoutStepRemainsUnknownRatherThanDefaultingToOne() {
        val parsed = only(body(attribute("fixtureTemperature", "integer").put("range", JSONArray(listOf(5, 20))).put("unit", "C")))
        assertNull(parsed.step)
        assertEquals(5.0, parsed.minimum!!, 0.0)
        assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
        assertTrue(parsed.issues.contains(ThingModelIssue.MISSING_STEP))
        assertFalse(parsed.acceptsWriteCandidate(6))
    }

    @Test fun missingUnitStaysAbsentEvenWhenIdentifierOrNameLooksLikeTemperature() {
        val parsed = only(body(attribute("TargetTemperature", "integer").put("name", "Temperature °C")
            .put("range", JSONArray(listOf(0, 10))).put("step", 1)))
        assertNull(parsed.unit)
        assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
        assertFalse(parsed.acceptsWriteCandidate(3))
    }

    @Test fun malformedRangeAndStepStayUnknownAndNeverWidenTheAllowedDomain() {
        val cases = listOf(
            attribute(type = "integer").put("step", 1),
            attribute(type = "integer").put("range", JSONArray(listOf(20, 5))).put("step", 1),
            attribute(type = "integer").put("range", JSONArray(listOf("5", "20"))).put("step", 1),
            attribute(type = "integer").put("range", JSONArray(listOf(0, 10, 20))).put("step", 1),
            attribute(type = "integer").put("range", JSONArray(listOf(0, 10))).put("step", 0),
            attribute(type = "integer").put("range", JSONArray(listOf(0, 10))).put("step", -1),
            attribute(type = "integer").put("range", JSONArray(listOf(0, 10))).put("step", 0.5),
            attribute(type = "integer").put("range", JSONArray(listOf(0, 10))).put("step", "1"),
            attribute(type = "integer").put("range", JSONArray(listOf(0, 9007199254740992L))).put("step", 1),
        )
        cases.forEach { item ->
            val parsed = only(body(item.put("unit", "fixture-unit")))
            assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
            assertFalse(parsed.acceptsWriteCandidate(5))
            assertTrue(parsed.issues.isNotEmpty())
        }
    }

    @Test fun unsupportedDataTypesRemainUnknownRatherThanGuessingAnAlias() {
        for (type in listOf("bool", "number", "float", "double", "object", "array", "Integer")) {
            val parsed = only(body(attribute(type = type).put("range", JSONArray(listOf(0, 10))).put("step", 1)))
            assertEquals(ThingValueKind.UNKNOWN, parsed.kind)
            assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
            assertTrue(parsed.issues.contains(ThingModelIssue.UNKNOWN_TYPE))
            assertFalse(parsed.acceptsWriteCandidate(1))
        }
    }

    @Test fun legacyInternalShapeAndMixedWireShapesCannotSilentlyAuthorizeWrites() {
        val legacy = JSONObject().put("identifier", "Power").put("type", "boolean").put("writable", true)
        val mixed = attribute().put("type", "boolean").put("writable", true)
        for (item in listOf(legacy, mixed)) {
            val parsed = only(body(item))
            assertEquals(WriteConstraintStatus.UNKNOWN, parsed.writeConstraintStatus)
            assertTrue(parsed.issues.contains(ThingModelIssue.AMBIGUOUS_FORMAT))
            assertFalse(parsed.acceptsWriteCandidate(true))
        }
    }

    @Test fun duplicateIdentifiersAreNotResolvedByLastWinsAndDoNotPoisonUnrelatedAttributes() {
        val parsed = parse(body(attribute("duplicate"), attribute("duplicate", access = "r"), attribute("unique")))
        assertEquals(3, parsed.attributes.size)
        assertNull(parsed.attribute("duplicate"))
        parsed.attributes.filter { it.identifier == "duplicate" }.forEach {
            assertEquals(WriteConstraintStatus.UNKNOWN, it.writeConstraintStatus)
            assertTrue(it.issues.contains(ThingModelIssue.DUPLICATE_IDENTIFIER))
        }
        assertTrue(parsed.attribute("unique")!!.acceptsWriteCandidate(true))
    }

    @Test fun invalidIdentifiersAndUnitsHaveDiagnosticsWithoutGuessingReplacementNames() {
        for (id in listOf("", " ", "bad\u0000name")) {
            val parsed = parse(body(attribute(id)))
            assertNull(parsed.attribute(id))
            assertTrue(parsed.issues.contains(ThingModelIssue.INVALID_IDENTIFIER))
        }
        val invalidUnit = only(body(attribute(type = "integer").put("range", JSONArray(listOf(0, 10))).put("step", 1).put("unit", 42)))
        assertEquals(WriteConstraintStatus.UNKNOWN, invalidUnit.writeConstraintStatus)
        assertTrue(invalidUnit.issues.contains(ThingModelIssue.INVALID_UNIT))
    }

    @Test fun serviceAndEventDefinitionsAreDetachedAndDoNotBecomeExecutableProfiles() {
        val service = JSONObject().put("identifier", "fixtureReset").put("inputs", JSONArray().put(
            JSONObject().put("identifier", "fixtureCounter").put("dataType", "integer")))
            .put("outputs", JSONArray())
        val event = JSONObject().put("identifier", "fixtureFault").put("level", "fixture-level").put("params", JSONArray())
        val data = body().put("services", JSONArray().put(service)).put("events", JSONArray().put(event))
        val parsed = parse(data)
        service.put("identifier", "mutated"); event.put("level", "mutated")
        assertEquals("fixtureReset", parsed.services.single().identifier)
        assertEquals("fixtureCounter", JSONObject(parsed.services.single().definitionJson).getJSONArray("inputs").getJSONObject(0).getString("identifier"))
        assertEquals("fixtureFault", parsed.events.single().identifier)
        assertEquals("fixture-level", parsed.events.single().level)
        assertTrue(parsed.attributes.isEmpty())
    }

    @Test fun absentDefinitionCollectionsStayUnknownInsteadOfInventingAnEmptyCapabilitySet() {
        val data = body(attribute()); data.remove("services"); data.remove("events")
        val parsed = parse(data)
        assertFalse(parsed.servicesKnown); assertFalse(parsed.eventsKnown)
        assertTrue(parsed.issues.contains(ThingModelIssue.INVALID_COLLECTION))
        val explicit = parse(body())
        assertTrue(explicit.servicesKnown); assertTrue(explicit.eventsKnown)
        assertTrue(explicit.services.isEmpty()); assertTrue(explicit.events.isEmpty())
    }

    @Test fun invalidAttributeCollectionCannotBeParsedAsAnEmptyModel() {
        val missing = body(); missing.remove("attributes")
        for (data in listOf(missing, body().put("attributes", JSONObject()), body().put("attributes", JSONObject.NULL))) {
            assertTrue(runCatching { parse(data) }.exceptionOrNull() is ThingModelFailure)
        }
    }
}

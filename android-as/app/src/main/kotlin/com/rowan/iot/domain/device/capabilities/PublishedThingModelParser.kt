package com.rowan.iot.domain.device.capabilities

import org.json.JSONArray
import org.json.JSONObject

/** V1.4 THING-01 data boundary; no HTTP envelope handling or legacy wire aliases. */
object PublishedThingModelParser {
    fun parse(expected: ThingModelIdentity, source: ThingModelPayload): PublishedThingModel {
        if (!validText(expected.productId) || !validText(expected.version) || source.productId != expected.productId)
            throw ThingModelFailure(ThingModelFailureKind.IDENTITY_MISMATCH)
        val body = try { JSONObject(source.dataJson) } catch (_: Exception) {
            throw ThingModelFailure(ThingModelFailureKind.INVALID_DOCUMENT)
        }
        val version = body.opt("version")
        if (version !is String || !validText(version)) throw ThingModelFailure(ThingModelFailureKind.INVALID_DOCUMENT)
        if (version != expected.version) throw ThingModelFailure(ThingModelFailureKind.IDENTITY_MISMATCH)
        val rawAttributes = body.opt("attributes") as? JSONArray
            ?: throw ThingModelFailure(ThingModelFailureKind.INVALID_DOCUMENT)
        val issues = linkedSetOf<ThingModelIssue>()
        val items = (0 until rawAttributes.length()).map { index ->
            val item = rawAttributes.opt(index) as? JSONObject
            if (item == null) {
                issues += ThingModelIssue.INVALID_DEFINITION
                JSONObject()
            } else item
        }
        val counts = items.mapNotNull { (it.opt("identifier") as? String)?.takeIf(::validText) }.groupingBy { it }.eachCount()
        val attributes = items.map { item ->
            parseAttribute(item, (counts[(item.opt("identifier") as? String) ?: ""] ?: 0) > 1).also { issues += it.issues }
        }
        val services = definitions(body, "services", issues)
        val events = definitions(body, "events", issues)
        return PublishedThingModel(expected, (body.opt("etag") as? String)?.takeIf(::validText), attributes,
            services.first.map { ThingServiceDefinition(it.getString("identifier"), it.toString()) },
            events.first.map { ThingEventDefinition(it.getString("identifier"), (it.opt("level") as? String)?.takeIf(::validText), it.toString()) },
            services.second, events.second, issues)
    }

    private fun parseAttribute(item: JSONObject, duplicate: Boolean): ThingAttribute {
        val issues = linkedSetOf<ThingModelIssue>()
        val identifier = (item.opt("identifier") as? String) ?: ""
        if (!validText(identifier)) issues += ThingModelIssue.INVALID_IDENTIFIER
        if (duplicate) issues += ThingModelIssue.DUPLICATE_IDENTIFIER
        if (listOf("type", "writable", "values", "min", "max").any(item::has)) issues += ThingModelIssue.AMBIGUOUS_FORMAT
        val kind = when (item.opt("dataType")) {
            "boolean" -> ThingValueKind.BOOLEAN
            "enum" -> ThingValueKind.ENUM
            "integer" -> ThingValueKind.INTEGER
            else -> ThingValueKind.UNKNOWN.also { issues += ThingModelIssue.UNKNOWN_TYPE }
        }
        val access = when (item.opt("access")) {
            "r" -> ThingAccess.READ_ONLY
            "rw" -> ThingAccess.READ_WRITE
            else -> ThingAccess.UNKNOWN.also { issues += ThingModelIssue.UNKNOWN_ACCESS }
        }
        var unit: String? = null
        if (item.has("unit")) {
            unit = (item.opt("unit") as? String)?.takeIf(::validText)
            if (unit == null) issues += ThingModelIssue.INVALID_UNIT
        }
        var values: List<String>? = null
        var minimum: Double? = null
        var maximum: Double? = null
        var step: Double? = null
        when (kind) {
            ThingValueKind.ENUM -> {
                if (!item.has("range")) issues += ThingModelIssue.MISSING_ENUM
                else {
                    val range = item.opt("range") as? JSONArray
                    if (range == null || range.length() == 0) issues += ThingModelIssue.INVALID_ENUM
                    else {
                        val candidates = (0 until range.length()).map { range.opt(it) }
                        if (candidates.any { it !is String || !validText(it) } || candidates.toSet().size != candidates.size)
                            issues += ThingModelIssue.INVALID_ENUM
                        else values = candidates.map { it as String }
                    }
                }
                if (item.has("step")) issues += ThingModelIssue.INVALID_STEP
            }
            ThingValueKind.INTEGER -> {
                if (!item.has("range")) issues += ThingModelIssue.MISSING_RANGE
                else {
                    val range = item.opt("range") as? JSONArray
                    val low = if (range?.length() == 2) safeInteger(range.opt(0)) else null
                    val high = if (range?.length() == 2) safeInteger(range.opt(1)) else null
                    if (low == null || high == null || low > high) issues += ThingModelIssue.INVALID_RANGE
                    else { minimum = low; maximum = high }
                }
                if (!item.has("step")) issues += ThingModelIssue.MISSING_STEP
                else {
                    val explicit = safeInteger(item.opt("step"))
                    if (explicit == null || explicit <= 0) issues += ThingModelIssue.INVALID_STEP else step = explicit
                }
                if (!item.has("unit")) issues += ThingModelIssue.MISSING_UNIT
            }
            ThingValueKind.BOOLEAN -> {
                if (item.has("range")) issues += ThingModelIssue.INVALID_RANGE
                if (item.has("step")) issues += ThingModelIssue.INVALID_STEP
            }
            ThingValueKind.UNKNOWN -> Unit
        }
        return ThingAttribute(identifier, kind, access, values, minimum, maximum, step, unit, issues)
    }

    /** Keep original parameter definitions; this parser does not authorize service execution. */
    private fun definitions(body: JSONObject, key: String, issues: MutableSet<ThingModelIssue>): Pair<List<JSONObject>, Boolean> {
        val array = body.opt(key) as? JSONArray
        if (array == null) { issues += ThingModelIssue.INVALID_COLLECTION; return emptyList<JSONObject>() to false }
        val result = mutableListOf<JSONObject>()
        val identifiers = mutableSetOf<String>()
        var known = true
        for (index in 0 until array.length()) {
            val item = array.opt(index) as? JSONObject
            val id = item?.opt("identifier") as? String
            if (item == null || id == null || !validText(id) || !identifiers.add(id)) {
                issues += ThingModelIssue.INVALID_DEFINITION
                known = false
            } else {
                if (key == "events" && ((item.opt("level") as? String)?.takeIf(::validText) == null)) {
                    issues += ThingModelIssue.INVALID_DEFINITION; known = false
                }
                result += item
            }
        }
        return result to known
    }

    private fun validText(value: String) = value.isNotBlank() && value.none { it.isISOControl() }
}

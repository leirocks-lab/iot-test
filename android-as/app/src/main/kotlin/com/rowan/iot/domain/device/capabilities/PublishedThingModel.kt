package com.rowan.iot.domain.device.capabilities

import java.util.Collections

/** Native request provenance plus PRODUCT-01's exact published model version. */
data class ThingModelIdentity(val productId: String, val version: String)

/** Local transport envelope. productId is NOT an invented THING-01 response field. */
class ThingModelPayload(val productId: String, val dataJson: String) {
    override fun toString() = "ThingModelPayload(<definition omitted>)"
}

enum class ThingValueKind { BOOLEAN, ENUM, INTEGER, UNKNOWN }
enum class ThingAccess { READ_ONLY, READ_WRITE, UNKNOWN }

/** COMPLETE describes schema constraints only; it grants no user/product write permission. */
enum class WriteConstraintStatus { COMPLETE, READ_ONLY, UNKNOWN }
enum class ThingModelIssue {
    UNKNOWN_TYPE, UNKNOWN_ACCESS, MISSING_RANGE, INVALID_RANGE, MISSING_STEP, INVALID_STEP,
    MISSING_ENUM, INVALID_ENUM, MISSING_UNIT, INVALID_UNIT, AMBIGUOUS_FORMAT,
    INVALID_IDENTIFIER, DUPLICATE_IDENTIFIER, INVALID_COLLECTION, INVALID_DEFINITION,
}
enum class ThingModelFailureKind { IDENTITY_MISMATCH, INVALID_DOCUMENT }
class ThingModelFailure(val kind: ThingModelFailureKind) : Exception("Published thing model: ${kind.name}")

class ThingAttribute internal constructor(
    val identifier: String,
    val kind: ThingValueKind,
    val access: ThingAccess,
    enumValues: List<String>?,
    val minimum: Double?,
    val maximum: Double?,
    val step: Double?,
    val unit: String?,
    issues: Set<ThingModelIssue>,
) {
    val enumValues: List<String>? = enumValues?.let { immutableList(it) }
    val issues: Set<ThingModelIssue> = immutableSet(issues)
    val writeConstraintStatus: WriteConstraintStatus
        get() = when {
            issues.isNotEmpty() || kind == ThingValueKind.UNKNOWN || access == ThingAccess.UNKNOWN -> WriteConstraintStatus.UNKNOWN
            access == ThingAccess.READ_ONLY -> WriteConstraintStatus.READ_ONLY
            else -> WriteConstraintStatus.COMPLETE
        }

    /**
     * Pure raw model-value check. Even true does not authorize publishing: an explicit
     * business binding, native device/account permission, unit semantics and live state
     * must still be checked by the command owner. No role/category/name is inferred.
     */
    fun acceptsWriteCandidate(value: Any?): Boolean = ThingConstraintValidator.accepts(this, value)
}

class ThingServiceDefinition internal constructor(val identifier: String, val definitionJson: String)
class ThingEventDefinition internal constructor(val identifier: String, val level: String?, val definitionJson: String)

class PublishedThingModel internal constructor(
    val identity: ThingModelIdentity,
    val etag: String?,
    attributes: List<ThingAttribute>,
    services: List<ThingServiceDefinition>,
    events: List<ThingEventDefinition>,
    val servicesKnown: Boolean,
    val eventsKnown: Boolean,
    issues: Set<ThingModelIssue>,
) {
    val attributes: List<ThingAttribute> = immutableList(attributes)
    val services: List<ThingServiceDefinition> = immutableList(services)
    val events: List<ThingEventDefinition> = immutableList(events)
    val issues: Set<ThingModelIssue> = immutableSet(issues)
    /** A duplicate or invalid identifier cannot be resolved using last-wins. */
    fun attribute(identifier: String): ThingAttribute? = attributes.singleOrNull {
        it.identifier == identifier && ThingModelIssue.INVALID_IDENTIFIER !in it.issues
    }
}

internal fun <T> immutableList(values: Collection<T>): List<T> = Collections.unmodifiableList(ArrayList(values))
internal fun <T> immutableSet(values: Collection<T>): Set<T> = Collections.unmodifiableSet(LinkedHashSet(values))

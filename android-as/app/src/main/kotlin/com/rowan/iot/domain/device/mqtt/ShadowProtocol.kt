package com.rowan.iot.domain.device.mqtt

import org.json.JSONArray
import org.json.JSONObject

/** All callbacks belong to one authorized resource and one broker connection incarnation. */
data class ShadowContext(
    val accountRevision: Long,
    val connectionEpoch: Long,
    val resourceID: String,
    val thingRef: String,
    val userID: String,
) {
    init {
        require(accountRevision >= 0 && connectionEpoch >= 0)
        require(resourceID.isNotBlank() && userID.isNotBlank())
        require(thingRef.isNotBlank() && thingRef.none { it in "/+#\u0000" })
    }
}

/** Detached JSON values: caller-owned JSONObject mutations cannot alter reducer state. */
sealed interface ShadowValue {
    data object Null : ShadowValue
    data class Text(val value: String) : ShadowValue
    data class Number(val value: Double) : ShadowValue { init { require(value.isFinite()) } }
    data class Bool(val value: Boolean) : ShadowValue
    data class Items(val value: List<ShadowValue>) : ShadowValue
    data class Fields(val value: Map<String, ShadowValue>) : ShadowValue
}

typealias ShadowPath = List<String>
typealias ShadowValidator = (ShadowValue) -> Boolean

data class OnlineField(val path: ShadowPath, val online: ShadowValue, val offline: ShadowValue) {
    init { require(path.isNotEmpty() && online != offline) }
}

/** Exact verified product wire paths; even identity/command metadata has no default names. */
data class ShadowMetadata(
    val userIDPath: ShadowPath,
    val thingRefPath: ShadowPath,
    val commandPath: ShadowPath,
    val commandValue: ShadowValue,
    val reportedThingRefPath: ShadowPath? = null,
) {
    init {
        val paths = listOf(userIDPath, thingRefPath, commandPath)
        require((paths + listOfNotNull(reportedThingRefPath)).all { path -> path.isNotEmpty() && path.all { it.isNotBlank() } })
        require(paths.indices.all { a -> paths.indices.all { b -> a == b || !pathsOverlap(paths[a], paths[b]) } })
        require(commandValue is ShadowValue.Text || commandValue is ShadowValue.Number || commandValue is ShadowValue.Bool)
    }
}

/** Inject only a verified product dictionary. No Power/Online spelling or value is inferred. */
data class ShadowProfile(
    val writable: Map<ShadowPath, ShadowValidator>,
    val connection: OnlineField? = null,
    val targets: Map<ShadowPath, ShadowValidator> = writable,
    val metadata: ShadowMetadata? = null,
)

data class ShadowPublication(val topic: String, val payload: ByteArray, val qos: Int = 1, val retain: Boolean = false)
enum class ReceiveResult { APPLIED, IGNORED }
enum class ShadowRecovery { NONE, UNAVAILABLE, AUTHORIZATION_REQUIRED, GET_REQUIRED }
enum class CommandPhase { SENDING, SENT, CLOUD_ACCEPTED, TARGET_REACHED, REJECTED, UNKNOWN }
enum class UnknownCause { TIMEOUT, DISCONNECTED, CLOSED, SUPERSEDED }

/** TARGET_REACHED is newer observed reported state, never proof that this command caused it. */
data class ShadowCommandState(
    val token: String,
    val phase: CommandPhase,
    val baselineVersion: Long,
    val deadlineMs: Long,
    val expected: Map<ShadowPath, ShadowValue>,
    val cloudAcceptedVersion: Long? = null,
    val targetObservedVersion: Long? = null,
    val rejectionCode: Int? = null,
    val unknownCause: UnknownCause? = null,
) {
    internal val pending: Boolean get() = phase in setOf(CommandPhase.SENDING, CommandPhase.SENT, CommandPhase.CLOUD_ACCEPTED)
}

internal fun parseValue(value: Any?, depth: Int = 0): ShadowValue {
    require(depth <= 32) { "Shadow JSON is too deeply nested" }
    return when (value) {
        null, JSONObject.NULL -> ShadowValue.Null
        is String -> ShadowValue.Text(value)
        is Boolean -> ShadowValue.Bool(value)
        is Number -> ShadowValue.Number(value.toDouble())
        is JSONObject -> {
            require(value.length() <= 4096)
            ShadowValue.Fields(value.keys().asSequence().associateWith { parseValue(value.get(it), depth + 1) })
        }
        is JSONArray -> {
            require(value.length() <= 4096)
            ShadowValue.Items((0 until value.length()).map { parseValue(value.get(it), depth + 1) })
        }
        else -> error("Unsupported Shadow JSON value")
    }
}

internal fun ShadowValue.toJSON(): Any = when (this) {
    ShadowValue.Null -> JSONObject.NULL
    is ShadowValue.Text -> value
    is ShadowValue.Number -> value
    is ShadowValue.Bool -> value
    is ShadowValue.Items -> JSONArray().also { array -> value.forEach { array.put(it.toJSON()) } }
    is ShadowValue.Fields -> JSONObject().also { obj -> value.forEach { (key, item) -> obj.put(key, item.toJSON()) } }
}

internal fun ShadowValue.detached(): ShadowValue = when (this) {
    is ShadowValue.Fields -> ShadowValue.Fields(value.mapValues { it.value.detached() })
    is ShadowValue.Items -> ShadowValue.Items(value.map { it.detached() })
    else -> this
}

internal fun pathsOverlap(a: ShadowPath, b: ShadowPath): Boolean = a.take(minOf(a.size, b.size)) == b.take(minOf(a.size, b.size))

internal fun ShadowValue?.at(path: ShadowPath): ShadowValue? {
    var value = this
    for (key in path) value = (value as? ShadowValue.Fields)?.value?.get(key) ?: return null
    return value
}

internal fun JSONObject.putPath(path: ShadowPath, value: ShadowValue) {
    var parent = this
    for (key in path.dropLast(1)) {
        parent = parent.optJSONObject(key) ?: JSONObject().also { parent.put(key, it) }
    }
    parent.put(path.last(), value.toJSON())
}

internal fun leaves(value: ShadowValue.Fields, prefix: ShadowPath = emptyList()): Map<ShadowPath, ShadowValue> =
    buildMap {
        value.value.forEach { (key, item) ->
            val path = prefix + key
            if (item is ShadowValue.Fields && item.value.isNotEmpty()) putAll(leaves(item, path)) else put(path, item)
        }
    }

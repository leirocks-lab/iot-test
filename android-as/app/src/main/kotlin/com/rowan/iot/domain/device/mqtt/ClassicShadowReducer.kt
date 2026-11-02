package com.rowan.iot.domain.device.mqtt

import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import org.json.JSONObject

/**
 * Transport-free Classic Shadow core (V1.6 Corrected chapter 10). The owner supplies a
 * monotonic clock and dispatches returned publications only after subscription succeeds.
 * No operation reconnects, retries or replays a command. A reconnect needs a new reducer
 * with a fresh connectionEpoch and a get after its four exact subscriptions are active.
 * All entry points are serialized; snapshots are detached from internal mutable state.
 */
class ClassicShadowReducer(private val context: ShadowContext, profile: ShadowProfile? = null) {
    private val profile = profile?.copy(
        writable = profile.writable.mapKeys { it.key.toList() },
        targets = profile.targets.mapKeys { it.key.toList() },
        connection = profile.connection?.let { it.copy(path = it.path.toList(), online = it.online.detached(), offline = it.offline.detached()) },
        metadata = profile.metadata?.let {
            it.copy(userIDPath = it.userIDPath.toList(), thingRefPath = it.thingRefPath.toList(),
                commandPath = it.commandPath.toList(), reportedThingRefPath = it.reportedThingRefPath?.toList())
        },
    )
    private val prefix = "\$aws/things/${context.thingRef}/shadow"
    private val topics = setOf("get/accepted", "get/rejected", "update/accepted", "update/rejected").map { "$prefix/$it" }.toSet()
    val responseTopics: Set<String> get() = topics.toSet()
    private val reported = ReportedTree()
    // Snapshots may contain values last reported before a command. Only update/reported
    // observations are execution evidence; snapshots still improve the displayed state.
    private val evidence = ReportedTree()
    private val commands = linkedMapOf<String, ShadowCommandState>()
    private var maxVersion = -1L
    private var active = true
    private var queryFloor: Long? = null
    /** A valid response to this reducer's current get, including a genuinely empty state. */
    @Volatile var hasRequestedSnapshot=false
        private set
    @Volatile var recovery = ShadowRecovery.NONE
        private set

    @Synchronized fun reported(): JSONObject = reported.snapshot().toJSON() as JSONObject
    /** Cached reported remains visible after failure, but is no longer a live online claim. */
    @Synchronized fun online(): Boolean? = if (!active || recovery != ShadowRecovery.NONE) null else profile?.connection?.let {
        when (reported.at(it.path).value) { it.online -> true; it.offline -> false; else -> null }
    }
    @Synchronized fun commandState(token: String): ShadowCommandState? = commands[token]?.let {
        it.copy(expected = it.expected.entries.associate { entry -> entry.key.toList() to entry.value.detached() })
    }

    private fun checkContext(incoming: ShadowContext) {
        check(active && incoming == context) { "Inactive or stale Shadow context" }
        check(recovery != ShadowRecovery.AUTHORIZATION_REQUIRED) { "Shadow authorization must be repaired" }
    }

    @Synchronized fun query(incoming: ShadowContext): ShadowPublication {
        checkContext(incoming)
        hasRequestedSnapshot=false
        queryFloor = maxVersion
        return ShadowPublication("$prefix/get", byteArrayOf())
    }

    @Synchronized fun command(
        incoming: ShadowContext,
        token: String,
        desired: JSONObject,
        nowMs: Long,
        expected: JSONObject = desired,
        // Local engineering default, configurable by the caller; not a V1.6 guarantee.
        timeoutMs: Long = 2000,
    ): ShadowPublication {
        checkContext(incoming)
        check(recovery == ShadowRecovery.NONE) { "A valid requested get is required before more controls" }
        require(nowMs >= 0 && timeoutMs > 0 && nowMs <= Long.MAX_VALUE - timeoutMs)
        require(token.isNotBlank() && token.toByteArray(Charsets.UTF_8).size <= 64 && token !in commands)
        val dictionary = checkNotNull(profile) { "Verified product dictionary required" }
        val metadata = checkNotNull(dictionary.metadata) { "Verified identity/command metadata mapping required" }
        val desiredValue = parseValue(desired) as ShadowValue.Fields
        val targetValue = parseValue(expected) as ShadowValue.Fields
        val requested = leaves(desiredValue)
        val targets = leaves(targetValue)
        require(requested.isNotEmpty() && targets.isNotEmpty())
        val reserved = listOf(metadata.userIDPath, metadata.thingRefPath, metadata.commandPath)
        require((requested.keys + targets.keys).none { path -> reserved.any { pathsOverlap(path, it) } })
        require(requested.all { (path, value) -> dictionary.writable[path]?.invoke(value) == true }) { "Unverified desired field/value" }
        require(targets.all { (path, value) -> dictionary.targets[path]?.invoke(value) == true }) { "Unverified target field/value" }
        commands.replaceAll { _, old ->
            if (old.pending && old.expected.keys.any { a -> targets.keys.any { b -> pathsOverlap(a, b) } })
                old.copy(phase = CommandPhase.UNKNOWN, unknownCause = UnknownCause.SUPERSEDED) else old
        }
        commands[token] = ShadowCommandState(token, CommandPhase.SENDING, maxVersion, nowMs + timeoutMs, targets)
        val wireDesired = desiredValue.toJSON() as JSONObject
        wireDesired.putPath(metadata.userIDPath, ShadowValue.Text(context.userID))
        wireDesired.putPath(metadata.thingRefPath, ShadowValue.Text(context.thingRef))
        wireDesired.putPath(metadata.commandPath, metadata.commandValue)
        val wire = JSONObject().put("state", JSONObject().put("desired", wireDesired)).put("clientToken", token)
        return ShadowPublication("$prefix/update", wire.toString().toByteArray(Charsets.UTF_8))
    }

    /** Broker PUBACK proves delivery to the broker only. */
    @Synchronized fun puback(incoming: ShadowContext, token: String): Boolean {
        if (!active || incoming != context) return false
        val old = commands[token] ?: return false
        if (old.phase != CommandPhase.SENDING) return false
        commands[token] = old.copy(phase = CommandPhase.SENT)
        return true
    }

    @Synchronized fun receive(incoming: ShadowContext, topic: String, payload: ByteArray): ReceiveResult {
        if (!active || incoming != context || topic !in topics || recovery == ShadowRecovery.AUTHORIZATION_REQUIRED) return ReceiveResult.IGNORED
        // Bound parsing; malformed/foreign input never partially mutates the reducer.
        if (payload.size > 128 * 1024) return ReceiveResult.IGNORED
        val body = try {
            val decoder = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
            JSONObject(decoder.decode(ByteBuffer.wrap(payload)).toString())
        } catch (_: Exception) { return ReceiveResult.IGNORED }
        val token = (body.opt("clientToken") as? String)
        if (topic.endsWith("/rejected")) return rejected(topic, body, token)
        val rawVersion = body.opt("version") as? Number ?: return ReceiveResult.IGNORED
        val version = rawVersion.toDouble()
        if (!version.isFinite() || version < 0 || version > 9_007_199_254_740_991.0 || version % 1.0 != 0.0) return ReceiveResult.IGNORED
        val stamp = version.toLong()
        val state = body.optJSONObject("state") ?: return ReceiveResult.IGNORED
        val branches = try {
            val r = if (state.has("reported")) parseValue(state.get("reported")) else null
            val d = if (state.has("desired")) parseValue(state.get("desired")) else null
            require(r == null || r == ShadowValue.Null || r is ShadowValue.Fields)
            require(d == null || d == ShadowValue.Null || d is ShadowValue.Fields)
            profile?.metadata?.reportedThingRefPath?.let { path ->
                val id = r.at(path)
                require(id == null || id == ShadowValue.Text(context.thingRef))
            }
            profile?.metadata?.thingRefPath?.let { path ->
                val id = d.at(path)
                require(id == null || id == ShadowValue.Text(context.thingRef))
            }
            r to d
        } catch (_: Exception) { return ReceiveResult.IGNORED }
        var changed = false
        val isUpdate = topic == "$prefix/update/accepted"
        branches.first?.let {
            changed = reported.apply(it, stamp) || changed
            if (isUpdate) changed = evidence.apply(it, stamp) || changed
        }
        if (isUpdate && branches.second is ShadowValue.Fields && token != null) {
            val old = commands[token]
            if (old?.pending == true && old.cloudAcceptedVersion == null && stamp > old.baselineVersion) {
                commands[token] = old.copy(phase = CommandPhase.CLOUD_ACCEPTED, cloudAcceptedVersion = stamp)
                changed = true
            }
        }
        maxVersion = maxOf(maxVersion, stamp)
        if (!isUpdate && queryFloor?.let { stamp >= it } == true) {
            queryFloor = null
            if(!hasRequestedSnapshot) {hasRequestedSnapshot=true;changed=true}
            if (recovery != ShadowRecovery.NONE) { recovery = ShadowRecovery.NONE; changed = true }
        }
        changed = confirmTargets() || changed
        return if (changed) ReceiveResult.APPLIED else ReceiveResult.IGNORED
    }

    private fun rejected(topic: String, body: JSONObject, token: String?): ReceiveResult {
        val number = body.opt("code") as? Number ?: return ReceiveResult.IGNORED
        val code = number.toInt()
        if (number.toDouble() != code.toDouble() || code !in 400..599) return ReceiveResult.IGNORED
        if (topic == "$prefix/update/rejected") {
            val old = commands[token] ?: return ReceiveResult.IGNORED
            if (!old.pending) return ReceiveResult.IGNORED
            commands[old.token] = old.copy(phase = CommandPhase.REJECTED, rejectionCode = code)
        }
        recovery = when (code) {
            401, 403 -> ShadowRecovery.AUTHORIZATION_REQUIRED
            404 -> ShadowRecovery.UNAVAILABLE
            409 -> ShadowRecovery.GET_REQUIRED
            else -> recovery
        }
        queryFloor = null
        if(topic=="$prefix/get/rejected"||recovery!=ShadowRecovery.NONE)hasRequestedSnapshot=false
        if (recovery == ShadowRecovery.AUTHORIZATION_REQUIRED) markUnknown(UnknownCause.DISCONNECTED)
        return ReceiveResult.APPLIED
    }

    private fun confirmTargets(): Boolean {
        var changed = false
        commands.replaceAll { _, command ->
            val accepted = command.cloudAcceptedVersion
            if (!command.pending || accepted == null) return@replaceAll command
            val floor = maxOf(accepted, command.baselineVersion)
            val observed = command.expected.map { (path, target) ->
                val current = reported.at(path)
                val proof = evidence.at(path)
                val expectedValue = target.takeUnless { it == ShadowValue.Null }
                if (current.value == expectedValue && proof.value == expectedValue && proof.version > floor) proof.version else null
            }
            if (observed.all { it != null }) {
                changed = true
                command.copy(phase = CommandPhase.TARGET_REACHED, targetObservedVersion = observed.filterNotNull().max())
            } else command
        }
        return changed
    }

    @Synchronized fun tick(incoming: ShadowContext, nowMs: Long) {
        if (!active || incoming != context) return
        commands.replaceAll { _, state ->
            if (state.pending && nowMs >= state.deadlineMs) state.copy(phase = CommandPhase.UNKNOWN, unknownCause = UnknownCause.TIMEOUT) else state
        }
    }

    @Synchronized fun disconnect(incoming: ShadowContext) {
        if (incoming != context) return
        markUnknown(UnknownCause.DISCONNECTED)
        hasRequestedSnapshot=false
        active = false
    }

    @Synchronized fun close() { markUnknown(UnknownCause.CLOSED); hasRequestedSnapshot=false; active = false }

    private fun markUnknown(cause: UnknownCause) {
        commands.replaceAll { _, state -> if (state.pending) state.copy(phase = CommandPhase.UNKNOWN, unknownCause = cause) else state }
    }
}

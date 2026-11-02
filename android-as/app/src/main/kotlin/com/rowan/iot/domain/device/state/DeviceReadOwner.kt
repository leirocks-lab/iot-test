package com.rowan.iot.domain.device.state

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.device.AuthorizedDevice
import com.rowan.iot.domain.device.DeviceAccessGateway
import com.rowan.iot.domain.device.mqtt.*
import com.rowan.iot.domain.device.mqtt.transport.*
import com.rowan.iot.domain.network.ApiFailure
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect

/** Native-only opaque original-resource receipt. Never a bridge/RN DTO. */
class DeviceOwnershipReceipt internal constructor(internal val encoded:String) {
    override fun toString()="DeviceOwnershipReceipt(redacted)"
}

/** Opaque native authorization identity; never a JS DTO or per-MQTT-frame revision. */
class DeviceFeatureAuthority internal constructor()

/**
 * One application-scoped read authority per native account/resource. UI/RN observers
 * own handles only; authorization, the single lease/reducer and bounded collectors
 * survive a view's cancelled await. No method publishes a control command.
 */
class DeviceReadOwner(
    applicationScope: CoroutineScope,
    private val accountContexts: StateFlow<AccountContext>,
    private val gateway: DeviceAccessGateway,
    private val openAuthorizedLease: suspend (AuthorizedDevice, String) -> ShadowLease,
    private val invalidateAccount: (Long) -> Unit,
    private val readProfile: suspend (AuthorizedDevice) -> ShadowProfile?,
    private val policy: DeviceReadPolicy = DeviceReadPolicy(),
) : AutoCloseable {
    private data class Identity(val revision: Long, val userId: String)
    private data class ResourceKey(val identity: Identity, val resourceId: String)
    /** Cancellation-safe ownership handoff through a bounded mailbox. */
    private class Transfer(val lease: ShadowLease) {
        private val phase = AtomicInteger(0) // unclaimed, owner claimed, closed
        fun claim() = phase.compareAndSet(0, 1)
        fun discard() { if (phase.compareAndSet(0, 2)) safeClose(lease) }
        fun release() { if (phase.getAndSet(2) != 2) safeClose(lease) }
    }
    private sealed interface Event {
        val generation: Long
        data class Metadata(override val generation: Long, val device: AuthorizedDevice) : Event
        data class Opened(override val generation: Long, val device: AuthorizedDevice, val profile: ShadowProfile?, val transfer: Transfer) : Event
        data class Failed(override val generation: Long, val failure: DeviceReadFailure) : Event
        data class Transport(override val generation: Long, val state: LeaseState) : Event
        data class Message(override val generation: Long, val message: BrokerMessage, val beforeReady: Boolean) : Event
        data class GetFailed(override val generation: Long, val epoch: Long, val failure: DeviceReadFailure) : Event
        data class Deadline(override val generation: Long, val epoch: Long) : Event
    }
    private inner class Resource(val key: ResourceKey) {
        val serial = sequence.incrementAndGet()
        val ownershipSerial=++ownershipSequence
        val handles = linkedMapOf<String, Handle>()
        val job = SupervisorJob(ownerJob)
        val scope = CoroutineScope(ownerScope.coroutineContext + job)
        val events = Channel<Event>(policy.mailboxCapacity, onUndeliveredElement = { if (it is Event.Opened) it.transfer.discard() })
        var closed = false
        var ownershipRevoked = false
        var featureAuthority=DeviceFeatureAuthority()
        var authorizationPending=false
        var generation = 0L
        var snapshot = DeviceReadSnapshot(key.identity.revision, key.resourceId, revisions.incrementAndGet())
        var initialization: Job? = null
        var messages: Job? = null
        var states: Job? = null
        var query: Job? = null
        var deadline: Job? = null
        var transfer: Transfer? = null
        // Everything below is changed by this resource's actor, never by UI callbacks.
        var authorized: AuthorizedDevice? = null
        var profile: ShadowProfile? = null
        var reducer: ClassicShadowReducer? = null
        var context: ShadowContext? = null
        var epoch: Long? = null
        val installedEpoch = AtomicLong(-1)
        var confirmedJson: String? = null
        val pending = java.util.ArrayDeque<BrokerMessage>()
        var poisonedEpoch: Long? = null
        var discardPreReadyThrough = -1L
        var actor: Job? = null
    }
    private inner class Handle(val resource: Resource?, val observerId: String, initial: DeviceObservationState) : DeviceReadHandle {
        val released = AtomicBoolean(resource == null)
        val mutable = MutableStateFlow(initial)
        override val state = mutable.asStateFlow()
        override fun getSnapshot(): DeviceReadSnapshot = snapshotFor(this)
        override fun retry() { if (!released.get()) retryResource(this) }
        override fun close() { if (released.compareAndSet(false, true)) release(this) }
        fun closed(reason: DeviceReadCloseReason) { released.set(true); mutable.value = DeviceObservationState.Closed(reason) }
    }

    private val monitor = Any()
    private val ownerJob = SupervisorJob(applicationScope.coroutineContext[Job])
    private val ownerScope = CoroutineScope(applicationScope.coroutineContext + ownerJob)
    private val resources = linkedMapOf<ResourceKey, Resource>()
    private val ownershipOwnerId=UUID.randomUUID()
    private var ownershipSequence=0L
    private val invalidated = mutableSetOf<Long>()
    private var closed = false
    private var applicationWatch: Job? = null

    init {
        ownerScope.launch(start = CoroutineStart.UNDISPATCHED) {
            accountContexts.collect { revokeObsolete() }
        }
        applicationWatch = applicationScope.launch(start = CoroutineStart.UNDISPATCHED) {
            try { awaitCancellation() } finally { close() }
        }
    }

    private fun identity(): Identity? = accountContexts.value.let { context ->
        context.session?.takeUnless { context.cleanupRequired }?.let { Identity(context.revision, it.userId) }
    }
    private fun validLocked(resource: Resource, generation: Long? = null) = !closed && !resource.closed &&
        resources[resource.key] === resource && identity() == resource.key.identity && resource.handles.isNotEmpty() &&
        (generation == null || resource.generation == generation)
    private fun valid(resource: Resource, generation: Long) = synchronized(monitor) { validLocked(resource, generation) }

    fun observe(resourceId: String, nativeObserverID: String): DeviceReadHandle {
        revokeObsolete()
        var start: Resource? = null
        val handle = synchronized(monitor) {
            if (closed) return Handle(null, nativeObserverID, DeviceObservationState.Closed(DeviceReadCloseReason.OWNER_CLOSED))
            val current = identity() ?: return Handle(null, nativeObserverID, DeviceObservationState.Closed(DeviceReadCloseReason.NO_ACCOUNT))
            if (resourceId.isBlank() || resourceId.any { it.isISOControl() } || nativeObserverID.isBlank())
                return Handle(null, nativeObserverID, DeviceObservationState.Closed(DeviceReadCloseReason.NO_ACCOUNT))
            val key = ResourceKey(current, resourceId)
            val resource = resources[key] ?: Resource(key).also { resources[key] = it; start = it }
            if (resource.handles.containsKey(nativeObserverID))
                return Handle(null, nativeObserverID, DeviceObservationState.Closed(DeviceReadCloseReason.DUPLICATE_OBSERVER))
            Handle(resource, nativeObserverID, DeviceObservationState.Current(resource.snapshot)).also { resource.handles[nativeObserverID] = it }
        }
        start?.let { resource ->
            resource.actor = resource.scope.launch { actor(resource) }
            initialize(resource)
        }
        return handle
    }

    /** A native handle fences late rejections from released views or replacement resources. */
    /** Issue while the actual handle is live; the value outlives that page's handle.
     * Serial identity is unique within this owner and never reused for a later rebind. */
    internal fun captureOwnershipReceipt(handle:DeviceReadHandle):DeviceOwnershipReceipt?=synchronized(monitor) {
        val owned=handle as? Handle?:return@synchronized null
        val resource=owned.resource?:return@synchronized null
        if(owned.released.get()||!validLocked(resource)||resource.handles[owned.observerId]!==owned||resource.ownershipRevoked||resource.authorizationPending)return@synchronized null
        DeviceOwnershipReceipt("$ownershipProcessId:$ownershipOwnerId:${resource.ownershipSerial}")
    }
    /** Only trusted native operations/journal recovery may supply this receipt.
     * A foreign owner in this live process is NOT evidence that its resource retired. */
    internal fun retireOwnershipReceipt(encoded:String):Boolean=synchronized(monitor) {
        val parts=encoded.split(':')
        if(parts.size!=3)return@synchronized false
        val process=try {UUID.fromString(parts[0])}catch(_:IllegalArgumentException){return@synchronized false}
        val owner=try {UUID.fromString(parts[1])}catch(_:IllegalArgumentException){return@synchronized false}
        val serial=parts[2].toLongOrNull()?.takeIf {it>0}?:return@synchronized false
        if(process!=ownershipProcessId)return@synchronized true // Original process and all its resources ended.
        if(owner!=ownershipOwnerId||serial>ownershipSequence)return@synchronized false
        val resource=resources.values.firstOrNull {it.ownershipSerial==serial}?:return@synchronized true
        if(resource.closed||resource.ownershipRevoked)return@synchronized true
        if(!validLocked(resource)) {closeResourceLocked(resource,DeviceReadCloseReason.ACCOUNT_CHANGED);return@synchronized true}
        resource.ownershipRevoked=true;resource.generation++;failed(resource,DeviceReadFailure.AUTHORIZATION)
        resource.ownershipRevoked
    }

    internal fun captureFeatureAuthority(handle:DeviceReadHandle):DeviceFeatureAuthority?=synchronized(monitor) {
        val value=handle as? Handle?:return@synchronized null;val resource=value.resource?:return@synchronized null
        if(value.released.get()||!validLocked(resource)||resource.handles[value.observerId]!==value||resource.ownershipRevoked||resource.authorizationPending||resource.snapshot.phase==DeviceReadPhase.FORBIDDEN)return@synchronized null
        resource.featureAuthority
    }
    internal fun featureReadCurrent(handle:DeviceReadHandle,authority:DeviceFeatureAuthority):Boolean = captureFeatureAuthority(handle)===authority
    /** Same-process trusted ACK invalidation; no DELETE and no claim that this new page is unbound.
     * Application serializes relationship replacement and per-record idempotence before calling. */
    internal fun invalidateAcknowledgedAuthority(expectedRevision:Long,userId:String,resourceId:String):Boolean=synchronized(monitor) {
        if(closed||identity()!=Identity(expectedRevision,userId))return@synchronized false
        val resource=resources[ResourceKey(Identity(expectedRevision,userId),resourceId)]?:return@synchronized true
        // Original receipt revocation remains terminal for its own resource. Only later live resources reauthorize.
        if(resource.ownershipRevoked)return@synchronized true
        if(!validLocked(resource))return@synchronized false
        resource.featureAuthority=DeviceFeatureAuthority();resource.authorizationPending=true;resource.generation++
        stopBindingLocked(resource);resource.reducer?.close();resource.reducer=null;resource.context=null;resource.epoch=null
        resource.confirmedJson=null;resource.authorized=null;resource.profile=null;resource.installedEpoch.set(-1)
        resource.pending.clear();resource.poisonedEpoch=null
        publishLocked(resource,resource.snapshot.copy(metadata=null,reportedJson="{}",online=null,connectionEpoch=null,
            snapshotAvailable=false,stale=false,phase=DeviceReadPhase.AUTHORIZING,failure=null))
        initialize(resource);true
    }

    fun revokeOwnership(handle: DeviceReadHandle): Boolean = synchronized(monitor) {
        val owned=handle as? Handle ?: return@synchronized false
        val resource=owned.resource ?: return@synchronized false
        if(owned.released.get()||!validLocked(resource)||resource.handles[owned.observerId]!==owned||resource.ownershipRevoked)
            return@synchronized false
        resource.ownershipRevoked=true
        resource.generation++
        // Actor transitions use this same monitor, so no prior event can publish
        // between invalidating the generation and clearing every observer's cache.
        failed(resource,DeviceReadFailure.AUTHORIZATION)
        true
    }

    private fun initialize(resource: Resource) {
        val generation: Long
        lateinit var task: Job
        synchronized(monitor) {
            if (!validLocked(resource)||resource.ownershipRevoked) return
            stopBindingLocked(resource)
            generation = ++resource.generation
            publishLocked(resource, resource.snapshot.copy(connectionEpoch = null, online = null,
                phase = DeviceReadPhase.AUTHORIZING, stale = resource.confirmedJson != null, snapshotAvailable = false, failure = null))
            task = resource.scope.launch(start = CoroutineStart.LAZY) {
                var transfer: Transfer? = null
                var handedOff = false
                try {
                    val opened = withTimeoutOrNull(policy.initializationTimeoutMillis) {
                        val device = gateway.authorize(resource.key.resourceId, resource.key.identity.revision)
                        currentCoroutineContext().ensureActive()
                        if (!valid(resource, generation)) return@withTimeoutOrNull null
                        if (device.accountRevision != resource.key.identity.revision || device.resourceId != resource.key.resourceId || device.userId != resource.key.identity.userId)
                            throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
                        resource.events.send(Event.Metadata(generation, device))
                        val profile = readProfile(device)
                        currentCoroutineContext().ensureActive()
                        if (!valid(resource, generation)) return@withTimeoutOrNull null
                        val lease = openAuthorizedLease(device, "native-read:${resource.serial}:$generation")
                        val held = Transfer(lease).also { transfer = it }
                        currentCoroutineContext().ensureActive()
                        if (!valid(resource, generation)) return@withTimeoutOrNull null
                        if (lease.resource.accountRevision != device.accountRevision || lease.resource.resourceID != device.resourceId)
                            throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
                        Event.Opened(generation, device, profile, held)
                    }
                    if (opened == null) {
                        if (valid(resource, generation)) resource.events.send(Event.Failed(generation, DeviceReadFailure.INITIALIZATION_TIMEOUT))
                    } else {
                        resource.events.send(opened)
                        handedOff = true
                    }
                } catch (error: CancellationException) { throw error }
                catch (error: Exception) {
                    if (valid(resource, generation)) resource.events.send(Event.Failed(generation, failure(error)))
                } finally {
                    if (!handedOff) transfer?.discard()
                    synchronized(monitor) { if (resource.initialization === task) resource.initialization = null }
                }
            }
            resource.initialization = task
        }
        task.start()
    }

    private suspend fun actor(resource: Resource) {
        try {
            for (event in resource.events) {
                // Retry/release and an event's entire synchronous state transition
                // share this lock. A generation cannot be superseded between its
                // check and its publication or lease installation.
                synchronized(monitor) {
                    if (!validLocked(resource, event.generation)) {
                        if (event is Event.Opened) event.transfer.discard()
                    } else {
                        try {
                            when (event) {
                                is Event.Metadata -> {resource.authorizationPending=false;publish(resource, resource.snapshot.copy(metadata = metadata(event.device),
                                    phase = DeviceReadPhase.CONNECTING, online = null))}
                                is Event.Opened -> install(resource, event)
                                is Event.Failed -> failed(resource, event.failure)
                                is Event.Transport -> transport(resource, event.generation, event.state)
                                is Event.Message -> message(resource, event.message, event.beforeReady)
                                is Event.GetFailed -> if (event.epoch == resource.epoch && resource.reducer?.hasRequestedSnapshot != true) failedRead(resource, event.failure)
                                is Event.Deadline -> if (event.epoch == resource.epoch && resource.reducer?.hasRequestedSnapshot != true) failedRead(resource, DeviceReadFailure.SNAPSHOT_TIMEOUT)
                            }
                        } catch (error: CancellationException) { throw error }
                        catch (_: Exception) { failedRead(resource, DeviceReadFailure.CONFIGURATION) }
                    }
                }
            }
        } finally { resource.reducer?.close() }
    }

    private fun install(resource: Resource, event: Event.Opened) {
        if (!event.transfer.claim()) return
        val accepted = synchronized(monitor) {
            if (!validLocked(resource, event.generation)) false else {
                resource.transfer = event.transfer
                resource.authorized = event.device
                resource.profile = event.profile?.copy(writable = emptyMap(), targets = emptyMap())
                true
            }
        }
        if (!accepted) { event.transfer.release(); return }
        resource.reducer?.close(); resource.reducer = null; resource.context = null; resource.epoch = null
        resource.installedEpoch.set(-1); resource.pending.clear(); resource.poisonedEpoch = null
        resource.discardPreReadyThrough = -1
        val lease = event.transfer.lease
        // Fixed collectors with suspending bounded sends: no coroutine per packet.
        resource.messages = resource.scope.launch(start = CoroutineStart.UNDISPATCHED) {
            try {
                lease.messages.collect { frame ->
                    val preReady = frame.epoch != resource.installedEpoch.get()
                    resource.events.send(Event.Message(event.generation, frame, preReady))
                }
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) { resource.events.send(Event.Failed(event.generation, failure(error))) }
        }
        resource.states = resource.scope.launch(start = CoroutineStart.UNDISPATCHED) {
            try { lease.state.collect { resource.events.send(Event.Transport(event.generation, it)) } }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) { resource.events.send(Event.Failed(event.generation, failure(error))) }
        }
    }

    private fun transport(resource: Resource, generation: Long, state: LeaseState) {
        when (state) {
            is LeaseState.Ready -> ready(resource, generation, state)
            is LeaseState.Recovering -> {
                resource.query?.cancel(); resource.deadline?.cancel(); resource.reducer?.close(); resource.reducer = null
                resource.installedEpoch.set(-1)
                publish(resource, resource.snapshot.copy(phase = DeviceReadPhase.RECOVERING, online = null,
                    snapshotAvailable = false, stale = resource.confirmedJson != null, failure = DeviceReadFailure.CONNECTION))
            }
            is LeaseState.Failed -> failed(resource, if (state.kind == BrokerFailureKind.AUTHORIZATION || state.kind == BrokerFailureKind.SUBSCRIPTION_DENIED)
                DeviceReadFailure.AUTHORIZATION else DeviceReadFailure.CONNECTION)
            is LeaseState.Closed -> failed(resource, DeviceReadFailure.CONNECTION)
            is LeaseState.Connecting, is LeaseState.Subscribing -> publish(resource, resource.snapshot.copy(
                phase = DeviceReadPhase.CONNECTING, online = null, snapshotAvailable = false, stale = resource.confirmedJson != null))
        }
    }

    private fun ready(resource: Resource, generation: Long, ready: LeaseState.Ready) {
        val lease = resource.transfer?.lease ?: return
        if (ready.key.accountRevision != resource.key.identity.revision) { failed(resource, DeviceReadFailure.CONFIGURATION); return }
        if (resource.epoch?.let { ready.epoch <= it } == true) return
        resource.query?.cancel(); resource.deadline?.cancel(); resource.reducer?.close()
        val user = resource.authorized?.userId ?: return
        val context = ShadowContext(resource.key.identity.revision, ready.epoch, resource.key.resourceId, lease.resource.thingRef, user)
        val reducer = ClassicShadowReducer(context, resource.profile)
        resource.context = context; resource.reducer = reducer; resource.epoch = ready.epoch
        resource.installedEpoch.set(ready.epoch)
        reducer.query(context) // Register the requested snapshot before a synchronous get response.
        publish(resource, resource.snapshot.copy(connectionEpoch = ready.epoch, phase = DeviceReadPhase.READING,
            reportedJson = resource.confirmedJson ?: "{}", online = null, snapshotAvailable = false,
            stale = resource.confirmedJson != null, failure = null))
        resource.deadline = resource.scope.launch {
            delay(policy.snapshotTimeoutMillis)
            resource.events.send(Event.Deadline(generation, ready.epoch))
        }
        resource.query = resource.scope.launch(start = CoroutineStart.UNDISPATCHED) {
            try { lease.get(ready.epoch) }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) { resource.events.send(Event.GetFailed(generation, ready.epoch, failure(error))) }
        }
        val gap = resource.poisonedEpoch?.let { it >= ready.epoch } == true
        if (gap) resource.discardPreReadyThrough = maxOf(resource.discardPreReadyThrough, ready.epoch)
        val preceding = resource.pending.toList()
        resource.pending.clear()
        if (resource.poisonedEpoch?.let { ready.epoch >= it } == true) resource.poisonedEpoch = null
        preceding.forEach { frame ->
            if (frame.epoch > ready.epoch) buffer(resource, frame)
            else if (frame.epoch == ready.epoch && !gap) apply(resource, frame)
        }
    }

    private fun message(resource: Resource, frame: BrokerMessage, beforeReady: Boolean) {
        if (frame.epoch < 0 || beforeReady && frame.epoch <= resource.discardPreReadyThrough) return
        val epoch = resource.epoch
        if (epoch == null || frame.epoch > epoch) { buffer(resource, frame); return }
        if (frame.epoch < epoch || resource.reducer == null) return
        apply(resource, frame)
    }
    private fun buffer(resource: Resource, frame: BrokerMessage) {
        val poisoned = resource.poisonedEpoch
        if (poisoned != null) { resource.poisonedEpoch = maxOf(poisoned, frame.epoch); return }
        if (resource.pending.size >= policy.pendingMessageCapacity) {
            resource.poisonedEpoch = maxOf(frame.epoch, resource.pending.maxOfOrNull { it.epoch } ?: frame.epoch)
            resource.pending.clear()
        } else resource.pending.addLast(frame)
    }
    private fun apply(resource: Resource, frame: BrokerMessage) {
        val reducer = resource.reducer ?: return
        val context = resource.context ?: return
        reducer.receive(context, frame.topic, frame.payload)
        when (reducer.recovery) {
            ShadowRecovery.AUTHORIZATION_REQUIRED -> { failed(resource, DeviceReadFailure.AUTHORIZATION); return }
            ShadowRecovery.UNAVAILABLE, ShadowRecovery.GET_REQUIRED -> { failedRead(resource, DeviceReadFailure.PROTOCOL); return }
            ShadowRecovery.NONE -> Unit
        }
        if (!reducer.hasRequestedSnapshot) return
        val json = reducer.reported().toString()
        resource.confirmedJson = json
        resource.deadline?.cancel(); resource.deadline = null
        // The actual response is stronger evidence for this read than a delayed
        // PUBACK. Cancelling this wait must not close another observer's transport.
        resource.query?.cancel(); resource.query = null
        publish(resource, resource.snapshot.copy(phase = DeviceReadPhase.LIVE, reportedJson = json,
            online = reducer.online(), stale = false, snapshotAvailable = true, failure = null))
    }

    private fun failedRead(resource: Resource, failure: DeviceReadFailure) {
        resource.deadline?.cancel(); resource.deadline = null
        publish(resource, resource.snapshot.copy(phase = DeviceReadPhase.UNAVAILABLE, online = null,
            snapshotAvailable = false, stale = resource.confirmedJson != null, failure = failure))
    }
    private fun failed(resource: Resource, failure: DeviceReadFailure) {
        synchronized(monitor) {
            if (!validLocked(resource)) return
            stopBindingLocked(resource)
        }
        resource.reducer?.close(); resource.reducer = null; resource.context = null; resource.installedEpoch.set(-1)
        resource.pending.clear(); resource.poisonedEpoch = null
        val forbidden = failure == DeviceReadFailure.AUTHORIZATION
        if (forbidden) {resource.confirmedJson = null;resource.authorized=null;resource.profile=null}
        publish(resource, resource.snapshot.copy(phase = if (forbidden) DeviceReadPhase.FORBIDDEN else DeviceReadPhase.UNAVAILABLE,
            metadata = if (forbidden) null else resource.snapshot.metadata,
            reportedJson = if (forbidden) "{}" else resource.confirmedJson ?: "{}", online = null,
            snapshotAvailable = false, stale = !forbidden && resource.confirmedJson != null, failure = failure))
    }

    private fun metadata(device: AuthorizedDevice) = DeviceReadMetadata(device.title, device.productId, device.category, device.bindingRole)
    private fun failure(error: Exception) = when (error) {
        is ApiFailure -> if (error.code in setOf(401, 403, 1332, 1342)) DeviceReadFailure.AUTHORIZATION else DeviceReadFailure.CONNECTION
        is BrokerFailure -> when (error.kind) {
            BrokerFailureKind.AUTHORIZATION, BrokerFailureKind.SUBSCRIPTION_DENIED -> DeviceReadFailure.AUTHORIZATION
            BrokerFailureKind.CONFIGURATION, BrokerFailureKind.STALE_CONTEXT -> DeviceReadFailure.CONFIGURATION
            else -> DeviceReadFailure.CONNECTION
        }
        else -> DeviceReadFailure.CONFIGURATION
    }

    private fun publish(resource: Resource, value: DeviceReadSnapshot) = synchronized(monitor) { publishLocked(resource, value) }
    private fun publishLocked(resource: Resource, value: DeviceReadSnapshot) {
        if (!validLocked(resource)) return
        if(resource.ownershipRevoked&&value.phase!=DeviceReadPhase.FORBIDDEN)return
        val comparable = value.copy(authorityRevision = resource.snapshot.authorityRevision)
        if (comparable == resource.snapshot) return
        val next = comparable.copy(authorityRevision = revisions.incrementAndGet())
        resource.snapshot = next
        resource.handles.values.toList().forEach { if (!it.released.get()) it.mutable.value = DeviceObservationState.Current(next) }
    }
    private fun snapshotFor(handle: Handle): DeviceReadSnapshot {
        revokeObsolete()
        return synchronized(monitor) {
            val resource = handle.resource
            check(!handle.released.get() && resource != null && validLocked(resource)) { "Device observation is closed" }
            resource.snapshot
        }
    }
    private fun retryResource(handle: Handle) {
        revokeObsolete()
        val resource = synchronized(monitor) {
            val value = handle.resource ?: return
            if (handle.released.get() || !validLocked(value) || value.ownershipRevoked || value.initialization?.isCompleted == false) return
            value
        }
        initialize(resource)
    }
    private fun release(handle: Handle) {
        synchronized(monitor) {
            val resource = handle.resource
            if (resource != null && resource.handles[handle.observerId] === handle) {
                resource.handles.remove(handle.observerId)
                if (resource.handles.isEmpty()) closeResourceLocked(resource, DeviceReadCloseReason.RELEASED)
            }
            handle.closed(DeviceReadCloseReason.RELEASED)
        }
    }
    private fun stopBindingLocked(resource: Resource) {
        resource.initialization?.cancel(); resource.initialization = null
        resource.messages?.cancel(); resource.messages = null
        resource.states?.cancel(); resource.states = null
        resource.query?.cancel(); resource.query = null
        resource.deadline?.cancel(); resource.deadline = null
        resource.transfer?.release(); resource.transfer = null
    }
    private fun closeResourceLocked(resource: Resource, reason: DeviceReadCloseReason) {
        if (resource.closed) return
        resource.closed = true; resource.generation++
        resources.remove(resource.key)
        resource.handles.values.toList().forEach { it.closed(reason) }; resource.handles.clear()
        stopBindingLocked(resource)
        resource.events.cancel(); resource.job.cancel()
    }
    private fun revokeObsolete() {
        val revoke = linkedSetOf<Long>()
        synchronized(monitor) {
            val live = identity()
            resources.values.filter { it.key.identity != live }.toList().forEach { resource ->
                revoke += resource.key.identity.revision
                closeResourceLocked(resource, DeviceReadCloseReason.ACCOUNT_CHANGED)
            }
            revoke.removeAll(invalidated); invalidated.addAll(revoke)
        }
        revoke.forEach { revision -> try { invalidateAccount(revision) } catch (_: Exception) { /* native source still fences every future operation */ } }
    }
    override fun close() {
        synchronized(monitor) {
            if (closed) return
            closed = true
            resources.values.toList().forEach { closeResourceLocked(it, DeviceReadCloseReason.OWNER_CLOSED) }
        }
        ownerJob.cancel(); applicationWatch?.cancel()
    }
    internal fun replaceOwnershipReceipt(encoded:String):Boolean=synchronized(monitor) {
        if(!retireOwnershipReceipt(encoded))return@synchronized false
        val parts=encoded.split(':')
        if(UUID.fromString(parts[0])!=ownershipProcessId)return@synchronized true
        val serial=parts[2].toLong()
        resources.values.firstOrNull {it.ownershipSerial==serial}?.let {closeResourceLocked(it,DeviceReadCloseReason.RELEASED)}
        true
    }
    companion object {
        internal fun receiptFromPreviousProcess(encoded:String):Boolean? {
            val parts=encoded.split(':');if(parts.size!=3)return null
            return try {val process=UUID.fromString(parts[0]);UUID.fromString(parts[1]);if(parts[2].toLongOrNull()?.let {it>0}!=true)null else process!=ownershipProcessId}catch(_:IllegalArgumentException){null}
        }
        private val ownershipProcessId=UUID.randomUUID()
        private val revisions = AtomicLong()
        private val sequence = AtomicLong()
        private fun safeClose(lease: ShadowLease) { try { lease.close() } catch (_: Exception) { /* ownership is already revoked */ } }
    }
}

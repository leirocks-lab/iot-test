package com.rowan.iot.domain.device.mqtt.transport

import java.io.IOException
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Application-owned connection/lease pool. No UI, HTTP, SDK, product dictionary, command
 * queue or replay. A Ready epoch requires the device owner to create a new reducer/get.
 * Registry changes are short synchronized sections; no suspending transport call holds
 * that monitor. Each entry serializes only SUB/UNSUB, not independent publications.
 */
class SharedBrokerPool(
    applicationScope: CoroutineScope,
    private val factory: BrokerTransportFactory,
    private val credentials: suspend (LeaseResource) -> BrokerOptions,
    private val currentAccountRevision: () -> Long?,
    private val timing: PoolTiming = SystemPoolTiming,
    private val policy: PoolPolicy = PoolPolicy(),
) : AutoCloseable {
    private data class ResourceKey(val revision: Long, val resourceID: String)
    private data class ObserverKey(val resource: ResourceKey, val observerID: String)
    private class Resource(val identity: LeaseResource) {
        val key = ResourceKey(identity.accountRevision, identity.resourceID)
        val leases = linkedSetOf<PoolLease>()
        var entry: Entry? = null
        var subscribed = false
        var pendingTopics: Set<String> = emptySet()
        var generation = 0L
        var previousKey: BrokerKey? = null
        var failure: BrokerFailureKind? = null
        var attempts = 0
        var load: Job? = null
        var attach: Job? = null
        var renewal: Job? = null
        var retry: Job? = null
    }
    private data class Inbound(val topic: String, val payload: ByteArray)
    private class Entry(val options: BrokerOptions) {
        val key get() = options.key
        var active = true
        var port: BrokerPort? = null
        var connecting: Job? = null
        val connected = CompletableDeferred<Unit>()
        val resources = linkedSetOf<Resource>()
        val topicReferences = mutableMapOf<String, Int>()
        val subscriptions = Mutex()
        val inbound = java.util.ArrayDeque<Inbound>()
        val lostTopics = mutableSetOf<String>()
        var draining = false
    }

    private val monitor = Any()
    private val poolJob = SupervisorJob(applicationScope.coroutineContext[Job])
    private val scope = CoroutineScope(applicationScope.coroutineContext + poolJob)
    private val resources = linkedMapOf<ResourceKey, Resource>()
    private val observers = mutableMapOf<ObserverKey, PoolLease>()
    private val entries = mutableMapOf<BrokerKey, Entry>()
    private val invalidated = mutableSetOf<Long>()
    private var closed = false
    private var applicationWatch: Job? = null

    init {
        // This independent cancellation watcher tears down ports even if a credential
        // provider is temporarily non-cooperative. Explicit close remains idempotent.
        applicationWatch = applicationScope.launch(start = CoroutineStart.UNDISPATCHED) {
            try { awaitCancellation() } finally { close() }
        }
    }

    fun observe(resource: LeaseResource, observerID: String): ShadowLease {
        val lease = PoolLease(this, resource, observerID, policy.messageCapacity)
        var start: Resource? = null
        synchronized(monitor) {
            val current = currentAccountRevision()
            resources.keys.filter { it.revision != current }.map { it.revision }.distinct().forEach(::invalidateLocked)
            if (closed || current != resource.accountRevision || resource.accountRevision in invalidated) {
                rejectNew(lease, if (closed) BrokerFailureKind.CLOSED else BrokerFailureKind.STALE_CONTEXT)
                return lease
            }
            if (observerID.isBlank()) { rejectNew(lease, BrokerFailureKind.CONFIGURATION); return lease }
            val key = ResourceKey(resource.accountRevision, resource.resourceID)
            val observer = ObserverKey(key, observerID)
            if (observers.containsKey(observer)) { rejectNew(lease, BrokerFailureKind.DUPLICATE_OBSERVER); return lease }
            val existing = resources[key]
            if (existing != null && existing.identity != resource) { rejectNew(lease, BrokerFailureKind.STALE_CONTEXT); return lease }
            val owner = existing ?: Resource(resource).also { resources[key] = it; start = it }
            owner.leases += lease; observers[observer] = lease
            when {
                owner.subscribed && owner.entry?.active == true -> readyLocked(lease, owner.entry!!, ReadyReason.INITIAL)
                owner.failure != null -> lease.mutableState.value = if (owner.retry != null) LeaseState.Recovering(owner.failure!!) else LeaseState.Failed(owner.failure!!)
                owner.entry != null -> lease.mutableState.value = LeaseState.Subscribing
            }
        }
        start?.let { load(it, ReadyReason.INITIAL) }
        return lease
    }

    private fun rejectNew(lease: PoolLease, kind: BrokerFailureKind) {
        lease.released.set(true); lease.mutableState.value = LeaseState.Failed(kind); lease.queue.close()
    }
    private fun liveLocked(resource: Resource, generation: Long? = null): Boolean = !closed && resources[resource.key] === resource &&
        resource.leases.isNotEmpty() && currentAccountRevision() == resource.identity.accountRevision &&
        resource.identity.accountRevision !in invalidated && (generation == null || generation == resource.generation)
    private fun entryLiveLocked(entry: Entry) = !closed && entry.active && entries[entry.key] === entry
    private fun expired(options: BrokerOptions) = options.expiresAtEpochMillis?.let { it <= timing.nowEpochMillis() } == true

    private fun load(resource: Resource, reason: ReadyReason) {
        lateinit var task: Job
        val generation: Long
        synchronized(monitor) {
            if (!liveLocked(resource) || resource.load?.isCompleted == false) return
            generation = ++resource.generation
            resource.retry?.cancel(); resource.retry = null
            if (resource.entry == null) resource.leases.toList().forEach { it.mutableState.value = LeaseState.Connecting }
            task = scope.launch(start = CoroutineStart.LAZY) {
                try {
                    val options = withTimeout(policy.credentialTimeoutMillis) { credentials(resource.identity) }
                    currentCoroutineContext().ensureActive()
                    val valid = synchronized(monitor) { liveLocked(resource, generation) }
                    if (!valid) return@launch
                    if (options.key.accountRevision != resource.identity.accountRevision) throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
                    if (expired(options)) throw BrokerFailure(BrokerFailureKind.EXPIRED_CREDENTIALS)
                    val old = synchronized(monitor) { resource.entry }
                    if (reason == ReadyReason.CREDENTIALS_RENEWED && old != null && old.key == options.key) {
                        val priorExpiry = old.options.expiresAtEpochMillis
                        if (priorExpiry != null && options.expiresAtEpochMillis != null && options.expiresAtEpochMillis <= priorExpiry)
                            throw BrokerFailure(BrokerFailureKind.EXPIRED_CREDENTIALS)
                        restartWithSeed(old, resource, options)
                    } else bind(resource, options, reason)
                } catch (_: TimeoutCancellationException) { failResource(resource, generation, BrokerFailure(BrokerFailureKind.TIMEOUT)) }
                catch (error: CancellationException) { throw error }
                catch (error: Exception) { failResource(resource, generation, sanitized(error)) }
                finally { synchronized(monitor) { if (resource.load === task) resource.load = null } }
            }
            resource.load = task
        }
        task.start()
    }

    private fun bind(resource: Resource, options: BrokerOptions, reason: ReadyReason) {
        lateinit var entry: Entry
        lateinit var task: Job
        var newlyCreated = false
        val generation: Long
        synchronized(monitor) {
            if (!liveLocked(resource)) return
            val was = resource.entry?.key ?: resource.previousKey
            if (resource.entry != null) detachLocked(resource, cancelLoad = false)
            generation = ++resource.generation
            entry = entries[options.key] ?: Entry(options).also { entries[options.key] = it; newlyCreated = true }
            entry.resources += resource; resource.entry = entry; resource.failure = null; resource.subscribed = false
            resource.previousKey = entry.key
            val readyReason = if (was != null && was != entry.key) ReadyReason.KEY_MIGRATED else reason
            resource.leases.toList().forEach { it.discardBuffered(); it.mutableState.value = LeaseState.Subscribing }
            task = scope.launch(start = CoroutineStart.LAZY) {
                try {
                    entry.connected.await()
                    entry.subscriptions.withLock {
                        val needed = synchronized(monitor) {
                            if (!liveLocked(resource, generation) || !entryLiveLocked(entry)) throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
                            resource.identity.responseTopics.filter { (entry.topicReferences[it] ?: 0) == 0 }.toSet().also {
                                // Ownership starts before the packet is sent, not only after
                                // SUBACK. A cancelled waiter must also remove partial grants.
                                resource.pendingTopics = it
                            }
                        }
                        if (needed.isNotEmpty()) {
                            withTimeout(policy.operationTimeoutMillis) { entry.port!!.subscribe(needed) }
                        }
                        synchronized(monitor) {
                            if (!liveLocked(resource, generation) || !entryLiveLocked(entry)) throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
                            if (expired(entry.options)) throw BrokerFailure(BrokerFailureKind.EXPIRED_CREDENTIALS)
                            resource.identity.responseTopics.forEach { entry.topicReferences[it] = (entry.topicReferences[it] ?: 0) + 1 }
                            resource.pendingTopics = emptySet()
                            resource.subscribed = true; resource.failure = null; resource.attempts = 0
                            resource.leases.toList().forEach { readyLocked(it, entry, readyReason) }
                        }
                    }
                    scheduleRenewal(resource, entry)
                } catch (_: TimeoutCancellationException) { failResource(resource, generation, BrokerFailure(BrokerFailureKind.TIMEOUT)) }
                catch (error: CancellationException) { throw error }
                catch (error: Exception) { failResource(resource, generation, sanitized(error)) }
                finally { synchronized(monitor) { if (resource.attach === task) resource.attach = null } }
            }
            resource.attach = task
        }
        if (newlyCreated) connect(entry)
        task.start()
    }

    private fun connect(entry: Entry) {
        lateinit var task: Job
        synchronized(monitor) {
            if (!entryLiveLocked(entry)) return
            task = scope.launch(start = CoroutineStart.LAZY) {
                try {
                    val listener = object : BrokerListener {
                        override fun message(topic: String, payload: ByteArray) {
                            offerInbound(entry, topic, payload)
                        }
                        override fun disconnected(failure: BrokerFailure) { scope.launch { failEntry(entry, failure) } }
                    }
                    val port = factory.create(entry.options, listener)
                    synchronized(monitor) {
                        if (!entryLiveLocked(entry)) { safeClose(port); return@launch }
                        entry.port = port
                    }
                    withTimeout(policy.operationTimeoutMillis) { port.connect() }
                    currentCoroutineContext().ensureActive()
                    synchronized(monitor) { if (entryLiveLocked(entry)) entry.connected.complete(Unit) }
                } catch (_: TimeoutCancellationException) { failEntry(entry, BrokerFailure(BrokerFailureKind.TIMEOUT)) }
                catch (error: CancellationException) { throw error }
                catch (error: Exception) { failEntry(entry, sanitized(error)) }
            }
            entry.connecting = task
        }
        task.start()
    }

    private fun readyLocked(lease: PoolLease, entry: Entry, reason: ReadyReason) {
        if (lease.released.get()) return
        lease.discardBuffered()
        lease.mutableState.value = LeaseState.Ready(nextEpoch.incrementAndGet(), entry.key, reason)
    }

    /** SDK threads reserve bounded capacity before copying. At most one drain job is
     * scheduled per entry, including while the application dispatcher is blocked. */
    private fun offerInbound(entry: Entry, topic: String, payload: ByteArray) {
        var start = false
        synchronized(monitor) {
            if (!entryLiveLocked(entry) || (entry.topicReferences[topic] ?: 0) == 0) return
            if (currentAccountRevision() != entry.key.accountRevision) { invalidateLocked(entry.key.accountRevision); return }
            if (payload.size > policy.maxPayloadBytes || entry.inbound.size >= policy.messageCapacity) entry.lostTopics += topic
            else entry.inbound.addLast(Inbound(topic, payload.copyOf()))
            if (!entry.draining) { entry.draining = true; start = true }
        }
        if (start) scope.launch { drainInbound(entry) }
    }

    private suspend fun drainInbound(entry: Entry) {
        while (true) {
            val batch: List<Inbound>
            synchronized(monitor) {
                if (!entryLiveLocked(entry)) return
                if (entry.inbound.isEmpty() && entry.lostTopics.isEmpty()) { entry.draining = false; return }
                val loss = entry.lostTopics.toSet()
                entry.lostTopics.clear()
                val preceding = entry.inbound.toList()
                entry.inbound.clear()
                val affected = entry.resources.toList().filter { resource ->
                    resource.subscribed && resource.identity.responseTopics.any { it in loss }
                }
                val staleTopics = affected.flatMap { it.identity.responseTopics }.toSet()
                // Detach the preceding batch before publishing Ready. Its owner may
                // immediately get, and a synchronous adapter may already enqueue the
                // fresh reply while this recovery notification is still on the stack.
                batch = preceding.filter { it.topic !in staleTopics }
                affected.forEach { resource ->
                    resource.leases.toList().forEach { readyLocked(it, entry, ReadyReason.BUFFER_RECOVERY) }
                }
                // Frames preceding a known gap must not masquerade as fresh-epoch
                // data. Their owner obtains a new snapshot; other resources continue.
            }
            batch.forEach { receive(entry, it.topic, it.payload) }
            yield()
        }
    }

    private fun receive(entry: Entry, topic: String, payload: ByteArray) {
        synchronized(monitor) {
            if (!entryLiveLocked(entry)) return
            if (currentAccountRevision() != entry.key.accountRevision) { invalidateLocked(entry.key.accountRevision); return }
            for (resource in entry.resources.toList()) {
                if (!resource.subscribed || !liveLocked(resource) || topic !in resource.identity.responseTopics) continue
                for (lease in resource.leases.toList()) {
                    val state = lease.state.value as? LeaseState.Ready ?: continue
                    if (lease.released.get()) continue
                    if (payload.size > policy.maxPayloadBytes || lease.queue.trySend(BrokerMessage(state.epoch, topic, payload.copyOf())).isFailure)
                        readyLocked(lease, entry, ReadyReason.BUFFER_RECOVERY)
                }
            }
        }
    }

    private fun scheduleRenewal(resource: Resource, entry: Entry) {
        val expiry = entry.options.expiresAtEpochMillis ?: return
        lateinit var task: Job
        synchronized(monitor) {
            if (!liveLocked(resource) || resource.entry !== entry || !resource.subscribed) return
            resource.renewal?.cancel()
            task = scope.launch(start = CoroutineStart.LAZY) {
                timing.pause((expiry - timing.nowEpochMillis() - policy.renewBeforeMillis).coerceAtLeast(1))
                val valid = synchronized(monitor) { liveLocked(resource) && resource.entry === entry && resource.renewal === task }
                if (valid) load(resource, ReadyReason.CREDENTIALS_RENEWED)
            }
            resource.renewal = task
        }
        task.start()
    }

    /** Same key requires replacing its one connection; a new key only migrates that resource. */
    private fun restartWithSeed(entry: Entry, seed: Resource, options: BrokerOptions) {
        val affected: List<Resource>
        synchronized(monitor) {
            if (!entryLiveLocked(entry) || !liveLocked(seed) || seed.entry !== entry) return
            affected = entry.resources.toList()
            affected.forEach { detachLocked(it) }
        }
        affected.forEach { if (it === seed) bind(it, options, ReadyReason.CREDENTIALS_RENEWED) else load(it, ReadyReason.CREDENTIALS_RENEWED) }
    }

    private fun failEntry(entry: Entry, failure: BrokerFailure) {
        val affected: List<Resource>
        synchronized(monitor) {
            if (!entryLiveLocked(entry)) return
            if (currentAccountRevision() != entry.key.accountRevision) { invalidateLocked(entry.key.accountRevision); return }
            affected = entry.resources.toList()
            affected.forEach { detachLocked(it) }
        }
        affected.forEach { recover(it, failure) }
    }

    private fun failResource(resource: Resource, generation: Long, failure: BrokerFailure) {
        synchronized(monitor) {
            if (!liveLocked(resource, generation)) return
            detachLocked(resource)
        }
        recover(resource, failure)
    }

    private fun recover(resource: Resource, failure: BrokerFailure) {
        lateinit var task: Job
        synchronized(monitor) {
            if (!liveLocked(resource)) return
            resource.failure = failure.kind
            resource.leases.toList().forEach { it.discardBuffered() }
            if (!failure.transient || ++resource.attempts > policy.maxReconnectAttempts) {
                resource.leases.toList().forEach { it.mutableState.value = LeaseState.Failed(failure.kind) }
                return
            }
            resource.leases.toList().forEach { it.mutableState.value = LeaseState.Recovering(failure.kind) }
            if (!liveLocked(resource)) return
            resource.retry?.cancel()
            val delay = policy.retryDelay(resource.attempts)
            task = scope.launch(start = CoroutineStart.LAZY) {
                timing.pause(delay)
                synchronized(monitor) { if (resource.retry === task) resource.retry = null }
                load(resource, ReadyReason.RECONNECTED)
            }
            resource.retry = task
        }
        task.start()
    }

    internal fun retry(lease: PoolLease) {
        val resource = synchronized(monitor) {
            val owner = ownerLocked(lease) ?: return
            if (owner.subscribed || owner.load?.isCompleted == false || owner.attach?.isCompleted == false) return
            owner.retry?.cancel(); owner.retry = null; owner.attempts = 0; owner.failure = null
            owner
        }
        load(resource, ReadyReason.RECONNECTED)
    }

    private fun ownerLocked(lease: PoolLease): Resource? {
        if (lease.released.get()) return null
        val resource = resources[ResourceKey(lease.resource.accountRevision, lease.resource.resourceID)] ?: return null
        return resource.takeIf { lease in it.leases && liveLocked(it) }
    }

    internal suspend fun publish(lease: PoolLease, expectedEpoch: Long, update: Boolean, payload: ByteArray) {
        val entry: Entry
        val resource: Resource
        val port: BrokerPort
        val generation: Long
        synchronized(monitor) {
            if (currentAccountRevision() != lease.resource.accountRevision) invalidateLocked(lease.resource.accountRevision)
            resource = ownerLocked(lease) ?: throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
            val ready = lease.state.value as? LeaseState.Ready ?: throw BrokerFailure(BrokerFailureKind.UNAVAILABLE)
            if (ready.epoch != expectedEpoch) throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
            if (payload.size > policy.maxPayloadBytes || update && payload.isEmpty()) throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
            entry = resource.entry ?: throw BrokerFailure(BrokerFailureKind.UNAVAILABLE)
            if (!entryLiveLocked(entry) || !resource.subscribed || expired(entry.options)) throw BrokerFailure(BrokerFailureKind.UNAVAILABLE)
            port = entry.port ?: throw BrokerFailure(BrokerFailureKind.UNAVAILABLE)
            generation = resource.generation
        }
        val bytes = if (update) payload.copyOf() else byteArrayOf()
        val acknowledged: Boolean
        try {
            currentCoroutineContext().ensureActive()
            // withTimeoutOrNull identifies this deadline only. An earlier parent
            // timeout remains cancellation of one caller, not a shared-entry fault.
            acknowledged = withTimeoutOrNull(policy.operationTimeoutMillis) {
                port.publish(lease.resource.publication(if (update) "update" else "get"), bytes, 1, false)
                true
            } == true
            currentCoroutineContext().ensureActive()
        } catch (error: CancellationException) { throw error }
        catch (error: Exception) {
            val failure = sanitized(error)
            if (failure.transient) failEntry(entry, failure)
            else {
                failResource(resource, generation, failure)
            }
            throw BrokerFailure(BrokerFailureKind.UNKNOWN_RESULT)
        }
        if (!acknowledged) {
            failEntry(entry, BrokerFailure(BrokerFailureKind.TIMEOUT))
            throw BrokerFailure(BrokerFailureKind.UNKNOWN_RESULT)
        }
        synchronized(monitor) {
            if (currentAccountRevision() != lease.resource.accountRevision) invalidateLocked(lease.resource.accountRevision)
            val state = lease.state.value as? LeaseState.Ready
            if (ownerLocked(lease) !== resource || resource.entry !== entry || !entryLiveLocked(entry) || state?.epoch != expectedEpoch)
                throw BrokerFailure(BrokerFailureKind.UNKNOWN_RESULT)
        }
    }

    internal fun release(lease: PoolLease) {
        synchronized(monitor) {
            val key = ResourceKey(lease.resource.accountRevision, lease.resource.resourceID)
            val resource = resources[key]
            if (resource != null && resource.leases.remove(lease)) {
                observers.remove(ObserverKey(key, lease.observerID))
                if (resource.leases.isEmpty()) { resources.remove(key); detachLocked(resource); resource.retry?.cancel() }
            }
            lease.closed()
        }
    }

    private fun detachLocked(resource: Resource, cancelLoad: Boolean = true) {
        resource.generation++
        if (cancelLoad) { resource.load?.cancel(); resource.load = null }
        resource.attach?.cancel(); resource.attach = null
        resource.renewal?.cancel(); resource.renewal = null
        val entry = resource.entry ?: return
        resource.entry = null; entry.resources.remove(resource)
        val unused = linkedSetOf<String>()
        resource.pendingTopics.forEach { topic -> if ((entry.topicReferences[topic] ?: 0) == 0) unused += topic }
        resource.pendingTopics = emptySet()
        if (resource.subscribed) resource.identity.responseTopics.forEach { topic ->
            val count = (entry.topicReferences[topic] ?: 1) - 1
            if (count <= 0) { entry.topicReferences.remove(topic); unused += topic } else entry.topicReferences[topic] = count
        }
        resource.subscribed = false
        entry.lostTopics.removeAll(unused)
        val retained = entry.inbound.filter { it.topic !in unused }
        entry.inbound.clear(); entry.inbound.addAll(retained)
        if (entry.resources.isEmpty()) closeEntryLocked(entry)
        else if (unused.isNotEmpty()) scope.launch(start = CoroutineStart.UNDISPATCHED) {
            entry.subscriptions.withLock {
                val topics = synchronized(monitor) { if (entryLiveLocked(entry)) unused.filter { (entry.topicReferences[it] ?: 0) == 0 }.toSet() else emptySet() }
                if (topics.isNotEmpty()) try { withTimeout(policy.operationTimeoutMillis) { entry.port?.unsubscribe(topics) } }
                catch (cancel: CancellationException) { throw cancel }
                catch (_: Exception) { /* routing is already removed; never close unrelated observers */ }
            }
        }
    }

    private fun closeEntryLocked(entry: Entry) {
        if (!entry.active) return
        entry.active = false
        if (entries[entry.key] === entry) entries.remove(entry.key)
        entry.connecting?.cancel()
        entry.connected.completeExceptionally(BrokerFailure(BrokerFailureKind.CLOSED))
        entry.port?.let(::safeClose); entry.port = null
        entry.topicReferences.clear()
        entry.inbound.clear(); entry.lostTopics.clear(); entry.draining = false
    }

    fun invalidateAccount(accountRevision: Long) = synchronized(monitor) { invalidateLocked(accountRevision) }
    private fun invalidateLocked(accountRevision: Long) {
        invalidated += accountRevision
        resources.values.filter { it.identity.accountRevision == accountRevision }.toList().forEach { resource ->
            resources.remove(resource.key)
            resource.leases.toList().forEach { observers.remove(ObserverKey(resource.key, it.observerID)); it.closed() }
            resource.leases.clear(); detachLocked(resource); resource.retry?.cancel()
        }
    }

    override fun close() {
        synchronized(monitor) {
            if (closed) return
            closed = true
            resources.values.toList().forEach { resource ->
                resource.leases.toList().forEach { it.closed() }; resource.leases.clear()
                detachLocked(resource); resource.retry?.cancel()
            }
            resources.clear(); observers.clear(); entries.values.toList().forEach(::closeEntryLocked); entries.clear()
        }
        poolJob.cancel(); applicationWatch?.cancel()
    }

    private fun safeClose(port: BrokerPort) { try { port.close() } catch (_: Exception) { /* local ownership is already revoked */ } }
    private fun sanitized(error: Exception): BrokerFailure = when (error) {
        is BrokerFailure -> error
        is IOException -> BrokerFailure(BrokerFailureKind.UNAVAILABLE)
        else -> BrokerFailure(BrokerFailureKind.CONFIGURATION)
    }
    private companion object { val nextEpoch = AtomicLong() }
}

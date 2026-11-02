package com.rowan.iot.data.device

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.device.AuthorizedDevice
import com.rowan.iot.domain.device.DeviceAccessGateway
import com.rowan.iot.domain.device.mqtt.OnlineField
import com.rowan.iot.domain.device.mqtt.ShadowProfile
import com.rowan.iot.domain.device.mqtt.ShadowValue
import com.rowan.iot.domain.device.mqtt.transport.*
import com.rowan.iot.domain.device.state.DeviceReadOwner
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.StateFlow

/** Native production composition. Constructed lazily by AppServices, never by a view/RN. */
class NativeDeviceServices(
    applicationScope: CoroutineScope,
    accountContexts: StateFlow<AccountContext>,
    gateway: DeviceAccessGateway,
    factory: BrokerTransportFactory,
) : AutoCloseable {
    private val connections = AuthorizedDeviceConnections(accountContexts, gateway)
    private val pool = SharedBrokerPool(applicationScope, factory, connections::credentials, {
        accountContexts.value.let { if (it.session != null && !it.cleanupRequired) it.revision else null }
    })
    val devices = DeviceReadOwner(applicationScope, accountContexts, gateway,
        { device, observer -> connections.open(device, observer, pool::observe) },
        { revision -> connections.invalidateAccount(revision); pool.invalidateAccount(revision) },
        // V1.6 chapter 10 explicitly defines these read values. No writable product dictionary.
        { ShadowProfile(emptyMap(), OnlineField(listOf("ConnectType"), ShadowValue.Text("online"), ShadowValue.Text("offline"))) })

    override fun close() {
        devices.close()
        connections.close()
        pool.close()
    }
}

/**
 * In-memory proofs only. The first DEVICE-01 establishes the exact thing reference;
 * every pool credential request calls DEVICE-01 again. No credential seed/cache.
 */
internal class AuthorizedDeviceConnections(
    private val accountContexts: StateFlow<AccountContext>,
    private val gateway: DeviceAccessGateway,
) : AutoCloseable {
    private class Registration {
        val proofs = linkedMapOf<Any, AuthorizedDevice>()
    }
    private val monitor = Any()
    private val registrations = mutableMapOf<LeaseResource, Registration>()
    private val invalidated = mutableSetOf<Long>()
    private var closed = false

    private fun requireAccount(device: AuthorizedDevice) {
        val context = accountContexts.value
        if (context.cleanupRequired || context.revision != device.accountRevision || context.session?.userId != device.userId)
            throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
    }
    private fun requireRegistration(resource: LeaseResource, registration: Registration) {
        if (closed || resource.accountRevision in invalidated || registrations[resource] !== registration || registration.proofs.isEmpty())
            throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
    }
    suspend fun open(
        device: AuthorizedDevice,
        observerID: String,
        observe: (LeaseResource, String) -> ShadowLease,
    ): ShadowLease {
        currentCoroutineContext().ensureActive()
        requireAccount(device)
        val prepared = gateway.connection(device)
        currentCoroutineContext().ensureActive()
        requireAccount(device)
        if (prepared.resourceId != device.resourceId || prepared.options.key.accountRevision != device.accountRevision)
            throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
        val resource = LeaseResource(device.accountRevision, device.resourceId, prepared.thingRef)
        val token = Any()
        val registration = synchronized(monitor) {
            requireAccount(device)
            if (closed || device.accountRevision in invalidated) throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
            (registrations[resource] ?: Registration().also { registrations[resource] = it }).also { it.proofs[token] = device }
        }
        var lease: ShadowLease? = null
        try {
            // The pool can synchronously request credentials; the proof is installed first.
            lease = observe(resource, observerID)
            currentCoroutineContext().ensureActive()
            synchronized(monitor) { requireAccount(device); requireRegistration(resource, registration) }
            if (lease.resource != resource) throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
            return RegisteredLease(lease) { unregister(resource, registration, token) }
        } catch (error: Throwable) {
            try { lease?.close() } catch (_: Exception) { /* preserve the original cancellation/failure */ }
            finally { unregister(resource, registration, token) }
            throw error
        }
    }

    suspend fun credentials(resource: LeaseResource): BrokerOptions {
        currentCoroutineContext().ensureActive()
        val (registration, device) = synchronized(monitor) {
            val registration = registrations[resource] ?: throw BrokerFailure(BrokerFailureKind.STALE_CONTEXT)
            requireRegistration(resource, registration)
            val device = registration.proofs.values.last()
            requireAccount(device)
            registration to device
        }
        val prepared = gateway.connection(device)
        currentCoroutineContext().ensureActive()
        synchronized(monitor) { requireRegistration(resource, registration); requireAccount(device) }
        if (prepared.resourceId != resource.resourceID || prepared.thingRef != resource.thingRef ||
            prepared.options.key.accountRevision != resource.accountRevision)
            throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
        return prepared.options
    }

    private fun unregister(resource: LeaseResource, registration: Registration, token: Any) = synchronized(monitor) {
        // A late close holds its own registration/token; it cannot erase a replacement.
        registration.proofs.remove(token)
        if (registrations[resource] === registration && registration.proofs.isEmpty()) registrations.remove(resource)
    }
    fun invalidateAccount(revision: Long) = synchronized(monitor) {
        invalidated += revision
        registrations.keys.filter { it.accountRevision == revision }.forEach { registrations.remove(it)?.proofs?.clear() }
    }
    override fun close() = synchronized(monitor) {
        closed = true
        registrations.values.forEach { it.proofs.clear() }
        registrations.clear()
    }
    private class RegisteredLease(private val delegate: ShadowLease, private val release: () -> Unit) : ShadowLease by delegate {
        private val closed = AtomicBoolean()
        override fun close() {
            if (!closed.compareAndSet(false, true)) return
            try { delegate.close() } finally { release() }
        }
    }
}

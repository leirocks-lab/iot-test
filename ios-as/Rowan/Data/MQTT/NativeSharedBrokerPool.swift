import Foundation

/// Native shared read transport. No UI/HTTP/SDK implementation, reducer, writable API or command replay.
/// Explicit accountChanged/close belong to a future application owner; no production DI is installed.
@MainActor
final class NativeSharedBrokerPool {
  private final class Resource {
    let identity: MQTTLeaseResource
    var leases: [NativeShadowLease] = []
    var entry: Entry?
    var subscribed = false
    var pendingTopics = Set<String>()
    var generation = UUID()
    var load: Task<Void, Never>?
    /// A backoff may finish before cancelled physical I/O. One intent, never a second I/O task.
    var deferredLoadReason: MQTTLeaseReadyReason?
    var renewal: Task<Void, Never>?
    var retry: Task<Void, Never>?
    var attempts = 0
    var previousKey: SharedMQTTBrokerKey?
    var priorExpiry: Date?
    init(_ identity: MQTTLeaseResource) { self.identity = identity }
  }
  private final class Entry {
    let key: SharedMQTTBrokerKey
    let parameters: MQTTConnectionParameters
    let port: SharedMQTTBrokerPort
    var active = true
    var resources: [Resource] = []
    var refs: [String: Int] = [:]
    var connecting: Task<Void, Error>?
    var subscriptions: Task<Void, Never>?
    var subscriptionOperations = 0
    var inbound: [(String, Data)] = []
    var lost = Set<String>()
    var drain: Task<Void, Never>?
    init(key: SharedMQTTBrokerKey, parameters: MQTTConnectionParameters, port: SharedMQTTBrokerPort) { self.key = key; self.parameters = parameters; self.port = port }
  }
  private let currentAccount: () -> MQTTPoolIdentity?
  private let credentials: (MQTTLeaseResource) async throws -> MQTTConnectionParameters
  private let makePort: () -> SharedMQTTBrokerPort
  private let now: () -> Date
  private let capacity: Int
  private let maxReconnectAttempts: Int
  private let pause: (UInt64) async throws -> Void
  private let credentialDeadline: () async throws -> Void
  private var resources: [MQTTLeaseResource: Resource] = [:]
  private var entries: [SharedMQTTBrokerKey: Entry] = [:]
  private var invalidated = Set<Int>()
  private var closed = false
  private static var nextEpoch: Int64 = 0
  private var sequence: Int64 = 0
  init(currentAccount: @escaping () -> MQTTPoolIdentity?, credentials: @escaping (MQTTLeaseResource) async throws -> MQTTConnectionParameters,
       makePort: @escaping () -> SharedMQTTBrokerPort, capacity: Int = 32, maxReconnectAttempts: Int = 3,
       now: @escaping () -> Date = Date.init, pause: @escaping (UInt64) async throws -> Void = { try await Task.sleep(nanoseconds: $0) },
       credentialDeadline: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 20_000_000_000) }) {
    self.currentAccount = currentAccount; self.credentials = credentials; self.makePort = makePort; self.now = now
    self.capacity = max(1, min(capacity, 256)); self.maxReconnectAttempts = max(0, min(maxReconnectAttempts, 5)); self.pause = pause
    self.credentialDeadline = credentialDeadline
  }
  func observe(_ identity: MQTTLeaseResource, observerID: String) -> NativeShadowLease {
    accountChanged()
    let lease = NativeShadowLease(resource: identity, observerID: observerID, capacity: capacity, pool: self)
    guard !closed else { lease.finish(.closed); return lease }
    guard currentAccount() == identity.identity, !invalidated.contains(identity.accountRevision) else { lease.finish(.failed(.staleContext)); return lease }
    guard !observerID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, observerID.rangeOfCharacter(from: .controlCharacters) == nil,
          resources.values.reduce(0, { $0 + $1.leases.count }) < 128 else { lease.finish(.failed(.invalidConfiguration)); return lease }
    if resources.keys.contains(where: { $0.identity == identity.identity && $0.resourceID.utf8.elementsEqual(identity.resourceID.utf8) && $0 != identity }) { lease.finish(.failed(.staleContext)); return lease }
    let existing = resources[identity]
    guard existing != nil || resources.count < 64 else { lease.finish(.failed(.offline)); return lease }
    let resource = existing ?? Resource(identity)
    guard !resource.leases.contains(where: { $0.observerID.utf8.elementsEqual(observerID.utf8) }) else { lease.finish(.failed(.duplicateObserver)); return lease }
    resources[identity] = resource; resource.leases.append(lease)
    if resource.subscribed, let entry = resource.entry, live(entry) { ready(lease, entry: entry, reason: .initial) }
    else if let first = resource.leases.first, first !== lease { lease.install(first.state) }
    else { load(resource, reason: .initial) }
    return lease
  }
  private func live(_ resource: Resource, generation: UUID? = nil) -> Bool {
    !closed && resources[resource.identity] === resource && !resource.leases.isEmpty && currentAccount() == resource.identity.identity
      && !invalidated.contains(resource.identity.accountRevision) && (generation == nil || resource.generation == generation)
  }
  private func live(_ entry: Entry) -> Bool { !closed && entry.active && entries[entry.key] === entry }
  private func expired(_ parameters: MQTTConnectionParameters) -> Bool {
    if case let .known(deadline, _) = parameters.credentialExpiry { return deadline <= now() }; return false
  }
  private func load(_ resource: Resource, reason: MQTTLeaseReadyReason) {
    guard live(resource) else { resource.deferredLoadReason = nil; return }
    if resource.load != nil { resource.deferredLoadReason = reason; return }
    resource.deferredLoadReason = nil
    resource.retry?.cancel(); resource.retry = nil
    let generation = UUID(); resource.generation = generation
    for lease in resource.leases { lease.discard(); lease.install(.connecting) }
    resource.load = Task { @MainActor [weak self, weak resource] in
      guard let self, let resource else { return }
      let watchdog = Task { @MainActor [weak self, weak resource] in
        do { try Task.checkCancellation(); try await self?.credentialDeadline(); try Task.checkCancellation() } catch { return }
        guard let self, let resource, live(resource, generation: generation) else { return }
        resource.load?.cancel(); fail(resource, error: .transportFailed)
      }
      defer {
        watchdog.cancel(); resource.load = nil
        let deferred = resource.deferredLoadReason; resource.deferredLoadReason = nil
        // Physical completion is the handoff point. Recheck ownership before one fresh request;
        // the old task's cancelled status must not silently discard the independent recovery.
        if let deferred, live(resource) { load(resource, reason: deferred) }
      }
      do {
        try Task.checkCancellation(); guard live(resource, generation: generation) else { return }
        let parameters = try await credentials(resource.identity); try Task.checkCancellation(); accountChanged()
        guard live(resource, generation: generation) else { return }
        guard parameters.resourceID.utf8.elementsEqual(resource.identity.resourceID.utf8), parameters.thingRef.utf8.elementsEqual(resource.identity.thingRef.utf8) else { throw MQTTBrokerFailure.invalidConfiguration }
        guard !expired(parameters) else { throw MQTTBrokerFailure.expiredCredentials }
        if reason == .credentialsRenewed, let prior = resource.priorExpiry, case let .known(next, _) = parameters.credentialExpiry, next <= prior { throw MQTTBrokerFailure.expiredCredentials }
        let key = try SharedMQTTBrokerKey(revision: resource.identity.accountRevision, parameters: parameters)
        bind(resource, parameters: parameters, key: key, reason: reason)
      } catch is CancellationError { }
      catch { if live(resource, generation: generation) { fail(resource, error: error as? MQTTBrokerFailure ?? .transportFailed) } }
    }
  }
  private func bind(_ resource: Resource, parameters: MQTTConnectionParameters, key: SharedMQTTBrokerKey, reason: MQTTLeaseReadyReason) {
    guard live(resource) else { return }
    detach(resource, cancelLoad: false)
    let generation = resource.generation
    let entry: Entry
    if let existing = entries[key] { entry = existing }
    else {
      entry = Entry(key: key, parameters: parameters, port: makePort()); entries[key] = entry
      entry.port.onMessage = { [weak self, weak entry] topic, data in if let entry { self?.offer(entry, topic: topic, data: data) } }
      entry.port.onClosed = { [weak self, weak entry] error in if let entry { self?.failed(entry, error: error) } }
      entry.connecting = Task { @MainActor in try await entry.port.connect(parameters) }
    }
    let why: MQTTLeaseReadyReason = resource.previousKey.map { $0 != key } == true ? .keyMigrated : reason
    resource.previousKey = key; resource.entry = entry; entry.resources.append(resource)
    for lease in resource.leases { lease.install(.subscribing) }
    guard entry.subscriptionOperations < 64 else { fail(resource, error: .invalidConfiguration); return }
    entry.subscriptionOperations += 1
    let preceding = entry.subscriptions
    entry.subscriptions = Task { @MainActor [weak self, weak resource, weak entry] in
      defer { if let entry { entry.subscriptionOperations -= 1 } }
      await preceding?.value
      guard let self, let resource, let entry, live(resource, generation: generation), live(entry) else { return }
      do {
        try await entry.connecting?.value; try Task.checkCancellation()
        guard live(resource, generation: generation), live(entry) else { return }
        let needed = resource.identity.responseTopics.filter { (entry.refs[$0] ?? 0) == 0 }
        resource.pendingTopics = Set(needed)
        if !needed.isEmpty { try await entry.port.subscribe(Set(needed)) }
        accountChanged()
        guard live(resource, generation: generation), live(entry) else {
          let pending = resource.pendingTopics; resource.pendingTopics.removeAll()
          cleanupTopics(entry, topics: pending); return
        }
        if expired(entry.parameters) { throw MQTTBrokerFailure.expiredCredentials }
        for topic in resource.identity.responseTopics { entry.refs[topic, default: 0] += 1 }
        resource.pendingTopics.removeAll(); resource.subscribed = true; resource.attempts = 0
        if case let .known(deadline, _) = entry.parameters.credentialExpiry { resource.priorExpiry = deadline }
        for lease in resource.leases { ready(lease, entry: entry, reason: why) }
        renewal(resource, entry: entry)
      } catch is CancellationError { }
      catch {
        let failure = error as? MQTTBrokerFailure ?? .transportFailed
        if live(resource, generation: generation), failure == .subscriptionRejected || failure == .invalidConfiguration { fail(resource, error: failure) }
        else if live(entry) { failed(entry, error: failure) }
      }
    }
  }
  private func ready(_ lease: NativeShadowLease, entry: Entry, reason: MQTTLeaseReadyReason) {
    guard !lease.released, currentAccount() == lease.resource.identity, live(entry) else { return }
    guard Self.nextEpoch < Int64.max else { lease.finish(.failed(.invalidConfiguration)); return }
    Self.nextEpoch += 1; lease.discard(); lease.install(.ready(epoch: Self.nextEpoch, key: entry.key, reason: reason))
  }
  private func renewal(_ resource: Resource, entry: Entry) {
    guard case let .known(deadline, _) = entry.parameters.credentialExpiry else { return }
    let seconds = max(0.001, min(deadline.timeIntervalSince(now()) - 30, 31_536_000))
    resource.renewal = Task { @MainActor [weak self, weak resource, weak entry] in
      guard let self else { return }
      do { try Task.checkCancellation(); try await pause(UInt64(seconds * 1_000_000_000)); try Task.checkCancellation() } catch { return }
      guard let resource, let entry, live(resource), resource.entry === entry, live(entry) else { return }
      let affected = entry.resources; for item in affected { detach(item) }
      for item in affected where live(item) { load(item, reason: .credentialsRenewed) }
    }
  }
  private func offer(_ entry: Entry, topic: String, data: Data) {
    accountChanged()
    guard live(entry), (entry.refs[topic] ?? 0) > 0 else { return }
    guard currentAccount()?.revision == entry.key.accountRevision else { accountChanged(); return }
    if data.count > 1_048_576 || entry.inbound.count >= capacity { entry.lost.insert(topic) }
    else { entry.inbound.append((topic, data)) }
    scheduleDrain(entry)
  }
  private func scheduleDrain(_ entry: Entry) {
    guard entry.drain == nil, live(entry) else { return }
    entry.drain = Task { @MainActor [weak self, weak entry] in
      await Task.yield(); guard let self, let entry else { return }
      defer {
        entry.drain = nil
        if live(entry), !entry.inbound.isEmpty || !entry.lost.isEmpty { scheduleDrain(entry) }
      }
      accountChanged(); guard live(entry) else { return }
      let lost = entry.lost; entry.lost.removeAll(); let batch = entry.inbound; entry.inbound.removeAll()
      let affected = entry.resources.filter { !$0.identity.responseTopics.isDisjoint(with: lost) }
      let invalid = affected.reduce(into: Set<String>()) { $0.formUnion($1.identity.responseTopics) }
      for resource in affected { for lease in resource.leases { ready(lease, entry: entry, reason: .bufferRecovery) } }
      var poisoned = Set<ObjectIdentifier>()
      for (topic, data) in batch where !invalid.contains(topic) {
        for resource in entry.resources where resource.subscribed && live(resource) && resource.identity.responseTopics.contains(topic) {
          for lease in resource.leases {
            guard !poisoned.contains(ObjectIdentifier(lease)), case let .ready(epoch, _, _) = lease.state, !lease.released, sequence < Int64.max else { continue }
            sequence += 1
            if !lease.enqueue(MQTTLeaseMessage(sequence: sequence, epoch: epoch, topic: topic, payload: data)) { poisoned.insert(ObjectIdentifier(lease)); ready(lease, entry: entry, reason: .bufferRecovery) }
          }
        }
      }
    }
  }
  func get(_ lease: NativeShadowLease, epoch: Int64) async throws {
    try Task.checkCancellation(); accountChanged()
    guard let resource = resources[lease.resource], live(resource), resource.leases.contains(where: { $0 === lease }), !lease.released,
          case let .ready(current, _, _) = lease.state, epoch == current, let entry = resource.entry, live(entry), resource.subscribed, !expired(entry.parameters) else { throw MQTTBrokerFailure.staleContext }
    do { try await entry.port.publish(topic: lease.resource.getTopic, payload: Data()); try Task.checkCancellation() }
    catch is CancellationError { throw CancellationError() }
    catch { if live(entry), (error as? MQTTBrokerFailure) != .resultUnknown { failed(entry, error: error as? MQTTBrokerFailure ?? .transportFailed) }; throw MQTTBrokerFailure.resultUnknown }
    accountChanged()
    guard live(resource), resource.entry === entry, live(entry), !lease.released, case let .ready(current, _, _) = lease.state, epoch == current else { throw MQTTBrokerFailure.resultUnknown }
  }
  func retry(_ lease: NativeShadowLease) {
    accountChanged()
    guard !lease.released, let resource = resources[lease.resource], live(resource), !resource.subscribed, resource.load == nil else { return }
    resource.attempts = 0; load(resource, reason: .reconnected)
  }
  private func fail(_ resource: Resource, error: MQTTBrokerFailure) {
    detach(resource, cancelLoad: false)
    for lease in resource.leases { lease.discard(); lease.install(.failed(error)) }
    guard error == .transportFailed || error == .offline else { return }
    resource.attempts += 1; guard resource.attempts <= maxReconnectAttempts else { return }
    for lease in resource.leases { lease.install(.recovering(error)) }
    let delay = UInt64(1 << (resource.attempts - 1)) * 1_000_000_000
    resource.retry = Task { @MainActor [weak self, weak resource] in
      guard let self else { return }; do { try Task.checkCancellation(); try await pause(delay); try Task.checkCancellation() } catch { return }
      guard let resource, live(resource) else { return }; load(resource, reason: .reconnected)
    }
  }
  private func failed(_ entry: Entry, error: MQTTBrokerFailure) {
    guard live(entry) else { return }; let affected = entry.resources
    closeEntry(entry)
    for resource in affected { fail(resource, error: error) }
  }
  func release(_ lease: NativeShadowLease) {
    guard let resource = resources[lease.resource], resource.leases.contains(where: { $0 === lease }) else { return }
    resource.leases.removeAll { $0 === lease }
    if resource.leases.isEmpty { resources.removeValue(forKey: resource.identity); detach(resource); resource.retry?.cancel() }
    lease.finish(.closed)
  }
  private func detach(_ resource: Resource, cancelLoad: Bool = true) {
    resource.generation = UUID(); resource.renewal?.cancel(); resource.renewal = nil
    if cancelLoad { resource.deferredLoadReason = nil; resource.load?.cancel() }
    guard let entry = resource.entry else { return }; resource.entry = nil; entry.resources.removeAll { $0 === resource }
    var unused = Set(resource.pendingTopics.filter { (entry.refs[$0] ?? 0) == 0 }); resource.pendingTopics.removeAll()
    if resource.subscribed {
      for topic in resource.identity.responseTopics { let count = (entry.refs[topic] ?? 1) - 1; if count <= 0 { entry.refs.removeValue(forKey: topic); unused.insert(topic) } else { entry.refs[topic] = count } }
    }
    resource.subscribed = false
    if entry.resources.isEmpty { closeEntry(entry) } else { cleanupTopics(entry, topics: unused) }
  }
  private func cleanupTopics(_ entry: Entry, topics: Set<String>) {
    guard live(entry), !topics.isEmpty else { return }
    guard entry.subscriptionOperations < 64 else { failed(entry, error: .transportFailed); return }
    entry.subscriptionOperations += 1
    let preceding = entry.subscriptions
    entry.subscriptions = Task { @MainActor [weak self, weak entry] in
      defer { if let entry { entry.subscriptionOperations -= 1 } }
      await preceding?.value; guard let self, let entry, live(entry) else { return }
      let unused = topics.filter { (entry.refs[$0] ?? 0) == 0 }
      if !unused.isEmpty { do { try await entry.port.unsubscribe(Set(unused)) } catch { /* Routing is already removed; unrelated resources remain owned. */ } }
    }
  }
  private func closeEntry(_ entry: Entry) {
    guard entry.active else { return }; entry.active = false
    if entries[entry.key] === entry { entries.removeValue(forKey: entry.key) }
    entry.connecting?.cancel(); entry.subscriptions?.cancel(); entry.drain?.cancel()
    entry.port.onMessage = nil; entry.port.onClosed = nil; entry.port.close(); entry.refs.removeAll(); entry.inbound.removeAll(); entry.lost.removeAll()
  }
  func invalidateAccount(_ revision: Int) {
    invalidated.insert(revision)
    for resource in Array(resources.values) where resource.identity.accountRevision == revision {
      resources.removeValue(forKey: resource.identity); for lease in resource.leases { lease.finish(.closed) }; resource.leases.removeAll(); detach(resource); resource.retry?.cancel()
    }
  }
  func accountChanged() { for resource in Array(resources.values) where currentAccount() != resource.identity.identity { invalidateAccount(resource.identity.accountRevision) } }
  func close() {
    guard !closed else { return }; closed = true
    for resource in Array(resources.values) { for lease in resource.leases { lease.finish(.closed) }; resource.leases.removeAll(); detach(resource); resource.retry?.cancel() }
    resources.removeAll(); for entry in Array(entries.values) { closeEntry(entry) }; entries.removeAll()
  }
}

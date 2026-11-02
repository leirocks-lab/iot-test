import Foundation

final class DeviceFeatureAuthority {}

struct DeviceOwnershipReceipt:MQTTRedacted {let encoded:String}

/// Application-owned readonly authority. UI tasks hold handles, never the authorization/task lifetime.
@MainActor
final class DeviceReadOwner {
  private enum Event {
    case state(UUID, NativeShadowLeasePort, MQTTLeaseState)
    case frame(UUID, NativeShadowLeasePort, MQTTLeaseMessage, Bool)
    case getFailed(UUID, Int64, UUID, DeviceReadFailure)
    case deadline(UUID, Int64, UUID)
  }
  private final class Resource {
    let ownershipSerial:Int64
    let id = UUID(), identity: MQTTPoolIdentity, resourceID: String
    var handles: [Data: DeviceReadHandle] = [:]
    var generation = UUID()
    var initializationID: UUID?
    var initialization: Task<Void, Never>?
    var deferredRetry = false
    var ownershipRevoked = false
    var featureAuthority=DeviceFeatureAuthority()
    var authorizationPending=false
    var initializationDeadline: Task<Void, Never>?
    var query: Task<Void, Never>?, deadline: Task<Void, Never>?, drain: Task<Void, Never>?
    var drainID = UUID()
    var events: [Event] = []
    var binding: AuthorizedDeviceLease?
    var device: AuthorizedDevice?
    var profile: ShadowProfile?
    var reducer: ClassicShadowReducer?
    var context: ShadowContext?
    var lastEpoch: Int64?
    var confirmed: ShadowValue?
    var pending: [MQTTLeaseMessage] = []
    var poisonedThrough: Int64 = -1
    var recoveryGetIssued = false
    var queryStarted = false
    var queryID = UUID()
    var snapshot: DeviceReadSnapshot
    init(identity: MQTTPoolIdentity, resourceID: String, revision: Int64, ownershipSerial:Int64) {
      self.ownershipSerial=ownershipSerial
      self.identity = identity; self.resourceID = resourceID
      snapshot = DeviceReadSnapshot(accountRevision: identity.revision, resourceID: resourceID, authorityRevision: revision)
    }
  }
  private let currentAccount: () -> MQTTPoolIdentity?
  private let gateway: NativeDeviceAccessGateway
  private let open: (AuthorizedDevice, String) async throws -> AuthorizedDeviceLease
  private let invalidate: (Int) -> Void
  private let readProfile: (AuthorizedDevice) async throws -> ShadowProfile?
  private let initializationWait: () async throws -> Void
  private let snapshotWait: () async throws -> Void
  private let capacity: Int
  private var resources: [UUID: Resource] = [:]
  private static let ownershipProcessId=UUID()
  private let ownershipOwnerId=UUID()
  private var ownershipSequence:Int64=0
  private var invalidated = Set<Int>()
  private var closed = false
  private static var authorityRevision: Int64 = 0
  init(currentAccount: @escaping () -> MQTTPoolIdentity?, gateway: NativeDeviceAccessGateway,
       open: @escaping (AuthorizedDevice, String) async throws -> AuthorizedDeviceLease,
       invalidateAccount: @escaping (Int) -> Void, readProfile: @escaping (AuthorizedDevice) async throws -> ShadowProfile? = { _ in nil },
       capacity: Int = 32, initializationWait: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 30_000_000_000) },
       snapshotWait: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 10_000_000_000) }) {
    self.currentAccount = currentAccount; self.gateway = gateway; self.open = open; invalidate = invalidateAccount
    self.readProfile = readProfile; self.capacity = max(1, min(capacity, 256)); self.initializationWait = initializationWait; self.snapshotWait = snapshotWait
  }
  func observe(resourceID: String, nativeObserverID: String) -> DeviceReadHandle {
    accountChanged()
    guard !closed else { return DeviceReadHandle(closed: .ownerClosed) }
    guard let identity = currentAccount(), identity.revision >= 0, Self.validID(resourceID), Self.validID(nativeObserverID) else { return DeviceReadHandle(closed: .noAccount) }
    let existing = resources.values.first { $0.identity == identity && $0.resourceID.utf8.elementsEqual(resourceID.utf8) }
    guard existing != nil || resources.count < 64, resources.values.reduce(0, { $0 + $1.handles.count }) < 128 else { return DeviceReadHandle(closed: .ownerClosed) }
    let resource: Resource
    if let existing { resource = existing }
    else { guard let revision = Self.nextRevision() else { return DeviceReadHandle(closed: .ownerClosed) }; guard ownershipSequence<Int64.max else{return DeviceReadHandle(closed:.ownerClosed)}
      ownershipSequence+=1;resource = Resource(identity: identity, resourceID: resourceID, revision: revision, ownershipSerial:ownershipSequence) }
    let key = Data(nativeObserverID.utf8)
    guard resource.handles[key] == nil else { return DeviceReadHandle(closed: .duplicateObserver) }
    let handle = DeviceReadHandle(owner: self, resource: resource.id, observer: key, snapshot: resource.snapshot)
    resources[resource.id] = resource; resource.handles[key] = handle
    if existing == nil { initialize(resource) }; return handle
  }
  private static func validID(_ value: String) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value != "." && value != ".." && value.rangeOfCharacter(from: .controlCharacters) == nil }
  private static func nextRevision() -> Int64? { guard authorityRevision < 9_007_199_254_740_991 else { return nil }; authorityRevision += 1; return authorityRevision }
  private func live(_ resource: Resource, _ generation: UUID? = nil) -> Bool {
    !closed && resources[resource.id] === resource && !resource.handles.isEmpty && currentAccount() == resource.identity && (generation == nil || resource.generation == generation)
  }
  private func initialize(_ resource: Resource) {
    guard live(resource), !resource.ownershipRevoked else { return }
    if resource.initialization != nil { resource.deferredRetry = true; return }
    stopBinding(resource); let generation = resource.generation, id = UUID(); resource.initializationID = id
    change(resource) { $0.phase = .authorizing; $0.online = nil; $0.snapshotAvailable = false; $0.stale = resource.confirmed != nil; $0.failure = nil }
    resource.initialization = Task { @MainActor [weak self, weak resource] in
      guard let self, let resource else { return }
      var transfer: AuthorizedDeviceLease?
      let watchdog = Task { @MainActor [weak self, weak resource] in
        do { try Task.checkCancellation(); try await self?.initializationWait(); try Task.checkCancellation() } catch { return }
        guard let self, let resource, live(resource, generation) else { return }; failed(resource, .initializationTimeout)
      }
      resource.initializationDeadline = watchdog
      defer {
        watchdog.cancel(); transfer?.close()
        if resource.initializationID == id {
          resource.initialization = nil; resource.initializationID = nil
          let retry = resource.deferredRetry; resource.deferredRetry = false
          if retry, live(resource) { initialize(resource) }
        }
      }
      do {
        try Task.checkCancellation(); guard live(resource, generation) else { return }
        let device = try await gateway.authorize(resourceID: resource.resourceID, expectedRevision: resource.identity.revision)
        try Task.checkCancellation(); accountChanged(); guard live(resource, generation) else { return }
        guard device.accountRevision == resource.identity.revision, device.resourceID.utf8.elementsEqual(resource.resourceID.utf8), device.userID.utf8.elementsEqual(resource.identity.userID.utf8) else { throw DeviceReadFailure.configuration }
        resource.device = device;resource.authorizationPending=false
        change(resource) { $0.metadata = DeviceReadMetadata(title: device.title, productID: device.productID, category: device.category, bindingRole: device.bindingRole); $0.phase = .connecting }
        let proposed = try await readProfile(device)
        // Strip all write/target validators. Optional native identity metadata is data-only here.
        let profile = try proposed.map { try ShadowProfile(writable: [:], connection: $0.connection, targets: [:], metadata: $0.metadata) }
        try Task.checkCancellation(); guard live(resource, generation) else { return }
        let binding = try await open(device, "native-read:\(resource.id.uuidString):\(generation.uuidString)"); transfer = binding
        try Task.checkCancellation(); accountChanged(); guard live(resource, generation) else { return }
        guard binding.lease.resource.identity == resource.identity, binding.lease.resource.resourceID.utf8.elementsEqual(resource.resourceID.utf8) else { throw DeviceReadFailure.configuration }
        resource.binding = binding; resource.profile = profile; transfer = nil
        let lease = binding.lease
        lease.onStateChanged = { [weak self, weak resource, weak lease] in
          guard let self, let resource, let lease else { return }; enqueue(resource, .state(generation, lease, lease.state))
        }
        lease.onMessageAvailable = { [weak self, weak resource, weak lease] in
          guard let self, let resource, let lease, let message = lease.nextMessage() else { return }
          enqueue(resource, .frame(generation, lease, message, resource.context?.connectionEpoch != message.epoch))
        }
        enqueue(resource, .state(generation, lease, lease.state))
      } catch is CancellationError { }
      catch { if live(resource, generation) { failed(resource, Self.failure(error)) } }
    }
  }
  private func enqueue(_ resource: Resource, _ event: Event) {
    accountChanged()
    let generation: UUID
    switch event {
    case let .state(value, _, _), let .frame(value, _, _, _), let .getFailed(value, _, _, _), let .deadline(value, _, _): generation = value
    }
    guard live(resource, generation) else { acknowledge(event); return }
    if case .state = event { resource.events.removeAll { if case .state = $0 { return true }; return false } }
    guard resource.events.count < capacity else { acknowledge(event); failed(resource, .shadowProtocol); return }
    resource.events.append(event)
    guard resource.drain == nil else { return }
    let drainID = UUID(); resource.drainID = drainID
    resource.drain = Task { @MainActor [weak self, weak resource] in
      guard let self, let resource else { return }
      defer { if resource.drainID == drainID { resource.drain = nil } }
      while live(resource), !Task.isCancelled, !resource.events.isEmpty {
        let event = resource.events.removeFirst(); process(resource, event); acknowledge(event); await Task.yield()
      }
    }
  }
  private func acknowledge(_ event: Event) { if case let .frame(_, lease, message, _) = event { lease.acknowledge(sequence: message.sequence) } }
  private func process(_ resource: Resource, _ event: Event) {
    switch event {
    case let .state(generation, lease, state):
      guard live(resource, generation), resource.binding?.lease === lease else { return }
      switch state {
      case let .ready(epoch, key, _): ready(resource, epoch: epoch, key: key)
      case .connecting, .subscribing: suspend(resource, phase: .connecting, failure: nil)
      case .recovering: suspend(resource, phase: .recovering, failure: .connection)
      case let .failed(error): failed(resource, Self.failure(error))
      case .closed: failed(resource, .connection)
      }
    case let .frame(generation, lease, message, preReady):
      guard live(resource, generation), resource.binding?.lease === lease, message.epoch >= 0 else { return }
      if preReady, message.epoch <= resource.poisonedThrough { return }
      if resource.context == nil, let old = resource.lastEpoch, message.epoch <= old { return }
      guard let context = resource.context, message.epoch <= context.connectionEpoch else {
        buffer(resource, message); return
      }
      if message.epoch == context.connectionEpoch {
        if resource.queryStarted { apply(resource, message) } else { buffer(resource, message) }
      }
    case let .getFailed(generation, epoch, queryID, failure):
      if live(resource, generation), resource.queryID == queryID, resource.context?.connectionEpoch == epoch, resource.reducer?.hasRequestedSnapshot != true { failedRead(resource, failure) }
    case let .deadline(generation, epoch, queryID):
      if live(resource, generation), resource.queryID == queryID, resource.context?.connectionEpoch == epoch, resource.reducer?.hasRequestedSnapshot != true { failedRead(resource, .snapshotTimeout) }
    }
  }
  private func ready(_ resource: Resource, epoch: Int64, key: SharedMQTTBrokerKey) {
    guard key.accountRevision == resource.identity.revision, let binding = resource.binding else { failed(resource, .configuration); return }
    if let prior = resource.lastEpoch, epoch <= prior { return }
    do {
      resource.query?.cancel(); resource.deadline?.cancel(); resource.reducer?.close()
      let context = try ShadowContext(accountRevision: Int64(resource.identity.revision), connectionEpoch: epoch, resourceID: resource.resourceID, thingRef: binding.lease.resource.thingRef, userID: resource.identity.userID)
      resource.context = context; resource.lastEpoch = epoch; resource.reducer = ClassicShadowReducer(context: context, profile: resource.profile); resource.recoveryGetIssued = false
      try issueGet(resource)
      resource.pending.removeAll { $0.epoch < epoch || ($0.epoch == epoch && epoch <= resource.poisonedThrough) }
    } catch { failed(resource, .configuration) }
  }
  private func buffer(_ resource: Resource, _ message: MQTTLeaseMessage) {
    if resource.pending.count >= capacity { resource.poisonedThrough = max(message.epoch, resource.pending.map(\.epoch).max() ?? -1); resource.pending.removeAll() }
    else if message.epoch > resource.poisonedThrough { resource.pending.append(message) }
  }
  private func issueGet(_ resource: Resource) throws {
    guard let context = resource.context, let reducer = resource.reducer, let lease = resource.binding?.lease else { throw DeviceReadFailure.configuration }
    let publication = try reducer.query(context)
    guard publication.payload.isEmpty, publication.topic == lease.resource.getTopic else { throw DeviceReadFailure.configuration }
    resource.query?.cancel(); resource.deadline?.cancel(); let generation = resource.generation, epoch = context.connectionEpoch
    change(resource) { $0.connectionEpoch = epoch; $0.phase = .reading; $0.reported = resource.confirmed ?? .fields([:]); $0.online = nil; $0.snapshotAvailable = false; $0.stale = resource.confirmed != nil; $0.failure = nil }
    let queryID = UUID(); resource.queryID = queryID; resource.queryStarted = false
    resource.deadline = Task { @MainActor [weak self, weak resource] in
      do { try Task.checkCancellation(); try await self?.snapshotWait(); try Task.checkCancellation() } catch { return }
      if let self, let resource, live(resource, generation), resource.queryID == queryID { enqueue(resource, .deadline(generation, epoch, queryID)) }
    }
    resource.query = Task { @MainActor [weak self, weak resource, weak lease] in
      guard let self, let resource, let lease else { return }
      defer { if resource.queryID == queryID { resource.query = nil } }
      do {
        try Task.checkCancellation()
        guard live(resource, generation), resource.context?.connectionEpoch == epoch, resource.binding?.lease === lease else { return }
        resource.queryStarted = true
        let preceding = resource.pending.filter { $0.epoch == epoch && epoch > resource.poisonedThrough }
        resource.pending.removeAll { $0.epoch <= epoch }
        if !preceding.isEmpty {
          // This task can run only after get() has been invoked/yielded below; a pre-ready
          // response cannot publish LIVE and cancel a get that has never started.
          Task { @MainActor [weak self, weak resource] in
            guard let self, let resource else { return }
            for message in preceding {
              guard live(resource, generation), resource.queryID == queryID, resource.context?.connectionEpoch == epoch else { return }
              apply(resource, message); await Task.yield()
            }
          }
        }
        try await lease.get(expectedEpoch: epoch)
        try Task.checkCancellation()
        guard live(resource, generation), resource.queryID == queryID, resource.context?.connectionEpoch == epoch else { return }
      }
      catch is CancellationError { }
      catch {
        guard !Task.isCancelled, live(resource, generation), resource.queryID == queryID, resource.context?.connectionEpoch == epoch else { return }
        enqueue(resource, .getFailed(generation, epoch, queryID, Self.failure(error)))
      }
    }
  }
  private func apply(_ resource: Resource, _ message: MQTTLeaseMessage) {
    guard let reducer = resource.reducer, let context = resource.context else { return }
    _ = reducer.receive(context, topic: message.topic, payload: message.payload)
    switch reducer.recovery {
    case .authorizationRequired: failed(resource, .authorization); return
    case .getRequired, .unavailable:
      guard !resource.recoveryGetIssued else { failedRead(resource, .shadowProtocol); return }
      resource.recoveryGetIssued = true
      do { try issueGet(resource) } catch { failedRead(resource, .shadowProtocol) }; return
    case .none: break
    }
    guard reducer.hasRequestedSnapshot else { return }
    resource.confirmed = reducer.reported(); resource.recoveryGetIssued = false
    resource.deadline?.cancel(); resource.deadline = nil
    if resource.queryStarted { resource.query?.cancel(); resource.query = nil }
    change(resource) { $0.phase = .live; $0.reported = reducer.reported(); $0.online = reducer.online(); $0.stale = false; $0.snapshotAvailable = true; $0.failure = nil }
  }
  private func suspend(_ resource: Resource, phase: DeviceReadPhase, failure: DeviceReadFailure?) {
    resource.query?.cancel(); resource.deadline?.cancel(); resource.reducer?.close(); resource.reducer = nil; resource.context = nil
    change(resource) { $0.phase = phase; $0.online = nil; $0.snapshotAvailable = false; $0.stale = resource.confirmed != nil; $0.failure = failure }
  }
  private func failedRead(_ resource: Resource, _ failure: DeviceReadFailure) {
    resource.query?.cancel(); resource.deadline?.cancel()
    change(resource) { $0.phase = .unavailable; $0.online = nil; $0.snapshotAvailable = false; $0.stale = resource.confirmed != nil; $0.failure = failure }
  }
  private func failed(_ resource: Resource, _ failure: DeviceReadFailure) {
    guard live(resource) else { return }; stopBinding(resource)
    if failure == .authorization { resource.confirmed = nil; resource.device = nil }
    change(resource) { $0.phase = failure == .authorization ? .forbidden : .unavailable; $0.reported = resource.confirmed ?? .fields([:]); $0.online = nil; $0.snapshotAvailable = false; $0.stale = resource.confirmed != nil; $0.failure = failure; if failure == .authorization { $0.metadata = nil } }
  }
  private func stopBinding(_ resource: Resource) {
    resource.generation = UUID(); resource.initialization?.cancel(); resource.initializationDeadline?.cancel()
    resource.query?.cancel(); resource.deadline?.cancel(); resource.drain?.cancel(); resource.drain = nil; resource.drainID = UUID()
    for event in resource.events { acknowledge(event) }; resource.events.removeAll(); resource.pending.removeAll(); resource.poisonedThrough = -1
    resource.binding?.lease.onStateChanged = nil; resource.binding?.lease.onMessageAvailable = nil; resource.binding?.close(); resource.binding = nil
    resource.reducer?.close(); resource.reducer = nil; resource.context = nil; resource.profile = nil
  }
  private func change(_ resource: Resource, _ mutation: (inout DeviceReadSnapshot) -> Void) {
    guard live(resource) else { return }; var next = resource.snapshot; mutation(&next)
    guard next != resource.snapshot else { return }
    guard let revision = Self.nextRevision() else { closeResource(resource, .ownerClosed); return }
    next.authorityRevision = revision; resource.snapshot = next
    for handle in resource.handles.values { handle.install(.current(next)) }
  }
  private static func failure(_ error: Error) -> DeviceReadFailure {
    if let value = error as? DeviceReadFailure { return value }
    if let value = error as? DeviceConnectionFailure { return value == .authorization ? .authorization : value == .configuration || value == .staleContext ? .configuration : .connection }
    if let value = error as? RowanFailure { return [401, 403, 1332, 1342].contains(value.code) ? .authorization : .connection }
    if let value = error as? MQTTBrokerFailure { return [.authorization, .subscriptionRejected].contains(value) ? .authorization : [.unverifiedTransport, .invalidConfiguration, .staleContext].contains(value) ? .configuration : .connection }
    return .configuration
  }
  fileprivate func snapshot(_ handle: DeviceReadHandle) throws -> DeviceReadSnapshot {
    accountChanged(); guard !handle.released, let id = handle.resource, let resource = resources[id], live(resource), resource.handles[handle.observer] === handle else { throw DeviceReadFailure.closed }; return resource.snapshot
  }
  fileprivate func retry(_ handle: DeviceReadHandle) { accountChanged(); if !handle.released, let id = handle.resource, let resource = resources[id], live(resource) { initialize(resource) } }
  /// Only a still-current native handle can apply an authoritative fresh membership rejection.
  /// Bridge fences its binding/page/read-generation before invoking this side effect.
  /// Issued only while an actual native handle owns this incarnation, independent of later page release.
  func captureOwnershipReceipt(_ handle:DeviceReadHandle)->DeviceOwnershipReceipt? {
    accountChanged()
    guard !handle.released,handle.owner === self,let id=handle.resource,let resource=resources[id],live(resource),resource.handles[handle.observer] === handle,!resource.ownershipRevoked,!resource.authorizationPending else{return nil}
    return DeviceOwnershipReceipt(encoded:"\(Self.ownershipProcessId.uuidString):\(ownershipOwnerId.uuidString):\(resource.ownershipSerial)")
  }
  /// Trusted native operation / encrypted journal recovery only; never accept an RN token.
  func retireOwnershipReceipt(_ encoded:String)->Bool {
    let parts=encoded.split(separator:":",omittingEmptySubsequences:false)
    guard parts.count==3,let process=UUID(uuidString:String(parts[0])),let owner=UUID(uuidString:String(parts[1])),let serial=Int64(parts[2]),serial>0 else{return false}
    if process != Self.ownershipProcessId{return true} // No resource survives its original process.
    guard owner==ownershipOwnerId,serial<=ownershipSequence else{return false} // Foreign live owner is not retired proof.
    guard let resource=resources.values.first(where:{$0.ownershipSerial==serial}) else{return true}
    if resource.ownershipRevoked{return true}
    guard live(resource) else{closeResource(resource,.accountChanged);return true}
    resource.ownershipRevoked=true;resource.deferredRetry=false;failed(resource,.authorization);return resource.ownershipRevoked
  }
  static func receiptFromPreviousProcess(_ encoded:String)->Bool? {
    let parts=encoded.split(separator:":",omittingEmptySubsequences:false)
    guard parts.count==3,let process=UUID(uuidString:String(parts[0])),UUID(uuidString:String(parts[1])) != nil,let serial=Int64(parts[2]),serial>0 else{return nil}
    return process != ownershipProcessId
  }
  func replaceOwnershipReceipt(_ encoded:String)->Bool {
    guard retireOwnershipReceipt(encoded) else{return false}
    let parts=encoded.split(separator:":");if UUID(uuidString:String(parts[0])) != Self.ownershipProcessId{return true}
    if let serial=Int64(parts[2]),let resource=resources.values.first(where:{$0.ownershipSerial==serial}){closeResource(resource,.released)}
    return true
  }
  func captureFeatureAuthority(_ handle:DeviceReadHandle)->DeviceFeatureAuthority? {
    accountChanged()
    guard !handle.released,handle.owner === self,let id=handle.resource,let resource=resources[id],live(resource),
      resource.handles[handle.observer] === handle,!resource.ownershipRevoked,!resource.authorizationPending,
      resource.snapshot.phase != .forbidden,resource.snapshot.failure != .authorization else{return nil}
    return resource.featureAuthority
  }
  func featureReadCurrent(_ handle:DeviceReadHandle,authority:DeviceFeatureAuthority)->Bool {captureFeatureAuthority(handle) === authority}
  /// Trusted same-process ACK; this refresh is not an assertion that the current page was unbound.
  func invalidateAcknowledgedAuthority(expectedRevision:Int,userID:String,resourceID:String)->Bool {
    accountChanged()
    guard !closed,let identity=currentAccount(),identity.revision==expectedRevision,identity.userID.utf8.elementsEqual(userID.utf8) else{return false}
    guard let resource=resources.values.first(where:{$0.identity==identity && $0.resourceID.utf8.elementsEqual(resourceID.utf8)}) else{return true}
    if resource.ownershipRevoked{return true} // Original receipt cleanup stays terminal.
    guard live(resource) else{return false}
    resource.featureAuthority=DeviceFeatureAuthority();resource.authorizationPending=true
    stopBinding(resource);resource.confirmed=nil;resource.device=nil;resource.lastEpoch=nil
    change(resource){$0.metadata=nil;$0.reported = .fields([:]);$0.online=nil;$0.connectionEpoch=nil;
      $0.snapshotAvailable=false;$0.stale=false;$0.phase = .authorizing;$0.failure=nil}
    initialize(resource);return true
  }
  @discardableResult func revokeOwnership(_ handle: DeviceReadHandle) -> Bool {
    accountChanged()
    guard !handle.released, handle.owner === self, let id = handle.resource, let resource = resources[id], live(resource),
          resource.handles[handle.observer] === handle, !resource.ownershipRevoked else { return false }
    resource.ownershipRevoked = true; resource.deferredRetry = false
    failed(resource, .authorization) // no await: generation fence and all-observer cache cleanup are atomic
    return true
  }
  /// Shared entry/return/classifier guard for all feature RPCs. MQTT readiness/online is
  /// deliberately irrelevant; a current explicit authorization rejection is not.
  func featureReadCurrent(_ handle: DeviceReadHandle) -> Bool {
    accountChanged()
    guard !handle.released, handle.owner === self, let id = handle.resource, let resource = resources[id], live(resource),
          resource.handles[handle.observer] === handle, !resource.ownershipRevoked,!resource.authorizationPending else { return false }
    return resource.snapshot.phase != .forbidden && resource.snapshot.failure != .authorization
  }
  fileprivate func release(_ handle: DeviceReadHandle) {
    if let id = handle.resource, let resource = resources[id], resource.handles[handle.observer] === handle { resource.handles.removeValue(forKey: handle.observer); if resource.handles.isEmpty { closeResource(resource, .released) } }
    handle.install(.closed(.released))
  }
  private func closeResource(_ resource: Resource, _ reason: DeviceReadCloseReason) {
    resources.removeValue(forKey: resource.id); resource.deferredRetry = false
    for handle in resource.handles.values { handle.install(.closed(reason)) }; resource.handles.removeAll(); stopBinding(resource)
  }
  func accountChanged() {
    let stale = resources.values.filter { currentAccount() != $0.identity }
    for resource in stale { let revision = resource.identity.revision; closeResource(resource, .accountChanged); if invalidated.insert(revision).inserted { invalidate(revision) } }
  }
  func close() { guard !closed else { return }; for resource in Array(resources.values) { closeResource(resource, .ownerClosed) }; closed = true }
}

@MainActor
final class DeviceReadHandle {
  fileprivate weak var owner: DeviceReadOwner?
  fileprivate let resource: UUID?
  fileprivate let observer: Data
  private(set) var state: DeviceReadObservationState
  private(set) var released = false
  var onChanged: (() -> Void)? { didSet { notify() } }
  private var scheduled = false
  fileprivate init(owner: DeviceReadOwner, resource: UUID, observer: Data, snapshot: DeviceReadSnapshot) { self.owner = owner; self.resource = resource; self.observer = observer; state = .current(snapshot) }
  fileprivate init(closed: DeviceReadCloseReason) { owner = nil; resource = nil; observer = Data(); state = .closed(closed); released = true }
  func getSnapshot() throws -> DeviceReadSnapshot { guard let owner else { throw DeviceReadFailure.closed }; return try owner.snapshot(self) }
  func retry() { owner?.retry(self) }
  func close() { guard !released else { return }; owner?.release(self); install(.closed(.released)) }
  fileprivate func install(_ value: DeviceReadObservationState) { guard state != value else { return }; state = value; if case .closed = value { released = true; owner = nil }; notify() }
  private func notify() { guard !scheduled else { return }; scheduled = true; Task { @MainActor [weak self] in guard let self else { return }; scheduled = false; onChanged?() } }
}

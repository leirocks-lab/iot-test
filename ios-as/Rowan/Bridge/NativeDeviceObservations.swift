import Foundation

/// A JS binding owns one native handle. Page closures must capture the native controller weakly.
/// Delivery revision belongs to this binding; owner authority and connection epoch never derive from it.
@MainActor
final class NativeDeviceObservations {
  @MainActor final class ReadContext {
    let handle: DeviceReadHandle
    let deviceID: String
    let revision: Int
    let pageID:String
    let current: () -> Bool
    init(handle: DeviceReadHandle, deviceID: String, revision: Int, pageID:String="", current: @escaping () -> Bool) {
      self.handle = handle; self.deviceID = deviceID; self.revision = revision;self.pageID=pageID; self.current = current
    }
  }
  private final class Binding {
    let owner: String, page: String, handle: DeviceReadHandle
    let current: () -> Bool, visible: () -> Bool
    var snapshot: DeviceBridgeSnapshot
    var terminal = false
    var inFlight: Int?
    var lastDelivered = -1
    var pending: DeviceBridgeSnapshot?
    init(owner: String, page: String, handle: DeviceReadHandle, snapshot: DeviceBridgeSnapshot,
         current: @escaping () -> Bool, visible: @escaping () -> Bool) {
      self.owner = owner; self.page = page; self.handle = handle; self.snapshot = snapshot
      self.current = current; self.visible = visible
    }
  }
  let deviceOwner: DeviceReadOwner
  private var bindings: [String: Binding] = [:]
  var emit: ((String, DeviceBridgeSnapshot) -> Void)?
  var invalidated: ((String) -> Void)?
  var released: ((String) -> Void)?
  init(owner: DeviceReadOwner) { deviceOwner = owner }

  func observe(deviceID: String, revision: Int, owner: String, page: String,
               current: @escaping () -> Bool, visible: @escaping () -> Bool) throws -> DeviceBridgeSnapshot {
    guard current() else { throw BridgeObservationFailure.sessionChanged }
    guard bindings.values.filter({ $0.owner == owner }).count < 8 else { throw BridgeObservationFailure.unavailable }
    let id = UUID().uuidString
    let handle = deviceOwner.observe(resourceID: deviceID, nativeObserverID: id)
    let binding = Binding(owner: owner, page: page, handle: handle,
      snapshot: DeviceBridgeSnapshot(deviceID: deviceID, observationID: id, sessionRevision: revision), current: current, visible: visible)
    bindings[id] = binding
    handle.onChanged = { [weak self, weak binding] in
      guard let self, let binding, bindings[id] === binding else { return }
      refresh(binding); enqueue(binding)
    }
    refresh(binding)
    return binding.snapshot
  }
  func isKnown(_ id:String,owner:String)->Bool {bindings[id]?.owner==owner}
  func get(_ id: String, owner: String) throws -> DeviceBridgeSnapshot {
    let binding = try owned(id, owner); refresh(binding); return binding.snapshot
  }
  func readContext(_ id: String, owner: String) throws -> ReadContext {
    let binding = try owned(id, owner); refresh(binding)
    guard !binding.terminal else { throw BridgeObservationFailure(rawValue: binding.snapshot.errorCode) ?? .closed }
    guard binding.snapshot.errorCode != "forbidden" else { throw DeviceMoreReadFailure.forbidden }
    guard binding.visible(), deviceOwner.featureReadCurrent(binding.handle) else { throw DeviceMoreReadFailure.closed }
    guard let authority=deviceOwner.captureFeatureAuthority(binding.handle) else{throw DeviceMoreReadFailure.closed}
    return ReadContext(handle: binding.handle, deviceID: binding.snapshot.deviceID, revision: binding.snapshot.sessionRevision,
      current: { [weak self, weak binding] in
        guard let self, let binding, bindings[id] === binding else { return false }
        return !binding.terminal && binding.current() && binding.visible() && deviceOwner.featureReadCurrent(binding.handle,authority:authority)
      })
  }
  /// Exact current observation/page only; existing self-unbind state can outlive ownership.
  /// This does not grant write permission: registration/authority/affirmative dispatch revalidate it.
  func selfUnbindContext(_ id:String,owner:String) throws -> ReadContext {
    let binding=try owned(id,owner);refresh(binding)
    guard !binding.terminal,binding.current(),binding.visible(),!binding.handle.released else{throw BridgeObservationFailure.closed}
    return ReadContext(handle:binding.handle,deviceID:binding.snapshot.deviceID,revision:binding.snapshot.sessionRevision,pageID:binding.page,current:{[weak self,weak binding] in
      guard let self,let binding,bindings[id] === binding else{return false}
      return !binding.terminal&&binding.current()&&binding.visible() && !binding.handle.released
    })
  }
  func retry(_ id: String, owner: String) {
    guard let binding = try? owned(id, owner) else { return }; refresh(binding)
    guard !binding.terminal, binding.visible() else { return }; binding.handle.retry()
  }
  func acknowledge(_ id: String, revision: Int, owner: String) {
    guard let binding = try? owned(id, owner), binding.inFlight == revision else { return }
    binding.inFlight = nil; refresh(binding)
    if binding.pending != nil { enqueue(binding) }
  }
  func resumeVisible() { for binding in Array(bindings.values) { refresh(binding); enqueue(binding) } }
  func accountChanged() {
    deviceOwner.accountChanged()
    for binding in Array(bindings.values) { refresh(binding); enqueue(binding) }
  }
  func release(_ id: String, owner: String) {
    guard let binding = bindings[id], binding.owner == owner else { return }
    bindings.removeValue(forKey: id); binding.handle.onChanged = nil; binding.handle.close(); invalidated?(id);released?(id)
  }
  func releaseOwner(_ owner: String) { for (id, binding) in bindings where binding.owner == owner { release(id, owner: owner) } }
  func suspendPage(_ page: String) { for (id, binding) in bindings where binding.page == page { invalidated?(id) } }
  func closePage(_ page: String) { for (id, binding) in bindings where binding.page == page { release(id, owner: binding.owner) } }
  private func owned(_ id: String, _ owner: String) throws -> Binding {
    guard let binding = bindings[id], binding.owner == owner else { throw BridgeObservationFailure.closed }; return binding
  }
  private func refresh(_ binding: Binding) {
    guard !binding.terminal else { return }
    guard binding.current() else { close(binding, .sessionChanged); return }
    guard case let .current(native) = binding.handle.state else { close(binding, .closed); return }
    guard native.accountRevision == binding.snapshot.sessionRevision,
          native.resourceID.utf8.elementsEqual(binding.snapshot.deviceID.utf8),
          native.authorityRevision >= Int64(binding.snapshot.authorityRevision),
          native.authorityRevision <= 9_007_199_254_740_991,
          (native.connectionEpoch ?? 0) >= Int64(binding.snapshot.connectionEpoch),
          (native.connectionEpoch ?? 0) <= 9_007_199_254_740_991 else { close(binding, .invalidSnapshot); return }
    var next = binding.snapshot
    next.authorityRevision = Int(native.authorityRevision); next.connectionEpoch = Int(native.connectionEpoch ?? 0)
    next.title = native.metadata?.title ?? ""; next.productCategory = native.metadata?.category ?? ""
    next.online = native.online.map { $0 ? "online" : "offline" } ?? "unknown"
    next.stale = native.stale; next.snapshotAvailable = native.snapshotAvailable
    switch native.phase {
    case .authorizing: next.phase = "authorizing"
    case .connecting: next.phase = "connecting"
    case .reading: next.phase = "reading"
    case .live: next.phase = "live"
    case .recovering: next.phase = "recovering"
    case .forbidden, .unavailable: next.phase = "failed"
    }
    switch native.failure {
    case .authorization: next.errorCode = "forbidden"; next.title = ""; next.productCategory = ""
    case .initializationTimeout, .snapshotTimeout: next.errorCode = "timeout"
    case .closed: next.errorCode = "closed"
    case .none: next.errorCode = ""
    default: next.errorCode = "unavailable"
    }
    install(binding, next)
  }
  private func close(_ binding: Binding, _ reason: BridgeObservationFailure) {
    binding.terminal = true; binding.handle.onChanged = nil; binding.handle.close()
    var next = binding.snapshot
    next.phase = "closed"; next.errorCode = reason.rawValue; next.title = ""; next.productCategory = ""
    next.online = "unknown"; next.stale = true; next.snapshotAvailable = false
    install(binding, next); invalidated?(next.observationID)
  }
  private func install(_ binding: Binding, _ next: DeviceBridgeSnapshot) {
    guard next != binding.snapshot else { return }
    guard binding.snapshot.revision < 9_007_199_254_740_991 else { binding.terminal = true; binding.handle.close(); invalidated?(next.observationID); return }
    var value = next; value.revision = binding.snapshot.revision + 1; binding.snapshot = value
  }
  private func enqueue(_ binding: Binding) {
    guard binding.snapshot.revision > binding.lastDelivered else { return }
    binding.pending = binding.snapshot
    guard binding.visible(), binding.inFlight == nil, let value = binding.pending else { return }
    binding.pending = nil; binding.inFlight = value.revision; binding.lastDelivered = value.revision; emit?(binding.owner, value)
  }
}

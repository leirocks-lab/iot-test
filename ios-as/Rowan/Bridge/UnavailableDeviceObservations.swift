import Foundation

enum BridgeObservationFailure: String, Error, LocalizedError {
  case notAuthenticated = "not_authenticated", sessionChanged = "session_changed", closed
  case invalidSnapshot = "invalid_snapshot", unavailable
  case invalidArgument = "invalid_argument"
  var errorDescription: String? { "设备观察暂不可用" }
  var nsError: NSError { NSError(domain: "RowanObservation", code: 1, userInfo: [NSLocalizedDescriptionKey: errorDescription ?? "设备观察暂不可用", "bridgeCode": rawValue]) }
}

/// Major3 retains the V2 allowlist. No reported JSON, identity, credential or URL enters this DTO.
struct DeviceBridgeSnapshot: Equatable {
  let deviceID: String
  let observationID: String
  let sessionRevision: Int
  var revision: Int = 0
  var authorityRevision: Int = 0
  var connectionEpoch: Int = 0
  var phase = "failed"
  var errorCode = "unavailable"
  var title = ""
  var productCategory = ""
  var online = "unknown"
  var stale = true
  var snapshotAvailable = false
  var dictionary: [String: Any] {
    ["deviceId": deviceID, "observationId": observationID, "sessionRevision": sessionRevision,
     "revision": revision, "authorityRevision": authorityRevision, "connectionEpoch": connectionEpoch,
     "title": title, "productCategory": productCategory, "phase": phase, "online": online, "stale": stale,
     "snapshotAvailable": snapshotAvailable, "errorCode": errorCode]
  }
}

/// No broker is available on iOS: retry cannot invent an owner version, connection epoch or live state.
@MainActor
final class UnavailableDeviceProjection {
  private(set) var snapshot: DeviceBridgeSnapshot
  private var terminal = false
  init(deviceID: String, observationID: String, sessionRevision: Int) {
    snapshot = DeviceBridgeSnapshot(deviceID: deviceID, observationID: observationID, sessionRevision: sessionRevision)
  }
  @discardableResult func unavailable(authorityRevision: Int, connectionEpoch: Int) -> DeviceBridgeSnapshot {
    guard !terminal else { return snapshot }
    guard authorityRevision >= snapshot.authorityRevision, connectionEpoch >= snapshot.connectionEpoch,
          authorityRevision <= 9_007_199_254_740_991, connectionEpoch <= 9_007_199_254_740_991 else { return close(.invalidSnapshot) }
    var value = snapshot
    value.authorityRevision = authorityRevision; value.connectionEpoch = connectionEpoch
    return install(value)
  }
  @discardableResult func close(_ error: BridgeObservationFailure) -> DeviceBridgeSnapshot {
    guard !terminal else { return snapshot }
    terminal = true
    var value = snapshot
    value.phase = "closed"; value.errorCode = error.rawValue
    // Preserve authorityRevision/connectionEpoch at the terminal boundary; never reset to zero.
    return install(value)
  }
  private func install(_ value: DeviceBridgeSnapshot) -> DeviceBridgeSnapshot {
    if value != snapshot {
      var next = value
      if snapshot.revision < 9_007_199_254_740_991 { next.revision = snapshot.revision + 1 }
      snapshot = next
    }
    return snapshot
  }
}

/// MainActor registry owns handles per native page and TurboModule instance.
@MainActor
final class UnavailableDeviceObservations {
  private final class Binding {
    let owner: String
    let page: String
    let projection: UnavailableDeviceProjection
    let current: () -> Bool
    let visible: () -> Bool
    var inFlight: Int?
    var pending: DeviceBridgeSnapshot?
    init(owner: String, page: String, projection: UnavailableDeviceProjection, current: @escaping () -> Bool, visible: @escaping () -> Bool) {
      self.owner = owner; self.page = page; self.projection = projection; self.current = current; self.visible = visible
    }
  }
  private var bindings: [String: Binding] = [:]
  var emit: ((String, DeviceBridgeSnapshot) -> Void)?
  func observe(deviceID: String, revision: Int, owner: String, page: String, current: @escaping () -> Bool, visible: @escaping () -> Bool) throws -> DeviceBridgeSnapshot {
    guard current() else { throw BridgeObservationFailure.sessionChanged }
    let id = UUID().uuidString
    let projection = UnavailableDeviceProjection(deviceID: deviceID, observationID: id, sessionRevision: revision)
    bindings[id] = Binding(owner: owner, page: page, projection: projection, current: current, visible: visible)
    return projection.snapshot
  }
  func get(_ id: String, owner: String) throws -> DeviceBridgeSnapshot {
    guard let binding = bindings[id], binding.owner == owner else { throw BridgeObservationFailure.closed }
    return checked(binding)
  }
  /// No verified native broker/ownership proof is installed yet. Never dispatch HTTP from this handle.
  func readOnlyFailure(_ id: String, owner: String) -> BridgeObservationFailure {
    guard let binding = bindings[id], binding.owner == owner else { return .closed }
    let value = checked(binding)
    if value.phase == "closed" { return BridgeObservationFailure(rawValue: value.errorCode) ?? .closed }
    guard binding.visible() else { return .closed }
    return .unavailable
  }
  func retry(_ id: String, owner: String) {
    guard let binding = bindings[id], binding.owner == owner else { return }
    let value = checked(binding)
    // Explicitly re-deliver the same truthful unavailable state. No fake sequence/epoch advancement.
    enqueue(binding, value)
  }
  func acknowledge(_ id: String, revision: Int, owner: String) {
    guard let binding = bindings[id], binding.owner == owner, binding.inFlight == revision else { return }
    binding.inFlight = nil
    if binding.pending?.revision == revision { binding.pending = nil }
    flush(binding)
  }
  func resumeVisible() { for binding in bindings.values { _ = checked(binding); flush(binding) } }
  func release(_ id: String, owner: String) {
    guard bindings[id]?.owner == owner else { return }
    bindings.removeValue(forKey: id)
  }
  func releaseOwner(_ owner: String) { bindings = bindings.filter { $0.value.owner != owner } }
  func closePage(_ page: String) {
    for (id, binding) in bindings where binding.page == page {
      enqueue(binding, binding.projection.close(.closed)); bindings.removeValue(forKey: id)
    }
  }
  func accountChanged() { for binding in bindings.values { _ = checked(binding) } }
  private func checked(_ binding: Binding) -> DeviceBridgeSnapshot {
    if !binding.current() {
      let before = binding.projection.snapshot, value = binding.projection.close(.sessionChanged)
      if before != value { enqueue(binding, value) }
    }
    return binding.projection.snapshot
  }
  private func enqueue(_ binding: Binding, _ value: DeviceBridgeSnapshot) {
    binding.pending = value
    flush(binding)
  }
  private func flush(_ binding: Binding) {
    guard binding.inFlight == nil, binding.visible(), let value = binding.pending else { return }
    binding.pending = nil; binding.inFlight = value.revision
    emit?(binding.owner, value)
  }
}

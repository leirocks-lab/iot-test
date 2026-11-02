import Foundation

struct MQTTPoolIdentity: Equatable, MQTTRedacted {
  let revision: Int
  let userID: String
  static func == (lhs: Self, rhs: Self) -> Bool { lhs.revision == rhs.revision && lhs.userID.utf8.elementsEqual(rhs.userID.utf8) }
}
struct MQTTLeaseResource: Hashable, MQTTRedacted {
  let accountRevision: Int
  let resourceID: String
  let thingRef: String
  let userID: String
  var identity: MQTTPoolIdentity { MQTTPoolIdentity(revision: accountRevision, userID: userID) }
  init(accountRevision: Int, resourceID: String, thingRef: String, userID: String) throws {
    _ = try ShadowContext(accountRevision: Int64(accountRevision), connectionEpoch: 0, resourceID: resourceID, thingRef: thingRef, userID: userID)
    guard resourceID.rangeOfCharacter(from: .controlCharacters) == nil, userID.rangeOfCharacter(from: .controlCharacters) == nil else { throw MQTTBrokerFailure.invalidConfiguration }
    self.accountRevision = accountRevision; self.resourceID = resourceID; self.thingRef = thingRef; self.userID = userID
  }
  static func == (lhs: Self, rhs: Self) -> Bool {
    lhs.identity == rhs.identity && lhs.resourceID.utf8.elementsEqual(rhs.resourceID.utf8) && lhs.thingRef.utf8.elementsEqual(rhs.thingRef.utf8)
  }
  func hash(into hasher: inout Hasher) { hasher.combine(accountRevision); for value in [resourceID, thingRef, userID] { hasher.combine(Data(value.utf8)) } }
  var responseTopics: Set<String> { Set(["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map { "$aws/things/\(thingRef)/shadow/\($0)" }) }
  var getTopic: String { "$aws/things/\(thingRef)/shadow/get" }
}
/// Identity excludes signed query/token/password; preserves native server clientID without modification.
struct SharedMQTTBrokerKey: Hashable, MQTTRedacted {
  let accountRevision: Int
  let authority: String
  let path: String
  let serverClientID: String
  init(revision: Int, parameters: MQTTConnectionParameters) throws {
    let url = parameters.withURL { $0 }
    guard revision >= 0, url.scheme == "wss", let host = url.host, url.user == nil, url.password == nil, url.fragment == nil,
          url.port == nil || url.port == 443, !parameters.clientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          parameters.clientID.rangeOfCharacter(from: .controlCharacters) == nil,
          let parts = URLComponents(url: url, resolvingAgainstBaseURL: false) else { throw MQTTBrokerFailure.invalidConfiguration }
    accountRevision = revision; authority = host.lowercased() + ":443"
    path = parts.percentEncodedPath.isEmpty ? "/" : parts.percentEncodedPath; serverClientID = parameters.clientID
  }
  static func == (lhs: Self, rhs: Self) -> Bool {
    lhs.accountRevision == rhs.accountRevision && lhs.authority == rhs.authority && lhs.path.utf8.elementsEqual(rhs.path.utf8) && lhs.serverClientID.utf8.elementsEqual(rhs.serverClientID.utf8)
  }
  func hash(into hasher: inout Hasher) { hasher.combine(accountRevision); hasher.combine(authority); hasher.combine(Data(path.utf8)); hasher.combine(Data(serverClientID.utf8)) }
}
enum MQTTLeaseReadyReason: Equatable { case initial, reconnected, credentialsRenewed, keyMigrated, bufferRecovery }
enum MQTTLeaseState: Equatable {
  case connecting, subscribing, recovering(MQTTBrokerFailure), ready(epoch: Int64, key: SharedMQTTBrokerKey, reason: MQTTLeaseReadyReason), failed(MQTTBrokerFailure), closed
}
struct MQTTLeaseMessage {
  let sequence: Int64
  let epoch: Int64
  let topic: String
  let payload: Data
}

/// MainActor handle, explicit close. One in-flight message; exact ACK releases the next item.
@MainActor
protocol NativeShadowLeasePort: AnyObject {
  var resource: MQTTLeaseResource { get }
  var state: MQTTLeaseState { get }
  var onStateChanged: (() -> Void)? { get set }
  var onMessageAvailable: (() -> Void)? { get set }
  func nextMessage() -> MQTTLeaseMessage?
  func acknowledge(sequence: Int64)
  func get(expectedEpoch: Int64) async throws
  func close()
}

@MainActor
final class NativeShadowLease: NativeShadowLeasePort {
  let resource: MQTTLeaseResource
  let observerID: String
  private(set) var state = MQTTLeaseState.connecting
  var onStateChanged: (() -> Void)? { didSet { if onStateChanged != nil { stateDirty = true; notify() } } }
  /// Consumer should synchronously reserve nextMessage before starting asynchronous work.
  var onMessageAvailable: (() -> Void)? { didSet { if onMessageAvailable != nil { notify() } } }
  fileprivate weak var pool: NativeSharedBrokerPool?
  private(set) var released = false
  private var queue: [MQTTLeaseMessage] = []
  private var inFlight: MQTTLeaseMessage?
  private var notificationScheduled = false
  private var stateDirty = false
  let capacity: Int
  init(resource: MQTTLeaseResource, observerID: String, capacity: Int, pool: NativeSharedBrokerPool) {
    self.resource = resource; self.observerID = observerID; self.capacity = capacity; self.pool = pool
  }
  func nextMessage() -> MQTTLeaseMessage? {
    guard !released, inFlight == nil, !queue.isEmpty else { return nil }
    let value = queue.removeFirst(); inFlight = value; return value
  }
  func acknowledge(sequence: Int64) { guard inFlight?.sequence == sequence else { return }; inFlight = nil; notify() }
  func get(expectedEpoch: Int64) async throws { guard let pool else { throw MQTTBrokerFailure.retired }; try await pool.get(self, epoch: expectedEpoch) }
  func retry() { pool?.retry(self) }
  func close() { guard !released else { return }; pool?.release(self); finish(.closed) }
  func install(_ state: MQTTLeaseState) { guard self.state != state else { return }; self.state = state; stateDirty = true; notify() }
  func finish(_ state: MQTTLeaseState) { released = true; pool = nil; discard(); install(state) }
  func discard() { queue.removeAll(); inFlight = nil }
  func enqueue(_ value: MQTTLeaseMessage) -> Bool {
    guard !released, queue.count + (inFlight == nil ? 0 : 1) < capacity else { return false }; queue.append(value); notify(); return true
  }
  private func notify() {
    guard !notificationScheduled else { return }; notificationScheduled = true
    Task { @MainActor [weak self] in
      guard let self else { return }; notificationScheduled = false
      let changed = stateDirty; stateDirty = false
      if changed { onStateChanged?() }
      if !released, inFlight == nil, !queue.isEmpty { onMessageAvailable?() }
    }
  }
}

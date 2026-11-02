import XCTest
@testable import Rowan

/// Public, in-memory HOME/DEVICE fixtures. AuthorizedDevice keeps its real restricted initializer.
@MainActor
func makeDeviceReadProof(resourceID: String = "http-resource") async throws -> AuthorizedDevice {
  let (account, _) = try await makeDeviceReadAccount(resourceID: resourceID)
  return try await HTTPDeviceAccess(account: account, expiryEncoding: .unknown).authorize(resourceID: resourceID, expectedRevision: account.revision)
}
@MainActor
func makeDeviceReadAccount(resourceID: String = "http-resource") async throws -> (AccountService, DeviceProofHTTP) {
  let http = DeviceProofHTTP(resourceID: resourceID), account = AccountService(http: http, storage: DeviceProofStorage())
  try await account.login(account: "public@example.test", pin: "fixture"); return (account, http)
}
@MainActor final class DeviceProofHTTP: HTTPGateway {
  var paths: [String] = []
  let resourceID: String
  var hook: (String) async throws -> Void = { _ in }
  init(resourceID: String) { self.resourceID = resourceID }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    if method == "POST" { return ["accessToken": "fixture-access", "refreshToken": "fixture-refresh", "userID": "native-user"] }
    paths.append(path)
    try await hook(path)
    if path == "/api/app/devices" { return [["devices": [["device": ["id": resourceID]]]]] }
    return ["device": ["id": resourceID], "product": ["id": "fixture-product", "category": "Fixture"], "deviceNickname": "Fixture device"]
  }
}
@MainActor private final class DeviceProofStorage: SessionStorage { func read() async throws -> Data? { nil }; func write(_ value: Data?) async throws { } }

@MainActor
final class DeviceReadFakeGateway: NativeDeviceAccessGateway {
  let device: AuthorizedDevice
  var authorizations = 0, connections = 0
  var authorizeHook: () async throws -> Void = { }
  var connectionHook: () async throws -> Void = { }
  var thingRef = "cloud-thing"
  var authorizeResult: (String, Int) -> AuthorizedDevice? = { _, _ in nil }
  init(_ device: AuthorizedDevice) { self.device = device }
  func authorize(resourceID: String, expectedRevision: Int) async throws -> AuthorizedDevice {
    authorizations += 1; try await authorizeHook(); return authorizeResult(resourceID, expectedRevision) ?? device
  }
  func connection(_ device: AuthorizedDevice) async throws -> MQTTConnectionParameters {
    connections += 1; try await connectionHook()
    return MQTTConnectionParameters(resourceID: device.resourceID, thingRef: thingRef, clientID: "server-client", authentication: .none,
      httpHostHeader: "mqtt.example.test:443", credentialExpiry: .absent, signedRequestExpiresAt: nil,
      url: URL(string: "wss://mqtt.example.test:443/mqtt?public=fixture-\(connections)")!)
  }
}
@MainActor
final class DeviceReadFakeLease: NativeShadowLeasePort {
  let resource: MQTTLeaseResource
  var state = MQTTLeaseState.connecting
  var onStateChanged: (() -> Void)?
  var onMessageAvailable: (() -> Void)?
  var queue: [MQTTLeaseMessage] = []
  var inFlight: MQTTLeaseMessage?
  var gets: [Int64] = [], acknowledgements: [Int64] = []
  var closes = 0
  var getHook: (Int64) async throws -> Void = { _ in }
  var nextSequence: Int64 = 0
  init(_ resource: MQTTLeaseResource) { self.resource = resource }
  func nextMessage() -> MQTTLeaseMessage? { guard inFlight == nil, !queue.isEmpty else { return nil }; let message = queue.removeFirst(); inFlight = message; return message }
  func acknowledge(sequence: Int64) { guard inFlight?.sequence == sequence else { return }; acknowledgements.append(sequence); inFlight = nil; if !queue.isEmpty { onMessageAvailable?() } }
  func get(expectedEpoch: Int64) async throws { gets.append(expectedEpoch); try await getHook(expectedEpoch) }
  func close() { guard closes == 0 else { return }; closes += 1; state = .closed; queue.removeAll(); inFlight = nil; onStateChanged?() }
  func ready(_ epoch: Int64) throws {
    let parameters = MQTTConnectionParameters(resourceID: resource.resourceID, thingRef: resource.thingRef, clientID: "server-client", authentication: .none,
      httpHostHeader: "mqtt.example.test:443", credentialExpiry: .absent, signedRequestExpiresAt: nil, url: URL(string: "wss://mqtt.example.test:443/mqtt")!)
    state = .ready(epoch: epoch, key: try SharedMQTTBrokerKey(revision: resource.accountRevision, parameters: parameters), reason: .initial); onStateChanged?()
  }
  func emit(epoch: Int64, version: Int = 1, reported: [String: Any] = [:], suffix: String = "get/accepted") throws {
    try send(epoch: epoch, suffix: suffix, body: ["version": version, "state": ["reported": reported]])
  }
  func send(epoch: Int64, suffix: String, body: [String: Any]) throws {
    nextSequence += 1
    queue.append(MQTTLeaseMessage(sequence: nextSequence, epoch: epoch, topic: "$aws/things/\(resource.thingRef)/shadow/" + suffix,
      payload: try JSONSerialization.data(withJSONObject: body))); onMessageAvailable?()
  }
}
@MainActor
final class DeviceReadFakeBinding: AuthorizedDeviceLease {
  let lease: NativeShadowLeasePort
  init(_ lease: NativeShadowLeasePort) { self.lease = lease }
  func close() { lease.close() }
}
@MainActor
final class DeviceReadTestSignal {
  private var waiters: [UUID: CheckedContinuation<Void, Error>] = [:]
  var waiting: Int { waiters.count }
  func wait() async throws {
    try Task.checkCancellation(); let id = UUID()
    try await withTaskCancellationHandler(operation: {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        if Task.isCancelled { continuation.resume(throwing: CancellationError()) } else { waiters[id] = continuation }
      }
    }, onCancel: { [weak self] in Task { @MainActor in self?.waiters.removeValue(forKey: id)?.resume(throwing: CancellationError()) } })
  }
  func open() { let pending = Array(waiters.values); waiters.removeAll(); for item in pending { item.resume() } }
}

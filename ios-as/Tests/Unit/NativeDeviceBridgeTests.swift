import XCTest
@testable import Rowan

/// Offline definitions only: actual Owner and registry, in-memory proof and lease, no UIKit/runtime/network.
@MainActor
final class NativeDeviceBridgeTests: XCTestCase {
  @MainActor private final class Storage: SessionStorage {
    func read() async throws -> Data? { nil }
    func write(_ value: Data?) async throws { }
  }
  @MainActor private final class HTTP: HTTPGateway {
    var paths: [String] = [], methods: [String] = []
    var featureFailure: Int?
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if method == "POST" { return ["accessToken": "public-fixture-token", "refreshToken": "public-fixture-refresh", "userID": "native-user"] }
      methods.append(method); paths.append(path)
      if path == "/api/app/devices" { return [["devices": [["device": ["id": "resource"]]]]] }
      if path == "/api/app/devices/resource" {
        return ["device": ["id": "resource", "name": "Fixture", "mac": "private-mac"], "product": ["id": "product", "category": "Fixture"], "deviceNickname": "Native metadata"]
      }
      if let featureFailure { throw RowanFailure(code: featureFailure, message: "private server message") }
      if path.hasSuffix("/schedules") { return [["id": "private-rule-id", "enabled": false]] }
      if path.contains("/ota/") { return ["firmware": ["id": "private-firmware-id", "version": "fixture-version"], "device": ["id": "resource", "name": "Fixture", "mac": "private-mac"]] }
      if path.hasSuffix("/users") { return [["userID": "private-member-id", "nickname": "Member", "email": "private@example.test", "bindingRole": "mbr"]] }
      if path.hasSuffix("/helping?type=text") { return [["id": "private-help-id", "title": "Help", "content": "Plain text"]] }
      if path.hasSuffix("/location") { return NSNull() }
      throw RowanFailure(code: 502, message: "Unexpected fixture route")
    }
  }
  @MainActor private final class Fixture {
    let gateway: DeviceReadFakeGateway
    var identity: MQTTPoolIdentity?
    var visible = true, pageCurrent = true, connect = false
    var leases: [DeviceReadFakeLease] = []
    var events: [DeviceBridgeSnapshot] = []
    init(_ proof: AuthorizedDevice) { gateway = DeviceReadFakeGateway(proof); identity = MQTTPoolIdentity(revision: proof.accountRevision, userID: proof.userID) }
    lazy var owner = DeviceReadOwner(currentAccount: { [unowned self] in identity }, gateway: gateway, open: { [unowned self] device, _ in
      guard connect else { throw MQTTBrokerFailure.unverifiedTransport }
      let lease = DeviceReadFakeLease(try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: "cloud-thing", userID: device.userID))
      leases.append(lease); try lease.ready(100); return DeviceReadFakeBinding(lease)
    }, invalidateAccount: { _ in })
    lazy var registry: NativeDeviceObservations = {
      let value = NativeDeviceObservations(owner: owner); value.emit = { [unowned self] _, value in events.append(value) }; return value
    }()
    func observe(_ module: String = "module") throws -> DeviceBridgeSnapshot {
      try registry.observe(deviceID: gateway.device.resourceID, revision: gateway.device.accountRevision, owner: module, page: "page",
        current: { [weak self] in self?.pageCurrent == true && self?.identity != nil }, visible: { [weak self] in self?.visible == true })
    }
    func snapshot(_ id: String) throws -> DeviceBridgeSnapshot { try registry.get(id, owner: "module") }
  }
  private func fixture() async throws -> Fixture { Fixture(try await makeDeviceReadProof()) }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Offline bridge fixture stalled"); throw DeviceMoreReadFailure.unavailable
  }
  func testActualOwnerMetadataSurvivesUnknownTransportWithoutInventingSnapshot() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe()
    try await wait { (try? f.snapshot(value.observationID).phase) == "failed" }
    let next = try f.snapshot(value.observationID)
    XCTAssertEqual(next.title, "Fixture device"); XCTAssertEqual(next.productCategory, "Fixture")
    XCTAssertEqual(next.errorCode, "unavailable"); XCTAssertEqual(next.online, "unknown"); XCTAssertFalse(next.snapshotAvailable)
    XCTAssertGreaterThan(next.authorityRevision, 0); XCTAssertEqual(next.connectionEpoch, 0)
    XCTAssertEqual(Set(next.dictionary.keys), ["deviceId", "observationId", "sessionRevision", "revision", "authorityRevision", "connectionEpoch", "title", "productCategory", "phase", "online", "stale", "snapshotAvailable", "errorCode"])
    XCTAssertTrue(try f.registry.readContext(value.observationID, owner: "module").current()); XCTAssertEqual(f.gateway.connections, 0)
  }
  func testSingleInflightLatestAndExactAckWithSeparateBindingRevision() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe()
    try await wait { !f.events.isEmpty && (try? f.snapshot(value.observationID).phase) == "failed" }
    let first = try XCTUnwrap(f.events.first); XCTAssertEqual(f.events.count, 1)
    f.registry.acknowledge(value.observationID, revision: first.revision + 99, owner: "module"); XCTAssertEqual(f.events.count, 1)
    f.registry.acknowledge(value.observationID, revision: first.revision, owner: "module")
    let final = try f.snapshot(value.observationID)
    if final.revision > first.revision { XCTAssertEqual(f.events.count, 2); XCTAssertEqual(f.events.last, final) }
    f.registry.acknowledge(value.observationID, revision: final.revision, owner: "module"); f.registry.resumeVisible()
    XCTAssertLessThanOrEqual(f.events.count, 2); XCTAssertGreaterThanOrEqual(final.authorityRevision, final.revision)
  }
  func testInitiallyHiddenObserverNeverEmitsUntilNativeVisible() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.visible = false; let value = try f.observe()
    try await wait { (try? f.snapshot(value.observationID).phase) == "failed" }; XCTAssertTrue(f.events.isEmpty)
    XCTAssertThrowsError(try f.registry.readContext(value.observationID, owner: "module"))
    f.visible = true; f.registry.resumeVisible(); XCTAssertEqual(f.events.count, 1); XCTAssertEqual(f.events[0].phase, "failed")
  }
  func testEightObservationLimitWrongOwnerAndPageRelease() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let values = try (0..<8).map { _ in try f.observe() }
    XCTAssertThrowsError(try f.observe()); XCTAssertThrowsError(try f.registry.readContext(values[0].observationID, owner: "other"))
    f.registry.closePage("page"); XCTAssertThrowsError(try f.snapshot(values[0].observationID)); XCTAssertNoThrow(try f.observe())
  }
  func testAccountTerminalPreservesOwnerEpochAndClearsPrivateMetadataWithoutRevival() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.connect = true; let value = try f.observe()
    try await wait { (try? f.snapshot(value.observationID).connectionEpoch) == 100 }
    let before = try f.snapshot(value.observationID); f.identity = nil; f.registry.accountChanged()
    let terminal = try f.snapshot(value.observationID)
    XCTAssertEqual(terminal.phase, "closed"); XCTAssertEqual(terminal.errorCode, "session_changed")
    XCTAssertEqual(terminal.connectionEpoch, 100); XCTAssertGreaterThanOrEqual(terminal.authorityRevision, before.authorityRevision)
    XCTAssertEqual(terminal.title, ""); XCTAssertFalse(terminal.snapshotAvailable); XCTAssertEqual(f.leases.first?.closes, 1)
    f.identity = MQTTPoolIdentity(revision: value.sessionRevision, userID: "native-user")
    f.registry.retry(value.observationID, owner: "module"); XCTAssertEqual(try f.snapshot(value.observationID), terminal)
  }
  func testFeatureRPCRejectsArbitraryIDBeforeInjectedRead() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var reads = 0, code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, _, _ in reads += 1; return .location(DeviceLocationSummary(assignment: .unknown, roomName: "")) })
    defer { rpc.close() }
    rpc.start("http-resource", request: .location) { _, error in code = error?.userInfo["bridgeCode"] as? String }
    XCTAssertEqual(code, "closed"); XCTAssertEqual(reads, 0)
  }
  func testCancelledUncooperativeTwoWorkersKeepSlotsAndCompletePromisesOnce() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe(); var pending: [CheckedContinuation<Void, Error>] = [], calls = 0, completions = 0
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { calls += 1; try await withCheckedThrowingContinuation { pending.append($0) }; return .location(DeviceLocationSummary(assignment: .unknown, roomName: "")) }
    })
    defer { rpc.close() }
    for _ in 0..<2 { rpc.start(value.observationID, request: .location) { _, _ in completions += 1 } }
    try await wait { pending.count == 2 }; rpc.cancel(); XCTAssertEqual(completions, 2)
    var third: String?; rpc.start(value.observationID, request: .help) { _, error in third = error?.userInfo["bridgeCode"] as? String }
    XCTAssertEqual(third, "unavailable"); XCTAssertEqual(calls, 2)
    pending.forEach { $0.resume() }; pending.removeAll(); try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertEqual(completions, 2)
  }
  func testLateSuccessAfterPageHiddenNeverResolvesPrivateDTO() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe(); var pending: CheckedContinuation<Void, Error>?, result: Any?, code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { try await withCheckedThrowingContinuation { pending = $0 }; return .location(DeviceLocationSummary(assignment: .assigned, roomName: "private")) }
    }); defer { rpc.close() }
    rpc.start(value.observationID, request: .location) { result = $0; code = $1?.userInfo["bridgeCode"] as? String }
    try await wait { pending != nil }; f.visible = false; pending?.resume(); try await wait { code != nil }
    XCTAssertNil(result); XCTAssertEqual(code, "session_changed")
  }
  func testMarkerRevokesActualHandleAndAllSameResourceObservers() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = try f.observe(), b = try f.observe(); var code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, _, _ in throw DeviceMoreOwnershipRevoked() }); defer { rpc.close() }
    rpc.start(a.observationID, request: .members) { _, error in code = error?.userInfo["bridgeCode"] as? String }
    try await wait { code != nil }; XCTAssertEqual(code, "forbidden")
    XCTAssertEqual(try f.snapshot(a.observationID).errorCode, "forbidden"); XCTAssertEqual(try f.snapshot(b.observationID).errorCode, "forbidden")
    XCTAssertThrowsError(try f.registry.readContext(b.observationID, owner: "module"))
  }
  func testGenericFeatureForbiddenKeepsOtherObserverAuthorization() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = try f.observe(), b = try f.observe(); var code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, _, _ in throw DeviceMoreReadFailure.forbidden }); defer { rpc.close() }
    rpc.start(a.observationID, request: .members) { _, error in code = error?.userInfo["bridgeCode"] as? String }
    try await wait { code != nil }; XCTAssertEqual(code, "forbidden"); XCTAssertTrue(try f.registry.readContext(b.observationID, owner: "module").current())
  }
  func testProductionCompositionUnknownHostAllowsSixFreshTypedGETsWithoutCredentialsOrWrites() async throws {
    let http = HTTP()
    let active = AccountService(http: http, storage: Storage())
    try await active.login(account: "public@example.test", pin: "fixture")
    let services = NativeDeviceServices(account: active, expiryEncoding: .unknown, hostPolicy: .unknown)
    defer { services.close() }
    let registry = NativeDeviceObservations(owner: services.devices)
    let value = try registry.observe(deviceID: "resource", revision: active.revision, owner: "module", page: "page", current: { true }, visible: { true })
    try await wait { (try? registry.get(value.observationID, owner: "module").phase) == "failed" }
    XCTAssertEqual(try registry.get(value.observationID, owner: "module").title, "Native metadata")
    let rpc = NativeDeviceBridgeReads(observations: registry, owner: "module", read: { context, gate, request in
      try await NativeDeviceBoundReads.read(account: active, owner: services.devices, context: context, gate: gate, request: request)
    }); defer { rpc.close(); registry.releaseOwner("module") }
    let before = http.paths.filter { $0 == "/api/app/devices" }.count
    for request: NativeDeviceReadRequest in [.schedules, .firmware(.mcu), .firmware(.wifi), .summary, .members, .help, .location] {
      let result: Any = try await withCheckedThrowingContinuation { continuation in
        rpc.start(value.observationID, request: request) { value, error in
          if let error { continuation.resume(throwing: error) }
          else if let value { continuation.resume(returning: value) }
          else { continuation.resume(throwing: DeviceMoreReadFailure.readFailed) }
        }
      }
      let data = try JSONSerialization.data(withJSONObject: result)
      let text = String(decoding: data, as: UTF8.self)
      for secret in ["private-rule-id", "private-firmware-id", "private-member-id", "private-help-id", "private-mac", "private@example.test", "public-fixture-token"] { XCTAssertFalse(text.contains(secret)) }
    }
    XCTAssertEqual(http.paths.filter { $0 == "/api/app/devices" }.count - before, 7)
    XCTAssertTrue(http.methods.allSatisfy { $0 == "GET" }); XCTAssertFalse(http.paths.contains { $0.hasSuffix("/mqtt") })
  }
  func testProductionScheduleUnbound1492RevokesAllActualOwnerHandles() async throws {
    let http = HTTP()
    let active = AccountService(http: http, storage: Storage()); try await active.login(account: "public@example.test", pin: "fixture")
    let services = NativeDeviceServices(account: active, expiryEncoding: .unknown, hostPolicy: .unknown); defer { services.close() }
    let registry = NativeDeviceObservations(owner: services.devices)
    let a = try registry.observe(deviceID: "resource", revision: active.revision, owner: "module", page: "a", current: { true }, visible: { true })
    let b = try registry.observe(deviceID: "resource", revision: active.revision, owner: "module", page: "b", current: { true }, visible: { true })
    try await wait { (try? registry.get(a.observationID, owner: "module").phase) == "failed" }; http.featureFailure = 1492
    let rpc = NativeDeviceBridgeReads(observations: registry, owner: "module", read: { context, gate, request in
      try await NativeDeviceBoundReads.read(account: active, owner: services.devices, context: context, gate: gate, request: request)
    }); defer { rpc.close(); registry.releaseOwner("module") }
    var code: String?; rpc.start(a.observationID, request: .schedules) { _, error in code = error?.userInfo["bridgeCode"] as? String }
    try await wait { code != nil }; XCTAssertEqual(code, "forbidden")
    XCTAssertEqual(try registry.get(b.observationID, owner: "module").errorCode, "forbidden")
    XCTAssertFalse(http.paths.contains { $0.hasSuffix("/mqtt") })
  }
  func testOldReleasedBindingLateRevocationCannotRevokeNewResourceHandle() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let old = try f.observe(); var pending: CheckedContinuation<Void, Error>?, code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { try await withCheckedThrowingContinuation { pending = $0 }; throw DeviceMoreOwnershipRevoked() }
    }); defer { rpc.close() }
    rpc.start(old.observationID, request: .summary) { _, error in code = error?.userInfo["bridgeCode"] as? String }
    try await wait { pending != nil }; f.registry.release(old.observationID, owner: "module"); let next = try f.observe()
    pending?.resume(); try await wait { code != nil }
    XCTAssertEqual(code, "session_changed"); XCTAssertTrue(try f.registry.readContext(next.observationID, owner: "module").current())
  }
  func testAnotherHandleRevocationRejectsAlreadyAwaitingSuccess() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = try f.observe(), b = try f.observe()
    var pending: CheckedContinuation<Void, Error>?, result: Any?, code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { try await withCheckedThrowingContinuation { pending = $0 }; return .location(DeviceLocationSummary(assignment: .assigned, roomName: "private")) }
    }); defer { rpc.close() }
    rpc.start(a.observationID, request: .location) { result = $0; code = $1?.userInfo["bridgeCode"] as? String }
    try await wait { pending != nil }; let context = try f.registry.readContext(b.observationID, owner: "module")
    XCTAssertTrue(f.owner.revokeOwnership(context.handle)); pending?.resume(); try await wait { code != nil }
    XCTAssertNil(result); XCTAssertEqual(code, "session_changed")
  }
  func testTimeoutSettlesOnceWhileUncooperativeWorkerRetainsNativeSlot() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe(), deadline = DeviceReadTestSignal()
    var pending: CheckedContinuation<Void, Error>?, completions = 0, code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { try await withCheckedThrowingContinuation { pending = $0 }; return .location(DeviceLocationSummary(assignment: .unknown, roomName: "")) }
    }, deadline: { try await deadline.wait() }); defer { rpc.close() }
    rpc.start(value.observationID, request: .location) { _, error in completions += 1; code = error?.userInfo["bridgeCode"] as? String }
    try await wait { pending != nil && deadline.waiting == 1 }; deadline.open(); try await wait { completions == 1 }
    XCTAssertEqual(code, "unavailable"); pending?.resume(); try await Task.sleep(nanoseconds: 5_000_000); XCTAssertEqual(completions, 1)
  }
  func testModuleCloseCancelsPromiseAndCannotStartFurtherNativeRead() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe()
    var pending: CheckedContinuation<Void, Error>?, calls = 0, completions = 0
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { calls += 1; try await withCheckedThrowingContinuation { pending = $0 }; return .location(DeviceLocationSummary(assignment: .unknown, roomName: "")) }
    })
    rpc.start(value.observationID, request: .help) { _, _ in completions += 1 }; try await wait { pending != nil }; rpc.close()
    var code: String?; rpc.start(value.observationID, request: .location) { _, error in code = error?.userInfo["bridgeCode"] as? String }
    XCTAssertEqual(code, "closed"); XCTAssertEqual(calls, 1); XCTAssertEqual(completions, 1)
    pending?.resume(); try await Task.sleep(nanoseconds: 5_000_000); XCTAssertEqual(completions, 1)
  }
  func testSameIdentityPublicationDoesNotCancelAwaitingFeatureRead() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let value = try f.observe()
    var pending: CheckedContinuation<Void, Error>?, result: Any?, code: String?
    let rpc = NativeDeviceBridgeReads(observations: f.registry, owner: "module", read: { _, gate, _ in
      try await gate.run { try await withCheckedThrowingContinuation { pending = $0 }; return .location(DeviceLocationSummary(assignment: .unknown, roomName: "")) }
    }); defer { rpc.close() }
    f.registry.invalidated = { id in rpc.cancel(observation: id) }
    rpc.start(value.observationID, request: .location) { result = $0; code = $1?.userInfo["bridgeCode"] as? String }
    try await wait { pending != nil }; f.registry.accountChanged(); pending?.resume(); try await wait { result != nil || code != nil }
    XCTAssertNotNil(result); XCTAssertNil(code)
  }
}

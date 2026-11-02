import XCTest
@testable import Rowan

/// Real HTTPDeviceAccess -> proof -> pool -> SharedAdapter -> owner, with in-memory HTTP/SDK driver.
/// No real API, broker, credentials, URLSession resume or clock-dependent broker permission assertion.
@MainActor
final class DeviceReadCompositionTests: XCTestCase {
  @MainActor private final class HTTP: HTTPGateway {
    var mqttRequests = 0, refreshes = 0
    var credentialFailure: Error?
    var malformedCredentials = false, expiredCredentials = false
    var homeFailure: Int?, detailFailure: Int?
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if path == "/api/app/session" {
        if method == "PATCH" { refreshes += 1 }
        return ["accessToken": "public-access-\(refreshes)", "refreshToken": "public-refresh", "userID": "native-user"]
      }
      if path == "/api/app/devices" {
        if let homeFailure { throw RowanFailure(code: homeFailure, message: "private fixture cause") }
        return [["devices": [["device": ["id": "http-resource"]]]]]
      }
      if path.hasSuffix("/mqtt") {
        mqttRequests += 1
        if mqttRequests > 2 {
          if let credentialFailure { throw credentialFailure }
          if malformedCredentials { return ["bad": "private fixture cause"] }
        }
        var result: [String: Any] = ["host": "wss://mqtt.example.test/mqtt", "endpoint": "mqtt.example.test", "path": "/mqtt", "clientID": "server-client", "deviceID": "cloud-thing", "username": "public-user", "password": "public-password"]
        if mqttRequests > 2, expiredCredentials { result["expiresAt"] = 1 }
        return result
      }
      if let detailFailure { throw RowanFailure(code: detailFailure, message: "private fixture cause") }
      return ["device": ["id": "http-resource"], "product": ["id": "product", "category": "Fixture"], "deviceNickname": "Fixture"]
    }
  }
  @MainActor private final class Storage: SessionStorage { func read() async throws -> Data? { nil }; func write(_ value: Data?) async throws { } }
  @MainActor private final class Driver: MQTTSDKDriver {
    var onEvent: ((MQTTDriverEvent) -> Void)?
    var publications: [(UUID, UInt16)] = []
    var closes = 0
    func start(_ parameters: MQTTConnectionParameters, configuration: MQTTDriverConfiguration) { onEvent?(.connack(accepted: true)) }
    func subscribe(_ topics: [String]) { onEvent?(.suback(granted: Dictionary(uniqueKeysWithValues: topics.map { ($0, 1) }), failed: [])) }
    func unsubscribe(_ topics: [String]) { onEvent?(.unsuback(topics: topics)) }
    func publish(operation: UUID, topic: String, payload: Data) {
      let mid = UInt16(publications.count + 1); publications.append((operation, mid)); onEvent?(.publication(operation: operation, packetID: mid))
      // PUBACK deliberately withheld; SharedAdapter cancellation resumes resultUnknown.
    }
    func close() { closes += 1 }
    func response(_ body: [String: Any], suffix: String = "get/accepted") throws {
      onEvent?(.message(topic: "$aws/things/cloud-thing/shadow/" + suffix, payload: try JSONSerialization.data(withJSONObject: body)))
    }
  }
  @MainActor private final class Fixture {
    let http: HTTP, account: AccountService
    var drivers: [Driver] = []
    let deadline = DeviceReadTestSignal()
    init(http: HTTP, account: AccountService) { self.http = http; self.account = account }
    lazy var services = NativeDeviceServices(account: account, expiryEncoding: .epochSeconds, hostPolicy: .verified(.hostnameAndDefaultPort), makePort: { [unowned self] in
      let driver = Driver(); drivers.append(driver); return SharedMQTTBrokerAdapter(driver: driver, hostPolicy: .verified(.hostnameAndDefaultPort))
    }, poolPause: { _ in }, snapshotWait: { [unowned self] in try await deadline.wait() })
    func observe() -> DeviceReadHandle { services.devices.observe(resourceID: "http-resource", nativeObserverID: "native") }
  }
  private func fixture() async throws -> Fixture {
    let http = HTTP(), account = AccountService(http: http, storage: Storage()); try await account.login(account: "public@example.test", pin: "fixture")
    return Fixture(http: http, account: account)
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<2000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Offline composition progress missing"); throw DeviceReadFailure.connection
  }
  private func phase(_ handle: DeviceReadHandle) -> DeviceReadPhase? { if case let .current(value) = handle.state { return value.phase }; return nil }
  private func live(_ f: Fixture, _ handle: DeviceReadHandle) async throws {
    try await wait { f.drivers.first?.publications.count == 1 }
    try f.drivers[0].response(["version": 1, "state": ["reported": ["value": 42]]]); try await wait { phase(handle) == .live }
    XCTAssertEqual(f.http.mqttRequests, 2)
  }
  func testFreshDEVICE01ForbiddenAndUnboundClearLiveCacheWithoutRetry() async throws {
    for code in [403, 1332] {
      let f = try await fixture(), handle = f.observe(); try await live(f, handle)
      f.http.credentialFailure = RowanFailure(code: code, message: "private-token https://private.invalid")
      f.drivers[0].onEvent?(.disconnected); try await wait { phase(handle) == .forbidden }
      let value = try handle.getSnapshot(); XCTAssertEqual(value.reported, .fields([:])); XCTAssertNil(value.metadata); XCTAssertFalse(value.stale)
      try await Task.sleep(nanoseconds: 5_000_000); XCTAssertEqual(f.http.mqttRequests, 3); XCTAssertEqual(f.drivers.count, 1); f.services.close()
    }
  }
  func testPersistentDEVICE01UnauthorizedClosesOldAccountAndCannotReadCachedData() async throws {
    let f = try await fixture(), handle = f.observe(); defer { f.services.close() }; try await live(f, handle)
    f.http.credentialFailure = RowanFailure(code: 401, message: "private-token")
    f.drivers[0].onEvent?(.disconnected); try await wait { handle.released }
    XCTAssertEqual(handle.state, .closed(.accountChanged)); XCTAssertNil(f.account.session); XCTAssertThrowsError(try handle.getSnapshot())
    XCTAssertEqual(f.http.mqttRequests, 4); XCTAssertEqual(f.http.refreshes, 1); XCTAssertEqual(f.drivers.count, 1)
  }
  func testFreshConfigurationAndExpiredCredentialsNeverReceiveTransportBackoff() async throws {
    for expired in [false, true] {
      let f = try await fixture(), handle = f.observe(); try await live(f, handle)
      f.http.expiredCredentials = expired; f.http.malformedCredentials = !expired
      f.drivers[0].onEvent?(.disconnected); try await wait { phase(handle) == .unavailable }
      try await Task.sleep(nanoseconds: 5_000_000); XCTAssertEqual(f.http.mqttRequests, 3); XCTAssertEqual(f.drivers.count, 1)
      XCTAssertFalse(try handle.getSnapshot().snapshotAvailable); XCTAssertNil(try handle.getSnapshot().online); f.services.close()
    }
  }
  func testHomeForbiddenAndDEVICE02UnboundNeverReachMQTT() async throws {
    for home in [true, false] {
      let f = try await fixture(); f.http.homeFailure = home ? 403 : nil; f.http.detailFailure = home ? nil : 1342
      let handle = f.observe(); try await wait { phase(handle) == .forbidden }
      XCTAssertEqual(f.http.mqttRequests, 0); XCTAssertTrue(f.drivers.isEmpty); XCTAssertNil(try handle.getSnapshot().metadata); f.services.close()
    }
  }
  func testCancelledOldGetUnknownCannotCancelSameEpochRecoveryGetOrDeadline() async throws {
    for code in [404, 409] {
      let f = try await fixture(), handle = f.observe(); try await wait { f.drivers.first?.publications.count == 1 && f.deadline.waiting == 1 }
      let driver = f.drivers[0]; try driver.response(["code": code], suffix: "get/rejected")
      try await wait { driver.publications.count == 2 && f.deadline.waiting == 1 }
      // First publish wait was cancelled and resumed unknown by the real SharedAdapter.
      try await Task.sleep(nanoseconds: 5_000_000); XCTAssertEqual(phase(handle), .reading); XCTAssertEqual(f.deadline.waiting, 1)
      try driver.response(["version": 2, "state": ["reported": ["value": 7]]]); try await wait { phase(handle) == .live }
      XCTAssertEqual(try handle.getSnapshot().reported, .fields(["value": .number(7)])); XCTAssertEqual(driver.publications.count, 2); f.services.close()
    }
  }
}

import XCTest
@testable import Rowan

/// Offline public fixtures; no real HOME/DEVICE request, broker or environment access.
@MainActor
final class HTTPDeviceAccessTests: XCTestCase {
  private var home: Any { [["room": ["name": "Room"], "devices": [["deviceNickname": "Cabinet", "device": ["id": "http-resource"]]]]] }
  private var detail: [String: Any] { ["deviceNickname": "Cabinet", "bindingRole": "sa", "device": ["id": "http-resource"], "product": ["id": "public-product", "category": "WineCooler"]] }
  private var mqtt: [String: Any] {
    ["host": "wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt", "endpoint": "example-ats.iot.ap-southeast-2.amazonaws.com",
     "path": "/mqtt", "clientID": "server-client", "deviceID": "aws-thing", "username": "AKIDEXAMPLE",
     "password": "public-fixture-secret", "sessionToken": "public-fixture-token"]
  }
  private func fixture() async throws -> (AccountService, DeviceAccessGateway) {
    let http = DeviceAccessGateway(), account = AccountService(http: http, storage: DeviceAccessStorage())
    try await account.login(account: "public@example.test", pin: "fixture")
    http.handler = { [self] path in path == "/api/app/devices" ? home : detail }
    http.paths = []
    return (account, http)
  }
  private func now() throws -> Date { try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-22T01:02:03Z")) }

  func testAuthorizationRequiresAuthenticatedHomeAndMatchingDetail() async throws {
    let (account, http) = try await fixture()
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    XCTAssertEqual(device.accountRevision, account.revision); XCTAssertEqual(device.userID, "public-user")
    XCTAssertEqual(device.resourceID, "http-resource"); XCTAssertEqual(device.productID, "public-product")
    XCTAssertEqual(device.category, "WineCooler"); XCTAssertEqual(device.title, "Cabinet"); XCTAssertEqual(device.bindingRole, "sa")
    XCTAssertEqual(http.paths, ["/api/app/devices", "/api/app/devices/http-resource"])
  }

  func testUnownedResourceCannotFetchDetailOrCredentials() async throws {
    let (account, http) = try await fixture()
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    do { _ = try await service.authorize(resourceID: "other-resource", expectedRevision: account.revision); XCTFail("Unowned device accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 403) }
    XCTAssertEqual(http.paths, ["/api/app/devices"])
  }

  func testMismatchedDetailCannotCreateAuthorization() async throws {
    let (account, http) = try await fixture()
    var changed = detail; changed["device"] = ["id": "other-resource"]
    http.handler = { [self] path in path == "/api/app/devices" ? home : changed }
    do { _ = try await HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort)).authorize(resourceID: "http-resource", expectedRevision: account.revision); XCTFail("Wrong identity accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    XCTAssertFalse(http.paths.contains(where: { $0.hasSuffix("/mqtt") }))
  }

  func testDistinctResourceThingClientAndSTSConnectIsolationWithExplicitSeconds() async throws {
    let (account, http) = try await fixture()
    let clock = try now()
    var response = mqtt; response["expiresAt"] = clock.addingTimeInterval(3600).timeIntervalSince1970
    http.handler = { [self] path in path == "/api/app/devices" ? home : (path.hasSuffix("/mqtt") ? response : detail) }
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .epochSeconds, hostPolicy: .verified(.hostnameAndDefaultPort), now: { clock })
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let connection = try await service.connection(device)
    XCTAssertEqual(connection.resourceID, "http-resource"); XCTAssertEqual(connection.thingRef, "aws-thing")
    XCTAssertEqual(connection.clientID, "server-client")
    XCTAssertEqual(connection.httpHostHeader, "example-ats.iot.ap-southeast-2.amazonaws.com:443")
    XCTAssertEqual(connection.withURL { $0.port }, 443)
    guard case .none = connection.authentication else { XCTFail("STS entered CONNECT"); return }
    guard case let .known(deadline, encoding) = connection.credentialExpiry else { XCTFail("Missing known expiry"); return }
    XCTAssertEqual(deadline, clock.addingTimeInterval(3600)); XCTAssertEqual(encoding, .epochSeconds)
    XCTAssertFalse(String(reflecting: connection).contains("public-fixture-token"))
    XCTAssertEqual(http.paths.last, "/api/app/devices/http-resource/mqtt")
  }

  func testOldAuthorizationCannotIssueCredentialsForNewAccount() async throws {
    let (account, http) = try await fixture()
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    try await account.login(account: "new@example.test", pin: "fixture")
    let count = http.paths.count
    do { _ = try await service.connection(device); XCTFail("Stale authorization accepted") }
    catch { XCTAssertEqual(error as? DeviceConnectionFailure, .staleContext) }
    XCTAssertEqual(http.paths.count, count)
  }

  func testLateDetailCannotCrossAccountRevision() async throws {
    let (account, http) = try await fixture()
    var pending: CheckedContinuation<Any, Error>?
    http.handler = { [self] path in
      if path == "/api/app/devices" { return home }
      return try await withCheckedThrowingContinuation { pending = $0 }
    }
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort)), revision = account.revision
    let task = Task { try await service.authorize(resourceID: "http-resource", expectedRevision: revision) }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("Detail did not start"); return }
    try await account.login(account: "new@example.test", pin: "fixture")
    pending.resume(returning: detail)
    do { _ = try await task.value; XCTFail("Late detail accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertFalse(http.paths.contains(where: { $0.hasSuffix("/mqtt") }))
  }

  func testCancelledLateCredentialResponseNeverPreparesConnection() async throws {
    let (account, http) = try await fixture()
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    var pending: CheckedContinuation<Any, Error>?
    http.handler = { _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await service.connection(device) }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("Credentials did not start"); return }
    task.cancel(); pending.resume(returning: mqtt)
    do { _ = try await task.value; XCTFail("Cancelled credentials accepted") }
    catch is CancellationError { }
    catch { XCTFail("Expected cancellation") }
  }

  func testUnknownExpiryRemainsUnknownAndPlainAuthenticationIsNotSigned() async throws {
    let (account, http) = try await fixture()
    var response = mqtt; response.removeValue(forKey: "sessionToken"); response["expiresAt"] = 1_700_000_000.0
    response["host"] = "wss://mqtt.example.test/mqtt"; response["endpoint"] = "mqtt.example.test"
    http.handler = { [self] path in path == "/api/app/devices" ? home : (path.hasSuffix("/mqtt") ? response : detail) }
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let prepared = try await service.connection(device)
    XCTAssertEqual(prepared.credentialExpiry, .unknown); XCTAssertNil(prepared.signedRequestExpiresAt)
    XCTAssertNil(prepared.withURL { $0.query })
    guard case .usernamePassword = prepared.authentication else { XCTFail("Plain CONNECT auth missing"); return }
  }

  func testLateCredentialsCannotCrossAccountRevision() async throws {
    let (account, http) = try await fixture()
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    var pending: CheckedContinuation<Any, Error>?
    http.handler = { _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await service.connection(device) }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("Credentials did not start"); return }
    try await account.login(account: "new@example.test", pin: "fixture")
    pending.resume(returning: mqtt)
    do { _ = try await task.value; XCTFail("Late credentials accepted") }
    catch { XCTAssertEqual(error as? DeviceConnectionFailure, .staleContext) }
  }

  func testUnknownNativeHostPolicyRefusesBeforeCredentialFetch() async throws {
    let (account, http) = try await fixture()
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown)
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let count = http.paths.count
    do { _ = try await service.connection(device); XCTFail("Unverified wire Host accepted") }
    catch { XCTAssertEqual(error as? DeviceConnectionFailure, .configuration) }
    XCTAssertEqual(http.paths.count, count)
  }

  func testExplicitHostnameOnlyPolicyIsNotInferredFromURLPort() async throws {
    let (account, http) = try await fixture()
    let clock = try now()
    http.handler = { [self] path in path == "/api/app/devices" ? home : (path.hasSuffix("/mqtt") ? mqtt : detail) }
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameOnly), now: { clock })
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let parameters = try await service.connection(device)
    XCTAssertEqual(parameters.httpHostHeader, "example-ats.iot.ap-southeast-2.amazonaws.com")
    XCTAssertNil(parameters.withURL { $0.port })
  }

  func testCanonicallyEquivalentOpaqueIDsDoNotCreateMembershipProof() async throws {
    let (account, http) = try await fixture()
    let listed = "\u{00E9}", requested = "e\u{0301}"
    http.handler = { path in
      if path == "/api/app/devices" { return [["devices": [["device": ["id": listed]]]]] }
      return ["device": ["id": listed], "product": ["id": "fixture-product", "category": "Fixture"]]
    }
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown)
    do { _ = try await service.authorize(resourceID: requested, expectedRevision: account.revision); XCTFail("Distinct wire ID authorized") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 403) }
    XCTAssertEqual(http.paths, ["/api/app/devices"])
  }

  func testAuthenticatedResponseStillCannotSendSTSKeysToNonAWSHost() async throws {
    let (account, http) = try await fixture()
    var response = mqtt
    response["host"] = "wss://example-ats.iot.ap-southeast-2.amazonaws.com.attacker.test/mqtt"
    response["endpoint"] = "example-ats.iot.ap-southeast-2.amazonaws.com.attacker.test"
    http.handler = { [self] path in path == "/api/app/devices" ? home : (path.hasSuffix("/mqtt") ? response : detail) }
    let service = HTTPDeviceAccess(account: account, expiryEncoding: .unknown, hostPolicy: .verified(.hostnameAndDefaultPort))
    let device = try await service.authorize(resourceID: "http-resource", expectedRevision: account.revision)
    do { _ = try await service.connection(device); XCTFail("Unsupported STS host accepted") }
    catch {
      XCTAssertEqual(error as? DeviceConnectionFailure, .configuration)
      XCTAssertFalse(error.localizedDescription.contains("attacker.test"))
      XCTAssertFalse(error.localizedDescription.contains("public-fixture-secret"))
    }
  }
}

@MainActor
private final class DeviceAccessGateway: HTTPGateway {
  var paths: [String] = []
  var handler: (String) async throws -> Any = { _ in [] }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    if method == "POST" { return ["accessToken": "public-access", "refreshToken": "public-refresh", "userID": "public-user"] }
    paths.append(path)
    return try await handler(path)
  }
}
@MainActor
private final class DeviceAccessStorage: SessionStorage {
  private var value: Data?
  func read() async throws -> Data? { value }
  func write(_ value: Data?) async throws { self.value = value }
}

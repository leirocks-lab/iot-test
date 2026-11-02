import XCTest
@testable import Rowan

/// Public fixtures. AccountService unwraps data; no real check/start/cancel or credentials.
@MainActor
final class HTTPOtaRepositoryTests: XCTestCase {
  private struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  @MainActor private final class Gateway: HTTPGateway {
    var calls: [Call] = [], logins = 0
    var handler: (Call) async throws -> Any = { _ in NSNull() }
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if method == "POST", path == "/api/app/session" {
        logins += 1; return ["accessToken": "fixture-access-\(logins)", "refreshToken": "fixture-refresh-\(logins)", "userID": "native-\(logins)"]
      }
      let call = Call(method: method, path: path, body: body, token: token); calls.append(call); return try await handler(call)
    }
  }
  @MainActor private final class Storage: SessionStorage { func read() async throws -> Data? { nil }; func write(_ data: Data?) async throws {} }
  private func fixture(resource: String = "http-resource") async throws -> (AccountService, Gateway, HTTPOtaRepository) {
    let gateway = Gateway(), account = AccountService(http: gateway, storage: Storage())
    try await account.login(account: "public@example.test", pin: "fixture")
    return (account, gateway, HTTPOtaRepository(account: account, scope: OtaScope(accountRevision: account.revision, resourceID: resource, userID: "native-1")))
  }
  private func candidate(id: String = "http-resource") -> [String: Any] {
    ["firmware": ["id": "fw-selected", "version": "1.2.3", "remark": "Public note"], "device": ["id": id, "name": "Fixture device", "mac": "fixture-mac"]]
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<500 { if condition() { return }; await Task.yield() }
    XCTFail("Fixture did not enter request"); throw URLError(.timedOut)
  }
  func testBothFirmwareChecksUseExactAuthenticatedGETWithoutHasUpdate() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { [self] _ in candidate() }
    for kind in OtaKind.allCases {
      let offer = try await repo.check(kind)
      XCTAssertEqual(offer.kind, kind); XCTAssertEqual(offer.firmware.id, "fw-selected"); XCTAssertEqual(offer.firmware.version, "1.2.3")
      XCTAssertEqual(offer.firmware.remark, "Public note"); XCTAssertEqual(offer.device.mac, "fixture-mac")
    }
    XCTAssertEqual(gateway.calls.map(\.path), ["/api/app/devices/http-resource/ota/mcu", "/api/app/devices/http-resource/ota/wifi"])
    XCTAssertTrue(gateway.calls.allSatisfy { $0.method == "GET" && $0.body == nil && $0.token == "fixture-access-1" })
  }
  func testMalformedOrDifferentDeviceCannotBecomeAValidCandidate() async throws {
    var noFirmware = candidate(); noFirmware.removeValue(forKey: "firmware")
    var noID = candidate(); noID["firmware"] = ["id": "", "version": "1.2.3"]
    var badVersion = candidate(); badVersion["firmware"] = ["id": "firmware", "version": 123]
    var noMAC = candidate(); noMAC["device"] = ["id": "http-resource", "name": "Fixture"]
    for value in [noFirmware, noID, badVersion, candidate(id: "other-resource"), noMAC] {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in value }
      do { _ = try await repo.check(.mcu); XCTFail("Malformed offer accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
      XCTAssertEqual(gateway.calls.map(\.method), ["GET"])
    }
  }
  func testStartUsesPUTTypeQueryAndOnlyFirmwareIDBody() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in ["taskID": "opaque-task"] }
    let first = try await repo.start(.mcu, firmwareID: "fw/selected"), second = try await repo.start(.wifi, firmwareID: "fw-wifi")
    XCTAssertEqual(first, "opaque-task"); XCTAssertEqual(second, "opaque-task")
    XCTAssertEqual(gateway.calls.map(\.path), ["/api/app/devices/http-resource/ota/task?type=mcu", "/api/app/devices/http-resource/ota/task?type=wifi"])
    XCTAssertTrue(gateway.calls.allSatisfy { $0.method == "PUT" && Set($0.body?.keys.map { $0 } ?? []) == ["firmwareID"] })
    XCTAssertEqual(gateway.calls[0].body?["firmwareID"] as? String, "fw/selected")
  }
  func testOpaqueIDsAreEncodedAndOnlyFourDeclaredResultsDecode() async throws {
    let (_, gateway, repo) = try await fixture(resource: "device/a ?#ü")
    for result in OtaResult.allCases {
      gateway.handler = { _ in ["result": result.rawValue] }
      let returned = try await repo.query(taskID: "task/a ?#ü"); XCTAssertEqual(returned, result)
    }
    XCTAssertTrue(gateway.calls.allSatisfy { $0.method == "GET" && $0.path == "/api/app/devices/device%2Fa%20%3F%23%C3%BC/ota/task/task%2Fa%20%3F%23%C3%BC" })
  }
  func testCancelUsesDELETEBodyAndAcceptsNoData() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in NSNull() }
    try await repo.cancel(taskID: "opaque-task")
    let call = try XCTUnwrap(gateway.calls.first)
    XCTAssertEqual(call.method, "DELETE"); XCTAssertEqual(call.path, "/api/app/devices/http-resource/ota/task")
    XCTAssertEqual(Set(call.body?.keys.map { $0 } ?? []), ["taskID"]); XCTAssertEqual(call.body?["taskID"] as? String, "opaque-task")
  }
  func testUnknownResultOrMissingTaskIDIsNotConfirmed() async throws {
    for value in ["download-50-percent", "UPDATING", 50, NSNull()] as [Any] {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in ["result": value] }
      do { _ = try await repo.query(taskID: "task"); XCTFail("Unknown status accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
    for value in ["", 7, NSNull()] as [Any] {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in ["taskID": value] }
      do { _ = try await repo.start(.mcu, firmwareID: "firmware"); XCTFail("Missing task accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
      XCTAssertEqual(gateway.calls.count, 1)
    }
  }
  func testLateOldReadCannotEscapeOrMutateWithNewAccount() async throws {
    let (account, gateway, repo) = try await fixture(); var pending: CheckedContinuation<Any, Error>?
    gateway.handler = { _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let old = Task { try await repo.check(.mcu) }; try await wait { pending != nil }
    try await account.login(account: "other@example.test", pin: "fixture"); pending?.resume(returning: candidate())
    do { _ = try await old.value; XCTFail("Late data accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    do { _ = try await repo.start(.mcu, firmwareID: "firmware"); XCTFail("Stale write accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    do { try await repo.cancel(taskID: "task"); XCTFail("Stale cancel accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(gateway.calls.map(\.method), ["GET"]); XCTAssertEqual(account.session?.userID, "native-2")
  }
  func testUncertainStartAndCancelAreNeverReplayedByHTTPAdapter() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in throw URLError(.timedOut) }
    do { _ = try await repo.start(.mcu, firmwareID: "firmware"); XCTFail("Timeout accepted") } catch { }
    do { try await repo.cancel(taskID: "task"); XCTFail("Timeout accepted") } catch { }
    XCTAssertEqual(gateway.calls.map(\.method), ["PUT", "DELETE"])
  }
  func testInvalidSegmentsAndOperationIDsNeverDispatchHTTP() async throws {
    let (account, gateway, repo) = try await fixture()
    for id in ["", ".", "..", "bad\0id"] {
      let bad = HTTPOtaRepository(account: account, scope: OtaScope(accountRevision: account.revision, resourceID: id, userID: "native-1"))
      do { _ = try await bad.check(.mcu); XCTFail("Bad resource accepted") } catch { }
      do { _ = try await repo.query(taskID: id); XCTFail("Bad task accepted") } catch { }
    }
    do { _ = try await repo.start(.mcu, firmwareID: ""); XCTFail("Bad firmware accepted") } catch { }
    do { try await repo.cancel(taskID: ""); XCTFail("Bad task accepted") } catch { }
    XCTAssertTrue(gateway.calls.isEmpty)
  }
}

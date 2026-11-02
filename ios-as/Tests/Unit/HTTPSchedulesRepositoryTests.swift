import XCTest
@testable import Rowan

@MainActor
final class HTTPSchedulesRepositoryTests: XCTestCase {
  private struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  @MainActor private final class Gateway: HTTPGateway {
    var calls: [Call] = [], logins = 0
    var handler: (Call) async throws -> Any = { _ in [] }
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if method == "POST", path == "/api/app/session" {
        logins += 1; return ["accessToken": "access-\(logins)", "refreshToken": "refresh-\(logins)", "userID": "user-\(logins)"]
      }
      let call = Call(method: method, path: path, body: body, token: token); calls.append(call); return try await handler(call)
    }
  }
  @MainActor private final class Storage: SessionStorage { func read() async throws -> Data? { nil }; func write(_ data: Data?) async throws {} }
  private func fixture(modelVersion: String? = "fixture-model") async throws -> (AccountService, Gateway, HTTPSchedulesRepository) {
    let gateway = Gateway(), storage = Storage(); let account = AccountService(http: gateway, storage: storage)
    try await account.login(account: "fixture@example.test", pin: "fixture")
    let scope = ScheduleScope(accountRevision: account.revision, resourceID: "fixture/device +一", productID: "fixture-product", modelVersion: modelVersion)
    return (account, gateway, HTTPSchedulesRepository(account: account, scope: scope))
  }
  private let base = "/api/app/devices/fixture%2Fdevice%20%2B%E4%B8%80/schedules"
  private func draft(_ scope: ScheduleScope) throws -> ScheduleDraft {
    ScheduleDraft(type: .once, startTime: "12:34", repeatType: .once, timeZone: "Etc/UTC", permit: try ActionPermit(scope: scope, actionJSON: #"{"fixtureRelay":"on"}"#, mode: nil))
  }
  private func row(_ scope: ScheduleScope) throws -> ScheduleRecord {
    var body = try draft(scope).createBody(scope: scope); body["id"] = "rule/one"; body["enabled"] = false
    return try ScheduleRecord.decode(scope: scope, rawJSON: String(decoding: JSONSerialization.data(withJSONObject: body), as: UTF8.self))
  }
  func testGetUsesAuthenticatedExactEndpointAndEncodedDeviceSegment() async throws {
    let (account, gateway, repo) = try await fixture(); gateway.handler = { _ in [["id": "rule", "future": ["x": 1]] as [String: Any]] }
    let rows = try await repo.load(); XCTAssertEqual(gateway.calls.first?.path, base); XCTAssertEqual(gateway.calls.first?.method, "GET")
    XCTAssertNil(gateway.calls.first?.body); XCTAssertEqual(gateway.calls.first?.token, account.session?.accessToken); XCTAssertTrue(rows[0].rawJSON.contains("future"))
  }
  func testCreatePostsDefinedBodyAndUsesActualServerAssignedID() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { call in var body = call.body ?? [:]; body["id"] = "server-created"; body["enabled"] = true; return body }
    let result = try await repo.create(draft(repo.scope)); XCTAssertEqual(result.id, "server-created"); XCTAssertEqual(gateway.calls.map(\.method), ["POST"])
    XCTAssertEqual(gateway.calls.first?.path, base); XCTAssertNil(gateway.calls.first?.body?["id"]); XCTAssertNil(gateway.calls.first?.body?["nextExecutionAt"])
  }
  func testUpdateEncodesIDAndPreservesFalseWithoutServerOwnedFields() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { call in var body = call.body ?? [:]; body["id"] = "rule/one"; return body }
    _ = try await repo.update(row(repo.scope), draft: draft(repo.scope))
    let call = try XCTUnwrap(gateway.calls.first); XCTAssertEqual(call.method, "PATCH"); XCTAssertEqual(call.path, base + "/rule%2Fone")
    XCTAssertEqual(call.body?["enabled"] as? Bool, false); XCTAssertNil(call.body?["id"]); XCTAssertNil(call.body?["nextExecutionAt"])
  }
  func testEnableUsesPutWithOnlyBooleanAndChecksReturnedValue() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in ["enabled": false] }
    let value = try await repo.setEnabled(id: "rule/one", enabled: false); XCTAssertFalse(value)
    let call = try XCTUnwrap(gateway.calls.first); XCTAssertEqual(call.method, "PUT"); XCTAssertEqual(call.path, base + "/rule%2Fone/enabled")
    XCTAssertEqual(Set(try XCTUnwrap(call.body).keys), ["enabled"])
  }
  func testDeleteHasNoBodyAndNeedsNoData() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in NSNull() }
    try await repo.delete(id: "rule/one"); XCTAssertEqual(gateway.calls.first?.method, "DELETE")
    XCTAssertEqual(gateway.calls.first?.path, base + "/rule%2Fone"); XCTAssertNil(gateway.calls.first?.body)
  }
  func testWrongMutationIdentityOrEnabledValueIsUnknown() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in ["id": "other-rule"] }
    do { _ = try await repo.update(row(repo.scope), draft: draft(repo.scope)); XCTFail("Expected unknown") } catch { XCTAssertTrue(error is ScheduleMutationUnknown) }
    gateway.handler = { _ in ["enabled": true] }
    do { _ = try await repo.setEnabled(id: "rule", enabled: false); XCTFail("Expected unknown") } catch { XCTAssertTrue(error is ScheduleMutationUnknown) }
    XCTAssertEqual(gateway.calls.map(\.method), ["PATCH", "PUT"])
  }
  func testMissingCreateIDIsUnknownWithoutSimilarListLookup() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in ["enabled": true] }
    do { _ = try await repo.create(draft(repo.scope)); XCTFail("Expected unknown") } catch { XCTAssertTrue(error is ScheduleMutationUnknown) }
    XCTAssertEqual(gateway.calls.map(\.method), ["POST"])
  }
  func testEveryMutationTransportTimeoutIsUnknownAndSentOnlyOnce() async throws {
    for operation in 0..<4 {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in throw URLError(.timedOut) }
      do {
        switch operation { case 0: _ = try await repo.create(draft(repo.scope)); case 1: _ = try await repo.update(row(repo.scope), draft: draft(repo.scope))
        case 2: _ = try await repo.setEnabled(id: "rule", enabled: true); default: try await repo.delete(id: "rule") }
        XCTFail("Expected unknown")
      } catch { XCTAssertTrue(error is ScheduleMutationUnknown) }
      XCTAssertEqual(gateway.calls.count, 1)
    }
  }
  func testExplicitBusinessFailuresKeepCodeWithoutRetry() async throws {
    for code in [1701, 1702, 1703, 1704, 403] {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in throw RowanFailure(code: code, message: "fixture") }
      do { _ = try await repo.create(draft(repo.scope)); XCTFail("Expected rejection") } catch { XCTAssertEqual((error as? RowanFailure)?.code, code) }
      XCTAssertEqual(gateway.calls.map(\.method), ["POST"])
    }
  }
  func testOldScopeCannotReadOrMutateUsingNewAccountToken() async throws {
    let (account, gateway, repo) = try await fixture(); try await account.login(account: "next@example.test", pin: "fixture")
    for operation in 0..<5 {
      do {
        switch operation { case 0: _ = try await repo.load(); case 1: _ = try await repo.create(draft(repo.scope))
        case 2: _ = try await repo.update(row(repo.scope), draft: draft(repo.scope)); case 3: _ = try await repo.setEnabled(id: "rule", enabled: true)
        default: try await repo.delete(id: "rule") }; XCTFail("Expected stale")
      } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    }
    XCTAssertTrue(gateway.calls.isEmpty)
  }
  func testCancelledLateTransportCannotReturnSchedules() async throws {
    let (_, gateway, repo) = try await fixture(); var release: CheckedContinuation<Any, Error>?
    gateway.handler = { _ in try await withCheckedThrowingContinuation { release = $0 } }
    let work = Task { try await repo.load() }; for _ in 0..<500 where release == nil { await Task.yield() }
    guard let release else { work.cancel(); XCTFail("Read did not start"); return }
    work.cancel(); release.resume(returning: [])
    do { _ = try await work.value; XCTFail("Expected cancellation") } catch { XCTAssertTrue(error is CancellationError) }
  }
  func testInvalidListAndDuplicateIDsAreNotEmptyOrLastWinsSuccess() async throws {
    let invalid: [Any] = [[:] as [String: Any], [[:] as [String: Any]], [["id": "same"], ["id": "same"]]]
    for data in invalid {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in data }
      do { _ = try await repo.load(); XCTFail("Expected malformed list") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
  }
  func testAuthorizedUnknownModelListUsesOnlyDefinedGetAndKeepsAccountGuard() async throws {
    let (account, gateway, repo) = try await fixture(modelVersion: nil)
    gateway.handler = { _ in [["id": "existing", "enabled": true, "action": ["unregistered": false]] as [String: Any]] }
    let records = try await repo.load(), record = try XCTUnwrap(records.first)
    XCTAssertNil(record.scope.modelVersion); XCTAssertEqual(record.id, "existing"); XCTAssertNotNil(record.actionJSON)
    XCTAssertEqual(gateway.calls.map(\.method), ["GET"]); XCTAssertEqual(gateway.calls.first?.path, base)
    XCTAssertNil(gateway.calls.first?.body); XCTAssertEqual(gateway.calls.first?.token, account.session?.accessToken)
    gateway.calls = []; try await account.login(account: "next@example.test", pin: "fixture")
    do { _ = try await repo.load(); XCTFail("Expected stale") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertTrue(gateway.calls.isEmpty)
  }
  func testCompleteDotResourceAndScheduleSegmentsNeverDispatchHTTP() async throws {
    let (account, gateway, repo) = try await fixture()
    for id in [".", ".."] {
      let badScope = ScheduleScope(accountRevision: account.revision, resourceID: id, productID: "fixture-product", modelVersion: nil)
      let bad = HTTPSchedulesRepository(account: account, scope: badScope)
      do { _ = try await bad.load(); XCTFail("Dot resource dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
      do { _ = try await repo.setEnabled(id: id, enabled: false); XCTFail("Dot schedule dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
      do { try await repo.delete(id: id); XCTFail("Dot schedule dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
    }
    XCTAssertTrue(gateway.calls.isEmpty)
  }
  func testEmbeddedDotsAndLiteralPercentRemainOpaqueEncodedSegments() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { _ in NSNull() }
    try await repo.delete(id: "foo..bar"); try await repo.delete(id: "%2E")
    XCTAssertEqual(gateway.calls.map(\.path), [base + "/foo..bar", base + "/%252E"])
  }

}

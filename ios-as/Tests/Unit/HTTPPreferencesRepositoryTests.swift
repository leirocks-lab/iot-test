import XCTest
@testable import Rowan

@MainActor
final class HTTPPreferencesRepositoryTests: XCTestCase {
  private struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  @MainActor private final class Gateway: HTTPGateway {
    var calls: [Call] = []
    var logins = 0
    var handler: () async throws -> Any = { [:] as [String: Any] }
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if method == "POST", path == "/api/app/session" {
        logins += 1; return ["accessToken": "fixture-access-\(logins)", "refreshToken": "fixture-refresh-\(logins)", "userID": "fixture-user-\(logins)"]
      }
      calls.append(Call(method: method, path: path, body: body, token: token)); return try await handler()
    }
  }
  @MainActor private final class Storage: SessionStorage {
    func read() async throws -> Data? { nil }
    func write(_ data: Data?) async throws { }
  }
  private func fixture() async throws -> (AccountService, Gateway, HTTPPreferencesRepository) {
    let gateway = Gateway()
    let service = AccountService(http: gateway, storage: Storage())
    try await service.login(account: "fixture@example.test", pin: "fixture")
    return (service, gateway, HTTPPreferencesRepository(account: service))
  }
  func testGetUsesExactAuthenticatedEndpointAndPreservesUnknownFields() async throws {
    let (account, gateway, repo) = try await fixture()
    gateway.handler = { ["language": "en", "future": ["value": 7]] }
    let value = try await repo.load()
    XCTAssertEqual(repo.expectedRevision, account.revision); XCTAssertEqual(gateway.calls.first?.method, "GET")
    XCTAssertEqual(gateway.calls.first?.path, "/api/app/user/setting"); XCTAssertNil(gateway.calls.first?.body)
    XCTAssertEqual(gateway.calls.first?.token, account.session?.accessToken); XCTAssertTrue(value.rawJSON.contains("future"))
  }
  func testPatchContainsOnlyTypedChangesAndNeedsNoDataResponse() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { NSNull() }
    try await repo.patch(PreferencesPatch(notification: false, wallpaperID: "fixture-wallpaper"))
    let call = try XCTUnwrap(gateway.calls.first)
    XCTAssertEqual(call.method, "PATCH"); XCTAssertEqual(call.path, "/api/app/user/setting")
    XCTAssertEqual(Set(try XCTUnwrap(call.body).keys), ["notification", "wallpaper"])
    XCTAssertEqual(call.body?["wallpaper"] as? String, "fixture-wallpaper")
  }
  func testMalformedGetDataDoesNotBecomeDefaults() async throws {
    let invalid: [Any] = [NSNull(), [], "not-object"]
    for raw in invalid {
      let (_, gateway, repo) = try await fixture(); gateway.handler = { raw }
      do { _ = try await repo.load(); XCTFail("Expected invalid response") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
  }
  func testCapturedRevisionRejectsNewAccountWithoutDispatch() async throws {
    let (account, gateway, repo) = try await fixture()
    try await account.login(account: "next@example.test", pin: "fixture")
    do { _ = try await repo.load(); XCTFail("Expected stale") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    do { try await repo.patch(PreferencesPatch(theme: .dark)); XCTFail("Expected stale") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertTrue(gateway.calls.isEmpty)
  }
  func testAccountChangeRejectsUncooperativeLateRead() async throws {
    let (account, gateway, repo) = try await fixture(); var finish: CheckedContinuation<Any, Error>?
    gateway.handler = { try await withCheckedThrowingContinuation { finish = $0 } }
    let read = Task { try await repo.load() }
    for _ in 0..<300 where finish == nil { await Task.yield() }
    guard let finish else { read.cancel(); XCTFail("Read did not start"); return }
    do { try await account.clearLocal() } catch { finish.resume(throwing: CancellationError()); _ = try? await read.value; throw error }
    finish.resume(returning: ["language": "en"])
    do { _ = try await read.value; XCTFail("Expected stale") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
  }
  func testCancellationCannotPublishUncooperativeLateRead() async throws {
    let (_, gateway, repo) = try await fixture(); var finish: CheckedContinuation<Any, Error>?
    gateway.handler = { try await withCheckedThrowingContinuation { finish = $0 } }
    let read = Task { try await repo.load() }
    for _ in 0..<300 where finish == nil { await Task.yield() }
    guard let finish else { read.cancel(); XCTFail("Read did not start"); return }
    read.cancel(); finish.resume(returning: ["notification": true])
    do { _ = try await read.value; XCTFail("Expected cancellation") } catch { XCTAssertTrue(error is CancellationError) }
  }
  func testUnknownMutationIsNotRetried() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { throw RowanFailure(code: 408, message: "fixture timeout") }
    do { try await repo.patch(PreferencesPatch(notification: false)); XCTFail("Expected timeout") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 408) }
    XCTAssertEqual(gateway.calls.map(\.method), ["PATCH"])
  }
  func testExplicitRejectionKeepsCodeWithoutReadOrReplay() async throws {
    let (_, gateway, repo) = try await fixture(); gateway.handler = { throw RowanFailure(code: 403, message: "fixture rejection") }
    do { try await repo.patch(PreferencesPatch(theme: .dark)); XCTFail("Expected rejection") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 403) }
    XCTAssertEqual(gateway.calls.map(\.method), ["PATCH"])
  }
}

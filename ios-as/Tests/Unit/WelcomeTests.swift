import XCTest
@testable import Rowan

/// Offline startup state tests. These do not access the real Keychain, backend or RN runtime.
@MainActor
final class WelcomeTests: XCTestCase {
  func testMissingSessionReachesEntryWithoutNetworkAndRestoresOnlyOnce() async {
    let http = WelcomeHTTPFixture(), storage = WelcomeMemoryFixture()
    let model = WelcomeModel(account: AccountService(http: http, storage: storage))
    model.restoreIfNeeded(); await settled(model)
    XCTAssertEqual(model.state, .ready)
    XCTAssertTrue(http.calls.isEmpty)
    model.restoreIfNeeded(); await settled(model)
    XCTAssertTrue(http.calls.isEmpty)
    XCTAssertEqual(storage.reads, 1)
  }

  func testStoredSessionMustRefreshBeforeAuthenticatedNavigation() async throws {
    let http = WelcomeHTTPFixture(), storage = WelcomeMemoryFixture()
    storage.data = try JSONSerialization.data(withJSONObject: WelcomeHTTPFixture.initialSession)
    let account = AccountService(http: http, storage: storage)
    let model = WelcomeModel(account: account)
    model.restoreIfNeeded(); await settled(model)
    XCTAssertEqual(model.state, .authenticated)
    XCTAssertEqual(http.calls, ["PATCH /api/app/session"])
    XCTAssertEqual(account.session?.accessToken, "renewed-access")
  }

  func testCancelledRestoreRejectsLateSuccessAndRetainsStoredCredentials() async throws {
    let http = WelcomeHTTPFixture(), storage = WelcomeMemoryFixture()
    let saved = try JSONSerialization.data(withJSONObject: WelcomeHTTPFixture.initialSession)
    storage.data = saved
    var pending: CheckedContinuation<Any, Never>?
    http.refresh = { await withCheckedContinuation { pending = $0 } }
    let account = AccountService(http: http, storage: storage)
    let model = WelcomeModel(account: account)
    model.restoreIfNeeded()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancelRestoration(); XCTFail("Restore did not start"); return }
    model.cancelRestoration()
    XCTAssertEqual(model.state, .ready)
    pending.resume(returning: ["accessToken": "late", "refreshToken": "late-refresh"])
    for _ in 0..<10 { await Task.yield() }
    XCTAssertNil(account.session)
    XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(model.state, .ready)
    model.restoreIfNeeded()
    XCTAssertEqual(http.calls.count, 1)
  }

  func testOldRestoreCancellationCannotInvalidateNewAccount() async throws {
    let http = WelcomeHTTPFixture(), storage = WelcomeMemoryFixture()
    storage.data = try JSONSerialization.data(withJSONObject: WelcomeHTTPFixture.initialSession)
    var pending: CheckedContinuation<Any, Never>?
    http.refresh = { await withCheckedContinuation { pending = $0 } }
    let account = AccountService(http: http, storage: storage)
    let model = WelcomeModel(account: account)
    model.restoreIfNeeded()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancelRestoration(); XCTFail("Restore did not start"); return }
    try await account.login(account: "new@example.com", pin: "new")
    let current = account.session, revision = account.revision
    model.cancelRestoration()
    pending.resume(returning: ["accessToken": "late", "refreshToken": "late-refresh"])
    for _ in 0..<10 { await Task.yield() }
    XCTAssertEqual(account.session, current)
    XCTAssertEqual(account.revision, revision)
    XCTAssertEqual(model.state, .ready)
  }

  func testRejectedRefreshReturnsToEntryAndDoesNotPretendToBeAuthenticated() async throws {
    let http = WelcomeHTTPFixture(), storage = WelcomeMemoryFixture()
    storage.data = try JSONSerialization.data(withJSONObject: WelcomeHTTPFixture.initialSession)
    http.refresh = { throw RowanFailure(code: 401, message: "expired") }
    let account = AccountService(http: http, storage: storage)
    let model = WelcomeModel(account: account)
    model.restoreIfNeeded(); await settled(model)
    XCTAssertEqual(model.state, .ready)
    XCTAssertNil(account.session)
    XCTAssertNil(storage.data)
  }

  func testCancelledLoginCannotAcceptLateSessionAfterReturningToEntry() async throws {
    let http = WelcomeHTTPFixture(), storage = WelcomeMemoryFixture()
    var pending: CheckedContinuation<Any, Never>?
    http.login = { await withCheckedContinuation { pending = $0 } }
    let account = AccountService(http: http, storage: storage)
    let task = Task { try await account.login(account: "test@example.com", pin: "fixture") }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("Login did not start"); return }
    task.cancel()
    pending.resume(returning: WelcomeHTTPFixture.initialSession)
    do { try await task.value; XCTFail("Cancelled login accepted") }
    catch is CancellationError { }
    catch { XCTFail("Unexpected error type") }
    XCTAssertNil(account.session)
    XCTAssertNil(storage.data)
  }

  private func settled(_ model: WelcomeModel) async {
    for _ in 0..<300 where model.state == .restoring { await Task.yield() }
    XCTAssertNotEqual(model.state, .restoring, "Fixture restore did not finish")
  }
}

@MainActor
private final class WelcomeHTTPFixture: HTTPGateway {
  static var initialSession: [String: Any] { ["accessToken": "stored-access", "refreshToken": "stored-refresh", "userID": "fixture-user"] }
  var calls: [String] = []
  var refresh: () async throws -> Any = { ["accessToken": "renewed-access", "refreshToken": "renewed-refresh"] }
  var login: () async throws -> Any = { ["accessToken": "new-access", "refreshToken": "new-refresh", "userID": "new-user"] }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    calls.append("\(method) \(path)")
    if method == "PATCH" { return try await refresh() }
    return try await login()
  }
}

@MainActor
private final class WelcomeMemoryFixture: SessionStorage {
  var data: Data?
  var reads = 0
  func read() async throws -> Data? { reads += 1; return data }
  func write(_ value: Data?) async throws { data = value }
}

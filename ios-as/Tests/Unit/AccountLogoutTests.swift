import XCTest
@testable import Rowan

/// Offline regressions; Windows does not compile or execute XCTest.
@MainActor
final class AccountLogoutTests: XCTestCase {
  private func fixture() async throws -> (AccountService, LogoutGateway, LogoutStorage) {
    let gateway = LogoutGateway(), storage = LogoutStorage()
    let account = AccountService(http: gateway, storage: storage)
    try await account.login(account: "old@example.test", pin: "fixture")
    gateway.calls = []
    return (account, gateway, storage)
  }

  func testConfirmedLogoutClearsMemoryAndStoredSessionOnce() async throws {
    let (account, gateway, storage) = try await fixture()
    let result = try await account.logout()
    XCTAssertEqual(result, .serverConfirmed)
    XCTAssertNil(account.session); XCTAssertNil(storage.data)
    XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testUnauthorizedLogoutClearsSameSessionWithoutRenewalOrReplay() async throws {
    let (account, gateway, storage) = try await fixture()
    gateway.failure = RowanFailure(code: 401, message: "expired")
    let result = try await account.logout()
    XCTAssertEqual(result, .alreadyUnauthenticated)
    XCTAssertNil(account.session); XCTAssertNil(storage.data)
    XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testForbiddenLogoutIsNotReportedAsSuccessAndKeepsSession() async throws {
    let (account, gateway, storage) = try await fixture()
    let before = account.session, saved = storage.data, revision = account.revision
    gateway.failure = RowanFailure(code: 403, message: "forbidden")
    do { _ = try await account.logout(); XCTFail("Forbidden logout succeeded") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 403) }
    XCTAssertEqual(account.session, before); XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testNetworkFailureKeepsSessionAndIsNeverAutomaticallyReplayed() async throws {
    let (account, gateway, storage) = try await fixture()
    let saved = storage.data
    gateway.failure = URLError(.timedOut)
    do { _ = try await account.logout(); XCTFail("Unknown result reported as success") }
    catch { XCTAssertEqual((error as? URLError)?.code, .timedOut) }
    XCTAssertNotNil(account.session); XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testLateSuccessCannotClearNewAccountOrItsPersistedSession() async throws { try await lateLogout(failure: nil) }
  func testLateUnauthorizedCannotClearNewAccountOrItsPersistedSession() async throws {
    try await lateLogout(failure: RowanFailure(code: 401, message: "old token"))
  }

  private func lateLogout(failure: Error?) async throws {
    let (account, gateway, storage) = try await fixture()
    var pending: CheckedContinuation<Any, Error>?
    gateway.delayedDelete = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await account.logout() }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("DELETE did not start"); return }
    try await account.login(account: "new@example.test", pin: "fixture")
    let current = account.session, saved = storage.data, revision = account.revision
    if let failure { pending.resume(throwing: failure) } else { pending.resume(returning: [:]) }
    do { _ = try await task.value; XCTFail("Stale logout accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(account.session, current); XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(account.revision, revision)
  }

  func testCancelledLateSuccessDoesNotClearSession() async throws { try await cancelledLogout(failure: nil) }
  func testCancelledLateUnauthorizedDoesNotClearSession() async throws {
    try await cancelledLogout(failure: RowanFailure(code: 401, message: "old token"))
  }

  private func cancelledLogout(failure: Error?) async throws {
    let (account, gateway, storage) = try await fixture()
    let saved = storage.data, revision = account.revision
    var pending: CheckedContinuation<Any, Error>?
    gateway.delayedDelete = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await account.logout() }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("DELETE did not start"); return }
    task.cancel()
    if let failure { pending.resume(throwing: failure) } else { pending.resume(returning: [:]) }
    do { _ = try await task.value; XCTFail("Cancelled logout accepted") }
    catch is CancellationError { }
    catch { XCTFail("Expected cancellation") }
    XCTAssertNotNil(account.session); XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testNoLocalSessionHasDistinctResultAndDoesNotCallServer() async throws {
    let gateway = LogoutGateway(), storage = LogoutStorage()
    let account = AccountService(http: gateway, storage: storage)
    let result = try await account.logout()
    XCTAssertEqual(result, .noLocalSession)
    XCTAssertTrue(gateway.calls.isEmpty)
  }

  func testStorageDeleteFailureCannotReturnSuccessfulLogout() async throws {
    let (account, gateway, storage) = try await fixture()
    storage.rejectDelete = true
    do { _ = try await account.logout(); XCTFail("Failed persistence cleanup reported as success") }
    catch let failure as AccountLogoutCleanupFailure { XCTAssertEqual(failure.expectedRevision, account.revision) }
    catch { XCTFail("Expected local cleanup state") }
    XCTAssertNil(account.session) // Invalidate memory even if the secure storage reports failure.
    XCTAssertNotNil(storage.data)
    XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testCleanupRetryOnlyDeletesLocalStorageAndNeverReplaysLogout() async throws {
    let (account, gateway, storage) = try await fixture()
    storage.rejectDelete = true
    do { _ = try await account.logout(); XCTFail("Cleanup failure expected") } catch { }
    let revision = try XCTUnwrap(account.pendingLogoutCleanupRevision)
    do { try await account.retryLogoutCleanup(expectedRevision: revision); XCTFail("Delete failure expected") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    XCTAssertEqual(account.pendingLogoutCleanupRevision, revision)
    storage.rejectDelete = false
    try await account.retryLogoutCleanup(expectedRevision: revision)
    XCTAssertNil(account.pendingLogoutCleanupRevision); XCTAssertNil(storage.data)
    XCTAssertNil(account.session); XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testPendingCleanupBlocksRemoteLogoutAndOtherAccountEntrypoints() async throws {
    let (account, gateway, storage) = try await fixture()
    storage.rejectDelete = true
    do { _ = try await account.logout(); XCTFail("Cleanup failure expected") } catch { }
    do { _ = try await account.logout(); XCTFail("Remote logout replayed") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    do { try await account.login(account: "new@example.test", pin: "fixture"); XCTFail("Login bypassed cleanup") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    do { try await account.register(email: "new@example.test", password: "Rowan@123", captcha: "123456", regionCode: "US"); XCTFail("Registration bypassed cleanup") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    do { try await account.restore(); XCTFail("Restore bypassed cleanup") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    do { try await account.clearLocal(); XCTFail("Pending cleanup bypassed") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    XCTAssertEqual(storage.reads, 0); XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testStaleLocalCleanupCannotEraseANewAccount() async throws {
    let (account, gateway, storage) = try await fixture()
    storage.rejectDelete = true
    do { _ = try await account.logout(); XCTFail("Cleanup failure expected") } catch { }
    let oldRevision = try XCTUnwrap(account.pendingLogoutCleanupRevision)
    storage.rejectDelete = false
    try await account.retryLogoutCleanup(expectedRevision: oldRevision)
    try await account.login(account: "new@example.test", pin: "fixture")
    let current = account.session, saved = storage.data, revision = account.revision
    do { try await account.retryLogoutCleanup(expectedRevision: oldRevision); XCTFail("Stale cleanup accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(account.session, current); XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(gateway.calls, ["DELETE", "POST"])
  }

  func testRecreatedWelcomeRoutesPendingCleanupToItsDedicatedHome() async throws {
    let (account, gateway, storage) = try await fixture()
    storage.rejectDelete = true
    do { _ = try await account.logout(); XCTFail("Cleanup failure expected") } catch { }
    let model = WelcomeModel(account: account)
    model.restoreIfNeeded()
    for _ in 0..<200 where model.state == .restoring { await Task.yield() }
    XCTAssertEqual(model.state, .cleanupRequired)
    XCTAssertNil(model.message)
    XCTAssertEqual(storage.reads, 0); XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testCancellingRecreatedWelcomeCannotHidePendingCleanup() async throws {
    let (account, gateway, storage) = try await fixture()
    storage.rejectDelete = true
    do { _ = try await account.logout(); XCTFail("Cleanup failure expected") } catch { }
    let expected = account.pendingLogoutCleanupRevision
    let model = WelcomeModel(account: account)
    model.restoreIfNeeded(); model.cancelRestoration()
    XCTAssertEqual(model.state, .cleanupRequired)
    XCTAssertEqual(account.pendingLogoutCleanupRevision, expected)
    XCTAssertEqual(storage.reads, 0); XCTAssertEqual(gateway.calls, ["DELETE"])
  }

  func testAlreadyCancelledRestoreDoesNotReadStoredCredentialsOrIssueRefresh() async throws {
    let gateway = LogoutGateway(), storage = LogoutStorage()
    storage.data = try JSONSerialization.data(withJSONObject: LogoutGateway.session)
    let account = AccountService(http: gateway, storage: storage)
    let task = Task { withUnsafeCurrentTask { $0?.cancel() }; try await account.restore() }
    do { try await task.value; XCTFail("Cancelled restore accepted") }
    catch is CancellationError { }
    catch { XCTFail("Expected cancellation") }
    XCTAssertEqual(storage.reads, 0); XCTAssertTrue(gateway.calls.isEmpty)
    XCTAssertNil(account.session); XCTAssertNotNil(storage.data)
  }

  func testRestoreDoesNotOverwriteOrRenewAnActiveAccount() async throws {
    let (account, gateway, storage) = try await fixture()
    let current = account.session, saved = storage.data, revision = account.revision
    try await account.restore()
    XCTAssertEqual(account.session, current); XCTAssertEqual(storage.data, saved)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(storage.reads, 0)
    XCTAssertTrue(gateway.calls.isEmpty)
  }

  func testMalformedStoredSessionIsClearedBeforeAnyRefresh() async throws {
    let gateway = LogoutGateway(), storage = LogoutStorage()
    storage.data = try JSONSerialization.data(withJSONObject: ["accessToken": "", "refreshToken": "fixture", "userID": "user"])
    let account = AccountService(http: gateway, storage: storage)
    try await account.restore()
    XCTAssertNil(account.session); XCTAssertNil(storage.data)
    XCTAssertTrue(gateway.calls.isEmpty)
  }

  func testCancelledRefreshCannotPersistAfterRestoreOwnerCancels() async throws {
    let gateway = LogoutGateway(), storage = LogoutStorage()
    let saved = try JSONSerialization.data(withJSONObject: LogoutGateway.session)
    storage.data = saved
    var pending: CheckedContinuation<Any, Error>?
    gateway.delayedRefresh = { try await withCheckedThrowingContinuation { pending = $0 } }
    let account = AccountService(http: gateway, storage: storage)
    let revision = account.revision
    let task = Task { try await account.restore() }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { task.cancel(); XCTFail("Refresh did not start"); return }
    account.cancelRestore(expectedRevision: revision)
    pending.resume(returning: ["accessToken": "late", "refreshToken": "late-refresh"])
    do { try await task.value; XCTFail("Cancelled refresh accepted") }
    catch is CancellationError { }
    catch { XCTFail("Expected cancellation") }
    XCTAssertNil(account.session); XCTAssertEqual(storage.data, saved)
  }
}

@MainActor
private final class LogoutGateway: HTTPGateway {
  static var session: [String: Any] { ["accessToken": "fixture-access", "refreshToken": "fixture-refresh", "userID": "fixture-user"] }
  var calls: [String] = []
  var failure: Error?
  var delayedDelete: (() async throws -> Any)?
  var delayedRefresh: (() async throws -> Any)?
  private var logins = 0
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    calls.append(method)
    if method == "DELETE" {
      if let delayedDelete { return try await delayedDelete() }
      if let failure { throw failure }
      return [:]
    }
    if method == "PATCH", let delayedRefresh { return try await delayedRefresh() }
    logins += 1
    return ["accessToken": "fixture-access-\(logins)", "refreshToken": "fixture-refresh-\(logins)", "userID": "fixture-user-\(logins)"]
  }
}

@MainActor
private final class LogoutStorage: SessionStorage {
  var data: Data?
  var reads = 0
  var rejectDelete = false
  func read() async throws -> Data? { reads += 1; return data }
  func write(_ value: Data?) async throws {
    if value == nil && rejectDelete { throw RowanFailure(code: 500, message: "无法清理安全会话") }
    data = value
  }
}

import XCTest
@testable import Rowan

/// Controlled storage barriers model physical I/O completion; no actual Keychain or backend.
@MainActor
final class AccountPersistenceTests: XCTestCase {
  func testProductionStorageAdapterRunsBackendOffMainThread() async throws {
    let backend = ThreadAuditSessionBackend(), storage = KeychainSessionStorage(backend: backend)
    try await storage.write(Data("fixture".utf8))
    let read = try await storage.read()
    try await storage.write(nil)
    XCTAssertEqual(read, Data("fixture".utf8)); XCTAssertEqual(backend.mainThreadFlags, [false, false, false])
  }
  func testCancelledPhysicalWriteIsCompensatedBeforeNextAccountCanPersist() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    storage.suspendNextSave = true
    let old = Task { try await account.login(account: "old@example.test", pin: "fixture") }
    await wait { storage.savePending != nil }
    old.cancel()
    let next = Task { try await account.login(account: "new@example.test", pin: "fixture") }
    await Task.yield()
    XCTAssertEqual(gateway.logins, 1)
    storage.completeSave()
    do { try await old.value; XCTFail("Cancelled persisted login accepted") } catch is CancellationError { } catch { XCTFail("Expected cancellation") }
    try await next.value
    XCTAssertEqual(account.session?.userID, "user-2")
    let persisted = try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(storage.value))
    XCTAssertEqual(persisted.userID, "user-2")
    XCTAssertEqual(storage.operations, ["delete", "save", "delete", "delete", "save"])
  }
  func testCancelledWriteWithFailedCompensationKeepsCentralPending() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    storage.suspendNextSave = true
    let task = Task { try await account.login(account: "old@example.test", pin: "fixture") }
    await wait { storage.savePending != nil }; task.cancel(); storage.rejectDelete = true; storage.completeSave()
    do { try await task.value; XCTFail("Cancelled login accepted") } catch is CancellationError { } catch { XCTFail("Cancellation should remain cancellation") }
    XCTAssertNil(account.session); XCTAssertNotNil(account.pendingLogoutCleanupRevision); XCTAssertNotNil(storage.value)
    do { try await account.login(account: "new@example.test", pin: "fixture"); XCTFail("Pending cleanup bypassed") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    let revision = try XCTUnwrap(account.pendingLogoutCleanupRevision)
    storage.rejectDelete = false; try await account.retryLogoutCleanup(expectedRevision: revision)
    XCTAssertNil(storage.value); XCTAssertNil(account.pendingLogoutCleanupRevision); XCTAssertEqual(gateway.logins, 1)
  }
  func testAnyInitialDeleteFailureEntersCentralPendingBeforeHTTP() async {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    storage.value = Data("old".utf8); storage.rejectDelete = true
    do { try await account.login(account: "new@example.test", pin: "fixture"); XCTFail("Delete failure accepted") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    XCTAssertNotNil(account.pendingLogoutCleanupRevision); XCTAssertNil(account.session); XCTAssertEqual(gateway.logins, 0)
    let revision = account.revision; account.cancelRestore(expectedRevision: revision)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(account.pendingLogoutCleanupRevision, revision)
  }
  func testCancelledQueuedTransactionIsRemovedWithoutLosingPermit() async throws {
    let gate = AccountTransactionGate()
    var release: CheckedContinuation<Void, Never>?, entered = false, cancelledBodyRan = false
    let first = Task { try await gate.run { entered = true; await withCheckedContinuation { release = $0 } } }
    await wait { entered }
    var waiterStarted = false
    let cancelled = Task { waiterStarted = true; try await gate.run { cancelledBodyRan = true } }
    await wait { waiterStarted }; cancelled.cancel()
    do { try await cancelled.value; XCTFail("Cancelled waiter accepted") } catch is CancellationError { } catch { XCTFail("Expected cancellation") }
    var lastRan = false
    let last = Task { try await gate.run { lastRan = true } }
    release?.resume(); try await first.value; try await last.value
    XCTAssertFalse(cancelledBodyRan); XCTAssertTrue(lastRan)
  }
  func testLateStoredReadCannotInstallOverNewAccount() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    storage.value = try JSONSerialization.data(withJSONObject: PersistenceGateway.session(0))
    storage.suspendRead = true
    let expected = account.revision
    let old = Task { try await account.restore() }
    await wait { storage.readPending != nil }
    let next = Task { try await account.login(account: "new@example.test", pin: "fixture") }
    await Task.yield(); XCTAssertEqual(gateway.logins, 0)
    account.cancelRestore(expectedRevision: expected)
    storage.completeRead(try JSONSerialization.data(withJSONObject: PersistenceGateway.session(0)))
    try await old.value
    try await next.value
    XCTAssertEqual(account.session?.userID, "user-1")
    XCTAssertEqual(try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(storage.value)).userID, "user-1")
  }
  func testLateOldRefreshErrorCannotClearNewPersistedAccount() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    try await account.login(account: "old@example.test", pin: "fixture")
    var pending: CheckedContinuation<Any, Error>?
    gateway.refresh = { try await withCheckedThrowingContinuation { pending = $0 } }
    let old = Task { try await account.refresh() }
    await wait { pending != nil }
    try await account.login(account: "new@example.test", pin: "fixture")
    let revision = account.revision, saved = storage.value
    pending?.resume(throwing: RowanFailure(code: 401, message: "Old refresh expired"))
    do { try await old.value; XCTFail("Old refresh failure expected") } catch { }
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(account.session?.userID, "user-2")
    XCTAssertEqual(storage.value, saved); XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
  func testCleanupContinuesAfterCancellationAndQueuedLoginCannotBeDeletedLater() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    try await account.login(account: "old@example.test", pin: "fixture")
    storage.suspendNextDelete = true
    let cleanup = Task { try await account.clearLocal() }
    await wait { storage.deletePending != nil }
    let cleanupRevision = account.revision
    XCTAssertEqual(account.pendingLogoutCleanupRevision, cleanupRevision)
    account.cancelRestore(expectedRevision: cleanupRevision)
    XCTAssertEqual(account.revision, cleanupRevision) // Cannot manufacture a bypass revision.
    cleanup.cancel()
    let next = Task { try await account.login(account: "new@example.test", pin: "fixture") }
    await Task.yield(); XCTAssertEqual(gateway.logins, 1)
    storage.completeDelete()
    do { try await cleanup.value; XCTFail("Caller cancellation expected") } catch is CancellationError { } catch { XCTFail("Expected cancellation") }
    try await next.value
    XCTAssertEqual(account.session?.userID, "user-2"); XCTAssertNil(account.pendingLogoutCleanupRevision)
    XCTAssertEqual(try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(storage.value)).userID, "user-2")
  }
  func testRestoreInvalidationDuringPhysicalWriteCompensatesBeforeNewLogin() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    storage.value = try JSONSerialization.data(withJSONObject: PersistenceGateway.session(0))
    storage.suspendNextSave = true
    let expected = account.revision
    let restore = Task { try await account.restore() }
    await wait { storage.savePending != nil }
    account.cancelRestore(expectedRevision: expected)
    let next = Task { try await account.login(account: "new@example.test", pin: "fixture") }
    storage.completeSave()
    do { try await restore.value; XCTFail("Cancelled restore accepted") } catch is CancellationError { } catch { XCTFail("Expected cancellation") }
    try await next.value
    XCTAssertEqual(account.session?.userID, "user-1")
    XCTAssertEqual(try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(storage.value)).userID, "user-1")
  }
  func testQueuedRestoreCannotReadAndResurrectTransientCancelledWrite() async throws {
    let storage = SuspendedSessionStorage(), gateway = PersistenceGateway(), account = AccountService(http: gateway, storage: storage)
    storage.value = try JSONSerialization.data(withJSONObject: PersistenceGateway.session(0))
    storage.suspendNextSave = true
    let expected = account.revision
    let first = Task { try await account.restore() }
    await wait { storage.savePending != nil }
    account.cancelRestore(expectedRevision: expected)
    var retryStarted = false
    let second = Task { retryStarted = true; try await account.restore() }
    await wait { retryStarted }
    storage.completeSave()
    do { try await first.value; XCTFail("Cancelled restore accepted") } catch is CancellationError { } catch { XCTFail("Expected cancellation") }
    try await second.value
    XCTAssertNil(account.session); XCTAssertNil(storage.value); XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
  private func wait(_ condition: () -> Bool) async { for _ in 0..<500 where !condition() { await Task.yield() }; XCTAssertTrue(condition()) }
}

private final class ThreadAuditSessionBackend: SessionStorageBackend, @unchecked Sendable {
  private let lock = NSLock(); private var data: Data?; private var flags: [Bool] = []
  var mainThreadFlags: [Bool] { lock.lock(); defer { lock.unlock() }; return flags }
  func read() throws -> Data? { lock.lock(); defer { lock.unlock() }; flags.append(Thread.isMainThread); return data }
  func write(_ value: Data?) throws { lock.lock(); defer { lock.unlock() }; flags.append(Thread.isMainThread); data = value }
}
@MainActor
private final class SuspendedSessionStorage: SessionStorage {
  var value: Data?, operations: [String] = []
  var rejectDelete = false, suspendNextSave = false, suspendRead = false, suspendNextDelete = false
  var savePending: CheckedContinuation<Void, Never>?, readPending: CheckedContinuation<Data?, Never>?
  var deletePending: CheckedContinuation<Void, Never>?
  func read() async throws -> Data? { if suspendRead { return await withCheckedContinuation { readPending = $0 } }; return value }
  func write(_ data: Data?) async throws {
    operations.append(data == nil ? "delete" : "save")
    if data == nil && rejectDelete { throw RowanFailure(code: 500, message: "Fixture delete failed") }
    if data == nil && suspendNextDelete { suspendNextDelete = false; await withCheckedContinuation { deletePending = $0 } }
    if data != nil && suspendNextSave { suspendNextSave = false; await withCheckedContinuation { savePending = $0 } }
    value = data // Physical write deliberately completes even when the calling Task is cancelled.
  }
  func completeSave() { let pending = savePending; savePending = nil; pending?.resume() }
  func completeRead(_ data: Data?) { let pending = readPending; readPending = nil; pending?.resume(returning: data) }
  func completeDelete() { let pending = deletePending; deletePending = nil; pending?.resume() }
}
@MainActor
private final class PersistenceGateway: HTTPGateway {
  var logins = 0
  var refresh: (() async throws -> Any)?
  static func session(_ count: Int) -> [String: Any] { ["accessToken": "fixture-\(count)", "refreshToken": "fixture-refresh-\(count)", "userID": "user-\(count)"] }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    if method == "PATCH", let refresh { return try await refresh() }
    if method == "POST" { logins += 1 }; return Self.session(logins)
  }
}

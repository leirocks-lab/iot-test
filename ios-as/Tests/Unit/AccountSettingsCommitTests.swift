import XCTest
@testable import Rowan

/// Offline credential/settings transaction interleavings; no Keychain/backend execution.
@MainActor
final class AccountSettingsCommitTests: XCTestCase {
  private let confirmed = #"{"language":"en-US","temperatureUnit":"F","futureSettings":{"enabled":true,"unknownList":[null,7,{"opaque":"kept"}]}}"#
  private func fixture() async throws -> (AccountService, CommitGateway, CommitStorage) {
    let gateway = CommitGateway(), storage = CommitStorage()
    let account = AccountService(http: gateway, storage: storage)
    try await account.login(account: "a@example.test", pin: "fixture")
    return (account, gateway, storage)
  }
  private func assertConfirmed(_ session: AccountSession?, file: StaticString = #filePath, line: UInt = #line) throws {
    let setting = try XCTUnwrap(session?.setting, file: file, line: line)
    let value = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(setting)) as? [String: Any], file: file, line: line)
    XCTAssertEqual(Set(value.keys), ["language", "temperatureUnit", "futureSettings"], file: file, line: line)
    XCTAssertEqual(value["language"] as? String, "en-US", file: file, line: line)
    let future = try XCTUnwrap(value["futureSettings"] as? [String: Any], file: file, line: line)
    let list = try XCTUnwrap(future["unknownList"] as? [Any], file: file, line: line)
    XCTAssertEqual(list.count, 3, file: file, line: line); XCTAssertTrue(list[0] is NSNull, file: file, line: line)
    XCTAssertEqual((list[2] as? [String: String])?["opaque"], "kept", file: file, line: line)
  }
  private func disk(_ storage: CommitStorage) throws -> AccountSession { try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(storage.value)) }
  private func wait(_ predicate: () -> Bool) async { for _ in 0..<500 where !predicate() { await Task.yield() }; XCTAssertTrue(predicate()) }

  func testCommitAfterRefreshPreservesLatestCredentialsAndUnknownSettingsWithoutRevisionChange() async throws {
    let (account, gateway, storage) = try await fixture(); let revision = account.revision
    try await account.refresh(); let latest = try XCTUnwrap(account.session)
    let requests = gateway.calls.count
    try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed)
    let published = try XCTUnwrap(account.session)
    XCTAssertEqual(published.accessToken, latest.accessToken); XCTAssertEqual(published.refreshToken, latest.refreshToken)
    XCTAssertEqual(published.userID, latest.userID); XCTAssertEqual(published.expiresIn, latest.expiresIn); XCTAssertEqual(published.tokenType, latest.tokenType)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(gateway.calls.count, requests); XCTAssertNil(account.pendingLogoutCleanupRevision)
    try assertConfirmed(published); XCTAssertEqual(try disk(storage), published)
    // Unknown/wrong known types stay raw while strict projections remain nil.
    try await account.commitSettings(expectedRevision: revision, rawJSON: #"{"notification":"future-boolean","opaque":{"kept":true}}"#)
    XCTAssertNil(account.session?.setting?.notification)
    let raw = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(XCTUnwrap(account.session?.setting))) as? [String: Any])
    XCTAssertEqual(raw["notification"] as? String, "future-boolean"); XCTAssertNotNil(raw["opaque"])
    XCTAssertEqual(account.session?.accessToken, latest.accessToken); XCTAssertEqual(account.revision, revision)
  }
  func testStaleCommitDoesNotWriteOrChangeNewAccount() async throws {
    let (account, _, storage) = try await fixture(); let old = account.revision
    try await account.login(account: "b@example.test", pin: "fixture")
    let session = account.session, revision = account.revision, saved = storage.value, writes = storage.writes.count
    do { try await account.commitSettings(expectedRevision: old, rawJSON: confirmed); XCTFail("Expected stale") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(account.session, session); XCTAssertEqual(account.revision, revision)
    XCTAssertEqual(storage.writes.count, writes); XCTAssertEqual(storage.value, saved)
  }
  func testCancellationAfterPhysicalWritePublishesBeforeReportingCancellation() async throws {
    let (account, _, storage) = try await fixture(); try await account.refresh()
    let latest = try XCTUnwrap(account.session), revision = account.revision, before = storage.writes.count
    storage.pauseNextSave = true
    let work = Task { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed) }
    await wait { storage.pending != nil }; work.cancel()
    XCTAssertEqual(account.session?.setting?.language, "zh-CN")
    storage.complete()
    do { try await work.value; XCTFail("Expected caller cancellation") } catch { XCTAssertTrue(error is CancellationError) }
    try assertConfirmed(account.session); XCTAssertEqual(try disk(storage), account.session)
    XCTAssertEqual(account.session?.accessToken, latest.accessToken); XCTAssertEqual(account.session?.refreshToken, latest.refreshToken)
    XCTAssertEqual(account.revision, revision); XCTAssertEqual(storage.writes.count, before + 1); XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
  func testNewAccountWaitsForCancelledOldSettingsWriteWithoutLateOverwrite() async throws {
    let (account, gateway, storage) = try await fixture(); let revision = account.revision, before = storage.writes.count
    storage.pauseNextSave = true
    let commit = Task { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed) }
    await wait { storage.pending != nil }; commit.cancel()
    let next = Task { try await account.login(account: "b@example.test", pin: "fixture") }
    await Task.yield(); XCTAssertEqual(gateway.logins, 1)
    storage.complete()
    do { try await commit.value; XCTFail("Expected cancellation") } catch { XCTAssertTrue(error is CancellationError) }
    try await next.value
    XCTAssertEqual(account.session?.userID, "b"); XCTAssertEqual(try disk(storage).userID, "b")
    let tail = Array(storage.writes.dropFirst(before)); XCTAssertEqual(tail.count, 3); XCTAssertNil(tail[1])
    try assertConfirmed(JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(tail[0])))
    XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
  func testStorageFailureKeepsValidSessionAndLastConfirmedPreferences() async throws {
    let (account, _, storage) = try await fixture(); try await account.refresh()
    let before = account.session, saved = storage.value, revision = account.revision, writes = storage.writes.count
    storage.failSaves = true
    do { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed); XCTFail("Expected write failure") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 0) }
    XCTAssertEqual(account.session, before); XCTAssertEqual(account.revision, revision); XCTAssertEqual(storage.value, saved)
    XCTAssertEqual(storage.writes.count, writes + 1); XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
  func testSettingsPublicationDoesNotSuppressRefreshForLateUnauthorizedRead() async throws {
    let (account, gateway, storage) = try await fixture(); let revision = account.revision
    var response: CheckedContinuation<Any, Error>?
    gateway.read = { token in
      if token == "fixture-a-access" { return try await withCheckedThrowingContinuation { response = $0 } }
      return ["ok": true]
    }
    let read = Task { try await account.request("GET", "/api/app/devices", expectedRevision: revision) }
    await wait { response != nil }
    do { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed) }
    catch { response?.resume(throwing: CancellationError()); _ = try? await read.value; throw error }
    gateway.omitRefreshSettings = true
    response?.resume(throwing: RowanFailure(code: 401, message: "fixture expired"))
    let result = try await read.value
    XCTAssertEqual((result as? [String: Bool])?["ok"], true)
    XCTAssertEqual(gateway.refreshes, 1); XCTAssertEqual(gateway.reads, 2); XCTAssertEqual(account.revision, revision)
    try assertConfirmed(account.session); try assertConfirmed(disk(storage))
  }
  func testLateRefreshKeepsSettingsCommittedWhileHTTPWasInFlight() async throws {
    for oldSettingPresent in [true, false] {
      let (account, gateway, storage) = try await fixture(); let revision = account.revision
      var response: CheckedContinuation<Any, Error>?
      gateway.refreshHook = { try await withCheckedThrowingContinuation { response = $0 } }
      let renewal = Task { try await account.refresh() }
      await wait { response != nil }
      do { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed) }
      catch { response?.resume(throwing: CancellationError()); _ = try? await renewal.value; throw error }
      var refreshed = CommitGateway.session("a", renewed: true)
      if !oldSettingPresent { refreshed.removeValue(forKey: "setting") }
      response?.resume(returning: refreshed); try await renewal.value
      XCTAssertEqual(account.session?.accessToken, "fixture-renewed-access"); XCTAssertEqual(account.session?.refreshToken, "fixture-renewed-refresh")
      XCTAssertEqual(account.session?.expiresIn, 1200); XCTAssertEqual(account.session?.tokenType, "Bearer")
      XCTAssertEqual(account.revision, revision); XCTAssertEqual(gateway.refreshes, 1)
      try assertConfirmed(account.session); try assertConfirmed(disk(storage)); XCTAssertNil(account.pendingLogoutCleanupRevision)
    }
  }
  func testRestoreInvalidationCompensatesOldSettingsWriteBeforeQueuedNewAccount() async throws {
    let (account, gateway, storage) = try await fixture(); let revision = account.revision, before = storage.writes.count
    storage.pauseNextSave = true
    let commit = Task { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed) }
    await wait { storage.pending != nil }
    account.cancelRestore(expectedRevision: revision)
    XCTAssertNil(account.session); XCTAssertGreaterThan(account.revision, revision)
    let next = Task { try await account.login(account: "b@example.test", pin: "fixture") }
    await Task.yield(); XCTAssertEqual(gateway.logins, 1)
    storage.complete()
    do { try await commit.value; XCTFail("Invalidated commit accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    try await next.value
    XCTAssertEqual(account.session?.userID, "b"); XCTAssertEqual(try disk(storage).userID, "b")
    let tail = Array(storage.writes.dropFirst(before)); XCTAssertEqual(tail.count, 4)
    XCTAssertNotNil(tail[0]); XCTAssertNil(tail[1]); XCTAssertNil(tail[2]); XCTAssertNotNil(tail[3])
    XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
  func testRestoreInvalidationFailedCompensationKeepsPendingAndCannotResurrect() async throws {
    let (account, gateway, storage) = try await fixture(); let revision = account.revision
    storage.pauseNextSave = true
    let commit = Task { try await account.commitSettings(expectedRevision: revision, rawJSON: confirmed) }
    await wait { storage.pending != nil }
    account.cancelRestore(expectedRevision: revision); storage.failDeletes = true; storage.complete()
    do { try await commit.value; XCTFail("Invalidated commit accepted") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    XCTAssertNil(account.session); XCTAssertNotNil(storage.value)
    let pending = try XCTUnwrap(account.pendingLogoutCleanupRevision)
    XCTAssertEqual(pending, account.revision); XCTAssertFalse(account.cleanupInProgress)
    do { try await account.restore(); XCTFail("Pending cleanup bypassed") } catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    do { try await account.login(account: "b@example.test", pin: "fixture"); XCTFail("Pending cleanup bypassed") }
    catch { XCTAssertTrue(error is AccountLogoutCleanupFailure) }
    XCTAssertEqual(gateway.logins, 1)
    storage.failDeletes = false; try await account.retryLogoutCleanup(expectedRevision: pending)
    XCTAssertNil(account.session); XCTAssertNil(storage.value); XCTAssertNil(account.pendingLogoutCleanupRevision)
  }
}

@MainActor
private final class CommitStorage: SessionStorage {
  var value: Data?, writes: [Data?] = []
  var failSaves = false, failDeletes = false, pauseNextSave = false
  var pending: CheckedContinuation<Void, Never>?
  func read() async throws -> Data? { value }
  func write(_ data: Data?) async throws {
    writes.append(data)
    if data == nil, failDeletes { throw RowanFailure(code: 0, message: "fixture delete failure") }
    if data != nil, pauseNextSave { pauseNextSave = false; await withCheckedContinuation { pending = $0 } }
    if data != nil, failSaves { throw RowanFailure(code: 0, message: "fixture storage failure") }
    value = data
  }
  func complete() { let continuation = pending; pending = nil; continuation?.resume() }
}
@MainActor
private final class CommitGateway: HTTPGateway {
  var logins = 0, refreshes = 0, reads = 0
  var calls: [String] = []
  var omitRefreshSettings = false
  var refreshHook: (() async throws -> Any)?
  var read: ((String?) async throws -> Any)?
  static func session(_ user: String, renewed: Bool = false) -> [String: Any] {
    ["userID": user, "accessToken": renewed ? "fixture-renewed-access" : "fixture-\(user)-access",
     "refreshToken": renewed ? "fixture-renewed-refresh" : "fixture-\(user)-refresh", "expiresIn": renewed ? 1200 : 600,
     "tokenType": renewed ? "Bearer" : "bearer", "setting": ["language": "zh-CN", "lastConfirmed": true]]
  }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    calls.append(method + " " + path)
    if method == "POST" { logins += 1; return Self.session(body?["account"] as? String == "b@example.test" ? "b" : "a") }
    if method == "PATCH" {
      refreshes += 1; if let refreshHook { return try await refreshHook() }
      var value = Self.session("a", renewed: true); if omitRefreshSettings { value.removeValue(forKey: "setting") }; return value
    }
    if method == "GET", let read { reads += 1; return try await read(token) }
    throw RowanFailure(code: 500, message: "Unexpected fixture operation")
  }
}


extension AccountSettingsCommitTests {
  func testRefreshPublicationRejectsCapturedOldSettingsWithoutStorageWrite() async throws {
    let (account,_,storage)=try await fixture();let revision=account.revision,stamp=account.settingsRevision
    try await account.refresh();let latest=account.session,writes=storage.writes.count
    do {try await account.commitSettings(expectedRevision:revision,rawJSON:#"{"theme":"stale"}"#,expectedSettingsPublication:stamp);XCTFail("Expected settings conflict")}
    catch {XCTAssertEqual((error as? RowanFailure)?.code,409)}
    XCTAssertEqual(account.session,latest);XCTAssertEqual(storage.writes.count,writes);XCTAssertEqual(account.revision,revision)
  }
  func testSettingsCasPreservesCredentialsAndRejectsSecondOldReceipt() async throws {
    let (account,_,storage)=try await fixture();let revision=account.revision,stamp=account.settingsRevision,credentials=account.session
    try await account.commitSettings(expectedRevision:revision,rawJSON:confirmed,expectedSettingsPublication:stamp)
    XCTAssertNotEqual(account.settingsRevision,stamp);XCTAssertEqual(account.revision,revision)
    XCTAssertEqual(account.session?.accessToken,credentials?.accessToken);XCTAssertEqual(account.session?.refreshToken,credentials?.refreshToken)
    let writes=storage.writes.count
    do {try await account.commitSettings(expectedRevision:revision,rawJSON:"{}",expectedSettingsPublication:stamp);XCTFail("Expected settings conflict")}
    catch {XCTAssertEqual((error as? RowanFailure)?.code,409)}
    XCTAssertEqual(storage.writes.count,writes);try assertConfirmed(account.session)
  }
}


@MainActor private final class PublicationReadRepository: PreferencesRepository {
  let expectedRevision:Int
  var pending:CheckedContinuation<Void,Never>?
  init(_ revision:Int){expectedRevision=revision}
  func patch(_ patch:PreferencesPatch) async throws {XCTFail("Read must not mutate")}
  func load() async throws -> UserPreferences {
    await withCheckedContinuation {pending=$0}
    return try UserPreferences.decode(#"{"theme":"stale","future":{"old":true}}"#)
  }
}
extension AccountSettingsCommitTests {
  func testActualPreferencesReadCapturedBeforeRefreshCannotOverwriteRenewedSettings() async throws {
    let (account,_,storage)=try await fixture();let revision=account.revision,repository=PublicationReadRepository(account.revision)
    let service=PreferencesService(repository:repository,currentAccountValid:{account.revision==revision},
      commitSettings:{r,raw,stamp in try await account.commitSettings(expectedRevision:r,rawJSON:raw,expectedSettingsPublication:stamp)},
      settingsPublication:{account.settingsRevision})
    let read=Task {try await service.load()};await wait {repository.pending != nil}
    try await account.refresh();let latest=account.session,writes=storage.writes.count
    let pending=repository.pending;repository.pending=nil;pending?.resume();try await read.value
    XCTAssertEqual(account.session,latest);XCTAssertEqual(storage.writes.count,writes)
    XCTAssertNil(service.state.preferences);XCTAssertNotNil(service.state.error)
  }
}

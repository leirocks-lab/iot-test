import XCTest
@testable import Rowan

@MainActor
final class EmailLoginTests: XCTestCase {
  @MainActor private final class HTTP: HTTPGateway {
    var calls: [(String, String, [String: Any]?)] = []
    var hook: (String, String) async throws -> Void = { _, _ in }
    var token = "fixture-access"
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      calls.append((method, path, body)); try await hook(method, path)
      return method == "POST" ? ["accessToken": self.token, "refreshToken": "fixture-refresh", "userID": "fixture-user"] : [:]
    }
  }
  @MainActor private final class Storage: SessionStorage {
    var writes: [Data?] = [], value: Data?
    var hook: (Data?) async throws -> Void = { _ in }
    func read() async throws -> Data? { value }
    func write(_ data: Data?) async throws { writes.append(data); try await hook(data); value = data }
  }
  @MainActor private final class Fixture {
    let http = HTTP(), storage = Storage()
    var now: TimeInterval = 0
    var resumedDuringCompensationPublish = false
    lazy var account = AccountService(http: http, storage: storage)
    lazy var cooldowns = PasswordRecoveryCooldowns(now: { [unowned self] in now })
    lazy var codes = HTTPEmailLoginCodeService(http: http, cooldowns: cooldowns)
    lazy var model = EmailLoginModel(account: account, codes: codes)
    func ready(_ mode: AccountLoginMode = .captcha) {
      model.setEmail("public@example.test"); model.setMode(mode); model.setConsent(true)
      if mode == .captcha { model.setCode("123456") } else { model.setPassword("fixture-password") }
    }
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Offline account fixture stalled"); throw RowanFailure(code: 0, message: "fixture")
  }
  func testCaptchaLoginHasExactAuth04BodyAndNoAuth02Preflight() async throws {
    let f = Fixture(); f.ready(); let success = try await f.model.submit(); XCTAssertTrue(success)
    XCTAssertEqual(f.http.calls.count, 1); let call = try XCTUnwrap(f.http.calls.first)
    XCTAssertEqual(call.0, "POST"); XCTAssertEqual(call.1, "/api/app/session")
    XCTAssertEqual(call.2 as? [String: String], ["account": "public@example.test", "pin": "123456", "verify": "captcha", "system": "ios", "language": "zh-CN"])
    XCTAssertNotNil(f.account.session)
  }
  func testPasswordLoginKeepsExistingWireSemantics() async throws {
    let f = Fixture(); f.ready(.password); let success = try await f.model.submit(); XCTAssertTrue(success)
    XCTAssertEqual(f.http.calls.first?.2?["verify"] as? String, "password")
    XCTAssertEqual(f.http.calls.first?.2?["pin"] as? String, "fixture-password")
    XCTAssertNil(f.http.calls.first?.2?["password"]); XCTAssertNil(f.http.calls.first?.2?["captcha"])
  }
  func testModeSwitchClearsBothSecretsAndDoesNotSubmitOtherModeInput() {
    let f = Fixture(); f.ready(.password); f.model.setCode("123456"); f.model.setMode(.captcha)
    XCTAssertEqual(f.model.password, ""); XCTAssertEqual(f.model.code, ""); XCTAssertFalse(f.model.canSubmit)
    f.model.setCode("123456"); f.model.setMode(.password); XCTAssertEqual(f.model.code, ""); XCTAssertFalse(f.model.canSubmit)
  }
  func testConsentGatesBothSubmitAndCodeSendWithoutProtocolReadDependency() {
    let f = Fixture(); f.ready(); f.model.setConsent(false); XCTAssertFalse(f.model.canSend); XCTAssertFalse(f.model.canSubmit)
    f.model.setConsent(true); XCTAssertTrue(f.model.canSend); XCTAssertTrue(f.model.canSubmit)
  }
  func testCaptchaRequiresExactlySixAsciiDigits() {
    let f = Fixture(); f.ready()
    for code in ["", "12345", "1234567", "１２３４５６", "123 56", "abcdef"] { f.model.setCode(code); XCTAssertFalse(f.model.canSubmit) }
    f.model.setCode("000001"); XCTAssertTrue(f.model.canSubmit)
  }
  func testAuth01UsesEmailLoginPurposeAndEscapesPlusWithoutPostingBody() async throws {
    let f = Fixture(); try await f.codes.sendCode(email: "public+tag@example.test")
    let call = try XCTUnwrap(f.http.calls.first), components = try XCTUnwrap(URLComponents(string: call.1))
    XCTAssertEqual(call.0, "GET"); XCTAssertEqual(components.path, "/api/app/captcha"); XCTAssertNil(call.2)
    XCTAssertEqual(Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value ?? "") }), ["account": "public+tag@example.test", "accountType": "email", "captchaType": "login"])
    XCTAssertTrue(call.1.contains("%2B"))
  }
  func testTwoFlowInstancesShareAtomicLoginCooldown() async throws {
    let f = Fixture()
    let first = HTTPEmailLoginCodeService(http: f.http, cooldowns: f.cooldowns), second = HTTPEmailLoginCodeService(http: f.http, cooldowns: f.cooldowns)
    try await first.sendCode(email: "public@example.test")
    do { try await second.sendCode(email: "PUBLIC@example.test"); XCTFail("Cooldown bypassed") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 429) }
    XCTAssertEqual(f.http.calls.count, 1); XCTAssertEqual(first.remaining(email: "public@example.test"), 60)
    f.now = 59.1; XCTAssertEqual(second.remaining(email: "PUBLIC@example.test"), 1)
    f.now = 60; try await second.sendCode(email: "public@example.test"); XCTAssertEqual(f.http.calls.count, 2)
  }
  func testRegisterAndForgetCooldownsDoNotBlockLoginPurpose() {
    let f = Fixture(); f.cooldowns.reserve(for: "public@example.test", purpose: .register); f.cooldowns.reserve(for: "public@example.test", purpose: .forget)
    XCTAssertEqual(f.codes.remaining(email: "public@example.test"), 0)
  }
  func testUncertainSendRetainsCooldownAndDoesNotAutoReplay() async throws {
    let f = Fixture(); f.http.hook = { _, _ in throw URLError(.timedOut) }
    do { try await f.codes.sendCode(email: "public@example.test"); XCTFail("Timeout accepted") } catch { }
    XCTAssertEqual(f.http.calls.count, 1); XCTAssertEqual(f.codes.remaining(email: "public@example.test"), 60)
  }
  func testDuplicateSendWhileActualHttpPendingCannotDispatchTwice() async throws {
    let f = Fixture(); f.ready(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let first = Task { try await f.model.sendCode() }; try await wait { pending != nil }
    do { try await f.model.sendCode(); XCTFail("Duplicate send accepted") } catch { }
    XCTAssertEqual(f.http.calls.count, 1); pending?.resume(); try await first.value
  }
  func testInputChangeRejectsLateSendResultWithoutResettingNewEmail() async throws {
    let f = Fixture(); f.ready(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.model.sendCode() }; try await wait { pending != nil }; f.model.setEmail("new@example.test"); pending?.resume()
    do { try await task.value; XCTFail("Late send accepted") } catch { }
    XCTAssertEqual(f.model.email, "new@example.test"); XCTAssertEqual(f.model.code, ""); XCTAssertEqual(f.codes.remaining(email: "public@example.test"), 60)
  }
  func testStaleExpectedRevisionBeforeLoginDoesZeroHttpAndZeroClear() async throws {
    let f = Fixture(), stale = 0
    try await f.account.login(account: "b@example.test", pin: "fixture"); let writes = f.storage.writes.count, calls = f.http.calls.count
    do { _ = try await f.account.login(account: "a@example.test", credential: .captcha("123456"), expectedRevision: stale); XCTFail("Old A accepted") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(f.storage.writes.count, writes); XCTAssertEqual(f.http.calls.count, calls); XCTAssertNotNil(f.account.session)
  }
  func testQueuedOldLoginCannotClearBInstalledWhileWaitingForStorageGate() async throws {
    let f = Fixture(); var physical: CheckedContinuation<Void, Error>?
    f.storage.hook = { data in if data != nil { try await withCheckedThrowingContinuation { physical = $0 } } }
    let b = Task { try await f.account.login(account: "b@example.test", pin: "fixture") }; try await wait { physical != nil }
    let writes = f.storage.writes.count, calls = f.http.calls.count
    let a = Task { try await f.account.login(account: "a@example.test", credential: .captcha("123456"), expectedRevision: 0) }
    await Task.yield(); physical?.resume(); try await b.value
    do { _ = try await a.value; XCTFail("Queued stale A accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(f.storage.writes.count, writes); XCTAssertEqual(f.http.calls.count, calls); XCTAssertNotNil(f.account.session)
  }
  func testInputChangeCancelsPendingLoginAndLateResponseCannotPersist() async throws {
    let f = Fixture(); f.ready(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.model.submit() }; try await wait { pending != nil }; f.model.setCode("654321"); pending?.resume()
    do { _ = try await task.value; XCTFail("Late login accepted") } catch { }
    XCTAssertNil(f.account.session); XCTAssertFalse(f.storage.writes.contains { $0 != nil }); XCTAssertEqual(f.http.calls.count, 1)
  }
  func testPageDeactivationCancelsLoginWithoutAutoReplay() async throws {
    let f = Fixture(); f.ready(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.model.submit() }; try await wait { pending != nil }; f.model.deactivate(); pending?.resume()
    do { _ = try await task.value; XCTFail("Closed page logged in") } catch { }
    XCTAssertNil(f.account.session); XCTAssertEqual(f.http.calls.count, 1); XCTAssertEqual(f.model.code, "")
  }
  func testOwnReservationAllowsExplicitRetryAfterDefiniteAuthRejection() async throws {
    let f = Fixture(); f.ready(); f.http.hook = { _, _ in throw RowanFailure(code: 1182, message: "fixture") }
    do { _ = try await f.model.submit(); XCTFail("Wrong code accepted") } catch { }
    XCTAssertTrue(f.model.canSubmit); XCTAssertNil(f.account.session)
    f.http.hook = { _, _ in }; let success = try await f.model.submit(); XCTAssertTrue(success); XCTAssertEqual(f.http.calls.count, 2)
  }
  func testAccountBRejectsRebindAndCannotBeClearedByOldPage() async throws {
    let f = Fixture(); f.ready(); try await f.account.login(account: "b@example.test", pin: "fixture")
    let writes = f.storage.writes.count; f.model.rebindLoggedOut(); XCTAssertFalse(f.model.canSubmit)
    do { _ = try await f.model.submit(); XCTFail("Old page replaced B") } catch { }
    XCTAssertEqual(f.storage.writes.count, writes); XCTAssertNotNil(f.account.session)
  }
  func testSwitchModeDuringLoginCancelsOldCredentialBeforePersistence() async throws {
    let f = Fixture(); f.ready(.password); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.model.submit() }; try await wait { pending != nil }; f.model.setMode(.captcha); pending?.resume()
    do { _ = try await task.value; XCTFail("Switched mode old login accepted") } catch { }
    XCTAssertNil(f.account.session); XCTAssertEqual(f.model.code, ""); XCTAssertEqual(f.model.password, "")
  }
  func testPendingCleanupBlocksBothSendAndSubmit() async throws {
    let f = Fixture(); f.ready(); f.storage.hook = { _ in throw URLError(.cannotWriteToFile) }
    do { try await f.account.clearLocal(); XCTFail("Cleanup failure expected") } catch { }
    XCTAssertNotNil(f.account.pendingLogoutCleanupRevision); f.model.rebindLoggedOut()
    XCTAssertFalse(f.model.canSend); XCTAssertFalse(f.model.canSubmit); XCTAssertTrue(f.http.calls.isEmpty)
  }
  func testCredentialAndReceiptNeverDescribeTokensOrPin() {
    let credential = AccountLoginCredential.captcha("123456")
    XCTAssertFalse(String(describing: credential).contains("123456")); XCTAssertFalse(String(reflecting: credential).contains("123456"))
    XCTAssertEqual(Mirror(reflecting: AccountLoginReceipt(revision: 7)).children.count, 1)
  }
  func testAlreadyDispatchedOldLoginCannotPersistOverNewB() async throws {
    let f = Fixture(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { method, _ in if method == "POST", f.http.calls.count == 1 { try await withCheckedThrowingContinuation { pending = $0 } } }
    let a = Task { try await f.account.login(account: "a@example.test", credential: .captcha("123456"), expectedRevision: 0) }
    try await wait { pending != nil }; f.http.token = "fixture-B"
    try await f.account.login(account: "b@example.test", pin: "fixture")
    let writes = f.storage.writes.count; pending?.resume()
    do { _ = try await a.value; XCTFail("Old A replaced B") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(f.account.session?.accessToken, "fixture-B"); XCTAssertEqual(f.storage.writes.count, writes)
    XCTAssertEqual(f.http.calls.count, 2)
  }
  func testStaleRegistrationCannotClearInstalledBOrDispatchPutUser() async throws {
    let f = Fixture(); try await f.account.login(account: "b@example.test", pin: "fixture")
    let writes = f.storage.writes.count, calls = f.http.calls.count
    do {
      try await f.account.register(email: "a@example.test", password: "Rowan@123", captcha: "123456", regionCode: "US", expectedRevision: 0)
      XCTFail("Old registration replaced B")
    } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(f.storage.writes.count, writes); XCTAssertEqual(f.http.calls.count, calls); XCTAssertNotNil(f.account.session)
  }
  func testElapsedCooldownCannotStartAnotherSendWhileActualHttpStillPending() async throws {
    let f = Fixture(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let first = Task { try await f.codes.sendCode(email: "public@example.test") }; try await wait { pending != nil }; f.now = 61
    let nextFlow = HTTPEmailLoginCodeService(http: f.http, cooldowns: f.cooldowns)
    do { try await nextFlow.sendCode(email: "PUBLIC@example.test"); XCTFail("In-flight send overlapped") } catch { }
    XCTAssertEqual(f.http.calls.count, 1); pending?.resume(throwing: URLError(.timedOut))
    do { try await first.value } catch { }
    f.http.hook = { _, _ in }; try await nextFlow.sendCode(email: "public@example.test"); XCTAssertEqual(f.http.calls.count, 2)
  }
  func testAuthErrorsUseFixedCaptchaTextAndNeverEnumerateExistingAccounts() async throws {
    var messages: [Int: String] = [:]
    for code in [1181, 1182, 1183, 1184] {
      let f = Fixture(); f.ready(); f.http.hook = { _, _ in throw RowanFailure(code: code, message: "private-server-details") }
      do { _ = try await f.model.submit(); XCTFail("Auth rejection accepted") } catch { }
      messages[code] = f.model.status; XCTAssertFalse(f.model.status.contains("private")); XCTAssertTrue(f.model.canSubmit)
    }
    XCTAssertEqual(messages[1181], messages[1182]); XCTAssertEqual(messages[1183], messages[1184])
    XCTAssertNotEqual(messages[1181], messages[1183])
  }
  func testCompensatedStorageFailureIssuesOwnR2ForSameModelExplicitRetry() async throws {
    let f = Fixture(); f.ready(); var failOnce = true
    f.storage.hook = { data in if data != nil, failOnce { failOnce = false; throw URLError(.cannotWriteToFile) } }
    do { _ = try await f.model.submit(); XCTFail("Persistence failure accepted") } catch { }
    XCTAssertNil(f.account.session); XCTAssertNil(f.account.pendingLogoutCleanupRevision); XCTAssertEqual(f.account.revision, 2)
    f.model.setCode("654321"); XCTAssertTrue(f.model.canSubmit)
    let success = try await f.model.submit(); XCTAssertTrue(success); XCTAssertNotNil(f.account.session)
  }
  func testPhysicalWriteCancellationCompensationIssuesOwnR2WithoutDiscardingNewInput() async throws {
    let f = Fixture(); f.ready(); var physical: CheckedContinuation<Void, Error>?
    f.storage.hook = { data in if data != nil { try await withCheckedThrowingContinuation { physical = $0 } } }
    let first = Task { try await f.model.submit() }; try await wait { physical != nil }
    f.model.setCode("654321"); physical?.resume()
    do { _ = try await first.value; XCTFail("Cancelled write accepted") } catch { }
    XCTAssertNil(f.storage.value); XCTAssertNil(f.account.session); XCTAssertNil(f.account.pendingLogoutCleanupRevision)
    XCTAssertEqual(f.account.revision, 2); XCTAssertEqual(f.model.code, "654321"); XCTAssertTrue(f.model.canSubmit)
    f.storage.hook = { _ in }; let success = try await f.model.submit(); XCTAssertTrue(success)
  }
  func testReturningBeforeCancelledActualHttpEndsRestoresExplicitRetryWithoutRebindingAuthority() async throws {
    let f = Fixture(); f.ready(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let first = Task { try await f.model.submit() }; try await wait { pending != nil }
    f.model.deactivate(); f.model.rebindLoggedOut(); XCTAssertTrue(f.model.busy)
    pending?.resume(); do { _ = try await first.value; XCTFail("Cancelled request accepted") } catch { }
    XCTAssertNil(f.account.session); f.model.setCode("654321"); XCTAssertTrue(f.model.canSubmit)
    f.http.hook = { _, _ in }; let success = try await f.model.submit(); XCTAssertTrue(success)
  }
  func testInactiveCompensationReceiptSurvivesBusyReturnDuringContextPublish() async throws {
    let f = Fixture(); f.ready(); var physical: CheckedContinuation<Void, Error>?
    f.storage.hook = { data in if data != nil { try await withCheckedThrowingContinuation { physical = $0 } } }
    let first = Task { try await f.model.submit() }; try await wait { physical != nil }; f.model.deactivate()
    let observer = NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: f.account, queue: .main) { _ in
      // AccountService publishes synchronously on MainActor; force the exact receipt -> publish -> busy-return ordering.
      MainActor.assumeIsolated {
        if f.account.revision == 2, f.account.session == nil, f.account.pendingLogoutCleanupRevision == nil, f.model.busy {
          f.resumedDuringCompensationPublish = true; f.model.rebindLoggedOut()
        }
      }
    }
    defer { NotificationCenter.default.removeObserver(observer) }
    physical?.resume(); do { _ = try await first.value; XCTFail("Cancelled write accepted") } catch { }
    XCTAssertTrue(f.resumedDuringCompensationPublish); XCTAssertNil(f.account.session); XCTAssertNil(f.storage.value)
    f.model.setCode("654321"); XCTAssertTrue(f.model.canSubmit)
    f.storage.hook = { _ in }; let success = try await f.model.submit(); XCTAssertTrue(success)
  }
  func testModeChangeBeforeLateSendAcknowledgmentNeverPublishesOldSentStatus() async throws {
    let f = Fixture(); f.ready(); var pending: CheckedContinuation<Void, Error>?
    f.http.hook = { _, _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let first = Task { try await f.model.sendCode() }; try await wait { pending != nil }
    f.model.setMode(.password); pending?.resume()
    do { try await first.value; XCTFail("Old send acknowledgment accepted") } catch { }
    XCTAssertEqual(f.model.mode, .password); XCTAssertEqual(f.model.status, ""); XCTAssertFalse(f.model.busy)
  }
}

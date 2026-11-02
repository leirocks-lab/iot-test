import XCTest
@testable import Rowan

/// Offline RowanTests sources; not executed on Windows or verified by a macOS build yet.
@MainActor
final class PasswordRecoveryTests: XCTestCase {
  func testHTTPContractAndNoConfirmationOrTokenSent() async throws {
    let http = RecoveryHTTPFixture()
    let service = HTTPPasswordRecoveryService(http: http)
    try await service.sendCode(email: "user+tag@example.com")
    try await service.verifyCode(email: "user+tag@example.com", code: "123456")
    try await service.resetPassword(email: "user+tag@example.com", code: "123456", password: "Rowan@123")
    let send = try XCTUnwrap(URLComponents(string: http.calls[0].path))
    XCTAssertEqual(send.path, "/api/app/captcha")
    XCTAssertEqual(send.queryItems, [URLQueryItem(name: "account", value: "user+tag@example.com"),
                                   URLQueryItem(name: "accountType", value: "email"),
                                   URLQueryItem(name: "captchaType", value: "forget")])
    XCTAssertTrue(http.calls[0].path.contains("%2B"))
    XCTAssertEqual(URLComponents(string: http.calls[1].path)?.path, "/api/app/captcha/123456")
    XCTAssertEqual(http.calls[2].method, "PATCH")
    XCTAssertEqual(http.calls[2].path, "/api/app/user/password")
    XCTAssertEqual(http.calls[2].body as? [String: String], ["account": "user+tag@example.com", "captcha": "123456", "password": "Rowan@123"])
    XCTAssertTrue(http.calls.allSatisfy { $0.token == nil })
  }

  func testInputRulesAllowSpecialCharactersButRequireLetterDigitAndNoWhitespace() {
    XCTAssertTrue(RecoveryInput.validPassword("Rowan@123"))
    for value in ["12345678", "abcdefgh", "Rowan 123", "Ab1", "Ab12345678901"] { XCTAssertFalse(RecoveryInput.validPassword(value)) }
    XCTAssertTrue(RecoveryInput.validCode("123456"))
    for value in ["12345", "1234567", "１２３４５６", "12345a"] { XCTAssertFalse(RecoveryInput.validCode(value)) }
  }

  func testResendGateSurvivesRepeatedClicksAndReopening() async {
    var now: TimeInterval = 100
    let cooldown = PasswordRecoveryCooldowns(now: { now })
    let service = RecoveryServiceFixture()
    let account = AccountService(http: RecoveryHTTPFixture(), storage: RecoveryMemoryFixture())
    let first = PasswordRecoveryModel(service: service, account: account, cooldowns: cooldown)
    first.updateEmail("test@example.com")
    first.sendCode(); first.sendCode()
    await idle(first)
    XCTAssertEqual(service.sends, 1)
    XCTAssertEqual(first.remainingSeconds, 60)
    let reopened = PasswordRecoveryModel(service: service, account: account, cooldowns: cooldown)
    reopened.updateEmail("TEST@example.com")
    XCTAssertFalse(reopened.canSend)
    now = 159
    XCTAssertEqual(reopened.remainingSeconds, 1)
    now = 160
    XCTAssertTrue(reopened.canSend)
  }

  func testChangingCodeOrAccountInvalidatesVerificationAndResetRequiresVerification() async {
    let (model, service, _, _) = fixture()
    model.updateEmail("test@example.com")
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    XCTAssertEqual(service.resets, 0)
    model.updateCode("123456"); model.verifyCode()
    await idle(model)
    XCTAssertEqual(model.stage, .password)
    model.updateCode("654321")
    XCTAssertEqual(model.stage, .verification)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    XCTAssertEqual(service.resets, 0)
    model.verifyCode(); await idle(model)
    model.updateEmail("other@example.com")
    XCTAssertEqual(model.stage, .account)
    XCTAssertEqual(model.code, "")
  }

  func testCancelledVerificationIgnoresLateResponse() async {
    let (model, service, _, _) = fixture()
    var pending: CheckedContinuation<Void, Never>?
    service.verify = { await withCheckedContinuation { pending = $0 } }
    model.updateEmail("test@example.com"); model.updateCode("123456"); model.verifyCode()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { XCTFail("Verification did not start"); model.cancel(); return }
    model.updateCode("654321")
    pending.resume()
    for _ in 0..<10 { await Task.yield() }
    XCTAssertFalse(model.busy)
    XCTAssertEqual(model.stage, .verification)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    XCTAssertEqual(service.resets, 0)
  }

  func testResetClearsSessionAndDoesNotLoginOrReplay() async throws {
    let (model, service, account, storage) = fixture()
    try await account.login(account: "test@example.com", pin: "old")
    await verified(model)
    model.reset(password: "Rowan@123", confirmation: "different")
    XCTAssertEqual(service.resets, 0)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    await idle(model)
    XCTAssertEqual(service.resets, 1)
    XCTAssertEqual(model.stage, .success)
    XCTAssertNil(account.session)
    let persistedAfterOperation = try await storage.read()
    XCTAssertNil(persistedAfterOperation)
  }

  func testUnknownResetOutcomeCannotBeResubmitted() async {
    let (model, service, _, _) = fixture()
    service.reset = { throw URLError(.timedOut) }
    await verified(model)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    await idle(model)
    XCTAssertTrue(model.resetOutcomeUnknown)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    XCTAssertEqual(service.resets, 1)
  }

  func testNewAccountIsNotClearedByLateResetResponse() async throws {
    let (model, service, account, _) = fixture()
    var pending: CheckedContinuation<Void, Never>?
    service.reset = { await withCheckedContinuation { pending = $0 } }
    await verified(model)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { XCTFail("Reset did not start"); model.cancel(); return }
    try await account.login(account: "new@example.com", pin: "new")
    let newRevision = account.revision
    pending.resume()
    await idle(model)
    XCTAssertNotNil(account.session)
    XCTAssertEqual(account.revision, newRevision)
    XCTAssertTrue(model.resetOutcomeUnknown)
  }

  func testStorageCleanupRetryDoesNotRepeatPasswordMutation() async throws {
    let (model, service, account, storage) = fixture()
    try await account.login(account: "test@example.com", pin: "old")
    storage.failClearing = true
    await verified(model)
    model.reset(password: "Rowan@123", confirmation: "Rowan@123")
    await idle(model)
    XCTAssertTrue(model.needsLocalCleanup)
    storage.failClearing = false
    model.reset(password: "", confirmation: "")
    await idle(model)
    XCTAssertEqual(model.stage, .success)
    XCTAssertEqual(service.resets, 1)
    let persistedAfterOperation = try await storage.read()
    XCTAssertNil(persistedAfterOperation)
  }

  private func fixture() -> (PasswordRecoveryModel, RecoveryServiceFixture, AccountService, RecoveryMemoryFixture) {
    let service = RecoveryServiceFixture(), storage = RecoveryMemoryFixture()
    let account = AccountService(http: RecoveryHTTPFixture(), storage: storage)
    return (PasswordRecoveryModel(service: service, account: account, cooldowns: PasswordRecoveryCooldowns()), service, account, storage)
  }
  private func idle(_ model: PasswordRecoveryModel) async {
    for _ in 0..<300 where model.busy { await Task.yield() }
    XCTAssertFalse(model.busy, "Fixture operation did not finish")
  }
  private func verified(_ model: PasswordRecoveryModel) async {
    model.updateEmail("test@example.com"); model.updateCode("123456"); model.verifyCode()
    await idle(model)
    XCTAssertEqual(model.stage, .password)
  }
}

@MainActor
private final class RecoveryServiceFixture: PasswordRecoveryService {
  var sends = 0, resets = 0
  var verify: () async throws -> Void = {}
  var reset: () async throws -> Void = {}
  func sendCode(email: String) async throws { sends += 1 }
  func verifyCode(email: String, code: String) async throws { try await verify() }
  func resetPassword(email: String, code: String, password: String) async throws { resets += 1; try await reset() }
}

private final class RecoveryHTTPFixture: HTTPGateway {
  struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  var calls: [Call] = []
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    calls.append(Call(method: method, path: path, body: body, token: token))
    return ["accessToken": "access", "refreshToken": "refresh", "userID": "user"]
  }
}

@MainActor
private final class RecoveryMemoryFixture: SessionStorage {
  var failClearing = false
  private var data: Data?
  func read() async throws -> Data? { data }
  func write(_ value: Data?) async throws {
    if value == nil && failClearing { throw RowanFailure(code: 500, message: "本地会话清理失败") }
    data = value
  }
}

import XCTest
@testable import Rowan

/// Offline V1.4 AUTH-01/02/03 and S004–S014 behavior sources. No real account or email is created.
@MainActor
final class EmailRegistrationTests: XCTestCase {
  func testRegisterCaptchaPurposeAndExactSessionCreatingRequest() async throws {
    let http = RegistrationHTTPFixture(), storage = RegistrationMemoryFixture()
    let captcha = HTTPRegistrationCaptchaService(http: http)
    try await captcha.sendCode(email: "user+tag@example.com")
    try await captcha.verifyCode(email: "user+tag@example.com", code: "123456")
    let send = try XCTUnwrap(URLComponents(string: http.calls[0].path))
    XCTAssertEqual(send.queryItems?.first { $0.name == "captchaType" }?.value, "register")
    XCTAssertEqual(send.queryItems?.first { $0.name == "accountType" }?.value, "email")
    XCTAssertTrue(http.calls[0].path.contains("%2B"))
    XCTAssertEqual(URLComponents(string: http.calls[1].path)?.path, "/api/app/captcha/123456")
    let account = AccountService(http: http, storage: storage)
    try await account.register(email: "user+tag@example.com", password: "Rowan@123", captcha: "123456", regionCode: "US")
    XCTAssertEqual(http.calls[2].method, "PUT")
    XCTAssertEqual(http.calls[2].path, "/api/app/user")
    XCTAssertEqual(http.calls[2].body as? [String: String], [
      "account": "user+tag@example.com", "password": "Rowan@123", "type": "email", "captcha": "123456",
      "regionCode": "US", "system": "ios", "language": "zh-CN"
    ])
    XCTAssertTrue(http.calls.allSatisfy { $0.token == nil })
    XCTAssertFalse(http.calls.contains { $0.method == "POST" })
    let storedData = try await storage.read()
    let stored = try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(storedData))
    XCTAssertEqual(account.session, stored)
    XCTAssertEqual(stored.expiresIn, 604800)
    XCTAssertEqual(stored.setting?.language, "en")
  }

  func testRegistrationRequiresSelectedRegionBothRealReaderCompletionsAndConsent() async throws {
    let (model, _, http, _) = fixture()
    model.updateEmail("test@example.com")
    XCTAssertFalse(model.canSend)
    XCTAssertThrowsError(try model.agreementContext())
    model.setConsent(true)
    XCTAssertFalse(model.consent)
    model.selectRegion("US")
    model.updateCode("123456"); model.verifyCode(); await idle(model)
    XCTAssertFalse(model.canRegister)
    let context = try model.agreementContext()
    model.completeReading(.privacy, context: context, revision: model.agreementRevision)
    model.setConsent(true)
    XCTAssertFalse(model.consent)
    model.completeReading(.serviceTerms, context: context, revision: model.agreementRevision)
    model.setConsent(true)
    XCTAssertTrue(model.canRegister)
    model.register(password: "Rowan@123", confirmation: "different")
    XCTAssertFalse(http.calls.contains { $0.method == "PUT" })
    model.register(password: "Rowan@123", confirmation: "Rowan@123")
    model.register(password: "Rowan@123", confirmation: "Rowan@123")
    await idle(model)
    XCTAssertTrue(model.registered)
    XCTAssertEqual(http.calls.filter { $0.method == "PUT" }.count, 1)
    XCTAssertFalse(http.calls.contains { $0.method == "POST" })
  }

  func testRegionChangeClearsReadingConsentAndVerificationAndRejectsOldReaderCallback() async throws {
    let (model, _, _, _) = fixture()
    try await ready(model)
    let oldContext = try model.agreementContext()
    let oldRevision = model.agreementRevision
    model.selectRegion("CA")
    XCTAssertTrue(model.readAgreements.isEmpty)
    XCTAssertFalse(model.consent)
    XCTAssertEqual(model.code, "")
    XCTAssertFalse(model.canRegister)
    model.selectRegion("US")
    model.completeReading(.privacy, context: oldContext, revision: oldRevision)
    XCTAssertTrue(model.readAgreements.isEmpty)
  }

  func testChangingEmailOrCodeRejectsLateVerification() async {
    let (model, captcha, _, _) = fixture()
    var pending: CheckedContinuation<Void, Never>?
    captcha.verify = { await withCheckedContinuation { pending = $0 } }
    model.selectRegion("US"); model.updateEmail("test@example.com"); model.updateCode("123456"); model.verifyCode()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancel(); XCTFail("Verification did not start"); return }
    model.updateEmail("other@example.com")
    pending.resume()
    for _ in 0..<10 { await Task.yield() }
    XCTAssertFalse(model.canRegister)
    XCTAssertEqual(model.code, "")
    XCTAssertFalse(model.busy)
  }

  func testCaptchaCooldownSeparatesRegisterAndForgetAndPersistsAcrossFlows() async {
    var now: TimeInterval = 100
    let cooldowns = PasswordRecoveryCooldowns(now: { now })
    cooldowns.reserve(for: "test@example.com", purpose: .forget)
    let captcha = RegistrationCaptchaFixture(), account = AccountService(http: RegistrationHTTPFixture(), storage: RegistrationMemoryFixture())
    let first = EmailRegistrationModel(service: captcha, account: account, cooldowns: cooldowns, brandID: nil)
    first.selectRegion("US"); first.updateEmail("test@example.com")
    XCTAssertTrue(first.canSend)
    first.sendCode(); first.sendCode(); await idle(first)
    XCTAssertEqual(captcha.sends, 1)
    let second = EmailRegistrationModel(service: captcha, account: account, cooldowns: cooldowns, brandID: nil)
    second.selectRegion("US"); second.updateEmail("TEST@example.com")
    XCTAssertFalse(second.canSend)
    now += 60
    XCTAssertTrue(second.canSend)
  }

  func testCancellationRejectsLateRegistrationSession() async throws {
    let (model, _, http, account) = fixture()
    var pending: CheckedContinuation<Any, Never>?
    http.register = { await withCheckedContinuation { pending = $0 } }
    try await ready(model)
    model.register(password: "Rowan@123", confirmation: "Rowan@123")
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancel(); XCTFail("Registration did not start"); return }
    model.cancel()
    pending.resume(returning: RegistrationHTTPFixture.session)
    for _ in 0..<10 { await Task.yield() }
    XCTAssertNil(account.session)
    XCTAssertFalse(model.registered)
    XCTAssertTrue(model.outcomeUnknown)
    XCTAssertEqual(http.calls.filter { $0.method == "PUT" }.count, 1)
  }

  func testTimeoutDoesNotRetryOrClaimRegistrationSuccess() async throws {
    let (model, _, http, account) = fixture()
    http.register = { throw URLError(.timedOut) }
    try await ready(model)
    model.register(password: "Rowan@123", confirmation: "Rowan@123"); await idle(model)
    XCTAssertTrue(model.outcomeUnknown)
    XCTAssertFalse(model.registered)
    XCTAssertNil(account.session)
    model.register(password: "Rowan@123", confirmation: "Rowan@123")
    XCTAssertEqual(http.calls.filter { $0.method == "PUT" }.count, 1)
  }

  func testQueryDoesNotChangeHTTPBackendOwnership() {
    for path in ["/api/app/products?category=WineCooler", "/api/app/devices?room=1", "/api/app/user/locations?limit=10"] {
      XCTAssertTrue(RowanHTTPClient.usesIoTBackend(for: path))
    }
    for path in ["/api/app/privacy?next=/api/app/products", "/api/app/session?products=1", "/api/app/products-other?category=1"] {
      XCTAssertFalse(RowanHTTPClient.usesIoTBackend(for: path))
    }
  }

  func testLateRegistrationCannotReplaceAnotherAccountSession() async throws {
    let (model, _, http, account) = fixture()
    var pending: CheckedContinuation<Any, Never>?
    http.register = { await withCheckedContinuation { pending = $0 } }
    try await ready(model)
    model.register(password: "Rowan@123", confirmation: "Rowan@123")
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancel(); XCTFail("Registration did not start"); return }
    try await account.login(account: "another@example.com", pin: "existing")
    let revision = account.revision
    let current = account.session
    pending.resume(returning: RegistrationHTTPFixture.session)
    await idle(model)
    XCTAssertEqual(account.revision, revision)
    XCTAssertEqual(account.session, current)
    XCTAssertFalse(model.registered)
  }

  func testFailedSessionPersistenceCannotReportRegistrationSuccessOrReplay() async throws {
    let http = RegistrationHTTPFixture(), storage = RegistrationMemoryFixture()
    storage.failSaving = true
    let account = AccountService(http: http, storage: storage)
    let model = EmailRegistrationModel(service: RegistrationCaptchaFixture(), account: account,
                                       cooldowns: PasswordRecoveryCooldowns(), brandID: nil)
    try await ready(model)
    model.register(password: "Rowan@123", confirmation: "Rowan@123"); await idle(model)
    XCTAssertFalse(model.registered)
    XCTAssertTrue(model.outcomeUnknown)
    XCTAssertNil(account.session)
    let persistedAfterOperation = try await storage.read()
    XCTAssertNil(persistedAfterOperation)
    model.register(password: "Rowan@123", confirmation: "Rowan@123")
    XCTAssertEqual(http.calls.filter { $0.method == "PUT" }.count, 1)
  }

  private func fixture() -> (EmailRegistrationModel, RegistrationCaptchaFixture, RegistrationHTTPFixture, AccountService) {
    let http = RegistrationHTTPFixture(), captcha = RegistrationCaptchaFixture()
    let account = AccountService(http: http, storage: RegistrationMemoryFixture())
    return (EmailRegistrationModel(service: captcha, account: account, cooldowns: PasswordRecoveryCooldowns(), brandID: nil), captcha, http, account)
  }
  private func idle(_ model: EmailRegistrationModel) async {
    for _ in 0..<300 where model.busy { await Task.yield() }
    XCTAssertFalse(model.busy, "Fixture did not settle")
  }
  private func ready(_ model: EmailRegistrationModel) async throws {
    model.selectRegion("US"); model.updateEmail("test@example.com"); model.updateCode("123456")
    model.verifyCode(); await idle(model)
    let context = try model.agreementContext()
    for kind in AgreementKind.allCases { model.completeReading(kind, context: context, revision: model.agreementRevision) }
    model.setConsent(true)
    XCTAssertTrue(model.canRegister)
  }
}

@MainActor
private final class RegistrationCaptchaFixture: RegistrationCaptchaService {
  var sends = 0
  var verify: () async throws -> Void = {}
  func sendCode(email: String) async throws { sends += 1 }
  func verifyCode(email: String, code: String) async throws { try await verify() }
}

@MainActor
private final class RegistrationHTTPFixture: HTTPGateway {
  static var session: [String: Any] { ["accessToken": "access", "refreshToken": "refresh", "userID": "user",
                                     "expiresIn": 604800, "tokenType": "bearer", "setting": ["language": "en"]] }
  struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  var calls: [Call] = []
  var register: () async throws -> Any = { RegistrationHTTPFixture.session }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    calls.append(Call(method: method, path: path, body: body, token: token))
    return method == "PUT" ? try await register() : Self.session
  }
}

@MainActor
private final class RegistrationMemoryFixture: SessionStorage {
  var failSaving = false
  private var data: Data?
  func read() async throws -> Data? { data }
  func write(_ value: Data?) async throws {
    if value != nil && failSaving { throw RowanFailure(code: 550, message: "安全存储失败") }
    data = value
  }
}

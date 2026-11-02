import Foundation

@MainActor
protocol RegistrationCaptchaService {
  func sendCode(email: String) async throws
  func verifyCode(email: String, code: String) async throws
}

@MainActor
final class EmailRegistrationModel {
  enum Operation: Equatable { case sending, verifying, registering }
  private let service: any RegistrationCaptchaService
  private let account: AccountService
  private var accountRevision: Int
  private let cooldowns: PasswordRecoveryCooldowns
  private let brandID: String?
  private var generation = 0
  private var task: Task<Void, Never>?
  private var verified: (email: String, code: String, region: String)?
  private(set) var email = ""
  private(set) var code = ""
  private(set) var regionCode: String?
  private(set) var agreementRevision = 0
  private(set) var readAgreements = Set<AgreementKind>()
  private(set) var consent = false
  private(set) var operation: Operation?
  private(set) var message: String?
  private(set) var outcomeUnknown = false
  private(set) var registered = false
  var onChange: (() -> Void)?
  var busy: Bool { operation != nil }
  var remainingSeconds: Int { cooldowns.remaining(for: email, purpose: .register) }
  var canSend: Bool { !busy && !registered && !outcomeUnknown && regionCode != nil && RecoveryInput.validEmail(email) && remainingSeconds == 0 }
  var canVerify: Bool { !busy && !registered && !outcomeUnknown && regionCode != nil && RecoveryInput.validEmail(email) && RecoveryInput.validCode(code) }
  var hasReadBoth: Bool { readAgreements.count == AgreementKind.allCases.count }
  var canRegister: Bool {
    account.revision == accountRevision && account.session == nil && account.pendingLogoutCleanupRevision == nil && !busy && !registered && !outcomeUnknown && hasReadBoth && consent &&
      verified?.email == email && verified?.code == code && verified?.region == regionCode && regionCode != nil
  }

  init(service: any RegistrationCaptchaService, account: AccountService, cooldowns: PasswordRecoveryCooldowns, brandID: String?) {
    self.service = service
    self.account = account; accountRevision = account.revision
    self.cooldowns = cooldowns
    self.brandID = brandID
  }
  deinit { task?.cancel() }

  func updateEmail(_ value: String) {
    let value = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard email != value, !registered else { return }
    invalidateOperation()
    email = value
    code = ""
    verified = nil
    message = nil
    onChange?()
  }
  func updateCode(_ value: String) {
    guard code != value, !registered else { return }
    invalidateOperation()
    code = value
    verified = nil
    message = nil
    onChange?()
  }
  func selectRegion(_ value: String) {
    guard Locale.isoRegionCodes.contains(value), value != regionCode, !registered else { return }
    invalidateOperation()
    regionCode = value
    agreementRevision += 1
    code = ""
    verified = nil
    readAgreements.removeAll()
    consent = false
    message = "地区已更改，请重新阅读协议和校验验证码"
    onChange?()
  }
  func agreementContext() throws -> AgreementContext {
    guard let regionCode else { throw RowanFailure(code: 400, message: "请先选择国家或地区") }
    return try AgreementContext(regionCode: regionCode, brandID: brandID)
  }
  /// Called only by the real reader's post-countdown/bottom completion callback.
  func completeReading(_ kind: AgreementKind, context: AgreementContext, revision: Int) {
    guard !registered, revision == agreementRevision, let current = try? agreementContext(), current == context else { return }
    readAgreements.insert(kind)
    onChange?()
  }
  func setConsent(_ value: Bool) { consent = value && hasReadBoth; onChange?() }
  func cancel() { invalidateOperation(); verified = nil; onChange?() }
  private func invalidateOperation() {
    if operation == .registering {
      outcomeUnknown = true
      message = "注册结果未确认，请返回登录页确认，不要重复注册"
    }
    generation += 1
    task?.cancel()
    task = nil
    operation = nil
  }
  func sendCode() {
    guard canSend else { return }
    verified = nil
    code = ""
    cooldowns.reserve(for: email, purpose: .register)
    let email = email
    start(.sending, work: { [service] in try await service.sendCode(email: email) }) { [self] in
      cooldowns.reserve(for: email, purpose: .register)
      message = "验证码已发送，请查看邮箱"
    }
  }
  func verifyCode() {
    guard canVerify, let region = regionCode else { return }
    let email = email, code = code
    start(.verifying, work: { [service] in try await service.verifyCode(email: email, code: code) }) { [self] in
      verified = (email, code, region)
      message = "验证码校验通过"
    }
  }
  func register(password: String, confirmation: String) {
    guard !busy, !registered, !outcomeUnknown else { return }
    guard canRegister, let regionCode else {
      message = "请先选择地区、完成协议阅读并同意，再校验当前邮箱验证码"; onChange?(); return
    }
    guard RecoveryInput.validPassword(password), password == confirmation else {
      message = "密码需为8–12个字符，包含数字和英文字母且不含空白，两次输入须一致"; onChange?(); return
    }
    let email = email, code = code
    let expectedRevision = accountRevision
    start(.registering, work: { [weak self, account] in
      guard let self else { throw CancellationError() }
      try await account.register(email: email, password: password, captcha: code, regionCode: regionCode, expectedRevision: expectedRevision, onReserved: { [weak self] receipt in
        guard let self, account.revision == receipt.revision, account.session == nil, account.pendingLogoutCleanupRevision == nil else { return }
        accountRevision = receipt.revision
      })
    }) { [self] in
      registered = true
      verified = nil
      message = nil
    }
  }
  private func start(_ operation: Operation, work: @escaping () async throws -> Void, success: @escaping () -> Void) {
    guard !busy else { return }
    generation += 1
    let expected = generation
    self.operation = operation
    message = nil
    onChange?()
    task = Task { [weak self] in
      defer {
        if let self, generation == expected { self.operation = nil; self.task = nil; onChange?() }
      }
      do {
        try await work()
        try Task.checkCancellation()
        guard let self, generation == expected else { return }
        success()
      } catch {
        guard let self, generation == expected else { return }
        let code = (error as? RowanFailure)?.code
        if operation == .registering && ![1161, 1162, 1163, 400, 499].contains(code ?? 0) {
          outcomeUnknown = true
          message = "注册结果未确认，请返回登录页确认，不要重复注册"
        } else {
          message = (error as? RowanFailure)?.message ?? "网络异常，请重试"
        }
        if operation == .registering, [1161, 1162].contains(code ?? 0) { verified = nil }
      }
    }
  }
}

import Foundation

@MainActor
protocol PasswordRecoveryService {
  func sendCode(email: String) async throws
  func verifyCode(email: String, code: String) async throws
  func resetPassword(email: String, code: String, password: String) async throws
}

enum RecoveryInput {
  static func validEmail(_ value: String) -> Bool {
    value.range(of: "\\A[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\z", options: .regularExpression) != nil
  }
  static func validCode(_ value: String) -> Bool {
    value.count == 6 && value.allSatisfy { $0 >= "0" && $0 <= "9" }
  }
  static func validPassword(_ value: String) -> Bool {
    (8...12).contains(value.count) && value.rangeOfCharacter(from: .whitespacesAndNewlines) == nil &&
      value.range(of: "[A-Za-z]", options: .regularExpression) != nil &&
      value.range(of: "[0-9]", options: .regularExpression) != nil
  }
}

/// Shared across flow instances so leaving/reopening or changing email case cannot bypass the local gate.
enum EmailCaptchaPurpose: String { case register, forget, login }

@MainActor
final class PasswordRecoveryCooldowns {
  private let now: () -> TimeInterval
  private var deadlines: [String: TimeInterval] = [:]
  private var sends: [String: UUID] = [:]
  init(now: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }) { self.now = now }
  func remaining(for email: String, purpose: EmailCaptchaPurpose = .forget) -> Int {
    max(0, Int(ceil((deadlines["\(purpose.rawValue):\(email.lowercased())"] ?? 0) - now())))
  }
  func pendingSend(for email: String, purpose: EmailCaptchaPurpose) -> Bool { sends["\(purpose.rawValue):\(email.lowercased())"] != nil }
  func beginSend(for email: String, purpose: EmailCaptchaPurpose) -> UUID? {
    guard !pendingSend(for: email, purpose: purpose), reserveIfAvailable(for: email, purpose: purpose) else { return nil }
    let id = UUID(); sends["\(purpose.rawValue):\(email.lowercased())"] = id; return id
  }
  func finishSend(for email: String, purpose: EmailCaptchaPurpose, permit: UUID) {
    let key = "\(purpose.rawValue):\(email.lowercased())"; if sends[key] == permit { sends.removeValue(forKey: key) }
  }
  func reserveIfAvailable(for email: String, purpose: EmailCaptchaPurpose) -> Bool {
    guard remaining(for: email, purpose: purpose) == 0 else { return false }
    reserve(for: email, purpose: purpose); return true
  }
  func reserve(for email: String, purpose: EmailCaptchaPurpose = .forget) {
    deadlines["\(purpose.rawValue):\(email.lowercased())"] = now() + 60
  }
}

@MainActor
final class PasswordRecoveryModel {
  enum Stage: Equatable { case account, verification, password, success }
  enum Operation: Equatable { case sending, verifying, resetting }
  private let service: any PasswordRecoveryService
  private let account: AccountService
  private let cooldowns: PasswordRecoveryCooldowns
  private var generation = 0
  private var task: Task<Void, Never>?
  private var verified: (email: String, code: String)?
  private var confirmedReset = false
  private var cleanupRevision: Int?
  private(set) var email = ""
  private(set) var code = ""
  private(set) var stage = Stage.account
  private(set) var operation: Operation?
  private(set) var message: String?
  private(set) var resetOutcomeUnknown = false
  var onChange: (() -> Void)?
  var remainingSeconds: Int { cooldowns.remaining(for: email) }
  var busy: Bool { operation != nil }
  var needsLocalCleanup: Bool { confirmedReset && stage != .success }
  var canSend: Bool { !busy && !confirmedReset && !resetOutcomeUnknown && RecoveryInput.validEmail(email) && remainingSeconds == 0 }
  var canVerify: Bool { !busy && stage == .verification && RecoveryInput.validCode(code) }

  init(service: any PasswordRecoveryService, account: AccountService, cooldowns: PasswordRecoveryCooldowns) {
    self.service = service
    self.account = account
    self.cooldowns = cooldowns
  }
  deinit { task?.cancel() }

  func updateEmail(_ value: String) {
    let value = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard value != email, !confirmedReset else { return }
    cancel()
    email = value
    code = ""
    resetOutcomeUnknown = false
    verified = nil
    stage = .account
    message = nil
    onChange?()
  }
  func updateCode(_ value: String) {
    guard value != code, !confirmedReset else { return }
    cancel()
    code = value
    resetOutcomeUnknown = false
    verified = nil
    stage = .verification
    message = nil
    onChange?()
  }
  func cancel() {
    generation += 1
    task?.cancel()
    task = nil
    operation = nil
    verified = nil
    if stage == .password && !confirmedReset { stage = .verification }
  }
  func sendCode() {
    guard canSend else { return }
    verified = nil
    code = ""
    stage = .verification
    resetOutcomeUnknown = false
    // Sending is side-effecting despite HTTP GET. Reserve even if its result becomes unknown.
    cooldowns.reserve(for: email)
    let email = email
    start(.sending, work: { [service] in try await service.sendCode(email: email) }) { [self] in
      cooldowns.reserve(for: email)
      stage = .verification
      message = "验证码已发送，请查看邮箱"
    }
  }
  func verifyCode() {
    guard canVerify else { return }
    let email = email, code = code
    start(.verifying, work: { [service] in try await service.verifyCode(email: email, code: code) }) { [self] in
      verified = (email, code)
      stage = .password
      message = nil
    }
  }
  func reset(password: String, confirmation: String) {
    guard !busy, !resetOutcomeUnknown else { return }
    if confirmedReset {
      start(.resetting, work: {}) { [self] in try await finishReset() }
      return
    }
    guard stage == .password, let verified, verified.email == email, verified.code == code else {
      message = "请先校验当前邮箱的验证码"; onChange?(); return
    }
    guard RecoveryInput.validPassword(password), password == confirmation else {
      message = "密码需为8–12个字符，包含数字和英文字母且不含空白，两次输入须一致"; onChange?(); return
    }
    let expectedRevision = account.revision
    start(.resetting, work: { [service] in
      try await service.resetPassword(email: verified.email, code: verified.code, password: password)
    }) { [self] in
      confirmedReset = true
      cleanupRevision = expectedRevision
      try await finishReset()
    }
  }
  private func finishReset() async throws {
    guard let expected = cleanupRevision, expected == account.revision else { throw RowanFailure(code: 499, message: "会话已变化，请重新进入登录页") }
    let completedRevision = account.pendingLogoutCleanupRevision == expected ? expected : expected + 1
    do { try await account.clearLocal(expectedRevision: expected) }
    catch let failure as AccountLogoutCleanupFailure { cleanupRevision = failure.expectedRevision; throw failure }
    catch is CancellationError {
      if account.revision == completedRevision, account.session == nil, account.pendingLogoutCleanupRevision == nil { cleanupRevision = completedRevision }
      throw CancellationError()
    }
    guard account.revision == completedRevision, account.session == nil else { throw RowanFailure(code: 499, message: "会话已变化，请重新进入登录页") }
    verified = nil
    stage = .success
    message = "密码重置成功，请使用新密码登录"
  }
  private func start(_ operation: Operation, work: @escaping () async throws -> Void, success: @escaping () async throws -> Void) {
    guard !busy else { return }
    generation += 1
    let expected = generation
    self.operation = operation
    message = nil
    onChange?()
    task = Task { [weak self] in
      defer {
        if let self, generation == expected {
          self.operation = nil
          self.task = nil
          onChange?()
        }
      }
      do {
        try await work()
        try Task.checkCancellation()
        guard let self, generation == expected else { return }
        do { try await success(); try Task.checkCancellation() }
        catch is CancellationError { throw CancellationError() }
        catch {
          guard generation == expected else { return }
          if (error as? RowanFailure)?.code == 499 { resetOutcomeUnknown = true }
          message = (error as? RowanFailure)?.message ?? "密码已重置，本地会话清理失败，请重试清理"
        }
      } catch is CancellationError {
        if let self, generation == expected, operation == .resetting, !confirmedReset {
          resetOutcomeUnknown = true
          message = "重置结果未确认，请返回登录页尝试新密码，不要重复提交"
        }
        return
      }
      catch {
        guard let self, generation == expected else { return }
        message = (error as? RowanFailure)?.message ?? (operation == .resetting ? "重置结果未确认，请先尝试新密码登录，不要重复提交" : "网络异常，请重试")
        if operation == .resetting, ![1211, 1212, 1213, 1214].contains((error as? RowanFailure)?.code ?? 0) {
          resetOutcomeUnknown = true
          message = "重置结果未确认，请返回登录页尝试新密码，不要重复提交"
        }
        if operation == .resetting, [1212, 1213].contains((error as? RowanFailure)?.code ?? 0) {
          verified = nil
          stage = .verification
        }
      }
    }
  }
}

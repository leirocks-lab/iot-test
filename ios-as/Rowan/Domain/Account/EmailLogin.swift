import Foundation

enum AccountLoginMode: String, Sendable { case password, captcha }
struct AccountLoginReceipt: Sendable { let revision: Int } // Native authority only; never tokens/RN session.
enum AccountLoginCredential: Sendable, CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable {
  case password(String), captcha(String)
  var mode: AccountLoginMode { switch self { case .password: return .password; case .captcha: return .captcha } }
  var pin: String { switch self { case let .password(value), let .captcha(value): return value } }
  var valid: Bool { mode == .captcha ? RecoveryInput.validCode(pin) : !pin.isEmpty }
  var description: String { "AccountLoginCredential(redacted)" }
  var debugDescription: String { description }
  var customMirror: Mirror { Mirror(self, children: ["redacted": true], displayStyle: .enum) }
}
@MainActor protocol EmailLoginCodeService {
  func sendCode(email: String) async throws
  func remaining(email: String) -> Int
  func pending(email: String) -> Bool
}

/// UI owns input/operation generations; AccountService alone owns session acceptance and persistence.
@MainActor
final class EmailLoginModel {
  private let account: AccountService, codes: any EmailLoginCodeService
  private var expectedRevision: Int
  private var active = true, generation = 0
  private var cancelOperation: (() -> Void)?
  private(set) var mode = AccountLoginMode.password
  private(set) var email = "", password = "", code = "", status = ""
  private(set) var consent = false, busy = false
  init(account: AccountService, codes: any EmailLoginCodeService) { self.account = account; self.codes = codes; expectedRevision = account.revision }
  var cooldownSeconds: Int { codes.remaining(email: email) }
  private var current: Bool { active && account.revision == expectedRevision && account.session == nil && account.pendingLogoutCleanupRevision == nil }
  var contextCurrent: Bool { current }
  var canSend: Bool { current && !busy && consent && mode == .captcha && RecoveryInput.validEmail(email) && cooldownSeconds == 0 && !codes.pending(email: email) }
  var canSubmit: Bool { current && !busy && consent && RecoveryInput.validEmail(email) && (mode == .password ? !password.isEmpty : RecoveryInput.validCode(code)) }
  func setMode(_ value: AccountLoginMode) { guard mode != value else { return }; invalidate(); mode = value; password = ""; code = ""; status = "" }
  func setEmail(_ value: String) { let value = value.trimmingCharacters(in: .whitespacesAndNewlines); guard email != value else { return }; invalidate(); email = value; password = ""; code = "" }
  func setPassword(_ value: String) { guard password != value else { return }; invalidate(); password = value }
  func setCode(_ value: String) { guard code != value else { return }; invalidate(); code = value }
  func setConsent(_ value: Bool) { guard consent != value else { return }; invalidate(); consent = value }
  func deactivate() { invalidate(); active = false; password = ""; code = "" }
  /// Explicit native page re-entry after agreement/recovery; never rebind onto an authenticated B.
  func rebindLoggedOut() {
    guard account.session == nil, account.pendingLogoutCleanupRevision == nil else { return }
    active = true // Re-entering while old actual I/O drains must not strand the page inactive.
    guard !busy else { return } // Keep its original authority; never adopt another attempt's R.
    invalidate(); expectedRevision = account.revision; active = true; password = ""; code = ""
  }
  private func invalidate() { generation += 1; cancelOperation?() }
  private func operation<T: Sendable>(_ work: @escaping @MainActor () async throws -> T) async throws -> T {
    guard !busy else { throw RowanFailure(code: 409, message: "操作进行中，请稍候") }
    busy = true
    let worker = Task { @MainActor in try Task.checkCancellation(); return try await work() }
    cancelOperation = { worker.cancel() }
    defer { busy = false; cancelOperation = nil }
    return try await withTaskCancellationHandler(operation: { let value = try await worker.value; try Task.checkCancellation(); return value }, onCancel: { worker.cancel() })
  }
  func sendCode() async throws {
    guard canSend else { throw RowanFailure(code: 400, message: "请同意协议并核对邮箱或倒计时") }
    let enteredEmail = email, ticket = generation; status = "正在发送验证码…"
    do {
      try await operation { [self] in
        guard current, generation == ticket else { throw RowanFailure(code: 499, message: "页面或账号已变化") }
        try await codes.sendCode(email: enteredEmail); try Task.checkCancellation()
        guard current, generation == ticket else { throw RowanFailure(code: 499, message: "页面或账号已变化") }
      }
      try Task.checkCancellation()
      guard current, generation == ticket else { throw RowanFailure(code: 499, message: "页面或账号已变化") }
      status = "验证码已发送"
    } catch { if generation == ticket { status = "发送未确认，请等待倒计时后重试" }; throw error }
  }
  func submit() async throws -> Bool {
    guard canSubmit else { throw RowanFailure(code: 400, message: "请同意协议并核对邮箱与登录信息") }
    let enteredEmail = email, credential: AccountLoginCredential = mode == .password ? .password(password) : .captcha(code)
    let ticket = generation, revision = expectedRevision; status = "正在登录…"
    do {
      let receipt = try await operation { [self] in
        guard current, generation == ticket else { throw RowanFailure(code: 499, message: "页面或账号已变化") }
        return try await account.login(account: enteredEmail, credential: credential, expectedRevision: revision, onReserved: { [weak self] receipt in
          // Authority belongs to this native attempt even while its page is paused. Recording
          // its exact receipt does not activate the page or restore credentials/navigation.
          guard let self, account.revision == receipt.revision,
                account.session == nil, account.pendingLogoutCleanupRevision == nil else { return }
          expectedRevision = receipt.revision // This attempt's own clear/reservation, not another login.
        })
      }
      guard active, generation == ticket, account.revision == receipt.revision, account.session != nil,
            account.pendingLogoutCleanupRevision == nil else { throw RowanFailure(code: 499, message: "页面或账号已变化") }
      password = ""; code = ""; return true
    } catch {
      if generation == ticket {
        if account.pendingLogoutCleanupRevision != nil { status = "本地会话清理未完成，请返回入口重试清理" }
        else if let failure = error as? RowanFailure, [1181, 1182].contains(failure.code), mode == .captcha { status = "验证码错误或已过期，请核对后重试" }
        else if let failure = error as? RowanFailure, [1183, 1184].contains(failure.code) { status = "登录信息有误，请核对后重试" }
        else { status = "登录未确认，请核对登录信息后重试" }
      }
      throw error
    }
  }
}

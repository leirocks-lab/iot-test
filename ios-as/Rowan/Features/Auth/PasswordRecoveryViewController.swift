import UIKit

@MainActor
final class PasswordRecoveryViewController: AccountPageViewController {
  override var topSpacing: CGFloat { 16 }
  private let model: PasswordRecoveryModel
  private let returned: (Bool) -> Void
  private var timer: Timer?
  private var returnedOnce = false
  private let lock = AccountDesign.hero("AuthRecoveryLock")
  private let envelope = AccountDesign.hero("AuthEnvelope")
  private let heading = AccountDesign.label(16, centered: true, weight: .semibold)
  private let descriptionLabel = AccountDesign.label(14, centered: true)
  private let email = AccountTextField("请输入您的邮箱账号", icon: "AuthEmail")
  private let code = AccountCodeView()
  private let password = AccountTextField("请设置您的密码", icon: "AuthLock", secure: true)
  private let confirmation = AccountTextField("请再次确认密码", icon: "AuthLock", secure: true)
  private let next = UIButton(type: .system)
  private let resend = UIButton(type: .system)
  private let status = AccountDesign.label(14, centered: true)

  init(model: PasswordRecoveryModel, returned: @escaping (Bool) -> Void) {
    self.model = model; self.returned = returned
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { timer?.invalidate() }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "找回密码"
    email.keyboardType = .emailAddress; email.textContentType = .username; email.text = model.email
    password.textContentType = .newPassword; confirmation.textContentType = .newPassword
    for field in [email, password, confirmation] { field.addTarget(self, action: #selector(inputChanged(_:)), for: .editingChanged) }
    code.addTarget(self, action: #selector(codeChanged), for: .valueChanged)
    next.addTarget(self, action: #selector(advance), for: .touchUpInside)
    resend.titleLabel?.font = AccountDesign.font(14)
    resend.addTarget(self, action: #selector(sendAgain), for: .touchUpInside)
    for item in [lock, envelope, heading, descriptionLabel, email, code, password, confirmation, next, resend, status] { form.addArrangedSubview(item) }
    form.setCustomSpacing(40, after: descriptionLabel)
    form.setCustomSpacing(40, after: email)
    form.setCustomSpacing(40, after: code)
    form.setCustomSpacing(40, after: confirmation)
    form.setCustomSpacing(12, after: next)
    model.onChange = { [weak self] in self?.render() }
    render()
  }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in Task { @MainActor [weak self] in self?.render() } }
  }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    timer?.invalidate(); timer = nil
    if isMovingFromParent || navigationController?.isBeingDismissed == true {
      model.cancel(); password.text = nil; confirmation.text = nil
    }
  }
  @objc private func inputChanged(_ field: UITextField) {
    if field === email { model.updateEmail(email.text ?? "") }
    render()
  }
  @objc private func codeChanged() { model.updateCode(code.text) }
  @objc private func sendAgain() { view.endEditing(true); model.sendCode() }
  @objc private func advance() {
    view.endEditing(true)
    if model.resetOutcomeUnknown {
      returned(false); navigationController?.popViewController(animated: true)
    } else if model.stage == .account { model.sendCode() }
    else if model.stage == .verification { model.verifyCode() }
    else if model.stage == .password { model.reset(password: password.text ?? "", confirmation: confirmation.text ?? "") }
  }
  private func render() {
    if model.stage == .success {
      guard !returnedOnce else { return }; returnedOnce = true
      password.text = nil; confirmation.text = nil
      returned(true)
      navigationController?.popViewController(animated: true)
      return
    }
    let verification = model.stage == .verification
    let passwordStage = model.stage == .password
    lock.isHidden = verification; envelope.isHidden = !verification
    heading.isHidden = verification
    heading.text = passwordStage ? "请输入新的密码" : "通过邮箱找回"
    descriptionLabel.isHidden = !verification
    descriptionLabel.attributedText = AccountDesign.codeDescription(email: model.email)
    email.isHidden = model.stage != .account
    code.isHidden = !verification
    password.isHidden = !passwordStage; confirmation.isHidden = !passwordStage
    if !passwordStage || model.needsLocalCleanup || model.resetOutcomeUnknown { password.text = nil; confirmation.text = nil }
    let locked = model.busy || model.needsLocalCleanup || model.resetOutcomeUnknown
    for field in [email, password, confirmation] { field.isEnabled = !locked }
    code.isEnabled = !locked
    if code.text != model.code { code.text = model.code }
    var enabled = false
    if model.resetOutcomeUnknown { next.setTitle("返回登录确认结果", for: .normal); enabled = true }
    else if model.needsLocalCleanup { next.setTitle("重试本地会话清理", for: .normal); enabled = !model.busy }
    else if passwordStage {
      next.setTitle("下一步", for: .normal)
      enabled = !model.busy && RecoveryInput.validPassword(password.text ?? "") && password.text == confirmation.text
    } else if verification { next.setTitle("确认", for: .normal); enabled = model.canVerify }
    else { next.setTitle("下一步", for: .normal); enabled = model.canSend }
    AccountDesign.mainButton(next, enabled: enabled)
    resend.isHidden = !verification || model.resetOutcomeUnknown
    resend.isEnabled = model.canSend
    resend.setTitle(model.remainingSeconds > 0 ? "没收到验证码？  \(model.remainingSeconds)S 重新发送" : "没收到验证码？ 重新发送", for: .normal)
    resend.setTitleColor(model.canSend ? AccountDesign.link : AccountDesign.muted, for: .normal)
    status.text = model.busy ? (model.operation == .sending ? "正在发送…" : model.operation == .verifying ? "正在校验…" : "正在重置…") : model.message
    if passwordStage && !model.busy && status.text == nil {
      if !(password.text ?? "").isEmpty && !RecoveryInput.validPassword(password.text ?? "") {
        status.text = "密码需为8–12个字符，包括数字和英文，不含空白"
      } else if !(confirmation.text ?? "").isEmpty && password.text != confirmation.text { status.text = "两次输入的密码不一致" }
    }
    status.isHidden = status.text?.isEmpty != false
  }
}

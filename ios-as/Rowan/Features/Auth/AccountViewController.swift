import UIKit

@MainActor
final class AccountViewController: AccountPageViewController {
  private let account: AccountService
  private let model: EmailLoginModel
  private var countdown: Task<Void, Never>?
  private let captcha = AccountTextField("请输入6位验证码", icon: "AuthLock")
  private let sendCode = UIButton(type: .system), switchMode = UIButton(type: .system)
  private let codeRow = UIStackView()
  private let authenticated: () -> Void
  private let agreements: any AgreementContentService
  private let brandID: String?
  private var selectedRegionCode: String?
  private var task: Task<Void, Never>?
  private var generation = 0
  private var busy = false
  private let email = AccountTextField("请输入您的邮箱账号", icon: "AuthEmail")
  private let password = AccountTextField("请输入您的密码", icon: "AuthLock", secure: true)
  private let consent = AccountConsentView()
  private let login = UIButton(type: .system)
  private let status = AccountDesign.label(14)

  init(account: AccountService, agreements: any AgreementContentService, brandID: String?, codes: (any EmailLoginCodeService)? = nil, authenticated: @escaping () -> Void) {
    model = EmailLoginModel(account: account, codes: codes ?? RowanAppServices.shared.emailLoginCodes)
    self.account = account; self.agreements = agreements; self.brandID = brandID; self.authenticated = authenticated
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { task?.cancel(); countdown?.cancel() }

  override func viewDidLoad() {
    super.viewDidLoad()
    addHeading("登录")
    email.keyboardType = .emailAddress; email.textContentType = .username
    password.textContentType = .password
    email.addTarget(self, action: #selector(emailChanged), for: .editingChanged)
    password.addTarget(self, action: #selector(passwordChanged), for: .editingChanged)
    captcha.addTarget(self, action: #selector(codeChanged), for: .editingChanged)
    for field in [email, password] { form.addArrangedSubview(field) }
    captcha.keyboardType = .numberPad; captcha.textContentType = .oneTimeCode
    codeRow.axis = .horizontal; codeRow.spacing = 8
    codeRow.addArrangedSubview(captcha); codeRow.addArrangedSubview(sendCode)
    sendCode.setContentHuggingPriority(.required, for: .horizontal)
    sendCode.addTarget(self, action: #selector(requestCode), for: .touchUpInside)
    form.addArrangedSubview(codeRow); form.setCustomSpacing(40, after: codeRow)
    email.accessibilityIdentifier = "login_email"; password.accessibilityIdentifier = "login_password"
    captcha.accessibilityIdentifier = "login_code"; sendCode.accessibilityIdentifier = "login_send_code"
    login.accessibilityIdentifier = "login_submit"; switchMode.accessibilityIdentifier = "login_mode"
    status.accessibilityIdentifier = "login_status"
    form.setCustomSpacing(40, after: password)
    consent.changed = { [weak self] selected in self?.consent.selected = selected; self?.model.setConsent(selected); self?.updateEnabled() }
    consent.open = { [weak self] kind in self?.openAgreement(kind) }
    form.addArrangedSubview(consent)
    form.setCustomSpacing(2, after: consent)
    login.setTitle("登录", for: .normal)
    login.addTarget(self, action: #selector(submit), for: .touchUpInside)
    form.addArrangedSubview(login)
    form.addArrangedSubview(status)
    switchMode.addTarget(self, action: #selector(changeMode), for: .touchUpInside)
    form.addArrangedSubview(switchMode)
    let forgot = UIButton(type: .system)
    forgot.setTitle("忘记密码", for: .normal)
    forgot.addTarget(self, action: #selector(openPasswordRecovery), for: .touchUpInside)
    addFooter(forgot)
    updateEnabled()
  }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    model.rebindLoggedOut(); password.text = nil; captcha.text = nil
    countdown?.cancel(); countdown = Task { [weak self] in
      while !Task.isCancelled { self?.updateEnabled(); do { try await Task.sleep(nanoseconds: 1_000_000_000) } catch { return } }
    }
    let stored = UserDefaults.standard.string(forKey: "rowan.selectedRegionCode")
      .flatMap { Locale.isoRegionCodes.contains($0) ? $0 : nil }
    if selectedRegionCode != stored { selectedRegionCode = stored; consent.selected = false; model.setConsent(false) }
    updateEnabled()
  }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    model.deactivate(); task?.cancel(); countdown?.cancel(); password.text = nil; captcha.text = nil
    if isMovingFromParent || navigationController?.isBeingDismissed == true {
      generation += 1; task?.cancel(); task = nil; password.text = nil; busy = false
    }
  }
  @objc private func updateEnabled() {
    // S008 gates registration reading. Existing-account login remains available during content outages.
    consent.checkbox.isEnabled = !busy
    email.isEnabled = !busy; password.isEnabled = !busy
    password.isHidden = model.mode == .captcha; codeRow.isHidden = model.mode == .password
    captcha.isEnabled = !busy; sendCode.isEnabled = !busy && model.canSend
    sendCode.setTitle(model.cooldownSeconds > 0 ? "\(model.cooldownSeconds)s后重发" : "获取验证码", for: .normal)
    switchMode.setTitle(model.mode == .password ? "使用验证码登录" : "使用密码登录", for: .normal)
    let enabled = !busy && model.canSubmit
    AccountDesign.mainButton(login, enabled: enabled)
    status.isHidden = status.text?.isEmpty != false
  }
  private func openAgreement(_ kind: AgreementKind) {
    guard !busy else { return }
    do {
      let context = try AgreementContext(regionCode: selectedRegionCode, brandID: brandID)
      let reader = AgreementViewController(kind: kind, context: context, service: agreements) { [weak self] in
        self?.status.text = "协议已阅读，请勾选同意"; self?.updateEnabled()
      }
      navigationController?.pushViewController(reader, animated: true)
    } catch { status.text = (error as? RowanFailure)?.message ?? "协议配置无效"; updateEnabled() }
  }
  @objc private func openPasswordRecovery() {
    guard !busy, model.contextCurrent else { return }
    let services = RowanAppServices.shared
    let model = PasswordRecoveryModel(service: services.passwordRecovery, account: account, cooldowns: services.recoveryCooldowns)
    model.updateEmail(email.text ?? "")
    let controller = PasswordRecoveryViewController(model: model) { [weak self] success in
      self?.password.text = nil
      self?.status.textColor = AccountDesign.ink
      self?.status.text = success ? "密码重置成功，请使用新密码登录" : "请尝试新密码以确认重置结果"
      self?.updateEnabled()
    }
    navigationController?.pushViewController(controller, animated: true)
  }
  @objc private func emailChanged() {
    model.setEmail(email.text ?? ""); model.setPassword(""); model.setCode("")
    password.text = nil; captcha.text = nil; updateEnabled()
  }
  @objc private func passwordChanged() { model.setPassword(password.text ?? ""); updateEnabled() }
  @objc private func codeChanged() { model.setCode(captcha.text ?? ""); updateEnabled() }
  @objc private func changeMode() {
    model.setMode(model.mode == .password ? .captcha : .password)
    password.text = nil; captcha.text = nil; status.text = ""; updateEnabled()
  }
  @objc private func requestCode() { guard !busy, model.canSend else { return }; perform(sending: true) }
  @objc private func submit() { guard !busy, model.canSubmit else { return }; perform(sending: false) }
  private func perform(sending: Bool) {
    view.endEditing(true); busy = true; status.text = sending ? "正在发送验证码…" : "正在登录…"; updateEnabled()
    task?.cancel(); generation += 1; let expected = generation
    task = Task { [weak self] in
      guard let self else { return }
      defer { if generation == expected { busy = false; task = nil }; updateEnabled() }
      do {
        let accepted: Bool
        if sending { try await model.sendCode(); accepted = false } else { accepted = try await model.submit() }
        try Task.checkCancellation(); guard generation == expected else { return }
        status.text = model.status
        if accepted { password.text = nil; captcha.text = nil; authenticated() }
      } catch is CancellationError { return }
      catch { guard generation == expected else { return }; status.textColor = .systemRed; status.text = model.status }
    }
  }
}

import UIKit

@MainActor
final class EmailRegistrationViewController: AccountPageViewController {
  private enum Step { case details, verification }
  private let model: EmailRegistrationModel
  private let agreements: any AgreementContentService
  private let authenticated: () -> Void
  private var step = Step.details
  private var timer: Timer?
  private var didNavigate = false
  private var submitAfterVerification = false
  private let details = UIStackView()
  private let verification = UIStackView()
  private let region = UIButton(type: .system)
  private let email = AccountTextField("请输入您的邮箱", icon: "AuthEmail")
  private let password = AccountTextField("请设置您的密码", icon: "AuthLock", secure: true)
  private let confirmation = AccountTextField("请再次确认密码", icon: "AuthLock", secure: true)
  private let consent = AccountConsentView()
  private let begin = UIButton(type: .system)
  private let code = AccountCodeView()
  private let confirm = UIButton(type: .system)
  private let resend = UIButton(type: .system)
  private let descriptionLabel = AccountDesign.label(14, centered: true)
  private let status = AccountDesign.label(14, centered: true)

  init(model: EmailRegistrationModel, agreements: any AgreementContentService, authenticated: @escaping () -> Void) {
    self.model = model; self.agreements = agreements; self.authenticated = authenticated
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { timer?.invalidate() }

  override func viewDidLoad() {
    super.viewDidLoad()
    navigationItem.leftBarButtonItem = UIBarButtonItem(image: UIImage(named: "AuthBack")?.withRenderingMode(.alwaysOriginal), style: .plain, target: self, action: #selector(back))
    for stack in [details, verification] { stack.axis = .vertical; stack.spacing = 16; form.addArrangedSubview(stack) }
    let heading = AccountDesign.label(32); heading.text = "注册"
    heading.textColor = .black
    let height = heading.heightAnchor.constraint(greaterThanOrEqualToConstant: 45)
    height.priority = .defaultHigh; height.isActive = true
    details.addArrangedSubview(heading); details.setCustomSpacing(40, after: heading)
    region.backgroundColor = .white; region.layer.cornerRadius = 8
    region.contentHorizontalAlignment = .leading
    region.contentEdgeInsets = UIEdgeInsets(top: 13, left: 48, bottom: 13, right: 44)
    region.titleLabel?.font = AccountDesign.font(16)
    region.titleLabel?.adjustsFontForContentSizeCategory = true
    region.addTarget(self, action: #selector(selectRegion), for: .touchUpInside)
    for (asset, leading) in [("AuthGlobe", true), ("AuthChevron", false)] {
      let icon = UIImageView(image: UIImage(named: asset)); icon.contentMode = .scaleAspectFit
      icon.translatesAutoresizingMaskIntoConstraints = false; region.addSubview(icon)
      NSLayoutConstraint.activate([icon.widthAnchor.constraint(equalToConstant: 24), icon.heightAnchor.constraint(equalToConstant: 24),
        icon.centerYAnchor.constraint(equalTo: region.centerYAnchor),
        leading ? icon.leadingAnchor.constraint(equalTo: region.leadingAnchor, constant: 16) : icon.trailingAnchor.constraint(equalTo: region.trailingAnchor, constant: -16)])
    }
    region.heightAnchor.constraint(greaterThanOrEqualToConstant: 46).isActive = true
    details.addArrangedSubview(region)
    email.keyboardType = .emailAddress; email.textContentType = .username
    password.textContentType = .newPassword; confirmation.textContentType = .newPassword
    for field in [email, password, confirmation] {
      field.addTarget(self, action: #selector(inputChanged(_:)), for: .editingChanged)
      details.addArrangedSubview(field)
    }
    details.setCustomSpacing(40, after: confirmation)
    consent.changed = { [weak self] value in self?.model.setConsent(value) }
    consent.open = { [weak self] kind in self?.openAgreement(kind) }
    details.addArrangedSubview(consent); details.setCustomSpacing(2, after: consent)
    begin.setTitle("注册", for: .normal)
    begin.addTarget(self, action: #selector(beginVerification), for: .touchUpInside)
    details.addArrangedSubview(begin)
    verification.addArrangedSubview(AccountDesign.hero("AuthEnvelope"))
    verification.addArrangedSubview(descriptionLabel)
    verification.setCustomSpacing(40, after: descriptionLabel)
    code.addTarget(self, action: #selector(codeChanged), for: .valueChanged)
    verification.addArrangedSubview(code); verification.setCustomSpacing(40, after: code)
    confirm.setTitle("确认", for: .normal)
    confirm.addTarget(self, action: #selector(confirmCode), for: .touchUpInside)
    verification.addArrangedSubview(confirm); verification.setCustomSpacing(12, after: confirm)
    resend.titleLabel?.font = AccountDesign.font(14)
    resend.addTarget(self, action: #selector(resendCode), for: .touchUpInside)
    verification.addArrangedSubview(resend)
    form.addArrangedSubview(status)
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
      submitAfterVerification = false; model.cancel(); password.text = nil; confirmation.text = nil
    }
  }
  @objc private func inputChanged(_ sender: UITextField) {
    if sender === email { model.updateEmail(email.text ?? "") }
    render()
  }
  @objc private func codeChanged() { model.updateCode(code.text) }
  @objc private func selectRegion() {
    guard !model.busy else { return }
    navigationController?.pushViewController(RegionSelectionViewController(currentCode: model.regionCode) { [weak self] selected in
      self?.submitAfterVerification = false
      self?.model.selectRegion(selected)
      UserDefaults.standard.set(selected, forKey: "rowan.selectedRegionCode")
    }, animated: true)
  }
  private func openAgreement(_ kind: AgreementKind) {
    guard !model.busy else { return }
    do {
      let context = try model.agreementContext(), revision = model.agreementRevision
      let reader = AgreementViewController(kind: kind, context: context, service: agreements) { [weak self] in
        self?.model.completeReading(kind, context: context, revision: revision)
      }
      navigationController?.pushViewController(reader, animated: true)
    } catch { status.text = (error as? RowanFailure)?.message ?? "请先选择国家或地区"; status.isHidden = false }
  }
  @objc private func beginVerification() {
    guard begin.isEnabled else { return }
    view.endEditing(true)
    step = .verification
    if model.canSend { model.sendCode() } else { render() }
  }
  @objc private func resendCode() { submitAfterVerification = false; model.sendCode() }
  @objc private func confirmCode() {
    view.endEditing(true)
    if model.outcomeUnknown { navigationController?.popViewController(animated: true); return }
    guard model.canVerify else { return }
    submitAfterVerification = true
    model.verifyCode()
  }
  @objc private func back() {
    view.endEditing(true); submitAfterVerification = false
    if step == .verification && !model.outcomeUnknown && model.operation != .registering {
      model.cancel(); step = .details; render()
    } else { model.cancel(); navigationController?.popViewController(animated: true) }
  }
  private func render() {
    if model.registered {
      guard !didNavigate else { return }; didNavigate = true
      password.text = nil; confirmation.text = nil; authenticated(); return
    }
    if submitAfterVerification && model.canRegister {
      submitAfterVerification = false
      model.register(password: password.text ?? "", confirmation: confirmation.text ?? "")
      return
    }
    let codeStep = step == .verification
    title = codeStep ? "邮箱验证" : nil
    setFormTop(codeStep ? 16 : 40)
    let active = codeStep ? verification : details
    let inactive = codeStep ? details : verification
    if inactive.superview != nil { form.removeArrangedSubview(inactive); inactive.removeFromSuperview() }
    if active.superview == nil { form.insertArrangedSubview(active, at: 0) }
    let locked = model.busy || model.outcomeUnknown
    for field in [email, password, confirmation] { field.isEnabled = !locked }
    code.isEnabled = !locked
    region.isEnabled = !locked
    let name = model.regionCode.flatMap { Locale.current.localizedString(forRegionCode: $0) }
    region.setTitle(name ?? "请选择国家或地区", for: .normal)
    region.setTitleColor(name == nil ? AccountDesign.muted : AccountDesign.ink, for: .normal)
    consent.selected = model.consent
    consent.checkbox.isEnabled = !locked && model.hasReadBoth
    let validDetails = model.regionCode != nil && RecoveryInput.validEmail(model.email) &&
      RecoveryInput.validPassword(password.text ?? "") && password.text == confirmation.text && model.hasReadBoth && model.consent
    AccountDesign.mainButton(begin, enabled: !locked && validDetails)
    code.text = model.code
    descriptionLabel.attributedText = AccountDesign.codeDescription(email: model.email)
    AccountDesign.mainButton(confirm, enabled: model.outcomeUnknown || model.canVerify)
    confirm.setTitle(model.outcomeUnknown ? "返回入口确认注册结果" : "确认", for: .normal)
    resend.isEnabled = model.canSend
    resend.setTitle(model.remainingSeconds > 0 ? "没收到验证码？  \(model.remainingSeconds)S 重新发送" : "没收到验证码？ 重新发送", for: .normal)
    resend.setTitleColor(model.canSend ? AccountDesign.link : AccountDesign.muted, for: .normal)
    status.text = model.busy ? (model.operation == .sending ? "正在发送…" : model.operation == .verifying ? "正在校验…" : "正在注册…") : model.message
    if !codeStep && !model.busy && status.text == nil {
      if !(password.text ?? "").isEmpty && !RecoveryInput.validPassword(password.text ?? "") {
        status.text = "密码需为8–12个字符，包括数字和英文，不含空白"
      } else if !(confirmation.text ?? "").isEmpty && password.text != confirmation.text { status.text = "两次输入的密码不一致" }
      else if model.hasReadBoth && !model.consent { status.text = "请勾选同意两份协议" }
      else if model.regionCode == nil { status.text = "请选择地区，并分别阅读隐私政策和用户协议" }
      else if !model.hasReadBoth { status.text = "请分别阅读隐私政策和用户协议" }
    }
    status.isHidden = status.text?.isEmpty != false
    if model.outcomeUnknown { password.text = nil; confirmation.text = nil }
  }
}

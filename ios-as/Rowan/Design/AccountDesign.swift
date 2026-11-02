import UIKit

@MainActor
enum AccountDesign {
  static let background = UIColor(white: 242 / 255, alpha: 1)
  static let ink = UIColor(red: 35 / 255, green: 25 / 255, blue: 22 / 255, alpha: 1)
  static let link = UIColor(red: 24 / 255, green: 109 / 255, blue: 175 / 255, alpha: 1)
  static let muted = UIColor(white: 153 / 255, alpha: 1)
  static func font(_ size: CGFloat, weight: UIFont.Weight = .regular) -> UIFont {
    UIFontMetrics(forTextStyle: .body).scaledFont(for: .systemFont(ofSize: size, weight: weight))
  }
  static func navigation(_ item: UINavigationItem) {
    let appearance = UINavigationBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = background
    appearance.shadowColor = .clear
    appearance.titleTextAttributes = [.font: font(16, weight: .medium), .foregroundColor: ink]
    appearance.setBackIndicatorImage(UIImage(named: "AuthBack")?.withRenderingMode(.alwaysOriginal), transitionMaskImage: UIImage(named: "AuthBack"))
    item.standardAppearance = appearance; item.scrollEdgeAppearance = appearance
    item.backButtonDisplayMode = .minimal
  }
  static func mainButton(_ button: UIButton, enabled: Bool) {
    button.isEnabled = enabled
    button.backgroundColor = enabled ? .black : UIColor.black.withAlphaComponent(0.2)
    button.setTitleColor(.white, for: .normal)
    button.setTitleColor(.white, for: .disabled)
    button.titleLabel?.font = font(16, weight: .semibold)
    button.titleLabel?.adjustsFontForContentSizeCategory = true
    button.titleLabel?.numberOfLines = 0
    button.layer.cornerRadius = 8
    button.contentEdgeInsets = UIEdgeInsets(top: 13, left: 12, bottom: 13, right: 12)
  }
  static func label(_ size: CGFloat, centered: Bool = false, weight: UIFont.Weight = .regular) -> UILabel {
    let label = UILabel()
    label.font = font(size, weight: weight)
    label.adjustsFontForContentSizeCategory = true
    label.textColor = ink
    label.numberOfLines = 0
    label.textAlignment = centered ? .center : .left
    return label
  }
  static func hero(_ name: String) -> UIView {
    let wrapper = UIView()
    let image = UIImageView(image: UIImage(named: name))
    image.contentMode = .scaleAspectFit
    image.isAccessibilityElement = false
    image.translatesAutoresizingMaskIntoConstraints = false
    wrapper.addSubview(image)
    let height = wrapper.heightAnchor.constraint(equalToConstant: 160)
    height.priority = .defaultHigh
    NSLayoutConstraint.activate([height, image.widthAnchor.constraint(equalToConstant: 160),
      image.topAnchor.constraint(equalTo: wrapper.topAnchor), image.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor),
      image.centerXAnchor.constraint(equalTo: wrapper.centerXAnchor)])
    return wrapper
  }
  static func codeDescription(email: String) -> NSAttributedString {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    style.minimumLineHeight = max(24, font(14).lineHeight)
    let value = NSMutableAttributedString(string: "验证码用于验证邮箱\n\(email) 输入验证码进行验证",
      attributes: [.font: font(14), .foregroundColor: ink, .paragraphStyle: style])
    if !email.isEmpty { value.addAttribute(.foregroundColor, value: link, range: (value.string as NSString).range(of: email)) }
    return value
  }
}

@MainActor
class AccountPageViewController: UIViewController {
  let form = UIStackView()
  let content = UIView()
  let scroll = UIScrollView()
  var topSpacing: CGFloat { 40 }
  private var bottom: NSLayoutConstraint?
  private var top: NSLayoutConstraint?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = AccountDesign.background
    AccountDesign.navigation(navigationItem)
    scroll.keyboardDismissMode = .interactive
    scroll.translatesAutoresizingMaskIntoConstraints = false
    content.translatesAutoresizingMaskIntoConstraints = false
    form.translatesAutoresizingMaskIntoConstraints = false
    form.axis = .vertical
    form.spacing = 16
    view.addSubview(scroll); scroll.addSubview(content); content.addSubview(form)
    NSLayoutConstraint.activate([
      scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      scroll.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
      scroll.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
      scroll.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
      content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
      content.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
      content.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
      content.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
      content.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor),
      content.heightAnchor.constraint(greaterThanOrEqualTo: scroll.frameLayoutGuide.heightAnchor),
      form.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 47),
      form.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -48),
      content.bottomAnchor.constraint(greaterThanOrEqualTo: form.bottomAnchor, constant: 32)
    ])
    let top = form.topAnchor.constraint(equalTo: content.topAnchor, constant: topSpacing)
    top.isActive = true
    self.top = top
    let bottom = content.bottomAnchor.constraint(equalTo: form.bottomAnchor, constant: 32)
    bottom.priority = .defaultLow
    bottom.isActive = true
    self.bottom = bottom
  }
  func setFormTop(_ spacing: CGFloat) { top?.constant = spacing }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    navigationController?.setNavigationBarHidden(false, animated: animated)
    navigationController?.navigationBar.tintColor = .black
  }
  func addHeading(_ text: String) {
    let label = AccountDesign.label(32)
    label.textColor = .black
    label.text = text
    let height = label.heightAnchor.constraint(greaterThanOrEqualToConstant: 45)
    height.priority = .defaultHigh; height.isActive = true
    form.addArrangedSubview(label)
    form.setCustomSpacing(40, after: label)
  }
  func addFooter(_ button: UIButton) {
    bottom?.isActive = false
    button.translatesAutoresizingMaskIntoConstraints = false
    button.setTitleColor(AccountDesign.link, for: .normal)
    button.titleLabel?.font = AccountDesign.font(16)
    button.titleLabel?.adjustsFontForContentSizeCategory = true
    content.addSubview(button)
    NSLayoutConstraint.activate([
      button.centerXAnchor.constraint(equalTo: content.centerXAnchor),
      button.topAnchor.constraint(greaterThanOrEqualTo: form.bottomAnchor, constant: 32),
      button.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -22),
      button.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)
    ])
  }
}

@MainActor
final class AccountTextField: UITextField {
  private let secureField: Bool
  init(_ placeholder: String, icon: String, secure: Bool = false) {
    secureField = secure
    super.init(frame: .zero)
    self.placeholder = placeholder
    backgroundColor = .white
    layer.cornerRadius = 8
    font = AccountDesign.font(16)
    adjustsFontForContentSizeCategory = true
    textColor = AccountDesign.ink
    attributedPlaceholder = NSAttributedString(string: placeholder, attributes: [.foregroundColor: AccountDesign.muted])
    autocorrectionType = .no; autocapitalizationType = .none
    let left = UIView(frame: CGRect(x: 0, y: 0, width: 48, height: 46))
    let image = UIImageView(image: UIImage(named: icon))
    image.frame = CGRect(x: 16, y: 11, width: 24, height: 24)
    image.contentMode = .scaleAspectFit
    left.addSubview(image); leftView = left; leftViewMode = .always
    if secure {
      isSecureTextEntry = true
      let eye = UIButton(type: .custom)
      eye.frame = CGRect(x: 0, y: 0, width: 44, height: 46)
      if let source = UIImage(named: "AuthPasswordBackground"),
         let crop = source.cgImage?.cropping(to: CGRect(x: 240, y: 11, width: 24, height: 24)) {
        eye.setImage(UIImage(cgImage: crop), for: .normal)
      }
      eye.accessibilityLabel = "显示密码"
      eye.addAction(UIAction { [weak self, weak eye] _ in
        guard let self else { return }
        isSecureTextEntry.toggle()
        eye?.accessibilityLabel = isSecureTextEntry ? "显示密码" : "隐藏密码"
        eye?.isSelected = !isSecureTextEntry
      }, for: .touchUpInside)
      rightView = eye; rightViewMode = .always
    }
    let height = heightAnchor.constraint(greaterThanOrEqualToConstant: 46)
    height.priority = .defaultHigh; height.isActive = true
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override var intrinsicContentSize: CGSize { CGSize(width: UIView.noIntrinsicMetric, height: max(46, (font?.lineHeight ?? 20) + 24)) }
  override func textRect(forBounds bounds: CGRect) -> CGRect { bounds.inset(by: UIEdgeInsets(top: 10, left: 48, bottom: 10, right: secureField ? 44 : 16)) }
  override func editingRect(forBounds bounds: CGRect) -> CGRect { textRect(forBounds: bounds) }
}

@MainActor
final class AccountCodeView: UIControl, UITextFieldDelegate {
  private let input = UITextField()
  private var digits: [UILabel] = []
  var text: String { get { input.text ?? "" } set { if input.text != newValue { input.text = newValue }; refresh() } }
  override var isEnabled: Bool { didSet { input.isEnabled = isEnabled } }
  override init(frame: CGRect) {
    super.init(frame: frame)
    let row = UIStackView()
    row.distribution = .fillEqually; row.spacing = 10
    row.translatesAutoresizingMaskIntoConstraints = false
    for _ in 0..<6 {
      let label = AccountDesign.label(22, centered: true)
      label.isAccessibilityElement = false
      label.backgroundColor = .white; label.layer.cornerRadius = 8; label.clipsToBounds = true
      digits.append(label); row.addArrangedSubview(label)
    }
    addSubview(row)
    input.keyboardType = .numberPad; input.textContentType = .oneTimeCode
    input.textColor = .clear; input.tintColor = .clear
    input.accessibilityLabel = "6位数字验证码"
    input.delegate = self
    input.addTarget(self, action: #selector(changed), for: .editingChanged)
    input.translatesAutoresizingMaskIntoConstraints = false
    addSubview(input)
    NSLayoutConstraint.activate([row.topAnchor.constraint(equalTo: topAnchor), row.bottomAnchor.constraint(equalTo: bottomAnchor),
      row.leadingAnchor.constraint(equalTo: leadingAnchor), row.trailingAnchor.constraint(equalTo: trailingAnchor),
      input.topAnchor.constraint(equalTo: topAnchor), input.bottomAnchor.constraint(equalTo: bottomAnchor),
      input.leadingAnchor.constraint(equalTo: leadingAnchor), input.trailingAnchor.constraint(equalTo: trailingAnchor)])
    let height = heightAnchor.constraint(greaterThanOrEqualToConstant: 46)
    height.priority = .defaultHigh; height.isActive = true
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override var intrinsicContentSize: CGSize { CGSize(width: UIView.noIntrinsicMetric, height: max(46, AccountDesign.font(22).lineHeight + 16)) }
  private func refresh() {
    let values = Array(text)
    for (index, label) in digits.enumerated() { label.text = index < values.count ? String(values[index]) : nil }
  }
  @objc private func changed() { refresh(); sendActions(for: .valueChanged) }
  func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
    guard let current = textField.text, let range = Range(range, in: current) else { return false }
    let value = current.replacingCharacters(in: range, with: string)
    return value.count <= 6 && value.allSatisfy { $0 >= "0" && $0 <= "9" }
  }
}

@MainActor
final class AccountConsentView: UIView, UITextViewDelegate {
  let checkbox = UIButton(type: .custom)
  var selected = false { didSet { checkbox.setImage(UIImage(named: selected ? "AuthChecked" : "AuthUnchecked"), for: .normal); checkbox.accessibilityValue = selected ? "已同意" : "未同意" } }
  var changed: ((Bool) -> Void)?
  var open: ((AgreementKind) -> Void)?
  override init(frame: CGRect) {
    super.init(frame: frame)
    checkbox.accessibilityLabel = "同意隐私政策与用户协议"
    checkbox.accessibilityValue = "未同意"
    checkbox.setImage(UIImage(named: "AuthUnchecked"), for: .normal)
    checkbox.addAction(UIAction { [weak self] _ in guard let self else { return }; changed?(!selected) }, for: .touchUpInside)
    let text = UITextView()
    text.isEditable = false; text.isScrollEnabled = false; text.backgroundColor = .clear
    text.textContainerInset = .zero; text.textContainer.lineFragmentPadding = 0
    text.delegate = self; text.adjustsFontForContentSizeCategory = true
    let paragraph = NSMutableParagraphStyle()
    paragraph.minimumLineHeight = max(24, AccountDesign.font(14).lineHeight)
    let value = NSMutableAttributedString(string: "阅读并同意 隐私政策 与 用户协议", attributes: [.font: AccountDesign.font(14), .foregroundColor: AccountDesign.ink, .paragraphStyle: paragraph])
    for kind in AgreementKind.allCases {
      value.addAttribute(.link, value: "rowan-agreement://read/\(kind.rawValue)", range: (value.string as NSString).range(of: kind.title))
    }
    text.attributedText = value
    text.linkTextAttributes = [.foregroundColor: AccountDesign.link]
    let row = UIStackView(arrangedSubviews: [checkbox, text])
    row.alignment = .center; row.spacing = 8; row.translatesAutoresizingMaskIntoConstraints = false
    addSubview(row)
    NSLayoutConstraint.activate([row.topAnchor.constraint(equalTo: topAnchor), row.bottomAnchor.constraint(equalTo: bottomAnchor),
      row.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16), row.trailingAnchor.constraint(equalTo: trailingAnchor),
      checkbox.widthAnchor.constraint(equalToConstant: 24), checkbox.heightAnchor.constraint(equalToConstant: 44)])
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange, interaction: UITextItemInteraction) -> Bool {
    if interaction == .invokeDefaultAction, URL.scheme == "rowan-agreement",
       let kind = AgreementKind(rawValue: String(URL.path.dropFirst())) { open?(kind) }
    return false
  }
}

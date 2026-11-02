import UIKit

@MainActor
final class WelcomeViewController: UIViewController {
  private let model: WelcomeModel
  private let authenticated: () -> Void
  private let showLogin: () -> Void
  private let showRegistration: () -> Void
  private let entry = UIScrollView()
  private let restoration = UIView()
  private let status = UILabel()
  private var routed = false

  init(model: WelcomeModel, authenticated: @escaping () -> Void, showLogin: @escaping () -> Void,
       showRegistration: @escaping () -> Void) {
    self.model = model
    self.authenticated = authenticated
    self.showLogin = showLogin
    self.showRegistration = showRegistration
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }

  override func viewDidLoad() {
    super.viewDidLoad()
    navigationItem.backButtonDisplayMode = .minimal
    view.backgroundColor = UIColor(red: 242 / 255, green: 242 / 255, blue: 242 / 255, alpha: 1)
    buildEntry()
    buildRestoration()
    model.onChange = { [weak self] in self?.render() }
    render()
  }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    navigationController?.setNavigationBarHidden(true, animated: animated)
  }
  override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); model.restoreIfNeeded() }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    navigationController?.setNavigationBarHidden(false, animated: animated)
    if model.state == .restoring { model.cancelRestoration() }
  }

  private func buildEntry() {
    entry.translatesAutoresizingMaskIntoConstraints = false
    entry.alwaysBounceVertical = false
    view.addSubview(entry)
    let content = UIView()
    content.translatesAutoresizingMaskIntoConstraints = false
    entry.addSubview(content)
    let panel = UIView()
    panel.backgroundColor = UIColor(red: 244 / 255, green: 245 / 255, blue: 246 / 255, alpha: 1)
    panel.translatesAutoresizingMaskIntoConstraints = false
    content.addSubview(panel)
    let logo = logoView(named: "BrandLogo")
    panel.addSubview(logo)
    let login = button(title: "登录", background: .black, foreground: .white)
    login.addAction(UIAction { [weak self] _ in
      guard let self, model.state == .ready else { return }; showLogin()
    }, for: .touchUpInside)
    let register = button(title: "注册", background: .white, foreground: UIColor(red: 51 / 255, green: 44 / 255, blue: 43 / 255, alpha: 1))
    register.addAction(UIAction { [weak self] _ in
      guard let self, model.state == .ready else { return }; showRegistration()
    }, for: .touchUpInside)
    let buttons = UIStackView(arrangedSubviews: [login, register, status])
    buttons.axis = .vertical
    buttons.spacing = 16
    buttons.translatesAutoresizingMaskIntoConstraints = false
    status.numberOfLines = 0
    status.textAlignment = .center
    status.font = .preferredFont(forTextStyle: .footnote)
    status.adjustsFontForContentSizeCategory = true
    status.textColor = .black
    content.addSubview(buttons)
    NSLayoutConstraint.activate([
      entry.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      entry.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
      entry.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
      entry.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
      content.topAnchor.constraint(equalTo: entry.contentLayoutGuide.topAnchor),
      content.bottomAnchor.constraint(equalTo: entry.contentLayoutGuide.bottomAnchor),
      content.leadingAnchor.constraint(equalTo: entry.contentLayoutGuide.leadingAnchor),
      content.trailingAnchor.constraint(equalTo: entry.contentLayoutGuide.trailingAnchor),
      content.widthAnchor.constraint(equalTo: entry.frameLayoutGuide.widthAnchor),
      content.heightAnchor.constraint(greaterThanOrEqualTo: entry.frameLayoutGuide.heightAnchor),
      panel.topAnchor.constraint(equalTo: content.topAnchor),
      panel.leadingAnchor.constraint(equalTo: content.leadingAnchor),
      panel.trailingAnchor.constraint(equalTo: content.trailingAnchor),
      panel.heightAnchor.constraint(equalTo: content.widthAnchor),
      // Exported panel padding is 113/112 horizontally and 145/146 vertically.
      logo.centerXAnchor.constraint(equalTo: panel.centerXAnchor, constant: 0.5),
      logo.centerYAnchor.constraint(equalTo: panel.centerYAnchor, constant: -0.5),
      buttons.topAnchor.constraint(equalTo: panel.bottomAnchor, constant: 40),
      buttons.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 47),
      buttons.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -48),
      content.bottomAnchor.constraint(greaterThanOrEqualTo: buttons.bottomAnchor, constant: 32)
    ])
    let bottom = content.bottomAnchor.constraint(equalTo: buttons.bottomAnchor, constant: 32)
    bottom.priority = .defaultLow
    bottom.isActive = true
  }
  private func buildRestoration() {
    restoration.translatesAutoresizingMaskIntoConstraints = false
    restoration.backgroundColor = UIColor(red: 24 / 255, green: 109 / 255, blue: 175 / 255, alpha: 1)
    view.addSubview(restoration)
    let logo = logoView(named: "BrandLogoWhite")
    restoration.addSubview(logo)
    let spinner = UIActivityIndicatorView(style: .medium)
    spinner.color = .white
    spinner.startAnimating()
    let label = UILabel()
    label.text = "正在恢复登录…"
    label.textColor = .white
    label.font = .preferredFont(forTextStyle: .footnote)
    label.adjustsFontForContentSizeCategory = true
    label.numberOfLines = 0
    label.textAlignment = .center
    let cancel = UIButton(type: .system)
    cancel.setTitle("取消恢复", for: .normal)
    cancel.setTitleColor(.white, for: .normal)
    cancel.titleLabel?.font = .preferredFont(forTextStyle: .body)
    cancel.titleLabel?.adjustsFontForContentSizeCategory = true
    cancel.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
    cancel.addAction(UIAction { [weak self] _ in self?.model.cancelRestoration() }, for: .touchUpInside)
    let progress = UIStackView(arrangedSubviews: [spinner, label, cancel])
    progress.axis = .vertical
    progress.spacing = 12
    progress.translatesAutoresizingMaskIntoConstraints = false
    restoration.addSubview(progress)
    NSLayoutConstraint.activate([
      restoration.topAnchor.constraint(equalTo: view.topAnchor),
      restoration.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      restoration.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      restoration.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      logo.centerXAnchor.constraint(equalTo: restoration.centerXAnchor),
      logo.centerYAnchor.constraint(equalTo: restoration.centerYAnchor, constant: -39),
      progress.topAnchor.constraint(equalTo: logo.bottomAnchor, constant: 32),
      progress.leadingAnchor.constraint(equalTo: restoration.safeAreaLayoutGuide.leadingAnchor, constant: 32),
      progress.trailingAnchor.constraint(equalTo: restoration.safeAreaLayoutGuide.trailingAnchor, constant: -32),
      progress.bottomAnchor.constraint(lessThanOrEqualTo: restoration.safeAreaLayoutGuide.bottomAnchor, constant: -16)
    ])
  }
  private func logoView(named name: String) -> UIImageView {
    let image = UIImageView(image: UIImage(named: name))
    image.contentMode = .scaleAspectFit
    image.isAccessibilityElement = true
    image.accessibilityLabel = "ANTARCTIC STAR"
    image.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([image.widthAnchor.constraint(equalToConstant: 150), image.heightAnchor.constraint(equalToConstant: 84)])
    return image
  }
  private func button(title: String, background: UIColor, foreground: UIColor) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.backgroundColor = background
    button.setTitleColor(foreground, for: .normal)
    button.titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: .systemFont(ofSize: 16, weight: .semibold))
    button.titleLabel?.adjustsFontForContentSizeCategory = true
    button.titleLabel?.numberOfLines = 0
    button.layer.cornerRadius = 8
    button.contentEdgeInsets = UIEdgeInsets(top: 13, left: 16, bottom: 13, right: 16)
    button.heightAnchor.constraint(greaterThanOrEqualToConstant: 46).isActive = true
    return button
  }
  private func render() {
    restoration.isHidden = model.state != .restoring
    entry.isHidden = model.state != .ready
    status.text = model.message
    status.isHidden = model.message == nil
    if model.state == .authenticated || model.state == .cleanupRequired, !routed { routed = true; authenticated() }
  }
}

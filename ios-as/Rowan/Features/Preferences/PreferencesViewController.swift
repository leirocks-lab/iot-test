import UIKit
import UserNotifications

/// USER-01/02 native editor, bound to one account revision. No synthetic catalogue or permissions prompt.
@MainActor
final class PreferencesViewController: UITableViewController {
  private let service: PreferencesService
  private let account: AccountService
  private let revision: Int
  private let showAccount: () -> Void
  private let showCleanup: () -> Void
  private var task: Task<Void, Never>?
  private var notification: NSObjectProtocol?
  private var running = false
  private var permission = "正在读取系统通知权限"
  private let status = UILabel()
  private let reloadButton = UIButton(type: .system)
  private let footer = UIStackView()
  private let rows = ["language", "notification", "theme", "temperature_unit", "measurement_system", "wallpaper", "layout"]
  init(service: PreferencesService, account: AccountService, expectedRevision: Int,
       showAccount: @escaping () -> Void, showCleanup: @escaping () -> Void) {
    self.service = service; self.account = account; revision = expectedRevision
    self.showAccount = showAccount; self.showCleanup = showCleanup
    super.init(style: .insetGrouped)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { task?.cancel(); if let notification { NotificationCenter.default.removeObserver(notification) } }
  override func viewDidLoad() {
    super.viewDidLoad(); title = "设置"
    let heading = UILabel(); heading.text = title; heading.font = .preferredFont(forTextStyle: .headline)
    heading.accessibilityIdentifier = "prefs_title"; navigationItem.titleView = heading
    navigationItem.hidesBackButton = true
    navigationItem.leftBarButtonItem = UIBarButtonItem(image: UIImage(systemName: "chevron.left"), style: .plain, target: self, action: #selector(back))
    navigationItem.leftBarButtonItem?.accessibilityLabel = "返回"
    navigationItem.leftBarButtonItem?.accessibilityIdentifier = "prefs_back"
    tableView.rowHeight = UITableView.automaticDimension; tableView.estimatedRowHeight = 52
    tableView.separatorStyle = .none
    tableView.backgroundColor = Self.background
    status.font = .preferredFont(forTextStyle: .footnote); status.adjustsFontForContentSizeCategory = true
    status.textColor = .secondaryLabel; status.numberOfLines = 0; status.accessibilityIdentifier = "prefs_status"
    reloadButton.setTitle("重新读取", for: .normal); reloadButton.accessibilityIdentifier = "prefs_reload"
    reloadButton.titleLabel?.font = .preferredFont(forTextStyle: .body); reloadButton.titleLabel?.adjustsFontForContentSizeCategory = true
    reloadButton.addTarget(self, action: #selector(reload), for: .touchUpInside)
    footer.axis = .vertical; footer.spacing = 12; footer.isLayoutMarginsRelativeArrangement = true
    footer.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 16, leading: 20, bottom: 24, trailing: 20)
    footer.addArrangedSubview(status); footer.addArrangedSubview(reloadButton)
    tableView.tableFooterView = footer
    notification = NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in guard let self, isViewLoaded, view.window != nil else { return }; _ = checkCurrent() }
    }
    reload()
  }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    guard checkCurrent() else { return }
    readSystemPermission()
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let width = tableView.bounds.width
    let height = footer.systemLayoutSizeFitting(CGSize(width: width, height: UIView.layoutFittingCompressedSize.height),
      withHorizontalFittingPriority: .required, verticalFittingPriority: .fittingSizeLevel).height
    if footer.frame.width != width || abs(footer.frame.height - height) > 1 {
      footer.frame = CGRect(x: 0, y: 0, width: width, height: height); tableView.tableFooterView = footer
    }
  }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if isMovingFromParent || navigationController?.isBeingDismissed == true { task?.cancel() }
  }
  private var canWrite: Bool { !running && !service.state.busy && !service.state.resultUnknown && service.state.preferences != nil && !service.state.sessionExpired }
  private func checkCurrent() -> Bool {
    if account.pendingLogoutCleanupRevision != nil { showCleanup(); return false }
    guard account.session != nil, account.revision == revision else {
      if account.session == nil { showAccount() } else { navigationController?.popToRootViewController(animated: true) }
      return false
    }
    return true
  }
  @objc private func back() { task?.cancel(); navigationController?.popViewController(animated: true) }
  @objc private func reload() { perform(nil) }
  private func perform(_ patch: PreferencesPatch?) {
    guard !running, checkCurrent(), patch == nil || canWrite else { return }
    running = true; render()
    task = Task { [weak self] in
      guard let self else { return }
      defer { running = false; if isViewLoaded { render() } }
      do { if let patch { try await service.save(patch) } else { try await service.load() } }
      catch is CancellationError { }
      catch { status.text = "操作未完成，请重新读取核对" }
      guard !Task.isCancelled else { return }
      _ = checkCurrent()
    }
  }
  private func render() {
    let state = service.state
    if running || state.busy { status.text = "正在读取或核对设置…" }
    else if state.resultUnknown { status.text = "设置结果未确认，请重新读取核对。不会自动重复提交。" }
    else if let error = state.error { status.text = error }
    else if state.preferences != nil { status.text = "已读取并确认设置。语言和主题尚未应用到整个 App。" }
    else { status.text = "尚未读取设置，请重试" }
    reloadButton.isEnabled = !running && !state.busy
    switch state.preferences?.theme {
    case .light: overrideUserInterfaceStyle = .light
    case .dark: overrideUserInterfaceStyle = .dark
    default: overrideUserInterfaceStyle = .unspecified
    }
    tableView.reloadData(); view.setNeedsLayout()
  }
  private func readSystemPermission() {
    UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
      let text: String
      switch settings.authorizationStatus {
      case .authorized: text = "系统通知权限：已允许"
      case .denied: text = "系统通知权限：已关闭"
      case .notDetermined: text = "系统通知权限：尚未申请"
      case .provisional: text = "系统通知权限：临时允许"
      case .ephemeral: text = "系统通知权限：临时会话允许"
      @unknown default: text = "系统通知权限：未知"
      }
      Task { @MainActor [weak self] in
        guard let self, account.revision == revision, account.session != nil, account.pendingLogoutCleanupRevision == nil else { return }
        permission = text; tableView.reloadData()
      }
    }
  }
  override func numberOfSections(in tableView: UITableView) -> Int { 2 }
  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { section == 0 ? 5 : 2 }
  override func tableView(_ tableView: UITableView, titleForFooterInSection section: Int) -> String? {
    section == 0 ? permission + "。云端通知偏好与系统权限分别管理；此页不会申请系统权限。" : "壁纸与首页布局尚无权威选项目录，当前仅展示已读取状态。"
  }
  private func key(_ index: IndexPath) -> String { rows[index.section == 0 ? index.row : index.row + 5] }
  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = UITableViewCell(style: .value1, reuseIdentifier: nil), value = service.state.preferences
    let id = key(indexPath)
    switch id {
    case "language": cell.textLabel?.text = "语言"; cell.detailTextLabel?.text = languageName(value?.language)
    case "notification": cell.textLabel?.text = "云端通知偏好"; cell.detailTextLabel?.text = value?.notification.map { $0 ? "开启" : "关闭" } ?? "未提供"
    case "theme": cell.textLabel?.text = "主题"; cell.detailTextLabel?.text = themeName(value?.theme)
    case "temperature_unit": cell.textLabel?.text = "温度单位"; cell.detailTextLabel?.text = value?.temperatureUnit.map { $0 == .celsius ? "°C" : "°F" } ?? "未提供"
    case "measurement_system": cell.textLabel?.text = "计量方式"; cell.detailTextLabel?.text = value?.measurementSystem.map { $0 == .metric ? "公制" : "英制" } ?? "未提供"
    case "wallpaper": cell.textLabel?.text = "壁纸"; cell.detailTextLabel?.text = value?.wallpaperID == nil ? "未提供可识别设置" : "已有云端设置"
    default: cell.textLabel?.text = "首页布局"; cell.detailTextLabel?.text = value?.homeLayout == nil ? "未提供可识别设置" : "已有云端设置"
    }
    cell.accessibilityIdentifier = "prefs_" + id
    cell.textLabel?.font = .preferredFont(forTextStyle: .body); cell.textLabel?.adjustsFontForContentSizeCategory = true
    cell.detailTextLabel?.font = .preferredFont(forTextStyle: .body); cell.detailTextLabel?.adjustsFontForContentSizeCategory = true
    cell.textLabel?.numberOfLines = 0; cell.detailTextLabel?.numberOfLines = 0
    cell.accessoryType = indexPath.section == 0 ? .disclosureIndicator : .none
    cell.selectionStyle = canWrite && indexPath.section == 0 ? .default : .none
    cell.isUserInteractionEnabled = canWrite && indexPath.section == 0
    cell.contentView.alpha = canWrite || indexPath.section == 1 ? 1 : 0.5
    return cell
  }
  override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    guard canWrite, checkCurrent() else { return }
    let value = service.state.preferences
    switch key(indexPath) {
    case "language":
      choose(title: "语言", values: ["简体中文", "繁體中文", "English"], selected: value?.language.flatMap { PreferenceLanguage.allCases.firstIndex(of: $0) }) {
        PreferencesPatch(language: PreferenceLanguage.allCases[$0])
      }
    case "theme":
      choose(title: "主题", values: ["跟随系统", "浅色", "深色"], selected: value?.theme.flatMap { PreferenceTheme.allCases.firstIndex(of: $0) }) {
        PreferencesPatch(theme: PreferenceTheme.allCases[$0])
      }
    case "notification":
      choose(title: "云端通知偏好", values: ["开启", "关闭"], selected: value?.notification.map { $0 ? 0 : 1 }) { PreferencesPatch(notification: $0 == 0) }
    case "temperature_unit":
      choose(title: "温度单位", values: ["°C", "°F"], selected: value?.temperatureUnit.map { $0 == .celsius ? 0 : 1 }) { PreferencesPatch(temperatureUnit: $0 == 0 ? .celsius : .fahrenheit) }
    case "measurement_system":
      choose(title: "计量方式", values: ["公制", "英制"], selected: value?.measurementSystem.map { $0 == .metric ? 0 : 1 }) { PreferencesPatch(measurementSystem: $0 == 0 ? .metric : .imperial) }
    default: break
    }
  }
  private func choose(title: String, values: [String], selected: Int?, patch: @escaping (Int) -> PreferencesPatch) {
    let picker = PreferenceChoiceViewController(title: title, values: values, selected: selected) { [weak self] index in
      guard let self, canWrite, checkCurrent() else { return }
      navigationController?.popViewController(animated: true); perform(patch(index))
    }
    picker.overrideUserInterfaceStyle = overrideUserInterfaceStyle
    navigationController?.pushViewController(picker, animated: true)
  }
  private func languageName(_ value: PreferenceLanguage?) -> String {
    switch value { case .zhCN: return "简体中文"; case .zhTW: return "繁體中文"; case .en: return "English"; case nil: return "未提供" }
  }
  private func themeName(_ value: PreferenceTheme?) -> String {
    switch value { case .system: return "跟随系统"; case .light: return "浅色"; case .dark: return "深色"; case nil: return "未提供" }
  }
  fileprivate static var background: UIColor {
    UIColor { $0.userInterfaceStyle == .dark ? .systemGroupedBackground : UIColor(white: 242 / 255, alpha: 1) }
  }
}

/// Local Lanhu language pattern: grey background, white rounded group, blue checkmark.
@MainActor
private final class PreferenceChoiceViewController: UITableViewController {
  private let values: [String]
  private let selected: Int?
  private let choose: (Int) -> Void
  init(title: String, values: [String], selected: Int?, choose: @escaping (Int) -> Void) {
    self.values = values; self.selected = selected; self.choose = choose
    super.init(style: .insetGrouped); self.title = title
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override func viewDidLoad() {
    super.viewDidLoad(); tableView.backgroundColor = PreferencesViewController.background; tableView.separatorStyle = .none
    tableView.rowHeight = UITableView.automaticDimension; tableView.estimatedRowHeight = 46
    tableView.tintColor = UIColor(red: 24 / 255, green: 109 / 255, blue: 175 / 255, alpha: 1)
  }
  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { values.count }
  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
    cell.textLabel?.text = values[indexPath.row]; cell.textLabel?.font = .preferredFont(forTextStyle: .body)
    cell.textLabel?.adjustsFontForContentSizeCategory = true; cell.textLabel?.numberOfLines = 0
    cell.accessoryType = selected == indexPath.row ? .checkmark : .none
    cell.textLabel?.textColor = selected == indexPath.row ? tableView.tintColor : .label
    return cell
  }
  override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) { choose(indexPath.row) }
}

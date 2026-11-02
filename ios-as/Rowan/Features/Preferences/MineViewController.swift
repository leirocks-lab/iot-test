import UIKit

/// Only preferences and existing account-owner logout. No profile/delete/feedback placeholders.
@MainActor
final class MineViewController: UITableViewController {
  private let account: AccountService
  private let revision: Int
  private let makePreferences: () throws -> PreferencesService
  private let showAccount: () -> Void
  private let showCleanup: () -> Void
  private var task: Task<Void, Never>?
  private var notification: NSObjectProtocol?
  private var busy = false
  private let status = UILabel()
  init(account: AccountService, expectedRevision: Int, makePreferences: @escaping () throws -> PreferencesService,
       showAccount: @escaping () -> Void, showCleanup: @escaping () -> Void) {
    self.account = account; revision = expectedRevision; self.makePreferences = makePreferences
    self.showAccount = showAccount; self.showCleanup = showCleanup
    super.init(style: .insetGrouped)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { task?.cancel(); if let notification { NotificationCenter.default.removeObserver(notification) } }
  override func viewDidLoad() {
    super.viewDidLoad(); title = "我的"
    let heading = UILabel(); heading.text = title; heading.font = .preferredFont(forTextStyle: .headline)
    heading.accessibilityIdentifier = "mine_title"; navigationItem.titleView = heading
    navigationItem.hidesBackButton = true
    navigationItem.leftBarButtonItem = UIBarButtonItem(image: UIImage(systemName: "chevron.left"), style: .plain, target: self, action: #selector(back))
    navigationItem.leftBarButtonItem?.accessibilityLabel = "返回"
    navigationItem.leftBarButtonItem?.accessibilityIdentifier = "mine_back"
    tableView.rowHeight = UITableView.automaticDimension; tableView.estimatedRowHeight = 52
    status.numberOfLines = 0; status.font = .preferredFont(forTextStyle: .footnote); status.textColor = .secondaryLabel
    notification = NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in guard let self, isViewLoaded, view.window != nil else { return }; _ = checkCurrent() }
    }
  }
  override func viewWillAppear(_ animated: Bool) { super.viewWillAppear(animated); _ = checkCurrent() }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if isMovingFromParent || navigationController?.isBeingDismissed == true { task?.cancel() }
    navigationController?.interactivePopGestureRecognizer?.isEnabled = true
  }
  private func checkCurrent() -> Bool {
    if account.pendingLogoutCleanupRevision != nil { showCleanup(); return false }
    guard account.session != nil, account.revision == revision else {
      if account.session == nil { showAccount() } else { navigationController?.popToRootViewController(animated: true) }
      return false
    }
    return true
  }
  @objc private func back() { guard !busy else { return }; navigationController?.popViewController(animated: true) }
  override func numberOfSections(in tableView: UITableView) -> Int { 2 }
  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { 1 }
  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
    cell.textLabel?.text = indexPath.section == 0 ? "设置" : "退出登录"
    cell.textLabel?.font = .preferredFont(forTextStyle: .body); cell.textLabel?.adjustsFontForContentSizeCategory = true
    cell.accessibilityIdentifier = indexPath.section == 0 ? "mine_preferences" : "mine_logout"
    cell.accessoryType = indexPath.section == 0 ? .disclosureIndicator : .none
    cell.textLabel?.textColor = indexPath.section == 0 ? .label : .systemRed
    cell.isUserInteractionEnabled = !busy; return cell
  }
  override func tableView(_ tableView: UITableView, viewForFooterInSection section: Int) -> UIView? { section == 1 ? status : nil }
  override func tableView(_ tableView: UITableView, heightForFooterInSection section: Int) -> CGFloat { section == 1 ? 80 : 20 }
  override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    guard !busy, checkCurrent() else { return }
    if indexPath.section == 0 {
      do {
        let controller = PreferencesViewController(service: try makePreferences(), account: account, expectedRevision: revision,
          showAccount: showAccount, showCleanup: showCleanup)
        navigationController?.pushViewController(controller, animated: true)
      } catch { status.text = "登录会话已变化，请重新进入"; _ = checkCurrent() }
    } else { logout() }
  }
  private func logout() {
    busy = true; status.text = "正在退出登录…"; tableView.reloadData()
    navigationItem.leftBarButtonItem?.isEnabled = false; navigationController?.interactivePopGestureRecognizer?.isEnabled = false
    task = Task { [weak self] in
      guard let self else { return }
      defer {
        busy = false; navigationItem.leftBarButtonItem?.isEnabled = true
        navigationController?.interactivePopGestureRecognizer?.isEnabled = true; tableView.reloadData()
      }
      do {
        _ = try await account.logout()
        if account.session == nil { showAccount() }
      } catch is CancellationError { _ = checkCurrent() }
      catch is AccountLogoutCleanupFailure { showCleanup() }
      catch {
        guard checkCurrent() else { return }
        status.text = (error as? RowanFailure)?.message ?? "退出结果未确认，请重试"
      }
    }
  }
}

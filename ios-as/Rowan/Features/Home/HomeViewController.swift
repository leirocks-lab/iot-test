import UIKit

@MainActor
final class HomeViewController: UITableViewController {
  private let repository: any HomeRepository
  private let account: AccountService
  private let selfUnbind:SelfUnbindApplication
  private let homeReadGate:HomeReadGate
  private lazy var unbindHome=SelfUnbindHomeConsumer(tabs:roomTabs,application:selfUnbind,accountRevision:sessionRevision,canRead:{[weak self] in
    guard let self,isViewLoaded,view.window != nil,navigationController?.topViewController === self,!busy else{return false}
    return account.revision==sessionRevision&&account.session != nil&&account.pendingLogoutCleanupRevision==nil
  })
  private let sessionRevision: Int
  private let openDevice: (HomeDevice) -> Void
  private let showAccount: () -> Void
  private let makePreferences: (Int) throws -> PreferencesService
  private var groups: [HomeGroup] = []
  private var task: Task<Void, Never>?
  private var busy = false
  private var cleanupRevision: Int?
  private var accountNotification: NSObjectProtocol?
  private var refreshAfterRooms = false
  private let status = UILabel()
  private let selectionStatus = UILabel()
  private var selectionBackgroundNotification: NSObjectProtocol?
  private var normalLeftButtons: [UIBarButtonItem]?
  private var normalRightButtons: [UIBarButtonItem]?
  private var showingSelection = false
  private var originalToolbarHidden = true
  private var homeToolbarBeforeEntry:Bool?
  private let normalFooter=UIStackView()
  private var footerConstraints:[NSLayoutConstraint]=[]
  private var footerBaseInset:CGFloat=0
  private weak var normalAddButton:UIButton?
  private weak var selectionAlert: UIAlertController?
  private var handlingSelectionAlert = false
  private lazy var selection = HomeSelection(current: { [weak self] in
    guard let self else { return false }
    return account.session != nil && account.pendingLogoutCleanupRevision == nil && account.revision == sessionRevision
  })
  private lazy var selectionDelete: UIBarButtonItem = {
    let value = UIBarButtonItem(title: "删除设备", style: .plain, target: self, action: #selector(showSelectionReview))
    value.tintColor = .systemRed; value.accessibilityIdentifier = "home_selection_delete"; return value
  }()
  private var foregroundNotification: NSObjectProtocol?
  private let roomHeader = UIStackView()
  private let roomTabsScroll = UIScrollView()
  private let roomTabsRow = UIStackView()
  private lazy var roomTabs = HomeRoomTabs(repository: repository, expectedRevision: sessionRevision, current: { [weak self] in
    guard let self else { return false }
    return account.session != nil && account.pendingLogoutCleanupRevision == nil && account.revision == sessionRevision
  },readGate:homeReadGate)

  init(repository: any HomeRepository, account: AccountService, selfUnbind:SelfUnbindApplication, homeReadGate:HomeReadGate, makePreferences: @escaping (Int) throws -> PreferencesService,
       openDevice: @escaping (HomeDevice) -> Void, showAccount: @escaping () -> Void) {
    self.repository = repository
    self.account = account
    self.selfUnbind=selfUnbind
    self.homeReadGate=homeReadGate
    self.makePreferences = makePreferences
    cleanupRevision = account.pendingLogoutCleanupRevision
    sessionRevision = account.revision
    self.openDevice = openDevice
    self.showAccount = showAccount
    super.init(style: .plain)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { if let selectionBackgroundNotification { NotificationCenter.default.removeObserver(selectionBackgroundNotification) }; if let foregroundNotification { NotificationCenter.default.removeObserver(foregroundNotification) }; task?.cancel(); if let accountNotification { NotificationCenter.default.removeObserver(accountNotification) } }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "首页"
    let homeAppearance=UINavigationBarAppearance();homeAppearance.configureWithOpaqueBackground()
    homeAppearance.backgroundColor=UIColor(white:242/255,alpha:1)
    homeAppearance.titleTextAttributes=[.font:UIFontMetrics.default.scaledFont(for:.systemFont(ofSize:16,weight:.semibold)),.foregroundColor:UIColor.black]
    navigationItem.standardAppearance=homeAppearance;navigationItem.scrollEdgeAppearance=homeAppearance
    navigationItem.hidesBackButton = true
    let exit = UIBarButtonItem(title: "退出登录", style: .plain, target: self, action: #selector(logout))
    exit.accessibilityIdentifier = "home_logout"
    navigationItem.leftBarButtonItems = [exit]
    navigationItem.rightBarButtonItems = [UIBarButtonItem(title: "房间", style: .plain, target: self, action: #selector(openRooms)),
      UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(reload))]
    status.textAlignment = .center
    status.numberOfLines = 0
    status.font = .preferredFont(forTextStyle: .body)
    normalLeftButtons = navigationItem.leftBarButtonItems; normalRightButtons = navigationItem.rightBarButtonItems
    selectionStatus.numberOfLines = 0; selectionStatus.font = .preferredFont(forTextStyle: .body)
    selectionStatus.textColor = .systemRed; selectionStatus.accessibilityIdentifier = "home_selection_status"; selectionStatus.isHidden = true
    selection.onChange = { [weak self] value in self?.renderSelection(value) }
    tableView.backgroundColor = UIColor(white:242/255,alpha:1)
    tableView.separatorStyle = .none;tableView.rowHeight = UITableView.automaticDimension;tableView.estimatedRowHeight = 212
    tableView.sectionHeaderTopPadding = 0
    installNormalFooter()
    tableView.backgroundView = nil
    installRoomTabs()
    roomTabs.onChange = { [weak self] value in self?.renderRooms(value) }
    refreshControl = UIRefreshControl()
    refreshControl?.addTarget(self, action: #selector(reload), for: .valueChanged)
    accountNotification = NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in
        guard let self else { return }
        selection.accountChanged(); roomTabs.accountChanged()
        if account.pendingLogoutCleanupRevision != nil { showCentralCleanup() }
        else if account.session == nil || account.revision != sessionRevision {
          groups = []; tableView.reloadData()
          if !busy { showAccount() }
        }
        updateCleanupPhase()
      }
    }
    foregroundNotification = NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in
        guard let self, isViewLoaded, view.window != nil, navigationController?.topViewController === self,
              cleanupRevision == nil, !busy else { return }
        setNormalFooterVisible(!showingSelection)
        selection.appear(); selection.sync(roomTabs.state); unbindHome.appear(); reload()
      }
    }
    selectionBackgroundNotification = NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in self?.selection.leave();self?.unbindHome.leave() }
    }
    if cleanupRevision != nil { renderPendingCleanup() } else { reload() }
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    // Returning inside the same foreground does not imply any selection/OS notification.
    if homeToolbarBeforeEntry == nil { homeToolbarBeforeEntry = navigationController?.isToolbarHidden ?? true }
    setNormalFooterVisible(!showingSelection)
    selection.appear(); selection.sync(roomTabs.state)
    if cleanupRevision != nil { updateCleanupPhase(); return }
    if account.session == nil || account.revision != sessionRevision { showAccount(); return }
    let retiredRead = roomTabs.consumeReloadOnAppear()
    if refreshAfterRooms || retiredRead { refreshAfterRooms = false; reload() }
  }

  @objc private func openRooms() {
    guard !selection.state.editing, !busy, account.session != nil, account.revision == sessionRevision else { return }
    refreshAfterRooms = true
    navigationItem.backButtonDisplayMode = .minimal
    navigationController?.pushViewController(RoomsViewController(account: account), animated: true)
  }
  @objc private func openMine() {
    guard !selection.state.editing, !busy, cleanupRevision == nil, account.session != nil, account.revision == sessionRevision else { return }
    let mine = MineViewController(account: account, expectedRevision: sessionRevision,
      makePreferences: { [makePreferences, sessionRevision] in try makePreferences(sessionRevision) },
      showAccount: showAccount, showCleanup: { [weak self] in self?.showCentralCleanup() })
    navigationItem.backButtonDisplayMode = .minimal
    navigationController?.pushViewController(mine, animated: true)
  }
  private func showCentralCleanup() {
    guard let pending = account.pendingLogoutCleanupRevision, account.session == nil else { return }
    cleanupRevision = pending; renderPendingCleanup()
    navigationController?.popToViewController(self, animated: true)
  }

  @objc private func openAdd() {
    guard !selection.state.editing, !busy, cleanupRevision == nil, account.session != nil, account.revision == sessionRevision else { return }
    let sheet = UIAlertController(title: "添加设备", message: nil, preferredStyle: .actionSheet)
    sheet.addAction(UIAlertAction(title: "扫一扫", style: .default) { [weak self] _ in
      guard let self, !selection.state.editing, cleanupRevision == nil, account.session != nil, account.revision == sessionRevision else { return }
      navigationItem.backButtonDisplayMode = .minimal
      navigationController?.pushViewController(QRScanViewController(account: account, expectedRevision: sessionRevision), animated: true)
    })
    sheet.addAction(UIAlertAction(title: "手动添加", style: .default) { [weak self] _ in self?.openCatalog() })
    sheet.addAction(UIAlertAction(title: "取消", style: .cancel))
    sheet.popoverPresentationController?.sourceView = normalAddButton
    sheet.popoverPresentationController?.sourceRect = normalAddButton?.bounds ?? .zero
    present(sheet, animated: true)
  }

  @objc private func openCatalog() {
    guard !selection.state.editing, !busy, cleanupRevision == nil, account.session != nil, account.revision == sessionRevision else { return }
    let value = (Bundle.main.object(forInfoDictionaryKey: "RowanBrandID") as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
    let brandID = value.flatMap { $0.isEmpty || $0.hasPrefix("$(") ? nil : $0 }
    let service = HTTPProductCatalog(account: account, brandID: brandID)
    navigationItem.backButtonDisplayMode = .minimal
    navigationController?.pushViewController(ProductCatalogViewController(service: service, account: account), animated: true)
  }


  private func installRoomTabs() {
    roomTabsScroll.accessibilityIdentifier = "home_room_tabs"
    roomTabsScroll.showsHorizontalScrollIndicator = false
    roomTabsRow.axis = .horizontal; roomTabsRow.spacing = 8; roomTabsRow.alignment = .fill
    roomTabsRow.translatesAutoresizingMaskIntoConstraints = false
    roomTabsScroll.addSubview(roomTabsRow)
    NSLayoutConstraint.activate([
      roomTabsRow.leadingAnchor.constraint(equalTo: roomTabsScroll.contentLayoutGuide.leadingAnchor, constant: 16),
      roomTabsRow.trailingAnchor.constraint(equalTo: roomTabsScroll.contentLayoutGuide.trailingAnchor, constant: -16),
      roomTabsRow.topAnchor.constraint(equalTo: roomTabsScroll.contentLayoutGuide.topAnchor),
      roomTabsRow.bottomAnchor.constraint(equalTo: roomTabsScroll.contentLayoutGuide.bottomAnchor),
      roomTabsRow.heightAnchor.constraint(equalTo: roomTabsScroll.frameLayoutGuide.heightAnchor)
    ])
    roomHeader.axis = .vertical; roomHeader.spacing = 8
    roomHeader.addArrangedSubview(roomTabsScroll); roomHeader.addArrangedSubview(status); roomHeader.addArrangedSubview(selectionStatus)
    roomTabsScroll.heightAnchor.constraint(equalToConstant: max(50, UIFontMetrics.default.scaledValue(for: 50))).isActive = true
    tableView.tableHeaderView = roomHeader
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let width = tableView.bounds.width
    let height = roomHeader.systemLayoutSizeFitting(CGSize(width: width, height: 0),
      withHorizontalFittingPriority: .required, verticalFittingPriority: .fittingSizeLevel).height
    if roomHeader.frame.width != width || roomHeader.frame.height != height {
      roomHeader.frame = CGRect(x: 0, y: 0, width: width, height: height)
      tableView.tableHeaderView = roomHeader
    }
  }
  private func renderRooms(_ value: HomeRoomState) {
    if !value.loading{refreshControl?.endRefreshing()}
    guard cleanupRevision == nil, account.pendingLogoutCleanupRevision == nil else { return }
    groups = value.visibleGroups
    selection.sync(value)
    roomTabsRow.arrangedSubviews.forEach { roomTabsRow.removeArrangedSubview($0); $0.removeFromSuperview() }
    guard account.session != nil, account.revision == sessionRevision, !value.sessionExpired else {
      groups = []; status.text = "登录会话已变化，请重新进入"; status.isHidden = false; tableView.reloadData(); return
    }
    let oldOffset = roomTabsScroll.contentOffset
    func tab(_ title: String, _ id: RoomID?) {
      let selected = value.selectedRoomID == id
      let button = UIButton(type: .system)
      button.isEnabled = !selection.state.editing
      button.accessibilityIdentifier = id == nil ? "home_room_all" : "home_room_tab"
      button.setTitle(title, for: .normal); button.setTitleColor(selected ? .black : .darkGray, for: .normal)
      button.titleLabel?.font = UIFontMetrics.default.scaledFont(for: .systemFont(ofSize: selected ? 16 : 14, weight: selected ? .semibold : .regular))
      button.titleLabel?.adjustsFontForContentSizeCategory = true
      button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)
      button.accessibilityTraits = selected ? [.button, .selected] : [.button]
      button.addAction(UIAction { [weak self] _ in
        guard let self, !selection.state.editing, !busy, cleanupRevision == nil else { return }; roomTabs.select(id)
      }, for: .touchUpInside)
      let line = UIView(); line.layer.cornerRadius = 2; line.backgroundColor = selected ? UIColor(red:35/255,green:25/255,blue:22/255,alpha:1) : .clear
      line.translatesAutoresizingMaskIntoConstraints = false
      button.addSubview(line)
      NSLayoutConstraint.activate([line.widthAnchor.constraint(equalToConstant: 12), line.heightAnchor.constraint(equalToConstant: 3),
        line.centerXAnchor.constraint(equalTo: button.centerXAnchor), line.bottomAnchor.constraint(equalTo: button.bottomAnchor)])
      roomTabsRow.addArrangedSubview(button)
    }
    tab("全屋", nil); value.tabs.forEach { tab($0.name, $0.id) }
    roomTabsScroll.layoutIfNeeded(); roomTabsScroll.setContentOffset(oldOffset, animated: false)
    if value.loading { status.text = "正在刷新设备…" }
    else if value.errorCode != nil { status.text = value.loaded ? "加载失败，请检查网络后刷新；已保留上次列表" : "加载失败，请检查网络后刷新" }
    else if value.empty { status.text = value.selectedRoomID == nil ? "暂无设备" : "此房间暂无设备" }
    else { status.text = nil }
    status.isHidden = status.text == nil || status.text == ""
    view.setNeedsLayout(); tableView.reloadData()
  }

  @objc private func exitSelection() { selection.exit() }
  private func renderSelection(_ value: HomeSelectionState) {
    if value.review == nil, !handlingSelectionAlert, let alert = selectionAlert {
      selectionAlert = nil
      if presentedViewController === alert { alert.dismiss(animated: false) }
    }
    let editing = value.editing && account.session != nil && account.revision == sessionRevision && cleanupRevision == nil
    if editing && !showingSelection { originalToolbarHidden = navigationController?.isToolbarHidden ?? true }
    if !editing && showingSelection { toolbarItems = nil; navigationController?.setToolbarHidden(originalToolbarHidden, animated: false) }
    showingSelection = editing
    setNormalFooterVisible(!editing)
    roomTabsRow.arrangedSubviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !editing }
    selectionStatus.text = value.errorCode == "removal_unavailable" ? "暂时无法移除设备，请稍后再试。" :
      (value.errorCode == "selection_changed" ? "设备列表已变化，已更新选择，请重新核对。" : nil)
    selectionStatus.isHidden = selectionStatus.text == nil
    guard cleanupRevision == nil, account.pendingLogoutCleanupRevision == nil else { tableView.reloadData(); return }
    if editing {
      title = "已选中 \(value.selected.count) 个设备"
      let count = UILabel(); count.text = title; count.font = .preferredFont(forTextStyle: .headline)
      count.adjustsFontForContentSizeCategory = true; count.accessibilityIdentifier = "home_selection_count"
      navigationItem.titleView = count
      let cancel = UIBarButtonItem(title: "取消", style: .plain, target: self, action: #selector(exitSelection))
      cancel.tintColor=UIColor(white:102/255,alpha:1);cancel.accessibilityIdentifier = "home_selection_cancel"
      let done = UIBarButtonItem(title: "完成", style: .done, target: self, action: #selector(exitSelection))
      done.tintColor=UIColor(red:24/255,green:109/255,blue:175/255,alpha:1);done.accessibilityIdentifier = "home_selection_done"
      navigationItem.leftBarButtonItems = [cancel]; navigationItem.rightBarButtonItems = [done]
      selectionDelete.isEnabled = !value.selected.isEmpty && !value.loading
      toolbarItems = [UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), selectionDelete,
        UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)]
      navigationController?.setToolbarHidden(false, animated: false)
    } else {
      title = "首页"; navigationItem.titleView = nil; navigationItem.leftBarButtonItems = normalLeftButtons; navigationItem.rightBarButtonItems = normalRightButtons
    }
    view.setNeedsLayout(); tableView.reloadData()
  }
  @objc private func showSelectionReview() {
    guard !busy, selectionAlert == nil, presentedViewController == nil,
          let review = selection.requestReview(epoch: selection.inputEpoch) else { return }
    let names = review.devices.map(\.nickname).joined(separator: "\n")
    let alert = UIAlertController(title: "删除设备", message: "已选择 \(review.devices.count) 台设备。当前暂时无法移除设备。\n" + names, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "取消", style: .cancel) { [weak self] _ in
      guard let self else { return }; handlingSelectionAlert = true; selection.cancelReview(review.ticket)
      handlingSelectionAlert = false; selectionAlert = nil
    })
    alert.addAction(UIAlertAction(title: "知道了", style: .default) { [weak self] _ in
      guard let self else { return }; handlingSelectionAlert = true; selection.confirm(review.ticket)
      handlingSelectionAlert = false; selectionAlert = nil
    })
    selectionAlert = alert; present(alert, animated: true)
  }
  @objc private func reload() {
    guard cleanupRevision==nil,!busy else{refreshControl?.endRefreshing();return}
    unbindHome.refresh()
  }
  override func viewDidAppear(_ animated:Bool){super.viewDidAppear(animated);if cleanupRevision==nil && !busy{unbindHome.appear()}}
  override func viewDidDisappear(_ animated:Bool){super.viewDidDisappear(animated);if isMovingFromParent || isBeingDismissed || navigationController?.isBeingDismissed==true{unbindHome.close()}}
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    unbindHome.leave()
    // Preserve an owned confirmation alert, but never carry a selection into another native/RN page.
    if selectionAlert == nil || presentedViewController !== selectionAlert { selection.leave() }
    // Only retire reads here. Account cleanup/logout has independent ownership.
    if !busy { roomTabs.cancelLoad(); task?.cancel() }
    if navigationController?.topViewController !== self || isMovingFromParent || isBeingDismissed {
      setNormalFooterVisible(false)
      navigationController?.setToolbarHidden(homeToolbarBeforeEntry ?? true,animated:false)
    }
  }
  @objc private func logout() {
    guard !selection.state.editing, !busy else { return }
    unbindHome.leave();roomTabs.cancelLoad(); task?.cancel()
    if let cleanupRevision {
      guard !account.cleanupInProgress else { return }
      if account.revision == cleanupRevision, account.session == nil, account.pendingLogoutCleanupRevision == nil {
        self.cleanupRevision = nil; showAccount(); return
      }
      busy = true; navigationItem.leftBarButtonItem?.isEnabled = false
      task = Task { [weak self] in
        guard let self else { return }
        defer { busy = false; navigationItem.leftBarButtonItem?.isEnabled = !account.cleanupInProgress }
        do {
          try await account.retryLogoutCleanup(expectedRevision: cleanupRevision)
          try Task.checkCancellation()
          guard account.revision == cleanupRevision, account.session == nil else { return }
          self.cleanupRevision = nil; showAccount()
        } catch is CancellationError { return }
        catch {
          if account.revision != cleanupRevision || account.session != nil { return }
          if account.pendingLogoutCleanupRevision == nil { self.cleanupRevision = nil; showAccount(); return }
          status.text = "本地安全会话清理仍未完成，请再次重试本地清理"
        }
      }
      return
    }
    busy = true
    tableView.isUserInteractionEnabled = false
    navigationItem.leftBarButtonItem?.isEnabled = false
    task = Task { [weak self] in
      guard let self else { return }
      defer {
        busy = false
        tableView.isUserInteractionEnabled = cleanupRevision == nil
        navigationItem.leftBarButtonItem?.isEnabled = !account.cleanupInProgress
        if cleanupRevision==nil,isViewLoaded,view.window != nil,navigationController?.topViewController === self,account.revision==sessionRevision,account.session != nil{unbindHome.appear()}
      }
      do {
        _ = try await account.logout()
        // The old Home must not redirect an account established before its continuation resumes.
        guard account.session == nil else { return }
        showAccount()
      }
      catch is CancellationError { return }
      catch let failure as AccountLogoutCleanupFailure {
        guard account.revision == failure.expectedRevision, account.session == nil else { return }
        cleanupRevision = failure.expectedRevision
        renderPendingCleanup()
      }
      catch {
        if account.revision != sessionRevision, account.session != nil { return }
        let alert = UIAlertController(title: "退出未完成", message: (error as? RowanFailure)?.message ?? "网络异常，服务端退出结果尚未确认", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
      }
    }
  }

  private func renderPendingCleanup() {
    unbindHome.leave()
    selection.accountChanged(); roomTabs.accountChanged()
    roomTabsRow.arrangedSubviews.forEach { roomTabsRow.removeArrangedSubview($0); $0.removeFromSuperview() }
    groups = []
    tableView.reloadData()
    tableView.isUserInteractionEnabled = false
    setNormalFooterVisible(false)
    navigationController?.setToolbarHidden(true,animated:false)
    status.isHidden = false; view.setNeedsLayout()
    status.text = account.cleanupInProgress ? "正在清理本地安全会话…" : "本地安全会话清理未完成\n请点击“重试本地清理”，不会再次请求服务端退出"
    let retry = UIBarButtonItem(title: account.cleanupInProgress ? "清理中…" : "重试本地清理", style: .plain, target: self, action: #selector(logout))
    retry.accessibilityIdentifier = "home_logout"
    navigationItem.leftBarButtonItems = [retry]
    navigationItem.leftBarButtonItem?.isEnabled = !busy && !account.cleanupInProgress
    navigationItem.rightBarButtonItems?.forEach { $0.isEnabled = false }
  }
  private func updateCleanupPhase() {
    guard let cleanupRevision, account.revision == cleanupRevision, account.session == nil else { return }
    if account.pendingLogoutCleanupRevision == nil {
      if !busy { self.cleanupRevision = nil; showAccount() }
    } else { renderPendingCleanup() }
  }

  private var visibleDevices:[HomeDevice] {groups.flatMap(\.devices)}
  private func installNormalFooter() {
    footerBaseInset=additionalSafeAreaInsets.bottom
    normalFooter.axis = .horizontal;normalFooter.distribution = .equalCentering;normalFooter.alignment = .center
    normalFooter.backgroundColor=UIColor(white:247/255,alpha:1)
    normalFooter.isLayoutMarginsRelativeArrangement=true;normalFooter.directionalLayoutMargins=NSDirectionalEdgeInsets(top:8,leading:32,bottom:8,trailing:32)
    func item(_ symbol:String,_ title:String,_ id:String,_ action:Selector?)->UIButton {
      let button=UIButton(type:.system);button.setImage(UIImage(systemName:symbol),for:.normal)
      button.tintColor = .black;button.accessibilityLabel=title;button.accessibilityIdentifier=id
      button.translatesAutoresizingMaskIntoConstraints=false
      NSLayoutConstraint.activate([button.widthAnchor.constraint(greaterThanOrEqualToConstant:48),button.heightAnchor.constraint(greaterThanOrEqualToConstant:48)])
      if let action {button.addTarget(self,action:action,for:.touchUpInside)} else {button.isUserInteractionEnabled=false;button.accessibilityValue="当前页面"}
      normalFooter.addArrangedSubview(button);return button
    }
    _=item("house.fill","首页","home_current",nil)
    normalAddButton=item("plus.circle.fill","添加设备","home_add",#selector(openAdd))
    _=item("person","我的","home_mine",#selector(openMine))
  }
  /// Footer is owned by this page, reserves only this page's safe area, and is removed before native/RN push.
  private func setNormalFooterVisible(_ visible:Bool) {
    let permitted=visible && cleanupRevision==nil && account.pendingLogoutCleanupRevision==nil &&
      account.session != nil && account.revision==sessionRevision && navigationController?.topViewController === self
    if permitted,let host=navigationController?.view {
      if normalFooter.superview !== host {
        NSLayoutConstraint.deactivate(footerConstraints);normalFooter.removeFromSuperview();normalFooter.translatesAutoresizingMaskIntoConstraints=false;host.addSubview(normalFooter)
        footerConstraints=[normalFooter.leadingAnchor.constraint(equalTo:host.leadingAnchor),normalFooter.trailingAnchor.constraint(equalTo:host.trailingAnchor),
          normalFooter.bottomAnchor.constraint(equalTo:host.safeAreaLayoutGuide.bottomAnchor),normalFooter.heightAnchor.constraint(equalToConstant:64)]
        NSLayoutConstraint.activate(footerConstraints)
      }
      additionalSafeAreaInsets.bottom=footerBaseInset+64
    } else {NSLayoutConstraint.deactivate(footerConstraints);footerConstraints=[];normalFooter.removeFromSuperview();additionalSafeAreaInsets.bottom=footerBaseInset}
  }
  override func numberOfSections(in tableView:UITableView)->Int {1}
  override func tableView(_ tableView:UITableView,numberOfRowsInSection section:Int)->Int {(visibleDevices.count+1)/2}
  override func tableView(_ tableView:UITableView,cellForRowAt indexPath:IndexPath)->UITableViewCell {
    let cell=UITableViewCell(style:.default,reuseIdentifier:nil)
    cell.selectionStyle = .none;cell.backgroundColor = .clear;cell.isAccessibilityElement=false
    let row=UIStackView();row.axis = .horizontal;row.spacing=11;row.distribution = .fillEqually
    row.translatesAutoresizingMaskIntoConstraints=false;cell.contentView.addSubview(row)
    NSLayoutConstraint.activate([row.leadingAnchor.constraint(equalTo:cell.contentView.leadingAnchor,constant:16),
      row.trailingAnchor.constraint(equalTo:cell.contentView.trailingAnchor,constant:-16),row.topAnchor.constraint(equalTo:cell.contentView.topAnchor),
      row.bottomAnchor.constraint(equalTo:cell.contentView.bottomAnchor,constant:-10)])
    let devices=visibleDevices,first=indexPath.row*2,input=selection.inputEpoch
    for column in 0..<2 {
      let offset=first+column
      guard devices.indices.contains(offset) else {row.addArrangedSubview(UIView());continue}
      let device=devices[offset],editing=selection.state.editing
      let card=HomeDeviceCardButton(title:device.nickname,editing:editing,checked:selection.state.isSelected(device.id))
      card.accessibilityIdentifier=editing ? "home_selection_item" : "home_device_open"
      card.isEnabled = !editing || !selection.state.loading
      card.activate = { [weak self] in
        guard let self,!busy,cleanupRevision==nil,account.session != nil,account.revision==sessionRevision else{return}
        if selection.state.editing {selection.toggle(device.id,epoch:input);return}
        guard let current=roomTabs.deviceForOpen(device.id) else{return}
        refreshAfterRooms=true;openDevice(current)
      }
      card.longPress = { [weak self] in
        guard let self,!busy,cleanupRevision==nil,account.session != nil,account.revision==sessionRevision else{return}
        selection.begin(device.id,epoch:input)
      }
      row.addArrangedSubview(card)
    }
    return cell
  }
}

/// Native card shell only. Image/status/power are deliberately absent when HOME has no such metadata.
@MainActor private final class HomeDeviceCardButton:UIButton {
  var activate:(()->Void)?,longPress:(()->Void)?
  init(title:String,editing:Bool,checked:Bool) {
    super.init(frame:.zero)
    backgroundColor = .white;layer.cornerRadius=12;layer.shadowColor=UIColor.black.cgColor
    layer.shadowOpacity=0.04;layer.shadowOffset=CGSize(width:0,height:1);layer.shadowRadius=10
    accessibilityLabel=title;accessibilityTraits=checked && editing ? [.button,.selected] : [.button]
    if editing {accessibilityValue=checked ? "已选中" : "未选中"}
    let label=UILabel();label.text=title;label.font=UIFontMetrics.default.scaledFont(for:.systemFont(ofSize:14,weight:.medium))
    label.adjustsFontForContentSizeCategory=true;label.textColor=UIColor(white:51/255,alpha:1)
    label.textAlignment = .center;label.numberOfLines=3;label.isUserInteractionEnabled=false
    label.translatesAutoresizingMaskIntoConstraints=false;addSubview(label)
    let centered=label.centerYAnchor.constraint(equalTo:centerYAnchor,constant:16);centered.priority = .defaultHigh
    NSLayoutConstraint.activate([heightAnchor.constraint(greaterThanOrEqualToConstant:202),label.leadingAnchor.constraint(equalTo:leadingAnchor,constant:12),
      label.trailingAnchor.constraint(equalTo:trailingAnchor,constant:-12),label.topAnchor.constraint(greaterThanOrEqualTo:topAnchor,constant:32),
      label.bottomAnchor.constraint(lessThanOrEqualTo:bottomAnchor,constant:-24),centered])
    if editing {
      let mark=UIImageView(image:UIImage(systemName:checked ? "checkmark.circle.fill" : "circle"))
      mark.tintColor=checked ? UIColor(red:35/255,green:25/255,blue:22/255,alpha:1) : UIColor(white:229/255,alpha:1)
      mark.translatesAutoresizingMaskIntoConstraints=false;mark.isUserInteractionEnabled=false;addSubview(mark)
      NSLayoutConstraint.activate([mark.widthAnchor.constraint(equalToConstant:24),mark.heightAnchor.constraint(equalToConstant:24),
        mark.topAnchor.constraint(equalTo:topAnchor,constant:16),mark.trailingAnchor.constraint(equalTo:trailingAnchor,constant:-16)])
    }
    addTarget(self,action:#selector(tapped),for:.touchUpInside)
    addGestureRecognizer(UILongPressGestureRecognizer(target:self,action:#selector(held(_:))))
  }
  required init?(coder:NSCoder){fatalError("Storyboard initialization is not used")}
  @objc private func tapped(){activate?()}
  @objc private func held(_ gesture:UILongPressGestureRecognizer){if gesture.state == .began {longPress?()}}
}

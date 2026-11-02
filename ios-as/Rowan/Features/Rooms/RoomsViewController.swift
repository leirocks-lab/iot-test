import UIKit

@MainActor
final class RoomsViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UIAdaptivePresentationControllerDelegate {
  private let manager: RoomManager
  private let table = UITableView(frame: .zero, style: .insetGrouped)
  private let status = AccountDesign.label(14)
  private let add = UIButton(type: .system)
  private let refresh = UIButton(type: .system)
  private var editor: RoomNameEditorViewController?
  private var editorSaving = false
  private var leaving = false
  private var rooms: [Room] { manager.state.editing ? manager.state.draft : manager.state.rooms }

  init(account: AccountService) {
    let revision = account.revision
    manager = RoomManager(repository: HTTPRoomRepository(account: account), current: {
      account.session != nil && account.revision == revision
    })
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "房间管理"
    AccountDesign.navigation(navigationItem)
    view.backgroundColor = AccountDesign.background
    table.backgroundColor = AccountDesign.background
    table.separatorStyle = .none
    table.rowHeight = UITableView.automaticDimension
    table.estimatedRowHeight = 56
    table.dataSource = self; table.delegate = self
    table.keyboardDismissMode = .interactive
    add.setTitle("添加房间", for: .normal)
    add.addTarget(self, action: #selector(createRoom), for: .touchUpInside)
    refresh.addTarget(self, action: #selector(reload), for: .touchUpInside)
    refresh.setTitleColor(AccountDesign.link, for: .normal)
    refresh.titleLabel?.font = AccountDesign.font(14)
    let content = UIStackView(arrangedSubviews: [status, refresh, table, add])
    content.axis = .vertical; content.spacing = 8; content.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(content)
    NSLayoutConstraint.activate([
      content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
      content.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
      content.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      content.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16)
    ])
    table.contentInset = UIEdgeInsets(top: -16, left: -16, bottom: 0, right: -16)
    manager.onChange = { [weak self] in self?.render() }
    manager.load()
  }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if isMovingFromParent || navigationController?.isBeingDismissed == true {
      leaving = true; manager.cancel(); editor?.dismiss(animated: false)
    }
  }
  @objc private func reload() { manager.load() }
  @objc private func edit() {
    if manager.state.editing { manager.saveEditing() } else { manager.beginEditing() }
  }
  @objc private func back() {
    if manager.state.editing && !manager.state.busy { manager.cancelEditing() }
    else { manager.cancel(); navigationController?.popViewController(animated: true) }
  }
  @objc private func createRoom() { showNameEditor(room: nil) }
  private func showNameEditor(room: Room?) {
    let state = manager.state
    guard state.loaded, !state.busy, !state.editing, !state.resultUnknown, editor == nil else { return }
    let controller = RoomNameEditorViewController(name: room?.name ?? "", heading: room == nil ? "添加房间" : "房间名称")
    controller.confirm = { [weak self, weak controller] name in
      guard let self, controller != nil else { return }
      editorSaving = true
      if let room { manager.rename(id: room.id, name: name) } else { manager.create(name: name) }
    }
    controller.cancel = { [weak self, weak controller] in
      guard let self else { return }
      if editorSaving { manager.cancel() }
      editorSaving = false; editor = nil; controller?.dismiss(animated: true)
    }
    editor = controller
    controller.modalPresentationStyle = .pageSheet
    controller.sheetPresentationController?.detents = [.medium()]
    controller.sheetPresentationController?.preferredCornerRadius = 24
    controller.presentationController?.delegate = self
    present(controller, animated: true) { [weak self, weak controller] in controller?.presentationController?.delegate = self }
  }
  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    if editorSaving { manager.cancel() }
    editorSaving = false; editor = nil
  }
  private func remove(_ room: Room) {
    do { try requireRemovableRoom(room) }
    catch { manager.removeFromDraft(room.id); return }
    let alert = UIAlertController(title: "删除房间", message: "删除“\(room.name)”？当前房间为空，完成编辑后才保存删除。", preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "取消", style: .cancel))
    alert.addAction(UIAlertAction(title: "删除", style: .destructive) { [weak self] _ in self?.manager.removeFromDraft(room.id) })
    present(alert, animated: true)
  }
  private func render() {
    let state = manager.state
    guard !leaving else { return }
    if state.sessionExpired {
      leaving = true; editor?.dismiss(animated: false); navigationController?.popViewController(animated: true); return
    }
    navigationItem.leftBarButtonItem = state.editing ? UIBarButtonItem(title: "取消", style: .plain, target: self, action: #selector(back)) :
      UIBarButtonItem(image: UIImage(named: "AuthBack")?.withRenderingMode(.alwaysOriginal), style: .plain, target: self, action: #selector(back))
    navigationItem.rightBarButtonItem = UIBarButtonItem(title: state.editing ? "完成" : "编辑", style: .plain, target: self, action: #selector(edit))
    navigationItem.rightBarButtonItem?.isEnabled = state.loaded && !state.busy && !state.resultUnknown
    status.text = state.busy ? (editorSaving || state.editing ? "正在保存…" : "正在加载房间…") : state.error ?? (state.loaded && rooms.isEmpty ? "暂无房间" : nil)
    status.isHidden = status.text == nil
    refresh.setTitle(state.resultUnknown ? "刷新并核对操作结果" : "刷新", for: .normal)
    refresh.isEnabled = !state.busy
    refresh.isHidden = state.error == nil && state.loaded
    add.isHidden = state.editing
    AccountDesign.mainButton(add, enabled: state.loaded && !state.busy && !state.resultUnknown)
    editor?.update(busy: state.busy, error: state.error, unknown: state.resultUnknown)
    if editorSaving && !state.busy && state.error == nil && !state.resultUnknown {
      editorSaving = false; editor?.dismiss(animated: true); editor = nil
    }
    table.reloadData()
  }
  func numberOfSections(in tableView: UITableView) -> Int { rooms.count }
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { 1 }
  func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat { 1 }
  func tableView(_ tableView: UITableView, heightForFooterInSection section: Int) -> CGFloat { 9 }
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let room = rooms[indexPath.section], state = manager.state
    let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
    cell.backgroundColor = .white; cell.layer.cornerRadius = 12; cell.clipsToBounds = true; cell.selectionStyle = .none
    let name = AccountDesign.label(16); name.text = room.name
    let count = AccountDesign.label(13); count.textColor = AccountDesign.muted
    count.text = room.deviceCount.map { "\($0)个设备" } ?? "设备数量未知"
    let titles = UIStackView(arrangedSubviews: [name, count]); titles.spacing = 8; titles.alignment = .center
    let row = UIStackView(); row.alignment = .center; row.spacing = 4
    let enabled = !state.busy && !state.resultUnknown
    if state.editing { row.addArrangedSubview(action("−", label: "删除\(room.name)", enabled: enabled, color: .systemRed) { [weak self] in self?.remove(room) }) }
    row.addArrangedSubview(titles)
    if state.editing {
      row.addArrangedSubview(action("↑", label: "上移\(room.name)", enabled: enabled && indexPath.section > 0) { [weak self] in self?.manager.moveUp(room.id) })
      row.addArrangedSubview(action("↓", label: "下移\(room.name)", enabled: enabled && indexPath.section < self.rooms.count - 1) { [weak self] in self?.manager.moveDown(room.id) })
    } else { row.addArrangedSubview(action("✎", label: "修改\(room.name)名称", enabled: enabled) { [weak self] in self?.showNameEditor(room: room) }) }
    let content = UIStackView(arrangedSubviews: [row]); content.axis = .vertical; content.spacing = 4
    if room.isDefault == true { let label = AccountDesign.label(12); label.text = "默认房间"; label.textColor = AccountDesign.muted; content.addArrangedSubview(label) }
    content.translatesAutoresizingMaskIntoConstraints = false; cell.contentView.addSubview(content)
    NSLayoutConstraint.activate([content.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 4),
      content.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -4),
      content.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 16),
      content.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -8)])
    return cell
  }
  private func action(_ title: String, label: String, enabled: Bool, color: UIColor = .gray, handler: @escaping () -> Void) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal); button.setTitleColor(color, for: .normal)
    button.titleLabel?.font = AccountDesign.font(20); button.accessibilityLabel = label; button.isEnabled = enabled
    button.addAction(UIAction { _ in handler() }, for: .touchUpInside)
    NSLayoutConstraint.activate([button.widthAnchor.constraint(equalToConstant: 40), button.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)])
    return button
  }
}

@MainActor
private final class RoomNameEditorViewController: UIViewController {
  var confirm: ((String) -> Void)?
  var cancel: (() -> Void)?
  private let field = UITextField()
  private let save = UIButton(type: .system)
  private let status = AccountDesign.label(14)
  private let heading: String
  private var busy = false
  private var unknown = false
  init(name: String, heading: String) { self.heading = heading; super.init(nibName: nil, bundle: nil); field.text = name }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .white
    let title = AccountDesign.label(17, centered: true, weight: .semibold); title.text = heading
    field.placeholder = "请输入房间名称"; field.font = AccountDesign.font(16); field.borderStyle = .roundedRect
    field.autocorrectionType = .no; field.addTarget(self, action: #selector(changed), for: .editingChanged)
    field.heightAnchor.constraint(greaterThanOrEqualToConstant: 46).isActive = true
    save.setTitle("确定", for: .normal)
    save.addAction(UIAction { [weak self] _ in guard let self, save.isEnabled else { return }; confirm?(field.text ?? "") }, for: .touchUpInside)
    let cancel = UIButton(type: .system); cancel.setTitle("取消", for: .normal); cancel.backgroundColor = AccountDesign.background; cancel.layer.cornerRadius = 8
    cancel.setTitleColor(.darkGray, for: .normal); cancel.addAction(UIAction { [weak self] _ in self?.cancel?() }, for: .touchUpInside)
    let buttons = UIStackView(arrangedSubviews: [cancel, save]); buttons.spacing = 16; buttons.distribution = .fillEqually
    let content = UIStackView(arrangedSubviews: [title, field, status, buttons]); content.axis = .vertical; content.spacing = 24; content.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(content)
    NSLayoutConstraint.activate([content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
      content.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16), content.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      content.bottomAnchor.constraint(lessThanOrEqualTo: view.keyboardLayoutGuide.topAnchor, constant: -16)])
    changed()
  }
  func update(busy: Bool, error: String?, unknown: Bool) {
    self.busy = busy; self.unknown = unknown
    if isViewLoaded { status.text = busy ? "正在保存…" : error; status.isHidden = status.text == nil; changed() }
  }
  @objc private func changed() {
    AccountDesign.mainButton(save, enabled: !busy && !unknown && !(field.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    field.isEnabled = !busy && !unknown
    status.isHidden = status.text == nil
  }
}

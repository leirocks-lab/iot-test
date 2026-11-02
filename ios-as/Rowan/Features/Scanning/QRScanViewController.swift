import UIKit
import AVFoundation
import PhotosUI

/// Native-only scanning. Decoding never grants device identity or triggers HTTP/BLE/navigation.
@MainActor
final class QRScanViewController: UIViewController, PHPickerViewControllerDelegate {
  private let account: AccountService, revision: Int
  private let camera = QRScanCamera(), photos = QRPhotoReader.shared
  private let model: QRScanSession
  private let visibility: (() -> (Bool, Bool))?
  private var cameraTicket: QRScanTicket?
  var pendingPhotoTicket: QRScanTicket? { photoTicket }
  private let preview = AVCaptureVideoPreviewLayer()
  private let frame = UIView(), status = UILabel(), album = UIButton(type: .system), retry = UIButton(type: .system)
  private var notifications: [NSObjectProtocol] = []
  private var pickerOwned = false, photoTicket: QRScanTicket?
  init(account: AccountService, expectedRevision: Int, session: QRScanSession? = nil, visibility: (() -> (Bool, Bool))? = nil) {
    self.account = account; revision = expectedRevision
    self.visibility = visibility
    model = session ?? QRScanSession(accountRevision: expectedRevision, accountCurrent: {
      account.revision == expectedRevision && account.session != nil && account.pendingLogoutCleanupRevision == nil
    })
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit {
    camera.stop(cameraTicket); if let photoTicket { photos.cancel(photoTicket) }
    notifications.forEach { NotificationCenter.default.removeObserver($0) }
  }
  override func viewDidLoad() {
    super.viewDidLoad(); title = "扫一扫"; view.backgroundColor = .black
    preview.session = camera.session; preview.videoGravity = .resizeAspectFill; view.layer.addSublayer(preview)
    let stack = UIStackView(); stack.axis = .vertical; stack.spacing = 20; stack.alignment = .center
    let scroll = UIScrollView(); scroll.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(scroll)
    stack.translatesAutoresizingMaskIntoConstraints = false; scroll.addSubview(stack)
    frame.layer.borderWidth = 2; frame.layer.borderColor = UIColor.white.cgColor
    frame.backgroundColor = .clear; frame.isAccessibilityElement = true; frame.accessibilityLabel = "二维码取景框"
    status.font = .preferredFont(forTextStyle: .body); status.adjustsFontForContentSizeCategory = true
    status.textColor = .white; status.numberOfLines = 0; status.textAlignment = .center
    album.setTitle("使用相册", for: .normal); album.backgroundColor = .white; album.tintColor = .black; album.layer.cornerRadius = 8
    album.titleLabel?.font = .preferredFont(forTextStyle: .headline); album.titleLabel?.adjustsFontForContentSizeCategory = true
    album.addTarget(self, action: #selector(openAlbum), for: .touchUpInside)
    retry.setTitle("重新扫描", for: .normal); retry.tintColor = .white; retry.addTarget(self, action: #selector(beginCamera), for: .touchUpInside)
    for item in [frame, status, album, retry] { stack.addArrangedSubview(item) }
    NSLayoutConstraint.activate([
      scroll.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor), scroll.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
      scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), scroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
      stack.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor, constant: 24),
      stack.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor, constant: -24),
      stack.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: 32), stack.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -32),
      stack.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor, constant: -48),
      frame.widthAnchor.constraint(equalTo: stack.widthAnchor, multiplier: 0.75), frame.heightAnchor.constraint(equalTo: frame.widthAnchor),
      album.heightAnchor.constraint(greaterThanOrEqualToConstant: 48), album.widthAnchor.constraint(equalToConstant: 150)
    ])
    view.accessibilityIdentifier = "scan_page"; frame.accessibilityIdentifier = "scan_frame"; status.accessibilityIdentifier = "scan_status"
    album.accessibilityIdentifier = "scan_album"; retry.accessibilityIdentifier = "scan_retry"
    notifications.append(NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in self?.pause(background: true) }
    })
    notifications.append(NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in guard let self, nativeVisible else { return }; refreshVisibility(); if !pickerOwned { beginCamera() } }
    })
    notifications.append(NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in guard let self else { return }; refreshVisibility(); if !currentAccount { model.close(); camera.stop(cameraTicket); if let photoTicket { photos.cancel(photoTicket) }; render() } }
    })
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews(); preview.frame = view.bounds
    if let connection = preview.connection, connection.isVideoOrientationSupported {
      switch view.window?.windowScene?.interfaceOrientation {
      case .landscapeLeft: connection.videoOrientation = .landscapeLeft
      case .landscapeRight: connection.videoOrientation = .landscapeRight
      case .portraitUpsideDown: connection.videoOrientation = .portraitUpsideDown
      default: connection.videoOrientation = .portrait
      }
    }
  }
  override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); refreshVisibility(); if !pickerOwned && model.phase == .inactive { beginCamera() } }
  override func viewWillDisappear(_ animated: Bool) { pause(background: false); super.viewWillDisappear(animated) }
  private var currentAccount: Bool { account.revision == revision && account.session != nil && account.pendingLogoutCleanupRevision == nil }
  private var nativeVisible: Bool { viewIfLoaded?.window != nil && navigationController?.topViewController === self && presentedViewController == nil }
  private func refreshVisibility() {
    let state = visibility?() ?? (nativeVisible, UIApplication.shared.applicationState == .active)
    model.visibility(state.0, active: state.1, ownedPickerCover: pickerOwned)
  }
  private func pause(background: Bool) {
    camera.stop(cameraTicket); model.visibility(false, active: !background && UIApplication.shared.applicationState == .active, ownedPickerCover: !background && pickerOwned)
    if background || !pickerOwned { if let photoTicket { photos.cancel(photoTicket) } }
  }
  @objc private func beginCamera() {
    refreshVisibility(); guard let ticket = model.beginCamera() else { render(); return }; cameraTicket = ticket; render()
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: permission(.authorized, ticket)
    case .denied: permission(.denied, ticket)
    case .restricted: permission(.restricted, ticket)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] allowed in Task { @MainActor [weak self] in self?.permission(allowed ? .authorized : .denied, ticket) } }
    @unknown default: permission(.unavailable, ticket)
    }
  }
  private func permission(_ value: QRPermission, _ ticket: QRScanTicket) {
    refreshVisibility()
    if model.permission(value, ticket: ticket) {
      camera.start(ticket) { [weak self] ticket, result in Task { @MainActor [weak self] in self?.received(result, ticket) } }
    }
    render()
  }
  @objc private func openAlbum() {
    guard !photos.busy else { status.text = "照片仍在处理中，请稍后重试"; return }
    refreshVisibility(); guard let ticket = model.beginPicker() else { return }
    ownPicker(ticket)
    var configuration = PHPickerConfiguration(); configuration.filter = .images; configuration.selectionLimit = 1
    let picker = PHPickerViewController(configuration: configuration); picker.delegate = self
    present(picker, animated: true); render()
  }
  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    guard pickerOwned, let ticket = photoTicket else { picker.dismiss(animated: true); return }
    picker.dismiss(animated: true) { [weak self] in
      guard let self else { return }
      completePickerDismissal(ticket, provider: results.count == 1 ? results.first.map { QRSystemPhotoProvider($0.itemProvider) } : nil)
    }
  }
  // Native controller coordination seams; no RN/public bridge entry is exposed.
  func ownPicker(_ ticket: QRScanTicket) { photoTicket = ticket; pickerOwned = true; camera.stop(cameraTicket); render() }
  func completePickerDismissal(_ ticket: QRScanTicket, provider: (any QRPhotoFileProvider)?) {
    pickerOwned = false; refreshVisibility()
    guard let provider else { model.cancelPicker(ticket); photoTicket = nil; render(); return }
    guard model.beginPhoto(ticket) else {
      // A genuine background/old account invalidates the image, not the page's retry controls.
      photoTicket = nil; render(); return
    }
    if !photos.read(provider, ticket: ticket, completion: { [weak self] ticket, result in Task { @MainActor [weak self] in self?.received(result, ticket) } }) { model.failed(.unavailable, ticket: ticket) }
    render()
  }
  private func received(_ value: Result<[QRPayload], QRScanFailure>, _ ticket: QRScanTicket) {
    refreshVisibility()
    switch value { case let .success(payloads): model.received(payloads, ticket: ticket); case let .failure(error): model.failed(error, ticket: ticket) }
    render()
  }
  private func render() {
    switch model.phase {
    case .permission: status.text = "请允许使用相机扫描二维码，也可以使用相册"
    case .camera, .inactive: status.text = "扫描设备二维码\n在配件、包装或说明书上查找产品二维码，并放入取景框"
    case .picker: status.text = "请选择一张照片"
    case .processing: status.text = "正在识别照片…"
    case .denied, .restricted: status.text = "相机暂不可用，请在系统设置中检查权限，也可以使用相册"
    case .unsupported: status.text = "暂不支持此二维码，请返回手动选择设备"
    case .multiple: status.text = "发现多个二维码，请只保留一个后重试"
    case .resourceLimit: status.text = "照片或二维码内容过大，请重新选择"
    case .unreadable: status.text = "未能识别二维码，请重新选择或扫描"
    case .unavailable: status.text = "暂时无法识别，请重试或使用相册"
    case .closed: status.text = "登录状态已变化，请返回首页"
    }
    album.isEnabled = model.phase != .closed && model.phase != .processing && model.phase != .picker
    retry.isHidden = [.camera, .permission, .picker, .processing, .closed].contains(model.phase)
  }
}

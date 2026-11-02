import UIKit
import React_RCTAppDelegate

@MainActor
final class DeviceViewController: UIViewController {
  private let factory: RCTReactNativeFactory
  let deviceID: String
  let accountRevision: Int
  let bridgePageID = UUID().uuidString
  /// Native root capability, deliberately independent of shared runtime/module and observation IDs.
  let pageSessionID = UUID().uuidString
  private(set) var bridgeVisible = false
  init(factory: RCTReactNativeFactory, deviceID: String, accountRevision: Int) {
    self.factory = factory
    self.deviceID = deviceID
    self.accountRevision = accountRevision
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit {
    let id = bridgePageID
    Task { @MainActor in RowanHostServices.shared.endPageID(id) }
  }

  override func loadView() {
    view = factory.rootViewFactory.view(withModuleName: "RowanDeviceModule", initialProperties: ["deviceId": deviceID, "pageSessionId": pageSessionID])
  }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    navigationController?.setNavigationBarHidden(true, animated: animated)
    RowanHostServices.shared.deviceController = self
  }
  override func viewWillDisappear(_ animated: Bool) {
    bridgeVisible = false
    RowanHostServices.shared.pageWillDisappear(self)
    super.viewWillDisappear(animated)
    navigationController?.setNavigationBarHidden(false, animated: animated)
    if RowanHostServices.shared.deviceController === self { RowanHostServices.shared.deviceController = nil }
  }
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated); bridgeVisible = true; RowanHostServices.shared.pageDidAppear()
  }
  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    // A cancelled interactive pop or temporary native cover only pauses delivery.
    if navigationController?.viewControllers.contains(where: { $0 === self }) != true { RowanHostServices.shared.endPage(self) }
  }
  func authorizedBridgeContext() -> Bool {
    let account = RowanAppServices.shared.account
    return account.revision == accountRevision && account.session != nil && account.pendingLogoutCleanupRevision == nil &&
      navigationController?.viewControllers.contains(where: { $0 === self }) == true
  }
}

import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  private let navigation = UINavigationController()

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if DEBUG
    // Scheme TestAction supplies this only to the hosted, offline unit-test process.
    // Avoid session restoration and RN startup while fixture tests run inside Rowan.app.
    if ProcessInfo.processInfo.environment["ROWAN_UNIT_TEST_HOST"] == "1" {
      window = UIWindow(frame: UIScreen.main.bounds)
      window?.rootViewController = UIViewController()
      window?.makeKeyAndVisible()
      return true
    }
#endif
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let presentationWindow=PresentationWindow(frame: UIScreen.main.bounds)
    window = presentationWindow
    presentationAttached=RowanAppServices.shared.startPresentation(window:presentationWindow)

    window?.rootViewController = navigation
    showWelcome()
    window?.makeKeyAndVisible()

    return true
  }

  private var presentationAttached=false
  func applicationWillTerminate(_ application:UIApplication) {if presentationAttached {RowanAppServices.shared.stopPresentation();presentationAttached=false}}

  private var configuredBrandID: String? {
    let value = (Bundle.main.object(forInfoDictionaryKey: "RowanBrandID") as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
    return value.flatMap { $0.isEmpty || $0.hasPrefix("$(") ? nil : $0 }
  }

  private func showWelcome() {
    RowanHostServices.shared.deviceController = nil
    let services = RowanAppServices.shared
    if services.account.pendingLogoutCleanupRevision != nil { showHome(); return }
    let controller = WelcomeViewController(model: WelcomeModel(account: services.account), authenticated: { [weak self] in
      self?.showHome()
    }, showLogin: { [weak self] in self?.showLogin() }, showRegistration: { [weak self] in self?.showRegistration() })
    navigation.setViewControllers([controller], animated: false)
  }

  private func showLogin() {
    let services = RowanAppServices.shared
    if services.account.pendingLogoutCleanupRevision != nil { showHome(); return }
    let controller = AccountViewController(account: services.account, agreements: services.agreements, brandID: configuredBrandID) { [weak self] in self?.showHome() }
    navigation.pushViewController(controller, animated: true)
  }

  private func showRegistration() {
    let services = RowanAppServices.shared
    if services.account.pendingLogoutCleanupRevision != nil { showHome(); return }
    let model = EmailRegistrationModel(service: services.registrationCaptcha, account: services.account,
                                       cooldowns: services.recoveryCooldowns, brandID: configuredBrandID)
    let controller = EmailRegistrationViewController(model: model, agreements: services.agreements) { [weak self] in self?.showHome() }
    navigation.pushViewController(controller, animated: true)
  }

  private func showHome() {
    let services = RowanAppServices.shared
    guard services.account.session != nil || services.account.pendingLogoutCleanupRevision != nil else { showWelcome(); return }
    let revision = services.account.revision
    let home = HomeViewController(repository: services.home, account: services.account, selfUnbind:services.selfUnbind, homeReadGate:services.homeReadGate(expectedRevision:revision) ?? HomeReadGate(),
      makePreferences: { try services.newPreferences(expectedRevision: $0) }, openDevice: { [weak self] device in
      guard let self, let factory = reactNativeFactory,
            services.account.session != nil, services.account.revision == revision else { return }
      navigation.pushViewController(DeviceViewController(factory: factory, deviceID: device.id, accountRevision: revision), animated: true)
    }, showAccount: { [weak self] in
      // An old Home callback must never replace a newly authenticated account's UI.
      guard services.account.session == nil else { return }
      self?.showWelcome()
    })
    navigation.setViewControllers([home], animated: true)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

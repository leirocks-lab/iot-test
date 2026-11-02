import UIKit

/// Observes only; no style/locale override, added view, resource/theme application or RN behavior.
@MainActor
final class PresentationWindow: UIWindow {
  fileprivate var presentationSourceID: UUID?
  fileprivate var presentationSignal: (() -> Void)?
  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    presentationSignal?()
  }
}

/// One explicit native window/screen. Page/window effective overrides are never the OS input.
/// Legacy Window callback supports the project's iOS15.1 deployment; newer trait APIs are optional
/// future migration. Raw screen traits and callback behavior still require macOS/UIKit validation.
@MainActor
final class UIKitPresentationSystemSource: PresentationSystemSource {
  private let center: NotificationCenter
  private weak var window: PresentationWindow?
  private let sourceID = UUID()
  private var listenerID: UUID?
  private var listener: (() -> Void)?
  private let scheduler: any PresentationDeliveryScheduler
  init(center: NotificationCenter = .default, scheduler: any PresentationDeliveryScheduler = PresentationMainActorScheduler()) {
    self.center = center; self.scheduler = scheduler
  }
  @discardableResult func bind(window: PresentationWindow) -> Bool {
    guard window.presentationSourceID == nil || window.presentationSourceID == sourceID else { return false }
    if self.window === window { return true }
    unbindWindow(); self.window = window; window.presentationSourceID = sourceID
    window.presentationSignal = { [weak self, weak window] in
      guard let self, let window, self.window === window, window.presentationSourceID == sourceID else { return }
      listener?()
    }
    listener?(); return true
  }
  func unbindWindow() {
    if let window, window.presentationSourceID == sourceID { window.presentationSignal = nil; window.presentationSourceID = nil }
    window = nil; listener?()
  }
  func capture() -> PresentationSystemState {
    let active = UIApplication.shared.applicationState == .active
    guard let window else { return PresentationSystemState(active: active, input: nil) }
    // Screen is above page/window overrides in the trait hierarchy. Do not read window.traitCollection
    // or a controller's overrideUserInterfaceStyle, which would feed effective app theme back into OS.
    let screen = window.windowScene?.screen ?? window.screen
    let appearance: EffectiveTheme
    switch screen.traitCollection.userInterfaceStyle { case .light: appearance = .light; case .dark: appearance = .dark; default: return PresentationSystemState(active: active, input: nil) }
    return PresentationSystemState(active: active, input: PresentationSystemInput(languageTags: NSLocale.preferredLanguages, appearance: appearance))
  }
  func observe(_ changed: @escaping () -> Void) throws -> any PresentationObservation {
    guard listenerID == nil else { throw PresentationRegistrationFailure() }
    let id = UUID(); listenerID = id; listener = changed
    let names = [UIApplication.didBecomeActiveNotification, UIApplication.willResignActiveNotification, NSLocale.currentLocaleDidChangeNotification]
    let registration = PresentationNotificationRegistration(center: center, names: names, object: nil, scheduler: scheduler) { [weak self] in
      guard let self, listenerID == id else { return }; listener?()
    }
    return PresentationClosureObservation { [weak self] in
      registration.close()
      if self?.listenerID == id { self?.listener = nil; self?.listenerID = nil }
    }
  }
}

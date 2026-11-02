import Foundation

struct PresentationSystemState { let active: Bool; let input: PresentationSystemInput? }
@MainActor protocol PresentationObservation: AnyObject { func close() }
@MainActor protocol PresentationSignalSource { func observe(_ changed: @escaping () -> Void) throws -> any PresentationObservation }
@MainActor protocol PresentationSystemSource: PresentationSignalSource { func capture() -> PresentationSystemState }
@MainActor final class PresentationClosureObservation: PresentationObservation {
  private var action: (() -> Void)?
  init(_ action: @escaping () -> Void) { self.action = action }
  func close() { let value = action; action = nil; value?() }
}
enum PresentationUnavailable: Equatable { case notStarted, systemInput, owner, closed }
enum PresentationRead { case ready(PresentationSnapshot), unavailable(PresentationUnavailable) }
struct PresentationRegistrationFailure: Error { }

/// Only signals are retained/delivered. Every reader freshly captures AccountService authority.
/// Native pages and future bridge share this owner, never an async old-account snapshot cache.
@MainActor
final class PresentationService {
  private let owner: PresentationOwner
  private let system: any PresentationSystemSource
  private let accountSignals: any PresentationSignalSource
  private var started = false, closed = false, dirty = false, wasActive = false
  private var generation: UInt64 = 0
  private var subscriptions: [any PresentationObservation] = []
  private var lastRevision: Int?, lastFailure: PresentationUnavailable?
  private struct Listener { weak var owner: AnyObject?; let changed: () -> Void }
  private var listeners: [UUID: Listener] = [:]
  init(owner: PresentationOwner, system: any PresentationSystemSource, accountSignals: any PresentationSignalSource) {
    self.owner = owner; self.system = system; self.accountSignals = accountSignals
  }
  @discardableResult func start() -> Bool {
    guard !closed else { return false }; if started { return true }
    started = true; generation &+= 1; let token = generation
    do {
      for source in [accountSignals, system as any PresentationSignalSource] {
        let value = try source.observe { [weak self] in self?.signal(token) }
        guard started, !closed, generation == token else { value.close(); return false }
        subscriptions.append(value)
      }
    } catch {
      started = false; generation &+= 1
      let old = subscriptions; subscriptions = []; old.forEach { $0.close() }; return false
    }
    signal(token); return started && !closed && generation == token
  }
  private func signal(_ token: UInt64) { guard !closed, started, token == generation else { return }; _ = capture() }
  func capture() -> PresentationRead {
    guard !closed else { return .unavailable(.closed) }; guard started else { return .unavailable(.notStarted) }
    let os = system.capture()
    let result: PresentationRead
    if let input = os.input { do { result = .ready(try owner.capture(input)) } catch { result = .unavailable(.owner) } }
    else { result = .unavailable(.systemInput) }
    let revision: Int?, failure: PresentationUnavailable?
    switch result { case let .ready(value): revision = value.revision; failure = nil; case let .unavailable(value): revision = nil; failure = value }
    let changed = revision != lastRevision || failure != lastFailure
    lastRevision = revision; lastFailure = failure
    if !os.active { if changed { dirty = true } }
    else if changed || dirty || !wasActive { dirty = false; wasActive = true; emit() }
    wasActive = os.active; return closed ? .unavailable(.closed) : result
  }
  /// Subscribe before capture. Owner must weakly capture its page in changed; observation is explicitly released.
  func observe(_ owner: AnyObject, _ changed: @escaping () -> Void) throws -> any PresentationObservation {
    guard !closed else { throw PresentationRegistrationFailure() }
    listeners = listeners.filter { $0.value.owner != nil }
    guard listeners.count < 64 else { throw PresentationRegistrationFailure() }
    let token = UUID(); listeners[token] = Listener(owner: owner, changed: changed)
    return PresentationClosureObservation { [weak self] in self?.listeners.removeValue(forKey: token) }
  }
  private func emit() {
    listeners = listeners.filter { $0.value.owner != nil }
    for (token, value) in Array(listeners) where !closed && listeners[token] != nil && value.owner != nil { value.changed() }
  }
  func close() {
    guard !closed else { return }; closed = true; started = false; generation &+= 1
    listeners = [:]; let old = subscriptions; subscriptions = []; old.forEach { $0.close() }
  }
}

// Scheduler is a real delivery/cancellation boundary, not a test-only suspension hook.
protocol PresentationDeliveryCancellation: Sendable { func cancel() }
protocol PresentationDeliveryScheduler: Sendable {
  func schedule(_ action: @escaping @MainActor () -> Void) -> any PresentationDeliveryCancellation
}
private struct PresentationTaskCancellation: PresentationDeliveryCancellation {
  let task: Task<Void, Never>
  func cancel() { task.cancel() }
}
struct PresentationMainActorScheduler: PresentationDeliveryScheduler {
  func schedule(_ action: @escaping @MainActor () -> Void) -> any PresentationDeliveryCancellation {
    PresentationTaskCancellation(task: Task { @MainActor in guard !Task.isCancelled else { return }; action() })
  }
}
/// Lock protects ingress before any Task is scheduled. Contains no account/locale/theme payload.
/// At most one pending delivery per registration; a running delivery may admit one next delivery.
private final class PresentationNotificationMailbox: @unchecked Sendable {
  private let lock = NSLock()
  private let scheduler: any PresentationDeliveryScheduler
  private let changed: @MainActor () -> Void
  private var active = true
  private var pending: UUID?
  private var cancellation: (any PresentationDeliveryCancellation)?
  init(scheduler: any PresentationDeliveryScheduler, changed: @escaping @MainActor () -> Void) {
    self.scheduler = scheduler; self.changed = changed
  }
  func signal() {
    lock.lock()
    guard active, pending == nil else { lock.unlock(); return }
    let id = UUID(); pending = id; lock.unlock()
    let work = scheduler.schedule { [weak self] in self?.deliver(id) }
    lock.lock()
    if active, pending == id { cancellation = work; lock.unlock() }
    else { lock.unlock(); work.cancel() }
  }
  @MainActor private func deliver(_ id: UUID) {
    lock.lock()
    guard active, pending == id else { lock.unlock(); return }
    pending = nil; cancellation = nil; lock.unlock()
    changed() // Fresh authority is captured by the caller, never by the notification callback.
  }
  func close() {
    lock.lock(); active = false; pending = nil
    let work = cancellation; cancellation = nil; lock.unlock(); work?.cancel()
  }
}
@MainActor
final class PresentationNotificationRegistration: PresentationObservation {
  private let center: NotificationCenter
  private let mailbox: PresentationNotificationMailbox
  private var tokens: [NSObjectProtocol] = []
  init(center: NotificationCenter, names: [Notification.Name], object: AnyObject?,
       scheduler: any PresentationDeliveryScheduler, changed: @escaping @MainActor () -> Void) {
    self.center = center
    let mailbox = PresentationNotificationMailbox(scheduler: scheduler, changed: changed); self.mailbox = mailbox
    tokens = names.map { name in center.addObserver(forName: name, object: object, queue: nil) { _ in mailbox.signal() } }
  }
  func close() {
    mailbox.close() // Retire/cancel before removing observers; stale tasks cannot call a new registration.
    let old = tokens; tokens = []; old.forEach { center.removeObserver($0) }
  }
}
/// MainActor notification delivery ignores emitted payload and freshly captures current authority.
@MainActor
final class AccountPresentationSignals: PresentationSignalSource {
  private let account: AccountService
  private let center: NotificationCenter
  private let scheduler: any PresentationDeliveryScheduler
  init(account: AccountService, center: NotificationCenter = .default,
       scheduler: any PresentationDeliveryScheduler = PresentationMainActorScheduler()) {
    self.account = account; self.center = center; self.scheduler = scheduler
  }
  func observe(_ changed: @escaping () -> Void) throws -> any PresentationObservation {
    PresentationNotificationRegistration(center: center, names: [.rowanAccountContextChanged], object: account,
      scheduler: scheduler, changed: changed)
  }
}

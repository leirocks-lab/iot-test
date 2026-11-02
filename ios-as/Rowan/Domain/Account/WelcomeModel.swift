import Foundation

@MainActor
final class WelcomeModel {
  enum State: Equatable { case restoring, ready, authenticated, cleanupRequired }
  private let account: AccountService
  private var task: Task<Void, Never>?
  private var generation = 0
  private var restoreRevision: Int?
  private var started = false
  private(set) var state = State.restoring
  private(set) var message: String?
  var onChange: (() -> Void)?

  init(account: AccountService) { self.account = account }
  deinit { task?.cancel() }

  func restoreIfNeeded() {
    if account.pendingLogoutCleanupRevision != nil { state = .cleanupRequired; message = nil; onChange?(); return }
    guard !started else { return }
    started = true
    generation += 1
    let expected = generation
    let revision = account.revision
    restoreRevision = revision
    state = .restoring
    message = nil
    onChange?()
    task = Task { [weak self] in
      guard let self else { return }
      do {
        try await account.restore()
        try Task.checkCancellation()
        guard generation == expected else { return }
        if account.pendingLogoutCleanupRevision != nil {
          state = .cleanupRequired
        } else if account.revision == revision {
          state = account.session == nil ? .ready : .authenticated
        } else {
          // Refresh rejection may clear the original session; a newer login is never routed by this callback.
          state = .ready
          if account.session != nil { message = "会话已变化，请重新选择账号入口" }
        }
      } catch is CancellationError {
        guard generation == expected else { return }
        account.cancelRestore(expectedRevision: revision)
        state = account.pendingLogoutCleanupRevision == nil ? .ready : .cleanupRequired
      }
      catch {
        guard generation == expected else { return }
        state = account.pendingLogoutCleanupRevision == nil ? .ready : .cleanupRequired
        message = state == .ready ? "无法恢复登录，请使用账号登录" : nil
      }
      guard generation == expected else { return }
      restoreRevision = nil
      task = nil
      onChange?()
    }
  }
  func cancelRestoration() {
    guard state == .restoring else { return }
    started = true
    generation += 1
    task?.cancel()
    task = nil
    if let restoreRevision { account.cancelRestore(expectedRevision: restoreRevision) }
    restoreRevision = nil
    state = account.pendingLogoutCleanupRevision == nil ? .ready : .cleanupRequired
    message = nil
    onChange?()
  }
}

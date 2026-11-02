import Foundation

struct PreferencesState {
  var preferences: UserPreferences? = nil
  var busy = false
  var resultUnknown = false
  var sessionExpired = false
  var error: String? = nil
}

/// One account-bound workflow. Confirmed means read back and committed, not that any
/// host/RN language or theme has been applied. Commit must atomically protect the
/// current account and latest tokens; that implementation belongs to AccountService.
@MainActor
final class PreferencesService {
  private let repository: any PreferencesRepository
  private let currentAccountValid: () -> Bool
  private let commitSettings: (Int, String, Int) async throws -> Void
  private let timeoutNanoseconds: UInt64
  private let operation: PreferencesOperationGate
  private let settingsPublication: () -> Int
  private(set) var state = PreferencesState()
  init(repository: any PreferencesRepository, currentAccountValid: @escaping () -> Bool,
       commitSettings: @escaping (Int, String, Int) async throws -> Void, timeoutMillis: Int = 20_000,
       transactionGate: PreferencesOperationGate? = nil, settingsPublication: @escaping () -> Int = { 0 }) {
    precondition(timeoutMillis > 0 && UInt64(timeoutMillis) <= UInt64.max / 1_000_000)
    self.repository = repository; self.currentAccountValid = currentAccountValid; self.commitSettings = commitSettings
    operation = transactionGate ?? PreferencesOperationGate(); self.settingsPublication = settingsPublication
    timeoutNanoseconds = UInt64(timeoutMillis) * 1_000_000
  }
  func load() async throws { try await execute(nil) }
  func save(_ patch: PreferencesPatch) async throws { try await execute(patch) }
  private func expire() { state = PreferencesState(sessionExpired: true, error: "登录会话已变化，请重新进入") }
  private func checkCurrent() throws {
    try Task.checkCancellation()
    guard currentAccountValid() else { throw RowanFailure(code: 499, message: "登录会话已变化") }
  }
  private final class Progress { var dispatched = false; var acknowledged = false; var timedOut = false }
  private struct ReadbackUnknown: Error { }

  private func execute(_ patch: PreferencesPatch?) async throws {
    // Cancellation while queued never owns state or changes the active operation.
    try await operation.run {
      let progress = Progress()
      var sharedStateCaptured = false
      defer { if sharedStateCaptured { self.operation.resultUnknown = self.state.resultUnknown } }
      do {
        try self.checkCurrent()
        let publication = self.settingsPublication()
        // Page state is only a projection of the shared unknown authority.
        self.state.resultUnknown = self.operation.resultUnknown
        sharedStateCaptured = true
        if let patch {
          guard self.state.preferences != nil, !self.state.resultUnknown else {
            self.state.error = "请先读取设置并核对上次操作结果"; return
          }
          _ = try patch.body()
        }
        self.state.busy = true; self.state.error = nil
        let worker = Task { @MainActor in
          if let patch {
            try self.checkCurrent(); progress.dispatched = true
            try await self.repository.patch(patch); progress.acknowledged = true
            try self.checkCurrent()
          }
          let actual = try await self.repository.load()
          try self.checkCurrent()
          if let patch, try !patch.matches(actual) { throw ReadbackUnknown() }
          try await self.commitSettings(self.repository.expectedRevision, actual.rawJSON, publication)
          try self.checkCurrent()
          return actual
        }
        let timer = Task { @MainActor in
          do { try await Task.sleep(nanoseconds: self.timeoutNanoseconds) } catch { return }
          progress.timedOut = true; worker.cancel()
        }
        defer { timer.cancel() }
        // Wait for the worker's completion barrier even if its dependency ignores
        // cancellation. It must not outlive this serial operation and cross a new save.
        let actual = try await withTaskCancellationHandler(operation: { try await worker.value }, onCancel: { worker.cancel() })
        try self.checkCurrent()
        if progress.timedOut { self.markUnconfirmed(dispatched: progress.dispatched, cancelled: false) }
        else { self.state = PreferencesState(preferences: actual) }
      } catch is CancellationError {
        if !self.currentAccountValid() { self.expire() }
        else { self.markUnconfirmed(dispatched: progress.dispatched, cancelled: !progress.timedOut) }
        // Deadline cancellation is a handled result; caller cancellation propagates.
        if !progress.timedOut || Task.isCancelled { throw CancellationError() }
      } catch {
        if !self.currentAccountValid() || (error as? RowanFailure)?.code == 499 { self.expire() }
        else if progress.timedOut || Task.isCancelled {
          self.markUnconfirmed(dispatched: progress.dispatched, cancelled: Task.isCancelled)
        }
        else {
          let code = (error as? RowanFailure)?.code
          let rejected = !progress.acknowledged && code.map { (400...499).contains($0) && $0 != 408 } == true
          self.state.resultUnknown = self.state.resultUnknown || (progress.dispatched && !rejected)
          self.state.busy = false
          if self.state.resultUnknown { self.state.error = "设置结果未确认，请读取核对；不会自动重复提交" }
          else if code == 400 { self.state.error = "设置选项无效" }
          else if code == 401 || code == 403 { self.state.error = "设置访问权限已失效，请重新进入" }
          else { self.state.error = "设置操作失败，请重试；已保留最近确认值" }
        }
        if Task.isCancelled { throw CancellationError() }
      }
      self.state.busy = false
    }
  }
  private func markUnconfirmed(dispatched: Bool, cancelled: Bool) {
    state.busy = false; state.resultUnknown = dispatched || state.resultUnknown
    state.error = dispatched ? "设置结果未确认，请读取核对；不会自动重复提交" : (cancelled ? "读取已取消，可重试" : "读取设置超时，请重试")
  }
}

/// Separate FIFO permit for preferences only; no account transaction/HTTP recursive lock.
@MainActor
final class PreferencesOperationGate {
  // Only accessed by the owning transaction, including its actual-I/O completion barrier.
  var resultUnknown = false
  private struct Waiter { let id: UUID; let continuation: CheckedContinuation<Void, Error> }
  private var owner: UUID?
  private var waiters: [Waiter] = []
  func run(_ work: () async throws -> Void) async throws {
    let id = UUID()
    try Task.checkCancellation()
    if owner == nil { owner = id }
    else {
      try await withTaskCancellationHandler(operation: {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
          if Task.isCancelled { continuation.resume(throwing: CancellationError()) }
          else { waiters.append(Waiter(id: id, continuation: continuation)) }
        }
      }, onCancel: { Task { @MainActor [weak self] in self?.cancel(id) } })
    }
    defer { release(id) }
    try Task.checkCancellation(); try await work()
  }
  private func cancel(_ id: UUID) {
    guard let index = waiters.firstIndex(where: { $0.id == id }) else { return }
    waiters.remove(at: index).continuation.resume(throwing: CancellationError())
  }
  private func release(_ id: UUID) {
    precondition(owner == id)
    if waiters.isEmpty { owner = nil }
    else { let next = waiters.removeFirst(); owner = next.id; next.continuation.resume() }
  }
}

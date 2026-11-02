import Foundation

struct SchedulesState {
  var schedules: [ScheduleRecord] = []
  var loaded = false
  var busy = false
  var resultUnknown = false
  var sessionExpired = false
  var error: String? = nil
}

/// Native-only orchestration. No production action issuer, UI/DI, MQTT or clock execution.
@MainActor
final class SchedulesService {
  private let repository: any SchedulesRepository
  private let currentAccountValid: () -> Bool
  private(set) var state = SchedulesState()
  private let timeoutNanoseconds: UInt64
  private final class Progress { var dispatched = false; var acknowledged = false; var timedOut = false }
  private enum Pending {
    case unidentifiedCreate
    case fields(id: String, expected: ScheduleExpectation)
    case enabled(id: String, value: Bool)
    case deleted(id: String)
    func confirmed(by rows: [ScheduleRecord]) -> Bool {
      switch self {
      case .unidentifiedCreate: return false // Similar rows are never correlation evidence.
      case let .fields(id, expected): return rows.first { $0.id.utf8.elementsEqual(id.utf8) }.map { expected.matches($0) } ?? false
      case let .enabled(id, value): return rows.first { $0.id.utf8.elementsEqual(id.utf8) }?.enabled == value
      case let .deleted(id): return !rows.contains { $0.id.utf8.elementsEqual(id.utf8) }
      }
    }
  }
  private var pending: Pending?
  private enum Operation { case load, create(ScheduleDraft), update(String, ScheduleDraft), enable(String, Bool), delete(String) }
  init(repository: any SchedulesRepository, currentAccountValid: @escaping () -> Bool, timeoutMillis: Int = 20_000) {
    precondition(timeoutMillis > 0 && UInt64(timeoutMillis) <= UInt64.max / 1_000_000)
    self.repository = repository; self.currentAccountValid = currentAccountValid
    timeoutNanoseconds = UInt64(timeoutMillis) * 1_000_000
  }
  func load() async throws { try await execute(.load) }
  func create(_ draft: ScheduleDraft) async throws { try await execute(.create(draft)) }
  func update(id: String, draft: ScheduleDraft) async throws { try await execute(.update(id, draft)) }
  func setEnabled(id: String, enabled: Bool) async throws { try await execute(.enable(id, enabled)) }
  func delete(id: String) async throws { try await execute(.delete(id)) }
  private func expire() { pending = nil; state = SchedulesState(sessionExpired: true, error: "登录会话或设备上下文已变化，请重新进入") }
  private func checkCurrent() throws {
    try Task.checkCancellation()
    guard currentAccountValid() else { throw RowanFailure(code: 499, message: "登录会话或设备上下文已变化") }
  }
  private func existing(_ id: String) throws -> ScheduleRecord {
    let values = state.schedules.filter { $0.id.utf8.elementsEqual(id.utf8) }
    guard values.count == 1, let record = values.first, record.scope == repository.scope else { throw scheduleInvalid() }; return record
  }
  private func execute(_ operation: Operation) async throws {
    // Unlike independent preference fields, duplicate rule submission must not queue.
    guard !state.busy else { return }
    try Task.checkCancellation()
    guard currentAccountValid() else { expire(); return }
    let reading: Bool
    if case .load = operation { reading = true } else { reading = false }
    guard reading || (state.loaded && pending == nil && !state.resultUnknown) else {
      state.error = "请先读取日程并核对上次操作结果"; return
    }
    var target: ScheduleRecord?
    var intent: Pending?
    do {
      switch operation {
      case .load: break
      case let .create(draft): _ = try draft.createBody(scope: repository.scope); intent = .unidentifiedCreate
      case let .update(id, draft):
        let row = try existing(id); target = row
        intent = .fields(id: id, expected: try ScheduleExpectation(body: draft.updateBody(scope: repository.scope, existing: row)))
      case let .enable(id, value): _ = try existing(id); intent = .enabled(id: id, value: value)
      case let .delete(id): _ = try existing(id); intent = .deleted(id: id)
      }
    } catch { state.error = (error as? RowanFailure)?.message ?? "请核对定时参数"; return }
    state.busy = true; state.error = nil
    defer { state.busy = false }
    let progress = Progress()
    do {
      let worker = Task { @MainActor [self] in
        try checkCurrent()
        if !reading { pending = intent; progress.dispatched = true }
        switch operation {
        case .load: break
        case let .create(draft):
          let created = try await repository.create(draft)
          guard created.scope == repository.scope, validScheduleText(created.id) else { throw ScheduleMutationUnknown() }
          // Only the actual ACK ID can correlate this create with an authoritative row.
          pending = .fields(id: created.id, expected: try ScheduleExpectation(body: draft.createBody(scope: repository.scope)))
        case let .update(_, draft):
          guard let target else { throw scheduleInvalid() }
          let updated = try await repository.update(target, draft: draft)
          guard updated.scope == repository.scope, updated.id.utf8.elementsEqual(target.id.utf8) else { throw ScheduleMutationUnknown() }
        case let .enable(id, value):
          let returned = try await repository.setEnabled(id: id, enabled: value)
          guard returned == value else { throw ScheduleMutationUnknown() }
        case let .delete(id): try await repository.delete(id: id)
        }
        if progress.dispatched { progress.acknowledged = true }
        try checkCurrent()
        let rows = try await repository.load()
        try checkCurrent()
        return rows
      }
      let timer = Task { @MainActor [self] in
        do { try await Task.sleep(nanoseconds: timeoutNanoseconds) } catch { return }
        progress.timedOut = true; worker.cancel()
      }
      defer { timer.cancel() }
      // Hold busy until the worker completion barrier, even for dependencies that
      // ignore cancellation; a timed-out write must not overlap a newer command.
      let rows = try await withTaskCancellationHandler(operation: { try await worker.value }, onCancel: { worker.cancel() })
      try checkCurrent()
      if progress.timedOut { throw ScheduleMutationUnknown() }
      guard rows.allSatisfy({ $0.scope == repository.scope }), Set(rows.map { Data($0.id.utf8) }).count == rows.count else {
        throw RowanFailure(code: 502, message: "定时日程响应上下文或标识错误")
      }
      if let pending, !pending.confirmed(by: rows) {
        // An explicit load can display current data, but never invent an ACK ID.
        if reading { state.schedules = rows; state.loaded = true }
        state.resultUnknown = true
        state.error = "定时操作结果未确认，请保留事务；不会自动重复提交"
        return
      }
      pending = nil
      state = SchedulesState(schedules: rows, loaded: true)
    } catch is CancellationError {
      if !currentAccountValid() { expire() }
      else {
        state.resultUnknown = progress.dispatched || state.resultUnknown
        state.error = progress.dispatched ? "定时操作结果未确认，请读取核对；不会自动重复提交" : (progress.timedOut ? "读取超时，请重试" : "读取已取消，可重试")
      }
      if !progress.timedOut || Task.isCancelled { throw CancellationError() }
    } catch {
      if !currentAccountValid() || (error as? RowanFailure)?.code == 499 {
        expire(); if Task.isCancelled { throw CancellationError() }; return
      }
      if Task.isCancelled || progress.timedOut {
        state.resultUnknown = progress.dispatched || state.resultUnknown
        state.error = progress.dispatched ? "定时操作结果未确认，请读取核对；不会自动重复提交" : (progress.timedOut ? "读取超时，请重试" : "读取已取消，可重试")
        if Task.isCancelled { throw CancellationError() }; return
      }
      let definite = !progress.acknowledged && (error as? RowanFailure).map { scheduleDefiniteRejection($0.code) } == true
      if progress.dispatched && definite { pending = nil }
      state.resultUnknown = state.resultUnknown || (progress.dispatched && !definite)
      state.error = state.resultUnknown ? "定时操作结果未确认，请读取核对；不会自动重复提交" : "定时操作失败，请核对参数或权限后重试"
      if Task.isCancelled { throw CancellationError() }
    }
  }
}

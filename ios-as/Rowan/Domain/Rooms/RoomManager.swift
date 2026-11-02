import Foundation

struct RoomState {
  var rooms: [Room] = []
  var draft: [Room] = []
  var loaded = false
  var busy = false
  var editing = false
  var resultUnknown = false
  var sessionExpired = false
  var error: String? = nil
}

/// Page-owned operations, one account revision. No mutation queue, retry or auto replay.
@MainActor
final class RoomManager {
  private let repository: any RoomRepository
  private let current: () -> Bool
  private let timeoutMs: UInt64
  private var generation = 0
  private var task: Task<Void, Never>?
  private var timeout: Task<Void, Never>?
  private var writing = false
  private(set) var state = RoomState()
  var onChange: (() -> Void)?
  init(repository: any RoomRepository, current: @escaping () -> Bool, timeoutMs: UInt64 = 35_000) {
    self.repository = repository; self.current = current; self.timeoutMs = min(timeoutMs, UInt64.max / 1_000_000)
  }
  deinit { task?.cancel(); timeout?.cancel() }

  func load() { execute(write: false) { [repository] in try await repository.load() } }
  func create(name: String) {
    execute(write: true) { [self] in
      let value = try validatedRoomName(name)
      guard !state.rooms.contains(where: { $0.name == value }) else { throw RowanFailure(code: 1421, message: "存在相同名称的房间") }
      return try await repository.create(name: value)
    }
  }
  func rename(id: RoomID, name: String) {
    execute(write: true) { [self] in
      let value = try validatedRoomName(name)
      guard state.rooms.contains(where: { $0.id == id }) else { throw RowanFailure(code: 1431, message: "房间不存在，请刷新") }
      guard !state.rooms.contains(where: { $0.id != id && $0.name == value }) else { throw RowanFailure(code: 1432, message: "存在相同名称的房间") }
      return try await repository.rename(id: id, name: value)
    }
  }
  func beginEditing() {
    guard canEdit() else { return }
    state.editing = true; state.draft = state.rooms; state.error = nil; onChange?()
  }
  func cancelEditing() {
    guard current(), !state.busy else { return }
    state.editing = false; state.draft = state.rooms
    if !state.resultUnknown { state.error = nil }
    onChange?()
  }
  func moveUp(_ id: RoomID) { shift(id, by: -1) }
  func moveDown(_ id: RoomID) { shift(id, by: 1) }
  private func shift(_ id: RoomID, by offset: Int) {
    guard canEdit(), state.editing, let index = state.draft.firstIndex(where: { $0.id == id }), state.draft.indices.contains(index + offset) else { return }
    state.draft.swapAt(index, index + offset); state.error = nil; onChange?()
  }
  func removeFromDraft(_ id: RoomID) {
    guard canEdit(), state.editing, let room = state.draft.first(where: { $0.id == id }) else { return }
    do { try requireRemovableRoom(room); state.draft.removeAll { $0.id == id }; state.error = nil }
    catch { state.error = error.localizedDescription }
    onChange?()
  }
  func saveEditing() {
    guard state.editing else { return }
    let baseline = state.rooms, ids = state.draft.map(\.id)
    execute(write: true) { [repository] in try await repository.saveLayout(baseline: baseline, orderedIDs: ids) }
  }
  func cancel() {
    guard state.busy else { return }
    generation += 1; task?.cancel(); task = nil; timeout?.cancel(); timeout = nil
    if !current() { expire(); return }
    state.busy = false
    state.resultUnknown = writing || state.resultUnknown
    state.error = writing ? RoomOperationError.resultUnknown.localizedDescription : "加载已取消，可刷新重试"
    onChange?()
  }
  private func canEdit() -> Bool {
    guard current() else { expire(); return false }
    return state.loaded && !state.busy && !state.resultUnknown
  }
  private func expire() { state = RoomState(sessionExpired: true, error: "登录会话已变化，请重新进入"); onChange?() }
  private func execute(write: Bool, work: @escaping () async throws -> [Room]) {
    guard current() else { expire(); return }
    guard !state.busy else { return }
    guard !write || (state.loaded && !state.resultUnknown) else {
      state.error = "请先刷新房间列表并核对上次操作结果"; onChange?(); return
    }
    generation += 1
    let expected = generation
    writing = write; state.busy = true; state.error = nil; onChange?()
    task = Task { [weak self] in
      guard let self else { return }
      defer {
        if generation == expected { state.busy = false; timeout?.cancel(); timeout = nil; task = nil; onChange?() }
      }
      do {
        try Task.checkCancellation()
        let rooms = try await work()
        try Task.checkCancellation()
        guard generation == expected else { return }
        guard current() else { expire(); return }
        state = RoomState(rooms: rooms, draft: rooms, loaded: true)
      } catch {
        guard generation == expected else { return }
        guard current() else { expire(); return }
        if let error = error as? RoomOperationError {
          switch error {
          case let .baselineChanged(latest): state = RoomState(rooms: latest, draft: latest, loaded: true, error: error.localizedDescription)
          case .resultUnknown: state.resultUnknown = true; state.error = error.localizedDescription
          case .ruleBlocked: state.error = error.localizedDescription
          }
        } else if error is CancellationError {
          state.resultUnknown = write || state.resultUnknown
          state.error = write ? RoomOperationError.resultUnknown.localizedDescription : "加载已取消，可刷新重试"
        } else { state.error = Self.message(error) }
      }
    }
    timeout = Task { [weak self] in
      do { try await Task.sleep(nanoseconds: (self?.timeoutMs ?? 0) * 1_000_000) } catch { return }
      guard let self, generation == expected, state.busy else { return }
      cancel()
    }
  }
  private static func message(_ error: Error) -> String {
    guard let error = error as? RowanFailure else { return "加载失败，请检查网络后刷新；已保留上次列表" }
    switch error.code {
    case 1421, 1432: return "存在相同名称的房间"
    case 1431, 1441: return "房间不存在，请刷新列表"
    case 409: return "房间状态冲突，请刷新后重新编辑"
    case 401, 403: return "登录或房间权限已失效，请重新进入"
    case 400: return error.message
    default: return "房间操作失败，请刷新核对（\(error.code)）"
    }
  }
}

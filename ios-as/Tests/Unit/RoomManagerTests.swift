import XCTest
@testable import Rowan

@MainActor
final class RoomManagerTests: XCTestCase {
  private let a = Room(id: .text("a"), name: "客厅", isDefault: false, deviceCount: 0)
  private let b = Room(id: .numeric(2), name: "厨房", isDefault: false, deviceCount: 3)

  func testDuplicateSubmissionsAreRejectedRatherThanQueued() async {
    let repo = ManagerRoomFixture()
    var pending: CheckedContinuation<[Room], Never>?
    repo.createResult = { _ in await withCheckedContinuation { pending = $0 } }
    let manager = RoomManager(repository: repo, current: { true })
    manager.load(); await idle(manager)
    manager.create(name: "客厅")
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { manager.cancel(); XCTFail("Create did not start"); return }
    manager.create(name: "另一个")
    XCTAssertEqual(repo.creates, 1)
    pending.resume(returning: [a]); await idle(manager)
    XCTAssertFalse(manager.state.busy)
    XCTAssertEqual(manager.state.rooms, [a])
  }
  func testUnknownMutationNeedsReadBeforeNewActionAndNeverReplays() async {
    let repo = ManagerRoomFixture()
    repo.createResult = { _ in throw RoomOperationError.resultUnknown }
    let manager = RoomManager(repository: repo, current: { true })
    manager.load(); await idle(manager)
    manager.create(name: "客厅"); await idle(manager)
    manager.create(name: "客厅")
    XCTAssertEqual(repo.creates, 1); XCTAssertTrue(manager.state.resultUnknown)
    manager.cancelEditing(); XCTAssertNotNil(manager.state.error)
    manager.load(); await idle(manager)
    XCTAssertEqual(repo.creates, 1); XCTAssertFalse(manager.state.resultUnknown)
    manager.create(name: "客厅"); await idle(manager)
    XCTAssertEqual(repo.creates, 2)
  }
  func testStaleAccountNeverPublishesRoomData() async {
    let repo = ManagerRoomFixture()
    var current = true
    var pending: CheckedContinuation<[Room], Never>?
    repo.loadResult = { await withCheckedContinuation { pending = $0 } }
    let manager = RoomManager(repository: repo, current: { current })
    manager.load()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { manager.cancel(); XCTFail("Load did not start"); return }
    current = false; pending.resume(returning: [a]); await idle(manager)
    XCTAssertTrue(manager.state.rooms.isEmpty); XCTAssertTrue(manager.state.sessionExpired)
  }
  func testEditingOnlyOrdersOrSafelyRemovesAndCancelRestoresBaseline() async {
    let repo = ManagerRoomFixture()
    repo.loadResult = { [self.a, self.b] }
    let manager = RoomManager(repository: repo, current: { true })
    manager.load(); await idle(manager)
    manager.beginEditing(); manager.moveUp(b.id)
    XCTAssertEqual(manager.state.draft.first?.id, b.id)
    manager.removeFromDraft(b.id)
    XCTAssertEqual(manager.state.draft.count, 2)
    XCTAssertTrue(manager.state.error?.contains("设备") == true)
    manager.removeFromDraft(a.id)
    XCTAssertEqual(manager.state.draft, [b])
    manager.cancelEditing()
    XCTAssertEqual(manager.state.rooms, [a, b]); XCTAssertFalse(manager.state.editing)
    manager.create(name: " "); await idle(manager)
    manager.create(name: "客厅"); await idle(manager)
    manager.rename(id: b.id, name: "客厅"); await idle(manager)
    XCTAssertEqual(repo.creates, 0); XCTAssertEqual(repo.renames, 0)
  }
  func testBaselineConflictRefreshesAndDiscardsOldDraft() async {
    let repo = ManagerRoomFixture()
    repo.loadResult = { [self.a] }
    let latest = Room(id: a.id, name: "另一终端", isDefault: false, deviceCount: 0)
    repo.saveResult = { _, _ in throw RoomOperationError.baselineChanged([latest]) }
    let manager = RoomManager(repository: repo, current: { true })
    manager.load(); await idle(manager)
    manager.beginEditing(); manager.saveEditing(); await idle(manager)
    XCTAssertEqual(manager.state.rooms, [latest])
    XCTAssertFalse(manager.state.editing); XCTAssertFalse(manager.state.resultUnknown)
    XCTAssertNotNil(manager.state.error)
  }
  func testCancelledMutationStaysUnknownAndCannotReplayLateSuccess() async {
    let repo = ManagerRoomFixture()
    var pending: CheckedContinuation<[Room], Never>?
    repo.createResult = { _ in await withCheckedContinuation { pending = $0 } }
    let manager = RoomManager(repository: repo, current: { true })
    manager.load(); await idle(manager)
    manager.create(name: "客厅")
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { manager.cancel(); XCTFail("Create did not start"); return }
    manager.cancel(); pending.resume(returning: [a])
    for _ in 0..<10 { await Task.yield() }
    XCTAssertTrue(manager.state.resultUnknown); XCTAssertFalse(manager.state.busy)
    XCTAssertTrue(manager.state.rooms.isEmpty)
    manager.create(name: "客厅")
    XCTAssertEqual(repo.creates, 1)
  }
  private func idle(_ manager: RoomManager) async {
    for _ in 0..<300 where manager.state.busy { await Task.yield() }
    XCTAssertFalse(manager.state.busy, "Fixture did not settle")
  }
}

@MainActor
private final class ManagerRoomFixture: RoomRepository {
  var creates = 0, renames = 0
  var loadResult: () async throws -> [Room] = { [] }
  var createResult: (String) async throws -> [Room] = { _ in [] }
  var renameResult: (RoomID, String) async throws -> [Room] = { _, _ in [] }
  var saveResult: ([Room], [RoomID]) async throws -> [Room] = { _, _ in [] }
  func load() async throws -> [Room] { try await loadResult() }
  func create(name: String) async throws -> [Room] { creates += 1; return try await createResult(name) }
  func rename(id: RoomID, name: String) async throws -> [Room] { renames += 1; return try await renameResult(id, name) }
  func saveLayout(baseline: [Room], orderedIDs: [RoomID]) async throws -> [Room] { try await saveResult(baseline, orderedIDs) }
}

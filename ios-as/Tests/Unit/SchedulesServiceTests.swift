import XCTest
@testable import Rowan

@MainActor
final class SchedulesServiceTests: XCTestCase {
  private let scope = ScheduleScope(accountRevision: 7, resourceID: "fixture-device", productID: "fixture-product", modelVersion: "fixture-model")
  private func draft() throws -> ScheduleDraft {
    ScheduleDraft(type: .once, startTime: "12:00", repeatType: .once, timeZone: "Etc/UTC", permit: try ActionPermit(scope: scope, actionJSON: #"{"fixtureRelay":"on"}"#, mode: nil))
  }
  private func row(_ id: String = "existing", enabled: Bool = false) throws -> ScheduleRecord {
    var body = try draft().createBody(scope: scope); body["id"] = id; body["enabled"] = enabled
    return try ScheduleRecord.decode(scope: scope, rawJSON: String(decoding: JSONSerialization.data(withJSONObject: body), as: UTF8.self))
  }
  @MainActor private final class Repository: SchedulesRepository {
    let scope: ScheduleScope
    var rows: [ScheduleRecord]
    var calls: [String] = []
    var getHook: () async throws -> Void = {}, createHook: () async throws -> Void = {}, updateHook: () async throws -> Void = {}
    var enableHook: () async throws -> Void = {}, deleteHook: () async throws -> Void = {}
    init(scope: ScheduleScope, rows: [ScheduleRecord]) { self.scope = scope; self.rows = rows }
    func load() async throws -> [ScheduleRecord] { calls.append("GET"); try await getHook(); return rows }
    private func decode(_ body: [String: Any]) throws -> ScheduleRecord { try ScheduleRecord.decode(scope: scope, rawJSON: String(decoding: JSONSerialization.data(withJSONObject: body), as: UTF8.self)) }
    func create(_ draft: ScheduleDraft) async throws -> ScheduleRecord {
      calls.append("POST"); try await createHook(); var body = try draft.createBody(scope: scope); body["id"] = "created"; body["enabled"] = true
      let row = try decode(body); rows.append(row); return row
    }
    func update(_ existing: ScheduleRecord, draft: ScheduleDraft) async throws -> ScheduleRecord {
      calls.append("PATCH"); try await updateHook(); var body = try draft.updateBody(scope: scope, existing: existing); body["id"] = existing.id
      let row = try decode(body); rows = rows.map { $0.id == existing.id ? row : $0 }; return row
    }
    func setEnabled(id: String, enabled: Bool) async throws -> Bool {
      calls.append("PUT"); try await enableHook()
      rows = try rows.map { row in
        guard row.id == id else { return row }
        var body = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(row.rawJSON.utf8)) as? [String: Any]); body["enabled"] = enabled; return try decode(body)
      }; return enabled
    }
    func delete(id: String) async throws { calls.append("DELETE"); try await deleteHook(); rows.removeAll { $0.id == id } }
  }
  private func fixture() throws -> (Repository, SchedulesService) {
    let repo = Repository(scope: scope, rows: [try row()]); return (repo, SchedulesService(repository: repo, currentAccountValid: { true }))
  }
  private func wait(_ condition: () -> Bool) async { for _ in 0..<500 where !condition() { await Task.yield() }; XCTAssertTrue(condition()) }
  func testCreateConfirmsOnlyAcknowledgedServerIDAfterListReadback() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    try await service.create(draft()); XCTAssertEqual(repo.calls, ["POST", "GET"])
    XCTAssertTrue(service.state.schedules.contains { $0.id == "created" }); XCTAssertFalse(service.state.resultUnknown); XCTAssertFalse(service.state.busy)
  }
  func testUnknownCreateNeverUnlocksFromSimilarListOrReplays() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    repo.createHook = { repo.rows.append(try self.row("similar", enabled: true)); throw ScheduleMutationUnknown() }
    try await service.create(draft()); try await service.create(draft()); XCTAssertTrue(service.state.resultUnknown)
    try await service.load(); XCTAssertTrue(service.state.resultUnknown)
    try await service.create(draft()); XCTAssertEqual(repo.calls.filter { $0 == "POST" }.count, 1)
  }
  func testKnownEnableUnknownCanReadReconcileWithoutAnotherPut() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    repo.enableHook = { repo.rows = [try self.row(enabled: true)]; throw ScheduleMutationUnknown() }
    try await service.setEnabled(id: "existing", enabled: true); XCTAssertTrue(service.state.resultUnknown)
    try await service.setEnabled(id: "existing", enabled: true); try await service.load()
    XCTAssertFalse(service.state.resultUnknown); XCTAssertEqual(service.state.schedules.first?.enabled, true)
    XCTAssertEqual(repo.calls.filter { $0 == "PUT" }.count, 1)
  }
  func testDeleteFailedReadbackKeepsLastRowsUntilAbsenceRead() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    repo.getHook = { throw RowanFailure(code: 0, message: "fixture") }
    try await service.delete(id: "existing"); XCTAssertTrue(service.state.resultUnknown); XCTAssertEqual(service.state.schedules.count, 1)
    try await service.delete(id: "existing"); repo.getHook = {}; try await service.load()
    XCTAssertTrue(service.state.schedules.isEmpty); XCTAssertFalse(service.state.resultUnknown)
    XCTAssertEqual(repo.calls.filter { $0 == "DELETE" }.count, 1)
  }
  func testCancelledDispatchedCreateEndsBusyButStaysUnknown() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    var release: CheckedContinuation<Void, Never>?
    repo.createHook = { await withCheckedContinuation { release = $0 } }
    let work = Task { try await service.create(draft()) }; await wait { release != nil }
    work.cancel(); release?.resume()
    do { try await work.value; XCTFail("Expected cancellation") } catch { XCTAssertTrue(error is CancellationError) }
    XCTAssertTrue(service.state.resultUnknown); XCTAssertFalse(service.state.busy)
    try await service.create(draft()); XCTAssertEqual(repo.calls.filter { $0 == "POST" }.count, 1)
  }
  func testAccountChangeRejectsLateListAndClearsPrivateState() async throws {
    let repo = Repository(scope: scope, rows: [try row()]); var current = true
    let service = SchedulesService(repository: repo, currentAccountValid: { current }); try await service.load()
    var release: CheckedContinuation<Void, Never>?
    repo.getHook = { await withCheckedContinuation { release = $0 } }
    let work = Task { try await service.load() }; await wait { release != nil }
    current = false; release?.resume(); try await work.value
    XCTAssertTrue(service.state.sessionExpired); XCTAssertTrue(service.state.schedules.isEmpty)
  }
  func testDuplicateDuringInflightDoesNotQueueAnotherRule() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    var release: CheckedContinuation<Void, Never>?
    repo.createHook = { await withCheckedContinuation { release = $0 } }
    let work = Task { try await service.create(draft()) }; await wait { release != nil }
    try await service.create(draft()); XCTAssertEqual(repo.calls, ["POST"])
    release?.resume(); try await work.value; XCTAssertEqual(repo.calls.filter { $0 == "POST" }.count, 1)
  }
  func testEditingDisabledRuleKeepsFalseAndFailureDoesNotInventSuccess() async throws {
    let (repo, service) = try fixture(); try await service.load(); repo.calls = []
    try await service.update(id: "existing", draft: draft()); XCTAssertEqual(repo.calls, ["PATCH", "GET"])
    XCTAssertEqual(service.state.schedules.first?.enabled, false)
    repo.updateHook = { throw ScheduleMutationUnknown() }; try await service.update(id: "existing", draft: draft())
    XCTAssertTrue(service.state.resultUnknown); XCTAssertEqual(service.state.schedules.first?.enabled, false)
  }
  func testUnknownModelAllowsOnlyLoadedKnownIDMetadataOperations() async throws {
    let readScope = ScheduleScope(accountRevision: 7, resourceID: scope.resourceID, productID: scope.productID, modelVersion: nil)
    let record = try ScheduleRecord.decode(scope: readScope, rawJSON: #"{"id":"existing","enabled":false,"action":{"unregistered":true}}"#)
    let repo = Repository(scope: readScope, rows: [record])
    let bound = SchedulesService(repository: repo, currentAccountValid: { true })
    try await bound.setEnabled(id: "existing", enabled: true); try await bound.delete(id: "existing"); XCTAssertTrue(repo.calls.isEmpty)
    try await bound.load(); repo.calls = []
    try await bound.setEnabled(id: "not-loaded", enabled: true); try await bound.delete(id: "not-loaded"); XCTAssertTrue(repo.calls.isEmpty)
    try await bound.setEnabled(id: "existing", enabled: true)
    XCTAssertEqual(repo.calls, ["PUT", "GET"]); XCTAssertEqual(bound.state.schedules.first?.enabled, true)
    XCTAssertNil(bound.state.schedules.first?.scope.modelVersion)
    repo.calls = []; try await bound.delete(id: "existing")
    XCTAssertEqual(repo.calls, ["DELETE", "GET"]); XCTAssertTrue(bound.state.schedules.isEmpty); XCTAssertFalse(bound.state.resultUnknown)
  }
}

import XCTest
@testable import Rowan

@MainActor
final class PreferencesServiceTests: XCTestCase {
  @MainActor private final class Repository: PreferencesRepository {
    let expectedRevision = 7
    var server: [String: Any] = ["language": "zh-CN", "notification": false, "theme": "light", "temperatureUnit": "C", "measurementSystem": "metric", "future": ["nested": 7]]
    var calls: [String] = []
    var getHook: () async throws -> Void = { }
    var patchHook: () async throws -> Void = { }
    func load() async throws -> UserPreferences {
      calls.append("GET"); try await getHook()
      return try UserPreferences.decode(String(decoding: JSONSerialization.data(withJSONObject: server), as: UTF8.self))
    }
    func patch(_ patch: PreferencesPatch) async throws {
      calls.append("PATCH"); try await patchHook()
      for (key, value) in try patch.body() { server[key] = key == "wallpaper" ? ["id": value] : value }
    }
  }
  @MainActor private final class Fixture {
    let repo = Repository()
    var current = true
    var committed: [(Int, String)] = []
    var commitHook: () async throws -> Void = { }
    lazy var service = PreferencesService(repository: repo, currentAccountValid: { [unowned self] in current }, commitSettings: { [unowned self] revision, raw, _ in
      try await commitHook(); committed.append((revision, raw))
    })
  }
  func testSaveIsPatchThenReadbackAndCommitBeforeConfirmation() async throws {
    let f = Fixture(); try await f.service.load(); f.repo.calls = []; f.committed = []
    try await f.service.save(PreferencesPatch(theme: .dark))
    XCTAssertEqual(f.repo.calls, ["PATCH", "GET"]); XCTAssertEqual(f.committed.first?.0, 7)
    XCTAssertTrue(f.committed.first?.1.contains("future") == true); XCTAssertEqual(f.service.state.preferences?.theme, .dark)
    XCTAssertFalse(f.service.state.busy); XCTAssertFalse(f.service.state.resultUnknown)
  }
  func testConcurrentSavesSerializeThroughOwnReadback() async throws {
    let f = Fixture(); try await f.service.load(); f.repo.calls = []
    var finish: CheckedContinuation<Void, Never>?
    f.repo.patchHook = { if finish == nil { await withCheckedContinuation { finish = $0 } } }
    let first = Task { try await f.service.save(PreferencesPatch(theme: .dark)) }
    for _ in 0..<300 where finish == nil { await Task.yield() }
    guard let finish else { first.cancel(); XCTFail("Patch did not start"); return }
    let second = Task { try await f.service.save(PreferencesPatch(notification: true)) }
    await Task.yield(); XCTAssertEqual(f.repo.calls, ["PATCH"])
    f.repo.patchHook = {}; finish.resume(); try await first.value; try await second.value
    XCTAssertEqual(f.repo.calls, ["PATCH", "GET", "PATCH", "GET"])
    XCTAssertEqual(f.service.state.preferences?.notification, true); XCTAssertEqual(f.service.state.preferences?.theme, .dark)
  }
  func testTransportUnknownBlocksSaveUntilLoadWithoutReplay() async throws {
    let f = Fixture(); try await f.service.load(); f.repo.calls = []
    f.repo.patchHook = { throw RowanFailure(code: 408, message: "fixture timeout") }
    try await f.service.save(PreferencesPatch(notification: true)); try await f.service.save(PreferencesPatch(notification: true))
    XCTAssertTrue(f.service.state.resultUnknown); XCTAssertEqual(f.repo.calls, ["PATCH"])
    XCTAssertEqual(f.service.state.preferences?.notification, false)
    f.repo.patchHook = {}; try await f.service.load(); XCTAssertFalse(f.service.state.resultUnknown)
    try await f.service.save(PreferencesPatch(theme: .dark)); XCTAssertEqual(f.repo.calls, ["PATCH", "GET", "PATCH", "GET"])
  }
  func testAcceptedPatchFailedReadKeepsLastConfirmation() async throws {
    let f = Fixture(); try await f.service.load(); f.committed = []
    f.repo.getHook = { throw RowanFailure(code: 503, message: "fixture") }
    try await f.service.save(PreferencesPatch(theme: .dark))
    XCTAssertTrue(f.service.state.resultUnknown); XCTAssertEqual(f.service.state.preferences?.theme, .light); XCTAssertTrue(f.committed.isEmpty)
  }
  func testReadbackMustMatchEveryExplicitChange() async throws {
    let f = Fixture(); try await f.service.load()
    f.repo.getHook = { f.repo.server["notification"] = false }
    try await f.service.save(PreferencesPatch(notification: true, theme: .dark))
    XCTAssertTrue(f.service.state.resultUnknown); XCTAssertEqual(f.service.state.preferences?.theme, .light)
  }
  func testCancellationAfterDispatchRemainsUnknownAndDoesNotReplay() async throws {
    let f = Fixture(); try await f.service.load(); f.repo.calls = []
    var finish: CheckedContinuation<Void, Never>?
    f.repo.patchHook = { await withCheckedContinuation { finish = $0 } }
    let work = Task { try await f.service.save(PreferencesPatch(theme: .dark)) }
    for _ in 0..<300 where finish == nil { await Task.yield() }
    guard let finish else { work.cancel(); XCTFail("Patch did not start"); return }
    work.cancel(); finish.resume()
    do { try await work.value; XCTFail("Expected cancellation") } catch { XCTAssertTrue(error is CancellationError) }
    XCTAssertTrue(f.service.state.resultUnknown); XCTAssertFalse(f.service.state.busy)
    try await f.service.save(PreferencesPatch(theme: .dark)); XCTAssertEqual(f.repo.calls, ["PATCH"])
  }
  func testLateOldAccountReadCannotCommitPrivateSettings() async throws {
    let f = Fixture(); var finish: CheckedContinuation<Void, Never>?
    f.repo.getHook = { await withCheckedContinuation { finish = $0 } }
    let work = Task { try await f.service.load() }
    for _ in 0..<300 where finish == nil { await Task.yield() }
    guard let finish else { work.cancel(); XCTFail("Read did not start"); return }
    f.current = false; finish.resume(); try await work.value
    XCTAssertTrue(f.service.state.sessionExpired); XCTAssertNil(f.service.state.preferences); XCTAssertTrue(f.committed.isEmpty)
  }
  func testCommitFailureCannotConfirmServerMutation() async throws {
    let f = Fixture(); try await f.service.load(); f.committed = []
    f.commitHook = { throw RowanFailure(code: 0, message: "fixture persistence failure") }
    try await f.service.save(PreferencesPatch(theme: .dark))
    XCTAssertTrue(f.service.state.resultUnknown); XCTAssertEqual(f.service.state.preferences?.theme, .light); XCTAssertTrue(f.committed.isEmpty)
  }
  func testCancelledQueuedCallerDoesNotTouchOwnerStateOrDispatch() async throws {
    let f = Fixture(); try await f.service.load(); f.repo.calls = []
    var finish: CheckedContinuation<Void, Never>?
    f.repo.patchHook = { await withCheckedContinuation { finish = $0 } }
    let owner = Task { try await f.service.save(PreferencesPatch(theme: .dark)) }
    for _ in 0..<300 where finish == nil { await Task.yield() }
    guard let finish else { owner.cancel(); XCTFail("Patch did not start"); return }
    let queued = Task { try await f.service.save(PreferencesPatch(notification: true)) }
    await Task.yield(); queued.cancel()
    do { try await queued.value; XCTFail("Expected queued cancellation") } catch { XCTAssertTrue(error is CancellationError) }
    XCTAssertTrue(f.service.state.busy); XCTAssertFalse(f.service.state.resultUnknown)
    finish.resume(); try await owner.value; XCTAssertEqual(f.repo.calls, ["PATCH", "GET"])
  }
  func testSaveBeforeLoadCannotInventDefaults() async throws {
    let f = Fixture(); try await f.service.save(PreferencesPatch(theme: .dark))
    XCTAssertTrue(f.repo.calls.isEmpty); XCTAssertNil(f.service.state.preferences)
  }
  func testTemperatureOnlyPreservesUnknownMeasurementPreference() async throws {
    let f = Fixture(); f.repo.server["measurementSystem"] = "future-system"; try await f.service.load()
    try await f.service.save(PreferencesPatch(temperatureUnit: .fahrenheit))
    XCTAssertEqual(f.service.state.preferences?.temperatureUnit, .fahrenheit); XCTAssertNil(f.service.state.preferences?.measurementSystem)
    XCTAssertTrue(f.service.state.preferences?.rawJSON.contains("future-system") == true)
  }
  func testInitialGetFailureHasNoDefaultsOrAppliedLanguageClaim() async throws {
    let f = Fixture(); f.repo.getHook = { throw RowanFailure(code: 503, message: "fixture") }
    try await f.service.load(); XCTAssertNil(f.service.state.preferences); XCTAssertFalse(f.service.state.resultUnknown)
    XCTAssertNotNil(f.service.state.error); XCTAssertTrue(f.committed.isEmpty)
  }

  func testSeparatePagesShareWholeReadPatchReadCommitTransaction() async throws {
    let gate=PreferencesOperationGate(), a=Repository(), b=Repository(); var commits:[String]=[]
    let first=PreferencesService(repository:a,currentAccountValid:{true},commitSettings:{_,raw,_ in commits.append(raw)},transactionGate:gate)
    let second=PreferencesService(repository:b,currentAccountValid:{true},commitSettings:{_,raw,_ in commits.append(raw)},transactionGate:gate)
    try await second.load(); b.calls=[]
    var pending:CheckedContinuation<Void,Never>?
    a.getHook={await withCheckedContinuation {pending=$0}}
    let read=Task {try await first.load()}
    for _ in 0..<300 where pending == nil {await Task.yield()}
    guard let pending else {read.cancel();XCTFail("Read did not start");return}
    let save=Task {try await second.save(PreferencesPatch(theme:.dark))}
    for _ in 0..<10 {await Task.yield()};XCTAssertTrue(b.calls.isEmpty)
    pending.resume();try await read.value;try await save.value
    XCTAssertEqual(b.calls,["PATCH","GET"]);XCTAssertTrue(commits.last?.contains("dark") == true)
  }
  func testCancelledPageRetainsSharedPermitThroughNoncooperativeActualRead() async throws {
    let gate=PreferencesOperationGate(), a=Repository(), b=Repository()
    let first=PreferencesService(repository:a,currentAccountValid:{true},commitSettings:{_,_,_ in},transactionGate:gate)
    let second=PreferencesService(repository:b,currentAccountValid:{true},commitSettings:{_,_,_ in},transactionGate:gate)
    try await second.load();b.calls=[];var pending:CheckedContinuation<Void,Never>?
    a.getHook={await withCheckedContinuation {pending=$0}}
    let read=Task {try await first.load()};for _ in 0..<300 where pending == nil {await Task.yield()}
    guard let pending else {read.cancel();XCTFail("Read did not start");return};read.cancel()
    let save=Task {try await second.save(PreferencesPatch(theme:.dark))}
    for _ in 0..<10 {await Task.yield()};XCTAssertTrue(b.calls.isEmpty)
    pending.resume();do {try await read.value;XCTFail("Expected cancellation")}catch {XCTAssertTrue(error is CancellationError)}
    try await save.value;XCTAssertEqual(b.calls,["PATCH","GET"])
  }
  func testUnknownMutationBlocksOtherPageUntilExplicitReadAndNeverReplays() async throws {
    let gate=PreferencesOperationGate(), a=Repository(), b=Repository()
    let first=PreferencesService(repository:a,currentAccountValid:{true},commitSettings:{_,_,_ in},transactionGate:gate)
    let second=PreferencesService(repository:b,currentAccountValid:{true},commitSettings:{_,_,_ in},transactionGate:gate)
    try await first.load();try await second.load();a.calls=[];b.calls=[]
    a.patchHook={throw RowanFailure(code:408,message:"fixture")}
    try await first.save(PreferencesPatch(theme:.dark));try await second.save(PreferencesPatch(theme:.dark))
    XCTAssertTrue(b.calls.isEmpty);try await second.load();try await second.save(PreferencesPatch(theme:.dark))
    XCTAssertEqual(a.calls,["PATCH"]);XCTAssertEqual(b.calls,["GET","PATCH","GET"])
  }


  func testOldPageCannotResurrectUnknownAfterOtherPageConfirmedRead() async throws {
    let gate=PreferencesOperationGate(), a=Repository(), b=Repository()
    let first=PreferencesService(repository:a,currentAccountValid:{true},commitSettings:{_,_,_ in},transactionGate:gate)
    let second=PreferencesService(repository:b,currentAccountValid:{true},commitSettings:{_,_,_ in},transactionGate:gate)
    try await first.load();try await second.load()
    a.patchHook={throw RowanFailure(code:408,message:"fixture")}
    try await first.save(PreferencesPatch(theme:.dark));XCTAssertTrue(first.state.resultUnknown)
    try await second.load();XCTAssertFalse(second.state.resultUnknown)
    a.getHook={throw RowanFailure(code:503,message:"fixture read failed")}
    try await first.load();XCTAssertFalse(first.state.resultUnknown)
    b.calls=[];try await second.save(PreferencesPatch(notification:true))
    XCTAssertEqual(b.calls,["PATCH","GET"]);XCTAssertFalse(second.state.resultUnknown)
    a.getHook={};a.patchHook={};try await first.save(PreferencesPatch(theme:.dark))
    XCTAssertFalse(first.state.resultUnknown)
    a.patchHook={throw RowanFailure(code:408,message:"fixture")};try await first.save(PreferencesPatch(notification:true))
    try await second.load();a.patchHook={};a.calls=[]
    try await first.save(PreferencesPatch(theme:.light)) // Direct action despite stale A-local unknown.
    XCTAssertEqual(a.calls,["PATCH","GET"]);XCTAssertFalse(first.state.resultUnknown)
    a.patchHook={throw RowanFailure(code:408,message:"fixture")}
    try await first.save(PreferencesPatch(notification:true));b.calls=[]
    try await second.save(PreferencesPatch(theme:.light));XCTAssertTrue(b.calls.isEmpty);XCTAssertTrue(second.state.resultUnknown)
  }

}

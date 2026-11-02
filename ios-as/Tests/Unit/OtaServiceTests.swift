import XCTest
@testable import Rowan

/// Offline permit/repository fixtures only. Does not create/cancel firmware tasks or issue production permits.
@MainActor
final class OtaServiceTests: XCTestCase {
  @MainActor private final class Repository: OtaRepository {
    let scope = OtaScope(accountRevision: 7, resourceID: "http-resource", userID: "native-user")
    var calls: [String] = []
    var result = OtaResult.updating
    var checkHook: () async throws -> Void = { }
    var startHook: () async throws -> String = { "task" }
    var queryHook: () async throws -> Void = { }
    var cancelHook: () async throws -> Void = { }
    func check(_ kind: OtaKind) async throws -> OtaOffer {
      calls.append("CHECK:" + kind.rawValue); try await checkHook()
      return OtaOffer(kind: kind, firmware: OtaFirmware(id: "firmware", version: "1.2.3", remark: nil), device: OtaDevice(id: scope.resourceID, name: "Fixture", mac: "fixture-mac"))
    }
    func start(_ kind: OtaKind, firmwareID: String) async throws -> String { calls.append("START:" + kind.rawValue + ":" + firmwareID); return try await startHook() }
    func query(taskID: String) async throws -> OtaResult { calls.append("QUERY:" + taskID); try await queryHook(); return result }
    func cancel(taskID: String) async throws { calls.append("CANCEL:" + taskID); try await cancelHook() }
  }
  @MainActor private final class Fixture {
    let repo = Repository()
    var now: Int64 = 0
    var current = true
    var evidence = OtaOnlineEvidence(source: .reportedCurrent, online: true, stale: false, connectionEpoch: 4, authorityRevision: 12)
    var startPermit: OtaStartPermit?
    var cancelPermit: OtaCancelPermit?
    let policy: OtaPolicy
    init(policy: OtaPolicy = .standard) { self.policy = policy }
    lazy var service = OtaService(repository: repo, currentScopeValid: { [unowned self] in current },
      currentEvidence: { [unowned self] in evidence }, startPermit: { [unowned self] in startPermit },
      cancelPermit: { [unowned self] in cancelPermit }, nowMillis: { [unowned self] in now }, policy: policy)
    func grantStart(scope: OtaScope? = nil, kind: OtaKind = .mcu, firmwareID: String = "firmware", expiry: Int64? = nil) {
      startPermit = OtaStartPermit(scope: scope ?? repo.scope, kind: kind, firmwareID: firmwareID, evidence: evidence, expiresAtMillis: expiry ?? (now + 10_000))
    }
    func grantCancel(scope: OtaScope? = nil, taskID: String = "task", expiry: Int64? = nil) {
      cancelPermit = OtaCancelPermit(scope: scope ?? repo.scope, taskID: taskID, expiresAtMillis: expiry ?? (now + 10_000))
    }
    func started() async throws { try await service.loadCandidate(.mcu); grantStart(); try await service.start() }
    func updating() async throws { try await started(); try await service.pollOnce() }
    func count(_ prefix: String) -> Int { repo.calls.filter { $0.hasPrefix(prefix) }.count }
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<500 { if condition() { return }; await Task.yield() }
    XCTFail("Fixture did not enter operation"); throw URLError(.timedOut)
  }
  func testNoProductionPermitDispatchesNoStart() async throws {
    let f = Fixture(); try await f.service.loadCandidate(.mcu); try await f.service.start()
    XCTAssertEqual(f.count("START"), 0); XCTAssertNil(f.service.state.task); XCTAssertEqual(f.service.state.error, .startNotPermitted)
  }
  func testStartRequiresExplicitLoadedCandidate() async throws {
    let f = Fixture(); f.grantStart(); try await f.service.start()
    XCTAssertEqual(f.count("START"), 0); XCTAssertEqual(f.service.state.error, .noCandidate)
  }
  func testValidNativeGrantStartsExactCandidateWithoutInventingSuccess() async throws {
    let f = Fixture(); try await f.started()
    XCTAssertEqual(f.repo.calls, ["CHECK:mcu", "START:mcu:firmware"])
    XCTAssertEqual(f.service.state.task?.taskID, "task"); XCTAssertNil(f.service.state.lastConfirmed); XCTAssertFalse(f.service.state.resultUnknown)
  }
  func testKnownActiveTaskCannotBeCreatedTwice() async throws {
    let f = Fixture(); try await f.started(); try await f.service.start(); f.service.resumeObserving(); try await f.service.start()
    XCTAssertEqual(f.count("START"), 1); XCTAssertEqual(f.service.state.task?.taskID, "task")
  }
  func testExpiredWrongScopeWrongFirmwareOrKindPermitCannotStart() async throws {
    for variant in 0..<4 {
      let f = Fixture(); try await f.service.loadCandidate(.mcu)
      switch variant {
      case 0: f.grantStart(expiry: 0)
      case 1: f.grantStart(scope: OtaScope(accountRevision: 8, resourceID: "http-resource", userID: "other"))
      case 2: f.grantStart(firmwareID: "another-firmware")
      default: f.grantStart(kind: .wifi)
      }
      try await f.service.start(); XCTAssertEqual(f.count("START"), 0)
    }
  }
  func testUnknownOfflineStaleStaticOrSupersededEvidenceCannotStart() async throws {
    for variant in 0..<7 {
      let f = Fixture(); try await f.service.loadCandidate(.mcu)
      f.evidence = OtaOnlineEvidence(source: variant == 3 ? .deviceMetadata : .reportedCurrent,
        online: variant == 0 ? nil : variant != 1, stale: variant == 2, connectionEpoch: variant == 4 ? 0 : 4, authorityRevision: 12)
      f.grantStart()
      if variant == 5 || variant == 6 { f.evidence = OtaOnlineEvidence(source: .reportedCurrent, online: true, stale: false, connectionEpoch: variant == 5 ? 5 : 4, authorityRevision: variant == 6 ? 13 : 12) }
      try await f.service.start(); XCTAssertEqual(f.count("START"), 0)
    }
  }
  func testUnknownCreateNeverReplaysOnStartResumeOrPoll() async throws {
    let f = Fixture(); try await f.service.loadCandidate(.mcu); f.grantStart(); f.repo.startHook = { throw URLError(.timedOut) }
    try await f.service.start(); f.service.stopObserving(); f.service.resumeObserving(); try await f.service.start(); try await f.service.pollOnce()
    XCTAssertTrue(f.service.state.resultUnknown); XCTAssertNil(f.service.state.task)
    XCTAssertEqual(f.count("START"), 1); XCTAssertEqual(f.count("QUERY"), 0); XCTAssertEqual(f.count("CANCEL"), 0)
  }
  func testCancelledCreateCannotReplayEvenWhenDependencyReturnsLateACK() async throws {
    let f = Fixture(); try await f.service.loadCandidate(.mcu); f.grantStart()
    var pending: CheckedContinuation<String, Error>?
    f.repo.startHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.service.start() }; try await wait { pending != nil }
    task.cancel(); pending?.resume(returning: "task")
    do { try await task.value; XCTFail("Cancellation lost") } catch is CancellationError { }
    f.service.resumeObserving(); try await f.service.start()
    XCTAssertEqual(f.count("START"), 1); XCTAssertEqual(f.count("CANCEL"), 0); XCTAssertNil(f.service.state.lastConfirmed)
    XCTAssertTrue(f.service.state.resultUnknown)
  }
  func testPollsAreAtLeastThreeSecondsApart() async throws {
    let f = Fixture(); try await f.started(); try await f.service.pollOnce(); f.now = 2999; try await f.service.pollOnce()
    XCTAssertEqual(f.count("QUERY"), 1); f.now = 3000; try await f.service.pollOnce(); XCTAssertEqual(f.count("QUERY"), 2)
  }
  func testPolicyRejectsUnboundedOrSubThreeSecondPolling() {
    XCTAssertThrowsError(try OtaPolicy(pollIntervalMillis: 2999)); XCTAssertThrowsError(try OtaPolicy(maxPolls: 0))
    XCTAssertThrowsError(try OtaPolicy(maxPolls: 1201)); XCTAssertThrowsError(try OtaPolicy(requestTimeoutMillis: 0))
  }
  func testEveryTerminalResultStopsPollingWithoutDelete() async throws {
    for result in [OtaResult.success, .failed, .cancelled] {
      let f = Fixture(); f.repo.result = result; try await f.started(); try await f.service.pollOnce()
      f.now = 6000; f.service.resumeObserving(); try await f.service.pollOnce()
      XCTAssertEqual(f.service.state.lastConfirmed, result); XCTAssertEqual(f.count("QUERY"), 1); XCTAssertEqual(f.count("CANCEL"), 0)
    }
  }
  func testPauseAndCloseDoNotCancelOrForgetTask() async throws {
    let f = Fixture(); try await f.updating(); f.service.stopObserving(); f.now = 3000; try await f.service.pollOnce()
    XCTAssertEqual(f.count("QUERY"), 1); XCTAssertEqual(f.service.state.task?.taskID, "task")
    f.service.resumeObserving(); try await f.service.pollOnce(); f.service.close(); f.now = 6000; try await f.service.pollOnce()
    XCTAssertEqual(f.count("QUERY"), 2); XCTAssertEqual(f.count("CANCEL"), 0); XCTAssertEqual(f.count("START"), 1)
  }
  func testConcurrentPollHasOnlyOneInflightRequest() async throws {
    let f = Fixture(); try await f.started(); var pending: CheckedContinuation<Void, Error>?
    f.repo.queryHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let first = Task { try await f.service.pollOnce() }; try await wait { pending != nil }
    try await f.service.pollOnce(); XCTAssertEqual(f.count("QUERY"), 1)
    pending?.resume(); try await first.value; XCTAssertEqual(f.count("QUERY"), 1)
  }
  func testPollFailureKeepsConfirmedResultAndOnlyRetriesRead() async throws {
    let f = Fixture(); try await f.updating(); f.now = 3000; f.repo.queryHook = { throw URLError(.timedOut) }; try await f.service.pollOnce()
    XCTAssertEqual(f.service.state.lastConfirmed, .updating); XCTAssertTrue(f.service.state.resultUnknown)
    f.repo.queryHook = { }; f.now = 6000; try await f.service.pollOnce()
    XCTAssertFalse(f.service.state.resultUnknown); XCTAssertEqual(f.count("START"), 1); XCTAssertEqual(f.count("CANCEL"), 0)
  }
  func testPollWindowExhaustionDoesNotRestartOrCancel() async throws {
    let f = Fixture(policy: try OtaPolicy(maxPolls: 2)); try await f.started(); try await f.service.pollOnce()
    f.now = 3000; try await f.service.pollOnce(); f.now = 6000; try await f.service.pollOnce()
    XCTAssertEqual(f.count("QUERY"), 2); XCTAssertEqual(f.count("START"), 1); XCTAssertEqual(f.count("CANCEL"), 0)
    XCTAssertEqual(f.service.state.lastConfirmed, .updating); XCTAssertTrue(f.service.state.resultUnknown); XCTAssertFalse(f.service.state.observing)
  }
  func testMissingExpiredWrongTaskOrScopeCancelPermitCannotDelete() async throws {
    for variant in 0..<4 {
      let f = Fixture(); try await f.updating()
      if variant == 1 { f.grantCancel(expiry: 0) }
      if variant == 2 { f.grantCancel(taskID: "other") }
      if variant == 3 { f.grantCancel(scope: OtaScope(accountRevision: 8, resourceID: "http-resource", userID: "other")) }
      try await f.service.cancel(); XCTAssertEqual(f.count("CANCEL"), 0); XCTAssertEqual(f.service.state.lastConfirmed, .updating)
      XCTAssertEqual(f.service.state.error, .cancelNotPermitted)
    }
  }
  func testPermittedCancelNeedsResultEndpointTerminalConfirmation() async throws {
    let f = Fixture(); try await f.updating(); f.grantCancel(); f.now = 3000; f.repo.result = .cancelled
    try await f.service.cancel(); XCTAssertEqual(Array(f.repo.calls.suffix(2)), ["CANCEL:task", "QUERY:task"])
    XCTAssertEqual(f.service.state.lastConfirmed, .cancelled); f.now = 6000; try await f.service.pollOnce(); XCTAssertEqual(f.count("QUERY"), 2)
  }
  func testDeleteACKWithUpdatingIsUnknownAndNeverReplayed() async throws {
    let f = Fixture(); try await f.updating(); f.grantCancel(); f.now = 3000; try await f.service.cancel(); f.now = 6000; try await f.service.cancel()
    XCTAssertEqual(f.count("CANCEL"), 1); XCTAssertEqual(f.service.state.lastConfirmed, .updating); XCTAssertTrue(f.service.state.resultUnknown)
  }
  func testMissingTaskOrCancelTransportErrorNeverAppearsCancelled() async throws {
    for error in [RowanFailure(code: 1523, message: "fixture"), URLError(.timedOut)] as [Error] {
      let f = Fixture(); try await f.updating(); f.grantCancel(); f.repo.cancelHook = { throw error }; f.now = 3000
      try await f.service.cancel(); f.service.stopObserving(); f.service.resumeObserving(); try await f.service.cancel()
      XCTAssertEqual(f.count("CANCEL"), 1); XCTAssertEqual(f.service.state.lastConfirmed, .updating); XCTAssertTrue(f.service.state.resultUnknown)
    }
  }
  func testLateOldAccountOrRevokedReadCannotPublishOrDispatchMore() async throws {
    for variant in 0..<3 {
      let f = Fixture(); try await f.updating(); var pending: CheckedContinuation<Void, Error>?
      f.repo.result = .success; f.repo.queryHook = { try await withCheckedThrowingContinuation { pending = $0 } }
      f.now = 3000; let task = Task { try await f.service.pollOnce() }; try await wait { pending != nil }
      if variant == 0 { f.current = false; pending?.resume() }
      else { pending?.resume(throwing: RowanFailure(code: variant == 1 ? 403 : 1532, message: "fixture")) }
      try await task.value; let calls = f.repo.calls.count
      f.service.resumeObserving(); try await f.service.pollOnce(); try await f.service.start(); try await f.service.cancel()
      XCTAssertTrue(f.service.state.sessionExpired); XCTAssertNil(f.service.state.task); XCTAssertEqual(f.repo.calls.count, calls)
    }
  }
  func testLateCreateACKCannotResumeObservationPausedDuringPUT() async throws {
    let f = Fixture(); try await f.service.loadCandidate(.mcu); f.grantStart(); var pending: CheckedContinuation<String, Error>?
    f.repo.startHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.service.start() }; try await wait { pending != nil }
    f.service.stopObserving(); pending?.resume(returning: "task"); try await task.value
    XCTAssertEqual(f.service.state.task?.taskID, "task"); XCTAssertFalse(f.service.state.observing)
    f.now = 3000; try await f.service.pollOnce()
    XCTAssertEqual(f.count("START"), 1); XCTAssertEqual(f.count("QUERY"), 0); XCTAssertEqual(f.count("CANCEL"), 0)
  }
}

import XCTest
@testable import Rowan

@MainActor
final class DeviceNicknameTests: XCTestCase {
  @MainActor private final class Journal: NicknameJournal {
    var records: [String: NicknameRecord] = [:]
    var beforeReserve: () async throws -> Void = {}
    var failReserve = false, failComplete = false
    func load(key: String) async throws -> NicknameRecord? { records[key] }
    func reserve(_ value: NicknameRecord) async throws -> NicknameRecord {
      try await beforeReserve()
      if failReserve { throw NicknameJournalFailure.storageUnavailable }
      if let previous = records[value.key], previous.phase == .unknown { return previous }
      records[value.key] = value; return value
    }
    func complete(_ value: NicknameRecord) async throws -> Bool {
      if failComplete { throw NicknameJournalFailure.storageUnavailable }
      guard records[value.key]?.operationID == value.operationID else { return false }
      records[value.key] = value; return true
    }
  }
  @MainActor private final class Repo: NicknameRepository {
    let scope: DeviceMoreScope
    var patches = 0, reads = 0, observed: String? = "new"
    var patchHook: () async throws -> Void = {}, readHook: () async throws -> Void = {}
    init(_ scope: DeviceMoreScope) { self.scope = scope }
    func patch(nickname: String) async throws { patches += 1; try await patchHook() }
    func readNickname() async throws -> String? { reads += 1; try await readHook(); return observed }
  }
  @MainActor private final class Fixture {
    let scope: DeviceMoreScope, gateway: DeviceReadFakeGateway
    let journal = Journal(), repo: Repo
    var identity: MQTTPoolIdentity?, page = true, publications = 0, revocations = 0
    lazy var owner = DeviceReadOwner(currentAccount: { [unowned self] in identity }, gateway: gateway,
      open: { device, _ in
        let resource = try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: "public-thing", userID: device.userID)
        let lease = DeviceReadFakeLease(resource); try lease.ready(1); return DeviceReadFakeBinding(lease)
      }, invalidateAccount: { _ in })
    lazy var handle = owner.observe(resourceID: scope.resourceID, nativeObserverID: "nickname-page")
    var binding: NicknameBinding { NicknameBinding(scope: scope, handle: handle, pageCurrent: { [unowned self] in page }) }
    let allowed: NicknamePolicy = { _, target in ["new", " next ", "é"].contains(target) }
    init(_ proof: AuthorizedDevice) {
      scope = DeviceMoreScope(accountRevision: proof.accountRevision, resourceID: proof.resourceID, userID: proof.userID, productID: proof.productID)
      gateway = DeviceReadFakeGateway(proof); repo = Repo(scope)
      identity = MQTTPoolIdentity(revision: proof.accountRevision, userID: proof.userID)
    }
    func coordinator(policy: NicknamePolicy? = nil, useDefaultPolicy: Bool = true) -> DeviceNicknameCoordinator {
      DeviceNicknameCoordinator(currentAccount: { [unowned self] in identity }, access: gateway, journal: journal,
        repository: { [unowned self] _ in repo }, policy: useDefaultPolicy ? allowed : policy,
        onConfirmed: { [unowned self] _, _ in publications += 1 },
        onOwnershipRevoked: { [unowned self] binding in revocations += 1; _ = owner.revokeOwnership(binding.handle) })
    }
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Public nickname fixture stalled"); throw NicknameJournalFailure.storageUnavailable
  }
  private func fixture() async throws -> Fixture {
    let f = Fixture(try await makeDeviceReadProof())
    _ = f.handle
    try await wait { if case let .current(value) = f.handle.state { return value.metadata != nil }; return false }
    return f
  }
  func testMissingPolicyCannotInferAdminWritePermission() async throws {
    let f = try await fixture(); defer { f.owner.close() }
    let result = try await f.coordinator(useDefaultPolicy: false).begin(f.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(result.errorCode, "unsupported"); XCTAssertEqual(f.repo.patches, 0); XCTAssertTrue(f.journal.records.isEmpty)
  }
  func testExplicitPolicyPreservesExactWhitespaceWithoutInventedValidation() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.repo.observed = " next "
    let result = try await f.coordinator().begin(f.binding, target: " next ", intentID: "a").value()
    XCTAssertEqual(result.state, "confirmed"); XCTAssertEqual(Array(result.confirmedNickname.utf8), Array(" next ".utf8))
  }
  func testPolicyRejectedInputNeverPersistsOrPatches() async throws {
    let f = try await fixture(); defer { f.owner.close() }
    let result = try await f.coordinator().begin(f.binding, target: "not permitted", intentID: "a").value()
    XCTAssertEqual(result.errorCode, "invalid_input"); XCTAssertEqual(f.repo.patches, 0); XCTAssertTrue(f.journal.records.isEmpty)
  }
  func testDurableReservationMustFinishBeforePatch() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.journal.beforeReserve = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = f.coordinator().begin(f.binding, target: "new", intentID: "a")
    try await wait { pending != nil }; XCTAssertEqual(f.repo.patches, 0)
    pending?.resume(); let result = try await task.value(); XCTAssertEqual(result.state, "confirmed")
  }
  func testFailedReservePreventsEveryMutation() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.journal.failReserve = true
    let result = try await f.coordinator().begin(f.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(result.errorCode, "storage_unavailable"); XCTAssertEqual(f.repo.patches, 0)
  }
  func testAcknowledgementWithoutMatchingExplicitReadbackIsUnknown() async throws {
    for observed in [nil, "old", "NEW"] as [String?] {
      let f = try await fixture(); defer { f.owner.close() }; f.repo.observed = observed
      let result = try await f.coordinator().begin(f.binding, target: "new", intentID: "a").value()
      XCTAssertEqual(result.state, "unknown"); XCTAssertEqual(f.publications, 0); XCTAssertEqual(f.journal.records.values.first?.phase, .unknown)
    }
  }
  func testCanonicalUnicodeEquivalenceIsNotExactWireReadback() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.repo.observed = "e\u{301}"
    let result = try await f.coordinator().begin(f.binding, target: "é", intentID: "a").value()
    XCTAssertEqual(result.state, "unknown"); XCTAssertEqual(f.publications, 0)
  }
  func testFailedTerminalPersistenceCannotPublishConfirmedTitle() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.journal.failComplete = true
    let result = try await f.coordinator().begin(f.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(result.state, "unknown"); XCTAssertEqual(result.errorCode, "storage_unavailable"); XCTAssertEqual(f.publications, 0)
  }
  func testDuplicateIntentsShareActualTaskAndDifferentTargetIsBusy() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.repo.patchHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = f.coordinator(), first = owner.begin(f.binding, target: "new", intentID: "a")
    try await wait { pending != nil }
    XCTAssertTrue(first === owner.begin(f.binding, target: "new", intentID: "a"))
    let busy = try await owner.begin(f.binding, target: " next ", intentID: "b").value(); XCTAssertEqual(busy.errorCode, "busy")
    pending?.resume(); _ = try await first.value(); XCTAssertEqual(f.repo.patches, 1)
  }
  func testCancelledPageAwaitDoesNotCancelAcceptedNativeTask() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.repo.patchHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = f.coordinator().begin(f.binding, target: "new", intentID: "a")
    try await wait { pending != nil }
    let waiter = Task { try await task.value() }; await Task.yield(); waiter.cancel(); f.page = false
    pending?.resume()
    do { _ = try await waiter.value; XCTFail("Cancelled waiter returned") } catch { XCTAssertTrue(error is CancellationError) }
    let result = try await task.value(); XCTAssertEqual(result.state, "confirmed"); XCTAssertEqual(f.repo.patches, 1); XCTAssertEqual(f.publications, 0)
  }
  func testAccountSwitchAfterDispatchNeverReadsOrPublishesForB() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.repo.patchHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = f.coordinator().begin(f.binding, target: "new", intentID: "a")
    try await wait { pending != nil }; f.identity = MQTTPoolIdentity(revision: f.scope.accountRevision + 1, userID: "account-b"); pending?.resume()
    let result = try await task.value(); XCTAssertEqual(result.state, "unknown"); XCTAssertEqual(f.repo.reads, 0); XCTAssertEqual(f.publications, 0)
  }
  func testSameIdentityPublicationRetainsAcceptedTask() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.repo.patchHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = f.coordinator().begin(f.binding, target: "new", intentID: "a")
    try await wait { pending != nil }; f.identity = MQTTPoolIdentity(revision: f.scope.accountRevision, userID: f.scope.userID); pending?.resume()
    let result = try await task.value(); XCTAssertEqual(result.state, "confirmed")
  }
  func testReleasedHandleCannotAdmitAWrite() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.handle.close()
    let result = try await f.coordinator().begin(f.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(result.errorCode, "session_changed"); XCTAssertEqual(f.repo.patches, 0)
  }
  func testFresh403RevokesRealHandleButFunctional403DoesNot() async throws {
    let a = try await fixture(); defer { a.owner.close() }; a.gateway.authorizeHook = { throw RowanFailure(code: 403, message: "private") }
    let denied = try await a.coordinator().begin(a.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(denied.errorCode, "forbidden"); XCTAssertEqual(a.revocations, 1); XCTAssertEqual(a.repo.patches, 0)
    let b = try await fixture(); defer { b.owner.close() }; b.repo.patchHook = { throw RowanFailure(code: 403, message: "private") }
    let rejected = try await b.coordinator().begin(b.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(rejected.state, "rejected"); XCTAssertEqual(b.revocations, 0)
  }
  func testExplicit1382RevokesWithoutReadOrReplay() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.repo.patchHook = { throw RowanFailure(code: 1382, message: "private") }
    let result = try await f.coordinator().begin(f.binding, target: "new", intentID: "a").value()
    XCTAssertEqual(result.errorCode, "forbidden"); XCTAssertEqual(f.revocations, 1); XCTAssertEqual(f.repo.reads, 0); XCTAssertEqual(f.repo.patches, 1)
  }
  func testUnknownSurvivesOwnerReconstructionAndReconciliationOnlyGets() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.repo.patchHook = { throw URLError(.timedOut) }
    let first = try await f.coordinator().begin(f.binding, target: "new", intentID: "a").value(); XCTAssertEqual(first.state, "unknown")
    let rebuilt = f.coordinator()
    let repeated = try await rebuilt.begin(f.binding, target: "new", intentID: "a").value(); XCTAssertEqual(repeated.state, "unknown")
    let confirmed = try await rebuilt.reconcile(f.binding).value(); XCTAssertEqual(confirmed.state, "confirmed"); XCTAssertEqual(f.repo.patches, 1)
  }
  func testLateOldCompletedIntentCannotUndoNewConfirmedName() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let owner = f.coordinator()
    let first = owner.begin(f.binding, target: "new", intentID: "a"); _ = try await first.value()
    f.repo.observed = " next "; _ = try await owner.begin(f.binding, target: " next ", intentID: "b").value()
    XCTAssertTrue(first === owner.begin(f.binding, target: "new", intentID: "a")); XCTAssertEqual(f.repo.patches, 2)
  }
  func testReleasedPageAfterDispatchSuppressesMetadataPublication() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.repo.patchHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = f.coordinator().begin(f.binding, target: "new", intentID: "a"); try await wait { pending != nil }
    f.handle.close(); pending?.resume(); let result = try await task.value()
    XCTAssertEqual(result.state, "confirmed"); XCTAssertEqual(f.publications, 0)
  }
  func testStableKeysSeparateUsersAndLengthPrefixIdentityComponents() {
    XCTAssertNotEqual(nicknameKey(userID: "a", resourceID: "bc"), nicknameKey(userID: "ab", resourceID: "c"))
    XCTAssertNotEqual(nicknameKey(userID: "account-a", resourceID: "device"), nicknameKey(userID: "account-b", resourceID: "device"))
    XCTAssertNotEqual(nicknameKey(userID: "é", resourceID: "device"), nicknameKey(userID: "e\u{301}", resourceID: "device"))
  }
  func testRecordAndViewDescriptionsRedactPrivateInput() {
    let record = NicknameRecord(key: nicknameKey(userID: "private-user", resourceID: "private-device"), operationID: "operation",
      userID: "private-user", resourceID: "private-device", productID: "product", target: "private-target", phase: .unknown, errorCode: "")
    XCTAssertFalse(String(reflecting: record).contains("private"))
    XCTAssertFalse(String(reflecting: NicknameView(operationID: "id", state: "confirmed", confirmedNickname: "private-target")).contains("private"))
  }
}


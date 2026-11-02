import XCTest
@testable import Rowan

@MainActor
final class DeviceReadOwnerTests: XCTestCase {
  @MainActor private final class Fixture {
    let gateway: DeviceReadFakeGateway
    var identity: MQTTPoolIdentity?
    var leases: [DeviceReadFakeLease] = [], invalidated: [Int] = []
    var profile: ShadowProfile?
    var leaseReady = true
    var capacity = 32
    var configure: (DeviceReadFakeLease) -> Void = { _ in }
    var afterLease: (DeviceReadFakeLease) async throws -> Void = { _ in }
    let initialization = DeviceReadTestSignal(), snapshot = DeviceReadTestSignal()
    init(_ device: AuthorizedDevice) { gateway = DeviceReadFakeGateway(device); identity = MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }
    lazy var owner = DeviceReadOwner(currentAccount: { [unowned self] in identity }, gateway: gateway, open: { [unowned self] device, _ in
      let resource = try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: "cloud-thing", userID: device.userID)
      let lease = DeviceReadFakeLease(resource); configure(lease); leases.append(lease); try await afterLease(lease)
      if leaseReady { try lease.ready(Int64(leases.count * 100)) }; return DeviceReadFakeBinding(lease)
    }, invalidateAccount: { [unowned self] in invalidated.append($0) }, readProfile: { [unowned self] _ in profile }, capacity: capacity,
      initializationWait: { [unowned self] in try await initialization.wait() }, snapshotWait: { [unowned self] in try await snapshot.wait() })
    func observe(_ name: String = "native") -> DeviceReadHandle { owner.observe(resourceID: gateway.device.resourceID, nativeObserverID: name) }
  }
  private func fixture() async throws -> Fixture { Fixture(try await makeDeviceReadProof()) }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Offline owner progress missing"); throw DeviceReadFailure.connection
  }
  private func phase(_ handle: DeviceReadHandle) -> DeviceReadPhase? { if case let .current(value) = handle.state { return value.phase }; return nil }
  private func reading(_ f: Fixture, _ handle: DeviceReadHandle) async throws -> DeviceReadFakeLease { try await wait { phase(handle) == .reading && f.leases.first?.gets.count == 1 }; return try XCTUnwrap(f.leases.first) }
  private func live(_ handle: DeviceReadHandle) async throws -> DeviceReadSnapshot { try await wait { phase(handle) == .live }; return try handle.getSnapshot() }
  func testTwoNativeObserversShareOneAuthorizationLeaseReducerAndAuthority() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = f.observe("home"), b = f.observe("rn"), lease = try await reading(f, a)
    try lease.emit(epoch: 100, reported: ["temperature": 12]); let first = try await live(a), second = try b.getSnapshot()
    XCTAssertEqual(first, second); XCTAssertEqual(f.gateway.authorizations, 1); XCTAssertEqual(f.leases.count, 1); XCTAssertEqual(lease.gets, [100])
  }
  func testNoAccountOrCleanupIdentityDoesNotAuthorize() async throws {
    let f = try await fixture(); f.identity = nil; let handle = f.observe(); XCTAssertEqual(handle.state, .closed(.noAccount))
    XCTAssertEqual(f.gateway.authorizations, 0); XCTAssertTrue(f.leases.isEmpty); f.owner.close()
  }
  func testForbiddenMembershipNeverOpensLeaseAndClearsMetadata() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.gateway.authorizeHook = { throw RowanFailure(code: 403, message: "fixture") }
    let handle = f.observe(); try await wait { phase(handle) == .forbidden }; let value = try handle.getSnapshot()
    XCTAssertTrue(f.leases.isEmpty); XCTAssertNil(value.metadata); XCTAssertNil(value.online); XCTAssertEqual(value.reported, .fields([:]))
  }
  func testSlowAuthorizationStaysUnknownWithoutLease() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let pending = DeviceReadTestSignal(); f.gateway.authorizeHook = { try await pending.wait() }
    let handle = f.observe(); try await wait { pending.waiting == 1 }
    XCTAssertEqual(phase(handle), .authorizing); XCTAssertNil(try handle.getSnapshot().online); XCTAssertTrue(f.leases.isEmpty)
  }
  func testAccountChangeRejectsLateUncooperativeAuthorization() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.gateway.authorizeHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let handle = f.observe(); try await wait { pending != nil }; f.identity = nil; f.owner.accountChanged(); pending?.resume()
    try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertEqual(handle.state, .closed(.accountChanged)); XCTAssertTrue(f.leases.isEmpty); XCTAssertEqual(f.invalidated, [f.gateway.device.accountRevision])
    XCTAssertThrowsError(try handle.getSnapshot())
  }
  func testSameIdentityPublicationDoesNotForkOrReconnectAuthority() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(); _ = try await reading(f, handle); let before = try handle.getSnapshot()
    f.identity = MQTTPoolIdentity(revision: before.accountRevision, userID: f.gateway.device.userID); f.owner.accountChanged()
    XCTAssertEqual(f.gateway.authorizations, 1); XCTAssertEqual(f.leases.count, 1); XCTAssertEqual(try handle.getSnapshot(), before)
  }
  func testResponseBeforeGetPubackCompletesSnapshotWithoutBlockingOwner() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let ack = DeviceReadTestSignal()
    f.configure = { lease in lease.getHook = { epoch in try lease.emit(epoch: epoch, reported: ["value": 8]); try await ack.wait() } }
    let handle = f.observe(); let value = try await live(handle)
    XCTAssertTrue(value.snapshotAvailable); XCTAssertNil(value.online); XCTAssertEqual(f.leases[0].gets, [100]); XCTAssertEqual(f.leases[0].acknowledgements, [1])
  }
  func testTransportReadyAndPubackAloneDoNotInventSnapshotOrOnline() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(); _ = try await reading(f, handle)
    let value = try handle.getSnapshot(); XCTAssertFalse(value.snapshotAvailable); XCTAssertNil(value.online); XCTAssertEqual(value.phase, .reading)
  }
  func testValidEmptySnapshotIsAvailableWithUnknownOnline() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try lease.emit(epoch: 100); let value = try await live(handle); XCTAssertTrue(value.snapshotAvailable); XCTAssertEqual(value.reported, .fields([:])); XCTAssertNil(value.online)
  }
  func testNoReadProfileDoesNotGuessConnectTypeOrOfferCommands() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try lease.emit(epoch: 100, reported: ["ConnectType": "online"]); let value = try await live(handle); XCTAssertNil(value.online); XCTAssertEqual(lease.gets, [100])
  }
  func testExplicitReadProfileMapsOnlineOnlyAfterValidSnapshot() async throws {
    let f = try await fixture(); defer { f.owner.close() }
    f.profile = try ShadowProfile(writable: [:], connection: ShadowOnlineField(path: ["ConnectType"], online: .text("online"), offline: .text("offline")))
    let handle = f.observe(), lease = try await reading(f, handle); XCTAssertNil(try handle.getSnapshot().online)
    try lease.emit(epoch: 100, reported: ["ConnectType": "online"]); let value = try await live(handle); XCTAssertEqual(value.online, true)
  }
  func testOldEpochCannotOverwriteNewRequestedSnapshot() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try lease.emit(epoch: 100, reported: ["value": 1]); _ = try await live(handle)
    try lease.ready(101); try await wait { lease.gets.count == 2 }; try lease.emit(epoch: 101, reported: ["value": 2]); _ = try await live(handle)
    try lease.emit(epoch: 100, version: 99, reported: ["value": 99]); try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertEqual(try handle.getSnapshot().reported, .fields(["value": .number(2)])); XCTAssertEqual(try handle.getSnapshot().connectionEpoch, 101)
  }
  func testFutureEpochBufferGapRequiresFreshPostReadyResponse() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.capacity = 2; f.leaseReady = false; let handle = f.observe()
    try await wait { f.leases.count == 1 }; let lease = f.leases[0]
    for version in 1...3 { try lease.emit(epoch: 100, version: version, reported: ["value": version]) }
    try await wait { lease.acknowledgements.count == 3 }; try lease.ready(100); try await wait { lease.gets.count == 1 }
    XCTAssertFalse(try handle.getSnapshot().snapshotAvailable)
    try lease.emit(epoch: 100, version: 4, reported: ["value": 4]); let value = try await live(handle); XCTAssertEqual(value.reported, .fields(["value": .number(4)]))
  }
  func testValidPreReadyBufferCannotSkipTheEpochGetInvocation() async throws {
    let f = try await fixture(); defer { f.owner.close() }; f.leaseReady = false
    let handle = f.observe(); try await wait { f.leases.count == 1 }; let lease = f.leases[0]
    try lease.emit(epoch: 100, reported: ["value": 1]); try await wait { lease.acknowledgements.count == 1 }
    try lease.ready(100); let value = try await live(handle)
    XCTAssertTrue(value.snapshotAvailable); XCTAssertEqual(lease.gets, [100])
  }
  func testDisconnectRetainsSameAccountCacheAndMakesOnlineUnknown() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try lease.emit(epoch: 100, reported: ["value": 1]); let before = try await live(handle)
    lease.state = .recovering(.transportFailed); lease.onStateChanged?(); try await wait { phase(handle) == .recovering }
    let after = try handle.getSnapshot(); XCTAssertEqual(after.reported, before.reported); XCTAssertTrue(after.stale); XCTAssertFalse(after.snapshotAvailable); XCTAssertNil(after.online)
  }
  func testReleasingOneObserverPreservesOtherAndClosedHandleCannotReadCache() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = f.observe("a"), b = f.observe("b"), lease = try await reading(f, a)
    a.close(); XCTAssertEqual(lease.closes, 0); XCTAssertThrowsError(try a.getSnapshot())
    try lease.emit(epoch: 100, reported: ["value": 1]); _ = try await live(b); b.close(); XCTAssertEqual(lease.closes, 1)
  }
  func testRetryReauthorizesAndLateOldLeaseCallbackCannotEraseNewReady() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), old = try await reading(f, handle), late = old.onStateChanged
    handle.retry(); try await wait { f.leases.count == 2 }; old.state = .closed; late?()
    try await wait { f.leases[1].gets.count == 1 }; XCTAssertEqual(phase(handle), .reading); XCTAssertEqual(f.gateway.authorizations, 2); XCTAssertEqual(old.closes, 1)
  }
  func testAuthorityRevisionIncreasesAcrossReleaseAndReopenButDoesNotCountPureReads() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = f.observe(), lease = try await reading(f, a), before = try a.getSnapshot()
    XCTAssertEqual(try a.getSnapshot().authorityRevision, before.authorityRevision)
    try lease.emit(epoch: 100, reported: ["value": 1]); let liveValue = try await live(a); XCTAssertGreaterThan(liveValue.authorityRevision, before.authorityRevision)
    a.close(); let b = f.observe(); XCTAssertGreaterThan(try b.getSnapshot().authorityRevision, liveValue.authorityRevision)
  }
  func testSnapshotDeadlineIsBoundedUnknownWithoutAutomaticGetLoop() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try await wait { f.snapshot.waiting == 1 }; f.snapshot.open(); try await wait { phase(handle) == .unavailable }
    XCTAssertEqual(try handle.getSnapshot().failure, .snapshotTimeout); XCTAssertFalse(try handle.getSnapshot().snapshotAvailable); XCTAssertEqual(lease.gets, [100])
  }
  func testOwnerCloseReleasesLeaseAndPreventsNewObservation() async throws {
    let f = try await fixture(); let handle = f.observe(), lease = try await reading(f, handle); f.owner.close(); f.owner.close()
    XCTAssertEqual(lease.closes, 1); XCTAssertEqual(handle.state, .closed(.ownerClosed)); XCTAssertEqual(f.observe("later").state, .closed(.ownerClosed))
  }
  func testDuplicateObserverCannotReleaseOtherAuthority() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = f.observe("same"), lease = try await reading(f, a), duplicate = f.observe("same")
    XCTAssertEqual(duplicate.state, .closed(.duplicateObserver)); duplicate.close(); XCTAssertEqual(lease.closes, 0); XCTAssertEqual(f.gateway.authorizations, 1)
  }
  func testShadowAuthorizationRejectionClearsCacheAndDoesNotBlindlyRetry() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try lease.emit(epoch: 100, reported: ["value": 1]); _ = try await live(handle)
    try lease.send(epoch: 100, suffix: "get/rejected", body: ["code": 403]); try await wait { phase(handle) == .forbidden }
    let value = try handle.getSnapshot(); XCTAssertEqual(value.reported, .fields([:])); XCTAssertNil(value.metadata); XCTAssertEqual(lease.gets, [100]); XCTAssertEqual(lease.closes, 1)
  }
  func test404And409RequestOneActiveRecoveryGetAndRequireValidResponse() async throws {
    for code in [404, 409] {
      let f = try await fixture(); let handle = f.observe(), lease = try await reading(f, handle)
      try lease.send(epoch: 100, suffix: "get/rejected", body: ["code": code]); try await wait { lease.gets.count == 2 }
      XCTAssertFalse(try handle.getSnapshot().snapshotAvailable); XCTAssertNil(try handle.getSnapshot().online)
      try lease.emit(epoch: 100, reported: ["value": 2]); _ = try await live(handle); XCTAssertEqual(lease.gets, [100, 100]); f.owner.close()
    }
  }
  func testLateLeaseHandoffAfterReleaseIsClosedWithoutPublishingGet() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.afterLease = { _ in try await withCheckedThrowingContinuation { pending = $0 } }
    let handle = f.observe(); try await wait { pending != nil }; handle.close(); pending?.resume()
    try await wait { f.leases.first?.closes == 1 }
    XCTAssertTrue(f.leases[0].gets.isEmpty); XCTAssertEqual(handle.state, .closed(.released))
  }
  func testInitializationTimeoutKeepsOneDeferredRetryUntilActualIOCompletes() async throws {
    let f = try await fixture(); defer { f.owner.close() }; var pending: CheckedContinuation<Void, Error>?
    f.gateway.authorizeHook = { [unowned f] in if f.gateway.authorizations == 1 { try await withCheckedThrowingContinuation { pending = $0 } } }
    let handle = f.observe(); try await wait { pending != nil && f.initialization.waiting == 1 }
    f.initialization.open(); try await wait { phase(handle) == .unavailable }
    handle.retry(); handle.retry(); XCTAssertEqual(f.gateway.authorizations, 1)
    pending?.resume(); _ = try await reading(f, handle); XCTAssertEqual(f.gateway.authorizations, 2); XCTAssertEqual(f.leases.count, 1)
  }
  func testReleaseOrAccountChangeClearsDeferredInitializationRetry() async throws {
    for accountChanged in [false, true] {
      let f = try await fixture(); var pending: CheckedContinuation<Void, Error>?
      f.gateway.authorizeHook = { try await withCheckedThrowingContinuation { pending = $0 } }
      let handle = f.observe(); try await wait { pending != nil && f.initialization.waiting == 1 }
      f.initialization.open(); try await wait { phase(handle) == .unavailable }; handle.retry()
      if accountChanged { f.identity = nil; f.owner.accountChanged() } else { handle.close() }
      pending?.resume(); try await Task.sleep(nanoseconds: 5_000_000)
      XCTAssertEqual(f.gateway.authorizations, 1); XCTAssertTrue(f.leases.isEmpty); f.owner.close()
    }
  }
  func testCancellingAViewWaitDoesNotCancelApplicationOwnedAuthorization() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let authorization = DeviceReadTestSignal(), view = DeviceReadTestSignal()
    f.gateway.authorizeHook = { try await authorization.wait() }; let handle = f.observe()
    let waiting = Task { try await view.wait(); return try handle.getSnapshot() }
    try await wait { view.waiting == 1 && authorization.waiting == 1 }; waiting.cancel()
    do { _ = try await waiting.value; XCTFail("View wait cancellation lost") } catch is CancellationError { }
    authorization.open(); let lease = try await reading(f, handle); try lease.emit(epoch: 100, reported: ["value": 1]); _ = try await live(handle)
    XCTAssertEqual(f.gateway.authorizations, 1); XCTAssertEqual(f.leases.count, 1)
  }
  func testRepeated404RecoveryDoesNotSpinAnUnboundedGetLoop() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let handle = f.observe(), lease = try await reading(f, handle)
    try lease.send(epoch: 100, suffix: "get/rejected", body: ["code": 404]); try await wait { lease.gets.count == 2 }
    try lease.send(epoch: 100, suffix: "get/rejected", body: ["code": 404]); try await wait { phase(handle) == .unavailable }
    XCTAssertEqual(lease.gets, [100, 100]); XCTAssertEqual(try handle.getSnapshot().failure, .shadowProtocol)
  }

  func testHandleRevocationSynchronouslyClearsAllSameResourceObserversAndLatchesRetry() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let a = f.observe("a"), b = f.observe("b"), lease = try await reading(f, a)
    try lease.emit(epoch: 100, reported: ["value": 1]); _ = try await live(a); let late = lease.onStateChanged, oldMessages = lease.onMessageAvailable
    XCTAssertTrue(f.owner.revokeOwnership(b)); XCTAssertFalse(f.owner.revokeOwnership(a))
    for handle in [a, b] { let value = try handle.getSnapshot(); XCTAssertEqual(value.phase, .forbidden); XCTAssertEqual(value.reported, .fields([:])); XCTAssertNil(value.metadata); XCTAssertFalse(f.owner.featureReadCurrent(handle)) }
    lease.state = .recovering(.transportFailed); late?(); oldMessages?(); a.retry(); b.retry(); try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertEqual(f.gateway.authorizations, 1); XCTAssertEqual(f.leases.count, 1); XCTAssertEqual(lease.closes, 1); XCTAssertEqual(phase(a), .forbidden)
  }
  func testReleasedOrOldAccountHandleCannotRevokeReplacementResource() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let old = f.observe(), first = try await reading(f, old); old.close()
    let replacement = f.observe(); try await wait { f.leases.count == 2 && f.leases[1].gets.count == 1 }
    XCTAssertFalse(f.owner.revokeOwnership(old)); XCTAssertEqual(phase(replacement), .reading); XCTAssertEqual(first.closes, 1)
    f.identity = nil; f.owner.accountChanged(); XCTAssertFalse(f.owner.revokeOwnership(replacement)); XCTAssertFalse(f.owner.featureReadCurrent(replacement))
  }
  func testRevocationTouchesOnlyTheHandlesResource() async throws {
    let f = try await fixture(); defer { f.owner.close() }; let other = try await makeDeviceReadProof(resourceID: "other-resource")
    f.gateway.authorizeResult = { id, _ in id == other.resourceID ? other : nil }
    let a = f.observe(), b = f.owner.observe(resourceID: other.resourceID, nativeObserverID: "other")
    try await wait { f.leases.count == 2 && f.leases.allSatisfy { !$0.gets.isEmpty } }
    let first = try XCTUnwrap(f.leases.first { $0.resource.resourceID == f.gateway.device.resourceID }), second = try XCTUnwrap(f.leases.first { $0.resource.resourceID == other.resourceID })
    try first.emit(epoch: first.gets[0], reported: ["value": 1]); try second.emit(epoch: second.gets[0], reported: ["value": 2]); _ = try await live(a); let before = try await live(b)
    XCTAssertTrue(f.owner.revokeOwnership(a)); XCTAssertEqual(try b.getSnapshot(), before); XCTAssertTrue(f.owner.featureReadCurrent(b)); XCTAssertEqual(second.closes, 0)
  }

}

extension DeviceReadOwnerTests {
  func testAcknowledgedAuthorityStopsLiveCacheUntilFreshProof() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe(),oldLease=try await reading(f,h)
    try oldLease.emit(epoch:100,reported:["value":1]);_=try await live(h);let old=try XCTUnwrap(f.owner.captureFeatureAuthority(h))
    let gate=DeviceReadTestSignal();f.gateway.authorizeHook={try await gate.wait()}
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    let empty=try h.getSnapshot();XCTAssertNil(empty.metadata);XCTAssertEqual(empty.reported,.fields([:]));XCTAssertNil(empty.online)
    XCTAssertFalse(f.owner.featureReadCurrent(h,authority:old));XCTAssertNil(f.owner.captureFeatureAuthority(h))
    try await wait{gate.waiting>0};gate.open();try await wait{f.leases.count==2};XCTAssertNotNil(f.owner.captureFeatureAuthority(h));XCTAssertFalse(f.owner.featureReadCurrent(h,authority:old))
  }
  func testLateFeatureResultAndClassifierCannotCrossFreshProofFence() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe();_=try await reading(f,h)
    let old=try XCTUnwrap(f.owner.captureFeatureAuthority(h))
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    try await wait{f.leases.count==2};XCTAssertFalse(f.owner.featureReadCurrent(h,authority:old))
    XCTAssertTrue(f.owner.featureReadCurrent(h,authority:try XCTUnwrap(f.owner.captureFeatureAuthority(h))))
  }
  func testReportedFrameDoesNotRotateFeatureAuthority() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe(),lease=try await reading(f,h),receipt=try XCTUnwrap(f.owner.captureFeatureAuthority(h))
    try lease.emit(epoch:100,reported:["value":1]);_=try await live(h)
    XCTAssertTrue(f.owner.captureFeatureAuthority(h) === receipt);XCTAssertTrue(f.owner.featureReadCurrent(h,authority:receipt))
  }
  func testFreshForbiddenAfterAckCannotRestoreFeatureAuthority() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe();_=try await reading(f,h)
    f.gateway.authorizeHook={throw RowanFailure(code:403,message:"fixture")}
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    try await wait{phase(h) == .forbidden};XCTAssertNil(f.owner.captureFeatureAuthority(h));XCTAssertNil(try h.getSnapshot().metadata)
  }
  func testFreshNetworkFailureAfterAckCannotRestoreCacheOrFeatureAuthority() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe();_=try await reading(f,h)
    f.gateway.authorizeHook={throw RowanFailure(code:503,message:"fixture")}
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    try await wait{phase(h) == .unavailable};XCTAssertNil(f.owner.captureFeatureAuthority(h));XCTAssertEqual(try h.getSnapshot().reported,.fields([:]))
  }
  func testForeignAccountDoesNotInvalidateCurrentAuthority() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe();_=try await reading(f,h);let old=try XCTUnwrap(f.owner.captureFeatureAuthority(h))
    XCTAssertFalse(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision+1,userID:"other",resourceID:f.gateway.device.resourceID))
    XCTAssertTrue(f.owner.captureFeatureAuthority(h) === old)
  }
  func testOldLeaseFrameWhileAckProofPendingCannotRestoreSnapshot() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe(),lease=try await reading(f,h)
    try lease.emit(epoch:100,reported:["value":1]);_=try await live(h)
    let gate=DeviceReadTestSignal();f.gateway.authorizeHook={try await gate.wait()}
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    try lease.emit(epoch:100,version:99,reported:["value":99]);for _ in 0..<20{await Task.yield()}
    XCTAssertFalse(try h.getSnapshot().snapshotAvailable);XCTAssertEqual(try h.getSnapshot().reported,.fields([:]));gate.open()
  }
}

extension DeviceReadOwnerTests {
  func testUncooperativeOldProofFinishesBeforeExactlyOneFreshAckProofStarts() async throws {
    let f=try await fixture();defer{f.owner.close()};let h=f.observe();_=try await reading(f,h)
    var late:CheckedContinuation<Void,Error>?;defer{late?.resume();late=nil}
    f.gateway.authorizeHook={if f.gateway.authorizations==2{try await withCheckedThrowingContinuation{late=$0}}}
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    try await wait{late != nil}
    XCTAssertTrue(f.owner.invalidateAcknowledgedAuthority(expectedRevision:f.gateway.device.accountRevision,userID:f.gateway.device.userID,resourceID:f.gateway.device.resourceID))
    for _ in 0..<10{await Task.yield()};XCTAssertEqual(f.gateway.authorizations,2);XCTAssertNil(f.owner.captureFeatureAuthority(h))
    late?.resume();late=nil;try await wait{f.gateway.authorizations==3 && f.leases.count==2}
    XCTAssertNotNil(f.owner.captureFeatureAuthority(h))
  }
}

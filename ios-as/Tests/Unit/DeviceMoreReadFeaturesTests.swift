import XCTest
@testable import Rowan

@MainActor
final class DeviceMoreReadFeaturesTests: XCTestCase {
  @MainActor private final class Repository: DeviceMoreReadRepository {
    let scope: DeviceMoreScope
    var reads = 0
    var hook: () async throws -> Void = { }
    init(_ scope: DeviceMoreScope) { self.scope = scope }
    func summary() async throws -> DeviceMoreSummary {
      reads += 1; try await hook(); return DeviceMoreSummary(deviceNickname: "Nick", deviceName: "Device", productName: "Product", productCategory: "Fixture", seriesName: "", modelName: "", mcuVersion: "", wifiVersion: "", bindingRole: "sa")
    }
    func members() async throws -> [DeviceMoreMember] { reads += 1; try await hook(); return [DeviceMoreMember(itemKey: "local", nickname: "Member", bindingRole: "mbr")] }
    func help() async throws -> [DeviceMoreHelp] { reads += 1; try await hook(); return [] }
  }
  @MainActor private final class Rooms: DeviceRoomRepository {
    var reads = 0, moves = 0
    var value: RoomLocation?
    var hook: () async throws -> Void = { }
    func location(deviceID: String) async throws -> RoomLocation? { reads += 1; try await hook(); return value }
    func move(deviceID: String, roomID: RoomID?) async throws -> RoomLocation? { moves += 1; throw DeviceMoreReadFailure.readFailed }
  }
  @MainActor private final class Fixture {
    let gateway: DeviceReadFakeGateway
    var identity: MQTTPoolIdentity?
    var visible = true, wrongScope = false
    var repositories: [Repository] = [], scopes: [DeviceMoreScope] = []
    var hook: () async throws -> Void = { }
    let rooms = Rooms(), timeout = DeviceReadTestSignal()
    init(_ device: AuthorizedDevice) { gateway = DeviceReadFakeGateway(device); identity = MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }
    lazy var features = DeviceMoreReadFeatures(currentAccount: { [unowned self] in identity }, gateway: gateway, repository: { [unowned self] scope in
      scopes.append(scope); let value = Repository(wrongScope ? DeviceMoreScope(accountRevision: scope.accountRevision, resourceID: scope.resourceID, userID: scope.userID, productID: "wrong") : scope)
      value.hook = { [unowned self] in try await hook() }; repositories.append(value); return value
    }, rooms: { [unowned self] scope in scopes.append(scope); rooms.hook = { [unowned self] in try await hook() }; return rooms },
      observationCurrent: { [unowned self] in visible }, gate: NativeDeviceReadGate(deadline: { [unowned self] in try await timeout.wait() }))
    func invoke(_ kind: Int, id: String? = nil, revision: Int? = nil) async throws {
      let id = id ?? gateway.device.resourceID, revision = revision ?? gateway.device.accountRevision
      switch kind { case 0: _ = try await features.summary(resourceID: id, expectedRevision: revision); case 1: _ = try await features.members(resourceID: id, expectedRevision: revision)
      case 2: _ = try await features.help(resourceID: id, expectedRevision: revision); default: _ = try await features.location(resourceID: id, expectedRevision: revision) }
    }
  }
  private func fixture() async throws -> Fixture { Fixture(try await makeDeviceReadProof()) }
  private func wait(_ condition: () -> Bool) async throws { for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }; XCTFail("Fixture stalled"); throw URLError(.timedOut) }
  func testEveryReadFreshlyAuthorizesAndCarriesNativeScopeWithoutMQTTOrMove() async throws {
    let f = try await fixture(); defer { f.features.close() }; for kind in 0..<4 { try await f.invoke(kind) }; try await f.invoke(0)
    XCTAssertEqual(f.gateway.authorizations, 5); XCTAssertEqual(f.gateway.connections, 0); XCTAssertEqual(f.rooms.reads, 1); XCTAssertEqual(f.rooms.moves, 0)
    XCTAssertTrue(f.scopes.allSatisfy { $0 == DeviceMoreScope(accountRevision: f.gateway.device.accountRevision, resourceID: f.gateway.device.resourceID, userID: f.gateway.device.userID, productID: f.gateway.device.productID) })
  }
  func testRoomMissingIsUnknownAndAssignedProjectionHasNoID() async throws {
    let f = try await fixture(); defer { f.features.close() }; let device = f.gateway.device
    let missing = try await f.features.location(resourceID: device.resourceID, expectedRevision: device.accountRevision)
    XCTAssertEqual(missing.assignment, .unknown); XCTAssertEqual(missing.roomName, "")
    f.rooms.value = RoomLocation(id: .text("private-room"), name: "Study")
    let assigned = try await f.features.location(resourceID: device.resourceID, expectedRevision: device.accountRevision)
    XCTAssertEqual(assigned.dictionary, ["assignment": "assigned", "roomName": "Study"]); XCTAssertFalse(String(reflecting: assigned).contains("private-room")); XCTAssertEqual(f.rooms.moves, 0)
  }
  func testOldMissingOrInvisibleContextDoesNotAuthorize() async throws {
    for kind in 0..<4 {
      let f = try await fixture(); defer { f.features.close() }
      for variant in 0..<3 {
        f.identity = variant == 0 ? nil : MQTTPoolIdentity(revision: f.gateway.device.accountRevision + (variant == 1 ? 1 : 0), userID: f.gateway.device.userID); f.visible = variant != 2
        do { try await f.invoke(kind); XCTFail("Invalid context dispatched") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .sessionChanged) }
      }
      XCTAssertEqual(f.gateway.authorizations, 0); XCTAssertTrue(f.scopes.isEmpty)
    }
  }
  func testInvalidDeviceIDDoesNotAuthorizeAnyRepository() async throws {
    let f = try await fixture(); defer { f.features.close() }
    for id in ["", " ", ".", "..", "bad\npath"] { do { try await f.invoke(0, id: id); XCTFail("Invalid ID dispatched") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .readFailed) } }
    XCTAssertEqual(f.gateway.authorizations, 0); XCTAssertTrue(f.scopes.isEmpty)
  }
  func testDifferentAuthorizationResourceCannotConstructRepository() async throws {
    let f = try await fixture(); defer { f.features.close() }
    do { try await f.invoke(0, id: "other-resource"); XCTFail("Mismatched proof accepted") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .sessionChanged) }
    XCTAssertTrue(f.scopes.isEmpty); XCTAssertEqual(f.gateway.connections, 0)
  }
  func testRepositoryScopeMismatchIsRejectedBeforeReading() async throws {
    let f = try await fixture(); defer { f.features.close() }; f.wrongScope = true
    for kind in 0..<3 { do { try await f.invoke(kind); XCTFail("Wrong scope read") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .sessionChanged) } }
    XCTAssertTrue(f.repositories.allSatisfy { $0.reads == 0 })
  }
  func testKnownUnboundCodesMapToFixedForbiddenWithoutBackendCause() async throws {
    for code in [403, 1332, 1342, 1352, 1402, 1452, 1492, 1502] {
      for kind in 0..<4 {
        let f = try await fixture(); f.hook = { throw RowanFailure(code: code, message: "private-token https://private.invalid") }
        do { try await f.invoke(kind); XCTFail("Permission error accepted") } catch {
          let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertEqual(failure.code, .forbidden); XCTAssertEqual(failure.ownershipRevoked, code != 403); XCTAssertFalse(String(reflecting: error).contains("private"))
        }; f.features.close()
      }
    }
  }
  func testNetworkAndMalformedErrorsUseFixedVocabulary() async throws {
    for (error, expected) in [(URLError(.timedOut) as Error, DeviceMoreReadFailure.unavailable), (RowanFailure(code: 502, message: "private") as Error, .readFailed)] {
      let f = try await fixture(); f.hook = { throw error }
      do { try await f.invoke(2); XCTFail("Error accepted") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, expected); XCTAssertFalse(String(reflecting: error).contains("private")) }; f.features.close()
    }
  }
  func testAccountChangeDuringAuthorizationPreventsFeatureReads() async throws {
    let f = try await fixture(); defer { f.features.close() }; var pending: CheckedContinuation<Void, Error>?
    f.gateway.authorizeHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await f.invoke(0) }; try await wait { pending != nil }; f.identity = nil; pending?.resume()
    do { try await task.value; XCTFail("Late authorization escaped") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .sessionChanged) }; XCTAssertTrue(f.scopes.isEmpty)
  }
  func testLateAccountOrPageChangeOverridesEvenAPermissionError() async throws {
    for kind in 0..<4 {
      let f = try await fixture(); var pending: CheckedContinuation<Void, Error>?
      f.hook = { try await withCheckedThrowingContinuation { pending = $0 }; throw RowanFailure(code: 403, message: "private") }
      let task = Task { try await f.invoke(kind) }; try await wait { pending != nil }
      if kind % 2 == 0 { f.identity = nil } else { f.visible = false }; pending?.resume()
      do { try await task.value; XCTFail("Late response escaped") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .sessionChanged) }; f.features.close()
    }
  }
  func testCallerCancellationDoesNotPublishAnUncooperativeResult() async throws {
    let f = try await fixture(); defer { f.features.close() }; var pending: CheckedContinuation<Void, Error>?
    f.hook = { try await withCheckedThrowingContinuation { pending = $0 } }; let task = Task { try await f.invoke(1) }
    try await wait { pending != nil }; task.cancel(); pending?.resume(); do { try await task.value; XCTFail("Cancellation lost") } catch is CancellationError { }
    XCTAssertEqual(f.gateway.connections, 0); XCTAssertEqual(f.rooms.moves, 0)
  }
  func testTwoInFlightLimitHoldsUntilActualIOCompletesAndCloseBlocksNewCalls() async throws {
    let f = try await fixture(); var pending: [CheckedContinuation<Void, Error>] = []
    f.hook = { try await withCheckedThrowingContinuation { pending.append($0) } }
    let a = Task { try await f.invoke(0) }, b = Task { try await f.invoke(1) }; try await wait { pending.count == 2 }
    a.cancel(); do { try await f.invoke(2); XCTFail("Third read entered") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .unavailable) }
    XCTAssertEqual(f.gateway.authorizations, 2); f.features.close()
    do { try await f.invoke(2); XCTFail("Closed module read") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .closed) }
    for continuation in pending { continuation.resume() }; pending.removeAll()
    do { try await a.value; XCTFail("Cancellation lost") } catch is CancellationError { }
    do { try await b.value; XCTFail("Close lost") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .closed) }
  }
  func testTimeoutDoesNotReleaseSlotsUntilActualIOCompletionOrReplayReads() async throws {
    let f = try await fixture(); defer { f.features.close() }; var pending: [CheckedContinuation<Void, Error>] = [], cancelled = 0
    f.hook = {
      try await withTaskCancellationHandler(operation: { try await withCheckedThrowingContinuation { pending.append($0) } },
        onCancel: { Task { @MainActor in cancelled += 1 } })
    }
    let a = Task { try await f.invoke(0) }, b = Task { try await f.invoke(1) }; try await wait { pending.count == 2 && f.timeout.waiting == 2 }
    f.timeout.open(); try await wait { cancelled == 2 }; do { try await f.invoke(2); XCTFail("Timed out I/O lost slot") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .unavailable) }
    XCTAssertEqual(f.gateway.authorizations, 2); for continuation in pending { continuation.resume() }; pending.removeAll()
    for task in [a, b] { do { try await task.value; XCTFail("Timeout accepted") } catch { XCTAssertEqual(error as? DeviceMoreReadFailure, .unavailable) } }
  }
  func testFourMoreDTOAllowListsContainOnlySafeStrings() {
    let summary = DeviceMoreSummary(deviceNickname: "", deviceName: "", productName: "", productCategory: "", seriesName: "", modelName: "", mcuVersion: "", wifiVersion: "", bindingRole: "unknown").dictionary
    let member = DeviceMoreMember(itemKey: "local", nickname: "", bindingRole: "unknown").dictionary
    let help = DeviceMoreHelp(itemKey: "local", title: "", content: "", createdAt: "").dictionary
    let location = DeviceLocationSummary(assignment: .unknown, roomName: "").dictionary
    XCTAssertEqual(summary.count, 9); XCTAssertEqual(Set(member.keys), ["itemKey", "nickname", "bindingRole"])
    XCTAssertEqual(Set(help.keys), ["itemKey", "title", "content", "createdAt"]); XCTAssertEqual(location, ["assignment": "unknown", "roomName": ""])
    for value in [summary, member, help, location] { for field in ["email", "mobile", "userID", "mac", "bindCode", "token", "url", "rawJSON"] { XCTAssertNil(value[field]) } }
  }

  func testNativeFactoryRequiresCurrentOwnerPageGuardBeforeFreshHTTP() async throws {
    let (account, http) = try await makeDeviceReadAccount()
    let device = try await HTTPDeviceAccess(account: account, expiryEncoding: .unknown).authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let gateway = DeviceReadFakeGateway(device)
    let owner = DeviceReadOwner(currentAccount: { MQTTPoolIdentity(revision: account.revision, userID: "native-user") }, gateway: gateway, open: { device, _ in
      DeviceReadFakeBinding(DeviceReadFakeLease(try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: "thing", userID: device.userID)))
    }, invalidateAccount: { _ in })
    let handle = owner.observe(resourceID: device.resourceID, nativeObserverID: "native")
    let features = NativeDeviceMoreReadFactory.makeBound(account: account, owner: owner, handle: handle, gate: NativeDeviceReadGate(), pageCurrent: { false })
    defer { features.close(); owner.close() }
    do { _ = try await features.summary(resourceID: device.resourceID, expectedRevision: account.revision); XCTFail("Hidden page dispatched") }
    catch { XCTAssertEqual((error as? DeviceMoreReadError)?.code, .sessionChanged) }
    XCTAssertEqual(http.paths, ["/api/app/devices", "/api/app/devices/http-resource"])
  }

  func testFreshAuthorization403Or1342CarriesOwnershipRevokedMarker() async throws {
    for code in [403, 1342] {
      let f = try await fixture(); f.gateway.authorizeHook = { throw RowanFailure(code: code, message: "private") }
      do { try await f.invoke(0); XCTFail("Ownership loss accepted") } catch {
        let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertEqual(failure.code, .forbidden); XCTAssertTrue(failure.ownershipRevoked)
      }; XCTAssertTrue(f.scopes.isEmpty); f.features.close()
    }
  }
  func testFunctional403DoesNotAuthorizeWholeDeviceRevocation() async throws {
    let f = try await fixture(); defer { f.features.close() }; f.hook = { throw RowanFailure(code: 403, message: "private") }
    do { try await f.invoke(0); XCTFail("Functional denial accepted") } catch {
      let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertEqual(failure.code, .forbidden); XCTAssertFalse(failure.ownershipRevoked)
    }
  }
  func testStaleFreshAuthorizationDenialCannotCarryARevocationClassifier() async throws {
    let f = try await fixture(); defer { f.features.close() }; var pending: CheckedContinuation<Void, Error>?
    f.gateway.authorizeHook = { try await withCheckedThrowingContinuation { pending = $0 }; throw RowanFailure(code: 403, message: "private") }
    let task = Task { try await f.invoke(0) }; try await wait { pending != nil }; f.visible = false; pending?.resume()
    do { try await task.value; XCTFail("Stale classifier escaped") } catch {
      let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertEqual(failure.code, .sessionChanged); XCTAssertFalse(failure.ownershipRevoked)
    }
  }
  func testSharedBoundGuardRejectsLateDTOAfterAnotherPageRevokesOwnership() async throws {
    let (account, http) = try await makeDeviceReadAccount()
    let device = try await HTTPDeviceAccess(account: account, expiryEncoding: .unknown).authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let gateway = DeviceReadFakeGateway(device); var leases: [DeviceReadFakeLease] = []
    let owner = DeviceReadOwner(currentAccount: { MQTTPoolIdentity(revision: account.revision, userID: "native-user") }, gateway: gateway, open: { device, _ in
      let lease = DeviceReadFakeLease(try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: "thing", userID: device.userID))
      leases.append(lease); lease.getHook = { epoch in try lease.emit(epoch: epoch, reported: ["value": 42]) }; try lease.ready(100); return DeviceReadFakeBinding(lease)
    }, invalidateAccount: { _ in })
    let a = owner.observe(resourceID: device.resourceID, nativeObserverID: "page-a"), b = owner.observe(resourceID: device.resourceID, nativeObserverID: "page-b")
    let gate = NativeDeviceReadGate(), readA = NativeDeviceMoreReadFactory.makeBound(account: account, owner: owner, handle: a, gate: gate, pageCurrent: { true })
    let readB = NativeDeviceMoreReadFactory.makeBound(account: account, owner: owner, handle: b, gate: gate, pageCurrent: { true })
    var pending: CheckedContinuation<Void, Error>?, details = 0, revokeHome = false
    defer { pending?.resume(); pending = nil; readA.close(); owner.close() }
    try await wait { if case let .current(value) = a.state { return value.snapshotAvailable }; return false }
    http.hook = { path in
      if path == "/api/app/devices", revokeHome { throw RowanFailure(code: 403, message: "private") }
      if path == "/api/app/devices/http-resource" { details += 1; if details == 2 { try await withCheckedThrowingContinuation { pending = $0 } } }
    }
    let late = Task { try await readA.summary(resourceID: device.resourceID, expectedRevision: account.revision) }; try await wait { pending != nil }
    revokeHome = true
    do { _ = try await readB.members(resourceID: device.resourceID, expectedRevision: account.revision); XCTFail("Lost ownership accepted") }
    catch { let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertTrue(failure.ownershipRevoked); XCTAssertTrue(owner.featureReadCurrent(b)); XCTAssertTrue(owner.revokeOwnership(b)) }
    pending?.resume(); pending = nil
    do { _ = try await late.value; XCTFail("Late private DTO resolved") } catch { XCTAssertEqual((error as? DeviceMoreReadError)?.code, .sessionChanged) }
    XCTAssertFalse(owner.featureReadCurrent(a)); XCTAssertFalse(owner.featureReadCurrent(b)); XCTAssertEqual(try a.getSnapshot().reported, .fields([:]))
    XCTAssertEqual(leases[0].closes, 1)
  }
  func testBoundFreshHTTPReadStillWorksWhenMQTTConnectionFailed() async throws {
    let (account, _) = try await makeDeviceReadAccount()
    let device = try await HTTPDeviceAccess(account: account, expiryEncoding: .unknown).authorize(resourceID: "http-resource", expectedRevision: account.revision)
    let gateway = DeviceReadFakeGateway(device); var lease: DeviceReadFakeLease?
    let owner = DeviceReadOwner(currentAccount: { MQTTPoolIdentity(revision: account.revision, userID: "native-user") }, gateway: gateway, open: { device, _ in
      let acquired = DeviceReadFakeLease(try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: "thing", userID: device.userID)); lease = acquired
      try acquired.ready(100); return DeviceReadFakeBinding(acquired)
    }, invalidateAccount: { _ in })
    let handle = owner.observe(resourceID: device.resourceID, nativeObserverID: "native")
    let features = NativeDeviceMoreReadFactory.makeBound(account: account, owner: owner, handle: handle, gate: NativeDeviceReadGate(), pageCurrent: { true })
    defer { features.close(); owner.close() }
    try await wait { lease?.gets.count == 1 }; lease?.state = .failed(.transportFailed); lease?.onStateChanged?()
    try await wait { if case let .current(value) = handle.state { return value.phase == .unavailable }; return false }
    XCTAssertTrue(owner.featureReadCurrent(handle))
    let value = try await features.summary(resourceID: device.resourceID, expectedRevision: account.revision)
    XCTAssertEqual(value.deviceNickname, "Fixture device")
  }

  func testUnrecognizedNotFoundAndSimilarCodesDoNotRevokeOwnership() async throws {
    for code in [404, 1341, 1351, 1491, 1501, 1512] {
      let f = try await fixture(); f.hook = { throw RowanFailure(code: code, message: "private") }
      do { try await f.invoke(0); XCTFail("Failure accepted") } catch {
        let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertEqual(failure.code, .readFailed); XCTAssertFalse(failure.ownershipRevoked)
      }; f.features.close()
    }
  }
  func testLateExplicitUnboundCodeAfterAccountChangeDoesNotRevoke() async throws {
    let f = try await fixture(); defer { f.features.close() }; var pending: CheckedContinuation<Void, Error>?
    f.hook = { try await withCheckedThrowingContinuation { pending = $0 }; throw RowanFailure(code: 1492, message: "private") }
    let task = Task { try await f.invoke(0) }; try await wait { pending != nil }; f.identity = nil; pending?.resume()
    do { try await task.value; XCTFail("Late classifier escaped") } catch {
      let failure = try XCTUnwrap(error as? DeviceMoreReadError); XCTAssertEqual(failure.code, .sessionChanged); XCTAssertFalse(failure.ownershipRevoked)
    }
  }
}

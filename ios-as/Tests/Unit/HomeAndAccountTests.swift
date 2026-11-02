import XCTest
@testable import Rowan

/// Member of RowanTests. Execution is still unverified until macOS dependencies/build/tests run.
@MainActor
final class HomeAndAccountTests: XCTestCase {
  func testHomeMetadataUsesNestedDeviceIDAndRoom() throws {
    let groups = try HTTPHomeRepository.decode([
      ["room": ["name": "Kitchen"], "devices": [
        ["device": ["id": "owned-device"], "deviceNickname": "Cooler", "online": true]
      ]],
      ["room": NSNull(), "devices": []]
    ])
    XCTAssertEqual(groups, [
      HomeGroup(roomName: "Kitchen", devices: [HomeDevice(id: "owned-device", nickname: "Cooler")]),
      HomeGroup(roomName: nil, devices: [])
    ])
    XCTAssertThrowsError(try HTTPHomeRepository.decode([["devices": [["device": ["id": ""]]]]]))
  }

  func testMutationIsNeverReplayedAfterUnauthorized() async throws {
    let gateway = TestGateway()
    let account = AccountService(http: gateway, storage: MemoryStorage())
    try await account.login(account: "test@example.com", pin: "test")
    gateway.handler = { _, _, _ in throw RowanFailure(code: 401, message: "expired") }
    do {
      _ = try await account.request("POST", "/api/app/user/locations", body: ["name": "Room"])
      XCTFail("Expected unauthorized")
    } catch { XCTAssertEqual((error as? RowanFailure)?.code, 401) }
    XCTAssertEqual(gateway.calls.filter { $0 == "POST /api/app/user/locations" }.count, 1)
    XCTAssertFalse(gateway.calls.contains("PATCH /api/app/session"))
  }

  func testLateReadCannotEscapeAfterAccountCleared() async throws {
    let gateway = TestGateway()
    let account = AccountService(http: gateway, storage: MemoryStorage())
    try await account.login(account: "test@example.com", pin: "test")
    var pending: CheckedContinuation<Any, Error>?
    gateway.handler = { _, _, _ in
      try await withCheckedThrowingContinuation { pending = $0 }
    }
    let read = Task { try await account.request("GET", "/api/app/devices") }
    for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not start"); return }
    try await account.clearLocal()
    pending.resume(returning: [])
    do { _ = try await read.value; XCTFail("Expected stale-session rejection") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
  }

  func testConcurrentUnauthorizedReadsShareOneRefresh() async throws {
    let gateway = TestGateway()
    let account = AccountService(http: gateway, storage: MemoryStorage())
    try await account.login(account: "test@example.com", pin: "test")
    var refresh: CheckedContinuation<Any, Error>?
    gateway.handler = { method, _, token in
      if method == "PATCH" {
        return try await withCheckedThrowingContinuation { refresh = $0 }
      }
      if token == "access" { throw RowanFailure(code: 401, message: "expired") }
      return []
    }
    let first = Task { try await account.request("GET", "/api/app/devices") }
    let second = Task { try await account.request("GET", "/api/app/devices") }
    for _ in 0..<100 where refresh == nil || gateway.calls.filter({ $0 == "GET /api/app/devices" }).count < 2 {
      await Task.yield()
    }
    guard let refresh else { first.cancel(); second.cancel(); XCTFail("Refresh did not start"); return }
    refresh.resume(returning: ["accessToken": "renewed", "refreshToken": "next-refresh"])
    _ = try await first.value
    _ = try await second.value
    XCTAssertEqual(gateway.calls.filter { $0 == "PATCH /api/app/session" }.count, 1)
  }

  func testLateUnauthorizedFromSamePublicationDoesNotRefreshIdenticalTokensTwice() async throws {
    let gateway = TestGateway()
    let service = AccountService(http: gateway, storage: MemoryStorage())
    try await service.login(account: "test@example.com", pin: "fixture")
    let original = service.session, revision = service.revision
    var firstFailure: CheckedContinuation<Any, Error>?, secondFailure: CheckedContinuation<Any, Error>?
    var reads = 0
    gateway.handler = { method, _, _ in
      if method == "PATCH" { return ["accessToken": "access", "refreshToken": "refresh"] }
      reads += 1
      if reads == 1 { return try await withCheckedThrowingContinuation { firstFailure = $0 } }
      if reads == 2 { return try await withCheckedThrowingContinuation { secondFailure = $0 } }
      return []
    }
    let first = Task { try await service.request("GET", "/api/app/devices") }
    let second = Task { try await service.request("GET", "/api/app/devices") }
    for _ in 0..<300 where firstFailure == nil || secondFailure == nil { await Task.yield() }
    guard let firstFailure, let secondFailure else {
      first.cancel(); second.cancel()
      firstFailure?.resume(throwing: CancellationError()); secondFailure?.resume(throwing: CancellationError())
      _ = try? await first.value; _ = try? await second.value
      XCTFail("Both old-session reads must start"); return
    }
    firstFailure.resume(throwing: RowanFailure(code: 401, message: "first old response"))
    do { _ = try await first.value } // Refresh has finished and its single-flight task has been cleared.
    catch { secondFailure.resume(throwing: CancellationError()); _ = try? await second.value; throw error }
    XCTAssertEqual(service.session, original)
    XCTAssertEqual(service.revision, revision)
    XCTAssertEqual(reads, 3)
    secondFailure.resume(throwing: RowanFailure(code: 401, message: "late old response"))
    _ = try await second.value
    XCTAssertEqual(gateway.calls.filter { $0 == "PATCH /api/app/session" }.count, 1)
    XCTAssertEqual(gateway.calls.filter { $0 == "GET /api/app/devices" }.count, 4)
    XCTAssertEqual(service.session, original); XCTAssertEqual(service.revision, revision)
  }

  func testStaleExpectedRevisionRejectsBeforeSelectingNewAccountToken() async throws {
    let gateway = TestGateway(), storage = MemoryStorage()
    let service = AccountService(http: gateway, storage: storage)
    try await service.login(account: "first@example.com", pin: "fixture")
    let expected = service.revision
    gateway.handler = { _, _, _ in ["accessToken": "account-b", "refreshToken": "refresh-b", "userID": "user-b"] }
    try await service.login(account: "second@example.com", pin: "fixture")
    gateway.calls.removeAll()
    gateway.handler = { _, _, _ in XCTFail("A stale binding must not reach the gateway"); return [] }
    do {
      _ = try await service.request("POST", "/api/app/user/locations", body: ["name": "Fixture"], expectedRevision: expected)
      XCTFail("Expected stale binding")
    } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertTrue(gateway.calls.isEmpty); XCTAssertEqual(service.session?.userID, "user-b")
  }

  func testRequestAlreadySentUnderOldAccountCannotCompleteOrReplayUnderNewAccount() async throws {
    let gateway = TestGateway()
    let service = AccountService(http: gateway, storage: MemoryStorage())
    try await service.login(account: "first@example.com", pin: "fixture")
    let expected = service.revision
    var pending: CheckedContinuation<Any, Error>?
    var sentTokens: [String?] = []
    gateway.handler = { _, _, token in
      sentTokens.append(token)
      return try await withCheckedThrowingContinuation { pending = $0 }
    }
    let mutation = Task { try await service.request("POST", "/api/app/user/locations", body: ["name": "Fixture"], expectedRevision: expected) }
    for _ in 0..<300 where pending == nil { await Task.yield() }
    guard let pending else { mutation.cancel(); XCTFail("Mutation did not start"); return }
    gateway.handler = { _, _, _ in ["accessToken": "account-b", "refreshToken": "refresh-b", "userID": "user-b"] }
    do { try await service.login(account: "second@example.com", pin: "fixture") }
    catch { pending.resume(throwing: CancellationError()); _ = try? await mutation.value; throw error }
    pending.resume(throwing: RowanFailure(code: 401, message: "old account response"))
    do { _ = try await mutation.value; XCTFail("Expected stale response") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(sentTokens, ["access"])
    XCTAssertEqual(gateway.calls.filter { $0 == "POST /api/app/user/locations" }.count, 1)
    XCTAssertFalse(gateway.calls.contains("PATCH /api/app/session")); XCTAssertEqual(service.session?.userID, "user-b")
  }

  func testExpectedRevisionAllowsOneRefreshAndUsesRenewedTokenWithinSameAccount() async throws {
    let gateway = TestGateway()
    let service = AccountService(http: gateway, storage: MemoryStorage())
    try await service.login(account: "test@example.com", pin: "fixture")
    let expected = service.revision
    var tokens: [String?] = []
    gateway.handler = { method, _, token in
      if method == "PATCH" { return ["accessToken": "renewed", "refreshToken": "next-refresh"] }
      tokens.append(token)
      if token == "access" { throw RowanFailure(code: 401, message: "expired") }
      return []
    }
    _ = try await service.request("GET", "/api/app/devices", expectedRevision: expected)
    XCTAssertEqual(tokens, ["access", "renewed"]); XCTAssertEqual(service.revision, expected)
    XCTAssertEqual(gateway.calls.filter { $0 == "PATCH /api/app/session" }.count, 1)
    XCTAssertEqual(service.session?.userID, "user")
  }
}

@MainActor
private final class TestGateway: HTTPGateway {
  var calls: [String] = []
  var handler: (String, String, String?) async throws -> Any = { _, _, _ in
    ["accessToken": "access", "refreshToken": "refresh", "userID": "user"]
  }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    calls.append("\(method) \(path)")
    return try await handler(method, path, token)
  }
}

@MainActor
private final class MemoryStorage: SessionStorage {
  private var data: Data?
  func read() async throws -> Data? { data }
  func write(_ value: Data?) async throws { data = value }
}


@MainActor
final class HomeRoomTabsTests: XCTestCase {
  private let kitchen = RoomID.text("room/kitchen")
  private let study = RoomID.numeric(42)
  private func group(_ id: RoomID?, _ name: String = "Room", _ device: String = "device") -> HomeGroup {
    HomeGroup(roomName: name, devices: [HomeDevice(id: device, nickname: device)], roomID: id)
  }
  func testAllAndRoomSwitchUseOnlyLoadedGroups() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(kitchen, "Room", "a"), group(study, "Room", "b")]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload()
    XCTAssertEqual(owner.state.visibleGroups.count, 2); owner.select(study)
    XCTAssertEqual(owner.state.visibleGroups.first?.devices.first?.id, "b"); owner.select(nil)
    XCTAssertEqual(owner.state.visibleGroups.count, 2); XCTAssertEqual(repo.reads, [7])
  }
  func testSameNameAndNumericTextIdentityRemainDistinct() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(.text("42"), "Room", "a"), group(study, "Room", "b")]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload(); owner.select(study)
    XCTAssertEqual(owner.state.tabs.count, 2); XCTAssertEqual(owner.state.visibleGroups.first?.devices.first?.id, "b")
  }
  func testUnknownRoomOnlyAppearsInAllAndCannotInventTab() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(nil)]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload(); owner.select(kitchen)
    XCTAssertNil(owner.state.selectedRoomID); XCTAssertTrue(owner.state.tabs.isEmpty); XCTAssertEqual(owner.state.visibleGroups.count, 1)
  }
  func testKnownEmptyRoomShowsItsOwnEmptyState() async {
    let repo = RoomTabsHomeFake(); repo.result = [HomeGroup(roomName: "Empty", devices: [], roomID: kitchen)]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload(); owner.select(kitchen)
    XCTAssertTrue(owner.state.empty); XCTAssertEqual(owner.state.tabs.count, 1)
  }
  func testRefreshKeepsIdSelectionAndReplacesName() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(kitchen, "Before")]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload(); owner.select(kitchen)
    repo.result = [group(kitchen, "After", "new")]; await owner.reload()
    XCTAssertEqual(owner.state.selectedRoomID, kitchen); XCTAssertEqual(owner.state.tabs.first?.name, "After")
  }
  func testRemovedSelectedRoomFallsBackToAllAfterFreshSuccess() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(kitchen)]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload(); owner.select(kitchen)
    repo.result = []; await owner.reload(); XCTAssertNil(owner.state.selectedRoomID); XCTAssertTrue(owner.state.empty)
  }
  func testOfflineFailureKeepsConfirmedListAndLocalTabs() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(kitchen), group(study, "Study", "b")]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload()
    repo.work = { throw RowanFailure(code: 0, message: "sensitive backend text") }; await owner.reload(); owner.select(study)
    XCTAssertEqual(owner.state.errorCode, "read_failed"); XCTAssertEqual(owner.state.visibleGroups.first?.devices.first?.id, "b")
  }
  func testInitialFailureIsNotConfirmedEmptyHome() async {
    let repo = RoomTabsHomeFake(); repo.work = { throw RowanFailure(code: 0, message: "offline") }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload()
    XCTAssertFalse(owner.state.loaded); XCTAssertFalse(owner.state.empty); XCTAssertFalse(owner.state.loading); XCTAssertEqual(owner.state.errorCode, "read_failed")
  }
  func testSelectionDuringRequestUsesCurrentInput() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(kitchen), group(study, "Study", "b")]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload()
    var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let read = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not suspend"); return }
    owner.select(study); pending.resume(returning: repo.result); await read.value
    XCTAssertEqual(owner.state.selectedRoomID, study)
  }
  func testLateOldSuccessCannotOverwriteNewRequest() async {
    let repo = RoomTabsHomeFake(); var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true })
    let old = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { old.cancel(); XCTFail("Read did not suspend"); return }
    repo.work = nil; repo.result = [group(study, "Study", "new")]; let fresh=Task {await owner.reload()}
    for _ in 0..<10 {await Task.yield()};XCTAssertEqual(repo.reads.count,1)
    pending.resume(returning: [group(kitchen)]); await old.value;await fresh.value
    XCTAssertEqual(owner.state.visibleGroups.first?.devices.first?.id, "new")
  }
  func testLateOldFailureCannotReplaceNewSuccess() async {
    let repo = RoomTabsHomeFake(); var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true })
    let old = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { old.cancel(); XCTFail("Read did not suspend"); return }
    repo.work = nil; repo.result = [group(study)]; let fresh=Task {await owner.reload()}
    for _ in 0..<10 {await Task.yield()};XCTAssertEqual(repo.reads.count,1)
    pending.resume(throwing: RowanFailure(code: 500, message: "old")); await old.value;await fresh.value
    XCTAssertNil(owner.state.errorCode); XCTAssertTrue(owner.state.loaded)
  }
  func testAccountChangeBeforeReadHasZeroDispatchAndClearsData() async {
    var current = true; let repo = RoomTabsHomeFake(); repo.result = [group(kitchen)]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { current }); await owner.reload()
    current = false; await owner.reload(); XCTAssertEqual(repo.reads.count, 1)
    XCTAssertTrue(owner.state.sessionExpired); XCTAssertTrue(owner.state.groups.isEmpty)
  }
  func testAccountChangeAfterDispatchDropsLateResult() async {
    var current = true; let repo = RoomTabsHomeFake(); var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { current })
    let read = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not suspend"); return }
    current = false; pending.resume(returning: [group(kitchen)]); await read.value
    XCTAssertTrue(owner.state.sessionExpired); XCTAssertTrue(owner.state.groups.isEmpty)
  }
  func testPageCancelRetiresLateRequestAndKeepsConfirmedList() async {
    let repo = RoomTabsHomeFake(); repo.result = [group(kitchen)]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload()
    var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let read = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not suspend"); return }
    owner.cancelLoad(); read.cancel(); pending.resume(returning: [group(study)]); await read.value
    XCTAssertEqual(owner.state.groups.first?.roomID, kitchen); XCTAssertFalse(owner.state.loading)
  }
  func testCloseRejectsLateResultAndFurtherReads() async {
    let repo = RoomTabsHomeFake(); var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true })
    let read = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not suspend"); return }
    owner.close(); pending.resume(returning: [group(kitchen)]); await read.value; await owner.reload()
    XCTAssertEqual(repo.reads.count, 1); XCTAssertTrue(owner.state.groups.isEmpty)
  }
  func testNativeDeviceEntryRequiresVisibleMetadataAndCurrentAccount() async {
    var current = true; let repo = RoomTabsHomeFake(); repo.result = [group(kitchen, "Room", "a"), group(study, "Study", "b")]
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { current }); await owner.reload()
    XCTAssertNotNil(owner.deviceForOpen("a")); owner.select(study)
    XCTAssertNil(owner.deviceForOpen("a")); XCTAssertNotNil(owner.deviceForOpen("b"))
    current = false; XCTAssertNil(owner.deviceForOpen("b")); XCTAssertTrue(owner.state.groups.isEmpty)
  }
  func testFirstAppearanceDoesNotDuplicateInitialReadButRetiredReadRestartsOnReturn() async {
    let repo = RoomTabsHomeFake(); var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true })
    XCTAssertFalse(owner.consumeReloadOnAppear()) // First viewWillAppear follows viewDidLoad.
    let initial = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { initial.cancel(); XCTFail("Initial read did not start"); return }
    owner.cancelLoad(); initial.cancel() // Push Mine or Scan while HOME is awaiting HTTP.
    pending.resume(returning: [group(kitchen)]); await initial.value
    XCTAssertFalse(owner.state.loaded); XCTAssertTrue(owner.consumeReloadOnAppear())
    XCTAssertFalse(owner.consumeReloadOnAppear()) // One return authorizes exactly one reload.
    repo.work = nil; repo.result = [group(study)]; await owner.reload()
    XCTAssertEqual(repo.reads.count, 2); XCTAssertEqual(owner.state.groups.first?.roomID, study)
  }
  func testPushBeforeInitialTaskRunsStillRequestsReloadOnReturn() async {
    let repo = RoomTabsHomeFake(); let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true })
    XCTAssertFalse(owner.consumeReloadOnAppear()); owner.cancelLoad()
    XCTAssertTrue(owner.consumeReloadOnAppear()); XCTAssertFalse(owner.consumeReloadOnAppear())
    await owner.reload(); XCTAssertEqual(repo.reads.count, 1)
  }
  func testPreCancelledCallerCannotRetireAnotherPendingRead() async {
    let repo = RoomTabsHomeFake(); var pending: CheckedContinuation<[HomeGroup], Error>?
    repo.work = { try await withCheckedThrowingContinuation { pending = $0 } }
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true })
    let live = Task { await owner.reload() }; for _ in 0..<100 where pending == nil { await Task.yield() }
    guard let pending else { live.cancel(); XCTFail("Live read did not start"); return }
    let before = owner.state; var begin: CheckedContinuation<Void, Never>?
    let cancelled = Task {
      await withCheckedContinuation { begin = $0 }; await owner.reload()
    }
    for _ in 0..<100 where begin == nil { await Task.yield() }
    guard let begin else { cancelled.cancel(); pending.resume(throwing: CancellationError()); await live.value; XCTFail("Barrier did not start"); return }
    cancelled.cancel(); begin.resume(); await cancelled.value
    XCTAssertEqual(repo.reads.count, 1); XCTAssertEqual(owner.state, before)
    pending.resume(returning: [group(kitchen)]); await live.value
    XCTAssertEqual(owner.state.groups.first?.roomID, kitchen); XCTAssertFalse(owner.state.loading)
  }
  func testDeviceIdsUseExactUtf8ForDecodingMembershipAndNativeEntry() async throws {
    let nfc = "\u{00e9}", nfd = "e\u{0301}"
    let decoded = try HTTPHomeRepository.decode([row("room-a", nfc), row("room-b", nfd)])
    XCTAssertEqual(decoded.count, 2); XCTAssertNotEqual(decoded[0].devices[0], decoded[1].devices[0])
    let repo = RoomTabsHomeFake(); repo.result = decoded
    let owner = HomeRoomTabs(repository: repo, expectedRevision: 7, current: { true }); await owner.reload()
    owner.select(.text("room-a")); XCTAssertNotNil(owner.deviceForOpen(nfc)); XCTAssertNil(owner.deviceForOpen(nfd))
    owner.select(.text("room-b")); XCTAssertNotNil(owner.deviceForOpen(nfd)); XCTAssertNil(owner.deviceForOpen(nfc))
  }
  func testDecoderKeepsStringAndNumericRoomIdentity() throws {
    let result = try HTTPHomeRepository.decode([row("42", "a"), row(42, "b")])
    XCTAssertEqual(result[0].roomID, .text("42")); XCTAssertEqual(result[1].roomID, .numeric(42))
  }
  func testDecoderUnknownRoomIsNotUnassigned() throws {
    let values: [Any] = [NSNull(), ["name": "Known name"]]
    for value in values {
      let result = try HTTPHomeRepository.decode([["room": value, "devices": [["device": ["id": "device"]]]]])
      XCTAssertNil(result.first?.roomID); XCTAssertEqual(result.first?.devices.count, 1)
    }
    let blank = try HTTPHomeRepository.decode([["devices": [["device": ["id": "empty-nickname"], "deviceNickname": ""]]]])
    XCTAssertEqual(blank.first?.devices.first?.nickname, "empty-nickname")
  }
  func testDecoderRejectsWrongRoomAndTextTypes() {
    let values: [Any] = [true, 1.5, ""]
    for value in values { XCTAssertThrowsError(try HTTPHomeRepository.decode([row(value, "a")])) }
    XCTAssertThrowsError(try HTTPHomeRepository.decode([["room": ["id": "r", "name": ["en": "x"]], "devices": []]]))
  }
  func testDecoderRejectsDuplicateRoomAndDeviceMembership() {
    XCTAssertThrowsError(try HTTPHomeRepository.decode([row("r", "a"), row("r", "b")]))
    XCTAssertThrowsError(try HTTPHomeRepository.decode([row("r", "a"), row("s", "a")]))
  }
  func testDecoderDoesNotParseOrTrimOpaqueRoomId() throws {
    XCTAssertEqual(try HTTPHomeRepository.decode([row(" 0042/.. ", "a")]).first?.roomID, .text(" 0042/.. "))
  }
  func testExactHomeReadDoesNotDispatchRoomRequestsAndRejectsOldRevision() async throws {
    let gateway = TestGateway(); let account = AccountService(http: gateway, storage: MemoryStorage())
    try await account.login(account: "fixture@example.test", pin: "fixture"); let revision = account.revision
    gateway.calls.removeAll(); gateway.handler = { _, _, _ in [self.row("room/1", "device")] }
    _ = try await HTTPHomeRepository(account: account).loadGroups(expectedRevision: revision)
    XCTAssertEqual(gateway.calls, ["GET /api/app/devices"])
    try await account.clearLocal(); gateway.calls.removeAll()
    do { _ = try await HTTPHomeRepository(account: account).loadGroups(expectedRevision: revision); XCTFail("Old binding") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertTrue(gateway.calls.isEmpty)
  }
  private func row(_ id: Any, _ device: String) -> [String: Any] {
    ["room": ["id": id, "name": "Room"], "devices": [["device": ["id": device]]]]
  }
}

@MainActor
private final class RoomTabsHomeFake: HomeRepository {
  var result: [HomeGroup] = []
  var work: (() async throws -> [HomeGroup])?
  var reads: [Int] = []
  func loadGroups(expectedRevision: Int) async throws -> [HomeGroup] {
    reads.append(expectedRevision); if let work { return try await work() }; return result
  }
}


@MainActor
final class HomeSelectionTests: XCTestCase {
  private let a = HomeDevice(id: "device/a", nickname: "A")
  private let b = HomeDevice(id: "device/b", nickname: "B")
  private func home(_ devices: [HomeDevice], loading: Bool = false, loaded: Bool = true, error: String? = nil) -> HomeRoomState {
    HomeRoomState(groups: [HomeGroup(roomName: "Room", devices: devices, roomID: .text("room"))], loaded: loaded, loading: loading, errorCode: error)
  }
  private func owner(_ devices: [HomeDevice]) -> HomeSelection {
    let value = HomeSelection(current: { true }); value.sync(home(devices)); return value
  }
  func testLongPressEntersEditingWithOneCurrentDevice() {
    let x = owner([a,b]); XCTAssertTrue(x.begin(a.id, epoch: x.inputEpoch)); XCTAssertTrue(x.state.editing)
    XCTAssertEqual(x.state.selected, [a]); XCTAssertFalse(x.state.isSelected(b.id))
  }
  func testUnknownOrOldVisibleIdCannotBeginEditing() {
    let x = owner([a]); XCTAssertFalse(x.begin(b.id, epoch: x.inputEpoch)); XCTAssertFalse(x.state.editing)
    XCTAssertNil(x.requestReview(epoch: x.inputEpoch))
  }
  func testToggleLastItemDoesNotImplicitlyExitEditing() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); x.toggle(b.id, epoch: x.inputEpoch)
    x.toggle(a.id, epoch: x.inputEpoch); x.toggle(b.id, epoch: x.inputEpoch)
    XCTAssertTrue(x.state.editing); XCTAssertTrue(x.state.selected.isEmpty); XCTAssertNil(x.requestReview(epoch: x.inputEpoch))
  }
  func testAsecondLongPressKeepsEarlierSelection() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); x.begin(b.id, epoch: x.inputEpoch)
    XCTAssertEqual(x.state.selected, [a,b])
  }
  func testNormalTapDoesNotEnterEditing() {
    let x = owner([a]); XCTAssertFalse(x.toggle(a.id, epoch: x.inputEpoch)); XCTAssertFalse(x.state.editing)
  }
  func testExplicitExitClearsSelectionAndReview() {
    let x = owner([a]); x.begin(a.id, epoch: x.inputEpoch); _ = x.requestReview(epoch: x.inputEpoch); x.exit()
    XCTAssertFalse(x.state.editing); XCTAssertTrue(x.state.selected.isEmpty); XCTAssertNil(x.state.review)
  }
  func testRefreshPrunesMissingIdAndUsesLatestNickname() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); x.toggle(b.id, epoch: x.inputEpoch)
    let updated = HomeDevice(id: b.id, nickname: "Renamed"); x.sync(home([updated]))
    XCTAssertEqual(x.state.selected, [updated]); XCTAssertEqual(x.state.errorCode, "selection_changed")
  }
  func testProgrammaticRoomChangeCannotKeepHiddenSelection() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); x.sync(home([b]))
    XCTAssertTrue(x.state.selected.isEmpty); XCTAssertFalse(x.toggle(a.id, epoch: x.inputEpoch))
  }
  func testLoadingRetainsSelectionButBlocksInputAndReview() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); let review = x.requestReview(epoch: x.inputEpoch)!
    x.sync(home([a,b], loading: true)); XCTAssertEqual(x.state.selected, [a]); XCTAssertNil(x.state.review)
    XCTAssertFalse(x.toggle(b.id, epoch: x.inputEpoch)); XCTAssertNil(x.requestReview(epoch: x.inputEpoch)); XCTAssertFalse(x.confirm(review.ticket))
  }
  func testOfflineConfirmedCacheAllowsLocalSelectionWithoutDeleteAuthority() {
    let x = owner([a]); x.sync(home([a], error: "read_failed")); XCTAssertTrue(x.begin(a.id, epoch: x.inputEpoch))
    XCTAssertFalse(x.confirm(x.requestReview(epoch: x.inputEpoch)!.ticket)); XCTAssertEqual(x.state.selected, [a])
    XCTAssertEqual(x.state.errorCode, "removal_unavailable")
  }
  func testInitialReadFailureCannotSelectOrReview() {
    let x = owner([]); x.sync(home([a], loaded: false, error: "read_failed"))
    XCTAssertFalse(x.begin(a.id, epoch: x.inputEpoch)); XCTAssertNil(x.requestReview(epoch: x.inputEpoch))
  }
  func testReviewSnapshotIsInvalidatedByInputChange() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); let review = x.requestReview(epoch: x.inputEpoch)!
    XCTAssertEqual(review.devices, [a]); x.toggle(b.id, epoch: x.inputEpoch)
    XCTAssertNil(x.state.review); XCTAssertFalse(x.confirm(review.ticket)); XCTAssertEqual(x.state.selected.count, 2)
  }
  func testRenameRefreshInvalidatesOldConfirmation() {
    let x = owner([a]); x.begin(a.id, epoch: x.inputEpoch); let review = x.requestReview(epoch: x.inputEpoch)!
    x.sync(home([HomeDevice(id: a.id, nickname: "Latest")]))
    XCTAssertNil(x.state.review); XCTAssertFalse(x.confirm(review.ticket)); XCTAssertEqual(x.state.selected.first?.nickname, "Latest")
  }
  func testLateOldReviewCancelOrConfirmCannotDismissNewReview() {
    let x = owner([a]); x.begin(a.id, epoch: x.inputEpoch); let first = x.requestReview(epoch: x.inputEpoch)!
    x.cancelReview(first.ticket); let second = x.requestReview(epoch: x.inputEpoch)!; x.cancelReview(first.ticket)
    XCTAssertEqual(x.state.review, second); XCTAssertFalse(x.confirm(first.ticket)); XCTAssertEqual(x.state.review, second)
  }
  func testDefaultDenyNeverClaimsRemovalOrDropsMetadata() {
    let x = owner([a,b]); x.begin(a.id, epoch: x.inputEpoch); x.toggle(b.id, epoch: x.inputEpoch)
    let review = x.requestReview(epoch: x.inputEpoch)!
    XCTAssertFalse(x.confirm(review.ticket)); XCTAssertTrue(x.state.editing); XCTAssertEqual(x.state.selected, [a,b])
    XCTAssertNil(x.state.review); XCTAssertEqual(x.state.errorCode, "removal_unavailable")
    XCTAssertFalse(x.confirm(review.ticket)); XCTAssertFalse(x.confirm(x.requestReview(epoch: x.inputEpoch)!.ticket))
  }
  func testAccountChangeClearsSelectionAndRejectsOldReview() {
    var current = true; let x = HomeSelection(current: { current }); x.sync(home([a])); x.begin(a.id, epoch: x.inputEpoch)
    let review = x.requestReview(epoch: x.inputEpoch)!; current = false; x.accountChanged()
    XCTAssertTrue(x.state.sessionExpired); XCTAssertTrue(x.state.selected.isEmpty); XCTAssertFalse(x.confirm(review.ticket))
  }
  func testAccountChangeBeforeConfirmIsRejectedWithoutNotification() {
    var current = true; let x = HomeSelection(current: { current }); x.sync(home([a])); x.begin(a.id, epoch: x.inputEpoch)
    let review = x.requestReview(epoch: x.inputEpoch)!; current = false
    XCTAssertFalse(x.confirm(review.ticket)); XCTAssertTrue(x.state.sessionExpired)
  }
  func testLeavingClearsReviewAndRejectsOldInputAfterReturn() {
    let x = owner([a]); let old = x.inputEpoch; x.begin(a.id, epoch: old); let review = x.requestReview(epoch: old)!
    x.leave(); XCTAssertFalse(x.begin(a.id, epoch: old)); XCTAssertFalse(x.confirm(review.ticket)); XCTAssertFalse(x.state.editing)
    x.appear(); x.sync(home([a])); XCTAssertFalse(x.begin(a.id, epoch: old)); XCTAssertTrue(x.begin(a.id, epoch: x.inputEpoch))
  }
  func testLateSnapshotCannotRestoreEditingAfterLeaving() {
    let x = owner([a]); let old = x.inputEpoch; x.begin(a.id, epoch: old); x.leave(); x.sync(home([a,b]))
    XCTAssertFalse(x.state.editing); XCTAssertTrue(x.state.selected.isEmpty); XCTAssertFalse(x.toggle(b.id, epoch: old))
  }
  func testCloseIsPermanentDespiteLateAppearanceAndSnapshot() {
    let x = owner([a]); x.begin(a.id, epoch: x.inputEpoch); x.close(); x.appear(); x.sync(home([a]))
    XCTAssertFalse(x.begin(a.id, epoch: x.inputEpoch)); XCTAssertTrue(x.state.selected.isEmpty)
  }
  func testOpaqueNfcAndNfdIdsNeverCrossSelectOrReconcile() {
    let nfc = HomeDevice(id: "\u{00e9}", nickname: "same"), nfd = HomeDevice(id: "e\u{0301}", nickname: "same")
    let x = owner([nfc,nfd]); x.begin(nfc.id, epoch: x.inputEpoch); XCTAssertFalse(x.state.isSelected(nfd.id))
    x.toggle(nfd.id, epoch: x.inputEpoch); XCTAssertEqual(x.state.selected.count, 2)
    x.sync(home([nfd])); XCTAssertEqual(x.state.selected, [nfd])
  }
}

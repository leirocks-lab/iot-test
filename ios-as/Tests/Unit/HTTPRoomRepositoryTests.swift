import XCTest
@testable import Rowan

@MainActor
final class HTTPRoomRepositoryTests: XCTestCase {
  private var a: [String: Any] { ["id": "room/a", "name": "客厅", "isDefault": false, "deviceCount": 0] }
  private var b: [String: Any] { ["id": 42, "name": "厨房", "isDefault": false, "deviceCount": 2] }
  private func fixture(_ handler: @escaping (RoomHTTPFixture.Call) async throws -> Any) async throws -> (AccountService, HTTPRoomRepository, RoomHTTPFixture) {
    let http = RoomHTTPFixture(); http.handler = handler
    let account = AccountService(http: http, storage: RoomMemoryFixture())
    try await account.login(account: "fixture@example.com", pin: "fixture")
    return (account, HTTPRoomRepository(account: account), http)
  }

  func testListPreservesOpaqueStringAndIntegerIDsAndUnknownFlags() async throws {
    let (_, repo, http) = try await fixture { _ in [self.a, ["id": 42, "name": "厨房"]] }
    let rooms = try await repo.load()
    XCTAssertEqual(rooms[0].id, .text("room/a")); XCTAssertEqual(rooms[1].id, .numeric(42))
    XCTAssertNil(rooms[1].deviceCount); XCTAssertNil(rooms[1].isDefault)
    XCTAssertEqual(http.calls.map(\.method), ["GET"])
    XCTAssertEqual(http.calls[0].path, "/api/app/user/locations")
  }
  func testMalformedListsNeverBecomeEmptyOrInventCounts() throws {
    var negative = a; negative["deviceCount"] = -1
    var booleanCount = a; booleanCount["deviceCount"] = true
    var invalidDefault = a; invalidDefault["isDefault"] = "false"
    let malformed: [Any] = [[String: Any](), [negative], [a, a], [booleanCount], [invalidDefault]]
    for value in malformed {
      XCTAssertThrowsError(try HTTPRoomRepository.decodeList(value))
    }
  }
  func testCreatePostsOnlyNameThenVerifiesByGet() async throws {
    let (_, repo, http) = try await fixture { call in if call.method == "GET" { return [self.a] }; return NSNull() }
    let rooms = try await repo.create(name: " 客厅 ")
    XCTAssertEqual(rooms.first?.name, "客厅")
    XCTAssertEqual(http.calls.map(\.method), ["POST", "GET"])
    XCTAssertEqual(http.calls[0].body as? [String: String], ["name": "客厅"])
    XCTAssertTrue(http.calls.allSatisfy { $0.token == "access" })
  }
  func testRenameEncodesOpaquePathAndDoesNotRequireMutationData() async throws {
    var updated = a; updated["name"] = "新客厅"
    let (_, repo, http) = try await fixture { call in if call.method == "GET" { return [updated] }; return NSNull() }
    _ = try await repo.rename(id: .text("room/a"), name: "新客厅")
    XCTAssertEqual(http.calls[0].method, "PATCH")
    XCTAssertEqual(http.calls[0].path, "/api/app/user/locations/room%2Fa")
    XCTAssertEqual(http.calls[0].body as? [String: String], ["name": "新客厅"])
  }
  func testSortingLoadsFreshBaselineWritesOnlyDefinedFieldsAndVerifies() async throws {
    var saved = false
    let (_, repo, http) = try await fixture { call in
      if call.method == "PUT" { saved = true; return NSNull() }
      return saved ? [self.b, self.a] : [self.a, self.b]
    }
    let baseline = try await repo.load(); http.calls.removeAll()
    let result = try await repo.saveLayout(baseline: baseline, orderedIDs: baseline.reversed().map(\.id))
    XCTAssertEqual(http.calls.map(\.method), ["GET", "PUT", "GET"])
    let body = try XCTUnwrap(http.calls[1].body)
    XCTAssertEqual(Set(body.keys), ["rooms"])
    let rows = try XCTUnwrap(body["rooms"] as? [[String: Any]])
    XCTAssertEqual(Set(rows[0].keys), ["id", "name"])
    XCTAssertTrue(rows[0]["id"] is Int64)
    XCTAssertEqual(result.first?.id, .numeric(42))
  }
  func testChangedBaselineNeverSendsOverwrite() async throws {
    var changed = false; var updated = a; updated["name"] = "另一终端"
    let (_, repo, http) = try await fixture { _ in changed ? [updated, self.b] : [self.a, self.b] }
    let baseline = try await repo.load(); changed = true; http.calls.removeAll()
    do { _ = try await repo.saveLayout(baseline: baseline, orderedIDs: baseline.reversed().map(\.id)); XCTFail("Expected changed baseline") }
    catch RoomOperationError.baselineChanged(let latest) { XCTAssertEqual(latest.first?.name, "另一终端") }
    catch { XCTFail("Wrong error") }
    XCTAssertEqual(http.calls.map(\.method), ["GET"])
  }
  func testNonEmptyDefaultAndUnknownRoomRemovalBlockedBeforePut() async throws {
    var defaultRoom = a; defaultRoom["isDefault"] = true
    for unsafe in [b, defaultRoom, ["id": "room/a", "name": "客厅"]] {
      let (_, repo, http) = try await fixture { _ in [unsafe] }
      let baseline = try await repo.load(); http.calls.removeAll()
      do { _ = try await repo.saveLayout(baseline: baseline, orderedIDs: []); XCTFail("Unsafe removal accepted") }
      catch RoomOperationError.ruleBlocked(_) { }
      catch { XCTFail("Wrong error") }
      XCTAssertEqual(http.calls.map(\.method), ["GET"])
    }
  }
  func testOnlyEmptyNonDefaultRoomCanBeRemovedAndReadbackMustAgree() async throws {
    var saved = false
    let (_, repo, http) = try await fixture { call in
      if call.method == "PUT" { saved = true; return NSNull() }
      return saved ? [self.b] : [self.a, self.b]
    }
    let baseline = try await repo.load(); http.calls.removeAll()
    let result = try await repo.saveLayout(baseline: baseline, orderedIDs: [.numeric(42)])
    XCTAssertEqual(result.map(\.id), [.numeric(42)])
    XCTAssertEqual((http.calls[1].body?["rooms"] as? [[String: Any]])?.count, 1)
  }
  func testTimeoutIsNotReplayedAndFailedReadbackIsUnknown() async throws {
    let (_, repo, http) = try await fixture { _ in throw URLError(.timedOut) }
    do { _ = try await repo.create(name: "客厅"); XCTFail("Timeout cannot succeed") }
    catch RoomOperationError.resultUnknown { }
    XCTAssertEqual(http.calls.filter { $0.method == "POST" }.count, 1)
    let (_, second, secondHTTP) = try await fixture { call in
      if call.method == "POST" { return NSNull() }; throw RowanFailure(code: 503, message: "unavailable")
    }
    do { _ = try await second.create(name: "客厅"); XCTFail("Unconfirmed readback cannot succeed") }
    catch RoomOperationError.resultUnknown { }
    XCTAssertEqual(secondHTTP.calls.map(\.method), ["POST", "GET"])
  }
  func testBusinessRejectionsRemainTypedAndNeverTriggerReadOrReplay() async throws {
    for code in [1421, 1431, 1432, 1441, 409, 403] {
      let (_, repo, http) = try await fixture { _ in throw RowanFailure(code: code, message: "rejected") }
      do { _ = try await repo.rename(id: .numeric(42), name: "客厅"); XCTFail("Expected rejection") }
      catch let error as RowanFailure { XCTAssertEqual(error.code, code) }
      XCTAssertEqual(http.calls.count, 1)
    }
  }
  func testMutationAcceptanceWithoutMatchingReadbackCannotSucceed() async throws {
    let (_, repo, http) = try await fixture { call in if call.method == "POST" { return NSNull() }; return [self.a] }
    do { _ = try await repo.create(name: "尚未读回"); XCTFail("False success") }
    catch RoomOperationError.resultUnknown { }
    XCTAssertEqual(http.calls.map(\.method), ["POST", "GET"])
  }
  func testOldAccountCannotStartOrAcceptResponse() async throws {
    let (account, repo, http) = try await fixture { _ in [self.a] }
    try await account.clearLocal(); try await account.login(account: "other@example.com", pin: "fixture")
    do { _ = try await repo.load(); XCTFail("Old repository accepted") } catch { }
    XCTAssertTrue(http.calls.isEmpty)
    var pending: CheckedContinuation<Any, Never>?
    let (active, waiting, _) = try await fixture { _ in await withCheckedContinuation { pending = $0 } }
    let read = Task { try await waiting.load() }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not start"); return }
    try await active.clearLocal(); pending.resume(returning: [a])
    do { _ = try await read.value; XCTFail("Late account data escaped") } catch { }
  }
  func testCancellationRejectsUncooperativeTransportResponse() async throws {
    var pending: CheckedContinuation<Any, Never>?
    let (_, repo, _) = try await fixture { _ in await withCheckedContinuation { pending = $0 } }
    let read = Task { try await repo.load() }
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { read.cancel(); XCTFail("Read did not start"); return }
    read.cancel(); pending.resume(returning: [a])
    do { _ = try await read.value; XCTFail("Cancelled read returned") } catch is CancellationError { }
  }
  func testDeviceLocationMoveAndUnassignRequestUseExactEndpointsButUnknownUnassignment() async throws {
    var location: Any = "room/a"
    let (_, repo, http) = try await fixture { call in
      if call.method == "PUT" { location = call.body?["id"] ?? NSNull(); return NSNull() }
      if location is NSNull { return NSNull() }
      return ["id": location, "name": "客厅"]
    }
    let initial = try await repo.location(deviceID: "device/a")
    XCTAssertEqual(initial?.id, .text("room/a"))
    _ = try await repo.move(deviceID: "device/a", roomID: .numeric(42))
    XCTAssertEqual(http.calls[1].path, "/api/app/devices/device%2Fa/location")
    XCTAssertEqual(http.calls[1].body?["id"] as? Int64, 42)
    do { _ = try await repo.move(deviceID: "device/a", roomID: nil); XCTFail("Missing ROOM02 data cannot confirm unassignment") }
    catch { guard case RoomOperationError.resultUnknown = error else { return XCTFail("Expected unknown") } }
    XCTAssertEqual(http.calls[3].body?.count, 0)
  }
  func testUnassignPUTAcceptedButMissingReadbackRemainsUnknownAndIsNotReplayed() async throws {
    let (_, repo, http) = try await fixture { _ in NSNull() }
    do { _ = try await repo.move(deviceID: "device", roomID: nil); XCTFail("Unknown projected as unassigned") }
    catch { guard case RoomOperationError.resultUnknown = error else { return XCTFail("Expected unknown") } }
    XCTAssertEqual(http.calls.map(\.method), ["PUT", "GET"]); XCTAssertEqual(http.calls[0].body?.count, 0)
  }
  func testCompleteDotDeviceAndRoomPathSegmentsNeverDispatchHTTP() async throws {
    let (_, repo, http) = try await fixture { _ in NSNull() }
    for id in [".", ".."] {
      do { _ = try await repo.location(deviceID: id); XCTFail("Dot location dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
      do { _ = try await repo.move(deviceID: id, roomID: nil); XCTFail("Dot move dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
      do { _ = try await repo.rename(id: .text(id), name: "Room"); XCTFail("Dot room path dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
    }
    XCTAssertTrue(http.calls.isEmpty)
  }
  func testLocationPreservesOpaqueIDEncodingAndAllowsUnknownRoomName() async throws {
    let (_, repo, http) = try await fixture { _ in ["id": "private-room", "name": ["en": "private-localized"]] }
    let location = try await repo.location(deviceID: "a..b/%2e")
    XCTAssertEqual(http.calls[0].path, "/api/app/devices/a..b%2F%252e/location"); XCTAssertEqual(location?.name, "")
  }
  func testLocationNullIsUnknownButMalformedObjectIsNotEmptySuccess() async throws {
    let (_, missing, _) = try await fixture { _ in NSNull() }; let value = try await missing.location(deviceID: "device"); XCTAssertNil(value)
    for response in [[:] as [String: Any], ["name": "Room"], ["id": true], ["id": NSNull()]] {
      let (_, repo, _) = try await fixture { _ in response }
      do { _ = try await repo.location(deviceID: "device"); XCTFail("Malformed location accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
  }

  func testOpaqueRoomIDEqualityUsesWireBytesAndPreservesStringNumberDistinction() {
    let composed = RoomID.text("\u{00E9}"), decomposed = RoomID.text("e\u{0301}")
    XCTAssertNotEqual(composed, decomposed); XCTAssertEqual(Set([composed, decomposed]).count, 2)
    XCTAssertNotEqual(RoomID.text("42"), RoomID.numeric(42))
  }

}

@MainActor
private final class RoomHTTPFixture: HTTPGateway {
  struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  var calls: [Call] = []
  var handler: (Call) async throws -> Any = { _ in NSNull() }
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    if path == "/api/app/session" { return ["accessToken": "access", "refreshToken": "refresh", "userID": "user"] }
    let call = Call(method: method, path: path, body: body, token: token); calls.append(call)
    return try await handler(call)
  }
}
@MainActor
private final class RoomMemoryFixture: SessionStorage {
  func read() async throws -> Data? { nil }
  func write(_ value: Data?) async throws { }
}

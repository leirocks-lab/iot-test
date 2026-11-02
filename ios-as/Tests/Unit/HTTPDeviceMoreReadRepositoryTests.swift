import XCTest
@testable import Rowan

@MainActor
final class HTTPDeviceMoreReadRepositoryTests: XCTestCase {
  private struct Call { let method: String; let path: String; let body: [String: Any]?; let token: String? }
  @MainActor private final class HTTP: HTTPGateway {
    var calls: [Call] = [], logins = 0
    var handler: (Call) async throws -> Any = { _ in [] }
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if path == "/api/app/session" { logins += 1; return ["accessToken": "public-access", "refreshToken": "public-refresh", "userID": "native-user-\(logins)"] }
      let call = Call(method: method, path: path, body: body, token: token); calls.append(call); return try await handler(call)
    }
  }
  @MainActor private final class Storage: SessionStorage { func read() async throws -> Data? { nil }; func write(_ value: Data?) async throws { } }
  private func fixture() async throws -> (AccountService, HTTP, HTTPDeviceMoreReadRepository) {
    let http = HTTP(), account = AccountService(http: http, storage: Storage()); try await account.login(account: "public@example.test", pin: "fixture")
    return (account, http, HTTPDeviceMoreReadRepository(account: account, scope: DeviceMoreScope(accountRevision: account.revision, resourceID: "device/a ?", userID: "native-user-1", productID: "product")))
  }
  private func summary() -> [String: Any] {
    ["deviceNickname": "Study", "bindingRole": "sa", "device": ["id": "device/a ?", "name": "Device", "mac": "private-mac", "mcuVersion": "1", "wifiVersion": "2"],
     "product": ["id": "product", "name": "Product", "category": "fan", "seriesName": "Series", "modelName": "Model", "image": "https://private.invalid"]]
  }
  private func wait(_ condition: () -> Bool) async throws { for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }; XCTFail("Fixture stalled"); throw URLError(.timedOut) }
  func testSummaryUsesEncodedGETAndNineSafeStringFields() async throws {
    let (_, http, repo) = try await fixture(); http.handler = { [self] _ in summary() }; let value = try await repo.summary().dictionary
    XCTAssertEqual(Set(value.keys), ["deviceNickname", "deviceName", "productName", "productCategory", "seriesName", "modelName", "mcuVersion", "wifiVersion", "bindingRole"])
    XCTAssertEqual(value["deviceNickname"], "Study"); XCTAssertEqual(value["mcuVersion"], "1"); XCTAssertEqual(value["bindingRole"], "sa")
    XCTAssertEqual(http.calls[0].path, "/api/app/devices/device%2Fa%20%3F"); XCTAssertEqual(http.calls[0].method, "GET"); XCTAssertNil(http.calls[0].body)
    XCTAssertFalse(String(reflecting: value).contains("private"))
  }
  func testSummaryResourceOrProductMismatchIsRejected() async throws {
    for wrongDevice in [false, true] {
      let (_, http, repo) = try await fixture(); var raw = summary()
      if wrongDevice { raw["device"] = ["id": "other"] } else { raw["product"] = ["id": "other"] }; http.handler = { _ in raw }
      do { _ = try await repo.summary(); XCTFail("Other scope displayed") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
  }
  func testMissingTextAndUnknownRoleStayUnknownWithoutInventingVersion() async throws {
    let (_, http, repo) = try await fixture(); http.handler = { _ in ["device": ["id": "device/a ?"], "product": ["id": "product"], "bindingRole": "owner"] }
    let value = try await repo.summary(); XCTAssertEqual(value.deviceName, ""); XCTAssertEqual(value.mcuVersion, ""); XCTAssertEqual(value.bindingRole, "unknown")
  }
  func testLocalizedObjectsArraysAndNumbersAreNeverDescriptionStrings() async throws {
    let (_, http, repo) = try await fixture(); var raw = summary()
    raw["deviceNickname"] = ["private-array"]; raw["product"] = ["id": "product", "name": ["en": "private-localized"]]; raw["device"] = ["id": "device/a ?", "wifiVersion": 42]
    http.handler = { _ in raw }; let value = try await repo.summary()
    XCTAssertEqual(value.deviceNickname, ""); XCTAssertEqual(value.productName, ""); XCTAssertEqual(value.wifiVersion, ""); XCTAssertFalse(String(reflecting: value).contains("private"))
  }
  func testMembersUseRandomLocalKeysAndNeverFallbackToContacts() async throws {
    let (_, http, repo) = try await fixture(); http.handler = { _ in [["userID": "private-user", "nickname": "Member", "bindingRole": "mbr", "email": "private-email", "mobile": "private-mobile"], ["userID": "observer", "bindingRole": "obs"]] }
    let values = try await repo.members(), first = try XCTUnwrap(values.first)
    XCTAssertEqual(http.calls[0].path, "/api/app/devices/device%2Fa%20%3F/users"); XCTAssertEqual(Set(first.dictionary.keys), ["itemKey", "nickname", "bindingRole"])
    XCTAssertNotEqual(first.itemKey, "private-user"); XCTAssertNotEqual(first.itemKey, values[1].itemKey); XCTAssertEqual(values[1].nickname, ""); XCTAssertEqual(values[1].bindingRole, "obs")
    XCTAssertFalse(String(reflecting: values).contains("private"))
  }
  func testDuplicateMissingOrMalformedMemberIDsDoNotChooseARole() async throws {
    let variants: [Any] = [["userID": "same", "bindingRole": "sa"], ["nickname": "Name"]]
    for value in [variants, [["userID": "same"], ["userID": "same"]], [:] as [String: Any]] as [Any] {
      let (_, http, repo) = try await fixture(); http.handler = { _ in value }
      do { _ = try await repo.members(); XCTFail("Malformed members accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
  }
  func testUnknownRoleAndActualEmptyMemberArrayArePreserved() async throws {
    let (_, http, repo) = try await fixture(); http.handler = { _ in [["userID": "native", "bindingRole": "future"]] }
    let unknown = try await repo.members(); XCTAssertEqual(unknown[0].bindingRole, "unknown")
    http.handler = { _ in [] as [Any] }; let empty = try await repo.members(); XCTAssertTrue(empty.isEmpty)
  }
  func testHelpUsesTextAndFourSafeFieldsWithoutOpeningOrExposingArticleIDs() async throws {
    let (_, http, repo) = try await fixture(); http.handler = { _ in [["id": "private-article", "title": "Guide", "content": "Plain <b>text</b>", "createdAt": "server-UTC-string", "url": "https://private.invalid"]] }
    let values = try await repo.help(), value = try XCTUnwrap(values.first)
    XCTAssertEqual(http.calls[0].path, "/api/app/devices/device%2Fa%20%3F/helping?type=text"); XCTAssertEqual(Set(value.dictionary.keys), ["itemKey", "title", "content", "createdAt"])
    XCTAssertEqual(value.content, "Plain <b>text</b>"); XCTAssertEqual(value.createdAt, "server-UTC-string"); XCTAssertFalse(String(reflecting: values).contains("private"))
  }
  func testHelpEmptyArrayIsEmptyButMissingWrongShapeOrDuplicateIDsFail() async throws {
    let (_, http, repo) = try await fixture(); http.handler = { _ in [] as [Any] }; let empty = try await repo.help(); XCTAssertTrue(empty.isEmpty)
    for response in [NSNull(), [:] as [String: Any], [42], [["id": "same"], ["id": "same"]]] as [Any] {
      http.handler = { _ in response }; do { _ = try await repo.help(); XCTFail("Malformed help accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
  }
  func testOldAccountScopeCannotDispatchAnyRead() async throws {
    let (account, http, repo) = try await fixture(); try await account.login(account: "other@example.test", pin: "fixture")
    for kind in 0..<3 { do { switch kind { case 0: _ = try await repo.summary(); case 1: _ = try await repo.members(); default: _ = try await repo.help() }; XCTFail("Old scope dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) } }
    XCTAssertTrue(http.calls.isEmpty)
  }
  func testWrongUserScopeCannotSelectCurrentToken() async throws {
    let (account, http, _) = try await fixture(); let repo = HTTPDeviceMoreReadRepository(account: account, scope: DeviceMoreScope(accountRevision: account.revision, resourceID: "device", userID: "other-user", productID: "product"))
    do { _ = try await repo.members(); XCTFail("Wrong user dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }; XCTAssertTrue(http.calls.isEmpty)
  }
  func testCompleteDotIDsDoNotDispatchButEmbeddedDotsAndPercentAreOpaque() async throws {
    let (account, http, _) = try await fixture()
    for id in [".", ".."] {
      let repo = HTTPDeviceMoreReadRepository(account: account, scope: DeviceMoreScope(accountRevision: account.revision, resourceID: id, userID: "native-user-1", productID: "product"))
      do { _ = try await repo.members(); XCTFail("Dot dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 400) }
    }
    XCTAssertTrue(http.calls.isEmpty)
    let repo = HTTPDeviceMoreReadRepository(account: account, scope: DeviceMoreScope(accountRevision: account.revision, resourceID: "a..b/%2e", userID: "native-user-1", productID: "product")); _ = try await repo.members()
    XCTAssertEqual(http.calls[0].path, "/api/app/devices/a..b%2F%252e/users")
  }
  func testCancelledUncooperativeHTTPDoesNotReturnMembers() async throws {
    let (_, http, repo) = try await fixture(); var pending: CheckedContinuation<Any, Error>?
    http.handler = { _ in try await withCheckedThrowingContinuation { pending = $0 } }; let task = Task { try await repo.members() }; try await wait { pending != nil }
    task.cancel(); pending?.resume(returning: [] as [Any]); do { _ = try await task.value; XCTFail("Cancellation lost") } catch is CancellationError { }
  }
  func testOldAccountLateResultsCannotEscape() async throws {
    let (account, http, repo) = try await fixture(); var pending: CheckedContinuation<Any, Error>?
    http.handler = { _ in try await withCheckedThrowingContinuation { pending = $0 } }; let task = Task { try await repo.members() }; try await wait { pending != nil }
    try await account.login(account: "other@example.test", pin: "fixture"); pending?.resume(returning: [] as [Any])
    do { _ = try await task.value; XCTFail("Late data escaped") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
  }
}

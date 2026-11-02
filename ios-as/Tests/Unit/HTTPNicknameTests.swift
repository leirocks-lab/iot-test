import XCTest
@testable import Rowan

@MainActor
final class HTTPNicknameTests: XCTestCase {
  @MainActor private final class HTTP: HTTPGateway {
    var calls: [(String, String, [String: Any]?)] = []
    var hook: (String, String, [String: Any]?) async throws -> Any = { _, _, _ in NSNull() }
    func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
      if method == "POST", path == "/api/app/session" {
        return ["accessToken": "public-access", "refreshToken": "public-refresh", "userID": "public-user"]
      }
      calls.append((method, path, body)); return try await hook(method, path, body)
    }
  }
  @MainActor private final class Storage: SessionStorage {
    func read() async throws -> Data? { nil }
    func write(_ value: Data?) async throws {}
  }
  private func fixture() async throws -> (AccountService, HTTP, HTTPNicknameRepository) {
    let http = HTTP(), account = AccountService(http: http, storage: Storage())
    try await account.login(account: "public@example.test", pin: "fixture")
    return (account, http, HTTPNicknameRepository(account: account, scope: DeviceMoreScope(accountRevision: account.revision,
      resourceID: "a/b ?", userID: "public-user", productID: "public-product")))
  }
  func testExactPatchRouteBodyAndNoResponseDataRequirement() async throws {
    let (_, http, repo) = try await fixture(); try await repo.patch(nickname: " next ")
    let call = try XCTUnwrap(http.calls.first)
    XCTAssertEqual(call.0, "PATCH"); XCTAssertEqual(call.1, "/api/app/devices/a%2Fb%20%3F")
    XCTAssertEqual(call.2 as? [String: String], ["nickname": " next "])
  }
  func testPatch401DoesNotRefreshOrReplay() async throws {
    let (_, http, repo) = try await fixture(); http.hook = { _, _, _ in throw RowanFailure(code: 401, message: "private") }
    do { try await repo.patch(nickname: "new"); XCTFail("401 accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 401) }
    XCTAssertEqual(http.calls.count, 1); XCTAssertEqual(http.calls.first?.0, "PATCH")
  }
  func testExpectedRevisionRejectsBeforeUsingNewAccountToken() async throws {
    let (account, http, repo) = try await fixture()
    try await account.login(account: "next@example.test", pin: "fixture")
    do { try await repo.patch(nickname: "new"); XCTFail("Old intent dispatched") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertTrue(http.calls.isEmpty)
  }
  func testReadBackMissingOrWrongTypeIsUnknownAndIdentityMismatchFails() async throws {
    let (_, http, repo) = try await fixture()
    for nickname in [NSNull(), 42] as [Any] {
      http.hook = { _, _, _ in ["device": ["id": "a/b ?"], "product": ["id": "public-product"], "deviceNickname": nickname] }
      let value = try await repo.readNickname(); XCTAssertNil(value)
    }
    http.hook = { _, _, _ in ["device": ["id": "a/b ?"], "product": ["id": "public-product"]] }
    let missing = try await repo.readNickname(); XCTAssertNil(missing)
    http.hook = { _, _, _ in ["device": ["id": "other"], "product": ["id": "public-product"], "deviceNickname": "new"] }
    do { _ = try await repo.readNickname(); XCTFail("Wrong device accepted") } catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
  }
}


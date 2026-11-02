import XCTest
@testable import Rowan

/// V1.4 CONTENT-01/02 and AUTH-04/05 fixtures; no live API and no invented agreement version.
@MainActor
final class AgreementAndSessionTests: XCTestCase {
  func testHostContextUsesAccountLanguageAndExposesOnlyAllowlistedFields() throws {
    let data = try JSONSerialization.data(withJSONObject: [
      "accessToken": "fixture-access", "refreshToken": "fixture-refresh", "userID": "fixture-user",
      "setting": ["language": "en"]
    ])
    let session = try JSONDecoder().decode(AccountSession.self, from: data)
    let context = RowanHostServices.makeContext(session: session, revision: 7)
    XCTAssertEqual(Set(context.keys), Set(["bridgeMajor", "sessionRevision", "authenticated", "language"]))
    XCTAssertEqual(context["language"] as? String, "en")
    XCTAssertEqual(context["bridgeMajor"] as? Int, 3)
    XCTAssertEqual(context["sessionRevision"] as? Int, 7)
    XCTAssertEqual(context["authenticated"] as? Bool, true)
    let noSettings = AccountSession(accessToken: "fixture-access", refreshToken: "fixture-refresh",
                                    userID: "fixture-user", expiresIn: nil, tokenType: nil, setting: nil)
    XCTAssertEqual(RowanHostServices.makeContext(session: noSettings, revision: 7)["language"] as? String, "zh-CN")
    let loggedOut = RowanHostServices.makeContext(session: nil, revision: 8)
    XCTAssertEqual(loggedOut["language"] as? String, "zh-CN")
    XCTAssertEqual(loggedOut["authenticated"] as? Bool, false)
  }
  func testAgreementRequestUsesOnlyExplicitRegionAndBrand() throws {
    let unspecified = try AgreementContext(regionCode: nil, brandID: nil)
    XCTAssertEqual(unspecified.path(for: .privacy), "/api/app/privacy?type=text")
    let selected = try AgreementContext(regionCode: "US", brandID: "configured-brand")
    let components = try XCTUnwrap(URLComponents(string: selected.path(for: .serviceTerms)))
    XCTAssertEqual(components.path, "/api/app/serviceTerms")
    XCTAssertEqual(components.queryItems, [
      URLQueryItem(name: "type", value: "text"), URLQueryItem(name: "regionCode", value: "US"),
      URLQueryItem(name: "brandId", value: "configured-brand")
    ])
    XCTAssertThrowsError(try AgreementContext(regionCode: "not-a-region", brandID: nil))
    XCTAssertThrowsError(try AgreementContext(regionCode: nil, brandID: "$(ROWAN_BRAND_ID)"))
  }

  func testReadingRequiresBothForegroundTimeAndBottom() {
    var gate = AgreementReadingGate(requiredSeconds: 60)
    gate.advance(by: 60)
    XCTAssertFalse(gate.canFinish)
    gate.markBottomReached()
    XCTAssertTrue(gate.canFinish)
    var other = AgreementReadingGate(requiredSeconds: 60)
    other.markBottomReached()
    other.advance(by: 59)
    XCTAssertFalse(other.canFinish)
    XCTAssertEqual(other.remainingSeconds, 1)
  }

  func testReaderRejectsURLAndEmptyContent() async throws {
    let http = AgreementFixtureGateway()
    let service = HTTPAgreementContentService(http: http)
    let context = try AgreementContext(regionCode: nil, brandID: nil)
    for fixture in [["type": "url", "content": "https://example.com"], ["type": "text", "content": " "]] {
      http.response = fixture
      do { _ = try await service.load(.privacy, context: context); XCTFail("Unsafe/missing text accepted") }
      catch { XCTAssertEqual((error as? RowanFailure)?.code, 502) }
    }
    http.response = ["type": "text", "content": "<script>literal text</script>"]
    let text = try await service.load(.privacy, context: context)
    XCTAssertEqual(text, "<script>literal text</script>")
  }

  func testRefreshPreservesFullSettingsAndUpdatesTokenMetadataInStorage() async throws {
    let http = AgreementFixtureGateway()
    let storage = AgreementMemoryStorage()
    let settings: [String: Any] = [
      "language": "en", "notification": true, "theme": "system", "homeLayout": "layout1",
      "temperatureUnit": "F", "measurementSystem": "imperial",
      "wallpaper": ["image": ["2x": "https://example.com/2x"], "name": ["en": "Wallpaper"]],
      "future": ["enabled": true, "values": [1, 2]], "nullable": NSNull()
    ]
    http.response = ["accessToken": "first", "refreshToken": "refresh", "userID": "user",
                     "expiresIn": 604800, "tokenType": "bearer", "setting": settings]
    let account = AccountService(http: http, storage: storage)
    try await account.login(account: "test@example.com", pin: "test")
    let original = try XCTUnwrap(account.session?.setting)
    http.response = ["accessToken": "next", "refreshToken": "next-refresh", "expiresIn": 7200, "tokenType": "bearer"]
    try await account.refresh()
    let persistedData = try await storage.read()
    let persisted = try JSONDecoder().decode(AccountSession.self, from: XCTUnwrap(persistedData))
    XCTAssertEqual(persisted.setting, original)
    XCTAssertEqual(persisted.expiresIn, 7200)
    XCTAssertEqual(persisted.tokenType, "bearer")
    XCTAssertEqual(persisted.accessToken, "next")
    let roundtrip = try JSONSerialization.jsonObject(with: JSONEncoder().encode(XCTUnwrap(persisted.setting))) as? NSDictionary
    XCTAssertEqual(roundtrip, settings as NSDictionary)
  }
}

private final class AgreementFixtureGateway: HTTPGateway {
  var response: Any = NSNull()
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any { response }
}

@MainActor
private final class AgreementMemoryStorage: SessionStorage {
  private var data: Data?
  func read() async throws -> Data? { data }
  func write(_ value: Data?) async throws { data = value }
}

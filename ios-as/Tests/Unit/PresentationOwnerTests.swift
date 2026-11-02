import XCTest
@testable import Rowan

@MainActor
final class PresentationOwnerTests: XCTestCase {
  @MainActor private final class Fixture {
    private final class Source {
      var context: PresentationAccountCapture
      var captures = 0
      init(_ context: PresentationAccountCapture) { self.context = context }
    }
    private let source: Source
    var context: PresentationAccountCapture { get { source.context } set { source.context = newValue } }
    var captures: Int { source.captures }
    lazy var owner = PresentationOwner(accountSnapshot: { [source] in source.captures += 1; return source.context })
    init(_ raw: String = "{}", user: String = "a", revision: Int = 7) throws {
      source = Source(PresentationAccountCapture(revision: revision, session: try PresentationOwnerTests.session(raw, user: user), cleanupRequired: false))
    }
    func settings(_ raw: String) throws { context = PresentationAccountCapture(revision: context.revision, session: try PresentationOwnerTests.session(raw, user: context.session!.userID), cleanupRequired: false) }
  }
  private static func session(_ raw: String, user: String = "a", token: String = "fixture") throws -> AccountSession {
    AccountSession(accessToken: token, refreshToken: "fixture-refresh", userID: user, expiresIn: nil, tokenType: nil,
      setting: try JSONDecoder().decode(AccountSettings.self, from: Data(raw.utf8)))
  }
  private func os(_ language: String = "en", dark: Bool = false) -> PresentationSystemInput { PresentationSystemInput(languageTags: [language], appearance: dark ? .dark : .light) }
  private func failure(_ work: () throws -> Void) { XCTAssertThrowsError(try work()) { XCTAssertTrue($0 is PresentationFailure) } }
  func testSavedLanguageWins() throws { let f = try Fixture(#"{"language":"zh-TW"}"#); XCTAssertEqual(try f.owner.capture(os()).language, .zhTW) }
  func testFirstSupportedSystemTag() throws { let f = try Fixture(); XCTAssertEqual(try f.owner.capture(PresentationSystemInput(languageTags: ["fr-FR","zh-Hans-CN","en-US"], appearance: .light)).language, .zhCN) }
  func testScriptPrecedesRegion() throws { let f = try Fixture(); XCTAssertEqual(try f.owner.capture(os("zh-Hant-CN")).language, .zhTW) }
  func testUnsupportedAndMalformedTagsRenderEnglish() throws { let f = try Fixture(); XCTAssertEqual(try f.owner.capture(PresentationSystemInput(languageTags: ["../zh-CN","fr-FR"], appearance: .light)).language, .en) }
  func testSavedLanguageHasExactWhitelist() throws { let f = try Fixture(#"{"language":"en-US"}"#); XCTAssertEqual(try f.owner.capture(os("zh-TW")).language, .zhTW) }
  func testUnknownThemeRemainsUnknownWhileColorFollowsSystem() throws { let p = try Fixture(#"{"theme":"future"}"#).owner.capture(os(dark:true)); XCTAssertNil(p.themePreference); XCTAssertEqual(p.effectiveTheme,.dark) }
  func testSystemThemeChangesOnlyWithEffectiveColor() throws { let f=try Fixture(#"{"theme":"system"}"#);let a=try f.owner.capture(os());XCTAssertEqual(a.revision,try f.owner.capture(os("en-US")).revision);XCTAssertGreaterThan(try f.owner.capture(os(dark:true)).revision,a.revision) }
  func testFixedThemeIgnoresSystemChange() throws { let f=try Fixture(#"{"theme":"light"}"#);let a=try f.owner.capture(os());XCTAssertEqual(a,try f.owner.capture(os(dark:true))) }
  func testUnknownUnitsHaveNoDefaults() throws { let p=try Fixture().owner.capture(os());XCTAssertNil(p.temperatureUnit);XCTAssertNil(p.measurementSystem) }
  func testUnitsRemainIndependent() throws { let p=try Fixture(#"{"temperatureUnit":"F","measurementSystem":"metric"}"#).owner.capture(os());XCTAssertEqual(p.temperatureUnit,.fahrenheit);XCTAssertEqual(p.measurementSystem,.metric) }
  func testWrongKnownTypesStayUnknown() throws { let p=try Fixture(#"{"language":true,"theme":7,"temperatureUnit":false,"measurementSystem":{}}"#).owner.capture(os());XCTAssertEqual(p.language,.en);XCTAssertNil(p.themePreference);XCTAssertNil(p.temperatureUnit);XCTAssertNil(p.measurementSystem) }
  func testTokenRenewalDoesNotChangeProjection() throws { let f=try Fixture(#"{"theme":"dark"}"#);let a=try f.owner.capture(os());f.context=PresentationAccountCapture(revision:7,session:try Self.session(#"{"theme":"dark"}"#,token:"renewed"),cleanupRequired:false);XCTAssertEqual(a,try f.owner.capture(os())) }
  func testOpaqueRawChangeDoesNotAdvanceRevision() throws { let f=try Fixture(#"{"language":"en","future":{"v":1}}"#);let a=try f.owner.capture(os());try f.settings(#"{"language":"en","future":{"v":2},"notification":true}"#);XCTAssertEqual(a,try f.owner.capture(os())) }
  func testConfirmedSettingsAdvanceOnlyPresentation() throws { let f=try Fixture();let a=try f.owner.capture(os());try f.settings(#"{"temperatureUnit":"C"}"#);let b=try f.owner.capture(os());XCTAssertEqual(a.accountRevision,b.accountRevision);XCTAssertGreaterThan(b.revision,a.revision) }
  func testLogoutImmediatelyDropsChoices() throws { let f=try Fixture(#"{"language":"zh-CN","theme":"dark","temperatureUnit":"F"}"#);let a=try f.owner.capture(os());f.context=PresentationAccountCapture(revision:8,session:nil,cleanupRequired:false);let b=try f.owner.capture(os());XCTAssertFalse(b.authenticated);XCTAssertEqual(b.language,.en);XCTAssertNil(b.temperatureUnit);XCTAssertGreaterThan(b.revision,a.revision) }
  func testPendingCleanupIgnoresRetainedSession() throws { let f=try Fixture(#"{"language":"zh-CN","theme":"dark"}"#);f.context=PresentationAccountCapture(revision:7,session:f.context.session,cleanupRequired:true);let p=try f.owner.capture(os());XCTAssertFalse(p.authenticated);XCTAssertNil(p.themePreference);XCTAssertEqual(p.language,.en) }
  func testNextAccountCannotInheritChoices() throws { let f=try Fixture(#"{"theme":"dark","measurementSystem":"imperial"}"#);let a=try f.owner.capture(os());f.context=PresentationAccountCapture(revision:8,session:try Self.session("{}",user:"b"),cleanupRequired:false);let b=try f.owner.capture(os());XCTAssertNil(b.themePreference);XCTAssertNil(b.measurementSystem);XCTAssertGreaterThan(b.revision,a.revision) }
  func testSameRevisionDifferentPrivateIdentityChangesPublication() throws { let f=try Fixture();let a=try f.owner.capture(os());f.context=PresentationAccountCapture(revision:7,session:try Self.session("{}",user:"b"),cleanupRequired:false);XCTAssertGreaterThan(try f.owner.capture(os()).revision,a.revision) }
  func testCanonicalEquivalentIdentityIsByteDistinct() throws { let f=try Fixture(user:"\u{e9}");let a=try f.owner.capture(os());f.context=PresentationAccountCapture(revision:7,session:try Self.session("{}",user:"e\u{301}"),cleanupRequired:false);XCTAssertGreaterThan(try f.owner.capture(os()).revision,a.revision) }
  func testReadsAccountCaptureExactlyOnce() throws { let f=try Fixture();_=try f.owner.capture(os());XCTAssertEqual(f.captures,1) }
  func testLateOldNotificationReadsCurrentAuthority() throws { let f=try Fixture(#"{"theme":"dark"}"#);let old=f.context;f.context=PresentationAccountCapture(revision:8,session:try Self.session("{}",user:"b"),cleanupRequired:false);let p=try f.owner.capture(os());XCTAssertEqual(p.accountRevision,8);XCTAssertNotEqual(p.accountRevision,old.revision);XCTAssertNil(p.themePreference) }
  func testUnsafeAccountRevisionFailsClosed() throws { let f=try Fixture(revision:PresentationOwner.maxSafeRevision+1);failure{_=try f.owner.capture(os())} }
  func testEmptyPrivateIdentityFailsClosed() throws { let f=try Fixture(user:"");failure{_=try f.owner.capture(os())} }
  func testMaximumRevisionDeduplicatesButNeverWrapsOrRestoresOldSnapshot() throws { let f=try Fixture();let owner=PresentationOwner(accountSnapshot:{f.context},startingRevision:PresentationOwner.maxSafeRevision-1);let a=try owner.capture(os());XCTAssertEqual(a.revision,PresentationOwner.maxSafeRevision);XCTAssertEqual(a,try owner.capture(os()));try f.settings(#"{"theme":"dark"}"#);failure{_=try owner.capture(os())};try f.settings("{}");failure{_=try owner.capture(os())} }
}

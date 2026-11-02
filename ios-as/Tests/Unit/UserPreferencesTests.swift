import XCTest
@testable import Rowan

final class UserPreferencesTests: XCTestCase {
  private let fixture = #"{"language":"zh-TW","notification":false,"theme":"system","wallpaper":{"id":"fixture-wallpaper","name":{"en":"Fixture"}},"homeLayout":"existing-layout","temperatureUnit":"C","measurementSystem":"metric","future":{"nested":[1,true,null]}}"#
  func testReadProjectionPreservesUnknownJSON() throws {
    let value = try UserPreferences.decode(fixture)
    XCTAssertEqual(value.language, .zhTW); XCTAssertEqual(value.notification, false); XCTAssertEqual(value.theme, .system)
    XCTAssertEqual(value.wallpaperID, "fixture-wallpaper"); XCTAssertEqual(value.homeLayout, "existing-layout")
    XCTAssertEqual(value.temperatureUnit, .celsius); XCTAssertEqual(value.measurementSystem, .metric)
    var copy = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(value.rawJSON.utf8)) as? [String: Any]); copy.removeValue(forKey: "future")
    XCTAssertTrue(value.rawJSON.contains("future")); XCTAssertFalse(value.description.contains("future"))
  }
  func testMissingFieldsRemainUnknown() throws {
    let value = try UserPreferences.decode("{}")
    XCTAssertNil(value.language); XCTAssertNil(value.notification); XCTAssertNil(value.theme); XCTAssertNil(value.wallpaperID)
    XCTAssertNil(value.homeLayout); XCTAssertNil(value.temperatureUnit); XCTAssertNil(value.measurementSystem)
  }
  func testUnknownEnumsAndWrongTypesRemainRaw() throws {
    let value = try UserPreferences.decode(#"{"language":"system","notification":"false","theme":"night","homeLayout":1,"temperatureUnit":"K","measurementSystem":"other"}"#)
    XCTAssertNil(value.language); XCTAssertNil(value.notification); XCTAssertNil(value.theme); XCTAssertNil(value.homeLayout)
    XCTAssertNil(value.temperatureUnit); XCTAssertNil(value.measurementSystem); XCTAssertTrue(value.rawJSON.contains("night"))
  }
  func testNotificationRequiresBooleanIncludingFalse() throws {
    XCTAssertEqual(try UserPreferences.decode(#"{"notification":false}"#).notification, false)
    XCTAssertEqual(try UserPreferences.decode(#"{"notification":true}"#).notification, true)
    for raw in ["0", "1", #""true""#, "null"] { XCTAssertNil(try UserPreferences.decode("{\"notification\":\(raw)}").notification) }
  }
  func testWallpaperReadRequiresObjectWithStringID() throws {
    XCTAssertEqual(try UserPreferences.decode(fixture).wallpaperID, "fixture-wallpaper")
    for raw in ["null", #""fixture-wallpaper""#, "{}", #"{"id":1}"#, #"{"id":" "}"#] {
      XCTAssertNil(try UserPreferences.decode("{\"wallpaper\":\(raw)}").wallpaperID)
    }
  }
  func testMalformedTopLevelRejected() {
    for raw in ["[]", "null", "false", "not-json"] { XCTAssertThrowsError(try UserPreferences.decode(raw)) }
  }
  func testPatchIncludesOnlyExplicitChanges() throws {
    let body = try PreferencesPatch(theme: .dark).body()
    XCTAssertEqual(Set(body.keys), ["theme"]); XCTAssertEqual(body["theme"] as? String, "dark")
  }
  func testWallpaperPatchIsStringID() throws {
    let body = try PreferencesPatch(wallpaperID: "fixture-wallpaper").body()
    XCTAssertEqual(Set(body.keys), ["wallpaper"]); XCTAssertEqual(body["wallpaper"] as? String, "fixture-wallpaper")
  }
  func testFalseIsNotOmittedAndNoNullIsWritten() throws {
    let body = try PreferencesPatch(notification: false).body()
    XCTAssertEqual(Set(body.keys), ["notification"]); XCTAssertEqual(body["notification"] as? Bool, false)
  }
  func testLanguagesAndThemesHaveOnlyDefinedWireValues() throws {
    XCTAssertEqual(Set(PreferenceLanguage.allCases.map(\.rawValue)), ["zh-CN", "zh-TW", "en"])
    XCTAssertEqual(Set(PreferenceTheme.allCases.map(\.rawValue)), ["system", "light", "dark"])
  }
  func testUnitsAreIndependentlyOptional() throws {
    XCTAssertEqual(Set(try PreferencesPatch(temperatureUnit: .fahrenheit).body().keys), ["temperatureUnit"])
    XCTAssertEqual(Set(try PreferencesPatch(measurementSystem: .imperial).body().keys), ["measurementSystem"])
    XCTAssertEqual(Set(try PreferencesPatch(temperatureUnit: .fahrenheit, measurementSystem: .imperial).body().keys), ["temperatureUnit", "measurementSystem"])
  }
  func testEmptyPatchAndBlankSelectionsRejectedWithoutLayoutEnum() throws {
    XCTAssertThrowsError(try PreferencesPatch().body()); XCTAssertThrowsError(try PreferencesPatch(wallpaperID: " ").body())
    XCTAssertThrowsError(try PreferencesPatch(homeLayout: "").body())
    XCTAssertEqual(try PreferencesPatch(homeLayout: "existing-server-layout").body()["homeLayout"] as? String, "existing-server-layout")
  }
}

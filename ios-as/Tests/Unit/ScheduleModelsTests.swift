import XCTest
@testable import Rowan

/// Internal native permit fixtures only; no production action issuer or registered product.
final class ScheduleModelsTests: XCTestCase {
  private let scope = ScheduleScope(accountRevision: 7, resourceID: "fixture-device", productID: "fixture-product", modelVersion: "fixture-model")
  private func draft(start: String = "22:00", zone: String = "America/Chicago", repeatType: ScheduleRepeatType = .custom,
                     days: [Int]? = [5, 1, 5], enabled: Bool? = nil) throws -> ScheduleDraft {
    ScheduleDraft(type: .periodic, startTime: start, repeatType: repeatType, timeZone: zone,
      permit: try ActionPermit(scope: scope, actionJSON: #"{"fixtureRelay":"fixture-on"}"#, mode: "fixture-mode"),
      name: "Fixture rule", endTime: "07:00", weekdays: days, enabled: enabled)
  }
  private func existing(enabled: Any? = false) throws -> ScheduleRecord {
    var raw: [String: Any] = ["id": "fixture-rule", "type": "periodic", "startTime": "22:00", "repeatType": "custom", "weekdays": [1, 5],
      "timeZone": "America/Chicago", "action": ["fixtureRelay": "fixture-on"], "future": ["version": 3]]
    raw["enabled"] = enabled
    return try ScheduleRecord.decode(scope: scope, rawJSON: String(decoding: JSONSerialization.data(withJSONObject: raw), as: UTF8.self))
  }
  func testCreateUsesOnlyDefinedFieldsWithoutServerIDOrNextExecution() throws {
    let body = try draft().createBody(scope: scope)
    XCTAssertEqual(Set(body.keys), ["type", "name", "startTime", "endTime", "repeatType", "weekdays", "mode", "action", "timeZone"])
    XCTAssertEqual(body["type"] as? String, "periodic"); XCTAssertNil(body["id"]); XCTAssertNil(body["nextExecutionAt"])
    XCTAssertEqual(try draft(enabled: false).createBody(scope: scope)["enabled"] as? Bool, false)
  }
  func testEditCarriesRequiredFieldsAndPreservesDisabledFalse() throws {
    let body = try draft().updateBody(scope: scope, existing: existing())
    XCTAssertEqual(body["enabled"] as? Bool, false)
    for key in ["type", "startTime", "repeatType", "action", "timeZone"] { XCTAssertNotNil(body[key]) }
    for key in ["id", "nextExecutionAt", "future"] { XCTAssertNil(body[key]) }
  }
  func testUnknownEnabledRequiresExplicitChoice() throws {
    XCTAssertThrowsError(try draft().updateBody(scope: scope, existing: existing(enabled: nil)))
    XCTAssertEqual(try draft(enabled: false).updateBody(scope: scope, existing: existing(enabled: nil))["enabled"] as? Bool, false)
    XCTAssertEqual(try draft(enabled: true).updateBody(scope: scope, existing: existing())["enabled"] as? Bool, true)
  }
  func testCustomWeekdaysUseISOOneToSevenAndDeduplicate() throws {
    XCTAssertEqual(try draft().createBody(scope: scope)["weekdays"] as? [Int], [1, 5])
    let invalid: [[Int]?] = [nil, [], [0], [8], [1, -1]]
    for days in invalid { XCTAssertThrowsError(try draft(days: days).createBody(scope: scope)) }
  }
  func testTimeRequiresExactHHmmAndDoesNotComputeCrossMidnightDates() throws {
    XCTAssertEqual(try draft().createBody(scope: scope)["endTime"] as? String, "07:00")
    for time in ["24:00", "9:00", "12:60", "-1:00", "00:00:00", " 09:00", "09:00\n"] { XCTAssertThrowsError(try draft(start: time).createBody(scope: scope)) }
    XCTAssertEqual(try draft(start: "00:00").createBody(scope: scope)["startTime"] as? String, "00:00")
  }
  func testTimezoneIsExactAvailableIdentifierWithoutGMTFallback() throws {
    XCTAssertEqual(try draft().createBody(scope: scope)["timeZone"] as? String, "America/Chicago")
    for zone in ["Not/AZone", "america/chicago", "GMT+99:99", "", " "] { XCTAssertThrowsError(try draft(zone: zone).createBody(scope: scope)) }
  }
  func testRealIANAAliasesRemainValidWithoutAcceptingJavaOnlyShortIDs() throws {
    // Foundation uses its exact known IANA identifiers. Do not blindly subtract
    // Java SHORT_IDS: EST/MST/HST are also IANA backward links, as is Australia/ACT.
    for zone in ["UTC", "GMT", "Asia/Shanghai", "America/New_York", "US/Eastern", "Etc/UTC", "Australia/ACT", "CST6CDT", "EST", "MST", "HST"] {
      XCTAssertEqual(try draft(zone: zone).createBody(scope: scope)["timeZone"] as? String, zone)
    }
    for zone in ["PST", "ACT"] { XCTAssertThrowsError(try draft(zone: zone).createBody(scope: scope)) }
  }
  func testPermitMatchesEveryNativeScopeComponent() throws {
    let mismatches = [ScheduleScope(accountRevision: 8, resourceID: scope.resourceID, productID: scope.productID, modelVersion: scope.modelVersion),
      ScheduleScope(accountRevision: 7, resourceID: "other", productID: scope.productID, modelVersion: scope.modelVersion),
      ScheduleScope(accountRevision: 7, resourceID: scope.resourceID, productID: "other", modelVersion: scope.modelVersion),
      ScheduleScope(accountRevision: 7, resourceID: scope.resourceID, productID: scope.productID, modelVersion: "other")]
    for value in mismatches { XCTAssertThrowsError(try draft().createBody(scope: value)) }
    XCTAssertNotNil(try existing().actionJSON) // Read action remains data, not a permit.
  }
  func testPermitIsDetachedAndRequiresNonemptyObject() throws {
    let value = try draft(); var first = try value.createBody(scope: scope)
    first["action"] = ["fixtureRelay": "mutated"]
    XCTAssertEqual((try value.createBody(scope: scope)["action"] as? [String: String])?["fixtureRelay"], "fixture-on")
    for json in ["{}", "[]", "null", "not-json"] { XCTAssertThrowsError(try ActionPermit(scope: scope, actionJSON: json, mode: nil)) }
  }
  func testReadPreservesUnknownFieldsAndServerNextExecutionWithoutDSTCalculation() throws {
    let raw = #"{"id":"rule","type":"future-type","enabled":false,"repeatType":"future-repeat","action":{"unregistered":7},"timeZone":"future-zone","nextExecutionAt":"server-opaque-next","future":{"flag":true}}"#
    let record = try ScheduleRecord.decode(scope: scope, rawJSON: raw)
    XCTAssertNil(record.type); XCTAssertNil(record.repeatType); XCTAssertEqual(record.enabled, false)
    XCTAssertEqual(record.nextExecutionAt, "server-opaque-next"); XCTAssertTrue(record.rawJSON.contains("future"))
  }
  func testNoInventedTypeRepeatCompatibilityMatrixOrDate() throws {
    for type in ScheduleType.allCases { for repeatType in ScheduleRepeatType.allCases {
      var value = try draft(repeatType: repeatType, days: repeatType == .custom ? [1] : nil); value.type = type
      let body = try value.createBody(scope: scope)
      XCTAssertEqual(body["type"] as? String, type.rawValue); XCTAssertEqual(body["repeatType"] as? String, repeatType.rawValue)
      XCTAssertNil(body["date"]); XCTAssertNil(body["nextExecutionAt"])
    } }
  }
  func testServerOwnedFieldsAndWrongBooleanNeverBecomeDefaults() throws {
    let record = try ScheduleRecord.decode(scope: scope, rawJSON: #"{"id":"rule","enabled":"false","action":{}}"#)
    XCTAssertNil(record.enabled); XCTAssertNil(record.startTime); XCTAssertNil(record.nextExecutionAt)
    for raw in [#"{"id":1}"#, "{}"] { XCTAssertThrowsError(try ScheduleRecord.decode(scope: scope, rawJSON: raw)) }
  }
  func testOptionalFieldsStayOmittedWithoutSyntheticModes() throws {
    let value = ScheduleDraft(type: .once, startTime: "12:00", repeatType: .once, timeZone: "Etc/UTC",
      permit: try ActionPermit(scope: scope, actionJSON: #"{"fixtureSwitch":false}"#, mode: nil))
    let body = try value.createBody(scope: scope)
    XCTAssertEqual(Set(body.keys), ["type", "startTime", "repeatType", "timeZone", "action"])
    XCTAssertEqual((body["action"] as? [String: Bool])?["fixtureSwitch"], false)
  }
  func testUnknownModelVersionRemainsNilWhileExistingScheduleDataIsReadable() throws {
    let readScope = ScheduleScope(accountRevision: 7, resourceID: scope.resourceID, productID: scope.productID, modelVersion: nil)
    let record = try ScheduleRecord.decode(scope: readScope, rawJSON: #"{"id":"existing","enabled":false,"mode":"unregistered-mode","action":{"unregisteredRelay":7},"nextExecutionAt":"server-next"}"#)
    XCTAssertNil(record.scope.modelVersion); XCTAssertEqual(record.id, "existing"); XCTAssertEqual(record.enabled, false)
    XCTAssertEqual(record.mode, "unregistered-mode"); XCTAssertEqual(record.nextExecutionAt, "server-next")
    XCTAssertTrue(record.actionJSON?.contains("unregisteredRelay") == true); XCTAssertFalse(record.rawJSON.contains("modelVersion"))
  }
  func testUnknownModelCannotIssuePermitOrSerializeKnownModelsPermit() throws {
    let readScope = ScheduleScope(accountRevision: 7, resourceID: scope.resourceID, productID: scope.productID, modelVersion: nil)
    XCTAssertThrowsError(try ActionPermit(scope: readScope, actionJSON: #"{"fixtureRelay":"on"}"#, mode: nil))
    XCTAssertThrowsError(try draft().createBody(scope: readScope))
    let read = try ScheduleRecord.decode(scope: readScope, rawJSON: #"{"id":"existing","enabled":false,"action":{"fixtureRelay":"on"}}"#)
    XCTAssertThrowsError(try draft().updateBody(scope: readScope, existing: read))
    let blank = ScheduleScope(accountRevision: 7, resourceID: scope.resourceID, productID: scope.productID, modelVersion: " ")
    XCTAssertThrowsError(try blank.validate())
  }
  func testRecordRejectsCompleteDotSegmentsButPreservesOpaqueIDs() throws {
    for id in [".", ".."] {
      let raw = String(decoding: try JSONSerialization.data(withJSONObject: ["id": id]), as: UTF8.self)
      XCTAssertThrowsError(try ScheduleRecord.decode(scope: scope, rawJSON: raw))
    }
    for id in ["foo..bar", "%2E", "opaque%2Fid", "rule/a"] {
      let raw = String(decoding: try JSONSerialization.data(withJSONObject: ["id": id]), as: UTF8.self)
      XCTAssertEqual(try ScheduleRecord.decode(scope: scope, rawJSON: raw).id, id)
    }
  }

}

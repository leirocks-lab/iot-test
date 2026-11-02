import XCTest
@testable import Rowan

/// Offline V1.4 THING-01 fixtures. No product registration, profile, permission or transport.
final class PublishedThingModelTests: XCTestCase {
  private let identity = ThingModelIdentity(productID: "fixture-product", version: "published-fixture-2")
  private func attribute(_ id: String = "fixtureFlag", type: String = "boolean", access: String = "rw") -> [String: Any] {
    ["identifier": id, "dataType": type, "access": access]
  }
  private func body(_ attributes: [[String: Any]] = []) -> [String: Any] {
    ["version": identity.version, "etag": "W/\"published-fixture-2\"", "attributes": attributes, "services": [], "events": []]
  }
  private func payload(_ raw: [String: Any], productID: String? = nil) throws -> ThingModelPayload {
    let data = try JSONSerialization.data(withJSONObject: raw)
    return ThingModelPayload(productID: productID ?? identity.productID, dataJSON: try XCTUnwrap(String(data: data, encoding: .utf8)))
  }
  private func parse(_ raw: [String: Any], productID: String? = nil) throws -> PublishedThingModel {
    try PublishedThingModelParser.parse(expected: identity, source: payload(raw, productID: productID))
  }
  private func only(_ raw: [String: Any]) throws -> ThingAttribute { try XCTUnwrap(parse(raw).attributes.first) }

  func testPublishedIdentityComesFromNativeProvenanceAndExactVersion() throws {
    let raw = body([attribute()]), result = try parse(raw), source = try payload(raw)
    XCTAssertEqual(result.identity, identity); XCTAssertEqual(result.etag, "W/\"published-fixture-2\"")
    let wire = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(source.dataJSON.utf8)) as? [String: Any])
    XCTAssertNil(wire["productID"])
    XCTAssertThrowsError(try parse(raw, productID: "other-product")) { XCTAssertEqual($0 as? ThingModelFailure, .identityMismatch) }
    var changed = raw; changed["version"] = "different-version"
    XCTAssertThrowsError(try parse(changed)) { XCTAssertEqual($0 as? ThingModelFailure, .identityMismatch) }
  }
  func testMissingBlankAndNonStringVersionCannotCreatePublishedModel() throws {
    let invalid: [Any?] = [nil, "", " ", 2, NSNull()]
    for value in invalid {
      var raw = body([attribute()]); raw["version"] = value
      XCTAssertThrowsError(try parse(raw))
    }
  }
  func testDataOnlyParserDoesNotUnwrapBusinessEnvelope() throws {
    XCTAssertThrowsError(try parse(["code": 0, "data": body([attribute()])]))
    XCTAssertThrowsError(try PublishedThingModelParser.parse(expected: identity, source: ThingModelPayload(productID: identity.productID, dataJSON: "[]")))
    let duplicate = "{\"version\":\"published-fixture-2\",\"version\":\"published-fixture-2\",\"attributes\":[],\"services\":[],\"events\":[]}"
    XCTAssertThrowsError(try PublishedThingModelParser.parse(expected: identity, source: ThingModelPayload(productID: identity.productID, dataJSON: duplicate)))
  }
  func testBooleanIsStrictlyTypedAndReadOnlyDoesNotBecomeWritable() throws {
    let writable = try only(body([attribute()]))
    XCTAssertEqual(writable.kind, .boolean); XCTAssertEqual(writable.access, .readWrite); XCTAssertEqual(writable.writeConstraintStatus, .complete)
    XCTAssertTrue(writable.acceptsWriteCandidate(true)); XCTAssertTrue(writable.acceptsWriteCandidate(false))
    let invalid: [Any?] = [nil, "true", NSNumber(value: 1), NSNumber(value: 0), NSNull(), [:] as [String: Any]]
    for value in invalid { XCTAssertFalse(writable.acceptsWriteCandidate(value)) }
    let readonly = try only(body([attribute(access: "r")]))
    XCTAssertEqual(readonly.writeConstraintStatus, .readOnly); XCTAssertFalse(readonly.acceptsWriteCandidate(true))
  }
  func testAccessIsExplicitAndCannotComeFromLabelsOrHints() throws {
    let invalid: [Any?] = [nil, "write", "RW", true, 1]
    for access in invalid {
      var item = attribute(); item["access"] = access; item["label"] = "Administrator Power"; item["category"] = "WineCooler"
      let value = try only(body([item]))
      XCTAssertEqual(value.access, .unknown); XCTAssertEqual(value.writeConstraintStatus, .unknown)
      XCTAssertTrue(value.issues.contains(.unknownAccess)); XCTAssertFalse(value.acceptsWriteCandidate(true))
    }
  }
  func testEnumUsesExactUniqueCaseSensitiveStringRange() throws {
    var item = attribute(type: "enum"); item["range"] = ["fixture-on", "fixture-off"]
    let good = try only(body([item]))
    XCTAssertEqual(good.enumValues, ["fixture-on", "fixture-off"]); XCTAssertTrue(good.acceptsWriteCandidate("fixture-on"))
    let candidates: [Any?] = ["FIXTURE-ON", 1, true, nil]
    for candidate in candidates { XCTAssertFalse(good.acceptsWriteCandidate(candidate)) }
    item["range"] = ["é"]
    let exactUnicode = try only(body([item]))
    XCTAssertTrue(exactUnicode.acceptsWriteCandidate("é")); XCTAssertFalse(exactUnicode.acceptsWriteCandidate("e\u{301}"))
    let invalid: [Any?] = [nil, [], ["on", "on"], ["", "off"], [" ", "off"], [1, 0], "on/off", ["on": 1]]
    for range in invalid {
      var value = attribute(type: "enum"); value["range"] = range
      let parsed = try only(body([value]))
      XCTAssertEqual(parsed.writeConstraintStatus, .unknown); XCTAssertFalse(parsed.acceptsWriteCandidate("on"))
    }
  }
  func testIntegerRangeStepAndUnitAreExplicitWithExactSafeBoundaryGrid() throws {
    var item = attribute("fixtureTemperature", type: "integer"); item["range"] = [5, 21]; item["step"] = 2; item["unit"] = "C"
    let value = try only(body([item]))
    XCTAssertEqual(value.minimum, 5); XCTAssertEqual(value.maximum, 21); XCTAssertEqual(value.step, 2); XCTAssertEqual(value.unit, "C")
    for candidate in [5, 7, 21] { XCTAssertTrue(value.acceptsWriteCandidate(candidate)) }
    let invalid: [Any?] = [4, 22, 6, 7.5, "7", true, Double.nan, Double.infinity, nil, NSDecimalNumber(string: "7.000000000000001")]
    for candidate in invalid { XCTAssertFalse(value.acceptsWriteCandidate(candidate)) }
    item["range"] = [Int64(-9_007_199_254_740_991), Int64(9_007_199_254_740_991)]
    let boundary = try only(body([item]))
    XCTAssertTrue(boundary.acceptsWriteCandidate(Int64(9_007_199_254_740_991)))
    XCTAssertFalse(boundary.acceptsWriteCandidate(Int64(9_007_199_254_740_990)))
    XCTAssertFalse(boundary.acceptsWriteCandidate(NSDecimalNumber(string: "9007199254740991.1")))
  }
  func testMissingStepDoesNotDefaultToOne() throws {
    var item = attribute(type: "integer"); item["range"] = [5, 20]; item["unit"] = "C"
    let parsed = try only(body([item]))
    XCTAssertNil(parsed.step); XCTAssertEqual(parsed.minimum, 5); XCTAssertEqual(parsed.writeConstraintStatus, .unknown)
    XCTAssertTrue(parsed.issues.contains(.missingStep)); XCTAssertFalse(parsed.acceptsWriteCandidate(6))
  }
  func testMissingUnitCannotBeGuessedFromTemperatureName() throws {
    var item = attribute("TargetTemperature", type: "integer"); item["name"] = "Temperature °C"; item["range"] = [0, 10]; item["step"] = 1
    let parsed = try only(body([item]))
    XCTAssertNil(parsed.unit); XCTAssertEqual(parsed.writeConstraintStatus, .unknown); XCTAssertFalse(parsed.acceptsWriteCandidate(3))
  }
  func testMalformedRangeAndStepNeverWidenAllowedDomain() throws {
    let lossy = #"{"version":"published-fixture-2","attributes":[{"identifier":"fixture","dataType":"integer","access":"rw","range":[0,7.00000000000000000000000000000000000000001],"step":1,"unit":"fixture"}],"services":[],"events":[]}"#
    XCTAssertThrowsError(try PublishedThingModelParser.parse(expected: identity, source: ThingModelPayload(productID: identity.productID, dataJSON: lossy)))
    let constraints: [[String: Any]] = [["step": 1], ["range": [20, 5], "step": 1], ["range": ["5", "20"], "step": 1],
      ["range": [0, 10, 20], "step": 1], ["range": [0, 10], "step": 0], ["range": [0, 10], "step": -1],
      ["range": [0, 10], "step": 0.5], ["range": [0, 10], "step": "1"], ["range": [0, Int64(9_007_199_254_740_992)], "step": 1],
      ["range": [false, true], "step": true]]
    for fields in constraints {
      var item = attribute(type: "integer"); item.merge(fields) { _, new in new }; item["unit"] = "fixture-unit"
      let parsed = try only(body([item]))
      XCTAssertEqual(parsed.writeConstraintStatus, .unknown); XCTAssertFalse(parsed.acceptsWriteCandidate(5)); XCTAssertFalse(parsed.issues.isEmpty)
    }
  }
  func testUnsupportedDataTypesRemainUnknownWithoutAliases() throws {
    for type in ["bool", "number", "float", "double", "object", "array", "Integer"] {
      let parsed = try only(body([attribute(type: type)]))
      XCTAssertEqual(parsed.kind, .unknown); XCTAssertTrue(parsed.issues.contains(.unknownType)); XCTAssertFalse(parsed.acceptsWriteCandidate(1))
    }
  }
  func testLegacyAndMixedWireShapesAreQuarantined() throws {
    let legacy: [String: Any] = ["identifier": "Power", "type": "boolean", "writable": true]
    var mixed = attribute(); mixed["type"] = "boolean"; mixed["writable"] = true
    for item in [legacy, mixed] {
      let parsed = try only(body([item]))
      XCTAssertEqual(parsed.writeConstraintStatus, .unknown); XCTAssertTrue(parsed.issues.contains(.ambiguousFormat)); XCTAssertFalse(parsed.acceptsWriteCandidate(true))
    }
  }
  func testDuplicateIdentifiersDoNotUseLastWinsOrPoisonUniqueAttributes() throws {
    let parsed = try parse(body([attribute("duplicate"), attribute("duplicate", access: "r"), attribute("unique")]))
    XCTAssertEqual(parsed.attributes.count, 3); XCTAssertNil(parsed.attribute("duplicate"))
    for item in parsed.attributes where item.identifier == "duplicate" { XCTAssertTrue(item.issues.contains(.duplicateIdentifier)); XCTAssertEqual(item.writeConstraintStatus, .unknown) }
    XCTAssertTrue(try XCTUnwrap(parsed.attribute("unique")).acceptsWriteCandidate(true))
  }
  func testInvalidIdentifiersAndUnitsKeepDiagnosticsWithoutReplacementNames() throws {
    for id in ["", " ", "bad\0name"] {
      let parsed = try parse(body([attribute(id)]))
      XCTAssertNil(parsed.attribute(id)); XCTAssertTrue(parsed.issues.contains(.invalidIdentifier))
    }
    var item = attribute(type: "integer"); item["range"] = [0, 10]; item["step"] = 1; item["unit"] = 42
    let parsed = try only(body([item])); XCTAssertEqual(parsed.writeConstraintStatus, .unknown); XCTAssertTrue(parsed.issues.contains(.invalidUnit))
  }
  func testServicesAndEventsAreDetachedDefinitionsNotExecutableProfiles() throws {
    let parameter = NSMutableDictionary(dictionary: ["identifier": "fixtureCounter", "dataType": "integer"])
    var raw = body()
    raw["services"] = [["identifier": "fixtureReset", "inputs": [parameter], "outputs": []]]
    raw["events"] = [["identifier": "fixtureFault", "level": "fixture-level", "params": []]]
    let parsed = try parse(raw); parameter["identifier"] = "mutated"
    XCTAssertEqual(parsed.services.first?.identifier, "fixtureReset")
    XCTAssertEqual(parsed.services.first?.definition.at(["inputs"])?.arrayValue?.first?.at(["identifier"]), .string("fixtureCounter"))
    XCTAssertEqual(parsed.events.first?.identifier, "fixtureFault"); XCTAssertEqual(parsed.events.first?.level, "fixture-level")
    XCTAssertTrue(parsed.attributes.isEmpty)
  }
  func testMissingDefinitionCollectionsRemainUnknownButExplicitEmptyIsKnown() throws {
    var missing = body([attribute()]); missing.removeValue(forKey: "services"); missing.removeValue(forKey: "events")
    let parsed = try parse(missing)
    XCTAssertFalse(parsed.servicesKnown); XCTAssertFalse(parsed.eventsKnown); XCTAssertTrue(parsed.issues.contains(.invalidCollection))
    let explicit = try parse(body()); XCTAssertTrue(explicit.servicesKnown); XCTAssertTrue(explicit.eventsKnown)
    XCTAssertTrue(explicit.services.isEmpty); XCTAssertTrue(explicit.events.isEmpty)
    var invalid = body()
    invalid["services"] = [["identifier": "duplicate"], ["identifier": "duplicate"], [:] as [String: Any]]
    invalid["events"] = [["identifier": "missing-level"]]
    let quarantined = try parse(invalid)
    XCTAssertFalse(quarantined.servicesKnown); XCTAssertFalse(quarantined.eventsKnown)
    XCTAssertTrue(quarantined.issues.contains(.invalidDefinition)); XCTAssertEqual(quarantined.services.count, 1)
    invalid["services"] = [:] as [String: Any]
    XCTAssertFalse(try parse(invalid).servicesKnown)
  }
  func testInvalidAttributeCollectionCannotBecomeEmptyModel() throws {
    var missing = body(); missing.removeValue(forKey: "attributes")
    var object = body(); object["attributes"] = [:] as [String: Any]
    var null = body(); null["attributes"] = NSNull()
    for raw in [missing, object, null] { XCTAssertThrowsError(try parse(raw)) }
    var malformed = body(); malformed["attributes"] = [NSNull()]
    let quarantined = try parse(malformed)
    XCTAssertEqual(quarantined.attributes.count, 1); XCTAssertTrue(quarantined.issues.contains(.invalidDefinition))
    XCTAssertEqual(quarantined.attributes[0].writeConstraintStatus, .unknown)
  }
}

import XCTest
@testable import Rowan

@MainActor
final class DeviceReadOnlyBridgeTests: XCTestCase {
  func testUnknownScheduleUsesNonNullStringsAndEmptyWeekdaysWithoutRawAction() throws {
    let scope = ScheduleScope(accountRevision: 1, resourceID: "resource", productID: "product", modelVersion: nil)
    let row = try ScheduleRecord.decode(scope: scope, rawJSON: #"{"id":"wire-rule","type":"future","action":{"secretOperation":true},"mode":"private"}"#)
    let value = DeviceScheduleSummaryDTO(itemKey: "local-display-key", record: row).dictionary
    XCTAssertEqual(Set(value.keys), ["itemKey", "name", "type", "startTime", "repeatType", "weekdays", "timeZone", "nextExecutionAt", "enabledState"])
    for (key, item) in value where key != "weekdays" { XCTAssertTrue(item is String) }
    XCTAssertEqual(value["itemKey"] as? String, "local-display-key"); XCTAssertEqual(value["type"] as? String, "unknown")
    XCTAssertEqual(value["enabledState"] as? String, "unknown"); XCTAssertEqual(value["weekdays"] as? [Int], [])
    XCTAssertEqual(value["nextExecutionAt"] as? String, ""); XCTAssertNil(value["id"]); XCTAssertNil(value["action"]); XCTAssertNil(value["mode"])
  }
  func testKnownSchedulePreservesFalseAndOnlyServerNextTime() throws {
    let scope = ScheduleScope(accountRevision: 1, resourceID: "resource", productID: "product", modelVersion: nil)
    let row = try ScheduleRecord.decode(scope: scope, rawJSON: #"{"id":"rule","enabled":false,"type":"periodic","repeatType":"custom","weekdays":[7,1],"nextExecutionAt":"server-owned-opaque"}"#)
    let value = DeviceScheduleSummaryDTO(itemKey: "local", record: row).dictionary
    XCTAssertEqual(value["enabledState"] as? String, "disabled"); XCTAssertEqual(value["weekdays"] as? [Int], [1, 7])
    XCTAssertEqual(value["nextExecutionAt"] as? String, "server-owned-opaque")
  }
  func testFirmwareOfferAllowlistOmitsMACIDAndNeverInventsHasUpdate() {
    let offer = OtaOffer(kind: .wifi, firmware: OtaFirmware(id: "private-firmware-id", version: "1.2.3", remark: nil), device: OtaDevice(id: "private-device-id", name: "Fixture", mac: "private-mac"))
    let value = DeviceFirmwareOfferDTO(offer: offer).dictionary
    XCTAssertEqual(Set(value.keys), ["kind", "version", "remark", "deviceName"]); XCTAssertTrue(value.values.allSatisfy { $0 is String })
    XCTAssertEqual(value["remark"] as? String, ""); XCTAssertEqual(value["kind"] as? String, "wifi")
    XCTAssertNil(OtaKind(rawValue: "MCU")); XCTAssertNil(OtaKind(rawValue: "firmware"))
  }
  func testUnavailableReadRequiresCurrentOwnedVisibleObservationAndNeverAuthorizesHTTP() throws {
    let store = UnavailableDeviceObservations(); var current = true, visible = true
    let snapshot = try store.observe(deviceID: "owned", revision: 4, owner: "owner", page: "page", current: { current }, visible: { visible })
    XCTAssertEqual(store.readOnlyFailure(snapshot.observationID, owner: "owner"), .unavailable)
    XCTAssertEqual(store.readOnlyFailure("arbitrary-device-id", owner: "owner"), .closed)
    XCTAssertEqual(store.readOnlyFailure(snapshot.observationID, owner: "other-owner"), .closed)
    visible = false; XCTAssertEqual(store.readOnlyFailure(snapshot.observationID, owner: "owner"), .closed)
    visible = true; current = false; XCTAssertEqual(store.readOnlyFailure(snapshot.observationID, owner: "owner"), .sessionChanged)
    current = true; XCTAssertEqual(store.readOnlyFailure(snapshot.observationID, owner: "owner"), .sessionChanged)
    store.releaseOwner("owner"); XCTAssertEqual(store.readOnlyFailure(snapshot.observationID, owner: "owner"), .closed)
  }
}

import XCTest
@testable import Rowan

/// Pure offline bridge semantics. Does not construct RN runtime, broker or production AccountService.
@MainActor
final class BridgeObservationTests: XCTestCase {
  func testUnavailableSummaryHasExactlyAllowlistedMetadataAndNoLiveClaim() {
    let value = UnavailableDeviceProjection(deviceID: "owned", observationID: "handle", sessionRevision: 7).snapshot.dictionary
    XCTAssertEqual(Set(value.keys), Set(["deviceId", "observationId", "sessionRevision", "revision", "authorityRevision", "connectionEpoch", "title", "productCategory", "phase", "online", "stale", "snapshotAvailable", "errorCode"]))
    XCTAssertEqual(value["phase"] as? String, "failed"); XCTAssertEqual(value["errorCode"] as? String, "unavailable")
    XCTAssertEqual(value["online"] as? String, "unknown"); XCTAssertEqual(value["stale"] as? Bool, true)
    XCTAssertEqual(value["snapshotAvailable"] as? Bool, false); XCTAssertEqual(value["connectionEpoch"] as? Int, 0)
    XCTAssertEqual(value["authorityRevision"] as? Int, 0); XCTAssertEqual(value["title"] as? String, "")
  }
  func testTerminalPreservesAuthorityAndEpochAndCannotRevive() {
    let projection = UnavailableDeviceProjection(deviceID: "owned", observationID: "handle", sessionRevision: 7)
    let current = projection.unavailable(authorityRevision: 9, connectionEpoch: 4)
    XCTAssertEqual(current.revision, 1)
    let closed = projection.close(.sessionChanged)
    XCTAssertEqual(closed.revision, 2); XCTAssertEqual(closed.authorityRevision, 9); XCTAssertEqual(closed.connectionEpoch, 4)
    XCTAssertEqual(closed.phase, "closed"); XCTAssertEqual(closed.errorCode, "session_changed")
    XCTAssertEqual(projection.unavailable(authorityRevision: 10, connectionEpoch: 5), closed)
    XCTAssertEqual(projection.close(.closed), closed)
  }
  func testAuthorityOrEpochRollbackClosesWithoutRollingCountersBack() {
    for (authority, epoch) in [(8, 4), (9, 3)] {
      let projection = UnavailableDeviceProjection(deviceID: "owned", observationID: "handle", sessionRevision: 7)
      _ = projection.unavailable(authorityRevision: 9, connectionEpoch: 4)
      let value = projection.unavailable(authorityRevision: authority, connectionEpoch: epoch)
      XCTAssertEqual(value.phase, "closed"); XCTAssertEqual(value.errorCode, "invalid_snapshot")
      XCTAssertEqual(value.authorityRevision, 9); XCTAssertEqual(value.connectionEpoch, 4)
    }
  }
  func testRetryWithoutBrokerDoesNotInventCountersOrSuccessfulState() throws {
    let store = UnavailableDeviceObservations()
    var events: [DeviceBridgeSnapshot] = []; store.emit = { _, value in events.append(value) }
    let initial = try store.observe(deviceID: "owned", revision: 7, owner: "module", page: "page", current: { true }, visible: { true })
    for _ in 0..<100 { store.retry(initial.observationID, owner: "module") }
    XCTAssertEqual(events, [initial]) // Exactly one in flight despite repeated retries.
    XCTAssertEqual(try store.get(initial.observationID, owner: "module"), initial)
    store.acknowledge(initial.observationID, revision: 0, owner: "module")
    XCTAssertEqual(events.count, 1)
  }
  func testAccountChangeTerminatesHandleAndCannotBeRetriedIntoNewSession() throws {
    let store = UnavailableDeviceObservations()
    var current = true, events: [DeviceBridgeSnapshot] = []
    store.emit = { _, value in events.append(value) }
    let initial = try store.observe(deviceID: "owned", revision: 7, owner: "module", page: "page", current: { current }, visible: { true })
    current = false; store.accountChanged()
    let closed = try store.get(initial.observationID, owner: "module")
    XCTAssertEqual(closed.sessionRevision, 7); XCTAssertEqual(closed.errorCode, "session_changed"); XCTAssertEqual(events.count, 1)
    current = true; store.retry(initial.observationID, owner: "module")
    XCTAssertEqual(try store.get(initial.observationID, owner: "module"), closed)
  }
  func testOnlyExactAcknowledgementFlushesTheLatestTerminalSummary() throws {
    let store = UnavailableDeviceObservations()
    var current = true, events: [DeviceBridgeSnapshot] = []
    store.emit = { _, value in events.append(value) }
    let initial = try store.observe(deviceID: "owned", revision: 7, owner: "module", page: "page", current: { current }, visible: { true })
    store.retry(initial.observationID, owner: "module")
    current = false
    for _ in 0..<100 { store.accountChanged(); store.retry(initial.observationID, owner: "module") }
    XCTAssertEqual(events.map(\.revision), [0])
    XCTAssertEqual(try store.get(initial.observationID, owner: "module").revision, 1)
    store.acknowledge(initial.observationID, revision: 99, owner: "module")
    store.acknowledge(initial.observationID, revision: 0, owner: "other-module")
    XCTAssertEqual(events.count, 1)
    store.acknowledge(initial.observationID, revision: 0, owner: "module")
    XCTAssertEqual(events.map(\.revision), [0, 1])
    store.acknowledge(initial.observationID, revision: 0, owner: "module")
    XCTAssertEqual(events.count, 2)
  }
  func testInitialBackgroundVisibilityIsRespectedAndOnlyLatestEmitsOnResume() throws {
    let store = UnavailableDeviceObservations()
    var current = true, visible = false, events: [DeviceBridgeSnapshot] = []
    store.emit = { _, value in events.append(value) }
    let initial = try store.observe(deviceID: "owned", revision: 7, owner: "module", page: "page", current: { current }, visible: { visible })
    store.retry(initial.observationID, owner: "module"); XCTAssertTrue(events.isEmpty)
    visible = true; store.resumeVisible(); XCTAssertEqual(events.map(\.revision), [0])
    visible = false; store.resumeVisible()
    XCTAssertEqual(try store.get(initial.observationID, owner: "module").phase, "failed")
    XCTAssertEqual(events.count, 1) // Temporary cover/background is not an account change or terminal.
    visible = false; current = false; store.accountChanged()
    store.acknowledge(initial.observationID, revision: 0, owner: "module"); XCTAssertEqual(events.count, 1)
    visible = true; store.resumeVisible(); XCTAssertEqual(events.map(\.revision), [0, 1])
    XCTAssertEqual(events.last?.phase, "closed")
  }
  func testReleaseAndRuntimeInvalidationNeverAffectOtherOwners() throws {
    let store = UnavailableDeviceObservations()
    let a = try store.observe(deviceID: "owned", revision: 7, owner: "a", page: "page-a", current: { true }, visible: { true })
    let b = try store.observe(deviceID: "owned", revision: 7, owner: "b", page: "page-b", current: { true }, visible: { true })
    store.release(a.observationID, owner: "b")
    XCTAssertEqual(try store.get(a.observationID, owner: "a"), a)
    store.releaseOwner("a")
    XCTAssertThrowsError(try store.get(a.observationID, owner: "a"))
    XCTAssertEqual(try store.get(b.observationID, owner: "b"), b)
    store.closePage("page-b")
    XCTAssertThrowsError(try store.get(b.observationID, owner: "b"))
  }
  func testStalePageCannotAllocateObservation() {
    let store = UnavailableDeviceObservations()
    XCTAssertThrowsError(try store.observe(deviceID: "owned", revision: 7, owner: "module", page: "stopped", current: { false }, visible: { false }))
  }
}

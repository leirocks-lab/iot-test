import XCTest
@testable import Rowan

/// V1.6 chapter 10 offline semantic parity cases. No broker, credential, device or transport SDK.
@MainActor
final class ClassicShadowReducerTests: XCTestCase {
  func testRequestedEmptySnapshotCompletesWithoutInventingReported() throws {
    let r = try reducer()
    XCTAssertFalse(r.hasRequestedSnapshot)
    _ = try r.query(context())
    try message(r, 1, #"{"reported":{}}"#, suffix: "get/accepted")
    XCTAssertTrue(r.hasRequestedSnapshot); XCTAssertEqual(r.reported(), .fields([:])); XCTAssertNil(r.online())
    _ = try r.query(context()); XCTAssertFalse(r.hasRequestedSnapshot)
    try message(r, 2, "{}", suffix: "get/accepted")
    XCTAssertTrue(r.hasRequestedSnapshot); XCTAssertEqual(r.reported(), .fields([:]))
  }
  func testUpdatesAndOldSnapshotsCannotCompleteANewerQuery() throws {
    let r = try reducer()
    try message(r, 10, #"{"reported":{"Power":1}}"#)
    XCTAssertFalse(r.hasRequestedSnapshot)
    _ = try r.query(context())
    try message(r, 9, #"{"reported":{"Power":0}}"#, suffix: "get/accepted")
    XCTAssertFalse(r.hasRequestedSnapshot)
    try message(r, 10, #"{"reported":{"Power":1}}"#, suffix: "get/accepted")
    XCTAssertTrue(r.hasRequestedSnapshot)
  }
  func testMalformedRejectedAndDisconnectedSnapshotStayIncomplete() throws {
    let r = try reducer(); _ = try r.query(context())
    try message(r, 1, #"{"reported":[]}"#, suffix: "get/accepted"); XCTAssertFalse(r.hasRequestedSnapshot)
    try message(r, 1, #"{"reported":{"Power":1}}"#, suffix: "get/accepted"); XCTAssertTrue(r.hasRequestedSnapshot)
    try reject(r, code: 409); XCTAssertFalse(r.hasRequestedSnapshot)
    _ = try r.query(context()); try message(r, 2, #"{"reported":{"Power":1}}"#, suffix: "get/accepted")
    XCTAssertTrue(r.hasRequestedSnapshot)
    try r.disconnect(context()); XCTAssertFalse(r.hasRequestedSnapshot)
    XCTAssertEqual(r.reported().at(["Power"]), .number(1))
    r.close(); XCTAssertFalse(r.hasRequestedSnapshot)
  }
  private let prefix = "$aws/things/thing-abc/shadow/"
  private func context(account: Int64 = 7, epoch: Int64 = 3, resource: String = "resource-42", thing: String = "thing-abc") throws -> ShadowContext {
    try ShadowContext(accountRevision: account, connectionEpoch: epoch, resourceID: resource, thingRef: thing, userID: "user-9")
  }
  private func profile() throws -> ShadowProfile {
    let writable: [ShadowPath: ShadowValidator] = [
      ["Power"]: { if case let .number(value) = $0 { return (0...1).contains(value) }; return false },
      ["config", "level"]: { if case .number = $0 { return true }; return false }
    ]
    return try ShadowProfile(writable: writable,
      connection: ShadowOnlineField(path: ["ConnectType"], online: .text("online"), offline: .text("offline")),
      metadata: ShadowMetadata(userIDPath: ["EnduserId"], thingRefPath: ["DeviceId"], commandPath: ["CommandType"],
                               commandValue: .text("app"), reportedThingRefPath: ["DeviceId"]))
  }
  private func reducer() throws -> ClassicShadowReducer { try ClassicShadowReducer(context: context(), profile: profile()) }
  @discardableResult private func message(_ r: ClassicShadowReducer, _ version: Int64, _ state: String,
                                          suffix: String = "update/accepted", token: String? = nil) throws -> ShadowReceiveResult {
    var body: [String: Any] = ["version": version, "state": try JSONSerialization.jsonObject(with: Data(state.utf8))]
    if let token { body["clientToken"] = token }
    return try r.receive(context(), topic: prefix + suffix, payload: JSONSerialization.data(withJSONObject: body))
  }
  @discardableResult private func command(_ r: ClassicShadowReducer, token: String = "cmd-1", power: Double = 1, now: Int64 = 0) throws -> ShadowPublication {
    try r.command(context(), token: token, desired: .fields(["Power": .number(power)]), nowMs: now)
  }
  @discardableResult private func accept(_ r: ClassicShadowReducer, token: String = "cmd-1", version: Int64 = 11) throws -> ShadowReceiveResult {
    try message(r, version, #"{"desired":{"Power":1}}"#, token: token)
  }
  @discardableResult private func reject(_ r: ClassicShadowReducer, code: Int, suffix: String = "get/rejected", token: String? = nil) throws -> ShadowReceiveResult {
    var body: [String: Any] = ["code": code]
    if let token { body["clientToken"] = token }
    return try r.receive(context(), topic: prefix + suffix, payload: JSONSerialization.data(withJSONObject: body))
  }

  func testExactTopicsAndZeroByteQuery() throws {
    let r = try reducer()
    XCTAssertEqual(r.responseTopics, Set(["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map { prefix + $0 }))
    let query = try r.query(context())
    XCTAssertEqual(query.topic, prefix + "get")
    XCTAssertTrue(query.payload.isEmpty)
    XCTAssertEqual(query.qos, 1); XCTAssertFalse(query.retain)
    XCTAssertEqual(try r.receive(context(), topic: query.topic, payload: Data("{}".utf8)), .ignored)
    XCTAssertEqual(try r.receive(context(), topic: query.topic + "/accepted/", payload: Data("{}".utf8)), .ignored)
  }

  func testDesiredAndPubackDoNotChangeReportedOrProveExecution() throws {
    let r = try reducer()
    try message(r, 10, #"{"reported":{"Power":0,"ConnectType":"online"}}"#, suffix: "get/accepted")
    let publication = try command(r)
    XCTAssertEqual(publication.qos, 1); XCTAssertFalse(publication.retain)
    let payload = try ShadowValue.parse(JSONSerialization.jsonObject(with: publication.payload))
    XCTAssertEqual(payload.at(["state", "desired", "DeviceId"]), .text("thing-abc"))
    XCTAssertEqual(payload.at(["state", "desired", "EnduserId"]), .text("user-9"))
    XCTAssertEqual(payload.at(["state", "desired", "CommandType"]), .text("app"))
    XCTAssertTrue(try r.puback(context(), token: "cmd-1"))
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .sent)
    try accept(r)
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .cloudAccepted)
    XCTAssertEqual(r.reported().at(["Power"]), .number(0)); XCTAssertEqual(r.online(), true)
    try message(r, 12, #"{"reported":{"Power":1}}"#, token: "device-own-token")
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .targetReached)
    XCTAssertEqual(r.commandState("cmd-1")?.targetObservedVersion, 12)
  }

  func testReportedBeforeDesiredAcceptanceIsRetained() throws {
    let r = try reducer(); try command(r)
    try message(r, 12, #"{"reported":{"Power":1}}"#)
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .sending)
    try accept(r)
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .targetReached)
  }

  func testNewerPartialThenOlderSnapshotFillsMissingWithoutRollback() throws {
    let r = try reducer()
    try message(r, 12, #"{"reported":{"config":{"level":4},"Power":1}}"#)
    try message(r, 10, #"{"reported":{"config":{"level":2,"other":3},"Power":0,"ConnectType":"offline"}}"#, suffix: "get/accepted")
    XCTAssertEqual(r.reported().at(["config", "level"]), .number(4))
    XCTAssertEqual(r.reported().at(["config", "other"]), .number(3))
    XCTAssertEqual(r.reported().at(["Power"]), .number(1)); XCTAssertEqual(r.online(), false)
    XCTAssertEqual(try message(r, 12, #"{"reported":{"Power":0}}"#), .ignored)
    XCTAssertEqual(r.reported().at(["Power"]), .number(1))
  }

  func testNestedNullAndRootDeletionPreventOldSnapshotResurrection() throws {
    let r = try reducer()
    try message(r, 10, #"{"reported":{"config":{"level":1,"other":2},"Power":0}}"#, suffix: "get/accepted")
    try message(r, 12, #"{"reported":{"config":{"level":null}}}"#)
    try message(r, 11, #"{"reported":{"config":{"level":9}}}"#)
    XCTAssertNil(r.reported().at(["config", "level"]))
    XCTAssertEqual(r.reported().at(["config", "other"]), .number(2))
    try message(r, 20, #"{"reported":null}"#)
    try message(r, 19, #"{"reported":{"Power":1}}"#, suffix: "get/accepted")
    XCTAssertEqual(r.reported(), .fields([:]))
    try message(r, 21, #"{"reported":{"config":{"level":7}}}"#)
    XCTAssertEqual(r.reported().at(["config", "level"]), .number(7))
  }

  func testOlderParentDeletionKeepsNewerNestedField() throws {
    let r = try reducer()
    try message(r, 20, #"{"reported":{"config":{"level":7}}}"#)
    try message(r, 18, #"{"reported":{"config":null}}"#, suffix: "get/accepted")
    XCTAssertEqual(r.reported().at(["config", "level"]), .number(7))
  }

  func testForeignAccountEpochResourceOrThingCannotMutateOrAcknowledge() throws {
    let r = try reducer(); try command(r)
    let foreign = try [context(account: 6), context(epoch: 2), context(resource: "other"), context(thing: "other")]
    for other in foreign {
      XCTAssertEqual(r.receive(other, topic: prefix + "update/accepted", payload: Data("{}".utf8)), .ignored)
      XCTAssertFalse(r.puback(other, token: "cmd-1"))
      XCTAssertThrowsError(try r.query(other))
      XCTAssertThrowsError(try r.command(other, token: "bad", desired: .fields(["Power": .number(1)]), nowMs: 0))
    }
    XCTAssertEqual(r.reported(), .fields([:]))
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .sending)
  }

  func testSuccessiveTargetSupersedesOldPendingAndNeedsNewReport() throws {
    let r = try reducer(); try command(r); try accept(r)
    try command(r, token: "cmd-2", power: 0)
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .unknown)
    XCTAssertEqual(r.commandState("cmd-1")?.unknownCause, .superseded)
    try message(r, 12, #"{"reported":{"Power":1}}"#)
    try accept(r, token: "cmd-2", version: 13)
    try message(r, 12, #"{"reported":{"Power":0}}"#, suffix: "get/accepted")
    XCTAssertEqual(r.commandState("cmd-2")?.phase, .cloudAccepted)
    try message(r, 14, #"{"reported":{"Power":0}}"#)
    XCTAssertEqual(r.commandState("cmd-2")?.phase, .targetReached)
  }

  func testSameTargetNewCommandRequiresReportAfterItsOwnAcceptance() throws {
    let r = try reducer(); try command(r); try accept(r)
    try command(r, token: "cmd-2")
    try message(r, 12, #"{"reported":{"Power":1}}"#)
    try accept(r, token: "cmd-2", version: 13)
    XCTAssertEqual(r.commandState("cmd-2")?.phase, .cloudAccepted)
    try message(r, 14, #"{"reported":{"Power":1}}"#)
    XCTAssertEqual(r.commandState("cmd-2")?.phase, .targetReached)
  }

  func testMatchingGetSnapshotIsNotExecutionConfirmation() throws {
    let r = try reducer(); try command(r); try accept(r)
    try message(r, 12, #"{"reported":{"Power":1}}"#, suffix: "get/accepted")
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .cloudAccepted)
  }

  func testTimeoutDisconnectAndCloseMarkUnknownAndDoNotReplay() throws {
    let r = try reducer(); try command(r)
    try r.tick(context(), nowMs: 1999)
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .sending)
    try r.tick(context(), nowMs: 2000)
    XCTAssertEqual(r.commandState("cmd-1")?.unknownCause, .timeout)
    try command(r, token: "cmd-2", now: 3000)
    try r.disconnect(context())
    XCTAssertEqual(r.commandState("cmd-2")?.unknownCause, .disconnected)
    XCTAssertThrowsError(try r.query(context()))
    let next = try reducer(); try command(next); next.close()
    XCTAssertEqual(next.commandState("cmd-1")?.unknownCause, .closed)
    XCTAssertEqual(try message(next, 12, #"{"reported":{"Power":1}}"#), .ignored)
  }

  func testRejectionsHaveExplicitRecoveryWithoutInventingZeroState() throws {
    let cases: [(Int, ShadowRecovery)] = [(404, .unavailable), (401, .authorizationRequired), (403, .authorizationRequired), (409, .getRequired)]
    for (code, recovery) in cases {
      let r = try reducer(); try command(r)
      try reject(r, code: code, suffix: "update/rejected", token: "cmd-1")
      XCTAssertEqual(r.commandState("cmd-1")?.phase, .rejected)
      XCTAssertEqual(r.recovery, recovery); XCTAssertEqual(r.reported(), .fields([:]))
      if code == 401 || code == 403 { XCTAssertThrowsError(try r.query(context())) }
      if code == 409 { XCTAssertTrue(try r.query(context()).payload.isEmpty) }
    }
  }

  func testMalformedPayloadAndUnrelatedRejectionDoNotChangeState() throws {
    let r = try reducer(); try command(r)
    for raw in ["{}", "[]", "{", #"{"version":1.5,"state":{"reported":{"Power":1}}}"#,
                #"{"version":-1,"state":{"reported":{"Power":1}}}"#,
                #"{"version":true,"state":{"reported":{"Power":1}}}"#,
                #"{"version":1,"state":{"reported":{"DeviceId":"foreign","Power":1}}}"#] {
      XCTAssertEqual(try r.receive(context(), topic: prefix + "update/accepted", payload: Data(raw.utf8)), .ignored)
    }
    XCTAssertEqual(try r.receive(context(), topic: prefix + "update/accepted", payload: Data([0xff])), .ignored)
    try reject(r, code: 409, suffix: "update/rejected", token: "other")
    XCTAssertEqual(r.commandState("cmd-1")?.phase, .sending)
    XCTAssertEqual(r.reported(), .fields([:]))
  }

  func testControlRequiresProductDictionaryAndValidatedCaseSensitiveFields() throws {
    let noProfile = try ClassicShadowReducer(context: context())
    XCTAssertThrowsError(try command(noProfile))
    let r = try reducer(); XCTAssertNil(r.online())
    XCTAssertThrowsError(try r.command(context(), token: "bad", desired: .fields(["power": .number(1)]), nowMs: 0))
    XCTAssertThrowsError(try command(r, power: 9))
    XCTAssertThrowsError(try r.command(context(), token: "bad", desired: .fields(["DeviceId": .text("other")]), nowMs: 0))
    try command(r)
    XCTAssertThrowsError(try command(r))
    XCTAssertThrowsError(try command(r, token: String(repeating: "x", count: 65)))
    XCTAssertThrowsError(try command(r, token: "bad-number", power: .infinity))
  }

  func testOnlineUnknownAfterDisconnectCloseAndEveryRecoveryKeepsCache() throws {
    for code in [0, 1, 401, 403, 404, 409] {
      let r = try reducer()
      try message(r, 10, #"{"reported":{"ConnectType":"online"}}"#, suffix: "get/accepted")
      XCTAssertEqual(r.online(), true)
      if code == 0 { try r.disconnect(context()) }
      else if code == 1 { r.close() }
      else { try reject(r, code: code) }
      XCTAssertNil(r.online())
      XCTAssertEqual(r.reported().at(["ConnectType"]), .text("online"))
    }
  }

  func testUnavailableNeedsRequestedFreshGetBeforeMoreControl() throws {
    for code in [404, 409] {
      let r = try reducer()
      try message(r, 10, #"{"reported":{"Power":0,"ConnectType":"online"}}"#, suffix: "get/accepted")
      try reject(r, code: code)
      let recovery = r.recovery
      XCTAssertThrowsError(try command(r))
      try message(r, 10, #"{"reported":{"Power":0}}"#, suffix: "get/accepted")
      XCTAssertEqual(r.recovery, recovery)
      _ = try r.query(context())
      try message(r, 9, #"{"reported":{"Power":0}}"#, suffix: "get/accepted")
      XCTAssertEqual(r.recovery, recovery)
      try message(r, 11, #"{"reported":{"Power":0,"ConnectType":"online"}}"#, suffix: "get/accepted")
      XCTAssertEqual(r.recovery, .none); XCTAssertEqual(r.online(), true)
      XCTAssertEqual(try command(r).qos, 1)
    }
  }

  func testWritableFieldsWithoutVerifiedMetadataStillCannotControl() throws {
    let product = try profile()
    let r = try ClassicShadowReducer(context: context(), profile: ShadowProfile(writable: product.writable, connection: product.connection))
    XCTAssertEqual(r.responseTopics.count, 4)
    XCTAssertTrue(try r.query(context()).payload.isEmpty)
    XCTAssertThrowsError(try command(r))
  }

  func testAlternateMetadataDoesNotReserveExampleNamesOrMisidentifyProperties() throws {
    let alternate = try ShadowProfile(writable: [["DeviceId"]: { if case .text = $0 { return true }; return false }],
      connection: ShadowOnlineField(path: ["link"], online: .bool(true), offline: .bool(false)),
      metadata: ShadowMetadata(userIDPath: ["meta", "actor"], thingRefPath: ["meta", "thing"],
        commandPath: ["meta", "source"], commandValue: .number(8), reportedThingRefPath: ["identity", "thing"]))
    let r = try ClassicShadowReducer(context: context(), profile: alternate)
    let publication = try r.command(context(), token: "alternate-1", desired: .fields(["DeviceId": .text("display-slot-1")]), nowMs: 0)
    let desired = try ShadowValue.parse(JSONSerialization.jsonObject(with: publication.payload)).at(["state", "desired"])
    XCTAssertEqual(desired?.at(["DeviceId"]), .text("display-slot-1"))
    XCTAssertEqual(desired?.at(["meta", "actor"]), .text("user-9"))
    XCTAssertEqual(desired?.at(["meta", "thing"]), .text("thing-abc"))
    XCTAssertEqual(desired?.at(["meta", "source"]), .number(8))
    XCTAssertNil(desired?.at(["EnduserId"])); XCTAssertNil(desired?.at(["CommandType"]))
    XCTAssertEqual(try message(r, 10, #"{"reported":{"DeviceId":"display-slot-1","identity":{"thing":"thing-abc"},"link":true}}"#), .applied)
    XCTAssertEqual(r.online(), true)
    XCTAssertEqual(try message(r, 11, #"{"reported":{"DeviceId":"display-slot-2","identity":{"thing":"foreign"}}}"#), .ignored)
    XCTAssertEqual(r.reported().at(["DeviceId"]), .text("display-slot-1"))
  }
}

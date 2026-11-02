import XCTest
import Security
import CocoaMQTT
@testable import Rowan

/// Fake transport callbacks only. No URLSession task is resumed and no broker/API is contacted.
@MainActor
final class CocoaMQTTWebSocketBridgeTests: XCTestCase {
  private let clock = Date(timeIntervalSince1970: 1_800_000_000)
  private func parameters() -> MQTTConnectionParameters {
    MQTTConnectionParameters(resourceID: "resource", thingRef: "thing", clientID: "server-client", authentication: .none,
      httpHostHeader: "mqtt.example.test:443", credentialExpiry: .absent, signedRequestExpiresAt: clock.addingTimeInterval(900),
      url: URL(string: "wss://mqtt.example.test:443/mqtt?signature=public%2Ffixture&token=a%2Bb")!)
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Fixture callback not received"); throw MQTTBrokerFailure.transportFailed
  }
  private func fixture() -> (ControlledMQTTWebSocketConnection, FakeWSS, WSSDelegate) {
    let transport = FakeWSS(), delegate = WSSDelegate(), connection = ControlledMQTTWebSocketConnection(transport: transport)
    connection.delegate = delegate
    let callbackQueue = DispatchQueue(label: "rowan.test.sdk.socket"), key = DispatchSpecificKey<Bool>()
    callbackQueue.setSpecific(key: key, value: true); connection.queue = callbackQueue
    delegate.checkQueue = { DispatchQueue.getSpecific(key: key) == true }
    return (connection, transport, delegate)
  }
  private func opened() async throws -> (ControlledMQTTWebSocketConnection, FakeWSS, WSSDelegate) {
    let f = fixture(); f.0.connect(); try await wait { f.1.connects == 1 }; f.1.emit(.opened("mqtt"))
    try await wait { f.2.events == ["open"] && f.1.reads == 1 }; return f
  }
  func testExactBuilderRetainsSignedURLAndCreatesOnlySuspendedTransport() throws {
    let parameters = parameters(), fake = FakeWSS(), expected = parameters.withURL { $0.absoluteString }
    let builder = ControlledMQTTWebSocketBuilder(parameters: parameters, hostPolicy: .verified(.hostnameAndDefaultPort), now: { [clock] in clock }, makeTransport: { value, _, _ in
      XCTAssertEqual(value.withURL { $0.absoluteString }, expected); return fake
    })
    let connection = try builder.buildConnection(forURL: parameters.withURL { $0 }, withHeaders: [:])
    XCTAssertTrue(connection is ControlledMQTTWebSocketConnection); XCTAssertEqual(fake.connects, 0)
    connection.disconnect()
    let socket = try ControlledMQTTWebSocketFactory.socket(parameters, hostPolicy: .verified(.hostnameAndDefaultPort), now: { [clock] in clock })
    let wss = try XCTUnwrap(socket as? CocoaMQTTWebSocket)
    XCTAssertTrue(wss.shouldConnectWithURIOnly); XCTAssertTrue(wss.enableSSL); XCTAssertTrue(wss.headers.isEmpty)
    wss.disconnect() // No connect(): even the production task builder has not been invoked.
  }
  func testBuilderRejectsChangedURLHeadersAndUnknownPolicyBeforeFactory() throws {
    var constructions = 0
    let parameters = parameters()
    let builder = ControlledMQTTWebSocketBuilder(parameters: parameters, hostPolicy: .verified(.hostnameAndDefaultPort), now: { [clock] in clock }, makeTransport: { _, _, _ in constructions += 1; return FakeWSS() })
    XCTAssertThrowsError(try builder.buildConnection(forURL: URL(string: "wss://mqtt.example.test:443/mqtt?signature=changed")!, withHeaders: [:]))
    XCTAssertThrowsError(try builder.buildConnection(forURL: parameters.withURL { $0 }, withHeaders: ["Cookie": "fixture"]))
    XCTAssertEqual(constructions, 0)
    XCTAssertThrowsError(try ControlledMQTTWebSocketFactory.socket(parameters, hostPolicy: .unknown))
  }
  func testOpenAndFramesUseDelegateQueueAndOnlyOneReadCallbackInFlight() async throws {
    let (connection, fake, delegate) = try await opened(); defer { connection.disconnect() }
    fake.deliver(.success(.data(Data([1, 2])))); try await wait { delegate.events == ["open", "data:2"] && fake.reads == 2 }
    fake.deliver(.success(.text("public"))); try await wait { delegate.events == ["open", "data:2", "text:public"] && fake.reads == 3 }
    connection.connect(); XCTAssertEqual(fake.connects, 1); XCTAssertFalse(delegate.wrongQueue)
  }
  func testDisconnectBeforeOpenSuppressesLateOpenAndNeverResumesAgain() async throws {
    let (connection, fake, delegate) = fixture(); connection.connect(); try await wait { fake.connects == 1 }
    let late = fake.onEvent; connection.disconnect(); try await wait { fake.cancels >= 1 }
    late?(.opened("mqtt")); connection.connect()
    try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertTrue(delegate.events.isEmpty); XCTAssertEqual(fake.reads, 0); XCTAssertEqual(fake.connects, 1)
  }
  func testPendingWriteCancelCompletesOnceAndIgnoresLateCompletion() async throws {
    let (connection, fake, _) = try await opened(), completions = Locked<[MQTTBrokerFailure?]>([])
    connection.write(data: Data([1])) { error in completions.change { $0.append(error as? MQTTBrokerFailure) } }
    try await wait { fake.writes == 1 }; let late = fake.takeWrite()
    connection.disconnect(); try await wait { completions.value.count == 1 }
    late?(nil); try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertEqual(completions.value.count, 1); XCTAssertEqual(completions.value.first!, .retired)
  }
  func testWriteCompletionIsNotPUBACKAndRemoteCloseIsSingleTerminal() async throws {
    let (connection, fake, delegate) = try await opened(), completions = Locked<Int>(0)
    connection.write(data: Data([1])) { error in XCTAssertNil(error); completions.change { $0 += 1 } }
    try await wait { fake.writes == 1 }; fake.takeWrite()?(nil); try await wait { completions.value == 1 }
    XCTAssertEqual(delegate.events, ["open"])
    let late = fake.onEvent; fake.emit(.closed); try await wait { delegate.events == ["open", "close"] }
    late?(.failed); fake.deliver(.failure(.transportFailed)); try await Task.sleep(nanoseconds: 5_000_000)
    XCTAssertEqual(delegate.events, ["open", "close"]); XCTAssertEqual(delegate.failures, [.transportFailed])
    connection.disconnect()
  }
  func testReceiveFailureRetiresWithoutAnotherReceiveOrReconnect() async throws {
    let (connection, fake, delegate) = try await opened()
    fake.deliver(.failure(.transportFailed)); try await wait { delegate.events == ["open", "close"] }
    connection.connect(); XCTAssertEqual(fake.reads, 1); XCTAssertEqual(fake.connects, 1)
    XCTAssertEqual(delegate.failures, [.transportFailed])
  }
  func testWrongSubprotocolCannotOpenMQTTOrStartReading() async throws {
    let (connection, fake, delegate) = fixture(); connection.connect(); try await wait { fake.connects == 1 }
    fake.emit(.opened("other-protocol")); try await wait { delegate.events == ["close"] }
    XCTAssertEqual(fake.reads, 0); XCTAssertEqual(delegate.failures, [.transportFailed])
  }
  func testOversizedFrameFailsWithFixedErrorAndStopsReading() async throws {
    let (connection, fake, delegate) = try await opened()
    fake.deliver(.success(.data(Data(repeating: 0, count: 1_048_577))))
    try await wait { delegate.events == ["open", "close"] }
    XCTAssertEqual(fake.reads, 1); XCTAssertEqual(delegate.failures, [.transportFailed]); connection.disconnect()
  }
}

private final class Locked<Value> {
  private let lock = NSLock(); private var stored: Value
  init(_ value: Value) { stored = value }
  var value: Value { lock.lock(); defer { lock.unlock() }; return stored }
  func change(_ operation: (inout Value) -> Void) { lock.lock(); defer { lock.unlock() }; operation(&stored) }
}
private final class FakeWSS: MQTTWebSocketTransport {
  private struct State {
    var sink: ((MQTTWebSocketTransportEvent) -> Void)?
    var connects = 0, cancels = 0, reads = 0, writes = 0
    var read: ((Result<MQTTWebSocketFrame, MQTTBrokerFailure>) -> Void)?
    var write: ((MQTTBrokerFailure?) -> Void)?
  }
  private let state = Locked(State())
  var connects: Int { state.value.connects }; var cancels: Int { state.value.cancels }
  var reads: Int { state.value.reads }; var writes: Int { state.value.writes }
  var onEvent: ((MQTTWebSocketTransportEvent) -> Void)? {
    get { state.value.sink }
    set { state.change { $0.sink = newValue } }
  }
  func connect() { state.change { $0.connects += 1 } }
  func cancel() { state.change { $0.cancels += 1 } }
  func write(_ data: Data, completion: @escaping (MQTTBrokerFailure?) -> Void) { state.change { $0.writes += 1; $0.write = completion } }
  func receive(_ completion: @escaping (Result<MQTTWebSocketFrame, MQTTBrokerFailure>) -> Void) { state.change { $0.reads += 1; $0.read = completion } }
  func emit(_ event: MQTTWebSocketTransportEvent) { onEvent?(event) }
  func takeWrite() -> ((MQTTBrokerFailure?) -> Void)? {
    var callback: ((MQTTBrokerFailure?) -> Void)?; state.change { callback = $0.write; $0.write = nil }; return callback
  }
  func deliver(_ result: Result<MQTTWebSocketFrame, MQTTBrokerFailure>) {
    var callback: ((Result<MQTTWebSocketFrame, MQTTBrokerFailure>) -> Void)?
    state.change { callback = $0.read; $0.read = nil }; callback?(result)
  }
}
private final class WSSDelegate: NSObject, CocoaMQTTWebSocketConnectionDelegate {
  private let captured = Locked<[String]>([]), errors = Locked<[MQTTBrokerFailure]>([]), misplaced = Locked(false)
  var checkQueue: () -> Bool = { true }
  var wrongQueue: Bool { misplaced.value }
  private func record(_ value: String) { if !checkQueue() { misplaced.change { $0 = true } }; captured.change { $0.append(value) } }
  var events: [String] { captured.value }; var failures: [MQTTBrokerFailure] { errors.value }
  func connection(_ conn: CocoaMQTTWebSocketConnection, didReceive trust: SecTrust, completionHandler: @escaping (Bool) -> Void) { completionHandler(false) }
  func urlSessionConnection(_ conn: CocoaMQTTWebSocketConnection, didReceiveTrust trust: SecTrust, didReceiveChallenge challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) { completionHandler(.performDefaultHandling, nil) }
  func connectionOpened(_ conn: CocoaMQTTWebSocketConnection) { record("open") }
  func connectionClosed(_ conn: CocoaMQTTWebSocketConnection, withError error: Error?, withCode code: UInt16?) {
    if let error = error as? MQTTBrokerFailure { errors.change { $0.append(error) } }; record("close")
  }
  func connection(_ conn: CocoaMQTTWebSocketConnection, receivedString string: String) { record("text:" + string) }
  func connection(_ conn: CocoaMQTTWebSocketConnection, receivedData data: Data) { record("data:\(data.count)") }
}

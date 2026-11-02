import XCTest
@testable import Rowan

/// Definitions only on Windows. Fake driver / suspended URLSession task; no broker or real API.
@MainActor
final class MQTTBrokerAdapterTests: XCTestCase {
  private let prefix = "$aws/things/public-thing/shadow/"
  private let clock = Date(timeIntervalSince1970: 1_800_000_000)
  private func context(epoch: Int64 = 1) throws -> ShadowContext {
    try ShadowContext(accountRevision: 4, connectionEpoch: epoch, resourceID: "http-resource", thingRef: "public-thing", userID: "public-user")
  }
  private func parameters(host: String = "mqtt.example.test:443", url: String = "wss://mqtt.example.test:443/mqtt?public=a%2Fb&token=fixture",
                          expired: Bool = false) -> MQTTConnectionParameters {
    MQTTConnectionParameters(resourceID: "http-resource", thingRef: "public-thing", clientID: "server-client", authentication: .none,
      httpHostHeader: host, credentialExpiry: .absent, signedRequestExpiresAt: clock.addingTimeInterval(expired ? -1 : 900), url: URL(string: url)!)
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<500 { if condition() { return }; await Task.yield() }
    XCTFail("Expected offline fixture progress"); throw MQTTBrokerFailure.transportFailed
  }
  private func fixture(timeout: TimeInterval = 20) -> (MQTTBrokerAdapter, BrokerFakeDriver) {
    let driver = BrokerFakeDriver()
    let adapter = MQTTBrokerAdapter(hostPolicy: .verified(.hostnameAndDefaultPort), timeout: timeout, now: { [clock] in clock }, makeDriver: { driver })
    return (adapter, driver)
  }
  private func ready(timeout: TimeInterval = 20) async throws -> (MQTTBrokerAdapter, BrokerFakeDriver, ShadowContext) {
    let (adapter, driver) = fixture(timeout: timeout), context = try context(), parameters = parameters()
    let task = Task { try await adapter.connect(parameters, context: context) }
    try await wait { driver.starts == 1 }
    driver.emit(.connack(accepted: true))
    driver.emit(.suback(granted: Dictionary(uniqueKeysWithValues: driver.topics.map { ($0, 1) }), failed: []))
    try await task.value
    return (adapter, driver, context)
  }

  func testUnknownHostPolicyDoesNotConstructDriver() async throws {
    var constructed = false
    let adapter = MQTTBrokerAdapter(makeDriver: { constructed = true; return BrokerFakeDriver() })
    do { try await adapter.connect(parameters(), context: context()); XCTFail("Unknown accepted") }
    catch { XCTAssertEqual(error as? MQTTBrokerFailure, .unverifiedTransport) }
    XCTAssertFalse(constructed)
  }
  func testExpiredSignatureDoesNotConstructDriver() async throws {
    let (adapter, driver) = fixture()
    do { try await adapter.connect(parameters(expired: true), context: context()); XCTFail("Expired accepted") }
    catch { XCTAssertEqual(error as? MQTTBrokerFailure, .expiredCredentials) }
    XCTAssertEqual(driver.starts, 0)
  }
  func testConnectAwaitsConnackThenAllFourQoSOneSubacks() async throws {
    let (adapter, driver) = fixture(), context = try context(), parameters = parameters()
    var completed = false
    let task = Task { try await adapter.connect(parameters, context: context); completed = true }
    try await wait { driver.starts == 1 }
    XCTAssertFalse(completed); XCTAssertTrue(driver.topics.isEmpty)
    XCTAssertTrue(driver.configuration?.cleanSession == true)
    XCTAssertTrue(driver.configuration?.autoReconnect == false); XCTAssertTrue(driver.configuration?.loggingEnabled == false)
    driver.emit(.connack(accepted: true))
    XCTAssertFalse(completed)
    XCTAssertEqual(Set(driver.topics), Set(["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map { prefix + $0 }))
    driver.emit(.suback(granted: Dictionary(uniqueKeysWithValues: driver.topics.map { ($0, 1) }), failed: []))
    try await task.value; XCTAssertTrue(completed); adapter.close()
  }
  func testQoSZeroGrantIsNotReady() async throws {
    let (adapter, driver) = fixture(), context = try context(), parameters = parameters()
    let task = Task { try await adapter.connect(parameters, context: context) }
    try await wait { driver.starts == 1 }; driver.emit(.connack(accepted: true))
    var grants = Dictionary(uniqueKeysWithValues: driver.topics.map { ($0, 1) }); grants[driver.topics[0]] = 0
    driver.emit(.suback(granted: grants, failed: []))
    do { try await task.value; XCTFail("QoS0 accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .subscriptionRejected) }
    XCTAssertEqual(driver.closes, 1)
  }
  func testPartialSubackFailsClosed() async throws {
    let (adapter, driver) = fixture(), context = try context(), parameters = parameters()
    let task = Task { try await adapter.connect(parameters, context: context) }
    try await wait { driver.starts == 1 }; driver.emit(.connack(accepted: true))
    driver.emit(.suback(granted: [driver.topics[0]: 1], failed: []))
    do { try await task.value; XCTFail("Partial accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .subscriptionRejected) }
  }
  func testRejectedConnackDoesNotSubscribe() async throws {
    let (adapter, driver) = fixture(), context = try context(), parameters = parameters()
    let task = Task { try await adapter.connect(parameters, context: context) }
    try await wait { driver.starts == 1 }; driver.emit(.connack(accepted: false))
    do { try await task.value; XCTFail("Rejected accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .connectionRejected) }
    XCTAssertTrue(driver.topics.isEmpty)
  }
  func testEmptyGetWaitsForExactPubackNotAdmissionOrUnknownMID() async throws {
    let (adapter, driver, context) = try await ready()
    var completed = false
    let task = Task { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context); completed = true }
    try await wait { driver.posts.count == 1 }
    XCTAssertTrue(driver.posts[0].payload.isEmpty)
    driver.emit(.publication(operation: driver.posts[0].operation, packetID: 42)); driver.emit(.puback(packetID: 41))
    await Task.yield(); XCTAssertFalse(completed)
    driver.emit(.puback(packetID: 42)); try await task.value; XCTAssertTrue(completed); adapter.close()
  }
  func testTwoConcurrentPublicationsAreMatchedByMID() async throws {
    let (adapter, driver, context) = try await ready()
    let a = Task { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context) }
    try await wait { driver.posts.count == 1 }
    let b = Task { try await adapter.publish(topic: prefix + "update", payload: Data("{}".utf8), context: context) }
    try await wait { driver.posts.count == 2 }
    driver.emit(.publication(operation: driver.posts[0].operation, packetID: 7))
    driver.emit(.publication(operation: driver.posts[1].operation, packetID: 8))
    driver.emit(.puback(packetID: 8)); try await b.value
    driver.emit(.puback(packetID: 7)); try await a.value; adapter.close()
  }
  func testDisconnectMakesPendingUnknownAndCannotReuseClient() async throws {
    let (adapter, driver, context) = try await ready()
    var closed: [MQTTBrokerFailure] = []
    adapter.onClosed = { captured, reason in XCTAssertEqual(captured, context); closed.append(reason) }
    let task = Task { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context) }
    try await wait { driver.posts.count == 1 }; driver.emit(.disconnected)
    do { try await task.value; XCTFail("Lost ACK succeeded") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    do { try await adapter.connect(parameters(), context: context); XCTFail("Client reused") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .retired) }
    do { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context); XCTFail("Offline queued") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .offline) }
    XCTAssertEqual(driver.starts, 1); XCTAssertEqual(driver.posts.count, 1)
    adapter.close(); XCTAssertEqual(closed, [.transportFailed])
  }
  func testCancelledPublicationIsUnknownAndRetiresDriver() async throws {
    let (adapter, driver, context) = try await ready()
    let task = Task { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context) }
    try await wait { driver.posts.count == 1 }; task.cancel()
    do { try await task.value; XCTFail("Cancelled mutation succeeded") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    XCTAssertEqual(driver.closes, 1)
  }
  func testCancelledConnectRetiresWithoutSubscribingOrRetrying() async throws {
    let (adapter, driver) = fixture(), context = try context(), parameters = parameters()
    let task = Task { try await adapter.connect(parameters, context: context) }
    try await wait { driver.starts == 1 }; task.cancel()
    do { try await task.value; XCTFail("Cancelled handshake succeeded") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    XCTAssertTrue(driver.topics.isEmpty); XCTAssertEqual(driver.starts, 1); XCTAssertEqual(driver.closes, 1)
  }
  func testConnectWithoutConnackTimesOutAndRetires() async throws {
    let (adapter, driver) = fixture(timeout: 0.02)
    do { try await adapter.connect(parameters(), context: context()); XCTFail("No CONNACK accepted") }
    catch { XCTAssertEqual(error as? MQTTBrokerFailure, .transportFailed) }
    XCTAssertEqual(driver.starts, 1); XCTAssertEqual(driver.closes, 1)
  }
  func testDuplicatePendingMIDDoesNotCompleteEitherPublication() async throws {
    let (adapter, driver, context) = try await ready()
    let a = Task { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context) }
    try await wait { driver.posts.count == 1 }
    let b = Task { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context) }
    try await wait { driver.posts.count == 2 }
    driver.emit(.publication(operation: driver.posts[0].operation, packetID: 9))
    driver.emit(.publication(operation: driver.posts[1].operation, packetID: 9))
    for task in [a, b] {
      do { try await task.value; XCTFail("Ambiguous MID accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    }
    XCTAssertEqual(driver.closes, 1)
  }
  func testPublicationTimeoutIsUnknownAndDoesNotReplay() async throws {
    let (adapter, driver, context) = try await ready(timeout: 0.02)
    do { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context); XCTFail("Timeout succeeded") }
    catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    XCTAssertEqual(driver.posts.count, 1); XCTAssertEqual(driver.closes, 1)
  }
  func testLateCallbackAndOtherTopicDoNotReachClosedContext() async throws {
    let (adapter, driver, context) = try await ready()
    var messages: [Data] = []
    adapter.onMessage = { captured, _, data in XCTAssertEqual(captured, context); messages.append(data) }
    driver.emit(.message(topic: prefix + "get/accepted", payload: Data([1])))
    driver.emit(.message(topic: prefix + "delta", payload: Data([2])))
    let late = driver.onEvent; adapter.close()
    late?(.message(topic: prefix + "get/accepted", payload: Data([3])))
    XCTAssertEqual(messages, [Data([1])])
  }
  func testOtherEpochCannotPublish() async throws {
    let (adapter, driver, _) = try await ready()
    do { try await adapter.publish(topic: prefix + "get", payload: Data(), context: context(epoch: 2)); XCTFail("Stale epoch accepted") }
    catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }
    XCTAssertTrue(driver.posts.isEmpty); adapter.close()
  }
  func testGetMustBeEmptyAndPublicationMustUseExactShadowTopic() async throws {
    let (adapter, driver, context) = try await ready()
    for (topic, data) in [(prefix + "get", Data([1])), (prefix + "update/accepted", Data([1])), ("#", Data())] {
      do { try await adapter.publish(topic: topic, payload: data, context: context); XCTFail("Invalid publication accepted") }
      catch { XCTAssertEqual(error as? MQTTBrokerFailure, .invalidConfiguration) }
    }
    XCTAssertTrue(driver.posts.isEmpty); adapter.close()
  }
  func testControlledFactoryPreservesSignedURLAndHasNoAmbientStores() throws {
    let parameters = parameters(), original = parameters.withURL { $0.absoluteString }
    let prepared = try ControlledMQTTWebSocketFactory.prepare(parameters, hostPolicy: .verified(.hostnameAndDefaultPort), now: clock)
    defer { prepared.cancel() }
    XCTAssertEqual(prepared.request.url?.absoluteString, original)
    XCTAssertEqual(prepared.request.value(forHTTPHeaderField: "Host"), "mqtt.example.test:443")
    XCTAssertEqual(prepared.request.value(forHTTPHeaderField: "Sec-WebSocket-Protocol"), "mqtt")
    XCTAssertNil(prepared.configuration.httpCookieStorage); XCTAssertNil(prepared.configuration.urlCredentialStorage)
    XCTAssertNil(prepared.configuration.urlCache); XCTAssertFalse(prepared.configuration.httpShouldSetCookies)
    XCTAssertNil(prepared.request.value(forHTTPHeaderField: "Authorization"))
    XCTAssertFalse(String(reflecting: prepared).contains("fixture"))
  }
  func testCanonicalHostMismatchIsRejectedEvenWhenURLHas443() throws {
    XCTAssertThrowsError(try MQTTTransportHostPolicy.verified(.hostnameOnly).validate(parameters(), now: clock))
    XCTAssertNoThrow(try MQTTTransportHostPolicy.verified(.hostnameOnly).validate(parameters(host: "mqtt.example.test", url: "wss://mqtt.example.test:443/mqtt"), now: clock))
  }
  func testDefaultSDKDriverRefusesUnknownHostWithoutNetwork() async throws {
    let driver = CocoaMQTTSDKDriver()
    var failure: MQTTBrokerFailure?
    driver.onEvent = { if case let .failed(value) = $0 { failure = value } }
    driver.start(parameters(), configuration: MQTTDriverConfiguration(connectTimeout: 20))
    try await wait { failure != nil }
    XCTAssertEqual(failure, .unverifiedTransport); driver.close()
  }
}

@MainActor
private final class BrokerFakeDriver: MQTTSDKDriver {
  var onEvent: ((MQTTDriverEvent) -> Void)?
  var starts = 0, closes = 0
  var topics: [String] = []
  var configuration: MQTTDriverConfiguration?
  struct Post { let operation: UUID; let topic: String; let payload: Data }
  var posts: [Post] = []
  func start(_ parameters: MQTTConnectionParameters, configuration: MQTTDriverConfiguration) { starts += 1; self.configuration = configuration }
  func subscribe(_ topics: [String]) { self.topics = topics }
  func unsubscribe(_ topics: [String]) { }
  func publish(operation: UUID, topic: String, payload: Data) { posts.append(Post(operation: operation, topic: topic, payload: payload)) }
  func close() { closes += 1 }
  func emit(_ event: MQTTDriverEvent) { onEvent?(event) }
}

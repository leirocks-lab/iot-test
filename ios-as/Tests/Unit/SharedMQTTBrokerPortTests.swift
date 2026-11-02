import XCTest
@testable import Rowan

@MainActor
final class SharedMQTTBrokerPortTests: XCTestCase {
  @MainActor private final class Driver: MQTTSDKDriver {
    var onEvent: ((MQTTDriverEvent) -> Void)?
    var starts = 0, closes = 0
    var subscriptions: [[String]] = [], unsubscriptions: [[String]] = []
    var operations: [UUID] = []
    func start(_ parameters: MQTTConnectionParameters, configuration: MQTTDriverConfiguration) { starts += 1 }
    func subscribe(_ topics: [String]) { subscriptions.append(topics) }
    func unsubscribe(_ topics: [String]) { unsubscriptions.append(topics) }
    func publish(operation: UUID, topic: String, payload: Data) { operations.append(operation) }
    func close() { closes += 1 }
  }
  private let topics = Set(["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map { "$aws/things/thing/shadow/" + $0 })
  private func parameters() -> MQTTConnectionParameters {
    MQTTConnectionParameters(resourceID: "resource", thingRef: "thing", clientID: "server-client", authentication: .none, httpHostHeader: "mqtt.example.test:443",
      credentialExpiry: .absent, signedRequestExpiresAt: nil, url: URL(string: "wss://mqtt.example.test:443/mqtt?public=fixture")!)
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Fixture progress missing"); throw MQTTBrokerFailure.transportFailed
  }
  private func connected() async throws -> (SharedMQTTBrokerAdapter, Driver) {
    let driver = Driver(), port = SharedMQTTBrokerAdapter(driver: driver, hostPolicy: .verified(.hostnameAndDefaultPort)), parameters = parameters()
    let task = Task { try await port.connect(parameters) }; try await wait { driver.starts == 1 }
    driver.onEvent?(.connack(accepted: true)); try await task.value; return (port, driver)
  }
  func testConnectionWaitsForConnackAndDoesNotImplicitlySubscribe() async throws {
    let driver = Driver(), port = SharedMQTTBrokerAdapter(driver: driver, hostPolicy: .verified(.hostnameAndDefaultPort)), parameters = parameters()
    var ready = false
    let task = Task { try await port.connect(parameters); ready = true }; try await wait { driver.starts == 1 }
    XCTAssertFalse(ready); XCTAssertTrue(driver.subscriptions.isEmpty)
    driver.onEvent?(.connack(accepted: true)); try await task.value; XCTAssertTrue(ready); port.close()
  }
  func testSubscribeRequiresExactSetAndEveryQoSOneGrant() async throws {
    let (port, driver) = try await connected(); let task = Task { try await port.subscribe(topics) }
    try await wait { driver.subscriptions.count == 1 }
    XCTAssertEqual(Set(driver.subscriptions[0]), topics)
    var grants = Dictionary(uniqueKeysWithValues: topics.map { ($0, 1) }); grants[topics.first!] = 0
    driver.onEvent?(.suback(granted: grants, failed: []))
    do { try await task.value; XCTFail("QoS0 accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .subscriptionRejected) }
    XCTAssertEqual(driver.closes, 0); port.close()
  }
  func testUnsubscribeWaitsForExactAcknowledgedTopics() async throws {
    let (port, driver) = try await connected(); var done = false
    let task = Task { try await port.unsubscribe(topics); done = true }; try await wait { driver.unsubscriptions.count == 1 }
    XCTAssertFalse(done); driver.onEvent?(.unsuback(topics: Array(topics))); try await task.value
    XCTAssertTrue(done); port.close()
  }
  func testWrongUnsubscribeACKRetiresInsteadOfPretendingCleanup() async throws {
    let (port, driver) = try await connected(); let task = Task { try await port.unsubscribe(topics) }
    try await wait { driver.unsubscriptions.count == 1 }; driver.onEvent?(.unsuback(topics: ["wrong"]))
    do { try await task.value; XCTFail("Wrong UNSUBACK accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .transportFailed) }
    XCTAssertEqual(driver.closes, 1)
  }
  func testPublishCompletionRequiresMatchingPubackNotMIDAdmission() async throws {
    let (port, driver) = try await connected(); var done = false
    let task = Task { try await port.publish(topic: "$aws/things/thing/shadow/get", payload: Data()); done = true }
    try await wait { driver.operations.count == 1 }; driver.onEvent?(.publication(operation: driver.operations[0], packetID: 6))
    driver.onEvent?(.puback(packetID: 5)); XCTAssertFalse(done)
    driver.onEvent?(.puback(packetID: 6)); try await task.value; XCTAssertTrue(done); port.close()
  }
  func testCallerCancellationIsUnknownWithoutClosingOtherPublications() async throws {
    let (port, driver) = try await connected()
    let first = Task { try await port.publish(topic: "$aws/things/thing/shadow/get", payload: Data()) }
    try await wait { driver.operations.count == 1 }; first.cancel()
    do { try await first.value; XCTFail("Cancellation lost") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    driver.onEvent?(.publication(operation: driver.operations[0], packetID: 7)); driver.onEvent?(.puback(packetID: 7))
    let second = Task { try await port.publish(topic: "$aws/things/thing/shadow/get", payload: Data()) }
    try await wait { driver.operations.count == 2 }; driver.onEvent?(.publication(operation: driver.operations[1], packetID: 8)); driver.onEvent?(.puback(packetID: 8))
    try await second.value; XCTAssertEqual(driver.closes, 0); port.close()
  }
  func testDefaultUnknownHostNeverStartsSDK() async throws {
    let driver = Driver(), port = SharedMQTTBrokerAdapter(driver: driver)
    do { try await port.connect(parameters()); XCTFail("Unknown transport accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .unverifiedTransport) }
    XCTAssertEqual(driver.starts, 0)
  }
}

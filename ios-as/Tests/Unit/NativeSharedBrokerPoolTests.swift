import XCTest
@testable import Rowan

/// Offline fake credentials/ports only. No HTTP, SDK connect, account storage or actual broker.
@MainActor
final class NativeSharedBrokerPoolTests: XCTestCase {
  @MainActor private final class Port: SharedMQTTBrokerPort {
    var onMessage: ((String, Data) -> Void)?
    var onClosed: ((MQTTBrokerFailure) -> Void)?
    var connects = 0, closes = 0
    var subscriptions: [Set<String>] = [], unsubscriptions: [Set<String>] = []
    var posts: [(String, Data)] = []
    var connectHook: () async throws -> Void = { }
    var subscribeHook: () async throws -> Void = { }
    var publishHook: () async throws -> Void = { }
    func connect(_ parameters: MQTTConnectionParameters) async throws { connects += 1; try await connectHook() }
    func subscribe(_ topics: Set<String>) async throws { subscriptions.append(topics); try await subscribeHook() }
    func unsubscribe(_ topics: Set<String>) async throws { unsubscriptions.append(topics) }
    func publish(topic: String, payload: Data) async throws { posts.append((topic, payload)); try await publishHook() }
    func close() { closes += 1 }
  }
  @MainActor private final class Fixture {
    var account: MQTTPoolIdentity? = MQTTPoolIdentity(revision: 4, userID: "native-user")
    var ports: [Port] = []
    var requests: [MQTTLeaseResource] = []
    var now = Date(timeIntervalSince1970: 1_800_000_000)
    var clientID = "server-client"
    var host = "mqtt.example.test"
    var expiry: Date?
    var beforeCredentials: () async throws -> Void = { }
    var configure: (Port) -> Void = { _ in }
    var pause: (UInt64) async throws -> Void = { try await Task.sleep(nanoseconds: $0) }
    var credentialDeadline: () async throws -> Void = { try await Task.sleep(nanoseconds: 20_000_000_000) }
    let capacity: Int
    let retries: Int
    init(capacity: Int = 32, retries: Int = 0) { self.capacity = capacity; self.retries = retries }
    lazy var pool = NativeSharedBrokerPool(currentAccount: { [unowned self] in account }, credentials: { [unowned self] resource in
      requests.append(resource); try await beforeCredentials()
      return MQTTConnectionParameters(resourceID: resource.resourceID, thingRef: resource.thingRef, clientID: clientID, authentication: .none,
        httpHostHeader: host + ":443", credentialExpiry: expiry.map { MQTTCredentialExpiry.known($0, .epochSeconds) } ?? .absent,
        signedRequestExpiresAt: nil, url: URL(string: "wss://\(host):443/mqtt?signature=public-\(requests.count)")!)
    }, makePort: { [unowned self] in let port = Port(); configure(port); ports.append(port); return port },
      capacity: capacity, maxReconnectAttempts: retries, now: { [unowned self] in now }, pause: { [unowned self] in try await pause($0) },
      credentialDeadline: { [unowned self] in try await credentialDeadline() })
    func resource(_ id: String = "resource", thing: String = "thing") throws -> MQTTLeaseResource {
      try MQTTLeaseResource(accountRevision: 4, resourceID: id, thingRef: thing, userID: "native-user")
    }
    func observe(_ observer: String = "native-observer", resource: MQTTLeaseResource? = nil) throws -> NativeShadowLease {
      pool.observe(try (resource ?? self.resource()), observerID: observer)
    }
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Fixture progress missing"); throw MQTTBrokerFailure.transportFailed
  }
  private func epoch(_ lease: NativeShadowLease) -> Int64? { if case let .ready(epoch, _, _) = lease.state { return epoch }; return nil }
  private func ready(_ lease: NativeShadowLease) async throws -> Int64 { try await wait { epoch(lease) != nil }; return try XCTUnwrap(epoch(lease)) }
  private func flush() async throws { try await Task.sleep(nanoseconds: 5_000_000) }

  /// Cancellation-aware fake timer; the credential continuation in the tests deliberately is not.
  @MainActor private final class Signal {
    private var waiters: [UUID: CheckedContinuation<Void, Error>] = [:]
    var waiting: Int { waiters.count }
    func wait() async throws {
      try Task.checkCancellation(); let id = UUID()
      try await withTaskCancellationHandler(operation: {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
          if Task.isCancelled { continuation.resume(throwing: CancellationError()) }
          else { waiters[id] = continuation }
        }
      }, onCancel: { [weak self] in Task { @MainActor in self?.waiters.removeValue(forKey: id)?.resume(throwing: CancellationError()) } })
    }
    func open() { let pending = Array(waiters.values); waiters.removeAll(); for waiter in pending { waiter.resume() } }
  }

  func testUncooperativeCredentialIOPastWatchdogAndBackoffStartsExactlyOneFreshReadAfterCompletion() async throws {
    let f = Fixture(retries: 1), deadline = Signal(), backoff = Signal(); defer { f.pool.close() }
    var oldIO: CheckedContinuation<Void, Error>?, backoffReturned = 0
    f.beforeCredentials = { [unowned f] in if f.requests.count == 1 { try await withCheckedThrowingContinuation { oldIO = $0 } } }
    f.credentialDeadline = { try await deadline.wait() }
    f.pause = { _ in try await backoff.wait(); backoffReturned += 1 }
    let a = try f.observe(); try await wait { oldIO != nil && deadline.waiting == 1 }
    deadline.open(); try await wait { a.state == .recovering(.transportFailed) && backoff.waiting == 1 }
    backoff.open(); try await wait { backoffReturned == 1 }; try await flush()
    XCTAssertEqual(f.requests.count, 1); XCTAssertTrue(f.ports.isEmpty) // actual old I/O still holds the slot
    oldIO?.resume(); oldIO = nil; _ = try await ready(a); try await flush()
    XCTAssertEqual(f.requests.count, 2); XCTAssertEqual(f.ports.count, 1); XCTAssertTrue(f.ports[0].posts.isEmpty)
  }
  func testLastReleaseDiscardsDeferredRecoveryWhileOldCredentialIOFinishes() async throws {
    let f = Fixture(retries: 1), deadline = Signal(), backoff = Signal(); defer { f.pool.close() }
    var oldIO: CheckedContinuation<Void, Error>?, backoffReturned = 0
    f.beforeCredentials = { try await withCheckedThrowingContinuation { oldIO = $0 } }
    f.credentialDeadline = { try await deadline.wait() }; f.pause = { _ in try await backoff.wait(); backoffReturned += 1 }
    let a = try f.observe(); try await wait { oldIO != nil && deadline.waiting == 1 }
    deadline.open(); try await wait { backoff.waiting == 1 }; backoff.open(); try await wait { backoffReturned == 1 }
    a.close(); oldIO?.resume(); oldIO = nil; try await flush()
    XCTAssertEqual(a.state, .closed); XCTAssertEqual(f.requests.count, 1); XCTAssertTrue(f.ports.isEmpty)
  }
  func testAccountChangeDiscardsDeferredRecoveryWhileOldCredentialIOFinishes() async throws {
    let f = Fixture(retries: 1), deadline = Signal(), backoff = Signal(); defer { f.pool.close() }
    var oldIO: CheckedContinuation<Void, Error>?, backoffReturned = 0
    f.beforeCredentials = { try await withCheckedThrowingContinuation { oldIO = $0 } }
    f.credentialDeadline = { try await deadline.wait() }; f.pause = { _ in try await backoff.wait(); backoffReturned += 1 }
    let a = try f.observe(); try await wait { oldIO != nil && deadline.waiting == 1 }
    deadline.open(); try await wait { backoff.waiting == 1 }; backoff.open(); try await wait { backoffReturned == 1 }
    f.account = MQTTPoolIdentity(revision: 5, userID: "new-account"); f.pool.accountChanged()
    oldIO?.resume(); oldIO = nil; try await flush()
    XCTAssertEqual(a.state, .closed); XCTAssertEqual(f.requests.count, 1); XCTAssertTrue(f.ports.isEmpty)
  }

  func testTwoLeasesShareCredentialsConnectionAndFourSubscriptionsWithDistinctEpochs() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"), b = try f.observe("b")
    let ea = try await ready(a), eb = try await ready(b)
    XCTAssertNotEqual(ea, eb); XCTAssertEqual(f.requests.count, 1); XCTAssertEqual(f.ports.count, 1)
    XCTAssertEqual(f.ports[0].connects, 1); XCTAssertEqual(f.ports[0].subscriptions, [a.resource.responseTopics]); XCTAssertTrue(f.ports[0].posts.isEmpty)
  }
  func testTwoResourcesWithSameBrokerKeyShareOneConnectionAndSeparateTopics() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"), b = try f.observe("b", resource: f.resource("another-resource", thing: "another-thing"))
    _ = try await ready(a); _ = try await ready(b)
    XCTAssertEqual(f.requests.count, 2); XCTAssertEqual(f.ports.count, 1); XCTAssertEqual(f.ports[0].subscriptions.count, 2)
    XCTAssertEqual(f.ports[0].subscriptions.reduce(into: Set<String>()) { $0.formUnion($1) }.count, 8)
  }
  func testBrokerKeyExcludesSignatureAndPreservesServerClientID() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"); _ = try await ready(a)
    f.clientID = "different-server-client"
    let b = try f.observe("b", resource: f.resource("resource-b", thing: "thing-b")); _ = try await ready(b)
    XCTAssertEqual(f.ports.count, 2)
    guard case let .ready(_, key, _) = b.state else { return XCTFail("Ready missing") }
    XCTAssertEqual(key.serverClientID, "different-server-client"); XCTAssertFalse(String(reflecting: key).contains("signature"))
  }
  func testDuplicateObserverCannotReplaceOrCloseExistingLease() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"), e = try await ready(a), duplicate = try f.observe("a")
    XCTAssertEqual(duplicate.state, .failed(.duplicateObserver)); duplicate.close()
    try await a.get(expectedEpoch: e); XCTAssertEqual(f.ports[0].posts.count, 1); XCTAssertEqual(f.ports[0].closes, 0)
  }
  func testSameHTTPResourceCannotChangeThingReferenceWhileOldLeaseIsOwned() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(); _ = try await ready(a)
    let mismatch = try f.observe("other", resource: f.resource(thing: "other-thing"))
    XCTAssertEqual(mismatch.state, .failed(.staleContext)); XCTAssertEqual(f.requests.count, 1)
  }
  func testReleaseOneLeaseRetainsConnectionAndFinalReleaseClosesExactlyOnce() async throws {
    let f = Fixture(); let a = try f.observe("a"), b = try f.observe("b"); _ = try await ready(a); _ = try await ready(b)
    a.close(); XCTAssertEqual(f.ports[0].closes, 0); XCTAssertTrue(f.ports[0].unsubscriptions.isEmpty)
    b.close(); b.close(); f.pool.close(); XCTAssertEqual(f.ports[0].closes, 1)
  }
  func testReleaseOneResourceUnsubscribesOnlyItsUnusedTopics() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"), b = try f.observe("b", resource: f.resource("b", thing: "b"))
    _ = try await ready(a); let eb = try await ready(b); a.close()
    try await wait { f.ports[0].unsubscriptions.count == 1 }
    XCTAssertEqual(f.ports[0].unsubscriptions[0], a.resource.responseTopics); try await b.get(expectedEpoch: eb); XCTAssertEqual(f.ports[0].closes, 0)
  }
  func testSameThingTopicsAreReferenceCountedAcrossDifferentHTTPResources() async throws {
    let f = Fixture(); let a = try f.observe("a"), b = try f.observe("b", resource: f.resource("b"))
    _ = try await ready(a); _ = try await ready(b)
    XCTAssertEqual(f.ports[0].subscriptions.count, 1); a.close(); try await flush(); XCTAssertTrue(f.ports[0].unsubscriptions.isEmpty)
    b.close(); XCTAssertEqual(f.ports[0].closes, 1); f.pool.close()
  }
  func testReadyWaitsForAllSubscriptionsAndOnlyExplicitGetPublishesEmptyPayload() async throws {
    let f = Fixture(); defer { f.pool.close() }; var pending: CheckedContinuation<Void, Error>?
    f.configure = { $0.subscribeHook = { try await withCheckedThrowingContinuation { pending = $0 } } }
    let a = try f.observe(); try await wait { pending != nil }; XCTAssertNil(epoch(a)); XCTAssertTrue(f.ports[0].posts.isEmpty)
    pending?.resume(); let e = try await ready(a); try await a.get(expectedEpoch: e)
    XCTAssertEqual(f.ports[0].posts.first?.0, a.resource.getTopic); XCTAssertTrue(f.ports[0].posts.first?.1.isEmpty == true)
  }
  func testWrongEpochDoesNotPublish() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(), e = try await ready(a)
    do { try await a.get(expectedEpoch: e + 1); XCTFail("Stale epoch accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }
    XCTAssertTrue(f.ports[0].posts.isEmpty)
  }
  func testLateCredentialsAfterLastReleaseCannotConstructClient() async throws {
    let f = Fixture(); var pending: CheckedContinuation<Void, Error>?
    f.beforeCredentials = { try await withCheckedThrowingContinuation { pending = $0 } }
    let a = try f.observe(); try await wait { pending != nil }; a.close(); pending?.resume(); try await flush()
    XCTAssertEqual(a.state, .closed); XCTAssertTrue(f.ports.isEmpty); f.pool.close()
  }
  func testOldPortEventsCannotEnterRetriedEpochAndCredentialsAreFresh() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(), old = try await ready(a), late = f.ports[0].onMessage
    f.ports[0].onClosed?(.transportFailed); a.retry(); let next = try await ready(a)
    XCTAssertGreaterThan(next, old); XCTAssertEqual(f.requests.count, 2); XCTAssertEqual(f.ports.count, 2)
    late?(a.resource.getTopic + "/accepted", Data([1])); try await flush(); XCTAssertNil(a.nextMessage())
    f.ports[1].onMessage?(a.resource.getTopic + "/accepted", Data([2])); try await wait { a.nextMessage() != nil }
  }
  func testMailboxRequiresExactACKBeforeNextMessage() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(); _ = try await ready(a)
    f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([1])); f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([2])); try await flush()
    let first = try XCTUnwrap(a.nextMessage()); XCTAssertNil(a.nextMessage()); a.acknowledge(sequence: first.sequence + 100); XCTAssertNil(a.nextMessage())
    a.acknowledge(sequence: first.sequence); XCTAssertEqual(a.nextMessage()?.payload, Data([2]))
  }
  func testLeaseMailboxOverflowDiscardsPreGapMessagesAndChangesEpoch() async throws {
    let f = Fixture(capacity: 2); defer { f.pool.close() }; let a = try f.observe(), old = try await ready(a)
    for byte in [1, 2] as [UInt8] { f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([byte])) }
    try await flush(); let held = try XCTUnwrap(a.nextMessage())
    f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([3])); try await wait { epoch(a) != old }
    XCTAssertNil(a.nextMessage()); a.acknowledge(sequence: held.sequence); XCTAssertNil(a.nextMessage())
    guard case .ready(_, _, .bufferRecovery) = a.state else { return XCTFail("Gap not represented") }
    try await a.get(expectedEpoch: try XCTUnwrap(epoch(a))); XCTAssertEqual(f.ports[0].posts.count, 1)
  }
  func testEntryOverflowDropsEntireAffectedBatchBeforeNewEpoch() async throws {
    let f = Fixture(capacity: 2); defer { f.pool.close() }; let a = try f.observe(), old = try await ready(a)
    for byte in [1, 2, 3] as [UInt8] { f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([byte])) }
    try await wait { epoch(a) != old }; XCTAssertNil(a.nextMessage())
    f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([4])); try await flush()
    let fresh = try XCTUnwrap(a.nextMessage()); XCTAssertEqual(fresh.epoch, epoch(a)); XCTAssertEqual(fresh.payload, Data([4]))
  }
  func testOversizedPayloadChangesEpochWithoutDeliveringPartialData() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(), old = try await ready(a)
    f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data(repeating: 0, count: 1_048_577))
    try await wait { epoch(a) != old }; XCTAssertNil(a.nextMessage())
  }
  func testAccountChangeClosesAllOldLeasesAndRejectsLaterOldReads() async throws {
    let f = Fixture(); let a = try f.observe("a"), b = try f.observe("b"), old = try await ready(a); _ = try await ready(b)
    f.account = MQTTPoolIdentity(revision: 5, userID: "new-user"); f.pool.accountChanged()
    XCTAssertEqual(a.state, .closed); XCTAssertEqual(b.state, .closed); XCTAssertEqual(f.ports[0].closes, 1)
    do { try await a.get(expectedEpoch: old); XCTFail("Old account read accepted") } catch { }
    XCTAssertTrue(f.ports[0].posts.isEmpty); XCTAssertEqual(try f.observe("old").state, .failed(.staleContext)); f.pool.close()
  }
  func testKeyMigrationRequiresFreshCredentialsAndNewEpoch() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(), old = try await ready(a)
    f.ports[0].onClosed?(.transportFailed); f.host = "new-mqtt.example.test"; a.retry(); let next = try await ready(a)
    XCTAssertGreaterThan(next, old); XCTAssertEqual(f.requests.count, 2)
    guard case let .ready(_, key, reason) = a.state else { return XCTFail("Ready missing") }
    XCTAssertEqual(key.authority, "new-mqtt.example.test:443"); XCTAssertEqual(reason, .keyMigrated)
  }
  func testTransientRetryIsBoundedAndNeverPublishesAnOldOperation() async throws {
    let f = Fixture(retries: 2); defer { f.pool.close() }; f.pause = { _ in }; f.configure = { $0.connectHook = { throw MQTTBrokerFailure.transportFailed } }
    let a = try f.observe(); try await wait { f.requests.count == 3 && a.state == .failed(.transportFailed) }
    XCTAssertEqual(f.ports.count, 3); XCTAssertTrue(f.ports.allSatisfy { $0.posts.isEmpty })
  }
  func testConfigurationFailureDoesNotAutoRetry() async throws {
    let f = Fixture(retries: 2); defer { f.pool.close() }; f.pause = { _ in }; f.configure = { $0.connectHook = { throw MQTTBrokerFailure.unverifiedTransport } }
    let a = try f.observe(); try await wait { a.state == .failed(.unverifiedTransport) }; try await flush()
    XCTAssertEqual(f.requests.count, 1); XCTAssertEqual(f.ports.count, 1)
  }
  func testOneCancelledGetDoesNotCloseAnotherLeaseOrReplay() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"), b = try f.observe("b"), ea = try await ready(a); _ = try await ready(b)
    var pending: CheckedContinuation<Void, Error>?
    f.ports[0].publishHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await a.get(expectedEpoch: ea) }; try await wait { pending != nil }; task.cancel(); pending?.resume()
    do { try await task.value; XCTFail("Cancellation lost") } catch is CancellationError { }
    XCTAssertNotNil(epoch(b)); XCTAssertEqual(f.ports[0].closes, 0); XCTAssertEqual(f.ports[0].posts.count, 1)
  }
  func testPartialSubscriptionAfterResourceReleaseIsRemovedWithoutClosingOtherResource() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"); _ = try await ready(a)
    var pending: CheckedContinuation<Void, Error>?
    f.ports[0].subscribeHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let b = try f.observe("b", resource: f.resource("b", thing: "b")); try await wait { pending != nil }
    b.close(); pending?.resume(); try await wait { f.ports[0].unsubscriptions.contains(b.resource.responseTopics) }
    XCTAssertNotNil(epoch(a)); XCTAssertEqual(f.ports[0].closes, 0)
  }
  func testDeniedAdditionalResourceDoesNotRetireExistingReader() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe("a"), ea = try await ready(a)
    f.ports[0].subscribeHook = { throw MQTTBrokerFailure.subscriptionRejected }
    let b = try f.observe("b", resource: f.resource("b", thing: "b"))
    try await wait { b.state == .failed(.subscriptionRejected) && f.ports[0].unsubscriptions.contains(b.resource.responseTopics) }
    XCTAssertNotNil(epoch(a)); XCTAssertEqual(f.ports[0].closes, 0)
    try await a.get(expectedEpoch: ea); XCTAssertEqual(f.ports[0].posts.count, 1)
  }
  func testExpiredCredentialsCannotConstructPort() async throws {
    let f = Fixture(); defer { f.pool.close() }; f.expiry = f.now.addingTimeInterval(-1)
    let a = try f.observe(); try await wait { a.state == .failed(.expiredCredentials) }; XCTAssertTrue(f.ports.isEmpty)
  }
  func testCloseIsIdempotentAndNoNewLeaseCanStartAfterClose() async throws {
    let f = Fixture(); let a = try f.observe(); _ = try await ready(a); let late = f.ports[0].onMessage
    f.pool.close(); f.pool.close(); late?(a.resource.getTopic + "/accepted", Data([1])); try await flush()
    XCTAssertEqual(a.state, .closed); XCTAssertNil(a.nextMessage()); XCTAssertEqual(f.ports[0].closes, 1); XCTAssertEqual(try f.observe("later").state, .closed)
  }
  func testKnownExpiryRenewsUsingFreshCredentialRequestAndNewClientEpoch() async throws {
    let f = Fixture(); defer { f.pool.close() }; f.expiry = f.now.addingTimeInterval(3600)
    var pending: CheckedContinuation<Void, Error>?
    f.pause = { _ in try Task.checkCancellation(); try await withCheckedThrowingContinuation { pending = $0 } }
    let a = try f.observe(), old = try await ready(a); try await wait { pending != nil }
    f.now = f.now.addingTimeInterval(3570); f.expiry = f.now.addingTimeInterval(3600)
    let resume = pending; pending = nil; resume?.resume()
    try await wait { f.requests.count == 2 && self.epoch(a) != nil && self.epoch(a) != old }
    XCTAssertEqual(f.ports.count, 2); XCTAssertEqual(f.ports[0].closes, 1)
    guard case .ready(_, _, .credentialsRenewed) = a.state else { return XCTFail("Renewal not identified") }
    XCTAssertTrue(f.ports.allSatisfy { $0.posts.isEmpty })
    // Release the second fake pause even if its task has already been cancelled.
    a.close(); pending?.resume(); pending = nil
  }
  func testAccountChangeBeforeLatePubackReturnsUnknownAndNeverUsesNewAccount() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(), e = try await ready(a)
    var pending: CheckedContinuation<Void, Error>?
    f.ports[0].publishHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await a.get(expectedEpoch: e) }; try await wait { pending != nil }
    f.account = MQTTPoolIdentity(revision: 5, userID: "new-user"); f.pool.accountChanged(); pending?.resume()
    do { try await task.value; XCTFail("Late ACK accepted") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .resultUnknown) }
    XCTAssertEqual(a.state, .closed); XCTAssertEqual(f.ports[0].posts.count, 1); XCTAssertEqual(f.requests.count, 1)
  }
  func testMessageACKDoesNotReemitReadyStateOrRequestAnotherGet() async throws {
    let f = Fixture(); defer { f.pool.close() }; let a = try f.observe(); _ = try await ready(a)
    var changes = 0; a.onStateChanged = { changes += 1 }; try await flush(); let initial = changes
    f.ports[0].onMessage?(a.resource.getTopic + "/accepted", Data([1])); try await flush()
    let message = try XCTUnwrap(a.nextMessage()); a.acknowledge(sequence: message.sequence); try await flush()
    XCTAssertEqual(changes, initial); XCTAssertTrue(f.ports[0].posts.isEmpty)
  }
  func testSDKDeliveryReservesBoundedCapacityBeforeMainActorDrain() async throws {
    let delivery = MQTTDriverDelivery(); var events: [MQTTDriverEvent] = []
    delivery.setSink { events.append($0) }
    for _ in 0..<1000 { delivery.submit(.message(topic: "fixture", payload: Data([1]))) }
    try await wait { !events.isEmpty }
    XCTAssertEqual(events.count, 1)
    guard case .failed(.transportFailed) = events[0] else { return XCTFail("Gap appeared valid") }
    delivery.setSink(nil)
  }
  func testSDKGapInvalidatesTheRemainderOfAnAlreadyDrainingOldBatch() async throws {
    let delivery = MQTTDriverDelivery(); var events: [MQTTDriverEvent] = []
    delivery.setSink { event in
      events.append(event)
      if events.count == 1 { for _ in 0..<1000 { delivery.submit(.message(topic: "new", payload: Data([2]))) } }
    }
    delivery.submit(.message(topic: "old", payload: Data([1]))); delivery.submit(.message(topic: "old", payload: Data([1])))
    try await wait { events.count >= 2 }; try await flush(); XCTAssertEqual(events.count, 2)
    guard case .failed(.transportFailed) = events[1] else { return XCTFail("Old batch survived known gap") }
    delivery.setSink(nil)
  }
  func testSDKDeliveryInvalidationDropsAlreadyScheduledOldEvents() async throws {
    let delivery = MQTTDriverDelivery(); var count = 0; delivery.setSink { _ in count += 1 }
    delivery.submit(.message(topic: "fixture", payload: Data([1]))); delivery.setSink(nil); try await flush(); XCTAssertEqual(count, 0)
  }
}

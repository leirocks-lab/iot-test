import XCTest
@testable import Rowan

@MainActor
final class AuthorizedDeviceConnectionsTests: XCTestCase {
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Offline proof progress missing"); throw MQTTBrokerFailure.transportFailed
  }
  func testBootstrapProvesThingButEachPoolCredentialReadFetchesAgain() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    let binding = try await registry.open(device, observerID: "native", observe: { resource, _ in DeviceReadFakeLease(resource) })
    XCTAssertEqual(gateway.connections, 1); XCTAssertNotEqual(binding.lease.resource.resourceID, binding.lease.resource.thingRef)
    let first = try await registry.credentials(binding.lease.resource), second = try await registry.credentials(binding.lease.resource)
    XCTAssertEqual(gateway.connections, 3); XCTAssertEqual(first.clientID, "server-client")
    XCTAssertNotEqual(first.withURL { $0.absoluteString }, second.withURL { $0.absoluteString }); binding.close(); registry.close()
  }
  func testMissingOrChangedAccountCannotBootstrapCredentialsOrObservePool() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { nil }, gateway: gateway); var observed = 0
    do { _ = try await registry.open(device, observerID: "native", observe: { resource, _ in observed += 1; return DeviceReadFakeLease(resource) }); XCTFail("Stale proof accepted") }
    catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }
    XCTAssertEqual(gateway.connections, 0); XCTAssertEqual(observed, 0); registry.close()
  }
  func testLateBootstrapAfterAccountInvalidationDoesNotInstallRegistration() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    var identity: MQTTPoolIdentity? = MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID), pending: CheckedContinuation<Void, Error>?, observed = 0
    gateway.connectionHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let registry = AuthorizedDeviceConnections(currentAccount: { identity }, gateway: gateway)
    let task = Task { try await registry.open(device, observerID: "native", observe: { resource, _ in observed += 1; return DeviceReadFakeLease(resource) }) }
    try await wait { pending != nil }; identity = nil; registry.invalidateAccount(device.accountRevision); pending?.resume()
    do { _ = try await task.value; XCTFail("Late bootstrap installed") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }
    XCTAssertEqual(observed, 0); registry.close()
  }
  func testRegistrationExistsBeforePoolAsksForItsFreshCredentials() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    var request: Task<MQTTConnectionParameters, Error>?
    let binding = try await registry.open(device, observerID: "native", observe: { resource, _ in
      request = Task { try await registry.credentials(resource) }; return DeviceReadFakeLease(resource)
    })
    let pending = try XCTUnwrap(request), value = try await pending.value; XCTAssertEqual(value.thingRef, "cloud-thing"); XCTAssertEqual(gateway.connections, 2)
    binding.close(); registry.close()
  }
  func testOneProofReleaseDoesNotRemoveAnotherAndLastReleaseRevokesFetches() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    let a = try await registry.open(device, observerID: "a", observe: { resource, _ in DeviceReadFakeLease(resource) })
    let b = try await registry.open(device, observerID: "b", observe: { resource, _ in DeviceReadFakeLease(resource) })
    a.close(); _ = try await registry.credentials(b.lease.resource); XCTAssertEqual(gateway.connections, 3)
    b.close(); let count = gateway.connections
    do { _ = try await registry.credentials(b.lease.resource); XCTFail("Released proof fetched") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }
    XCTAssertEqual(gateway.connections, count); registry.close()
  }
  func testLateOldCloseCannotEraseReplacementRegistration() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    let old = try await registry.open(device, observerID: "old", observe: { resource, _ in DeviceReadFakeLease(resource) }); old.close()
    let new = try await registry.open(device, observerID: "new", observe: { resource, _ in DeviceReadFakeLease(resource) })
    old.close(); _ = try await registry.credentials(new.lease.resource); XCTAssertEqual(gateway.connections, 3)
    new.close(); registry.close()
  }
  func testLateCredentialResponseAfterReleaseCannotEscape() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    let binding = try await registry.open(device, observerID: "native", observe: { resource, _ in DeviceReadFakeLease(resource) })
    var pending: CheckedContinuation<Void, Error>?
    gateway.connectionHook = { try await withCheckedThrowingContinuation { pending = $0 } }
    let task = Task { try await registry.credentials(binding.lease.resource) }; try await wait { pending != nil }; binding.close(); pending?.resume()
    do { _ = try await task.value; XCTFail("Late released credential escaped") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }; registry.close()
  }
  func testChangedThingRefCannotReuseOldRegistrationOrRewriteServerIdentity() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    let binding = try await registry.open(device, observerID: "native", observe: { resource, _ in DeviceReadFakeLease(resource) }); gateway.thingRef = "new-thing"
    do { _ = try await registry.credentials(binding.lease.resource); XCTFail("Thing changed silently") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .invalidConfiguration) }
    XCTAssertEqual(binding.lease.resource.thingRef, "cloud-thing"); binding.close(); registry.close()
  }
  func testCancelledLeaseHandoffClosesAcquiredLeaseAndRevokesItsProof() async throws {
    let device = try await makeDeviceReadProof(), gateway = DeviceReadFakeGateway(device)
    let registry = AuthorizedDeviceConnections(currentAccount: { MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) }, gateway: gateway)
    var acquired: DeviceReadFakeLease?
    let task = Task { try await registry.open(device, observerID: "native", observe: { resource, _ in
      let lease = DeviceReadFakeLease(resource); acquired = lease
      withUnsafeCurrentTask { $0?.cancel() }; return lease
    }) }
    do { _ = try await task.value; XCTFail("Cancelled handoff returned") } catch is CancellationError { }
    XCTAssertEqual(acquired?.closes, 1)
    let resource = try XCTUnwrap(acquired?.resource), before = gateway.connections
    do { _ = try await registry.credentials(resource); XCTFail("Cancelled proof remained") } catch { XCTAssertEqual(error as? MQTTBrokerFailure, .staleContext) }
    XCTAssertEqual(gateway.connections, before); registry.close()
  }
  func testCompositionDefaultsUnknownHostAndNeverCallsCredentialHTTPOrStartsSDK() async throws {
    let (account, http) = try await makeDeviceReadAccount(), services = NativeDeviceServices(account: account, expiryEncoding: .unknown)
    XCTAssertTrue(http.paths.isEmpty)
    let handle = services.devices.observe(resourceID: "http-resource", nativeObserverID: "native")
    try await wait { if case let .current(value) = handle.state { return value.failure == .configuration }; return false }
    XCTAssertEqual(http.paths, ["/api/app/devices", "/api/app/devices/http-resource"])
    XCTAssertFalse(http.paths.contains(where: { $0.hasSuffix("/mqtt") })); services.close()
  }
}

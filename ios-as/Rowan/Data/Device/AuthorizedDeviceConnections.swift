import Foundation

/// Proof registry contains native metadata only, never a reusable credential/signature seed.
@MainActor
final class AuthorizedDeviceConnections {
  private final class Registration { var proofs: [UUID: AuthorizedDevice] = [:] }
  private let currentAccount: () -> MQTTPoolIdentity?
  private let gateway: NativeDeviceAccessGateway
  private var registrations: [MQTTLeaseResource: Registration] = [:]
  private var invalidated = Set<Int>()
  private var closed = false
  init(currentAccount: @escaping () -> MQTTPoolIdentity?, gateway: NativeDeviceAccessGateway) { self.currentAccount = currentAccount; self.gateway = gateway }
  private func requireAccount(_ device: AuthorizedDevice) throws {
    try Task.checkCancellation()
    guard !closed, !invalidated.contains(device.accountRevision), currentAccount() == MQTTPoolIdentity(revision: device.accountRevision, userID: device.userID) else { throw MQTTBrokerFailure.staleContext }
  }
  private func requireRegistration(_ resource: MQTTLeaseResource, _ registration: Registration) throws {
    guard !closed, !invalidated.contains(resource.accountRevision), registrations[resource] === registration, !registration.proofs.isEmpty else { throw MQTTBrokerFailure.staleContext }
  }
  func open(_ device: AuthorizedDevice, observerID: String,
            observe: (MQTTLeaseResource, String) -> NativeShadowLeasePort) async throws -> RegisteredDeviceLease {
    try requireAccount(device)
    let bootstrap = try await connection(device)
    try requireAccount(device)
    guard bootstrap.resourceID.utf8.elementsEqual(device.resourceID.utf8) else { throw MQTTBrokerFailure.invalidConfiguration }
    let resource = try MQTTLeaseResource(accountRevision: device.accountRevision, resourceID: device.resourceID, thingRef: bootstrap.thingRef, userID: device.userID)
    let registration = registrations[resource] ?? Registration(), token = UUID()
    registrations[resource] = registration; registration.proofs[token] = device // before pool may request credentials
    var lease: NativeShadowLeasePort?
    do {
      let acquired = observe(resource, observerID); lease = acquired
      try requireAccount(device); try requireRegistration(resource, registration)
      guard acquired.resource == resource else { throw MQTTBrokerFailure.invalidConfiguration }
      return RegisteredDeviceLease(lease: acquired) { [weak self] in self?.unregister(resource, registration: registration, token: token) }
    } catch {
      lease?.close(); unregister(resource, registration: registration, token: token); throw error
    }
  }
  func credentials(_ resource: MQTTLeaseResource) async throws -> MQTTConnectionParameters {
    try Task.checkCancellation()
    guard let registration = registrations[resource], let device = registration.proofs.values.first else { throw MQTTBrokerFailure.staleContext }
    try requireRegistration(resource, registration); try requireAccount(device)
    let prepared = try await connection(device) // fresh DEVICE-01 every time, no bootstrap seed
    try requireRegistration(resource, registration); try requireAccount(device)
    guard prepared.resourceID.utf8.elementsEqual(resource.resourceID.utf8), prepared.thingRef.utf8.elementsEqual(resource.thingRef.utf8) else { throw MQTTBrokerFailure.invalidConfiguration }
    return prepared
  }
  /// Keep semantic failures intact across composition; never let pool classify auth/config as I/O.
  private func connection(_ device: AuthorizedDevice) async throws -> MQTTConnectionParameters {
    do { return try await gateway.connection(device) }
    catch is CancellationError { throw CancellationError() }
    catch let failure as MQTTBrokerFailure { throw failure }
    catch let failure as DeviceConnectionFailure {
      switch failure {
      case .authorization: throw MQTTBrokerFailure.authorization
      case .configuration: throw MQTTBrokerFailure.invalidConfiguration
      case .expiredCredentials: throw MQTTBrokerFailure.expiredCredentials
      case .staleContext: throw MQTTBrokerFailure.staleContext
      case .unavailable: throw MQTTBrokerFailure.transportFailed
      }
    } catch let failure as RowanFailure {
      switch failure.code {
      case 401, 403, 1332, 1342: throw MQTTBrokerFailure.authorization
      case 499: throw MQTTBrokerFailure.staleContext
      case 0, 408, 500...599: throw MQTTBrokerFailure.transportFailed
      default: throw MQTTBrokerFailure.invalidConfiguration
      }
    } catch is URLError { throw MQTTBrokerFailure.transportFailed }
    catch { throw MQTTBrokerFailure.invalidConfiguration }
  }
  private func unregister(_ resource: MQTTLeaseResource, registration: Registration, token: UUID) {
    registration.proofs.removeValue(forKey: token)
    if registrations[resource] === registration, registration.proofs.isEmpty { registrations.removeValue(forKey: resource) }
  }
  func invalidateAccount(_ revision: Int) { invalidated.insert(revision); for key in Array(registrations.keys) where key.accountRevision == revision { registrations.removeValue(forKey: key)?.proofs.removeAll() } }
  func close() { closed = true; for value in registrations.values { value.proofs.removeAll() }; registrations.removeAll() }
}

@MainActor
final class RegisteredDeviceLease: AuthorizedDeviceLease {
  let lease: NativeShadowLeasePort
  private var release: (() -> Void)?
  fileprivate init(lease: NativeShadowLeasePort, release: @escaping () -> Void) { self.lease = lease; self.release = release }
  func close() { guard let release else { return }; self.release = nil; lease.close(); release() }
}

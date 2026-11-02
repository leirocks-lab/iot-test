import Foundation

/// Application-scoped readonly composition installed by RowanAppServices.
/// Native transport Host policy stays unknown until a separate macOS wire verification.
@MainActor
final class NativeDeviceServices {
  let devices: DeviceReadOwner
  private let account: AccountService
  private let connections: AuthorizedDeviceConnections
  private let pool: NativeSharedBrokerPool
  private var notification: NSObjectProtocol?
  private var closed = false
  init(account: AccountService, expiryEncoding: ExpiryEncoding, hostPolicy: MQTTTransportHostPolicy = .unknown,
       readProfile: @escaping (AuthorizedDevice) async throws -> ShadowProfile? = { _ in nil },
       makePort: (() -> SharedMQTTBrokerPort)? = nil,
       poolPause: @escaping (UInt64) async throws -> Void = { try await Task.sleep(nanoseconds: $0) },
       snapshotWait: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 10_000_000_000) }) {
    self.account = account
    let current: () -> MQTTPoolIdentity? = {
      guard let session = account.session, account.pendingLogoutCleanupRevision == nil else { return nil }
      return MQTTPoolIdentity(revision: account.revision, userID: session.userID)
    }
    let gateway = HTTPDeviceAccess(account: account, expiryEncoding: expiryEncoding, hostPolicy: hostPolicy)
    let connections = AuthorizedDeviceConnections(currentAccount: current, gateway: gateway)
    let pool = NativeSharedBrokerPool(currentAccount: current, credentials: { try await connections.credentials($0) }, makePort: makePort ?? {
      SharedMQTTBrokerAdapter(driver: CocoaMQTTSDKDriver(hostPolicy: hostPolicy), hostPolicy: hostPolicy)
    }, pause: poolPause)
    self.connections = connections; self.pool = pool
    devices = DeviceReadOwner(currentAccount: current, gateway: gateway,
      open: { device, observer in try await connections.open(device, observerID: observer, observe: { pool.observe($0, observerID: $1) }) },
      invalidateAccount: { revision in connections.invalidateAccount(revision); pool.invalidateAccount(revision) }, readProfile: readProfile, snapshotWait: snapshotWait)
    notification = NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: nil, queue: .main) { [weak self] note in
      guard let changed = note.object as? AccountService else { return }
      Task { @MainActor [weak self] in guard let self, changed === self.account else { return }; self.devices.accountChanged() }
    }
  }
  /// Application owner explicitly closes its lifetime, independently of view cancellation.
  func close() {
    guard !closed else { return }; closed = true
    if let notification { NotificationCenter.default.removeObserver(notification) }; notification = nil
    devices.close(); connections.close(); pool.close()
  }
}

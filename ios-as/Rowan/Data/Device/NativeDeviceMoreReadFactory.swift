import Foundation

/// Module supplies its shared read gate and a live native observation/page guard.
/// No account or device identity comes from a JS DTO.
@MainActor
enum NativeDeviceMoreReadFactory {
  static func makeBound(account: AccountService, owner: DeviceReadOwner, handle: DeviceReadHandle, gate: NativeDeviceReadGate,
                        pageCurrent: @escaping () -> Bool) -> DeviceMoreReadFeatures {
    make(account: account, gate: gate, observationCurrent: { pageCurrent() && owner.featureReadCurrent(handle) })
  }
  private static func make(account: AccountService, gate: NativeDeviceReadGate, observationCurrent: @escaping () -> Bool) -> DeviceMoreReadFeatures {
    let current: () -> MQTTPoolIdentity? = {
      guard account.pendingLogoutCleanupRevision == nil, let session = account.session else { return nil }
      return MQTTPoolIdentity(revision: account.revision, userID: session.userID)
    }
    let gateway = HTTPDeviceAccess(account: account, expiryEncoding: .unknown) // authorize only, never connection()
    return DeviceMoreReadFeatures(currentAccount: current, gateway: gateway,
      repository: { HTTPDeviceMoreReadRepository(account: account, scope: $0) },
      rooms: { HTTPRoomRepository(account: account, expectedRevision: $0.accountRevision, expectedUserID: $0.userID) },
      observationCurrent: observationCurrent, gate: gate)
  }
}

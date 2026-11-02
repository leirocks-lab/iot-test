import Foundation

/// Exact MORE02, self only. No userID/member-removal parameter and no retry loop.
@MainActor final class HTTPSelfUnbindRepository:SelfUnbindRepository {
  let scope:DeviceMoreScope
  private let account:AccountService
  init(account:AccountService,scope:DeviceMoreScope){self.account=account;self.scope=scope}
  private func current() throws {
    try Task.checkCancellation()
    guard account.revision==scope.accountRevision,account.pendingLogoutCleanupRevision==nil,
      account.session.map({selfUnbindEqual($0.userID,scope.userID)})==true,
      [scope.userID,scope.resourceID,scope.productID].allSatisfy(validDeviceMoreID) else{throw RowanFailure(code:499,message:"session_changed")}
  }
  func deleteSelf() async throws {
    try current()
    let allowed=Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    let segment=scope.resourceID.utf8.map {allowed.contains($0) ? String(UnicodeScalar($0)):String(format:"%%%02X",$0)}.joined()
    _ = try await account.request("DELETE","/api/app/devices/"+segment+"/users/self",expectedRevision:scope.accountRevision)
    try current()
  }
  func isOwned() async throws -> Bool {
    try current();let groups=try await HTTPHomeRepository(account:account).loadGroups(expectedRevision:scope.accountRevision);try current()
    return groups.flatMap(\.devices).contains {selfUnbindEqual($0.id,scope.resourceID)}
  }
}

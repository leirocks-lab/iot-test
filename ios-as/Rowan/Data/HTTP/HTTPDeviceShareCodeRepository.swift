import Foundation

/// SHARE-01 generates a credential despite using GET. No automatic renewal/replay.
/// Scope must be supplied by fresh native ownership authorization, never JavaScript IDs.
@MainActor final class HTTPDeviceShareCodeRepository:DeviceShareCodeRepository {
  let scope:DeviceMoreScope
  private let account:AccountService
  init(account:AccountService,scope:DeviceMoreScope){self.account=account;self.scope=scope}
  private func current() throws {
    try Task.checkCancellation()
    guard account.revision==scope.accountRevision,account.pendingLogoutCleanupRevision==nil,
      account.session.map({$0.userID.utf8.elementsEqual(scope.userID.utf8)})==true,
      [scope.userID,scope.resourceID,scope.productID].allSatisfy(validDeviceMoreID)
      else {throw RowanFailure(code:499,message:"session_changed")}
  }
  func generate() async throws -> DeviceShareCode {
    try current()
    let allowed=Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    let segment=scope.resourceID.utf8.map{allowed.contains($0) ? String(UnicodeScalar($0)):String(format:"%%%02X",$0)}.joined()
    let raw=try await account.request("GET","/api/app/devices/"+segment+"/bindCode",expectedRevision:scope.accountRevision,allowReadReplay:false)
    try current()
    guard let data=raw as? [String:Any],let device=data["deviceID"] as? String,
      device.utf8.elementsEqual(scope.resourceID.utf8),let code=data["bindCode"] as? String,!code.isEmpty
      else {throw RowanFailure(code:502,message:"invalid_share_code")}
    return DeviceShareCode(bindCode:code)
  }
}

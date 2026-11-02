import Foundation

@MainActor
final class HTTPNicknameRepository: NicknameRepository {
  let scope: DeviceMoreScope
  private let account: AccountService
  init(account: AccountService, scope: DeviceMoreScope) { self.account = account; self.scope = scope }
  private func requireCurrent() throws {
    try Task.checkCancellation()
    guard scope.accountRevision >= 0, [scope.resourceID, scope.productID, scope.userID].allSatisfy(validDeviceMoreID),
          account.revision == scope.accountRevision, account.pendingLogoutCleanupRevision == nil,
          let user = account.session?.userID, nicknameEqual(user, scope.userID) else {
      throw RowanFailure(code: 499, message: "session_changed")
    }
  }
  private func path() -> String {
    let allowed = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    let segment = scope.resourceID.utf8.map { allowed.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
    return "/api/app/devices/" + segment
  }
  func patch(nickname: String) async throws {
    try requireCurrent()
    _ = try await account.request("PATCH", path(), body: ["nickname": nickname], expectedRevision: scope.accountRevision)
    try requireCurrent() // Common success has no required data object. AccountService never replays PATCH401.
  }
  func readNickname() async throws -> String? {
    try requireCurrent()
    let response = try await account.request("GET", path(), expectedRevision: scope.accountRevision)
    try requireCurrent()
    guard let data = response as? [String: Any], let device = data["device"] as? [String: Any], let product = data["product"] as? [String: Any],
          let deviceID = device["id"] as? String, nicknameEqual(deviceID, scope.resourceID),
          let productID = product["id"] as? String, nicknameEqual(productID, scope.productID) else {
      throw RowanFailure(code: 502, message: "invalid_snapshot")
    }
    return data["deviceNickname"] as? String // no product-name fallback or canonical Unicode folding
  }
}


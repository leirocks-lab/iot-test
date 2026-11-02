import Foundation

/// Captured account identity only; no token cache or local preferences/login state.
@MainActor
final class HTTPPreferencesRepository: PreferencesRepository {
  private let account: AccountService
  let expectedRevision: Int
  private let userID: String?
  private let initiallyPendingCleanup: Bool
  private let path = "/api/app/user/setting"
  init(account: AccountService) {
    self.account = account; expectedRevision = account.revision; userID = account.session?.userID
    initiallyPendingCleanup = account.pendingLogoutCleanupRevision != nil
  }
  private func requireCurrent() throws {
    try Task.checkCancellation()
    guard let userID, !initiallyPendingCleanup, account.pendingLogoutCleanupRevision == nil,
          account.revision == expectedRevision, account.session?.userID == userID else { throw RowanFailure(code: 499, message: "登录会话已变化") }
  }
  private func request(_ method: String, body: [String: Any]? = nil) async throws -> Any {
    try requireCurrent()
    let result = try await account.request(method, path, body: body, expectedRevision: expectedRevision)
    try requireCurrent(); return result
  }
  func load() async throws -> UserPreferences {
    // Native HTTPGateway already unwraps the common envelope. Empty {} is valid data.
    let data = try await request("GET")
    guard let object = data as? [String: Any], JSONSerialization.isValidJSONObject(object) else { throw RowanFailure(code: 502, message: "用户设置响应格式错误") }
    let raw = String(decoding: try JSONSerialization.data(withJSONObject: object), as: UTF8.self)
    let result = try UserPreferences.decode(raw)
    try requireCurrent(); return result
  }
  func patch(_ patch: PreferencesPatch) async throws { _ = try await request("PATCH", body: patch.body()) }
}

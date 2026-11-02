import Foundation

/// V1.4 OTA-01...05. No download, transport, task replay or independent credentials.
@MainActor
final class HTTPOtaRepository: OtaRepository {
  let scope: OtaScope
  private let account: AccountService
  init(account: AccountService, scope: OtaScope) { self.account = account; self.scope = scope }
  private func requireCurrent() throws {
    try Task.checkCancellation()
    guard scope.accountRevision >= 0, validOtaID(scope.userID), account.revision == scope.accountRevision,
          account.pendingLogoutCleanupRevision == nil, account.session.map({ otaTextEqual($0.userID, scope.userID) }) == true else {
      throw RowanFailure(code: 499, message: "登录会话已变化")
    }
  }
  private var base: String { get throws { "/api/app/devices/" + (try Self.segment(scope.resourceID)) + "/ota" } }
  private func request(_ method: String, path: String, body: [String: Any]? = nil) async throws -> Any {
    try requireCurrent()
    let response = try await account.request(method, path, body: body, expectedRevision: scope.accountRevision)
    try requireCurrent(); return response
  }
  func check(_ kind: OtaKind) async throws -> OtaOffer {
    guard let raw = try await request("GET", path: base + "/" + kind.rawValue) as? [String: Any],
          let firmware = raw["firmware"] as? [String: Any], let device = raw["device"] as? [String: Any] else { throw malformed() }
    let id = try text(device, "id"), firmwareID = try text(firmware, "id")
    guard otaTextEqual(id, scope.resourceID), validOtaID(firmwareID) else { throw malformed() }
    let remark: String?
    if firmware["remark"] == nil || firmware["remark"] is NSNull { remark = nil }
    else { guard let value = firmware["remark"] as? String else { throw malformed() }; remark = value }
    return OtaOffer(kind: kind, firmware: OtaFirmware(id: firmwareID, version: try text(firmware, "version"), remark: remark),
      device: OtaDevice(id: id, name: try text(device, "name"), mac: try text(device, "mac")))
  }
  func start(_ kind: OtaKind, firmwareID: String) async throws -> String {
    guard validOtaID(firmwareID) else { throw invalidID() }
    guard let raw = try await request("PUT", path: base + "/task?type=" + kind.rawValue, body: ["firmwareID": firmwareID]) as? [String: Any] else { throw malformed() }
    let task = try text(raw, "taskID"); guard validOtaID(task) else { throw malformed() }; return task
  }
  func query(taskID: String) async throws -> OtaResult {
    guard let raw = try await request("GET", path: base + "/task/" + Self.segment(taskID)) as? [String: Any],
          let value = raw["result"] as? String, let result = OtaResult(rawValue: value) else { throw malformed() }
    return result
  }
  func cancel(taskID: String) async throws {
    guard validOtaID(taskID) else { throw invalidID() }
    _ = try await request("DELETE", path: base + "/task", body: ["taskID": taskID])
  }
  private func text(_ raw: [String: Any], _ key: String) throws -> String {
    guard let value = raw[key] as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw malformed() }; return value
  }
  private func malformed() -> RowanFailure { RowanFailure(code: 502, message: "升级响应格式错误") }
  private func invalidID() -> RowanFailure { RowanFailure(code: 400, message: "升级标识无效") }
  private static func segment(_ value: String) throws -> String {
    guard validOtaID(value) else { throw RowanFailure(code: 400, message: "升级标识无效") }
    let allowed = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    return value.utf8.map { allowed.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
  }
}

import Foundation

@MainActor
final class HTTPDeviceMoreReadRepository: DeviceMoreReadRepository {
  let scope: DeviceMoreScope
  private let account: AccountService
  init(account: AccountService, scope: DeviceMoreScope) { self.account = account; self.scope = scope }
  private func requireCurrent() throws {
    try Task.checkCancellation()
    guard validDeviceMoreID(scope.resourceID), validDeviceMoreID(scope.productID), validDeviceMoreID(scope.userID) else { throw RowanFailure(code: 400, message: "设备标识无效") }
    guard account.revision == scope.accountRevision, account.pendingLogoutCleanupRevision == nil, let session = account.session,
          session.userID.utf8.elementsEqual(scope.userID.utf8) else { throw RowanFailure(code: 499, message: "登录会话已变化") }
  }
  private func request(_ suffix: String) async throws -> Any {
    try requireCurrent()
    let data = try await account.request("GET", "/api/app/devices/" + Self.segment(scope.resourceID) + suffix, expectedRevision: scope.accountRevision)
    try requireCurrent(); return data
  }
  func summary() async throws -> DeviceMoreSummary {
    guard let data = try await request("") as? [String: Any], let device = data["device"] as? [String: Any], let product = data["product"] as? [String: Any],
          let id = device["id"] as? String, id.utf8.elementsEqual(scope.resourceID.utf8),
          let productID = product["id"] as? String, productID.utf8.elementsEqual(scope.productID.utf8) else { throw malformed() }
    return DeviceMoreSummary(deviceNickname: Self.text(data["deviceNickname"]), deviceName: Self.text(device["name"]), productName: Self.text(product["name"]), productCategory: Self.text(product["category"]),
      seriesName: Self.text(product["seriesName"]), modelName: Self.text(product["modelName"]), mcuVersion: Self.text(device["mcuVersion"]), wifiVersion: Self.text(device["wifiVersion"]), bindingRole: Self.role(data["bindingRole"]))
  }
  func members() async throws -> [DeviceMoreMember] {
    guard let rows = try await request("/users") as? [[String: Any]], rows.count <= 10_000 else { throw malformed() }
    var ids = Set<Data>()
    return try rows.map { row in
      guard let id = row["userID"] as? String, validDeviceMoreID(id), ids.insert(Data(id.utf8)).inserted else { throw malformed() }
      return DeviceMoreMember(itemKey: UUID().uuidString, nickname: Self.text(row["nickname"]), bindingRole: Self.role(row["bindingRole"]))
    }
  }
  func help() async throws -> [DeviceMoreHelp] {
    guard let rows = try await request("/helping?type=text") as? [[String: Any]], rows.count <= 10_000 else { throw malformed() }
    var ids = Set<Data>()
    return try rows.map { row in
      guard let id = row["id"] as? String, validDeviceMoreID(id), ids.insert(Data(id.utf8)).inserted else { throw malformed() }
      return DeviceMoreHelp(itemKey: UUID().uuidString, title: Self.text(row["title"]), content: Self.text(row["content"]), createdAt: Self.text(row["createdAt"]))
    }
  }
  private static func text(_ value: Any?) -> String { value as? String ?? "" } // never .description/localized object stringify
  private static func role(_ value: Any?) -> String { guard let role = value as? String, ["sa", "mbr", "obs"].contains(role) else { return "unknown" }; return role }
  private func malformed() -> RowanFailure { RowanFailure(code: 502, message: "设备信息响应格式错误") }
  private static func segment(_ value: String) throws -> String {
    guard validDeviceMoreID(value) else { throw RowanFailure(code: 400, message: "设备标识无效") }
    let allowed = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    return value.utf8.map { allowed.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
  }
}

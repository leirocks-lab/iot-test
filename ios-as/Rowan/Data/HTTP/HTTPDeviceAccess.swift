import Foundation

/// Issued only by native HOME membership plus matching DEVICE-02 identity validation.
/// Temporary metadata; no persistence, signed URL or credential fields.
struct AuthorizedDevice: MQTTRedacted {
  let accountRevision: Int
  let resourceID: String
  let userID: String
  let productID: String
  let category: String
  let title: String
  let bindingRole: String?
  fileprivate init(accountRevision: Int, resourceID: String, userID: String, productID: String, category: String, title: String, bindingRole: String?) {
    self.accountRevision = accountRevision; self.resourceID = resourceID; self.userID = userID
    self.productID = productID; self.category = category; self.title = title; self.bindingRole = bindingRole
  }
}

/// Fixed errors at the credential boundary never carry server messages, credentials or signed URLs.
enum DeviceConnectionFailure: Error, LocalizedError, Equatable {
  case authorization, staleContext, unavailable, configuration, expiredCredentials
  var errorDescription: String? {
    switch self {
    case .authorization: return "无权建立设备连接，请重新核对登录与设备归属"
    case .staleContext: return "账号会话已变化，请重新进入设备"
    case .unavailable: return "设备连接参数暂时不可用，请重试"
    case .configuration: return "设备连接参数不受支持或不完整"
    case .expiredCredentials: return "设备连接凭证已过期，请重新获取"
    }
  }
}

/// Native-only DEVICE-01 entry. No host/brand/token arguments and no broker/connection pool.
@MainActor
protocol NativeDeviceAccessGateway {
  func authorize(resourceID: String, expectedRevision: Int) async throws -> AuthorizedDevice
  func connection(_ device: AuthorizedDevice) async throws -> MQTTConnectionParameters
}

@MainActor
final class HTTPDeviceAccess: NativeDeviceAccessGateway {
  private let account: AccountService
  private let expiryEncoding: ExpiryEncoding
  private let hostPolicy: MQTTTransportHostPolicy
  private let now: () -> Date
  init(account: AccountService, expiryEncoding: ExpiryEncoding, hostPolicy: MQTTTransportHostPolicy = .unknown, now: @escaping () -> Date = Date.init) {
    self.account = account; self.expiryEncoding = expiryEncoding; self.hostPolicy = hostPolicy; self.now = now
  }
  private func requireAccount(_ revision: Int, userID: String? = nil) throws {
    try Task.checkCancellation()
    guard account.revision == revision, account.pendingLogoutCleanupRevision == nil, let session = account.session,
          userID.map({ session.userID.utf8.elementsEqual($0.utf8) }) ?? true else { throw RowanFailure(code: 499, message: "会话已变化") }
  }

  func authorize(resourceID: String, expectedRevision: Int) async throws -> AuthorizedDevice {
    try requireAccount(expectedRevision)
    guard Self.valid(resourceID), resourceID != ".", resourceID != ".." else { throw RowanFailure(code: 400, message: "设备标识无效") }
    guard let started = account.session else { throw RowanFailure(code: 499, message: "会话已变化") }
    let groups = try await account.request("GET", "/api/app/devices", expectedRevision: expectedRevision)
    try requireAccount(expectedRevision, userID: started.userID)
    let membership = try Self.membership(groups, resourceID: resourceID)
    guard membership.owned else { throw RowanFailure(code: 403, message: "无权访问该设备") }
    let response = try await account.request("GET", "/api/app/devices/" + Self.segment(resourceID), expectedRevision: expectedRevision)
    try requireAccount(expectedRevision, userID: started.userID)
    guard let detail = response as? [String: Any], let device = detail["device"] as? [String: Any],
          let detailID = device["id"] as? String, detailID.utf8.elementsEqual(resourceID.utf8), let product = detail["product"] as? [String: Any] else { throw Self.invalidDetail() }
    let productID = try Self.required(product, "id"), category = try Self.required(product, "category")
    return AuthorizedDevice(accountRevision: expectedRevision, resourceID: resourceID, userID: started.userID,
      productID: productID, category: category, title: Self.optional(detail, "deviceNickname") ?? membership.title ?? "设备",
      bindingRole: Self.optional(detail, "bindingRole"))
  }

  func connection(_ device: AuthorizedDevice) async throws -> MQTTConnectionParameters {
    do {
      try requireAccount(device.accountRevision, userID: device.userID)
      let canonicalHost = try hostPolicy.canonicalHost()
      let raw = try await account.request("GET", "/api/app/devices/" + Self.segment(device.resourceID) + "/mqtt", expectedRevision: device.accountRevision)
      try requireAccount(device.accountRevision, userID: device.userID)
      let credentials = try MQTTCredentials.decode(raw, resourceID: device.resourceID, expiryEncoding: expiryEncoding)
      // Trust only this exact authenticated DEVICE-01 target after native HOME/DEVICE-02 validation.
      // An AWS-looking hostname or a URL supplied by RN alone can never produce this policy.
      let policy: MQTTEndpointPolicy
      switch credentials.authentication {
      case .awsSTS: policy = try MQTTEndpointPolicy(trustedSTSEndpoints: [credentials.target.hostname])
      case .usernamePassword: policy = try MQTTEndpointPolicy(trustedPlainTargets: [credentials.target])
      }
      let prepared = try AWSIoTWebSocketSigner.prepare(credentials, policy: policy, canonicalHost: canonicalHost, now: now())
      try requireAccount(device.accountRevision, userID: device.userID)
      return prepared
    } catch is CancellationError { throw CancellationError() }
    catch let error as RowanFailure {
      switch error.code {
      case 401, 403, 1332: throw DeviceConnectionFailure.authorization
      case 499: throw DeviceConnectionFailure.staleContext
      case 0, 408, 500...599: throw DeviceConnectionFailure.unavailable
      default: throw DeviceConnectionFailure.configuration
      }
    } catch let error as MQTTCredentialFailure {
      switch error {
      case .expired: throw DeviceConnectionFailure.expiredCredentials
      default: throw DeviceConnectionFailure.configuration
      }
    } catch is URLError { throw DeviceConnectionFailure.unavailable }
    catch { throw DeviceConnectionFailure.configuration }
  }

  private static func membership(_ raw: Any, resourceID: String) throws -> (owned: Bool, title: String?) {
    guard let groups = raw as? [[String: Any]], groups.count <= 1000 else { throw invalidDetail() }
    var owned = false
    var title: String? = nil
    for group in groups {
      guard let devices = group["devices"] as? [[String: Any]], devices.count <= 10_000 else { throw invalidDetail() }
      for item in devices {
        guard let device = item["device"] as? [String: Any] else { throw invalidDetail() }
        let id = try required(device, "id")
        if id.utf8.elementsEqual(resourceID.utf8) { owned = true; title = optional(item, "deviceNickname") }
      }
    }
    return (owned, title)
  }
  private static func segment(_ value: String) -> String {
    let allowed = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    return value.utf8.map { allowed.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
  }
  private static func valid(_ value: String) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.rangeOfCharacter(from: .controlCharacters) == nil }
  private static func required(_ value: [String: Any], _ key: String) throws -> String { guard let result = optional(value, key) else { throw invalidDetail() }; return result }
  private static func optional(_ value: [String: Any], _ key: String) -> String? { (value[key] as? String).flatMap { valid($0) ? $0 : nil } }
  private static func invalidDetail() -> RowanFailure { RowanFailure(code: 502, message: "设备详情或产品标识不完整") }
}

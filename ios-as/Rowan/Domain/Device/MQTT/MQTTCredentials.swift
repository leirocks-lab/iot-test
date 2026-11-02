import Foundation
import CoreFoundation

/// Prevent accidental diagnostic/reflection output. Deliberate transport access stays explicit.
protocol MQTTRedacted: CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable { }
extension MQTTRedacted {
  var description: String { "\(String(describing: Self.self))(redacted)" }
  var debugDescription: String { description }
  var customMirror: Mirror { Mirror(self, children: ["redacted": true], displayStyle: .struct) }
}

enum MQTTCredentialFailure: Error, LocalizedError {
  case invalidResponse, invalidTarget, conflictingTarget, invalidSessionToken, invalidExpiry
  case untrustedTarget, unsupportedSTSTarget, invalidTime, expired, invalidLifetime
  var errorDescription: String? {
    switch self {
    case .invalidResponse: return "MQTT连接参数格式无效"
    case .invalidTarget: return "MQTT安全连接目标格式无效"
    case .conflictingTarget: return "MQTT连接目标字段不一致"
    case .invalidSessionToken: return "MQTT临时认证参数无效"
    case .invalidExpiry: return "MQTT有效期与显式编码不一致"
    case .untrustedTarget: return "MQTT连接目标未经信任策略授权"
    case .unsupportedSTSTarget: return "MQTT临时认证目标不受支持"
    case .invalidTime: return "MQTT签名时间无效"
    case .expired: return "MQTT凭证已过期，请重新获取"
    case .invalidLifetime: return "MQTT签名有效时长无效"
    }
  }
}

struct MQTTSecret: MQTTRedacted {
  private let storage: String
  init(_ value: String) throws {
    guard !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          value.rangeOfCharacter(from: .controlCharacters) == nil else { throw MQTTCredentialFailure.invalidResponse }
    storage = value
  }
  func withValue<T>(_ use: (String) throws -> T) rethrows -> T { try use(storage) }
}

enum ExpiryEncoding: Equatable { case epochMillis, epochSeconds, iso8601, unknown }
enum MQTTCredentialExpiry: Equatable {
  case absent, unknown, known(Date, ExpiryEncoding)
  static func decode(_ raw: Any?, supplied: Bool, encoding: ExpiryEncoding) throws -> MQTTCredentialExpiry {
    guard supplied else { return .absent }
    switch encoding {
    case .unknown:
      if let value = raw as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID(), value.doubleValue.isFinite { return .unknown }
      if let value = raw as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return .unknown }
      throw MQTTCredentialFailure.invalidExpiry
    case .epochMillis, .epochSeconds:
      guard let value = raw as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID(), value.doubleValue.isFinite, value.doubleValue > 0 else {
        throw MQTTCredentialFailure.invalidExpiry
      }
      let seconds = encoding == .epochMillis ? value.doubleValue / 1000 : value.doubleValue
      let date = Date(timeIntervalSince1970: seconds)
      guard date.timeIntervalSince1970.isFinite else { throw MQTTCredentialFailure.invalidExpiry }
      return .known(date, encoding)
    case .iso8601:
      guard let value = raw as? String,
            value.range(of: "\\A[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})\\z", options: .regularExpression) != nil else {
        throw MQTTCredentialFailure.invalidExpiry
      }
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      var date = formatter.date(from: value)
      if date == nil { formatter.formatOptions = [.withInternetDateTime]; date = formatter.date(from: value) }
      guard let date else { throw MQTTCredentialFailure.invalidExpiry }
      return .known(date, encoding)
    }
  }
}

/// A WSS target, not a signed URL. Only the default TLS port is currently supported.
struct MQTTTarget: Hashable, MQTTRedacted {
  let hostname: String
  let path: String
  init(hostURL: String, endpoint: String, path: String) throws {
    guard let value = URLComponents(string: hostURL), value.scheme?.lowercased() == "wss",
          let hostname = value.host?.lowercased(), Self.validHostname(hostname), value.port == nil || value.port == 443,
          value.user == nil, value.password == nil, value.fragment == nil, value.percentEncodedQuery == nil,
          path.range(of: "\\A/[A-Za-z0-9._~/-]*\\z", options: .regularExpression) != nil,
          !path.contains("//"), !path.split(separator: "/").contains(where: { $0 == "." || $0 == ".." }) else {
      throw MQTTCredentialFailure.invalidTarget
    }
    guard let scheme = hostURL.range(of: "://") else { throw MQTTCredentialFailure.invalidTarget }
    let authority = String(hostURL[scheme.upperBound...].prefix { !"/?#".contains($0) }).lowercased()
    guard authority == hostname || authority == hostname + ":443" else { throw MQTTCredentialFailure.invalidTarget }
    guard Self.validHostname(endpoint.lowercased()), endpoint.lowercased() == hostname,
          value.percentEncodedPath == path else { throw MQTTCredentialFailure.conflictingTarget }
    self.hostname = hostname; self.path = path
  }
  static func validHostname(_ value: String) -> Bool {
    value.utf8.count <= 253 && value.range(of: "\\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+\\z", options: .regularExpression) != nil &&
      value.split(separator: ".").allSatisfy { $0.utf8.count <= 63 }
  }
  var awsRegion: String? {
    let pattern = "\\A[a-z0-9-]+\\.iot\\.([a-z]{2}(?:-[a-z]+)+-[0-9]+)\\.amazonaws\\.com(?:\\.cn)?\\z"
    guard let regex = try? NSRegularExpression(pattern: pattern),
          let match = regex.firstMatch(in: hostname, range: NSRange(hostname.startIndex..., in: hostname)),
          let range = Range(match.range(at: 1), in: hostname) else { return nil }
    return String(hostname[range])
  }
}

enum MQTTAuthentication: MQTTRedacted {
  case usernamePassword(username: MQTTSecret, password: MQTTSecret)
  case awsSTS(accessKeyID: MQTTSecret, secretAccessKey: MQTTSecret, sessionToken: MQTTSecret)
}

/// Temporary memory-only DEVICE-01 material. Intentionally no Codable or persistence interface.
struct MQTTCredentials: MQTTRedacted {
  let resourceID: String
  let thingRef: String
  let clientID: String
  let target: MQTTTarget
  let authentication: MQTTAuthentication
  let expiry: MQTTCredentialExpiry

  static func decode(_ raw: Any, resourceID: String, expiryEncoding: ExpiryEncoding) throws -> MQTTCredentials {
    guard let body = raw as? [String: Any], validIdentifier(resourceID) else { throw MQTTCredentialFailure.invalidResponse }
    func text(_ key: String) throws -> String {
      guard let value = body[key] as? String, validIdentifier(value) else { throw MQTTCredentialFailure.invalidResponse }
      return value
    }
    let host = try text("host"), endpoint = try text("endpoint"), path = try text("path")
    let clientID = try text("clientID"), thing = try text("deviceID")
    guard thing.rangeOfCharacter(from: CharacterSet(charactersIn: "/+#\0")) == nil else { throw MQTTCredentialFailure.invalidResponse }
    let username = try MQTTSecret(text("username")), password = try MQTTSecret(text("password"))
    let authentication: MQTTAuthentication
    if body.keys.contains("sessionToken") {
      guard let value = body["sessionToken"] as? String,
            !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            value.rangeOfCharacter(from: .controlCharacters) == nil else { throw MQTTCredentialFailure.invalidSessionToken }
      authentication = .awsSTS(accessKeyID: username, secretAccessKey: password, sessionToken: try MQTTSecret(value))
    } else { authentication = .usernamePassword(username: username, password: password) }
    let expiry = try MQTTCredentialExpiry.decode(body["expiresAt"], supplied: body.keys.contains("expiresAt"), encoding: expiryEncoding)
    return try MQTTCredentials(resourceID: resourceID, thingRef: thing, clientID: clientID,
      target: MQTTTarget(hostURL: host, endpoint: endpoint, path: path), authentication: authentication, expiry: expiry)
  }
  private static func validIdentifier(_ value: String) -> Bool {
    !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.rangeOfCharacter(from: .controlCharacters) == nil
  }
}

/// Exact native trust configuration; a syntactically AWS-looking credential host is not enough.
struct MQTTEndpointPolicy {
  let trustedSTSEndpoints: Set<String>
  let trustedPlainTargets: Set<MQTTTarget>
  init(trustedSTSEndpoints: Set<String> = [], trustedPlainTargets: Set<MQTTTarget> = []) throws {
    let hosts = Set(trustedSTSEndpoints.map { $0.lowercased() })
    guard hosts.allSatisfy({ MQTTTarget.validHostname($0) }) else { throw MQTTCredentialFailure.invalidTarget }
    self.trustedSTSEndpoints = hosts; self.trustedPlainTargets = trustedPlainTargets
  }
}

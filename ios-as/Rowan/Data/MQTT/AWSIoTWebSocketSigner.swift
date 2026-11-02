import Foundation
import CryptoKit

/// The transport must use this exact Host/:authority form during the WSS upgrade.
enum MQTTCanonicalHost: Equatable { case hostnameOnly, hostnameAndDefaultPort }
enum MQTTConnectAuthentication: MQTTRedacted {
  case none, usernamePassword(username: MQTTSecret, password: MQTTSecret)
}

struct MQTTConnectionParameters: MQTTRedacted {
  let resourceID: String
  let thingRef: String
  let clientID: String
  let authentication: MQTTConnectAuthentication
  let httpHostHeader: String
  let credentialExpiry: MQTTCredentialExpiry
  /// SigV4 URL lifetime only, not a promise that STS credentials live this long.
  let signedRequestExpiresAt: Date?
  private let url: URL

  init(resourceID: String, thingRef: String, clientID: String, authentication: MQTTConnectAuthentication,
       httpHostHeader: String, credentialExpiry: MQTTCredentialExpiry, signedRequestExpiresAt: Date?, url: URL) {
    self.resourceID = resourceID; self.thingRef = thingRef; self.clientID = clientID; self.authentication = authentication
    self.httpHostHeader = httpHostHeader; self.credentialExpiry = credentialExpiry
    self.signedRequestExpiresAt = signedRequestExpiresAt; self.url = url
  }
  /// Signed URLs must go directly to the transport, never a log or a persistent DTO.
  func withURL<T>(_ use: (URL) throws -> T) rethrows -> T { try use(url) }
}

/// Fresh per-call signature, no URL/key cache, connection/retry loop, HTTP or broker SDK.
enum AWSIoTWebSocketSigner {
  static func prepare(_ credentials: MQTTCredentials, policy: MQTTEndpointPolicy,
                      canonicalHost: MQTTCanonicalHost, now: Date = Date(), lifetimeSeconds: Int = 900) throws -> MQTTConnectionParameters {
    guard now.timeIntervalSince1970.isFinite, (-62_135_596_800...253_402_300_799).contains(now.timeIntervalSince1970) else {
      throw MQTTCredentialFailure.invalidTime
    }
    guard (1...900).contains(lifetimeSeconds) else { throw MQTTCredentialFailure.invalidLifetime }
    let signingTime = Date(timeIntervalSince1970: floor(now.timeIntervalSince1970))
    var lifetime = lifetimeSeconds
    if case let .known(deadline, _) = credentials.expiry {
      guard deadline > now else { throw MQTTCredentialFailure.expired }
      let remaining = floor(deadline.timeIntervalSince(signingTime))
      if remaining < Double(lifetime) { lifetime = Int(remaining) }
      guard lifetime > 0 else { throw MQTTCredentialFailure.expired }
    }
    let target = credentials.target
    let authority = target.hostname + (canonicalHost == .hostnameAndDefaultPort ? ":443" : "")
    let url: URL
    let authentication: MQTTConnectAuthentication
    let requestExpiry: Date?
    switch credentials.authentication {
    case let .usernamePassword(username, password):
      guard policy.trustedPlainTargets.contains(target) else { throw MQTTCredentialFailure.untrustedTarget }
      guard let value = URL(string: "wss://\(authority)\(target.path)") else { throw MQTTCredentialFailure.invalidTarget }
      url = value; authentication = .usernamePassword(username: username, password: password); requestExpiry = nil
    case let .awsSTS(accessKeyID, secretAccessKey, token):
      guard policy.trustedSTSEndpoints.contains(target.hostname) else { throw MQTTCredentialFailure.untrustedTarget }
      guard target.path == "/mqtt", let region = target.awsRegion else { throw MQTTCredentialFailure.unsupportedSTSTarget }
      let formatter = DateFormatter()
      formatter.locale = Locale(identifier: "en_US_POSIX")
      formatter.calendar = Calendar(identifier: .gregorian)
      formatter.timeZone = TimeZone(secondsFromGMT: 0)
      formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
      let time = formatter.string(from: signingTime)
      guard time.range(of: "\\A[0-9]{8}T[0-9]{6}Z\\z", options: .regularExpression) != nil else { throw MQTTCredentialFailure.invalidTime }
      let date = String(time.prefix(8)), scope = "\(time.prefix(8))/\(region)/iotdevicegateway/aws4_request"
      let credential = accessKeyID.withValue { "\($0)/\(scope)" }
      let parameters = [("X-Amz-Algorithm", "AWS4-HMAC-SHA256"), ("X-Amz-Credential", credential),
        ("X-Amz-Date", time), ("X-Amz-Expires", String(lifetime)), ("X-Amz-SignedHeaders", "host")]
      let encoded = parameters.map { (encode($0.0), encode($0.1)) }.sorted { $0.0 == $1.0 ? $0.1 < $1.1 : $0.0 < $1.0 }
      let query = encoded.map { "\($0.0)=\($0.1)" }.joined(separator: "&")
      let canonical = ["GET", "/mqtt", query, "host:\(authority)\n", "host", hash(Data())].joined(separator: "\n")
      let stringToSign = ["AWS4-HMAC-SHA256", time, scope, hash(Data(canonical.utf8))].joined(separator: "\n")
      let signature = secretAccessKey.withValue { secret -> String in
        var key = mac(key: Data(("AWS4" + secret).utf8), value: date)
        for part in [region, "iotdevicegateway", "aws4_request"] { key = mac(key: key, value: part) }
        return hex(mac(key: key, value: stringToSign))
      }
      // AWS IoT specifically omits STS token from the canonical query and appends it after signing.
      let encodedToken = token.withValue(encode)
      guard let value = URL(string: "wss://\(authority)/mqtt?\(query)&X-Amz-Signature=\(signature)&X-Amz-Security-Token=\(encodedToken)") else {
        throw MQTTCredentialFailure.invalidTarget
      }
      url = value; authentication = .none
      requestExpiry = signingTime.addingTimeInterval(TimeInterval(lifetime))
    }
    return MQTTConnectionParameters(resourceID: credentials.resourceID, thingRef: credentials.thingRef,
      clientID: credentials.clientID, authentication: authentication, httpHostHeader: authority,
      credentialExpiry: credentials.expiry, signedRequestExpiresAt: requestExpiry, url: url)
  }

  private static func encode(_ value: String) -> String {
    let unreserved = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    return value.utf8.map { unreserved.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
  }
  private static func hash(_ data: Data) -> String { hex(Data(SHA256.hash(data: data))) }
  private static func mac(key: Data, value: String) -> Data {
    Data(HMAC<SHA256>.authenticationCode(for: Data(value.utf8), using: SymmetricKey(data: key)))
  }
  private static func hex(_ data: Data) -> String { data.map { String(format: "%02x", $0) }.joined() }
}

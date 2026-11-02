import XCTest
@testable import Rowan

/// Public fixtures only; never calls DEVICE-01, a broker or the legacy test harness.
final class MQTTCredentialsTests: XCTestCase {
  private let endpoint = "example-ats.iot.ap-southeast-2.amazonaws.com"
  private let secret = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY"
  private var fixture: [String: Any] {
    ["host": "wss://\(endpoint)/mqtt", "endpoint": endpoint, "path": "/mqtt", "clientID": "app-test",
     "username": "AKIDEXAMPLE", "password": secret, "deviceID": "dev_test", "sessionToken": "fixture+/=token"]
  }
  private func decode(_ raw: [String: Any]? = nil, expiry: ExpiryEncoding = .unknown) throws -> MQTTCredentials {
    try MQTTCredentials.decode(raw ?? fixture, resourceID: "http-resource/42", expiryEncoding: expiry)
  }
  private func clock() throws -> Date { try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-22T01:02:03Z")) }
  private func parameters(_ raw: [String: Any]? = nil, time: Date? = nil, host: MQTTCanonicalHost = .hostnameOnly,
                          expiry: ExpiryEncoding = .unknown) throws -> MQTTConnectionParameters {
    try AWSIoTWebSocketSigner.prepare(decode(raw, expiry: expiry), policy: MQTTEndpointPolicy(trustedSTSEndpoints: [endpoint]),
                                     canonicalHost: host, now: time ?? clock())
  }
  private func query(_ value: MQTTConnectionParameters) throws -> [String: String] {
    let components = try XCTUnwrap(value.withURL { URLComponents(url: $0, resolvingAgainstBaseURL: false) })
    return Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value ?? "") })
  }

  func testDistinctHTTPResourceAndThingReferenceAndUnmodifiedClientID() throws {
    let value = try decode()
    XCTAssertEqual(value.resourceID, "http-resource/42")
    XCTAssertEqual(value.thingRef, "dev_test")
    XCTAssertNotEqual(value.resourceID, value.thingRef)
    XCTAssertEqual(value.clientID, "app-test")
    XCTAssertEqual(value.expiry, .absent)
  }
  func testExplicitMillisEncodingDoesNotGuessSecondsFromMagnitude() throws {
    var raw = fixture; raw["expiresAt"] = 1_700_000_000_000.0
    guard case let .known(value, encoding) = try decode(raw, expiry: .epochMillis).expiry else { XCTFail("Missing explicit date"); return }
    XCTAssertEqual(value.timeIntervalSince1970, 1_700_000_000)
    XCTAssertEqual(encoding, .epochMillis)
  }
  func testExplicitSecondsEncodingIsUsedEvenForLargeNumber() throws {
    var raw = fixture; raw["expiresAt"] = 1_700_000_000_000.0
    guard case let .known(value, encoding) = try decode(raw, expiry: .epochSeconds).expiry else { XCTFail("Missing explicit date"); return }
    XCTAssertEqual(value.timeIntervalSince1970, 1_700_000_000_000)
    XCTAssertEqual(encoding, .epochSeconds)
  }
  func testUnknownEncodingNeverProducesInferredDeadline() throws {
    for value in [1.0, 1_700_000_000_000.0] {
      var raw = fixture; raw["expiresAt"] = value
      XCTAssertEqual(try decode(raw, expiry: .unknown).expiry, .unknown)
    }
    let value = try parameters()
    XCTAssertEqual(value.credentialExpiry, .absent)
    XCTAssertNotNil(value.signedRequestExpiresAt) // URL lifetime is a different concept.
  }
  func testISOEncodingRequiresExplicitTimezoneAndActualString() throws {
    var raw = fixture; raw["expiresAt"] = "2026-10-22T01:02:03Z"
    guard case let .known(value, encoding) = try decode(raw, expiry: .iso8601).expiry else { XCTFail("Missing date"); return }
    XCTAssertEqual(value, try clock()); XCTAssertEqual(encoding, .iso8601)
    raw["expiresAt"] = "2026-10-22T01:02:03"
    XCTAssertThrowsError(try decode(raw, expiry: .iso8601))
  }
  func testExpiryTypeMismatchNullBooleanAndNonFiniteAreRejected() throws {
    var raw = fixture
    let invalid: [Any] = [NSNull(), true, Double.infinity, "2026-10-22T01:02:03Z"]
    for value in invalid {
      raw["expiresAt"] = value
      XCTAssertThrowsError(try decode(raw, expiry: .epochMillis))
    }
    raw["expiresAt"] = 1_700_000_000
    XCTAssertThrowsError(try decode(raw, expiry: .iso8601))
  }
  func testPresentInvalidSessionTokenCannotFallBackToPasswordAuthentication() throws {
    let invalid: [Any] = ["", "  ", NSNull(), 123, true, ["unexpected"]]
    for value in invalid {
      var raw = fixture; raw["sessionToken"] = value
      XCTAssertThrowsError(try decode(raw)) { error in
        guard case MQTTCredentialFailure.invalidSessionToken = error else { XCTFail("Wrong failure"); return }
      }
    }
  }
  func testRequiredFieldsAreNotCoercedOrClientIDsInvented() throws {
    for key in ["host", "endpoint", "path", "clientID", "username", "password", "deviceID"] {
      var raw = fixture; raw[key] = 123
      XCTAssertThrowsError(try decode(raw))
      raw[key] = ""
      XCTAssertThrowsError(try decode(raw))
    }
  }
  func testHostEndpointAndPathConflictsAreRejectedInsteadOfFilled() throws {
    for (key, value) in [("endpoint", "other.iot.ap-southeast-2.amazonaws.com"), ("endpoint", "\(endpoint):443"), ("path", "/other")] {
      var raw = fixture; raw[key] = value
      XCTAssertThrowsError(try decode(raw))
    }
  }
  func testSchemeQueryFragmentUserInfoPortsAndEncodedAuthorityAreRejected() throws {
    let hosts = ["ws://\(endpoint)/mqtt", "wss://user@\(endpoint)/mqtt", "wss://\(endpoint)/mqtt#fragment",
      "wss://\(endpoint)/mqtt?", "wss://\(endpoint)/mqtt?X-Amz-Signature=unexpected", "wss://\(endpoint):8443/mqtt",
      "wss://\(endpoint):/mqtt", "wss://\(endpoint):0443/mqtt", "wss://%65xample-ats.iot.ap-southeast-2.amazonaws.com/mqtt"]
    for host in hosts { var raw = fixture; raw["host"] = host; XCTAssertThrowsError(try decode(raw)) }
  }
  func testAWSLookingHostStillRequiresAnExactTrustedEndpoint() throws {
    var raw = fixture
    let foreign = "foreign-ats.iot.ap-southeast-2.amazonaws.com"
    raw["host"] = "wss://\(foreign)/mqtt"; raw["endpoint"] = foreign
    XCTAssertThrowsError(try parameters(raw))
    XCTAssertThrowsError(try AWSIoTWebSocketSigner.prepare(decode(), policy: MQTTEndpointPolicy(), canonicalHost: .hostnameOnly, now: clock()))
  }
  func testEvenExplicitAllowlistCannotTurnAWSLookalikeIntoSTSHost() throws {
    let foreign = endpoint + ".attacker.test"
    var raw = fixture; raw["host"] = "wss://\(foreign)/mqtt"; raw["endpoint"] = foreign
    XCTAssertThrowsError(try AWSIoTWebSocketSigner.prepare(decode(raw), policy: MQTTEndpointPolicy(trustedSTSEndpoints: [foreign]), canonicalHost: .hostnameOnly, now: clock()))
  }
  func testAbsentTokenUsesOnlyExplicitlyTrustedPlainWSSConnectAuthentication() throws {
    var raw = fixture; raw.removeValue(forKey: "sessionToken")
    raw["host"] = "wss://mqtt.example.test/mqtt"; raw["endpoint"] = "mqtt.example.test"
    let credentials = try decode(raw)
    let policy = try MQTTEndpointPolicy(trustedPlainTargets: [credentials.target])
    let result = try AWSIoTWebSocketSigner.prepare(credentials, policy: policy, canonicalHost: .hostnameOnly, now: clock())
    guard case let .usernamePassword(username, password) = result.authentication else { XCTFail("Plain auth missing"); return }
    XCTAssertEqual(username.withValue { $0 }, "AKIDEXAMPLE")
    XCTAssertEqual(password.withValue { $0 }, secret)
    XCTAssertNil(result.signedRequestExpiresAt)
    XCTAssertNil(result.withURL { $0.query })
    XCTAssertThrowsError(try AWSIoTWebSocketSigner.prepare(credentials, policy: MQTTEndpointPolicy(), canonicalHost: .hostnameOnly, now: clock()))
  }
  func testPublicNodeFixtureMatchesSignatureAndSTSDoesNotEnterMQTTConnect() throws {
    let result = try parameters(), values = try query(result)
    XCTAssertEqual(values["X-Amz-Signature"], "1bb6fc1e00f9317a345bfffa3fc27bda14c615a9de3ccaa18f1fb99a287b3588")
    XCTAssertEqual(values["X-Amz-Credential"], "AKIDEXAMPLE/20261022/ap-southeast-2/iotdevicegateway/aws4_request")
    XCTAssertEqual(values["X-Amz-Date"], "20261022T010203Z")
    XCTAssertEqual(values["X-Amz-Expires"], "900")
    XCTAssertEqual(values["X-Amz-Security-Token"], "fixture+/=token")
    guard case .none = result.authentication else { XCTFail("STS key must not enter CONNECT"); return }
    XCTAssertFalse(result.withURL { $0.absoluteString.contains(secret) })
  }
  func testExplicitDefaultPortAuthorityMatchesIndependentPublicFixture() throws {
    let result = try parameters(host: .hostnameAndDefaultPort)
    XCTAssertEqual(result.httpHostHeader, endpoint + ":443")
    XCTAssertEqual(result.withURL { $0.port }, 443)
    XCTAssertEqual(try query(result)["X-Amz-Signature"], "872790fdb74959803525eaabc7ba186bae286909fcc980175130948ca66de47f")
  }
  func testTokenIsAppendedAfterSigningAndReservedBytesAreEncoded() throws {
    let first = try parameters()
    var raw = fixture; raw["sessionToken"] = "different-token"
    let second = try parameters(raw)
    XCTAssertEqual(try query(first)["X-Amz-Signature"], try query(second)["X-Amz-Signature"])
    let text = first.withURL { $0.absoluteString }
    XCTAssertTrue(text.contains("fixture%2B%2F%3Dtoken"))
    let signature = try XCTUnwrap(text.range(of: "X-Amz-Signature="))
    let token = try XCTUnwrap(text.range(of: "X-Amz-Security-Token="))
    XCTAssertLessThan(signature.lowerBound, token.lowerBound)
  }
  func testEveryAttemptUsesSuppliedFreshTimeWithoutSignedURLCache() throws {
    let first = try parameters(), next = try parameters(time: clock().addingTimeInterval(1))
    XCTAssertNotEqual(try query(first)["X-Amz-Date"], try query(next)["X-Amz-Date"])
    XCTAssertNotEqual(try query(first)["X-Amz-Signature"], try query(next)["X-Amz-Signature"])
  }
  func testKnownDeadlineCapsURLLifetimeAndExpiredCredentialsAreRejected() throws {
    let now = try clock()
    var raw = fixture; raw["expiresAt"] = now.addingTimeInterval(120).timeIntervalSince1970
    let result = try parameters(raw, time: now, expiry: .epochSeconds)
    XCTAssertEqual(try query(result)["X-Amz-Expires"], "120")
    raw["expiresAt"] = now.timeIntervalSince1970
    XCTAssertThrowsError(try parameters(raw, time: now, expiry: .epochSeconds))
  }
  func testInvalidClockAndLifetimeFailWithoutRawConfigurationInErrors() throws {
    let credentials = try decode(), policy = try MQTTEndpointPolicy(trustedSTSEndpoints: [endpoint])
    for duration in [0, -1, 901] {
      XCTAssertThrowsError(try AWSIoTWebSocketSigner.prepare(credentials, policy: policy, canonicalHost: .hostnameOnly, now: clock(), lifetimeSeconds: duration))
    }
    XCTAssertThrowsError(try parameters(time: Date(timeIntervalSince1970: .nan)))
  }
  func testDescriptionsDebugReflectionAndErrorsNeverIncludeSecretsOrURLs() throws {
    let credentials = try decode(), result = try parameters(), value = try MQTTSecret(secret)
    let values: [Any] = [credentials, credentials.authentication, result, value]
    for item in values {
      let text = String(describing: item) + String(reflecting: item)
      for sensitive in [secret, "fixture+/=token", "AKIDEXAMPLE", "wss://", "X-Amz-Signature"] { XCTAssertFalse(text.contains(sensitive)) }
      XCTAssertEqual(Mirror(reflecting: item).children.compactMap { $0.label }, ["redacted"])
    }
    let failure = MQTTCredentialFailure.invalidTarget
    XCTAssertFalse(failure.localizedDescription.contains(endpoint))
  }
}

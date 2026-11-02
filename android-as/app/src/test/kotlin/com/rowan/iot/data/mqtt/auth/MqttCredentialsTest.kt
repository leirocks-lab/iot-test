package com.rowan.iot.data.mqtt.auth

import java.io.Serializable
import java.net.URLDecoder
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Public fixtures copied from the independent iOS/Node vectors. No environment, HTTP or broker access. */
class MqttCredentialsTest {
    private val endpoint = "example-ats.iot.ap-southeast-2.amazonaws.com"
    private val publicAccessKey = "AKIDEXAMPLE"
    private val publicSecret = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY"
    private val publicToken = "fixture+/=token"
    // 2026-10-22T01:02:03Z. Explicit epoch seconds throughout the pure API.
    private val now = 1_792_630_923.0

    private fun fixture() = JSONObject().put("host", "wss://$endpoint/mqtt").put("endpoint", endpoint)
        .put("path", "/mqtt").put("clientID", "app-test").put("username", publicAccessKey)
        .put("password", publicSecret).put("deviceID", "dev_test").put("sessionToken", publicToken)

    private fun decode(raw: JSONObject = fixture(), encoding: ExpiryEncoding = ExpiryEncoding.UNKNOWN) =
        MqttCredentials.decode(raw, resourceId = "http-resource/42", expiryEncoding = encoding)

    private fun parameters(
        raw: JSONObject = fixture(), clock: Double = now,
        host: MqttCanonicalHost = MqttCanonicalHost.HOSTNAME_ONLY,
        encoding: ExpiryEncoding = ExpiryEncoding.UNKNOWN,
    ) = AwsIotWebSocketSigner.prepare(decode(raw, encoding),
        policy = MqttEndpointPolicy(trustedStsEndpoints = setOf(endpoint)), canonicalHost = host, nowEpochSeconds = clock)

    private fun query(parameters: MqttConnectionParameters): Map<String, String> = parameters.withUri { uri ->
        uri.rawQuery.orEmpty().split('&').filter { it.isNotEmpty() }.associate { pair ->
            val parts = pair.split('=', limit = 2)
            URLDecoder.decode(parts[0], "UTF-8") to URLDecoder.decode(parts.getOrElse(1) { "" }, "UTF-8")
        }
    }

    private fun rejects(code: MqttCredentialErrorCode? = null, work: () -> Unit): MqttCredentialFailure {
        val error = runCatching(work).exceptionOrNull()
        assertTrue("Expected a fixed, sanitized credential failure", error is MqttCredentialFailure)
        return (error as MqttCredentialFailure).also { if (code != null) assertEquals(code, it.code) }
    }

    @Test fun resourceThingReferenceAndClientIdHaveDistinctUnmodifiedRoles() {
        val value = decode()
        assertEquals("http-resource/42", value.resourceId)
        assertEquals("dev_test", value.thingRef)
        assertNotEquals(value.resourceId, value.thingRef)
        assertEquals("app-test", value.clientId)
        assertEquals(MqttCredentialExpiry.Absent, value.expiry)
        val parameters = parameters()
        assertEquals(value.resourceId, parameters.resourceId)
        assertEquals(value.thingRef, parameters.thingRef)
        assertEquals(value.clientId, parameters.clientId)
    }

    @Test fun numericExpiresAtUsesExplicitEpochSecondsWithoutMagnitudeGuessing() {
        val value = decode(fixture().put("expiresAt", now + 120), ExpiryEncoding.EPOCH_SECONDS)
        val expiry = value.expiry as MqttCredentialExpiry.Known
        assertEquals(now + 120, expiry.deadlineEpochSeconds, 0.0)
        assertEquals(ExpiryEncoding.EPOCH_SECONDS, expiry.encoding)
        val veryLarge = decode(fixture().put("expiresAt", 1_700_000_000_000.0), ExpiryEncoding.EPOCH_SECONDS)
        assertEquals(1_700_000_000_000.0, (veryLarge.expiry as MqttCredentialExpiry.Known).deadlineEpochSeconds, 0.0)
    }

    @Test fun explicitEpochMillisAlwaysDividesByOneThousand() {
        val value = decode(fixture().put("expiresAt", 1_700_000_000_000.0), ExpiryEncoding.EPOCH_MILLIS)
        val expiry = value.expiry as MqttCredentialExpiry.Known
        assertEquals(1_700_000_000.0, expiry.deadlineEpochSeconds, 0.0)
        assertEquals(ExpiryEncoding.EPOCH_MILLIS, expiry.encoding)
    }

    @Test fun absentAndUnknownExpiryNeverInventCredentialDeadlineFromUrlLifetime() {
        for (value in listOf<Any>(1.0, 1_700_000_000_000.0, "unconfirmed-format")) {
            val params = parameters(fixture().put("expiresAt", value))
            assertEquals(MqttCredentialExpiry.Unknown, params.credentialExpiry)
            assertEquals(now + 900, params.signedRequestExpiresAtEpochSeconds!!, 0.0)
            assertEquals("900", query(params)["X-Amz-Expires"])
        }
        assertEquals(MqttCredentialExpiry.Absent, parameters().credentialExpiry)
    }

    @Test fun isoEncodingRequiresStringTimezoneAndARealCalendarDate() {
        val utc = decode(fixture().put("expiresAt", "2026-10-22T01:02:03Z"), ExpiryEncoding.ISO8601).expiry as MqttCredentialExpiry.Known
        val offset = decode(fixture().put("expiresAt", "2026-10-22T09:02:03+08:00"), ExpiryEncoding.ISO8601).expiry as MqttCredentialExpiry.Known
        val fractional = decode(fixture().put("expiresAt", "2026-10-22T01:02:03.125Z"), ExpiryEncoding.ISO8601).expiry as MqttCredentialExpiry.Known
        assertEquals(now, utc.deadlineEpochSeconds, 0.0)
        assertEquals(utc.deadlineEpochSeconds, offset.deadlineEpochSeconds, 0.0)
        assertEquals(now + 0.125, fractional.deadlineEpochSeconds, 0.0)
        for (raw in listOf<Any>(now, "2026-10-22T01:02:03", "2026-02-30T01:02:03Z", "2026-10-22")) {
            rejects(MqttCredentialErrorCode.INVALID_EXPIRY) { decode(fixture().put("expiresAt", raw), ExpiryEncoding.ISO8601) }
        }
    }

    @Test fun expiryPresenceNullBooleanStringAndNonFiniteTypesDoNotCoerce() {
        for (raw in listOf<Any>(JSONObject.NULL, true, "1792630923", -1.0, 0.0)) {
            rejects(MqttCredentialErrorCode.INVALID_EXPIRY) { decode(fixture().put("expiresAt", raw), ExpiryEncoding.EPOCH_SECONDS) }
        }
        for (raw in listOf<Any>(JSONObject.NULL, true, "", "  ", JSONObject())) {
            rejects(MqttCredentialErrorCode.INVALID_EXPIRY) { decode(fixture().put("expiresAt", raw), ExpiryEncoding.UNKNOWN) }
        }
        // JSONObject itself refuses non-finite numbers. Exercise the pure expiry decoder directly.
        for (raw in listOf(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY)) {
            rejects(MqttCredentialErrorCode.INVALID_EXPIRY) { MqttCredentialExpiry.decode(raw, supplied = true, encoding = ExpiryEncoding.EPOCH_SECONDS) }
            rejects(MqttCredentialErrorCode.INVALID_EXPIRY) { MqttCredentialExpiry.decode(raw, supplied = true, encoding = ExpiryEncoding.UNKNOWN) }
        }
    }

    @Test fun missingTokenAloneSelectsPlainAuthenticationAndInvalidPresentTokenNeverFallsBack() {
        val plain = fixture().apply { remove("sessionToken") }
        assertTrue(decode(plain).authentication is MqttAuthentication.UsernamePassword)
        assertTrue(decode().authentication is MqttAuthentication.AwsSts)
        for (raw in listOf<Any>("", " ", JSONObject.NULL, 123, true, listOf("unexpected"), "token\n")) {
            rejects(MqttCredentialErrorCode.INVALID_SESSION_TOKEN) { decode(fixture().put("sessionToken", raw)) }
        }
    }

    @Test fun requiredWireFieldsAndResourceIdAreNotCoercedFilledOrGenerated() {
        for (key in listOf("host", "endpoint", "path", "clientID", "username", "password", "deviceID")) {
            for (value in listOf<Any>(123, true, "", "  ", JSONObject.NULL, "invalid\nvalue")) {
                rejects { decode(fixture().put(key, value)) }
            }
            rejects { decode(fixture().apply { remove(key) }) }
        }
        for (resource in listOf("", " ", "resource\n")) {
            rejects { MqttCredentials.decode(fixture(), resourceId = resource, expiryEncoding = ExpiryEncoding.UNKNOWN) }
        }
    }

    @Test fun unsafeThingReferenceAndNonObjectResponseAreRejected() {
        for (thing in listOf("some/thing", "some+thing", "some#thing", "some\u0000thing")) {
            rejects { decode(fixture().put("deviceID", thing)) }
        }
        for (raw in listOf<Any>("{}", org.json.JSONArray(), 1, JSONObject.NULL)) {
            rejects(MqttCredentialErrorCode.INVALID_RESPONSE) { MqttCredentials.decode(raw, resourceId = "r", expiryEncoding = ExpiryEncoding.UNKNOWN) }
        }
    }

    @Test fun hostEndpointAndPathMustMatchExactlyAfterDnsCaseCanonicalization() {
        for ((key, value) in listOf("endpoint" to "other.iot.ap-southeast-2.amazonaws.com", "endpoint" to "$endpoint:443", "path" to "/other")) {
            rejects(MqttCredentialErrorCode.CONFLICTING_TARGET) { decode(fixture().put(key, value)) }
        }
        val value = decode(fixture().put("host", "wss://${endpoint.uppercase()}:443/mqtt").put("endpoint", endpoint.uppercase()).put("clientID", "app-Test:unchanged"))
        assertEquals(endpoint, value.target.hostname)
        assertEquals("/mqtt", value.target.path)
        assertEquals("app-Test:unchanged", value.clientId)
    }

    @Test fun schemeUserInfoQueriesFragmentsEscapedHostsAndNoncanonicalPortsAreRejected() {
        val invalid = listOf("ws://$endpoint/mqtt", "https://$endpoint/mqtt", "wss://user@$endpoint/mqtt", "wss://$endpoint/mqtt#fragment",
            "wss://$endpoint/mqtt?", "wss://$endpoint/mqtt?X-Amz-Signature=external", "wss://$endpoint:8443/mqtt",
            "wss://$endpoint:/mqtt", "wss://$endpoint:0443/mqtt", "wss://%65xample-ats.iot.ap-southeast-2.amazonaws.com/mqtt")
        for (host in invalid) rejects { decode(fixture().put("host", host)) }
    }

    @Test fun pathsRejectEscapesDotSegmentsDoubleSlashesAndHostPathDisagreement() {
        for (path in listOf("mqtt", "/m%71tt", "/a/../mqtt", "/./mqtt", "//mqtt", "/mqtt//", "/mqtt?x=1", "/mqtt#x")) {
            rejects { decode(fixture().put("host", "wss://$endpoint$path").put("path", path)) }
        }
        rejects(MqttCredentialErrorCode.CONFLICTING_TARGET) { decode(fixture().put("host", "wss://$endpoint/other")) }
    }

    @Test fun stsNeedsExactNativePolicyEvenForAnAwsLookingEndpoint() {
        rejects(MqttCredentialErrorCode.UNTRUSTED_TARGET) {
            AwsIotWebSocketSigner.prepare(decode(), MqttEndpointPolicy(), MqttCanonicalHost.HOSTNAME_ONLY, now)
        }
        val foreign = "foreign-ats.iot.ap-southeast-2.amazonaws.com"
        rejects(MqttCredentialErrorCode.UNTRUSTED_TARGET) { parameters(fixture().put("host", "wss://$foreign/mqtt").put("endpoint", foreign)) }
        rejects(MqttCredentialErrorCode.INVALID_TARGET) { MqttEndpointPolicy(trustedStsEndpoints = setOf("*.iot.ap-southeast-2.amazonaws.com")) }
    }

    @Test fun explicitTrustCannotTurnAnAwsLookalikeOrWrongPathIntoAnStsTarget() {
        val foreign = "$endpoint.attacker.test"
        rejects(MqttCredentialErrorCode.UNSUPPORTED_STS_TARGET) {
            AwsIotWebSocketSigner.prepare(decode(fixture().put("host", "wss://$foreign/mqtt").put("endpoint", foreign)),
                MqttEndpointPolicy(trustedStsEndpoints = setOf(foreign)), MqttCanonicalHost.HOSTNAME_ONLY, now)
        }
        rejects(MqttCredentialErrorCode.UNSUPPORTED_STS_TARGET) {
            parameters(fixture().put("host", "wss://$endpoint/other").put("path", "/other"))
        }
    }

    @Test fun nativePolicyCopiesAllowedTargetsInsteadOfRetainingCallerMutableSets() {
        val caller = mutableSetOf(endpoint)
        val policy = MqttEndpointPolicy(trustedStsEndpoints = caller)
        val foreign = "foreign-ats.iot.ap-southeast-2.amazonaws.com"
        caller += foreign
        rejects(MqttCredentialErrorCode.UNTRUSTED_TARGET) {
            AwsIotWebSocketSigner.prepare(decode(fixture().put("host", "wss://$foreign/mqtt").put("endpoint", foreign)), policy, MqttCanonicalHost.HOSTNAME_ONLY, now)
        }
    }

    @Test fun plainWssUsesExactTrustedTargetAndOnlyItsOwnConnectAuthentication() {
        val raw = fixture().apply { remove("sessionToken") }.put("host", "wss://mqtt.example.test/mqtt").put("endpoint", "mqtt.example.test")
        val credentials = decode(raw)
        val policy = MqttEndpointPolicy(trustedPlainTargets = setOf(credentials.target))
        val result = AwsIotWebSocketSigner.prepare(credentials, policy, MqttCanonicalHost.HOSTNAME_AND_DEFAULT_PORT, now)
        val auth = result.authentication as MqttConnectAuthentication.UsernamePassword
        assertEquals(publicAccessKey, auth.username.withValue { it })
        assertEquals(publicSecret, auth.password.withValue { it })
        assertNull(result.signedRequestExpiresAtEpochSeconds)
        assertNull(result.withUri { it.rawQuery })
        assertEquals("mqtt.example.test:443", result.httpHostHeader)
        assertEquals(result.httpHostHeader, result.withUri { it.rawAuthority })
        rejects(MqttCredentialErrorCode.UNTRUSTED_TARGET) {
            AwsIotWebSocketSigner.prepare(credentials, MqttEndpointPolicy(), MqttCanonicalHost.HOSTNAME_ONLY, now)
        }
        val other = decode(raw.put("host", "wss://mqtt.example.test/other").put("path", "/other"))
        rejects(MqttCredentialErrorCode.UNTRUSTED_TARGET) {
            AwsIotWebSocketSigner.prepare(other, policy, MqttCanonicalHost.HOSTNAME_ONLY, now)
        }
    }

    @Test fun hostnameOnlyMatchesThePublicNodeAndIosGoldenVector() {
        val result = parameters(); val values = query(result)
        assertEquals("1bb6fc1e00f9317a345bfffa3fc27bda14c615a9de3ccaa18f1fb99a287b3588", values["X-Amz-Signature"])
        assertEquals("AKIDEXAMPLE/20261022/ap-southeast-2/iotdevicegateway/aws4_request", values["X-Amz-Credential"])
        assertEquals("20261022T010203Z", values["X-Amz-Date"])
        assertEquals("900", values["X-Amz-Expires"])
        assertEquals("host", values["X-Amz-SignedHeaders"])
        assertEquals(endpoint, result.httpHostHeader)
        assertEquals(result.httpHostHeader, result.withUri { it.rawAuthority })
        assertEquals(-1, result.withUri { it.port })
        assertEquals(MqttConnectAuthentication.None, result.authentication)
    }

    @Test fun hostWithDefaultTlsPortMatchesSecondGoldenAndTheExactTransportAuthority() {
        val result = parameters(host = MqttCanonicalHost.HOSTNAME_AND_DEFAULT_PORT)
        assertEquals("872790fdb74959803525eaabc7ba186bae286909fcc980175130948ca66de47f", query(result)["X-Amz-Signature"])
        assertEquals("$endpoint:443", result.httpHostHeader)
        assertEquals(result.httpHostHeader, result.withUri { it.rawAuthority })
        assertEquals(443, result.withUri { it.port })
        assertNotEquals(query(parameters())["X-Amz-Signature"], query(result)["X-Amz-Signature"])
    }

    @Test fun stsTokenIsAppendedAfterSigningEncodedAsUtf8AndNeverSentInMqttConnect() {
        val first = parameters(); val second = parameters(fixture().put("sessionToken", "different-token"))
        assertEquals(query(first)["X-Amz-Signature"], query(second)["X-Amz-Signature"])
        assertEquals(publicToken, query(first)["X-Amz-Security-Token"])
        val uri = first.withUri { it.toASCIIString() }
        assertTrue(uri.contains("fixture%2B%2F%3Dtoken"))
        assertTrue(uri.indexOf("X-Amz-Security-Token=") > uri.indexOf("X-Amz-Signature="))
        assertFalse(uri.contains(publicSecret))
        assertEquals(MqttConnectAuthentication.None, first.authentication)
        val reserved = parameters(fixture().put("sessionToken", "token 空格+/'!()*="))
        assertEquals("token 空格+/'!()*=", query(reserved)["X-Amz-Security-Token"])
        assertTrue(reserved.withUri { it.rawQuery.contains("%20") && it.rawQuery.contains("%21%28%29%2A") })
    }

    @Test fun eachPreparationUsesFreshSuppliedTimeAndFloorsSubsecondSigningTime() {
        val first = parameters(); val next = parameters(clock = now + 1)
        assertNotEquals(query(first)["X-Amz-Date"], query(next)["X-Amz-Date"])
        assertNotEquals(query(first)["X-Amz-Signature"], query(next)["X-Amz-Signature"])
        assertEquals(query(first)["X-Amz-Signature"], query(parameters(clock = now + 0.75))["X-Amz-Signature"])
    }

    @Test fun knownDeadlineCapsUrlLifetimeAndExpiredCredentialsCannotBePrepared() {
        val result = parameters(fixture().put("expiresAt", now + 120), encoding = ExpiryEncoding.EPOCH_SECONDS)
        assertEquals("120", query(result)["X-Amz-Expires"])
        assertEquals(now + 120, result.signedRequestExpiresAtEpochSeconds!!, 0.0)
        for (deadline in listOf(now, now - 1, now + 0.25)) {
            rejects(MqttCredentialErrorCode.EXPIRED) { parameters(fixture().put("expiresAt", deadline), encoding = ExpiryEncoding.EPOCH_SECONDS) }
        }
    }

    @Test fun invalidClockAndLifetimeFailWithFixedErrorsRatherThanCoercion() {
        for (clock in listOf(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, -62_135_596_801.0, 253_402_300_800.0)) {
            rejects(MqttCredentialErrorCode.INVALID_TIME) { parameters(clock = clock) }
        }
        for (seconds in listOf(0, -1, 901, Int.MAX_VALUE)) {
            rejects(MqttCredentialErrorCode.INVALID_LIFETIME) {
                AwsIotWebSocketSigner.prepare(decode(), MqttEndpointPolicy(trustedStsEndpoints = setOf(endpoint)), MqttCanonicalHost.HOSTNAME_ONLY, now, lifetimeSeconds = seconds)
            }
        }
    }

    @Test fun descriptorsAndErrorsDoNotDiscloseSecretsOrSignedUrlsAndMaterialIsNotSerializable() {
        val credentials = decode(); val parameters = parameters()
        val objects: List<Any> = listOf(credentials, credentials.target, credentials.authentication, parameters, MqttSecret(publicSecret))
        for (item in objects) {
            val descriptor = item.toString()
            for (sensitive in listOf(publicSecret, publicAccessKey, publicToken, "wss://", "X-Amz-Signature")) assertFalse(descriptor.contains(sensitive))
            assertFalse("Credential and signed URL holders are memory-only", item is Serializable)
        }
        val error = rejects { decode(fixture().put("host", "wss://$publicAccessKey:$publicSecret@$endpoint/mqtt")) }
        val diagnostic = error.toString() + error.stackTraceToString()
        for (sensitive in listOf(publicSecret, publicAccessKey, publicToken, endpoint, "wss://")) assertFalse(diagnostic.contains(sensitive))
    }
}

package com.rowan.iot.domain.device.mqtt.transport

import org.junit.Assert.*
import org.junit.Test

class BrokerContractsTest {
    @Test fun groupingNormalizesAuthorityWithoutChangingTheSignedUri() {
        val a = BrokerKey(1, "MQTT.example.test", "/mqtt", "server-client")
        val b = BrokerKey(1, "mqtt.example.test:443", "/mqtt", "server-client")
        assertEquals(a, b)
        assertNotEquals(a, BrokerKey(2, "mqtt.example.test", "/mqtt", "server-client"))
        assertNotEquals(a, BrokerKey(1, "mqtt.example.test", "/mqtt", "other-client"))
        val signed = "wss://mqtt.example.test:443/mqtt?X-Amz-Signature=secret%2Bexact"
        val options = BrokerOptions(a, signed, "connect-user", "connect-password", 9_000_000)
        assertEquals(signed, options.signedWssUri)
        assertFalse(options.toString().contains("secret"))
        assertFalse(options.toString().contains("connect-user"))
        assertFalse(options.toString().contains("connect-password"))
        assertTrue(options.toString().contains("redacted"))
    }

    @Test fun groupingAndOptionsRejectUnsafeOrInconsistentAddressesWithoutLeakingInput() {
        val key = BrokerKey(1, "mqtt.example.test", "/mqtt", "client")
        for (uri in listOf("ws://mqtt.example.test/mqtt", "wss://other.example.test/mqtt", "wss://mqtt.example.test/other")) {
            assertTrue(runCatching { BrokerOptions(key, uri, null, null, null) }.isFailure)
        }
        assertTrue(runCatching { BrokerKey(1, "user:secret@mqtt.example.test", "/mqtt", "client") }.isFailure)
        assertTrue(runCatching { LeaseResource(1, "http-device", "thing/other") }.isFailure)
    }
}

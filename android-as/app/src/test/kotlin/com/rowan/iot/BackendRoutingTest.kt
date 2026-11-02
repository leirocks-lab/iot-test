package com.rowan.iot

import com.rowan.iot.data.http.usesIoTBackend
import org.junit.Assert.*
import org.junit.Test

class BackendRoutingTest {
    @Test fun queryDoesNotChangeTheBackendForIoTCollections() {
        for(path in listOf("/api/app/products?category=wine", "/api/app/devices?offset=2", "/api/app/user/locations?limit=10")) {
            assertTrue(path,usesIoTBackend(path))
        }
        assertFalse(usesIoTBackend("/api/app/privacy?type=text"))
        assertFalse(usesIoTBackend("/api/app/session"))
    }
}

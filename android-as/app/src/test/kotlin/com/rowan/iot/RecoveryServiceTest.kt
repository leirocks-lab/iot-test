package com.rowan.iot

import com.rowan.iot.domain.account.RecoveryService
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class RecoveryServiceTest {
    @Test fun unknownSendOrResetOutcomesAreNotReplayed() = runBlocking {
        var sends=0; var resets=0
        val service=RecoveryService(HttpGateway { method,path,_,_ ->
            if(path.startsWith("/api/app/captcha?")) { sends++; throw java.io.IOException("unknown") }
            if(method=="PATCH") { resets++; throw java.io.IOException("unknown") }
            JSONObject()
        })
        service.setInput("user@example.com","123456")
        runCatching { service.send() }; runCatching { service.send() }
        assertEquals(1,sends)
        service.verify()
        runCatching { service.reset("Rowan@123","Rowan@123") }
        runCatching { service.reset("Rowan@123","Rowan@123") }
        assertEquals(1,resets)
    }
    @Test fun changedInputRejectsOldVerificationAndInvalidPasswordsNeverReset() = runBlocking {
        val calls = mutableListOf<String>()
        val service = RecoveryService(HttpGateway { method, path, body, _ ->
            calls += "$method ${path.substringBefore('?')}"
            if (method == "PATCH") {
                assertFalse(body!!.has("confirmPassword"))
                assertEquals("user@example.com", body.getString("account"))
            }
            JSONObject()
        })
        service.setInput("user@example.com", "123456")
        assertTrue(runCatching { service.reset("abc12345", "abc12345") }.isFailure)
        service.verify()
        service.setInput("other@example.com", "123456")
        assertTrue(runCatching { service.reset("abc12345", "abc12345") }.isFailure)
        service.setInput("user@example.com", "123456"); service.verify()
        for (password in listOf("short1", "abcdefgh", "12345678", "abcdefghijk123")) {
            assertTrue(runCatching { service.reset(password, password) }.isFailure)
        }
        assertTrue(runCatching { service.reset("abc12345", "abc12346") }.isFailure)
        assertFalse(calls.any { it.startsWith("PATCH") })
        service.reset("abc12345", "abc12345")
        assertEquals(1, calls.count { it.startsWith("PATCH") })
        assertTrue(runCatching { service.reset("abc12345", "abc12345") }.isFailure)
    }

    @Test fun lateVerificationCannotAuthorizeChangedInputs() = runBlocking {
        val started = CompletableDeferred<Unit>()
        val response = CompletableDeferred<Unit>()
        val service = RecoveryService(HttpGateway { _, _, _, _ -> started.complete(Unit); response.await(); JSONObject() })
        service.setInput("a@example.com", "123456")
        val pending = async { runCatching { service.verify() } }
        started.await()
        service.setInput("b@example.com", "654321")
        response.complete(Unit)
        assertTrue(pending.await().isFailure)
        assertTrue(runCatching { service.reset("abc12345", "abc12345") }.isFailure)
    }
}

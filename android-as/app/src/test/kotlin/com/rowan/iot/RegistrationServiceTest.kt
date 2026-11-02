package com.rowan.iot

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class RegistrationServiceTest {
    private class Storage:SessionStorage {
        var value:String?=null
        override fun read()=value
        override fun write(value:String?) {this.value=value}
    }
    @Test fun registrationBindsRegionReadingAndVerificationAndStoresReturnedSession()=runBlocking {
        var registrations=0;var logins=0
        val gateway=HttpGateway { method,path,body,_->
            if(path=="/api/app/user" && method=="PUT") {
                registrations++
                assertEquals("DE",body!!.getString("regionCode"));assertEquals("email",body.getString("type"))
                assertFalse(body.has("confirmPassword"));assertFalse(body.has("agreementVersion"))
                JSONObject().put("data",JSONObject("""{"accessToken":"access","refreshToken":"refresh","userID":"created","expiresIn":600,"setting":{"language":"en"}}"""))
            } else {if(path=="/api/app/session")logins++;JSONObject()}
        }
        val storage=Storage();val account=AccountService(gateway,storage)
        val flow=RegistrationService(gateway,account)
        flow.setInput("new@example.com","123456")
        assertTrue(runCatching {flow.submit("Rowan@123","Rowan@123")}.isFailure)
        flow.selectRegion("US");flow.verify()
        AgreementKind.entries.forEach {flow.markRead(it,"US")};flow.setConsent(true)
        flow.selectRegion("DE")
        assertTrue(runCatching {flow.submit("Rowan@123","Rowan@123")}.isFailure)
        AgreementKind.entries.forEach {flow.markRead(it,"US")}
        assertFalse(flow.canConsent)
        AgreementKind.entries.forEach {flow.markRead(it,"DE")};flow.setConsent(true)
        assertTrue(runCatching {flow.submit("Rowan@123","Rowan@123")}.isFailure)
        flow.verify();flow.submit("Rowan@123","Rowan@123")
        assertEquals(1,registrations);assertEquals(0,logins)
        assertEquals("created",account.session?.userId)
        assertEquals(600,JSONObject(storage.value!!).getLong("expiresIn"))
    }

    @Test fun closingAndReopeningFlowDoesNotBypassSharedEmailCooldown()=runBlocking {
        var now=0L;var sends=0
        val cooldowns=EmailCodeCooldowns {now}
        val gateway=HttpGateway { _,_,_,_->sends++;JSONObject() }
        val account=AccountService(gateway,Storage())
        val first=RegistrationService(gateway,account,cooldowns)
        first.setInput("new@example.com","");first.send()
        val second=RegistrationService(gateway,account,cooldowns)
        second.setInput("NEW@example.com","")
        assertTrue(runCatching {second.send()}.isFailure)
        assertEquals(1,sends)
        now+=60_000;second.send();assertEquals(2,sends)
    }
}

package com.rowan.iot.data.http

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.*
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Public fixtures only. Generating a real bind code is deliberately not part of these tests. */
class HttpDeviceShareCodeRepositoryTest {
    private class Fixture(val device:String="a/b ?*") {
        val calls=mutableListOf<Pair<String,String>>()
        var bodySeen:JSONObject?=null
        var reply:suspend()->JSONObject={JSONObject().put("data",JSONObject().put("deviceID",device).put("bindCode","public-code"))}
        val account=AccountService(HttpGateway {method,path,body,_->
            calls+=method to path
            if(method=="POST"||method=="PATCH"&&path=="/api/app/session")JSONObject("""{"data":{"accessToken":"public-access","refreshToken":"public-refresh","userID":"public-user"}}""")
            else {bodySeen=body;reply()}
        },object:SessionStorage {override fun read():String?=null;override fun write(value:String?)=Unit})
        suspend fun ready():HttpDeviceShareCodeRepository {
            account.login("public@example.test","fixture");calls.clear()
            return HttpDeviceShareCodeRepository(account,DeviceMoreScope(account.revision,device,"public-user","product"))
        }
    }
    @Test fun explicitGenerationUsesExactEncodedGetWithoutBody()=runBlocking {
        val f=Fixture();val code=f.ready().generate()
        assertEquals(listOf("GET" to "/api/app/devices/a%2Fb%20%3F%2A/bindCode"),f.calls)
        assertNull(f.bodySeen);assertEquals("public-code",code.bindCode)
    }
    @Test fun generation401DoesNotRefreshOrReplay()=runBlocking {
        val f=Fixture();val repo=f.ready();f.reply={throw ApiFailure(401,"private")}
        assertEquals(401,(runCatching {repo.generate()}.exceptionOrNull() as ApiFailure).code)
        assertEquals(1,f.calls.size);assertEquals("GET",f.calls.single().first)
    }
    @Test fun ordinaryReadStillRefreshesOnce()=runBlocking {
        val f=Fixture();f.ready();var reads=0
        f.reply={if(reads++==0)throw ApiFailure(401,"private") else JSONObject()}
        f.account.request("GET","/api/app/devices")
        assertEquals(listOf("GET","PATCH","GET"),f.calls.map {it.first})
    }
    @Test fun staleAccountCannotGenerateWithANewToken()=runBlocking {
        val f=Fixture();val repo=f.ready();f.account.login("other@example.test","fixture");f.calls.clear()
        assertTrue(runCatching {repo.generate()}.isFailure);assertTrue(f.calls.isEmpty())
    }
    @Test fun lateResponseAfterAccountChangeIsDiscarded()=runBlocking {
        val f=Fixture();val repo=f.ready();f.reply={f.account.login("other@example.test","fixture");JSONObject().put("data",JSONObject().put("deviceID",f.device).put("bindCode","public-code"))}
        assertEquals(499,(runCatching {repo.generate()}.exceptionOrNull() as ApiFailure).code)
    }
    @Test fun mismatchedDeviceDoesNotExposeItsCode()=runBlocking {
        val f=Fixture();val repo=f.ready();f.reply={JSONObject("""{"data":{"deviceID":"other","bindCode":"public-code"}}""")}
        assertEquals(502,(runCatching {repo.generate()}.exceptionOrNull() as ApiFailure).code)
    }
    @Test fun malformedMissingOrNonStringCodeNeverBecomesSuccess()=runBlocking {
        for(raw in listOf("{}","""{"data":null}""","""{"data":[]}""","""{"data":{"deviceID":"a/b ?*"}}""","""{"data":{"deviceID":"a/b ?*","bindCode":1}}""","""{"data":{"deviceID":"a/b ?*","bindCode":""}}""")) {
            val f=Fixture();val repo=f.ready();f.reply={JSONObject(raw)}
            assertEquals(502,(runCatching {repo.generate()}.exceptionOrNull() as ApiFailure).code)
        }
    }
    @Test fun invalidScopeNeverSends()=runBlocking {
        for(id in listOf(".","..","","bad\nvalue")) {val f=Fixture(id);val repo=f.ready();assertTrue(runCatching {repo.generate()}.isFailure);assertTrue(f.calls.isEmpty())}
    }
    @Test fun timeoutDoesNotAutomaticallyGenerateAgain()=runBlocking {
        val f=Fixture();val repo=f.ready();f.reply={throw java.net.SocketTimeoutException("private")}
        assertTrue(runCatching {repo.generate()}.isFailure);assertEquals(1,f.calls.size)
    }
    @Test fun nativeCredentialDescriptionIsRedacted()=runBlocking {
        val f=Fixture();val code=f.ready().generate();assertFalse(code.toString().contains("public-code"));assertFalse(code.toString().contains(f.device))
    }
}

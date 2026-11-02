package com.rowan.iot.data.http

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.*
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class HttpNicknameRepositoryTest {
    private data class Call(val method:String,val path:String,val body:JSONObject?)
    private suspend fun fixture(handler:suspend(Call)->JSONObject):Pair<AccountService,HttpNicknameRepository> {
        val account=AccountService(HttpGateway {method,path,body,_->
            if(path=="/api/app/session")JSONObject("""{"data":{"accessToken":"public-access","refreshToken":"public-refresh","userID":"user","setting":{}}}""")
            else handler(Call(method,path,body))
        },object:SessionStorage {override fun read():String?=null;override fun write(value:String?) {}})
        account.login("public@example.test","fixture")
        return account to HttpNicknameRepository(account,DeviceMoreScope(account.revision,"a/b ?","user","product"))
    }
    @Test fun patchUsesEncodedOpaqueSegmentAndNicknameOnlyWithNoResponseDataRequirement():Unit=runBlocking {
        val calls=mutableListOf<Call>();val (_,repo)=fixture {calls+=it;JSONObject()}
        repo.patch(" next ")
        assertEquals("PATCH",calls.single().method);assertEquals("/api/app/devices/a%2Fb%20%3F",calls.single().path)
        assertEquals(setOf("nickname"),calls.single().body!!.keys().asSequence().toSet());assertEquals(" next ",calls.single().body!!.getString("nickname"))
    }
    @Test fun patch401IsNeverAutomaticallyRefreshedOrReplayed():Unit=runBlocking {
        var calls=0;val (_,repo)=fixture {calls++;throw ApiFailure(401,"raw")}
        assertTrue(runCatching {repo.patch("new")}.isFailure);assertEquals(1,calls)
    }
    @Test fun staleRevisionCannotSendWithNewAccountCredentials():Unit=runBlocking {
        var calls=0;val (account,repo)=fixture {calls++;JSONObject()}
        account.login("second@example.test","fixture")
        assertTrue(runCatching {repo.patch("new")}.isFailure);assertEquals(0,calls)
    }
    @Test fun readBackRequiresExplicitNicknameAndMatchingIdentity():Unit=runBlocking {
        for(value in listOf<Any?>(null,JSONObject.NULL,42)) {
            val (_,repo)=fixture {JSONObject().put("data",JSONObject().put("device",JSONObject().put("id","a/b ?"))
                .put("product",JSONObject().put("id","product")).apply {if(value!=null)put("deviceNickname",value)})}
            assertNull(repo.readNickname())
        }
        val (_,wrong)=fixture {JSONObject("""{"data":{"deviceNickname":"new","device":{"id":"other"},"product":{"id":"product"}}}""")}
        assertTrue(runCatching {wrong.readNickname()}.isFailure)
    }
}

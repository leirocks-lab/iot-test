package com.rowan.iot.data.http

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.*
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class HttpSelfUnbindRepositoryTest {
    private suspend fun fixture(work:suspend(String,String,JSONObject?)->JSONObject):Pair<AccountService,HttpSelfUnbindRepository> {
        val account=AccountService(HttpGateway {method,path,body,_->
            if(method=="POST")JSONObject("""{"data":{"accessToken":"public-access","refreshToken":"public-refresh","userID":"public-user"}}""")
            else work(method,path,body)
        },object:SessionStorage {override fun read():String?=null;override fun write(value:String?)=Unit})
        account.login("public@example.test","fixture")
        return account to HttpSelfUnbindRepository(account,DeviceMoreScope(account.revision,"a/b ?","public-user","product"))
    }
    @Test fun exactMore02RouteNoBodyAndNoRequiredData():Unit=runBlocking {
        var calls=0;val (_,repo)=fixture {method,path,body->calls++;assertEquals("DELETE",method);assertEquals("/api/app/devices/a%2Fb%20%3F/users/self",path);assertNull(body);JSONObject()}
        repo.deleteSelf();assertEquals(1,calls)
    }
    @Test fun delete401NeverRefreshesOrReplays():Unit=runBlocking {
        var calls=0;val (_,repo)=fixture {_,_,_->calls++;throw ApiFailure(401,"private")}
        assertTrue(runCatching {repo.deleteSelf()}.isFailure);assertEquals(1,calls)
    }
    @Test fun staleRevisionCannotUseNewAccountToken():Unit=runBlocking {
        var calls=0;val (account,repo)=fixture {_,_,_->calls++;JSONObject()}
        account.login("b@example.test","fixture");assertTrue(runCatching {repo.deleteSelf()}.isFailure);assertEquals(0,calls)
    }
    @Test fun completeHomeMembershipUsesOpaqueId():Unit=runBlocking {
        val (_,present)=fixture {method,path,_->assertEquals("GET",method);assertEquals("/api/app/devices",path)
            JSONObject("""{"data":[{"room":null,"devices":[{"device":{"id":"a/b ?"}}]}]}""")}
        assertTrue(present.isOwned())
        val (_,absent)=fixture {_,_,_->JSONObject("""{"data":[]}""")};assertFalse(absent.isOwned())
    }
    @Test fun malformedOrFailedHomeNeverBecomesAbsence():Unit=runBlocking {
        for(raw in listOf("{}","""{"data":null}""","""{"data":[{"devices":[{}]}]}""")) {
            val (_,repo)=fixture {_,_,_->JSONObject(raw)};assertTrue(runCatching {repo.isOwned()}.isFailure)
        }
    }
}

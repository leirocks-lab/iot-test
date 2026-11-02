package com.rowan.iot.data.http

import com.rowan.iot.data.mqtt.auth.ExpiryEncoding
import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.network.*
import com.rowan.iot.domain.device.mqtt.transport.BrokerFailure
import com.rowan.iot.domain.device.mqtt.transport.BrokerFailureKind
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Public fixtures only. No broker, private environment or device writes. */
class HttpDeviceAccessTest {
    private val session="""{"accessToken":"public-test","refreshToken":"public-refresh","userID":"public-user"}"""
    private val home="""[{"room":{"id":"public-room","name":"Room"},"devices":[{"deviceNickname":"Cabinet","device":{"id":"http-resource"}}]}]"""
    private val detail="""{"deviceNickname":"Cabinet","bindingRole":"sa","device":{"id":"http-resource"},"product":{"id":"public-product","category":"WineCooler"}}"""
    private fun mqtt()=JSONObject("""{"host":"wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt","endpoint":"example-ats.iot.ap-southeast-2.amazonaws.com","path":"/mqtt","clientID":"server-client","deviceID":"aws-thing","username":"AKIDEXAMPLE","password":"public-fixture-secret","sessionToken":"public-fixture-token"}""")
    private class Storage:SessionStorage {var value:String?=null;override fun read()=value;override fun write(value:String?) {this.value=value}}
    private suspend fun account(handler:suspend (String,String,JSONObject?)->JSONObject):AccountService {
        val account=AccountService(HttpGateway {method,path,body,_->
            if(method=="POST")JSONObject().put("data",JSONObject(session)) else handler(method,path,body)
        },Storage())
        account.login("public@example.test","password");return account
    }
    private fun data(raw:String)=JSONObject("""{"data":$raw}""")

    @Test fun authorizationMustComeFromTheAuthenticatedHomeAndMatchingDeviceDetail():Unit=runBlocking {
        val calls=mutableListOf<String>()
        val account=account {method,path,_->calls+="$method $path";if(path=="/api/app/devices")data(home) else data(detail)}
        val result=HttpDeviceAccess(account,ExpiryEncoding.EPOCH_SECONDS).authorize("http-resource",account.revision)
        assertEquals("public-user",result.userId);assertEquals("http-resource",result.resourceId)
        assertEquals("public-product",result.productId);assertEquals("WineCooler",result.category)
        assertEquals("Cabinet",result.title);assertEquals("sa",result.bindingRole)
        assertEquals(listOf("GET /api/app/devices","GET /api/app/devices/http-resource"),calls)
    }
    @Test fun unknownResourceCannotFetchDetailOrCredentials():Unit=runBlocking {
        val paths=mutableListOf<String>()
        val account=account {_,path,_->paths+=path;data(home)}
        assertTrue(runCatching {HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN).authorize("other-resource",account.revision)}.isFailure)
        assertEquals(listOf("/api/app/devices"),paths)
    }
    @Test fun mismatchedDetailNeverCreatesAnAuthorizedDevice():Unit=runBlocking {
        val account=account {_,path,_->if(path=="/api/app/devices")data(home) else data(detail.replace("http-resource","other-resource"))}
        assertTrue(runCatching {HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN).authorize("http-resource",account.revision)}.isFailure)
    }
    @Test fun opaqueResourceAndThingIdentifiersRemainDistinctAndStsNeverEntersConnect():Unit=runBlocking {
        val paths=mutableListOf<String>()
        val account=account {_,path,_->paths+=path;when {
            path=="/api/app/devices"->data(home)
            path.endsWith("/mqtt")->JSONObject().put("data",mqtt().put("expiresAt",System.currentTimeMillis()/1000+3600))
            else->data(detail)
        }}
        val service=HttpDeviceAccess(account,ExpiryEncoding.EPOCH_SECONDS)
        val device=service.authorize("http-resource",account.revision)
        val connection=service.connection(device)
        assertEquals("aws-thing",connection.thingRef)
        assertEquals("http-resource",connection.resourceId)
        assertEquals("server-client",connection.options.key.serverClientID)
        assertTrue(connection.options.signedWssUri.startsWith("wss://example-ats.iot.ap-southeast-2.amazonaws.com:443/mqtt?"))
        assertNull(connection.options.connectUsername);assertNull(connection.options.connectPassword)
        assertNotNull(connection.options.expiresAtEpochMillis)
        assertFalse(connection.toString().contains("public-fixture-token"))
        assertEquals("/api/app/devices/http-resource/mqtt",paths.last())
    }
    @Test fun oldAuthorizationCannotConnectOrIssueRequestsForANewAccount():Unit=runBlocking {
        val paths=mutableListOf<String>()
        val account=account {_,path,_->paths+=path;if(path=="/api/app/devices")data(home) else data(detail)}
        val service=HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN)
        val device=service.authorize("http-resource",account.revision)
        account.login("second@example.test","password")
        assertTrue(runCatching {service.connection(device)}.isFailure)
        assertEquals(2,paths.size)
    }
    @Test fun aLateDetailResponseCannotCrossAnAccountRevision():Unit=runBlocking {
        val started=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        val account=account {_,path,_->if(path=="/api/app/devices")data(home) else {started.complete(Unit);release.await();data(detail)}}
        val service=HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN)
        val pending=async {runCatching {service.authorize("http-resource",account.revision)}}
        started.await();account.login("second@example.test","password");release.complete(Unit)
        assertTrue(pending.await().isFailure)
    }
    @Test fun device01UnboundBusinessCodeIsAuthorizationAfterRealGatewayAuthorization():Unit=runBlocking {
        val paths=mutableListOf<String>()
        val account=account {_,path,_->
            paths+=path
            when {
                path=="/api/app/devices"->data(home)
                path.endsWith("/mqtt")->throw ApiFailure(1332,"未绑定测试设备")
                else->data(detail)
            }
        }
        val gateway=HttpDeviceAccess(account,ExpiryEncoding.EPOCH_SECONDS)
        val device=gateway.authorize("http-resource",account.revision)
        val failure=runCatching {gateway.connection(device)}.exceptionOrNull()
        assertTrue(failure is BrokerFailure)
        assertEquals(BrokerFailureKind.AUTHORIZATION,(failure as BrokerFailure).kind)
        assertEquals(listOf("/api/app/devices","/api/app/devices/http-resource","/api/app/devices/http-resource/mqtt"),paths)
    }
}

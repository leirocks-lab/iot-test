package com.rowan.iot.data.device

import com.rowan.iot.data.http.HttpDeviceAccess
import com.rowan.iot.data.mqtt.auth.ExpiryEncoding
import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.device.mqtt.OnlineField
import com.rowan.iot.domain.device.mqtt.ShadowProfile
import com.rowan.iot.domain.device.mqtt.ShadowValue
import com.rowan.iot.domain.device.mqtt.transport.*
import com.rowan.iot.domain.device.state.*
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Real native gateway/proof/pool/owner composition; only HTTP and broker I/O are public fakes. */
class DeviceAuthorizationRevocationTest {
    private class Storage:SessionStorage {
        private var value:String?=null
        override fun read()=value
        override fun write(value:String?) {this.value=value}
    }
    private class Port(val listener:BrokerListener):BrokerPort {
        var closes=0
        var gets=0
        override suspend fun connect()=Unit
        override suspend fun subscribe(exactTopics:Set<String>) {
            assertEquals(setOf("get/accepted","get/rejected","update/accepted","update/rejected")
                .map {"\$aws/things/cloud-thing/shadow/$it"}.toSet(),exactTopics)
        }
        override suspend fun unsubscribe(exactTopics:Set<String>)=Unit
        override suspend fun publish(topic:String,payload:ByteArray,qos:Int,retain:Boolean) {
            assertEquals("\$aws/things/cloud-thing/shadow/get",topic)
            assertTrue(payload.isEmpty());assertEquals(1,qos);assertFalse(retain)
            gets++
            listener.message("$topic/accepted",
                """{"version":1,"state":{"reported":{"ConnectType":"online","temperature":12}}}""".toByteArray())
        }
        override fun close() {closes++}
    }
    @Test fun freshDevice01UnboundRevokesLiveCacheWithoutRetryingOrReusingCredentials():Unit=runBlocking {
        var revoked=false
        var mqttRequests=0
        val account=AccountService(HttpGateway {method,path,_,_->
            when {
                method=="POST"->JSONObject("""{"data":{"accessToken":"public-access","refreshToken":"public-refresh","userID":"public-user"}}""")
                path=="/api/app/devices"->JSONObject("""{"data":[{"devices":[{"deviceNickname":"Public fixture","device":{"id":"http-resource"}}]}]}""")
                path=="/api/app/devices/http-resource"->JSONObject("""{"data":{"bindingRole":"sa","deviceNickname":"Public fixture","device":{"id":"http-resource"},"product":{"id":"public-product","category":"fixture-category"}}}""")
                path=="/api/app/devices/http-resource/mqtt"->{
                    mqttRequests++
                    if(revoked)throw ApiFailure(1332,"未绑定测试设备")
                    JSONObject("""{"data":{"host":"wss://broker.example.test/mqtt","endpoint":"broker.example.test","path":"/mqtt","clientID":"server-client","deviceID":"cloud-thing","username":"public-user","password":"public-password"}}""")
                }
                else->error("Unexpected public fixture route")
            }
        },Storage())
        account.login("public@example.test","public-password")
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        val gateway=HttpDeviceAccess(account,ExpiryEncoding.EPOCH_SECONDS)
        val connections=AuthorizedDeviceConnections(account.contexts,gateway)
        val ports=mutableListOf<Port>()
        var retryDelays=0
        val timing=object:PoolTiming {
            override fun nowEpochMillis()=System.currentTimeMillis()
            override suspend fun pause(millis:Long) {retryDelays++;yield()}
        }
        val pool=SharedBrokerPool(scope,BrokerTransportFactory {_,listener->Port(listener).also {ports+=it}},
            connections::credentials,{account.contextSnapshot().let {if(it.session!=null&&!it.cleanupRequired)it.revision else null}},
            timing,PoolPolicy(maxReconnectAttempts=3))
        val owner=DeviceReadOwner(scope,account.contexts,gateway,
            {device,observer->connections.open(device,observer,pool::observe)},
            {revision->connections.invalidateAccount(revision);pool.invalidateAccount(revision)},
            {ShadowProfile(emptyMap(),OnlineField(listOf("ConnectType"),ShadowValue.Text("online"),ShadowValue.Text("offline")))})
        try {
            val handle=owner.observe("http-resource","native-test")
            val live=withTimeout(2_000) {
                (handle.state.first {it is DeviceObservationState.Current&&it.snapshot.phase==DeviceReadPhase.LIVE} as DeviceObservationState.Current).snapshot
            }
            assertEquals(true,live.online);assertTrue(live.snapshotAvailable)
            assertNotNull(live.metadata);assertTrue(JSONObject(live.reportedJson).has("temperature"))
            assertEquals(2,mqttRequests) // bootstrap establishes thingRef; actual connect fetches again
            assertEquals(1,ports.size);assertEquals(1,ports[0].gets)

            revoked=true
            ports[0].listener.disconnected(BrokerFailure(BrokerFailureKind.UNAVAILABLE))
            val denied=withTimeout(2_000) {
                (handle.state.first {it is DeviceObservationState.Current&&it.snapshot.phase in setOf(DeviceReadPhase.FORBIDDEN,DeviceReadPhase.UNAVAILABLE)} as DeviceObservationState.Current).snapshot
            }
            assertEquals("DEVICE-01 unbound is access revocation, not a recoverable network failure",DeviceReadPhase.FORBIDDEN,denied.phase)
            assertEquals(DeviceReadFailure.AUTHORIZATION,denied.failure)
            assertNull(denied.metadata);assertEquals(0,JSONObject(denied.reportedJson).length())
            assertNull(denied.online);assertFalse(denied.snapshotAvailable);assertFalse(denied.stale)
            repeat(10) {yield()}
            assertEquals("No credential seed or further DEVICE-01 retries after unbound",3,mqttRequests)
            assertEquals("Only the disconnect schedules a retry; revocation never does",1,retryDelays)
            assertEquals(1,ports.size);assertEquals(1,ports[0].closes)
        } finally {owner.close();connections.close();pool.close();scope.cancel()}
    }
}

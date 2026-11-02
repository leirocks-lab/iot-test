package com.rowan.iot.data.http

import com.rowan.iot.data.mqtt.auth.*
import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.AuthorizedDevice
import com.rowan.iot.domain.device.PreparedDeviceConnection
import com.rowan.iot.domain.device.DeviceAccessGateway
import com.rowan.iot.domain.device.mqtt.transport.*
import com.rowan.iot.domain.network.ApiFailure
import java.net.URLEncoder
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONObject

/** Native-only DEVICE-01 boundary. RN never supplies endpoint policy, credentials or a signed URL. */
class HttpDeviceAccess(private val account:AccountService,private val expiryEncoding:ExpiryEncoding):DeviceAccessGateway {
    private fun requireAccount(revision:Long,userId:String?=null) {
        val live=account.contextSnapshot()
        if(live.revision!=revision||live.cleanupRequired||live.session==null||
            (userId!=null&&live.session.userId!=userId))throw ApiFailure(499,"会话已变化")
    }
    override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {
        currentCoroutineContext().ensureActive()
        requireAccount(expectedRevision)
        if(resourceId.isBlank()||resourceId.any {it.isISOControl()})throw ApiFailure(400,"设备标识无效")
        val started=account.contextSnapshot()
        val groups=account.request("GET","/api/app/devices",expectedRevision=expectedRevision).getJSONArray("data")
        requireAccount(expectedRevision)
        var homeTitle:String?=null
        var owned=false
        for(i in 0 until groups.length()) {
            val devices=groups.getJSONObject(i).getJSONArray("devices")
            for(j in 0 until devices.length()) {
                val item=devices.getJSONObject(j)
                if(item.getJSONObject("device").getString("id")==resourceId) {
                    owned=true;homeTitle=(item.opt("deviceNickname") as? String)?.takeIf {it.isNotBlank()}
                }
            }
        }
        if(!owned)throw ApiFailure(403,"无权访问该设备")
        val detail=account.request("GET","/api/app/devices/${encode(resourceId)}",expectedRevision=expectedRevision).getJSONObject("data")
        currentCoroutineContext().ensureActive();requireAccount(expectedRevision)
        if(detail.getJSONObject("device").getString("id")!=resourceId)throw ApiFailure(502,"设备详情标识不一致")
        val product=detail.getJSONObject("product")
        fun text(body:JSONObject,key:String):String = (body.opt(key) as? String)?.takeIf {it.isNotBlank()}
            ?:throw ApiFailure(502,"设备产品资料不完整")
        return AuthorizedDevice(expectedRevision,resourceId,started.session!!.userId,
            text(product,"id"),text(product,"category"),
            (detail.opt("deviceNickname") as? String)?.takeIf {it.isNotBlank()}?:homeTitle?:"设备",
            (detail.opt("bindingRole") as? String)?.takeIf {it.isNotBlank()})
    }

    override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection {
        try {
            currentCoroutineContext().ensureActive();requireAccount(device.accountRevision,device.userId)
            val raw=account.request("GET","/api/app/devices/${encode(device.resourceId)}/mqtt",expectedRevision=device.accountRevision).getJSONObject("data")
            currentCoroutineContext().ensureActive();requireAccount(device.accountRevision,device.userId)
            val credentials=MqttCredentials.decode(raw,device.resourceId,expiryEncoding)
            // The exact target comes from this authenticated native DEVICE-01 response
            // after HOME/DEVICE-02 ownership checks. No RN URL or domain-only allow rule.
            val policy=when(credentials.authentication) {
                is MqttAuthentication.AwsSts->MqttEndpointPolicy(trustedStsEndpoints=setOf(credentials.target.hostname))
                is MqttAuthentication.UsernamePassword->MqttEndpointPolicy(trustedPlainTargets=setOf(credentials.target))
            }
            val prepared=AwsIotWebSocketSigner.prepare(credentials,policy,MqttCanonicalHost.HOSTNAME_AND_DEFAULT_PORT)
            val expires=(prepared.credentialExpiry as? MqttCredentialExpiry.Known)?.let {
                val millis=it.deadlineEpochSeconds*1000
                if(!millis.isFinite()||millis<=0||millis>=Long.MAX_VALUE.toDouble())throw BrokerFailure(BrokerFailureKind.CONFIGURATION)
                millis.toLong()
            }
            val uri=prepared.withUri {it}
            var username:String?=null;var password:String?=null
            when(val auth=prepared.authentication) {
                is MqttConnectAuthentication.None->Unit
                is MqttConnectAuthentication.UsernamePassword->{username=auth.username.withValue {it};password=auth.password.withValue {it}}
            }
            val options=BrokerOptions(BrokerKey(device.accountRevision,uri.rawAuthority,uri.rawPath,prepared.clientId),
                uri.toString(),username,password,expires)
            requireAccount(device.accountRevision,device.userId)
            return PreparedDeviceConnection(device.resourceId,prepared.thingRef,options)
        }catch(error:CancellationException) {throw error}
        catch(error:BrokerFailure) {throw error}
        catch(error:ApiFailure) {
            throw BrokerFailure(when(error.code) {401,403,1332->BrokerFailureKind.AUTHORIZATION;499->BrokerFailureKind.STALE_CONTEXT;else->BrokerFailureKind.UNAVAILABLE})
        }catch(error:MqttCredentialFailure) {
            throw BrokerFailure(if(error.code==MqttCredentialErrorCode.EXPIRED)BrokerFailureKind.EXPIRED_CREDENTIALS else BrokerFailureKind.CONFIGURATION)
        }catch(_:Exception) {throw BrokerFailure(BrokerFailureKind.CONFIGURATION)}
    }
    private fun encode(value:String)=URLEncoder.encode(value,"UTF-8").replace("+","%20")
}

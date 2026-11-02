package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.more.*
import java.net.URLEncoder
import java.util.Collections
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONArray
import org.json.JSONObject

/** V1.4 DEVICE-02, MORE-01, MORE-05. No credential generation or mutation endpoint. */
class HttpDeviceMoreReadRepository(private val account:AccountService,override val scope:DeviceMoreScope):DeviceMoreReadRepository {
    private suspend fun requireCurrent() {
        currentCoroutineContext().ensureActive()
        val live=account.contextSnapshot()
        if(live.revision!=scope.accountRevision||live.cleanupRequired||live.session?.userId!=scope.userId)
            throw DeviceMoreReadFailure.sessionChanged()
    }
    private fun path():String {
        if(scope.accountRevision<0||!valid(scope.resourceId)||scope.resourceId=="."||scope.resourceId==".."||!valid(scope.userId)||!valid(scope.productId))
            throw DeviceMoreReadFailure.readFailed()
        return "/api/app/devices/${URLEncoder.encode(scope.resourceId,"UTF-8").replace("+","%20")}"
    }
    private suspend fun <T> read(suffix:String,decode:(Any?)->T):T {
        requireCurrent()
        try {
            val response=account.request("GET",path()+suffix,expectedRevision=scope.accountRevision)
            requireCurrent()
            val result=decode(response.opt("data"))
            requireCurrent()
            return result
        }catch(error:CancellationException) {throw error}
        catch(error:Exception) {
            requireCurrent()
            throw DeviceMoreReadFailure.from(error)
        }
    }
    override suspend fun summary():DeviceMoreSummary=read("") {data->
        val root=objectValue(data)
        val device=objectValue(root.opt("device"));val product=objectValue(root.opt("product"))
        if(identifier(device.opt("id"))!=scope.resourceId||identifier(product.opt("id"))!=scope.productId)
            throw DeviceMoreReadFailure.readFailed()
        DeviceMoreSummary(text(root,"deviceNickname"),text(device,"name"),text(product,"name"),text(product,"category"),
            text(product,"seriesName"),text(product,"modelName"),text(device,"mcuVersion"),text(device,"wifiVersion"),role(root))
    }
    override suspend fun members():List<DeviceMoreMember> =read("/users") {data->
        val items=arrayValue(data);val seen=mutableSetOf<String>()
        val members=(0 until items.length()).map {index->
            val raw=objectValue(items.opt(index));val id=identifier(raw.opt("userID"))
            if(!seen.add(id))throw DeviceMoreReadFailure.readFailed()
            DeviceMoreMember(nextKey(),text(raw,"nickname"),role(raw))
        }
        Collections.unmodifiableList(members)
    }
    override suspend fun help():List<DeviceMoreHelp> =read("/helping?type=text") {data->
        val items=arrayValue(data);val seen=mutableSetOf<String>()
        val articles=(0 until items.length()).map {index->
            val raw=objectValue(items.opt(index));val id=identifier(raw.opt("id"))
            if(!seen.add(id))throw DeviceMoreReadFailure.readFailed()
            DeviceMoreHelp(nextKey(),text(raw,"title"),text(raw,"content"),text(raw,"createdAt"))
        }
        Collections.unmodifiableList(articles)
    }
    private fun objectValue(value:Any?)=value as? JSONObject?:throw DeviceMoreReadFailure.readFailed()
    private fun arrayValue(value:Any?)=value as? JSONArray?:throw DeviceMoreReadFailure.readFailed()
    private fun identifier(value:Any?)=(value as? String)?.takeIf {valid(it)}?:throw DeviceMoreReadFailure.readFailed()
    // Wrong text types, including localized objects, are unknown; never stringify JSON.
    private fun text(raw:JSONObject,key:String)=(raw.opt(key) as? String)?:""
    private fun role(raw:JSONObject)=(raw.opt("bindingRole") as? String)?.takeIf {it in setOf("sa","mbr","obs")}?:"unknown"
    private fun valid(value:String)=value.isNotBlank()&&value.none {it.isISOControl()}
    private fun nextKey()="more-item-${sequence.incrementAndGet()}"
    private companion object {val sequence=AtomicLong()}
}

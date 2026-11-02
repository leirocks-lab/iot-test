package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.ApiFailure
import java.net.URLEncoder
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONObject

/** SHARE-01 generates a credential despite using GET. Never renew/replay automatically.
 * Scope must originate in fresh native ownership authorization, not JavaScript IDs.
 */
class HttpDeviceShareCodeRepository(private val account:AccountService,override val scope:DeviceMoreScope):DeviceShareCodeRepository {
    private suspend fun current() {
        currentCoroutineContext().ensureActive()
        val live=account.contextSnapshot()
        if(live.revision!=scope.accountRevision||live.cleanupRequired||live.session?.userId!=scope.userId||
            listOf(scope.userId,scope.resourceId,scope.productId).any {it.isBlank()||it.any(Char::isISOControl)}||scope.resourceId in setOf(".",".."))
            throw ApiFailure(499,"session_changed")
    }
    override suspend fun generate():DeviceShareCode {
        current()
        val segment=URLEncoder.encode(scope.resourceId,"UTF-8").replace("+","%20").replace("*","%2A")
        val response=account.request("GET","/api/app/devices/$segment/bindCode",expectedRevision=scope.accountRevision,allowReadReplay=false)
        current()
        val data=response.opt("data") as? JSONObject ?:throw ApiFailure(502,"invalid_share_code")
        val code=data.opt("bindCode") as? String
        if(data.opt("deviceID")!=scope.resourceId||code==null||code.isEmpty())throw ApiFailure(502,"invalid_share_code")
        return DeviceShareCode(code)
    }
}

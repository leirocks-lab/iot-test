package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.ApiFailure
import java.net.URLEncoder
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONObject

/** MORE04 exact route; no retries, role inference, normalization or synthetic response. */
class HttpNicknameRepository(private val account:AccountService,override val scope:DeviceMoreScope):NicknameRepository {
    private suspend fun current() {
        currentCoroutineContext().ensureActive()
        val live=account.contextSnapshot()
        if(live.revision!=scope.accountRevision||live.cleanupRequired||live.session?.userId!=scope.userId)throw ApiFailure(499,"session_changed")
    }
    private fun path():String {
        if(scope.resourceId in setOf(".","..")||listOf(scope.resourceId,scope.userId,scope.productId).any {it.isBlank()||it.any(Char::isISOControl)})
            throw ApiFailure(400,"invalid_scope")
        return "/api/app/devices/"+URLEncoder.encode(scope.resourceId,"UTF-8").replace("+","%20")
    }
    override suspend fun patch(nickname:String) {
        current()
        account.request("PATCH",path(),JSONObject().put("nickname",nickname),expectedRevision=scope.accountRevision)
        current() // Common API success has no required data object.
    }
    override suspend fun readNickname():String? {
        current()
        val data=account.request("GET",path(),expectedRevision=scope.accountRevision).opt("data") as? JSONObject
            ?:throw ApiFailure(502,"invalid_snapshot")
        current()
        if(data.optJSONObject("device")?.opt("id")!=scope.resourceId||data.optJSONObject("product")?.opt("id")!=scope.productId)
            throw ApiFailure(502,"invalid_snapshot")
        return data.opt("deviceNickname") as? String
    }
}

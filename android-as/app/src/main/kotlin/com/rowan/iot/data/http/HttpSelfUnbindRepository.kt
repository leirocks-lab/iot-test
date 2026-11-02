package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.ApiFailure
import java.net.URLEncoder
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

/** MORE02, not DEVICE04. AccountService never replays mutations after401. */
class HttpSelfUnbindRepository(private val account:AccountService,override val scope:DeviceMoreScope):SelfUnbindRepository {
    private suspend fun current() {
        currentCoroutineContext().ensureActive()
        val live=account.contextSnapshot()
        if(live.revision!=scope.accountRevision||live.cleanupRequired||live.session?.userId!=scope.userId||
            listOf(scope.userId,scope.resourceId,scope.productId).any {it.isBlank()||it.any(Char::isISOControl)}||scope.resourceId in setOf(".",".."))
            throw ApiFailure(499,"session_changed")
    }
    override suspend fun deleteSelf() {
        current()
        val segment=URLEncoder.encode(scope.resourceId,"UTF-8").replace("+","%20").replace("*","%2A")
        account.request("DELETE","/api/app/devices/$segment/users/self",expectedRevision=scope.accountRevision)
        current() // Public envelope success has no required data; never invent one.
    }
    override suspend fun isOwned():Boolean {
        current()
        val groups=HttpHomeRepository(account).loadGroups(scope.accountRevision)
        current()
        return groups.any {group->group.devices.any {it.id==scope.resourceId}}
    }
}

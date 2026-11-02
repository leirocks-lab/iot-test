package com.rowan.iot.data.device

import com.rowan.iot.data.http.HttpDeviceAccess
import com.rowan.iot.data.http.HttpDeviceMoreReadRepository
import com.rowan.iot.data.http.HttpRoomRepository
import com.rowan.iot.data.mqtt.auth.ExpiryEncoding
import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.DeviceAccessGateway
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.rooms.DeviceRoomRepository
import com.rowan.iot.domain.network.ApiFailure
import java.util.Collections
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.StateFlow

/** Fresh native authorization per read. Owns no login, MQTT session or mutation authority. */
class DeviceMoreReadFeatures(
    private val contexts:StateFlow<AccountContext>,
    private val access:DeviceAccessGateway,
    private val repository:(DeviceMoreScope)->DeviceMoreReadRepository,
    private val rooms:(DeviceMoreScope)->DeviceRoomRepository,
) {
    constructor(account:AccountService):this(account.contexts,HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN),
        {HttpDeviceMoreReadRepository(account,it)},{HttpRoomRepository(account,it.accountRevision)})

    suspend fun summary(deviceId:String,accountRevision:Long):DeviceMoreSummary=read(deviceId,accountRevision) {scope->
        moreRepository(scope).summary()
    }
    suspend fun members(deviceId:String,accountRevision:Long):List<DeviceMoreMember> =read(deviceId,accountRevision) {scope->
        Collections.unmodifiableList(moreRepository(scope).members().toList())
    }
    suspend fun help(deviceId:String,accountRevision:Long):List<DeviceMoreHelp> =read(deviceId,accountRevision) {scope->
        Collections.unmodifiableList(moreRepository(scope).help().toList())
    }
    suspend fun location(deviceId:String,accountRevision:Long):DeviceMoreLocation=read(deviceId,accountRevision) {scope->
        val repository=rooms(scope)
        requireCurrent(scope.accountRevision,scope.userId)
        val room=repository.location(scope.resourceId)
        // Missing/null/empty ROOM-02 data is not a confirmed unassignment contract.
        if(room==null)DeviceMoreLocation("unknown","")else DeviceMoreLocation("assigned",room.name)
    }
    private suspend fun moreRepository(scope:DeviceMoreScope):DeviceMoreReadRepository {
        val result=repository(scope)
        requireCurrent(scope.accountRevision,scope.userId)
        if(result.scope!=scope)throw DeviceMoreReadFailure.readFailed()
        return result
    }
    private suspend fun <T> read(deviceId:String,accountRevision:Long,work:suspend(DeviceMoreScope)->T):T {
        currentCoroutineContext().ensureActive()
        val initial=contexts.value;val userId=initial.session?.userId
        if(accountRevision<0||initial.revision!=accountRevision||initial.cleanupRequired||userId==null)
            throw DeviceMoreReadFailure.sessionChanged()
        if(!valid(deviceId)||deviceId=="."||deviceId=="..")throw DeviceMoreReadFailure.readFailed()
        try {
            val proof=try {access.authorize(deviceId,accountRevision)} catch(error:ApiFailure) {
                if(error.code==403||error.code==1342)throw DeviceMoreReadFailure.lostOwnership()
                throw error
            }
            requireCurrent(accountRevision,userId)
            if(proof.accountRevision!=accountRevision||proof.resourceId!=deviceId||proof.userId!=userId||!valid(proof.productId))
                throw DeviceMoreReadFailure.readFailed()
            val scope=DeviceMoreScope(accountRevision,deviceId,userId,proof.productId)
            val result=work(scope)
            requireCurrent(accountRevision,userId)
            return result
        }catch(error:CancellationException) {throw error}
        catch(error:Exception) {
            requireCurrent(accountRevision,userId)
            throw DeviceMoreReadFailure.from(error)
        }
    }
    private suspend fun requireCurrent(revision:Long,userId:String) {
        currentCoroutineContext().ensureActive()
        val live=contexts.value
        if(live.revision!=revision||live.cleanupRequired||live.session?.userId!=userId)throw DeviceMoreReadFailure.sessionChanged()
    }
    private fun valid(value:String)=value.isNotBlank()&&value.none {it.isISOControl()}
}

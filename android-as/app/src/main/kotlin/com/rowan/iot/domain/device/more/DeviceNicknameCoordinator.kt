package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.state.*
import com.rowan.iot.domain.network.ApiFailure
import java.util.UUID
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

/**
 * Application singleton; intentionally NOT wired into a module/page in this draft.
 * Default absent policy fails closed. Actual journal IO is retained to completion.
 * An HTTP response is not a causal proof; only explicit matching readback is confirmed.
 */
class DeviceNicknameCoordinator(
    private val applicationScope:CoroutineScope,
    private val contexts:StateFlow<AccountContext>,
    private val access:DeviceAccessGateway,
    private val journal:NicknameJournal,
    private val repositories:(DeviceMoreScope)->NicknameRepository,
    private val policy:NicknamePolicy?=null,
    private val onConfirmed:(NicknameBinding,String)->Unit={_,_->},
    private val onOwnershipRevoked:(NicknameBinding)->Unit={},
) {
    private class Running(val target:String,val task:NicknameTask)
    private val monitor=Any()
    private val running=mutableMapOf<String,Running>()
    // Intent deduplication lasts for the actual native handle, including terminal
    // results. A delayed old click cannot undo a newer confirmed name on this page.
    private val intents=java.util.IdentityHashMap<DeviceReadHandle,MutableMap<String,Running>>()
    private fun accountCurrent(scope:DeviceMoreScope):Boolean {
        val value=contexts.value
        return value.revision==scope.accountRevision&&!value.cleanupRequired&&value.session?.userId==scope.userId
    }
    private fun bindingCurrent(binding:NicknameBinding):Boolean {
        if(!accountCurrent(binding.scope)||!runCatching {binding.pageCurrent()}.getOrDefault(false))return false
        val snapshot=(binding.handle.state.value as? DeviceObservationState.Current)?.snapshot?:return false
        return snapshot.accountRevision==binding.scope.accountRevision&&snapshot.resourceId==binding.scope.resourceId&&
            snapshot.phase!=DeviceReadPhase.FORBIDDEN&&snapshot.failure!=DeviceReadFailure.AUTHORIZATION&&
            snapshot.metadata?.productId==binding.scope.productId
    }
    private fun ready(binding:NicknameBinding)=binding.scope.accountRevision>=0&&bindingCurrent(binding)&&
        listOf(binding.scope.resourceId,binding.scope.userId,binding.scope.productId).all {it.isNotBlank()&&it.none(Char::isISOControl)}&&
        binding.scope.resourceId!="."&&binding.scope.resourceId!=".."
    private fun closed(code:String):NicknameTask {
        val view=NicknameView("","rejected",errorCode=code)
        return NicknameTask(MutableStateFlow(view).asStateFlow(),CompletableDeferred(view))
    }
    fun begin(binding:NicknameBinding,exactTarget:String,intentId:String):NicknameTask=start(binding,exactTarget,false,intentId)
    fun reconcile(binding:NicknameBinding):NicknameTask=start(binding,"",true,"")
    private fun start(binding:NicknameBinding,target:String,reconcile:Boolean,intentId:String):NicknameTask=synchronized(monitor) {
        if(!ready(binding))return@synchronized closed("session_changed")
        if(!reconcile&&policy==null)return@synchronized closed("unsupported")
        intents.keys.removeAll {it.state.value is DeviceObservationState.Closed}
        val pageIntents=intents.getOrPut(binding.handle){mutableMapOf()}
        if(!reconcile) {
            if(intentId.length !in 1..128||intentId.any(Char::isISOControl))return@synchronized closed("invalid_input")
            pageIntents[intentId]?.let {return@synchronized if(it.target==target)it.task else closed("busy")}
            // Engineering admission bound, not a nickname/product input rule.
            if(pageIntents.size>=64)return@synchronized closed("busy")
        }
        val key=nicknameKey(binding.scope.userId,binding.scope.resourceId)
        running[key]?.let {existing->
            // One actual IO workflow per resource; concurrent reconciliation also shares it.
            if(reconcile||existing.target==target) {
                if(!reconcile)pageIntents[intentId]=existing
                return@synchronized existing.task
            }
            return@synchronized closed("busy")
        }
        val operationId=UUID.randomUUID().toString()
        val state=MutableStateFlow(NicknameView(operationId,"preparing"))
        lateinit var task:NicknameTask
        val deferred=applicationScope.async(start=CoroutineStart.LAZY) {work(binding,key,target,reconcile,operationId,state)}
        task=NicknameTask(state.asStateFlow(),deferred)
        running[key]=Running(target,task)
        if(!reconcile)pageIntents[intentId]=Running(target,task)
        deferred.invokeOnCompletion {synchronized(monitor){if(running[key]?.task===task)running.remove(key)}}
        deferred.start();task
    }
    private fun verifyAccount(scope:DeviceMoreScope) {
        if(!accountCurrent(scope))throw ApiFailure(499,"session_changed")
    }
    private fun revoke(binding:NicknameBinding) {
        if(bindingCurrent(binding))runCatching {onOwnershipRevoked(binding)}
    }
    private suspend fun authorize(binding:NicknameBinding):AuthorizedDevice {
        val scope=binding.scope;verifyAccount(scope)
        val proof=try {access.authorize(scope.resourceId,scope.accountRevision)}
        catch(error:ApiFailure) {if(error.code in setOf(403,1342))revoke(binding);throw error}
        verifyAccount(scope)
        if(proof.accountRevision!=scope.accountRevision||proof.resourceId!=scope.resourceId||
            proof.userId!=scope.userId||proof.productId!=scope.productId)throw ApiFailure(499,"session_changed")
        return proof
    }
    private fun failure(error:Exception):String=when((error as? ApiFailure)?.code) {
        401->"not_authenticated";403,1342,1382->"forbidden";1381->"not_found";499->"session_changed"
        else->"unknown_result"
    }
    private suspend fun work(binding:NicknameBinding,key:String,target:String,reconcile:Boolean,operationId:String,
        state:MutableStateFlow<NicknameView>):NicknameView {
        var record:NicknameRecord?=null
        fun emit(value:NicknameView):NicknameView {state.value=value;return value}
        fun unknown(code:String="unknown_result")=emit(NicknameView(record?.operationId?:operationId,"unknown",errorCode=code))
        try {
            try {record=journal.load(key)}catch(_:Exception){return emit(NicknameView(operationId,"rejected",errorCode="storage_unavailable"))}
            verifyAccount(binding.scope)
            val saved=record
            if(saved!=null&&(saved.userId!=binding.scope.userId||saved.resourceId!=binding.scope.resourceId||
                saved.productId!=binding.scope.productId))return unknown("session_changed")
            if(reconcile) {
                if(saved==null)return emit(NicknameView("","idle"))
                if(saved.phase!=NicknamePhase.UNKNOWN)return terminalView(saved).let(::emit)
                authorize(binding)
            } else {
                if(saved?.phase==NicknamePhase.UNKNOWN)return unknown(if(saved.target==target)"unknown_result" else "busy")
                val proof=authorize(binding)
                if(policy?.permits(proof,target)!=true)return emit(NicknameView(operationId,"rejected",errorCode="invalid_input"))
                if(!bindingCurrent(binding))return emit(NicknameView(operationId,"rejected",errorCode="session_changed"))
                val candidate=NicknameRecord(key,operationId,binding.scope.userId,binding.scope.resourceId,binding.scope.productId,target)
                try {record=journal.reserve(candidate)}catch(_:Exception){return emit(NicknameView(operationId,"rejected",errorCode="storage_unavailable"))}
                if(record!!.operationId!=operationId)return unknown(if(record!!.target==target)"unknown_result" else "busy")
                // Durable UNKNOWN exists now; cancellation or any later ambiguity never replays PATCH.
                currentCoroutineContext().ensureActive();verifyAccount(binding.scope)
                val repository=repositories(binding.scope)
                if(repository.scope!=binding.scope)return unknown("session_changed")
                emit(NicknameView(operationId,"sending"))
                try {repository.patch(target)}
                catch(error:CancellationException){return unknown()}
                catch(error:Exception) {
                    if((error as? ApiFailure)?.code==1382)revoke(binding)
                    val code=failure(error)
                    if(code in setOf("not_authenticated","forbidden","not_found")) {
                        val rejected=record!!.terminal(NicknamePhase.REJECTED,code)
                        val persisted=try {journal.complete(rejected)}catch(_:Exception){false}
                        if(persisted)return emit(terminalView(rejected))
                        return unknown("storage_unavailable")
                    }
                    return unknown(code)
                }
                emit(NicknameView(operationId,"accepted"))
            }
            verifyAccount(binding.scope)
            val existing=record?:return unknown()
            val repository=repositories(binding.scope)
            if(repository.scope!=binding.scope)return unknown("session_changed")
            emit(NicknameView(existing.operationId,"checking"))
            val observed=try {repository.readNickname()}catch(error:Exception) {
                if((error as? ApiFailure)?.code in setOf(1342,1382))revoke(binding)
                return unknown(failure(error))
            }
            verifyAccount(binding.scope)
            if(observed==null||observed!=existing.target)return unknown()
            val confirmed=existing.terminal(NicknamePhase.CONFIRMED)
            try {if(!journal.complete(confirmed))return unknown("storage_unavailable")}
            catch(_:Exception){return unknown("storage_unavailable")}
            currentCoroutineContext().ensureActive()
            if(bindingCurrent(binding))runCatching {onConfirmed(binding,observed)}
            return emit(terminalView(confirmed))
        }catch(error:CancellationException) {return unknown()}
        catch(error:Exception) {
            val code=failure(error)
            return if(record?.phase==NicknamePhase.UNKNOWN)unknown(code) else emit(NicknameView(operationId,"rejected",errorCode=code))
        }
    }
    private fun terminalView(record:NicknameRecord)=when(record.phase) {
        NicknamePhase.CONFIRMED->NicknameView(record.operationId,"confirmed",record.target)
        NicknamePhase.REJECTED->NicknameView(record.operationId,"rejected",errorCode=record.errorCode)
        NicknamePhase.UNKNOWN->NicknameView(record.operationId,"unknown",errorCode="unknown_result")
    }
}

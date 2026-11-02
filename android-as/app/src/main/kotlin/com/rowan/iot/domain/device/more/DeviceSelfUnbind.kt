package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.state.*
import com.rowan.iot.domain.network.ApiFailure
import java.security.MessageDigest
import java.util.UUID
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

enum class SelfUnbindPhase { UNKNOWN, ACKNOWLEDGED, ABSENCE_OBSERVED, CONFIRMED, ALREADY_ABSENT, REJECTED }
class SelfUnbindRecord(val key:String,val operationId:String,val userId:String,val resourceId:String,val productId:String,
    val originToken:String,val phase:SelfUnbindPhase=SelfUnbindPhase.UNKNOWN,val errorCode:String="",val resourceToken:String="") {
    fun terminal(phase:SelfUnbindPhase,error:String="")=SelfUnbindRecord(key,operationId,userId,resourceId,productId,originToken,phase,error,resourceToken)
    override fun toString()="SelfUnbindRecord(phase=$phase,redacted)"
}
fun selfUnbindKey(userId:String,resourceId:String):String {
    val digest=MessageDigest.getInstance("SHA-256")
    for(value in listOf("rowan.self-unbind.v1",userId,resourceId)) {
        val bytes=value.toByteArray(Charsets.UTF_8)
        digest.update(byteArrayOf((bytes.size ushr 24).toByte(),(bytes.size ushr 16).toByte(),(bytes.size ushr 8).toByte(),bytes.size.toByte()));digest.update(bytes)
    }
    return digest.digest().joinToString(""){"%02x".format(it)}
}
interface SelfUnbindJournal {
    suspend fun load(key:String):SelfUnbindRecord?
    suspend fun reserve(candidate:SelfUnbindRecord):SelfUnbindRecord
    suspend fun complete(record:SelfUnbindRecord):Boolean
}
interface SelfUnbindRecoveryJournal:SelfUnbindJournal {suspend fun unresolved(userId:String):List<SelfUnbindRecord>}
interface SelfUnbindRepository {
    val scope:DeviceMoreScope
    suspend fun deleteSelf()
    /** Only a successfully decoded complete HOME01 array proves membership/absence. */
    suspend fun isOwned():Boolean
}
/** Native-only capability: retain this object for the actual handle's relationship incarnation.
 * relationshipCurrent must be retired before PAIR06/rebind replaces that incarnation.
 * No page/JS may manufacture/reuse this token. Leaving a page does not cancel app-owned I/O.
 */
class SelfUnbindBinding internal constructor(val scope:DeviceMoreScope,val handle:DeviceReadHandle,
    val relationshipCurrent:()->Boolean,val pageCurrent:()->Boolean) {
    internal val originToken=UUID.randomUUID().toString()
    override fun toString()="SelfUnbindBinding(redacted)"
}
class SelfUnbindView(val operationId:String,val state:String,val errorCode:String="") {
    override fun toString()="SelfUnbindView(state=$state,errorCode=$errorCode)"
}
class SelfUnbindTask internal constructor(val state:StateFlow<SelfUnbindView>,private val worker:Deferred<SelfUnbindView>) {
    suspend fun await():SelfUnbindView=worker.await() // Cancels only the waiter, never the native worker.
}
/** Must actually revoke original resources and receive HOME cache invalidation acknowledgement.
 * false means confirmed_cleanup_pending, never completed success. No no-op default exists.
 */
interface SelfUnbindInvalidation {
    suspend fun apply(record:SelfUnbindRecord,binding:SelfUnbindBinding):Boolean
    fun capture(binding:SelfUnbindBinding):String?
    fun ownershipLost(binding:SelfUnbindBinding,resourceToken:String)
}

/** Application-owned single-flight operation. MORE02 has no role restriction beyond fresh ownership. */
class DeviceSelfUnbindCoordinator(private val applicationScope:CoroutineScope,private val contexts:StateFlow<AccountContext>,
    private val access:DeviceAccessGateway,private val journal:SelfUnbindJournal,
    private val repositories:(DeviceMoreScope)->SelfUnbindRepository,private val invalidation:SelfUnbindInvalidation,
    private val onSettled:(()->Unit)?=null) {
    private val lock=Any()
    private class Running(val binding:SelfUnbindBinding,val task:SelfUnbindTask)
    private val running=mutableMapOf<String,Running>()
    private val intents=java.util.WeakHashMap<SelfUnbindBinding,MutableMap<String,SelfUnbindTask>>()
    private fun current(scope:DeviceMoreScope)=contexts.value.let {it.revision==scope.accountRevision&&!it.cleanupRequired&&it.session?.userId==scope.userId}
    private fun attached(binding:SelfUnbindBinding):Boolean {
        if(!current(binding.scope)||!binding.relationshipCurrent())return false
        val value=(binding.handle.state.value as? DeviceObservationState.Current)?.snapshot?:return false
        return value.accountRevision==binding.scope.accountRevision&&value.resourceId==binding.scope.resourceId&&
            value.metadata?.productId==binding.scope.productId&&value.phase!=DeviceReadPhase.FORBIDDEN
    }
    private fun requireCurrent(scope:DeviceMoreScope) {if(!current(scope))throw ApiFailure(499,"session_changed")}
    private fun refused(code:String):SelfUnbindTask {
        val value=SelfUnbindView("","rejected",code);return SelfUnbindTask(MutableStateFlow(value),CompletableDeferred(value))
    }
    fun isRunning(key:String):Boolean=synchronized(lock){running[key]!=null}
    fun begin(binding:SelfUnbindBinding,intentId:String):SelfUnbindTask=start(binding,intentId,false)
    fun reconcile(binding:SelfUnbindBinding):SelfUnbindTask=start(binding,"",true)
    private fun start(binding:SelfUnbindBinding,intent:String,reconcile:Boolean):SelfUnbindTask=synchronized(lock) {
        val scope=binding.scope
        if(!current(scope)||listOf(scope.userId,scope.resourceId,scope.productId).any {it.isBlank()||it.any(Char::isISOControl)}||scope.resourceId in setOf(".",".."))
            return@synchronized refused("session_changed")
        if(!reconcile&&(!attached(binding)||!binding.pageCurrent()))return@synchronized refused("session_changed")
        intents.keys.removeAll {it.handle.state.value is DeviceObservationState.Closed}
        if(!reconcile) {
            if(intent.length !in 1..128||intent.any(Char::isISOControl))return@synchronized refused("invalid_input")
            intents[binding]?.get(intent)?.let {return@synchronized it}
            if((intents[binding]?.size?:0)>=64||intents.size>=64&&binding !in intents)return@synchronized refused("busy")
        }
        val key=selfUnbindKey(scope.userId,scope.resourceId)
        running[key]?.let {
            if(it.binding!==binding)return@synchronized refused("busy") // Never deliver an old account/incarnation task to a new binding.
            if(!reconcile)intents.getOrPut(binding){mutableMapOf()}[intent]=it.task
            return@synchronized it.task
        }
        if(running.size>=64||intents.size>=64&&binding !in intents)return@synchronized refused("busy")
        val resourceToken=if(reconcile)"" else invalidation.capture(binding)?:return@synchronized refused("session_changed")
        val id=UUID.randomUUID().toString();val state=MutableStateFlow(SelfUnbindView(id,"preparing"))
        val worker=applicationScope.async(start=CoroutineStart.LAZY){work(binding,key,id,reconcile,state,resourceToken)}
        val task=SelfUnbindTask(state.asStateFlow(),worker);running[key]=Running(binding,task)
        if(!reconcile)intents.getOrPut(binding){mutableMapOf()}[intent]=task
        worker.invokeOnCompletion {synchronized(lock){if(running[key]?.task===task)running.remove(key)};runCatching {onSettled?.invoke()}}
        worker.start();task
    }
    private suspend fun work(binding:SelfUnbindBinding,key:String,id:String,reconcile:Boolean,state:MutableStateFlow<SelfUnbindView>,resourceToken:String):SelfUnbindView {
        var record:SelfUnbindRecord?=null
        var dispatched=false
        fun emit(status:String,error:String=""):SelfUnbindView=SelfUnbindView(record?.operationId?:id,status,error).also {state.value=it}
        fun terminalStatus(record:SelfUnbindRecord):String {
            val status=if(record.phase==SelfUnbindPhase.CONFIRMED)"confirmed" else "already_absent"
            return if(record.originToken==binding.originToken&&binding.relationshipCurrent())status else "historical_"+status
        }
        fun pendingStatus()=if(record?.phase==SelfUnbindPhase.ABSENCE_OBSERVED)"already_absent_cleanup_pending" else "confirmed_cleanup_pending"
        suspend fun persist(next:SelfUnbindRecord):Boolean=try {journal.complete(next).also {if(it)record=next}}catch(_:Exception){false}
        suspend fun notSent(code:String):SelfUnbindView {
            val saved=record?:return emit("rejected",code)
            return if(persist(saved.terminal(SelfUnbindPhase.REJECTED,code)))emit("rejected",code) else emit("unknown","storage_unavailable")
        }
        try {
            record=try {journal.load(key)}catch(_:Exception){return emit("rejected","storage_unavailable")}
            requireCurrent(binding.scope)
            val saved=record
            if(saved!=null&&(saved.userId!=binding.scope.userId||saved.resourceId!=binding.scope.resourceId||saved.productId!=binding.scope.productId))return emit("unknown","session_changed")
            val repo=repositories(binding.scope)
            if(repo.scope!=binding.scope)return emit("rejected","session_changed")
            if(reconcile) {
                if(saved==null)return emit("idle")
                if(saved.phase==SelfUnbindPhase.REJECTED)return emit("rejected",saved.errorCode)
                if(saved.phase in setOf(SelfUnbindPhase.CONFIRMED,SelfUnbindPhase.ALREADY_ABSENT)) {
                    return emit(terminalStatus(saved),saved.errorCode)
                }
                if(saved.phase==SelfUnbindPhase.UNKNOWN) {
                    emit("checking")
                    if(repo.isOwned())return emit("unknown","unknown_result") // Presence can be a later rebind; never repeat DELETE.
                    requireCurrent(binding.scope)
                    val acknowledged=saved.terminal(SelfUnbindPhase.ABSENCE_OBSERVED,"absence_observed")
                    if(!persist(acknowledged)) {
                        record=acknowledged
                        if(current(binding.scope))invalidation.apply(acknowledged,binding)
                        return emit(pendingStatus(),"storage_unavailable")
                    }
                }
            } else {
                if(saved?.phase in setOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED))
                    return emit(if(saved?.phase==SelfUnbindPhase.UNKNOWN)"unknown" else pendingStatus(),saved?.errorCode?:"unknown_result")
                val proof=try {access.authorize(binding.scope.resourceId,binding.scope.accountRevision)}catch(error:ApiFailure) {
                    if(error.code in setOf(403,1342)&&current(binding.scope)&&binding.relationshipCurrent())invalidation.ownershipLost(binding,resourceToken)
                    return emit("rejected",if(error.code in setOf(403,1342))"forbidden" else if(error.code==499)"session_changed" else "unavailable")
                }
                requireCurrent(binding.scope)
                if(proof.accountRevision!=binding.scope.accountRevision||proof.userId!=binding.scope.userId||proof.resourceId!=binding.scope.resourceId||proof.productId!=binding.scope.productId||!attached(binding)||!binding.pageCurrent())
                    return emit("rejected","session_changed")
                val candidate=SelfUnbindRecord(key,id,binding.scope.userId,binding.scope.resourceId,binding.scope.productId,binding.originToken,resourceToken=resourceToken)
                record=try {journal.reserve(candidate)}catch(_:Exception){return emit("rejected","storage_unavailable")}
                if(record!!.operationId!=id)return emit("unknown","unknown_result")
                currentCoroutineContext().ensureActive();requireCurrent(binding.scope)
                if(!attached(binding)||!binding.pageCurrent())return notSent("session_changed")
                dispatched=true;emit("sending")
                var absenceCode:String?=null
                try {repo.deleteSelf()}
                catch(error:ApiFailure) {
                    if(error.code !in setOf(1361,1362)) {
                        if(error.code in setOf(400,401,403)) {
                            val code=when(error.code){401->"not_authenticated";403->"forbidden";else->"invalid_input"}
                            if(!persist(record!!.terminal(SelfUnbindPhase.REJECTED,code)))return emit("unknown","storage_unavailable")
                            return emit("rejected",code)
                        }
                        return emit("unknown",if(error.code==499)"session_changed" else "unknown_result")
                    }
                    absenceCode=if(error.code==1361)"not_found" else "not_bound" // Absence is not this DELETE acknowledgement.
                }
                val acknowledged=if(absenceCode!=null)record!!.terminal(SelfUnbindPhase.ABSENCE_OBSERVED,absenceCode) else record!!.terminal(SelfUnbindPhase.ACKNOWLEDGED)
                if(!persist(acknowledged)) {
                    record=acknowledged
                    if(current(binding.scope))invalidation.apply(acknowledged,binding)
                    return emit(pendingStatus(),"storage_unavailable")
                }
            }
            requireCurrent(binding.scope)
            val acknowledged=record?:return emit("unknown","unknown_result")
            emit(pendingStatus())
            if(!invalidation.apply(acknowledged,binding))return emit(pendingStatus())
            requireCurrent(binding.scope)
            if(!persist(acknowledged.terminal(if(acknowledged.phase==SelfUnbindPhase.ABSENCE_OBSERVED)SelfUnbindPhase.ALREADY_ABSENT else SelfUnbindPhase.CONFIRMED,acknowledged.errorCode)))return emit(pendingStatus(),"storage_unavailable")
            return emit(terminalStatus(record!!),record!!.errorCode)
        }catch(_:CancellationException){
            if(!dispatched&&record?.operationId==id&&record?.phase==SelfUnbindPhase.UNKNOWN)return notSent("cancelled")
            return emit(if(record?.phase in setOf(SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED))pendingStatus() else "unknown","unknown_result")}
        catch(error:Exception) {
            if(!dispatched&&record?.operationId==id&&record?.phase==SelfUnbindPhase.UNKNOWN)return notSent("session_changed")
            val code=if((error as? ApiFailure)?.code==499)"session_changed" else "unknown_result"
            return emit(if(record?.phase in setOf(SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED))pendingStatus() else if(record==null)"rejected" else "unknown",code)
        }
    }
}

/** Retained native dirty tickets. A successful fresh HOME read which omits the resource
 * must install its cache BEFORE acknowledging this exact ticket. No timer auto-acks it.
 */
class SelfUnbindHomeTicket internal constructor(val sequence:Long,val accountRevision:Long,internal val record:SelfUnbindRecord) {
    override fun toString()="SelfUnbindHomeTicket(sequence=$sequence,redacted)"
}
class SelfUnbindHomeLedger(private val current:(Long,String)->Boolean) {
    private val lock=Any();private var sequence=0L
    private val entries=mutableMapOf<String,Pair<SelfUnbindHomeTicket,Boolean>>()
    private val changes=MutableStateFlow(0L);val revisions=changes.asStateFlow()
    fun request(record:SelfUnbindRecord,revision:Long):SelfUnbindHomeTicket=synchronized(lock) {
        entries[record.operationId]?.let {if(it.first.accountRevision==revision)return@synchronized it.first}
        if(entries.size>=64&&record.operationId !in entries)entries.entries.firstOrNull {it.value.second}?.let {entries.remove(it.key)}
        if(entries.size>=64&&record.operationId !in entries)throw IllegalStateException("invalidation_capacity")
        val ticket=SelfUnbindHomeTicket(++sequence,revision,record);entries[record.operationId]=ticket to false;changes.value=sequence;ticket
    }
    fun pending(revision:Long):List<SelfUnbindHomeTicket> =synchronized(lock){entries.values.filter {!it.second&&it.first.accountRevision==revision&&current(revision,it.first.record.userId)}.map {it.first}}
    fun acknowledge(ticket:SelfUnbindHomeTicket,actualOwnedIds:Set<String>):Boolean=synchronized(lock) {
        val entry=entries[ticket.record.operationId]?:return@synchronized false
        if(entry.first!==ticket||!current(ticket.accountRevision,ticket.record.userId)||ticket.record.resourceId in actualOwnedIds)return@synchronized false
        entries[ticket.record.operationId]=ticket to true;true
    }
    internal fun confirmed(ticket:SelfUnbindHomeTicket)=synchronized(lock){entries[ticket.record.operationId]?.let {it.first===ticket&&it.second}==true}
}
/** Real owner revocation, plus retained HOME invalidation requiring a consumer acknowledgement.
 * Recovered journal entries never acquire authority to revoke a new handle/incarnation.
 */
class NativeSelfUnbindInvalidation(private val owner:DeviceReadOwner,private val ledger:SelfUnbindHomeLedger,
    private val current:(Long,String)->Boolean):SelfUnbindInvalidation {
    override fun capture(binding:SelfUnbindBinding):String? {
        if(!current(binding.scope.accountRevision,binding.scope.userId)||!binding.relationshipCurrent())return null
        return owner.captureOwnershipReceipt(binding.handle)?.encoded
    }
    override fun ownershipLost(binding:SelfUnbindBinding,resourceToken:String) {
        if(current(binding.scope.accountRevision,binding.scope.userId))owner.retireOwnershipReceipt(resourceToken)
    }
    override suspend fun apply(record:SelfUnbindRecord,binding:SelfUnbindBinding):Boolean {
        val scope=binding.scope
        if(record.phase !in setOf(SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED)||!current(scope.accountRevision,record.userId)||record.userId!=scope.userId||record.resourceId!=scope.resourceId||record.productId!=scope.productId)return false
        val retired=owner.retireOwnershipReceipt(record.resourceToken)
        val ticket=ledger.request(record,scope.accountRevision)
        return retired&&ledger.confirmed(ticket)
    }
}

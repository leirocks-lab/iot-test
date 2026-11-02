package com.rowan.iot.domain.device.more

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.state.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.lang.ref.WeakReference
import java.util.IdentityHashMap
import java.util.concurrent.atomic.AtomicBoolean

class NativeSelfUnbindOperation internal constructor(val state:StateFlow<SelfUnbindView>,private val settled:Deferred<Unit>) {
    /** Initial native I/O settlement may still be cleanup_pending; state follows durable cleanup. */
    suspend fun await():SelfUnbindView {settled.await();return state.value}
}
class NativeSelfUnbindRegistration internal constructor(val binding:SelfUnbindBinding,internal val issuer:Any,internal val replace:()->Boolean,private val alive:AtomicBoolean,private val release:()->Unit):AutoCloseable {
    override fun close(){if(alive.compareAndSet(true,false))release()}
}

/** App singleton. HOME recovery only reads this feature's journal and never instantiates a device owner.
 * No DELETE in recovery. Core is private/lazy; only explicit begin on a native capability can dispatch.
 */
class SelfUnbindApplication(
    applicationScope:CoroutineScope,private val contexts:StateFlow<AccountContext>,
    private val journal:SelfUnbindRecoveryJournal,private val access:DeviceAccessGateway,
    private val repositories:(DeviceMoreScope)->SelfUnbindRepository,
    private val ownerIfCreated:()->DeviceReadOwner?,
):AutoCloseable {
    private data class Identity(val revision:Long,val user:String)
    private data class AckKey(val revision:Long,val user:String,val resource:String,val operation:String)
    private val acknowledgedAuthorities=mutableSetOf<AckKey>()
    private val replacedReceipts=mutableSetOf<String>()
    private class Incarnation(val receipt:String,val revision:Long,val user:String,val resource:String){val alive=AtomicBoolean(true);var displayCurrent=true}
    private class Registration(val value:NativeSelfUnbindRegistration,val incarnation:Incarnation)
    private class Operation(val task:SelfUnbindTask,val binding:SelfUnbindBinding,val incarnation:Incarnation,val state:MutableStateFlow<SelfUnbindView>,val value:NativeSelfUnbindOperation)
    private val lifetime=SupervisorJob(applicationScope.coroutineContext[Job])
    private val scope=CoroutineScope(applicationScope.coroutineContext+lifetime)
    private val lock=Any()
    @Volatile private var closed=false
    private var identity:Identity?=capture()
    private var recovery:Job?=null
    private var queued=false
    private val registrations=IdentityHashMap<DeviceReadHandle,Registration>()
    private val incarnations=mutableMapOf<String,WeakReference<Incarnation>>()
    private val operations=linkedMapOf<String,Operation>()
    private val completed=linkedMapOf<String,SelfUnbindRecord>()
    private val intents=linkedMapOf<Pair<String,String>,String>()
    private val errors=MutableStateFlow("");val recoveryError=errors.asStateFlow()
    val ledger=SelfUnbindHomeLedger(::current)
    private val invalidation=object:SelfUnbindInvalidation {
        override fun capture(binding:SelfUnbindBinding):String? {
            if(!current(binding.scope.accountRevision,binding.scope.userId)||!binding.relationshipCurrent())return null
            return ownerIfCreated()?.captureOwnershipReceipt(binding.handle)?.encoded
        }
        override fun ownershipLost(binding:SelfUnbindBinding,resourceToken:String){if(current(binding.scope.accountRevision,binding.scope.userId))retire(resourceToken)}
        override suspend fun apply(record:SelfUnbindRecord,binding:SelfUnbindBinding):Boolean {
            if(!current(binding.scope.accountRevision,record.userId)||record.resourceId!=binding.scope.resourceId||record.productId!=binding.scope.productId)return false
            val retired=retire(record.resourceToken);val ticket=ledger.request(record,binding.scope.accountRevision)
            return retired&&refreshAcknowledgedAuthority(record,binding.scope.accountRevision)&&ledger.confirmed(ticket)
        }
    }
    private val coreDelegate=lazy {DeviceSelfUnbindCoordinator(scope,contexts,access,journal,repositories,invalidation,::requestRecovery)}
    private val accountWatch=scope.launch {contexts.collect {accountChanged()}}
    private fun capture():Identity?=contexts.value.let {c->c.session?.takeUnless {c.cleanupRequired}?.let {Identity(c.revision,it.userId)}}
    private fun current(revision:Long,user:String)=!closed&&scope.isActive&&capture()==Identity(revision,user)
    private fun retire(receipt:String):Boolean=when(DeviceReadOwner.receiptFromPreviousProcess(receipt)) {
        true->true
        false->ownerIfCreated()?.retireOwnershipReceipt(receipt)==true
        null->false
    }
    private fun accountChanged() {
        synchronized(lock) {
            val next=capture();if(identity!=next){identity=next;completed.clear();acknowledgedAuthorities.clear();replacedReceipts.clear();errors.value=""
                operations.values.forEach {op->if(!current(op.binding.scope.accountRevision,op.binding.scope.userId))op.state.value=SelfUnbindView(op.state.value.operationId,"session_changed","session_changed")}
            }
        }
        requestRecovery()
    }
    /** Native registration owns one actual handle; caller closes this registration on observer release.
     * A page close does not retire the resource incarnation shared with other observers. */
    fun register(handle:DeviceReadHandle,expectedRevision:Long,pageCurrent:()->Boolean):NativeSelfUnbindRegistration?=synchronized(lock) {
        if(closed||!scope.isActive)return@synchronized null
        val source=capture()?:return@synchronized null
        val snapshot=(handle.state.value as? DeviceObservationState.Current)?.snapshot?:return@synchronized null
        val product=snapshot.metadata?.productId?:return@synchronized null
        registrations[handle]?.let {return@synchronized if(it.value.binding.scope.accountRevision==expectedRevision&&current(expectedRevision,it.value.binding.scope.userId))it.value else null}
        if(source.revision!=expectedRevision||snapshot.accountRevision!=expectedRevision||registrations.size>=64)return@synchronized null
        val owner=ownerIfCreated()?:return@synchronized null
        val receipt=owner.captureOwnershipReceipt(handle)?.encoded?:return@synchronized null
        if(!current(source.revision,source.user))return@synchronized null
        incarnations.entries.removeAll {it.value.get()==null}
        if(incarnations.size>=256&&receipt !in incarnations)return@synchronized null
        // Historical UI origin is separate from relationship authority: no confirmed PAIR occurred here.
        incarnations.values.mapNotNull {it.get()}.filter {it.revision==source.revision&&it.user==source.user&&it.resource==snapshot.resourceId&&it.receipt!=receipt}.forEach {it.displayCurrent=false}
        val incarnation=incarnations[receipt]?.get()?:Incarnation(receipt,source.revision,source.user,snapshot.resourceId).also {incarnations[receipt]=WeakReference(it)}
        val alive=AtomicBoolean(true)
        val binding=SelfUnbindBinding(DeviceMoreScope(source.revision,snapshot.resourceId,source.user,product),handle,
            {incarnation.alive.get()&&current(source.revision,source.user)},{alive.get()&&pageCurrent()})
        val weak=WeakReference(this)
        val registration=NativeSelfUnbindRegistration(binding,this,{
            val app=weak.get()
            if(app==null||!app.current(source.revision,source.user))false else {
                app.replaceRelationship(incarnation)
            }
        },alive){weak.get()?.let {app->synchronized(app.lock){app.registrations.remove(handle)}}}
        registrations[handle]=Registration(registration,incarnation);registration
    }
    /** Same account/resource group is a native relationship, independent of ordinary resource serials. */
    private fun replaceRelationship(origin:Incarnation):Boolean=synchronized(lock) {
        if(!current(origin.revision,origin.user))return@synchronized false
        if(!origin.alive.get())return@synchronized true // Repeated old PAIR receipt cannot touch a later group.
        val group=incarnations.values.mapNotNull {it.get()}.filter {it.alive.get()&&it.revision==origin.revision&&it.user==origin.user&&it.resource==origin.resource}
        if((replacedReceipts+group.map {it.receipt}).size>256)return@synchronized false
        val owner=ownerIfCreated()?:return@synchronized false
        var result=true
        group.forEach {member->replacedReceipts+=member.receipt;member.alive.set(false);member.displayCurrent=false;if(!owner.replaceOwnershipReceipt(member.receipt))result=false}
        result
    }
    /** Never evict an unresolved ACK marker: capacity exhaustion keeps cleanup pending, no replay. */
    private fun refreshAcknowledgedAuthority(record:SelfUnbindRecord,revision:Long):Boolean=synchronized(lock) {
        if(!current(revision,record.userId))return@synchronized false
        val key=AckKey(revision,record.userId,record.resourceId,record.operationId)
        if(key in acknowledgedAuthorities)return@synchronized true
        if(acknowledgedAuthorities.size>=256)return@synchronized false
        // Reserve before callbacks can reenter recovery; no observer can duplicate this transition.
        acknowledgedAuthorities+=key
        if(DeviceReadOwner.receiptFromPreviousProcess(record.resourceToken)!=true&&record.resourceToken !in replacedReceipts&&ownerIfCreated()?.invalidateAcknowledgedAuthority(revision,record.userId,record.resourceId)==false){acknowledgedAuthorities-=key;return@synchronized false}
        true
    }
    /** Called only by a native confirmed rebind flow before opening the replacement observation. */
    fun relationshipReplaced(registration:NativeSelfUnbindRegistration):Boolean=synchronized(lock) {
        if(registration.issuer!==this||!current(registration.binding.scope.accountRevision,registration.binding.scope.userId))return@synchronized false
        registration.replace()
    }
    /** Admission, stable task deduplication and wrapper installation are one monitor transaction.
     * Wire operation IDs can change when an older journal record is discovered. */
    fun begin(registration:NativeSelfUnbindRegistration,intentId:String):NativeSelfUnbindOperation=synchronized(lock) {
        val binding=registration.binding
        if(closed||registrations[binding.handle]?.value!==registration||!current(binding.scope.accountRevision,binding.scope.userId))return@synchronized refused("session_changed")
        val intent=binding.originToken to intentId
        intents[intent]?.let {key->operations[key]?.let {return@synchronized it.value}}
        if(operations.size>=128) {
            val old=operations.entries.firstOrNull {it.value.state.value.state in setOf("confirmed","already_absent","historical_confirmed","historical_already_absent","rejected","session_changed")}
                ?:return@synchronized refused("busy")
            operations.remove(old.key);intents.entries.removeAll {it.value==old.key}
        }
        // No core creation/dispatch occurs before a slot is available.
        val incarnation=registrations[binding.handle]?.incarnation?:return@synchronized refused("session_changed")
        val task=coreDelegate.value.begin(binding,intentId)
        if(task.state.value.operationId.isEmpty())return@synchronized NativeSelfUnbindOperation(task.state,CompletableDeferred(Unit))
        operations.entries.firstOrNull {it.value.task===task&&it.value.binding===binding}?.let {
            intents[intent]=it.key;return@synchronized it.value.value
        }
        val key=java.util.UUID.randomUUID().toString()
        val state=MutableStateFlow(task.state.value)
        val worker=scope.async(start=CoroutineStart.LAZY) {
            coroutineScope {
                val collect=launch {task.state.collect {value->publishCore(binding,state,value)}}
                try {publishCore(binding,state,task.await())}
                catch(_:CancellationException){publishCore(binding,state,SelfUnbindView(state.value.operationId,"unknown","unknown_result"))}
                finally {collect.cancel();requestRecovery()}
                Unit
            }
        }
        val result=NativeSelfUnbindOperation(state.asStateFlow(),worker)
        operations[key]=Operation(task,binding,incarnation,state,result);intents[intent]=key
        publishCore(binding,state,task.state.value)
        worker.start();result
    }
    /** Read-only native authority; a late disk read cannot overwrite an operation begun meanwhile. */
    suspend fun inspect(registration:NativeSelfUnbindRegistration):NativeSelfUnbindAuthority {
        val binding=registration.binding
        fun active()=registration.issuer===this&&current(binding.scope.accountRevision,binding.scope.userId)
        fun attached():Boolean {
            val snapshot=(binding.handle.state.value as? DeviceObservationState.Current)?.snapshot?:return false
            return registrations[binding.handle]?.value===registration&&binding.relationshipCurrent()&&binding.pageCurrent()&&
                snapshot.accountRevision==binding.scope.accountRevision&&snapshot.resourceId==binding.scope.resourceId&&
                snapshot.metadata?.productId==binding.scope.productId&&snapshot.phase!=DeviceReadPhase.FORBIDDEN
        }
        fun live():NativeSelfUnbindAuthority?=operations.values.lastOrNull {it.binding===binding}?.let {op->
            val view=op.state.value
            NativeSelfUnbindAuthority(view,attached()&&view.state in setOf("rejected","cancelled","idle","historical_confirmed","historical_already_absent"))
        }
        synchronized(lock){if(!active())return NativeSelfUnbindAuthority(SelfUnbindView("","session_changed","session_changed"),false);live()?.let {return it}}
        val saved=journal.load(selfUnbindKey(binding.scope.userId,binding.scope.resourceId))
        return synchronized(lock){
            if(!active())return@synchronized NativeSelfUnbindAuthority(SelfUnbindView("","session_changed","session_changed"),false)
            live()?.let {return@synchronized it}
            if(saved==null)return@synchronized NativeSelfUnbindAuthority(SelfUnbindView("","idle"),attached())
            if(saved.userId!=binding.scope.userId||saved.resourceId!=binding.scope.resourceId||saved.productId!=binding.scope.productId)
                return@synchronized NativeSelfUnbindAuthority(SelfUnbindView("","rejected","session_changed"),false)
            val status=when(saved.phase){
                SelfUnbindPhase.UNKNOWN->"unknown"
                SelfUnbindPhase.ACKNOWLEDGED->"confirmed_cleanup_pending"
                SelfUnbindPhase.ABSENCE_OBSERVED->"already_absent_cleanup_pending"
                SelfUnbindPhase.CONFIRMED,SelfUnbindPhase.ALREADY_ABSENT->project(saved,binding).state
                SelfUnbindPhase.REJECTED->"rejected"
            }
            NativeSelfUnbindAuthority(SelfUnbindView(saved.operationId,status,saved.errorCode),attached()&&saved.phase in setOf(SelfUnbindPhase.CONFIRMED,SelfUnbindPhase.ALREADY_ABSENT,SelfUnbindPhase.REJECTED))
        }
    }
    private fun refused(code:String):NativeSelfUnbindOperation=NativeSelfUnbindOperation(MutableStateFlow(SelfUnbindView("","rejected",code)),CompletableDeferred(Unit))
    private fun historical(binding:SelfUnbindBinding)=operations.values.any {it.binding===binding&&!it.incarnation.displayCurrent}
    private fun publishCore(binding:SelfUnbindBinding,state:MutableStateFlow<SelfUnbindView>,value:SelfUnbindView)=synchronized(lock) {
        if(!current(binding.scope.accountRevision,binding.scope.userId)){state.value=SelfUnbindView(value.operationId,"session_changed","session_changed");return@synchronized}
        val terminal=completed[value.operationId]
        state.value=if(terminal!=null)project(terminal,binding)else if(historical(binding)&&value.state in setOf("confirmed","already_absent"))SelfUnbindView(value.operationId,"historical_"+value.state,value.errorCode)else value
    }
    private fun project(record:SelfUnbindRecord,binding:SelfUnbindBinding):SelfUnbindView {
        val status=if(record.phase==SelfUnbindPhase.CONFIRMED)"confirmed" else "already_absent"
        return SelfUnbindView(record.operationId,if(record.originToken==binding.originToken&&binding.relationshipCurrent()&&!historical(binding))status else "historical_"+status,record.errorCode)
    }
    private fun publishRecord(record:SelfUnbindRecord)=synchronized(lock) {
        if(completed.size>=256&&record.operationId !in completed)completed.keys.firstOrNull {id->operations.values.none {it.state.value.operationId==id}}?.let {completed.remove(it)}
        completed[record.operationId]=record
        operations.values.filter {it.state.value.operationId==record.operationId}.forEach {op->if(current(op.binding.scope.accountRevision,record.userId))op.state.value=project(record,op.binding)}
    }
    /** One actual journal drain plus one coalesced retry bit. No page can cancel its physical I/O. */
    fun requestRecovery() {
        val job=synchronized(lock) {
            if(closed||!scope.isActive)return
            queued=true;if(recovery!=null)return
            val next=scope.launch(start=CoroutineStart.LAZY){
                while(currentCoroutineContext().isActive) {
                    val proceed=synchronized(lock){if(!queued||closed)false else{queued=false;true}}
                    if(!proceed)break
                    recoverOnce()
                }
            }
            recovery=next
            next.invokeOnCompletion {synchronized(lock){if(recovery===next)recovery=null};if(synchronized(lock){queued&&!closed})requestRecovery()}
            next
        }
        job.start()
    }
    private suspend fun recoverOnce() {
        val source=capture()?:return
        val records=try {journal.unresolved(source.user)}catch(_:Exception){if(current(source.revision,source.user))errors.value="storage_unavailable";return}
        if(!current(source.revision,source.user))return
        errors.value=""
        for(saved in records) {
            if(!current(source.revision,source.user))return
            if(coreDelegate.isInitialized()&&coreDelegate.value.isRunning(saved.key))continue
            val ticket=try {ledger.request(saved,source.revision)}catch(_:Exception){errors.value="invalidation_capacity";return}
            var record=saved
            if(record.phase==SelfUnbindPhase.UNKNOWN) {
                if(!ledger.confirmed(ticket))continue
                val observed=record.terminal(SelfUnbindPhase.ABSENCE_OBSERVED,"absence_observed")
                if(!complete(observed,source))continue
                record=observed
            }
            val retired=retire(record.resourceToken)
            if(!retired||!refreshAcknowledgedAuthority(record,source.revision)||!ledger.confirmed(ticket))continue
            val terminal=record.terminal(if(record.phase==SelfUnbindPhase.ACKNOWLEDGED)SelfUnbindPhase.CONFIRMED else SelfUnbindPhase.ALREADY_ABSENT,record.errorCode)
            if(complete(terminal,source))publishRecord(terminal)
        }
    }
    private suspend fun complete(record:SelfUnbindRecord,source:Identity):Boolean {
        if(!current(source.revision,source.user))return false
        val result=try {journal.complete(record)}catch(_:Exception){if(current(source.revision,source.user))errors.value="storage_unavailable";false}
        return result&&current(source.revision,source.user)
    }
    fun acknowledge(ticket:SelfUnbindHomeTicket,ids:Set<String>):Boolean {
        val accepted=ledger.acknowledge(ticket,ids);if(accepted)requestRecovery();return accepted
    }
    override fun close(){synchronized(lock){closed=true;queued=false;registrations.values.toList().forEach {it.value.close()};registrations.clear()};accountWatch.cancel();recovery?.cancel();lifetime.cancel()}
}

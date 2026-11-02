package com.rowan.iot.bridge

import com.rowan.iot.domain.device.more.*
import kotlinx.coroutines.*

/** Native-only input. The platform supplies these closures from one actual observation. */
class SelfUnbindBridgeContext(val observationId:String,val sessionRevision:Long,val current:()->Boolean,
    val title:()->String,val read:suspend ()->NativeSelfUnbindAuthority,val begin:()->SelfUnbindView)
typealias SelfUnbindBridgeAuthority=NativeSelfUnbindAuthority
data class SelfUnbindBridgeState(val observationId:String,val sessionRevision:Long,val revision:Long,
    val status:String,val errorCode:String,val canRequest:Boolean)
class SelfUnbindBridgeProjection(private val id:String,private val session:Long,initialRevision:Long=0) {
    private var value=SelfUnbindBridgeState(id,session,initialRevision,"idle","",false)
    private var exhausted=false
    fun accept(status:String,error:String,allowed:Boolean):SelfUnbindBridgeState {
        if(exhausted)return value
        if(value.status==status&&value.errorCode==error&&value.canRequest==allowed)return value
        if(session !in 0..MAX||value.revision>=MAX){exhausted=true;value=value.copy(status="closed",errorCode="closed",canRequest=false);return value}
        value=SelfUnbindBridgeState(id,session,value.revision+1,status,error,allowed);return value
    }
    companion object {const val MAX=9_007_199_254_740_991L}
}

/** UI-queue confined. Exactly one confirmation per observation; two actual journal reads/module.
 * JS cancellation retracts confirmation only. It never owns/cancels the application mutation. */
class DeviceSelfUnbindBridge(private val scope:CoroutineScope,private val capture:(String)->SelfUnbindBridgeContext?,
    private val confirm:(String,()->Unit,()->Unit)->AutoCloseable,private val knownObservation:(String)->Boolean,private val deadlineMs:Long=20_000):AutoCloseable {
    private class Reply(private var completion:((SelfUnbindBridgeState)->Unit)?) {fun finish(value:SelfUnbindBridgeState){val callback=completion;completion=null;callback?.invoke(value)}}
    private class Pending(val attempt:String,val context:SelfUnbindBridgeContext) {
        val replies=mutableListOf<Reply>();var dialog:AutoCloseable?=null;var job:Job?=null;var timer:Job?=null
    }
    private class Entry(val context:SelfUnbindBridgeContext) {
        val projection=SelfUnbindBridgeProjection(context.observationId,context.sessionRevision)
        var failedBeginPriorId:String?=null
        val used=linkedSetOf<String>();val dispatched=mutableSetOf<String>();var pending:Pending?=null;var preflight:Job?=null;var query:Job?=null;var queryReply:Reply?=null
        var latest=projection.accept("idle","",false)
        fun state(status:String,error:String="",allowed:Boolean=false)=projection.accept(status,error,allowed).also {latest=it}
    }
    private val entries=mutableMapOf<String,Entry>()
    private class CancellationScope {var overflow=false}
    private val cancellationScopes=mutableMapOf<String,CancellationScope>()
    private val cancelled=linkedSetOf<Pair<String,String>>()
    private val jobs=mutableSetOf<Job>()
    private var closed=false
    private fun entry(id:String):Entry? {
        if(closed||!scope.isActive||!valid(id)||!knownObservation(id))return null
        val context=capture(id)?:return null
        if(closed||!scope.isActive||context.observationId!=id||!context.current()||context.sessionRevision !in 0..SelfUnbindBridgeProjection.MAX)return null
        entries[id]?.let {return if(it.context===context)it else null}
        if(entries.size>=8)return null
        return Entry(context).also {entries[id]=it}
    }
    private fun empty(id:String)=SelfUnbindBridgeState(id,0,0,"closed","closed",false)
    private fun valid(attempt:String)=attempt.matches(Regex("[A-Za-z0-9._-]{1,128}"))
    private fun current(entry:Entry)=!closed&&scope.isActive&&entries[entry.context.observationId]===entry&&entry.context.current()
    private fun finish(entry:Entry,pending:Pending,value:SelfUnbindBridgeState) {
        if(entry.pending!==pending)return
        entry.pending=null;pending.timer?.cancel();runCatching {pending.dialog?.close()};pending.dialog=null
        pending.replies.toList().forEach {it.finish(value)};pending.replies.clear()
    }
    fun request(id:String,attempt:String,completion:(SelfUnbindBridgeState)->Unit) {
        val entry=entry(id)?:return completion(empty(id));val reply=Reply(completion)
        if(!valid(attempt)){reply.finish(entry.state(entry.latest.status,"invalid_input"));return}
        if(entry.failedBeginPriorId!=null){reply.finish(entry.state("unknown","unknown_result"));return}
        if(cancellationScopes[id]?.overflow==true){reply.finish(entry.state(entry.latest.status,"busy"));return}
        entry.pending?.let {pending->if(pending.attempt==attempt&&pending.replies.size<8)pending.replies.add(reply)else reply.finish(entry.state(entry.latest.status,"busy"));return}
        if((id to attempt) in cancelled){reply.finish(if(entry.dispatched.isEmpty())entry.state("cancelled","cancelled")else entry.latest);return}
        if(attempt in entry.used){reply.finish(entry.latest);return}
        if(entry.used.size>=64||jobs.size>=2||entry.preflight!=null||entry.query!=null){reply.finish(entry.state(entry.latest.status,"busy"));return}
        entry.used.add(attempt)
        val pending=Pending(attempt,entry.context);pending.replies.add(reply);entry.pending=pending;entry.state("preparing")
        val job=scope.launch(start=CoroutineStart.LAZY) {
            try {
                if(entry.pending!==pending)return@launch
                if(!current(entry)){finish(entry,pending,entry.state("session_changed","session_changed"));return@launch}
                val authority=entry.context.read()
                if(entry.pending!==pending)return@launch
                if(!current(entry)){finish(entry,pending,entry.state("session_changed","session_changed"));return@launch}
                val value=entry.state(authority.view.state,authority.view.errorCode,authority.canRequest)
                if(!authority.canRequest){finish(entry,pending,value);return@launch}
                pending.timer?.cancel();entry.state("confirming")
                val dialog=confirm(entry.context.title(),{
                    if(entry.pending===pending){
                        if(!current(entry))finish(entry,pending,entry.state("session_changed","session_changed"))
                        else {
                            entry.dispatched.add(attempt)
                            try {val result=entry.context.begin();finish(entry,pending,entry.state(result.state,result.errorCode,false))}
                            catch(_:Exception){entry.failedBeginPriorId=authority.view.operationId;finish(entry,pending,entry.state("unknown","unknown_result"))}
                        }
                    }
                },{if(entry.pending===pending)finish(entry,pending,entry.state("cancelled","cancelled"))})
                if(entry.pending===pending)pending.dialog=dialog else dialog.close()
            }catch(_:CancellationException){if(entry.pending===pending)finish(entry,pending,entry.state("cancelled","cancelled"))}
            catch(_:Exception){if(entry.pending===pending)finish(entry,pending,entry.state("rejected","unavailable"))}
        }
        pending.job=job;entry.preflight=job;jobs.add(job);job.invokeOnCompletion {cause->scope.launch(NonCancellable){jobs.remove(job);if(entry.preflight===job)entry.preflight=null;if(cause!=null&&entry.pending===pending)finish(entry,pending,entry.state("closed","closed"))}}
        pending.timer=scope.launch {delay(deadlineMs);if(entry.pending===pending){finish(entry,pending,entry.state("cancelled","timeout"));job.cancel()}}
        job.start()
    }
    /** Registry existence is independent of foreground/write permission. No registration or I/O. */
    fun cancel(id:String,attempt:String) {
        if(!valid(id)||!valid(attempt)||closed||!knownObservation(id))return
        if(entries[id]?.dispatched?.contains(attempt)==true)return
        val cancellation=cancellationScopes[id]?:run {
            if(cancellationScopes.size>=8)return // owning registry has the same eight-observation cap
            CancellationScope().also {cancellationScopes[id]=it}
        }
        if(cancelled.size>=64&&(id to attempt) !in cancelled)cancellation.overflow=true else cancelled.add(id to attempt)
        entries[id]?.let {entry->entry.pending?.takeIf {it.attempt==attempt}?.let {pending->finish(entry,pending,entry.state("cancelled","cancelled"));pending.job?.cancel()}}
    }
    private fun acceptAuthority(entry:Entry,authority:NativeSelfUnbindAuthority):SelfUnbindBridgeState {
        val prior=entry.failedBeginPriorId
        if(prior!=null){
            // A thrown begin might have started an application operation. Idle/old state is
            // not proof of an unsent request. Only a newly attributable native operation clears it.
            if(authority.view.operationId.isEmpty()||authority.view.operationId==prior)return entry.state("unknown","unknown_result")
            entry.failedBeginPriorId=null
        }
        return entry.state(authority.view.state,authority.view.errorCode,authority.canRequest&&cancellationScopes[entry.context.observationId]?.overflow!=true&&entry.used.size<64)
    }
    fun get(id:String,completion:(SelfUnbindBridgeState)->Unit) {
        val entry=entry(id)?:return completion(empty(id));val reply=Reply(completion)
        if(entry.pending!=null){reply.finish(entry.latest);return}
        if(entry.query!=null||entry.preflight!=null||jobs.size>=2){reply.finish(entry.state(entry.latest.status,"busy",false));return}
        val job=scope.launch(start=CoroutineStart.LAZY) {
            try {if(!current(entry)){reply.finish(entry.state("session_changed","session_changed"));return@launch};val authority=entry.context.read();reply.finish(if(current(entry))acceptAuthority(entry,authority)else entry.state("session_changed","session_changed"))}
            catch(_:CancellationException){reply.finish(entry.state("closed","closed"))}
            catch(_:Exception){reply.finish(entry.state(entry.latest.status,"unavailable",false))}
        }
        val timer=scope.launch {delay(deadlineMs);reply.finish(entry.state(entry.latest.status,"timeout",false));job.cancel()}
        entry.query=job;entry.queryReply=reply;jobs.add(job);job.invokeOnCompletion {cause->scope.launch(NonCancellable){timer.cancel();jobs.remove(job);if(cause!=null)reply.finish(entry.state("closed","closed"));if(entry.query===job){entry.query=null;entry.queryReply=null}}};job.start()
    }
    fun suspendObservation(id:String){entries[id]?.let {entry->entry.pending?.let {pending->finish(entry,pending,entry.state("cancelled","cancelled"));pending.job?.cancel()};entry.queryReply?.finish(entry.state("closed","closed"));entry.query?.cancel()}}
    fun release(id:String){suspendObservation(id);entries.remove(id);cancellationScopes.remove(id);cancelled.removeAll {it.first==id}}
    override fun close(){if(closed)return;entries.keys.toList().forEach(::release);closed=true;jobs.toList().forEach {it.cancel()}}
}

package com.rowan.iot.domain.presentation

import com.rowan.iot.domain.account.AccountContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

data class PresentationSystemState(val active:Boolean,val input:PresentationSystemInput?)
interface PresentationSystemSource {
    fun capture():PresentationSystemState
    /** Register before first capture. A throwing implementation must release partial registration. */
    fun observe(changed:()->Unit):AutoCloseable
}
enum class PresentationUnavailable { NOT_STARTED, SYSTEM_INPUT, OWNER, CLOSED }
sealed class PresentationRead {
    data class Ready(val snapshot:PresentationSnapshot):PresentationRead()
    data class Unavailable(val reason:PresentationUnavailable):PresentationRead()
}
/** Payload-free identity marker; StateFlow holds only latest, never queued account snapshots. */
class PresentationInvalidation internal constructor()

/** One app-owned projection service. Signals always recapture current authority; emitted AccountContext
 * values are intentionally ignored. Consumers subscribe then fresh capture, never render event payloads.
 * This service has no HTTP, preference writes, device owner or UI/style application.
 */
class PresentationService(applicationScope:CoroutineScope,private val contexts:StateFlow<AccountContext>,
    private val owner:PresentationOwner,private val system:PresentationSystemSource):AutoCloseable {
    private val lock=Any()
    private val job=SupervisorJob(applicationScope.coroutineContext[Job])
    private val scope=CoroutineScope(applicationScope.coroutineContext+job)
    private var started=false;private var closed=false;private var generation=0L
    private var subscription:AutoCloseable?=null;private var accountWatch:Job?=null
    private var wasActive=false;private var dirty=false
    private var lastRevision:Long?=null;private var lastFailure:PresentationUnavailable?=null
    private val changes=MutableStateFlow(PresentationInvalidation());val invalidations=changes.asStateFlow()
    init {job.invokeOnCompletion {close()}}
    fun start():Boolean {
        val token=synchronized(lock){if(closed||!scope.isActive)return false;if(started)return true;started=true;++generation}
        val observation=try {system.observe {signal(token)}}catch(_:Exception){synchronized(lock){if(generation==token){started=false;generation++}};return false}
        val watch=scope.launch(start=CoroutineStart.LAZY){contexts.collect {signal(token)}}
        val admitted=synchronized(lock){if(closed||!started||generation!=token)false else {subscription=observation;accountWatch=watch;true}}
        if(!admitted){observation.close();watch.cancel();return false}
        watch.start();signal(token)
        return synchronized(lock){started&&!closed&&generation==token}
    }
    private fun signal(token:Long){synchronized(lock){if(started&&!closed&&token==generation)refreshLocked()}}
    fun capture():PresentationRead=synchronized(lock){
        when {closed->PresentationRead.Unavailable(PresentationUnavailable.CLOSED)
            !started->PresentationRead.Unavailable(PresentationUnavailable.NOT_STARTED)
            else->refreshLocked()}
    }
    private fun refreshLocked():PresentationRead {
        val os=try {system.capture()}catch(_:Exception){PresentationSystemState(false,null)}
        val result=if(os.input==null)PresentationRead.Unavailable(PresentationUnavailable.SYSTEM_INPUT)
            else try {PresentationRead.Ready(owner.capture(os.input))}catch(_:PresentationFailure){PresentationRead.Unavailable(PresentationUnavailable.OWNER)}
        val revision=(result as? PresentationRead.Ready)?.snapshot?.revision
        val failure=(result as? PresentationRead.Unavailable)?.reason
        val changed=revision!=lastRevision||failure!=lastFailure
        lastRevision=revision;lastFailure=failure
        val resumed=os.active&&!wasActive;wasActive=os.active
        if(!os.active){if(changed)dirty=true}
        else if(changed||dirty||resumed){dirty=false;changes.value=PresentationInvalidation()}
        return if(closed)PresentationRead.Unavailable(PresentationUnavailable.CLOSED) else result
    }
    override fun close(){
        val resources=synchronized(lock){if(closed)return;closed=true;started=false;generation++;val value=subscription to accountWatch;subscription=null;accountWatch=null;value}
        resources.second?.cancel();try {resources.first?.close()}finally {job.cancel()}
    }
}

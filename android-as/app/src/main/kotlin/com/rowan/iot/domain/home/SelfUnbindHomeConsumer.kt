package com.rowan.iot.domain.home

import com.rowan.iot.domain.device.more.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect

/** Page-owned consumer of retained app tickets. One actual read and one pending bit.
 * Dirty changes retire old publication immediately; replacement I/O waits for actual completion.
 */
class SelfUnbindHomeConsumer(
    private val scope:CoroutineScope,private val tabs:HomeRoomTabs,
    private val application:SelfUnbindApplication,private val accountRevision:Long,
    private val canRead:()->Boolean,
):AutoCloseable {
    private val lock=Any()
    private var active=false;private var closed=false;private var wanted=false
    private var actual:Job?=null
    private var seen=application.ledger.revisions.value
    private val observer=scope.launch {application.ledger.revisions.collect {sequence->
        val changed=synchronized(lock){if(sequence==seen)false else{seen=sequence;true}}
        if(changed)invalidate()
    }}
    fun appear() {
        synchronized(lock){if(closed)return;active=true;if(!tabs.state.value.loaded||application.ledger.pending(accountRevision).isNotEmpty())wanted=true}
        application.requestRecovery();pump()
    }
    fun refresh(){application.requestRecovery();synchronized(lock){if(closed)return;wanted=true};invalidate()}
    private fun invalidate() {
        val job=synchronized(lock){if(closed)return;wanted=true;actual}
        tabs.cancelLoad();job?.cancel();pump()
    }
    fun leave(){val job=synchronized(lock){active=false;wanted=false;actual};tabs.cancelLoad();job?.cancel()}
    private fun pump() {
        val next=synchronized(lock){
            if(closed||!active||!wanted||actual!=null||!canRead()||!scope.isActive)return
            wanted=false
            val job=scope.launch(start=CoroutineStart.LAZY){
                var tickets:List<SelfUnbindHomeTicket> =emptyList()
                val receipt=tabs.reloadTracked {tickets=application.ledger.pending(accountRevision)}
                if(receipt!=null)synchronized(lock){
                    if(!closed&&active&&canRead()&&isActive)tabs.whileInstalled(receipt){ids->
                        tickets.forEach {application.acknowledge(it,ids)};true
                    }
                }
            }
            actual=job
            job.invokeOnCompletion {synchronized(lock){if(actual===job)actual=null};pump()}
            job
        }
        next.start()
    }
    override fun close(){val job=synchronized(lock){if(closed)return;closed=true;active=false;wanted=false;actual};observer.cancel();tabs.cancelLoad();job?.cancel()}
}

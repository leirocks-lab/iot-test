package com.rowan.iot.domain.account

import kotlinx.coroutines.*

/** The application owns restoration. Cancelling a screen's await never cancels token renewal. */
class StartupCoordinator(private val account:AccountService,private val owner:CoroutineScope) {
    private var operation:Deferred<Unit>?=null
    suspend fun restore(retry:Boolean=false) {
        val shared=synchronized(this) {
            val current=operation
            if(current==null || (retry&&current.isCompleted)) {
                owner.async(start=CoroutineStart.LAZY) {account.restore()}.also {operation=it}
            } else current
        }
        shared.await()
    }
}

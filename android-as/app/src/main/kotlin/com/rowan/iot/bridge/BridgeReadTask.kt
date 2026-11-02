package com.rowan.iot.bridge

import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.*

internal sealed interface BridgeReadResult {
    data class Success(val value:Any):BridgeReadResult
    data class Failure(val code:String):BridgeReadResult
}

/** Register before start. Even a cancelled owner/queued task has exactly one terminal delivery. */
internal fun bridgeReadTask(
    owner:CoroutineScope,
    current:()->Boolean,
    deliver:(BridgeReadResult)->Unit,
    timeoutMillis:Long=15_000,
    failureCode:(Exception)->String={"read_failed"},
    read:suspend()->Any,
):Job {
    val settled=AtomicBoolean()
    fun complete(result:BridgeReadResult) {if(settled.compareAndSet(false,true))deliver(result)}
    val task=owner.launch(start=CoroutineStart.LAZY) {
        try {
            if(!current()) {complete(BridgeReadResult.Failure("session_changed"));return@launch}
            val value=withTimeout(timeoutMillis) {read()}
            ensureActive()
            complete(if(current())BridgeReadResult.Success(value) else BridgeReadResult.Failure("session_changed"))
        } catch(_:TimeoutCancellationException) {complete(BridgeReadResult.Failure("timeout"))
        } catch(_:CancellationException) {complete(BridgeReadResult.Failure("closed"))
        } catch(error:Exception) {
            if(!current()) {complete(BridgeReadResult.Failure("session_changed"));return@launch}
            val classified=runCatching {failureCode(error)}.getOrNull()
            val code=classified?.takeIf {it in setOf("read_failed","session_changed","unavailable","forbidden")}
                ?:"read_failed"
            complete(BridgeReadResult.Failure(code))
        }
    }
    task.invokeOnCompletion {cause->if(cause!=null)complete(BridgeReadResult.Failure("closed"))}
    return task
}

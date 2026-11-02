package com.rowan.iot.features.home

import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

/** Main-dispatcher-owned view controller; not account/session/cleanup authority.
 * HomeActivity owns the operation and error text. This owns one UI busy flag and always re-renders
 * the same logout/retry control after completion or cancellation, even if selection re-rendered
 * it while account clear/disk cleanup was in progress.
 */
class HomeActionControls(private val renderLogoutEnabled:(Boolean)->Unit) {
    private var editing=false
    var loggingOut=false
        private set
    private fun render() {renderLogoutEnabled(!editing&&!loggingOut)}
    fun selectionChanged(value:Boolean) {editing=value;render()}
    suspend fun runLogout(operation:suspend()->Unit) {
        currentCoroutineContext().ensureActive()
        if(editing||loggingOut)return
        loggingOut=true;render()
        try {operation()} finally {loggingOut=false;render()}
    }
}

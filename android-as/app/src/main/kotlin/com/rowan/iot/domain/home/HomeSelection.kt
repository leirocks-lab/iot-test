package com.rowan.iot.domain.home

import com.rowan.iot.domain.device.HomeDevice
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** A local review receipt, never a write permit or binding authorization. Not exposed to RN. */
data class HomeSelectionReview(val ticket:Long,val devices:List<HomeDevice>,val pageEpoch:Long)
data class HomeSelectionState(
    val editing:Boolean=false,
    val selected:List<HomeDevice> = emptyList(),
    val loaded:Boolean=false,
    val loading:Boolean=false,
    val review:HomeSelectionReview?=null,
    val errorCode:String?=null,
    val sessionExpired:Boolean=false,
) {fun isSelected(id:String)=selected.any {it.id==id}}

/** Page-owned local selection. No HTTP, MQTT, mutation callback, persisted login or success branch.
 * MORE-02 execution remains default-denied until the native single-device removal/journal/cleanup
 * service is integrated. A selection snapshot must never be treated as permission to delete.
 */
class HomeSelection(private val current:()->Boolean) {
    private val lock=Any()
    private val mutable=MutableStateFlow(HomeSelectionState())
    val state:StateFlow<HomeSelectionState> = mutable.asStateFlow()
    private var available:List<HomeDevice> = emptyList()
    private var active=true
    private var closed=false
    private var epoch=1L
    private var nextReview=0L
    val inputEpoch:Long get()=synchronized(lock) {epoch}
    private fun expired() {epoch++;available=emptyList();mutable.value=HomeSelectionState(sessionExpired=true)}
    private fun currentInput(input:Long):Boolean {
        if(closed||!active||input!=epoch)return false
        if(!current()){expired();return false}
        return mutable.value.loaded&&!mutable.value.loading
    }
    fun accountChanged()=synchronized(lock) {if(!closed&&!current())expired()}
    fun sync(home:HomeRoomState)=synchronized(lock) {
        if(closed||!active)return@synchronized
        if(!current()||home.sessionExpired){expired();return@synchronized}
        val old=mutable.value
        if(!home.loaded) {available=emptyList();mutable.value=HomeSelectionState(loading=home.loading);return@synchronized}
        available=home.visibleGroups.flatMap {it.devices}.toList()
        val byId=available.associateBy {it.id}
        val selected=old.selected.mapNotNull {byId[it.id]}
        val changed=selected!=old.selected
        val review=old.review?.takeIf {!home.loading&&!changed&&it.devices==selected&&it.pageEpoch==epoch}
        mutable.value=old.copy(selected=selected,loaded=true,loading=home.loading,review=review,
            errorCode=if(selected.size<old.selected.size)"selection_changed" else if(changed)null else old.errorCode)
    }
    fun begin(id:String,input:Long):Boolean=synchronized(lock) {
        if(!currentInput(input))return@synchronized false
        if(mutable.value.editing)return@synchronized toggleLocked(id)
        val device=available.firstOrNull {it.id==id}?:return@synchronized false
        mutable.value=mutable.value.copy(editing=true,selected=listOf(device),review=null,errorCode=null);true
    }
    fun toggle(id:String,input:Long):Boolean=synchronized(lock) {
        if(!currentInput(input)||!mutable.value.editing)return@synchronized false
        toggleLocked(id)
    }
    private fun toggleLocked(id:String):Boolean {
        val device=available.firstOrNull {it.id==id}?:return false
        val old=mutable.value
        val selected=if(old.isSelected(id))old.selected.filterNot {it.id==id} else old.selected+device
        mutable.value=old.copy(selected=selected,review=null,errorCode=null);return true
    }
    fun requestReview(input:Long):HomeSelectionReview?=synchronized(lock) {
        if(!currentInput(input)||!mutable.value.editing||mutable.value.selected.isEmpty())return@synchronized null
        val review=HomeSelectionReview(++nextReview,mutable.value.selected.toList(),epoch)
        mutable.value=mutable.value.copy(review=review,errorCode=null);review
    }
    fun cancelReview(ticket:Long)=synchronized(lock) {
        if(mutable.value.review?.ticket==ticket)mutable.value=mutable.value.copy(review=null)
    }
    /** Always false in this batch. Never reports accepted, confirmed, unknown or per-item success. */
    fun confirm(ticket:Long):Boolean=synchronized(lock) {
        if(!currentInput(epoch))return@synchronized false
        val review=mutable.value.review?:return@synchronized false
        if(review.ticket!=ticket||review.pageEpoch!=epoch||review.devices!=mutable.value.selected)return@synchronized false
        mutable.value=mutable.value.copy(review=null,errorCode="removal_unavailable");false
    }
    fun exit()=synchronized(lock) {mutable.value=mutable.value.copy(editing=false,selected=emptyList(),review=null,errorCode=null)}
    fun leave()=synchronized(lock) {active=false;epoch++;available=emptyList();mutable.value=HomeSelectionState()}
    fun appear()=synchronized(lock) {
        if(!closed&&!active){active=true;epoch++;if(!current())expired()}
    }
    fun close()=synchronized(lock) {closed=true;active=false;epoch++;available=emptyList();mutable.value=HomeSelectionState()}
}

package com.rowan.iot.domain.home

import com.rowan.iot.domain.device.HomeGroup
import com.rowan.iot.domain.device.HomeDevice
import com.rowan.iot.domain.device.HomeRepository
import com.rowan.iot.domain.rooms.RoomId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class HomeRoomTab(val id:RoomId,val name:String)
data class HomeRoomState(
    val groups:List<HomeGroup> = emptyList(),
    val selectedRoomId:RoomId? = null,
    val loaded:Boolean = false,
    val loading:Boolean = false,
    val errorCode:String? = null,
    val sessionExpired:Boolean = false,
) {
    val tabs:List<HomeRoomTab> get()=groups.mapNotNull {group->
        group.roomId?.let {HomeRoomTab(it,group.roomName.orEmpty())}
    }
    val visibleGroups:List<HomeGroup> get()=if(selectedRoomId==null)groups else groups.filter {it.roomId==selectedRoomId}
    val empty:Boolean get()=loaded&&visibleGroups.all {it.devices.isEmpty()}
}

/** Page-owned projection of HOME-01. Switching tabs never dispatches HTTP or changes membership.
 * All state transitions have generation ownership; cancelling a page retires an uncooperative read.
 * The account service remains the only authentication authority.
 */
class HomeReadGate {internal val permit=kotlinx.coroutines.sync.Mutex()}
/** Only a shared permit is cached, never account credentials/preferences or membership data. */
class HomeReadScopes(private val authority:()->com.rowan.iot.domain.account.AccountContext) {
    private val lock=Any();private var revision=Long.MIN_VALUE;private var user:String?=null;private var gate=HomeReadGate()
    fun forRevision(expected:Long):HomeReadGate?=synchronized(lock){
        val source=authority();val identity=source.session?.userId
        if(source.revision!=expected||source.cleanupRequired||identity==null||expected<revision)return@synchronized null
        if(expected==revision&&identity!=user)return@synchronized null
        if(expected>revision){revision=expected;user=identity;gate=HomeReadGate()}
        gate
    }
}
class HomeReadCommit internal constructor(internal val generation:Long,internal val serial:Long,internal val ownedIds:Set<String>)
class HomeRoomTabs(private val repository:HomeRepository,private val revision:Long,private val current:()->Boolean,readGate:HomeReadGate=HomeReadGate()) {
    private val lock=Any()
    private val actualRead=readGate.permit
    private var generation=0L;private var serial=0L;private var closed=false
    private var installed:HomeReadCommit?=null
    private val mutable=MutableStateFlow(HomeRoomState())
    val state:StateFlow<HomeRoomState> = mutable.asStateFlow()
    private fun expire(){generation++;installed=null;mutable.value=HomeRoomState(sessionExpired=true)}
    fun accountChanged()=synchronized(lock){if(!closed&&!current())expire()}
    fun select(id:RoomId?)=synchronized(lock){
        if(closed)return@synchronized
        if(!current()){expire();return@synchronized}
        if(id!=null&&mutable.value.groups.none {it.roomId==id})return@synchronized
        mutable.value=mutable.value.copy(selectedRoomId=id)
    }
    fun cancelLoad()=synchronized(lock){generation++;installed=null;mutable.value=mutable.value.copy(loading=false)}
    fun deviceForOpen(id:String):HomeDevice?=synchronized(lock){
        if(closed)return@synchronized null
        if(!current()){expire();return@synchronized null}
        mutable.value.visibleGroups.asSequence().flatMap {it.devices.asSequence()}.firstOrNull {it.id==id}
    }
    fun close()=synchronized(lock){closed=true;generation++;installed=null;mutable.value=HomeRoomState()}
    suspend fun reload(){reloadTracked {}}
    /** A permit spans actual repository completion, even when cancellation is ignored.
     * beforeRead runs only at real dispatch, not while queued behind an older read. */
    suspend fun reloadTracked(beforeRead:()->Unit):HomeReadCommit? {
        currentCoroutineContext().ensureActive()
        val own=synchronized(lock){
            if(closed)return null
            if(!current()){expire();return null}
            installed=null;val next=++generation;mutable.value=mutable.value.copy(loading=true,errorCode=null);next
        }
        var acquired=false
        try {
            actualRead.lock();acquired=true
            currentCoroutineContext().ensureActive()
            synchronized(lock){if(closed||own!=generation)return null;if(!current()){expire();return null};beforeRead()}
            val groups=repository.loadGroups(revision).map {it.copy(devices=it.devices.toList())}
            currentCoroutineContext().ensureActive()
            return synchronized(lock){
                if(closed||own!=generation)return@synchronized null
                if(!current()){expire();return@synchronized null}
                val selected=mutable.value.selectedRoomId?.takeIf {id->groups.any {it.roomId==id}}
                val receipt=HomeReadCommit(own,++serial,groups.flatMap {it.devices}.map {it.id}.toSet())
                installed=receipt;mutable.value=HomeRoomState(groups,selected,loaded=true);receipt
            }
        }catch(error:CancellationException){
            synchronized(lock){if(!closed&&own==generation){if(!current())expire()else mutable.value=mutable.value.copy(loading=false)}}
            throw error
        }catch(_:Exception){
            synchronized(lock){if(!closed&&own==generation){if(!current())expire()else mutable.value=mutable.value.copy(loading=false,errorCode="read_failed")}}
            return null
        }finally {if(acquired)actualRead.unlock()}
    }
    /** Cache install and acknowledgement linearize before any competing cancel/leave. */
    internal fun whileInstalled(receipt:HomeReadCommit,work:(Set<String>)->Boolean):Boolean=synchronized(lock){
        if(closed||installed!==receipt||receipt.generation!=generation||!current())return@synchronized false
        work(receipt.ownedIds)
    }
}

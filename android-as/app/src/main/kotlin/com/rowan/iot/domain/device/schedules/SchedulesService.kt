package com.rowan.iot.domain.device.schedules

import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withTimeoutOrNull

data class SchedulesState(
    val schedules:List<ScheduleRecord> = emptyList(),
    val loaded:Boolean=false,
    val busy:Boolean=false,
    val resultUnknown:Boolean=false,
    val sessionExpired:Boolean=false,
    val error:String?=null,
)

/**
 * Account/device-scoped REST workflow. Never executes timed actions locally, infers
 * permits from server actions, or replays a mutation. A readback proves the observed
 * goal, not which caller caused it. Persistence/application ownership is a later
 * integration concern; this module does not claim process-restart task recovery.
 */
class SchedulesService(
    private val repository:SchedulesRepository,
    private val currentAccountValid:()->Boolean,
    private val timeoutMillis:Long=20_000,
) {
    init {require(timeoutMillis>0)}
    private sealed interface Pending {
        data object UnknownCreate:Pending
        data class Created(val id:String,val draft:ScheduleDraft):Pending
        data class Updated(val baseline:ScheduleRecord,val draft:ScheduleDraft):Pending
        data class Enabled(val id:String,val target:Boolean):Pending
        data class Deleted(val id:String):Pending
    }
    private val operation=Mutex()
    private var pending:Pending?=null
    private val mutable=MutableStateFlow(SchedulesState())
    val state=mutable.asStateFlow()

    suspend fun load() {
        if(!operation.tryLock())return
        try {
            if(!current())return
            mutable.value=mutable.value.copy(busy=true,error=null)
            val rows=withTimeoutOrNull(timeoutMillis) {repository.load()}
            if(!current())return
            if(rows==null)throw ApiFailure(503,"日程读取超时")
            requireRows(rows)
            if(pending?.let {resolved(it,rows)}==true)pending=null
            publishRows(rows)
        }catch(error:CancellationException) {
            if(!currentAccountValid())expire()
            else mutable.value=mutable.value.copy(busy=false,error="读取已取消，可重试")
            throw error
        }catch(error:Exception) {readFailure(error)}
        finally {finishOperation()}
    }

    suspend fun create(draft:ScheduleDraft) {
        val frozen=draft.copy(weekdays=draft.weekdays?.toList())
        write({
            frozen.toCreateJson(repository.scope)
            Pending.UnknownCreate
        }) {
            val created=repository.create(frozen)
            if(created.scope!=repository.scope)throw ScheduleMutationUnknown()
            Pending.Created(created.id,frozen)
        }
    }
    suspend fun update(scheduleId:String,draft:ScheduleDraft) {
        val frozen=draft.copy(weekdays=draft.weekdays?.toList())
        write({
            val baseline=find(scheduleId)
            frozen.toUpdateJson(repository.scope,baseline)
            Pending.Updated(baseline,frozen)
        }) {intent->
            val update=intent as Pending.Updated
            val acknowledged=repository.update(update.baseline,frozen)
            if(acknowledged.id!=scheduleId||acknowledged.scope!=repository.scope)throw ScheduleMutationUnknown()
            intent
        }
    }
    suspend fun setEnabled(scheduleId:String,enabled:Boolean)=write({
        find(scheduleId)
        Pending.Enabled(scheduleId,enabled)
    }) {intent->
        if(repository.setEnabled(scheduleId,enabled)!=enabled)throw ScheduleMutationUnknown()
        intent
    }
    suspend fun delete(scheduleId:String)=write({
        find(scheduleId)
        Pending.Deleted(scheduleId)
    }) {intent->repository.delete(scheduleId);intent}

    private fun find(id:String)=mutable.value.schedules.singleOrNull {it.id==id&&it.scope==repository.scope}
        ?:throw ApiFailure(404,"日程不存在，请重新读取")
    private suspend fun write(prepare:()->Pending,send:suspend(Pending)->Pending) {
        if(!operation.tryLock())return // A double tap must not queue a second executing rule.
        var dispatched=false
        var acknowledged=false
        try {
            if(!current())return
            if(!mutable.value.loaded||pending!=null||mutable.value.resultUnknown) {
                mutable.value=mutable.value.copy(error="请先读取日程并核对上次操作结果")
                return
            }
            val intent=prepare() // All draft/permit validation occurs before dispatch.
            mutable.value=mutable.value.copy(busy=true,error=null)
            pending=intent
            val rows=withTimeoutOrNull(timeoutMillis) {
                if(!current())return@withTimeoutOrNull null
                dispatched=true
                pending=send(intent)
                acknowledged=true
                if(!current())return@withTimeoutOrNull null
                val actual=repository.load()
                if(!current())return@withTimeoutOrNull null
                requireRows(actual)
                if(pending?.let {resolved(it,actual)}!=true)throw ScheduleMutationUnknown()
                actual
            }
            if(!current())return
            if(rows==null)throw ScheduleMutationUnknown()
            pending=null
            publishRows(rows)
        }catch(error:CancellationException) {
            if(!currentAccountValid())expire()
            else {
                if(!dispatched)pending=null
                mutable.value=mutable.value.copy(busy=false,resultUnknown=pending!=null,
                    error=if(dispatched)ScheduleMutationUnknown().message else "提交前已取消，未发送日程操作")
            }
            throw error
        }catch(error:Exception) {
            if(!currentAccountValid()||error is ApiFailure&&error.code==499)expire()
            else {
                val definite=error is ApiFailure&&(error.code in 400..499&&error.code!=408||error.code in 1701..1704)
                if(!dispatched||!acknowledged&&definite)pending=null
                mutable.value=mutable.value.copy(busy=false,resultUnknown=pending!=null,
                    error=if(pending!=null)ScheduleMutationUnknown().message else message(error))
            }
        }finally {finishOperation()}
    }

    private fun resolved(intent:Pending,rows:List<ScheduleRecord>):Boolean=when(intent) {
        // Missing create ACK/ID has no discovery or idempotency contract. Even an
        // identical pre-existing list item cannot identify this request's result.
        Pending.UnknownCreate->false
        is Pending.Created->rows.singleOrNull {it.id==intent.id}?.let {intent.draft.matches(repository.scope,it)}==true
        is Pending.Updated->rows.singleOrNull {it.id==intent.baseline.id}?.let {intent.draft.matches(repository.scope,it,intent.baseline)}==true
        is Pending.Enabled->rows.singleOrNull {it.id==intent.id}?.enabled==intent.target
        is Pending.Deleted->rows.none {it.id==intent.id}
    }
    private suspend fun current():Boolean {
        currentCoroutineContext().ensureActive()
        if(currentAccountValid())return true
        expire()
        return false
    }
    private fun expire() {pending=null;mutable.value=SchedulesState(sessionExpired=true,error="日程账号上下文已变化，请重新进入")}
    private fun requireRows(rows:List<ScheduleRecord>) {
        if(rows.any {it.scope!=repository.scope}||rows.map {it.id}.toSet().size!=rows.size)
            throw ApiFailure(502,"日程列表上下文或标识无效")
    }
    private fun publishRows(rows:List<ScheduleRecord>) {
        if(!currentAccountValid()) {expire();return}
        mutable.value=SchedulesState(schedules=java.util.Collections.unmodifiableList(rows.toList()),loaded=true,
            resultUnknown=pending!=null,error=if(pending!=null)ScheduleMutationUnknown().message else null)
    }
    private fun readFailure(error:Exception) {
        if(!currentAccountValid()||error is ApiFailure&&error.code==499)expire()
        else mutable.value=mutable.value.copy(busy=false,error=message(error))
    }
    private fun message(error:Exception)=when((error as? ApiFailure)?.code) {
        1701->"设备不存在"
        1702,401,403->"无设备日程访问权限"
        1703,400->"日程参数无效，请核对"
        1704->"日程数量超过上限"
        404->"日程不存在，请重新读取"
        else->"日程操作失败，请重新读取；已保留最近确认值"
    }
    private fun finishOperation() {
        if(mutable.value.busy)mutable.value=mutable.value.copy(busy=false)
        operation.unlock()
    }
}

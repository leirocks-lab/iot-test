package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.schedules.*
import com.rowan.iot.domain.network.ApiFailure
import java.net.URLEncoder
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONArray
import org.json.JSONObject

/** V1.4 TIMER-01..05. Account intent is atomically checked by AccountService, never replayed here. */
class HttpSchedulesRepository(private val account:AccountService,override val scope:ScheduleScope):SchedulesRepository {
    private val path="/api/app/devices/${segment(scope.resourceId)}/schedules"
    private suspend fun requireCurrent() {
        currentCoroutineContext().ensureActive()
        val live=account.contextSnapshot()
        if(live.revision!=scope.accountRevision||live.session==null||live.cleanupRequired)throw ApiFailure(499,"日程账号上下文已变化")
    }
    private suspend fun request(method:String,route:String,body:JSONObject?=null):JSONObject {
        requireCurrent()
        val value=account.request(method,route,body,expectedRevision=scope.accountRevision)
        requireCurrent()
        return value
    }
    override suspend fun load():List<ScheduleRecord> {
        val data=request("GET",path).opt("data") as? JSONArray?:throw ApiFailure(502,"日程列表格式错误")
        val records=(0 until data.length()).map {index->
            val raw=data.opt(index) as? JSONObject?:throw ApiFailure(502,"日程格式错误")
            ScheduleRecord.decode(scope,raw.toString())
        }
        if(records.map {it.id}.toSet().size!=records.size)throw ApiFailure(502,"日程列表包含重复标识")
        requireCurrent()
        return records
    }
    override suspend fun create(draft:ScheduleDraft):ScheduleRecord {
        val body=draft.toCreateJson(scope)
        return mutation {
            val data=request("POST",path,body).opt("data") as? JSONObject?:throw ScheduleMutationUnknown()
            ScheduleRecord.decode(scope,data.toString())
        }
    }
    override suspend fun update(existing:ScheduleRecord,draft:ScheduleDraft):ScheduleRecord {
        val body=draft.toUpdateJson(scope,existing)
        val route="$path/${segment(existing.id)}"
        return mutation {
            val data=request("PATCH",route,body).opt("data") as? JSONObject?:throw ScheduleMutationUnknown()
            val record=ScheduleRecord.decode(scope,data.toString())
            if(record.id!=existing.id)throw ScheduleMutationUnknown()
            record
        }
    }
    override suspend fun setEnabled(scheduleId:String,enabled:Boolean):Boolean {
        val route="$path/${segment(scheduleId)}/enabled"
        return mutation {
            val actual=request("PUT",route,JSONObject().put("enabled",enabled)).optJSONObject("data")?.opt("enabled")
            if(actual !is Boolean||actual!=enabled)throw ScheduleMutationUnknown()
            actual
        }
    }
    override suspend fun delete(scheduleId:String) {
        val route="$path/${segment(scheduleId)}"
        mutation {request("DELETE",route);Unit}
    }
    private suspend fun <T> mutation(work:suspend()->T):T {
        requireCurrent() // An already-stale operation is not a dispatched unknown mutation.
        try {return work()}
        catch(error:CancellationException) {throw error}
        catch(error:ScheduleMutationUnknown) {throw error}
        catch(error:ApiFailure) {
            if(error.code==499||error.code in 400..499&&error.code!=408||error.code in 1701..1704)throw error
            throw ScheduleMutationUnknown()
        }
        catch (_:Exception) {throw ScheduleMutationUnknown()}
    }
    private fun segment(value:String):String {
        // URI path normalization must never interpret an opaque ID as a parent/current directory.
        if(value=="."||value==".."||value.scheduleText()==null)throw ApiFailure(400,"日程资源标识无效")
        return URLEncoder.encode(value,"UTF-8").replace("+","%20")
    }
}

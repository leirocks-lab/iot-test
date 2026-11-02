package com.rowan.iot.domain.device.schedules

import com.rowan.iot.domain.network.ApiFailure
import java.util.Collections
import java.util.TimeZone
import org.json.JSONArray
import org.json.JSONObject

/** Native resource identity. Unknown model version is null, never a fabricated read-only label. */
data class ScheduleScope(val accountRevision:Long,val resourceId:String,val productId:String,val modelVersion:String?) {
    init {
        require(accountRevision>=0&&listOf(resourceId,productId).all {it.scheduleText()!=null})
        require(modelVersion==null||modelVersion.scheduleText()!=null)
    }
}
enum class ScheduleType(val wire:String) {ONCE("once"),PERIODIC("periodic")}
enum class RepeatType(val wire:String) {ONCE("once"),DAILY("daily"),WEEKDAYS("weekdays"),CUSTOM("custom")}

/**
 * Only an explicitly verified native product authority may issue this value. Internal
 * construction supports offline fixtures; no production issuer/registry exists here.
 * This is an exact permitted action, not an arbitrary writable-property dictionary.
 */
class ActionPermit internal constructor(val scope:ScheduleScope,actionJson:String,val mode:String?) {
    internal val actionJson:String
    init {
        if(scope.modelVersion==null)throw ApiFailure(400,"产品物模型版本尚未确认，不能授权定时动作")
        val action=try {JSONObject(actionJson)} catch (_:Exception) {throw ApiFailure(400,"定时动作格式无效")}
        if(action.length()==0||mode!=null&&mode.scheduleText()==null)throw ApiFailure(400,"定时动作尚未确认")
        this.actionJson=action.toString()
    }
    override fun toString()="ActionPermit(<native authorization>)"
}

data class ScheduleDraft(
    val type:ScheduleType,
    val startTime:String,
    val repeatType:RepeatType,
    val timeZone:String,
    val permit:ActionPermit,
    val name:String?=null,
    val enabled:Boolean?=null,
    val endTime:String?=null,
    val weekdays:List<Int>?=null,
) {
    fun toCreateJson(scope:ScheduleScope):JSONObject=body(scope,enabled)
    fun toUpdateJson(scope:ScheduleScope,existing:ScheduleRecord):JSONObject {
        if(existing.scope!=scope)throw ApiFailure(499,"日程上下文已变化")
        val chosen=enabled?:existing.enabled?:throw ApiFailure(400,"请明确选择日程启用状态")
        return body(scope,chosen)
    }
    private fun body(scope:ScheduleScope,chosenEnabled:Boolean?):JSONObject {
        val days=weekdays?.toList()
        if(scope.modelVersion==null)throw ApiFailure(400,"产品物模型版本尚未确认，不能提交定时动作")
        if(permit.scope!=scope)throw ApiFailure(499,"定时动作授权上下文已变化")
        if(!validScheduleTime(startTime)||endTime!=null&&!validScheduleTime(endTime))throw ApiFailure(400,"请输入有效的HH:mm时间")
        if(timeZone !in availableTimeZones)throw ApiFailure(400,"请选择有效的IANA时区")
        if(repeatType==RepeatType.CUSTOM&&days.isNullOrEmpty())throw ApiFailure(400,"请选择自定义星期")
        if(days?.any {it !in 1..7}==true)throw ApiFailure(400,"星期必须为1至7")
        return JSONObject().put("type",type.wire).put("startTime",startTime).put("repeatType",repeatType.wire)
            .put("timeZone",timeZone).put("action",JSONObject(permit.actionJson)).also {json->
                name?.let {json.put("name",it)}
                chosenEnabled?.let {json.put("enabled",it)}
                endTime?.let {json.put("endTime",it)}
                days?.let {json.put("weekdays",JSONArray(it.distinct().sorted()))}
                permit.mode?.let {json.put("mode",it)}
            }
    }
    /** Readback goal check only; this never issues or broadens an ActionPermit. */
    internal fun matches(scope:ScheduleScope,read:ScheduleRecord,existing:ScheduleRecord?=null):Boolean {
        if(read.scope!=scope)return false
        val intended=if(existing==null)toCreateJson(scope) else toUpdateJson(scope,existing)
        return scheduleJsonContains(JSONObject(read.rawJson),intended)
    }
    private companion object {
        // Java 17 ZoneId.SHORT_IDS documents 28 JDK compatibility keys. EST, MST
        // and HST also occur in IANA backward, so exclude only the other 25.
        // Keep exact platform membership as well: never use getTimeZone's GMT
        // fallback, infer validity from a slash, or rewrite a valid IANA alias.
        // https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/ZoneId.html#SHORT_IDS
        // https://data.iana.org/time-zones/tzdb/backward
        // java.util.TimeZone remains available on Android API 24 (no java.time).
        val javaOnlyShortIds=setOf("ACT","AET","AGT","ART","AST","BET","BST","CAT","CNT","CST","CTT",
            "EAT","ECT","IET","IST","JST","MIT","NET","NST","PLT","PNT","PRT","PST","SST","VST")
        val availableTimeZones=TimeZone.getAvailableIDs().toSet()-javaOnlyShortIds
    }
}

/** Detached read data, including unknown extensions and opaque server-computed nextExecutionAt. */
class ScheduleRecord private constructor(val scope:ScheduleScope,val rawJson:String) {
    private val raw get()=JSONObject(rawJson)
    val id:String=raw.opt("id").scheduleText()?.takeUnless {it=="."||it==".."}
        ?:throw ApiFailure(502,"日程标识无效")
    val type:ScheduleType?=ScheduleType.entries.firstOrNull {it.wire==raw.opt("type")}
    val repeatType:RepeatType?=RepeatType.entries.firstOrNull {it.wire==raw.opt("repeatType")}
    val name:String?=raw.opt("name") as? String
    val enabled:Boolean?=raw.opt("enabled") as? Boolean
    val startTime:String?=(raw.opt("startTime") as? String)?.takeIf(::validScheduleTime)
    val endTime:String?=(raw.opt("endTime") as? String)?.takeIf(::validScheduleTime)
    val timeZone:String?=raw.opt("timeZone").scheduleText()
    val nextExecutionAt:String?=raw.opt("nextExecutionAt").scheduleText()
    val mode:String?=raw.opt("mode").scheduleText()
    val actionJson:String?=(raw.opt("action") as? JSONObject)?.toString()
    val weekdays:List<Int>?=(raw.opt("weekdays") as? JSONArray)?.let {array->
        val values=(0 until array.length()).map {array.opt(it)}
        if(values.any {it !is Number||it.toDouble()!=it.toInt().toDouble()||it.toInt() !in 1..7})null
        else Collections.unmodifiableList(values.map {(it as Number).toInt()}.distinct().sorted())
    }
    override fun toString()="ScheduleRecord(<private device schedule>)"
    companion object {
        fun decode(scope:ScheduleScope,dataJson:String):ScheduleRecord {
            val json=try {JSONObject(dataJson)}catch (_:Exception) {throw ApiFailure(502,"日程响应格式错误")}
            return ScheduleRecord(scope,json.toString())
        }
    }
}

class ScheduleMutationUnknown:Exception("日程操作结果未确认，不会自动重复提交")
interface SchedulesRepository {
    val scope:ScheduleScope
    suspend fun load():List<ScheduleRecord>
    suspend fun create(draft:ScheduleDraft):ScheduleRecord
    suspend fun update(existing:ScheduleRecord,draft:ScheduleDraft):ScheduleRecord
    suspend fun setEnabled(scheduleId:String,enabled:Boolean):Boolean
    suspend fun delete(scheduleId:String)
}

internal fun Any?.scheduleText():String?=(this as? String)?.takeIf {it.isNotBlank()&&it.none {character->character.isISOControl()}}
private fun validScheduleTime(value:String)=Regex("(?:[01][0-9]|2[0-3]):[0-5][0-9]").matches(value)
internal fun scheduleJsonContains(actual:JSONObject,intended:JSONObject):Boolean=intended.keys().asSequence().all {key->
    scheduleJsonEqual(actual.opt(key),intended.get(key))
}
private fun scheduleJsonEqual(left:Any?,right:Any?):Boolean=when {
    left is JSONObject&&right is JSONObject->left.length()==right.length()&&scheduleJsonContains(left,right)
    left is JSONArray&&right is JSONArray->left.length()==right.length()&&(0 until left.length()).all {scheduleJsonEqual(left.opt(it),right.opt(it))}
    left is Number&&right is Number->try {java.math.BigDecimal(left.toString()).compareTo(java.math.BigDecimal(right.toString()))==0}catch (_:NumberFormatException) {false}
    else->left==right
}

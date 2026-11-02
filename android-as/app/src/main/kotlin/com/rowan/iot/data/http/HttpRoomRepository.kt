package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.rooms.*
import java.net.URLEncoder
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONArray
import org.json.JSONObject

/** V1.4 ROOM-01..06, bound to one account revision. No guessed CAS fields or mutation replay. */
class HttpRoomRepository(
    private val account: AccountService,
    private val revision: Long = account.revision,
) : RoomRepository, DeviceRoomRepository {
    private val path = "/api/app/user/locations"

    private suspend fun checkCurrent() {
        currentCoroutineContext().ensureActive()
        if (account.revision != revision || account.session == null) throw ApiFailure(499, "登录会话已变化")
    }

    private suspend fun request(method: String, route: String, body: JSONObject? = null): JSONObject {
        checkCurrent()
        val response = account.request(method, route, body,expectedRevision=revision)
        checkCurrent()
        return response
    }

    override suspend fun load(): List<Room> {
        val data = request("GET", path).optJSONArray("data") ?: throw ApiFailure(502, "房间列表响应格式错误")
        val result = (0 until data.length()).map { index ->
            val room = data.optJSONObject(index) ?: throw ApiFailure(502, "房间响应格式错误")
            val count = if (!room.has("deviceCount") || room.isNull("deviceCount")) null else {
                val raw = room.opt("deviceCount")
                if (raw !is Number || raw.toDouble() != raw.toLong().toDouble() || raw.toLong() !in 0..Int.MAX_VALUE.toLong())
                    throw ApiFailure(502, "房间设备数量格式错误")
                raw.toInt()
            }
            val default = if (!room.has("isDefault") || room.isNull("isDefault")) null else
                room.opt("isDefault") as? Boolean ?: throw ApiFailure(502, "房间默认标识格式错误")
            Room(decodeId(room.opt("id")), decodeName(room.opt("name")), default, count)
        }
        if (result.map { it.id }.toSet().size != result.size) throw ApiFailure(502, "房间列表包含重复标识")
        checkCurrent()
        return result
    }

    override suspend fun create(name: String): List<Room> {
        val value = inputName(name)
        mutation("POST", path, JSONObject().put("name", value))
        return readAfterMutation { rooms -> rooms.any { it.name == value } }
    }

    override suspend fun rename(id: RoomId, name: String): List<Room> {
        val value = inputName(name)
        mutation("PATCH", "$path/${segment(id.display)}", JSONObject().put("name", value))
        return readAfterMutation { rooms -> rooms.any { it.id == id && it.name == value } }
    }

    override suspend fun saveLayout(baseline: List<Room>, orderedIds: List<RoomId>): List<Room> {
        val latest = load()
        if (latest != baseline) throw RoomBaselineChanged(latest)
        val byId = latest.associateBy { it.id }
        if (orderedIds.toSet().size != orderedIds.size || orderedIds.any { it !in byId })
            throw RoomRuleBlocked("只能调整当前房间顺序或删除允许删除的空房间")
        latest.filterNot { it.id in orderedIds }.forEach(::requireRemovableRoom)
        val desired = orderedIds.map { byId.getValue(it) }
        val rooms = JSONArray()
        desired.forEach { rooms.put(JSONObject().put("id", encodeId(it.id)).put("name", it.name)) }
        // This preflight detects an already-changed baseline. It is not an atomic CAS;
        // S102 remains unverified until the backend freezes version/updatedAt semantics.
        mutation("PUT", path, JSONObject().put("rooms", rooms))
        return readAfterMutation { result -> result.map { it.id to it.name } == desired.map { it.id to it.name } }
    }

    override suspend fun location(deviceId: String): RoomLocation? {
        val data = request("GET", locationPath(deviceId)).opt("data")
        if (data == null || data == JSONObject.NULL) return null
        val room = data as? JSONObject ?: throw ApiFailure(502, "设备房间响应格式错误")
        if (room.length() == 0) return null
        return RoomLocation(decodeId(room.opt("id")), decodeName(room.opt("name")))
    }

    override suspend fun move(deviceId: String, roomId: RoomId?): RoomLocation? {
        val body = JSONObject()
        if (roomId != null) body.put("id", encodeId(roomId))
        // V1.4 allows omission/empty id for unassignment; do not invent a null or delete endpoint.
        mutation("PUT", locationPath(deviceId), body)
        try {
            val actual = location(deviceId)
            // ROOM-02 missing/null/empty data has no confirmed unassignment
            // meaning. Only a matching explicit assigned ID proves this result.
            if (actual == null || roomId == null || actual.id != roomId) throw RoomResultUnknown()
            return actual
        } catch (error: CancellationException) { throw error }
        catch (error: ApiFailure) { if (error.code == 499) throw error else throw RoomResultUnknown() }
        catch (_: Exception) { throw RoomResultUnknown() }
    }

    private suspend fun mutation(method: String, route: String, body: JSONObject) {
        checkCurrent()
        try { request(method, route, body) }
        catch (error: CancellationException) { throw error }
        catch (error: ApiFailure) {
            if (error.code == 0 || error.code == 408 || error.code >= 500 && error.code <= 599) throw RoomResultUnknown()
            throw error
        } catch (_: Exception) { throw RoomResultUnknown() }
    }

    private suspend fun readAfterMutation(confirmed: (List<Room>) -> Boolean): List<Room> {
        try {
            val latest = load()
            if (!confirmed(latest)) throw RoomResultUnknown()
            return latest
        } catch (error: CancellationException) { throw error }
        catch (error: ApiFailure) { if (error.code == 499) throw error else throw RoomResultUnknown() }
        catch (_: Exception) { throw RoomResultUnknown() }
    }

    private fun inputName(value: String) = value.trim().also { if (it.isEmpty()) throw ApiFailure(400, "请输入房间名称") }
    private fun decodeName(value: Any?): String = (value as? String)?.takeIf { it.isNotBlank() }
        ?: throw ApiFailure(502, "房间名称格式错误")
    private fun decodeId(value: Any?): RoomId = when (value) {
        is String -> if (value.isNotBlank()) RoomId.Text(value) else throw ApiFailure(502, "房间标识为空")
        is Byte, is Short, is Int, is Long -> RoomId.Numeric((value as Number).toLong())
        else -> throw ApiFailure(502, "房间标识格式错误")
    }
    private fun encodeId(id: RoomId): Any = when (id) {
        is RoomId.Text -> id.value.also { if (it.isBlank()) throw ApiFailure(400, "房间标识无效") }
        is RoomId.Numeric -> id.value
    }
    private fun locationPath(id: String): String {
        if (id.isBlank() || id == "." || id == "..") throw ApiFailure(400, "设备标识无效")
        return "/api/app/devices/${segment(id)}/location"
    }
    private fun segment(value: String) = URLEncoder.encode(value, "UTF-8").replace("+", "%20")
}

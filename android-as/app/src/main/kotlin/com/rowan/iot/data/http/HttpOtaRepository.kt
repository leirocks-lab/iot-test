package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.ota.*
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONObject

/** V1.4 OTA-01..05 only; no task replay, endpoint guessing, firmware download or device transport. */
class HttpOtaRepository(private val account: AccountService, override val scope: OtaScope) : OtaRepository {
    private fun requireId(value: String): String = value.takeIf { it.isNotBlank() && it != "." && it != ".." && it.none(Char::isISOControl) }
        ?: throw ApiFailure(400, "升级标识无效")
    private val base = "/api/app/devices/${segment(requireId(scope.resourceId))}/ota"
    private suspend fun requireCurrent() {
        currentCoroutineContext().ensureActive()
        val live = account.contextSnapshot()
        if (live.revision != scope.accountRevision || live.cleanupRequired || live.session?.userId != scope.userId || scope.userId.isBlank())
            throw ApiFailure(499, "登录会话已变化")
    }
    private suspend fun request(method: String, path: String, body: JSONObject? = null): JSONObject {
        requireCurrent()
        val response = account.request(method, path, body, expectedRevision = scope.accountRevision)
        requireCurrent()
        return response
    }
    private fun objectData(response: JSONObject) = response.opt("data") as? JSONObject ?: malformed()
    private fun text(value: JSONObject, key: String) = (value.opt(key) as? String)?.takeIf { it.isNotBlank() } ?: malformed()
    private fun malformed(): Nothing = throw ApiFailure(502, "升级响应格式错误")
    override suspend fun check(kind: OtaKind): OtaOffer {
        val data = objectData(request("GET", "$base/${kind.wire}"))
        val firmware = data.opt("firmware") as? JSONObject ?: malformed()
        val device = data.opt("device") as? JSONObject ?: malformed()
        val id = text(device, "id")
        if (id != scope.resourceId) malformed()
        val firmwareId = text(firmware, "id")
        if (firmwareId.any(Char::isISOControl)) malformed()
        val remark = firmware.opt("remark").let { if (it == null || it == JSONObject.NULL) null else it as? String ?: malformed() }
        val value = OtaOffer(kind, OtaFirmware(firmwareId, text(firmware, "version"), remark), OtaDevice(id, text(device, "name"), text(device, "mac")))
        requireCurrent()
        return value
    }
    override suspend fun start(kind: OtaKind, firmwareId: String): String {
        requireId(firmwareId)
        val data = objectData(request("PUT", "$base/task?type=${kind.wire}", JSONObject().put("firmwareID", firmwareId)))
        val task = text(data, "taskID")
        if (task == "." || task == ".." || task.any(Char::isISOControl)) malformed()
        requireCurrent()
        return task
    }
    override suspend fun query(taskId: String): OtaResult {
        val data = objectData(request("GET", "$base/task/${segment(requireId(taskId))}"))
        val result = data.opt("result") as? String ?: malformed()
        val decoded = OtaResult.entries.firstOrNull { it.wire == result } ?: malformed()
        requireCurrent()
        return decoded
    }
    override suspend fun cancel(taskId: String) {
        requireId(taskId)
        request("DELETE", "$base/task", JSONObject().put("taskID", taskId))
    }
    private fun segment(value: String) = buildString {
        val allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
        value.toByteArray(Charsets.UTF_8).forEach { byte ->
            val code = byte.toInt() and 255
            if (code.toChar() in allowed) append(code.toChar())
            else { append('%'); append("0123456789ABCDEF"[code shr 4]); append("0123456789ABCDEF"[code and 15]) }
        }
    }
}

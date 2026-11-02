package com.rowan.iot.data.http

import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import java.net.HttpURLConnection
import java.net.URI
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

internal fun usesIoTBackend(path:String):Boolean =
    Regex("^/api/app/(devices?|products?|plugins?|user/(locations|device-shares))(/|$)").containsMatchIn(path.substringBefore('?'))

/** Deployment boundary. UI never chooses URLs, tenant headers, or authentication. */
class RowanHttpClient(
    private val platformUrl: String,
    private val iotUrl: String,
    private val tenantId: String,
    private val development: Boolean,
) : HttpGateway {
    override suspend fun request(method: String, path: String, body: JSONObject?, token: String?): JSONObject = withContext(Dispatchers.IO) {
        require(path.startsWith("/api/app/")) { "Unsupported application endpoint" }
        if (!tenantId.matches(Regex("[0-9]+"))) throw ApiFailure(400, "请配置测试环境租户")
        val iot = usesIoTBackend(path)
        val root = (if (iot) iotUrl else platformUrl).trimEnd('/')
        val uri = runCatching { URI(root) }.getOrElse { throw ApiFailure(400, "请配置服务地址") }
        if (uri.host.isNullOrBlank() || uri.userInfo != null || uri.query != null || uri.fragment != null ||
            uri.scheme !in (if (development) setOf("https", "http") else setOf("https"))) {
            throw ApiFailure(400, "服务地址配置无效")
        }
        val connection = URI(root + path.replaceFirst("/api/app/", "/app-api/")).toURL().openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 15_000
            connection.readTimeout = 20_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Accept-Language", "zh-CN")
            connection.setRequestProperty("tenant-id", tenantId)
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status < 400) connection.inputStream else connection.errorStream
            val raw = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
                ?: throw ApiFailure(status, "服务响应为空")
            val envelope = runCatching { JSONObject(raw) }.getOrElse { throw ApiFailure(502, "服务响应格式错误") }
            if (!envelope.has("code")) throw ApiFailure(502, "服务响应缺少结果码")
            val code = envelope.getInt("code")
            if (status !in 200..299 || code != 0 || !envelope.optBoolean("success", true)) {
                // Keep server response bodies and credentials out of errors/logs.
                throw ApiFailure(if (code == 0) status else code, when (code) {
                    401 -> "登录已失效"
                    403 -> "没有操作权限"
                    1183, 1184 -> "账号或密码错误"
                    1141, 1142 -> "发送请求过于频繁，请稍后重试"
                    1143, 1144 -> "暂无法发送验证码，请稍后重试"
                    1151, 1152, 1161, 1162, 1211, 1212, 1213 -> "验证码无效或已过期，请重新核验"
                    1214 -> "新密码与原密码相同，请更换"
                    else -> "请求失败，请重试（$code）"
                })
            }
            // Preserve the data shape at this boundary; individual repositories decode it.
            JSONObject().put("data", envelope.opt("data"))
        } finally {
            connection.disconnect()
        }
    }
}

package com.rowan.iot.domain.account

import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import java.net.URLEncoder

enum class AgreementKind(val endpoint: String, val title: String) {
    PRIVACY("privacy", "隐私政策"), TERMS("serviceTerms", "用户协议")
}

/** Text is requested explicitly. A URL response cannot count as completed in-app reading. */
class AgreementService(private val http: HttpGateway, private val brandId: String? = null) {
    suspend fun load(kind: AgreementKind, regionCode: String?): String {
        if (regionCode != null && !regionCode.matches(Regex("[A-Z]{2}"))) throw ApiFailure(400, "请选择有效地区")
        val query = buildList {
            add("type=text")
            regionCode?.let { add("regionCode=$it") }
            brandId?.takeIf { it.isNotBlank() }?.let { add("brandId=${URLEncoder.encode(it, "UTF-8")}") }
        }.joinToString("&")
        val data = http.request("GET", "/api/app/${kind.endpoint}?$query", null, null).getJSONObject("data")
        if (data.optString("type") != "text") throw ApiFailure(502, "服务未返回可阅读的协议文本")
        return data.getString("content").takeIf { it.isNotBlank() }
            ?: throw ApiFailure(502, "协议内容为空，请重试")
    }
}

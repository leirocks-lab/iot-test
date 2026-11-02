package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.products.*
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONArray
import org.json.JSONObject

/** PAIR-01/02/03, one account revision. Metadata reads only; AccountService owns authentication. */
class HttpProductCatalog(
    private val account: AccountService,
    private val brandId: String? = null,
    private val revision: Long = account.revision,
) : ProductCatalogService {
    private suspend fun checkCurrent() {
        currentCoroutineContext().ensureActive()
        val context = account.contextSnapshot()
        if (context.revision != revision || context.session == null) throw ApiFailure(499, "会话已变化，请重新进入添加设备")
    }
    private suspend fun read(path: String): Any? {
        checkCurrent()
        val response = account.request("GET", path,expectedRevision=revision)
        checkCurrent()
        return response.opt("data")
    }
    override suspend fun categories() = decodeCategories(read(path("/api/app/products/category", brandId)))
    override suspend fun groups() = decodeGroups(read(path("/api/app/products", brandId)))
    override suspend fun detail(id: String) = decodeDetail(read(detailPath(id)), id)

    companion object {
        fun path(base: String, brandId: String?): String = if (brandId == null) base else {
            if (!valid(brandId)) throw malformed()
            "$base?brandId=${segment(brandId)}"
        }
        fun detailPath(id: String): String {
            if (!valid(id) || id == "." || id == "..") throw malformed()
            return "/api/app/products/${segment(id)}?type=text"
        }
        private fun segment(value: String): String = buildString {
            val unreserved = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
            value.toByteArray(Charsets.UTF_8).forEach {
                val byte = it.toInt() and 255
                if (byte.toChar() in unreserved) append(byte.toChar())
                else { append('%'); append("0123456789ABCDEF"[byte shr 4]); append("0123456789ABCDEF"[byte and 15]) }
            }
        }
        fun decodeCategories(raw: Any?): List<ProductCategory> {
            val rows = raw as? JSONArray ?: throw malformed()
            if (rows.length() > 1000) throw malformed()
            val seen = mutableSetOf<String>()
            return (0 until rows.length()).map {
                val row = rows.optJSONObject(it) ?: throw malformed()
                val value = required(row, "value")
                if (!seen.add(value)) throw malformed()
                ProductCategory(value, required(row, "name"))
            }
        }
        fun decodeGroups(raw: Any?): List<ProductGroup> {
            val rows = raw as? JSONArray ?: throw malformed()
            if (rows.length() > 1000) throw malformed()
            val categories = mutableSetOf<String>(); val products = mutableSetOf<String>()
            return (0 until rows.length()).map {
                val row = rows.optJSONObject(it) ?: throw malformed()
                val category = required(row, "category")
                val names = row.optJSONObject("categoryName") ?: throw malformed()
                val items = row.optJSONArray("products") ?: throw malformed()
                if (!categories.add(category) || items.length() > 10_000 || names.length() > 1000) throw malformed()
                val localized = names.keys().asSequence().associateWith { key -> required(names, key) }
                ProductGroup(category, localized, (0 until items.length()).map { index ->
                    val value = product(items.optJSONObject(index) ?: throw malformed())
                    if (!products.add(value.id)) throw malformed()
                    value
                })
            }
        }
        fun decodeDetail(raw: Any?, expectedId: String): ProductDetails {
            val row = raw as? JSONObject ?: throw malformed()
            val product = product(row)
            if (product.id != expectedId) throw malformed()
            val parameters = when (val value = nullable(row, "parameters")) {
                null -> emptyList()
                is JSONObject -> {
                    if (value.length() > 1000) throw malformed()
                    value.keys().asSequence().toList().sorted().map { ProductParameter(it, parameter(value.opt(it), 0)) }
                }
                is JSONArray -> {
                    if (value.length() > 1000) throw malformed()
                    (0 until value.length()).map { index ->
                        val item = value.optJSONObject(index) ?: throw malformed()
                        if (!item.has("value")) throw malformed()
                        ProductParameter(required(item, "key"), parameter(item.opt("value"), 0))
                    }
                }
                else -> throw malformed()
            }
            return ProductDetails(product, optional(row, "category"), optional(row, "introduction", allowEmpty = true), parameters, boolean(row, "bluetooth"))
        }
        private fun product(row: JSONObject): CatalogProduct {
            val sort = when (val raw = nullable(row, "sort")) {
                null -> null
                is Number -> raw.toDouble().takeIf { it.isFinite() } ?: throw malformed()
                else -> throw malformed()
            }
            return CatalogProduct(required(row, "id"), optional(row, "name"), optional(row, "modelName"), optional(row, "seriesName"),
                strings(row, "image"), strings(row, "configType"), optional(row, "connectType"), optional(row, "cloudPlatform"),
                boolean(row, "recommended"), sort, optional(row, "buyLink"))
        }
        private fun parameter(raw: Any?, depth: Int): ProductParameterValue {
            if (depth >= 16) throw malformed()
            return when (raw) {
                null, JSONObject.NULL -> ProductParameterValue.Null
                is String -> ProductParameterValue.Text(raw)
                is Boolean -> ProductParameterValue.BooleanValue(raw)
                is Number -> ProductParameterValue.Numeric(raw.toDouble().takeIf { it.isFinite() } ?: throw malformed())
                is JSONArray -> {
                    if (raw.length() > 1000) throw malformed()
                    ProductParameterValue.ArrayValue((0 until raw.length()).map { parameter(raw.opt(it), depth + 1) })
                }
                is JSONObject -> {
                    if (raw.length() > 1000) throw malformed()
                    ProductParameterValue.ObjectValue(raw.keys().asSequence().associateWith { parameter(raw.opt(it), depth + 1) })
                }
                else -> throw malformed()
            }
        }
        private fun strings(row: JSONObject, key: String): List<String> = when (val raw = nullable(row, key)) {
            null -> emptyList()
            is String -> if (raw.isEmpty()) emptyList() else listOf(raw.also { if (!valid(it)) throw malformed() })
            is JSONArray -> {
                if (raw.length() > 1000) throw malformed()
                (0 until raw.length()).map { index -> (raw.opt(index) as? String)?.takeIf(::valid) ?: throw malformed() }
            }
            else -> throw malformed()
        }
        private fun nullable(row: JSONObject, key: String): Any? = row.opt(key).takeUnless { it == JSONObject.NULL }
        private fun required(row: JSONObject, key: String) = (row.opt(key) as? String)?.takeIf(::valid) ?: throw malformed()
        private fun optional(row: JSONObject, key: String, allowEmpty: Boolean = false): String? {
            val raw = nullable(row, key) ?: return null
            val value = raw as? String ?: throw malformed()
            if (!allowEmpty && value.isEmpty()) return null
            if (!allowEmpty && !valid(value)) throw malformed()
            return value
        }
        private fun boolean(row: JSONObject, key: String): Boolean? = nullable(row, key)?.let { it as? Boolean ?: throw malformed() }
        private fun valid(value: String) = value.isNotBlank() && value.none { it.isISOControl() }
        private fun malformed() = ApiFailure(502, "产品目录响应格式不完整，请重试")
    }
}

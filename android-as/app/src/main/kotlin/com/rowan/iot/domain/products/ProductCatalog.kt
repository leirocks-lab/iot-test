package com.rowan.iot.domain.products

import java.net.URI

data class ProductCategory(val value: String, val name: String)

data class CatalogProduct(
    val id: String,
    val name: String?,
    val modelName: String?,
    val seriesName: String?,
    val images: List<String>,
    val configTypes: List<String>,
    val connectType: String?,
    val cloudPlatform: String?,
    val recommended: Boolean?,
    val sort: Double?,
    val buyLink: String?,
) {
    val displayName: String get() = name ?: modelName ?: id
}

data class ProductGroup(val category: String, val names: Map<String, String>, val products: List<CatalogProduct>) {
    fun localizedName(language: String): String = names[language] ?: names["en"] ?: names.toSortedMap().values.firstOrNull() ?: category
    /** Cloud sort ascending; equal/absent values retain server order. Missing sort is not invented. */
    val sortedProducts: List<CatalogProduct> get() = products.sortedWith(compareBy<CatalogProduct> { it.sort == null }.thenBy { it.sort })
}

sealed interface ProductParameterValue {
    val displayText: String
    data class Text(val value: String) : ProductParameterValue { override val displayText get() = value }
    data class Numeric(val value: Double) : ProductParameterValue { override val displayText get() = value.toString().removeSuffix(".0") }
    data class BooleanValue(val value: Boolean) : ProductParameterValue { override val displayText get() = value.toString() }
    data object Null : ProductParameterValue { override val displayText = "null" }
    data class ArrayValue(val values: List<ProductParameterValue>) : ProductParameterValue {
        override val displayText get() = values.joinToString(prefix = "[", postfix = "]") { it.displayText }
    }
    data class ObjectValue(val values: Map<String, ProductParameterValue>) : ProductParameterValue {
        override val displayText get() = values.toSortedMap().entries.joinToString(prefix = "{", postfix = "}") { "${it.key}: ${it.value.displayText}" }
    }
}

data class ProductParameter(val key: String, val value: ProductParameterValue)
data class ProductDetails(
    val product: CatalogProduct,
    val category: String?,
    val introduction: String?,
    val parameters: List<ProductParameter>,
    val bluetooth: Boolean?,
)

/** Authenticated PAIR-01/02/03 metadata only; no scanning, binding or guessed product capabilities. */
interface ProductCatalogService {
    suspend fun categories(): List<ProductCategory>
    suspend fun groups(): List<ProductGroup>
    suspend fun detail(id: String): ProductDetails
}

object ProductLink {
    /** External content is user-initiated and never receives native account headers. */
    fun uri(text: String?): URI? {
        if (text == null || text.any { it.isISOControl() }) return null
        return runCatching { URI(text) }.getOrNull()?.takeIf {
            it.scheme.equals("https", ignoreCase = true) && !it.host.isNullOrBlank() && it.rawUserInfo == null
        }
    }
}

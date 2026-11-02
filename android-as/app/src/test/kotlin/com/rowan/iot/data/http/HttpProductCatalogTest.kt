package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.SessionStorage
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.network.HttpGateway
import com.rowan.iot.domain.products.ProductCategory
import com.rowan.iot.domain.products.ProductLink
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Public in-memory fixtures only. No real HTTP, account credentials or product configuration. */
class HttpProductCatalogTest {
    private fun product(id: String = "product/1", sort: Any = 2): JSONObject = JSONObject()
        .put("id", id).put("name", "Cloud name").put("modelName", "Cloud model")
        .put("image", JSONArray().put("https://cdn.example.test/item.png"))
        .put("configType", JSONArray().put("B").put("C")).put("connectType", "wifi")
        .put("recommended", true).put("sort", sort)

    private fun group(vararg products: JSONObject): JSONArray = JSONArray().put(JSONObject()
        .put("category", "stable-code").put("categoryName", JSONObject().put("zh-CN", "云端分类").put("en", "Cloud category"))
        .put("products", JSONArray(products.toList())))

    @Test fun cloudCategoryRecommendationAndSortArePreserved() {
        val values = HttpProductCatalog.decodeGroups(group(product("second", 2), product("first", 1)))
        assertEquals("stable-code", values.single().category)
        assertEquals("云端分类", values.single().localizedName("zh-CN"))
        assertEquals(listOf("first", "second"), values.single().sortedProducts.map { it.id })
        assertEquals(true, values.single().products.first().recommended)
    }

    @Test fun equalAndMissingSortRemainStableAndMissingRecommendationIsUnknown() {
        val a = product("a", 1).apply { remove("recommended") }
        val b = product("b", 1).apply { remove("sort") }
        val value = HttpProductCatalog.decodeGroups(group(a, product("c", 1), b)).single()
        assertEquals(listOf("a", "c", "b"), value.sortedProducts.map { it.id })
        assertNull(value.products.first().recommended)
    }

    @Test fun detailAcceptsDeclaredStringsAndParameterObjectWithoutExecutingIntroduction() {
        val raw = product().put("image", "https://cdn.example.test/item.png").put("configType", "C")
            .put("parameters", JSONObject().put("volume", "120L").put("count", 2))
            .put("introduction", "<script>plain text</script>")
        val value = HttpProductCatalog.decodeDetail(raw, "product/1")
        assertEquals(1, value.product.images.size)
        assertEquals(listOf("C"), value.product.configTypes)
        assertEquals(listOf("count", "volume"), value.parameters.map { it.key })
        assertEquals("<script>plain text</script>", value.introduction)
    }

    @Test fun detailAcceptsActualArraysAndRetainsBluetoothFalse() {
        val raw = product().put("parameters", JSONArray().put(JSONObject().put("key", "volume").put("value", "120L")))
            .put("bluetooth", false)
        val value = HttpProductCatalog.decodeDetail(raw, "product/1")
        assertEquals(listOf("B", "C"), value.product.configTypes)
        assertEquals("120L", value.parameters.single().value.displayText)
        assertEquals(false, value.bluetooth)
    }

    @Test fun invalidTypesAreNotCoercedIntoCapabilities() {
        for (key in listOf("image", "configType", "recommended", "sort", "id")) {
            val raw = product().put(key, if (key == "sort") true else 123)
            assertTrue("Invalid $key was accepted", runCatching { HttpProductCatalog.decodeGroups(group(raw)) }.isFailure)
        }
        assertTrue(runCatching { HttpProductCatalog.decodeDetail(product().put("parameters", "unexpected"), "product/1") }.isFailure)
    }

    @Test fun wrongDetailIdentityAndDuplicateProductsAreRejected() {
        assertTrue(runCatching { HttpProductCatalog.decodeDetail(product(), "different") }.isFailure)
        assertTrue(runCatching { HttpProductCatalog.decodeGroups(group(product(), product())) }.isFailure)
    }

    @Test fun categoriesKeepStableCodesAndRejectDuplicateValues() {
        val raw = JSONArray().put(JSONObject().put("name", "Display name").put("value", "opaque-code"))
        assertEquals(listOf(ProductCategory("opaque-code", "Display name")), HttpProductCatalog.decodeCategories(raw))
        raw.put(JSONObject().put("name", "Different name").put("value", "opaque-code"))
        assertTrue(runCatching { HttpProductCatalog.decodeCategories(raw) }.isFailure)
    }

    @Test fun externalLinksRequireHttpsWithoutEmbeddedCredentials() {
        assertNotNull(ProductLink.uri("https://shop.example.test/p?item=1"))
        for (link in listOf("http://example.test", "javascript:alert(1)", "file:///tmp/a", "https://user:pass@example.test/a", "https:///a")) {
            assertNull(link, ProductLink.uri(link))
        }
    }

    @Test fun pathsUseOnlyExplicitBrandAndTextDetailWithEscapedOpaqueId() {
        assertEquals("/api/app/products", HttpProductCatalog.path("/api/app/products", null))
        assertEquals("/api/app/products/category?brandId=brand%20%26%201", HttpProductCatalog.path("/api/app/products/category", "brand & 1"))
        assertEquals("/api/app/products/product%2F1%3Fx?type=text", HttpProductCatalog.detailPath("product/1?x"))
        assertTrue(runCatching { HttpProductCatalog.detailPath("..") }.isFailure)
    }

    @Test fun authenticatedServiceNeverAddsUndefinedCategoryQuery() = runBlocking {
        val fixture = Fixture()
        fixture.account.login("fixture@example.test", "fixture")
        val service = HttpProductCatalog(fixture.account, brandId = null)
        fixture.response = group(product())
        service.groups()
        assertEquals("/api/app/products", fixture.calls.last().first)
        fixture.response = JSONArray().put(JSONObject().put("name", "Name").put("value", "stable-code"))
        service.categories()
        assertEquals("/api/app/products/category", fixture.calls.last().first)
        fixture.response = product()
        service.detail("product/1")
        assertEquals("/api/app/products/product%2F1?type=text", fixture.calls.last().first)
        assertTrue(fixture.calls.drop(1).all { it.second == "fixture-token" })
    }

    @Test fun oldCatalogCannotReadWithNewAccount() = runBlocking {
        val fixture = Fixture()
        fixture.account.login("fixture@example.test", "fixture")
        val service = HttpProductCatalog(fixture.account)
        fixture.account.login("new@example.test", "fixture")
        val before = fixture.calls.size
        val failure = runCatching { service.groups() }.exceptionOrNull()
        assertEquals(499, (failure as? ApiFailure)?.code)
        assertEquals(before, fixture.calls.size)
    }

    private class Fixture {
        val calls = mutableListOf<Pair<String, String?>>()
        var response: Any = JSONArray()
        val account = AccountService(HttpGateway { method, path, _, token ->
            calls += path to token
            if (method == "POST") JSONObject().put("data", JSONObject().put("accessToken", "fixture-token")
                .put("refreshToken", "fixture-refresh").put("userID", "fixture-user"))
            else JSONObject().put("data", response)
        }, object : SessionStorage {
            private var value: String? = null
            override fun read(): String? = value
            override fun write(value: String?) { this.value = value }
        })
    }
}

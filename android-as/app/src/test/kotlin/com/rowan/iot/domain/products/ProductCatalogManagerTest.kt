package com.rowan.iot.domain.products

import com.rowan.iot.data.http.HttpProductCatalog
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ProductCatalogManagerTest {
    @Test fun filteringIsLocalAndRecommendationIsOnlyCloudDriven() = runBlocking {
        val service = Fixture()
        val manager = ProductCatalogManager(service, { true })
        manager.load()
        assertEquals(listOf("cloud-product"), manager.state.value.recommendedProducts.map { it.id })
        manager.select("stable-code")
        assertEquals("stable-code", manager.state.value.selectedCategory)
        assertEquals(1, manager.state.value.visibleGroups.size)
        manager.select("unknown")
        assertEquals("stable-code", manager.state.value.selectedCategory)
        assertEquals(2, service.reads)
    }

    @Test fun duplicateLoadDoesNotStartAnotherRequest() = runBlocking {
        val service = Fixture()
        val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
        service.beforeCategories = { started.complete(Unit); release.await() }
        val manager = ProductCatalogManager(service, { true })
        val first = launch { manager.load() }; started.await()
        manager.load()
        assertEquals(1, service.reads)
        release.complete(Unit); first.join()
        assertEquals(2, service.reads)
        assertTrue(manager.state.value.loaded)
    }

    @Test fun cancellationRejectsLateNonCooperativeResponseAndPreventsNextRead() = runBlocking {
        val service = Fixture()
        val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
        service.beforeCategories = { withContext(NonCancellable) { started.complete(Unit); release.await() } }
        val manager = ProductCatalogManager(service, { true })
        val task = launch { manager.load() }; started.await()
        task.cancel(); release.complete(Unit); task.join()
        assertFalse(manager.state.value.loaded)
        assertTrue(manager.state.value.categories.isEmpty())
        assertEquals(1, service.reads)
        assertFalse(manager.state.value.busy)
    }

    @Test fun changedAccountCannotPublishFinalCatalogRead() = runBlocking {
        val service = Fixture()
        var current = true
        service.beforeGroups = { current = false }
        val manager = ProductCatalogManager(service, { current })
        manager.load()
        assertFalse(manager.state.value.loaded)
        assertTrue(manager.state.value.groups.isEmpty())
        assertTrue(manager.state.value.sessionExpired)
    }

    private class Fixture : ProductCatalogService {
        var reads = 0
        var beforeCategories: suspend () -> Unit = {}
        var beforeGroups: () -> Unit = {}
        override suspend fun categories(): List<ProductCategory> {
            reads += 1; beforeCategories()
            return listOf(ProductCategory("stable-code", "Cloud category"))
        }
        override suspend fun groups(): List<ProductGroup> {
            reads += 1; beforeGroups()
            return HttpProductCatalog.decodeGroups(JSONArray().put(JSONObject()
                .put("category", "stable-code").put("categoryName", JSONObject().put("en", "Cloud category"))
                .put("products", JSONArray().put(JSONObject().put("id", "cloud-product").put("name", "Cloud product")
                    .put("recommended", true).put("sort", 1)))))
        }
        override suspend fun detail(id: String): ProductDetails = throw ApiFailure(1091, "Product not found")
    }
}

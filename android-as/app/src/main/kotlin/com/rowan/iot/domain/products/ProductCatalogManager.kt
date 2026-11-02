package com.rowan.iot.domain.products

import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withTimeout

data class ProductCatalogState(
    val categories: List<ProductCategory> = emptyList(),
    val groups: List<ProductGroup> = emptyList(),
    val selectedCategory: String? = null,
    val loaded: Boolean = false,
    val busy: Boolean = false,
    val sessionExpired: Boolean = false,
    val error: String? = null,
) {
    val visibleGroups get() = groups.filter { selectedCategory == null || it.category == selectedCategory }
    val recommendedProducts get() = ProductGroup("", emptyMap(), visibleGroups.flatMap { it.products }.filter { it.recommended == true }).sortedProducts
}

/** Caller-owned structured work; cancellation never publishes a late response or retries. */
class ProductCatalogManager(
    private val service: ProductCatalogService,
    private val current: () -> Boolean,
    private val language: String = "zh-CN",
    private val timeoutMillis: Long = 35_000,
) {
    private val mutable = MutableStateFlow(ProductCatalogState())
    val state: StateFlow<ProductCatalogState> = mutable.asStateFlow()
    private val operation = Mutex()

    fun select(category: String?) {
        if (!current()) { expired(); return }
        if (category != null && mutable.value.categories.none { it.value == category }) return
        mutable.value = mutable.value.copy(selectedCategory = category)
    }

    suspend fun load() {
        currentCoroutineContext().ensureActive()
        if (!current()) { expired(); return }
        if (!operation.tryLock()) return
        try {
            mutable.value = mutable.value.copy(busy = true, error = null)
            val (choices, groups) = withTimeout(timeoutMillis) {
                val choices = service.categories().toList()
                currentCoroutineContext().ensureActive()
                if (!current()) throw ApiFailure(499, "会话已变化")
                val groups = service.groups().toList()
                currentCoroutineContext().ensureActive()
                choices to groups
            }
            currentCoroutineContext().ensureActive()
            if (!current()) { expired(); return }
            // Reconcile independently-read snapshots without inventing a server filter query.
            val merged = choices.toMutableList()
            groups.filter { group -> merged.none { it.value == group.category } }.forEach {
                merged += ProductCategory(it.category, it.localizedName(language))
            }
            val selected = mutable.value.selectedCategory?.takeIf { code -> merged.any { it.value == code } }
            mutable.value = ProductCatalogState(merged.toList(), groups, selected, loaded = true)
        } catch (_: TimeoutCancellationException) {
            if (!current()) expired() else mutable.value = mutable.value.copy(busy = false, error = "产品目录加载超时，请重试")
        } catch (error: CancellationException) {
            if (!current()) expired() else mutable.value = mutable.value.copy(busy = false, error = "加载已取消，请重试")
            throw error
        } catch (error: Exception) {
            if (!current()) expired() else mutable.value = mutable.value.copy(busy = false, error = (error as? ApiFailure)?.message ?: "产品目录加载失败，请重试")
        } finally {
            if (mutable.value.busy) mutable.value = mutable.value.copy(busy = false)
            operation.unlock()
        }
    }

    private fun expired() { mutable.value = ProductCatalogState(sessionExpired = true, error = "会话已变化，请返回首页") }
}

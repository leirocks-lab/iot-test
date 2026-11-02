package com.rowan.iot.features.products

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.products.ProductCatalogService
import com.rowan.iot.domain.products.ProductDetails
import com.rowan.iot.domain.products.ProductLink
import kotlinx.coroutines.*

/** PAIR-02 text is rendered as text, never HTML/JavaScript or a fabricated pairing screen. */
class ProductDetailsActivity : Activity() {
    private val lifetime = MainScope()
    private val account get() = (application as MainApplication).services.account
    private lateinit var service: ProductCatalogService
    private lateinit var productId: String
    private var revision = 0L
    private var work: Job? = null
    private var generation = 0
    private var loaded = false
    private lateinit var rows: LinearLayout
    private lateinit var status: TextView
    private lateinit var refresh: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val id = intent.getStringExtra(EXTRA_PRODUCT_ID)
        revision = intent.getLongExtra(EXTRA_ACCOUNT_REVISION, Long.MIN_VALUE)
        if (id.isNullOrBlank() || !current()) { finish(); return }
        productId = id
        service = (application as MainApplication).services.makeProductCatalog()
        buildPage(); load()
    }
    private fun current() = account.contextSnapshot().let { it.revision == revision && it.session != null }
    override fun onResume() {
        super.onResume()
        if (::service.isInitialized) {
            if (!current()) { finish(); return }
            if (::rows.isInitialized) visitProductImages(rows) { it.resumeLoad() }
            if (!loaded && work?.isActive != true) load()
        }
    }
    override fun onStop() {
        generation += 1; work?.cancel(); work = null
        if (::rows.isInitialized) visitProductImages(rows) { it.cancelLoad() }
        if (::refresh.isInitialized) refresh.isEnabled = true
        super.onStop()
    }
    override fun onDestroy() { lifetime.cancel(); super.onDestroy() }
    private fun buildPage() {
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(productPageColor) }
        content.addView(productHeader("产品详情") { finish() })
        status = productText("正在加载产品详情…", 14f, R.id.product_details_status).apply {
            setPadding(productDp(16), productDp(8), productDp(16), productDp(8)); accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        content.addView(status)
        rows = LinearLayout(this).apply { id = R.id.product_details_content; orientation = LinearLayout.VERTICAL; setPadding(productDp(16), productDp(8), productDp(16), productDp(24)) }
        content.addView(ScrollView(this).apply { addView(rows) }, LinearLayout.LayoutParams(-1, 0, 1f))
        refresh = Button(this).apply { id = R.id.products_refresh; text = "刷新"; isAllCaps = false; setOnClickListener { load() } }
        content.addView(refresh)
        setContentView(content); productInsets(content)
    }
    private fun load() {
        if (work?.isActive == true || !current()) return
        generation += 1; val expected = generation
        loaded = false; refresh.isEnabled = false; status.text = "正在加载产品详情…"; status.visibility = View.VISIBLE; rows.removeAllViews()
        work = lifetime.launch {
            try {
                val value = withTimeout(35_000) { service.detail(productId) }
                currentCoroutineContext().ensureActive()
                if (generation != expected || !current()) return@launch
                render(value); loaded = true; status.visibility = View.GONE
            } catch (_: TimeoutCancellationException) {
                if (generation == expected && current()) { status.text = "产品详情加载超时，请重试"; status.visibility = View.VISIBLE }
            } catch (error: CancellationException) {
                if (generation == expected && current()) { status.text = "加载已取消，请重试"; status.visibility = View.VISIBLE }
                throw error
            } catch (error: Exception) {
                if (generation != expected) return@launch
                if (!current()) { finish(); return@launch }
                status.text = (error as? ApiFailure)?.let { if (it.code == 1091) "产品不存在或已下架，请返回刷新目录" else it.message } ?: "产品详情加载失败，请重试"
                status.visibility = View.VISIBLE
            } finally { if (generation == expected) refresh.isEnabled = true }
        }
    }
    private fun render(value: ProductDetails) {
        rows.removeAllViews()
        val product = value.product
        if (product.images.isEmpty()) text("暂无产品图片")
        product.images.forEach { image ->
            rows.addView(PublicProductImageView(this).apply {
                bind(image, lifetime, ::current, productDp(320), product.displayName)
            }, LinearLayout.LayoutParams(-1, productDp(230)).apply { bottomMargin = productDp(16) })
        }
        text(product.displayName, 24f)
        for ((label, field) in listOf("型号" to product.modelName, "系列" to product.seriesName)) field?.let { text("$label：$it") }
        text("连接方式：${productConnectionLabel(product.connectType) ?: "暂未提供"}")
        text("产品介绍", 20f); text(value.introduction ?: "暂无产品介绍")
        text("产品参数", 20f)
        if (value.parameters.isEmpty()) text("暂无产品参数") else value.parameters.forEach { text("${it.key}：${it.value.displayText}") }
        product.buyLink?.takeIf { ProductLink.uri(it) != null }?.let { link("Shop", it, R.id.products_shop) }
    }
    private fun text(value: String, size: Float = 16f) {
        rows.addView(productText(value, size).apply {
            setPadding(productDp(12), productDp(10), productDp(12), productDp(10)); setTextIsSelectable(true)
            background = productRounded(Color.WHITE, productDp(8).toFloat())
        }, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = productDp(8) })
    }
    private fun link(title: String, url: String, viewId: Int) {
        rows.addView(productText(title, 14f, viewId).apply { minimumHeight = productDp(44); setTextColor(Color.rgb(24, 109, 175)); setOnClickListener { openProductLink(url, ::current) } }, LinearLayout.LayoutParams(-1, -2))
    }
    companion object {
        const val EXTRA_PRODUCT_ID = "product_id"
        const val EXTRA_ACCOUNT_REVISION = "product_account_revision"
    }
}

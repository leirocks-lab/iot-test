package com.rowan.iot.features.products

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.products.CatalogProduct
import com.rowan.iot.domain.products.ProductCatalogManager
import com.rowan.iot.domain.products.ProductCatalogState
import com.rowan.iot.domain.products.ProductLink
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

/** Manual, cloud-backed directory. No simulated scanning, BLE connection or binding action. */
class ProductCatalogActivity : Activity() {
    private val lifetime = MainScope()
    private val account get() = (application as MainApplication).services.account
    private var revision = 0L
    private var work: Job? = null
    private lateinit var manager: ProductCatalogManager
    private lateinit var rows: LinearLayout
    private lateinit var status: TextView
    private lateinit var filter: Button
    private lateinit var refresh: Button
    private var filterDialog: AlertDialog? = null
    private var language = "zh-CN"
    private var restoredCategory: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val context = account.contextSnapshot()
        val launchedRevision = intent.getLongExtra(ProductDetailsActivity.EXTRA_ACCOUNT_REVISION, Long.MIN_VALUE)
        val savedRevision = savedInstanceState?.getLong(STATE_REVISION, Long.MIN_VALUE)
        if (launchedRevision == Long.MIN_VALUE || savedRevision != null && savedRevision != launchedRevision) { finish(); return }
        revision = savedRevision ?: launchedRevision
        if (context.session == null || context.revision != revision) { finish(); return }
        language = context.session.language.takeIf { it.isNotBlank() } ?: "zh-CN"
        restoredCategory = savedInstanceState?.getString(STATE_CATEGORY)
        manager = ProductCatalogManager((application as MainApplication).services.makeProductCatalog(), ::current, language)
        buildPage()
        lifetime.launch { manager.state.collect { render(it) } }
        load()
    }
    private fun current(): Boolean = account.contextSnapshot().let { it.revision == revision && it.session != null }
    override fun onResume() {
        super.onResume()
        if (::manager.isInitialized) {
            if (!current()) { finish(); return }
            if (::rows.isInitialized) visitProductImages(rows) { it.resumeLoad() }
            if (!manager.state.value.loaded && work?.isActive != true) load()
        }
    }
    override fun onStop() { work?.cancel(); work = null; filterDialog?.dismiss(); if (::rows.isInitialized) visitProductImages(rows) { it.cancelLoad() }; super.onStop() }
    override fun onDestroy() { lifetime.cancel(); super.onDestroy() }
    override fun onSaveInstanceState(outState: Bundle) {
        outState.putLong(STATE_REVISION, revision)
        if (::manager.isInitialized) outState.putString(STATE_CATEGORY, manager.state.value.selectedCategory)
        super.onSaveInstanceState(outState)
    }
    private fun load() {
        if (work?.isActive == true || !current()) return
        work = lifetime.launch { manager.load() }
    }
    private fun buildPage() {
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(productPageColor) }
        content.addView(productHeader("添加设备") { finish() })
        val tools = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL; setPadding(productDp(16), 0, productDp(16), 0) }
        filter = Button(this).apply { id = R.id.products_filter; text = "全部品类"; isAllCaps = false; setOnClickListener { chooseCategory() } }
        refresh = Button(this).apply { id = R.id.products_refresh; text = "刷新"; isAllCaps = false; setOnClickListener { load() } }
        tools.addView(filter, LinearLayout.LayoutParams(0, -2, 1f)); tools.addView(refresh, LinearLayout.LayoutParams(-2, -2))
        content.addView(tools)
        status = productText("正在加载产品目录…", 14f, R.id.products_status).apply {
            setPadding(productDp(16), productDp(8), productDp(16), productDp(8)); accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        content.addView(status)
        rows = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; id = R.id.products_list; setPadding(productDp(16), 0, productDp(16), productDp(20)) }
        content.addView(ScrollView(this).apply { addView(rows) }, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(content); productInsets(content)
    }
    private fun chooseCategory() {
        if (!current()) { finish(); return }
        val state = manager.state.value
        val choices = listOf("全部品类") + state.categories.map { it.name }
        val selected = state.categories.indexOfFirst { it.value == state.selectedCategory } + 1
        filterDialog = AlertDialog.Builder(this).setTitle("选择品类").setSingleChoiceItems(choices.toTypedArray(), selected) { dialog, index ->
            manager.select(if (index == 0) null else state.categories[index - 1].value)
            dialog.dismiss()
        }.setNegativeButton("取消", null).show()
    }
    private fun render(state: ProductCatalogState) {
        if (!current() || state.sessionExpired) { filterDialog?.dismiss(); finish(); return }
        if (state.loaded && restoredCategory != null) {
            val value = restoredCategory; restoredCategory = null
            if (state.categories.any { it.value == value } && state.selectedCategory != value) { manager.select(value); return }
        }
        filter.text = state.categories.firstOrNull { it.value == state.selectedCategory }?.name ?: "全部品类"
        filter.isEnabled = state.loaded && !state.busy
        refresh.isEnabled = !state.busy
        status.text = state.error ?: if (state.busy) "正在加载产品目录…" else if (state.visibleGroups.all { it.products.isEmpty() }) "暂无可添加产品" else ""
        status.visibility = if (status.text.isEmpty()) View.GONE else View.VISIBLE
        rows.removeAllViews()
        if (state.recommendedProducts.isNotEmpty()) section("推荐", state.recommendedProducts)
        state.visibleGroups.filter { it.products.isNotEmpty() }.forEach { section(it.localizedName(language), it.sortedProducts) }
    }
    private fun section(title: String, products: List<CatalogProduct>) {
        rows.addView(productText(title, 16f, R.id.products_section), LinearLayout.LayoutParams(-1, -2).apply { topMargin = productDp(16); bottomMargin = productDp(8) })
        val screenDp = resources.configuration.screenWidthDp
        val columns = if (resources.configuration.fontScale >= 1.3f) 1 else ((screenDp - 32 + 10) / 117).coerceIn(1, 3)
        products.chunked(columns).forEach { group ->
            val line = LinearLayout(this).apply { gravity = Gravity.TOP }
            group.forEachIndexed { index, product ->
                line.addView(card(product), LinearLayout.LayoutParams(0, -2, 1f).apply { if (index > 0) leftMargin = productDp(10) })
            }
            repeat(columns - group.size) { line.addView(View(this), LinearLayout.LayoutParams(0, 1, 1f).apply { leftMargin = productDp(10) }) }
            rows.addView(line, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = productDp(12) })
        }
    }
    private fun card(product: CatalogProduct): View = LinearLayout(this).apply {
        id = R.id.products_card; orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL
        background = productRounded(Color.WHITE, productDp(12).toFloat()); setPadding(productDp(8), productDp(12), productDp(8), productDp(12))
        contentDescription = "${product.displayName}，查看产品详情"
        isClickable = true; isFocusable = true; minimumHeight = productDp(144)
        setOnClickListener { details(product.id) }
        addView(PublicProductImageView(this@ProductCatalogActivity).apply {
            bind(product.images.firstOrNull(), lifetime, ::current, productDp(120), product.displayName)
        }, LinearLayout.LayoutParams(-1, productDp(76)))
        addView(productText(product.displayName, 14f, R.id.products_open_details).apply {
            gravity = Gravity.CENTER; setOnClickListener { details(product.id) }; contentDescription = "查看${product.displayName}详情"
        }, LinearLayout.LayoutParams(-1, -2))
        product.modelName?.let { addView(productText(it, 12f).apply { gravity = Gravity.CENTER; setTextColor(Color.rgb(154, 154, 158)) }) }
        productConnectionLabel(product.connectType)?.let { addView(productText(it, 12f).apply { gravity = Gravity.CENTER; setTextColor(Color.GRAY) }) }
        if (ProductLink.uri(product.buyLink) != null) addView(productText("Shop", 12f, R.id.products_shop).apply {
            gravity = Gravity.CENTER; minimumHeight = productDp(36); setTextColor(Color.rgb(24, 109, 175)); setOnClickListener { openProductLink(product.buyLink, ::current) }
        }, LinearLayout.LayoutParams(-1, -2))
    }
    private fun details(id: String) {
        if (!current()) { finish(); return }
        startActivity(Intent(this, ProductDetailsActivity::class.java).putExtra(ProductDetailsActivity.EXTRA_PRODUCT_ID, id)
            .putExtra(ProductDetailsActivity.EXTRA_ACCOUNT_REVISION, revision))
    }
    private companion object { const val STATE_REVISION = "products_revision"; const val STATE_CATEGORY = "products_category" }
}

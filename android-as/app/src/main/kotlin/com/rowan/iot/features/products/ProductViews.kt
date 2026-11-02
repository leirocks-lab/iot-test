package com.rowan.iot.features.products

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.rowan.iot.R
import com.rowan.iot.domain.products.ProductLink

internal val productPageColor: Int = Color.rgb(242, 242, 242)
internal fun Activity.productDp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
internal fun productRounded(color: Int, radius: Float): GradientDrawable = GradientDrawable().apply { setColor(color); cornerRadius = radius }
internal fun Activity.productText(text: String, size: Float = 16f, viewId: Int = View.NO_ID): TextView = TextView(this).apply {
    this.text = text; textSize = size; id = viewId; setTextColor(Color.rgb(51, 51, 51))
}
internal fun Activity.productHeader(title: String, back: () -> Unit): LinearLayout = LinearLayout(this).apply {
    gravity = Gravity.CENTER_VERTICAL
    addView(productText("‹", 30f, R.id.products_back).apply {
        contentDescription = "返回"; gravity = Gravity.CENTER; setOnClickListener { back() }
    }, LinearLayout.LayoutParams(productDp(48), productDp(56)))
    addView(productText(title, 17f, R.id.products_title).apply {
        gravity = Gravity.CENTER; setTypeface(null, Typeface.BOLD)
    }, LinearLayout.LayoutParams(0, productDp(56), 1f))
    addView(View(this@productHeader), LinearLayout.LayoutParams(productDp(48), productDp(56)))
}
internal fun Activity.productInsets(content: View) {
    window.statusBarColor = productPageColor
    window.navigationBarColor = productPageColor
    @Suppress("DEPRECATION")
    run { window.decorView.systemUiVisibility = window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
        (if (Build.VERSION.SDK_INT >= 26) View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else 0) }
    if (Build.VERSION.SDK_INT >= 30) {
        window.setDecorFitsSystemWindows(false)
        content.setOnApplyWindowInsetsListener { view, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        val light = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        window.decorView.windowInsetsController?.setSystemBarsAppearance(light, light)
    }
}
internal fun productConnectionLabel(value: String?): String? = when (value?.lowercase(java.util.Locale.ROOT)) {
    "wifi", "wi-fi" -> "Wi-Fi"
    "bluetooth" -> "蓝牙"
    else -> null
}
internal fun Activity.openProductLink(value: String?, current: () -> Boolean) {
    if (!current()) return
    val uri = ProductLink.uri(value) ?: return
    // Explicit gesture only. No authentication headers, arbitrary scheme or product-owned HTTP client.
    try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri.toASCIIString()))) }
    catch (_: ActivityNotFoundException) { Toast.makeText(this, "没有可打开此HTTPS链接的应用", Toast.LENGTH_SHORT).show() }
    catch (_: SecurityException) { Toast.makeText(this, "无法打开此HTTPS链接", Toast.LENGTH_SHORT).show() }
}

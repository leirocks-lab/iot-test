package com.rowan.iot.features.preferences

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.LinearLayout
import android.widget.TextView

/** Views shared only by the two small native preferences entry pages. */
internal class PreferencePageViews(private val activity: Activity, private val dark: Boolean = false) {
    val foreground = if (dark) Color.WHITE else Color.BLACK
    val muted = if (dark) Color.rgb(190,190,190) else Color.rgb(100,100,100)
    private val pageColor = if (dark) Color.rgb(23,23,23) else Color.rgb(242,242,242)
    private val cardColor = if (dark) Color.rgb(40,40,40) else Color.WHITE
    val blue = if (dark) Color.rgb(100,185,255) else Color.rgb(0,112,202)
    fun dp(value: Int) = (value * activity.resources.displayMetrics.density).toInt()
    fun label(text: String, size: Float = 16f, id: Int = View.NO_ID) = TextView(activity).apply {
        this.id = id; this.text = text; textSize = size; setTextColor(this@PreferencePageViews.foreground)
        gravity = Gravity.CENTER_VERTICAL
    }
    fun page(title: String, titleId: Int, backId: Int, onBack: () -> Unit): LinearLayout {
        val root = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL; setBackgroundColor(pageColor)
            setPadding(dp(16),0,dp(16),dp(16))
        }
        val header = LinearLayout(activity).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(label("‹",32f,backId).apply {
            contentDescription = "返回 / Back"; setOnClickListener { onBack() }
        },LinearLayout.LayoutParams(dp(56),dp(56)))
        header.addView(label(title,17f,titleId).apply {
            gravity = Gravity.CENTER; setTypeface(null,Typeface.BOLD)
        },LinearLayout.LayoutParams(0,dp(56),1f))
        header.addView(View(activity),LinearLayout.LayoutParams(dp(56),dp(56)))
        root.addView(header)
        if (Build.VERSION.SDK_INT >= 30) {
            activity.window.setDecorFitsSystemWindows(false)
            root.setOnApplyWindowInsetsListener { view,insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(dp(16)+bars.left,bars.top,dp(16)+bars.right,dp(16)+bars.bottom)
                insets
            }
            val appearances = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            activity.window.decorView.windowInsetsController?.setSystemBarsAppearance(if(dark)0 else appearances,appearances)
        }
        return root
    }
    fun card() = LinearLayout(activity).apply {
        orientation = LinearLayout.VERTICAL
        background = GradientDrawable().apply { setColor(cardColor); cornerRadius = dp(14).toFloat() }
    }
    fun row(title: String, value: String, id: Int, enabled: Boolean, onClick: (() -> Unit)?): View {
        return LinearLayout(activity).apply {
            this.id = id; gravity = Gravity.CENTER_VERTICAL; minimumHeight = dp(56)
            setPadding(dp(16),dp(10),dp(16),dp(10))
            addView(label(title),LinearLayout.LayoutParams(0,-2,1f))
            addView(label(value,14f).apply { setTextColor(if(enabled)blue else muted); gravity = Gravity.END or Gravity.CENTER_VERTICAL },
                LinearLayout.LayoutParams(-2,-2).apply { leftMargin = dp(12) })
            contentDescription = "$title，$value"; isEnabled = enabled
            if (onClick != null) {
                isFocusable = true; isClickable = true
                setOnClickListener { if(isEnabled)onClick() }
            }
        }
    }
    fun notice(text: String, id: Int = View.NO_ID) = label(text,14f,id).apply {
        setTextColor(muted); setPadding(dp(4),dp(12),dp(4),dp(12))
        accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
    }
}

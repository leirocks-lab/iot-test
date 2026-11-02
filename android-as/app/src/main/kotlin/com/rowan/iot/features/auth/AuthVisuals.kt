package com.rowan.iot.features.auth

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowInsetsController
import android.widget.Button
import com.rowan.iot.R

/** Values/assets from the archived login and filled-login designs; no generated artwork. */
internal class AuthVisuals(private val context: Context) {
    fun dp(value: Int) = (value * context.resources.displayMetrics.density).toInt()
    fun rounded(color: Int) = GradientDrawable().apply { setColor(color); cornerRadius = dp(8).toFloat() }

    fun icon(resource: Int, size: Int, frame: Int = size): BitmapDrawable {
        val source = BitmapFactory.decodeResource(context.resources, resource)
        val target = Bitmap.createBitmap(dp(frame), dp(frame), Bitmap.Config.ARGB_8888)
        target.density = Bitmap.DENSITY_NONE
        val offset = (dp(frame) - dp(size)) / 2
        Canvas(target).drawBitmap(source, null, Rect(offset, offset, offset + dp(size), offset + dp(size)), Paint(Paint.FILTER_BITMAP_FLAG))
        return BitmapDrawable(context.resources, target).apply { gravity = Gravity.CENTER }
    }

    fun passwordBackground(visible: Boolean) = BitmapDrawable(context.resources,
        BitmapFactory.decodeResource(context.resources, if (visible) R.drawable.auth_password_visible else R.drawable.auth_password_hidden)
    ).apply { gravity = Gravity.FILL }

    fun agreementIndicator() = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_checked), icon(R.drawable.auth_agreement_checked, 14, 16))
        addState(intArrayOf(), icon(R.drawable.auth_agreement_unchecked, 16))
    }

    fun action(button: Button, enabled: Boolean) {
        button.textSize = 16f
        button.backgroundTintList = null
        button.background = rounded(if (enabled) Color.BLACK else Color.rgb(187, 187, 187))
        button.setTextColor(Color.WHITE)
        button.stateListAnimator = null
        button.setPadding(0, 0, 0, 0)
    }

    fun systemBars(activity: Activity) {
        val decor = activity.window.decorView
        if (Build.VERSION.SDK_INT >= 30) {
            val light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            decor.windowInsetsController?.setSystemBarsAppearance(light, light)
        } else {
            @Suppress("DEPRECATION")
            decor.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
    }
}

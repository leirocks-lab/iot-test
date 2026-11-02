package com.rowan.iot.features.auth

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.text.Editable
import android.text.InputFilter
import android.text.InputType
import android.text.TextWatcher
import android.text.method.HideReturnsTransformationMethod
import android.text.method.PasswordTransformationMethod
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.*
import com.rowan.iot.R
import com.rowan.iot.domain.account.AccountInput

/**
 * Native primitives matching the archived registration/recovery CSS: #F2F2F2,
 * 280/375 form width, white radius-8 fields, 16sp inputs and black enabled actions.
 * Original 160px envelope/lock and 24px region/search assets are copied unchanged
 * from the corresponding Lanhu pages; no generated artwork or system chrome.
 */
internal class AuthFlowLayout(private val activity: Activity, title: String, back: () -> Unit) {
    val visuals = AuthVisuals(activity)
    val blue = Color.rgb(24, 109, 175)
    val orange = Color.rgb(238, 157, 49)
    private val pageColor = Color.rgb(242, 242, 242)
    val body = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; setPadding(0, 0, 0, dp(24)) }
    private val root = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(pageColor) }
    val scroll = ScrollView(activity).apply { isFillViewport = true; clipToPadding = false }
    fun dp(value: Int) = visuals.dp(value)

    init {
        val header = FrameLayout(activity)
        val heading = text(title, 16f).apply { id = R.id.auth_flow_title; gravity = Gravity.CENTER; setTypeface(null, Typeface.BOLD) }
        header.addView(heading, FrameLayout.LayoutParams(-1, -1).apply { leftMargin = dp(56); rightMargin = dp(56) })
        header.addView(ImageButton(activity).apply {
            id = R.id.auth_flow_back; contentDescription = "返回"; setImageDrawable(visuals.icon(R.drawable.auth_back, 28))
            setBackgroundColor(Color.TRANSPARENT); setOnClickListener { back() }
        }, FrameLayout.LayoutParams(dp(44), -1, Gravity.START).apply { leftMargin = dp(10) })
        root.addView(header, LinearLayout.LayoutParams(-1, dp(44)))
        scroll.addView(body, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER_HORIZONTAL))
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        // The form grows vertically instead of clipping large fonts. Scroll and IME
        // insets also work on compact emulator sizes without a hard-coded screen height.
        scroll.addOnLayoutChangeListener { view, left, _, right, _, _, _, _, _ ->
            val width = right - left
            if (width > 0) {
                val margin = (width / 8).coerceIn(dp(24), dp(47))
                val desired = minOf(dp(420), width - margin * 2).coerceAtLeast(dp(160))
                if (body.layoutParams.width != desired) body.layoutParams = (body.layoutParams as FrameLayout.LayoutParams).apply { this.width = desired }
            }
            if (view.hasFocus()) view.findFocus()?.let { focus -> focus.post { scroll.requestChildFocus(focus, focus) } }
        }
        activity.window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN)
        if (Build.VERSION.SDK_INT >= 30) {
            @Suppress("DEPRECATION")
            activity.window.setDecorFitsSystemWindows(false)
            root.setOnApplyWindowInsetsListener { view, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, insets.getInsets(WindowInsets.Type.ime()).bottom))
                insets
            }
        } else root.fitsSystemWindows = true
        activity.setContentView(root)
        visuals.systemBars(activity)
    }

    fun text(value: String, size: Float = 14f) = TextView(activity).apply {
        text = value; textSize = size; setTextColor(Color.rgb(35, 25, 22)); includeFontPadding = true
    }
    fun replaceScrollWith(view: View) { root.removeView(scroll); root.addView(view, LinearLayout.LayoutParams(-1, 0, 1f)) }
    fun gap(size: Int) { body.addView(Space(activity), LinearLayout.LayoutParams(1, dp(size))) }
    fun heading(value: String) { gap(37); body.addView(text(value, 32f)); gap(38) }
    fun hero(resource: Int) {
        gap(24)
        body.addView(ImageView(activity).apply { setImageResource(resource); importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO },
            LinearLayout.LayoutParams(dp(160), dp(160)).apply { gravity = Gravity.CENTER_HORIZONTAL })
        gap(16)
    }
    fun centered(value: String, size: Float = 14f) = text(value, size).apply { gravity = Gravity.CENTER; body.addView(this, LinearLayout.LayoutParams(-1, -2)) }
    fun status(id: Int) = text("", 13f).apply {
        this.id = id; setTextColor(orange); accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        setPadding(0, dp(10), 0, dp(8)); body.addView(this, LinearLayout.LayoutParams(-1, -2))
    }
    fun button(value: String, id: Int, click: () -> Unit) = Button(activity).apply {
        this.id = id; text = value; isAllCaps = false; minHeight = dp(46); minimumHeight = dp(46)
        setTypeface(null, Typeface.BOLD); setOnClickListener { if (isEnabled) click() }
        body.addView(this, LinearLayout.LayoutParams(-1, -2)); setActionEnabled(this, false)
    }
    fun setActionEnabled(button: Button, enabled: Boolean) {
        button.isEnabled = enabled; visuals.action(button, enabled); button.setPadding(dp(12), dp(12), dp(12), dp(12))
    }
    fun link(value: String, id: Int = View.NO_ID, click: () -> Unit) = text(value, 14f).apply {
        this.id = id; setTextColor(blue); gravity = Gravity.CENTER; minHeight = dp(44); isClickable = true; isFocusable = true
        setOnClickListener { if (isEnabled) click() }; body.addView(this, LinearLayout.LayoutParams(-1, -2))
    }
    fun field(hint: String, id: Int, secret: Boolean = false) = InputField(hint, id, secret).also { body.addView(it.container, LinearLayout.LayoutParams(-1, -2)) }

    /** Wrapping legal links keep individual accessible native targets at large font scales. */
    fun legalRow() = object : ViewGroup(activity) {
        private val lines = mutableListOf<List<View>>()
        override fun onMeasure(widthSpec: Int, heightSpec: Int) {
            val width = MeasureSpec.getSize(widthSpec); lines.clear()
            var line = mutableListOf<View>(); var used = 0
            for (index in 0 until childCount) {
                val child = getChildAt(index)
                child.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.AT_MOST), MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED))
                if (used + child.measuredWidth > width && line.isNotEmpty()) { lines += line; line = mutableListOf(); used = 0 }
                line += child; used += child.measuredWidth
            }
            if (line.isNotEmpty()) lines += line
            setMeasuredDimension(width, lines.sumOf { row -> row.maxOf { it.measuredHeight } })
        }
        override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
            var y = 0
            for (line in lines) {
                var x = (width - line.sumOf { it.measuredWidth }) / 2
                val height = line.maxOf { it.measuredHeight }
                for (child in line) { val offset = (height - child.measuredHeight) / 2; child.layout(x, y + offset, x + child.measuredWidth, y + offset + child.measuredHeight); x += child.measuredWidth }
                y += height
            }
        }
    }.also { body.addView(it, LinearLayout.LayoutParams(-1, -2)) }

    inner class InputField(hint: String, id: Int, secret: Boolean) {
        val container = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        private val frame = FrameLayout(activity).apply { background = visuals.rounded(Color.WHITE); setPadding(dp(1), dp(1), dp(1), dp(1)) }
        val edit = EditText(activity).apply {
            this.id = id; this.hint = hint; textSize = 16f; isSingleLine = true; isSaveEnabled = false
            minHeight = dp(46); setTextColor(Color.BLACK); setHintTextColor(Color.rgb(153, 153, 153)); typeface = Typeface.DEFAULT
            inputType = InputType.TYPE_CLASS_TEXT or if (secret) InputType.TYPE_TEXT_VARIATION_PASSWORD else InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            if (secret) { background = visuals.passwordBackground(false); setPadding(dp(48), dp(10), dp(46), dp(10)) }
            else {
                background = visuals.rounded(Color.WHITE); setPadding(dp(16), dp(10), dp(44), dp(10))
                setCompoundDrawablesWithIntrinsicBounds(visuals.icon(R.drawable.auth_email, 24), null, null, null); compoundDrawablePadding = dp(8)
            }
            if (Build.VERSION.SDK_INT >= 26) importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        }
        private val error = text("", 12f).apply { setTextColor(orange); visibility = View.GONE; setPadding(dp(16), dp(6), 0, 0) }
        init {
            frame.addView(edit, FrameLayout.LayoutParams(-1, -2))
            if (secret) {
                var visible = false
                frame.addView(View(activity).apply {
                    contentDescription = "显示密码"; isFocusable = true; isClickable = true
                    setOnClickListener {
                        if (edit.isEnabled) {
                            visible = !visible
                            edit.transformationMethod = if (visible) HideReturnsTransformationMethod.getInstance() else PasswordTransformationMethod.getInstance()
                            edit.typeface = Typeface.DEFAULT; edit.background = visuals.passwordBackground(visible); edit.setSelection(edit.text.length)
                            contentDescription = if (visible) "隐藏密码" else "显示密码"
                        }
                    }
                // fillViewport remeasures the wrapping form with AT_MOST height.
                // A plain MATCH_PARENT overlay then consumes the viewport and
                // stretches this field. Bound only the touch overlay; text wraps.
                }, FrameLayout.LayoutParams(dp(44), dp(46), Gravity.END or Gravity.CENTER_VERTICAL))
            } else {
                val clear = TextView(activity).apply { text = "×"; textSize = 24f; gravity = Gravity.CENTER; setTextColor(Color.GRAY); contentDescription = "清空邮箱"; setOnClickListener { if (edit.isEnabled) edit.text.clear() } }
                frame.addView(clear, FrameLayout.LayoutParams(dp(44), dp(46), Gravity.END or Gravity.CENTER_VERTICAL))
                watch(edit) { clear.visibility = if (edit.text.isEmpty()) View.INVISIBLE else View.VISIBLE }
                clear.visibility = View.INVISIBLE
            }
            container.addView(frame); container.addView(error)
        }
        fun showError(message: String?) {
            error.text = message.orEmpty(); error.visibility = if (message.isNullOrEmpty()) View.GONE else View.VISIBLE
            frame.background = GradientDrawable().apply { setColor(Color.WHITE); cornerRadius = dp(8).toFloat(); if (!message.isNullOrEmpty()) setStroke(dp(1), orange) }
        }
    }

    fun code(id: Int): CodeInput = CodeInput(id).also { body.addView(it.frame, LinearLayout.LayoutParams(-1, -2)) }
    inner class CodeInput(id: Int) {
        val frame = FrameLayout(activity)
        private val slots = Array(6) { text("", 22f).apply { gravity = Gravity.CENTER; minHeight = dp(46); background = visuals.rounded(Color.WHITE); importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO } }
        val edit = EditText(activity).apply {
            this.id = id; contentDescription = "6位邮箱验证码"; inputType = InputType.TYPE_CLASS_NUMBER; filters = arrayOf(InputFilter.LengthFilter(6), android.text.method.DigitsKeyListener.getInstance("0123456789"))
            isSingleLine = true; isSaveEnabled = false; minHeight = dp(46); setTextColor(Color.TRANSPARENT); setBackgroundColor(Color.TRANSPARENT); isCursorVisible = false
            if (Build.VERSION.SDK_INT >= 26) importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        }
        var invalid = false
            set(value) { field = value; redraw() }
        init {
            val row = LinearLayout(activity).apply { orientation = LinearLayout.HORIZONTAL }
            slots.forEachIndexed { index, view -> row.addView(view, LinearLayout.LayoutParams(0, -2, 1f).apply { if (index > 0) leftMargin = dp(8) }) }
            frame.addView(row, FrameLayout.LayoutParams(-1, -2)); frame.addView(edit, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER_VERTICAL))
            watch(edit) { invalid = false; redraw() }; edit.setOnFocusChangeListener { _, _ -> redraw() }
        }
        private fun redraw() { slots.forEachIndexed { index, view ->
            view.text = edit.text.getOrNull(index)?.toString().orEmpty()
            view.background = GradientDrawable().apply { setColor(Color.WHITE); cornerRadius = dp(8).toFloat()
                if (invalid) setStroke(dp(1), orange) else if (edit.hasFocus() && index == edit.text.length.coerceAtMost(5)) setStroke(dp(1), Color.LTGRAY)
            }
        } }
    }

    companion object {
        fun watch(edit: EditText, changed: () -> Unit) { edit.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = changed()
            override fun afterTextChanged(value: Editable?) = Unit
        }) }
        fun validEmail(value: String) = value.trim().matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
        fun validPassword(value: String, confirmation: String) = runCatching { AccountInput.requirePassword(value, confirmation) }.isSuccess
    }
}

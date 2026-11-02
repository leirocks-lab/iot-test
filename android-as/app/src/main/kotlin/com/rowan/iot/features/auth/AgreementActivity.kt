package com.rowan.iot.features.auth

import android.app.Activity
import android.os.Bundle
import android.os.SystemClock
import android.graphics.Color
import android.text.Html
import android.view.View
import android.widget.*
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.account.AgreementKind
import com.rowan.iot.domain.account.LegalReadGate
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*

/** Public agreement text only; this activity never loads remote code, files or authenticated pages. */
class AgreementActivity : Activity() {
    private val lifetime = MainScope()
    private val gate = LegalReadGate(60_000, SystemClock::elapsedRealtime)
    private lateinit var body: TextView
    private lateinit var status: TextView
    private lateinit var confirm: Button
    private var loading: Job? = null
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val kind = intent.getStringExtra("kind")?.let { value -> AgreementKind.entries.find { it.name == value } }
        if (kind == null) { finish(); return }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(32), dp(20), dp(24)); setBackgroundColor(Color.rgb(242,242,242))
            fitsSystemWindows = true
        }
        root.addView(Button(this).apply { text = "返回"; setOnClickListener { finish() } })
        root.addView(TextView(this).apply { text = kind.title; textSize = 24f; setTextColor(Color.BLACK) })
        status = TextView(this).apply { id = R.id.agreement_status; accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        root.addView(status)
        body = TextView(this).apply { textSize = 16f; setTextColor(Color.BLACK); setTextIsSelectable(true) }
        val scroll = ScrollView(this).apply { addView(body) }
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(Button(this).apply { id = R.id.agreement_retry; text = "重新加载"; setOnClickListener { load(kind) } })
        confirm = Button(this).apply {
            id = R.id.agreement_complete; isEnabled = false
            setOnClickListener { if (gate.canComplete) { setResult(RESULT_OK, intent); finish() } }
        }
        root.addView(confirm)
        scroll.setOnScrollChangeListener { _, _, _, _, _ ->
            if (body.height > 0 && scroll.scrollY + scroll.height >= body.bottom) gate.reachBottom()
            update()
        }
        setContentView(root)
        AuthVisuals(this).systemBars(this)
        lifetime.launch { while (isActive) { update(); delay(250) } }
        load(kind)
    }
    private fun update() {
        confirm.isEnabled = gate.canComplete
        confirm.text = when {
            gate.canComplete -> "阅读全文，同意并继续"
            gate.remainingSeconds > 0 -> "阅读全文，同意并继续 ${gate.remainingSeconds}s"
            else -> "请滚动至协议底部"
        }
    }
    private fun load(kind: AgreementKind) {
        loading?.cancel(); gate.reset(); body.text = ""; status.text = "正在加载…"; update()
        loading = lifetime.launch {
            try {
                val content = (application as MainApplication).services.agreements.load(kind, intent.getStringExtra("regionCode"))
                // Render formatting without executing scripts, loading images or enabling links.
                body.text = Html.fromHtml(content, Html.FROM_HTML_MODE_LEGACY).toString()
                gate.contentLoaded(); status.text = "请阅读并滚动至底部"
                body.post {
                    val scroll = body.parent as ScrollView
                    if (body.height > 0 && body.bottom <= scroll.height) gate.reachBottom()
                    update()
                }
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) { status.text = (error as? ApiFailure)?.message ?: "协议加载失败，请重试" }
        }
    }
    override fun onResume() { super.onResume(); gate.setVisible(true) }
    override fun onPause() { gate.setVisible(false); super.onPause() }
    override fun onDestroy() { lifetime.cancel(); super.onDestroy() }
}

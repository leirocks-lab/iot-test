package com.rowan.iot.features.auth

import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.*
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.account.AgreementKind
import com.rowan.iot.domain.account.RegistrationService
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.navigation.NativeNavigation
import kotlinx.coroutines.*
import java.util.Locale

/** Credentials design plus the V1.4-required captcha step. Reading is never inferred locally. */
class RegistrationActivity : ComponentActivity() {
    private val lifetime = MainScope()
    private lateinit var flow: RegistrationService
    private lateinit var ui: AuthFlowLayout
    private lateinit var status: TextView
    private var updateUI: () -> Unit = {}
    private var ticker: Job? = null
    private var generation = 0
    private var codeStep = false
    private var busy = false
    private var emailValue = ""
    private var passwordValue = ""
    private var confirmationValue = ""
    private var agreed = false
    private var mutationUnknown = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true) {
            override fun handleOnBackPressed()=back()
        })
        flow = (application as MainApplication).services.newRegistration()
        detailsPage()
    }
    private fun newPage(title: String) { ticker?.cancel(); generation++; ui = AuthFlowLayout(this, title) { back() } }

    private fun detailsPage() {
        codeStep = false; newPage(""); ui.heading("注册")
        val region = Button(this).apply {
            id = R.id.registration_region; textSize = 16f; isAllCaps = false; gravity = Gravity.CENTER_VERTICAL
            text = flow.regionCode?.let { Locale.Builder().setRegion(it).build().getDisplayCountry(Locale.SIMPLIFIED_CHINESE) } ?: "请选择国家或地区"
            setTextColor(Color.BLACK); backgroundTintList = null; background = ui.visuals.rounded(Color.WHITE); minHeight = ui.dp(46)
            setPadding(ui.dp(16), ui.dp(10), ui.dp(12), ui.dp(10))
            setCompoundDrawablesWithIntrinsicBounds(ui.visuals.icon(R.drawable.auth_flow_globe, 24), null, ui.visuals.icon(R.drawable.auth_flow_chevron, 24), null)
            compoundDrawablePadding = ui.dp(8); setOnClickListener { if (!busy) chooseRegion() }
        }
        ui.body.addView(region, LinearLayout.LayoutParams(-1, -2)); ui.gap(16)
        val email = ui.field("请输入您的邮箱", R.id.registration_email).also { it.edit.setText(emailValue) }; ui.gap(16)
        val password = ui.field("请设置您的密码", R.id.registration_password, true).also { it.edit.setText(passwordValue) }; ui.gap(16)
        val confirmation = ui.field("请再次确认密码", R.id.registration_confirmation, true).also { it.edit.setText(confirmationValue) }; ui.gap(40)
        val legal = ui.legalRow()
        val consent = CheckBox(this).apply {
            id = R.id.registration_consent; contentDescription = "同意已阅读的隐私政策和用户协议"; buttonDrawable = ui.visuals.agreementIndicator()
            minWidth = ui.dp(32); minHeight = ui.dp(44); isChecked = agreed; setPadding(ui.dp(8), 0, ui.dp(8), 0)
        }
        legal.addView(consent)
        legal.addView(ui.text("阅读并同意 ", 14f))
        for (kind in AgreementKind.entries) {
            if (!kind.title.contains("隐私")) legal.addView(ui.text(" 与 ", 14f))
            legal.addView(ui.text(kind.title, 14f).apply {
                id = if (kind.title.contains("隐私")) R.id.registration_privacy else R.id.registration_terms
                setTextColor(ui.blue); minHeight = ui.dp(44); gravity = Gravity.CENTER; isClickable = true; isFocusable = true
                setOnClickListener { if (!busy) openAgreement(kind) }
            })
        }
        val next = ui.button("注册", R.id.registration_continue) {
            emailValue = email.edit.text.toString().trim(); passwordValue = password.edit.text.toString(); confirmationValue = confirmation.edit.text.toString()
            flow.setInput(emailValue, "")
            operation("正在发送验证码…", { flow.send() }) { mutationUnknown = false; codePage("验证码已发送，请查收邮箱") }
        }
        status = ui.status(R.id.registration_status)
        status.text = when {
            flow.canConsent -> "请勾选同意两份协议"
            flow.regionCode == null -> "请选择地区，并分别阅读隐私政策和用户协议"
            else -> "请分别阅读隐私政策和用户协议"
        }
        consent.setOnCheckedChangeListener { _, checked ->
            if (checked && !flow.canConsent) { consent.isChecked = false; return@setOnCheckedChangeListener }
            agreed = checked; flow.setConsent(checked); updateUI()
        }
        updateUI = {
            val validEmail = AuthFlowLayout.validEmail(email.edit.text.toString())
            val validPassword = AuthFlowLayout.validPassword(password.edit.text.toString(), confirmation.edit.text.toString())
            listOf(email, password, confirmation).forEach { it.edit.isEnabled = !busy }
            region.isEnabled = !busy; consent.isEnabled = !busy && flow.canConsent
            if (!flow.canConsent && consent.isChecked) consent.isChecked = false
            ui.setActionEnabled(next, !busy && validEmail && validPassword && flow.regionCode != null && agreed && flow.canConsent && flow.cooldownSeconds == 0)
            next.text = if (flow.cooldownSeconds > 0) "${flow.cooldownSeconds}s 后可发送" else "注册"
        }
        val changed = {
            emailValue = email.edit.text.toString().trim(); passwordValue = password.edit.text.toString(); confirmationValue = confirmation.edit.text.toString()
            flow.setInput(emailValue, "")
            email.showError(if (emailValue.isNotEmpty() && !AuthFlowLayout.validEmail(emailValue)) "请输入正确的邮箱格式" else null)
            password.showError(if (passwordValue.isNotEmpty() && !AuthFlowLayout.validPassword(passwordValue, passwordValue)) "8–12个字符，包含数字和英文" else null)
            confirmation.showError(if (confirmationValue.isNotEmpty() && confirmationValue != passwordValue) "两次输入的密码不一致" else null)
            updateUI()
        }
        listOf(email, password, confirmation).forEach { AuthFlowLayout.watch(it.edit, changed) }
        startTicker(); updateUI()
    }

    private fun codePage(message: String) {
        codeStep = true; newPage("邮箱验证"); ui.hero(R.drawable.auth_flow_envelope)
        ui.centered("验证码已发送到您的邮箱"); ui.centered(emailValue).setTextColor(ui.blue); ui.centered("请输入验证码进行验证"); ui.gap(40)
        val code = ui.code(R.id.registration_code); flow.setInput(emailValue, ""); ui.gap(40)
        val submit = ui.button("确认", R.id.registration_submit) {
            var submitting = false
            operation("正在校验验证码…", { flow.verify(); submitting = true; flow.submit(passwordValue, confirmationValue) }, { error ->
                code.invalid = true
                if (submitting) { mutationUnknown = true; status.text = "注册结果未确认，请返回登录尝试；不会自动重复注册" }
                else status.text = (error as? ApiFailure)?.message ?: "验证码校验未完成，请核对或重新发送"
            }) { passwordValue = ""; confirmationValue = ""; code.edit.text.clear(); NativeNavigation.home(this) }
        }
        val resend = ui.link("没收到验证码？重新发送", R.id.registration_send) {
            operation("正在发送验证码…", { flow.send() }) { mutationUnknown = false; code.edit.text.clear(); status.text = "验证码已发送，请查收邮箱" }
        }
        status = ui.status(R.id.registration_status); status.text = message
        ui.link("返回登录", R.id.registration_return_login) { if (!busy) finish() }
        updateUI = {
            code.edit.isEnabled = !busy && !mutationUnknown
            ui.setActionEnabled(submit, !busy && !mutationUnknown && !code.invalid && code.edit.text.toString().matches(Regex("[0-9]{6}")))
            submit.text = if (busy) "处理中…" else "确认"
            resend.isEnabled = !busy && flow.cooldownSeconds == 0; resend.setTextColor(if (resend.isEnabled) ui.blue else Color.GRAY)
            resend.text = if (flow.cooldownSeconds > 0) "没收到验证码？ ${flow.cooldownSeconds}s 重新发送" else "没收到验证码？ 重新发送"
        }
        AuthFlowLayout.watch(code.edit) { flow.setInput(emailValue, code.edit.text.toString()); updateUI() }
        startTicker(); updateUI()
    }

    private fun operation(label: String, work: suspend () -> Unit, failure: ((Exception) -> Unit)? = null, success: () -> Unit) {
        if (busy) return
        val expected = generation; busy = true; status.text = label; updateUI()
        lifetime.launch {
            try { work(); if (generation == expected) success() }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) { if (generation == expected) { if (failure != null) failure(error) else status.text = (error as? ApiFailure)?.message ?: "发送结果未确认，请等待倒计时后再操作" } }
            finally { busy = false; if (!isDestroyed) updateUI() }
        }
    }
    private fun startTicker() { val expected = generation; ticker = lifetime.launch { while (isActive && generation == expected) { updateUI(); delay(1000) } } }
    @Suppress("DEPRECATION")
    private fun chooseRegion() { startActivityForResult(Intent(this, RegionSelectionActivity::class.java).putExtra("regionCode", flow.regionCode), 701) }
    @Suppress("DEPRECATION")
    private fun openAgreement(kind: AgreementKind) {
        val region = flow.regionCode
        if (region == null) { status.text = "请先选择国家或地区"; return }
        startActivityForResult(Intent(this, AgreementActivity::class.java).putExtra("kind", kind.name).putExtra("regionCode", region).putExtra("regionRevision", flow.regionRevision), 700)
    }
    @Deprecated("Native Activity result route; retained until navigation contract migration")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != RESULT_OK || data == null || busy || codeStep) return
        if (requestCode == 701) {
            val selected = data.getStringExtra("regionCode") ?: return
            if (selected !in Locale.getISOCountries()) return
            if (selected != flow.regionCode) { flow.selectRegion(selected); agreed = false; mutationUnknown = false }
            detailsPage()
        } else if (requestCode == 700) {
            val kind = AgreementKind.entries.find { it.name == data.getStringExtra("kind") } ?: return
            flow.markRead(kind, data.getStringExtra("regionCode").orEmpty(), data.getLongExtra("regionRevision", -1))
            status.text = if (flow.canConsent) "协议阅读完成，请勾选同意" else "请继续阅读另一份协议"; updateUI()
        }
    }
    private fun back() { if (!busy) { if (codeStep && !mutationUnknown) detailsPage() else finish() } }
    override fun onDestroy() { passwordValue = ""; confirmationValue = ""; lifetime.cancel(); super.onDestroy() }
}

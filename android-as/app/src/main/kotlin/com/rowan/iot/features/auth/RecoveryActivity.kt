package com.rowan.iot.features.auth

import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import android.graphics.Color
import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.account.LocalSessionCleanupFailure
import com.rowan.iot.domain.account.RecoveryService
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*

/** Email -> explicit send -> six-digit verification -> new password; all requests belong to native services. */
class RecoveryActivity : ComponentActivity() {
    private enum class Step { EMAIL, CODE, PASSWORD }
    private val lifetime = MainScope()
    private val services get() = (application as MainApplication).services
    private lateinit var recovery: RecoveryService
    private lateinit var ui: AuthFlowLayout
    private lateinit var status: TextView
    private var updateUI: () -> Unit = {}
    private var ticker: Job? = null
    private var generation = 0
    private var step = Step.EMAIL
    private var busy = false
    private var emailValue = ""
    private var serverResetDone = false
    private var resetUnknown = false
    private var expectedSession = -1L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true) {
            override fun handleOnBackPressed()=back()
        })
        recovery = services.newRecovery(); emailPage()
    }
    private fun page(title: String) { ticker?.cancel(); generation++; ui = AuthFlowLayout(this, title) { back() } }

    private fun emailPage() {
        step = Step.EMAIL; page("找回密码"); ui.hero(R.drawable.auth_flow_recovery_lock)
        ui.centered("通过邮箱找回", 16f).setTypeface(null, android.graphics.Typeface.BOLD); ui.gap(16)
        val email = ui.field("请输入您的邮箱账号", R.id.recovery_email).also { it.edit.setText(emailValue) }
        recovery.setInput(emailValue, ""); ui.gap(40)
        val next = ui.button("下一步", R.id.recovery_send) {
            emailValue = email.edit.text.toString().trim(); recovery.setInput(emailValue, "")
            operation("正在发送验证码…", { recovery.send() }) { codePage("验证码已发送，请查收邮箱") }
        }
        status = ui.status(R.id.recovery_status)
        ui.gap(32); ui.link("返回登录", R.id.recovery_return_login) { if (!busy) finish() }
        updateUI = {
            email.edit.isEnabled = !busy
            ui.setActionEnabled(next, !busy && AuthFlowLayout.validEmail(email.edit.text.toString()) && recovery.cooldownSeconds == 0)
            next.text = if (recovery.cooldownSeconds > 0) "${recovery.cooldownSeconds}s 后可发送" else "下一步"
        }
        AuthFlowLayout.watch(email.edit) {
            emailValue = email.edit.text.toString().trim(); recovery.setInput(emailValue, "")
            email.showError(if (emailValue.isNotEmpty() && !AuthFlowLayout.validEmail(emailValue)) "请输入正确的邮箱格式" else null); updateUI()
        }
        startTicker(); updateUI()
    }

    private fun codePage(message: String) {
        step = Step.CODE; page("邮箱验证"); ui.hero(R.drawable.auth_flow_envelope)
        ui.centered("验证码已发送到您的邮箱"); ui.centered(emailValue).setTextColor(ui.blue); ui.centered("请输入验证码进行验证"); ui.gap(40)
        val code = ui.code(R.id.recovery_code); recovery.setInput(emailValue, ""); ui.gap(40)
        val verify = ui.button("确认", R.id.recovery_verify) {
            operation("正在校验验证码…", { recovery.verify() }, { error -> code.invalid = true; status.text = (error as? ApiFailure)?.message ?: "验证码校验未完成，请核对或重新发送" }) {
                serverResetDone = false; resetUnknown = false; expectedSession = services.account.revision; passwordPage()
            }
        }
        val resend = ui.link("没收到验证码？重新发送", R.id.recovery_send) {
            operation("正在发送验证码…", { recovery.send() }) { code.edit.text.clear(); status.text = "验证码已发送，请查收邮箱" }
        }
        status = ui.status(R.id.recovery_status); status.text = message
        updateUI = {
            code.edit.isEnabled = !busy; ui.setActionEnabled(verify, !busy && !code.invalid && code.edit.text.toString().matches(Regex("[0-9]{6}")))
            verify.text = if (busy) "处理中…" else "确认"
            resend.isEnabled = !busy && recovery.cooldownSeconds == 0; resend.setTextColor(if (resend.isEnabled) ui.blue else Color.GRAY)
            resend.text = if (recovery.cooldownSeconds > 0) "没收到验证码？ ${recovery.cooldownSeconds}s 重新发送" else "没收到验证码？ 重新发送"
        }
        AuthFlowLayout.watch(code.edit) { recovery.setInput(emailValue, code.edit.text.toString()); updateUI() }
        startTicker(); updateUI()
    }

    private fun passwordPage() {
        step = Step.PASSWORD; page("找回密码"); ui.hero(R.drawable.auth_flow_recovery_lock)
        ui.centered("请输入新的密码", 16f).setTypeface(null, android.graphics.Typeface.BOLD); ui.gap(16)
        val password = ui.field("请设置您的密码", R.id.recovery_password, true); ui.gap(16)
        val confirmation = ui.field("请再次确认密码", R.id.recovery_confirmation, true); ui.gap(40)
        val submit = ui.button("确定", R.id.recovery_submit) {
            val entered = password.edit.text.toString(); val repeated = confirmation.edit.text.toString()
            operation(if (serverResetDone) "正在完成本地会话清理…" else "正在重置密码…", {
                // This flag is set before cleanup. A local storage failure must never
                // replay PATCH /user/password, even if the button is clicked again.
                if (!serverResetDone) {
                    recovery.reset(entered, repeated); serverResetDone = true
                    password.edit.text.clear(); confirmation.edit.text.clear()
                }
                services.account.clearLocal(expectedSession)
            }, { error ->
                if (error is LocalSessionCleanupFailure) expectedSession = error.cleanupRevision
                if (serverResetDone) status.text = "密码已重置，本地会话清理未完成，请点击完成清理；不会重复重置密码"
                else { resetUnknown = true; status.text = (error as? ApiFailure)?.message?.let { "$it；请重新校验验证码后再操作" }
                    ?: "重置结果未确认，请先尝试新密码登录；如需重试，请重新校验验证码" }
            }) {
                Toast.makeText(this, "新密码设置成功", Toast.LENGTH_LONG).show(); finish()
            }
        }
        val reverify = ui.link("重新校验验证码", R.id.recovery_reverify) { if (!busy && !serverResetDone) codePage("请重新输入有效验证码；如需新验证码，请点击重新发送") }
        status = ui.status(R.id.recovery_status)
        ui.gap(24)
        val login = ui.link("返回登录", R.id.recovery_return_login) { if (!busy && !serverResetDone) finish() }
        updateUI = {
            password.edit.isEnabled = !busy && !serverResetDone && !resetUnknown
            confirmation.edit.isEnabled = !busy && !serverResetDone && !resetUnknown
            ui.setActionEnabled(submit, !busy && (serverResetDone || !resetUnknown && AuthFlowLayout.validPassword(password.edit.text.toString(), confirmation.edit.text.toString())))
            submit.text = if (serverResetDone) "完成本地会话清理" else "确定"
            reverify.isEnabled = !busy && !serverResetDone; login.isEnabled = !busy && !serverResetDone
        }
        val changed = {
            val entered = password.edit.text.toString(); val repeated = confirmation.edit.text.toString()
            password.showError(if (entered.isNotEmpty() && !AuthFlowLayout.validPassword(entered, entered)) "8–12个字符，包含数字和英文" else null)
            confirmation.showError(if (repeated.isNotEmpty() && entered != repeated) "两次输入的密码不一致" else null); updateUI()
        }
        AuthFlowLayout.watch(password.edit, changed); AuthFlowLayout.watch(confirmation.edit, changed); updateUI()
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
    private fun back() {
        if (busy) return
        if (serverResetDone) { status.text = "密码已重置，请先完成本地会话清理"; return }
        when (step) { Step.EMAIL -> finish(); Step.CODE -> emailPage(); Step.PASSWORD -> if (resetUnknown) finish() else codePage("请重新输入验证码") }
    }
    override fun onDestroy() { lifetime.cancel(); super.onDestroy() }
}

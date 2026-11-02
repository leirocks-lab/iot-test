package com.rowan.iot.features.mine

import android.app.AlertDialog
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.features.preferences.PreferencePageViews
import com.rowan.iot.features.preferences.PreferencesActivity
import com.rowan.iot.navigation.NativeNavigation
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect

/** S035: only frozen preferences and logout entries. No invented profile or menus. */
class MineActivity : ComponentActivity() {
    private val lifetime=MainScope()
    private val services get()=(application as MainApplication).services
    private var revision=-1L
    private var loggingOut=false
    private var unconfirmedLogout=false
    private var notice=""
    private var dialog:AlertDialog?=null

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        revision=intent.getLongExtra(PreferencesActivity.EXTRA_ACCOUNT_REVISION,-1)
        if(!current()) {leaveExpired();return}
        unconfirmedLogout=savedInstanceState?.getBoolean("logout_pending")==true
        if(unconfirmedLogout)notice=word("上次退出结果未确认，请返回首页核对登录状态。","上次登出結果未確認，請返回首頁核對登入狀態。","The previous sign-out result is unknown. Return Home to check the session.")
        onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true) {
            override fun handleOnBackPressed()=back()
        })
        lifetime.launch {services.account.contexts.collect {
            if(!loggingOut) {if(!current())leaveExpired() else render()}
        }}
        render()
    }
    private fun current()=services.account.contextSnapshot().let {it.revision==revision&&it.session!=null&&!it.cleanupRequired}
    private fun leaveExpired() {
        dialog?.dismiss()
        val source=services.account.contextSnapshot()
        when {
            source.cleanupRequired -> NativeNavigation.home(this) // Home owns local cleanup; never resend DELETE here.
            source.session==null -> NativeNavigation.welcome(this)
            else -> finish()
        }
    }
    override fun onResume() {super.onResume();if(!current())leaveExpired() else if(!loggingOut)render()}
    private fun word(cn:String,tw:String,en:String)=when(services.account.session?.language) {"en"->en;"zh-TW"->tw;else->cn}
    private fun render() {
        if(!current()) {if(!loggingOut)leaveExpired();return}
        val theme=services.account.session?.settings()?.opt("theme")
        val dark=theme=="dark"||(theme!="light"&&resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK==Configuration.UI_MODE_NIGHT_YES)
        val views=PreferencePageViews(this,dark)
        val root=views.page(word("我的","我的","Mine"),R.id.mine_title,R.id.mine_back,::back)
        root.addView(views.notice(if(loggingOut)word("正在退出…","正在登出…","Signing out…") else notice,R.id.mine_status))
        val card=views.card()
        card.addView(views.row(word("设置","設定","Preferences"),"›",R.id.mine_preferences,!loggingOut) {
            if(current())startActivity(Intent(this,PreferencesActivity::class.java).putExtra(PreferencesActivity.EXTRA_ACCOUNT_REVISION,revision))
        })
        card.addView(views.row(word("退出登录","登出","Sign out"),"›",R.id.mine_logout,!loggingOut&&!unconfirmedLogout) {confirmLogout()})
        root.addView(card,LinearLayout.LayoutParams(-1,-2))
        if(unconfirmedLogout)root.addView(views.notice(word("请使用返回入口回到首页；不会自动重复退出请求。","請使用返回入口回到首頁；不會自動重複登出請求。","Use Back to return Home. The sign-out request will not be repeated automatically.")))
        setContentView(root)
    }
    private fun confirmLogout() {
        if(!current()||loggingOut||unconfirmedLogout)return
        dialog=AlertDialog.Builder(this).setTitle(word("退出登录","登出","Sign out"))
            .setMessage(word("确认退出此账号吗？","確認登出此帳號嗎？","Sign out of this account?"))
            .setNegativeButton(word("取消","取消","Cancel"),null)
            .setPositiveButton(word("退出","登出","Sign out")) {_,_->logout()}.create().also {it.show()}
    }
    private fun logout() {
        if(!current()||loggingOut||unconfirmedLogout)return
        dialog=null;loggingOut=true;render()
        lifetime.launch {
            try {
                services.account.logout(revision)
                leaveExpired()
            }catch(error:CancellationException) {throw error}
            catch(error:Exception) {
                if(!current())leaveExpired()
                else {
                    unconfirmedLogout=error !is ApiFailure||error.code>=500||error.code==408
                    notice=if(unconfirmedLogout)word("退出结果未确认，请返回首页核对登录状态。","登出結果未確認，請返回首頁核對登入狀態。","Sign-out result is unknown. Return Home to check the session.")
                    else word("退出失败，请重试。","登出失敗，請重試。","Sign-out failed. Try again.")
                }
            }finally {loggingOut=false;if(!isFinishing&&current())render()}
        }
    }
    private fun back() {
        if(loggingOut)return
        if(unconfirmedLogout)NativeNavigation.home(this) else finish()
    }
    override fun onSaveInstanceState(outState:Bundle) {
        outState.putBoolean("logout_pending",loggingOut||unconfirmedLogout)
        super.onSaveInstanceState(outState)
    }
    override fun onDestroy() {dialog?.dismiss();lifetime.cancel();super.onDestroy()}
}

package com.rowan.iot.features.auth

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Build
import android.graphics.Color
import android.view.Gravity
import android.view.WindowInsets
import android.widget.*
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.navigation.NativeNavigation
import kotlinx.coroutines.*

class WelcomeActivity:Activity() {
    private val lifetime=MainScope()
    private val services get()=(application as MainApplication).services
    private fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    override fun onResume() {
        super.onResume()
        if(services.account.pendingLogoutCleanupRevision!=null)NativeNavigation.home(this)
    }
    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        setTheme(R.style.AppTheme)
        showRestoring()
        if(Build.VERSION.SDK_INT>=30) window.setDecorFitsSystemWindows(false)
        restore(false)
    }
    private fun logo(resource:Int)=ImageView(this).apply {
        setImageResource(resource);scaleType=ImageView.ScaleType.FIT_CENTER;contentDescription="ANTARCTIC STAR"
    }
    private fun showRestoring() {
        val frame=FrameLayout(this).apply {setBackgroundColor(Color.rgb(24,109,175))}
        frame.addView(logo(R.drawable.startup_logo),FrameLayout.LayoutParams(dp(150),dp(84),Gravity.CENTER).apply {bottomMargin=dp(78)})
        frame.addView(TextView(this).apply {id=R.id.startup_status;text="正在恢复会话…";setTextColor(Color.WHITE);gravity=Gravity.CENTER},
            FrameLayout.LayoutParams(-1,dp(48),Gravity.CENTER).apply {topMargin=dp(100)})
        setContentView(frame)
        if(Build.VERSION.SDK_INT>=30) window.decorView.windowInsetsController?.setSystemBarsAppearance(0,android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
    }
    private fun restore(retry:Boolean) {
        lifetime.launch {
            try {
                services.startup.restore(retry)
                if(services.account.session!=null||services.account.pendingLogoutCleanupRevision!=null) NativeNavigation.home(this@WelcomeActivity) else showEntry(null)
            } catch(error:CancellationException) {throw error}
            catch(_:Exception) {
                if(services.account.pendingLogoutCleanupRevision!=null)NativeNavigation.home(this@WelcomeActivity)
                else showEntry("无法恢复登录，可重试或使用账号登录")
            }
        }
    }
    private fun showEntry(error:String?) {
        val root=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setBackgroundColor(Color.rgb(242,242,242))}
        val top=FrameLayout(this).apply {setBackgroundColor(Color.rgb(244,245,246))}
        top.addView(logo(R.drawable.welcome_logo),FrameLayout.LayoutParams(dp(150),dp(84),Gravity.CENTER))
        root.addView(top,LinearLayout.LayoutParams(-1,dp(375)))
        val width=resources.displayMetrics.widthPixels/resources.displayMetrics.density
        val gutter=minOf(47,maxOf(16,((width-280)/2).toInt()))
        val actions=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setPadding(dp(gutter),dp(40),dp(gutter),dp(32))}
        root.addView(actions)
        fun action(title:String,viewID:Int,primary:Boolean,click:()->Unit) {
            val button=Button(this).apply {
                id=viewID;text=title;isAllCaps=false;textSize=16f
                background=AuthVisuals(this@WelcomeActivity).rounded(if(primary) Color.BLACK else Color.WHITE)
                setTextColor(if(primary) Color.WHITE else Color.rgb(51,44,43));setPadding(0,0,0,0);stateListAnimator=null
                setOnClickListener {
                    if(services.account.pendingLogoutCleanupRevision!=null)NativeNavigation.home(this@WelcomeActivity)
                    else click()
                }
            }
            actions.addView(button,LinearLayout.LayoutParams(-1,dp(46)).apply {bottomMargin=dp(16)})
        }
        action("登录",R.id.welcome_login,true) {startActivity(Intent(this,AccountActivity::class.java))}
        action("注册",R.id.welcome_register,false) {startActivity(Intent(this,RegistrationActivity::class.java))}
        if(error!=null) {
            actions.addView(TextView(this).apply {text=error;setTextColor(Color.rgb(180,30,30))})
            action("重试恢复",R.id.startup_retry,false) {showRestoring();restore(true)}
        }
        val scroll=ScrollView(this).apply {isFillViewport=true;setBackgroundColor(Color.rgb(244,245,246));addView(root)}
        if(Build.VERSION.SDK_INT>=30) scroll.setOnApplyWindowInsetsListener {view,insets->
            val bars=insets.getInsets(WindowInsets.Type.systemBars());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);insets
        }
        setContentView(scroll);AuthVisuals(this).systemBars(this)
    }
    override fun onDestroy() {lifetime.cancel();super.onDestroy()}
}

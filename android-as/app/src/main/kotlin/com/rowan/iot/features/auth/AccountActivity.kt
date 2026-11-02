package com.rowan.iot.features.auth

import android.app.Activity
import android.os.Bundle
import android.os.Build
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.text.Editable
import android.text.TextWatcher
import android.text.method.PasswordTransformationMethod
import android.text.method.HideReturnsTransformationMethod
import android.text.method.LinkMovementMethod
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.ClickableSpan
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.*
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*

/** Native account entry. The RN runtime is never required to log in. */
class AccountActivity : Activity() {
    private val lifetime = MainScope()
    private val account get() = (application as MainApplication).services.account
    private val visuals by lazy { AuthVisuals(this) }
    private var pageGeneration = 0L
    private var showingHome = false
    private var nativeResumed=false
    private var loginModel:com.rowan.iot.domain.account.EmailLoginService?=null
    private var loginJob:Job?=null
    private var countdown:Job?=null
    private var renderLogin:(()->Unit)?=null
    private var clearSecrets:(()->Unit)?=null
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if(account.session!=null) {homePage();return}
        loginPage()
        if (Build.VERSION.SDK_INT >= 30) window.setDecorFitsSystemWindows(false)
        visuals.systemBars(this)
    }
    override fun onStop() {
        nativeResumed=false;loginModel?.pause();loginJob?.cancel();countdown?.cancel();clearSecrets?.invoke();super.onStop()
    }
    override fun onDestroy() { lifetime.cancel();renderLogin=null;clearSecrets=null; super.onDestroy() }
    override fun onResume() {
        super.onResume();nativeResumed=true
        if(account.pendingLogoutCleanupRevision!=null) {com.rowan.iot.navigation.NativeNavigation.home(this);return}
        if(account.session!=null&&!showingHome) homePage()
        if(showingHome)return
        loginModel?.resume();renderLogin?.invoke();countdown?.cancel()
        countdown=lifetime.launch {while(isActive&&nativeResumed) {renderLogin?.invoke();delay(1000)}}
    }

    private fun background(color: Int) = GradientDrawable().apply { setColor(color); cornerRadius = dp(8).toFloat() }
    private fun page() {
        pageGeneration++
        val scroll = ScrollView(this).apply { isFillViewport = true; setBackgroundColor(Color.rgb(242, 242, 242)) }
        if (Build.VERSION.SDK_INT >= 30) {
            scroll.setOnApplyWindowInsetsListener { view, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, insets.getInsets(WindowInsets.Type.ime()).bottom))
                insets
            }
        }
        val width = resources.displayMetrics.widthPixels / resources.displayMetrics.density
        val gutter = minOf(47, maxOf(16, ((width - 280) / 2).toInt()))
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            clipToPadding = false; clipChildren = false
            setPadding(dp(gutter), 0, dp(if (width >= 375) gutter + 1 else gutter), dp(32))
        }
        scroll.addView(content)
        setContentView(scroll)
    }
    private fun text(value: String, size: Float = 16f) = TextView(this).apply { text = value; textSize = size; setTextColor(Color.BLACK) }
    private fun gap(size: Int) { content.addView(View(this), LinearLayout.LayoutParams(1, dp(size))) }
    private fun button(title: String, action: () -> Unit) = Button(this).apply {
        text = title; isAllCaps = false; setOnClickListener { action() }
        content.addView(this, LinearLayout.LayoutParams(-1, dp(48)))
    }
    private fun message(error: Throwable) {
        // Class names only: exception messages and bodies can contain credentials.
        android.util.Log.e("RowanFlow", "failureCategory=" + error.javaClass.simpleName)
        status.text = if (error is ApiFailure) error.message else "网络或服务异常，请重试"
    }
    private fun loginPage() {
        showingHome=false
        page()
        val model=(application as MainApplication).services.newLogin();loginModel=model
        val generation=pageGeneration
        val back = ImageButton(this).apply {
            setImageDrawable(visuals.icon(R.drawable.auth_back, 28))
            imageTintList = android.content.res.ColorStateList.valueOf(Color.BLACK)
            setBackgroundColor(Color.TRANSPARENT); setPadding(dp(8), dp(8), dp(8), dp(8))
            contentDescription = "返回"; setOnClickListener { finish() }
        }
        content.addView(back, LinearLayout.LayoutParams(dp(44), dp(44)).apply { leftMargin = dp(14)-content.paddingLeft })
        gap(37)
        content.addView(text("登录", 32f))
        gap(38)
        val email = EditText(this).apply {
            id = R.id.account_email
            hint = "请输入您的邮箱账号"; textSize = 16f; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            isSingleLine = true; setPadding(dp(16), 0, dp(16), 0); background = background(Color.WHITE)
            setHintTextColor(Color.rgb(153, 153, 153))
            val icon = visuals.icon(R.drawable.auth_email, 24).apply { setBounds(0, 0, dp(24), dp(24)) }
            setCompoundDrawables(icon, null, null, null); compoundDrawablePadding = dp(8)
            if (Build.VERSION.SDK_INT >= 26) {
                importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_YES; setAutofillHints(View.AUTOFILL_HINT_EMAIL_ADDRESS)
            }
        }
        content.addView(email, LinearLayout.LayoutParams(-1, dp(46)))
        gap(16)
        val password = EditText(this).apply {
            id = R.id.account_password
            hint = "请输入您的密码"; textSize = 16f; isSingleLine = true
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setPadding(dp(48), 0, dp(46), 0); background = visuals.passwordBackground(false)
            typeface = Typeface.DEFAULT; setHintTextColor(Color.rgb(153, 153, 153)); isSaveEnabled = false
            if (Build.VERSION.SDK_INT >= 26) {
                importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_YES; setAutofillHints(View.AUTOFILL_HINT_PASSWORD)
            }
        }
        val passwordFrame = FrameLayout(this)
        passwordFrame.addView(password, FrameLayout.LayoutParams(-1, -1))
        var visible = false
        val visibility = ImageButton(this).apply {
            setBackgroundColor(Color.TRANSPARENT); contentDescription = "显示密码"
            setOnClickListener {
                visible = !visible
                password.transformationMethod = if (visible) HideReturnsTransformationMethod.getInstance() else PasswordTransformationMethod.getInstance()
                password.typeface = Typeface.DEFAULT; password.background = visuals.passwordBackground(visible)
                password.setSelection(password.text.length)
                contentDescription = if (visible) "隐藏密码" else "显示密码"
            }
        }
        passwordFrame.addView(visibility, FrameLayout.LayoutParams(dp(46), -1, Gravity.END))
        content.addView(passwordFrame, LinearLayout.LayoutParams(-1, dp(46)))
        val codeRow=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL;this.visibility=View.GONE}
        val code=EditText(this).apply {
            id=R.id.account_code;hint="请输入6位验证码";textSize=16f;isSingleLine=true;isSaveEnabled=false
            inputType=InputType.TYPE_CLASS_NUMBER;setPadding(dp(16),0,dp(12),0);background=visuals.rounded(Color.WHITE)
            setHintTextColor(Color.rgb(153,153,153))
        }
        val send=Button(this).apply {
            id=R.id.account_send_code;isAllCaps=false;textSize=14f
            setTextColor(android.content.res.ColorStateList(
                arrayOf(intArrayOf(android.R.attr.state_enabled),intArrayOf()),
                intArrayOf(Color.rgb(24,109,175),Color.rgb(153,153,153))))
            setBackgroundColor(Color.TRANSPARENT)
        }
        codeRow.addView(code,LinearLayout.LayoutParams(0,dp(46),1f));codeRow.addView(send,LinearLayout.LayoutParams(dp(104),dp(46)))
        content.addView(codeRow,LinearLayout.LayoutParams(-1,dp(46)))

        gap(52)
        val consent = CheckBox(this).apply {
            id = R.id.account_consent; textSize = 14f
            text = SpannableString("阅读并同意 隐私政策 与用户协议").apply {
                for (link in listOf("隐私政策", "用户协议")) {
                    val start = indexOf(link)
                    setSpan(ForegroundColorSpan(Color.rgb(24, 109, 175)), start, start + link.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    setSpan(object : ClickableSpan() {
                        override fun onClick(view: View) {
                            val kind = if (link == "隐私政策") com.rowan.iot.domain.account.AgreementKind.PRIVACY else com.rowan.iot.domain.account.AgreementKind.TERMS
                            startActivity(android.content.Intent(this@AccountActivity, AgreementActivity::class.java).putExtra("kind", kind.name))
                        }
                        override fun updateDrawState(paint: android.text.TextPaint) { paint.color = Color.rgb(24,109,175); paint.isUnderlineText = false }
                    }, start, start + link.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
            }
            setTextColor(Color.rgb(35, 25, 22)); minimumHeight = dp(24); setPadding(0, 0, 0, 0)
            buttonTintList = null; buttonDrawable = visuals.agreementIndicator(); compoundDrawablePadding = dp(8)
            movementMethod = LinkMovementMethod.getInstance()
        }
        content.addView(consent, LinearLayout.LayoutParams(minOf(dp(232),resources.displayMetrics.widthPixels-dp(32)), -2).apply { gravity = Gravity.CENTER_HORIZONTAL })
        gap(10)
        val login = button("登录") {}
        login.layoutParams = LinearLayout.LayoutParams(-1, dp(46))
        login.id = R.id.account_submit
        login.isEnabled = false
        status = text("", 14f).apply { id=R.id.account_status;setTextColor(Color.rgb(180,30,30));accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_POLITE }
        gap(12);content.addView(status)
        val mode=button("使用验证码登录") {}.apply {id=R.id.account_mode;setBackgroundColor(Color.TRANSPARENT);setTextColor(Color.rgb(24,109,175))}
        val update = {
            val busy=model.busy
            login.isEnabled=nativeResumed&&model.canSubmit;visuals.action(login,login.isEnabled)
            email.isEnabled=!busy;password.isEnabled=!busy;code.isEnabled=!busy;consent.isEnabled=!busy
            val captcha=model.mode==com.rowan.iot.domain.account.LoginMode.CAPTCHA
            passwordFrame.visibility=if(captcha)View.GONE else View.VISIBLE;codeRow.visibility=if(captcha)View.VISIBLE else View.GONE
            mode.text=if(captcha)"使用密码登录" else "使用验证码登录"
            send.isEnabled=nativeResumed&&model.canSend;send.text=if(model.cooldownSeconds>0)"${model.cooldownSeconds}s后重发" else "获取验证码"
            status.text=if(!model.contextCurrent&&!model.busy&&model.status.isBlank())"登录状态已变化，请返回入口重试" else model.status
        }
        renderLogin=update
        fun watch(field:EditText,changed:()->Unit) {field.addTextChangedListener(object:TextWatcher {
            override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int)=Unit
            override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int) {changed();update()}
            override fun afterTextChanged(value:Editable?)=Unit
        })}
        watch(email) {model.setEmail(email.text.toString());password.text.clear();code.text.clear()}
        watch(password) {model.setPassword(password.text.toString())};watch(code) {model.setCode(code.text.toString())}
        consent.setOnCheckedChangeListener {_,value->model.setConsent(value);update()}
        clearSecrets={password.text.clear();code.text.clear()}
        mode.setOnClickListener {
            model.setMode(if(model.mode==com.rowan.iot.domain.account.LoginMode.PASSWORD)com.rowan.iot.domain.account.LoginMode.CAPTCHA else com.rowan.iot.domain.account.LoginMode.PASSWORD)
            password.text.clear();code.text.clear();visible=false;password.transformationMethod=PasswordTransformationMethod.getInstance()
            password.background=visuals.passwordBackground(false);visibility.contentDescription="显示密码";update()
        }
        fun perform(sending:Boolean) {
            if(model.busy||loginJob?.isActive==true||!nativeResumed||(if(sending)!model.canSend else !model.canSubmit))return
            login.isEnabled=false;send.isEnabled=false
            loginJob=lifetime.launch(start=CoroutineStart.UNDISPATCHED) {
                try {
                    val accepted=if(sending){model.send();false}else model.login()
                    if(nativeResumed&&!isFinishing&&!isDestroyed&&pageGeneration==generation&&accepted) {password.text.clear();code.text.clear();homePage()}
                }catch(error:CancellationException) {throw error}
                catch(_:Exception) {
                    if(nativeResumed&&!isFinishing&&!isDestroyed&&pageGeneration==generation) {
                        if(account.pendingLogoutCleanupRevision!=null)com.rowan.iot.navigation.NativeNavigation.home(this@AccountActivity)
                        else status.text=model.status
                    }
                }finally {if(nativeResumed&&!isFinishing&&!isDestroyed&&pageGeneration==generation)update()}
            }
        }
        login.setOnClickListener {perform(false)};send.setOnClickListener {perform(true)};update()
        gap(24)
        content.addView(View(this), LinearLayout.LayoutParams(1,0,1f))
        val recovery = button("忘记密码") { if(!model.busy&&model.contextCurrent)startActivity(android.content.Intent(this, RecoveryActivity::class.java)) }
        recovery.id = R.id.account_recovery
        recovery.setBackgroundColor(Color.TRANSPARENT); recovery.setTextColor(Color.rgb(24,109,175))
    }

    private fun homePage() {
        showingHome = true
        com.rowan.iot.navigation.NativeNavigation.home(this)
    }
}

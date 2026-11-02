package com.rowan.iot.features.preferences

import android.app.AlertDialog
import android.app.NotificationManager
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.preferences.*
import com.rowan.iot.navigation.NativeNavigation
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import org.json.JSONObject

/** S104..111 only. View lifecycle never replays a settings mutation. */
class PreferencesActivity : ComponentActivity() {
    private val lifetime = MainScope()
    private val services get() = (application as MainApplication).services
    private var revision = -1L
    private lateinit var workflow: PreferencesService
    private var work: Job? = null
    private var dialog: AlertDialog? = null
    private var languagePage = false
    private var saving = false
    private var restoredPending = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        revision = intent.getLongExtra(EXTRA_ACCOUNT_REVISION,-1)
        if (!current()) { leaveExpired(); return }
        workflow = try { services.newPreferences(revision) } catch (_: Exception) { leaveExpired(); return }
        languagePage = savedInstanceState?.getBoolean("language_page") == true
        restoredPending = savedInstanceState?.getBoolean("save_pending") == true
        onBackPressedDispatcher.addCallback(this,object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = back()
        })
        lifetime.launch { services.account.contexts.collect { if(!current())leaveExpired() } }
        lifetime.launch { workflow.state.collect { render(it) } }
        runWork(false) { workflow.load() }
    }
    private fun current() = services.account.contextSnapshot().let {
        it.revision==revision&&it.session!=null&&!it.cleanupRequired
    }
    private fun leaveExpired() {
        dialog?.dismiss(); work?.cancel()
        val current = services.account.contextSnapshot()
        when {
            current.cleanupRequired -> NativeNavigation.home(this)
            current.session == null -> NativeNavigation.welcome(this)
            else -> finish()
        }
    }
    override fun onResume() {
        super.onResume()
        if (::workflow.isInitialized) {
            if(!current())leaveExpired() else render(workflow.state.value)
        }
    }
    private fun text(cn: String, tw: String, en: String): String = when {
        !::workflow.isInitialized -> cn
        workflow.state.value.preferences?.language == PreferenceLanguage.EN -> en
        workflow.state.value.preferences?.language == PreferenceLanguage.ZH_TW -> tw
        else -> cn
    }
    private fun dark(preferences: UserPreferences?) = when(preferences?.theme) {
        PreferenceTheme.DARK -> true
        PreferenceTheme.LIGHT -> false
        else -> resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
    }
    private fun render(state: PreferencesState) {
        if (state.sessionExpired || !current()) { leaveExpired(); return }
        val value = state.preferences
        val views = PreferencePageViews(this,dark(value))
        val root = views.page(if(languagePage)text("语言","語言","Language") else text("设置","設定","Settings"),
            R.id.prefs_title,R.id.prefs_back,::back)
        val message = when {
            state.resultUnknown -> text("保存结果未确认，请重新读取核对；不会自动重复提交。","儲存結果未確認，請重新讀取核對；不會自動重複提交。","Save result is unknown. Reload to check; it will not be resubmitted.")
            state.error != null -> state.error
            state.busy -> if(saving)text("正在保存并读取确认…","正在儲存並讀取確認…","Saving and reading back…") else text("正在读取…","正在讀取…","Loading…")
            restoredPending -> text("已重新读取，请核对上次保存结果。","已重新讀取，請核對上次儲存結果。","Reloaded. Check the previous save result.")
            value != null -> text("已读取当前偏好","已讀取目前偏好","Current preferences loaded")
            else -> text("尚未读取设置","尚未讀取設定","Preferences not loaded")
        }
        val body = LinearLayout(this).apply { orientation=LinearLayout.VERTICAL }
        body.addView(views.notice(message,R.id.prefs_status))
        val enabled = value!=null&&!state.busy&&!state.resultUnknown
        if(languagePage) {
            val card=views.card()
            val languages=listOf(Triple(PreferenceLanguage.ZH_CN,"简体中文",R.id.prefs_language_zh_cn),
                Triple(PreferenceLanguage.ZH_TW,"繁體中文",R.id.prefs_language_zh_tw),Triple(PreferenceLanguage.EN,"English",R.id.prefs_language_en))
            languages.forEach { (language,label,id) -> card.addView(views.row(label,if(value?.language==language)"✓" else "",id,enabled) {
                save(PreferencesPatch(language=language))
            }) }
            body.addView(card)
        } else {
            val unknown=text("未知","未知","Unknown")
            val card=views.card()
            card.addView(views.row(text("语言","語言","Language"),languageName(value?.language)?:unknown,R.id.prefs_language,enabled) {
                languagePage=true;render(workflow.state.value)
            })
            card.addView(views.row(text("主题","主題","Theme"),value?.theme?.let(::themeName)?:unknown,R.id.prefs_theme,enabled) {
                choose(text("主题","主題","Theme"),PreferenceTheme.entries.map(::themeName),value?.theme?.ordinal?:-1) {
                    save(PreferencesPatch(theme=PreferenceTheme.entries[it]))
                }
            })
            card.addView(views.row(text("温度单位","溫度單位","Temperature unit"),value?.temperatureUnit?.let {"°${it.wire}"}?:unknown,
                R.id.prefs_temperature_unit,enabled) {
                choose(text("温度单位","溫度單位","Temperature unit"),listOf("°C","°F"),value?.temperatureUnit?.ordinal?:-1) {
                    save(PreferencesPatch(temperatureUnit=TemperatureUnit.entries[it]))
                }
            })
            card.addView(views.row(text("度量制式","度量制式","Measurement system"),value?.measurementSystem?.let(::measurementName)?:unknown,
                R.id.prefs_measurement_system,enabled) {
                choose(text("度量制式","度量制式","Measurement system"),MeasurementSystem.entries.map(::measurementName),value?.measurementSystem?.ordinal?:-1) {
                    save(PreferencesPatch(measurementSystem=MeasurementSystem.entries[it]))
                }
            })
            card.addView(views.row(text("云端通知偏好","雲端通知偏好","Cloud notification preference"),value?.notification?.let {
                if(it)text("开启","開啟","On") else text("关闭","關閉","Off")
            }?:unknown,R.id.prefs_notification,enabled) {
                choose(text("通知偏好","通知偏好","Notification preference"),listOf(text("开启","開啟","On"),text("关闭","關閉","Off")),
                    value?.notification?.let {if(it)0 else 1}?:-1) { save(PreferencesPatch(notification=it==0)) }
            })
            body.addView(card)
            val allowed=getSystemService(NotificationManager::class.java).areNotificationsEnabled()
            body.addView(views.notice(if(allowed)text("系统通知：已允许","系統通知：已允許","System notifications: allowed")
                else text("系统通知：未允许","系統通知：未允許","System notifications: not allowed")))
            body.addView(views.row(text("系统通知设置","系統通知設定","System notification settings"),"›",R.id.prefs_system_notifications,!state.busy) {
                try {
                    val target=if(android.os.Build.VERSION.SDK_INT>=26)
                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,packageName)
                    else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:$packageName"))
                    startActivity(target)
                }
                catch (_: Exception) {startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:$packageName")))}
            })
            body.addView(views.notice(text("外观选项","外觀選項","Appearance selections")))
            val appearance=views.card()
            appearance.addView(views.row(text("壁纸","桌布","Wallpaper"),wallpaperLabel(value),R.id.prefs_wallpaper,false,null))
            appearance.addView(views.row(text("首页布局","首頁佈局","Home layout"),if(value?.homeLayout!=null)text("已读取当前布局","已讀取目前佈局","Current layout loaded") else unknown,
                R.id.prefs_home_layout,false,null))
            body.addView(appearance)
            body.addView(views.notice(text("暂无可选壁纸和布局，当前仅显示已保存状态。","暫無可選桌布和佈局，目前僅顯示已儲存狀態。","No wallpaper or layout choices are available. Showing the stored state.")))
        }
        root.addView(ScrollView(this).apply {addView(body)},LinearLayout.LayoutParams(-1,0,1f))
        root.addView(Button(this).apply {
            id=R.id.prefs_reload;isAllCaps=false;isEnabled=!state.busy
            this.text=if(state.resultUnknown)this@PreferencesActivity.text("重新读取并核对","重新讀取並核對","Reload and check")
                else this@PreferencesActivity.text("重新读取","重新讀取","Reload")
            setOnClickListener {restoredPending=false;runWork(false) {workflow.load()}}
        },LinearLayout.LayoutParams(-1,views.dp(48)))
        setContentView(root)
    }
    private fun languageName(value: PreferenceLanguage?) = when(value) {
        PreferenceLanguage.ZH_CN -> "简体中文";PreferenceLanguage.ZH_TW -> "繁體中文";PreferenceLanguage.EN -> "English";null -> null
    }
    private fun themeName(value: PreferenceTheme) = when(value) {
        PreferenceTheme.SYSTEM -> text("跟随系统","跟隨系統","System")
        PreferenceTheme.LIGHT -> text("明亮","明亮","Light")
        PreferenceTheme.DARK -> text("暗黑","深色","Dark")
    }
    private fun measurementName(value: MeasurementSystem) = if(value==MeasurementSystem.METRIC)text("公制","公制","Metric") else text("英制","英制","Imperial")
    private fun wallpaperLabel(value: UserPreferences?): String {
        val preferences=value ?: return text("未知","未知","Unknown")
        val raw=JSONObject(preferences.rawJson)
        if(raw.has("wallpaper")&&raw.isNull("wallpaper"))return text("未设置","未設定","Not set")
        val wallpaper=raw.opt("wallpaper") as? JSONObject ?: return text("未知","未知","Unknown")
        val name=wallpaper.opt("name")
        val label=when(name) {
            is String -> name
            is JSONObject -> (name.opt(preferences.language?.wire ?: "") as? String) ?: (name.opt("en") as? String)
            else -> null
        }
        return label?.takeIf {it.isNotBlank()} ?: if(preferences.wallpaperId!=null)text("已设置当前壁纸","已設定目前桌布","Current wallpaper set") else text("未知","未知","Unknown")
    }
    private fun choose(title: String, options: List<String>, selected: Int, picked: (Int)->Unit) {
        if(!current()||workflow.state.value.busy||workflow.state.value.resultUnknown)return
        dialog=AlertDialog.Builder(this).setTitle(title).setSingleChoiceItems(options.toTypedArray(),selected) {popup,index ->
            popup.dismiss();dialog=null
            if(current())picked(index)
        }.setNegativeButton(text("取消","取消","Cancel"),null).create().also {it.show()}
    }
    private fun save(patch: PreferencesPatch) {restoredPending=false;runWork(true) {workflow.save(patch)}}
    private fun runWork(writing: Boolean, block: suspend ()->Unit) {
        if(work?.isActive==true||!current())return
        saving=writing
        work=lifetime.launch {try {block()}finally {saving=false}}
    }
    private fun back() {
        if(::workflow.isInitialized&&workflow.state.value.busy)return
        if(languagePage) {languagePage=false;render(workflow.state.value)} else finish()
    }
    override fun onSaveInstanceState(outState: Bundle) {
        outState.putBoolean("language_page",languagePage)
        outState.putBoolean("save_pending",saving||(::workflow.isInitialized&&workflow.state.value.resultUnknown))
        super.onSaveInstanceState(outState)
    }
    override fun onDestroy() {dialog?.dismiss();lifetime.cancel();super.onDestroy()}
    companion object {const val EXTRA_ACCOUNT_REVISION="accountRevision"}
}

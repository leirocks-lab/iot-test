package com.rowan.iot.rnhost

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.rowan.iot.MainApplication
import kotlinx.coroutines.*

class DeviceActivity : ReactActivity() {
  val pageSessionId:String=java.util.UUID.randomUUID().toString()
  private val lifetime=MainScope()
  @Volatile var nativeResumed=false
    private set
  val deviceId:String get()=intent.getStringExtra("deviceId")?:""
  val accountRevision:Long get()=intent.getLongExtra("accountRevision",-1)
  fun authorizedContext():Boolean=(application as MainApplication).services.account.contextSnapshot().let {
    deviceId.isNotBlank()&&it.session!=null&&!it.cleanupRequired&&it.revision==accountRevision
  }
  override fun onCreate(savedInstanceState:android.os.Bundle?) {
    val started=RnStartupTrace.begin("device_create")
    try {super.onCreate(savedInstanceState)} finally {RnStartupTrace.end("device_create",started)}
    if(android.os.Build.VERSION.SDK_INT>=30) {
      val light=android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
          android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
      window.decorView.windowInsetsController?.setSystemBarsAppearance(light,light)
    } else {
      window.decorView.systemUiVisibility=window.decorView.systemUiVisibility or
          android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
          (if(android.os.Build.VERSION.SDK_INT>=26)android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else 0)
    }
    if(!authorizedContext()) {finish();return}
    lifetime.launch {
      (application as MainApplication).services.account.contexts.collect {if(!authorizedContext())finish()}
    }
  }
  override fun onResume() {
    nativeResumed=true
    val started=RnStartupTrace.begin("device_resume")
    try {super.onResume()} finally {RnStartupTrace.end("device_resume",started)}
    if(!authorizedContext())finish()
  }
  override fun onPause() {nativeResumed=false;super.onPause()}
  override fun onDestroy() {lifetime.cancel();super.onDestroy()}
  override fun onWindowFocusChanged(hasFocus:Boolean) {
    val phase=if(hasFocus)"device_focus_gain" else "device_focus_loss"
    val started=RnStartupTrace.begin(phase)
    try {super.onWindowFocusChanged(hasFocus)} finally {RnStartupTrace.end(phase,started)}
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "RowanDeviceModule"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions() = android.os.Bundle().apply {
          putString("deviceId", intent.getStringExtra("deviceId"))
          putString("pageSessionId", this@DeviceActivity.pageSessionId)
        }
      }
}

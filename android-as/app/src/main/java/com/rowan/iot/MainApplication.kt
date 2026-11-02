package com.rowan.iot

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

open class MainApplication : Application(), ReactApplication {
  protected open fun createServices():com.rowan.iot.app.AppServices=com.rowan.iot.app.AppServices(this)
  val services by lazy { createServices() }

  override val reactHost: ReactHost by lazy {
    val started=com.rowan.iot.rnhost.RnStartupTrace.begin("host_factory")
    try { getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(com.rowan.iot.bridge.RowanHostPackage())
        },
    ) } finally {com.rowan.iot.rnhost.RnStartupTrace.end("host_factory",started)}
  }

  override fun onCreate() {
    super.onCreate()
    services.startPresentation()
    val started=com.rowan.iot.rnhost.RnStartupTrace.begin("application_react_load")
    try {loadReactNative(this)} finally {com.rowan.iot.rnhost.RnStartupTrace.end("application_react_load",started)}
  }
  override fun onTerminate() { services.closePresentation(); super.onTerminate() }

}

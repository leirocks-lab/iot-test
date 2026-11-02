package com.rowan.iot.navigation

import android.app.Activity
import android.content.Intent
import com.rowan.iot.features.auth.WelcomeActivity
import com.rowan.iot.features.home.HomeActivity

object NativeNavigation {
    fun home(activity:Activity) = replaceRoot(activity,HomeActivity::class.java)
    fun welcome(activity:Activity) = replaceRoot(activity,WelcomeActivity::class.java)
    private fun replaceRoot(activity:Activity,target:Class<out Activity>) {
        activity.startActivity(Intent(activity,target).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        activity.finish()
    }
}

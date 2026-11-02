package com.rowan.iot.platform.presentation

import android.app.Activity
import android.app.Application
import android.content.ComponentCallbacks
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.rowan.iot.domain.presentation.*
import java.util.Collections
import java.util.WeakHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/** Application-owned OS source; no Activity/page override, account, preferences or rendering values.
 * Register from Application.onCreate before the first Activity starts. All SDK lifecycle operations
 * use main and the SAME callback objects. The immutable last OS tuple is safe to read off main.
 */
class AndroidPresentationSystemSource(private val application:Application):PresentationSystemSource {
    private val main=Handler(Looper.getMainLooper())
    private val state=AtomicReference(PresentationSystemState(false,null))
    private var registration:Any?=null // main only; kept until physical unregister finishes.
    override fun capture():PresentationSystemState=state.get()
    override fun observe(changed:()->Unit):AutoCloseable {
        check(Looper.myLooper()==Looper.getMainLooper()) {"Presentation registration requires main"}
        check(registration==null) {"Presentation system source already observed"}
        val token=Any();registration=token;val alive=AtomicBoolean(true)
        val activities=Collections.newSetFromMap(WeakHashMap<Activity,Boolean>())
        fun refresh(){
            if(!alive.get()||registration!==token)return
            // Global SYSTEM resources cannot inherit a page's override Configuration/theme context.
            val configuration=Configuration(Resources.getSystem().configuration)
            val appearance=when(configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK){
                Configuration.UI_MODE_NIGHT_YES->EffectiveTheme.DARK
                Configuration.UI_MODE_NIGHT_NO->EffectiveTheme.LIGHT
                else->null
            }
            val tags=(0 until configuration.locales.size()).map {configuration.locales[it].toLanguageTag()}
            state.set(PresentationSystemState(activities.isNotEmpty(),appearance?.let {PresentationSystemInput(tags,it)}))
            changed()
        }
        val lifecycle=object:Application.ActivityLifecycleCallbacks {
            override fun onActivityStarted(activity:Activity)=Unit
            override fun onActivityStopped(activity:Activity){activities.remove(activity);refresh()}
            override fun onActivityDestroyed(activity:Activity){activities.remove(activity);refresh()}
            override fun onActivityCreated(activity:Activity,savedInstanceState:Bundle?)=Unit
            override fun onActivityResumed(activity:Activity){activities.add(activity);refresh()}
            override fun onActivityPaused(activity:Activity){activities.remove(activity);refresh()}
            override fun onActivitySaveInstanceState(activity:Activity,outState:Bundle)=Unit
        }
        val configuration=object:ComponentCallbacks {
            override fun onConfigurationChanged(newConfig:Configuration){refresh()}
            override fun onLowMemory()=Unit
        }
        var lifecycleRegistered=false;var configurationRegistered=false
        fun remove(){
            check(Looper.myLooper()==Looper.getMainLooper())
            try {if(lifecycleRegistered)application.unregisterActivityLifecycleCallbacks(lifecycle)}
            finally {try {if(configurationRegistered)application.unregisterComponentCallbacks(configuration)}
                finally {activities.clear();if(registration===token){registration=null;state.set(PresentationSystemState(false,null))}}}
        }
        try {
            application.registerActivityLifecycleCallbacks(lifecycle);lifecycleRegistered=true
            application.registerComponentCallbacks(configuration);configurationRegistered=true;refresh()
        }catch(error:Exception){alive.set(false);remove();throw error}
        return AutoCloseable {
            if(alive.compareAndSet(true,false)) {
                if(Looper.myLooper()==Looper.getMainLooper())remove() else main.post {remove()}
            }
        }
    }
}

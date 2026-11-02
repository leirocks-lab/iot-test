package com.rowan.iot.fixtures

import android.app.Activity
import android.app.Instrumentation
import android.graphics.Rect
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.os.Looper
import android.view.*
import android.widget.TextView
import com.facebook.react.R as ReactR
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.json.JSONArray
import org.json.JSONObject

/** Reads the real view hierarchy and waits for completed window frames, never creates a mirror UI. */
class HomeFixtureUi(private val runner:Instrumentation,private val app:FixtureApplication):AutoCloseable {
    @Volatile var diagnosticStep="idle";private set
    private val frames=HandlerThread("public-home-fixture-frames").apply {start()}
    @Suppress("UNCHECKED_CAST")
    fun <T> main(work:()->T):T {
        if(Looper.myLooper()==Looper.getMainLooper())return work()
        var value:T?=null;var failure:Throwable?=null
        runner.runOnMainSync {try{value=work()}catch(error:Throwable){failure=error}}
        failure?.let {throw it};return value as T
    }
    fun resumed():Activity?=app.tracker.resumed
    fun id(name:String)=app.resources.getIdentifier(name,"id",app.packageName)
    private fun descendants(view:View):List<View> =buildList {
        add(view);if(view is ViewGroup)for(i in 0 until view.childCount)addAll(descendants(view.getChildAt(i)))
    }
    fun views(activity:Activity,name:String):List<View> {
        val id=id(name);if(id==0)return emptyList();return descendants(activity.window.decorView).filter {it.id==id&&it.visibility==View.VISIBLE}
    }
    fun labels(activity:Activity,name:String)=views(activity,name).mapNotNull {(it as? TextView)?.text?.toString()}
    // Matches locked RN 0.86.3 BaseViewManager.setTestId; reads the actual mounted native RN view.
    fun hasReactTestId(activity:Activity,name:String)=descendants(activity.window.decorView).any {it.isShown&&it.getTag(ReactR.id.react_test_id)==name}
    @Volatile var frameDiagnostics=JSONObject();private set
    data class FrameFence(val requestedNanos:Long,val completedVsyncNanos:Long)
    fun frame(activity:Activity):FrameFence {
        diagnosticStep="frame_register"
        val done=CountDownLatch(1)
        val requested=java.util.concurrent.atomic.AtomicLong(Long.MAX_VALUE)
        val completed=java.util.concurrent.atomic.AtomicLong()
        val callbacks=java.util.concurrent.atomic.AtomicLong()
        val rejectedOld=java.util.concurrent.atomic.AtomicLong()
        val wrongWindow=java.util.concurrent.atomic.AtomicLong()
        val dropped=java.util.concurrent.atomic.AtomicLong()
        val maximumIntended=java.util.concurrent.atomic.AtomicLong()
        val requests=java.util.concurrent.atomic.AtomicLong()
        val draws=java.util.concurrent.atomic.AtomicLong()
        val invalidatedLeaves=java.util.concurrent.atomic.AtomicLong()
        val retired=java.util.concurrent.atomic.AtomicBoolean()
        val deadline=SystemClock.uptimeMillis()+5_000
        val window=activity.window
        val root=window.decorView
        lateinit var choreographer:Choreographer
        lateinit var requestFrame:Choreographer.FrameCallback
        val drawListener=ViewTreeObserver.OnDrawListener {draws.incrementAndGet()}
        val listener=Window.OnFrameMetricsAvailableListener {reportedWindow,metrics,droppedSinceLast->
            if(!retired.get()) {
                callbacks.incrementAndGet();dropped.addAndGet(droppedSinceLast.toLong())
                val vsync=metrics.getMetric(FrameMetrics.INTENDED_VSYNC_TIMESTAMP)
                maximumIntended.updateAndGet {old->maxOf(old,vsync)}
                if(reportedWindow!==window)wrongWindow.incrementAndGet()
                else if(vsync<requested.get())rejectedOld.incrementAndGet()
                else {completed.set(vsync);done.countDown()}
            }
        }
        var metricsInstalled=false;var callbackInstalled=false
        var drawObserver:ViewTreeObserver?=null
        try {
        main {
            choreographer=Choreographer.getInstance()
            window.addOnFrameMetricsAvailableListener(listener,Handler(frames.looper));metricsInstalled=true
            drawObserver=root.viewTreeObserver
            drawObserver!!.addOnDrawListener(drawListener)
            requested.set(System.nanoTime())
            requestFrame=Choreographer.FrameCallback {
                if(!retired.get()&&done.count>0&&SystemClock.uptimeMillis()<deadline&&requests.get()<120) {
                    requests.incrementAndGet()
                    // Dirty the real visible content display lists; never add a view/change styling.
                    for(view in descendants(root))if(view.isShown&&(view !is ViewGroup||view.childCount==0)) {
                        view.invalidate();invalidatedLeaves.incrementAndGet()
                    }
                    root.invalidate()
                    choreographer.postFrameCallback(requestFrame)
                }
            }
            choreographer.postFrameCallback(requestFrame);callbackInstalled=true
        }
        diagnosticStep="frame_await_completed_vsync"
        check(done.await(5,TimeUnit.SECONDS)){"fixture_frame_timeout"}
        }
        finally {
            retired.set(true)
            main {
                if(callbackInstalled)choreographer.removeFrameCallback(requestFrame)
                drawObserver?.takeIf {it.isAlive}?.removeOnDrawListener(drawListener)
                if(metricsInstalled)window.removeOnFrameMetricsAvailableListener(listener)
            }
            frameDiagnostics=JSONObject().put("requestedNanos",requested.get()).put("completedIntendedVsyncNanos",completed.get())
                .put("metricsCallbacks",callbacks.get()).put("rejectedOldVsync",rejectedOld.get()).put("wrongWindowCallbacks",wrongWindow.get())
                .put("droppedMetricsReports",dropped.get()).put("maximumIntendedVsyncNanos",maximumIntended.get())
                .put("redrawRequests",requests.get()).put("drawCount",draws.get()).put("invalidatedLeaves",invalidatedLeaves.get())
        }
        diagnosticStep="frame_wait_idle"
        runner.waitForIdleSync();diagnosticStep="frame_done"
        return FrameFence(requested.get(),completed.get())
    }
    fun await(code:String,timeoutMs:Long=8_000,predicate:()->Boolean) {
        val end=SystemClock.uptimeMillis()+timeoutMs
        while(SystemClock.uptimeMillis()<end) {
            if(main(predicate))return
            // Lifecycle/flow progress uses real main/vsync barriers. Captures separately require a completed window render.
            val drained=CountDownLatch(1)
            runner.runOnMainSync {Choreographer.getInstance().postFrameCallback {drained.countDown()}}
            check(drained.await(5,TimeUnit.SECONDS)){"fixture_lifecycle_frame_timeout"}
        }
        error(code)
    }
    fun tap(view:View) {
        diagnosticStep="tap_request_rectangle"
        main {view.requestRectangleOnScreen(Rect(0,0,view.width,view.height),true)}
        diagnosticStep="tap_wait_frame"
        val owner=resumed()?:error("fixture_no_resumed_activity");frame(owner)
        diagnosticStep="tap_check_visible_bounds"
        val point=main {
            val rect=Rect();check(view.isShown&&view.isEnabled&&view.getGlobalVisibleRect(rect)&&rect.width()>0&&rect.height()>0){"fixture_target_not_visible"}
            val minimum=(48*view.resources.displayMetrics.density).toInt()-1
            diagnosticStep="tap_check_48dp"
            check(rect.width()>=minimum&&rect.height()>=minimum){"fixture_target_clipped_below_touch_budget"}
            val xy=IntArray(2);view.getLocationOnScreen(xy)
            intArrayOf((xy[0]+view.width/2).coerceIn(rect.left,rect.right-1),(xy[1]+view.height/2).coerceIn(rect.top,rect.bottom-1))
        }
        diagnosticStep="tap_inject"
        touch(point[0],point[1]);diagnosticStep="tap_done"
    }
    fun longPress(view:View,completed:()->Boolean) {
        main {view.requestRectangleOnScreen(Rect(0,0,view.width,view.height),true)}
        val activity=resumed()?:error("fixture_no_resumed_activity");frame(activity)
        val xy=main {val r=Rect();check(view.getGlobalVisibleRect(r)&&view.isEnabled);intArrayOf(r.centerX(),r.centerY())}
        val down=SystemClock.uptimeMillis()
        fun event(action:Int)=MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,xy[0].toFloat(),xy[1].toFloat(),0).apply {source=InputDevice.SOURCE_TOUCHSCREEN}
        val first=event(MotionEvent.ACTION_DOWN);try{check(runner.uiAutomation.injectInputEvent(first,true))}finally{first.recycle()}
        try{await("fixture_long_press_not_entered",predicate=completed)}
        finally{val last=event(MotionEvent.ACTION_UP);try{runner.uiAutomation.injectInputEvent(last,true)}finally{last.recycle()}}
    }
    private fun touch(x:Int,y:Int) {
        val down=SystemClock.uptimeMillis()
        for(action in listOf(MotionEvent.ACTION_DOWN,MotionEvent.ACTION_UP)) {
            val event=MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,x.toFloat(),y.toFloat(),0).apply {source=InputDevice.SOURCE_TOUCHSCREEN}
            try{check(runner.uiAutomation.injectInputEvent(event,true)){"fixture_inject_failed"}}finally{event.recycle()}
        }
    }
    fun snapshot(activity:Activity):JSONObject=main {
        val names=listOf("home_title","home_room_tabs","home_room_all","home_room_tab","home_room_status","home_device_open",
            "home_selection_bar","home_selection_count","home_selection_item","home_selection_cancel","home_selection_done","home_selection_delete")
        val root=activity.window.decorView;val viewport=Rect();root.getGlobalVisibleRect(viewport)
        val nodes=JSONArray()
        for(name in names)for(view in views(activity,name)) {
            val visible=Rect();val intersects=view.getGlobalVisibleRect(visible)
            val location=IntArray(2);view.getLocationOnScreen(location)
            nodes.put(JSONObject().put("id",name).put("text",(view as? TextView)?.text?.toString().orEmpty())
                .put("selected",view.isSelected).put("checked",if(view is android.widget.CompoundButton)view.isChecked else JSONObject.NULL).put("enabled",view.isEnabled).put("clickable",view.isClickable)
                .put("bounds",JSONArray(listOf(location[0],location[1],location[0]+view.width,location[1]+view.height)))
                .put("visibleBounds",if(intersects)JSONArray(listOf(visible.left,visible.top,visible.right,visible.bottom))else JSONObject.NULL))
        }
        JSONObject().put("windowWidth",root.width).put("windowHeight",root.height)
            .put("density",activity.resources.displayMetrics.density).put("fontScale",activity.resources.configuration.fontScale).put("nodes",nodes)
    }
    override fun close(){frames.quitSafely()}
}

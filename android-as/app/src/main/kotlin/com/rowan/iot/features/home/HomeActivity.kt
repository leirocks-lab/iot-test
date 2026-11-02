package com.rowan.iot.features.home

import androidx.activity.ComponentActivity
import androidx.core.graphics.drawable.toDrawable
import androidx.activity.OnBackPressedCallback
import android.app.AlertDialog
import com.rowan.iot.domain.home.HomeSelection
import com.rowan.iot.domain.home.HomeSelectionState
import android.os.Bundle
import android.os.Build
import android.graphics.Color
import android.view.WindowInsets
import android.widget.*
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.account.AccountLogoutCleanupFailure
import com.rowan.iot.navigation.NativeNavigation
import com.rowan.iot.rnhost.DeviceActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import com.rowan.iot.domain.home.HomeRoomTabs
import com.rowan.iot.domain.home.HomeRoomState

/** HOME-01 metadata UI. Live device state remains owned by the native MQTT service. */
class HomeActivity:ComponentActivity() {
    override fun onWindowFocusChanged(hasFocus:Boolean) {
        val phase=if(hasFocus)"home_focus_gain" else "home_focus_loss"
        val started=com.rowan.iot.rnhost.RnStartupTrace.begin(phase)
        try {super.onWindowFocusChanged(hasFocus)} finally {com.rowan.iot.rnhost.RnStartupTrace.end(phase,started)}
    }
    private val lifetime=MainScope()
    private val services get()=(application as MainApplication).services
    private var revision=0L
    private lateinit var unbindHome:com.rowan.iot.domain.home.SelfUnbindHomeConsumer
    private var homeStarted=false
    private lateinit var roomTabs:HomeRoomTabs
    private lateinit var tabRow:LinearLayout
    private lateinit var tabScroll:HorizontalScrollView
    private lateinit var selection:HomeSelection
    private lateinit var normalFooter:LinearLayout
    private lateinit var selectionBar:LinearLayout
    private lateinit var selectionCount:TextView
    private lateinit var selectionMessage:TextView
    private lateinit var selectionFooter:Button
    private var selectionDialog:AlertDialog?=null
    private val selectionBack=object:OnBackPressedCallback(false) {
        override fun handleOnBackPressed() {selection.exit()}
    }
    private val actionControls=HomeActionControls {enabled->
        renderActionAvailability(enabled)
    }
    private val loggingOut:Boolean get()=actionControls.loggingOut
    private lateinit var status:TextView
    private lateinit var devices:LinearLayout
    private lateinit var refreshButton:Button
    private lateinit var roomsButton:Button
    private lateinit var addButton:Button
    private lateinit var logoutButton:Button
    private lateinit var mineButton:Button
    private fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        revision=services.account.revision
        roomTabs=HomeRoomTabs(services.home,revision,::current,services.homeReadGate(revision)?:com.rowan.iot.domain.home.HomeReadGate())
        selection=HomeSelection(::current)
        if(services.account.session==null&&services.account.pendingLogoutCleanupRevision==null) {NativeNavigation.welcome(this);return}
        unbindHome=services.newSelfUnbindHomeConsumer(roomTabs,revision,lifetime){homeStarted&&!loggingOut&&current()}
        val content=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setPadding(dp(16),dp(12),dp(16),dp(16));setBackgroundColor(Color.rgb(242,242,242))}
        val scroll=ScrollView(this).apply {addView(content);isFillViewport=true}
        content.addView(TextView(this).apply {id=R.id.home_title;text="首页";textSize=16f;minimumHeight=dp(48);gravity=android.view.Gravity.CENTER_VERTICAL;setTypeface(null,android.graphics.Typeface.BOLD);setTextColor(Color.BLACK)})
        selectionBar=LinearLayout(this).apply {id=R.id.home_selection_bar;orientation=LinearLayout.HORIZONTAL;visibility=android.view.View.GONE}
        selectionBar.addView(Button(this).apply {
            id=R.id.home_selection_cancel;text="取消";textSize=16f;minimumHeight=dp(48)
            setOnClickListener {selection.exit()}
        })
        selectionCount=TextView(this).apply {id=R.id.home_selection_count;textSize=16f;gravity=android.view.Gravity.CENTER}
        selectionBar.addView(selectionCount,LinearLayout.LayoutParams(0,-2,1f))
        selectionBar.addView(Button(this).apply {
            id=R.id.home_selection_done;text="完成";textSize=16f;minimumHeight=dp(48)
            setOnClickListener {selection.exit()}
        });content.addView(selectionBar)
        tabRow=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL}
        tabScroll=HorizontalScrollView(this).apply {
            id=R.id.home_room_tabs;isHorizontalScrollBarEnabled=false;addView(tabRow)
        }
        roomsButton=Button(this).apply {
            id=R.id.home_rooms;text="☰";contentDescription="房间管理"
            setOnClickListener {if(current()&&!loggingOut&&!selection.state.value.editing)startActivity(android.content.Intent(this@HomeActivity,com.rowan.iot.features.rooms.RoomsActivity::class.java))}
        }
        val roomNavigation=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL;gravity=android.view.Gravity.CENTER_VERTICAL}
        roomNavigation.addView(tabScroll,LinearLayout.LayoutParams(0,-2,1f));roomNavigation.addView(roomsButton,LinearLayout.LayoutParams(dp(48),dp(48)))
        content.addView(roomNavigation,LinearLayout.LayoutParams(-1,-2))
        status=TextView(this).apply {id=R.id.home_room_status;text="正在加载…";textSize=14f};content.addView(status)
        selectionMessage=TextView(this).apply {id=R.id.home_selection_status;textSize=14f;setTextColor(Color.rgb(180,40,40));visibility=android.view.View.GONE}
        content.addView(selectionMessage)
        devices=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL};content.addView(devices)
        addButton=Button(this).apply {
            id=R.id.home_add;text="添加设备"
            setOnClickListener {
                com.rowan.iot.features.scan.AddDeviceSheet.show(this@HomeActivity,revision) {current()&&!loggingOut&&!selection.state.value.editing}
            }
        }
        refreshButton=Button(this).apply {text="刷新";setOnClickListener {if(!loggingOut)load()}};content.addView(refreshButton)
        mineButton=Button(this).apply {
            id=R.id.home_mine;text="我的"
            setOnClickListener {if(current()&&!loggingOut&&!selection.state.value.editing)startActivity(android.content.Intent(this@HomeActivity,
                com.rowan.iot.features.mine.MineActivity::class.java).putExtra("accountRevision",revision))}
        }
        logoutButton=Button(this).apply {id=R.id.home_logout;text="退出登录";setOnClickListener {logout()}};content.addView(logoutButton)
        selectionFooter=Button(this).apply {
            id=R.id.home_selection_delete;text="删除设备";textSize=14f;minimumHeight=dp(56)
            setTextColor(Color.rgb(220,50,45));visibility=android.view.View.GONE
            setOnClickListener {showSelectionReview()}
        }
        HomeAppearance.textAction(refreshButton);HomeAppearance.textAction(logoutButton)
        HomeAppearance.textAction(roomsButton)
        for(i in 0 until selectionBar.childCount)(selectionBar.getChildAt(i) as? Button)?.let {HomeAppearance.textAction(it);it.textSize=16f}
        (selectionBar.getChildAt(0) as? Button)?.setTextColor(Color.rgb(102,102,102))
        (selectionBar.getChildAt(2) as? Button)?.setTextColor(Color.rgb(24,109,175))
        HomeAppearance.textAction(selectionFooter);selectionFooter.setTextColor(Color.rgb(255,59,48))
        normalFooter=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL;gravity=android.view.Gravity.CENTER;setPadding(dp(16),dp(8),dp(16),dp(8));setBackgroundColor(Color.rgb(247,247,247))}
        val currentHome=TextView(this).apply {text="首页";textSize=16f;gravity=android.view.Gravity.CENTER;minimumHeight=dp(48);setTypeface(null,android.graphics.Typeface.BOLD);setTextColor(Color.BLACK);contentDescription="首页，当前页面"}
        HomeAppearance.textAction(addButton);addButton.text="+";addButton.contentDescription="添加设备"
        addButton.setPadding(0,0,0,0);addButton.setTextSize(android.util.TypedValue.COMPLEX_UNIT_DIP,28f);addButton.setTextColor(Color.WHITE)
        addButton.background=android.graphics.drawable.GradientDrawable().apply {shape=android.graphics.drawable.GradientDrawable.OVAL;setColor(Color.BLACK)}
        HomeAppearance.textAction(mineButton)
        normalFooter.addView(currentHome,LinearLayout.LayoutParams(0,-2,1f));normalFooter.addView(addButton,LinearLayout.LayoutParams(dp(48),dp(48)));normalFooter.addView(mineButton,LinearLayout.LayoutParams(0,-2,1f))
        val shell=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setBackgroundColor(Color.rgb(242,242,242))}
        shell.addView(scroll,LinearLayout.LayoutParams(-1,0,1f));shell.addView(normalFooter,LinearLayout.LayoutParams(-1,-2));shell.addView(selectionFooter,LinearLayout.LayoutParams(-1,-2))
        if(Build.VERSION.SDK_INT>=30)shell.setOnApplyWindowInsetsListener {view,insets->
            val bars=insets.getInsets(WindowInsets.Type.systemBars());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);insets
        }
        setContentView(shell)
        onBackPressedDispatcher.addCallback(this,selectionBack)
        if(Build.VERSION.SDK_INT>=30) {
            window.setDecorFitsSystemWindows(false)
            val light=android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            window.decorView.windowInsetsController?.setSystemBarsAppearance(light,light)
        }
        lifetime.launch {roomTabs.state.collect {renderRooms(it)}}
        lifetime.launch {selection.state.collect {renderSelection(it);if(!loggingOut)renderRooms(roomTabs.state.value)}}
        lifetime.launch {
            services.account.contexts.collect {
                if(!current()) {
                    selection.accountChanged();roomTabs.accountChanged();devices.removeAllViews();tabRow.removeAllViews()
                    if(it.cleanupRequired)showCleanup()
                }
            }
        }
        if(services.account.pendingLogoutCleanupRevision!=null)showCleanup() else load()
    }
    private fun current()=services.account.contextSnapshot().let {it.session!=null&&!it.cleanupRequired&&it.revision==revision}
    override fun onStart() {
        super.onStart();homeStarted=true
        if(::unbindHome.isInitialized)unbindHome.appear()
        if(::selection.isInitialized) {selection.appear();selection.sync(roomTabs.state.value)}
    }
    override fun onRestart() {super.onRestart();if(current()&&!loggingOut&&::status.isInitialized)load()}
    override fun onResume() {
        super.onResume()
        val live=services.account.contextSnapshot()
        if(live.cleanupRequired) {if(::status.isInitialized)showCleanup()}
        else if(live.session==null) NativeNavigation.welcome(this)
        else if(live.revision!=revision) NativeNavigation.home(this)
    }

    private fun load() {
        if(services.account.pendingLogoutCleanupRevision!=null) {showCleanup();return}
        if(::unbindHome.isInitialized)unbindHome.refresh()
    }
    private fun renderRooms(value:HomeRoomState) {
        selection.sync(value)
        if(loggingOut||services.account.pendingLogoutCleanupRevision!=null)return
        devices.removeAllViews();tabRow.removeAllViews()
        if(!current()||value.sessionExpired) {status.text="登录会话已变化，请重新进入";return}
        val oldScroll=tabScroll.scrollX
        fun tab(label:String,id:com.rowan.iot.domain.rooms.RoomId?) {
            val selected=value.selectedRoomId==id
            val item=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL}
            item.addView(Button(this).apply {
                this.id=if(id==null)R.id.home_room_all else R.id.home_room_tab
                text=label;isAllCaps=false;textSize=if(selected)16f else 14f
                setTextColor(if(selected)Color.BLACK else Color.rgb(51,51,51))
                setTypeface(null,if(selected)android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                setBackgroundColor(Color.TRANSPARENT);minWidth=0;minimumHeight=dp(48)
                setPadding(dp(8),0,dp(8),0);isSelected=selected
                isEnabled=!selection.state.value.editing
                setOnClickListener {if(current()&&!loggingOut&&!selection.state.value.editing)roomTabs.select(id)}
            },LinearLayout.LayoutParams(-2,-2))
            item.addView(android.view.View(this).apply {
                setBackgroundColor(if(selected)Color.BLACK else Color.TRANSPARENT)
            },LinearLayout.LayoutParams(dp(12),dp(3)).apply {gravity=android.view.Gravity.CENTER_HORIZONTAL})
            tabRow.addView(item)
        }
        tab("全屋",null);value.tabs.forEach {tab(it.name,it.id)}
        tabScroll.post {if(!isFinishing&&!isDestroyed)tabScroll.scrollTo(oldScroll,0)}
        val input=selection.inputEpoch
        val visible=value.visibleGroups.flatMap {it.devices}
        for(pair in visible.chunked(2)) {
            val row=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL;gravity=android.view.Gravity.TOP}
            pair.forEachIndexed {column,device->
                val card:TextView=if(selection.state.value.editing)CheckBox(this).apply {
                    id=R.id.home_selection_item;text=device.nickname
                    isChecked=selection.state.value.isSelected(device.id);isEnabled=!value.loading
                    setOnClickListener {selection.toggle(device.id,input)}
                    setOnLongClickListener {selection.begin(device.id,input)}
                } else Button(this).apply {
                    id=R.id.home_device_open;text=device.nickname;isAllCaps=false
                    setOnLongClickListener {current()&&!loggingOut&&selection.begin(device.id,input)}
                    setOnClickListener {
                        if(current()&&!loggingOut) {
                            if(selection.state.value.editing) {selection.toggle(device.id,input);return@setOnClickListener}
                            val target=roomTabs.deviceForOpen(device.id)?:return@setOnClickListener
                            startActivity(android.content.Intent(this@HomeActivity,DeviceActivity::class.java)
                                .putExtra("deviceId",target.id).putExtra("accountRevision",revision))
                        }
                    }
                }
                HomeAppearance.card(card,selection.state.value.editing)
                row.addView(card,LinearLayout.LayoutParams(0,-2,1f).apply {if(column==0)marginEnd=dp(11)})
            }
            if(pair.size==1)row.addView(android.view.View(this),LinearLayout.LayoutParams(0,0,1f))
            devices.addView(row,LinearLayout.LayoutParams(-1,-2).apply {bottomMargin=dp(10)})
        }
        status.text=when {
            value.loading->"正在刷新设备…"
            value.errorCode!=null->if(value.loaded)"加载失败，请检查网络后刷新；已保留上次列表" else "加载失败，请检查网络后刷新"
            value.empty->if(value.selectedRoomId==null)"还没有设备" else "此房间暂无设备"
            else->""
        }
        status.visibility=if(status.text.isNullOrEmpty())android.view.View.GONE else android.view.View.VISIBLE
    }
    private fun renderActionAvailability(logoutEnabled:Boolean) {
        if(!::logoutButton.isInitialized)return
        logoutButton.isEnabled=logoutEnabled
        val canNavigate=current()&&!selection.state.value.editing&&!loggingOut
        addButton.isEnabled=canNavigate;roomsButton.isEnabled=canNavigate;mineButton.isEnabled=canNavigate
    }
    private fun renderSelection(value:HomeSelectionState) {
        if(!::selectionBar.isInitialized)return
        val editing=value.editing&&current()&&!loggingOut
        selectionBar.visibility=if(editing)android.view.View.VISIBLE else android.view.View.GONE
        selectionFooter.visibility=if(editing)android.view.View.VISIBLE else android.view.View.GONE
        normalFooter.visibility=if(editing)android.view.View.GONE else android.view.View.VISIBLE
        selectionCount.text="已选中 ${value.selected.size} 个设备"
        selectionFooter.isEnabled=editing&&value.selected.isNotEmpty()&&!value.loading
        selectionBack.isEnabled=editing
        findViewById<TextView>(R.id.home_title)?.visibility=if(editing)android.view.View.GONE else android.view.View.VISIBLE
        val message=when(value.errorCode) {
            "removal_unavailable"->"暂时无法移除设备，请稍后再试。"
            "selection_changed"->"设备列表已变化，已更新选择，请重新核对。"
            else->""
        }
        selectionMessage.text=message
        selectionMessage.visibility=if(message.isEmpty())android.view.View.GONE else android.view.View.VISIBLE
        actionControls.selectionChanged(editing)
        for(button in listOf(addButton,roomsButton,mineButton,logoutButton))button.visibility=if(editing)android.view.View.GONE else android.view.View.VISIBLE
        if(value.review==null) {selectionDialog?.dismiss();selectionDialog=null}
    }
    private fun showSelectionReview() {
        if(!current()||loggingOut||selectionDialog!=null)return
        val review=selection.requestReview(selection.inputEpoch)?:return
        val dialog=AlertDialog.Builder(this).setTitle("删除设备")
            .setMessage("已选择 ${review.devices.size} 台设备。当前暂时无法移除设备。\n"+review.devices.joinToString("\n") {it.nickname})
            .setNegativeButton("取消") {_,_->selection.cancelReview(review.ticket)}
            .setPositiveButton("知道了") {_,_->selection.confirm(review.ticket)}.create()
        selectionDialog=dialog
        dialog.setOnCancelListener {selection.cancelReview(review.ticket)}
        dialog.setOnDismissListener {selection.cancelReview(review.ticket);if(selectionDialog===dialog)selectionDialog=null}
        dialog.show()
    }
    override fun onStop() {
        if(::selection.isInitialized)selection.leave()
        homeStarted=false
        if(::unbindHome.isInitialized)unbindHome.leave()
        super.onStop()
    }
    private fun logout() {
        if(loggingOut)return
        if(selection.state.value.editing)return
        unbindHome.leave()
        lifetime.launch {
            try {actionControls.runLogout {
            try {
                val cleanup=services.account.pendingLogoutCleanupRevision
                if(cleanup!=null)services.account.retryLogoutCleanup(cleanup) else services.account.logout(revision)
                val live=services.account.contextSnapshot()
                if(live.session==null&&!live.cleanupRequired&&live.revision==(cleanup?:revision+1))NativeNavigation.welcome(this@HomeActivity)
                else finish()
            }
            catch(error:CancellationException) {throw error}
            catch(error:Exception) {
                val live=services.account.contextSnapshot()
                if(error is AccountLogoutCleanupFailure&&live.revision==error.expectedRevision)showCleanup()
                else if(live.revision!=revision&&live.session!=null)finish()
                else if(live.session==null&&!live.cleanupRequired)NativeNavigation.welcome(this@HomeActivity)
                else status.text=(error as? ApiFailure)?.message?:"退出失败，请重试"
            }
            }}finally {if(homeStarted&&current())unbindHome.appear()}
        }
    }
    private fun showCleanup() {
        actionControls.selectionChanged(false)
        if(::unbindHome.isInitialized)unbindHome.leave();selection.accountChanged();roomTabs.accountChanged();devices.removeAllViews();tabRow.removeAllViews()
        status.text="本地安全会话尚未清理，退出未完成。请重试本地清理；不会再次发送退出请求。"
        refreshButton.isEnabled=false;roomsButton.isEnabled=false;addButton.isEnabled=false
        mineButton.isEnabled=false
        logoutButton.text="重试本地清理"
    }
    override fun onDestroy() {if(::unbindHome.isInitialized)unbindHome.close();selectionDialog?.dismiss();selectionDialog=null;if(::selection.isInitialized)selection.close();if(::roomTabs.isInitialized)roomTabs.close();lifetime.cancel();super.onDestroy()}
}

/** Pure local appearance; no metadata/authority/transport or product defaults. */
private object HomeAppearance {
    fun textAction(view:Button) {
        view.isAllCaps=false;view.textSize=14f;view.minimumHeight=(48*view.resources.displayMetrics.density).toInt()
        view.background=Color.TRANSPARENT.toDrawable()
        view.setTextColor(Color.BLACK)
    }
    fun card(view:TextView,editing:Boolean) {
        val density=view.resources.displayMetrics.density
        fun dp(value:Int)=(value*density).toInt()
        view.minimumHeight=dp(202);view.textSize=14f;view.gravity=android.view.Gravity.CENTER
        view.setPadding(dp(12),dp(44),dp(12),dp(32));view.setTextColor(Color.rgb(51,51,51))
        view.setTypeface(null,android.graphics.Typeface.NORMAL);view.maxLines=3;view.ellipsize=android.text.TextUtils.TruncateAt.END
        view.background=android.graphics.drawable.GradientDrawable().apply {setColor(Color.WHITE);cornerRadius=dp(12).toFloat()}
        view.elevation=dp(1).toFloat()
        if(view is CompoundButton)view.buttonDrawable=null
        if(editing)view.foreground=SelectionMark(density)
    }
    private class SelectionMark(private val density:Float):android.graphics.drawable.Drawable() {
        private val paint=android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
        override fun isStateful()=true
        override fun onStateChange(state:IntArray):Boolean {invalidateSelf();return true}
        override fun draw(canvas:android.graphics.Canvas) {
            val checked=state.contains(android.R.attr.state_checked);val radius=11*density
            val x=bounds.right-27*density;val y=bounds.top+27*density
            paint.color=if(checked)Color.rgb(35,25,22) else Color.rgb(229,229,229)
            paint.style=if(checked)android.graphics.Paint.Style.FILL else android.graphics.Paint.Style.STROKE;paint.strokeWidth=2*density
            canvas.drawCircle(x,y,radius,paint)
            if(checked) {paint.color=Color.WHITE;paint.style=android.graphics.Paint.Style.STROKE;paint.strokeWidth=2*density
                val path=android.graphics.Path();path.moveTo(x-5*density,y);path.lineTo(x-density,y+4*density);path.lineTo(x+6*density,y-4*density);canvas.drawPath(path,paint)}
        }
        override fun setAlpha(alpha:Int){paint.alpha=alpha;invalidateSelf()}
        override fun setColorFilter(colorFilter:android.graphics.ColorFilter?){paint.colorFilter=colorFilter;invalidateSelf()}
        @Suppress("DEPRECATION")override fun getOpacity()=android.graphics.PixelFormat.TRANSLUCENT
    }
}

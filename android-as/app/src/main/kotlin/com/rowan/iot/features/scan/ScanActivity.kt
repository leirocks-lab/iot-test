package com.rowan.iot.features.scan

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.*
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.graphics.drawable.GradientDrawable
import android.view.WindowInsets
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.domain.scan.*
import com.rowan.iot.navigation.NativeNavigation
import com.rowan.iot.platform.scan.ZxingQrDecoder
import com.rowan.iot.platform.scan.NativeQrCameraDriver
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.Executor
import java.lang.ref.WeakReference
import java.util.UUID
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect

/** S037/38 software only. No production QR parser, binding, upload or external URL handling. */
class ScanActivity:ComponentActivity() {
    private val services get()=(application as MainApplication).services
    private val lifetime=MainScope()
    private val worker=ThreadPoolExecutor(1,1,0L,TimeUnit.MILLISECONDS,ArrayBlockingQueue<Runnable>(2),
        {task->Thread(task,"rowan-qr-local").apply {isDaemon=true}},ThreadPoolExecutor.AbortPolicy())
    private val slot=ScanWorkSlot()
    private val decoder=ZxingQrDecoder()
    private var revision=-1L
    private lateinit var gate:ScanRoundGate
    private var resumed=false
    private var leaving=false
    private var askedPermission=false
    private var requestingPermission=false
    private var resultVisible=false
    private val photoPage=UUID.randomUUID()
    private var photoTicket:PhotoIoTicket?=null
    private var pickerToken:Long?=null
    private var pickerResult:Pair<Long,Uri?>?=null
    private lateinit var camera:NativeQrCameraDriver
    private lateinit var permissionAction:Button
    private lateinit var settingsAction:Button
    private lateinit var albumAction:Button
    private lateinit var status:TextView
    private lateinit var retry:Button
    private val main=Executor {command->runOnUiThread(command)}
    private val permission=registerForActivityResult(ActivityResultContracts.RequestPermission()) {allowed->
        requestingPermission=false
        if(!current())leaveExpired()
        else if(resumed) {if(allowed)startCamera()else showUnavailable()}
    }
    private val picker=registerForActivityResult(ActivityResultContracts.PickVisualMedia()) {uri->
        val token=pickerToken?:return@registerForActivityResult
        pickerResult=token to uri
        if(resumed)consumePicker()
    }

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        revision=intent.getLongExtra(EXTRA_ACCOUNT_REVISION,-1)
        gate=ScanRoundGate(revision)
        if(!current()){leaveExpired();return}
        askedPermission=savedInstanceState?.getBoolean("asked_camera")==true
        onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true){override fun handleOnBackPressed(){finish()}})
        buildViews()
        lifetime.launch {services.account.contexts.collect {if(!current())leaveExpired()}}
    }
    private fun liveRevision():Long=services.account.contextSnapshot().let {if(it.session!=null&&!it.cleanupRequired)it.revision else -1}
    private fun current()=!leaving&&revision>=0&&liveRevision()==revision
    private fun accepted(token:Long)=current()&&gate.accept(token,liveRevision())
    override fun onResume() {
        super.onResume();resumed=true
        if(!current()){leaveExpired();return}
        gate.resume(liveRevision())?:return
        if(pickerResult!=null)consumePicker()
        else if(!gate.pickerPending()&&!resultVisible)ensureCamera(false)
        updateCameraActions()
    }
    override fun onPause() {
        resumed=false
        if(::gate.isInitialized)gate.pause()
        cancelPhoto();stopCamera();super.onPause()
    }
    override fun onSaveInstanceState(outState:Bundle){outState.putBoolean("asked_camera",askedPermission);super.onSaveInstanceState(outState)}
    override fun onDestroy() {
        leaving=true;if(::gate.isInitialized)gate.invalidate()
        cancelPhoto();pickerResult=null;pickerToken=null;if(::camera.isInitialized)camera.close();lifetime.cancel()
        // Do not shutdownNow/drop an accepted analyzer Runnable: its finally owns
        // frame disposal. Bounded queued work exits via the closed gate.
        worker.shutdown();super.onDestroy()
    }
    private fun leaveExpired() {
        if(leaving)return
        leaving=true;if(::gate.isInitialized)gate.invalidate();cancelPhoto();stopCamera();pickerResult=null;pickerToken=null
        val live=services.account.contextSnapshot()
        when {live.cleanupRequired->NativeNavigation.home(this);live.session==null->NativeNavigation.welcome(this);else->finish()}
    }
    private fun ensureCamera(explicit:Boolean) {
        if(!resumed||!current()||gate.pickerPending())return
        if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED){startCamera();return}
        showUnavailable()
        if(!requestingPermission&&(explicit||!askedPermission)) {
            askedPermission=true;requestingPermission=true
            try {permission.launch(Manifest.permission.CAMERA)}catch(_:Exception){requestingPermission=false;showUnavailable()}
        }
    }
    private fun startCamera() {
        val token=gate.token(liveRevision())?:return
        if(!resumed||!current()||gate.pickerPending()||resultVisible)return
        if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED){showUnavailable();return}
        status.visibility=View.GONE;retry.visibility=View.GONE;updateCameraActions()
        camera.start(token)
    }
    private fun stopCamera(){if(::camera.isInitialized)camera.stop()}
    private fun choosePhoto() {
        if(!current()||!resumed||gate.pickerPending())return
        cancelPhoto()
        val token=gate.beginPicker(liveRevision())?:return
        stopCamera();resultVisible=false;pickerToken=token;updateCameraActions()
        if(services.scanPhotos.busy) {
            pickerToken=null;gate.resume(liveRevision())
            if(gate.finishPicker(token,liveRevision()))publishMessage(token,"照片仍在处理中，请稍后重试。")
            return
        }
        try {picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))}
        catch(_:Exception){pickerResult=token to null;gate.resume(liveRevision());consumePicker();showUnavailable()}
    }
    private fun consumePicker() {
        val result=pickerResult?:return
        if(!current()){leaveExpired();return}
        if(!resumed||!gate.finishPicker(result.first,liveRevision()))return
        pickerResult=null;pickerToken=null
        val uri=result.second
        if(uri==null){resultVisible=false;ensureCamera(false);return}
        status.text="正在识别…";status.visibility=View.VISIBLE;retry.visibility=View.GONE;updateCameraActions()
        val ticket=PhotoIoTicket(photoPage,revision,result.first)
        photoTicket=ticket
        val weak=WeakReference(this)
        val admission=services.scanPhotos.read(ticket,uri,{weak.get()?.accepted(ticket.round)==true}) {owned,outcome->
            weak.get()?.main?.execute {weak.get()?.photoFinished(owned,outcome)}
        }
        when(admission) {
            PhotoAdmission.ADMITTED->Unit
            PhotoAdmission.BUSY->{if(photoTicket==ticket)photoTicket=null;publishMessage(ticket.round,"照片仍在处理中，请稍后重试。")}
            PhotoAdmission.STALE->{if(photoTicket==ticket)photoTicket=null}
        }
    }
    private fun cancelPhoto() {
        val owned=photoTicket?:return
        photoTicket=null
        services.scanPhotos.cancel(owned)
    }
    private fun photoFinished(ticket:PhotoIoTicket,outcome:PhotoIoOutcome) {
        if(photoTicket!=ticket)return
        photoTicket=null
        when(outcome) {
            is PhotoIoOutcome.Decoded->publish(ticket.round,outcome.decision)
            PhotoIoOutcome.Failure.TIMEOUT->publishMessage(ticket.round,"照片识别超时，请重试或使用其他图片。")
            PhotoIoOutcome.Failure.UNAVAILABLE->publishMessage(ticket.round,"暂时无法识别，请重试或选择其他图片。")
            PhotoIoOutcome.Failure.CANCELLED->Unit // Page cancellation is not a new visible result.
        }
    }
    private fun publish(token:Long,value:ScanDecision)=publishMessage(token,when(value) {
        ScanDecision.NO_CODE->"没有识别到二维码，请重试或选择其他图片。"
        ScanDecision.MULTIPLE_CODES->"识别到多个二维码，请只保留一个后重试。"
        ScanDecision.INPUT_TOO_LARGE->"暂时无法处理此图片，请选择其他图片。"
        ScanDecision.IMAGE_UNREADABLE->"暂时无法识别，请重试或选择其他图片。"
        ScanDecision.UNSUPPORTED->"暂时无法处理此二维码，请尝试其他添加方式。"
    })
    private fun publishMessage(token:Long,message:String) {
        if(!current()||!gate.claimTerminal(token,liveRevision()))return
        main.execute {
            if(!resumed||!current()||!gate.acceptTerminal(token,liveRevision()))return@execute
            resultVisible=true;stopCamera();status.visibility=View.VISIBLE;status.text=message
            retry.visibility=View.VISIBLE;updateCameraActions()
        }
    }
    private fun showUnavailable(){if(::status.isInitialized){
        status.text="相机暂不可用，可使用相册或返回。";status.visibility=View.VISIBLE
        retry.visibility=if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)View.VISIBLE else View.GONE
        updateCameraActions()
    }}
    private fun retry(){if(!current()||!resumed)return;resultVisible=false;gate.resume(liveRevision());ensureCamera(false)}
    private fun updateCameraActions() {
        if(!::permissionAction.isInitialized)return
        val denied=checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED
        val show=denied&&!gate.pickerPending()&&!resultVisible&&!requestingPermission
        permissionAction.visibility=if(show)View.VISIBLE else View.GONE
        settingsAction.visibility=if(show&&askedPermission&&!shouldShowRequestPermissionRationale(Manifest.permission.CAMERA))View.VISIBLE else View.GONE
        albumAction.isEnabled=current()&&!gate.pickerPending()
    }
    private fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    private fun buildViews() {
        val screen=FrameLayout(this).apply {setBackgroundColor(Color.BLACK)}
        camera=NativeQrCameraDriver(this,this,worker,slot,decoder,::accepted,::publish)
        screen.addView(camera.view.apply {id=R.id.scan_preview},FrameLayout.LayoutParams(-1,-1))
        val body=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setPadding(dp(24),dp(8),dp(24),dp(24))}
        val scroll=ScrollView(this).apply {isFillViewport=true;addView(body);clipToPadding=false}
        val target=View(this).apply {importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_NO}
        val guide=Guide(this,target)
        screen.addView(guide,FrameLayout.LayoutParams(-1,-1));screen.addView(scroll,FrameLayout.LayoutParams(-1,-1))
        scroll.setOnScrollChangeListener {_:View,_,_,_,_->guide.invalidate()}
        target.addOnLayoutChangeListener {_,_,_,_,_,_,_,_,_->guide.invalidate()}
        val bar=LinearLayout(this).apply {gravity=Gravity.CENTER_VERTICAL}
        bar.addView(Button(this).apply {
            id=R.id.scan_back;text="‹";textSize=28f;setTextColor(Color.WHITE);setBackgroundColor(Color.TRANSPARENT)
            contentDescription="返回";minWidth=0;setPadding(0,0,0,0);setOnClickListener {finish()}
        },LinearLayout.LayoutParams(dp(48),dp(48)))
        bar.addView(TextView(this).apply {id=R.id.scan_title;text="扫一扫";textSize=16f;setTextColor(Color.WHITE);gravity=Gravity.CENTER},LinearLayout.LayoutParams(0,-2,1f))
        bar.addView(View(this),LinearLayout.LayoutParams(dp(48),1));body.addView(bar,LinearLayout.LayoutParams(-1,dp(48)))
        fun space(size:Int){body.addView(View(this),LinearLayout.LayoutParams(1,dp(size)))}
        space(96)
        val side=minOf(dp(240),(resources.displayMetrics.widthPixels-dp(48)).coerceAtLeast(dp(120)))
        body.addView(target,LinearLayout.LayoutParams(side,side).apply {gravity=Gravity.CENTER_HORIZONTAL})
        space(36)
        body.addView(TextView(this).apply {text="扫描设备二维码";textSize=16f;typeface=Typeface.DEFAULT_BOLD;setTextColor(Color.WHITE);gravity=Gravity.CENTER},LinearLayout.LayoutParams(-1,-2))
        space(18)
        body.addView(TextView(this).apply {
            text="在配件、包装或说明书上查找产品二维码，\n并将其放在上方相机取景框内"
            textSize=14f;setTextColor(Color.WHITE);gravity=Gravity.CENTER
        },LinearLayout.LayoutParams(-1,-2))
        status=TextView(this).apply {id=R.id.scan_status;textSize=14f;setTextColor(Color.WHITE);gravity=Gravity.CENTER;visibility=View.GONE}
        body.addView(status,LinearLayout.LayoutParams(-1,-2).apply {topMargin=dp(16)})
        space(36)
        fun action(label:String,id:Int,primary:Boolean=false,run:()->Unit):Button {
            val button=Button(this).apply {
                this.id=id;text=label;textSize=16f;isAllCaps=false;minHeight=dp(48)
                typeface=if(primary)Typeface.DEFAULT_BOLD else Typeface.DEFAULT
                setTextColor(if(primary)Color.BLACK else Color.WHITE)
                background=GradientDrawable().apply {setColor(if(primary)Color.WHITE else Color.TRANSPARENT);cornerRadius=dp(8).toFloat();if(!primary)setStroke(dp(1),Color.WHITE)}
                setPadding(dp(12),dp(12),dp(12),dp(12));setOnClickListener {run()}
            }
            body.addView(button,LinearLayout.LayoutParams(-1,-2).apply {leftMargin=dp(24);rightMargin=dp(24);topMargin=if(primary)0 else dp(12)})
            return button
        }
        albumAction=action("使用相册",R.id.scan_album,true,::choosePhoto)
        retry=action("重试",R.id.scan_retry){retry()}.apply {visibility=View.GONE}
        permissionAction=action("允许使用相机",R.id.scan_permission){ensureCamera(true)}.apply {visibility=View.GONE}
        settingsAction=action("相机设置",R.id.scan_settings){if(current())try {startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:$packageName")))}catch(_:Exception){showUnavailable()}}.apply {visibility=View.GONE}
        screen.setOnApplyWindowInsetsListener {_,insets->
            if(Build.VERSION.SDK_INT>=30) {
                val bars=insets.getInsets(WindowInsets.Type.systemBars());scroll.setPadding(bars.left,bars.top,bars.right,bars.bottom)
            }else scroll.setPadding(insets.systemWindowInsetLeft,insets.systemWindowInsetTop,insets.systemWindowInsetRight,insets.systemWindowInsetBottom)
            guide.invalidate();insets
        }
        setContentView(screen)
        if(Build.VERSION.SDK_INT>=30) {
            window.setDecorFitsSystemWindows(false)
            window.decorView.windowInsetsController?.setSystemBarsAppearance(0,android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
        }
    }
    /** Full-screen dark mask; target coordinates follow scroll/font changes, with no fake preview image. */
    private class Guide(context:android.content.Context,private val target:View):View(context) {
        private val paint=Paint(Paint.ANTI_ALIAS_FLAG).apply {style=Paint.Style.STROKE;strokeWidth=2*resources.displayMetrics.density}
        private val point=IntArray(2);private val origin=IntArray(2)
        override fun onDraw(canvas:Canvas) {
            super.onDraw(canvas)
            target.getLocationInWindow(point);getLocationInWindow(origin)
            val left=(point[0]-origin[0]).toFloat();val top=(point[1]-origin[1]).toFloat()
            val box=RectF(left,top,left+target.width,top+target.height)
            val saved=canvas.save()
            if(Build.VERSION.SDK_INT>=26)canvas.clipOutRect(box)else canvas.clipRect(box,Region.Op.DIFFERENCE)
            canvas.drawColor(Color.argb(145,0,0,0));canvas.restoreToCount(saved)
            if(target.width==0||target.height==0)return
            val corner=16*resources.displayMetrics.density;paint.color=Color.WHITE
            val l=box.left;val r=box.right;val t=box.top;val b=box.bottom
            canvas.drawLine(l,t,l+corner,t,paint);canvas.drawLine(l,t,l,t+corner,paint)
            canvas.drawLine(r-corner,t,r,t,paint);canvas.drawLine(r,t,r,t+corner,paint)
            canvas.drawLine(l,b-corner,l,b,paint);canvas.drawLine(l,b,l+corner,b,paint)
            canvas.drawLine(r-corner,b,r,b,paint);canvas.drawLine(r,b-corner,r,b,paint)
            paint.color=Color.rgb(222,182,77);canvas.drawLine(l,t+box.height()*.30f,r,t+box.height()*.30f,paint)
        }
    }
    companion object {const val EXTRA_ACCOUNT_REVISION="accountRevision"}
}

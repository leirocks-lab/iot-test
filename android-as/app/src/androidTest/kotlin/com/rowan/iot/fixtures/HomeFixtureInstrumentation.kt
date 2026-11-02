package com.rowan.iot.fixtures

import android.app.Activity
import android.app.Application
import android.app.Instrumentation
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.view.KeyEvent
import android.view.View
import android.widget.Button
import android.widget.CompoundButton
import com.rowan.iot.BuildConfig
import com.rowan.iot.features.home.HomeActivity
import com.rowan.iot.features.rooms.RoomsActivity
import com.rowan.iot.rnhost.DeviceActivity
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject

/** SDK-only runner. All input/labels are compiled public fixtures; no arbitrary fixture arguments. */
class HomeFixtureInstrumentation:Instrumentation() {
    private lateinit var args:Bundle
    private lateinit var app:FixtureApplication
    private lateinit var ui:HomeFixtureUi
    private val results=JSONArray();private val artifacts=JSONArray();private val navigation=JSONArray()
    private val bitmaps=linkedMapOf<String,ByteArray>()
    private val runId=UUID.randomUUID().toString()
    private var activeCase=""
    private var diagnosticPhase="runner_setup"
    private fun diagnostic(error:Throwable):JSONObject {
        val allowed=setOf("fixture_application_not_installed","fixture_artifact_budget","fixture_assertion_failed","fixture_bad_argument","fixture_capture_changed","fixture_capture_changed_during_frame","fixture_capture_wrong_account","fixture_capture_wrong_window","fixture_case_failed","fixture_clickable_overlap","fixture_device_route_missing","fixture_di_not_unique","fixture_empty_status_missing","fixture_error_missing","fixture_frame_timeout","fixture_geometry_empty","fixture_home_not_ready","fixture_home_not_resumed","fixture_id_missing","fixture_inject_failed","fixture_lifecycle_frame_timeout","fixture_loading_missing","fixture_local_tab_dispatched_read","fixture_long_press_not_entered","fixture_no_resumed_activity","fixture_read_not_entered","fixture_requires_api36","fixture_room_empty_status_missing","fixture_rooms_route_missing","fixture_rows_mismatch","fixture_runner_failure","fixture_screenshot_null","fixture_selected_tab_geometry_missing","fixture_selected_tab_mismatch","fixture_selected_tab_not_reachable","fixture_selection_count_missing","fixture_target_clipped_below_touch_budget","fixture_target_not_visible","fixture_text_target_missing","fixture_unknown_argument","fixture_wrong_target")
        val exact=error.message
        val code=if(exact in allowed)exact else "fixture_unclassified_failure"
        val frames=JSONArray()
        error.stackTrace.filter {it.className.startsWith("com.rowan.iot.fixtures.HomeFixtureInstrumentation")||it.className.startsWith("com.rowan.iot.fixtures.HomeFixtureUi")}
            .take(8).forEach {frames.put(JSONObject().put("class",if(it.className.startsWith("com.rowan.iot.fixtures.HomeFixtureUi"))"HomeFixtureUi" else "HomeFixtureInstrumentation")
                .put("method",it.methodName.takeIf {name->name.matches(Regex("[A-Za-z0-9_$<>-]{1,100}"))}?:"unknown").put("line",it.lineNumber))}
        return JSONObject().put("frameNumbers",if(::ui.isInitialized)ui.frameDiagnostics else JSONObject()).put("uiStep",if(::ui.isInitialized)ui.diagnosticStep else "not_created").put("phase",diagnosticPhase).put("assertionCode",code).put("fixtureStack",frames)
    }
    private var capturedBytes=0
    private var freshRevision=0L
    override fun newApplication(loader:ClassLoader,className:String,context:Context):Application {
        check(context.packageName=="com.rowan.iot.dev.refactor"&&BuildConfig.FLAVOR=="development"&&!BuildConfig.DEBUG&&
            className=="com.rowan.iot.MainApplication"){"fixture_wrong_target"}
        return super.newApplication(FixtureApplication::class.java.classLoader!!,FixtureApplication::class.java.name,context)
    }
    override fun onCreate(arguments:Bundle?) {
        args=arguments?:Bundle();check(args.keySet().all {it=="emitPublicArtifacts"}){"fixture_unknown_argument"}
        check(args.getString("emitPublicArtifacts","false") in setOf("true","false")){"fixture_bad_argument"}
        super.onCreate(arguments);start()
    }
    override fun onStart() {
        var success=false
        try {
            check(Build.VERSION.SDK_INT==36){"fixture_requires_api36"}
            app=targetContext.applicationContext as? FixtureApplication?:error("fixture_application_not_installed")
            ui=HomeFixtureUi(this,app)
            check(app.services.account===app.fixtureAccount&&app.services.http===app.gateway&&app.services.home===app.fixtureHome){"fixture_di_not_unique"}
            runBlocking {app.fixtureAccount.login("public-a@example.test","public-fixture")}
            freshRevision=app.fixtureAccount.revision
            runCases();success=(0 until results.length()).all {results.getJSONObject(it).optString("result")!="failed"}
        }catch(error:Throwable) {results.put(JSONObject().put("id","runner").put("result","failed").put("code","fixture_runner_failure").put("diagnostic",diagnostic(error)))}
        finally {
            if(::app.isInitialized) {
                app.fixtureHome.releaseAll()
                if(::ui.isInitialized) {
                    ui.main {app.tracker.all().forEach {it.finish()}}
                    runBlocking {app.fixtureAccount.clearLocal()}
                    ui.close()
                }
            }
            val report=JSONObject().put("schemaVersion",1).put("runId",runId).put("fixtureOnly",true)
                .put("businessHttpDelegate","none").put("realHttpAcceptance",false).put("realCameraOrHardwareAcceptance",false)
                .put("iosRuntimeAcceptance",false).put("pixelAcceptance",false)
                .put("targetPackage","com.rowan.iot.dev.refactor").put("sdk",Build.VERSION.SDK_INT)
                .put("targetApkSha256",if(::app.isInitialized)shaFile(File(app.applicationInfo.sourceDir))else "")
                .put("testApkSha256",shaFile(File(context.applicationInfo.sourceDir)))
                .put("gatewayDeniedRequests",if(::app.isInitialized)app.gateway.denied.get()else 0)
                .put("results",results).put("artifacts",artifacts).put("nativeNavigation",navigation)
                .put("limits",JSONArray(listOf("Real HomeActivity/HomeRoomTabs with test repository, not real HTTP/MQTT proof.",
                    "No DELETE/PATCH/binding/SMTP/camera/gallery/permissions; original secure account storage never read or cleared.",
                    "Geometry and native navigation are separate from pixel/design approval. S031 is optional when its reviewed source is present.",
                    "Window screenshots contain public fixtures only; no system picker or other app surface is captured.")))
            if(::app.isInitialized) {
                val directory=File(app.filesDir,"public-home-ui-fixtures/$runId").apply {check(mkdirs()||isDirectory)}
                File(directory,"report.json").writeText(report.toString(2),Charsets.UTF_8)
                if(args.getString("emitPublicArtifacts","false")=="true")for((name,bytes) in bitmaps)export(name,bytes)
            }
            val output=Bundle().apply {putString("rowan_fixture_report",Base64.encodeToString(report.toString().toByteArray(),Base64.NO_WRAP))}
            finish(if(success)Activity.RESULT_OK else Activity.RESULT_CANCELED,output)
        }
    }
    private fun scenario(id:String,work:()->Unit) {
        sendStatus(1,Bundle().apply {putString("rowan_fixture_case",id);putString("rowan_fixture_stage","starting")})
        activeCase=id;diagnosticPhase="case_start";val first=artifacts.length()
        try {work();val names=JSONArray();for(i in first until artifacts.length())names.put(artifacts.getJSONObject(i).getString("name"))
            results.put(JSONObject().put("id",id).put("result","passed").put("geometryResult","passed").put("artifactNames",names))}
        catch(error:Throwable) {results.put(JSONObject().put("id",id).put("result","failed").put("code","fixture_assertion_failed").put("diagnostic",diagnostic(error)));throw IllegalStateException("fixture_case_failed")}
    }
    private fun home():HomeActivity=app.tracker.resumed as? HomeActivity?:error("fixture_home_not_resumed")
    private fun awaitHome()=ui.await("fixture_home_not_ready") {
        val page=app.tracker.resumed as? HomeActivity
        page!=null&&page.hasWindowFocus()&&!page.isFinishing&&!page.isDestroyed
    }
    private fun fresh(plan:HomeReadPlan):HomeActivity {
        diagnosticPhase="fresh_retire_previous"
        app.fixtureHome.releaseAll();ui.main {app.tracker.resumed?.finish()};app.fixtureHome.plan(plan)
        diagnosticPhase="fresh_start_activity"
        val page=startActivitySync(Intent(targetContext,HomeActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)) as HomeActivity
        diagnosticPhase="fresh_await_home";awaitHome();diagnosticPhase="fresh_await_repository";check(plan.entered.await(8,TimeUnit.SECONDS)){"fixture_read_not_entered"}
        freshRevision=app.fixtureAccount.revision;return page
    }
    private fun rows():List<String> =ui.main {
        val page=home();ui.labels(page,"home_device_open").ifEmpty {ui.labels(page,"home_selection_item")}
    }
    private fun awaitRows(vararg expected:String)=ui.await("fixture_rows_mismatch") {
        val page=app.tracker.resumed as? HomeActivity?:return@await false
        ui.labels(page,"home_device_open")==expected.toList()
    }
    private fun tapId(name:String,index:Int=0) {val view=ui.main {ui.views(home(),name).getOrNull(index)}?:error("fixture_id_missing");ui.tap(view)}
    private fun tapText(value:String) {
        val button=ui.main {
            fun find(view:View):Button? {
                if(view is Button&&view.text.toString()==value)return view
                if(view is android.view.ViewGroup)for(i in 0 until view.childCount)find(view.getChildAt(i))?.let {return it}
                return null
            };find(home().window.decorView)
        }?:error("fixture_text_target_missing");ui.tap(button)
    }
    private fun selectedRoom(index:Int?)=ui.await("fixture_selected_tab_mismatch") {
        val page=app.tracker.resumed as? HomeActivity?:return@await false
        val all=ui.views(page,"home_room_all").singleOrNull()?:return@await false
        val tabs=ui.views(page,"home_room_tab")
        all.isSelected==(index==null)&&tabs.indices.all {tabs[it].isSelected==(it==index)}
    }
    private fun runCases() {
        scenario("empty-home") {
            fresh(HomeReadPlan(emptyList()));diagnosticPhase="empty_await_rows";awaitRows();diagnosticPhase="empty_await_selected_tab";selectedRoom(null)
            diagnosticPhase="empty_await_status"
            ui.await("fixture_empty_status_missing") {ui.labels(home(),"home_room_status").singleOrNull()=="还没有设备"}
            capture("00-empty-home.png")
        }
        scenario("multiple-rooms-same-name-and-opaque-id") {
            diagnosticPhase="multi_fresh";fresh(HomeReadPlan(PublicHomeFixtures.multi));diagnosticPhase="multi_await_rows";awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            diagnosticPhase="multi_tab_count";check(ui.main {ui.views(home(),"home_room_tab").size}==4)
            diagnosticPhase="multi_tap_numeric_room";tapId("home_room_tab",1);diagnosticPhase="multi_rows_numeric_room";awaitRows(PublicHomeFixtures.B);diagnosticPhase="multi_selected_numeric_room";selectedRoom(1)
            diagnosticPhase="multi_tap_text_room";tapId("home_room_tab",2);diagnosticPhase="multi_rows_text_room";awaitRows(PublicHomeFixtures.C);diagnosticPhase="multi_selected_text_room";selectedRoom(2)
            capture("01-same-name-room.png");tapId("home_room_all");awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U);selectedRoom(null)
        }
        scenario("known-empty-room") {
            tapId("home_room_tab",3);awaitRows();selectedRoom(3)
            ui.await("fixture_room_empty_status_missing") {ui.labels(home(),"home_room_status").singleOrNull()=="此房间暂无设备"}
            capture("02-empty-room.png")
        }
        scenario("long-room-label-reachable") {
            fresh(HomeReadPlan(PublicHomeFixtures.long));awaitRows("Public Long-name Device")
            tapId("home_room_tab");selectedRoom(0);capture("03-long-room-name.png")
        }
        scenario("loading-and-offline-retain-confirmed-selection") {
            fresh(HomeReadPlan(PublicHomeFixtures.multi));awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            tapId("home_room_tab",0);awaitRows(PublicHomeFixtures.A)
            val plan=HomeReadPlan(PublicHomeFixtures.multi,fail=true,pending=true);app.fixtureHome.plan(plan);tapText("刷新")
            check(plan.entered.await(8,TimeUnit.SECONDS));ui.await("fixture_loading_missing") {ui.labels(home(),"home_room_status").singleOrNull()=="正在刷新设备…"}
            check(rows()==listOf(PublicHomeFixtures.A));selectedRoom(0);capture("04-loading-cache.png")
            plan.release.complete(Unit)
            ui.await("fixture_error_missing") {ui.labels(home(),"home_room_status").singleOrNull()?.startsWith("加载失败")==true}
            check(rows()==listOf(PublicHomeFixtures.A));selectedRoom(0);capture("05-error-cache.png")
            val reads=app.fixtureHome.reads.get();tapId("home_room_tab",1);awaitRows(PublicHomeFixtures.B);selectedRoom(1)
            check(app.fixtureHome.reads.get()==reads){"fixture_local_tab_dispatched_read"}
        }
        scenario("native-return-rejects-old-uncooperative-read") {
            val old=HomeReadPlan(PublicHomeFixtures.long,pending=true,uncooperative=true);app.fixtureHome.plan(old);tapText("刷新")
            check(old.entered.await(8,TimeUnit.SECONDS));val replacement=HomeReadPlan(PublicHomeFixtures.newer);app.fixtureHome.plan(replacement)
            tapId("home_rooms");ui.await("fixture_rooms_route_missing") {app.tracker.resumed is RoomsActivity&&app.tracker.resumed?.hasWindowFocus()==true}
            navigation.put(JSONObject().put("case","native-return-rejects-old-uncooperative-read").put("stage","entered").put("actualNativePage","RoomsActivity").put("resumedAndFocused",true))
            val dispatchesBeforeReturn=app.fixtureHome.reads.get()
            sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);awaitHome();ui.frame(home());ui.frame(home())
            check(app.fixtureHome.reads.get()==dispatchesBeforeReturn&&replacement.entered.count==1L){"fixture_old_io_slot_released_early"}
            old.release.complete(Unit);check(old.returned.await(8,TimeUnit.SECONDS))
            check(replacement.entered.await(8,TimeUnit.SECONDS)){"fixture_replacement_read_not_started"};awaitRows("Public Newer Device");ui.frame(home());ui.frame(home())
            check(rows()==listOf("Public Newer Device")&&replacement.expectedRevision==freshRevision)
            navigation.put(JSONObject().put("case",activeCase).put("stage","returned").put("fromPage","RoomsActivity").put("actualNativePage","HomeActivity")
                .put("resumedAndFocused",true).put("publicRowsMatched",true).put("lateReadIgnored",true).put("expectedRevisionMatched",true).put("actualReadHeldUntilOldReturn",true).put("replacementReadStartedAfterOldReturn",true))
            capture("06-return-old-read-rejected.png")
        }
        scenario("real-device-container-navigation-and-back") {
            fresh(HomeReadPlan(PublicHomeFixtures.multi));awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            tapId("home_device_open",0)
            ui.await("fixture_device_route_missing",15_000) {
                val page=app.tracker.resumed as? DeviceActivity
                page!=null&&page.nativeResumed&&page.authorizedContext()&&page.deviceId=="public-fixture-a"&&page.accountRevision==freshRevision&&page.hasWindowFocus()&&
                    ui.hasReactTestId(page,"rn-device-status")&&ui.hasReactTestId(page,"rn-device-close")
            }
            navigation.put(JSONObject().put("case","real-device-container-navigation-and-back").put("stage","entered").put("actualNativePage","DeviceActivity")
                .put("resumedAndFocused",true).put("publicDeviceAndExpectedRevisionMatched",true).put("actualRnTestIdsMounted",true))
            sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);awaitHome();awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            check(app.fixtureAccount.revision==freshRevision)
            navigation.put(JSONObject().put("case",activeCase).put("stage","returned").put("fromPage","DeviceActivity").put("actualNativePage","HomeActivity")
                .put("resumedAndFocused",true).put("publicRowsMatched",true).put("expectedRevisionMatched",true))
            capture("07-real-device-return.png")
        }
        scenario("old-account-read-cannot-populate-new-home") {
            val old=HomeReadPlan(PublicHomeFixtures.long,pending=true,uncooperative=true);app.fixtureHome.plan(old);tapText("刷新")
            check(old.entered.await(8,TimeUnit.SECONDS));runBlocking {app.fixtureAccount.login("public-b@example.test","public-fixture")}
            // A different native Home owner/revision is actually created, not just a state mirror.
            app.fixtureHome.plan(HomeReadPlan(PublicHomeFixtures.newer))
            startActivitySync(Intent(targetContext,HomeActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
            freshRevision=app.fixtureAccount.revision;awaitHome();awaitRows("Public Newer Device")
            old.release.complete(Unit);check(old.returned.await(8,TimeUnit.SECONDS));ui.frame(home());ui.frame(home())
            check(rows()==listOf("Public Newer Device")&&old.expectedRevision!=freshRevision)
            navigation.put(JSONObject().put("case",activeCase).put("stage","recreated").put("actualNativePage","HomeActivity")
                .put("resumedAndFocused",true).put("currentFixtureRevisionChanged",true).put("oldReadIgnored",true).put("publicRowsMatched",true))
            capture("08-account-revision-fence.png")
        }
        if(ui.id("home_selection_item")==0)results.put(JSONObject().put("id","s031-reviewed-draft-compatibility").put("result","blocked").put("code","selection_source_not_present").put("geometryResult","not_run").put("artifactNames",JSONArray()))
        else scenario("s031-reviewed-draft-compatibility") {
            fresh(HomeReadPlan(PublicHomeFixtures.multi));awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            val button=ui.main {ui.views(home(),"home_device_open").first()}
            ui.longPress(button) {ui.views(home(),"home_selection_count").any {it.isShown&&(it as? android.widget.TextView)?.text?.contains("1")==true}}
            tapId("home_selection_item",1)
            ui.await("fixture_selection_count_missing") {ui.labels(home(),"home_selection_count").any {it.contains("2")}}
            check(ui.main {ui.views(home(),"home_selection_item").count {(it as? CompoundButton)?.isChecked==true}}==2)
            check(ui.main {ui.views(home(),"home_room_tab").none {it.isEnabled}});capture("09-local-selection.png")
            tapId("home_selection_cancel");awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            val again=ui.main {ui.views(home(),"home_device_open").first()}
            ui.longPress(again) {ui.views(home(),"home_selection_count").any {it.isShown}}
            sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);awaitHome();awaitRows(PublicHomeFixtures.A,PublicHomeFixtures.B,PublicHomeFixtures.C,PublicHomeFixtures.U)
            // Delete/review/confirm is deliberately never tapped, even if another source later implements it.
        }
    }
    private fun capture(name:String) {
        diagnosticPhase="capture_first_frame"
        val page=home();ui.frame(page)
        fun guard():String=ui.main {
            check(app.tracker.resumed===page&&page.hasWindowFocus()&&!page.isFinishing&&!page.isDestroyed){"fixture_capture_wrong_window"}
            val context=app.fixtureAccount.contextSnapshot()
            check(context.revision==freshRevision&&!context.cleanupRequired&&context.session?.userId in setOf("public-fixture-a","public-fixture-b")){"fixture_capture_wrong_account"}
            ui.snapshot(page).toString()
        }
        diagnosticPhase="capture_before_guard"
        val before=guard()
        diagnosticPhase="capture_second_frame"
        val fence=ui.frame(page);check(guard()==before){"fixture_capture_changed_during_frame"}
        diagnosticPhase="capture_window_screenshot"
        val bitmap=uiAutomation.takeScreenshot(page.window)?:error("fixture_screenshot_null")
        diagnosticPhase="capture_compress_and_after_guard"
        val bytes=try {check(guard()==before){"fixture_capture_changed"};val out=ByteArrayOutputStream();check(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));out.toByteArray()}finally{bitmap.recycle()}
        check(bytes.size<=2*1024*1024&&capturedBytes+bytes.size<=16*1024*1024){"fixture_artifact_budget"}
        diagnosticPhase="capture_geometry"
        val geometry=JSONObject(before);checkGeometry(geometry)
        val directory=File(app.filesDir,"public-home-ui-fixtures/$runId").apply {check(mkdirs()||isDirectory)}
        diagnosticPhase="capture_private_write"
        File(directory,name).writeBytes(bytes);capturedBytes+=bytes.size;bitmaps[name]=bytes
        artifacts.put(JSONObject().put("caseId",activeCase).put("name",name).put("sha256",sha(bytes)).put("bytes",bytes.size)
            .put("realWindowFrame",true).put("semanticGuardBeforeAfter",true).put("geometry",geometry)
            .put("frameFence",JSONObject().put("requestedNanos",fence.requestedNanos).put("completedVsyncNanos",fence.completedVsyncNanos))
            .put("geometryResult","passed").put("visualResult","not_reviewed"))
    }
    private fun checkGeometry(snapshot:JSONObject) {
        val list=snapshot.getJSONArray("nodes");val controls=mutableListOf<IntArray>()
        var selected=0;val minimum=(48*snapshot.getDouble("density")).toInt()-1
        for(i in 0 until list.length()) {
            val node=list.getJSONObject(i);if(!node.optBoolean("clickable")||node.isNull("visibleBounds"))continue
            if(node.getString("id") !in setOf("home_room_all","home_room_tab","home_device_open","home_selection_item","home_selection_cancel","home_selection_done","home_selection_delete"))continue
            val a=node.getJSONArray("visibleBounds");val r=IntArray(4){a.getInt(it)}
            check(r[2]>r[0]&&r[3]>r[1]){"fixture_geometry_empty"}
            if(node.optBoolean("selected")&&node.getString("id") in setOf("home_room_all","home_room_tab")) {
                selected++;check(r[2]-r[0]>=minimum&&r[3]-r[1]>=minimum){"fixture_selected_tab_not_reachable"}
            }
            for(other in controls)check(minOf(r[2],other[2])<=maxOf(r[0],other[0])||minOf(r[3],other[3])<=maxOf(r[1],other[1])){"fixture_clickable_overlap"}
            controls+=r
        }
        // S031 editing disables tabs but preserves the same selected projection.
        check(selected==1){"fixture_selected_tab_geometry_missing"}
    }
    private fun export(name:String,bytes:ByteArray) {
        val encoded=Base64.encodeToString(bytes,Base64.NO_WRAP);val chunks=encoded.chunked(24*1024)
        chunks.forEachIndexed {index,chunk->sendStatus(1,Bundle().apply {
            putString("rowan_fixture_name",name);putInt("rowan_fixture_index",index);putInt("rowan_fixture_count",chunks.size)
            putString("rowan_fixture_sha256",sha(bytes));putString("rowan_fixture_data",chunk)
        })}
    }
    private fun sha(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
    private fun shaFile(file:File):String {
        val digest=MessageDigest.getInstance("SHA-256");file.inputStream().use {stream->
            val buffer=ByteArray(8192);while(true){val size=stream.read(buffer);if(size<0)break;digest.update(buffer,0,size)}
        };return digest.digest().joinToString(""){"%02x".format(it)}
    }
}

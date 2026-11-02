package com.rowan.iot.fixtures

import android.app.Activity
import android.app.Application
import android.os.Bundle
import com.rowan.iot.MainApplication
import com.rowan.iot.app.AppServices
import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.network.*
import com.rowan.iot.domain.rooms.RoomId
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.*
import org.json.JSONObject

/** Test APK only: no production setting, preferences, storage, URL, fixture Intent or exported entry. */
class FixtureApplication:MainApplication() {
    val gateway=NoBusinessNetworkGateway()
    private val memory=object:SessionStorage {
        @Volatile private var saved:String?=null
        override fun read()=saved
        override fun write(value:String?){saved=value}
    }
    val fixtureAccount=AccountService(gateway,memory)
    val fixtureHome=ControlledHomeRepository {fixtureAccount.contextSnapshot()}
    val tracker=FixtureActivities()
    override fun createServices()=AppServices(this,http=gateway,account=fixtureAccount,home=fixtureHome,selfUnbindJournalFactory={MemoryFixtureSelfUnbindJournal()})
    override fun onCreate(){registerActivityLifecycleCallbacks(tracker);super.onCreate()}
}

/** Handles public synthetic login only; no address, socket, URL client or backend delegate exists. */
class NoBusinessNetworkGateway:HttpGateway {
    val denied=AtomicInteger()
    override suspend fun request(method:String,path:String,body:JSONObject?,token:String?):JSONObject {
        if(method=="POST"&&path=="/api/app/session"&&body?.optString("account") in setOf("public-a@example.test","public-b@example.test")) {
            val who=if(body!!.getString("account")=="public-a@example.test")"public-fixture-a" else "public-fixture-b"
            return JSONObject().put("data",JSONObject().put("accessToken","public-not-a-credential")
                .put("refreshToken","public-not-a-refresh-token").put("userID",who).put("setting",JSONObject().put("language","zh-CN")))
        }
        // Real RoomsActivity may read this list during the native-return case. No mutation accepted.
        if(method=="GET"&&path=="/api/app/user/locations")return JSONObject("""{"data":[]}""")
        denied.incrementAndGet();throw ApiFailure(503,"public_fixture_network_disabled")
    }
}

class HomeReadPlan(val result:List<HomeGroup>,val fail:Boolean=false,val pending:Boolean=false,val uncooperative:Boolean=false) {
    val entered=CountDownLatch(1);val returned=CountDownLatch(1)
    val release=CompletableDeferred<Unit>().also {if(!pending)it.complete(Unit)}
    @Volatile var expectedRevision:Long?=null
}
class ControlledHomeRepository(private val account:()->AccountContext):HomeRepository {
    private val next=AtomicReference(HomeReadPlan(emptyList()))
    private val plans=java.util.concurrent.ConcurrentLinkedQueue<HomeReadPlan>()
    val reads=AtomicInteger()
    fun plan(value:HomeReadPlan){plans.add(value);next.set(value)}
    fun releaseAll(){plans.forEach {it.release.complete(Unit)}}
    override suspend fun loadGroups(expectedRevision:Long):List<HomeGroup> {
        currentCoroutineContext().ensureActive()
        val context=account()
        check(context.session!=null&&!context.cleanupRequired&&context.revision==expectedRevision){"fixture_session_changed"}
        val own=next.get();reads.incrementAndGet();own.expectedRevision=expectedRevision;own.entered.countDown()
        try {
            if(own.uncooperative)withContext(NonCancellable){own.release.await()} else own.release.await()
            if(own.fail)throw java.io.IOException("public_fixture_offline")
            return own.result.map {it.copy(devices=it.devices.toList())}
        }finally {own.returned.countDown()}
    }
}
class FixtureActivities:Application.ActivityLifecycleCallbacks {
    private val created=mutableListOf<java.lang.ref.WeakReference<Activity>>()
    @Volatile var resumed:Activity?=null
    val resumes=AtomicInteger()
    override fun onActivityResumed(activity:Activity){resumed=activity;resumes.incrementAndGet()}
    override fun onActivityPaused(activity:Activity){if(resumed===activity)resumed=null}
    override fun onActivityDestroyed(activity:Activity){if(resumed===activity)resumed=null}
    fun all():List<Activity> =created.mapNotNull {it.get()}.filterNot {it.isDestroyed}
    override fun onActivityCreated(activity:Activity,state:Bundle?){created.add(java.lang.ref.WeakReference(activity))}
    override fun onActivityStarted(activity:Activity)=Unit
    override fun onActivityStopped(activity:Activity)=Unit
    override fun onActivitySaveInstanceState(activity:Activity,state:Bundle)=Unit
}
object PublicHomeFixtures {
    const val A="Public Device A";const val B="Public Device B";const val C="Public Device C";const val U="Public Unknown-room Device"
    private fun device(id:String,label:String)=HomeDevice("public-fixture-$id",label)
    val multi=listOf(
        HomeGroup("Public Kitchen",listOf(device("a",A)),RoomId.Text("public-kitchen")),
        HomeGroup("Shared Public Room",listOf(device("b",B)),RoomId.Numeric(42)),
        HomeGroup("Shared Public Room",listOf(device("c",C)),RoomId.Text("42")),
        HomeGroup("Public Empty",emptyList(),RoomId.Text("public-empty")),
        HomeGroup(null,listOf(device("unknown",U)),null))
    val long=listOf(HomeGroup("Public long room name — "+"Long Public Label ".repeat(12),listOf(device("long","Public Long-name Device")),RoomId.Text("public-long")))
    val newer=listOf(HomeGroup("Public Newer Room",listOf(device("newer","Public Newer Device")),RoomId.Text("public-newer")))
}

/** Test APK only: no SharedPreferences/KeyStore/SessionStorage is touched by S096 recovery. */
private class MemoryFixtureSelfUnbindJournal:com.rowan.iot.domain.device.more.SelfUnbindRecoveryJournal {
    private val lock=Any()
    private val records=mutableMapOf<String,com.rowan.iot.domain.device.more.SelfUnbindRecord>()
    override suspend fun unresolved(userId:String)=synchronized(lock){records.values.filter {it.userId==userId&&it.phase in setOf(com.rowan.iot.domain.device.more.SelfUnbindPhase.UNKNOWN,com.rowan.iot.domain.device.more.SelfUnbindPhase.ACKNOWLEDGED,com.rowan.iot.domain.device.more.SelfUnbindPhase.ABSENCE_OBSERVED)}}
    override suspend fun load(key:String)=synchronized(lock){records[key]}
    override suspend fun reserve(candidate:com.rowan.iot.domain.device.more.SelfUnbindRecord)=synchronized(lock){records[candidate.key]?:candidate.also {records[it.key]=it}}
    override suspend fun complete(record:com.rowan.iot.domain.device.more.SelfUnbindRecord)=synchronized(lock){if(records[record.key]?.operationId!=record.operationId)false else{records[record.key]=record;true}}
}

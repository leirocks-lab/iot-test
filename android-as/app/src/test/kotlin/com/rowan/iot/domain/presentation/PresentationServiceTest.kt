package com.rowan.iot.domain.presentation

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.preferences.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.junit.Assert.*
import org.junit.Test

class PresentationServiceTest {
    private class SystemSource:PresentationSystemSource {
        var state=PresentationSystemState(true,PresentationSystemInput(listOf("en"),EffectiveTheme.LIGHT))
        var callback:(()->Unit)?=null;var late:(()->Unit)?=null;var observations=0;var releases=0;var fail=false
        override fun capture()=state
        override fun observe(changed:()->Unit):AutoCloseable {if(fail)throw IllegalStateException("fixture");observations++;callback=changed;late=changed;return AutoCloseable {releases++;callback=null}}
        fun signal(){callback?.invoke()}
    }
    private class Fixture(dispatcher:CoroutineDispatcher=Dispatchers.Unconfined) {
        val job=SupervisorJob();val scope=CoroutineScope(job+dispatcher)
        val account=MutableStateFlow(AccountContext(7,session("{}")))
        val system=SystemSource();var captures=0
        val service=PresentationService(scope,account,PresentationOwner({captures++;account.value}),system)
        fun close(){service.close();job.cancel()}
    }
    companion object {private fun session(raw:String,user:String="a",token:String="fixture")=AccountSession(token,"fixture-refresh",user,null,null,raw)}
    private fun ready(f:Fixture)=(f.service.capture() as PresentationRead.Ready).snapshot
    @Test fun startAndCloseAreIdempotentAndNeverRetainCallbacks():Unit=runBlocking {val f=Fixture();try{assertTrue(f.service.start());assertTrue(f.service.start());assertEquals(1,f.system.observations);f.service.close();f.service.close();assertEquals(1,f.system.releases);assertFalse(f.service.start());assertTrue(f.service.capture() is PresentationRead.Unavailable)}finally{f.close()}}
    @Test fun lateSourceCallbackAfterCloseReadsNoAccountAndEmitsNothing():Unit=runBlocking {val f=Fixture();try{f.service.start();val marker=f.service.invalidations.value;f.service.close();val captures=f.captures;f.system.late?.invoke();assertEquals(captures,f.captures);assertSame(marker,f.service.invalidations.value)}finally{f.close()}}
    @Test fun savedValuesWinAndUnknownUnitsRemainUnknown():Unit=runBlocking {val f=Fixture();try{f.account.value=AccountContext(7,session("""{"language":"zh-TW","theme":"dark"}"""));f.service.start();val p=ready(f);assertEquals(PreferenceLanguage.ZH_TW,p.language);assertEquals(EffectiveTheme.DARK,p.effectiveTheme);assertNull(p.temperatureUnit);assertNull(p.measurementSystem)}finally{f.close()}}
    @Test fun tokenAndOpaqueRawChangesDoNotInvalidate():Unit=runBlocking {val f=Fixture();try{f.service.start();val marker=f.service.invalidations.value;f.account.value=f.account.value.copy(session=session("""{"future":7}""",token="renewed"));assertSame(marker,f.service.invalidations.value)}finally{f.close()}}
    @Test fun backgroundKeepsOnlyDirtyThenForegroundEmitsLatestOnce():Unit=runBlocking {val f=Fixture();try{f.service.start();f.system.state=f.system.state.copy(active=false);f.system.signal();val marker=f.service.invalidations.value;repeat(100){f.account.value=f.account.value.copy(session=session(if(it%2==0)"""{"theme":"dark"}""" else "{}"))};assertSame(marker,f.service.invalidations.value);f.system.state=f.system.state.copy(active=true);f.system.signal();assertNotSame(marker,f.service.invalidations.value);val latest=f.service.invalidations.value;f.system.signal();assertSame(latest,f.service.invalidations.value);assertEquals(EffectiveTheme.LIGHT,ready(f).effectiveTheme)}finally{f.close()}}
    @Test fun fixedThemeIgnoresSystemAppearanceAndSystemThemeFollowsIt():Unit=runBlocking {val f=Fixture();try{f.account.value=AccountContext(7,session("""{"theme":"light"}"""));f.service.start();val marker=f.service.invalidations.value;f.system.state=PresentationSystemState(true,PresentationSystemInput(listOf("en"),EffectiveTheme.DARK));f.system.signal();assertSame(marker,f.service.invalidations.value);f.account.value=f.account.value.copy(session=session("""{"theme":"system"}"""));assertEquals(EffectiveTheme.DARK,ready(f).effectiveTheme)}finally{f.close()}}
    @Test fun unavailableSystemInputNeverReturnsLastAccountSnapshot():Unit=runBlocking {val f=Fixture();try{f.service.start();ready(f);f.system.state=PresentationSystemState(true,null);f.system.signal();assertTrue(f.service.capture() is PresentationRead.Unavailable);f.account.value=AccountContext(8,session("{}","b"));f.system.state=PresentationSystemState(true,PresentationSystemInput(listOf("zh-Hans"),EffectiveTheme.LIGHT));f.system.signal();assertEquals(8L,ready(f).accountRevision)}finally{f.close()}}
    @Test fun cleanupAndNextAccountCannotInheritPreviousChoices():Unit=runBlocking {val f=Fixture();try{f.account.value=AccountContext(7,session("""{"temperatureUnit":"F"}"""));f.service.start();assertEquals(TemperatureUnit.F,ready(f).temperatureUnit);f.account.value=f.account.value.copy(cleanupRequired=true);assertFalse(ready(f).authenticated);assertNull(ready(f).temperatureUnit);f.account.value=AccountContext(8,session("{}","b"));assertTrue(ready(f).authenticated);assertNull(ready(f).temperatureUnit)}finally{f.close()}}
    private class Queue:CoroutineDispatcher(){val tasks=java.util.ArrayDeque<Runnable>();override fun dispatch(context:kotlin.coroutines.CoroutineContext,block:Runnable){tasks.add(block)};fun drain(){var budget=1000;while(tasks.isNotEmpty()){check(budget-->0);tasks.removeFirst().run()}}}
    @Test fun queuedOldNotificationAlwaysCapturesCurrentAuthority():Unit=runBlocking {val q=Queue();val f=Fixture(q);try{f.service.start();f.account.value=AccountContext(8,session("""{"language":"zh-TW"}""","b"));q.drain();assertEquals(8L,ready(f).accountRevision);assertEquals(PreferenceLanguage.ZH_TW,ready(f).language)}finally{f.close();q.drain()}}
    @Test fun directCaptureIsFreshEvenBeforeQueuedAccountSignal():Unit=runBlocking {val q=Queue();val f=Fixture(q);try{f.service.start();f.account.value=AccountContext(8,session("{}","b"));assertEquals(8L,ready(f).accountRevision)}finally{f.close();q.drain()}}
    @Test fun parentCancellationReleasesSystemSubscription():Unit=runBlocking {val f=Fixture();f.service.start();f.job.cancel();yield();assertEquals(1,f.system.releases);assertFalse(f.service.start());assertTrue(f.service.capture() is PresentationRead.Unavailable)}
    @Test fun failedRegistrationDoesNotInstallAccountObserverOrFakeReady():Unit=runBlocking {val f=Fixture();try{f.system.fail=true;assertFalse(f.service.start());assertTrue(f.service.capture() is PresentationRead.Unavailable);assertEquals(0,f.captures);f.system.fail=false;assertTrue(f.service.start());assertEquals(7L,ready(f).accountRevision)}finally{f.close()}}
}

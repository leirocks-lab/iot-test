package com.rowan.iot.domain.preferences

import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class PreferencesServiceTest {
    private class Repository : PreferencesRepository {
        override val expectedRevision = 7L
        var server = JSONObject("""{"language":"zh-CN","notification":false,"theme":"light","temperatureUnit":"C","measurementSystem":"metric","future":{"nested":7}}""")
        val calls = mutableListOf<String>()
        var getHook: suspend () -> Unit = {}
        var patchHook: suspend (PreferencesPatch) -> Unit = {}
        override suspend fun load(): UserPreferences {
            calls += "GET"; getHook()
            return UserPreferences.decode(server.toString())
        }
        override suspend fun patch(patch: PreferencesPatch) {
            calls += "PATCH"; patchHook(patch)
            val body = patch.toJson()
            body.keys().asSequence().forEach { server.put(it, body.get(it)) }
        }
    }
    private class Fixture {
        val repo = Repository()
        var current = true
        val committed = mutableListOf<Pair<Long, String>>()
        var commitHook: suspend () -> Unit = {}
        val service = PreferencesService(repo, { current }, { revision, raw, _ ->
            commitHook(); committed += revision to raw
        })
    }

    @Test fun saveIsPatchThenAuthoritativeGetAndCommitBeforeConfirmedPublication(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear(); f.committed.clear()
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK))
        assertEquals(listOf("PATCH", "GET"), f.repo.calls)
        assertEquals(7L, f.committed.single().first)
        assertEquals(7, JSONObject(f.committed.single().second).getJSONObject("future").getInt("nested"))
        assertEquals(PreferenceTheme.DARK, f.service.state.value.preferences!!.theme)
        assertFalse(f.service.state.value.busy); assertFalse(f.service.state.value.resultUnknown)
    }

    @Test fun independentConcurrentChangesAreSerializedThroughTheirOwnReadback(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear()
        val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        var patches = 0
        f.repo.patchHook = { if (++patches == 1) { entered.complete(Unit); finish.await() } }
        val first = async { f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK)) }
        entered.await()
        val second = async(start = CoroutineStart.UNDISPATCHED) { f.service.save(PreferencesPatch(notification = true)) }
        assertEquals(listOf("PATCH"), f.repo.calls)
        finish.complete(Unit); first.await(); second.await()
        assertEquals(listOf("PATCH", "GET", "PATCH", "GET"), f.repo.calls)
        assertEquals(PreferenceTheme.DARK, f.service.state.value.preferences!!.theme)
        assertEquals(true, f.service.state.value.preferences!!.notification)
    }

    @Test fun timeoutLocksUnknownResultUntilReadAndNeverReplaysTheOldPatch(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear()
        f.repo.patchHook = { throw java.net.SocketTimeoutException() }
        f.service.save(PreferencesPatch(notification = true))
        assertTrue(f.service.state.value.resultUnknown)
        assertEquals(false, f.service.state.value.preferences!!.notification)
        f.service.save(PreferencesPatch(notification = true))
        assertEquals(listOf("PATCH"), f.repo.calls)
        f.repo.patchHook = {}; f.service.load()
        assertFalse(f.service.state.value.resultUnknown)
        assertEquals(listOf("PATCH", "GET"), f.repo.calls)
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK))
        assertEquals(listOf("PATCH", "GET", "PATCH", "GET"), f.repo.calls)
    }

    @Test fun successfulPatchFollowedByFailedReadDoesNotInventConfirmedValues(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear(); f.committed.clear()
        f.repo.getHook = { throw ApiFailure(503, "fixture unavailable") }
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK))
        assertEquals(listOf("PATCH", "GET"), f.repo.calls)
        assertEquals(PreferenceTheme.LIGHT, f.service.state.value.preferences!!.theme)
        assertTrue(f.service.state.value.resultUnknown); assertTrue(f.committed.isEmpty())
    }

    @Test fun readbackThatDoesNotMatchEveryExplicitChangeRemainsUnknown(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear()
        f.repo.getHook = { f.repo.server.put("notification", false) }
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK, notification = true))
        assertTrue(f.service.state.value.resultUnknown)
        assertEquals(PreferenceTheme.LIGHT, f.service.state.value.preferences!!.theme)
        assertEquals(listOf("PATCH", "GET"), f.repo.calls)
    }

    @Test fun cancellationAfterMutationDispatchKeepsUnknownAndCannotReplayOnReturn(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear()
        val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        f.repo.patchHook = { entered.complete(Unit); withContext(NonCancellable) { finish.await() } }
        val work = launch { f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK)) }
        entered.await(); work.cancel(); finish.complete(Unit); work.join()
        assertTrue(work.isCancelled)
        assertTrue(f.service.state.value.resultUnknown); assertFalse(f.service.state.value.busy)
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK))
        assertEquals(listOf("PATCH"), f.repo.calls)
    }

    @Test fun aLateOldAccountReadCannotPublishOrCommitPrivateSettings(): Unit = runBlocking {
        val f = Fixture(); val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        f.repo.getHook = { entered.complete(Unit); withContext(NonCancellable) { finish.await() } }
        val reading = async { f.service.load() }
        entered.await(); f.current = false; finish.complete(Unit); reading.await()
        assertNull(f.service.state.value.preferences)
        assertTrue(f.service.state.value.sessionExpired); assertTrue(f.committed.isEmpty())
    }

    @Test fun localCommitFailureCannotReportServerMutationAsFullyConfirmed(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.committed.clear()
        f.commitHook = { throw java.io.IOException("fixture disk failure") }
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK))
        assertEquals(PreferenceTheme.LIGHT, f.service.state.value.preferences!!.theme)
        assertTrue(f.service.state.value.resultUnknown)
        assertTrue(f.committed.isEmpty()); assertNotNull(f.service.state.value.error)
    }

    @Test fun cancellingAQueuedCallerDoesNotMarkAnotherCallUnknownOrDispatchItsPatch(): Unit = runBlocking {
        val f = Fixture(); f.service.load(); f.repo.calls.clear()
        val entered = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        f.repo.patchHook = { entered.complete(Unit); finish.await() }
        val first = async { f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK)) }
        entered.await()
        val queued = launch(start = CoroutineStart.UNDISPATCHED) { f.service.save(PreferencesPatch(notification = true)) }
        queued.cancelAndJoin()
        assertTrue(f.service.state.value.busy); assertFalse(f.service.state.value.resultUnknown)
        finish.complete(Unit); first.await()
        assertEquals(listOf("PATCH", "GET"), f.repo.calls)
        assertFalse(f.service.state.value.resultUnknown)
    }

    @Test fun saveBeforeSuccessfulLoadCannotWriteWithInventedDefaults(): Unit = runBlocking {
        val f = Fixture()
        f.service.save(PreferencesPatch(theme = PreferenceTheme.DARK))
        assertTrue(f.repo.calls.isEmpty()); assertNull(f.service.state.value.preferences)
    }

    @Test fun temperatureOnlyUpdatePreservesEvenAnUnknownMeasurementPreference(): Unit = runBlocking {
        val f = Fixture(); f.repo.server.put("measurementSystem", "future-system")
        f.service.load(); f.repo.calls.clear()
        f.service.save(PreferencesPatch(temperatureUnit = TemperatureUnit.F))
        val value = f.service.state.value.preferences!!
        assertEquals(TemperatureUnit.F, value.temperatureUnit); assertNull(value.measurementSystem)
        assertEquals("future-system", JSONObject(value.rawJson).getString("measurementSystem"))
        assertFalse(f.service.state.value.resultUnknown)
    }

    @Test fun initialGetFailureHasNoDefaultsOrLanguageAppliedClaim(): Unit = runBlocking {
        val f = Fixture(); f.repo.getHook = { throw ApiFailure(503, "fixture unavailable") }
        f.service.load()
        assertNull(f.service.state.value.preferences); assertNotNull(f.service.state.value.error)
        assertFalse(f.service.state.value.busy); assertFalse(f.service.state.value.resultUnknown)
        assertTrue(f.committed.isEmpty())
    }

    @Test fun separatePageServicesShareTheWholeReadPatchReadCommitTransaction():Unit=runBlocking {
        val gate=PreferencesTransactionGate();val a=Repository();val b=Repository();b.server=a.server
        val committed=mutableListOf<String>()
        fun page(repo:Repository)=PreferencesService(repo,{true},{_,raw,_->committed+=raw},transactionGate=gate)
        val first=page(a);val second=page(b);second.load();a.calls.clear();b.calls.clear()
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        a.getHook={entered.complete(Unit);finish.await()}
        val read=async {first.load()};entered.await()
        val save=async(start=CoroutineStart.UNDISPATCHED){second.save(PreferencesPatch(theme=PreferenceTheme.DARK))}
        assertTrue(b.calls.isEmpty()) // A stale GET may not complete after B's confirmed PATCH.
        finish.complete(Unit);read.await();save.await()
        assertEquals(listOf("PATCH","GET"),b.calls)
        assertEquals("dark",JSONObject(committed.last()).getString("theme"))
    }
    @Test fun cancellingOldPageRetainsSharedPermitUntilActualReadEnds():Unit=runBlocking {
        val gate=PreferencesTransactionGate();val a=Repository();val b=Repository()
        fun page(repo:Repository)=PreferencesService(repo,{true},{_,_,_->},transactionGate=gate)
        val first=page(a);val second=page(b);second.load();b.calls.clear()
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        a.getHook={entered.complete(Unit);withContext(NonCancellable){finish.await()}}
        val read=launch {first.load()};entered.await();read.cancel()
        val save=async(start=CoroutineStart.UNDISPATCHED){second.save(PreferencesPatch(theme=PreferenceTheme.DARK))}
        assertTrue(b.calls.isEmpty());assertFalse(read.isCompleted)
        finish.complete(Unit);read.join();save.await()
        assertEquals(listOf("PATCH","GET"),b.calls)
    }
    @Test fun unknownMutationBlocksAnotherPageUntilExplicitReadWithoutReplay():Unit=runBlocking {
        val gate=PreferencesTransactionGate();val a=Repository();val b=Repository()
        fun page(repo:Repository)=PreferencesService(repo,{true},{_,_,_->},transactionGate=gate)
        val first=page(a);val second=page(b);first.load();second.load();a.calls.clear();b.calls.clear()
        a.patchHook={throw java.net.SocketTimeoutException()}
        first.save(PreferencesPatch(theme=PreferenceTheme.DARK))
        second.save(PreferencesPatch(theme=PreferenceTheme.DARK));assertTrue(b.calls.isEmpty())
        second.load();second.save(PreferencesPatch(theme=PreferenceTheme.DARK))
        assertEquals(listOf("GET","PATCH","GET"),b.calls);assertEquals(listOf("PATCH"),a.calls)
    }


    @Test fun oldPageCannotResurrectUnknownAfterAnotherPageConfirmedRead():Unit=runBlocking {
        val gate=PreferencesTransactionGate();val a=Repository();val b=Repository()
        fun page(repo:Repository)=PreferencesService(repo,{true},{_,_,_->},transactionGate=gate)
        val first=page(a);val second=page(b);first.load();second.load()
        a.patchHook={throw java.net.SocketTimeoutException()}
        first.save(PreferencesPatch(theme=PreferenceTheme.DARK));assertTrue(first.state.value.resultUnknown)
        second.load();assertFalse(second.state.value.resultUnknown)
        a.getHook={throw ApiFailure(503,"fixture read failed")}
        first.load();assertFalse(first.state.value.resultUnknown)
        b.calls.clear();second.save(PreferencesPatch(notification=true))
        assertEquals(listOf("PATCH","GET"),b.calls);assertFalse(second.state.value.resultUnknown)
        // A stale local unknown also cannot block its own explicit new user action.
        a.getHook={};a.patchHook={};first.save(PreferencesPatch(theme=PreferenceTheme.DARK))
        assertFalse(first.state.value.resultUnknown)
        a.patchHook={throw java.net.SocketTimeoutException()};first.save(PreferencesPatch(notification=true))
        second.load();a.patchHook={};a.calls.clear()
        first.save(PreferencesPatch(theme=PreferenceTheme.LIGHT)) // Direct save with stale A-local unknown.
        assertEquals(listOf("PATCH","GET"),a.calls);assertFalse(first.state.value.resultUnknown)
        // A genuinely new uncertain mutation still becomes authoritative to every page.
        a.patchHook={throw java.net.SocketTimeoutException()};first.save(PreferencesPatch(notification=true))
        b.calls.clear();second.save(PreferencesPatch(theme=PreferenceTheme.LIGHT))
        assertTrue(b.calls.isEmpty());assertTrue(second.state.value.resultUnknown)
    }

}

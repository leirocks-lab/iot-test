package com.rowan.iot.domain.home

import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.rooms.RoomId
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

/** Public metadata fixtures; deferred barriers control late/uncooperative responses. */
class HomeRoomTabsTest {
    private val kitchen=RoomId.Text("room/kitchen")
    private val study=RoomId.Numeric(42)
    private fun group(id:RoomId?,name:String="Room",device:String="device")=
        HomeGroup(name,listOf(HomeDevice(device,device)),id)
    private class Repo(var work:suspend()->List<HomeGroup>):HomeRepository {
        var reads=0
        override suspend fun loadGroups(expectedRevision:Long):List<HomeGroup> {assertEquals(7L,expectedRevision);reads++;return work()}
    }
    @Test fun allAndRoomSelectionOnlyProjectLoadedGroups():Unit=runBlocking {
        val repo=Repo {listOf(group(kitchen,device="a"),group(study,device="b"))}
        val owner=HomeRoomTabs(repo,7,{true});owner.reload()
        assertEquals(listOf("a","b"),owner.state.value.visibleGroups.flatMap {it.devices}.map {it.id})
        owner.select(study)
        assertEquals(listOf("b"),owner.state.value.visibleGroups.flatMap {it.devices}.map {it.id})
        owner.select(null);assertEquals(2,owner.state.value.visibleGroups.size);assertEquals(1,repo.reads)
    }
    @Test fun sameNameRoomsRemainDistinctAndNumericIdDoesNotEqualText():Unit=runBlocking {
        val repo=Repo {listOf(group(RoomId.Text("42"),device="a"),group(study,device="b"))}
        val owner=HomeRoomTabs(repo,7,{true});owner.reload();owner.select(study)
        assertEquals(listOf("b"),owner.state.value.visibleGroups.single().devices.map {it.id})
        assertEquals(2,owner.state.value.tabs.size)
    }
    @Test fun unknownRoomIdentityNeverBecomesUnassignedOrSelectable():Unit=runBlocking {
        val owner=HomeRoomTabs(Repo {listOf(group(null))},7,{true});owner.reload()
        assertTrue(owner.state.value.tabs.isEmpty());assertEquals(1,owner.state.value.visibleGroups.size)
        owner.select(kitchen);assertNull(owner.state.value.selectedRoomId)
    }
    @Test fun emptyRoomHasTabAndRoomSpecificEmptyState():Unit=runBlocking {
        val owner=HomeRoomTabs(Repo {listOf(HomeGroup("Empty",emptyList(),kitchen))},7,{true});owner.reload();owner.select(kitchen)
        assertTrue(owner.state.value.loaded);assertTrue(owner.state.value.empty);assertEquals(kitchen,owner.state.value.tabs.single().id)
    }
    @Test fun refreshPreservesSelectionByOpaqueIdAndUsesNewRoomName():Unit=runBlocking {
        val repo=Repo {listOf(group(kitchen,"Before"))};val owner=HomeRoomTabs(repo,7,{true});owner.reload();owner.select(kitchen)
        repo.work={listOf(group(kitchen,"After", "new"))};owner.reload()
        assertEquals(kitchen,owner.state.value.selectedRoomId);assertEquals("After",owner.state.value.tabs.single().name)
        assertEquals("new",owner.state.value.visibleGroups.single().devices.single().id)
    }
    @Test fun deletedSelectedRoomFallsBackToAllOnlyAfterSuccessfulRefresh():Unit=runBlocking {
        val repo=Repo {listOf(group(kitchen))};val owner=HomeRoomTabs(repo,7,{true});owner.reload();owner.select(kitchen)
        repo.work={emptyList()};owner.reload();assertNull(owner.state.value.selectedRoomId);assertTrue(owner.state.value.empty)
    }
    @Test fun offlineFailureKeepsConfirmedDataAndAllowsLocalSwitch():Unit=runBlocking {
        val repo=Repo {listOf(group(kitchen,device="a"),group(study,device="b"))};val owner=HomeRoomTabs(repo,7,{true});owner.reload()
        repo.work={throw IllegalStateException("sensitive server text")};owner.reload();owner.select(study)
        assertEquals("b",owner.state.value.visibleGroups.single().devices.single().id)
        assertEquals("read_failed",owner.state.value.errorCode);assertFalse(owner.state.value.loading)
    }
    @Test fun initialFailureIsNotAConfirmedEmptyHome():Unit=runBlocking {
        val owner=HomeRoomTabs(Repo {throw IllegalStateException()},7,{true});owner.reload()
        assertFalse(owner.state.value.loaded);assertFalse(owner.state.value.empty);assertEquals("read_failed",owner.state.value.errorCode)
    }
    @Test fun selectedTabChangedDuringReadIsNotOverwrittenByCapturedSelection():Unit=runBlocking {
        val gate=CompletableDeferred<Unit>();val repo=Repo {listOf(group(kitchen,device="a"),group(study,device="b"))}
        val owner=HomeRoomTabs(repo,7,{true});owner.reload();repo.work={gate.await();listOf(group(kitchen,device="new-a"),group(study,device="new-b"))}
        val read=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};assertTrue(owner.state.value.loading)
        owner.select(study);gate.complete(Unit);read.join();assertEquals(study,owner.state.value.selectedRoomId)
    }
    @Test fun oldUncooperativeSuccessCannotOverwriteNewRefresh():Unit=runBlocking {
        val gate=CompletableDeferred<Unit>();val repo=Repo {withContext(NonCancellable){gate.await()};listOf(group(kitchen,device="old"))}
        val owner=HomeRoomTabs(repo,7,{true});val old=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()}
        repo.work={listOf(group(study,device="new"))};val fresh=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};assertEquals(1,repo.reads);gate.complete(Unit);old.join();fresh.join()
        assertEquals("new",owner.state.value.visibleGroups.single().devices.single().id)
    }
    @Test fun oldFailureCannotClearNewDataOrBusyState():Unit=runBlocking {
        val gate=CompletableDeferred<Unit>();val repo=Repo {withContext(NonCancellable){gate.await()};throw IllegalStateException()}
        val owner=HomeRoomTabs(repo,7,{true});val old=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()}
        repo.work={listOf(group(study))};val fresh=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};assertEquals(1,repo.reads);gate.complete(Unit);old.join();fresh.join()
        assertNull(owner.state.value.errorCode);assertTrue(owner.state.value.loaded)
    }
    @Test fun accountChangeBeforeLoadHasZeroDispatchAndClearsSelection():Unit=runBlocking {
        var current=true;val repo=Repo {listOf(group(kitchen))};val owner=HomeRoomTabs(repo,7,{current});owner.reload();owner.select(kitchen)
        current=false;owner.reload();assertEquals(1,repo.reads);assertTrue(owner.state.value.sessionExpired)
        assertTrue(owner.state.value.groups.isEmpty());assertNull(owner.state.value.selectedRoomId)
    }
    @Test fun accountChangeAfterDispatchDropsLateResponse():Unit=runBlocking {
        var current=true;val gate=CompletableDeferred<Unit>();val owner=HomeRoomTabs(Repo {withContext(NonCancellable){gate.await()};listOf(group(kitchen))},7,{current})
        val read=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};current=false;gate.complete(Unit);read.join()
        assertTrue(owner.state.value.sessionExpired);assertTrue(owner.state.value.groups.isEmpty())
    }
    @Test fun pageCancellationRetiresReadWithoutDeletingConfirmedOfflineList():Unit=runBlocking {
        val gate=CompletableDeferred<Unit>();val repo=Repo {listOf(group(kitchen))};val owner=HomeRoomTabs(repo,7,{true});owner.reload()
        repo.work={withContext(NonCancellable){gate.await()};listOf(group(study))}
        val read=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};owner.cancelLoad();read.cancel();gate.complete(Unit);read.join()
        assertEquals(kitchen,owner.state.value.groups.single().roomId);assertFalse(owner.state.value.loading)
    }
    @Test fun closingOwnerRejectsLateSuccessAndFutureReads():Unit=runBlocking {
        val gate=CompletableDeferred<Unit>();val repo=Repo {withContext(NonCancellable){gate.await()};listOf(group(kitchen))}
        val owner=HomeRoomTabs(repo,7,{true});val read=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};owner.close();gate.complete(Unit);read.join();owner.reload()
        assertEquals(1,repo.reads);assertTrue(owner.state.value.groups.isEmpty())
    }
    @Test fun nativeDeviceEntryRequiresCurrentlyVisibleMetadataAndCurrentAccount():Unit=runBlocking {
        var current=true;val owner=HomeRoomTabs(Repo {listOf(group(kitchen,device="a"),group(study,device="b"))},7,{current})
        owner.reload();assertNotNull(owner.deviceForOpen("a"));owner.select(study)
        assertNull(owner.deviceForOpen("a"));assertNotNull(owner.deviceForOpen("b"))
        current=false;assertNull(owner.deviceForOpen("b"));assertTrue(owner.state.value.groups.isEmpty())
    }
    @Test fun preCancelledCallerCannotRetireAnotherPendingRead():Unit=runBlocking {
        val gate=CompletableDeferred<Unit>();val repo=Repo {gate.await();listOf(group(kitchen,device="live"))}
        val owner=HomeRoomTabs(repo,7,{true})
        val live=launch(start=CoroutineStart.UNDISPATCHED){owner.reload()};val before=owner.state.value
        val cancelledParent=Job().apply {cancel()}
        val cancelled=launch(cancelledParent,start=CoroutineStart.UNDISPATCHED){runCatching {owner.reload()}}
        cancelled.join();assertEquals(1,repo.reads);assertEquals(before,owner.state.value)
        gate.complete(Unit);live.join();assertEquals("live",owner.state.value.visibleGroups.single().devices.single().id)
        assertFalse(owner.state.value.loading)
    }
}

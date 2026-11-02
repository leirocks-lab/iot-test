package com.rowan.iot.domain.home

import com.rowan.iot.domain.device.HomeDevice
import com.rowan.iot.domain.device.HomeGroup
import com.rowan.iot.domain.rooms.RoomId
import org.junit.Assert.*
import org.junit.Test

/** Local selection/review only. No HTTP fixture, deletion stub or fake success path exists. */
class HomeSelectionTest {
    private val a=HomeDevice("device/a","A")
    private val b=HomeDevice("device/b","B")
    private fun home(vararg devices:HomeDevice,loading:Boolean=false,loaded:Boolean=true,error:String?=null)=
        HomeRoomState(groups=listOf(HomeGroup("Room",devices.toList(),RoomId.Text("room"))),loaded=loaded,loading=loading,errorCode=error)
    private fun owner(vararg devices:HomeDevice)=HomeSelection {true}.apply {sync(home(*devices))}
    @Test fun longPressStartsEditingAndSelectsOnlyCurrentDevice() {
        val x=owner(a,b);assertTrue(x.begin(a.id,x.inputEpoch));assertTrue(x.state.value.editing)
        assertEquals(listOf(a),x.state.value.selected);assertFalse(x.state.value.isSelected(b.id))
    }
    @Test fun unknownOrOldVisibleDeviceCannotStartEditing() {
        val x=owner(a);assertFalse(x.begin(b.id,x.inputEpoch));assertFalse(x.state.value.editing)
        assertNull(x.requestReview(x.inputEpoch))
    }
    @Test fun toggleCanDeselectLastItemWithoutExitingEditing() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);x.toggle(b.id,x.inputEpoch);x.toggle(a.id,x.inputEpoch);x.toggle(b.id,x.inputEpoch)
        assertTrue(x.state.value.editing);assertEquals(0,x.state.value.selected.size);assertNull(x.requestReview(x.inputEpoch))
    }
    @Test fun aSecondLongPressDoesNotDiscardPreviousSelection() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);x.begin(b.id,x.inputEpoch)
        assertEquals(listOf(a,b),x.state.value.selected)
    }
    @Test fun tappingWithoutEditingDoesNotImplicitlySelect() {
        val x=owner(a);assertFalse(x.toggle(a.id,x.inputEpoch));assertFalse(x.state.value.editing)
    }
    @Test fun explicitExitClearsSelectionAndReview() {
        val x=owner(a);x.begin(a.id,x.inputEpoch);x.requestReview(x.inputEpoch);x.exit()
        assertFalse(x.state.value.editing);assertTrue(x.state.value.selected.isEmpty());assertNull(x.state.value.review)
    }
    @Test fun successfulRefreshPrunesRemovedIdsAndUsesLatestNickname() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);x.toggle(b.id,x.inputEpoch)
        x.sync(home(b.copy(nickname="Renamed")))
        assertEquals(listOf(b.copy(nickname="Renamed")),x.state.value.selected)
        assertEquals("selection_changed",x.state.value.errorCode)
    }
    @Test fun selectionCannotRetainDevicesHiddenByAProgrammaticRoomChange() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);x.sync(home(b));assertTrue(x.state.value.selected.isEmpty())
        assertFalse(x.toggle(a.id,x.inputEpoch))
    }
    @Test fun loadingRetainsSelectionButBlocksNewInputAndConfirmation() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);val review=x.requestReview(x.inputEpoch)!!
        x.sync(home(a,b,loading=true));assertEquals(listOf(a),x.state.value.selected);assertNull(x.state.value.review)
        assertFalse(x.toggle(b.id,x.inputEpoch));assertNull(x.requestReview(x.inputEpoch));assertFalse(x.confirm(review.ticket))
    }
    @Test fun confirmedOfflineCacheAllowsLocalSelectionWithoutInventingDeletePermission() {
        val x=owner(a,b);x.sync(home(a,b,error="read_failed"));assertTrue(x.begin(a.id,x.inputEpoch))
        val review=x.requestReview(x.inputEpoch)!!;assertFalse(x.confirm(review.ticket))
        assertEquals("removal_unavailable",x.state.value.errorCode);assertEquals(listOf(a),x.state.value.selected)
    }
    @Test fun initialReadFailureCannotSelectOrConfirmAnEmptyUnloadedList() {
        val x=HomeSelection {true};x.sync(home(a,loaded=false,error="read_failed"))
        assertFalse(x.begin(a.id,x.inputEpoch));assertNull(x.requestReview(x.inputEpoch))
    }
    @Test fun reviewIsAnExactSelectionSnapshotAndInputChangesInvalidateIt() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);val review=x.requestReview(x.inputEpoch)!!
        assertEquals(listOf(a),review.devices);x.toggle(b.id,x.inputEpoch)
        assertNull(x.state.value.review);assertFalse(x.confirm(review.ticket));assertEquals(2,x.state.value.selected.size)
    }
    @Test fun aRenameRefreshInvalidatesOldReviewWithoutDeletingSelection() {
        val x=owner(a);x.begin(a.id,x.inputEpoch);val review=x.requestReview(x.inputEpoch)!!
        x.sync(home(a.copy(nickname="Latest")));assertNull(x.state.value.review);assertFalse(x.confirm(review.ticket))
        assertEquals("Latest",x.state.value.selected.single().nickname)
    }
    @Test fun lateCancelOfOldReviewDoesNotDismissNewReview() {
        val x=owner(a);x.begin(a.id,x.inputEpoch);val first=x.requestReview(x.inputEpoch)!!
        x.cancelReview(first.ticket);val second=x.requestReview(x.inputEpoch)!!;x.cancelReview(first.ticket)
        assertEquals(second,x.state.value.review);assertFalse(x.confirm(first.ticket));assertEquals(second,x.state.value.review)
    }
    @Test fun defaultDenyNeverReportsRemovalOrDropsMetadata() {
        val x=owner(a,b);x.begin(a.id,x.inputEpoch);x.toggle(b.id,x.inputEpoch);val review=x.requestReview(x.inputEpoch)!!
        assertFalse(x.confirm(review.ticket));assertEquals(listOf(a,b),x.state.value.selected)
        assertTrue(x.state.value.editing);assertNull(x.state.value.review);assertEquals("removal_unavailable",x.state.value.errorCode)
        // A second confirm cannot replay even local work; a fresh explicit review is still unavailable.
        assertFalse(x.confirm(review.ticket));assertFalse(x.confirm(x.requestReview(x.inputEpoch)!!.ticket))
    }
    @Test fun accountChangeClearsSelectionAndOldReviewCannotAffectNewContext() {
        var current=true;val x=HomeSelection {current};x.sync(home(a));x.begin(a.id,x.inputEpoch);val review=x.requestReview(x.inputEpoch)!!
        current=false;x.accountChanged();assertTrue(x.state.value.sessionExpired);assertTrue(x.state.value.selected.isEmpty())
        assertFalse(x.confirm(review.ticket));assertFalse(x.begin(a.id,x.inputEpoch))
    }
    @Test fun accountChangeBeforeConfirmHasNoSuccessfulOutcomeEvenWithoutNotification() {
        var current=true;val x=HomeSelection {current};x.sync(home(a));x.begin(a.id,x.inputEpoch);val review=x.requestReview(x.inputEpoch)!!
        current=false;assertFalse(x.confirm(review.ticket));assertTrue(x.state.value.sessionExpired)
    }
    @Test fun leavingPageClearsReviewAndRejectsLateInputsUntilAnewAppearance() {
        val x=owner(a);val old=x.inputEpoch;x.begin(a.id,old);val review=x.requestReview(old)!!;x.leave()
        assertFalse(x.begin(a.id,old));assertFalse(x.confirm(review.ticket));assertFalse(x.state.value.editing)
        x.appear();x.sync(home(a));assertFalse(x.begin(a.id,old));assertTrue(x.begin(a.id,x.inputEpoch))
    }
    @Test fun staleRefreshOrButtonAfterPageLeaveCannotRestoreEditing() {
        val x=owner(a);val old=x.inputEpoch;x.begin(a.id,old);x.leave();x.sync(home(a,b))
        assertFalse(x.state.value.editing);assertTrue(x.state.value.selected.isEmpty());assertFalse(x.toggle(b.id,old))
    }
    @Test fun closeIsPermanentEvenIfAviewTriesToReappear() {
        val x=owner(a);x.begin(a.id,x.inputEpoch);x.close();x.appear();x.sync(home(a))
        assertFalse(x.begin(a.id,x.inputEpoch));assertTrue(x.state.value.selected.isEmpty())
    }
    @Test fun canonicallyEquivalentUnicodeDeviceIdsRemainDistinct() {
        val nfc=HomeDevice("\u00e9","same");val nfd=HomeDevice("e\u0301","same");val x=owner(nfc,nfd)
        x.begin(nfc.id,x.inputEpoch);assertFalse(x.state.value.isSelected(nfd.id));x.toggle(nfd.id,x.inputEpoch)
        assertEquals(2,x.state.value.selected.size);x.sync(home(nfd));assertEquals(listOf(nfd),x.state.value.selected)
    }
}

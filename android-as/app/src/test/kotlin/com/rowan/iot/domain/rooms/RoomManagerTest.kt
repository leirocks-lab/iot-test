package com.rowan.iot.domain.rooms

import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

class RoomManagerTest {
    private val room = Room(RoomId.Text("a"), "客厅", false, 0)
    private open class Repository : RoomRepository {
        override suspend fun load(): List<Room> = emptyList()
        override suspend fun create(name: String): List<Room> = emptyList()
        override suspend fun rename(id: RoomId, name: String): List<Room> = emptyList()
        override suspend fun saveLayout(baseline: List<Room>, orderedIds: List<RoomId>): List<Room> = emptyList()
    }
    @Test fun duplicateSubmissionIsRejectedRatherThanQueued() = runBlocking {
        val started = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>(); var posts = 0
        val manager = RoomManager(object : Repository() {
            override suspend fun create(name: String): List<Room> { posts++; started.complete(Unit); finish.await(); return listOf(room) }
        }, { true })
        manager.load()
        val first = async { manager.create("客厅") }; started.await()
        manager.create("第二个")
        assertEquals(1, posts)
        finish.complete(Unit); first.await(); assertFalse(manager.state.value.busy)
    }
    @Test fun unknownMutationRequiresReadBeforeNewUserActionAndIsNotReplayed() = runBlocking {
        var posts = 0
        val manager = RoomManager(object : Repository() {
            override suspend fun create(name: String): List<Room> { posts++; throw RoomResultUnknown() }
        }, { true })
        manager.load(); manager.create("客厅"); manager.create("客厅")
        assertEquals(1, posts); assertTrue(manager.state.value.resultUnknown)
        manager.cancelEditing(); assertNotNull(manager.state.value.error)
        manager.load(); assertEquals(1, posts)
        manager.create("客厅"); assertEquals(2, posts)
    }
    @Test fun staleAccountNeverPublishesRoomData() = runBlocking {
        var current = true; val started = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>()
        val manager = RoomManager(object : Repository() {
            override suspend fun load(): List<Room> { started.complete(Unit); finish.await(); return listOf(room) }
        }, { current })
        val work = async { manager.load() }; started.await(); current = false; finish.complete(Unit); work.await()
        assertTrue(manager.state.value.rooms.isEmpty())
        assertTrue(manager.state.value.sessionExpired)
    }
    @Test fun editingIsOnlyOrderOrSafeRemovalAndCancellationRestoresBaseline() = runBlocking {
        val other = Room(RoomId.Numeric(2), "厨房", false, 3)
        val manager = RoomManager(object : Repository() { override suspend fun load() = listOf(room, other) }, { true })
        manager.load(); manager.beginEditing(); manager.moveUp(other.id)
        assertEquals(other.id, manager.state.value.draft.first().id)
        manager.removeFromDraft(other.id)
        assertEquals(2, manager.state.value.draft.size)
        assertTrue(manager.state.value.error!!.contains("设备"))
        manager.removeFromDraft(room.id); assertEquals(listOf(other), manager.state.value.draft)
        manager.cancelEditing(); assertEquals(listOf(room, other), manager.state.value.rooms)
        assertFalse(manager.state.value.editing)
    }
    @Test fun baselineConflictRefreshesListAndDiscardsStaleDraft() = runBlocking {
        val updated = room.copy(name = "另一终端")
        val manager = RoomManager(object : Repository() {
            override suspend fun load() = listOf(room)
            override suspend fun saveLayout(baseline: List<Room>, orderedIds: List<RoomId>): List<Room> = throw RoomBaselineChanged(listOf(updated))
        }, { true })
        manager.load(); manager.beginEditing(); manager.saveEditing()
        assertEquals(listOf(updated), manager.state.value.rooms)
        assertFalse(manager.state.value.editing)
        assertFalse(manager.state.value.resultUnknown)
        assertNotNull(manager.state.value.error)
    }
    @Test fun cancellingMutationKeepsResultUnknownAndCannotReplayOnReturn() = runBlocking {
        val started = CompletableDeferred<Unit>(); val finish = CompletableDeferred<Unit>(); var posts = 0
        val manager = RoomManager(object : Repository() {
            override suspend fun create(name: String): List<Room> {
                posts++; started.complete(Unit)
                withContext(NonCancellable) { finish.await() }
                return listOf(room)
            }
        }, { true })
        manager.load()
        val work = launch { manager.create("客厅") }
        started.await(); work.cancel(); finish.complete(Unit); work.join()
        assertTrue(manager.state.value.resultUnknown)
        assertFalse(manager.state.value.busy)
        manager.create("客厅")
        assertEquals(1, posts)
    }
}

package com.rowan.iot.domain.rooms

import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withTimeout

data class RoomState(
    val rooms: List<Room> = emptyList(),
    val draft: List<Room> = emptyList(),
    val loaded: Boolean = false,
    val busy: Boolean = false,
    val editing: Boolean = false,
    val resultUnknown: Boolean = false,
    val sessionExpired: Boolean = false,
    val error: String? = null,
)

/** Page-owned structured work, account-revision guarded; mutations are never retried or queued. */
class RoomManager(
    private val repository: RoomRepository,
    private val current: () -> Boolean,
    private val timeoutMillis: Long = 35_000,
) {
    private val mutable = MutableStateFlow(RoomState())
    val state: StateFlow<RoomState> = mutable.asStateFlow()
    private val operation = Mutex()

    suspend fun load() = execute(false) { repository.load() }

    suspend fun create(name: String) = execute(true) {
        val value = validateName(name)
        if (mutable.value.rooms.any { it.name == value }) throw ApiFailure(1421, "存在相同名称的房间")
        repository.create(value)
    }

    suspend fun rename(id: RoomId, name: String) = execute(true) {
        val value = validateName(name)
        if (mutable.value.rooms.none { it.id == id }) throw ApiFailure(1431, "房间不存在，请刷新")
        if (mutable.value.rooms.any { it.id != id && it.name == value }) throw ApiFailure(1432, "存在相同名称的房间")
        repository.rename(id, value)
    }

    fun beginEditing() {
        if (!canEdit()) return
        mutable.value = mutable.value.copy(editing = true, draft = mutable.value.rooms, error = null)
    }

    fun cancelEditing() {
        if (!current() || mutable.value.busy) return
        mutable.value = mutable.value.copy(editing = false, draft = mutable.value.rooms,
            error = if (mutable.value.resultUnknown) mutable.value.error else null)
    }

    fun moveUp(id: RoomId) = shift(id, -1)
    fun moveDown(id: RoomId) = shift(id, 1)
    private fun shift(id: RoomId, offset: Int) {
        if (!canEdit() || !mutable.value.editing) return
        val list = mutable.value.draft.toMutableList()
        val index = list.indexOfFirst { it.id == id }
        if (index < 0 || index + offset !in list.indices) return
        java.util.Collections.swap(list, index, index + offset)
        mutable.value = mutable.value.copy(draft = list.toList(), error = null)
    }

    fun removeFromDraft(id: RoomId) {
        if (!canEdit() || !mutable.value.editing) return
        val room = mutable.value.draft.firstOrNull { it.id == id } ?: return
        try {
            requireRemovableRoom(room)
            mutable.value = mutable.value.copy(draft = mutable.value.draft.filterNot { it.id == id }, error = null)
        } catch (error: RoomRuleBlocked) { mutable.value = mutable.value.copy(error = error.message) }
    }

    suspend fun saveEditing() {
        if (!mutable.value.editing) return
        val before = mutable.value
        execute(true) { repository.saveLayout(before.rooms, before.draft.map { it.id }) }
    }

    private fun canEdit(): Boolean {
        val value = mutable.value
        if (!current()) { expired(); return false }
        return value.loaded && !value.busy && !value.resultUnknown
    }

    private fun expired() { mutable.value = RoomState(sessionExpired = true, error = "登录会话已变化，请重新进入") }

    private suspend fun execute(write: Boolean, work: suspend () -> List<Room>) {
        if (!current()) { expired(); return }
        if (!operation.tryLock()) return
        try {
            if (write && (!mutable.value.loaded || mutable.value.resultUnknown)) {
                mutable.value = mutable.value.copy(error = "请先刷新房间列表并核对上次操作结果")
                return
            }
            mutable.value = mutable.value.copy(busy = true, error = null)
            val result = withTimeout(timeoutMillis) { work() }.toList()
            currentCoroutineContext().ensureActive()
            if (!current()) { expired(); return }
            mutable.value = RoomState(rooms = result, draft = result, loaded = true)
        } catch (error: CancellationException) {
            if (!current()) expired()
            else mutable.value = mutable.value.copy(busy = false, resultUnknown = write || mutable.value.resultUnknown,
                error = if (write) RoomResultUnknown().message else "加载已取消，可刷新重试")
            throw error
        } catch (error: Exception) {
            if (!current()) expired()
            else when (error) {
                is RoomBaselineChanged -> mutable.value = RoomState(rooms = error.latest.toList(), draft = error.latest.toList(), loaded = true, error = error.message)
                is RoomResultUnknown -> mutable.value = mutable.value.copy(busy = false, resultUnknown = true, error = error.message)
                else -> mutable.value = mutable.value.copy(busy = false, error = message(error))
            }
        } finally {
            if (mutable.value.busy) mutable.value = mutable.value.copy(busy = false)
            operation.unlock()
        }
    }

    private fun validateName(name: String): String = name.trim().also {
        if (it.isEmpty()) throw ApiFailure(400, "请输入房间名称")
    }

    private fun message(error: Exception): String = when (error) {
        is RoomRuleBlocked -> error.message ?: "房间操作规则待确认"
        is ApiFailure -> when (error.code) {
            1421, 1432 -> "存在相同名称的房间"
            1431, 1441 -> "房间不存在，请刷新列表"
            409 -> "房间状态冲突，请刷新后重新编辑"
            401, 403 -> "登录或房间权限已失效，请重新进入"
            400 -> error.message ?: "输入无效"
            else -> "房间操作失败，请刷新核对（${error.code}）"
        }
        else -> "加载失败，请检查网络后刷新；已保留上次列表"
    }
}

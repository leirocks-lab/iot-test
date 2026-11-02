package com.rowan.iot.domain.rooms

/** ROOM tables call IDs Number, while examples use strings. Preserve the received wire type. */
sealed interface RoomId {
    val display: String
    data class Text(val value: String) : RoomId { override val display get() = value }
    data class Numeric(val value: Long) : RoomId { override val display get() = value.toString() }
}

data class Room(val id: RoomId, val name: String, val isDefault: Boolean?, val deviceCount: Int?)
data class RoomLocation(val id: RoomId, val name: String)

interface RoomRepository {
    suspend fun load(): List<Room>
    suspend fun create(name: String): List<Room>
    suspend fun rename(id: RoomId, name: String): List<Room>
    /** Only reorder existing IDs or omit empty non-default rooms; never accepts arbitrary payloads. */
    suspend fun saveLayout(baseline: List<Room>, orderedIds: List<RoomId>): List<Room>
}

interface DeviceRoomRepository {
    suspend fun location(deviceId: String): RoomLocation?
    suspend fun move(deviceId: String, roomId: RoomId?): RoomLocation?
}

class RoomBaselineChanged(val latest: List<Room>) : Exception("房间已在其他终端变更，已刷新列表，请重新编辑")
class RoomRuleBlocked(message: String) : Exception(message)
class RoomResultUnknown : Exception("操作结果未确认，请先刷新房间列表核对；不会自动重复提交")

fun requireRemovableRoom(room: Room) {
    if (room.deviceCount == null) throw RoomRuleBlocked("设备数量未知，请刷新后再操作")
    if (room.deviceCount != 0) throw RoomRuleBlocked("房间内有设备，设备迁移规则待确认，暂不能删除")
    if (room.isDefault != false) throw RoomRuleBlocked("默认房间或默认标识未知，删除规则待确认")
}

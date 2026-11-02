package com.rowan.iot.domain.device

data class HomeDevice(val id: String, val nickname: String)
/** Null roomId means unknown identity, never an assertion that the device is unassigned. */
data class HomeGroup(val roomName: String?, val devices: List<HomeDevice>,
    val roomId: com.rowan.iot.domain.rooms.RoomId? = null)

interface HomeRepository {
    suspend fun loadGroups(expectedRevision:Long): List<HomeGroup>
}

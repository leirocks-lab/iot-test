package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.device.HomeDevice
import com.rowan.iot.domain.device.HomeGroup
import com.rowan.iot.domain.device.HomeRepository
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.rooms.RoomId
import org.json.JSONArray
import org.json.JSONObject

/** HOME-01 metadata only. MQTT owns actual runtime state and control acknowledgement. */
class HttpHomeRepository(private val account:AccountService):HomeRepository {
    override suspend fun loadGroups(expectedRevision:Long):List<HomeGroup> =
        decodeGroups(account.request("GET","/api/app/devices",expectedRevision=expectedRevision)
            .optJSONArray("data")?:throw malformed())

    companion object {
        private fun malformed()=ApiFailure(502,"设备列表响应格式错误")
        private fun text(raw:Any?):String=(raw as? String)?.takeIf {it.isNotBlank()}?:throw malformed()
        private fun roomId(raw:Any?):RoomId?=when(raw) {
            null,JSONObject.NULL->null
            is String->RoomId.Text(text(raw))
            is Byte,is Short,is Int,is Long->RoomId.Numeric((raw as Number).toLong())
            else->throw malformed()
        }
        fun decodeGroups(data:JSONArray):List<HomeGroup> {
            val roomIds=mutableSetOf<RoomId>();val deviceIds=mutableSetOf<String>()
            return (0 until data.length()).map {index->
                val group=data.optJSONObject(index)?:throw malformed()
                val rawRoom=group.opt("room")
                val room=when(rawRoom) {null,JSONObject.NULL->null;is JSONObject->rawRoom;else->throw malformed()}
                val id=roomId(room?.opt("id"))
                val name=room?.let {text(it.opt("name"))}
                if(id!=null&&!roomIds.add(id))throw malformed()
                val list=group.optJSONArray("devices")?:throw malformed()
                val devices=(0 until list.length()).map {i->
                    val item=list.optJSONObject(i)?:throw malformed()
                    val device=item.optJSONObject("device")?:throw malformed()
                    val deviceId=text(device.opt("id"))
                    if(!deviceIds.add(deviceId))throw malformed()
                    val nickname=if(!item.has("deviceNickname")||item.isNull("deviceNickname"))deviceId else {
                        val raw=item.opt("deviceNickname") as? String?:throw malformed()
                        raw.takeIf {it.isNotBlank()}?:deviceId
                    }
                    HomeDevice(deviceId,nickname)
                }
                HomeGroup(name,devices,id)
            }
        }
    }
}

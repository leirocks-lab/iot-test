package com.rowan.iot.domain.device

import com.rowan.iot.domain.device.mqtt.transport.BrokerOptions

/** Native proof of HOME membership and matching DEVICE-02 identity, bound to an account revision. */
class AuthorizedDevice internal constructor(
    val accountRevision:Long,val resourceId:String,val userId:String,
    val productId:String,val category:String,val title:String,val bindingRole:String?,
) {override fun toString()="AuthorizedDevice(redacted)"}

class PreparedDeviceConnection internal constructor(
    val resourceId:String,val thingRef:String,val options:BrokerOptions,
) {override fun toString()="PreparedDeviceConnection(redacted)"}

/** HTTP/credential implementation is injected; device authority never depends on its data adapter. */
interface DeviceAccessGateway {
    suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice
    suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection
}

package com.rowan.iot.domain.device.more

/** Native ephemeral credential. No persistence/logging/events, inferred expiry or QR format. */
class DeviceShareCode(val bindCode:String) {
    override fun toString()="DeviceShareCode(redacted)"
}
interface DeviceShareCodeRepository {
    val scope:DeviceMoreScope
    /** Explicit generation only; timeout/401 must not automatically repeat this GET. */
    suspend fun generate():DeviceShareCode
}

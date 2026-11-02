package com.rowan.iot.bridge

import com.rowan.iot.domain.device.state.DeviceObservationState
import com.rowan.iot.domain.device.state.DeviceReadFailure
import com.rowan.iot.domain.device.state.DeviceReadPhase

/** Cloud metadata may be read offline, but a revoked/closed native observation cannot publish it. */
internal fun deviceFeatureReadAllowed(state:DeviceObservationState):Boolean = when(state) {
    is DeviceObservationState.Closed->false
    is DeviceObservationState.Current->state.snapshot.phase!=DeviceReadPhase.FORBIDDEN&&
        state.snapshot.failure!=DeviceReadFailure.AUTHORIZATION
}

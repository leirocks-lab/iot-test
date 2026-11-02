package com.rowan.iot.domain.network

import org.json.JSONObject

fun interface HttpGateway {
    suspend fun request(method: String, path: String, body: JSONObject?, token: String?): JSONObject
}

class ApiFailure(val code: Int, message: String) : Exception(message)

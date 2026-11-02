package com.rowan.iot.data.http

import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.preferences.PreferencesPatch
import com.rowan.iot.domain.preferences.PreferencesRepository
import com.rowan.iot.domain.preferences.UserPreferences
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import org.json.JSONObject

/** V1.4 USER-01/02, captured native account identity. No preferences or token cache. */
class HttpPreferencesRepository(private val account: AccountService) : PreferencesRepository {
    private class Identity(val revision: Long, val userId: String?, val cleanupRequired: Boolean)
    private val identity = account.contextSnapshot().let { Identity(it.revision, it.session?.userId, it.cleanupRequired) }
    override val expectedRevision = identity.revision
    private val expectedUserId = identity.userId
    private val path = "/api/app/user/setting"

    private suspend fun requireCurrent() {
        currentCoroutineContext().ensureActive()
        val current = account.contextSnapshot()
        if (expectedUserId == null || identity.cleanupRequired || current.cleanupRequired ||
            current.revision != expectedRevision || current.session?.userId != expectedUserId)
            throw ApiFailure(499, "登录会话已变化")
    }
    private suspend fun request(method: String, body: JSONObject? = null): JSONObject {
        requireCurrent()
        // This atomic intent check is necessary even after the local precheck:
        // account changes must not make an old repository dispatch with a new token.
        val response = account.request(method, path, body, expectedRevision = expectedRevision)
        requireCurrent()
        return response
    }
    override suspend fun load(): UserPreferences {
        val data = request("GET").opt("data") as? JSONObject ?: throw ApiFailure(502, "用户设置响应格式错误")
        val value = UserPreferences.decode(data.toString())
        requireCurrent()
        return value
    }
    override suspend fun patch(patch: PreferencesPatch) {
        request("PATCH", patch.toJson())
        // USER-02 is allowed to return only the common envelope, without data.
    }
}

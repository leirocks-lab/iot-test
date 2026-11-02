package com.rowan.iot.domain.preferences

import com.rowan.iot.domain.network.ApiFailure
import org.json.JSONObject

enum class PreferenceLanguage(val wire: String) { ZH_CN("zh-CN"), ZH_TW("zh-TW"), EN("en") }
enum class PreferenceTheme(val wire: String) { SYSTEM("system"), LIGHT("light"), DARK("dark") }
enum class TemperatureUnit(val wire: String) { C("C"), F("F") }
enum class MeasurementSystem(val wire: String) { METRIC("metric"), IMPERIAL("imperial") }

/**
 * Complete immutable USER-01 data plus a strict read projection. Unknown keys/values
 * remain in rawJson; absent or invalid known fields never acquire fixture defaults.
 */
class UserPreferences private constructor(val rawJson: String) {
    private val raw get() = JSONObject(rawJson)
    val language: PreferenceLanguage? = PreferenceLanguage.entries.firstOrNull { it.wire == raw.opt("language") }
    val notification: Boolean? = raw.opt("notification") as? Boolean
    val theme: PreferenceTheme? = PreferenceTheme.entries.firstOrNull { it.wire == raw.opt("theme") }
    val wallpaperId: String? = (raw.opt("wallpaper") as? JSONObject)?.opt("id").asPreferenceText()
    val homeLayout: String? = raw.opt("homeLayout").asPreferenceText()
    val temperatureUnit: TemperatureUnit? = TemperatureUnit.entries.firstOrNull { it.wire == raw.opt("temperatureUnit") }
    val measurementSystem: MeasurementSystem? = MeasurementSystem.entries.firstOrNull { it.wire == raw.opt("measurementSystem") }
    override fun toString() = "UserPreferences(<settings omitted>)"

    companion object {
        fun decode(dataJson: String): UserPreferences {
            val data = try { JSONObject(dataJson) } catch (_: Exception) { throw ApiFailure(502, "用户设置响应格式错误") }
            return UserPreferences(data.toString())
        }
    }
}

/** Null means omitted, never an instruction to clear a preference. No arbitrary payload setter. */
data class PreferencesPatch(
    val language: PreferenceLanguage? = null,
    val notification: Boolean? = null,
    val theme: PreferenceTheme? = null,
    val wallpaperId: String? = null,
    val homeLayout: String? = null,
    val temperatureUnit: TemperatureUnit? = null,
    val measurementSystem: MeasurementSystem? = null,
) {
    fun toJson(): JSONObject = JSONObject().also { data ->
        language?.let { data.put("language", it.wire) }
        notification?.let { data.put("notification", it) }
        theme?.let { data.put("theme", it.wire) }
        wallpaperId?.let { data.put("wallpaper", requireSelection(it)) }
        // V1.4 does not freeze an enumeration of layouts. UI must not invent choices.
        homeLayout?.let { data.put("homeLayout", requireSelection(it)) }
        // Each field is independently optional in USER-02. No extra pair/matrix rule.
        temperatureUnit?.let { data.put("temperatureUnit", it.wire) }
        measurementSystem?.let { data.put("measurementSystem", it.wire) }
        if (data.length() == 0) throw ApiFailure(400, "请选择需要修改的设置")
    }

    internal fun matches(read: UserPreferences): Boolean {
        val patch = toJson()
        val actual = JSONObject(read.rawJson)
        return patch.keys().asSequence().all { key ->
            val value = if (key == "wallpaper") (actual.opt(key) as? JSONObject)?.opt("id") else actual.opt(key)
            patch.get(key) == value
        }
    }
    private fun requireSelection(value: String): String = value.takeIf { it.asPreferenceText() != null }
        ?: throw ApiFailure(400, "设置选项标识无效")
}

interface PreferencesRepository {
    val expectedRevision: Long
    suspend fun load(): UserPreferences
    /** USER-02 has no settings data response. The service separately reads USER-01. */
    suspend fun patch(patch: PreferencesPatch)
}

internal fun Any?.asPreferenceText(): String? = (this as? String)?.takeIf { it.isNotBlank() && it.none(Char::isISOControl) }

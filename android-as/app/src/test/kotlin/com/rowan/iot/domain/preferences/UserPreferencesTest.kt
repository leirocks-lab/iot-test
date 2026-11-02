package com.rowan.iot.domain.preferences

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class UserPreferencesTest {
    private fun settings() = JSONObject("""{"language":"zh-TW","notification":false,"theme":"system","wallpaper":{"id":"fixture-wallpaper","name":{"zh-TW":"測試"},"image":{"2x":"fixture-image"}},"homeLayout":"existing-layout","temperatureUnit":"C","measurementSystem":"metric","future":{"nested":[1,true,null]}}""")

    @Test fun readProjectionPreservesTheCompleteUnknownJsonWithoutReturningMutableState() {
        val original = settings()
        val value = UserPreferences.decode(original.toString())
        original.getJSONObject("future").put("nested", "mutated")
        val copy = JSONObject(value.rawJson)
        assertEquals(3, copy.getJSONObject("future").getJSONArray("nested").length())
        copy.remove("future")
        assertTrue(JSONObject(value.rawJson).has("future"))
        assertEquals(PreferenceLanguage.ZH_TW, value.language)
        assertEquals(false, value.notification)
        assertEquals(PreferenceTheme.SYSTEM, value.theme)
        assertEquals("fixture-wallpaper", value.wallpaperId)
        assertEquals("existing-layout", value.homeLayout)
        assertEquals(TemperatureUnit.C, value.temperatureUnit)
        assertEquals(MeasurementSystem.METRIC, value.measurementSystem)
    }

    @Test fun missingFieldsRemainUnknownRatherThanApplyingFixtureDefaults() {
        val value = UserPreferences.decode("{}")
        assertNull(value.language); assertNull(value.notification); assertNull(value.theme)
        assertNull(value.wallpaperId); assertNull(value.homeLayout)
        assertNull(value.temperatureUnit); assertNull(value.measurementSystem)
        assertEquals(0, JSONObject(value.rawJson).length())
    }

    @Test fun unknownEnumsAndWrongTypesAreRetainedRawButNeverCoercedIntoKnownPreferences() {
        val raw = JSONObject("""{"language":"system","notification":"false","theme":"night","homeLayout":1,"temperatureUnit":"K","measurementSystem":"other"}""")
        val value = UserPreferences.decode(raw.toString())
        assertNull(value.language); assertNull(value.notification); assertNull(value.theme)
        assertNull(value.homeLayout); assertNull(value.temperatureUnit); assertNull(value.measurementSystem)
        assertEquals("system", JSONObject(value.rawJson).getString("language"))
        assertEquals("false", JSONObject(value.rawJson).getString("notification"))
    }

    @Test fun notificationRequiresAnActualBooleanIncludingFalse() {
        assertEquals(false, UserPreferences.decode("""{"notification":false}""").notification)
        assertEquals(true, UserPreferences.decode("""{"notification":true}""").notification)
        for (raw in listOf("0", "1", "\"true\"", "null"))
            assertNull(UserPreferences.decode("{\"notification\":$raw}").notification)
    }

    @Test fun wallpaperReadShapeIsAnObjectAndNeverASyntheticCatalogOrIdCoercion() {
        assertEquals("fixture-wallpaper", UserPreferences.decode(settings().toString()).wallpaperId)
        for (raw in listOf("null", "\"fixture-wallpaper\"", "{}", "{\"id\":1}", "{\"id\":\" \"}"))
            assertNull(UserPreferences.decode("{\"wallpaper\":$raw}").wallpaperId)
    }

    @Test fun malformedTopLevelSettingsAreRejectedRatherThanBecomingAnEmptySuccess() {
        for (raw in listOf("[]", "null", "false", "not-json"))
            assertTrue(runCatching { UserPreferences.decode(raw) }.isFailure)
    }

    @Test fun typedPatchesContainOnlyExplicitChangesAndNoReadModelOrUnknownFields() {
        val patch = PreferencesPatch(theme = PreferenceTheme.DARK).toJson()
        assertEquals(setOf("theme"), patch.keys().asSequence().toSet())
        assertEquals("dark", patch.getString("theme"))
        assertFalse(patch.has("wallpaper")); assertFalse(patch.has("future")); assertFalse(patch.has("notification"))
    }

    @Test fun wallpaperPatchSendsOnlyTheSelectedIdAsAString() {
        val patch = PreferencesPatch(wallpaperId = "fixture-wallpaper").toJson()
        assertEquals(setOf("wallpaper"), patch.keys().asSequence().toSet())
        assertTrue(patch.get("wallpaper") is String)
        assertEquals("fixture-wallpaper", patch.getString("wallpaper"))
    }

    @Test fun explicitFalseIsNotDroppedAndOmittedFieldsNeverBecomeJsonNull() {
        val patch = PreferencesPatch(notification = false).toJson()
        assertEquals(setOf("notification"), patch.keys().asSequence().toSet())
        assertEquals(false, patch.getBoolean("notification"))
        assertFalse(patch.has("temperatureUnit")); assertFalse(patch.has("measurementSystem"))
    }

    @Test fun languagesAndThemesUseOnlyTheThreeDefinedWireValues() {
        assertEquals(setOf("zh-CN", "zh-TW", "en"), PreferenceLanguage.entries.map {
            PreferencesPatch(language = it).toJson().getString("language")
        }.toSet())
        assertEquals(setOf("system", "light", "dark"), PreferenceTheme.entries.map {
            PreferencesPatch(theme = it).toJson().getString("theme")
        }.toSet())
    }

    @Test fun unitsAreIndividuallyOptionalAndAnExplicitPairSendsOnlyItsOwnFields() {
        val temperatureOnly = PreferencesPatch(temperatureUnit = TemperatureUnit.F).toJson()
        assertEquals(setOf("temperatureUnit"), temperatureOnly.keys().asSequence().toSet())
        val measurementOnly = PreferencesPatch(measurementSystem = MeasurementSystem.IMPERIAL).toJson()
        assertEquals(setOf("measurementSystem"), measurementOnly.keys().asSequence().toSet())
        val patch = PreferencesPatch(temperatureUnit = TemperatureUnit.F, measurementSystem = MeasurementSystem.IMPERIAL).toJson()
        assertEquals(setOf("temperatureUnit", "measurementSystem"), patch.keys().asSequence().toSet())
        assertEquals("F", patch.getString("temperatureUnit")); assertEquals("imperial", patch.getString("measurementSystem"))
        assertFalse(PreferencesPatch(language = PreferenceLanguage.EN).toJson().has("measurementSystem"))
    }

    @Test fun emptyPatchAndBlankOpaqueSelectionsAreRejectedWithoutInventingLayoutEnums() {
        assertTrue(runCatching { PreferencesPatch().toJson() }.isFailure)
        assertTrue(runCatching { PreferencesPatch(wallpaperId = " ").toJson() }.isFailure)
        assertTrue(runCatching { PreferencesPatch(homeLayout = "").toJson() }.isFailure)
        assertEquals("existing-server-layout", PreferencesPatch(homeLayout = "existing-server-layout").toJson().getString("homeLayout"))
    }
}

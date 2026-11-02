package com.rowan.iot.domain.presentation

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.account.AccountSession
import com.rowan.iot.domain.preferences.*
import org.junit.Assert.*
import org.junit.Test

/** Offline authority/OS inputs only; no HTTP, disk, device session or UI. */
class PresentationOwnerTest {
    private class Fixture(raw:String="{}",user:String="a",revision:Long=7) {
        var context=AccountContext(revision,session(raw,user))
        var captures=0
        val owner=PresentationOwner({captures++;context})
        fun settings(raw:String) {context=context.copy(session=session(raw,context.session!!.userId))}
    }
    companion object {
        private fun session(raw:String,user:String="a",token:String="fixture")=AccountSession(token,"fixture-refresh",user,null,null,raw)
        private fun os(language:String="en",dark:Boolean=false)=PresentationSystemInput(listOf(language),if(dark)EffectiveTheme.DARK else EffectiveTheme.LIGHT)
    }
    private fun failure(work:()->Unit) {try{work();fail("Expected closed projection")}catch(e:PresentationFailure){assertNotNull(e.reason)}}
    @Test fun savedSupportedLanguageWinsOverSystem() {val f=Fixture("""{"language":"zh-TW"}""");assertEquals(PreferenceLanguage.ZH_TW,f.owner.capture(os("en")).language)}
    @Test fun missingLanguageUsesFirstSupportedSystemTag() {val f=Fixture();assertEquals(PreferenceLanguage.ZH_CN,f.owner.capture(PresentationSystemInput(listOf("fr-FR","zh-Hans-CN","en-US"),EffectiveTheme.LIGHT)).language)}
    @Test fun explicitScriptTakesPrecedenceOverRegion() {val f=Fixture();assertEquals(PreferenceLanguage.ZH_TW,f.owner.capture(os("zh-Hant-CN")).language)}
    @Test fun unsupportedAndMalformedLanguageTagsRenderEnglish() {val f=Fixture();assertEquals(PreferenceLanguage.EN,f.owner.capture(PresentationSystemInput(listOf("../zh-CN","fr-FR"),EffectiveTheme.LIGHT)).language)}
    @Test fun savedLanguageWhitelistIsExactNoAliases() {val f=Fixture("""{"language":"en-US"}""");assertEquals(PreferenceLanguage.ZH_TW,f.owner.capture(os("zh-TW")).language)}
    @Test fun unknownThemeStaysUnknownWhileColorFollowsSystem() {val f=Fixture("""{"theme":"future"}""");val p=f.owner.capture(os(dark=true));assertNull(p.themePreference);assertEquals(EffectiveTheme.DARK,p.effectiveTheme)}
    @Test fun systemThemeChangesOnlyOnEffectiveColorChange() {val f=Fixture("""{"theme":"system"}""");val a=f.owner.capture(os());val b=f.owner.capture(os("en-US"));assertEquals(a.revision,b.revision);assertTrue(f.owner.capture(os(dark=true)).revision>b.revision)}
    @Test fun fixedThemeIgnoresUnrelatedSystemAppearanceChanges() {val f=Fixture("""{"theme":"light"}""");val a=f.owner.capture(os());assertEquals(a,f.owner.capture(os(dark=true)))}
    @Test fun unknownUnitsNeverAcquireDefaults() {val p=Fixture().owner.capture(os());assertNull(p.temperatureUnit);assertNull(p.measurementSystem)}
    @Test fun unitsAreIndependentWithoutInventedCombinationMatrix() {val p=Fixture("""{"temperatureUnit":"F","measurementSystem":"metric"}""").owner.capture(os());assertEquals(TemperatureUnit.F,p.temperatureUnit);assertEquals(MeasurementSystem.METRIC,p.measurementSystem)}
    @Test fun wrongKnownTypesRemainUnknown() {val p=Fixture("""{"language":true,"theme":7,"temperatureUnit":false,"measurementSystem":{}}""").owner.capture(os());assertNull(p.themePreference);assertNull(p.temperatureUnit);assertNull(p.measurementSystem);assertEquals(PreferenceLanguage.EN,p.language)}
    @Test fun tokenRenewalDoesNotAdvancePresentationOrAccountRevision() {val f=Fixture("""{"theme":"dark"}""");val a=f.owner.capture(os());f.context=f.context.copy(session=session("""{"theme":"dark"}""",token="renewed"),credentialPublication=Any());val b=f.owner.capture(os());assertEquals(a,b);assertEquals(7L,b.accountRevision)}
    @Test fun opaqueRawOnlyChangeDoesNotAdvancePresentation() {val f=Fixture("""{"language":"en","future":{"v":1}}""");val a=f.owner.capture(os());f.settings("""{"language":"en","future":{"v":2},"notification":true}""");assertEquals(a,f.owner.capture(os()))}
    @Test fun confirmedSettingsChangeAdvancesOnlyPresentation() {val f=Fixture();val a=f.owner.capture(os());f.settings("""{"temperatureUnit":"C"}""");val b=f.owner.capture(os());assertTrue(b.revision>a.revision);assertEquals(a.accountRevision,b.accountRevision)}
    @Test fun logoutDropsPreviousChoicesImmediately() {val f=Fixture("""{"language":"zh-CN","theme":"dark","temperatureUnit":"F"}""");val a=f.owner.capture(os());f.context=AccountContext(8,null);val b=f.owner.capture(os());assertFalse(b.authenticated);assertEquals(PreferenceLanguage.EN,b.language);assertNull(b.temperatureUnit);assertTrue(b.revision>a.revision)}
    @Test fun pendingCleanupNeverUsesEvenARetainedSession() {val f=Fixture("""{"language":"zh-CN","theme":"dark"}""");f.context=f.context.copy(cleanupRequired=true);val p=f.owner.capture(os());assertFalse(p.authenticated);assertNull(p.themePreference);assertEquals(PreferenceLanguage.EN,p.language)}
    @Test fun nextAccountCannotInheritPreviousSettings() {val f=Fixture("""{"theme":"dark","measurementSystem":"imperial"}""");val a=f.owner.capture(os());f.context=AccountContext(8,session("{}","b"));val b=f.owner.capture(os());assertNull(b.themePreference);assertNull(b.measurementSystem);assertTrue(b.revision>a.revision)}
    @Test fun sameRevisionDifferentPrivateIdentityChangesPublication() {val f=Fixture();val a=f.owner.capture(os());f.context=AccountContext(7,session("{}","b"));assertTrue(f.owner.capture(os()).revision>a.revision)}
    @Test fun canonicallyEquivalentIdentitiesAreByteDistinct() {val f=Fixture(user="\u00e9");val a=f.owner.capture(os());f.context=AccountContext(7,session("{}","e\u0301"));assertTrue(f.owner.capture(os()).revision>a.revision)}
    @Test fun captureReadsTheAccountGetterExactlyOnce() {val f=Fixture();f.owner.capture(os());assertEquals(1,f.captures)}
    @Test fun lateOldNotificationMustReadCurrentAuthority() {val f=Fixture("""{"theme":"dark"}""");val old=f.context;f.context=AccountContext(8,session("{}","b"));val p=f.owner.capture(os());assertEquals(8L,p.accountRevision);assertNull(p.themePreference);assertNotEquals(old.revision,p.accountRevision)}
    @Test fun unsafeAccountRevisionFailsClosed() {val f=Fixture(revision=PresentationOwner.MAX_SAFE_REVISION+1);failure{f.owner.capture(os())}}
    @Test fun unsafeIdentityEncodingFailsClosedWithoutLoggingIt() {val f=Fixture(user="\uD800");failure{f.owner.capture(os())}}
    @Test fun revisionAtSafeMaximumCanDeduplicateButNeverWrapOrRecoverOldSnapshot() {var context=AccountContext(7,session("{}"));val owner=PresentationOwner({context},PresentationOwner.MAX_SAFE_REVISION-1);val a=owner.capture(os());assertEquals(PresentationOwner.MAX_SAFE_REVISION,a.revision);assertEquals(a,owner.capture(os()));context=context.copy(session=session("""{"theme":"dark"}"""));failure{owner.capture(os())};context=context.copy(session=session("{}"));failure{owner.capture(os())}}
}

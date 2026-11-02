package com.rowan.iot.domain.presentation

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.preferences.*
import java.nio.CharBuffer
import java.nio.charset.CodingErrorAction
import java.util.Locale

enum class EffectiveTheme { LIGHT, DARK }

/** Explicit native OS input, not another stored preference or an OS reader. */
class PresentationSystemInput(languageTags:List<String>,val appearance:EffectiveTheme) {
    private val tags=languageTags.toList()
    internal fun renderingLanguage():PreferenceLanguage=tags.firstNotNullOfOrNull(::supportedSystemLanguage)?:PreferenceLanguage.EN
}

/** Whitelisted, immutable rendering projection. Unknown saved theme/units stay null. */
data class PresentationSnapshot(
    val revision:Long,val accountRevision:Long,val authenticated:Boolean,
    val language:PreferenceLanguage,val themePreference:PreferenceTheme?,val effectiveTheme:EffectiveTheme,
    val temperatureUnit:TemperatureUnit?,val measurementSystem:MeasurementSystem?,
)
enum class PresentationFailureReason { INVALID_AUTHORITY, REVISION_EXHAUSTED }
class PresentationFailure(val reason:PresentationFailureReason):Exception("Presentation projection unavailable")

/** Read-only application owner. Inject AccountService::contextSnapshot, never an emitted old
 * Flow value or a second login/prefs cache. Capture invokes that getter once under a light lock.
 * It has no observer, HTTP/storage/write callbacks, reconnects or bridge/UI integration.
 */
class PresentationOwner(private val accountSnapshot:()->AccountContext,startingRevision:Long=0) {
    companion object {const val MAX_SAFE_REVISION=9_007_199_254_740_991L}
    private val lock=Any()
    private var revision=startingRevision
    private var closed=false
    private var previous:Signature?=null
    private var published:PresentationSnapshot?=null
    init {require(startingRevision in 0..MAX_SAFE_REVISION)}
    private data class Signature(val accountRevision:Long,val identity:List<Byte>?,val authenticated:Boolean,
        val language:PreferenceLanguage,val theme:PreferenceTheme?,val effective:EffectiveTheme,
        val temperature:TemperatureUnit?,val measurement:MeasurementSystem?)
    private fun reject(reason:PresentationFailureReason):Nothing {
        closed=true;previous=null;published=null;throw PresentationFailure(reason)
    }
    fun capture(system:PresentationSystemInput):PresentationSnapshot=synchronized(lock) {
        if(closed)throw PresentationFailure(PresentationFailureReason.REVISION_EXHAUSTED)
        val account=accountSnapshot() // SAME immutable authority for revision, identity and preferences.
        if(account.revision !in 0..MAX_SAFE_REVISION)reject(PresentationFailureReason.INVALID_AUTHORITY)
        val session=account.session.takeUnless {account.cleanupRequired}
        val identity=session?.userId?.let {user->
            if(user.isEmpty())reject(PresentationFailureReason.INVALID_AUTHORITY)
            try {
                val buffer=Charsets.UTF_8.newEncoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).encode(CharBuffer.wrap(user))
                ByteArray(buffer.remaining()).also {buffer.get(it)}.toList()
            }catch(_:java.nio.charset.CharacterCodingException){reject(PresentationFailureReason.INVALID_AUTHORITY)}
        }
        val preferences=session?.let {try {UserPreferences.decode(it.settings().toString())}catch(_:Exception){null}}
        val language=preferences?.language?:system.renderingLanguage()
        val theme=preferences?.theme
        val effective=when(theme) {PreferenceTheme.LIGHT->EffectiveTheme.LIGHT;PreferenceTheme.DARK->EffectiveTheme.DARK;else->system.appearance}
        val signature=Signature(account.revision,identity,session!=null,language,theme,effective,preferences?.temperatureUnit,preferences?.measurementSystem)
        if(signature==previous)return@synchronized checkNotNull(published)
        if(revision>=MAX_SAFE_REVISION)reject(PresentationFailureReason.REVISION_EXHAUSTED)
        revision++
        PresentationSnapshot(revision,account.revision,session!=null,language,theme,effective,signature.temperature,signature.measurement).also {
            previous=signature;published=it
        }
    }
}

/** Deliberately narrow engineering fallback for OS tags; NOT a USER-02 alias parser.
 * Only English and known Chinese script/CN/TW tags (plus bare zh -> simplified) are mapped.
 * Unsupported tags are skipped; all unsupported -> en. No region/tenant inference.
 */
private fun supportedSystemLanguage(tag:String):PreferenceLanguage? {
    if(!tag.matches(Regex("[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*")))return null
    val parts=tag.lowercase(Locale.ROOT).split('-')
    if(parts[0]=="en")return PreferenceLanguage.EN
    if(parts[0]!="zh")return null
    if(parts.size==1)return PreferenceLanguage.ZH_CN
    return when(parts[1]) {"hant"->PreferenceLanguage.ZH_TW;"hans"->PreferenceLanguage.ZH_CN;"tw"->PreferenceLanguage.ZH_TW;"cn"->PreferenceLanguage.ZH_CN;else->null}
}

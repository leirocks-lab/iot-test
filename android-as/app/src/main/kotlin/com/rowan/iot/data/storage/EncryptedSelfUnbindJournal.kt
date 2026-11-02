package com.rowan.iot.data.storage

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.rowan.iot.domain.device.more.*
import java.io.IOException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject

/** Never includes the underlying filesystem/crypto exception or plaintext. */
class SelfUnbindJournalStorageFailure:IOException("SelfUnbind journal unavailable")

/**
 * Separate AndroidKeyStore key and app-private atomic SharedPreferences commit.
 * No SessionStorage/token writes, fallback plaintext, apply(), unresolved eviction or reset-on-error.
 * Process-global mutex serializes even accidentally duplicated adapter instances.
 * A platform test is still required for real KeyStore/process-death behavior.
 */
class EncryptedSelfUnbindJournal(context:Context):SelfUnbindRecoveryJournal {
    private val preferences=context.applicationContext.getSharedPreferences("rowan.device-self-unbind-journal",Context.MODE_PRIVATE)
    private fun key():SecretKey {
        val store=KeyStore.getInstance("AndroidKeyStore").apply {load(null)}
        (store.getKey(ALIAS,null) as? SecretKey)?.let {return it}
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun readAll():Map<String,SelfUnbindRecord> {
        val raw=preferences.getString("ciphertext",null)?:return emptyMap()
        if(raw.length>768*1024)throw SelfUnbindJournalStorageFailure()
        val parts=raw.split(':')
        if(parts.size!=2)throw SelfUnbindJournalStorageFailure()
        val iv=Base64.decode(parts[0],Base64.NO_WRAP)
        val encrypted=Base64.decode(parts[1],Base64.NO_WRAP)
        if(iv.size!=12||encrypted.size>SelfUnbindJournalDocument.MAX_BYTES+32)throw SelfUnbindJournalStorageFailure()
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,iv))
        cipher.updateAAD("rowan.device-self-unbind-journal.v1".toByteArray(Charsets.UTF_8))
        return SelfUnbindJournalDocument.decode(cipher.doFinal(encrypted).toString(Charsets.UTF_8))
    }
    private fun writeAll(records:Map<String,SelfUnbindRecord>) {
        val plaintext=SelfUnbindJournalDocument.encode(records).toByteArray(Charsets.UTF_8)
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE,key())
        cipher.updateAAD("rowan.device-self-unbind-journal.v1".toByteArray(Charsets.UTF_8))
        val encrypted=cipher.doFinal(plaintext)
        val raw=Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+":"+Base64.encodeToString(encrypted,Base64.NO_WRAP)
        // commit is atomic disk replacement; failure is never interpreted as a durable reservation.
        if(!preferences.edit().putString("ciphertext",raw).commit())throw SelfUnbindJournalStorageFailure()
    }
    private suspend fun <T> transaction(work:()->T):T=withContext(Dispatchers.IO+NonCancellable) {
        transactions.withLock {
            try {work()}catch(_:Exception){throw SelfUnbindJournalStorageFailure()}
        }
    }
    override suspend fun unresolved(userId:String):List<SelfUnbindRecord> =transaction {readAll().values.filter {it.userId==userId&&it.phase in setOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED)}.sortedBy {it.key}}
    override suspend fun load(key:String):SelfUnbindRecord?=transaction {readAll()[key]}
    override suspend fun reserve(candidate:SelfUnbindRecord):SelfUnbindRecord=transaction {
        SelfUnbindJournalDocument.validate(candidate)
        if(candidate.phase!=SelfUnbindPhase.UNKNOWN)throw SelfUnbindJournalStorageFailure()
        val records=readAll().toMutableMap()
        val existing=records[candidate.key]
        if(existing?.phase in setOf(SelfUnbindPhase.UNKNOWN,SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED))existing!! else {
            if(candidate.key !in records&&records.size>=64)records.entries.firstOrNull {
                it.value.phase in setOf(SelfUnbindPhase.CONFIRMED,SelfUnbindPhase.ALREADY_ABSENT,SelfUnbindPhase.REJECTED)
            }?.let {records.remove(it.key)}
            records[candidate.key]=candidate;writeAll(records);candidate
        }
    }
    override suspend fun complete(record:SelfUnbindRecord):Boolean=transaction {
        SelfUnbindJournalDocument.validate(record)
        if(record.phase==SelfUnbindPhase.UNKNOWN)throw SelfUnbindJournalStorageFailure()
        val records=readAll().toMutableMap()
        val existing=records[record.key]
        if(existing==null||existing.operationId!=record.operationId||existing.userId!=record.userId||
            existing.resourceId!=record.resourceId||existing.productId!=record.productId||existing.originToken!=record.originToken||existing.resourceToken!=record.resourceToken)false
        else if(existing.phase==record.phase)existing.errorCode==record.errorCode
        else if(existing.phase==SelfUnbindPhase.UNKNOWN&&record.phase in setOf(SelfUnbindPhase.ACKNOWLEDGED,SelfUnbindPhase.ABSENCE_OBSERVED,SelfUnbindPhase.REJECTED)||
            existing.phase==SelfUnbindPhase.ACKNOWLEDGED&&record.phase==SelfUnbindPhase.CONFIRMED||
            existing.phase==SelfUnbindPhase.ABSENCE_OBSERVED&&record.phase==SelfUnbindPhase.ALREADY_ABSENT) {
            records[record.key]=record;writeAll(records);true
        } else false
    }
    companion object {
        private const val ALIAS="rowan.device-self-unbind-journal.v1"
        private val transactions=Mutex()
    }
}

/** Bounded storage budget, explicitly not a self-unbind length/product requirement. */
internal object SelfUnbindJournalDocument {
    const val MAX_BYTES=256*1024
    private const val MAX_RECORDS=64
    private val errors=setOf("","not_authenticated","forbidden","not_found","invalid_input","not_bound","absence_observed","session_changed","cancelled")
    fun validate(record:SelfUnbindRecord) {
        if(record.key!=selfUnbindKey(record.userId,record.resourceId)||!record.key.matches(Regex("[a-f0-9]{64}"))||
            record.operationId.isBlank()||record.operationId.length>128||record.operationId.any(Char::isISOControl)||
            listOf(record.userId,record.resourceId,record.productId).any {it.isBlank()||it.any(Char::isISOControl)}||
            record.phase in setOf(SelfUnbindPhase.ABSENCE_OBSERVED,SelfUnbindPhase.ALREADY_ABSENT)&&record.errorCode !in setOf("not_found","not_bound","absence_observed")||
            record.resourceToken.length !in 75..128||!record.resourceToken.matches(Regex("[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:[1-9][0-9]{0,18}"))||
            record.originToken.isBlank()||record.originToken.length>128||record.originToken.any(Char::isISOControl)||
            record.errorCode !in errors||record.phase !in setOf(SelfUnbindPhase.REJECTED,SelfUnbindPhase.ABSENCE_OBSERVED,SelfUnbindPhase.ALREADY_ABSENT)&&record.errorCode!="")
            throw SelfUnbindJournalStorageFailure()
    }
    fun encode(records:Map<String,SelfUnbindRecord>):String {
        if(records.size>MAX_RECORDS)throw SelfUnbindJournalStorageFailure()
        val array=JSONArray()
        records.toSortedMap().forEach {(key,record)->
            validate(record);if(key!=record.key)throw SelfUnbindJournalStorageFailure()
            array.put(JSONObject().put("key",key).put("operationId",record.operationId).put("userId",record.userId)
                .put("resourceId",record.resourceId).put("productId",record.productId).put("originToken",record.originToken).put("resourceToken",record.resourceToken)
                .put("phase",record.phase.name).put("errorCode",record.errorCode))
        }
        val result=JSONObject().put("version",1).put("records",array).toString()
        if(result.toByteArray(Charsets.UTF_8).size>MAX_BYTES)throw SelfUnbindJournalStorageFailure()
        return result
    }
    fun decode(raw:String):Map<String,SelfUnbindRecord> {
        try {
            if(raw.toByteArray(Charsets.UTF_8).size>MAX_BYTES)throw SelfUnbindJournalStorageFailure()
            val root=JSONObject(raw)
            if(root.opt("version")!=1)throw SelfUnbindJournalStorageFailure()
            val array=root.getJSONArray("records")
            if(array.length()>MAX_RECORDS)throw SelfUnbindJournalStorageFailure()
            val records=mutableMapOf<String,SelfUnbindRecord>()
            for(index in 0 until array.length()) {
                val item=array.getJSONObject(index)
                fun text(key:String)=item.opt(key) as? String?:throw SelfUnbindJournalStorageFailure()
                val record=SelfUnbindRecord(text("key"),text("operationId"),text("userId"),text("resourceId"),text("productId"),
                    text("originToken"),SelfUnbindPhase.valueOf(text("phase")),text("errorCode"),text("resourceToken"))
                validate(record)
                if(records.put(record.key,record)!=null)throw SelfUnbindJournalStorageFailure()
            }
            return records
        }catch(_:Exception){throw SelfUnbindJournalStorageFailure()}
    }
}

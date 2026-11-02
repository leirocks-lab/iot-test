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
class NicknameJournalStorageFailure:IOException("Nickname journal unavailable")

/**
 * Separate AndroidKeyStore key and app-private atomic SharedPreferences commit.
 * No SessionStorage/token writes, fallback plaintext, apply(), unresolved eviction or reset-on-error.
 * Process-global mutex serializes even accidentally duplicated adapter instances.
 * A platform test is still required for real KeyStore/process-death behavior.
 */
class EncryptedNicknameJournal(context:Context):NicknameJournal {
    private val preferences=context.applicationContext.getSharedPreferences("rowan.device-nickname-journal",Context.MODE_PRIVATE)
    private fun key():SecretKey {
        val store=KeyStore.getInstance("AndroidKeyStore").apply {load(null)}
        (store.getKey(ALIAS,null) as? SecretKey)?.let {return it}
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun readAll():Map<String,NicknameRecord> {
        val raw=preferences.getString("ciphertext",null)?:return emptyMap()
        if(raw.length>768*1024)throw NicknameJournalStorageFailure()
        val parts=raw.split(':')
        if(parts.size!=2)throw NicknameJournalStorageFailure()
        val iv=Base64.decode(parts[0],Base64.NO_WRAP)
        val encrypted=Base64.decode(parts[1],Base64.NO_WRAP)
        if(iv.size!=12||encrypted.size>NicknameJournalDocument.MAX_BYTES+32)throw NicknameJournalStorageFailure()
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,iv))
        cipher.updateAAD("rowan.device-nickname-journal.v1".toByteArray(Charsets.UTF_8))
        return NicknameJournalDocument.decode(cipher.doFinal(encrypted).toString(Charsets.UTF_8))
    }
    private fun writeAll(records:Map<String,NicknameRecord>) {
        val plaintext=NicknameJournalDocument.encode(records).toByteArray(Charsets.UTF_8)
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE,key())
        cipher.updateAAD("rowan.device-nickname-journal.v1".toByteArray(Charsets.UTF_8))
        val encrypted=cipher.doFinal(plaintext)
        val raw=Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+":"+Base64.encodeToString(encrypted,Base64.NO_WRAP)
        // commit is atomic disk replacement; failure is never interpreted as a durable reservation.
        if(!preferences.edit().putString("ciphertext",raw).commit())throw NicknameJournalStorageFailure()
    }
    private suspend fun <T> transaction(work:()->T):T=withContext(Dispatchers.IO+NonCancellable) {
        transactions.withLock {
            try {work()}catch(_:Exception){throw NicknameJournalStorageFailure()}
        }
    }
    override suspend fun load(key:String):NicknameRecord?=transaction {readAll()[key]}
    override suspend fun reserve(candidate:NicknameRecord):NicknameRecord=transaction {
        NicknameJournalDocument.validate(candidate)
        if(candidate.phase!=NicknamePhase.UNKNOWN)throw NicknameJournalStorageFailure()
        val records=readAll().toMutableMap()
        val existing=records[candidate.key]
        if(existing?.phase==NicknamePhase.UNKNOWN)existing else {
            records[candidate.key]=candidate;writeAll(records);candidate
        }
    }
    override suspend fun complete(record:NicknameRecord):Boolean=transaction {
        NicknameJournalDocument.validate(record)
        if(record.phase==NicknamePhase.UNKNOWN)throw NicknameJournalStorageFailure()
        val records=readAll().toMutableMap()
        val existing=records[record.key]
        if(existing==null||existing.operationId!=record.operationId||existing.userId!=record.userId||
            existing.resourceId!=record.resourceId||existing.productId!=record.productId||existing.target!=record.target)false
        else if(existing.phase!=NicknamePhase.UNKNOWN)existing.phase==record.phase&&existing.errorCode==record.errorCode
        else {records[record.key]=record;writeAll(records);true}
    }
    companion object {
        private const val ALIAS="rowan.device-nickname-journal.v1"
        private val transactions=Mutex()
    }
}

/** Bounded storage budget, explicitly not a nickname length/product requirement. */
internal object NicknameJournalDocument {
    const val MAX_BYTES=256*1024
    private const val MAX_RECORDS=64
    private val errors=setOf("","not_authenticated","forbidden","not_found")
    fun validate(record:NicknameRecord) {
        if(record.key!=nicknameKey(record.userId,record.resourceId)||!record.key.matches(Regex("[a-f0-9]{64}"))||
            record.operationId.isBlank()||record.operationId.length>128||record.operationId.any(Char::isISOControl)||
            listOf(record.userId,record.resourceId,record.productId).any {it.isBlank()||it.any(Char::isISOControl)}||
            record.errorCode !in errors||record.phase!=NicknamePhase.REJECTED&&record.errorCode!="")
            throw NicknameJournalStorageFailure()
    }
    fun encode(records:Map<String,NicknameRecord>):String {
        if(records.size>MAX_RECORDS)throw NicknameJournalStorageFailure()
        val array=JSONArray()
        records.toSortedMap().forEach {(key,record)->
            validate(record);if(key!=record.key)throw NicknameJournalStorageFailure()
            array.put(JSONObject().put("key",key).put("operationId",record.operationId).put("userId",record.userId)
                .put("resourceId",record.resourceId).put("productId",record.productId).put("target",record.target)
                .put("phase",record.phase.name).put("errorCode",record.errorCode))
        }
        val result=JSONObject().put("version",1).put("records",array).toString()
        if(result.toByteArray(Charsets.UTF_8).size>MAX_BYTES)throw NicknameJournalStorageFailure()
        return result
    }
    fun decode(raw:String):Map<String,NicknameRecord> {
        try {
            if(raw.toByteArray(Charsets.UTF_8).size>MAX_BYTES)throw NicknameJournalStorageFailure()
            val root=JSONObject(raw)
            if(root.opt("version")!=1)throw NicknameJournalStorageFailure()
            val array=root.getJSONArray("records")
            if(array.length()>MAX_RECORDS)throw NicknameJournalStorageFailure()
            val records=mutableMapOf<String,NicknameRecord>()
            for(index in 0 until array.length()) {
                val item=array.getJSONObject(index)
                fun text(key:String)=item.opt(key) as? String?:throw NicknameJournalStorageFailure()
                val record=NicknameRecord(text("key"),text("operationId"),text("userId"),text("resourceId"),text("productId"),
                    text("target"),NicknamePhase.valueOf(text("phase")),text("errorCode"))
                validate(record)
                if(records.put(record.key,record)!=null)throw NicknameJournalStorageFailure()
            }
            return records
        }catch(_:Exception){throw NicknameJournalStorageFailure()}
    }
}

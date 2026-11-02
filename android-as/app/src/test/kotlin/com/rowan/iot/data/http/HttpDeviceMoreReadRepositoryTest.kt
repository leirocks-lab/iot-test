package com.rowan.iot.data.http

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.*
import kotlinx.coroutines.*
import org.json.*
import org.junit.Assert.*
import org.junit.Test

class HttpDeviceMoreReadRepositoryTest {
    private data class Call(val method:String,val path:String,val body:JSONObject?)
    private val calls=mutableListOf<Call>()
    private val summary="""{"deviceNickname":"Study","bindingRole":"sa","device":{"id":"device/a ?","name":"Device","mac":"secret-mac","mcuVersion":"1","wifiVersion":"2"},"product":{"id":"product","name":"Product","category":"fan","seriesName":"Series","modelName":"Model","image":"https://private.invalid"}}"""
    private suspend fun fixture(handler:suspend(Call)->JSONObject):Pair<AccountService,HttpDeviceMoreReadRepository> {
        val account=AccountService(HttpGateway {method,path,body,_->
            if(path=="/api/app/session") JSONObject("""{"data":{"accessToken":"test","refreshToken":"refresh","userID":"user","setting":{}}}""")
            else if(method=="DELETE"&&path=="/api/app/session")JSONObject()
            else {val call=Call(method,path,body);calls+=call;handler(call)}
        },object:SessionStorage {override fun read():String?=null;override fun write(value:String?) {}})
        account.login("fixture@example.test","password")
        return account to HttpDeviceMoreReadRepository(account,DeviceMoreScope(account.revision,"device/a ?","user","product"))
    }
    @Test fun summaryUsesEncodedDeviceGetAndOnlyNineSafeStrings():Unit=runBlocking {
        val (_,repo)=fixture {JSONObject().put("data",JSONObject(summary))}
        val value=repo.summary()
        assertEquals("GET",calls.single().method);assertEquals("/api/app/devices/device%2Fa%20%3F",calls.single().path);assertNull(calls.single().body)
        assertEquals("Study",value.deviceNickname);assertEquals("Product",value.productName);assertEquals("fan",value.productCategory)
        assertEquals("Series",value.seriesName);assertEquals("Model",value.modelName);assertEquals("1",value.mcuVersion);assertEquals("2",value.wifiVersion)
        assertEquals("sa",value.bindingRole)
        assertEquals(setOf("deviceNickname","deviceName","productName","productCategory","seriesName","modelName","mcuVersion","wifiVersion","bindingRole"),value.javaClass.declaredFields.filterNot {it.isSynthetic}.map {it.name}.toSet())
        assertFalse(value.toString().contains("secret-mac"));assertFalse(value.toString().contains("private.invalid"))
    }
    @Test fun summaryRejectsMismatchedResourceOrProductInsteadOfDisplayingAnotherDevice():Unit=runBlocking {
        for(raw in listOf(summary.replace("device/a ?","other"),summary.replace("\"id\":\"product\"","\"id\":\"other\""))) {
            val (_,repo)=fixture {JSONObject().put("data",JSONObject(raw))}
            assertTrue(runCatching {repo.summary()}.isFailure)
        }
    }
    @Test fun optionalSummaryTextStaysEmptyAndUnknownRoleDoesNotBecomeAdmin():Unit=runBlocking {
        val (_,repo)=fixture {JSONObject("""{"data":{"bindingRole":"future","device":{"id":"device/a ?"},"product":{"id":"product"}}}""")}
        val value=repo.summary();assertEquals("",value.deviceNickname);assertEquals("",value.deviceName);assertEquals("",value.mcuVersion);assertEquals("unknown",value.bindingRole)
    }
    @Test fun localizedObjectsAndOtherWrongTextTypesAreUnknownNotJsonStrings():Unit=runBlocking {
        val raw=JSONObject(summary);raw.getJSONObject("product").put("name",JSONObject().put("en","secret-localized"))
        raw.getJSONObject("device").put("wifiVersion",42);raw.put("deviceNickname",JSONArray().put("secret-array"))
        val (_,repo)=fixture {JSONObject().put("data",raw)};val value=repo.summary()
        assertEquals("",value.productName);assertEquals("",value.wifiVersion);assertEquals("",value.deviceNickname)
        assertFalse(value.toString().contains("secret-localized"));assertFalse(value.toString().contains("secret-array"))
    }
    @Test fun membersAreAnArrayWithLocalKeysWithoutContactsOrUserIds():Unit=runBlocking {
        val (_,repo)=fixture {JSONObject("""{"data":[{"userID":"secret-user","nickname":"Member","bindingRole":"mbr","email":"secret-email","mobile":"secret-mobile"},{"userID":"observer","bindingRole":"obs"}]}""")}
        val values=repo.members();assertEquals("/api/app/devices/device%2Fa%20%3F/users",calls.single().path)
        assertEquals(2,values.size);assertEquals("Member",values[0].nickname);assertEquals("",values[1].nickname);assertEquals("obs",values[1].bindingRole)
        assertNotEquals("secret-user",values[0].itemKey);assertNotEquals(values[0].itemKey,values[1].itemKey)
        assertEquals(setOf("itemKey","nickname","bindingRole"),values[0].javaClass.declaredFields.filterNot {it.isSynthetic}.map {it.name}.toSet())
        for(secret in listOf("secret-user","secret-email","secret-mobile"))assertFalse(values.toString().contains(secret))
        assertTrue(runCatching {(values as MutableList).clear()}.isFailure)
    }
    @Test fun duplicateMemberIdsAndMissingIdsFailRatherThanChoosingARole():Unit=runBlocking {
        for(data in listOf("[{\"userID\":\"same\",\"bindingRole\":\"sa\"},{\"userID\":\"same\",\"bindingRole\":\"mbr\"}]","[{\"nickname\":\"Contact\"}]","{}")) {
            val (_,repo)=fixture {JSONObject().put("data",JSONTokener(data).nextValue())}
            assertTrue(runCatching {repo.members()}.isFailure)
        }
    }
    @Test fun unknownMemberRoleRemainsUnknownAndEmptyArrayIsAnActualEmptyResult():Unit=runBlocking {
        val (_,repo)=fixture {JSONObject("""{"data":[{"userID":"id","bindingRole":"owner"}]}""")}
        assertEquals("unknown",repo.members().single().bindingRole)
        val (_,empty)=fixture {JSONObject().put("data",JSONArray())};assertTrue(empty.members().isEmpty())
    }
    @Test fun helpAlwaysRequestsTextAndProjectsFourStringsWithoutArticleIdsOrUrls():Unit=runBlocking {
        val (_,repo)=fixture {JSONObject("""{"data":[{"id":"private-article","title":"Guide","content":"Plain <b>text</b>","createdAt":"2026-01-01T00:00:00Z","url":"https://private.invalid"}]}""")}
        val value=repo.help().single();assertEquals("/api/app/devices/device%2Fa%20%3F/helping?type=text",calls.single().path)
        assertEquals("Guide",value.title);assertEquals("Plain <b>text</b>",value.content);assertEquals("2026-01-01T00:00:00Z",value.createdAt)
        assertEquals(setOf("itemKey","title","content","createdAt"),value.javaClass.declaredFields.filterNot {it.isSynthetic}.map {it.name}.toSet())
        assertFalse(value.toString().contains("private-article"));assertFalse(value.toString().contains("private.invalid"))
    }
    @Test fun helpEmptyArrayIsEmptyButMissingOrMalformedDataIsNot():Unit=runBlocking {
        val (_,empty)=fixture {JSONObject().put("data",JSONArray())};assertTrue(empty.help().isEmpty())
        for(response in listOf(JSONObject(),JSONObject().put("data",JSONObject()),JSONObject().put("data",JSONArray().put(42)))) {
            val (_,repo)=fixture {response};assertTrue(runCatching {repo.help()}.isFailure)
        }
    }
    @Test fun duplicateHelpIdsAreNotCollapsedOrExposedAsWriteAuthority():Unit=runBlocking {
        val (_,repo)=fixture {JSONObject("""{"data":[{"id":"same","content":"A"},{"id":"same","content":"B"}]}""")}
        assertTrue(runCatching {repo.help()}.isFailure)
    }
    @Test fun oldAccountRevisionNeverDispatchesAnyOfTheThreeReads():Unit=runBlocking {
        val (account,repo)=fixture {error("Old intent dispatched")};account.logout(account.revision);calls.clear()
        assertTrue(runCatching {repo.summary()}.isFailure);assertTrue(runCatching {repo.members()}.isFailure);assertTrue(runCatching {repo.help()}.isFailure)
        assertTrue(calls.isEmpty())
    }
    @Test fun wrongUserProofNeverDispatchesEvenAtTheSameRevision():Unit=runBlocking {
        val (account,_)=fixture {error("Wrong user dispatched")};calls.clear()
        val repo=HttpDeviceMoreReadRepository(account,DeviceMoreScope(account.revision,"device/a ?","wrong-user","product"))
        assertTrue(runCatching {repo.members()}.isFailure);assertTrue(calls.isEmpty())
    }
    @Test fun completeDotSegmentsAreRejectedBeforeAnyHttpDispatchButOpaqueIdsRemainEncoded():Unit=runBlocking {
        val (account,_)=fixture {JSONObject().put("data",JSONArray())};calls.clear()
        for(id in listOf(".",".."))assertTrue(runCatching {HttpDeviceMoreReadRepository(account,DeviceMoreScope(account.revision,id,"user","product")).members()}.isFailure)
        assertTrue(calls.isEmpty())
        HttpDeviceMoreReadRepository(account,DeviceMoreScope(account.revision,"a..b/%2e","user","product")).members()
        assertEquals("/api/app/devices/a..b%2F%252e/users",calls.single().path)
    }
    @Test fun cancellationAfterUncooperativeHttpDoesNotReturnAReadResult():Unit=runBlocking {
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val (_,repo)=fixture {entered.complete(Unit);withContext(NonCancellable){finish.await()};JSONObject().put("data",JSONArray())}
        var published=false;val job=launch {repo.members();published=true};entered.await();job.cancel();finish.complete(Unit);job.join()
        assertFalse(published);assertEquals(1,calls.size)
    }
    @Test fun accountChangeWhileReadIsSuspendedCannotPublishOldPrivateData():Unit=runBlocking {
        val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        val (account,repo)=fixture {if(it.method=="DELETE")JSONObject() else {entered.complete(Unit);withContext(NonCancellable){finish.await()};JSONObject().put("data",JSONArray())}}
        val job=async {runCatching {repo.members()}};entered.await();account.logout(account.revision);finish.complete(Unit)
        assertTrue(job.await().isFailure)
    }
}

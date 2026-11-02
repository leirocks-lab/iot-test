package com.rowan.iot.data.device

import com.rowan.iot.domain.account.AccountContext
import com.rowan.iot.domain.account.AccountSession
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.ota.*
import com.rowan.iot.domain.device.schedules.*
import com.rowan.iot.domain.network.ApiFailure
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class DeviceReadFeaturesTest {
    private fun session(user:String="fixture-user")=AccountSession.decode(JSONObject()
        .put("accessToken","fixture-access").put("refreshToken","fixture-refresh").put("userID",user).put("setting",JSONObject()))
    private inner class Fixture {
        val contexts=MutableStateFlow(AccountContext(7,session()))
        var authorizations=0;var connections=0;var scheduleLoads=0;var firmwareChecks=0
        val authorizedRevisions=mutableListOf<Long>()
        val scheduleScopes=mutableListOf<ScheduleScope>()
        val otaScopes=mutableListOf<OtaScope>()
        var authorizeHook:suspend()->Unit={}
        var schedulesHook:suspend()->Unit={}
        var firmwareHook:suspend()->Unit={}
        var proof:(String,Long)->AuthorizedDevice={id,revision->AuthorizedDevice(revision,id,"fixture-user","fixture-product","fixture-category","Native title","sa")}
        var scheduleData="""{"id":"private-schedule-id","name":"Fixture rule","type":"periodic","startTime":"22:00","repeatType":"custom","weekdays":[1,5],"timeZone":"America/Chicago","nextExecutionAt":"server-next","enabled":false,"mode":"private-mode","action":{"private-action":true},"future":{"token":"private-token","mac":"private-mac","url":"https://private.example.test"}}"""
        var offer=OtaOffer(OtaKind.MCU,OtaFirmware("private-firmware-id","2.0","Fixture notes"),OtaDevice("fixture-device","Fixture device","private-mac"))
        val gateway=object:DeviceAccessGateway {
            override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {
                authorizations++;authorizedRevisions+=expectedRevision;authorizeHook();return proof(resourceId,expectedRevision)
            }
            override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection {connections++;error("Read features never request MQTT credentials")}
        }
        val features=DeviceReadFeatures(contexts,gateway,{authorizedScope->
            scheduleScopes+=authorizedScope
            object:SchedulesRepository {
                override val scope=authorizedScope
                override suspend fun load():List<ScheduleRecord> {scheduleLoads++;schedulesHook();return listOf(ScheduleRecord.decode(authorizedScope,scheduleData))}
                override suspend fun create(draft:ScheduleDraft):ScheduleRecord=error("No mutations")
                override suspend fun update(existing:ScheduleRecord,draft:ScheduleDraft):ScheduleRecord=error("No mutations")
                override suspend fun setEnabled(scheduleId:String,enabled:Boolean):Boolean=error("No mutations")
                override suspend fun delete(scheduleId:String)=error("No mutations")
            }
        },{authorizedScope->
            otaScopes+=authorizedScope
            object:OtaRepository {
                override val scope=authorizedScope
                override suspend fun check(kind:OtaKind):OtaOffer {firmwareChecks++;firmwareHook();return offer.copy(kind=kind)}
                override suspend fun start(kind:OtaKind,firmwareId:String):String=error("No mutations")
                override suspend fun query(taskId:String):OtaResult=error("No tasks")
                override suspend fun cancel(taskId:String)=error("No mutations")
            }
        })
    }

    @Test fun everyMethodFreshlyAuthorizesTheNativeDeviceAndUsesOnlyUnknownModelReadScope():Unit=runBlocking {
        val f=Fixture()
        f.features.schedules("fixture-device",7);f.features.schedules("fixture-device",7)
        f.features.firmware("fixture-device",7,"mcu")
        assertEquals(3,f.authorizations);assertEquals(listOf(7L,7L,7L),f.authorizedRevisions)
        assertEquals(2,f.scheduleLoads);assertEquals(1,f.firmwareChecks);assertEquals(0,f.connections)
        f.scheduleScopes.forEach {assertEquals("fixture-device",it.resourceId);assertEquals("fixture-product",it.productId);assertNull(it.modelVersion)}
        assertEquals(7L,f.otaScopes.single().accountRevision);assertEquals("fixture-user",f.otaScopes.single().userId)
    }
    @Test fun scheduleProjectionHasOnlyTheSafeFieldsAndUsesALocalDisplayKey():Unit=runBlocking {
        val f=Fixture();val item=f.features.schedules("fixture-device",7).single()
        assertEquals(setOf("itemKey","name","type","startTime","repeatType","weekdays","timeZone","nextExecutionAt","enabledState"),
            item.javaClass.declaredFields.filterNot {it.isSynthetic}.map {it.name}.toSet())
        assertNotEquals("private-schedule-id",item.itemKey);assertTrue(item.itemKey.isNotBlank())
        assertEquals("Fixture rule",item.name);assertEquals("periodic",item.type);assertEquals("disabled",item.enabledState)
        assertEquals(listOf(1,5),item.weekdays);assertEquals("server-next",item.nextExecutionAt)
        for(secret in listOf("private-schedule-id","private-mode","private-action","private-token","private-mac","private.example"))
            assertFalse(item.toString().contains(secret))
    }
    @Test fun unknownReadFieldsRemainUnknownWithoutInventingAScheduleOrNextExecution():Unit=runBlocking {
        val f=Fixture();f.scheduleData="""{"id":"private-id","type":"future-type","repeatType":"future-repeat","enabled":"false","action":{"unregistered":1}}"""
        val item=f.features.schedules("fixture-device",7).single()
        assertEquals("unknown",item.type);assertEquals("unknown",item.repeatType);assertEquals("unknown",item.enabledState)
        assertNull(item.name);assertNull(item.startTime);assertNull(item.nextExecutionAt);assertNull(item.timeZone);assertTrue(item.weekdays.isEmpty())
    }
    @Test fun firmwareProjectionDoesNotExposeCandidateIdMacOrInventAnUpdateDecision():Unit=runBlocking {
        val f=Fixture();val value=f.features.firmware("fixture-device",7,"wifi")
        assertEquals(setOf("kind","version","remark","deviceName"),value.javaClass.declaredFields.filterNot {it.isSynthetic}.map {it.name}.toSet())
        assertEquals("wifi",value.kind);assertEquals("2.0",value.version);assertEquals("Fixture notes",value.remark)
        assertEquals("Fixture device",value.deviceName)
        assertFalse(value.toString().contains("private-firmware-id"));assertFalse(value.toString().contains("private-mac"))
    }
    @Test fun invalidKindNeverCallsOwnershipOrAnArbitraryHttpRoute():Unit=runBlocking {
        val f=Fixture()
        for(kind in listOf("MCU","../task","mcu?type=wifi","","other")) {
            val error=runCatching {f.features.firmware("fixture-device",7,kind)}.exceptionOrNull()
            assertTrue(error is DeviceReadFeatureFailure);assertNull(error!!.cause)
        }
        assertEquals(0,f.authorizations);assertEquals(0,f.firmwareChecks)
    }
    @Test fun missingOldOrPendingAccountContextNeverStartsAuthorization():Unit=runBlocking {
        for(context in listOf(AccountContext(8,session()),AccountContext(7,null),AccountContext(7,null,true))) {
            val f=Fixture();f.contexts.value=context
            val error=runCatching {f.features.schedules("fixture-device",7)}.exceptionOrNull() as DeviceReadFeatureFailure
            assertEquals("session_changed",error.code);assertEquals(0,f.authorizations);assertEquals(0,f.scheduleLoads)
        }
    }
    @Test fun deniedOwnershipCannotFetchSchedulesFirmwareOrCredentialsAndErrorsAreFixed():Unit=runBlocking {
        val f=Fixture();f.authorizeHook={throw ApiFailure(403,"private-token https://private.example.test/internal")}
        val first=runCatching {f.features.schedules("fixture-device",7)}.exceptionOrNull() as DeviceReadFeatureFailure
        val second=runCatching {f.features.firmware("fixture-device",7,"mcu")}.exceptionOrNull() as DeviceReadFeatureFailure
        assertEquals("forbidden",first.code);assertEquals(first.code,second.code);assertEquals(first.message,second.message);assertNull(first.cause)
        assertTrue(first.ownershipRevoked);assertTrue(second.ownershipRevoked)
        assertFalse(first.toString().contains("private-token"));assertFalse(first.toString().contains("private.example"))
        assertEquals(0,f.scheduleLoads);assertEquals(0,f.firmwareChecks);assertEquals(0,f.connections)
    }
    @Test fun freshOwnershipRejectionCarriesRevocationForBothReadKinds():Unit=runBlocking {
        for(code in listOf(403,1342)) {
            val f=Fixture();f.authorizeHook={throw ApiFailure(code,"private")}
            val schedule=runCatching {f.features.schedules("fixture-device",7)}.exceptionOrNull() as DeviceReadFeatureFailure
            val firmware=runCatching {f.features.firmware("fixture-device",7,"wifi")}.exceptionOrNull() as DeviceReadFeatureFailure
            assertEquals("forbidden",schedule.code);assertTrue(schedule.ownershipRevoked)
            assertEquals("forbidden",firmware.code);assertTrue(firmware.ownershipRevoked)
            assertTrue(f.scheduleScopes.isEmpty());assertTrue(f.otaScopes.isEmpty())
        }
    }
    @Test fun aFeatureRepositoryPermissionFailureDoesNotRevokeDeviceOwnership():Unit=runBlocking {
        val f=Fixture();f.schedulesHook={throw ApiFailure(403,"private")};f.firmwareHook={throw ApiFailure(403,"private")}
        val schedule=runCatching {f.features.schedules("fixture-device",7)}.exceptionOrNull() as DeviceReadFeatureFailure
        val firmware=runCatching {f.features.firmware("fixture-device",7,"mcu")}.exceptionOrNull() as DeviceReadFeatureFailure
        assertEquals("forbidden",schedule.code);assertFalse(schedule.ownershipRevoked)
        assertEquals("forbidden",firmware.code);assertFalse(firmware.ownershipRevoked)
        assertEquals(2,f.authorizations);assertEquals(1,f.scheduleLoads);assertEquals(1,f.firmwareChecks)
    }
    @Test fun documentedFirmwareUnboundAfterFreshProofStillRevokesOwnership():Unit=runBlocking {
        // V1.4 OTA-01=1492 and OTA-02=1502 explicitly mean not bound, unlike feature RBAC 403.
        for((kind,code) in listOf("mcu" to 1492,"wifi" to 1502)) {
            val f=Fixture();f.firmwareHook={throw ApiFailure(code,"private-token")}
            val failure=runCatching {f.features.firmware("fixture-device",7,kind)}.exceptionOrNull() as DeviceReadFeatureFailure
            assertEquals(1,f.authorizations);assertEquals(1,f.firmwareChecks)
            assertEquals("forbidden",failure.code);assertTrue(failure.ownershipRevoked)
            assertNull(failure.cause);assertFalse(failure.toString().contains("private-token"))
            assertEquals(0,f.connections)
        }
    }
    @Test fun firmwareNotFoundGenericRbacAndUnknownSuffixCodesDoNotRevokeOwnership():Unit=runBlocking {
        for(code in listOf(403,404,1491,1501,9992)) {
            val f=Fixture();f.firmwareHook={throw ApiFailure(code,"private")}
            val failure=runCatching {f.features.firmware("fixture-device",7,"mcu")}.exceptionOrNull() as DeviceReadFeatureFailure
            assertFalse("Never infer ownership revocation from a suffix or a not-found response",failure.ownershipRevoked)
            assertEquals(1,f.authorizations);assertEquals(1,f.firmwareChecks)
        }
    }
    @Test fun lateFirmwareUnboundAfterAccountSwitchIsSessionChangedWithoutRevocationMarker():Unit=runBlocking {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        f.firmwareHook={entered.complete(Unit);withContext(NonCancellable){finish.await()};throw ApiFailure(1492,"private")}
        val work=async {runCatching {f.features.firmware("fixture-device",7,"mcu")}};entered.await()
        f.contexts.value=AccountContext(8,session("another-user"));finish.complete(Unit)
        val failure=work.await().exceptionOrNull() as DeviceReadFeatureFailure
        assertEquals("session_changed",failure.code);assertFalse(failure.ownershipRevoked)
    }
    @Test fun mismatchedNativeProofIsRejectedBeforeAnyFeatureRepositoryIsConstructed():Unit=runBlocking {
        for(proof in listOf(
            AuthorizedDevice(8,"fixture-device","fixture-user","fixture-product","category","title",null),
            AuthorizedDevice(7,"another-device","fixture-user","fixture-product","category","title",null),
            AuthorizedDevice(7,"fixture-device","another-user","fixture-product","category","title",null),
            AuthorizedDevice(7,"fixture-device","fixture-user","","category","title",null))) {
            val f=Fixture();f.proof={_,_->proof}
            assertTrue(runCatching {f.features.schedules("fixture-device",7)}.exceptionOrNull() is DeviceReadFeatureFailure)
            assertTrue(f.scheduleScopes.isEmpty());assertTrue(f.otaScopes.isEmpty())
        }
    }
    @Test fun accountChangeDuringAuthorizationCannotOpenAFeatureRepository():Unit=runBlocking {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        f.authorizeHook={entered.complete(Unit);withContext(NonCancellable){finish.await()}}
        val work=async {runCatching {f.features.schedules("fixture-device",7)}}
        entered.await();f.contexts.value=AccountContext(8,session("another-user"));finish.complete(Unit)
        assertEquals("session_changed",(work.await().exceptionOrNull() as DeviceReadFeatureFailure).code)
        assertTrue(f.scheduleScopes.isEmpty())
    }
    @Test fun lateFeatureReadAfterAccountChangeDoesNotReturnAnOldSummary():Unit=runBlocking {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        f.schedulesHook={entered.complete(Unit);withContext(NonCancellable){finish.await()}}
        val work=async {runCatching {f.features.schedules("fixture-device",7)}}
        entered.await();f.contexts.value=AccountContext(8,session("another-user"));finish.complete(Unit)
        assertEquals("session_changed",(work.await().exceptionOrNull() as DeviceReadFeatureFailure).code)
    }
    @Test fun cancellingAnUncooperativeFirmwareReadRemainsCancellationAndReturnsNoOffer():Unit=runBlocking {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        f.firmwareHook={entered.complete(Unit);withContext(NonCancellable){finish.await()}}
        var returned=false
        val work=launch {f.features.firmware("fixture-device",7,"mcu");returned=true}
        entered.await();work.cancel();finish.complete(Unit);work.join()
        assertTrue(work.isCancelled);assertFalse(returned)
    }
    @Test fun backendReadFailureDoesNotExposeItsRawMessageOrCause():Unit=runBlocking {
        val f=Fixture();f.schedulesHook={throw java.io.IOException("private-token https://private.example.test")}
        val error=runCatching {f.features.schedules("fixture-device",7)}.exceptionOrNull() as DeviceReadFeatureFailure
        assertTrue(error.code in setOf("read_failed","unavailable"));assertNull(error.cause)
        assertFalse(error.toString().contains("private-token"));assertFalse(error.toString().contains("private.example"))
    }
}

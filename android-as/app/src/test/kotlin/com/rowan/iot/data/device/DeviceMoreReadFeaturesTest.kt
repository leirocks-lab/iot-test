package com.rowan.iot.data.device

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.device.*
import com.rowan.iot.domain.device.more.*
import com.rowan.iot.domain.network.ApiFailure
import com.rowan.iot.domain.rooms.*
import java.io.IOException
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class DeviceMoreReadFeaturesTest {
    private fun session(user:String="user")=AccountSession.decode(JSONObject().put("accessToken","fixture").put("refreshToken","refresh").put("userID",user).put("setting",JSONObject()))
    private inner class Fixture {
        val contexts=MutableStateFlow(AccountContext(7,session()))
        var authorizations=0;var connections=0;var reads=0;var roomReads=0;var moves=0
        var hook:suspend()->Unit={};var authHook:suspend()->Unit={}
        var proof:(String,Long)->AuthorizedDevice={id,rev->AuthorizedDevice(rev,id,"user","product","category","title","sa")}
        val scopes=mutableListOf<DeviceMoreScope>()
        var wrongScope=false
        var room:RoomLocation?=null
        val gateway=object:DeviceAccessGateway {
            override suspend fun authorize(resourceId:String,expectedRevision:Long):AuthorizedDevice {authorizations++;authHook();return proof(resourceId,expectedRevision)}
            override suspend fun connection(device:AuthorizedDevice):PreparedDeviceConnection {connections++;error("No credentials")}
        }
        val features=DeviceMoreReadFeatures(contexts,gateway,{requested->
            scopes+=requested
            object:DeviceMoreReadRepository {
                override val scope=if(wrongScope)requested.copy(productId="wrong")else requested
                override suspend fun summary():DeviceMoreSummary {reads++;hook();return DeviceMoreSummary("Nick","Device","Product","fan","Series","Model","1","2","sa")}
                override suspend fun members():List<DeviceMoreMember> {reads++;hook();return listOf(DeviceMoreMember("local","Member","mbr"))}
                override suspend fun help():List<DeviceMoreHelp> {reads++;hook();return emptyList()}
            }
        },{requested->scopes+=requested;object:DeviceRoomRepository {
            override suspend fun location(deviceId:String):RoomLocation? {assertEquals("device",deviceId);roomReads++;hook();return room}
            override suspend fun move(deviceId:String,roomId:RoomId?):RoomLocation? {moves++;error("No mutations")}
        }})
        suspend fun invoke(kind:Int) {when(kind) {0->features.summary("device",7);1->features.members("device",7);2->features.help("device",7);else->features.location("device",7)}}
    }
    @Test fun allFourReadsFreshlyAuthorizeAndCarryCompleteNativeScopeWithoutConnecting():Unit=runBlocking {
        val f=Fixture();repeat(4){f.invoke(it)};f.invoke(0)
        assertEquals(5,f.authorizations);assertEquals(4,f.reads);assertEquals(1,f.roomReads);assertEquals(0,f.connections);assertEquals(0,f.moves)
        f.scopes.forEach {assertEquals(DeviceMoreScope(7,"device","user","product"),it)}
    }
    @Test fun roomMissingIsUnknownAndNeverInventsUnassigned():Unit=runBlocking {
        val f=Fixture();val missing=f.features.location("device",7)
        assertEquals("unknown",missing.assignment);assertEquals("",missing.roomName)
        f.room=RoomLocation(RoomId.Text("private-room"),"Study")
        val assigned=f.features.location("device",7);assertEquals("assigned",assigned.assignment);assertEquals("Study",assigned.roomName)
        assertEquals(setOf("assignment","roomName"),assigned.javaClass.declaredFields.filterNot {it.isSynthetic}.map {it.name}.toSet())
        assertFalse(assigned.toString().contains("private-room"));assertEquals(0,f.moves)
    }
    @Test fun oldMissingOrPendingContextsBlockAllMethodsBeforeAuthorization():Unit=runBlocking {
        for(context in listOf(AccountContext(8,session()),AccountContext(7,null),AccountContext(7,session(),true)))for(kind in 0..3) {
            val f=Fixture();f.contexts.value=context
            val failure=runCatching {f.invoke(kind)}.exceptionOrNull() as DeviceMoreReadFailure
            assertEquals("session_changed",failure.code);assertEquals(0,f.authorizations);assertTrue(f.scopes.isEmpty())
        }
    }
    @Test fun malformedOrDotDeviceIdsNeverAuthorizeOrDispatch():Unit=runBlocking {
        val f=Fixture()
        for(id in listOf(".","..",""," ","bad\npath")) {
            assertTrue(runCatching {f.features.summary(id,7)}.exceptionOrNull() is DeviceMoreReadFailure)
            assertTrue(runCatching {f.features.location(id,7)}.exceptionOrNull() is DeviceMoreReadFailure)
        }
        assertEquals(0,f.authorizations);assertTrue(f.scopes.isEmpty())
    }
    @Test fun mismatchedAuthorizationCannotConstructAnyFeatureRepository():Unit=runBlocking {
        for(proof in listOf(AuthorizedDevice(8,"device","user","product","c","t",null),AuthorizedDevice(7,"other","user","product","c","t",null),AuthorizedDevice(7,"device","other","product","c","t",null),AuthorizedDevice(7,"device","user","","c","t",null))) {
            val f=Fixture();f.proof={_,_->proof}
            for(kind in 0..3)assertTrue(runCatching {f.invoke(kind)}.exceptionOrNull() is DeviceMoreReadFailure)
            assertTrue(f.scopes.isEmpty());assertEquals(0,f.connections)
        }
    }
    @Test fun repositoryScopeMismatchIsRejectedBeforeReading():Unit=runBlocking {
        val f=Fixture();f.wrongScope=true
        for(kind in 0..2)assertTrue(runCatching {f.invoke(kind)}.exceptionOrNull() is DeviceMoreReadFailure)
        assertEquals(0,f.reads)
    }
    @Test fun knownUnboundAndForbiddenCodesHaveFixedPermissionErrorWithoutBackendCause():Unit=runBlocking {
        for(code in listOf(403,1342,1352,1402,1452))for(kind in 0..3) {
            val f=Fixture();f.hook={throw ApiFailure(code,"secret-token https://private.invalid")}
            val error=runCatching {f.invoke(kind)}.exceptionOrNull() as DeviceMoreReadFailure
            assertEquals("forbidden",error.code);assertNull(error.cause);assertFalse(error.toString().contains("secret"));assertFalse(error.toString().contains("private.invalid"))
            assertEquals("Generic feature 403 is RBAC; documented unbound codes revoke ownership",code!=403,error.ownershipRevoked)
        }
        val f=Fixture();f.authHook={throw ApiFailure(403,"private")}
        assertEquals("forbidden",(runCatching {f.invoke(0)}.exceptionOrNull() as DeviceMoreReadFailure).code);assertTrue(f.scopes.isEmpty())
    }
    @Test fun freshOwnershipRejectionMarksAllFourReadsWithoutOpeningRepositories():Unit=runBlocking {
        for(code in listOf(403,1342))for(kind in 0..3) {
            val f=Fixture();f.authHook={throw ApiFailure(code,"private")}
            val failure=runCatching {f.invoke(kind)}.exceptionOrNull() as DeviceMoreReadFailure
            assertEquals("forbidden",failure.code);assertTrue(failure.ownershipRevoked)
            assertTrue(f.scopes.isEmpty());assertEquals(0,f.reads);assertEquals(0,f.roomReads)
        }
    }
    @Test fun documentedFeatureUnboundAfterFreshProofStillCarriesOwnershipRevocation():Unit=runBlocking {
        // V1.4 DEVICE-02 / MORE-01 / MORE-05 / ROOM-02 each explicitly say not bound.
        for((kind,code) in listOf(0 to 1342,1 to 1352,2 to 1452,3 to 1402)) {
            val f=Fixture();f.hook={throw ApiFailure(code,"private-token")}
            val failure=runCatching {f.invoke(kind)}.exceptionOrNull() as DeviceMoreReadFailure
            assertEquals(1,f.authorizations);assertEquals(1,f.scopes.size)
            assertEquals("forbidden",failure.code);assertTrue(failure.ownershipRevoked)
            assertNull(failure.cause);assertFalse(failure.toString().contains("private-token"))
            assertEquals(if(kind==3)1 else 0,f.roomReads)
            assertEquals(if(kind==3)0 else 1,f.reads)
        }
    }
    @Test fun featureNotFoundGenericRbacAndUnknownSuffixCodesDoNotInventOwnershipRevocation():Unit=runBlocking {
        for(code in listOf(403,404,1341,1351,1401,1451,9992)) {
            val f=Fixture();f.hook={throw ApiFailure(code,"private")}
            val failure=runCatching {f.invoke(1)}.exceptionOrNull() as DeviceMoreReadFailure
            assertFalse("Only explicitly documented unbound codes are ownership evidence",failure.ownershipRevoked)
            assertEquals(1,f.authorizations)
        }
    }
    @Test fun lateKnownUnboundCannotRevokeTheAccountThatReplacedItsReadIntent():Unit=runBlocking {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val finish=CompletableDeferred<Unit>()
        f.hook={entered.complete(Unit);withContext(NonCancellable){finish.await()};throw ApiFailure(1352,"private")}
        val work=async {runCatching {f.invoke(1)}};entered.await()
        f.contexts.value=AccountContext(8,session("other"));finish.complete(Unit)
        val failure=work.await().exceptionOrNull() as DeviceMoreReadFailure
        assertEquals("session_changed",failure.code);assertFalse(failure.ownershipRevoked)
    }
    @Test fun ioAndMalformedResponsesUseClosedVocabularyWithoutLeakingMessages():Unit=runBlocking {
        for((thrown,expected) in listOf(IOException("secret") to "unavailable",ApiFailure(502,"secret") to "read_failed",IllegalArgumentException("secret") to "read_failed")) {
            val f=Fixture();f.hook={throw thrown}
            val error=runCatching {f.invoke(2)}.exceptionOrNull() as DeviceMoreReadFailure
            assertEquals(expected,error.code);assertNull(error.cause);assertFalse(error.toString().contains("secret"))
        }
    }
    @Test fun accountChangeDuringAuthorizationPreventsAnyRead():Unit=runBlocking {
        val f=Fixture();val entered=CompletableDeferred<Unit>();val done=CompletableDeferred<Unit>()
        f.authHook={entered.complete(Unit);withContext(NonCancellable){done.await()}}
        val work=async {runCatching {f.invoke(0)}};entered.await();f.contexts.value=AccountContext(8,session("other"));done.complete(Unit)
        assertEquals("session_changed",(work.await().exceptionOrNull() as DeviceMoreReadFailure).code);assertTrue(f.scopes.isEmpty())
    }
    @Test fun oldAccountResultsAndLateErrorsAreFencedForAllFourReads():Unit=runBlocking {
        for(kind in 0..3) {
            val f=Fixture();val entered=CompletableDeferred<Unit>();val done=CompletableDeferred<Unit>()
            f.hook={entered.complete(Unit);withContext(NonCancellable){done.await()};if(kind==1)throw ApiFailure(403,"private")}
            val work=async {runCatching {f.invoke(kind)}};entered.await();f.contexts.value=AccountContext(8,session("other"));done.complete(Unit)
            assertEquals("session_changed",(work.await().exceptionOrNull() as DeviceMoreReadFailure).code)
        }
    }
    @Test fun callerCancellationCannotPublishEvenIfDependencyIgnoresIt():Unit=runBlocking {
        for(kind in 0..3) {
            val f=Fixture();val entered=CompletableDeferred<Unit>();val done=CompletableDeferred<Unit>();var published=false
            f.hook={entered.complete(Unit);withContext(NonCancellable){done.await()}}
            val work=launch {f.invoke(kind);published=true};entered.await();work.cancel();done.complete(Unit);work.join()
            assertFalse(published);assertEquals(0,f.connections);assertEquals(0,f.moves)
        }
    }
    @Test fun preCancelledCallerDoesNotStartAuthorization():Unit=runBlocking {
        val f=Fixture();val work=launch(start=CoroutineStart.LAZY){f.invoke(0)};work.cancel();work.start();work.join()
        assertEquals(0,f.authorizations)
    }
}

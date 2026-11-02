package com.rowan.iot

import com.rowan.iot.domain.account.*
import com.rowan.iot.domain.network.HttpGateway
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class StartupCoordinatorTest {
    @Test fun rotatingOrLeavingOneScreenDoesNotCancelSharedRestore()=runBlocking {
        val started=CompletableDeferred<Unit>();val response=CompletableDeferred<Unit>()
        var patches=0
        val storage=object:SessionStorage {
            var value:String?="""{"accessToken":"old","refreshToken":"refresh","userID":"u1","setting":{"language":"en"}}"""
            override fun read()=value
            override fun write(value:String?) {this.value=value}
        }
        val account=AccountService(HttpGateway {_,_,_,_->
            patches++;started.complete(Unit);response.await()
            JSONObject().put("data",JSONObject("""{"accessToken":"new","refreshToken":"renewed","expiresIn":600}"""))
        },storage)
        val owner=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined)
        try {
            val startup=StartupCoordinator(account,owner)
            val first=async {startup.restore()}
            started.await();first.cancelAndJoin()
            val second=async {startup.restore()}
            response.complete(Unit);second.await()
            assertEquals(1,patches)
            assertEquals("new",account.session?.accessToken)
            assertEquals("en",account.session?.language)
        } finally {owner.cancel()}
    }
}

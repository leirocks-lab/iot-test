package com.rowan.iot.app

import android.content.Context
import com.rowan.iot.BuildConfig
import com.rowan.iot.data.http.RowanHttpClient
import com.rowan.iot.data.storage.SecureSessionStorage
import com.rowan.iot.domain.account.AccountService
import com.rowan.iot.domain.account.AgreementService
import com.rowan.iot.domain.account.RecoveryService
import com.rowan.iot.domain.account.EmailCodeCooldowns
import com.rowan.iot.domain.account.RegistrationService
import com.rowan.iot.domain.account.StartupCoordinator
import kotlinx.coroutines.*
import com.rowan.iot.domain.device.HomeRepository
import com.rowan.iot.data.http.HttpHomeRepository
import com.rowan.iot.data.http.HttpDeviceAccess
import com.rowan.iot.data.device.NativeDeviceServices
import com.rowan.iot.data.mqtt.auth.ExpiryEncoding
import com.rowan.iot.data.mqtt.paho.PahoBrokerTransportFactory
import com.rowan.iot.domain.device.state.DeviceReadOwner

class AppServices(
    context:Context,
    val http:com.rowan.iot.domain.network.HttpGateway=RowanHttpClient(BuildConfig.PLATFORM_URL,BuildConfig.IOT_URL,BuildConfig.TENANT_ID,BuildConfig.FLAVOR=="development"),
    val account:AccountService=AccountService(http,SecureSessionStorage(context)),
    val home:HomeRepository=HttpHomeRepository(account),
    private val selfUnbindJournalFactory:()->com.rowan.iot.domain.device.more.SelfUnbindRecoveryJournal={com.rowan.iot.data.storage.EncryptedSelfUnbindJournal(context)},
) {
    private val scanApplicationContext=context.applicationContext
    val scanPhotos by lazy { com.rowan.iot.platform.scan.NativeQrPhotoReader(scanApplicationContext) }
    private val applicationScope=CoroutineScope(SupervisorJob()+Dispatchers.Default)
    val startup=StartupCoordinator(account,applicationScope)
    val agreements = AgreementService(http,BuildConfig.BRAND_ID.takeIf {it.isNotBlank()})
    private val emailCooldowns=EmailCodeCooldowns()
    fun newRecovery() = RecoveryService(http,cooldowns=emailCooldowns)
    fun newRegistration()=RegistrationService(http,account,emailCooldowns)
    fun newLogin()=com.rowan.iot.domain.account.EmailLoginService(account,http,emailCooldowns)
    // Account/startup paths do not initialize MQTT, the SDK adapter or its connection pool.
    private val deviceServicesDelegate=lazy {
        NativeDeviceServices(applicationScope, account.contexts,
            HttpDeviceAccess(account, ExpiryEncoding.UNKNOWN), PahoBrokerTransportFactory(diagnostics={ failure ->
                if(BuildConfig.FLAVOR=="development")android.util.Log.i("RowanMqtt",
                    "kind=${failure.kind.name} reasonCode=${failure.reasonCode?:-1} cause=${failure.causeCategory.name}")
            }))
    }
    private val deviceServices by deviceServicesDelegate
    val devices: DeviceReadOwner get() = deviceServices.devices
    private val homeReadScopes=com.rowan.iot.domain.home.HomeReadScopes(account::contextSnapshot)
    fun homeReadGate(expectedRevision:Long)=homeReadScopes.forRevision(expectedRevision)
    val selfUnbind by lazy {com.rowan.iot.domain.device.more.SelfUnbindApplication(applicationScope,account.contexts,
        selfUnbindJournalFactory(),HttpDeviceAccess(account,ExpiryEncoding.UNKNOWN),
        {com.rowan.iot.data.http.HttpSelfUnbindRepository(account,it)},
        {if(deviceServicesDelegate.isInitialized())deviceServicesDelegate.value.devices else null})}
    fun newSelfUnbindHomeConsumer(tabs:com.rowan.iot.domain.home.HomeRoomTabs,expectedRevision:Long,pageScope:CoroutineScope,current:()->Boolean)=
        com.rowan.iot.domain.home.SelfUnbindHomeConsumer(pageScope,tabs,selfUnbind,expectedRevision,current)
    val deviceReadFeatures by lazy { com.rowan.iot.data.device.DeviceReadFeatures(account) }
    val deviceMoreReadFeatures by lazy { com.rowan.iot.data.device.DeviceMoreReadFeatures(account) }
    private val preferencesGateLock=Any()
    private var preferencesGateRevision=Long.MIN_VALUE
    private var preferencesGate=com.rowan.iot.domain.preferences.PreferencesTransactionGate()
    private fun preferencesGateFor(revision:Long)=synchronized(preferencesGateLock) {
        // Revisions only advance: a late old-page factory cannot replace the new account's gate.
        if(revision<preferencesGateRevision)throw com.rowan.iot.domain.network.ApiFailure(499,"登录会话已变化")
        if(revision>preferencesGateRevision) {
            preferencesGateRevision=revision;preferencesGate=com.rowan.iot.domain.preferences.PreferencesTransactionGate()
        }
        preferencesGate
    }
    fun newPreferences(expectedRevision:Long):com.rowan.iot.domain.preferences.PreferencesService {
        val source=account.contextSnapshot()
        if(source.revision!=expectedRevision||source.session==null||source.cleanupRequired)
            throw com.rowan.iot.domain.network.ApiFailure(499,"登录会话已变化")
        val repository=com.rowan.iot.data.http.HttpPreferencesRepository(account)
        if(repository.expectedRevision!=expectedRevision)throw com.rowan.iot.domain.network.ApiFailure(499,"登录会话已变化")
        val userId=source.session.userId
        return com.rowan.iot.domain.preferences.PreferencesService(repository,{
            account.contextSnapshot().let {it.revision==expectedRevision&&!it.cleanupRequired&&it.session?.userId==userId}
        },account::commitSettings,transactionGate=preferencesGateFor(expectedRevision),
            settingsPublication={account.contextSnapshot().settingsPublication})
    }
    private val presentationInputs by lazy {com.rowan.iot.platform.presentation.AndroidPresentationSystemSource(context.applicationContext as android.app.Application)}
    private val presentationDelegate=lazy {com.rowan.iot.domain.presentation.PresentationService(applicationScope,account.contexts,
        com.rowan.iot.domain.presentation.PresentationOwner(account::contextSnapshot),presentationInputs)}
    val presentation get()=presentationDelegate.value
    fun startPresentation():Boolean {
        check(android.os.Looper.myLooper()==android.os.Looper.getMainLooper())
        return presentation.start()
    }
    fun closePresentation(){if(presentationDelegate.isInitialized())presentationDelegate.value.close()}
    fun makeProductCatalog():com.rowan.iot.domain.products.ProductCatalogService =
        com.rowan.iot.data.http.HttpProductCatalog(account,BuildConfig.PRODUCT_BRAND_ID.takeIf {it.isNotBlank()})
}

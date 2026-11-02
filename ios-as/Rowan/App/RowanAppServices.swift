import Foundation

@MainActor
final class RowanAppServices {
  static let shared = RowanAppServices()
  let account = AccountService(http: RowanHTTPClient(), storage: KeychainSessionStorage())
  /// Unknown expiry/Host are deliberately not treated as verified transport configuration.
  private var nativeDevicesStorage:NativeDeviceServices?
  var nativeDevices:NativeDeviceServices {
    if let value=nativeDevicesStorage{return value}
    let value=NativeDeviceServices(account:account,expiryEncoding:.unknown,hostPolicy:.unknown);nativeDevicesStorage=value;return value
  }
  private lazy var homeReadScopes=HomeReadScopes(authority:{[account] in guard let session=account.session,account.pendingLogoutCleanupRevision==nil else{return nil};return (account.revision,session.userID)})
  func homeReadGate(expectedRevision:Int)->HomeReadGate? {homeReadScopes.forRevision(expectedRevision)}
  private var selfUnbindStorage:SelfUnbindApplication?
  private var selfUnbindNotification:NSObjectProtocol?
  var selfUnbind:SelfUnbindApplication {
    if let value=selfUnbindStorage{return value}
    let value=SelfUnbindApplication(currentAccount:{[account] in
      guard let session=account.session,account.pendingLogoutCleanupRevision==nil else{return nil}
      return MQTTPoolIdentity(revision:account.revision,userID:session.userID)
    },journal:KeychainSelfUnbindJournal(),access:HTTPDeviceAccess(account:account,expiryEncoding:.unknown),
      repositories:{[account] in HTTPSelfUnbindRepository(account:account,scope:$0)},ownerIfCreated:{[weak self] in self?.nativeDevicesStorage?.devices})
    selfUnbindStorage=value
    selfUnbindNotification=NotificationCenter.default.addObserver(forName:.rowanAccountContextChanged,object:account,queue:.main){[weak value] _ in
      Task { @MainActor [weak value] in value?.accountChanged() }
    }
    return value
  }
  lazy var home: any HomeRepository = HTTPHomeRepository(account: account)
  let agreements: any AgreementContentService = HTTPAgreementContentService(http: RowanHTTPClient())
  let passwordRecovery: any PasswordRecoveryService = HTTPPasswordRecoveryService(http: RowanHTTPClient())
  let recoveryCooldowns = PasswordRecoveryCooldowns()
  lazy var emailLoginCodes: any EmailLoginCodeService = HTTPEmailLoginCodeService(http: RowanHTTPClient(), cooldowns: recoveryCooldowns)
  let registrationCaptcha: any RegistrationCaptchaService = HTTPRegistrationCaptchaService(http: RowanHTTPClient())
  private let presentationInputs=UIKitPresentationSystemSource()
  private var presentationStorage:PresentationService?
  var presentation:PresentationService {
    if let value=presentationStorage{return value}
    let value=PresentationService(owner:PresentationOwner(account:account),system:presentationInputs,
      accountSignals:AccountPresentationSignals(account:account));presentationStorage=value;return value
  }
  @discardableResult func startPresentation(window:PresentationWindow)->Bool {
    guard presentationInputs.bind(window:window) else{return false};return presentation.start()
  }
  func stopPresentation(){presentationStorage?.close();presentationInputs.unbindWindow()}
  /// Each caller captures the current account revision; the instance is never reused after switching accounts.
  func makeRoomRepository() -> HTTPRoomRepository { HTTPRoomRepository(account: account) }
  private var preferencesScope: (revision: Int, gate: PreferencesOperationGate)?
  func newPreferences(expectedRevision: Int) throws -> PreferencesService {
    guard account.revision == expectedRevision, let userID = account.session?.userID,
          account.pendingLogoutCleanupRevision == nil else { throw RowanFailure(code: 499, message: "登录会话已变化") }
    if preferencesScope?.revision != expectedRevision { preferencesScope = (expectedRevision, PreferencesOperationGate()) }
    guard let gate = preferencesScope?.gate else { preconditionFailure("Preferences gate missing") }
    return PreferencesService(repository: HTTPPreferencesRepository(account: account), currentAccountValid: { [account] in
      account.revision == expectedRevision && account.session?.userID == userID && account.pendingLogoutCleanupRevision == nil
    }, commitSettings: { [account] revision, raw, publication in
      try await account.commitSettings(expectedRevision: revision, rawJSON: raw, expectedSettingsPublication: publication)
    }, transactionGate: gate, settingsPublication: { [account] in account.settingsRevision })
  }
}

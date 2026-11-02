import UIKit

@MainActor
@objcMembers
final class RowanHostServices: NSObject {
  static let shared = RowanHostServices()
  @nonobjc private var account: AccountService { RowanAppServices.shared.account }
  @nonobjc private lazy var observations = NativeDeviceObservations(owner: RowanAppServices.shared.nativeDevices.devices)
  @nonobjc private var reads: [String: NativeDeviceBridgeReads] = [:]
  @nonobjc private var unbindBridges:[String:DeviceSelfUnbindBridge]=[:]
  @nonobjc private var unbindContexts:[String:SelfUnbindBridgeContext]=[:]
  @nonobjc private var unbindRegistrations:[String:NativeSelfUnbindRegistration]=[:]
  @nonobjc private var unbindAlerts:[String:UIAlertController]=[:]
  @nonobjc private var sinks: [String: ([String: Any]) -> Void] = [:]
  @nonobjc private var notifications: [NSObjectProtocol] = []
  weak var deviceController: UIViewController?
  private override init() {
    super.init()
    observations.emit = { [weak self] owner, snapshot in self?.sinks[owner]?(snapshot.dictionary) }
    observations.invalidated = { [weak self] id in self?.reads.values.forEach { $0.cancel(observation: id) };self?.unbindBridges.values.forEach {$0.suspendObservation(id)} }
    observations.released = {[weak self] id in self?.releaseUnbind(id)}
    notifications.append(NotificationCenter.default.addObserver(forName: .rowanAccountContextChanged, object: nil, queue: .main) { [weak self] note in
      guard let changed = note.object as? AccountService else { return }
      Task { @MainActor [weak self] in guard let self, changed === account else { return }; observations.accountChanged() }
    })
    notifications.append(NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in self?.observations.resumeVisible() }
    })
    notifications.append(NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor [weak self] in self?.reads.values.forEach { $0.cancel() };self?.unbindBridges.values.forEach {$0.suspendAll()} }
    })
  }
  func beginModule(_ sink: @escaping ([String: Any]) -> Void) -> String {
    let owner = UUID().uuidString; sinks[owner] = sink
    let account = self.account, deviceOwner = observations.deviceOwner
    reads[owner] = NativeDeviceBridgeReads(observations: observations, owner: owner, read: { context, gate, request in
      try await NativeDeviceBoundReads.read(account: account, owner: deviceOwner, context: context, gate: gate, request: request)
    })
    unbindBridges[owner]=DeviceSelfUnbindBridge(capture:{[weak self] id in self?.captureUnbind(id,owner:owner)},confirm:{[weak self] title,yes,no in
      guard let self,let page=deviceController as? DeviceViewController,page.bridgeVisible,page.authorizedBridgeContext(),
        UIApplication.shared.applicationState == .active,page.navigationController?.topViewController === page,page.presentedViewController==nil else{throw BridgeObservationFailure.closed}
      let alert=UIAlertController(title:"解除设备关联",message:"是否解除当前账号与“\(title)”的关联？",preferredStyle:.alert)
      alert.addAction(UIAlertAction(title:"取消",style:.cancel){_ in no()})
      alert.addAction(UIAlertAction(title:"解除关联",style:.destructive){_ in yes()})
      unbindAlerts[owner]=alert;page.present(alert,animated:true)
      return {[weak self,weak alert] in
        guard let alert else{return}
        // Keep this exact native alert recognizable through UIKit's dismissal transition.
        // Removing it first would make the confirmed app worker reject its own page while
        // presentedViewController still points at the dismissing alert.
        alert.dismiss(animated:false){[weak self,weak alert] in if self?.unbindAlerts[owner] === alert{self?.unbindAlerts.removeValue(forKey:owner)}}
      }
    },knownObservation:{[weak self] id in self?.observations.isKnown(id,owner:owner)==true})
    return owner
  }
  func endModule(_ owner: String) { unbindBridges.removeValue(forKey:owner)?.close(); reads.removeValue(forKey: owner)?.close(); observations.releaseOwner(owner); sinks.removeValue(forKey: owner) }
  @objc(observeDevice:owner:error:)
  func observeDevice(_ deviceID: String, owner: String) throws -> [String: Any] {
    guard sinks[owner] != nil else { throw BridgeObservationFailure.closed.nsError }
    guard account.session != nil, account.pendingLogoutCleanupRevision == nil else { throw BridgeObservationFailure.notAuthenticated.nsError }
    guard let page = deviceController as? DeviceViewController, page.deviceID.utf8.elementsEqual(deviceID.utf8),
          page.navigationController?.topViewController === page, page.authorizedBridgeContext() else { throw BridgeObservationFailure.sessionChanged.nsError }
    do {
      return try observations.observe(deviceID: deviceID, revision: page.accountRevision, owner: owner, page: page.bridgePageID,
        current: { [weak page] in page?.authorizedBridgeContext() == true },
        visible: { [weak page] in page?.bridgeVisible == true && UIApplication.shared.applicationState == .active }).dictionary
    } catch let failure as BridgeObservationFailure { throw failure.nsError }
  }
  @objc(getDeviceSnapshot:owner:error:)
  func getDeviceSnapshot(_ observationID: String, owner: String) throws -> [String: Any] {
    do { return try observations.get(observationID, owner: owner).dictionary }
    catch let failure as BridgeObservationFailure { throw failure.nsError }
  }
  @objc(getDeviceSchedules:owner:completion:)
  func getDeviceSchedules(_ observationID: String, owner: String, completion: @escaping (Any?, NSError?) -> Void) {
    startRead(observationID, owner: owner, request: .schedules, completion: completion)
  }
  @objc(getDeviceMoreSummary:owner:completion:)
  func getDeviceMoreSummary(_ observationID: String, owner: String, completion: @escaping (Any?, NSError?) -> Void) {
    startRead(observationID, owner: owner, request: .summary, completion: completion)
  }
  @objc(getDeviceMembers:owner:completion:)
  func getDeviceMembers(_ observationID: String, owner: String, completion: @escaping (Any?, NSError?) -> Void) {
    startRead(observationID, owner: owner, request: .members, completion: completion)
  }
  @objc(getDeviceHelp:owner:completion:)
  func getDeviceHelp(_ observationID: String, owner: String, completion: @escaping (Any?, NSError?) -> Void) {
    startRead(observationID, owner: owner, request: .help, completion: completion)
  }
  @objc(getDeviceLocation:owner:completion:)
  func getDeviceLocation(_ observationID: String, owner: String, completion: @escaping (Any?, NSError?) -> Void) {
    startRead(observationID, owner: owner, request: .location, completion: completion)
  }
  @objc(getDeviceFirmware:kind:owner:completion:)
  func getDeviceFirmware(_ observationID: String, kind: String, owner: String, completion: @escaping (Any?, NSError?) -> Void) {
    guard let kind = OtaKind(rawValue: kind) else { completion(nil, BridgeObservationFailure.invalidArgument.nsError); return }
    startRead(observationID, owner: owner, request: .firmware(kind), completion: completion)
  }
  @nonobjc private func startRead(_ observation: String, owner: String, request: NativeDeviceReadRequest,
                                 completion: @escaping (Any?, NSError?) -> Void) {
    guard sinks[owner] != nil, let reader = reads[owner] else { completion(nil, BridgeObservationFailure.closed.nsError); return }
    reader.start(observation, request: request, completion: completion)
  }
  @nonobjc private func captureUnbind(_ id:String,owner:String)->SelfUnbindBridgeContext? {
    guard sinks[owner] != nil,let context=try? observations.selfUnbindContext(id,owner:owner),let page=deviceController as? DeviceViewController,page.bridgePageID==context.pageID else{return nil}
    let visible={ [weak self,weak page] ()->Bool in
      guard let self,let page else{return false}
      return self.deviceController === page&&context.current()&&page.navigationController?.topViewController === page&&
        (page.presentedViewController==nil || page.presentedViewController === self.unbindAlerts[owner])
    }
    guard visible() else{return nil}
    if let old=unbindContexts[id]{return old}
    let app=RowanAppServices.shared.selfUnbind
    guard let registration=app.register(handle:context.handle,expectedRevision:context.revision,pageCurrent:visible) else{return nil}
    unbindRegistrations[id]=registration
    let value=SelfUnbindBridgeContext(observationID:id,sessionRevision:context.revision,current:visible,title:{
      if case let .current(snapshot)=context.handle.state{return snapshot.metadata?.title ?? "此设备"};return "此设备"
    },read:{try await app.inspect(registration)},begin:{app.begin(registration,intentID:UUID().uuidString).state})
    unbindContexts[id]=value;return value
  }
  @nonobjc private func releaseUnbind(_ id:String){unbindBridges.values.forEach {$0.release(id)};unbindContexts.removeValue(forKey:id);unbindRegistrations.removeValue(forKey:id)?.close()}
  @objc(requestDeviceSelfUnbind:attemptId:owner:completion:)
  func requestDeviceSelfUnbind(_ observationID:String,attemptId:String,owner:String,completion:@escaping (Any?,NSError?)->Void) {
    guard let bridge=unbindBridges[owner] else{completion(nil,BridgeObservationFailure.closed.nsError);return}
    bridge.request(observationID,attempt:attemptId){completion($0.dictionary,nil)}
  }
  @objc(cancelDeviceSelfUnbindConfirmation:attemptId:owner:)
  func cancelDeviceSelfUnbindConfirmation(_ observationID:String,attemptId:String,owner:String){unbindBridges[owner]?.cancel(observationID,attempt:attemptId)}
  @objc(getDeviceSelfUnbindState:owner:completion:)
  func getDeviceSelfUnbindState(_ observationID:String,owner:String,completion:@escaping (Any?,NSError?)->Void){
    guard let bridge=unbindBridges[owner] else{completion(nil,BridgeObservationFailure.closed.nsError);return}
    bridge.get(observationID){completion($0.dictionary,nil)}
  }
  func retryObservation(_ observationID: String, owner: String) { observations.retry(observationID, owner: owner) }
  func acknowledgeDeviceEvent(_ observationID: String, revision: Double, owner: String) {
    guard revision.isFinite, revision >= 0, revision <= 9_007_199_254_740_991, revision.rounded(.towardZero) == revision else { return }
    observations.acknowledge(observationID, revision: Int(revision), owner: owner)
  }
  func releaseObservation(_ observationID: String, owner: String) { observations.release(observationID, owner: owner) }
  @nonobjc func pageDidAppear() { observations.resumeVisible() }
  @nonobjc func pageWillDisappear(_ page: DeviceViewController) { observations.suspendPage(page.bridgePageID) }
  @nonobjc func endPage(_ page: DeviceViewController) { observations.closePage(page.bridgePageID) }
  @nonobjc func endPageID(_ id: String) { observations.closePage(id) }
  func context() -> [String: Any] {
    let session = account.session
    return Self.makeContext(session: session, revision: account.revision)
  }
  @nonobjc static func makeContext(session: AccountSession?, revision: Int) -> [String: Any] {
    var language = "zh-CN"
    if let savedLanguage = session?.setting?.language, !savedLanguage.isEmpty { language = savedLanguage }
    return ["bridgeMajor": 3, "selfUnbindVersion":1, "sessionRevision": revision,
            "authenticated": session != nil, "language": language]
  }
  @objc(closeDevice:)
  func closeDevice(_ pageSessionID: String) {
    let page = deviceController as? DeviceViewController
    DevicePageCloseService.close(pageSessionID, currentPage: page, pageSessionID: page?.pageSessionID,
      authorized: page?.authorizedBridgeContext() == true && page?.bridgeVisible == true && UIApplication.shared.applicationState == .active)
  }
}

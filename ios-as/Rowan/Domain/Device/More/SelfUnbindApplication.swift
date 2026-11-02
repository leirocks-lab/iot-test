import Foundation

@MainActor final class NativeSelfUnbindOperation {
  private(set) var state:SelfUnbindView
  fileprivate var worker:Task<Void,Never>?
  var onChanged:(()->Void)?
  init(_ state:SelfUnbindView){self.state=state}
  fileprivate func install(_ value:SelfUnbindView){state=value;onChanged?()}
  func value() async throws -> SelfUnbindView {try Task.checkCancellation();await worker?.value;try Task.checkCancellation();return state}
}
@MainActor final class NativeSelfUnbindRegistration {
  let binding:SelfUnbindBinding
  fileprivate weak var issuer:AnyObject?
  fileprivate let replaceAction:()->Bool
  private let closeAction:()->Void
  private var closed=false
  init(_ binding:SelfUnbindBinding,issuer:AnyObject,replace:@escaping ()->Bool,close:@escaping ()->Void){self.binding=binding;self.issuer=issuer;replaceAction=replace;closeAction=close}
  func close(){if !closed{closed=true;closeAction()}}
}

/// Native app singleton. Recovery never borrows a page handle and never calls DELETE.
@MainActor final class SelfUnbindApplication {
  private struct AckKey:Hashable {let revision:Int,user:Data,resource:Data,operation:Data}
  private var acknowledgedAuthorities=Set<AckKey>(),replacedReceipts=Set<String>()
  private final class Incarnation {let receipt:String,revision:Int,user:String,resource:String;var alive=true,displayCurrent=true;init(_ value:String,_ revision:Int,_ user:String,_ resource:String){receipt=value;self.revision=revision;self.user=user;self.resource=resource}}
  private final class WeakIncarnation {weak var value:Incarnation?;init(_ value:Incarnation){self.value=value}}
  private final class Page {var alive=true}
  private struct Registration {let handle:DeviceReadHandle,value:NativeSelfUnbindRegistration,incarnation:Incarnation}
  private struct Operation {let task:SelfUnbindTask,binding:SelfUnbindBinding,incarnation:Incarnation,value:NativeSelfUnbindOperation}
  private final class HomeSubscriber {weak var owner:AnyObject?;let notify:()->Void;init(_ owner:AnyObject,_ notify:@escaping ()->Void){self.owner=owner;self.notify=notify}}
  private let currentAccount:()->MQTTPoolIdentity?
  private let journal:any SelfUnbindRecoveryJournal,access:NativeDeviceAccessGateway
  private let repositories:(DeviceMoreScope)->any SelfUnbindRepository
  private let ownerIfCreated:()->DeviceReadOwner?
  private var identity:MQTTPoolIdentity?
  private var closed=false,queued=false
  private var recovery:Task<Void,Never>?
  private var core:DeviceSelfUnbindCoordinator?
  private var registrations:[ObjectIdentifier:Registration]=[:]
  private var incarnations:[String:WeakIncarnation]=[:]
  private var operationOrder:[String]=[]
  private var operations:[String:Operation]=[:],completed:[String:SelfUnbindRecord]=[:]
  private struct Intent:Hashable {let origin:String;let value:Data}
  private var intents:[Intent:String]=[:]
  private var homeSubscribers:[UUID:HomeSubscriber]=[:]
  private(set) var recoveryError=""
  let ledger:SelfUnbindHomeLedger
  init(currentAccount:@escaping ()->MQTTPoolIdentity?,journal:any SelfUnbindRecoveryJournal,access:NativeDeviceAccessGateway,
       repositories:@escaping (DeviceMoreScope)->any SelfUnbindRepository,ownerIfCreated:@escaping ()->DeviceReadOwner?) {
    self.currentAccount=currentAccount;self.journal=journal;self.access=access;self.repositories=repositories;self.ownerIfCreated=ownerIfCreated;identity=currentAccount()
    ledger=SelfUnbindHomeLedger(current:{r,u in guard let live=currentAccount() else{return false};return live.revision==r&&selfUnbindEqual(live.userID,u)})
    ledger.onChanged={ [weak self] in self?.notifyHome() }
  }
  private func current(_ revision:Int,_ user:String)->Bool {guard !closed,let value=currentAccount() else{return false};return value.revision==revision&&selfUnbindEqual(value.userID,user)}
  private func same(_ a:MQTTPoolIdentity?,_ b:MQTTPoolIdentity?)->Bool {switch(a,b){case(nil,nil):return true;case let(a?,b?):return a.revision==b.revision&&selfUnbindEqual(a.userID,b.userID);default:return false}}
  func accountChanged(){
    let next=currentAccount()
    if !same(identity,next){identity=next;completed=[:];acknowledgedAuthorities=[];replacedReceipts=[];recoveryError=""
      for (id,op) in operations where !current(op.binding.scope.accountRevision,op.binding.scope.userID){op.value.install(SelfUnbindView(operationID:id,state:"session_changed",errorCode:"session_changed"))}
    }
    requestRecovery()
  }
  private func retire(_ receipt:String)->Bool {
    switch DeviceReadOwner.receiptFromPreviousProcess(receipt){case true?:return true;case false?:return ownerIfCreated()?.retireOwnershipReceipt(receipt)==true;default:return false}
  }
  private lazy var invalidation:ApplicationInvalidation=ApplicationInvalidation(self)
  private func coordinator()->DeviceSelfUnbindCoordinator {
    if let core{return core}
    let value=DeviceSelfUnbindCoordinator(currentAccount:currentAccount,access:access,journal:journal,repositories:repositories,invalidation:invalidation,onSettled:{[weak self] in self?.requestRecovery()})
    core=value;return value
  }
  @MainActor private final class ApplicationInvalidation:SelfUnbindInvalidation {
    private unowned let app:SelfUnbindApplication
    init(_ app:SelfUnbindApplication){self.app=app}
    func capture(_ binding:SelfUnbindBinding)->String? {guard app.current(binding.scope.accountRevision,binding.scope.userID),binding.relationshipCurrent() else{return nil};return app.ownerIfCreated()?.captureOwnershipReceipt(binding.handle)?.encoded}
    func ownershipLost(_ binding:SelfUnbindBinding,resourceToken:String){if app.current(binding.scope.accountRevision,binding.scope.userID){_ = app.retire(resourceToken)}}
    func apply(_ record:SelfUnbindRecord,binding:SelfUnbindBinding) async throws -> Bool {
      guard app.current(binding.scope.accountRevision,record.userID),selfUnbindEqual(record.resourceID,binding.scope.resourceID),selfUnbindEqual(record.productID,binding.scope.productID) else{return false}
      let retired=app.retire(record.resourceToken),ticket=try app.ledger.request(record,revision:binding.scope.accountRevision)
      return retired&&app.refreshAcknowledgedAuthority(record,revision:binding.scope.accountRevision)&&app.ledger.confirmed(ticket)
    }
  }
  func register(handle:DeviceReadHandle,expectedRevision:Int,pageCurrent:@escaping ()->Bool)->NativeSelfUnbindRegistration? {
    guard !closed,let source=currentAccount(),source.revision==expectedRevision,!handle.released,case let .current(snapshot)=handle.state,
      snapshot.accountRevision==expectedRevision,let product=snapshot.metadata?.productID else{return nil}
    if let old=registrations[ObjectIdentifier(handle)]{return old.value}
    guard registrations.count<64,let receipt=ownerIfCreated()?.captureOwnershipReceipt(handle)?.encoded,current(source.revision,source.userID) else{return nil}
    incarnations=incarnations.filter {$0.value.value != nil};guard incarnations.count<256 || incarnations[receipt] != nil else{return nil}
    // Ordinary new serial supersedes presentation origin only, never relationship authority.
    for old in incarnations.values.compactMap({$0.value}) where old.revision==source.revision&&selfUnbindEqual(old.user,source.userID)&&selfUnbindEqual(old.resource,snapshot.resourceID) && !selfUnbindEqual(old.receipt,receipt){old.displayCurrent=false}
    let incarnation=incarnations[receipt]?.value ?? Incarnation(receipt,source.revision,source.userID,snapshot.resourceID);incarnations[receipt]=WeakIncarnation(incarnation)
    let page=Page(),binding=SelfUnbindBinding(scope:DeviceMoreScope(accountRevision:source.revision,resourceID:snapshot.resourceID,userID:source.userID,productID:product),handle:handle,
      relationshipCurrent:{[weak self] in incarnation.alive&&self?.current(source.revision,source.userID)==true},pageCurrent:{page.alive&&pageCurrent()})
    let key=ObjectIdentifier(handle)
    let result=NativeSelfUnbindRegistration(binding,issuer:self,replace:{[weak self] in
      guard let self,current(source.revision,source.userID) else{return false}
      return replaceRelationship(incarnation)
    },close:{[weak self] in page.alive=false;self?.registrations.removeValue(forKey:key)})
    registrations[key]=Registration(handle:handle,value:result,incarnation:incarnation);return result
  }
  private func replaceRelationship(_ origin:Incarnation)->Bool {
    guard current(origin.revision,origin.user) else{return false}
    if !origin.alive{return true} // Old confirmed replacement is idempotent, not authority over a new group.
    let group=incarnations.values.compactMap{$0.value}.filter{$0.alive&&$0.revision==origin.revision&&selfUnbindEqual($0.user,origin.user)&&selfUnbindEqual($0.resource,origin.resource)}
    guard replacedReceipts.union(group.map{$0.receipt}).count<=256,let owner=ownerIfCreated() else{return false}
    var result=true
    for member in group{replacedReceipts.insert(member.receipt);member.alive=false;member.displayCurrent=false;if !owner.replaceOwnershipReceipt(member.receipt){result=false}}
    return result
  }
  private func refreshAcknowledgedAuthority(_ record:SelfUnbindRecord,revision:Int)->Bool {
    guard current(revision,record.userID) else{return false}
    let key=AckKey(revision:revision,user:Data(record.userID.utf8),resource:Data(record.resourceID.utf8),operation:Data(record.operationID.utf8))
    if acknowledgedAuthorities.contains(key){return true}
    guard acknowledgedAuthorities.count<256 else{return false}
    acknowledgedAuthorities.insert(key) // Reserve before synchronous native observer callbacks can reenter.
    if DeviceReadOwner.receiptFromPreviousProcess(record.resourceToken) != true,!replacedReceipts.contains(record.resourceToken),ownerIfCreated()?.invalidateAcknowledgedAuthority(expectedRevision:revision,userID:record.userID,resourceID:record.resourceID)==false{acknowledgedAuthorities.remove(key);return false}
    return true
  }
  /// Confirmed native PAIR06 flow only, before opening the replacement resource observer.
  func relationshipReplaced(_ registration:NativeSelfUnbindRegistration)->Bool {
    guard registration.issuer === self,current(registration.binding.scope.accountRevision,registration.binding.scope.userID) else{return false}
    return registration.replaceAction()
  }
  func begin(_ registration:NativeSelfUnbindRegistration,intentID:String)->NativeSelfUnbindOperation {
    let binding=registration.binding
    guard !closed,registrations[ObjectIdentifier(binding.handle)]?.value === registration,current(binding.scope.accountRevision,binding.scope.userID) else{return refused("session_changed")}
    let intent=Intent(origin:binding.originToken,value:Data(intentID.utf8))
    if let key=intents[intent],let previous=operations[key]{return previous.value}
    if operations.count>=128 {
      guard let old=operations.first(where:{["confirmed","already_absent","historical_confirmed","historical_already_absent","rejected","session_changed"].contains($0.value.value.state.state)}) else{return refused("busy")}
      operations.removeValue(forKey:old.key);operationOrder.removeAll {$0==old.key};intents=intents.filter {$0.value != old.key}
    }
    guard let incarnation=registrations[ObjectIdentifier(binding.handle)]?.incarnation else{return refused("session_changed")}
    let task=coordinator().begin(binding,intentID:intentID)
    if task.state.operationID.isEmpty{return NativeSelfUnbindOperation(task.state)}
    if let previous=operations.first(where:{$0.value.task === task && $0.value.binding === binding}){intents[intent]=previous.key;return previous.value.value}
    let key=UUID().uuidString,result=NativeSelfUnbindOperation(task.state)
    operations[key]=Operation(task:task,binding:binding,incarnation:incarnation,value:result);operationOrder.append(key);intents[intent]=key
    task.onChanged={ [weak self,weak result] in guard let self,let result else{return};publishCore(binding,result,task.state) }
    publishCore(binding,result,task.state)
    result.worker=Task { @MainActor [self,result] in
      do{publishCore(binding,result,try await task.value())}catch{publishCore(binding,result,SelfUnbindView(operationID:result.state.operationID,state:"unknown",errorCode:"unknown_result"))}
      task.onChanged=nil;requestRecovery()
    }
    return result
  }
  /// Read-only native authority, revalidated after serialized journal I/O.
  func inspect(_ registration:NativeSelfUnbindRegistration) async throws -> NativeSelfUnbindAuthority {
    let binding=registration.binding
    func active()->Bool {registration.issuer === self&&current(binding.scope.accountRevision,binding.scope.userID)}
    func attached()->Bool {
      guard registrations[ObjectIdentifier(binding.handle)]?.value === registration,binding.relationshipCurrent(),binding.pageCurrent(),!binding.handle.released,
        case let .current(snapshot)=binding.handle.state else{return false}
      return snapshot.accountRevision==binding.scope.accountRevision&&selfUnbindEqual(snapshot.resourceID,binding.scope.resourceID)&&
        snapshot.metadata.map {selfUnbindEqual($0.productID,binding.scope.productID)}==true&&snapshot.phase != .forbidden
    }
    func live()->NativeSelfUnbindAuthority? {
      guard let selected=operationOrder.reversed().compactMap({operations[$0]}).first(where:{$0.binding === binding}) else{return nil}
      return NativeSelfUnbindAuthority(view:selected.value.state,canRequest:attached()&&["rejected","cancelled","idle","historical_confirmed","historical_already_absent"].contains(selected.value.state.state))
    }
    guard active() else{return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"session_changed",errorCode:"session_changed"),canRequest:false)}
    if let value=live(){return value}
    let saved=try await journal.load(key:selfUnbindKey(userID:binding.scope.userID,resourceID:binding.scope.resourceID))
    try Task.checkCancellation()
    guard active() else{return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"session_changed",errorCode:"session_changed"),canRequest:false)}
    if let value=live(){return value}
    guard let saved else{return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"idle",errorCode:""),canRequest:attached())}
    guard selfUnbindEqual(saved.userID,binding.scope.userID),selfUnbindEqual(saved.resourceID,binding.scope.resourceID),selfUnbindEqual(saved.productID,binding.scope.productID) else{return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"rejected",errorCode:"session_changed"),canRequest:false)}
    let status:String
    switch saved.phase {case .unknown:status="unknown";case .acknowledged:status="confirmed_cleanup_pending";case .absenceObserved:status="already_absent_cleanup_pending";case .confirmed,.alreadyAbsent:status=project(saved,binding).state;case .rejected:status="rejected"}
    return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:saved.operationID,state:status,errorCode:saved.errorCode),canRequest:attached()&&[SelfUnbindPhase.confirmed,.alreadyAbsent,.rejected].contains(saved.phase))
  }
  private func refused(_ code:String)->NativeSelfUnbindOperation {NativeSelfUnbindOperation(SelfUnbindView(operationID:"",state:"rejected",errorCode:code))}
  private func historical(_ binding:SelfUnbindBinding)->Bool {operations.values.contains{$0.binding === binding && !$0.incarnation.displayCurrent}}
  private func project(_ record:SelfUnbindRecord,_ binding:SelfUnbindBinding)->SelfUnbindView {
    let status=record.phase == .confirmed ? "confirmed":"already_absent"
    return SelfUnbindView(operationID:record.operationID,state:selfUnbindEqual(record.originToken,binding.originToken)&&binding.relationshipCurrent() && !historical(binding) ? status:"historical_"+status,errorCode:record.errorCode)
  }
  private func publishCore(_ binding:SelfUnbindBinding,_ result:NativeSelfUnbindOperation,_ value:SelfUnbindView) {
    guard current(binding.scope.accountRevision,binding.scope.userID) else{result.install(SelfUnbindView(operationID:value.operationID,state:"session_changed",errorCode:"session_changed"));return}
    if let record=completed[value.operationID]{result.install(project(record,binding))}
    else if historical(binding),["confirmed","already_absent"].contains(value.state){result.install(SelfUnbindView(operationID:value.operationID,state:"historical_"+value.state,errorCode:value.errorCode))}
    else{result.install(value)}
  }
  private func publishRecord(_ record:SelfUnbindRecord) {
    if completed.count>=256,completed[record.operationID]==nil,let old=completed.keys.first(where:{id in !operations.values.contains(where:{$0.value.state.operationID==id})}){completed.removeValue(forKey:old)}
    completed[record.operationID]=record
    for op in operations.values where selfUnbindEqual(op.value.state.operationID,record.operationID)&&current(op.binding.scope.accountRevision,record.userID){op.value.install(project(record,op.binding))}
  }
  func requestRecovery(){
    guard !closed else{return};queued=true;guard recovery==nil else{return}
    recovery=Task { @MainActor [self] in
      defer{recovery=nil;if queued  && !closed  && !Task.isCancelled{requestRecovery()}}
      while queued  && !closed  && !Task.isCancelled{queued=false;await recoverOnce()}
    }
  }
  private func recoverOnce() async {
    guard let source=currentAccount(),!closed else{return}
    let records:[SelfUnbindRecord]
    do{records=try await journal.unresolved(userID:source.userID)}catch{if current(source.revision,source.userID){recoveryError="storage_unavailable"};return}
    guard current(source.revision,source.userID) else{return};recoveryError=""
    for saved in records {
      guard current(source.revision,source.userID) else{return};if core?.isRunning(key:saved.key)==true{continue}
      let ticket:SelfUnbindHomeTicket
      do{ticket=try ledger.request(saved,revision:source.revision)}catch{recoveryError="invalidation_capacity";return}
      var record=saved
      if record.phase == .unknown {
        guard ledger.confirmed(ticket) else{continue}
        let observed=record.terminal(.absenceObserved,error:"absence_observed")
        guard await complete(observed,source) else{continue};record=observed
      }
      guard retire(record.resourceToken),refreshAcknowledgedAuthority(record,revision:source.revision),ledger.confirmed(ticket) else{continue}
      let terminal=record.terminal(record.phase == .acknowledged ? .confirmed:.alreadyAbsent,error:record.errorCode)
      if await complete(terminal,source){publishRecord(terminal)}
    }
  }
  private func complete(_ record:SelfUnbindRecord,_ source:MQTTPoolIdentity) async -> Bool {
    guard current(source.revision,source.userID) else{return false}
    do{let value=try await journal.complete(record);return value&&current(source.revision,source.userID)}catch{if current(source.revision,source.userID){recoveryError="storage_unavailable"};return false}
  }
  func acknowledge(_ ticket:SelfUnbindHomeTicket,ids:[String])->Bool {guard !closed else{return false};let value=ledger.acknowledge(ticket,actualOwnedIDs:ids);if value{requestRecovery()};return value}
  func subscribeHome(_ owner:AnyObject,notify:@escaping ()->Void)->UUID {
    homeSubscribers=homeSubscribers.filter {$0.value.owner != nil};let token=UUID();homeSubscribers[token]=HomeSubscriber(owner,notify);return token
  }
  func unsubscribeHome(_ token:UUID){homeSubscribers.removeValue(forKey:token)}
  private func notifyHome(){homeSubscribers=homeSubscribers.filter {$0.value.owner != nil};for entry in Array(homeSubscribers.values){entry.notify()}}
  func close(){guard !closed else{return};closed=true;queued=false;for entry in Array(registrations.values){entry.value.close()};registrations=[:];homeSubscribers=[:];recovery?.cancel();core?.cancelRunning()}
}

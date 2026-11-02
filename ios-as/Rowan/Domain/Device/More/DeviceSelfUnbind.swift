import Foundation
import CryptoKit

enum SelfUnbindPhase:String,Codable,Sendable { case unknown="UNKNOWN", acknowledged="ACKNOWLEDGED", absenceObserved="ABSENCE_OBSERVED", confirmed="CONFIRMED", alreadyAbsent="ALREADY_ABSENT", rejected="REJECTED" }
struct SelfUnbindRecord:Codable,Sendable,MQTTRedacted {
  let key:String, operationID:String, userID:String, resourceID:String, productID:String, originToken:String
  let phase:SelfUnbindPhase
  let errorCode:String
  var resourceToken:String=""
  func terminal(_ phase:SelfUnbindPhase,error:String="")->SelfUnbindRecord {
    SelfUnbindRecord(key:key,operationID:operationID,userID:userID,resourceID:resourceID,productID:productID,originToken:originToken,phase:phase,errorCode:error,resourceToken:resourceToken)
  }
}
func selfUnbindKey(userID:String,resourceID:String)->String {
  var bytes=Data()
  for value in ["rowan.self-unbind.v1",userID,resourceID] {
    let part=Data(value.utf8);guard UInt64(part.count)<=UInt64(UInt32.max) else{return ""};let n=UInt32(part.count)
    bytes.append(contentsOf:[UInt8(n>>24),UInt8((n>>16)&255),UInt8((n>>8)&255),UInt8(n&255)]);bytes.append(part)
  }
  return SHA256.hash(data:bytes).map {String(format:"%02x",$0)}.joined()
}
func selfUnbindEqual(_ a:String,_ b:String)->Bool {a.utf8.elementsEqual(b.utf8)}
protocol SelfUnbindJournal:Sendable {
  func load(key:String) async throws -> SelfUnbindRecord?
  func reserve(_ candidate:SelfUnbindRecord) async throws -> SelfUnbindRecord
  func complete(_ record:SelfUnbindRecord) async throws -> Bool
}
protocol SelfUnbindRecoveryJournal:SelfUnbindJournal {func unresolved(userID:String) async throws -> [SelfUnbindRecord]}
@MainActor protocol SelfUnbindRepository {
  var scope:DeviceMoreScope {get}
  func deleteSelf() async throws
  func isOwned() async throws -> Bool
}
/// Native-only relationship incarnation, retired before a later PAIR06/rebind.
/// A new page/observer cannot reuse an earlier operation's originToken.
@MainActor final class SelfUnbindBinding:MQTTRedacted {
  let scope:DeviceMoreScope,handle:DeviceReadHandle
  let relationshipCurrent:()->Bool,pageCurrent:()->Bool
  let originToken=UUID().uuidString
  init(scope:DeviceMoreScope,handle:DeviceReadHandle,relationshipCurrent:@escaping ()->Bool,pageCurrent:@escaping ()->Bool) {
    self.scope=scope;self.handle=handle;self.relationshipCurrent=relationshipCurrent;self.pageCurrent=pageCurrent
  }
}
struct SelfUnbindView:Sendable,MQTTRedacted {let operationID:String,state:String,errorCode:String}
@MainActor final class SelfUnbindTask:MQTTRedacted {
  private(set) var state:SelfUnbindView
  fileprivate var worker:Task<SelfUnbindView,Never>?
  var onChanged:(()->Void)?
  init(_ state:SelfUnbindView){self.state=state}
  fileprivate func install(_ value:SelfUnbindView){state=value;onChanged?()}
  func value() async throws -> SelfUnbindView {
    try Task.checkCancellation();let result=await worker?.value ?? state;try Task.checkCancellation();return result
  }
}
/// No default/no-op success. False retains confirmed_cleanup_pending until real HOME cache acknowledgement.
@MainActor protocol SelfUnbindInvalidation {
  func apply(_ record:SelfUnbindRecord,binding:SelfUnbindBinding) async throws -> Bool
  func capture(_ binding:SelfUnbindBinding)->String?
  func ownershipLost(_ binding:SelfUnbindBinding,resourceToken:String)
}
@MainActor final class DeviceSelfUnbindCoordinator {
  private let currentAccount:()->MQTTPoolIdentity?
  private let access:NativeDeviceAccessGateway,journal:any SelfUnbindJournal
  private let repositories:(DeviceMoreScope)->any SelfUnbindRepository
  private let invalidation:any SelfUnbindInvalidation
  private let onSettled:(()->Void)?
  private struct Running {let binding:SelfUnbindBinding,task:SelfUnbindTask}
  private var running:[String:Running]=[:]
  private final class Intents {weak var binding:SelfUnbindBinding?;var tasks:[Data:SelfUnbindTask]=[:];init(_ value:SelfUnbindBinding){binding=value}}
  private var intents:[ObjectIdentifier:Intents]=[:]
  init(currentAccount:@escaping ()->MQTTPoolIdentity?,access:NativeDeviceAccessGateway,journal:any SelfUnbindJournal,
       repositories:@escaping (DeviceMoreScope)->any SelfUnbindRepository,invalidation:any SelfUnbindInvalidation,onSettled:(()->Void)?=nil) {
    self.currentAccount=currentAccount;self.access=access;self.journal=journal;self.repositories=repositories;self.invalidation=invalidation;self.onSettled=onSettled
  }
  private func current(_ scope:DeviceMoreScope)->Bool {
    guard let live=currentAccount() else{return false}
    return live.revision==scope.accountRevision&&selfUnbindEqual(live.userID,scope.userID)
  }
  private func attached(_ binding:SelfUnbindBinding)->Bool {
    guard current(binding.scope),binding.relationshipCurrent(),!binding.handle.released,case let .current(value)=binding.handle.state else{return false}
    return value.accountRevision==binding.scope.accountRevision&&selfUnbindEqual(value.resourceID,binding.scope.resourceID)&&
      value.metadata.map {selfUnbindEqual($0.productID,binding.scope.productID)}==true&&value.phase != .forbidden
  }
  private func requireCurrent(_ scope:DeviceMoreScope) throws {
    guard current(scope) else{throw RowanFailure(code:499,message:"session_changed")};try Task.checkCancellation()
  }
  private func refuse(_ code:String)->SelfUnbindTask {SelfUnbindTask(SelfUnbindView(operationID:"",state:"rejected",errorCode:code))}
  func isRunning(key:String)->Bool {running[key] != nil}
  func cancelRunning(){for value in running.values{value.task.worker?.cancel()}}
  func begin(_ binding:SelfUnbindBinding,intentID:String)->SelfUnbindTask {start(binding,intent:intentID,reconcile:false)}
  func reconcile(_ binding:SelfUnbindBinding)->SelfUnbindTask {start(binding,intent:"",reconcile:true)}
  private func start(_ binding:SelfUnbindBinding,intent:String,reconcile:Bool)->SelfUnbindTask {
    guard current(binding.scope),[binding.scope.userID,binding.scope.resourceID,binding.scope.productID].allSatisfy(validDeviceMoreID) else{return refuse("session_changed")}
    guard reconcile || (attached(binding)&&binding.pageCurrent()) else{return refuse("session_changed")}
    intents=intents.filter {$0.value.binding?.handle.released==false}
    let page=intents[ObjectIdentifier(binding)] ?? Intents(binding),intentKey=Data(intent.utf8)
    if !reconcile {
      guard !intent.isEmpty,intent.utf8.count<=128,intent.rangeOfCharacter(from:.controlCharacters)==nil else{return refuse("invalid_input")}
      if let previous=page.tasks[intentKey]{return previous}
      guard page.tasks.count<64,intents.count<64 || intents[ObjectIdentifier(binding)] != nil else{return refuse("busy")}
    }
    let key=selfUnbindKey(userID:binding.scope.userID,resourceID:binding.scope.resourceID)
    if let previous=running[key]{
      guard previous.binding === binding else{return refuse("busy")}
      if !reconcile{page.tasks[intentKey]=previous.task;intents[ObjectIdentifier(binding)]=page};return previous.task
    }
    guard running.count<64,intents.count<64 || intents[ObjectIdentifier(binding)] != nil else{return refuse("busy")}
    let resourceToken:String
    if reconcile{resourceToken=""}else{guard let value=invalidation.capture(binding) else{return refuse("session_changed")};resourceToken=value}
    let id=UUID().uuidString,task=SelfUnbindTask(SelfUnbindView(operationID:id,state:"preparing",errorCode:""))
    running[key]=Running(binding:binding,task:task);if !reconcile{page.tasks[intentKey]=task;intents[ObjectIdentifier(binding)]=page}
    task.worker=Task { @MainActor [self,task] in
      defer {if running[key]?.task === task{running.removeValue(forKey:key)};onSettled?()}
      return await work(binding,key:key,id:id,reconcile:reconcile,task:task,resourceToken:resourceToken)
    }
    return task
  }
  private func work(_ binding:SelfUnbindBinding,key:String,id:String,reconcile:Bool,task:SelfUnbindTask,resourceToken:String) async -> SelfUnbindView {
    var record:SelfUnbindRecord?
    var dispatched=false
    func emit(_ state:String,_ error:String="")->SelfUnbindView {
      let value=SelfUnbindView(operationID:record?.operationID ?? id,state:state,errorCode:error);task.install(value);return value
    }
    func terminalStatus(_ record:SelfUnbindRecord)->String {
      let status=record.phase == .confirmed ? "confirmed":"already_absent"
      return selfUnbindEqual(record.originToken,binding.originToken)&&binding.relationshipCurrent() ? status:"historical_"+status
    }
    func pendingStatus()->String {record?.phase == .absenceObserved ? "already_absent_cleanup_pending":"confirmed_cleanup_pending"}
    func persist(_ next:SelfUnbindRecord) async -> Bool {
      do {if try await journal.complete(next){record=next;return true};return false}catch{return false}
    }
    func notSent(_ code:String) async -> SelfUnbindView {
      guard let saved=record else{return emit("rejected",code)}
      if await persist(saved.terminal(.rejected,error:code)){return emit("rejected",code)}
      return emit("unknown","storage_unavailable")
    }
    do {
      do {record=try await journal.load(key:key)}catch{return emit("rejected","storage_unavailable")}
      try requireCurrent(binding.scope)
      if let saved=record, !selfUnbindEqual(saved.userID,binding.scope.userID) || !selfUnbindEqual(saved.resourceID,binding.scope.resourceID) || !selfUnbindEqual(saved.productID,binding.scope.productID){return emit("unknown","session_changed")}
      let repo=repositories(binding.scope);guard repo.scope==binding.scope else{return emit("rejected","session_changed")}
      if reconcile {
        guard let saved=record else{return emit("idle")}
        if saved.phase == .rejected{return emit("rejected",saved.errorCode)}
        if [.confirmed,.alreadyAbsent].contains(saved.phase) {
          return emit(terminalStatus(saved),saved.errorCode)
        }
        if saved.phase == .unknown {
          _=emit("checking");if try await repo.isOwned(){return emit("unknown","unknown_result")}
          try requireCurrent(binding.scope)
          let acknowledged=saved.terminal(.absenceObserved,error:"absence_observed")
          guard await persist(acknowledged) else {
            record=acknowledged
            if current(binding.scope){_ = try await invalidation.apply(acknowledged,binding:binding)}
            return emit(pendingStatus(),"storage_unavailable")
          }
        }
      } else {
        if let saved=record,[SelfUnbindPhase.unknown,.acknowledged,.absenceObserved].contains(saved.phase){return emit(saved.phase == .unknown ? "unknown":pendingStatus(),saved.errorCode)}
        let proof:AuthorizedDevice
        do {proof=try await access.authorize(resourceID:binding.scope.resourceID,expectedRevision:binding.scope.accountRevision)}catch {
          let code=(error as? RowanFailure)?.code
          if let code,[403,1342].contains(code),current(binding.scope),binding.relationshipCurrent(){invalidation.ownershipLost(binding,resourceToken:resourceToken)}
          return emit("rejected",code==403 || code==1342 ? "forbidden":code==499 ? "session_changed":"unavailable")
        }
        try requireCurrent(binding.scope)
        guard proof.accountRevision==binding.scope.accountRevision,selfUnbindEqual(proof.userID,binding.scope.userID),selfUnbindEqual(proof.resourceID,binding.scope.resourceID),selfUnbindEqual(proof.productID,binding.scope.productID),attached(binding),binding.pageCurrent() else{return emit("rejected","session_changed")}
        let candidate=SelfUnbindRecord(key:key,operationID:id,userID:binding.scope.userID,resourceID:binding.scope.resourceID,productID:binding.scope.productID,originToken:binding.originToken,phase:.unknown,errorCode:"",resourceToken:resourceToken)
        do {record=try await journal.reserve(candidate)}catch{return emit("rejected","storage_unavailable")}
        guard record?.operationID==id else{return emit("unknown","unknown_result")}
        try requireCurrent(binding.scope);guard attached(binding),binding.pageCurrent() else{return await notSent("session_changed")}
        dispatched=true;_=emit("sending")
        var absenceCode:String?=nil
        do {try await repo.deleteSelf()}
        catch {
          let code=(error as? RowanFailure)?.code
          if code != 1362 && code != 1361 {
            if let code,[400,401,403].contains(code) {
              let failure=code==401 ? "not_authenticated":code==403 ? "forbidden":"invalid_input"
              guard let saved=record,await persist(saved.terminal(.rejected,error:failure)) else{return emit("unknown","storage_unavailable")}
              return emit("rejected",failure)
            }
            return emit("unknown",code==499 ? "session_changed":"unknown_result")
          }
          absenceCode=code==1361 ? "not_found":"not_bound"
        }
        guard let saved=record else{return emit("unknown","storage_unavailable")}
        let acknowledged=absenceCode.map {saved.terminal(.absenceObserved,error:$0)} ?? saved.terminal(.acknowledged)
        guard await persist(acknowledged) else {
          record=acknowledged
          if current(binding.scope){_ = try await invalidation.apply(acknowledged,binding:binding)}
          return emit(pendingStatus(),"storage_unavailable")
        }
      }
      try requireCurrent(binding.scope);guard let acknowledged=record else{return emit("unknown","unknown_result")}
      _=emit(pendingStatus())
      guard try await invalidation.apply(acknowledged,binding:binding) else{return emit(pendingStatus())}
      try requireCurrent(binding.scope)
      guard await persist(acknowledged.terminal(acknowledged.phase == .absenceObserved ? .alreadyAbsent:.confirmed,error:acknowledged.errorCode)) else{return emit(pendingStatus(),"storage_unavailable")}
      guard let completed=record else{return emit("unknown","storage_unavailable")}
      return emit(terminalStatus(completed),completed.errorCode)
    }catch {
      if !dispatched,record?.operationID==id,record?.phase == .unknown{return await notSent(error is CancellationError ? "cancelled":"session_changed")}
      return emit([SelfUnbindPhase.acknowledged,.absenceObserved].contains(record?.phase ?? .unknown) ? pendingStatus():record==nil ? "rejected":"unknown",(error as? RowanFailure)?.code==499 ? "session_changed":"unknown_result")
    }
  }
}

@MainActor final class SelfUnbindHomeTicket:MQTTRedacted {
  let sequence:Int,accountRevision:Int,record:SelfUnbindRecord
  init(_ sequence:Int,_ revision:Int,_ record:SelfUnbindRecord){self.sequence=sequence;accountRevision=revision;self.record=record}
}
@MainActor final class SelfUnbindHomeLedger {
  private let current:(Int,String)->Bool
  private var entries:[String:(SelfUnbindHomeTicket,Bool)]=[:]
  private(set) var revision=0
  var onChanged:(()->Void)?
  init(current:@escaping (Int,String)->Bool){self.current=current}
  func request(_ record:SelfUnbindRecord,revision:Int) throws -> SelfUnbindHomeTicket {
    if let existing=entries[record.operationID],existing.0.accountRevision==revision{return existing.0}
    if entries.count>=64,entries[record.operationID]==nil,let completed=entries.first(where:{$0.value.1}){entries.removeValue(forKey:completed.key)}
    guard entries.count<64 || entries[record.operationID] != nil else{throw RowanFailure(code:0,message:"invalidation_capacity")}
    self.revision+=1;let ticket=SelfUnbindHomeTicket(self.revision,revision,record);entries[record.operationID]=(ticket,false);onChanged?();return ticket
  }
  func pending(revision:Int)->[SelfUnbindHomeTicket] {entries.values.filter {!$0.1 && $0.0.accountRevision==revision && current(revision,$0.0.record.userID)}.map {$0.0}}
  func acknowledge(_ ticket:SelfUnbindHomeTicket,actualOwnedIDs:[String])->Bool {
    guard let existing=entries[ticket.record.operationID],existing.0 === ticket,current(ticket.accountRevision,ticket.record.userID),!actualOwnedIDs.contains(where:{selfUnbindEqual($0,ticket.record.resourceID)}) else{return false}
    entries[ticket.record.operationID]=(ticket,true);return true
  }
  func confirmed(_ ticket:SelfUnbindHomeTicket)->Bool {entries[ticket.record.operationID].map {$0.0 === ticket && $0.1}==true}
}
@MainActor final class NativeSelfUnbindInvalidation:SelfUnbindInvalidation {
  private let owner:DeviceReadOwner,ledger:SelfUnbindHomeLedger,current:(Int,String)->Bool
  init(owner:DeviceReadOwner,ledger:SelfUnbindHomeLedger,current:@escaping (Int,String)->Bool){self.owner=owner;self.ledger=ledger;self.current=current}
  func capture(_ binding:SelfUnbindBinding)->String? {
    guard current(binding.scope.accountRevision,binding.scope.userID),binding.relationshipCurrent() else{return nil}
    return owner.captureOwnershipReceipt(binding.handle)?.encoded
  }
  func ownershipLost(_ binding:SelfUnbindBinding,resourceToken:String) {
    if current(binding.scope.accountRevision,binding.scope.userID){_ = owner.retireOwnershipReceipt(resourceToken)}
  }
  func apply(_ record:SelfUnbindRecord,binding:SelfUnbindBinding) async throws -> Bool {
    guard [SelfUnbindPhase.acknowledged,.absenceObserved].contains(record.phase),current(binding.scope.accountRevision,record.userID),selfUnbindEqual(record.resourceID,binding.scope.resourceID),selfUnbindEqual(record.userID,binding.scope.userID),selfUnbindEqual(record.productID,binding.scope.productID) else{return false}
    let retired=owner.retireOwnershipReceipt(record.resourceToken)
    let ticket=try ledger.request(record,revision:binding.scope.accountRevision);return retired&&ledger.confirmed(ticket)
  }
}

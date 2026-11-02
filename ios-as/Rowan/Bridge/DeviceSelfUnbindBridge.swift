import Foundation

@MainActor final class SelfUnbindBridgeContext {
  let observationID:String,sessionRevision:Int,current:()->Bool,title:()->String
  let read:() async throws -> NativeSelfUnbindAuthority,begin:() throws -> SelfUnbindView
  init(observationID:String,sessionRevision:Int,current:@escaping ()->Bool,title:@escaping ()->String,read:@escaping () async throws -> NativeSelfUnbindAuthority,begin:@escaping () throws -> SelfUnbindView){self.observationID=observationID;self.sessionRevision=sessionRevision;self.current=current;self.title=title;self.read=read;self.begin=begin}
}
struct SelfUnbindBridgeState:Equatable {
  let observationID:String,sessionRevision:Int,revision:Int,status:String,errorCode:String,canRequest:Bool
  var dictionary:[String:Any]{["observationId":observationID,"sessionRevision":sessionRevision,"revision":revision,"status":status,"errorCode":errorCode,"canRequest":canRequest]}
}
@MainActor final class SelfUnbindBridgeProjection {
  static let max=9_007_199_254_740_991
  private var value:SelfUnbindBridgeState,exhausted=false
  init(_ id:String,_ session:Int,initialRevision:Int=0){value=SelfUnbindBridgeState(observationID:id,sessionRevision:session,revision:initialRevision,status:"idle",errorCode:"",canRequest:false)}
  func accept(_ status:String,error:String="",allowed:Bool=false)->SelfUnbindBridgeState {
    guard !exhausted else{return value}
    if value.status==status&&value.errorCode==error&&value.canRequest==allowed{return value}
    guard (0...Self.max).contains(value.sessionRevision),value.revision<Self.max else{exhausted=true;value=SelfUnbindBridgeState(observationID:value.observationID,sessionRevision:value.sessionRevision,revision:value.revision,status:"closed",errorCode:"closed",canRequest:false);return value}
    value=SelfUnbindBridgeState(observationID:value.observationID,sessionRevision:value.sessionRevision,revision:value.revision+1,status:status,errorCode:error,canRequest:allowed);return value
  }
}

/// MainActor registry. Two actual journal tasks/module; confirmation is not a mutation capability.
@MainActor final class DeviceSelfUnbindBridge {
  @MainActor private final class Reply {var completion:((SelfUnbindBridgeState)->Void)?;init(_ value:@escaping (SelfUnbindBridgeState)->Void){completion=value};func finish(_ value:SelfUnbindBridgeState){let callback=completion;completion=nil;callback?(value)}}
  @MainActor private final class Pending {
    let attempt:Data;var replies:[Reply]=[],dismiss:(()->Void)?,task:Task<Void,Never>?,timer:Task<Void,Never>?
    init(_ attempt:Data){self.attempt=attempt}
  }
  @MainActor private final class Entry {
    let context:SelfUnbindBridgeContext,projection:SelfUnbindBridgeProjection
    var failedBeginPriorID:String?
    var used:Set<Data> = [],dispatched:Set<Data> = [],pending:Pending?,preflight:Task<Void,Never>?,query:Task<Void,Never>?,queryReply:Reply?,latest:SelfUnbindBridgeState
    init(_ context:SelfUnbindBridgeContext){self.context=context;let source=SelfUnbindBridgeProjection(context.observationID,context.sessionRevision);projection=source;latest=source.accept("idle")}
    func state(_ status:String,_ error:String="",_ allowed:Bool=false)->SelfUnbindBridgeState {latest=projection.accept(status,error:error,allowed:allowed);return latest}
  }
  private final class CancellationScope {var overflow=false}
  private var cancellationScopes:[String:CancellationScope]=[:]
  private struct CancelKey:Hashable {let observation:Data,attempt:Data}
  private let capture:(String)->SelfUnbindBridgeContext?
  private let knownObservation:(String)->Bool
  private let confirm:(String,@escaping ()->Void,@escaping ()->Void)throws -> ()->Void
  private let deadline:() async throws -> Void
  private var entries:[String:Entry]=[:],jobs:[UUID:Task<Void,Never>]=[:]
  private var cancelled:Set<CancelKey> = [];private var closed=false
  init(capture:@escaping (String)->SelfUnbindBridgeContext?,confirm:@escaping (String,@escaping ()->Void,@escaping ()->Void)throws -> ()->Void,knownObservation:@escaping (String)->Bool,
       deadline:@escaping () async throws -> Void={try await Task.sleep(nanoseconds:20_000_000_000)}) {self.capture=capture;self.confirm=confirm;self.knownObservation=knownObservation;self.deadline=deadline}
  private func entry(_ id:String)->Entry? {
    guard !closed,valid(id),knownObservation(id),let context=capture(id),selfUnbindEqual(context.observationID,id),context.current(),(0...SelfUnbindBridgeProjection.max).contains(context.sessionRevision) else{return nil}
    if let old=entries[id]{return old.context === context ? old:nil}
    guard entries.count<8 else{return nil};let value=Entry(context);entries[id]=value;return value
  }
  private func empty(_ id:String)->SelfUnbindBridgeState {SelfUnbindBridgeState(observationID:id,sessionRevision:0,revision:0,status:"closed",errorCode:"closed",canRequest:false)}
  private func valid(_ attempt:String)->Bool {!attempt.isEmpty&&attempt.utf8.count<=128&&attempt.utf8.allSatisfy {($0>=48&&$0<=57)||($0>=65&&$0<=90)||($0>=97&&$0<=122)||[45,46,95].contains($0)}}
  private func current(_ entry:Entry)->Bool {!closed&&entries[entry.context.observationID] === entry&&entry.context.current()}
  private func finish(_ entry:Entry,_ pending:Pending,_ value:SelfUnbindBridgeState) {
    guard entry.pending === pending else{return};entry.pending=nil;pending.timer?.cancel();let dismiss=pending.dismiss;pending.dismiss=nil;dismiss?()
    let replies=pending.replies;pending.replies=[];for reply in replies{reply.finish(value)}
  }
  func request(_ id:String,attempt:String,completion:@escaping (SelfUnbindBridgeState)->Void) {
    guard let entry=entry(id) else{completion(empty(id));return};let reply=Reply(completion),key=Data(attempt.utf8)
    guard valid(attempt) else{reply.finish(entry.state(entry.latest.status,"invalid_input"));return}
    if entry.failedBeginPriorID != nil{reply.finish(entry.state("unknown","unknown_result"));return}
    guard cancellationScopes[id]?.overflow != true else{reply.finish(entry.state(entry.latest.status,"busy"));return}
    if let pending=entry.pending{if pending.attempt==key&&pending.replies.count<8{pending.replies.append(reply)}else{reply.finish(entry.state(entry.latest.status,"busy"))};return}
    if cancelled.contains(CancelKey(observation:Data(id.utf8),attempt:key)){reply.finish(entry.dispatched.isEmpty ? entry.state("cancelled","cancelled"):entry.latest);return}
    if entry.used.contains(key){reply.finish(entry.latest);return}
    guard entry.used.count<64,jobs.count<2,entry.preflight==nil,entry.query==nil else{reply.finish(entry.state(entry.latest.status,"busy"));return};entry.used.insert(key)
    let pending=Pending(key),jobID=UUID();pending.replies=[reply];entry.pending=pending;_=entry.state("preparing")
    let task=Task { @MainActor [self] in
      defer{jobs.removeValue(forKey:jobID);entry.preflight=nil}
      do {
        try Task.checkCancellation();guard entry.pending === pending else{return}
        guard current(entry) else{finish(entry,pending,entry.state("session_changed","session_changed"));return}
        let authority=try await entry.context.read()
        guard entry.pending === pending else{return}
        guard current(entry),!Task.isCancelled else{finish(entry,pending,entry.state("session_changed","session_changed"));return}
        let value=entry.state(authority.view.state,authority.view.errorCode,authority.canRequest)
        guard authority.canRequest else{finish(entry,pending,value);return}
        pending.timer?.cancel();_=entry.state("confirming")
        let dismiss=try confirm(entry.context.title(),{[weak self,weak entry,weak pending] in
          guard let self,let entry,let pending,entry.pending === pending else{return}
          guard current(entry) else{finish(entry,pending,entry.state("session_changed","session_changed"));return}
          entry.dispatched.insert(key)
          do{let value=try entry.context.begin();finish(entry,pending,entry.state(value.state,value.errorCode))}
          catch{entry.failedBeginPriorID=authority.view.operationID;finish(entry,pending,entry.state("unknown","unknown_result"))}
        },{[weak self,weak entry,weak pending] in guard let self,let entry,let pending,entry.pending === pending else{return};finish(entry,pending,entry.state("cancelled","cancelled"))})
        if entry.pending === pending{pending.dismiss=dismiss}else{dismiss()}
      }catch{if entry.pending === pending{finish(entry,pending,entry.state("rejected","unavailable"))}}
    }
    pending.task=task;entry.preflight=task;jobs[jobID]=task
    pending.timer=Task { @MainActor [self,deadline] in do{try await deadline();try Task.checkCancellation()}catch{return};if entry.pending === pending{finish(entry,pending,entry.state("cancelled","timeout"));task.cancel()}}
  }
  func cancel(_ id:String,attempt:String) {
    guard !closed,valid(id),valid(attempt),knownObservation(id) else{return};let key=Data(attempt.utf8)
    if entries[id]?.dispatched.contains(key)==true{return}
    let cancellation:CancellationScope
    if let old=cancellationScopes[id]{cancellation=old}else{guard cancellationScopes.count<8 else{return};cancellation=CancellationScope();cancellationScopes[id]=cancellation}
    let cancel=CancelKey(observation:Data(id.utf8),attempt:key)
    if cancelled.count>=64 && !cancelled.contains(cancel){cancellation.overflow=true}else{cancelled.insert(cancel)}
    if let entry=entries[id],let pending=entry.pending,pending.attempt==key{finish(entry,pending,entry.state("cancelled","cancelled"));pending.task?.cancel()}
  }
  private func acceptAuthority(_ entry:Entry,_ authority:NativeSelfUnbindAuthority)->SelfUnbindBridgeState {
    if let prior=entry.failedBeginPriorID {
      guard !authority.view.operationID.isEmpty,!selfUnbindEqual(authority.view.operationID,prior) else{return entry.state("unknown","unknown_result")}
      entry.failedBeginPriorID=nil
    }
    return entry.state(authority.view.state,authority.view.errorCode,authority.canRequest && cancellationScopes[entry.context.observationID]?.overflow != true && entry.used.count<64)
  }
  func get(_ id:String,completion:@escaping (SelfUnbindBridgeState)->Void) {
    guard let entry=entry(id) else{completion(empty(id));return};let reply=Reply(completion)
    if entry.pending != nil{reply.finish(entry.latest);return}
    guard entry.query==nil,entry.preflight==nil,jobs.count<2 else{reply.finish(entry.state(entry.latest.status,"busy"));return}
    let jobID=UUID(),task=Task { @MainActor [self] in
      defer{jobs.removeValue(forKey:jobID);entry.query=nil;entry.queryReply=nil}
      do{try Task.checkCancellation();guard current(entry) else{reply.finish(entry.state("session_changed","session_changed"));return};let authority=try await entry.context.read();reply.finish(current(entry) && !Task.isCancelled ? acceptAuthority(entry,authority):entry.state("session_changed","session_changed"))}
      catch{reply.finish(entry.state("closed","unavailable"))}
    }
    entry.query=task;entry.queryReply=reply;jobs[jobID]=task
    let timer=Task { @MainActor [deadline] in do{try await deadline();try Task.checkCancellation()}catch{return};reply.finish(entry.state(entry.latest.status,"timeout"));task.cancel()}
    Task { @MainActor in await task.value;timer.cancel() }
  }
  func suspendObservation(_ id:String){if let entry=entries[id]{if let pending=entry.pending{finish(entry,pending,entry.state("cancelled","cancelled"));pending.task?.cancel()};entry.queryReply?.finish(entry.state("closed","closed"));entry.query?.cancel()}}
  func suspendAll(){for id in Array(entries.keys){suspendObservation(id)}}
  func release(_ id:String){suspendObservation(id);entries.removeValue(forKey:id);cancellationScopes.removeValue(forKey:id);cancelled=cancelled.filter {$0.observation != Data(id.utf8)}}
  func close(){guard !closed else{return};for id in Array(entries.keys){release(id)};closed=true;for task in jobs.values{task.cancel()}}
}

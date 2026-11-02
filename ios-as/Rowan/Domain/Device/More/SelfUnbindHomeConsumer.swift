import Foundation

/// A single page read plus a coalesced pending bit; cancellation retires publication,
/// but the replacement waits for actual I/O completion through HomeRoomTabs' permit.
@MainActor final class SelfUnbindHomeConsumer {
  private let tabs:HomeRoomTabs,application:SelfUnbindApplication,accountRevision:Int,canRead:()->Bool
  private var active=false,closed=false,wanted=false
  private var actual:Task<Void,Never>?
  private var subscription:UUID?
  private var seen:Int
  init(tabs:HomeRoomTabs,application:SelfUnbindApplication,accountRevision:Int,canRead:@escaping ()->Bool) {
    self.tabs=tabs;self.application=application;self.accountRevision=accountRevision;self.canRead=canRead;seen=application.ledger.revision
    subscription=application.subscribeHome(self,notify:{[weak self] in self?.dirtyChanged()})
  }
  func appear(){guard !closed else{return};active=true;if !tabs.state.loaded || !application.ledger.pending(revision:accountRevision).isEmpty{wanted=true};application.requestRecovery();pump()}
  func refresh(){guard !closed else{return};application.requestRecovery();wanted=true;invalidate()}
  private func dirtyChanged(){let next=application.ledger.revision;guard next != seen else{return};seen=next;invalidate()}
  private func invalidate(){guard !closed else{return};wanted=true;tabs.cancelLoad();actual?.cancel();pump()}
  func leave(){active=false;wanted=false;tabs.cancelLoad();actual?.cancel()}
  private func pump(){
    guard !closed,active,wanted,actual==nil,canRead() else{return};wanted=false
    actual=Task { @MainActor [self] in
      defer{actual=nil;pump()}
      var tickets:[SelfUnbindHomeTicket]=[]
      let receipt=await tabs.reloadTracked(beforeRead:{tickets=application.ledger.pending(revision:accountRevision)})
      guard let receipt,!Task.isCancelled,!closed,active,canRead() else{return}
      _=tabs.whileInstalled(receipt){ids in for ticket in tickets{_ = application.acknowledge(ticket,ids:ids)};return true}
    }
  }
  func close(){guard !closed else{return};closed=true;active=false;wanted=false;if let subscription{application.unsubscribeHome(subscription)};subscription=nil;tabs.cancelLoad();actual?.cancel()}
}

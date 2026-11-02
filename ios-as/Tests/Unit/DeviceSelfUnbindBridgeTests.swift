import XCTest
@testable import Rowan

@MainActor final class DeviceSelfUnbindBridgeTests:XCTestCase {
  @MainActor private final class Fixture {
    var current=true,dispatched=0,dialogs=0,dismissed=0,reads=0
    var authority=NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"idle",errorCode:""),canRequest:true)
    var beforeRead:() async -> Void = {};var afterBegin:() throws -> Void = {}
    var yes:(()->Void)?,no:(()->Void)?
    var results:[SelfUnbindBridgeState]=[]
    lazy var context=SelfUnbindBridgeContext(observationID:"obs",sessionRevision:7,current:{[unowned self] in current},title:{"Native public device"},read:{[unowned self] in reads+=1;await beforeRead();return authority},begin:{[unowned self] in dispatched+=1;try afterBegin();return SelfUnbindView(operationID:"native-only",state:"preparing",errorCode:"")})
    lazy var bridge=DeviceSelfUnbindBridge(capture:{[unowned self] in $0=="obs" ? context:nil},confirm:{[unowned self] title,yes,no in XCTAssertEqual(title,"Native public device");dialogs+=1;self.yes=yes;self.no=no;return {[weak self] in self?.dismissed+=1}},knownObservation:{$0=="obs"})
    func request(_ attempt:String="a"){bridge.request("obs",attempt:attempt){[unowned self] in results.append($0)}}
    func close(){bridge.close()}
  }
  private func wait(_ predicate:()->Bool) async {for _ in 0..<5000{if predicate(){return};await Task.yield()};XCTFail("Native boundary fixture stalled")}
  func testOnlyNativeAffirmativeDispatches() async {let f=Fixture();defer{f.close()};f.request();await wait {f.yes != nil};XCTAssertEqual(f.dispatched,0);f.yes?();XCTAssertEqual(f.dispatched,1);XCTAssertEqual(f.results.first?.status,"preparing")}
  func testCancelBeforeRequestPreventsLateDialog() async {let f=Fixture();defer{f.close()};f.bridge.cancel("obs",attempt:"a");f.request();await wait {!f.results.isEmpty};XCTAssertEqual(f.dialogs,0);XCTAssertEqual(f.dispatched,0);XCTAssertEqual(f.results.first?.status,"cancelled")}
  func testOldCancelCannotCancelNewAttempt() async {let f=Fixture();defer{f.close()};f.request();await wait {f.yes != nil};f.bridge.cancel("obs",attempt:"a");f.request("b");await wait {f.dialogs==2};f.bridge.cancel("obs",attempt:"a");f.yes?();XCTAssertEqual(f.dispatched,1)}
  func testDuplicateJoinsAndDifferentAttemptIsBusy() async {let f=Fixture();defer{f.close()};f.request();f.request();f.request("b");await wait {f.yes != nil};XCTAssertEqual(f.dialogs,1);XCTAssertEqual(f.results.first?.errorCode,"busy");f.yes?();XCTAssertEqual(f.results.count,3);XCTAssertEqual(f.dispatched,1)}
  func testAccountOrPageChangeBeforeAffirmativeCannotDispatch() async {let f=Fixture();defer{f.close()};f.request();await wait {f.yes != nil};f.current=false;f.yes?();XCTAssertEqual(f.dispatched,0);XCTAssertEqual(f.results.first?.status,"session_changed")}
  func testPauseCancelsAndLateAffirmativeIsInert() async {let f=Fixture();defer{f.close()};f.request();await wait {f.yes != nil};let old=f.yes;f.bridge.suspendObservation("obs");old?();XCTAssertEqual(f.dispatched,0);XCTAssertEqual(f.results.count,1)}
  func testCancelAfterDispatchCannotRelabelItUnsent() async {let f=Fixture();defer{f.close()};f.request();await wait {f.yes != nil};f.yes?();f.bridge.cancel("obs",attempt:"a");f.request();XCTAssertEqual(f.dispatched,1);XCTAssertEqual(f.dialogs,1);XCTAssertEqual(f.results.last?.status,"preparing")}
  func testUnknownAuthorityDoesNotOpenConfirmation() async {let f=Fixture();defer{f.close()};f.authority=NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"private",state:"unknown",errorCode:"unknown_result"),canRequest:false);f.request();await wait {!f.results.isEmpty};XCTAssertEqual(f.dialogs,0);XCTAssertEqual(f.results.first?.status,"unknown")}
  func testCancelledUncooperativePreflightNeverPresents() async {let f=Fixture();defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume()};f.beforeRead={await withCheckedContinuation {pending=$0}};f.request();await wait {pending != nil};f.bridge.cancel("obs",attempt:"a");f.request("b");XCTAssertEqual(f.results.last?.errorCode,"busy");XCTAssertEqual(f.reads,1);pending?.resume();pending=nil;for _ in 0..<20{await Task.yield()};XCTAssertEqual(f.dialogs,0);XCTAssertEqual(f.dispatched,0);XCTAssertEqual(f.results.count,2)}
  func testQueryPreservesHistoricalWithoutConfirmationOrDispatch() async {let f=Fixture();defer{f.close()};f.authority=NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"private",state:"historical_confirmed",errorCode:""),canRequest:true);f.bridge.get("obs"){f.results.append($0)};await wait {!f.results.isEmpty};XCTAssertEqual(f.results.first?.status,"historical_confirmed");XCTAssertEqual(f.dialogs,0);XCTAssertEqual(f.dispatched,0);XCTAssertNil(f.results.first?.dictionary["operationID"])}
  func testUnknownObservationNeverBorrowsContext() async {let f=Fixture();defer{f.close()};f.bridge.request("other",attempt:"a"){f.results.append($0)};XCTAssertEqual(f.results.first?.status,"closed");XCTAssertEqual(f.reads,0)}
  func testProjectionSemanticRevisionAndOverflowFailClosed() {let p=SelfUnbindBridgeProjection("obs",7,initialRevision:9_007_199_254_740_990);let a=p.accept("idle",allowed:true);XCTAssertEqual(a.revision,9_007_199_254_740_991);XCTAssertEqual(p.accept("idle",allowed:true).revision,a.revision);let closed=p.accept("sending");XCTAssertEqual(closed.status,"closed");XCTAssertFalse(closed.canRequest)}
  func testCancelledQuerySettlesOnceAndHoldsActualReadSlot() async {
    let f=Fixture();defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume()}
    f.beforeRead={await withCheckedContinuation {pending=$0}};f.bridge.get("obs"){f.results.append($0)};await wait {pending != nil}
    f.bridge.suspendObservation("obs");XCTAssertEqual(f.results.first?.status,"closed")
    f.bridge.get("obs"){f.results.append($0)};XCTAssertEqual(f.results.last?.errorCode,"busy");XCTAssertEqual(f.reads,1)
    pending?.resume();pending=nil;for _ in 0..<30{await Task.yield()};XCTAssertEqual(f.results.count,2)
    f.beforeRead={};f.bridge.get("obs"){f.results.append($0)};await wait {f.results.count==3};XCTAssertEqual(f.reads,2);XCTAssertEqual(f.results.last?.status,"idle")
  }
  func testDuplicateRecipientsAndCancelTombstonesHaveFiniteAdmission() async {
    let f=Fixture();defer{f.close()};for _ in 0..<9{f.request()};await wait {f.yes != nil}
    XCTAssertEqual(f.results.first?.errorCode,"busy");XCTAssertEqual(f.dialogs,1);f.yes?();XCTAssertEqual(f.dispatched,1);XCTAssertEqual(f.results.count,9)
    for n in 0..<65{f.bridge.cancel("obs",attempt:"attempt-\(n)")};f.request("new");XCTAssertEqual(f.results.last?.errorCode,"busy");XCTAssertEqual(f.dispatched,1)
  }

  func testCloseBeforeWorkerStartsDoesNotReadJournal() async {let f=Fixture();f.request();f.close();for _ in 0..<30{await Task.yield()};XCTAssertEqual(f.reads,0);XCTAssertEqual(f.dispatched,0);XCTAssertEqual(f.results.count,1)}

  @MainActor private final class PageCycleFixture {
    var contexts:[String:SelfUnbindBridgeContext]=[:],results:[SelfUnbindBridgeState]=[],dialogs=0,reads=0,dispatches=0,captures=0
    lazy var bridge=DeviceSelfUnbindBridge(capture:{[unowned self] id in captures+=1;return contexts[id]},confirm:{[unowned self] _,_,_ in dialogs+=1;return {}},knownObservation:{[unowned self] in contexts[$0] != nil})
    func add(_ id:String){contexts[id]=SelfUnbindBridgeContext(observationID:id,sessionRevision:7,current:{[unowned self] in contexts[id] != nil},title:{"Public"},read:{[unowned self] in reads+=1;return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"idle",errorCode:""),canRequest:true)},begin:{[unowned self] in dispatches+=1;return SelfUnbindView(operationID:"native",state:"preparing",errorCode:"")})}
    func release(_ id:String){contexts.removeValue(forKey:id);bridge.release(id)}
    func request(_ id:String,_ attempt:String){bridge.request(id,attempt:attempt){[unowned self] in results.append($0)}}
    func close(){bridge.close()}
  }
  func testSixtyFiveNormalCancelReleaseCyclesDoNotPoisonSharedModule() async {let f=PageCycleFixture();defer{f.close()}
    for n in 0..<65{let id="page-\(n)";f.add(id);f.bridge.cancel(id,attempt:"attempt");f.request(id,"attempt");XCTAssertEqual(f.results.last?.status,"cancelled");f.release(id);f.bridge.cancel(id,attempt:"late")}
    f.add("next-page");f.request("next-page","fresh");await wait {f.dialogs==1};XCTAssertEqual(f.reads,1);XCTAssertEqual(f.dispatches,0)
  }
  func testUnknownAndReleasedCancelsCannotConsumeBudget() async {let f=PageCycleFixture();defer{f.close()}
    for n in 0..<100{f.bridge.cancel("unknown-\(n)",attempt:"attempt")};f.add("released");f.release("released");for n in 0..<100{f.bridge.cancel("released",attempt:"late-\(n)")}
    f.add("active");f.bridge.cancel("active",attempt:"before-request");f.request("active","before-request");XCTAssertEqual(f.results.last?.status,"cancelled");XCTAssertEqual(f.reads,0)
    f.request("active","fresh");await wait {f.dialogs==1};XCTAssertEqual(f.reads,1)
  }
  func testReleasingSaturatedObservationRestoresBudgetForNewObservation() async {let f=PageCycleFixture();defer{f.close()}
    f.add("a");for n in 0..<65{f.bridge.cancel("a",attempt:"attempt-\(n)")};f.request("a","fresh");XCTAssertEqual(f.results.last?.errorCode,"busy");XCTAssertEqual(f.reads,0)
    f.release("a");f.add("b");f.bridge.cancel("b",attempt:"cancelled");f.request("b","cancelled");XCTAssertEqual(f.results.last?.status,"cancelled");f.request("b","fresh");await wait {f.dialogs==1}
  }
  func testMissingTombstoneQuarantinesOnlyItsObservationUntilRelease() async {let f=PageCycleFixture();defer{f.close()}
    f.add("a");for n in 0..<64{f.bridge.cancel("a",attempt:"attempt-\(n)")};f.add("b");f.bridge.cancel("b",attempt:"not-stored");f.release("a")
    f.request("b","not-stored");XCTAssertEqual(f.results.last?.errorCode,"busy");XCTAssertEqual(f.dialogs,0)
    f.add("c");f.request("c","fresh");await wait {f.dialogs==1};f.release("b");f.add("d");f.bridge.cancel("d",attempt:"cancelled");f.request("d","cancelled");XCTAssertEqual(f.results.last?.status,"cancelled")
  }
  func testAsynchronousAffirmativeFailureIsUnknownAndNotAnUnsentRetry() async {
    let f=Fixture();defer{f.close()};f.afterBegin={throw RowanFailure(code:0,message:"private begin failure")};f.request();await wait {f.yes != nil};let affirmative=f.yes
    affirmative?();XCTAssertEqual(f.dispatched,1);XCTAssertEqual(f.results.last?.status,"unknown");XCTAssertEqual(f.results.last?.errorCode,"unknown_result")
    f.bridge.get("obs"){f.results.append($0)};await wait {f.results.count==2};XCTAssertEqual(f.results.last?.status,"unknown");XCTAssertFalse(f.results.last?.canRequest ?? true)
    f.request("another-intent");XCTAssertEqual(f.dispatched,1);XCTAssertEqual(f.dialogs,1);XCTAssertEqual(f.results.last?.status,"unknown");XCTAssertFalse(f.results.last?.dictionary.values.contains {String(describing:$0).contains("private")} ?? true)
  }

  func testPausedKnownObservationRecordsCancelWithoutCaptureAndRejectsResumedLateRequest() async {let f=PageCycleFixture();defer{f.close()};var resumed=false;let id="paused"
    f.contexts[id]=SelfUnbindBridgeContext(observationID:id,sessionRevision:7,current:{resumed},title:{"Public"},read:{f.reads+=1;return NativeSelfUnbindAuthority(view:SelfUnbindView(operationID:"",state:"idle",errorCode:""),canRequest:true)},begin:{f.dispatches+=1;return SelfUnbindView(operationID:"native",state:"preparing",errorCode:"")})
    f.bridge.cancel(id,attempt:"late-attempt");XCTAssertEqual(f.captures,0);XCTAssertEqual(f.reads,0)
    resumed=true;f.request(id,"late-attempt");XCTAssertEqual(f.results.last?.status,"cancelled");XCTAssertEqual(f.dialogs,0);XCTAssertEqual(f.dispatches,0);XCTAssertEqual(f.reads,0)
    f.request(id,"fresh-attempt");await wait {f.dialogs==1}
  }

}

import XCTest
import UIKit
@testable import Rowan

@MainActor
final class PresentationServiceTests: XCTestCase {
  @MainActor private final class Signals: PresentationSignalSource {
    var callback:(()->Void)?,late:(()->Void)?;var observations=0,releases=0;var fail=false
    func observe(_ changed:@escaping ()->Void) throws -> any PresentationObservation {if fail{throw FixtureFailure()};observations+=1;callback=changed;late=changed;return PresentationClosureObservation {[weak self] in self?.releases+=1;self?.callback=nil}}
    func signal(){callback?()}
  }
  @MainActor private final class SystemSource: PresentationSystemSource {
    let signals=Signals()
    var state=PresentationSystemState(active:true,input:PresentationSystemInput(languageTags:["en"],appearance:.light))
    func capture()->PresentationSystemState{state}
    func observe(_ changed:@escaping ()->Void) throws -> any PresentationObservation{try signals.observe(changed)}
  }
  private struct FixtureFailure:Error{}
  @MainActor private final class Fixture {
    var context:PresentationAccountCapture;var captures=0
    let system=SystemSource(),signals=Signals()
    lazy var owner=PresentationOwner(accountSnapshot:{[unowned self] in captures+=1;return context})
    lazy var service=PresentationService(owner:owner,system:system,accountSignals:signals)
    init() throws{context=PresentationAccountCapture(revision:7,session:try PresentationServiceTests.session("{}"),cleanupRequired:false)}
    func change(_ raw:String,user:String="a",revision:Int=7,cleanup:Bool=false) throws {context=PresentationAccountCapture(revision:revision,session:try PresentationServiceTests.session(raw,user:user),cleanupRequired:cleanup);signals.signal()}
  }
  private static func session(_ raw:String,user:String="a",token:String="fixture") throws -> AccountSession {AccountSession(accessToken:token,refreshToken:"fixture-refresh",userID:user,expiresIn:nil,tokenType:nil,setting:try JSONDecoder().decode(AccountSettings.self,from:Data(raw.utf8)))}
  private func ready(_ f:Fixture)throws->PresentationSnapshot {guard case let .ready(value)=f.service.capture()else{throw FixtureFailure()};return value}
  func testIdempotentStartCloseAndNoRestart() throws {let f=try Fixture();XCTAssertTrue(f.service.start());XCTAssertTrue(f.service.start());XCTAssertEqual(f.system.signals.observations,1);f.service.close();f.service.close();XCTAssertEqual(f.system.signals.releases,1);XCTAssertEqual(f.signals.releases,1);XCTAssertFalse(f.service.start())}
  func testLateCallbackAfterCloseCannotCaptureAccount() throws {let f=try Fixture();f.service.start();f.service.close();let count=f.captures;f.system.signals.late?();f.signals.late?();XCTAssertEqual(f.captures,count)}
  func testSavedValuesAndUnknownUnits() throws {let f=try Fixture();defer{f.service.close()};try f.change(#"{"language":"zh-TW","theme":"dark"}"#);f.service.start();let p=try ready(f);XCTAssertEqual(p.language,.zhTW);XCTAssertEqual(p.effectiveTheme,.dark);XCTAssertNil(p.temperatureUnit);XCTAssertNil(p.measurementSystem)}
  func testTokenAndRawChangeDoesNotInvalidate() throws {let f=try Fixture();defer{f.service.close()};let owner=NSObject();var calls=0;let observation=try f.service.observe(owner){calls+=1};defer{observation.close()};f.service.start();let before=calls;f.context=PresentationAccountCapture(revision:7,session:try Self.session(#"{"future":7}"#,token:"renewed"),cleanupRequired:false);f.signals.signal();XCTAssertEqual(calls,before)}
  func testBackgroundDirtyIsBoundedAndForegroundPublishesLatestOnce() throws {let f=try Fixture();defer{f.service.close()};let owner=NSObject();var calls=0;let observation=try f.service.observe(owner){calls+=1};defer{observation.close()};f.service.start();f.system.state=PresentationSystemState(active:false,input:f.system.state.input);f.system.signals.signal();let before=calls;for i in 0..<100{try f.change(i%2==0 ? #"{"theme":"dark"}"# : "{}")};XCTAssertEqual(calls,before);f.system.state=PresentationSystemState(active:true,input:f.system.state.input);f.system.signals.signal();XCTAssertEqual(calls,before+1);f.system.signals.signal();XCTAssertEqual(calls,before+1);XCTAssertEqual(try ready(f).effectiveTheme,.light)}
  func testFixedThemeAndSystemThemeUseDifferentInputs() throws {let f=try Fixture();defer{f.service.close()};try f.change(#"{"theme":"light"}"#);f.service.start();let a=try ready(f);f.system.state=PresentationSystemState(active:true,input:PresentationSystemInput(languageTags:["en"],appearance:.dark));f.system.signals.signal();XCTAssertEqual(a,try ready(f));try f.change(#"{"theme":"system"}"#);XCTAssertEqual(try ready(f).effectiveTheme,.dark)}
  func testSystemUnavailableNeverReturnsOldSnapshot() throws {let f=try Fixture();defer{f.service.close()};f.service.start();_=try ready(f);f.system.state=PresentationSystemState(active:true,input:nil);f.system.signals.signal();if case .ready=f.service.capture(){XCTFail("Must not return cached A")};try f.change("{}",user:"b",revision:8);f.system.state=PresentationSystemState(active:true,input:PresentationSystemInput(languageTags:["en"],appearance:.light));XCTAssertEqual(try ready(f).accountRevision,8)}
  func testCleanupAndNewAccountDropChoices() throws {let f=try Fixture();defer{f.service.close()};try f.change(#"{"temperatureUnit":"F"}"#);f.service.start();XCTAssertEqual(try ready(f).temperatureUnit,.fahrenheit);try f.change(#"{"temperatureUnit":"F"}"#,cleanup:true);XCTAssertFalse(try ready(f).authenticated);XCTAssertNil(try ready(f).temperatureUnit);try f.change("{}",user:"b",revision:8);XCTAssertNil(try ready(f).temperatureUnit)}
  func testQueuedOldSignalCapturesLatestAccountOnly() throws {let f=try Fixture();defer{f.service.close()};f.service.start();let old=f.signals.callback;try f.change(#"{"language":"zh-TW"}"#,user:"b",revision:8);old?();XCTAssertEqual(try ready(f).accountRevision,8);XCTAssertEqual(try ready(f).language,.zhTW)}
  func testDirectCaptureIsFreshWithoutAccountNotification() throws {let f=try Fixture();defer{f.service.close()};f.service.start();f.context=PresentationAccountCapture(revision:8,session:try Self.session("{}",user:"b"),cleanupRequired:false);XCTAssertEqual(try ready(f).accountRevision,8)}
  func testObservationReleaseAndCloseInsideDeliveryRetireRemainingCallbacks() throws {let f=try Fixture();let owner=NSObject();var calls=0;let observation=try f.service.observe(owner){calls+=1;f.service.close()};f.service.start();XCTAssertEqual(calls,1);f.system.signals.late?();XCTAssertEqual(calls,1);observation.close();observation.close()}
  func testFailedSystemRegistrationReleasesAccountObserverAndMayRetry() throws {let f=try Fixture();defer{f.service.close()};f.system.signals.fail=true;XCTAssertFalse(f.service.start());XCTAssertEqual(f.signals.releases,1);XCTAssertEqual(f.captures,0);f.system.signals.fail=false;XCTAssertTrue(f.service.start());XCTAssertEqual(try ready(f).accountRevision,7)}
}

// Actual NotificationCenter ingress with a controlled normal delivery scheduler; no UIKit runtime execution claimed.
private final class QueuedPresentationScheduler: PresentationDeliveryScheduler, @unchecked Sendable {
  private final class Ticket: PresentationDeliveryCancellation, @unchecked Sendable {
    private let lock=NSLock();private var value=false
    var cancelled:Bool {lock.lock();defer{lock.unlock()};return value}
    func cancel(){lock.lock();value=true;lock.unlock()}
  }
  private let lock=NSLock()
  private var queue:[(Ticket,@MainActor ()->Void)]=[]
  var pending:Int {lock.lock();defer{lock.unlock()};return queue.filter{!$0.0.cancelled}.count}
  func schedule(_ action:@escaping @MainActor ()->Void)->any PresentationDeliveryCancellation {
    let ticket=Ticket();lock.lock();queue.append((ticket,action));lock.unlock();return ticket
  }
  @MainActor func drainIncludingCancelled(){lock.lock();let work=queue;queue=[];lock.unlock();for (_,action) in work{action()}}
}
@MainActor private final class PresentationNoIOGateway:HTTPGateway {
  func perform(_ method:String,_ path:String,body:[String:Any]?,token:String?) async throws->Any {throw PresentationRegistrationFailure()}
}
private struct PresentationNoIOStorage:SessionStorage {func read() async throws->Data?{nil};func write(_ data:Data?) async throws{}}
extension PresentationServiceTests {
  func testAccountNotificationBurstHasOneScheduledFreshDelivery() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let account=AccountService(http:PresentationNoIOGateway(),storage:PresentationNoIOStorage())
    let source=AccountPresentationSignals(account:account,center:center,scheduler:scheduler)
    var authority=1,seen:[Int]=[];let subscription=try source.observe{seen.append(authority)}
    defer{subscription.close()}
    for _ in 0..<10000{center.post(name:.rowanAccountContextChanged,object:account)}
    XCTAssertEqual(scheduler.pending,1);XCTAssertTrue(seen.isEmpty);authority=2
    scheduler.drainIncludingCancelled();XCTAssertEqual(seen,[2]);XCTAssertEqual(scheduler.pending,0)
  }
  func testAccountNotificationCloseRetiresQueuedTicketAndUnregisters() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let account=AccountService(http:PresentationNoIOGateway(),storage:PresentationNoIOStorage())
    let source=AccountPresentationSignals(account:account,center:center,scheduler:scheduler)
    var calls=0;let subscription=try source.observe{calls+=1}
    center.post(name:.rowanAccountContextChanged,object:account);subscription.close();subscription.close()
    center.post(name:.rowanAccountContextChanged,object:account);XCTAssertEqual(scheduler.pending,0)
    scheduler.drainIncludingCancelled();XCTAssertEqual(calls,0)
  }
  func testUIKitLifecycleAndLocaleNotificationsShareOnePendingSlot() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let source=UIKitPresentationSystemSource(center:center,scheduler:scheduler)
    var calls=0;let subscription=try source.observe{calls+=1};defer{subscription.close()}
    for _ in 0..<10000 {center.post(name:UIApplication.didBecomeActiveNotification,object:nil);center.post(name:NSLocale.currentLocaleDidChangeNotification,object:nil)}
    XCTAssertEqual(scheduler.pending,1);scheduler.drainIncludingCancelled();XCTAssertEqual(calls,1)
    center.post(name:UIApplication.willResignActiveNotification,object:nil);XCTAssertEqual(scheduler.pending,1)
    scheduler.drainIncludingCancelled();XCTAssertEqual(calls,2)
  }
  func testUIKitOldQueuedTicketCannotDeliverToNewRegistration() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let source=UIKitPresentationSystemSource(center:center,scheduler:scheduler)
    var old=0,new=0;let first=try source.observe{old+=1}
    center.post(name:NSLocale.currentLocaleDidChangeNotification,object:nil);first.close()
    let second=try source.observe{new+=1};defer{second.close()}
    center.post(name:NSLocale.currentLocaleDidChangeNotification,object:nil)
    XCTAssertEqual(scheduler.pending,1);scheduler.drainIncludingCancelled();XCTAssertEqual(old,0);XCTAssertEqual(new,1)
  }
}

/// Sendable envelope retains the SAME native account solely as immutable notification sender identity.
/// Worker never reads AccountService fields, invokes its methods or captures credentials/payload.
private final class PresentationBackgroundPoster: @unchecked Sendable {
  private let center:NotificationCenter
  private let sender:AnyObject
  init(center:NotificationCenter,sender:AnyObject){self.center=center;self.sender=sender}
  func post(_ count:Int){for _ in 0..<count{center.post(name:.rowanAccountContextChanged,object:sender)}}
}
extension PresentationServiceTests {
  // Intentionally do not pump MainActor while waiting: queue:.main would block the producer.
  // Every wait has a hard timeout; defer closes observers on both success and failure.
  func testBackgroundNotificationBurstCompletesBeforeMainDrainWithOnePending() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let account=AccountService(http:PresentationNoIOGateway(),storage:PresentationNoIOStorage())
    let source=AccountPresentationSignals(account:account,center:center,scheduler:scheduler)
    var authority=1,seen:[Int]=[];let subscription=try source.observe{seen.append(authority)}
    defer{subscription.close()}
    let poster=PresentationBackgroundPoster(center:center,sender:account),done=DispatchSemaphore(value:0)
    DispatchQueue.global(qos:.userInitiated).async{poster.post(10000);done.signal()}
    guard done.wait(timeout:.now()+3) == .success else{XCTFail("Notification ingress waited for MainActor");return}
    XCTAssertEqual(scheduler.pending,1);XCTAssertTrue(seen.isEmpty)
    authority=2;scheduler.drainIncludingCancelled();XCTAssertEqual(seen,[2])
  }
  func testConcurrentBackgroundProducersShareOnePendingNotificationTicket() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let account=AccountService(http:PresentationNoIOGateway(),storage:PresentationNoIOStorage())
    let source=AccountPresentationSignals(account:account,center:center,scheduler:scheduler)
    var calls=0;let subscription=try source.observe{calls+=1};defer{subscription.close()}
    let poster=PresentationBackgroundPoster(center:center,sender:account),group=DispatchGroup()
    for _ in 0..<4{group.enter();DispatchQueue.global(qos:.userInitiated).async{defer{group.leave()};poster.post(1000)}}
    guard group.wait(timeout:.now()+3) == .success else{XCTFail("Concurrent ingress waited for MainActor");return}
    XCTAssertEqual(scheduler.pending,1);XCTAssertEqual(calls,0)
    scheduler.drainIncludingCancelled();XCTAssertEqual(calls,1)
  }
  func testClosingAfterBackgroundIngressRejectsCancelledDeliveryAndLaterPosts() throws {
    let center=NotificationCenter(),scheduler=QueuedPresentationScheduler()
    let account=AccountService(http:PresentationNoIOGateway(),storage:PresentationNoIOStorage())
    let source=AccountPresentationSignals(account:account,center:center,scheduler:scheduler)
    var calls=0;let subscription=try source.observe{calls+=1};defer{subscription.close()}
    let poster=PresentationBackgroundPoster(center:center,sender:account),done=DispatchSemaphore(value:0)
    DispatchQueue.global(qos:.userInitiated).async{poster.post(1000);done.signal()}
    guard done.wait(timeout:.now()+3) == .success else{XCTFail("Notification ingress waited for MainActor");return}
    XCTAssertEqual(scheduler.pending,1);subscription.close()
    let afterClose=DispatchSemaphore(value:0)
    DispatchQueue.global(qos:.userInitiated).async{poster.post(1000);afterClose.signal()}
    guard afterClose.wait(timeout:.now()+3) == .success else{XCTFail("Unregistered producer did not finish");return}
    XCTAssertEqual(scheduler.pending,0);scheduler.drainIncludingCancelled();XCTAssertEqual(calls,0)
  }
}

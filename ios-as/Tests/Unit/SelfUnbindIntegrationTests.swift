import XCTest
@testable import Rowan

@MainActor final class SelfUnbindIntegrationTests:XCTestCase {
  private static let oldProcess="00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002:1"
  private static func record(_ phase:SelfUnbindPhase = .acknowledged,id:String="op",device:String="d",user:String="u")->SelfUnbindRecord {
    SelfUnbindRecord(key:selfUnbindKey(userID:user,resourceID:device),operationID:id,userID:user,resourceID:device,productID:"p",originToken:"old-page",phase:phase,errorCode:phase == .absenceObserved ? "not_bound":"",resourceToken:oldProcess)
  }
  @MainActor private final class Journal:SelfUnbindRecoveryJournal {
    var records:[String:SelfUnbindRecord]=[:],loads=0,scans=0,active=0,maximum=0,fail=false
    var beforeRead:() async throws -> Void = {},beforeComplete:(SelfUnbindRecord)throws -> Void = {_ in}
    func unresolved(userID:String) async throws -> [SelfUnbindRecord] {
      scans+=1;active+=1;maximum=max(maximum,active);defer{active-=1}
      let snapshot=records.values.filter {selfUnbindEqual($0.userID,userID)&&[SelfUnbindPhase.unknown,.acknowledged,.absenceObserved].contains($0.phase)}
      try await beforeRead();if fail{throw RowanFailure(code:0,message:"public storage failure")};return snapshot
    }
    func load(key:String) async throws -> SelfUnbindRecord? {loads+=1;return records[key]}
    func reserve(_ value:SelfUnbindRecord) async throws -> SelfUnbindRecord {if let old=records[value.key],[SelfUnbindPhase.unknown,.acknowledged,.absenceObserved].contains(old.phase){return old};records[value.key]=value;return value}
    func complete(_ value:SelfUnbindRecord) async throws -> Bool {try beforeComplete(value);guard records[value.key]?.operationID==value.operationID else{return false};records[value.key]=value;return true}
  }
  @MainActor private final class Home:HomeRepository {
    var calls=0,active=0,maximum=0,revisions:[Int]=[]
    var work:() async throws -> [HomeGroup] = {[]}
    func loadGroups(expectedRevision:Int) async throws -> [HomeGroup] {calls+=1;active+=1;maximum=max(maximum,active);revisions.append(expectedRevision);defer{active-=1};return try await work()}
  }
  @MainActor private final class Access:NativeDeviceAccessGateway {
    var calls=0;var beforeAuthorize:() async throws->Void = {};var proof:AuthorizedDevice?
    init(_ proof:AuthorizedDevice?){self.proof=proof}
    func authorize(resourceID:String,expectedRevision:Int) async throws -> AuthorizedDevice {calls+=1;try await beforeAuthorize();guard let proof else{throw RowanFailure(code:503,message:"Unexpected authorization")};return proof}
    func connection(_ device:AuthorizedDevice) async throws -> MQTTConnectionParameters {throw RowanFailure(code:503,message:"No transport connection")}
  }
  @MainActor private final class Repo:SelfUnbindRepository {
    var scope:DeviceMoreScope
    var deletes=0,reads=0
    var deleteWork:() async throws -> Void = {}
    init(_ scope:DeviceMoreScope){self.scope=scope}
    func deleteSelf() async throws {deletes+=1;try await deleteWork()}
    func isOwned() async throws -> Bool {reads+=1;throw RowanFailure(code:0,message:"Recovery must use actual HOME consumer")}
  }
  @MainActor private final class Fixture {
    let journal=Journal(),home=Home(),access:Access,repo:Repo
    var identity:MQTTPoolIdentity?,visible=true,ownerLookups=0,native:DeviceReadOwner?
    let revision:Int,user:String,device:String
    lazy var scopes=HomeReadScopes(authority:{[unowned self] in identity.map {($0.revision,$0.userID)}})
    lazy var tabs=HomeRoomTabs(repository:home,expectedRevision:revision,current:{[unowned self] in current()},readGate:scopes.forRevision(revision))
    lazy var app=SelfUnbindApplication(currentAccount:{[unowned self] in identity},journal:journal,access:access,repositories:{[unowned self] _ in repo},ownerIfCreated:{[unowned self] in ownerLookups+=1;return native})
    lazy var consumer=SelfUnbindHomeConsumer(tabs:tabs,application:app,accountRevision:revision,canRead:{[unowned self] in current()})
    init(_ seed:SelfUnbindRecord?=nil,proof:AuthorizedDevice?=nil) {
      revision=proof?.accountRevision ?? 7;user=proof?.userID ?? "u";device=proof?.resourceID ?? "d"
      identity=MQTTPoolIdentity(revision:revision,userID:user);access=Access(proof)
      repo=Repo(DeviceMoreScope(accountRevision:revision,resourceID:device,userID:user,productID:proof?.productID ?? "p"))
      if let seed{journal.records[seed.key]=seed}
    }
    func current(_ revision:Int?=nil)->Bool {visible&&identity?.revision==(revision ?? self.revision)}
    func seed(_ record:SelfUnbindRecord){journal.records[record.key]=record}
    func handle(_ observer:String="page") async throws -> DeviceReadHandle {
      if native==nil {native=DeviceReadOwner(currentAccount:{[unowned self] in identity},gateway:access,open:{device,_ in
        let resource=try MQTTLeaseResource(accountRevision:device.accountRevision,resourceID:device.resourceID,thingRef:"public-thing",userID:device.userID)
        let lease=DeviceReadFakeLease(resource);try lease.ready(1);return DeviceReadFakeBinding(lease)
      },invalidateAccount:{_ in})}
      return native!.observe(resourceID:device,nativeObserverID:observer)
    }
    func close(){visible=false;consumer.close();app.close();native?.close()}
  }
  private func wait(_ predicate:()->Bool) async throws {
    for _ in 0..<5000 {if predicate(){return};await Task.yield()};XCTFail("Controlled integration fixture did not settle");throw RowanFailure(code:0,message:"fixture stalled")
  }
  private func queued(_ f:Fixture) async throws {f.app.requestRecovery();try await wait {!f.app.ledger.pending(revision:f.revision).isEmpty}}
  private func group(_ id:String)->HomeGroup {HomeGroup(roomName:nil,devices:[HomeDevice(id:id,nickname:"Public device")])}
  func testAckRecoveryCompletesOnlyAfterActualHomeCacheInstall() async throws {
    let r=Self.record(),f=Fixture(r);defer{f.close()};try await queued(f)
    f.journal.beforeComplete={if $0.phase == .confirmed{XCTAssertTrue(f.tabs.state.loaded);XCTAssertTrue(f.tabs.state.groups.isEmpty)}}
    f.consumer.appear();try await wait {f.journal.records[r.key]?.phase == .confirmed}
    XCTAssertEqual(f.home.calls,1);XCTAssertEqual(f.ownerLookups,0);XCTAssertEqual(f.repo.deletes,0);XCTAssertEqual(f.access.calls,0)
  }
  func testUnknownRecoveryUsesHomeAbsenceWithoutDeleteOrHandle() async throws {
    let r=Self.record(.unknown),f=Fixture(r);defer{f.close()};try await queued(f);f.consumer.appear()
    try await wait {f.journal.records[r.key]?.phase == .alreadyAbsent}
    XCTAssertEqual(f.journal.records[r.key]?.errorCode,"absence_observed");XCTAssertEqual(f.repo.deletes,0);XCTAssertEqual(f.repo.reads,0);XCTAssertEqual(f.ownerLookups,0)
  }
  func testHomePresenceKeepsUnknownWithoutAutomaticPolling() async throws {
    let r=Self.record(.unknown),f=Fixture(r);defer{f.close()};try await queued(f);f.home.work={[self] in [group("d")]};f.consumer.appear()
    try await wait {f.tabs.state.loaded};for _ in 0..<20{await Task.yield()}
    XCTAssertEqual(f.home.calls,1);XCTAssertEqual(f.journal.records[r.key]?.phase,.unknown);XCTAssertEqual(f.app.ledger.pending(revision:7).count,1)
  }
  func testFailedHomeCannotAcknowledgeOrSpin() async throws {
    let r=Self.record(),f=Fixture(r);defer{f.close()};try await queued(f);f.home.work={throw RowanFailure(code:503,message:"public unavailable")};f.consumer.appear()
    try await wait {f.tabs.state.errorCode != nil};for _ in 0..<10{f.app.requestRecovery();await Task.yield()}
    XCTAssertEqual(f.home.calls,1);XCTAssertEqual(f.journal.records[r.key]?.phase,.acknowledged)
    f.consumer.refresh();try await wait {f.home.calls==2}
  }
  func testDirtyDuringReadRetiresOldResultAndCoalescesTickets() async throws {
    let f=Fixture();defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.home.work={[self] in if f.home.calls==1{await withCheckedContinuation {pending=$0};return [group("stale")]};return []}
    f.consumer.appear();try await wait {pending != nil}
    let one=Self.record(id:"one"),two=Self.record(id:"two",device:"e")
    f.seed(one);f.app.requestRecovery();try await wait {!f.app.ledger.pending(revision:7).isEmpty}
    f.seed(two);for _ in 0..<8{f.app.requestRecovery();await Task.yield()};XCTAssertEqual(f.home.calls,1);XCTAssertEqual(f.home.maximum,1)
    pending?.resume();pending=nil;try await wait {f.journal.records[one.key]?.phase == .confirmed&&f.journal.records[two.key]?.phase == .confirmed}
    XCTAssertEqual(f.home.calls,2);XCTAssertTrue(f.tabs.state.groups.isEmpty)
  }
  func testPauseEarlyReturnRetainsActualIoSlot() async throws {
    let r=Self.record(),f=Fixture(r);defer{f.close()};try await queued(f);var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.home.work={if f.home.calls==1{await withCheckedContinuation {pending=$0}};return []}
    f.consumer.appear();try await wait {pending != nil};f.consumer.leave();f.consumer.appear();for _ in 0..<10{await Task.yield()}
    XCTAssertEqual(f.home.calls,1);XCTAssertEqual(f.journal.records[r.key]?.phase,.acknowledged)
    pending?.resume();pending=nil;try await wait {f.journal.records[r.key]?.phase == .confirmed};XCTAssertEqual(f.home.calls,2);XCTAssertEqual(f.home.maximum,1)
  }
  func testClosingPageNeverAcknowledgesLateRead() async throws {
    let r=Self.record(),f=Fixture(r);defer{f.close()};try await queued(f);var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.home.work={await withCheckedContinuation {pending=$0};return []};f.consumer.appear();try await wait {pending != nil}
    f.consumer.close();f.tabs.close();pending?.resume();pending=nil;for _ in 0..<30{await Task.yield()}
    XCTAssertEqual(f.journal.records[r.key]?.phase,.acknowledged);XCTAssertEqual(f.app.ledger.pending(revision:7).count,1)
  }
  func testOldAccountJournalResultCannotQueueNewAccountTicket() async throws {
    let f=Fixture(Self.record());defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.journal.beforeRead={if f.journal.scans==1{await withCheckedContinuation {pending=$0}}}
    f.app.requestRecovery();try await wait {pending != nil};f.identity=MQTTPoolIdentity(revision:8,userID:"b");f.app.accountChanged();pending?.resume()
    try await wait {f.journal.scans>=2};XCTAssertTrue(f.app.ledger.pending(revision:8).isEmpty);XCTAssertTrue(f.app.ledger.pending(revision:7).isEmpty);XCTAssertEqual(f.home.calls,0);XCTAssertEqual(f.ownerLookups,0)
  }
  func testRepeatedRecoveryRequestsUseOnePhysicalJournalReadAndOnePendingBit() async throws {
    let f=Fixture();defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.journal.beforeRead={if f.journal.scans==1{await withCheckedContinuation {pending=$0}}};f.app.requestRecovery();try await wait {pending != nil}
    for _ in 0..<20{f.app.requestRecovery()};XCTAssertEqual(f.journal.scans,1);pending?.resume();pending=nil;try await wait {f.journal.scans==2};XCTAssertEqual(f.journal.maximum,1)
  }
  func testActiveDeleteIsSkippedUntilCoreActualWorkerSettles() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let a=try await f.handle(),b=try await f.handle("b")
    try await wait {if case let .current(value)=a.state{return value.metadata != nil};return false}
    let registration=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true}));var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.repo.deleteWork={await withCheckedContinuation {pending=$0}};let operation=f.app.begin(registration,intentID:"tap");try await wait {pending != nil}
    f.app.requestRecovery();for _ in 0..<20{await Task.yield()};XCTAssertTrue(f.app.ledger.pending(revision:f.revision).isEmpty)
    registration.close();a.close();pending?.resume();pending=nil;_=try await operation.value()
    if case let .current(value)=b.state{XCTAssertEqual(value.phase,.forbidden)}else{XCTFail("Original remaining observer missing")}
    f.consumer.appear();try await wait {operation.state.state=="confirmed"};XCTAssertEqual(f.repo.deletes,1);XCTAssertEqual(f.repo.reads,0)
  }
  func testRegistrationRequiresExistingActualOwnerAndCannotStartOne() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()}
    let foreign=DeviceReadOwner(currentAccount:{f.identity},gateway:f.access,open:{_,_ in throw DeviceReadFailure.connection},invalidateAccount:{_ in});defer{foreign.close()}
    let handle=foreign.observe(resourceID:f.device,nativeObserverID:"foreign");try await wait {if case let .current(value)=handle.state{return value.metadata != nil};return false}
    XCTAssertNil(f.app.register(handle:handle,expectedRevision:f.revision,pageCurrent:{true}));XCTAssertNil(f.native);XCTAssertEqual(f.repo.deletes,0)
  }
  func testRegistrationReleaseDeniesNewIntentWithoutRetiringOtherObserver() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let a=try await f.handle(),b=try await f.handle("b")
    try await wait {if case let .current(value)=a.state{return value.metadata != nil};return false}
    let registration=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true}));registration.close()
    let result=try await f.app.begin(registration,intentID:"tap").value();XCTAssertEqual(result.errorCode,"session_changed")
    if case let .current(value)=b.state{XCTAssertNotEqual(value.phase,.forbidden)}else{XCTFail("Other observer closed")};XCTAssertEqual(f.repo.deletes,0)
  }
  func testNativeRelationshipReplacementCannotCloseLaterIncarnation() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let a=try await f.handle()
    try await wait {if case let .current(value)=a.state{return value.metadata != nil};return false}
    let registration=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true}));XCTAssertTrue(f.app.relationshipReplaced(registration))
    let new=try await f.handle("new");try await wait {if case let .current(value)=new.state{return value.metadata != nil};return false}
    XCTAssertNotNil(f.app.register(handle:new,expectedRevision:f.revision,pageCurrent:{true}));XCTAssertTrue(f.app.relationshipReplaced(registration))
    if case let .current(value)=new.state{XCTAssertNotEqual(value.phase,.forbidden)}else{XCTFail("New resource was closed")}
  }
  func testFullHomeNotSelectedRoomDeterminesAbsence() async throws {
    let r=Self.record(),f=Fixture(r);defer{f.close()};try await queued(f)
    f.home.work={[
      HomeGroup(roomName:"Kitchen",devices:[HomeDevice(id:"other",nickname:"Public")],roomID:.text("k")),
      HomeGroup(roomName:"Bedroom",devices:[HomeDevice(id:"d",nickname:"Public")],roomID:.text("b"))]}
    f.consumer.appear();try await wait {f.tabs.state.loaded};f.tabs.select(.text("k"));f.consumer.refresh();try await wait {f.home.calls==2 && !f.tabs.state.loading}
    XCTAssertEqual(f.tabs.state.visibleGroups.count,1);XCTAssertEqual(f.journal.records[r.key]?.phase,.acknowledged)
  }
  func testInstalledReadReceiptCannotBeUsedAfterCancelOrNewRead() async throws {
    let f=Fixture();defer{f.close()};let oldRead=await f.tabs.reloadTracked(beforeRead:{});let old=try XCTUnwrap(oldRead);f.tabs.cancelLoad();var invoked=false
    XCTAssertFalse(f.tabs.whileInstalled(old){_ in invoked=true;return true});XCTAssertFalse(invoked)
    let newRead=await f.tabs.reloadTracked(beforeRead:{});let new=try XCTUnwrap(newRead);XCTAssertTrue(f.tabs.whileInstalled(new){_ in true});XCTAssertFalse(f.tabs.whileInstalled(old){_ in true})
  }
  func testRecreatedSameRevisionPageWaitsForOldActualIo() async throws {
    let f=Fixture();defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.home.work={if f.home.calls==1{await withCheckedContinuation {pending=$0}};return []};f.consumer.appear();try await wait {pending != nil};f.consumer.close();f.tabs.close()
    let tabs=HomeRoomTabs(repository:f.home,expectedRevision:7,current:{f.current()},readGate:f.scopes.forRevision(7))
    let page=SelfUnbindHomeConsumer(tabs:tabs,application:f.app,accountRevision:7,canRead:{f.current()});defer{page.close();tabs.close()}
    page.appear();for _ in 0..<20{await Task.yield()};XCTAssertEqual(f.home.calls,1)
    pending?.resume();pending=nil;try await wait {tabs.state.loaded};XCTAssertEqual(f.home.calls,2);XCTAssertEqual(f.home.maximum,1)
  }
  func testNewRevisionReadsIndependentlyAndOldIoCannotAckNewTicket() async throws {
    let f=Fixture();defer{f.close()};var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume();pending=nil}
    f.home.work={if f.home.calls==1{await withCheckedContinuation {pending=$0}};return []};f.consumer.appear();try await wait {pending != nil};f.consumer.leave()
    f.identity=MQTTPoolIdentity(revision:8,userID:"b");let r=Self.record(id:"b-op",user:"b");f.seed(r);f.app.accountChanged();try await wait {!f.app.ledger.pending(revision:8).isEmpty}
    let tabs=HomeRoomTabs(repository:f.home,expectedRevision:8,current:{f.current(8)},readGate:f.scopes.forRevision(8))
    let page=SelfUnbindHomeConsumer(tabs:tabs,application:f.app,accountRevision:8,canRead:{f.current(8)});defer{page.close();tabs.close()}
    page.appear();try await wait {f.journal.records[r.key]?.phase == .confirmed};XCTAssertEqual(f.home.revisions,[7,8]);pending?.resume();pending=nil;for _ in 0..<20{await Task.yield()};XCTAssertEqual(f.home.revisions,[7,8])
  }
  func testReadScopeRejectsOldFactoryAndSameRevisionDifferentExactIdentity() {
    var identity:(Int,String)?=(7,"\u{e9}");let scopes=HomeReadScopes(authority:{identity});let a=scopes.forRevision(7)
    XCTAssertTrue(a === scopes.forRevision(7));identity=(7,"e\u{301}");XCTAssertNil(scopes.forRevision(7));identity=(8,"b");XCTAssertFalse(a === scopes.forRevision(8));XCTAssertNil(scopes.forRevision(7))
  }
  func testCapacityRejectsBeforeCoreDispatchAndDuplicateUsesExistingSlot() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()}
    f.repo.deleteWork={throw RowanFailure(code:503,message:"Public unknown result")}
    var last:NativeSelfUnbindOperation?,page:NativeSelfUnbindRegistration?
    for index in 0..<128 {
      let handle=try await f.handle("capacity-\(index)")
      try await wait {if case let .current(value)=handle.state{return value.metadata != nil};return false}
      let registration=try XCTUnwrap(f.app.register(handle:handle,expectedRevision:f.revision,pageCurrent:{true}))
      let operation=f.app.begin(registration,intentID:"tap"),value=try await operation.value()
      XCTAssertEqual(value.state,"unknown")
      if index<127{registration.close();handle.close()}else{last=operation;page=registration}
    }
    let registration=try XCTUnwrap(page);XCTAssertTrue(last === f.app.begin(registration,intentID:"tap"))
    let loads=f.journal.loads,dispatches=f.repo.deletes
    let rejected=try await f.app.begin(registration,intentID:"new-intent").value()
    XCTAssertEqual(rejected.errorCode,"busy");XCTAssertEqual(f.journal.loads,loads);XCTAssertEqual(f.repo.deletes,dispatches)
  }
  func testDuplicateReturnsSameWrapperAndBothObserveDurableCleanup() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let handle=try await f.handle()
    try await wait {if case let .current(value)=handle.state{return value.metadata != nil};return false}
    let page=try XCTUnwrap(f.app.register(handle:handle,expectedRevision:f.revision,pageCurrent:{true}))
    var release:CheckedContinuation<Void,Never>?
    defer{release?.resume();release=nil}
    f.repo.deleteWork={await withCheckedContinuation {release=$0}}
    let first=f.app.begin(page,intentID:"tap"),second=f.app.begin(page,intentID:"tap");XCTAssertTrue(first === second)
    try await wait {release != nil};XCTAssertEqual(f.repo.deletes,1);release?.resume();release=nil;_=try await first.value()
    f.consumer.appear();try await wait {first.state.state=="confirmed"};XCTAssertEqual(second.state.state,"confirmed");XCTAssertEqual(f.repo.deletes,1)
  }
  func testHistoricalJournalNeverReturnsOldBindingWrapper() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};f.repo.deleteWork={throw RowanFailure(code:503,message:"Public unknown result")}
    let a=try await f.handle();try await wait {if case let .current(value)=a.state{return value.metadata != nil};return false}
    let first=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true})),old=f.app.begin(first,intentID:"old");_=try await old.value();first.close();a.close()
    let b=try await f.handle("new");try await wait {if case let .current(value)=b.state{return value.metadata != nil};return false}
    let second=try XCTUnwrap(f.app.register(handle:b,expectedRevision:f.revision,pageCurrent:{true})),fresh=f.app.begin(second,intentID:"new")
    XCTAssertFalse(old === fresh);_=try await fresh.value();f.consumer.appear();try await wait {fresh.state.state=="historical_already_absent"}
    XCTAssertEqual(old.state.state,"historical_already_absent");XCTAssertEqual(f.repo.deletes,1)
  }

  func testSameUserNewRevisionCannotBorrowPreviousAccountWrapper() async throws {
    let proof=try await makeDeviceReadProof(),f=Fixture(proof:proof);defer{f.close()};f.repo.deleteWork={throw RowanFailure(code:503,message:"Public unknown result")}
    let a=try await f.handle();try await wait {if case let .current(value)=a.state{return value.metadata != nil};return false}
    let first=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true})),old=f.app.begin(first,intentID:"old");_=try await old.value();first.close();a.close()
    let (account,_)=try await makeDeviceReadAccount(resourceID:f.device)
    try await account.login(account:"public@example.test",pin:"fixture")
    let nextProof=try await HTTPDeviceAccess(account:account,expiryEncoding:.unknown).authorize(resourceID:f.device,expectedRevision:account.revision)
    XCTAssertGreaterThan(nextProof.accountRevision,f.revision)
    f.identity=MQTTPoolIdentity(revision:nextProof.accountRevision,userID:f.user);f.access.proof=nextProof
    f.repo.scope=DeviceMoreScope(accountRevision:nextProof.accountRevision,resourceID:f.device,userID:f.user,productID:nextProof.productID);f.app.accountChanged()
    let b=try await f.handle("new-revision");try await wait {if case let .current(value)=b.state{return value.metadata != nil};return false}
    let page=try XCTUnwrap(f.app.register(handle:b,expectedRevision:nextProof.accountRevision,pageCurrent:{true})),fresh=f.app.begin(page,intentID:"new")
    XCTAssertFalse(old === fresh);_=try await fresh.value();XCTAssertEqual(old.state.state,"session_changed")
    let tabs=HomeRoomTabs(repository:f.home,expectedRevision:nextProof.accountRevision,current:{f.current(nextProof.accountRevision)},readGate:f.scopes.forRevision(nextProof.accountRevision))
    let consumer=SelfUnbindHomeConsumer(tabs:tabs,application:f.app,accountRevision:nextProof.accountRevision,canRead:{f.current(nextProof.accountRevision)});defer{consumer.close();tabs.close()}
    consumer.appear();try await wait {fresh.state.state=="historical_already_absent"}
    XCTAssertEqual(old.state.state,"session_changed");XCTAssertEqual(f.repo.deletes,1)
  }

}

extension SelfUnbindIntegrationTests {
  func testLateAckInvalidatesOrdinaryRecreatedPageAndRecoveryDoesNotRepeatFence() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let a=try await f.handle("a")
    try await wait{if case let .current(s)=a.state{return s.metadata != nil};return false}
    let registration=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true}));let delete=DeviceReadTestSignal()
    f.repo.deleteWork={try await delete.wait()};let op=f.app.begin(registration,intentID:"tap");try await wait{delete.waiting>0}
    registration.close();a.close();let b=try await f.handle("b");try await wait{if case let .current(s)=b.state{return s.metadata != nil};return false}
    XCTAssertNotNil(f.app.register(handle:b,expectedRevision:f.revision,pageCurrent:{true}));XCTAssertTrue(registration.binding.relationshipCurrent())
    let owner=try XCTUnwrap(f.native),old=try XCTUnwrap(owner.captureFeatureAuthority(b)),proof=DeviceReadTestSignal()
    f.access.beforeAuthorize={try await proof.wait()};delete.open();_=try await op.value();try await wait{proof.waiting>0}
    XCTAssertNil(try b.getSnapshot().metadata);XCTAssertNil(owner.captureFeatureAuthority(b));XCTAssertFalse(owner.featureReadCurrent(b,authority:old))
    let count=f.access.calls;for _ in 0..<5{f.app.requestRecovery();await Task.yield()};XCTAssertEqual(f.access.calls,count)
    proof.open();try await wait{owner.captureFeatureAuthority(b) != nil};XCTAssertFalse(owner.featureReadCurrent(b,authority:old));XCTAssertEqual(f.repo.deletes,1)
  }
  func testConfirmedPairOnNewPageRetiresWholeGroupAndOldAckSkipsReplacement() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let a=try await f.handle("a")
    try await wait{if case let .current(s)=a.state{return s.metadata != nil};return false}
    let first=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true})),gate=DeviceReadTestSignal()
    f.repo.deleteWork={try await gate.wait()};let op=f.app.begin(first,intentID:"tap");try await wait{gate.waiting>0};first.close();a.close()
    let b=try await f.handle("b");try await wait{if case let .current(s)=b.state{return s.metadata != nil};return false}
    let second=try XCTUnwrap(f.app.register(handle:b,expectedRevision:f.revision,pageCurrent:{true}))
    XCTAssertTrue(f.app.relationshipReplaced(second));XCTAssertFalse(first.binding.relationshipCurrent());XCTAssertFalse(second.binding.relationshipCurrent())
    let replacement=try await f.handle("replacement");try await wait{if case let .current(s)=replacement.state{return s.metadata != nil};return false}
    let owner=try XCTUnwrap(f.native),latest=try XCTUnwrap(owner.captureFeatureAuthority(replacement)),count=f.access.calls
    gate.open();_=try await op.value();for _ in 0..<5{f.app.requestRecovery();await Task.yield()}
    XCTAssertTrue(owner.captureFeatureAuthority(replacement) === latest);XCTAssertEqual(f.access.calls,count);XCTAssertEqual(f.repo.deletes,1)
  }
  func testAckAfterAccountChangeDoesNotStartFreshAuthorizationForNewAccount() async throws {
    let f=Fixture(proof:try await makeDeviceReadProof());defer{f.close()};let a=try await f.handle()
    try await wait{if case let .current(s)=a.state{return s.metadata != nil};return false}
    let registration=try XCTUnwrap(f.app.register(handle:a,expectedRevision:f.revision,pageCurrent:{true})),gate=DeviceReadTestSignal()
    f.repo.deleteWork={try await gate.wait()};let op=f.app.begin(registration,intentID:"tap");try await wait{gate.waiting>0}
    f.identity=MQTTPoolIdentity(revision:f.revision+1,userID:"new-user");f.app.accountChanged();let count=f.access.calls
    gate.open();_=try await op.value();XCTAssertEqual(f.access.calls,count);XCTAssertEqual(f.repo.deletes,1)
  }
}

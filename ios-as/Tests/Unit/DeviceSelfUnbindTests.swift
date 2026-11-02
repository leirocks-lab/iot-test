import XCTest
@testable import Rowan

@MainActor final class DeviceSelfUnbindTests:XCTestCase {
  @MainActor private final class Journal:SelfUnbindJournal {
    var records:[String:SelfUnbindRecord]=[:],failReserve=false,failComplete=false
    var reserveHook:() async throws -> Void = {}
    func load(key:String) async throws -> SelfUnbindRecord? {records[key]}
    func reserve(_ value:SelfUnbindRecord) async throws -> SelfUnbindRecord {
      try await reserveHook();if failReserve{throw SelfUnbindJournalFailure.storageUnavailable}
      if let old=records[value.key],[SelfUnbindPhase.unknown,.acknowledged,.absenceObserved].contains(old.phase){return old}
      records[value.key]=value;return value
    }
    func complete(_ value:SelfUnbindRecord) async throws -> Bool {
      if failComplete{throw SelfUnbindJournalFailure.storageUnavailable}
      guard records[value.key]?.operationID==value.operationID else{return false};records[value.key]=value;return true
    }
  }
  @MainActor private final class Repo:SelfUnbindRepository {
    let scope:DeviceMoreScope
    var deletes=0,reads=0,owned=true
    var deleteHook:() async throws -> Void = {},readHook:() async throws -> Void = {}
    init(_ scope:DeviceMoreScope){self.scope=scope}
    func deleteSelf() async throws {deletes+=1;try await deleteHook()}
    func isOwned() async throws -> Bool {reads+=1;try await readHook();return owned}
  }
  @MainActor private final class Invalidation:SelfUnbindInvalidation {
    var calls=0,lost=0,cleaned=true
    func apply(_ record:SelfUnbindRecord,binding:SelfUnbindBinding) async throws -> Bool {calls+=1;return cleaned}
    func capture(_ binding:SelfUnbindBinding)->String?{"00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002:1"}
    func ownershipLost(_ binding:SelfUnbindBinding,resourceToken:String){lost+=1}
  }
  @MainActor private final class Fixture {
    let scope:DeviceMoreScope,gateway:DeviceReadFakeGateway,journal=Journal(),invalidation=Invalidation(),repo:Repo
    var identity:MQTTPoolIdentity?,relationship=true,page=true
    lazy var owner=DeviceReadOwner(currentAccount:{[unowned self] in identity},gateway:gateway,open:{device,_ in
      let resource=try MQTTLeaseResource(accountRevision:device.accountRevision,resourceID:device.resourceID,thingRef:"public-thing",userID:device.userID)
      let lease=DeviceReadFakeLease(resource);try lease.ready(1);return DeviceReadFakeBinding(lease)
    },invalidateAccount:{_ in})
    lazy var handle=owner.observe(resourceID:scope.resourceID,nativeObserverID:"self-unbind-page")
    lazy var binding=SelfUnbindBinding(scope:scope,handle:handle,relationshipCurrent:{[unowned self] in relationship},pageCurrent:{[unowned self] in page})
    init(_ proof:AuthorizedDevice){scope=DeviceMoreScope(accountRevision:proof.accountRevision,resourceID:proof.resourceID,userID:proof.userID,productID:proof.productID);gateway=DeviceReadFakeGateway(proof);repo=Repo(scope);identity=MQTTPoolIdentity(revision:proof.accountRevision,userID:proof.userID)}
    func coordinator()->DeviceSelfUnbindCoordinator {DeviceSelfUnbindCoordinator(currentAccount:{[unowned self] in identity},access:gateway,journal:journal,repositories:{[unowned self] _ in repo},invalidation:invalidation)}
  }
  private func wait(_ predicate:()->Bool) async throws {
    for _ in 0..<1000 {if predicate(){return};await Task.yield()};XCTFail("Public fixture not ready");throw SelfUnbindJournalFailure.storageUnavailable
  }
  private func fixture() async throws -> Fixture {
    let f=Fixture(try await makeDeviceReadProof());_=f.handle
    try await wait {if case let .current(value)=f.handle.state{return value.metadata != nil};return false};return f
  }
  func testDurableUnknownMustCompleteBeforeDelete() async throws {
    let f=try await fixture();defer{f.owner.close()};var pending:CheckedContinuation<Void,Never>?
    f.journal.reserveHook={await withCheckedContinuation {pending=$0}}
    f.repo.deleteHook={XCTAssertEqual(f.journal.records.values.first?.phase,.unknown)}
    let task=f.coordinator().begin(f.binding,intentID:"tap");try await wait {pending != nil};XCTAssertEqual(f.repo.deletes,0)
    pending?.resume();let value=try await task.value();XCTAssertEqual(value.state,"confirmed");XCTAssertEqual(f.invalidation.calls,1)
  }
  func testFailedReservePreventsWire() async throws {
    let f=try await fixture();defer{f.owner.close()};f.journal.failReserve=true
    let value=try await f.coordinator().begin(f.binding,intentID:"tap").value();XCTAssertEqual(value.errorCode,"storage_unavailable");XCTAssertEqual(f.repo.deletes,0)
  }
  func testAckWithoutHomeCleanupRemainsPendingAndReconcileNeverDeletesAgain() async throws {
    let f=try await fixture();defer{f.owner.close()};f.invalidation.cleaned=false;let owner=f.coordinator()
    let pending=try await owner.begin(f.binding,intentID:"tap").value();XCTAssertEqual(pending.state,"confirmed_cleanup_pending")
    XCTAssertEqual(f.journal.records.values.first?.phase,.acknowledged);f.invalidation.cleaned=true
    let done=try await owner.reconcile(f.binding).value();XCTAssertEqual(done.state,"confirmed");XCTAssertEqual(f.repo.deletes,1);XCTAssertEqual(f.repo.reads,0)
  }
  func testUnknownSurvivesCoordinatorReconstructionAndHomePresenceCannotReplay() async throws {
    let f=try await fixture();defer{f.owner.close()};f.repo.deleteHook={throw RowanFailure(code:408,message:"private")}
    let initial=try await f.coordinator().begin(f.binding,intentID:"tap").value();XCTAssertEqual(initial.state,"unknown")
    let restored=f.coordinator();let duplicate=try await restored.begin(f.binding,intentID:"new-tap").value();XCTAssertEqual(duplicate.state,"unknown")
    let present=try await restored.reconcile(f.binding).value();XCTAssertEqual(present.state,"unknown")
    f.repo.owned=false;let absent=try await restored.reconcile(f.binding).value();XCTAssertEqual(absent.state,"already_absent");XCTAssertEqual(f.repo.deletes,1)
  }
  func testFailedHomeReadNeverMeansAbsence() async throws {
    let f=try await fixture();defer{f.owner.close()};f.repo.deleteHook={throw RowanFailure(code:408,message:"private")};let owner=f.coordinator()
    _=try await owner.begin(f.binding,intentID:"tap").value();f.repo.readHook={throw RowanFailure(code:503,message:"private")}
    let value=try await owner.reconcile(f.binding).value();XCTAssertEqual(value.state,"unknown");XCTAssertEqual(f.invalidation.calls,0)
  }
  func testDuplicateIntentsShareWorkerAndPageAwaitCancellationDoesNotCancelActualIo() async throws {
    let f=try await fixture();defer{f.owner.close()};var pending:CheckedContinuation<Void,Never>?
    f.repo.deleteHook={await withCheckedContinuation {pending=$0}}
    let owner=f.coordinator(),task=owner.begin(f.binding,intentID:"tap");try await wait {pending != nil}
    XCTAssertTrue(task === owner.begin(f.binding,intentID:"second"))
    let waiter=Task {try await task.value()};await Task.yield();waiter.cancel();f.page=false;pending?.resume()
    do {_=try await waiter.value;XCTFail("Expected waiter cancellation")}catch{XCTAssertTrue(error is CancellationError)}
    let value=try await task.value();XCTAssertEqual(value.state,"confirmed");XCTAssertEqual(f.repo.deletes,1)
    f.page=true;XCTAssertTrue(task === owner.begin(f.binding,intentID:"second"))
  }
  func testOldAccountAckCannotTouchB() async throws {
    let f=try await fixture();defer{f.owner.close()};var pending:CheckedContinuation<Void,Never>?
    f.repo.deleteHook={await withCheckedContinuation {pending=$0}};let task=f.coordinator().begin(f.binding,intentID:"tap")
    try await wait {pending != nil};f.identity=MQTTPoolIdentity(revision:f.scope.accountRevision+1,userID:"b");pending?.resume()
    let value=try await task.value();XCTAssertEqual(value.state,"confirmed_cleanup_pending");XCTAssertEqual(f.invalidation.calls,0)
  }
  func testRetiredIncarnationDuringReserveCannotDispatch() async throws {
    let f=try await fixture();defer{f.owner.close()};var pending:CheckedContinuation<Void,Never>?
    f.journal.reserveHook={await withCheckedContinuation {pending=$0}};let task=f.coordinator().begin(f.binding,intentID:"tap")
    try await wait {pending != nil};f.relationship=false;pending?.resume()
    let value=try await task.value();XCTAssertEqual(value.state,"rejected");XCTAssertEqual(f.repo.deletes,0);XCTAssertEqual(f.journal.records.values.first?.phase,.rejected)
  }
  func testFormal136xAbsenceIsNeverThisDeleteAcknowledgement() async throws {
    for code in [1362,1361] {
      let f=try await fixture();defer{f.owner.close()};f.repo.deleteHook={throw RowanFailure(code:code,message:"private")}
      let value=try await f.coordinator().begin(f.binding,intentID:"tap").value();XCTAssertEqual(value.state,"already_absent");XCTAssertEqual(value.errorCode,code==1362 ? "not_bound":"not_found")
      XCTAssertEqual(f.journal.records.values.first?.phase,.alreadyAbsent);XCTAssertEqual(f.invalidation.calls,1)
    }
  }
  func testFreshOwnershipRevocationClearsWithoutDelete() async throws {
    let f=try await fixture();defer{f.owner.close()};f.gateway.authorizeHook={throw RowanFailure(code:1342,message:"private")}
    let value=try await f.coordinator().begin(f.binding,intentID:"tap").value();XCTAssertEqual(value.errorCode,"forbidden");XCTAssertEqual(f.invalidation.lost,1);XCTAssertEqual(f.repo.deletes,0)
  }
  func testAckPersistenceFailureStillInvalidatesKnownUnboundCache() async throws {
    let f=try await fixture();defer{f.owner.close()};f.journal.failComplete=true
    let value=try await f.coordinator().begin(f.binding,intentID:"tap").value();XCTAssertEqual(value.state,"confirmed_cleanup_pending")
    XCTAssertEqual(value.errorCode,"storage_unavailable");XCTAssertEqual(f.invalidation.calls,1);XCTAssertEqual(f.journal.records.values.first?.phase,.unknown)
  }
  func testHomeTicketRequiresCurrentCompleteAbsenceAndPreservesNewerDirtyRequest() {
    var revision=7;let ledger=SelfUnbindHomeLedger(current:{r,_ in r==revision})
    func record(_ id:String)->SelfUnbindRecord {SelfUnbindRecord(key:selfUnbindKey(userID:"u",resourceID:"d"),operationID:id,userID:"u",resourceID:"d",productID:"p",originToken:"token",phase:.acknowledged,errorCode:"")}
    do {
      let old=try ledger.request(record("old"),revision:7);XCTAssertFalse(ledger.confirmed(old));XCTAssertFalse(ledger.acknowledge(old,actualOwnedIDs:["d"]))
      let new=try ledger.request(record("new"),revision:7);XCTAssertTrue(ledger.acknowledge(old,actualOwnedIDs:[]));XCTAssertEqual(ledger.pending(revision:7).count,1)
      revision=8;XCTAssertFalse(ledger.acknowledge(new,actualOwnedIDs:[]))
    }catch{XCTFail("Ledger fixture failed")}
  }
  func testRecoveredAckCannotRevokeNewNativeHandleAndNoConsumerAckMeansPending() async throws {
    let f=try await fixture();defer{f.owner.close()};let old=f.binding
    let record=SelfUnbindRecord(key:selfUnbindKey(userID:f.scope.userID,resourceID:f.scope.resourceID),operationID:"old",userID:f.scope.userID,resourceID:f.scope.resourceID,productID:f.scope.productID,originToken:old.originToken,phase:.acknowledged,errorCode:"",resourceToken:try XCTUnwrap(f.owner.captureOwnershipReceipt(f.handle)).encoded)
    f.handle.close();let handle=f.owner.observe(resourceID:f.scope.resourceID,nativeObserverID:"rebound")
    try await wait {if case let .current(value)=handle.state{return value.metadata != nil};return false}
    let new=SelfUnbindBinding(scope:f.scope,handle:handle,relationshipCurrent:{true},pageCurrent:{true})
    let ledger=SelfUnbindHomeLedger(current:{r,u in r==f.scope.accountRevision && selfUnbindEqual(u,f.scope.userID)})
    let adapter=NativeSelfUnbindInvalidation(owner:f.owner,ledger:ledger,current:{r,u in r==f.scope.accountRevision && selfUnbindEqual(u,f.scope.userID)})
    let done=try await adapter.apply(record,binding:new);XCTAssertFalse(done)
    if case let .current(value)=handle.state{XCTAssertNotEqual(value.phase,.forbidden)}else{XCTFail("New handle closed")}
    let ticket=try XCTUnwrap(ledger.pending(revision:f.scope.accountRevision).first)
    XCTAssertTrue(ledger.acknowledge(ticket,actualOwnedIDs:[]));let completed=try await adapter.apply(record,binding:new);XCTAssertTrue(completed)
  }
  func testActualNativeInvalidationRevokesAllOriginalObserversButNotOtherResource() async throws {
    let f=try await fixture();defer{f.owner.close()};let original=f.binding
    let otherProof=try await makeDeviceReadProof(resourceID:"other-resource")
    f.gateway.authorizeResult={id,_ in selfUnbindEqual(id,"other-resource") ? otherProof:nil}
    let second=f.owner.observe(resourceID:f.scope.resourceID,nativeObserverID:"second"),other=f.owner.observe(resourceID:"other-resource",nativeObserverID:"other")
    try await wait {if case let .current(value)=other.state{return value.metadata != nil};return false}
    let ledger=SelfUnbindHomeLedger(current:{r,u in r==f.scope.accountRevision && selfUnbindEqual(u,f.scope.userID)})
    let adapter=NativeSelfUnbindInvalidation(owner:f.owner,ledger:ledger,current:{r,u in r==f.scope.accountRevision && selfUnbindEqual(u,f.scope.userID)})
    let record=SelfUnbindRecord(key:selfUnbindKey(userID:f.scope.userID,resourceID:f.scope.resourceID),operationID:"confirmed",userID:f.scope.userID,resourceID:f.scope.resourceID,productID:f.scope.productID,originToken:original.originToken,phase:.acknowledged,errorCode:"",resourceToken:try XCTUnwrap(adapter.capture(original)))
    let done=try await adapter.apply(record,binding:original);XCTAssertFalse(done)
    if case let .current(value)=second.state{XCTAssertEqual(value.phase,.forbidden);XCTAssertNil(value.metadata)}else{XCTFail("Expected retained forbidden handle")}
    if case let .current(value)=other.state{XCTAssertNotEqual(value.phase,.forbidden)}else{XCTFail("Other resource closed")}
  }
  func testDifferentBindingCannotReceiveOldInFlightTask() async throws {
    let f=try await fixture();defer{f.owner.close()};var pending:CheckedContinuation<Void,Never>?
    f.repo.deleteHook={await withCheckedContinuation {pending=$0}}
    let owner=f.coordinator(),old=owner.begin(f.binding,intentID:"tap");try await wait {pending != nil}
    let other=SelfUnbindBinding(scope:f.scope,handle:f.handle,relationshipCurrent:{true},pageCurrent:{true})
    let busy=try await owner.begin(other,intentID:"other-page").value();XCTAssertEqual(busy.errorCode,"busy")
    f.identity=MQTTPoolIdentity(revision:f.scope.accountRevision+1,userID:f.scope.userID)
    pending?.resume();let result=try await old.value();XCTAssertEqual(result.state,"confirmed_cleanup_pending");XCTAssertEqual(f.invalidation.calls,0)
  }
  func testOldTerminalRecordIsHistoricalForNewIncarnation() async throws {
    let f=try await fixture();defer{f.owner.close()};let owner=f.coordinator()
    let original=try await owner.begin(f.binding,intentID:"tap").value();XCTAssertEqual(original.state,"confirmed")
    let new=SelfUnbindBinding(scope:f.scope,handle:f.handle,relationshipCurrent:{true},pageCurrent:{true})
    let historical=try await owner.reconcile(new).value();XCTAssertEqual(historical.state,"historical_confirmed")
    XCTAssertEqual(f.repo.deletes,1);XCTAssertEqual(f.invalidation.calls,1)
  }
  func testOriginalReceiptRetiresOtherObserverAfterInitiatorReleasedIncludingStorageFailure() async throws {
    for storageFailure in [false,true] {
      let f=try await fixture();defer{f.owner.close()};let binding=f.binding
      let b=f.owner.observe(resourceID:f.scope.resourceID,nativeObserverID:"remaining-b")
      let ledger=SelfUnbindHomeLedger(current:{r,u in r==f.scope.accountRevision&&selfUnbindEqual(u,f.scope.userID)})
      let native=NativeSelfUnbindInvalidation(owner:f.owner,ledger:ledger,current:{r,u in r==f.scope.accountRevision&&selfUnbindEqual(u,f.scope.userID)})
      let coordinator=DeviceSelfUnbindCoordinator(currentAccount:{f.identity},access:f.gateway,journal:f.journal,repositories:{_ in f.repo},invalidation:native)
      var pending:CheckedContinuation<Void,Never>?
      f.repo.deleteHook={await withCheckedContinuation {pending=$0}}
      let task=coordinator.begin(binding,intentID:"tap");try await wait {pending != nil}
      f.handle.close();f.journal.failComplete=storageFailure;pending?.resume()
      let value=try await task.value();XCTAssertEqual(value.state,"confirmed_cleanup_pending")
      if case let .current(snapshot)=b.state{XCTAssertEqual(snapshot.phase,.forbidden);XCTAssertNil(snapshot.metadata);XCTAssertNil(snapshot.online)}else{XCTFail("Expected revoked remaining observer")}
      let ticket=try XCTUnwrap(ledger.pending(revision:f.scope.accountRevision).first);XCTAssertTrue(ledger.acknowledge(ticket,actualOwnedIDs:[]))
      f.journal.failComplete=false;f.repo.owned=false
      let new=SelfUnbindBinding(scope:f.scope,handle:b,relationshipCurrent:{true},pageCurrent:{true})
      let completed=try await coordinator.reconcile(new).value()
      XCTAssertEqual(completed.state,storageFailure ? "historical_already_absent":"historical_confirmed");XCTAssertEqual(f.repo.deletes,1)
    }
  }
  func testReceiptRejectsSameProcessForeignOwnerAndCannotRetireNewSerial() async throws {
    let f=try await fixture();defer{f.owner.close()}
    let foreign=DeviceReadOwner(currentAccount:{f.identity},gateway:f.gateway,open:{_,_ in throw DeviceReadFailure.connection},invalidateAccount:{_ in})
    defer{foreign.close()}
    let token=try XCTUnwrap(f.owner.captureOwnershipReceipt(f.handle)).encoded
    let foreignHandle=foreign.observe(resourceID:f.scope.resourceID,nativeObserverID:"foreign")
    try await wait {if case let .current(value)=foreignHandle.state{return value.metadata != nil};return false}
    XCTAssertFalse(foreign.retireOwnershipReceipt(token))
    let ledger=SelfUnbindHomeLedger(current:{r,_ in r==f.scope.accountRevision})
    let wrong=NativeSelfUnbindInvalidation(owner:foreign,ledger:ledger,current:{r,_ in r==f.scope.accountRevision})
    let acknowledged=SelfUnbindRecord(key:selfUnbindKey(userID:f.scope.userID,resourceID:f.scope.resourceID),operationID:"foreign-owner",userID:f.scope.userID,resourceID:f.scope.resourceID,productID:f.scope.productID,originToken:f.binding.originToken,phase:.acknowledged,errorCode:"",resourceToken:token)
    let before=try await wrong.apply(acknowledged,binding:f.binding);XCTAssertFalse(before)
    let ticket=try XCTUnwrap(ledger.pending(revision:f.scope.accountRevision).first);XCTAssertTrue(ledger.acknowledge(ticket,actualOwnedIDs:[]))
    let after=try await wrong.apply(acknowledged,binding:f.binding);XCTAssertFalse(after)
    if case let .current(value)=foreignHandle.state{XCTAssertNotEqual(value.phase,.forbidden)}else{XCTFail("Foreign resource closed")}
    f.handle.close()
    let new=f.owner.observe(resourceID:f.scope.resourceID,nativeObserverID:"new-incarnation")
    try await wait {if case let .current(value)=new.state{return value.metadata != nil};return false}
    XCTAssertTrue(f.owner.retireOwnershipReceipt(token))
    if case let .current(value)=new.state{XCTAssertNotEqual(value.phase,.forbidden)}else{XCTFail("New incarnation closed")}
    XCTAssertTrue(f.owner.retireOwnershipReceipt("00000000-0000-0000-0000-000000000000:00000000-0000-0000-0000-000000000000:1"))
    XCTAssertFalse(f.owner.retireOwnershipReceipt("not-a-receipt"))
  }
  func testFirstCompletionOfOldPendingAckOrAbsenceIsHistoricalImmediately() async throws {
    for absent in [false,true] {
      let f=try await fixture();defer{f.owner.close()};f.invalidation.cleaned=false
      if absent{f.repo.deleteHook={throw RowanFailure(code:1362,message:"private")}}
      let owner=f.coordinator();_=try await owner.begin(f.binding,intentID:"tap").value()
      let new=SelfUnbindBinding(scope:f.scope,handle:f.handle,relationshipCurrent:{true},pageCurrent:{true});f.invalidation.cleaned=true
      let result=try await owner.reconcile(new).value()
      XCTAssertEqual(result.state,absent ? "historical_already_absent":"historical_confirmed")
      let again=try await owner.reconcile(new).value();XCTAssertEqual(again.state,result.state);XCTAssertEqual(f.repo.deletes,1)
    }
  }
  func testOldUnknownFirstAbsenceCompletionUsesRelationshipHistoricalFence() async throws {
    let f=try await fixture();defer{f.owner.close()};f.repo.deleteHook={throw RowanFailure(code:408,message:"private")}
    let owner=f.coordinator();_=try await owner.begin(f.binding,intentID:"tap").value();f.repo.owned=false;f.relationship=false
    let result=try await owner.reconcile(f.binding).value()
    XCTAssertEqual(result.state,"historical_already_absent");XCTAssertEqual(result.errorCode,"absence_observed");XCTAssertEqual(f.repo.deletes,1)
  }
}

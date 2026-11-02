import XCTest
@testable import Rowan

@MainActor final class NativeSelfUnbindAuthorityTests:XCTestCase {
  @MainActor private final class Journal:SelfUnbindRecoveryJournal {
    var saved:SelfUnbindRecord?,loads=0
    var read:() async -> Void = {}
    func unresolved(userID:String) async throws -> [SelfUnbindRecord]{[]}
    func load(key:String) async throws -> SelfUnbindRecord?{loads+=1;let old=saved;await read();return old}
    func reserve(_ record:SelfUnbindRecord) async throws -> SelfUnbindRecord{if let saved{return saved};saved=record;return record}
    func complete(_ record:SelfUnbindRecord) async throws -> Bool{guard saved?.operationID==record.operationID else{return false};saved=record;return true}
  }
  @MainActor private final class Repository:SelfUnbindRepository {
    let scope:DeviceMoreScope;var deletes=0
    var work:() async throws -> Void = {throw RowanFailure(code:503,message:"Public fixture error")}
    init(_ proof:AuthorizedDevice){scope=DeviceMoreScope(accountRevision:proof.accountRevision,resourceID:proof.resourceID,userID:proof.userID,productID:proof.productID)}
    func deleteSelf() async throws{deletes+=1;try await work()}
    func isOwned() async throws -> Bool{XCTFail("State query must not call HTTP");return true}
  }
  @MainActor private final class Fixture {
    let proof:AuthorizedDevice,journal=Journal(),access:DeviceReadFakeGateway,repo:Repository
    lazy var owner=DeviceReadOwner(currentAccount:{[unowned self] in MQTTPoolIdentity(revision:proof.accountRevision,userID:proof.userID)},gateway:access,open:{_,_ in throw DeviceReadFailure.connection},invalidateAccount:{_ in})
    lazy var app=SelfUnbindApplication(currentAccount:{[unowned self] in MQTTPoolIdentity(revision:proof.accountRevision,userID:proof.userID)},journal:journal,access:access,repositories:{[unowned self] _ in repo},ownerIfCreated:{[unowned self] in owner})
    init(_ proof:AuthorizedDevice){self.proof=proof;access=DeviceReadFakeGateway(proof);repo=Repository(proof)}
    func registration() async throws -> NativeSelfUnbindRegistration {
      let handle=owner.observe(resourceID:proof.resourceID,nativeObserverID:"page")
      for _ in 0..<5000{if case let .current(snapshot)=handle.state,snapshot.metadata != nil{return try XCTUnwrap(app.register(handle:handle,expectedRevision:proof.accountRevision,pageCurrent:{true}))};await Task.yield()}
      throw RowanFailure(code:0,message:"Fixture owner did not initialize")
    }
    func close(){app.close();owner.close()}
  }
  func testIdleAuthorityDoesNotAuthorizeOrDispatch() async throws {let f=Fixture(try await makeDeviceReadProof());defer{f.close()};let page=try await f.registration(),before=f.access.authorizations;let value=try await f.app.inspect(page);XCTAssertEqual(value.view.state,"idle");XCTAssertTrue(value.canRequest);XCTAssertEqual(f.access.authorizations,before);XCTAssertEqual(f.repo.deletes,0)}
  func testUnknownCannotBecomeNewWritePermit() async throws {let f=Fixture(try await makeDeviceReadProof());defer{f.close()};let page=try await f.registration();_=try await f.app.begin(page,intentID:"tap").value();let before=f.access.authorizations,value=try await f.app.inspect(page);XCTAssertEqual(value.view.state,"unknown");XCTAssertFalse(value.canRequest);XCTAssertEqual(f.access.authorizations,before);XCTAssertEqual(f.repo.deletes,1)}
  func testLateDiskInspectionCannotReplaceNewTaskWithIdle() async throws {
    let f=Fixture(try await makeDeviceReadProof());defer{f.close()};let page=try await f.registration();var pending:CheckedContinuation<Void,Never>?;defer{pending?.resume()};var first=true
    f.journal.read={if first{first=false;await withCheckedContinuation {pending=$0}}}
    let inspection=Task { @MainActor in try await f.app.inspect(page) }
    for _ in 0..<5000{if pending != nil{break};await Task.yield()};XCTAssertNotNil(pending)
    _=try await f.app.begin(page,intentID:"tap").value();pending?.resume();pending=nil
    let result=try await inspection.value;XCTAssertEqual(result.view.state,"unknown");XCTAssertFalse(result.canRequest);XCTAssertEqual(f.repo.deletes,1)
  }
  func testAcceptedTaskReadableAfterOwnRevocation() async throws {let f=Fixture(try await makeDeviceReadProof());defer{f.close()};f.repo.work={};let page=try await f.registration();_=try await f.app.begin(page,intentID:"tap").value();if case let .current(snapshot)=page.binding.handle.state{XCTAssertEqual(snapshot.phase,.forbidden)}else{XCTFail("Original resource lost")};let before=f.access.authorizations,value=try await f.app.inspect(page);XCTAssertEqual(value.view.state,"confirmed_cleanup_pending");XCTAssertFalse(value.canRequest);XCTAssertEqual(f.access.authorizations,before);XCTAssertEqual(f.repo.deletes,1)}
}

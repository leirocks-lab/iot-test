import XCTest
@testable import Rowan

/// Locked synchronous fake medium exercises the real queue/CAS adapter, not actual Security/Keychain acceptance.
private final class SelfUnbindTestMedium:SelfUnbindJournalBackend,@unchecked Sendable {
  private let lock=NSLock()
  private var data:Data?
  private var pause=false
  let release=DispatchSemaphore(value:0)
  var onWrite:(()->Void)? // Installed before enqueue; never mutated while an I/O is active.
  init(_ data:Data?=nil){self.data=data}
  func pauseNext(){lock.lock();pause=true;lock.unlock()}
  func read() throws -> Data? {lock.lock();defer{lock.unlock()};return data}
  func write(_ value:Data) throws {
    lock.lock();let hold=pause;pause=false;lock.unlock()
    if hold{onWrite?();guard release.wait(timeout: .now()+5) == .success else{throw SelfUnbindJournalFailure.storageUnavailable}}
    lock.lock();data=value;lock.unlock()
  }
}
@MainActor final class SelfUnbindJournalTests:XCTestCase {
  private func record(_ operation:String="op")->SelfUnbindRecord {
    SelfUnbindRecord(key:selfUnbindKey(userID:"u",resourceID:"d"),operationID:operation,userID:"u",resourceID:"d",productID:"p",originToken:"native-origin",phase:.unknown,errorCode:"",resourceToken:"00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002:1")
  }
  func testReservedUnknownSurvivesAdapterReconstructionAndAckCannotBeOverwritten() async throws {
    let medium=SelfUnbindTestMedium(),first=KeychainSelfUnbindJournal(backend:medium),r=record()
    _=try await first.reserve(r);let second=KeychainSelfUnbindJournal(backend:medium)
    let reused=try await second.reserve(record("other"));XCTAssertEqual(reused.operationID,r.operationID)
    let acknowledged=try await first.complete(r.terminal(.acknowledged));XCTAssertTrue(acknowledged)
    let still=try await second.reserve(record("new"));XCTAssertEqual(still.phase,.acknowledged)
  }
  func testCasAllowsOnlyUnknownToAckToConfirmedAndRejectsWrongOperation() async throws {
    let store=KeychainSelfUnbindJournal(backend:SelfUnbindTestMedium()),r=record();_=try await store.reserve(r)
    let skipped=try await store.complete(r.terminal(.confirmed));XCTAssertFalse(skipped)
    let wrong=try await store.complete(record("other").terminal(.acknowledged));XCTAssertFalse(wrong)
    let ack=try await store.complete(r.terminal(.acknowledged));XCTAssertTrue(ack)
    let done=try await store.complete(r.terminal(.confirmed));XCTAssertTrue(done)
    let regressed=try await store.complete(r.terminal(.acknowledged));XCTAssertFalse(regressed)
  }
  func testCancelledWaiterDoesNotReleaseActualGlobalIoSlot() async throws {
    let medium=SelfUnbindTestMedium(),store=KeychainSelfUnbindJournal(backend:medium),r=record()
    let entered=expectation(description:"Physical write entered");medium.onWrite={entered.fulfill()};medium.pauseNext()
    let first=Task{try await store.reserve(r)};await fulfillment(of:[entered],timeout:3);first.cancel()
    var secondDone=false
    let second=Task {let value=try await store.load(key:r.key);secondDone=true;return value}
    for _ in 0..<20 {await Task.yield()};XCTAssertFalse(secondDone)
    medium.release.signal();_=try await first.value;let loaded=try await second.value;XCTAssertEqual(loaded?.operationID,r.operationID)
  }
  func testCorruptJournalIsNotResetToAllowDelete() async throws {
    let store=KeychainSelfUnbindJournal(backend:SelfUnbindTestMedium(Data("corrupt".utf8)))
    do{_=try await store.reserve(record());XCTFail("Corrupt journal replaced")}catch{XCTAssertTrue(error is SelfUnbindJournalFailure)}
  }
  func testAbsenceEvidenceCannotBecomeThisDeleteSuccess() async throws {
    let store=KeychainSelfUnbindJournal(backend:SelfUnbindTestMedium()),r=record();_=try await store.reserve(r)
    let observed=try await store.complete(r.terminal(.absenceObserved,error:"not_bound"));XCTAssertTrue(observed)
    let forgedAck=try await store.complete(r.terminal(.confirmed));XCTAssertFalse(forgedAck)
    let absent=try await store.complete(r.terminal(.alreadyAbsent,error:"not_bound"));XCTAssertTrue(absent)
    let loaded=try await store.load(key:r.key);XCTAssertEqual(loaded?.phase,.alreadyAbsent);XCTAssertEqual(loaded?.errorCode,"not_bound")
  }
}

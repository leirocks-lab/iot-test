import XCTest
@testable import Rowan

final class NicknameJournalTests: XCTestCase {
  /// Every mutable field is guarded by lock; callbacks run only on the adapter transaction queue.
  /// unchecked conformance is confined to this synchronous test backend, never production journal state.
  private final class Backend: NicknameJournalBackend, @unchecked Sendable {
    private let lock = NSLock()
    private var stored: Data?, count = 0, started = false, blockFirst = false
    let release = DispatchSemaphore(value: 0)
    func configureBlockingFirstWrite() { lock.lock(); blockFirst = true; lock.unlock() }
    func snapshot() -> (Int, Bool, Data?) { lock.lock(); defer { lock.unlock() }; return (count, started, stored) }
    func read() throws -> Data? { lock.lock(); defer { lock.unlock() }; return stored }
    func write(_ data: Data) throws {
      lock.lock(); count += 1; let wait = blockFirst && count == 1; if wait { started = true }; lock.unlock()
      if wait { _ = release.wait(timeout: .now() + 5) }
      lock.lock(); stored = data; lock.unlock()
    }
  }
  private func record(user: String = "public-user", resource: String = "public-device", operation: String = "public-operation", target: String = " next ") -> NicknameRecord {
    NicknameRecord(key: nicknameKey(userID: user, resourceID: resource), operationID: operation, userID: user,
      resourceID: resource, productID: "public-product", target: target, phase: .unknown, errorCode: "")
  }
  private func wait(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 { if condition() { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("Public journal fixture stalled"); throw NicknameJournalFailure.storageUnavailable
  }
  func testDocumentRoundTripKeepsExactTargetAndStableIdentity() throws {
    let value = record(), decoded = try NicknameJournalDocument.decode(NicknameJournalDocument.encode([value.key: value]))
    let restored = try XCTUnwrap(decoded[value.key])
    XCTAssertEqual(Array(restored.target.utf8), Array(value.target.utf8)); XCTAssertEqual(restored.userID, value.userID); XCTAssertEqual(restored.phase, .unknown)
  }
  func testTerminalDocumentRemainsTerminal() throws {
    let value = record().terminal(.rejected, error: "forbidden")
    let restored = try XCTUnwrap(NicknameJournalDocument.decode(NicknameJournalDocument.encode([value.key: value]))[value.key])
    XCTAssertEqual(restored.phase, .rejected); XCTAssertEqual(restored.errorCode, "forbidden")
  }
  func testWrongIdentityKeyAndTypedTargetFailClosed() throws {
    let value = record()
    var root = try XCTUnwrap(JSONSerialization.jsonObject(with: NicknameJournalDocument.encode([value.key: value])) as? [String: Any])
    var rows = try XCTUnwrap(root["records"] as? [[String: Any]])
    rows[0]["target"] = 42; root["records"] = rows
    XCTAssertThrowsError(try NicknameJournalDocument.decode(JSONSerialization.data(withJSONObject: root)))
    let wrong = NicknameRecord(key: String(repeating: "0", count: 64), operationID: value.operationID, userID: value.userID,
      resourceID: value.resourceID, productID: value.productID, target: value.target, phase: .unknown, errorCode: "")
    XCTAssertThrowsError(try NicknameJournalDocument.encode([wrong.key: wrong]))
  }
  func testUnknownSchemaAndCorruptDocumentCannotResetJournal() {
    XCTAssertThrowsError(try NicknameJournalDocument.decode(Data(#"{"version":2,"records":[]}"#.utf8)))
    XCTAssertThrowsError(try NicknameJournalDocument.decode(Data("{".utf8)))
  }
  func testDuplicateRecordsAreNotLastWins() throws {
    let value = record()
    var root = try XCTUnwrap(JSONSerialization.jsonObject(with: NicknameJournalDocument.encode([value.key: value])) as? [String: Any])
    let rows = try XCTUnwrap(root["records"] as? [[String: Any]]); root["records"] = rows + rows
    XCTAssertThrowsError(try NicknameJournalDocument.decode(JSONSerialization.data(withJSONObject: root)))
  }
  func testBudgetRejectsWithoutEvictingUnknownRecords() {
    let large = record(target: String(repeating: "Q", count: NicknameJournalDocument.maxBytes))
    XCTAssertThrowsError(try NicknameJournalDocument.encode([large.key: large]))
    let values = (1...65).map { record(resource: "device-\($0)") }
    XCTAssertThrowsError(try NicknameJournalDocument.encode(Dictionary(uniqueKeysWithValues: values.map { ($0.key, $0) })))
    XCTAssertEqual(values.count, 65)
  }
  func testAtomicReserveAcrossTwoAdaptersRetainsOnlyFirstUnresolvedOperation() async throws {
    let medium = Backend(), a = KeychainNicknameJournal(backend: medium), b = KeychainNicknameJournal(backend: medium)
    let first = record(operation: "a"), second = record(operation: "b")
    async let x = a.reserve(first)
    async let y = b.reserve(second)
    let results = try await (x, y)
    XCTAssertEqual(results.0.operationID, results.1.operationID)
    XCTAssertEqual(medium.snapshot().0, 1)
  }
  func testCompleteCASRejectsOldOperationAndCannotChangeTarget() async throws {
    let medium = Backend(), journal = KeychainNicknameJournal(backend: medium), first = record()
    _ = try await journal.reserve(first)
    let stale = record(operation: "other").terminal(.confirmed)
    let changed = record(target: "other").terminal(.confirmed)
    let a = try await journal.complete(stale), b = try await journal.complete(changed)
    XCTAssertFalse(a); XCTAssertFalse(b); XCTAssertEqual(medium.snapshot().0, 1)
  }
  func testCancelledQueuedPhysicalWriteKeepsTransactionSlotUntilActualCompletion() async throws {
    let medium = Backend(); medium.configureBlockingFirstWrite()
    let journal = KeychainNicknameJournal(backend: medium), first = record(), second = record(resource: "second")
    let a = Task { try await journal.reserve(first) }
    try await wait { medium.snapshot().1 }; a.cancel()
    let b = Task { try await journal.reserve(second) }
    try await Task.sleep(nanoseconds: 5_000_000); XCTAssertEqual(medium.snapshot().0, 1)
    medium.release.signal()
    _ = try await a.value; _ = try await b.value
    XCTAssertEqual(medium.snapshot().0, 2)
    let stored = try XCTUnwrap(medium.snapshot().2)
    XCTAssertEqual(try NicknameJournalDocument.decode(stored).count, 2)
  }
  func testRecreatedJournalReadsActualPreviouslyWrittenMedium() async throws {
    let medium = Backend(), value = record()
    _ = try await KeychainNicknameJournal(backend: medium).reserve(value)
    let restored = try await KeychainNicknameJournal(backend: medium).load(key: value.key)
    XCTAssertEqual(restored?.operationID, value.operationID); XCTAssertEqual(restored?.phase, .unknown)
  }
}


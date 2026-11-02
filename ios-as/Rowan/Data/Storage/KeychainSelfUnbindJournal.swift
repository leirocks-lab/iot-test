import Foundation
import Security

enum SelfUnbindJournalFailure: Error, LocalizedError, Sendable {
  case storageUnavailable
  var errorDescription: String? { "SelfUnbind journal unavailable" }
}
/// Synchronous backend is confined to the adapter's global transaction queue.
protocol SelfUnbindJournalBackend: Sendable {
  func read() throws -> Data?
  func write(_ data: Data) throws
}
private struct SelfUnbindDocument: Codable {
  let version: Int
  let records: [SelfUnbindRecord]
}
enum SelfUnbindJournalDocument {
  static let maxBytes = 256 * 1024, maxRecords = 64 // engineering budget, not self-unbind length
  static func validate(_ value: SelfUnbindRecord) throws {
    if [SelfUnbindPhase.absenceObserved,.alreadyAbsent].contains(value.phase),!["not_found","not_bound","absence_observed"].contains(value.errorCode) {throw SelfUnbindJournalFailure.storageUnavailable}
    guard (75...128).contains(value.resourceToken.utf8.count),value.resourceToken.range(of:"^[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:[1-9][0-9]{0,18}$",options:.regularExpression) != nil else{throw SelfUnbindJournalFailure.storageUnavailable}
    guard value.key == selfUnbindKey(userID: value.userID, resourceID: value.resourceID), value.key.utf8.count == 64,
          !value.operationID.isEmpty, value.operationID.utf8.count <= 128, value.operationID.rangeOfCharacter(from: .controlCharacters) == nil,
          [value.userID, value.resourceID, value.productID].allSatisfy({ !$0.isEmpty && $0.rangeOfCharacter(from: .controlCharacters) == nil }),
          ["", "not_authenticated", "forbidden", "not_found", "invalid_input", "not_bound", "absence_observed", "session_changed", "cancelled"].contains(value.errorCode),
          !value.originToken.isEmpty, value.originToken.utf8.count <= 128, value.originToken.rangeOfCharacter(from: .controlCharacters) == nil,
          [SelfUnbindPhase.rejected,.absenceObserved,.alreadyAbsent].contains(value.phase) || value.errorCode.isEmpty else { throw SelfUnbindJournalFailure.storageUnavailable }
  }
  static func encode(_ records: [String: SelfUnbindRecord]) throws -> Data {
    do {
      guard records.count <= maxRecords else { throw SelfUnbindJournalFailure.storageUnavailable }
      for (key, value) in records { try validate(value); guard key == value.key else { throw SelfUnbindJournalFailure.storageUnavailable } }
      let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
      let data = try encoder.encode(SelfUnbindDocument(version: 1, records: records.sorted { $0.key < $1.key }.map(\.value)))
      guard data.count <= maxBytes else { throw SelfUnbindJournalFailure.storageUnavailable }; return data
    } catch { throw SelfUnbindJournalFailure.storageUnavailable }
  }
  static func decode(_ data: Data) throws -> [String: SelfUnbindRecord] {
    do {
      guard data.count <= maxBytes else { throw SelfUnbindJournalFailure.storageUnavailable }
      let document = try JSONDecoder().decode(SelfUnbindDocument.self, from: data)
      guard document.version == 1, document.records.count <= maxRecords else { throw SelfUnbindJournalFailure.storageUnavailable }
      var result: [String: SelfUnbindRecord] = [:]
      for value in document.records {
        try validate(value); guard result[value.key] == nil else { throw SelfUnbindJournalFailure.storageUnavailable }
        result[value.key] = value
      }
      return result
    } catch { throw SelfUnbindJournalFailure.storageUnavailable }
  }
}

/// Immutable Sendable fields only. All read/modify/write transactions use ONE process-global
/// queue, even across duplicated adapters. Continuations resume only after actual SecItem IO.
/// Cancellation/timeout cannot return a permit or start another transaction early.
/// No SessionStorage item, plaintext file, delete-before-add, fake persistence or reset-on-error.
final class KeychainSelfUnbindJournal: SelfUnbindRecoveryJournal {
  private static let transactions = DispatchQueue(label: "com.rowan.iot.self-unbind-journal", qos: .userInitiated)
  private let backend: any SelfUnbindJournalBackend
  init() { backend = SecuritySelfUnbindJournalBackend() }
  init(backend: any SelfUnbindJournalBackend) { self.backend = backend }
  private func transaction<T: Sendable>(_ body: @escaping @Sendable (any SelfUnbindJournalBackend) throws -> T) async throws -> T {
    try Task.checkCancellation() // only before enqueue; actual queued IO owns its slot through completion
    return try await withCheckedThrowingContinuation { continuation in
      let backend = self.backend
      Self.transactions.async {
        do { continuation.resume(returning: try body(backend)) }
        catch { continuation.resume(throwing: SelfUnbindJournalFailure.storageUnavailable) }
      }
    }
  }
  private static func read(_ backend: any SelfUnbindJournalBackend) throws -> [String: SelfUnbindRecord] {
    guard let data = try backend.read() else { return [:] }
    return try SelfUnbindJournalDocument.decode(data)
  }
  func unresolved(userID:String) async throws -> [SelfUnbindRecord] {
    try await transaction {backend in try Self.read(backend).values.filter {selfUnbindEqual($0.userID,userID)&&[SelfUnbindPhase.unknown,.acknowledged,.absenceObserved].contains($0.phase)}.sorted {$0.key<$1.key}}
  }
  func load(key: String) async throws -> SelfUnbindRecord? { try await transaction { try Self.read($0)[key] } }
  func reserve(_ candidate: SelfUnbindRecord) async throws -> SelfUnbindRecord {
    try await transaction { backend in
      try SelfUnbindJournalDocument.validate(candidate)
      guard candidate.phase == .unknown else { throw SelfUnbindJournalFailure.storageUnavailable }
      var records = try Self.read(backend)
      if let existing = records[candidate.key], [SelfUnbindPhase.unknown, .acknowledged, .absenceObserved].contains(existing.phase) { return existing }
      if records[candidate.key] == nil, records.count >= SelfUnbindJournalDocument.maxRecords,
        let terminal = records.first(where: { [.confirmed, .alreadyAbsent, .rejected].contains($0.value.phase) }) { records.removeValue(forKey: terminal.key) }
      records[candidate.key] = candidate; try backend.write(SelfUnbindJournalDocument.encode(records)); return candidate
    }
  }
  func complete(_ record: SelfUnbindRecord) async throws -> Bool {
    try await transaction { backend in
      try SelfUnbindJournalDocument.validate(record)
      guard record.phase != .unknown else { throw SelfUnbindJournalFailure.storageUnavailable }
      var records = try Self.read(backend)
      guard let existing = records[record.key], selfUnbindEqual(existing.operationID, record.operationID),
            selfUnbindEqual(existing.userID, record.userID), selfUnbindEqual(existing.resourceID, record.resourceID),
            selfUnbindEqual(existing.productID, record.productID), selfUnbindEqual(existing.originToken, record.originToken), selfUnbindEqual(existing.resourceToken, record.resourceToken) else { return false }
      if existing.phase == record.phase { return existing.errorCode == record.errorCode }
      guard (existing.phase == .unknown && [.acknowledged, .absenceObserved, .rejected].contains(record.phase)) ||
        (existing.phase == .acknowledged && record.phase == .confirmed) ||
        (existing.phase == .absenceObserved && record.phase == .alreadyAbsent) else { return false }
      records[record.key] = record; try backend.write(SelfUnbindJournalDocument.encode(records)); return true
    }
  }
}
private struct SecuritySelfUnbindJournalBackend: SelfUnbindJournalBackend {
  private var query: [String: Any] {
    [kSecClass as String: kSecClassGenericPassword,
     kSecAttrService as String: "com.rowan.iot.device-self-unbind-journal.v1",
     kSecAttrAccount as String: "records", kSecAttrSynchronizable as String: false]
  }
  func read() throws -> Data? {
    var request = query
    request[kSecReturnData as String] = true; request[kSecMatchLimit as String] = kSecMatchLimitOne
    var value: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &value)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = value as? Data else { throw SelfUnbindJournalFailure.storageUnavailable }; return data
  }
  func write(_ data: Data) throws {
    let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if status == errSecItemNotFound {
      var attributes = query
      attributes[kSecValueData as String] = data
      attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      guard SecItemAdd(attributes as CFDictionary, nil) == errSecSuccess else { throw SelfUnbindJournalFailure.storageUnavailable }
    } else if status != errSecSuccess { throw SelfUnbindJournalFailure.storageUnavailable }
  }
}


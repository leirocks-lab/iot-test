import Foundation
import Security

enum NicknameJournalFailure: Error, LocalizedError, Sendable {
  case storageUnavailable
  var errorDescription: String? { "Nickname journal unavailable" }
}
/// Synchronous backend is confined to the adapter's global transaction queue.
protocol NicknameJournalBackend: Sendable {
  func read() throws -> Data?
  func write(_ data: Data) throws
}
private struct NicknameDocument: Codable {
  let version: Int
  let records: [NicknameRecord]
}
enum NicknameJournalDocument {
  static let maxBytes = 256 * 1024, maxRecords = 64 // engineering budget, not nickname length
  static func validate(_ value: NicknameRecord) throws {
    guard value.key == nicknameKey(userID: value.userID, resourceID: value.resourceID), value.key.utf8.count == 64,
          !value.operationID.isEmpty, value.operationID.utf8.count <= 128, value.operationID.rangeOfCharacter(from: .controlCharacters) == nil,
          [value.userID, value.resourceID, value.productID].allSatisfy({ !$0.isEmpty && $0.rangeOfCharacter(from: .controlCharacters) == nil }),
          ["", "not_authenticated", "forbidden", "not_found"].contains(value.errorCode),
          value.phase == .rejected || value.errorCode.isEmpty else { throw NicknameJournalFailure.storageUnavailable }
  }
  static func encode(_ records: [String: NicknameRecord]) throws -> Data {
    do {
      guard records.count <= maxRecords else { throw NicknameJournalFailure.storageUnavailable }
      for (key, value) in records { try validate(value); guard key == value.key else { throw NicknameJournalFailure.storageUnavailable } }
      let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
      let data = try encoder.encode(NicknameDocument(version: 1, records: records.sorted { $0.key < $1.key }.map(\.value)))
      guard data.count <= maxBytes else { throw NicknameJournalFailure.storageUnavailable }; return data
    } catch { throw NicknameJournalFailure.storageUnavailable }
  }
  static func decode(_ data: Data) throws -> [String: NicknameRecord] {
    do {
      guard data.count <= maxBytes else { throw NicknameJournalFailure.storageUnavailable }
      let document = try JSONDecoder().decode(NicknameDocument.self, from: data)
      guard document.version == 1, document.records.count <= maxRecords else { throw NicknameJournalFailure.storageUnavailable }
      var result: [String: NicknameRecord] = [:]
      for value in document.records {
        try validate(value); guard result[value.key] == nil else { throw NicknameJournalFailure.storageUnavailable }
        result[value.key] = value
      }
      return result
    } catch { throw NicknameJournalFailure.storageUnavailable }
  }
}

/// Immutable Sendable fields only. All read/modify/write transactions use ONE process-global
/// queue, even across duplicated adapters. Continuations resume only after actual SecItem IO.
/// Cancellation/timeout cannot return a permit or start another transaction early.
/// No SessionStorage item, plaintext file, delete-before-add, fake persistence or reset-on-error.
final class KeychainNicknameJournal: NicknameJournal {
  private static let transactions = DispatchQueue(label: "com.rowan.iot.nickname-journal", qos: .userInitiated)
  private let backend: any NicknameJournalBackend
  init() { backend = SecurityNicknameJournalBackend() }
  init(backend: any NicknameJournalBackend) { self.backend = backend }
  private func transaction<T: Sendable>(_ body: @escaping @Sendable (any NicknameJournalBackend) throws -> T) async throws -> T {
    try Task.checkCancellation() // only before enqueue; actual queued IO owns its slot through completion
    return try await withCheckedThrowingContinuation { continuation in
      let backend = self.backend
      Self.transactions.async {
        do { continuation.resume(returning: try body(backend)) }
        catch { continuation.resume(throwing: NicknameJournalFailure.storageUnavailable) }
      }
    }
  }
  private static func read(_ backend: any NicknameJournalBackend) throws -> [String: NicknameRecord] {
    guard let data = try backend.read() else { return [:] }
    return try NicknameJournalDocument.decode(data)
  }
  func load(key: String) async throws -> NicknameRecord? { try await transaction { try Self.read($0)[key] } }
  func reserve(_ candidate: NicknameRecord) async throws -> NicknameRecord {
    try await transaction { backend in
      try NicknameJournalDocument.validate(candidate)
      guard candidate.phase == .unknown else { throw NicknameJournalFailure.storageUnavailable }
      var records = try Self.read(backend)
      if let existing = records[candidate.key], existing.phase == .unknown { return existing }
      records[candidate.key] = candidate; try backend.write(NicknameJournalDocument.encode(records)); return candidate
    }
  }
  func complete(_ record: NicknameRecord) async throws -> Bool {
    try await transaction { backend in
      try NicknameJournalDocument.validate(record)
      guard record.phase != .unknown else { throw NicknameJournalFailure.storageUnavailable }
      var records = try Self.read(backend)
      guard let existing = records[record.key], nicknameEqual(existing.operationID, record.operationID),
            nicknameEqual(existing.userID, record.userID), nicknameEqual(existing.resourceID, record.resourceID),
            nicknameEqual(existing.productID, record.productID), nicknameEqual(existing.target, record.target) else { return false }
      if existing.phase != .unknown { return existing.phase == record.phase && existing.errorCode == record.errorCode }
      records[record.key] = record; try backend.write(NicknameJournalDocument.encode(records)); return true
    }
  }
}
private struct SecurityNicknameJournalBackend: NicknameJournalBackend {
  private var query: [String: Any] {
    [kSecClass as String: kSecClassGenericPassword,
     kSecAttrService as String: "com.rowan.iot.device-nickname-journal.v1",
     kSecAttrAccount as String: "records", kSecAttrSynchronizable as String: false]
  }
  func read() throws -> Data? {
    var request = query
    request[kSecReturnData as String] = true; request[kSecMatchLimit as String] = kSecMatchLimitOne
    var value: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &value)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = value as? Data else { throw NicknameJournalFailure.storageUnavailable }; return data
  }
  func write(_ data: Data) throws {
    let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if status == errSecItemNotFound {
      var attributes = query
      attributes[kSecValueData as String] = data
      attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      guard SecItemAdd(attributes as CFDictionary, nil) == errSecSuccess else { throw NicknameJournalFailure.storageUnavailable }
    } else if status != errSecSuccess { throw NicknameJournalFailure.storageUnavailable }
  }
}


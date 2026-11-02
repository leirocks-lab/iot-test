import Foundation
import Security

/// Injectable synchronous backend is confined to the adapter's private serial queue.
protocol SessionStorageBackend: Sendable {
  func read() throws -> Data?
  func write(_ data: Data?) throws
}

/// Safety invariant: backend access occurs only on queue; callers transfer immutable Data.
/// A queued SecItem operation cannot be revoked; AccountService compensates late writes.
final class KeychainSessionStorage: SessionStorage {
  private let queue = DispatchQueue(label: "com.rowan.iot.account-keychain", qos: .userInitiated)
  private let backend: any SessionStorageBackend
  init() { backend = SecuritySessionStorageBackend() }
  init(backend: any SessionStorageBackend) { self.backend = backend }
  func read() async throws -> Data? {
    try await withCheckedThrowingContinuation { continuation in
      queue.async { continuation.resume(with: Result { try self.backend.read() }) }
    }
  }
  func write(_ data: Data?) async throws {
    try await withCheckedThrowingContinuation { continuation in
      queue.async { continuation.resume(with: Result { try self.backend.write(data) }) }
    }
  }
}

private struct SecuritySessionStorageBackend: SessionStorageBackend {
  private let service = "com.rowan.iot.session"
  private var query: [String: Any] {
    [kSecClass as String: kSecClassGenericPassword,
     kSecAttrService as String: service, kSecAttrAccount as String: "current"]
  }
  func read() throws -> Data? {
    var request = query
    request[kSecReturnData as String] = true
    request[kSecMatchLimit as String] = kSecMatchLimitOne
    var item: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = item as? Data else {
      throw RowanFailure(code: Int(status), message: "无法读取安全会话")
    }
    return data
  }
  func write(_ data: Data?) throws {
    guard let data else {
      let status = SecItemDelete(query as CFDictionary)
      guard status == errSecSuccess || status == errSecItemNotFound else {
        throw RowanFailure(code: Int(status), message: "无法清理安全会话")
      }
      return
    }
    let attributes = [kSecValueData as String: data]
    let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      var item = query
      item[kSecValueData as String] = data
      item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else {
        throw RowanFailure(code: 500, message: "无法保存安全会话")
      }
    } else if status != errSecSuccess {
      throw RowanFailure(code: Int(status), message: "无法更新安全会话")
    }
  }
}

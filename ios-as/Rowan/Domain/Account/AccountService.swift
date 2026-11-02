import Foundation

extension Notification.Name { static let rowanAccountContextChanged = Notification.Name("RowanAccountContextChanged") }

enum AccountLogoutResult: Equatable { case serverConfirmed, alreadyUnauthenticated, noLocalSession }
struct AccountLogoutCleanupFailure: LocalizedError {
  let expectedRevision: Int
  var errorDescription: String? { "本地安全会话清理未完成，请重试本地清理" }
}
/// Credential identity is independent of settings publication, account revision and
/// token text. A settings copy must not suppress renewal for a delayed old-token 401.
private final class AccountCredentialPublication { }
private final class AccountSettingsPublication { }

/// Published snapshots remain on MainActor. Only storage transactions hold gate; HTTP never does.
@MainActor
final class AccountService {
  private let http: any HTTPGateway
  private let storage: any SessionStorage
  private let transactions = AccountTransactionGate()
  private var credentialPublication = AccountCredentialPublication()
  private var settingsPublication = AccountSettingsPublication()
  /// CAS stamp for settings reads; independent of credential renewal identity and account revision.
  private(set) var settingsRevision = 0
  private(set) var session: AccountSession?
  private(set) var revision = 0
  private(set) var pendingLogoutCleanupRevision: Int?
  private(set) var cleanupInProgress = false
  private var refreshTask: Task<Void, Error>?
  init(http: any HTTPGateway, storage: any SessionStorage) { self.http = http; self.storage = storage }

  private func publish() { NotificationCenter.default.post(name: .rowanAccountContextChanged, object: self) }
  private func installCredentials(_ value: AccountSession?) {
    session = value; credentialPublication = AccountCredentialPublication(); settingsRevision += 1
  }
  private func requireNoPendingLogoutCleanup() throws {
    if let expectedRevision = pendingLogoutCleanupRevision { throw AccountLogoutCleanupFailure(expectedRevision: expectedRevision) }
  }
  private func validateRevision(_ expected: Int) throws {
    guard revision == expected, session != nil, pendingLogoutCleanupRevision == nil else { throw RowanFailure(code: 499, message: "会话已变化") }
  }
  /// Owned cleanup does not inherit caller cancellation. Await it before releasing gate:
  /// a physical SecItem write/delete cannot be revoked by cancelling a Swift Task.
  private func deleteStored() async throws {
    let cleanup = Task { @MainActor [storage] in try await storage.write(nil) }
    try await cleanup.value
  }
  /// Requires the transaction permit. Never recursively acquire gate here.
  private func clearLocked(expected: Int? = nil, allowingPendingRetry: Bool = false) async throws {
    if let expected, expected != revision { throw RowanFailure(code: 499, message: "会话已变化") }
    if let pending = pendingLogoutCleanupRevision {
      guard allowingPendingRetry, expected == pending, pending == revision, session == nil else { throw AccountLogoutCleanupFailure(expectedRevision: pending) }
    } else {
      revision += 1; installCredentials(nil); pendingLogoutCleanupRevision = revision
      refreshTask?.cancel(); refreshTask = nil
    }
    cleanupInProgress = true; publish()
    do {
      try await deleteStored()
      pendingLogoutCleanupRevision = nil; cleanupInProgress = false; publish()
    } catch {
      cleanupInProgress = false; publish()
      throw AccountLogoutCleanupFailure(expectedRevision: revision)
    }
  }
  func clearLocal(expectedRevision: Int? = nil) async throws {
    try await transactions.run { try await self.clearLocked(expected: expectedRevision, allowingPendingRetry: expectedRevision != nil) }
    try Task.checkCancellation()
  }
  func retryLogoutCleanup(expectedRevision: Int) async throws {
    try await transactions.run {
      guard self.revision == expectedRevision, self.pendingLogoutCleanupRevision == expectedRevision, self.session == nil else { throw RowanFailure(code: 499, message: "会话已变化") }
      try await self.clearLocked(expected: expectedRevision, allowingPendingRetry: true)
    }
    try Task.checkCancellation()
  }
  /// Replace the full confirmed settings against credentials captured inside the
  /// transaction, never against a caller's old access/refresh-token snapshot.
  func commitSettings(expectedRevision: Int, rawJSON: String, expectedSettingsPublication: Int? = nil) async throws {
    try await transactions.run {
      try Task.checkCancellation(); try self.validateRevision(expectedRevision)
      if let expectedSettingsPublication, self.settingsRevision != expectedSettingsPublication {
        throw RowanFailure(code: 409, message: "设置已变化，请重新读取")
      }
      guard let latest = self.session else { throw RowanFailure(code: 499, message: "会话已变化") }
      let settings: AccountSettings
      do { settings = try JSONDecoder().decode(AccountSettings.self, from: Data(rawJSON.utf8)) }
      catch { throw RowanFailure(code: 502, message: "用户设置响应格式错误") }
      let value = AccountSession(accessToken: latest.accessToken, refreshToken: latest.refreshToken,
        userID: latest.userID, expiresIn: latest.expiresIn, tokenType: latest.tokenType, setting: settings)
      let data = try JSONEncoder().encode(value)
      try Task.checkCancellation()
      // This owned Task does not inherit caller cancellation. Once physical I/O
      // starts it owns write + MainActor publication through the same permit.
      // Ordinary storage errors preserve valid credentials and confirmed settings.
      let commit = Task { @MainActor in
        try await self.storage.write(data)
        if self.revision != expectedRevision || self.session == nil || self.pendingLogoutCleanupRevision != nil {
          // cancelRestore can invalidate memory without waiting for gate. No new
          // account can enter storage yet; remove this now-stale physical write.
          if self.session == nil { try await self.clearLocked(expected: self.revision) }
          throw RowanFailure(code: 499, message: "会话已变化")
        }
        self.session = value // Settings-only publication retains credential identity.
        self.settingsPublication = AccountSettingsPublication(); self.settingsRevision += 1; self.publish()
      }
      do { try await commit.value }
      catch {
        if Task.isCancelled { throw CancellationError() }
        throw error
      }
    }
    try Task.checkCancellation()
  }
  private func decode(_ value: Any) throws -> AccountSession {
    let value = try JSONDecoder().decode(AccountSession.self, from: JSONSerialization.data(withJSONObject: value))
    guard !value.accessToken.isEmpty, !value.refreshToken.isEmpty, !value.userID.isEmpty,
          value.expiresIn.map({ $0 > 0 }) ?? true,
          value.tokenType.map({ $0.lowercased() == "bearer" }) ?? true else { throw RowanFailure(code: 502, message: "会话响应不完整") }
    return value
  }
  /// Gate spans write, post-write validation and any compensating deletion. No newer account
  /// may enter persistence before compensation completes (or the central failed phase is set).
  private func saveLocked(_ value: AccountSession, expected: Int, onCompensated: ((AccountLoginReceipt) -> Void)? = nil) async throws {
    try Task.checkCancellation(); try requireNoPendingLogoutCleanup()
    guard expected == revision else { throw RowanFailure(code: 499, message: "会话已变化") }
    let data = try JSONEncoder().encode(value)
    do {
      try await storage.write(data)
      try Task.checkCancellation()
      guard expected == revision else { throw RowanFailure(code: 499, message: "会话已变化") }
      installCredentials(value); publish()
    } catch {
      let original = error
      // A synchronous backend may have written successfully before throwing/cancellation.
      // cancelRestore can invalidate this generation, but cannot let a new writer past gate.
      let ownsCompensation = revision == expected
      if ownsCompensation { revision += 1 }
      installCredentials(nil); pendingLogoutCleanupRevision = revision; cleanupInProgress = true
      refreshTask?.cancel(); refreshTask = nil; publish()
      let compensationRevision = revision
      do {
        try await deleteStored()
        pendingLogoutCleanupRevision = nil; cleanupInProgress = false
        if ownsCompensation, revision == compensationRevision, session == nil { onCompensated?(AccountLoginReceipt(revision: compensationRevision)) }
        publish()
      } catch {
        cleanupInProgress = false; publish()
        if original is CancellationError { throw CancellationError() }
        throw AccountLogoutCleanupFailure(expectedRevision: revision)
      }
      throw original
    }
  }
  private func beginAccount(expectedRevision: Int? = nil, onReserved: ((AccountLoginReceipt) -> Void)? = nil) async throws -> Int {
    try await transactions.run {
      try self.requireNoPendingLogoutCleanup()
      if let expectedRevision, self.revision != expectedRevision { throw RowanFailure(code: 499, message: "会话已变化") }
      try await self.clearLocked(expected: expectedRevision)
      onReserved?(AccountLoginReceipt(revision: self.revision))
      try Task.checkCancellation()
      return self.revision
    }
  }
  func login(account: String, pin: String) async throws {
    // Capture before waiting for the transaction gate; UI uses its bound revision explicitly.
    _ = try await login(account: account, credential: .password(pin), expectedRevision: revision)
  }
  func login(account: String, credential: AccountLoginCredential, expectedRevision: Int,
             onReserved: @escaping (AccountLoginReceipt) -> Void = { _ in }) async throws -> AccountLoginReceipt {
    try Task.checkCancellation()
    guard RecoveryInput.validEmail(account), credential.valid else { throw RowanFailure(code: 400, message: "请核对邮箱和登录信息") }
    let expected = try await beginAccount(expectedRevision: expectedRevision, onReserved: onReserved)
    try Task.checkCancellation()
    guard revision == expected, session == nil, pendingLogoutCleanupRevision == nil else { throw RowanFailure(code: 499, message: "会话已变化") }
    let response = try await http.request("POST", "/api/app/session", body: ["account": account, "pin": credential.pin,
      "verify": credential.mode.rawValue, "language": "zh-CN", "system": "ios"])
    try Task.checkCancellation()
    let value = try decode(response)
    try await transactions.run { try await self.saveLocked(value, expected: expected, onCompensated: onReserved) }
    // saveLocked's native publication is the commit point. A later UI cancellation is not logout.
    guard revision == expected, session != nil, pendingLogoutCleanupRevision == nil else { throw RowanFailure(code: 499, message: "会话已变化") }
    return AccountLoginReceipt(revision: expected)
  }
  func register(email: String, password: String, captcha: String, regionCode: String, expectedRevision: Int? = nil, onReserved: ((AccountLoginReceipt) -> Void)? = nil) async throws {
    guard RecoveryInput.validEmail(email), RecoveryInput.validPassword(password), RecoveryInput.validCode(captcha), Locale.isoRegionCodes.contains(regionCode) else { throw RowanFailure(code: 400, message: "请核对邮箱、密码、验证码及已选择地区") }
    let capturedRevision = expectedRevision ?? revision
    let expected = try await beginAccount(expectedRevision: capturedRevision, onReserved: onReserved)
    try Task.checkCancellation()
    guard revision == expected, session == nil, pendingLogoutCleanupRevision == nil else { throw RowanFailure(code: 499, message: "会话已变化") }
    let response = try await http.request("PUT", "/api/app/user", body: ["account": email, "password": password, "type": "email", "captcha": captcha, "regionCode": regionCode, "system": "ios", "language": "zh-CN"])
    try Task.checkCancellation()
    let value = try decode(response)
    try await transactions.run { try await self.saveLocked(value, expected: expected, onCompensated: onReserved) }
  }
  func restore() async throws {
    try Task.checkCancellation(); try requireNoPendingLogoutCleanup()
    guard session == nil else { return }
    let expected = revision
    do {
      let installed = try await transactions.run {
        guard expected == self.revision else { return false }
        try self.requireNoPendingLogoutCleanup()
        if self.session != nil { return true }
        // Read under the same gate: never observe a cancelled write before its
        // compensating delete and subsequently install that transient ciphertext.
        let data = try await self.storage.read()
        try Task.checkCancellation()
        guard expected == self.revision, let data else { return false }
        let value = try self.decode(JSONSerialization.jsonObject(with: data))
        if self.session == nil { self.installCredentials(value); self.publish() }
        return true
      }
      guard installed else { return }
      try await refresh()
      try Task.checkCancellation()
    } catch is CancellationError { throw CancellationError() }
    catch let error as AccountLogoutCleanupFailure { throw error }
    catch {
      try await transactions.run {
        if expected == self.revision { try await self.clearLocked(expected: expected) }
      }
    }
  }
  /// Memory-only invalidation. Pending/in-progress cleanup may never be bypassed;
  /// an already-entered save still owns gate and compensates before another account enters.
  func cancelRestore(expectedRevision: Int) {
    guard pendingLogoutCleanupRevision == nil, revision == expectedRevision else { return }
    revision += 1; installCredentials(nil); refreshTask?.cancel(); refreshTask = nil; publish()
  }
  func refresh() async throws {
    try Task.checkCancellation(); try requireNoPendingLogoutCleanup()
    if let refreshTask { try await refreshTask.value; try Task.checkCancellation(); return }
    guard let current = session else { throw RowanFailure(code: 401, message: "请先登录") }
    let expected = revision
    let startedSettingsPublication = settingsPublication
    let task = Task { @MainActor in
      do {
        let response = try await http.request("PATCH", "/api/app/session", body: ["userID": current.userID, "refreshToken": current.refreshToken])
        try Task.checkCancellation()
        guard var data = response as? [String: Any] else { throw RowanFailure(code: 502, message: "刷新响应不完整") }
        data["userID"] = current.userID
        if data["expiresIn"] == nil { data["expiresIn"] = current.expiresIn }
        if data["tokenType"] == nil { data["tokenType"] = current.tokenType }
        try await transactions.run {
          try self.validateRevision(expected)
          // Readback committed after refresh began wins even over an explicit old
          // setting in the refresh response. Merge only while holding the permit.
          if self.settingsPublication !== startedSettingsPublication || data["setting"] == nil || data["setting"] is NSNull {
            if let setting = self.session?.setting { data["setting"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(setting)) }
            else { data.removeValue(forKey: "setting") }
          }
          let value = try self.decode(data)
          try await self.saveLocked(value, expected: expected)
        }
      } catch is CancellationError { throw CancellationError() }
      catch let failure as AccountLogoutCleanupFailure { throw failure }
      catch {
        let original = error
        if expected == revision {
          try await transactions.run {
            if expected == self.revision { try await self.clearLocked(expected: expected) }
          }
        }
        throw original
      }
    }
    refreshTask = task
    defer { if expected == revision { refreshTask = nil } }
    try await task.value
    try Task.checkCancellation()
  }
  /// Only safe reads can replay once after single-flight renewal. Never hold gate over HTTP.
  func request(_ method: String, _ path: String, body: [String: Any]? = nil, expectedRevision: Int? = nil, allowReadReplay: Bool = true) async throws -> Any {
    try Task.checkCancellation()
    // One synchronous MainActor capture: a bound caller must never select another
    // account's token after its own repository/page preflight has completed.
    let (expected, capturedSession, publication) = (revision, session, credentialPublication)
    if let expectedRevision, expectedRevision != expected { throw RowanFailure(code: 499, message: "会话已变化") }
    guard let current = capturedSession else { throw RowanFailure(code: 401, message: "请先登录") }
    do {
      let response = try await http.request(method, path, body: body, token: current.accessToken)
      try validateRevision(expected); try Task.checkCancellation(); return response
    } catch {
      try validateRevision(expected); try Task.checkCancellation()
      // GET can also generate credentials (SHARE-01); its owner must opt out explicitly.
      guard allowReadReplay, (error as? RowanFailure)?.code == 401, ["GET", "HEAD"].contains(method.uppercased()) else { throw error }
      if credentialPublication === publication { try await refresh() }
      try validateRevision(expected); try Task.checkCancellation()
      guard let renewed = session else { throw RowanFailure(code: 401, message: "请先登录") }
      do {
        let response = try await http.request(method, path, body: body, token: renewed.accessToken)
        try validateRevision(expected); try Task.checkCancellation(); return response
      } catch {
        try validateRevision(expected); try Task.checkCancellation()
        if (error as? RowanFailure)?.code == 401 {
          try await transactions.run { try self.validateRevision(expected); try await self.clearLocked(expected: expected) }
        }
        throw error
      }
    }
  }
  @discardableResult func logout() async throws -> AccountLogoutResult {
    try Task.checkCancellation(); try requireNoPendingLogoutCleanup()
    let expected = revision, current = session
    let result: AccountLogoutResult
    if let current {
      do {
        _ = try await http.request("DELETE", "/api/app/session", token: current.accessToken)
        try validateRevision(expected); try Task.checkCancellation(); result = .serverConfirmed
      } catch {
        try validateRevision(expected); try Task.checkCancellation()
        guard (error as? RowanFailure)?.code == 401 else { throw error }
        result = .alreadyUnauthenticated
      }
    } else { result = .noLocalSession }
    try await transactions.run {
      guard expected == self.revision else { throw RowanFailure(code: 499, message: "会话已变化") }
      try await self.clearLocked(expected: expected)
    }
    try Task.checkCancellation()
    return result
  }
}

import Foundation
import CryptoKit

enum NicknamePhase: String, Codable, Sendable { case unknown = "UNKNOWN", confirmed = "CONFIRMED", rejected = "REJECTED" }
struct NicknameRecord: Codable, Sendable, MQTTRedacted {
  let key: String, operationID: String, userID: String, resourceID: String, productID: String, target: String
  let phase: NicknamePhase
  let errorCode: String
  func terminal(_ phase: NicknamePhase, error: String = "") -> NicknameRecord {
    NicknameRecord(key: key, operationID: operationID, userID: userID, resourceID: resourceID, productID: productID, target: target, phase: phase, errorCode: error)
  }
}
/// Exactly the Android length-prefixed UTF8 identity domain; revision is not a persistent account ID.
func nicknameKey(userID: String, resourceID: String) -> String {
  var bytes = Data()
  for value in ["rowan.nickname.v1", userID, resourceID] {
    let part = Data(value.utf8), count = UInt64(part.count)
    // Local String sizes cannot practically exceed UInt32, fail closed rather than truncating.
    guard count <= UInt64(UInt32.max) else { return "" }
    let n = UInt32(count)
    bytes.append(contentsOf: [UInt8(n >> 24), UInt8((n >> 16) & 255), UInt8((n >> 8) & 255), UInt8(n & 255)])
    bytes.append(part)
  }
  return SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
}
func nicknameEqual(_ a: String, _ b: String) -> Bool { a.utf8.elementsEqual(b.utf8) }
/// No memory-only production fallback; reserve and complete are serial atomic durable transactions.
protocol NicknameJournal: Sendable {
  func load(key: String) async throws -> NicknameRecord?
  func reserve(_ record: NicknameRecord) async throws -> NicknameRecord
  func complete(_ record: NicknameRecord) async throws -> Bool
}
@MainActor protocol NicknameRepository {
  var scope: DeviceMoreScope { get }
  func patch(nickname: String) async throws
  func readNickname() async throws -> String?
}
@MainActor
final class NicknameBinding: MQTTRedacted {
  let scope: DeviceMoreScope, handle: DeviceReadHandle
  let pageCurrent: () -> Bool
  init(scope: DeviceMoreScope, handle: DeviceReadHandle, pageCurrent: @escaping () -> Bool) {
    self.scope = scope; self.handle = handle; self.pageCurrent = pageCurrent
  }
}
struct NicknameView: Sendable, MQTTRedacted {
  let operationID: String, state: String
  var confirmedNickname = "", errorCode = ""
}
/// App-owned worker is deliberately not cancellable by a page's await.
@MainActor
final class NicknameTask: MQTTRedacted {
  private(set) var state: NicknameView
  fileprivate var worker: Task<NicknameView, Never>?
  var onChanged: (() -> Void)?
  init(_ state: NicknameView) { self.state = state }
  fileprivate func install(_ value: NicknameView) { state = value; onChanged?() }
  func value() async throws -> NicknameView {
    try Task.checkCancellation()
    guard let worker else { return state }
    let result = await worker.value
    try Task.checkCancellation(); return result
  }
}
typealias NicknamePolicy = @MainActor (AuthorizedDevice, String) -> Bool

/// Application singleton; not wired to a page, bridge or AppServices in this batch.
/// No default policy, inferred role matrix, normalization, nickname length or replay.
@MainActor
final class DeviceNicknameCoordinator {
  private struct Running { let target: String, task: NicknameTask }
  private final class PageIntents {
    weak var handle: DeviceReadHandle?
    var values: [Data: Running] = [:]
    init(_ handle: DeviceReadHandle) { self.handle = handle }
  }
  private let currentAccount: () -> MQTTPoolIdentity?
  private let access: NativeDeviceAccessGateway, journal: any NicknameJournal
  private let repository: (DeviceMoreScope) -> any NicknameRepository
  private let policy: NicknamePolicy?
  private let confirmed: (NicknameBinding, String) -> Void
  private let revoked: (NicknameBinding) -> Void
  private var running: [String: Running] = [:]
  private var intents: [ObjectIdentifier: PageIntents] = [:]
  private var closed = false
  init(currentAccount: @escaping () -> MQTTPoolIdentity?, access: NativeDeviceAccessGateway, journal: any NicknameJournal,
       repository: @escaping (DeviceMoreScope) -> any NicknameRepository, policy: NicknamePolicy? = nil,
       onConfirmed: @escaping (NicknameBinding, String) -> Void = { _, _ in }, onOwnershipRevoked: @escaping (NicknameBinding) -> Void = { _ in }) {
    self.currentAccount = currentAccount; self.access = access; self.journal = journal; self.repository = repository
    self.policy = policy; confirmed = onConfirmed; revoked = onOwnershipRevoked
  }
  private func accountCurrent(_ scope: DeviceMoreScope) -> Bool {
    guard let value = currentAccount() else { return false }
    return value.revision == scope.accountRevision && nicknameEqual(value.userID, scope.userID)
  }
  private func bindingCurrent(_ binding: NicknameBinding) -> Bool {
    guard !closed, accountCurrent(binding.scope), binding.pageCurrent(), !binding.handle.released,
          case let .current(snapshot) = binding.handle.state else { return false }
    return snapshot.accountRevision == binding.scope.accountRevision && nicknameEqual(snapshot.resourceID, binding.scope.resourceID) &&
      snapshot.phase != .forbidden && snapshot.failure != .authorization &&
      snapshot.metadata.map { nicknameEqual($0.productID, binding.scope.productID) } == true
  }
  private func ready(_ binding: NicknameBinding) -> Bool {
    binding.scope.accountRevision >= 0 && bindingCurrent(binding) &&
      [binding.scope.userID, binding.scope.resourceID, binding.scope.productID].allSatisfy(validDeviceMoreID)
  }
  private func refused(_ error: String) -> NicknameTask { NicknameTask(NicknameView(operationID: "", state: "rejected", errorCode: error)) }
  func begin(_ binding: NicknameBinding, target: String, intentID: String) -> NicknameTask { start(binding, target: target, intentID: intentID, reconcile: false) }
  func reconcile(_ binding: NicknameBinding) -> NicknameTask { start(binding, target: "", intentID: "", reconcile: true) }
  private func start(_ binding: NicknameBinding, target: String, intentID: String, reconcile: Bool) -> NicknameTask {
    guard ready(binding) else { return refused("session_changed") }
    guard reconcile || policy != nil else { return refused("unsupported") }
    intents = intents.filter { $0.value.handle.map { !$0.released } == true }
    let pageKey = ObjectIdentifier(binding.handle), page = intents[ObjectIdentifier(binding.handle)] ?? PageIntents(binding.handle)
    let intentKey = Data(intentID.utf8)
    intents[pageKey] = page
    if !reconcile {
      guard !intentID.isEmpty, intentID.utf8.count <= 128, intentID.rangeOfCharacter(from: .controlCharacters) == nil else { return refused("invalid_input") }
      if let previous = page.values[intentKey] { return nicknameEqual(previous.target, target) ? previous.task : refused("busy") }
      guard page.values.count < 64 else { return refused("busy") } // Engineering admission bound, not product input rule.
    }
    let key = nicknameKey(userID: binding.scope.userID, resourceID: binding.scope.resourceID)
    if let previous = running[key] {
      guard reconcile || nicknameEqual(previous.target, target) else { return refused("busy") }
      if !reconcile { page.values[intentKey] = previous }; return previous.task
    }
    let operation = UUID().uuidString, task = NicknameTask(NicknameView(operationID: operation, state: "preparing"))
    let value = Running(target: target, task: task)
    running[key] = value; if !reconcile { page.values[intentKey] = value }
    task.worker = Task { @MainActor [self, task] in
      defer { if running[key]?.task === task { running.removeValue(forKey: key) } }
      return await work(binding, key: key, target: target, reconcile: reconcile, operation: operation, task: task)
    }
    return task
  }
  private func requireAccount(_ scope: DeviceMoreScope) throws {
    guard !closed, accountCurrent(scope) else { throw RowanFailure(code: 499, message: "session_changed") }
    try Task.checkCancellation()
  }
  private func revoke(_ binding: NicknameBinding) { if bindingCurrent(binding) { revoked(binding) } }
  private func authorize(_ binding: NicknameBinding) async throws -> AuthorizedDevice {
    try requireAccount(binding.scope)
    let proof: AuthorizedDevice
    do { proof = try await access.authorize(resourceID: binding.scope.resourceID, expectedRevision: binding.scope.accountRevision) }
    catch {
      if let code = (error as? RowanFailure)?.code, [403, 1342].contains(code) { revoke(binding) }
      throw error
    }
    try requireAccount(binding.scope)
    guard proof.accountRevision == binding.scope.accountRevision, nicknameEqual(proof.userID, binding.scope.userID),
          nicknameEqual(proof.resourceID, binding.scope.resourceID), nicknameEqual(proof.productID, binding.scope.productID) else {
      throw RowanFailure(code: 499, message: "session_changed")
    }
    return proof
  }
  private func failure(_ error: Error) -> String {
    switch (error as? RowanFailure)?.code {
    case 401: return "not_authenticated"
    case 403, 1342, 1382: return "forbidden"
    case 1381: return "not_found"
    case 499: return "session_changed"
    default: return "unknown_result"
    }
  }
  private func terminal(_ record: NicknameRecord) -> NicknameView {
    switch record.phase {
    case .confirmed: return NicknameView(operationID: record.operationID, state: "confirmed", confirmedNickname: record.target)
    case .rejected: return NicknameView(operationID: record.operationID, state: "rejected", errorCode: record.errorCode)
    case .unknown: return NicknameView(operationID: record.operationID, state: "unknown", errorCode: "unknown_result")
    }
  }
  private func work(_ binding: NicknameBinding, key: String, target: String, reconcile: Bool, operation: String, task: NicknameTask) async -> NicknameView {
    var record: NicknameRecord?
    func emit(_ value: NicknameView) -> NicknameView { task.install(value); return value }
    func unknown(_ code: String = "unknown_result") -> NicknameView {
      emit(NicknameView(operationID: record?.operationID ?? operation, state: "unknown", errorCode: code))
    }
    do {
      do { record = try await journal.load(key: key) }
      catch { return emit(NicknameView(operationID: operation, state: "rejected", errorCode: "storage_unavailable")) }
      try requireAccount(binding.scope)
      if let record, !(nicknameEqual(record.userID, binding.scope.userID) && nicknameEqual(record.resourceID, binding.scope.resourceID) && nicknameEqual(record.productID, binding.scope.productID)) {
        return unknown("session_changed")
      }
      if reconcile {
        guard let saved = record else { return emit(NicknameView(operationID: "", state: "idle")) }
        if saved.phase != .unknown { return emit(terminal(saved)) }
        _ = try await authorize(binding)
      } else {
        if let saved = record, saved.phase == .unknown { return unknown(nicknameEqual(saved.target, target) ? "unknown_result" : "busy") }
        let proof = try await authorize(binding)
        guard policy?(proof, target) == true else { return emit(NicknameView(operationID: operation, state: "rejected", errorCode: "invalid_input")) }
        guard bindingCurrent(binding) else { return emit(NicknameView(operationID: operation, state: "rejected", errorCode: "session_changed")) }
        let candidate = NicknameRecord(key: key, operationID: operation, userID: binding.scope.userID, resourceID: binding.scope.resourceID,
          productID: binding.scope.productID, target: target, phase: .unknown, errorCode: "")
        do { record = try await journal.reserve(candidate) }
        catch { return emit(NicknameView(operationID: operation, state: "rejected", errorCode: "storage_unavailable")) }
        guard let reserved = record else { return unknown("storage_unavailable") }
        guard nicknameEqual(reserved.operationID, operation) else { return unknown(nicknameEqual(reserved.target, target) ? "unknown_result" : "busy") }
        // Once durable intent exists, no timeout/cancellation/re-entry path may replay PATCH.
        try requireAccount(binding.scope)
        let repo = repository(binding.scope); guard repo.scope == binding.scope else { return unknown("session_changed") }
        _ = emit(NicknameView(operationID: operation, state: "sending"))
        do { try await repo.patch(nickname: target) }
        catch {
          if (error as? RowanFailure)?.code == 1382 { revoke(binding) }
          let code = failure(error)
          if ["not_authenticated", "forbidden", "not_found"].contains(code) {
            let rejected = reserved.terminal(.rejected, error: code)
            let persisted: Bool
            do { persisted = try await journal.complete(rejected) } catch { persisted = false }
            return persisted ? emit(terminal(rejected)) : unknown("storage_unavailable")
          }
          return unknown(code)
        }
        _ = emit(NicknameView(operationID: operation, state: "accepted"))
      }
      try requireAccount(binding.scope)
      guard let saved = record else { return unknown() }
      let repo = repository(binding.scope); guard repo.scope == binding.scope else { return unknown("session_changed") }
      _ = emit(NicknameView(operationID: saved.operationID, state: "checking"))
      let observed: String?
      do { observed = try await repo.readNickname() }
      catch {
        if let code = (error as? RowanFailure)?.code, [1342, 1382].contains(code) { revoke(binding) }
        return unknown(failure(error))
      }
      try requireAccount(binding.scope)
      guard let observed, nicknameEqual(observed, saved.target) else { return unknown() }
      let committed: Bool
      do { committed = try await journal.complete(saved.terminal(.confirmed)) } catch { committed = false }
      guard committed else { return unknown("storage_unavailable") }
      try requireAccount(binding.scope)
      if bindingCurrent(binding) { confirmed(binding, observed) }
      return emit(terminal(saved.terminal(.confirmed)))
    } catch {
      return record?.phase == .unknown ? unknown(failure(error)) :
        emit(NicknameView(operationID: operation, state: "rejected", errorCode: failure(error)))
    }
  }
  /// Teardown cancels intent execution, not physical queued Keychain work. running removes only on actual completion.
  func close() { closed = true; for value in running.values { value.task.worker?.cancel() } }
}


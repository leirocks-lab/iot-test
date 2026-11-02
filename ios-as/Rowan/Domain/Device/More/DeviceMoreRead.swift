import Foundation

struct DeviceMoreScope: Sendable, Equatable, CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable {
  var description: String { "DeviceMoreScope(redacted)" }
  var debugDescription: String { description }
  var customMirror: Mirror { Mirror(self, children: ["redacted": true], displayStyle: .struct) }
  let accountRevision: Int
  let resourceID: String
  let userID: String
  let productID: String
  static func == (lhs: Self, rhs: Self) -> Bool {
    lhs.accountRevision == rhs.accountRevision && zip([lhs.resourceID, lhs.userID, lhs.productID], [rhs.resourceID, rhs.userID, rhs.productID]).allSatisfy { pair in pair.0.utf8.elementsEqual(pair.1.utf8) }
  }
}
/// Safe read models contain no native identity, contacts, URLs, JSON or operation permission.
struct DeviceMoreSummary: Sendable {
  let deviceNickname: String; let deviceName: String; let productName: String; let productCategory: String
  let seriesName: String; let modelName: String; let mcuVersion: String; let wifiVersion: String; let bindingRole: String
}
struct DeviceMoreMember: Sendable { let itemKey: String; let nickname: String; let bindingRole: String }
struct DeviceMoreHelp: Sendable { let itemKey: String; let title: String; let content: String; let createdAt: String }
enum DeviceLocationAssignment: String, Sendable { case assigned, unassigned, unknown }
struct DeviceLocationSummary: Sendable { let assignment: DeviceLocationAssignment; let roomName: String }
protocol DeviceMoreReadError: Error {
  var code: DeviceMoreReadFailure { get }
  var ownershipRevoked: Bool { get }
}
enum DeviceMoreReadFailure: String, DeviceMoreReadError, LocalizedError {
  case sessionChanged = "session_changed", forbidden, unavailable, readFailed = "read_failed", closed
  var errorDescription: String? { "设备信息暂不可用，请核对当前设备与登录状态后重试" }
  var code: DeviceMoreReadFailure { self }
  var ownershipRevoked: Bool { false }
}
/// Internal classifier only. Never a JS DTO/error field or a permission inferred from metadata role.
struct DeviceMoreOwnershipRevoked: DeviceMoreReadError, LocalizedError {
  let code = DeviceMoreReadFailure.forbidden
  let ownershipRevoked = true
  var errorDescription: String? { code.errorDescription }
}
@MainActor
protocol DeviceMoreReadRepository {
  var scope: DeviceMoreScope { get }
  func summary() async throws -> DeviceMoreSummary
  func members() async throws -> [DeviceMoreMember]
  func help() async throws -> [DeviceMoreHelp]
}
func validDeviceMoreID(_ value: String) -> Bool {
  !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value != "." && value != ".." && value.rangeOfCharacter(from: .controlCharacters) == nil
}

/// One native module shares this gate across schedules/firmware/More.
@MainActor
final class NativeDeviceReadGate {
  private var active: [UUID: () -> Void] = [:]
  private var closed = false
  private let deadline: () async throws -> Void
  @MainActor private final class Progress { var timedOut = false }
  init(deadline: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 20_000_000_000) }) { self.deadline = deadline }
  func run<T: Sendable>(_ operation: @escaping @MainActor () async throws -> T) async throws -> T {
    try Task.checkCancellation(); guard !closed else { throw DeviceMoreReadFailure.closed }
    guard active.count < 2 else { throw DeviceMoreReadFailure.unavailable }
    let id = UUID(), progress = Progress(), worker = Task { @MainActor in try await operation() }
    active[id] = { worker.cancel() }
    let timer = Task { @MainActor [deadline] in
      do { try Task.checkCancellation(); try await deadline(); try Task.checkCancellation() } catch { return }
      progress.timedOut = true; worker.cancel()
    }
    defer { timer.cancel(); active.removeValue(forKey: id) } // actual worker completion, never early cancel
    do {
      let value = try await withTaskCancellationHandler(operation: { try await worker.value }, onCancel: { worker.cancel() })
      try Task.checkCancellation(); guard !closed else { throw DeviceMoreReadFailure.closed }
      guard !progress.timedOut else { throw DeviceMoreReadFailure.unavailable }; return value
    } catch {
      try Task.checkCancellation(); if closed { throw DeviceMoreReadFailure.closed }
      if progress.timedOut { throw DeviceMoreReadFailure.unavailable }; throw error
    }
  }
  func close() { guard !closed else { return }; closed = true; for cancel in active.values { cancel() } }
}

@MainActor
final class DeviceMoreReadFeatures {
  private let currentAccount: () -> MQTTPoolIdentity?
  private let observationCurrent: () -> Bool
  private let gateway: NativeDeviceAccessGateway
  private let repository: (DeviceMoreScope) -> DeviceMoreReadRepository
  private let rooms: (DeviceMoreScope) -> DeviceRoomRepository
  private let gate: NativeDeviceReadGate
  init(currentAccount: @escaping () -> MQTTPoolIdentity?, gateway: NativeDeviceAccessGateway,
       repository: @escaping (DeviceMoreScope) -> DeviceMoreReadRepository, rooms: @escaping (DeviceMoreScope) -> DeviceRoomRepository,
       observationCurrent: @escaping () -> Bool, gate: NativeDeviceReadGate? = nil) {
    self.currentAccount = currentAccount; self.gateway = gateway; self.repository = repository; self.rooms = rooms
    self.observationCurrent = observationCurrent; self.gate = gate ?? NativeDeviceReadGate()
  }
  private func requireCurrent(_ identity: MQTTPoolIdentity) throws {
    try Task.checkCancellation(); guard currentAccount() == identity, observationCurrent() else { throw DeviceMoreReadFailure.sessionChanged }
  }
  func readAuthorized<T: Sendable>(_ resourceID: String, revision: Int, work: @escaping @MainActor (DeviceMoreScope) async throws -> T) async throws -> T {
    try Task.checkCancellation()
    guard validDeviceMoreID(resourceID) else { throw DeviceMoreReadFailure.readFailed }
    guard let identity = currentAccount(), identity.revision == revision, validDeviceMoreID(identity.userID), observationCurrent() else { throw DeviceMoreReadFailure.sessionChanged }
    return try await gate.run { [self] in
      do {
        try requireCurrent(identity)
        let device: AuthorizedDevice
        do { device = try await gateway.authorize(resourceID: resourceID, expectedRevision: revision) }
        catch {
          try requireCurrent(identity)
          if let failure = error as? RowanFailure, [403, 1342].contains(failure.code) { throw DeviceMoreOwnershipRevoked() }
          throw error
        }
        try requireCurrent(identity)
        guard device.accountRevision == revision, device.resourceID.utf8.elementsEqual(resourceID.utf8), device.userID.utf8.elementsEqual(identity.userID.utf8), validDeviceMoreID(device.productID) else { throw DeviceMoreReadFailure.sessionChanged }
        let scope = DeviceMoreScope(accountRevision: revision, resourceID: resourceID, userID: identity.userID, productID: device.productID)
        let result = try await work(scope); try requireCurrent(identity); return result
      } catch {
        try requireCurrent(identity) // stale account/page takes precedence over a late permission error
        if let failure = error as? DeviceMoreReadError { throw failure }
        if let failure = error as? RowanFailure {
          // V1.4 explicit "not bound" codes remain ownership evidence even after fresh proof.
          if [1332, 1342, 1352, 1402, 1452, 1492, 1502].contains(failure.code) { throw DeviceMoreOwnershipRevoked() }
          if [401, 403].contains(failure.code) { throw DeviceMoreReadFailure.forbidden }
          if failure.code == 499 { throw DeviceMoreReadFailure.sessionChanged }
          throw DeviceMoreReadFailure.readFailed
        }
        if error is URLError { throw DeviceMoreReadFailure.unavailable }
        throw DeviceMoreReadFailure.readFailed
      }
    }
  }
  private func checked(_ scope: DeviceMoreScope) throws -> DeviceMoreReadRepository {
    let value = repository(scope); guard value.scope == scope else { throw DeviceMoreReadFailure.sessionChanged }; return value
  }
  func summary(resourceID: String, expectedRevision: Int) async throws -> DeviceMoreSummary { try await readAuthorized(resourceID, revision: expectedRevision) { [self] scope in try await checked(scope).summary() } }
  func members(resourceID: String, expectedRevision: Int) async throws -> [DeviceMoreMember] { try await readAuthorized(resourceID, revision: expectedRevision) { [self] scope in try await checked(scope).members() } }
  func help(resourceID: String, expectedRevision: Int) async throws -> [DeviceMoreHelp] { try await readAuthorized(resourceID, revision: expectedRevision) { [self] scope in try await checked(scope).help() } }
  func location(resourceID: String, expectedRevision: Int) async throws -> DeviceLocationSummary {
    try await readAuthorized(resourceID, revision: expectedRevision) { [self] scope in
      let room = try await rooms(scope).location(deviceID: resourceID)
      return DeviceLocationSummary(assignment: room == nil ? .unknown : .assigned, roomName: room?.name ?? "")
    }
  }
  func close() { gate.close() }
}

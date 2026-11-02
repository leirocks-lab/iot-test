import Foundation
import CoreFoundation

/// One captured account revision; all production requests still belong to AccountService.
@MainActor
final class HTTPRoomRepository: RoomRepository, DeviceRoomRepository {
  private let account: AccountService
  private let revision: Int
  private let userID: String?
  private let initiallyPendingCleanup: Bool
  private let path = "/api/app/user/locations"
  init(account: AccountService, expectedRevision: Int? = nil, expectedUserID: String? = nil) {
    self.account = account; revision = expectedRevision ?? account.revision; userID = expectedUserID ?? account.session?.userID
    initiallyPendingCleanup = account.pendingLogoutCleanupRevision != nil
  }

  private func checkCurrent() throws {
    try Task.checkCancellation()
    guard account.revision == revision, !initiallyPendingCleanup, account.pendingLogoutCleanupRevision == nil, let userID, let current = account.session, current.userID.utf8.elementsEqual(userID.utf8) else { throw RowanFailure(code: 499, message: "登录会话已变化") }
  }
  private func request(_ method: String, _ route: String, body: [String: Any]? = nil) async throws -> Any {
    try checkCurrent()
    let result = try await account.request(method, route, body: body, expectedRevision: revision)
    try checkCurrent()
    return result
  }
  func load() async throws -> [Room] {
    let result = try Self.decodeList(try await request("GET", path))
    try checkCurrent()
    return result
  }
  func create(name: String) async throws -> [Room] {
    let name = try validatedRoomName(name)
    try await mutation("POST", path, body: ["name": name])
    return try await readAfterMutation { $0.contains { $0.name == name } }
  }
  func rename(id: RoomID, name: String) async throws -> [Room] {
    let name = try validatedRoomName(name)
    _ = try Self.encodeID(id)
    let encoded = try Self.segment(id.display)
    try await mutation("PATCH", path + "/" + encoded, body: ["name": name])
    return try await readAfterMutation { $0.contains { $0.id == id && $0.name == name } }
  }
  func saveLayout(baseline: [Room], orderedIDs: [RoomID]) async throws -> [Room] {
    let latest = try await load()
    guard latest == baseline else { throw RoomOperationError.baselineChanged(latest) }
    let byID = Dictionary(uniqueKeysWithValues: latest.map { ($0.id, $0) })
    guard Set(orderedIDs).count == orderedIDs.count, orderedIDs.allSatisfy({ byID[$0] != nil }) else {
      throw RoomOperationError.ruleBlocked("只能调整当前房间顺序或删除允许删除的空房间")
    }
    for room in latest where !orderedIDs.contains(room.id) { try requireRemovableRoom(room) }
    let desired = orderedIDs.compactMap { byID[$0] }
    let payload: [[String: Any]] = try desired.map { ["id": try Self.encodeID($0.id), "name": $0.name] }
    // This detects an already changed baseline, not a race between GET and PUT.
    // No version/updatedAt field or atomic CAS guarantee exists in the frozen wire contract.
    try await mutation("PUT", path, body: ["rooms": payload])
    return try await readAfterMutation { result in
      result.map(\.id) == desired.map(\.id) && result.map(\.name) == desired.map(\.name)
    }
  }
  func location(deviceID: String) async throws -> RoomLocation? {
    let data = try await request("GET", Self.locationPath(deviceID))
    if data is NSNull { return nil }
    guard let object = data as? [String: Any] else { throw RowanFailure(code: 502, message: "设备房间响应格式错误") }
    return try RoomLocation(id: Self.decodeID(object["id"]), name: object["name"] as? String ?? "")
  }
  func move(deviceID: String, roomID: RoomID?) async throws -> RoomLocation? {
    var body: [String: Any] = [:]
    if let roomID { body["id"] = try Self.encodeID(roomID) }
    // V1.4 explicitly allows omission/empty ID for unassignment; no invented null/delete endpoint.
    try await mutation("PUT", Self.locationPath(deviceID), body: body)
    do {
      let actual = try await location(deviceID: deviceID)
      // ROOM02 nil/missing is unknown, not authoritative unassignment evidence.
      guard let actual, let roomID, actual.id == roomID else { throw RoomOperationError.resultUnknown }
      return actual
    } catch is CancellationError { throw CancellationError() }
    catch { if (error as? RowanFailure)?.code == 499 { throw error }; throw RoomOperationError.resultUnknown }
  }
  private func mutation(_ method: String, _ route: String, body: [String: Any]) async throws {
    try checkCurrent()
    do { _ = try await request(method, route, body: body) }
    catch is CancellationError { throw CancellationError() }
    catch let error as RowanFailure {
      if error.code == 0 || error.code == 408 || (500...599).contains(error.code) { throw RoomOperationError.resultUnknown }
      throw error
    } catch { throw RoomOperationError.resultUnknown }
  }
  private func readAfterMutation(_ confirmed: ([Room]) -> Bool) async throws -> [Room] {
    do {
      let latest = try await load()
      guard confirmed(latest) else { throw RoomOperationError.resultUnknown }
      return latest
    } catch is CancellationError { throw CancellationError() }
    catch { if (error as? RowanFailure)?.code == 499 { throw error }; throw RoomOperationError.resultUnknown }
  }
  static func decodeList(_ raw: Any) throws -> [Room] {
    guard let rows = raw as? [[String: Any]] else { throw RowanFailure(code: 502, message: "房间列表响应格式错误") }
    let rooms = try rows.map { row -> Room in
      let isDefault: Bool?
      if let raw = row["isDefault"], !(raw is NSNull) {
        guard let value = raw as? NSNumber, CFGetTypeID(value) == CFBooleanGetTypeID() else { throw RowanFailure(code: 502, message: "房间默认标识格式错误") }
        isDefault = value.boolValue
      } else { isDefault = nil }
      let count: Int?
      if let raw = row["deviceCount"], !(raw is NSNull) {
        guard let value = raw as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID(), value.doubleValue.isFinite,
              value.doubleValue >= 0, value.doubleValue <= Double(Int32.max), value.doubleValue.rounded(.towardZero) == value.doubleValue else {
          throw RowanFailure(code: 502, message: "房间设备数量格式错误")
        }
        count = value.intValue
      } else { count = nil }
      return try Room(id: decodeID(row["id"]), name: decodeName(row["name"]), isDefault: isDefault, deviceCount: count)
    }
    guard Set(rooms.map(\.id)).count == rooms.count else { throw RowanFailure(code: 502, message: "房间列表包含重复标识") }
    return rooms
  }
  private static func decodeID(_ raw: Any?) throws -> RoomID {
    if let text = raw as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return .text(text) }
    if let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
       "cislqCISLQ".contains(String(cString: number.objCType)), let value = Int64(number.stringValue) { return .numeric(value) }
    throw RowanFailure(code: 502, message: "房间标识格式错误")
  }
  private static func encodeID(_ id: RoomID) throws -> Any {
    switch id {
    case let .text(value):
      guard !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw RowanFailure(code: 400, message: "房间标识无效") }
      return value
    case let .numeric(value): return value
    }
  }
  private static func decodeName(_ raw: Any?) throws -> String {
    guard let value = raw as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw RowanFailure(code: 502, message: "房间名称格式错误") }
    return value
  }
  private static func locationPath(_ deviceID: String) throws -> String {
    guard !deviceID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw RowanFailure(code: 400, message: "设备标识无效") }
    let encoded = try segment(deviceID)
    return "/api/app/devices/" + encoded + "/location"
  }
  private static func segment(_ value: String) throws -> String {
    guard !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, value != ".", value != "..", value.rangeOfCharacter(from: .controlCharacters) == nil else {
      throw RowanFailure(code: 400, message: "标识无效")
    }
    guard let encoded = value.addingPercentEncoding(withAllowedCharacters: CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")) else {
      throw RowanFailure(code: 400, message: "标识无法编码")
    }
    return encoded
  }
}

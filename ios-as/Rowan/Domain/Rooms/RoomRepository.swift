import Foundation

/// V1.4 says Number in tables but uses strings in examples. Keep the exact received ID type.
enum RoomID: Hashable {
  case text(String), numeric(Int64)
  static func == (lhs: RoomID, rhs: RoomID) -> Bool {
    switch (lhs, rhs) { case let (.text(a), .text(b)): return a.utf8.elementsEqual(b.utf8)
    case let (.numeric(a), .numeric(b)): return a == b; default: return false }
  }
  func hash(into hasher: inout Hasher) {
    switch self { case let .text(value): hasher.combine(0); hasher.combine(Data(value.utf8)); case let .numeric(value): hasher.combine(1); hasher.combine(value) }
  }
  var display: String {
    switch self { case let .text(value): return value; case let .numeric(value): return String(value) }
  }
}
struct Room: Equatable {
  let id: RoomID
  let name: String
  let isDefault: Bool?
  let deviceCount: Int?
}
struct RoomLocation: Equatable {
  let id: RoomID
  let name: String
}

@MainActor
protocol RoomRepository {
  func load() async throws -> [Room]
  func create(name: String) async throws -> [Room]
  func rename(id: RoomID, name: String) async throws -> [Room]
  func saveLayout(baseline: [Room], orderedIDs: [RoomID]) async throws -> [Room]
}
@MainActor
protocol DeviceRoomRepository {
  func location(deviceID: String) async throws -> RoomLocation?
  func move(deviceID: String, roomID: RoomID?) async throws -> RoomLocation?
}

enum RoomOperationError: LocalizedError {
  case baselineChanged([Room]), ruleBlocked(String), resultUnknown
  var errorDescription: String? {
    switch self {
    case .baselineChanged: return "房间已在其他终端变更，已刷新列表，请重新编辑"
    case let .ruleBlocked(message): return message
    case .resultUnknown: return "操作结果未确认，请先刷新房间列表核对；不会自动重复提交"
    }
  }
}

func requireRemovableRoom(_ room: Room) throws {
  guard let count = room.deviceCount else { throw RoomOperationError.ruleBlocked("设备数量未知，请刷新后再操作") }
  guard count == 0 else { throw RoomOperationError.ruleBlocked("房间内有设备，设备迁移规则待确认，暂不能删除") }
  guard room.isDefault == false else { throw RoomOperationError.ruleBlocked("默认房间或默认标识未知，删除规则待确认") }
}

func validatedRoomName(_ value: String) throws -> String {
  let name = value.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !name.isEmpty else { throw RowanFailure(code: 400, message: "请输入房间名称") }
  return name
}

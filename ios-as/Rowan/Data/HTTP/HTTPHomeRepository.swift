import Foundation
import CoreFoundation

/// HOME-01 metadata. Live state and controls must come from the device service.
@MainActor
final class HTTPHomeRepository: HomeRepository {
  private let account: AccountService
  init(account: AccountService) { self.account = account }
  func loadGroups(expectedRevision: Int) async throws -> [HomeGroup] {
    try Self.decode(try await account.request("GET", "/api/app/devices", expectedRevision: expectedRevision))
  }
  static func decode(_ value: Any) throws -> [HomeGroup] {
    guard let groups = value as? [[String: Any]] else { throw malformedResponse() }
    var roomIDs = Set<RoomID>(), deviceIDs = Set<Data>()
    return try groups.map { group in
      guard let devices = group["devices"] as? [[String: Any]] else { throw malformedResponse() }
      var roomName: String?, roomID: RoomID?
      if let value = group["room"], !(value is NSNull) {
        guard let object = value as? [String: Any] else { throw malformedResponse() }
        roomName = try text(object["name"])
        if let raw = object["id"], !(raw is NSNull) {
          roomID = try decodeID(raw)
          guard let roomID, roomIDs.insert(roomID).inserted else { throw malformedResponse() }
        }
      }
      return try HomeGroup(roomName: roomName, devices: devices.map { item in
        guard let device = item["device"] as? [String: Any] else { throw malformedResponse() }
        let id = try text(device["id"])
        guard deviceIDs.insert(Data(id.utf8)).inserted else { throw malformedResponse() }
        let nickname: String
        if let value = item["deviceNickname"], !(value is NSNull) {
          guard let raw = value as? String else { throw malformedResponse() }
          nickname = raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? id : raw
        }
        else { nickname = id }
        return HomeDevice(id: id, nickname: nickname)
      }, roomID: roomID)
    }
  }
  private static func decodeID(_ raw: Any) throws -> RoomID {
    if let value = raw as? String { return .text(try text(value)) }
    if let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
       "cislqCISLQ".contains(String(cString: number.objCType)), let value = Int64(number.stringValue) { return .numeric(value) }
    throw malformedResponse()
  }
  private static func text(_ raw: Any?) throws -> String {
    guard let value = raw as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw malformedResponse() }
    return value
  }
  private static func malformedResponse() -> RowanFailure { RowanFailure(code: 502, message: "设备列表响应格式错误") }
}

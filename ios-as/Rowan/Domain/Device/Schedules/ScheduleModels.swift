import Foundation

struct ScheduleScope: Equatable {
  let accountRevision: Int
  let resourceID: String
  let productID: String
  /// nil is unknown for authorized metadata reads; never a fabricated read-only version.
  let modelVersion: String?
  static func == (lhs: ScheduleScope, rhs: ScheduleScope) -> Bool {
    lhs.accountRevision == rhs.accountRevision && scheduleTextEqual(lhs.resourceID, rhs.resourceID)
      && scheduleTextEqual(lhs.productID, rhs.productID) && scheduleOptionalTextEqual(lhs.modelVersion, rhs.modelVersion)
  }
  func validate() throws {
    guard accountRevision >= 0, [resourceID, productID].allSatisfy(validScheduleText), modelVersion.map(validScheduleText) ?? true else { throw scheduleInvalid() }
  }
}
enum ScheduleType: String, CaseIterable { case once, periodic }
enum ScheduleRepeatType: String, CaseIterable { case once, daily, weekdays, custom }

/// Internal native capability proof DTO. No production issuer/registry exists here.
/// Read action JSON is data only and never implicitly grants one of these permits.
struct ActionPermit: CustomStringConvertible, CustomDebugStringConvertible {
  let scope: ScheduleScope
  let mode: String?
  private let actionJSON: String
  init(scope: ScheduleScope, actionJSON: String, mode: String?) throws {
    try scope.validate()
    guard scope.modelVersion != nil else { throw RowanFailure(code: 400, message: "产品物模型版本尚未确认，不能授权定时动作") }
    guard let object = try? JSONDecoder().decode([String: SettingValue].self, from: Data(actionJSON.utf8)), !object.isEmpty,
          mode.map(validScheduleText) ?? true else { throw scheduleInvalid() }
    self.scope = scope; self.actionJSON = actionJSON; self.mode = mode
  }
  fileprivate func action(for expected: ScheduleScope) throws -> [String: Any] {
    guard expected.modelVersion != nil else { throw RowanFailure(code: 400, message: "产品物模型版本尚未确认，不能发送定时动作") }
    guard scope == expected else { throw RowanFailure(code: 499, message: "定时能力所属设备或账号已变化") }
    guard let object = try JSONSerialization.jsonObject(with: Data(actionJSON.utf8)) as? [String: Any], !object.isEmpty else { throw scheduleInvalid() }
    return object // A freshly decoded, detached object per request.
  }
  var description: String { "ActionPermit(action omitted)" }
  var debugDescription: String { description }
}

struct ScheduleRecord: CustomStringConvertible, CustomDebugStringConvertible {
  let scope: ScheduleScope
  let id: String
  let rawJSON: String
  private let fields: [String: SettingValue]
  var type: ScheduleType? { string("type").flatMap(ScheduleType.init(rawValue:)) }
  var repeatType: ScheduleRepeatType? { string("repeatType").flatMap(ScheduleRepeatType.init(rawValue:)) }
  var enabled: Bool? { if case let .bool(value)? = fields["enabled"] { return value }; return nil }
  var name: String? { string("name") }
  var startTime: String? { string("startTime").flatMap { validScheduleTime($0) ? $0 : nil } }
  var endTime: String? { string("endTime").flatMap { validScheduleTime($0) ? $0 : nil } }
  var mode: String? { string("mode").flatMap { validScheduleText($0) ? $0 : nil } }
  var timeZone: String? { string("timeZone").flatMap { validScheduleText($0) ? $0 : nil } }
  var weekdays: [Int]? {
    guard case let .array(raw)? = fields["weekdays"] else { return nil }
    var values: [Int] = []
    for item in raw {
      guard case let .number(value) = item, value >= 1, value <= 7 else { return nil }
      let integer = NSDecimalNumber(decimal: value).intValue
      guard Decimal(integer) == value else { return nil }; values.append(integer)
    }
    return Array(Set(values)).sorted()
  }
  /// Server-owned opaque value. No local DST, calendar or next-execution computation.
  var nextExecutionAt: String? { string("nextExecutionAt").flatMap { validScheduleText($0) ? $0 : nil } }
  var actionJSON: String? {
    guard case let .object(value)? = fields["action"], let data = try? JSONEncoder().encode(value) else { return nil }
    return String(decoding: data, as: UTF8.self)
  }
  static func decode(scope: ScheduleScope, rawJSON: String) throws -> ScheduleRecord {
    guard let fields = try? JSONDecoder().decode([String: SettingValue].self, from: Data(rawJSON.utf8)),
          case let .string(id)? = fields["id"], validScheduleText(id), id != ".", id != ".." else { throw RowanFailure(code: 502, message: "定时日程响应格式错误") }
    return ScheduleRecord(scope: scope, id: id, rawJSON: rawJSON, fields: fields)
  }
  fileprivate func matches(_ expected: [String: SettingValue]) -> Bool {
    expected.allSatisfy { key, value in fields[key].map { scheduleJSONEqual(value, $0) } ?? false }
  }
  private func string(_ key: String) -> String? { if case let .string(value)? = fields[key] { return value }; return nil }
  var description: String { "ScheduleRecord(definition omitted)" }
  var debugDescription: String { description }
}

struct ScheduleDraft {
  var type: ScheduleType
  var startTime: String
  var repeatType: ScheduleRepeatType
  var timeZone: String
  var permit: ActionPermit
  var name: String? = nil
  var endTime: String? = nil
  var weekdays: [Int]? = nil
  var enabled: Bool? = nil
  func createBody(scope: ScheduleScope) throws -> [String: Any] {
    try scope.validate()
    guard scope.modelVersion != nil else { throw RowanFailure(code: 400, message: "产品物模型版本尚未确认，不能发送定时动作") }
    guard validScheduleTime(startTime), endTime.map(validScheduleTime) ?? true,
          (TimeZone.knownTimeZoneIdentifiers.contains(timeZone) || timeZone == "Etc/UTC"), TimeZone(identifier: timeZone) != nil else { throw scheduleInvalid() }
    var body: [String: Any] = ["type": type.rawValue, "startTime": startTime, "repeatType": repeatType.rawValue,
      "timeZone": timeZone, "action": try permit.action(for: scope)]
    if let name { body["name"] = name }
    if let endTime { body["endTime"] = endTime }
    if let mode = permit.mode { body["mode"] = mode }
    if let enabled { body["enabled"] = enabled }
    if repeatType == .custom, weekdays?.isEmpty != false { throw scheduleInvalid() }
    if let weekdays {
      guard weekdays.allSatisfy({ (1...7).contains($0) }) else { throw scheduleInvalid() }
      body["weekdays"] = Array(Set(weekdays)).sorted()
    }
    return body
  }
  func updateBody(scope: ScheduleScope, existing: ScheduleRecord) throws -> [String: Any] {
    guard existing.scope == scope else { throw RowanFailure(code: 499, message: "定时日程所属设备或账号已变化") }
    var body = try createBody(scope: scope)
    guard let enabled = enabled ?? existing.enabled else { throw RowanFailure(code: 400, message: "请明确选择日程启用状态") }
    body["enabled"] = enabled
    return body
  }
}

struct ScheduleMutationUnknown: Error, LocalizedError { var errorDescription: String? { "定时操作结果未确认，请读取核对；不会自动重复提交" } }
@MainActor
protocol SchedulesRepository {
  var scope: ScheduleScope { get }
  func load() async throws -> [ScheduleRecord]
  func create(_ draft: ScheduleDraft) async throws -> ScheduleRecord
  func update(_ existing: ScheduleRecord, draft: ScheduleDraft) async throws -> ScheduleRecord
  func setEnabled(id: String, enabled: Bool) async throws -> Bool
  func delete(id: String) async throws
}

func scheduleInvalid() -> RowanFailure { RowanFailure(code: 400, message: "请核对定时参数及原生产品能力") }
private func validScheduleTime(_ value: String) -> Bool { value.utf8.count == 5 && value.range(of: #"^([01][0-9]|2[0-3]):[0-5][0-9]$"#, options: .regularExpression) != nil }
func scheduleDefiniteRejection(_ code: Int) -> Bool { ((400...499).contains(code) && code != 408) || (1701...1704).contains(code) }
func validScheduleText(_ value: String) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.rangeOfCharacter(from: .controlCharacters) == nil }
private func scheduleTextEqual(_ lhs: String, _ rhs: String) -> Bool { lhs.utf8.elementsEqual(rhs.utf8) }
private func scheduleOptionalTextEqual(_ lhs: String?, _ rhs: String?) -> Bool {
  switch (lhs, rhs) {
  case (nil, nil): return true
  case let (.some(a), .some(b)): return scheduleTextEqual(a, b)
  default: return false
  }
}
private func scheduleJSONEqual(_ lhs: SettingValue, _ rhs: SettingValue) -> Bool {
  switch (lhs, rhs) {
  case (.null, .null): return true
  case let (.bool(a), .bool(b)): return a == b
  case let (.number(a), .number(b)): return a == b
  case let (.string(a), .string(b)): return scheduleTextEqual(a, b)
  case let (.array(a), .array(b)): return a.count == b.count && zip(a, b).allSatisfy { scheduleJSONEqual($0.0, $0.1) }
  case let (.object(a), .object(b)):
    return a.count == b.count && a.allSatisfy { key, value in b.first { scheduleTextEqual(key, $0.key) }.map { scheduleJSONEqual(value, $0.value) } ?? false }
  default: return false
  }
}

/// Snapshot of explicit request fields only; never infer an identity from a similar row.
struct ScheduleExpectation {
  private let fields: [String: SettingValue]
  init(body: [String: Any]) throws { fields = try JSONDecoder().decode([String: SettingValue].self, from: JSONSerialization.data(withJSONObject: body)) }
  func matches(_ record: ScheduleRecord) -> Bool { record.matches(fields) }
}

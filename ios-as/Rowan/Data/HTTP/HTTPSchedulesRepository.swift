import Foundation
import CoreFoundation

/// TIMER-01...05 only. AccountService owns credentials; mutations are never replayed here.
@MainActor
final class HTTPSchedulesRepository: SchedulesRepository {
  private let account: AccountService
  let scope: ScheduleScope
  private let userID: String?
  private let initiallyPendingCleanup: Bool
  init(account: AccountService, scope: ScheduleScope) {
    self.account = account; self.scope = scope; userID = account.session?.userID
    initiallyPendingCleanup = account.pendingLogoutCleanupRevision != nil
  }
  private func requireCurrent() throws {
    try Task.checkCancellation()
    guard let userID, !initiallyPendingCleanup, account.pendingLogoutCleanupRevision == nil,
          account.revision == scope.accountRevision, account.session?.userID == userID else { throw RowanFailure(code: 499, message: "登录会话已变化") }
    try scope.validate()
  }
  private var base: String { get throws { "/api/app/devices/" + (try Self.segment(scope.resourceID)) + "/schedules" } }
  private func request(_ method: String, path: String, body: [String: Any]? = nil) async throws -> Any {
    try requireCurrent()
    let response = try await account.request(method, path, body: body, expectedRevision: scope.accountRevision)
    try requireCurrent(); return response
  }
  private func mutation(_ method: String, path: String, body: [String: Any]? = nil) async throws -> Any {
    try requireCurrent()
    do { return try await request(method, path: path, body: body) }
    catch is CancellationError { throw CancellationError() }
    catch let failure as RowanFailure {
      if scheduleDefiniteRejection(failure.code) { throw failure }; throw ScheduleMutationUnknown()
    } catch { throw ScheduleMutationUnknown() }
  }
  func load() async throws -> [ScheduleRecord] {
    guard let rows = try await request("GET", path: base) as? [[String: Any]] else { throw malformed() }
    var seen = Set<Data>()
    return try rows.map { value in
      let record = try Self.record(value, scope: scope)
      guard seen.insert(Data(record.id.utf8)).inserted else { throw malformed() }; return record
    }
  }
  func create(_ draft: ScheduleDraft) async throws -> ScheduleRecord {
    let body = try draft.createBody(scope: scope)
    let raw = try await mutation("POST", path: base, body: body)
    guard let result = try? Self.record(raw, scope: scope) else { throw ScheduleMutationUnknown() }; return result
  }
  func update(_ existing: ScheduleRecord, draft: ScheduleDraft) async throws -> ScheduleRecord {
    let body = try draft.updateBody(scope: scope, existing: existing)
    let raw = try await mutation("PATCH", path: base + "/" + Self.segment(existing.id), body: body)
    guard let result = try? Self.record(raw, scope: scope), result.id.utf8.elementsEqual(existing.id.utf8) else { throw ScheduleMutationUnknown() }; return result
  }
  func setEnabled(id: String, enabled: Bool) async throws -> Bool {
    let raw = try await mutation("PUT", path: base + "/" + Self.segment(id) + "/enabled", body: ["enabled": enabled])
    guard let object = raw as? [String: Any], let value = object["enabled"] as? NSNumber,
          CFGetTypeID(value) == CFBooleanGetTypeID(), value.boolValue == enabled else { throw ScheduleMutationUnknown() }
    return value.boolValue
  }
  func delete(id: String) async throws { _ = try await mutation("DELETE", path: base + "/" + Self.segment(id)) }
  private static func record(_ raw: Any, scope: ScheduleScope) throws -> ScheduleRecord {
    guard let object = raw as? [String: Any], JSONSerialization.isValidJSONObject(object) else { throw RowanFailure(code: 502, message: "定时日程响应格式错误") }
    return try ScheduleRecord.decode(scope: scope, rawJSON: String(decoding: JSONSerialization.data(withJSONObject: object), as: UTF8.self))
  }
  private func malformed() -> RowanFailure { RowanFailure(code: 502, message: "定时日程响应格式错误") }
  private static func segment(_ value: String) throws -> String {
    guard validScheduleText(value), value != ".", value != ".." else { throw scheduleInvalid() }
    let allowed = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    return value.utf8.map { allowed.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
  }
}

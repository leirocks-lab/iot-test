import Foundation
import CoreFoundation

/// Transport-free V1.6 chapter 10 state core. The owner supplies a monotonic clock and
/// dispatches publications after all four subscriptions succeed. No reconnect/retry/replay.
/// Reconnection requires a new reducer with a fresh connectionEpoch and a new get.
@MainActor
final class ClassicShadowReducer {
  private let context: ShadowContext
  private let profile: ShadowProfile?
  private let prefix: String
  let responseTopics: Set<String>
  private let reportedTree = ReportedTree()
  /// Only update/reported is command evidence; a get snapshot improves display, not execution proof.
  private let evidence = ReportedTree()
  private var commands: [String: ShadowCommandState] = [:]
  private var maxVersion: Int64 = -1
  private var active = true
  private var queryFloor: Int64?
  /// Valid response to this reducer's current requested get, including genuinely empty state.
  private(set) var hasRequestedSnapshot = false
  private(set) var recovery = ShadowRecovery.none

  init(context: ShadowContext, profile: ShadowProfile? = nil) {
    self.context = context
    self.profile = profile
    prefix = "$aws/things/\(context.thingRef)/shadow"
    responseTopics = Set(["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map {
      "$aws/things/\(context.thingRef)/shadow/\($0)"
    })
  }

  func reported() -> ShadowValue { reportedTree.snapshot() }
  func online() -> Bool? {
    guard active, recovery == .none, let field = profile?.connection else { return nil }
    let value = reportedTree.at(field.path).value
    if value == field.online { return true }
    if value == field.offline { return false }
    return nil
  }
  func commandState(_ token: String) -> ShadowCommandState? { commands[token] }

  private func checkContext(_ incoming: ShadowContext) throws {
    guard active, incoming == context else { throw ShadowError.staleContext }
    guard recovery != .authorizationRequired else { throw ShadowError.authorizationRequired }
  }
  func query(_ incoming: ShadowContext) throws -> ShadowPublication {
    try checkContext(incoming)
    hasRequestedSnapshot = false
    queryFloor = maxVersion
    return ShadowPublication(topic: prefix + "/get", payload: Data())
  }

  func command(_ incoming: ShadowContext, token: String, desired: ShadowValue,
               nowMs: Int64, expected: ShadowValue? = nil, timeoutMs: Int64 = 2000) throws -> ShadowPublication {
    try checkContext(incoming)
    guard recovery == .none else { throw ShadowError.getRequired }
    // 2000 ms is a configurable local engineering default, not a V1.6 timing guarantee.
    guard nowMs >= 0, timeoutMs > 0, nowMs <= Int64.max - timeoutMs,
          !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, token.utf8.count <= 64,
          commands[token] == nil, let profile, let metadata = profile.metadata else { throw ShadowError.invalidCommand }
    let targetValue = expected ?? desired
    try desired.validate(); try targetValue.validate()
    guard case .fields = desired, case .fields = targetValue else { throw ShadowError.invalidCommand }
    let requested = desired.leaves(), targets = targetValue.leaves()
    guard !requested.isEmpty, !targets.isEmpty else { throw ShadowError.invalidCommand }
    let reserved = [metadata.userIDPath, metadata.thingRefPath, metadata.commandPath]
    guard (Array(requested.keys) + Array(targets.keys)).allSatisfy({ path in
      !reserved.contains { shadowPathsOverlap(path, $0) }
    }), requested.allSatisfy({ profile.writable[$0.key]?($0.value) == true }),
        targets.allSatisfy({ profile.targets[$0.key]?($0.value) == true }) else { throw ShadowError.invalidCommand }

    let wireDesired = desired.setting(metadata.userIDPath, to: .text(context.userID))
      .setting(metadata.thingRefPath, to: .text(context.thingRef))
      .setting(metadata.commandPath, to: metadata.commandValue)
    let wire = ShadowValue.fields(["state": .fields(["desired": wireDesired]), "clientToken": .text(token)])
    let payload = try JSONSerialization.data(withJSONObject: wire.jsonObject)
    // Validate and encode before mutating command state, so failure is atomic.
    for (key, old) in commands where old.pending && old.expected.keys.contains(where: { oldPath in
      targets.keys.contains { shadowPathsOverlap(oldPath, $0) }
    }) {
      var updated = old; updated.phase = .unknown; updated.unknownCause = .superseded; commands[key] = updated
    }
    commands[token] = ShadowCommandState(token: token, phase: .sending, baselineVersion: maxVersion,
                                          deadlineMs: nowMs + timeoutMs, expected: targets)
    return ShadowPublication(topic: prefix + "/update", payload: payload)
  }

  /// PUBACK only establishes transport delivery to the broker.
  @discardableResult func puback(_ incoming: ShadowContext, token: String) -> Bool {
    guard active, incoming == context, var old = commands[token], old.phase == .sending else { return false }
    old.phase = .sent; commands[token] = old
    return true
  }

  @discardableResult func receive(_ incoming: ShadowContext, topic: String, payload: Data) -> ShadowReceiveResult {
    guard active, incoming == context, responseTopics.contains(topic), recovery != .authorizationRequired,
          payload.count <= 128 * 1024, String(data: payload, encoding: .utf8) != nil,
          let body = try? JSONSerialization.jsonObject(with: payload) as? [String: Any] else { return .ignored }
    let token = body["clientToken"] as? String
    if topic.hasSuffix("/rejected") { return rejected(topic: topic, body: body, token: token) }
    guard let version = number(body["version"]), version >= 0, version <= 9_007_199_254_740_991,
          version.rounded(.towardZero) == version, let state = body["state"] as? [String: Any] else { return .ignored }
    let stamp = Int64(version)
    let reported: ShadowValue?, desired: ShadowValue?
    do {
      reported = try state["reported"].map { try ShadowValue.parse($0) }
      desired = try state["desired"].map { try ShadowValue.parse($0) }
      for branch in [reported, desired].compactMap({ $0 }) {
        switch branch { case .null, .fields: break; default: throw ShadowError.invalidJSON }
      }
      if let path = profile?.metadata?.reportedThingRefPath, let identity = reported?.at(path), identity != .text(context.thingRef) {
        throw ShadowError.invalidContext
      }
      if let path = profile?.metadata?.thingRefPath, let identity = desired?.at(path), identity != .text(context.thingRef) {
        throw ShadowError.invalidContext
      }
    } catch { return .ignored }

    var changed = false
    let isUpdate = topic == prefix + "/update/accepted"
    if let reported {
      changed = reportedTree.apply(reported, version: stamp) || changed
      if isUpdate { changed = evidence.apply(reported, version: stamp) || changed }
    }
    if isUpdate, let desired, case .fields = desired, let token, var old = commands[token], old.pending,
       old.cloudAcceptedVersion == nil, stamp > old.baselineVersion {
      old.phase = .cloudAccepted; old.cloudAcceptedVersion = stamp; commands[token] = old; changed = true
    }
    maxVersion = max(maxVersion, stamp)
    if !isUpdate, let floor = queryFloor, stamp >= floor {
      queryFloor = nil
      if !hasRequestedSnapshot { hasRequestedSnapshot = true; changed = true }
      if recovery != .none { recovery = .none; changed = true }
    }
    changed = confirmTargets() || changed
    return changed ? .applied : .ignored
  }

  private func number(_ raw: Any?) -> Double? {
    guard let value = raw as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID(), value.doubleValue.isFinite else { return nil }
    return value.doubleValue
  }
  private func rejected(topic: String, body: [String: Any], token: String?) -> ShadowReceiveResult {
    guard let numericCode = number(body["code"]), (400...599).contains(numericCode), numericCode.rounded(.towardZero) == numericCode else { return .ignored }
    let code = Int(numericCode)
    if topic == prefix + "/update/rejected" {
      guard let token, var old = commands[token], old.pending else { return .ignored }
      old.phase = .rejected; old.rejectionCode = code; commands[token] = old
    }
    switch code {
    case 401, 403: recovery = .authorizationRequired
    case 404: recovery = .unavailable
    case 409: recovery = .getRequired
    default: break
    }
    queryFloor = nil
    if topic == prefix + "/get/rejected" || recovery != .none { hasRequestedSnapshot = false }
    if recovery == .authorizationRequired { markUnknown(.disconnected) }
    return .applied
  }

  private func confirmTargets() -> Bool {
    var changed = false
    for (token, command) in commands {
      guard command.pending, let accepted = command.cloudAcceptedVersion else { continue }
      let floor = max(accepted, command.baselineVersion)
      let observations: [Int64?] = command.expected.map { path, target in
        let current = reportedTree.at(path), proof = evidence.at(path)
        let expectedValue: ShadowValue? = target == .null ? nil : target
        return current.value == expectedValue && proof.value == expectedValue && proof.version > floor ? proof.version : nil
      }
      if observations.allSatisfy({ $0 != nil }) {
        var updated = command
        updated.phase = .targetReached
        updated.targetObservedVersion = observations.compactMap { $0 }.max()
        commands[token] = updated
        changed = true
      }
    }
    return changed
  }
  func tick(_ incoming: ShadowContext, nowMs: Int64) {
    guard active, incoming == context else { return }
    for (token, state) in commands where state.pending && nowMs >= state.deadlineMs {
      var updated = state; updated.phase = .unknown; updated.unknownCause = .timeout; commands[token] = updated
    }
  }
  func disconnect(_ incoming: ShadowContext) {
    guard incoming == context else { return }
    markUnknown(.disconnected)
    hasRequestedSnapshot = false
    active = false
  }
  func close() { markUnknown(.closed); hasRequestedSnapshot = false; active = false }
  private func markUnknown(_ cause: ShadowUnknownCause) {
    for (token, state) in commands where state.pending {
      var updated = state; updated.phase = .unknown; updated.unknownCause = cause; commands[token] = updated
    }
  }
}

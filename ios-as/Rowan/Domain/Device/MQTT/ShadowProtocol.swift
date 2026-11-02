import Foundation
import CoreFoundation

enum ShadowError: Error {
  case invalidContext, invalidJSON, invalidProfile, staleContext, authorizationRequired, getRequired, invalidCommand
}

struct ShadowContext: Equatable {
  let accountRevision: Int64
  let connectionEpoch: Int64
  let resourceID: String
  let thingRef: String
  let userID: String

  init(accountRevision: Int64, connectionEpoch: Int64, resourceID: String, thingRef: String, userID: String) throws {
    guard accountRevision >= 0, connectionEpoch >= 0,
          !resourceID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          !userID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          !thingRef.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          thingRef.rangeOfCharacter(from: CharacterSet(charactersIn: "/+#\0")) == nil else { throw ShadowError.invalidContext }
    self.accountRevision = accountRevision
    self.connectionEpoch = connectionEpoch
    self.resourceID = resourceID
    self.thingRef = thingRef
    self.userID = userID
  }
}

/// Immutable JSON value trees; Foundation reference containers never escape into state.
enum ShadowValue: Equatable {
  case null, text(String), number(Double), bool(Bool), items([ShadowValue]), fields([String: ShadowValue])

  static func parse(_ raw: Any, depth: Int = 0) throws -> ShadowValue {
    guard depth <= 32 else { throw ShadowError.invalidJSON }
    if raw is NSNull { return .null }
    if let value = raw as? String { return .text(value) }
    if let value = raw as? NSNumber {
      if CFGetTypeID(value) == CFBooleanGetTypeID() { return .bool(value.boolValue) }
      guard value.doubleValue.isFinite else { throw ShadowError.invalidJSON }
      return .number(value.doubleValue)
    }
    if let value = raw as? [String: Any] {
      guard value.count <= 4096 else { throw ShadowError.invalidJSON }
      return .fields(try value.mapValues { try parse($0, depth: depth + 1) })
    }
    if let value = raw as? [Any] {
      guard value.count <= 4096 else { throw ShadowError.invalidJSON }
      return .items(try value.map { try parse($0, depth: depth + 1) })
    }
    throw ShadowError.invalidJSON
  }

  func validate(depth: Int = 0) throws {
    guard depth <= 32 else { throw ShadowError.invalidJSON }
    switch self {
    case let .number(value): guard value.isFinite else { throw ShadowError.invalidJSON }
    case let .fields(value):
      guard value.count <= 4096 else { throw ShadowError.invalidJSON }
      for item in value.values { try item.validate(depth: depth + 1) }
    case let .items(value):
      guard value.count <= 4096 else { throw ShadowError.invalidJSON }
      for item in value { try item.validate(depth: depth + 1) }
    default: break
    }
  }

  var jsonObject: Any {
    switch self {
    case .null: return NSNull()
    case let .text(value): return value
    case let .number(value): return value
    case let .bool(value): return value
    case let .items(value): return value.map(\.jsonObject)
    case let .fields(value): return value.mapValues(\.jsonObject)
    }
  }

  func at(_ path: ShadowPath) -> ShadowValue? {
    var current = self
    for key in path {
      guard case let .fields(fields) = current, let next = fields[key] else { return nil }
      current = next
    }
    return current
  }

  func setting(_ path: ShadowPath, to value: ShadowValue) -> ShadowValue {
    guard let first = path.first else { return value }
    var object: [String: ShadowValue]
    if case let .fields(fields) = self { object = fields } else { object = [:] }
    object[first] = (object[first] ?? .fields([:])).setting(Array(path.dropFirst()), to: value)
    return .fields(object)
  }

  func leaves(prefix: ShadowPath = []) -> [ShadowPath: ShadowValue] {
    guard case let .fields(fields) = self else { return [:] }
    var result: [ShadowPath: ShadowValue] = [:]
    for (key, value) in fields {
      let path = prefix + [key]
      if case let .fields(children) = value, !children.isEmpty {
        result.merge(value.leaves(prefix: path)) { _, newer in newer }
      } else { result[path] = value }
    }
    return result
  }
}

typealias ShadowPath = [String]
typealias ShadowValidator = (ShadowValue) -> Bool

func shadowPathsOverlap(_ lhs: ShadowPath, _ rhs: ShadowPath) -> Bool {
  lhs.prefix(min(lhs.count, rhs.count)).elementsEqual(rhs.prefix(min(lhs.count, rhs.count)))
}

private func validShadowPath(_ path: ShadowPath) -> Bool {
  !path.isEmpty && path.allSatisfy { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
}

struct ShadowOnlineField {
  let path: ShadowPath
  let online: ShadowValue
  let offline: ShadowValue
  init(path: ShadowPath, online: ShadowValue, offline: ShadowValue) throws {
    guard validShadowPath(path), online != offline else { throw ShadowError.invalidProfile }
    try online.validate(); try offline.validate()
    self.path = path; self.online = online; self.offline = offline
  }
}

/// Verified product paths only. No example identity or command field spelling is a default.
struct ShadowMetadata {
  let userIDPath: ShadowPath
  let thingRefPath: ShadowPath
  let commandPath: ShadowPath
  let commandValue: ShadowValue
  let reportedThingRefPath: ShadowPath?
  init(userIDPath: ShadowPath, thingRefPath: ShadowPath, commandPath: ShadowPath,
       commandValue: ShadowValue, reportedThingRefPath: ShadowPath? = nil) throws {
    let paths = [userIDPath, thingRefPath, commandPath]
    guard (paths + (reportedThingRefPath.map { [$0] } ?? [])).allSatisfy(validShadowPath) else { throw ShadowError.invalidProfile }
    for a in paths.indices {
      for b in paths.indices where a != b {
        guard !shadowPathsOverlap(paths[a], paths[b]) else { throw ShadowError.invalidProfile }
      }
    }
    switch commandValue { case .text, .number, .bool: break; default: throw ShadowError.invalidProfile }
    try commandValue.validate()
    self.userIDPath = userIDPath; self.thingRefPath = thingRefPath; self.commandPath = commandPath
    self.commandValue = commandValue; self.reportedThingRefPath = reportedThingRefPath
  }
}

struct ShadowProfile {
  let writable: [ShadowPath: ShadowValidator]
  let connection: ShadowOnlineField?
  let targets: [ShadowPath: ShadowValidator]
  let metadata: ShadowMetadata?
  init(writable: [ShadowPath: ShadowValidator], connection: ShadowOnlineField? = nil,
       targets: [ShadowPath: ShadowValidator]? = nil, metadata: ShadowMetadata? = nil) throws {
    guard Array(writable.keys).allSatisfy(validShadowPath), Array((targets ?? writable).keys).allSatisfy(validShadowPath) else {
      throw ShadowError.invalidProfile
    }
    self.writable = writable; self.connection = connection; self.targets = targets ?? writable; self.metadata = metadata
  }
}

struct ShadowPublication {
  let topic: String
  let payload: Data
  let qos = 1
  let retain = false
}

enum ShadowReceiveResult: Equatable { case applied, ignored }
enum ShadowRecovery: Equatable { case none, unavailable, authorizationRequired, getRequired }
enum ShadowCommandPhase: Equatable { case sending, sent, cloudAccepted, targetReached, rejected, unknown }
enum ShadowUnknownCause: Equatable { case timeout, disconnected, closed, superseded }

/// targetReached means newer observed reported state, not proof this command caused it.
struct ShadowCommandState {
  let token: String
  var phase: ShadowCommandPhase
  let baselineVersion: Int64
  let deadlineMs: Int64
  let expected: [ShadowPath: ShadowValue]
  var cloudAcceptedVersion: Int64? = nil
  var targetObservedVersion: Int64? = nil
  var rejectionCode: Int? = nil
  var unknownCause: ShadowUnknownCause? = nil
  var pending: Bool { phase == .sending || phase == .sent || phase == .cloudAccepted }
}

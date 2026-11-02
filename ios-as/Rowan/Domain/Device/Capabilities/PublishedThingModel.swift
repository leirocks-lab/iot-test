import Foundation

/// Native request provenance plus PRODUCT-01's exact published model version.
struct ThingModelIdentity: Equatable, Sendable { let productID: String; let version: String }
/// Local envelope only. productID is not an invented THING-01 response field.
struct ThingModelPayload: CustomStringConvertible, CustomDebugStringConvertible, Sendable {
  let productID: String
  let dataJSON: String
  var description: String { "ThingModelPayload(definition omitted)" }
  var debugDescription: String { description }
}
enum ThingValueKind: Equatable, Sendable { case boolean, enumeration, integer, unknown }
enum ThingAccess: Equatable, Sendable { case readOnly, readWrite, unknown }
/// COMPLETE describes schema constraints only, never user/product write authorization.
enum WriteConstraintStatus: Equatable, Sendable { case complete, readOnly, unknown }
enum ThingModelIssue: Hashable, Sendable {
  case unknownType, unknownAccess, missingRange, invalidRange, missingStep, invalidStep
  case missingEnum, invalidEnum, missingUnit, invalidUnit, ambiguousFormat
  case invalidIdentifier, duplicateIdentifier, invalidCollection, invalidDefinition
}
enum ThingModelFailure: Error, Equatable { case identityMismatch, invalidDocument }

/// Detached definition tree. Decimal preserves wire precision before safe-integer validation.
indirect enum ThingDefinitionValue: Decodable, Equatable, Sendable {
  case null, bool(Bool), string(String), number(Decimal), array([ThingDefinitionValue]), object([String: ThingDefinitionValue])
  init(from decoder: Decoder) throws {
    guard decoder.codingPath.count <= 32 else { throw ThingModelFailure.invalidDocument }
    let container = try decoder.singleValueContainer()
    if container.decodeNil() { self = .null }
    else if let value = try? container.decode(Bool.self) { self = .bool(value) }
    else if let value = try? container.decode(String.self) { self = .string(value) }
    else if let value = try? container.decode(Decimal.self) { self = .number(value) }
    else if let value = try? container.decode([String: ThingDefinitionValue].self) {
      guard value.count <= 4096 else { throw ThingModelFailure.invalidDocument }; self = .object(value)
    } else {
      let value = try container.decode([ThingDefinitionValue].self)
      guard value.count <= 4096 else { throw ThingModelFailure.invalidDocument }; self = .array(value)
    }
  }
  var arrayValue: [ThingDefinitionValue]? { if case let .array(value) = self { return value }; return nil }
  var objectValue: [String: ThingDefinitionValue]? { if case let .object(value) = self { return value }; return nil }
  var stringValue: String? { if case let .string(value) = self { return value }; return nil }
  func at(_ path: [String]) -> ThingDefinitionValue? {
    var value = self
    for key in path { guard case let .object(fields) = value, let next = fields[key] else { return nil }; value = next }
    return value
  }
}
struct ThingAttribute: Equatable, Sendable {
  let identifier: String
  let kind: ThingValueKind
  let access: ThingAccess
  let enumValues: [String]?
  let minimum: Int64?
  let maximum: Int64?
  let step: Int64?
  let unit: String?
  let issues: Set<ThingModelIssue>
  var writeConstraintStatus: WriteConstraintStatus {
    if !issues.isEmpty || kind == .unknown || access == .unknown { return .unknown }
    return access == .readOnly ? .readOnly : .complete
  }
  /// Pure raw value validation. A true result cannot publish: native business binding,
  /// device/account permission, unit semantics and live command ownership remain required.
  func acceptsWriteCandidate(_ value: Any?) -> Bool { ThingConstraintValidator.accepts(self, value: value) }
}
struct ThingServiceDefinition: Equatable, Sendable { let identifier: String; let definition: ThingDefinitionValue }
struct ThingEventDefinition: Equatable, Sendable { let identifier: String; let level: String?; let definition: ThingDefinitionValue }
struct PublishedThingModel: Equatable, Sendable {
  let identity: ThingModelIdentity
  let etag: String?
  let attributes: [ThingAttribute]
  let services: [ThingServiceDefinition]
  let events: [ThingEventDefinition]
  let servicesKnown: Bool
  let eventsKnown: Bool
  let issues: Set<ThingModelIssue>
  func attribute(_ identifier: String) -> ThingAttribute? {
    let values = attributes.filter { thingTextEqual($0.identifier, identifier) && !$0.issues.contains(.invalidIdentifier) }
    return values.count == 1 ? values.first : nil
  }
}

/// Match raw wire text; Swift's canonical Unicode equivalence must not create an enum alias.
func thingTextEqual(_ lhs: String, _ rhs: String) -> Bool { lhs.utf8.elementsEqual(rhs.utf8) }

import Foundation

/// V1.4 THING-01 data only; no HTTP envelope unwrapping or legacy wire aliases.
enum PublishedThingModelParser {
  static func parse(expected: ThingModelIdentity, source: ThingModelPayload) throws -> PublishedThingModel {
    guard validText(expected.productID), validText(expected.version), thingTextEqual(source.productID, expected.productID) else { throw ThingModelFailure.identityMismatch }
    let bytes = Data(source.dataJSON.utf8)
    guard bytes.count <= 512 * 1024 else { throw ThingModelFailure.invalidDocument }
    let root: ThingDefinitionValue
    do { try rejectDuplicateKeysAndDeepInput(bytes); root = try JSONDecoder().decode(ThingDefinitionValue.self, from: bytes) }
    catch { throw ThingModelFailure.invalidDocument }
    guard let body = root.objectValue, let version = body["version"]?.stringValue, validText(version) else { throw ThingModelFailure.invalidDocument }
    guard thingTextEqual(version, expected.version) else { throw ThingModelFailure.identityMismatch }
    guard let raw = body["attributes"]?.arrayValue else { throw ThingModelFailure.invalidDocument }
    var issues = Set<ThingModelIssue>()
    let items: [[String: ThingDefinitionValue]] = raw.map {
      guard let object = $0.objectValue else { issues.insert(.invalidDefinition); return [:] }; return object
    }
    var counts: [Data: Int] = [:]
    for item in items { if let id = item["identifier"]?.stringValue, validText(id) { counts[Data(id.utf8), default: 0] += 1 } }
    let attributes = items.map { item -> ThingAttribute in
      let value = parseAttribute(item, duplicate: counts[Data((item["identifier"]?.stringValue ?? "").utf8), default: 0] > 1)
      issues.formUnion(value.issues); return value
    }
    let serviceValues = definitions(body, key: "services", issues: &issues)
    let eventValues = definitions(body, key: "events", issues: &issues)
    let services = serviceValues.values.map { ThingServiceDefinition(identifier: $0.identifier, definition: $0.value) }
    let events = eventValues.values.map { ThingEventDefinition(identifier: $0.identifier, level: text($0.value.objectValue?["level"]), definition: $0.value) }
    return PublishedThingModel(identity: expected, etag: text(body["etag"]), attributes: attributes, services: services, events: events,
      servicesKnown: serviceValues.known, eventsKnown: eventValues.known, issues: issues)
  }
  private static func parseAttribute(_ item: [String: ThingDefinitionValue], duplicate: Bool) -> ThingAttribute {
    var issues = Set<ThingModelIssue>()
    let identifier = item["identifier"]?.stringValue ?? ""
    if !validText(identifier) { issues.insert(.invalidIdentifier) }
    if duplicate { issues.insert(.duplicateIdentifier) }
    if ["type", "writable", "values", "min", "max"].contains(where: { item[$0] != nil }) { issues.insert(.ambiguousFormat) }
    let kind: ThingValueKind
    switch item["dataType"]?.stringValue {
    case "boolean": kind = .boolean
    case "enum": kind = .enumeration
    case "integer": kind = .integer
    default: kind = .unknown; issues.insert(.unknownType)
    }
    let access: ThingAccess
    switch item["access"]?.stringValue {
    case "r": access = .readOnly
    case "rw": access = .readWrite
    default: access = .unknown; issues.insert(.unknownAccess)
    }
    let unit = text(item["unit"])
    if item["unit"] != nil && unit == nil { issues.insert(.invalidUnit) }
    var enumValues: [String]?
    var minimum: Int64?, maximum: Int64?, step: Int64?
    switch kind {
    case .enumeration:
      if item["range"] == nil { issues.insert(.missingEnum) }
      else if let range = item["range"]?.arrayValue, !range.isEmpty {
        let values = range.compactMap { text($0) }
        if values.count != range.count || Set(values.map { Data($0.utf8) }).count != values.count { issues.insert(.invalidEnum) }
        else { enumValues = values }
      } else { issues.insert(.invalidEnum) }
      if item["step"] != nil { issues.insert(.invalidStep) }
    case .integer:
      if item["range"] == nil { issues.insert(.missingRange) }
      else if let range = item["range"]?.arrayValue, range.count == 2,
              let low = integer(range[0]), let high = integer(range[1]), low <= high { minimum = low; maximum = high }
      else { issues.insert(.invalidRange) }
      if item["step"] == nil { issues.insert(.missingStep) }
      else if let value = integer(item["step"]), value > 0 { step = value }
      else { issues.insert(.invalidStep) }
      if item["unit"] == nil { issues.insert(.missingUnit) }
    case .boolean:
      if item["range"] != nil { issues.insert(.invalidRange) }
      if item["step"] != nil { issues.insert(.invalidStep) }
    case .unknown: break
    }
    return ThingAttribute(identifier: identifier, kind: kind, access: access, enumValues: enumValues,
      minimum: minimum, maximum: maximum, step: step, unit: unit, issues: issues)
  }
  private struct Definition { let identifier: String; let value: ThingDefinitionValue }
  private static func definitions(_ body: [String: ThingDefinitionValue], key: String, issues: inout Set<ThingModelIssue>) -> (values: [Definition], known: Bool) {
    guard let array = body[key]?.arrayValue else { issues.insert(.invalidCollection); return ([], false) }
    var values: [Definition] = []
    var seen = Set<Data>()
    var known = true
    for value in array {
      guard let object = value.objectValue, let id = text(object["identifier"]), seen.insert(Data(id.utf8)).inserted else {
        issues.insert(.invalidDefinition); known = false; continue
      }
      if key == "events", text(object["level"]) == nil { issues.insert(.invalidDefinition); known = false }
      values.append(Definition(identifier: id, value: value))
    }
    return (values, known)
  }
  private static func integer(_ value: ThingDefinitionValue?) -> Int64? {
    guard case let .number(value)? = value else { return nil }; return ThingConstraintValidator.safeDecimalInteger(value)
  }
  private static func text(_ value: ThingDefinitionValue?) -> String? {
    guard let string = value?.stringValue, validText(string) else { return nil }; return string
  }
  private static func validText(_ value: String) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.rangeOfCharacter(from: .controlCharacters) == nil }

  /// Foundation keyed decoding need not diagnose duplicate JSON keys. Reject them before
  /// decoding, including escaped equivalent keys; JSONDecoder validates the full grammar.
  private static func rejectDuplicateKeysAndDeepInput(_ data: Data) throws {
    struct Frame { var keys: Set<String>?; var expectingKey: Bool }
    let bytes = Array(data)
    var frames: [Frame] = [], index = 0
    while index < bytes.count {
      switch bytes[index] {
      case 123, 91:
        guard frames.count < 32 else { throw ThingModelFailure.invalidDocument }
        frames.append(Frame(keys: bytes[index] == 123 ? [] : nil, expectingKey: bytes[index] == 123)); index += 1
      case 125, 93:
        guard !frames.isEmpty else { throw ThingModelFailure.invalidDocument }; frames.removeLast(); index += 1
      case 44:
        if !frames.isEmpty, frames[frames.count - 1].keys != nil { frames[frames.count - 1].expectingKey = true }
        index += 1
      case 34:
        let start = index; index += 1
        var closed = false
        while index < bytes.count {
          if bytes[index] == 92 { index += 2 }
          else if bytes[index] == 34 { index += 1; closed = true; break }
          else { index += 1 }
        }
        guard closed else { throw ThingModelFailure.invalidDocument }
        if !frames.isEmpty, frames[frames.count - 1].expectingKey {
          let key = try JSONDecoder().decode(String.self, from: Data(bytes[start..<index]))
          var frame = frames.removeLast()
          guard var keys = frame.keys, keys.insert(key).inserted else { throw ThingModelFailure.invalidDocument }
          frame.keys = keys; frame.expectingKey = false; frames.append(frame)
        }
      case 45, 48...57:
        let start = index
        while index < bytes.count, ![9, 10, 13, 32, 44, 93, 125].contains(bytes[index]) { index += 1 }
        let token = String(decoding: bytes[start..<index], as: UTF8.self)
        guard let original = normalizedNumber(token),
              let decimal = Decimal(string: token, locale: Locale(identifier: "en_US_POSIX")), !decimal.isNaN,
              normalizedNumber(NSDecimalNumber(decimal: decimal).stringValue) == original else {
          throw ThingModelFailure.invalidDocument
        }
      default: index += 1
      }
    }
    guard frames.isEmpty else { throw ThingModelFailure.invalidDocument }
  }

  /// Decimal must preserve the complete numeric lexeme: reject precision loss before
  /// decoding can round a fractional range endpoint into an allowed integer.
  private static func normalizedNumber(_ token: String) -> String? {
    guard token.range(of: #"^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$"#, options: .regularExpression) != nil else { return nil }
    let parts = token.lowercased().split(separator: "e", omittingEmptySubsequences: false)
    let mantissa = String(parts[0])
    guard parts.count <= 2, let exponent = parts.count == 2 ? Int(parts[1]) : 0, exponent > -10_000, exponent < 10_000 else { return nil }
    let fraction = mantissa.split(separator: ".", omittingEmptySubsequences: false)
    let negative = mantissa.hasPrefix("-")
    var digits = String(mantissa.filter { $0 >= "0" && $0 <= "9" }.drop(while: { $0 == "0" }))
    if digits.isEmpty { return "0" }
    var power = exponent - (fraction.count == 2 ? fraction[1].count : 0)
    while digits.last == "0" { digits.removeLast(); power += 1 }
    return (negative ? "-" : "") + digits + "e" + String(power)
  }
}

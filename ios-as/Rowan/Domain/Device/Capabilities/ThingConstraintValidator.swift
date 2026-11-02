import Foundation
import CoreFoundation

/// Schema-only validation. No MQTT, capability registration, role lookup or profile generation.
enum ThingConstraintValidator {
  static func accepts(_ attribute: ThingAttribute, value: Any?) -> Bool {
    guard attribute.writeConstraintStatus == .complete else { return false }
    switch attribute.kind {
    case .boolean:
      guard let value = value as? NSNumber else { return false }
      return CFGetTypeID(value) == CFBooleanGetTypeID()
    case .enumeration:
      guard let value = value as? String else { return false }
      return attribute.enumValues?.contains(where: { thingTextEqual($0, value) }) == true
    case .integer:
      guard let number = safeInteger(value), let minimum = attribute.minimum, let maximum = attribute.maximum,
            let step = attribute.step, step > 0, number >= minimum, number <= maximum else { return false }
      // Both operands are within +/- JS safe integer; their difference fits Int64.
      // Integer subtraction/remainder cannot round a disallowed grid point into range.
      return (number - minimum) % step == 0
    case .unknown: return false
    }
  }
  static func safeInteger(_ raw: Any?) -> Int64? {
    guard let value = raw as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID(), value.doubleValue.isFinite,
          let decimal = Decimal(string: value.stringValue, locale: Locale(identifier: "en_US_POSIX")),
          let integer = safeDecimalInteger(decimal), Double(integer) == value.doubleValue else { return nil }
    return integer
  }
  static func safeDecimalInteger(_ value: Decimal) -> Int64? {
    let limit = Decimal(9_007_199_254_740_991 as Int64)
    guard !value.isNaN, value >= -limit, value <= limit else { return nil }
    var source = value, rounded = Decimal()
    NSDecimalRound(&rounded, &source, 0, .plain)
    guard rounded == value else { return nil }
    let integer = NSDecimalNumber(decimal: value).int64Value
    return Decimal(integer) == value ? integer : nil
  }
}

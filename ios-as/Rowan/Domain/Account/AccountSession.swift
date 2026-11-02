import Foundation

/// Preserves server settings, including nested wallpaper shapes and future fields, without Any in storage.
enum SettingValue: Codable, Equatable {
  case null, bool(Bool), number(Decimal), string(String), array([SettingValue]), object([String: SettingValue])

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if container.decodeNil() { self = .null }
    else if let value = try? container.decode(Bool.self) { self = .bool(value) }
    else if let value = try? container.decode(String.self) { self = .string(value) }
    else if let value = try? container.decode(Decimal.self) { self = .number(value) }
    else if let value = try? container.decode([String: SettingValue].self) { self = .object(value) }
    else { self = .array(try container.decode([SettingValue].self)) }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    switch self {
    case .null: try container.encodeNil()
    case let .bool(value): try container.encode(value)
    case let .number(value): try container.encode(value)
    case let .string(value): try container.encode(value)
    case let .array(value): try container.encode(value)
    case let .object(value): try container.encode(value)
    }
  }
}

struct AccountSettings: Codable, Equatable {
  let language: String?
  let notification: Bool?
  let theme: String?
  let wallpaper: SettingValue?
  let homeLayout: String?
  let temperatureUnit: String?
  let measurementSystem: String?
  private let fields: [String: SettingValue]
  var additionalFields: [String: SettingValue] { fields.filter { Keys(rawValue: $0.key) == nil } }

  private enum Keys: String, CodingKey, CaseIterable {
    case language, notification, theme, wallpaper, homeLayout, temperatureUnit, measurementSystem
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: Keys.self)
    // Known fields are a strict optional projection, not a reason to drop the raw
    // complete settings. Future/wrong known types remain in fields for re-encoding.
    language = try? container.decodeIfPresent(String.self, forKey: .language)
    notification = try? container.decodeIfPresent(Bool.self, forKey: .notification)
    theme = try? container.decodeIfPresent(String.self, forKey: .theme)
    wallpaper = try? container.decodeIfPresent(SettingValue.self, forKey: .wallpaper)
    homeLayout = try? container.decodeIfPresent(String.self, forKey: .homeLayout)
    temperatureUnit = try? container.decodeIfPresent(String.self, forKey: .temperatureUnit)
    measurementSystem = try? container.decodeIfPresent(String.self, forKey: .measurementSystem)
    fields = try decoder.singleValueContainer().decode([String: SettingValue].self)
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    try container.encode(fields)
  }
}

struct AccountSession: Codable, Equatable {
  let accessToken: String
  let refreshToken: String
  let userID: String
  /// V1.4 describes this as refresh-token lifetime in seconds; it is not an access-token deadline.
  let expiresIn: Int?
  let tokenType: String?
  let setting: AccountSettings?
}

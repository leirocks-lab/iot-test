import Foundation

enum PreferenceLanguage: String, CaseIterable { case zhCN = "zh-CN", zhTW = "zh-TW", en }
enum PreferenceTheme: String, CaseIterable { case system, light, dark }
enum TemperatureUnit: String { case celsius = "C", fahrenheit = "F" }
enum MeasurementSystem: String { case metric, imperial }

/// Complete USER-01 data retained as immutable JSON, independently of the strict projection.
/// Unknown enum values/fields remain raw; this is not another account/token owner.
struct UserPreferences: CustomStringConvertible, CustomDebugStringConvertible {
  let rawJSON: String
  private let fields: [String: SettingValue]
  var language: PreferenceLanguage? { string("language").flatMap(PreferenceLanguage.init(rawValue:)) }
  var notification: Bool? { if case let .bool(value)? = fields["notification"] { return value }; return nil }
  var theme: PreferenceTheme? { string("theme").flatMap(PreferenceTheme.init(rawValue:)) }
  var wallpaperID: String? {
    guard case let .object(object)? = fields["wallpaper"], case let .string(id)? = object["id"], validPreferenceText(id) else { return nil }; return id
  }
  var homeLayout: String? { string("homeLayout").flatMap { validPreferenceText($0) ? $0 : nil } }
  var temperatureUnit: TemperatureUnit? { string("temperatureUnit").flatMap(TemperatureUnit.init(rawValue:)) }
  var measurementSystem: MeasurementSystem? { string("measurementSystem").flatMap(MeasurementSystem.init(rawValue:)) }
  var description: String { "UserPreferences(settings omitted)" }
  var debugDescription: String { description }
  static func decode(_ rawJSON: String) throws -> UserPreferences {
    guard let data = rawJSON.data(using: .utf8), let fields = try? JSONDecoder().decode([String: SettingValue].self, from: data) else {
      throw RowanFailure(code: 502, message: "用户设置响应格式错误")
    }
    return UserPreferences(rawJSON: rawJSON, fields: fields)
  }
  private func string(_ key: String) -> String? { if case let .string(value)? = fields[key] { return value }; return nil }
}

/// nil omits a field; there is no generic setter, whole-read-model writeback or null clear.
struct PreferencesPatch {
  var language: PreferenceLanguage? = nil
  var notification: Bool? = nil
  var theme: PreferenceTheme? = nil
  var wallpaperID: String? = nil
  var homeLayout: String? = nil
  var temperatureUnit: TemperatureUnit? = nil
  var measurementSystem: MeasurementSystem? = nil
  func body() throws -> [String: Any] {
    var result: [String: Any] = [:]
    if let language { result["language"] = language.rawValue }
    if let notification { result["notification"] = notification }
    if let theme { result["theme"] = theme.rawValue }
    if let wallpaperID { result["wallpaper"] = try selection(wallpaperID) }
    if let homeLayout { result["homeLayout"] = try selection(homeLayout) }
    if let temperatureUnit { result["temperatureUnit"] = temperatureUnit.rawValue }
    if let measurementSystem { result["measurementSystem"] = measurementSystem.rawValue }
    guard !result.isEmpty else { throw RowanFailure(code: 400, message: "请选择需要修改的设置") }
    return result
  }
  func matches(_ actual: UserPreferences) throws -> Bool {
    _ = try body()
    return (language == nil || language == actual.language) && (notification == nil || notification == actual.notification)
      && (theme == nil || theme == actual.theme) && (wallpaperID == nil || wallpaperID == actual.wallpaperID)
      && (homeLayout == nil || homeLayout == actual.homeLayout) && (temperatureUnit == nil || temperatureUnit == actual.temperatureUnit)
      && (measurementSystem == nil || measurementSystem == actual.measurementSystem)
  }
  private func selection(_ value: String) throws -> String {
    guard validPreferenceText(value) else { throw RowanFailure(code: 400, message: "设置选项标识无效") }; return value
  }
}
private func validPreferenceText(_ value: String) -> Bool {
  !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.rangeOfCharacter(from: .controlCharacters) == nil
}

@MainActor
protocol PreferencesRepository {
  var expectedRevision: Int { get }
  func load() async throws -> UserPreferences
  /// USER-02 can return no settings data. Service performs a separate authoritative GET.
  func patch(_ patch: PreferencesPatch) async throws
}

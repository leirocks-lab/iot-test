import Foundation
import CoreFoundation

/// PAIR-01/02/03 are authenticated metadata reads. No category query, pairing or binding.
@MainActor
final class HTTPProductCatalog: ProductCatalogService {
  private let account: AccountService
  private let revision: Int
  private let brandID: String?
  init(account: AccountService, brandID: String?) { self.account = account; revision = account.revision; self.brandID = brandID }
  private func read(_ path: String) async throws -> Any {
    try Task.checkCancellation()
    guard account.session != nil, account.revision == revision else { throw RowanFailure(code: 499, message: "会话已变化，请重新进入添加设备") }
    let value = try await account.request("GET", path, expectedRevision: revision)
    try Task.checkCancellation()
    guard account.session != nil, account.revision == revision else { throw RowanFailure(code: 499, message: "会话已变化，请重新进入添加设备") }
    return value
  }
  func categories() async throws -> [ProductCategory] { try Self.decodeCategories(await read(Self.path("/api/app/products/category", brandID: brandID))) }
  func groups() async throws -> [ProductGroup] { try Self.decodeGroups(await read(Self.path("/api/app/products", brandID: brandID))) }
  func detail(id: String) async throws -> ProductDetails { try Self.decodeDetail(await read(Self.detailPath(id: id)), expectedID: id) }
  static func path(_ base: String, brandID: String?) throws -> String {
    guard let brandID else { return base }
    guard !brandID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, brandID.rangeOfCharacter(from: .controlCharacters) == nil else { throw malformed() }
    return base + "?brandId=" + encode(brandID)
  }
  static func detailPath(id: String) throws -> String { guard valid(id), id != ".", id != ".." else { throw malformed() }; return "/api/app/products/" + encode(id) + "?type=text" }
  private static func encode(_ value: String) -> String {
    let allowed = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".utf8)
    return value.utf8.map { allowed.contains($0) ? String(UnicodeScalar($0)) : String(format: "%%%02X", $0) }.joined()
  }
  static func decodeCategories(_ value: Any) throws -> [ProductCategory] {
    guard let rows = value as? [[String: Any]], rows.count <= 1000 else { throw malformed() }
    var seen = Set<String>()
    return try rows.map { row in
      let code = try required(row, "value"), name = try required(row, "name")
      guard seen.insert(code).inserted else { throw malformed() }
      return ProductCategory(value: code, name: name)
    }
  }
  static func decodeGroups(_ value: Any) throws -> [ProductGroup] {
    guard let rows = value as? [[String: Any]], rows.count <= 1000 else { throw malformed() }
    var categories = Set<String>(), ids = Set<String>()
    return try rows.map { row in
      let category = try required(row, "category")
      guard categories.insert(category).inserted, let names = row["categoryName"] as? [String: String],
            names.values.allSatisfy(valid), let products = row["products"] as? [[String: Any]], products.count <= 10_000 else { throw malformed() }
      return ProductGroup(category: category, names: names, products: try products.map { raw in
        let item = try product(raw)
        guard ids.insert(item.id).inserted else { throw malformed() }
        return item
      })
    }
  }
  static func decodeDetail(_ value: Any, expectedID: String) throws -> ProductDetails {
    guard let row = value as? [String: Any] else { throw malformed() }
    let item = try product(row)
    guard item.id == expectedID else { throw malformed() }
    let parameters: [ProductParameter]
    if let raw = row["parameters"], !(raw is NSNull) {
      if let object = raw as? [String: Any] {
        guard object.count <= 1000 else { throw malformed() }
        parameters = try object.keys.sorted().map { key in
          guard let value = object[key] else { throw malformed() }
          return ProductParameter(key: key, value: try parameterValue(value, depth: 0))
        }
      } else if let array = raw as? [[String: Any]], array.count <= 1000 {
        parameters = try array.map { value in
          guard let rawValue = value["value"] else { throw malformed() }
          return ProductParameter(key: try required(value, "key"), value: try parameterValue(rawValue, depth: 0))
        }
      } else { throw malformed() }
    } else { parameters = [] }
    return try ProductDetails(product: item, category: optional(row, "category"), introduction: optional(row, "introduction", allowEmpty: true), parameters: parameters, bluetooth: boolean(row, "bluetooth"))
  }
  private static func product(_ row: [String: Any]) throws -> CatalogProduct {
    var sort: Double?
    if let raw = row["sort"], !(raw is NSNull) {
      guard let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.isFinite else { throw malformed() }
      sort = number.doubleValue
    }
    return try CatalogProduct(id: required(row, "id"), name: optional(row, "name"), modelName: optional(row, "modelName"),
      seriesName: optional(row, "seriesName"), images: strings(row, "image"), configTypes: strings(row, "configType"),
      connectType: optional(row, "connectType"), cloudPlatform: optional(row, "cloudPlatform"), recommended: boolean(row, "recommended"), sort: sort, buyLink: optional(row, "buyLink"))
  }
  private static func parameterValue(_ value: Any, depth: Int) throws -> ProductParameterValue {
    guard depth < 16 else { throw malformed() }
    if value is NSNull { return .null }
    if let value = value as? String { return .text(value) }
    if let value = value as? NSNumber {
      if CFGetTypeID(value) == CFBooleanGetTypeID() { return .bool(value.boolValue) }
      guard value.doubleValue.isFinite else { throw malformed() }; return .number(value.doubleValue)
    }
    if let value = value as? [Any], value.count <= 1000 { return .array(try value.map { try parameterValue($0, depth: depth + 1) }) }
    if let value = value as? [String: Any], value.count <= 1000 { return .object(try value.mapValues { try parameterValue($0, depth: depth + 1) }) }
    throw malformed()
  }
  private static func valid(_ value: String) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.rangeOfCharacter(from: .controlCharacters) == nil }
  private static func required(_ row: [String: Any], _ key: String) throws -> String {
    guard let value = row[key] as? String, valid(value) else { throw malformed() }; return value
  }
  private static func optional(_ row: [String: Any], _ key: String, allowEmpty: Bool = false) throws -> String? {
    guard let raw = row[key], !(raw is NSNull) else { return nil }
    guard let value = raw as? String else { throw malformed() }
    if !allowEmpty && value.isEmpty { return nil }
    guard allowEmpty || valid(value) else { throw malformed() }; return value
  }
  private static func strings(_ row: [String: Any], _ key: String) throws -> [String] {
    guard let raw = row[key], !(raw is NSNull) else { return [] }
    if let value = raw as? String { if value.isEmpty { return [] }; guard valid(value) else { throw malformed() }; return [value] }
    guard let value = raw as? [String], value.count <= 1000, value.allSatisfy(valid) else { throw malformed() }; return value
  }
  private static func boolean(_ row: [String: Any], _ key: String) throws -> Bool? {
    guard let raw = row[key], !(raw is NSNull) else { return nil }
    guard let value = raw as? NSNumber, CFGetTypeID(value) == CFBooleanGetTypeID() else { throw malformed() }; return value.boolValue
  }
  private static func malformed() -> RowanFailure { RowanFailure(code: 502, message: "产品目录响应格式不完整，请重试") }
}

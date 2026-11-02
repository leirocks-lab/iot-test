import Foundation

struct ProductCategory: Equatable { let value: String; let name: String }
struct CatalogProduct: Equatable {
  let id: String
  let name: String?
  let modelName: String?
  let seriesName: String?
  let images: [String]
  let configTypes: [String]
  let connectType: String?
  let cloudPlatform: String?
  let recommended: Bool?
  let sort: Double?
  let buyLink: String?
  var displayName: String { name ?? modelName ?? id }
}
struct ProductGroup: Equatable {
  let category: String
  let names: [String: String]
  let products: [CatalogProduct]
  func localizedName(language: String) -> String { names[language] ?? names["en"] ?? names.keys.sorted().compactMap { names[$0] }.first ?? category }
  var sortedProducts: [CatalogProduct] {
    products.enumerated().sorted { lhs, rhs in
      switch (lhs.element.sort, rhs.element.sort) {
      case let (a?, b?) where a != b: return a < b
      case (_?, nil): return true
      case (nil, _?): return false
      default: return lhs.offset < rhs.offset
      }
    }.map { $0.element }
  }
}
indirect enum ProductParameterValue: Equatable {
  case text(String), number(Double), bool(Bool), null, array([ProductParameterValue]), object([String: ProductParameterValue])
  var displayText: String {
    switch self {
    case let .text(value): return value
    case let .number(value): return String(format: "%g", value)
    case let .bool(value): return value ? "true" : "false"
    case .null: return "null"
    case let .array(values): return "[" + values.map(\.displayText).joined(separator: ", ") + "]"
    case let .object(values): return "{" + values.keys.sorted().map { "\($0): \(values[$0]?.displayText ?? "null")" }.joined(separator: ", ") + "}"
    }
  }
}
struct ProductParameter: Equatable { let key: String; let value: ProductParameterValue }
struct ProductDetails: Equatable {
  let product: CatalogProduct
  let category: String?
  let introduction: String?
  let parameters: [ProductParameter]
  let bluetooth: Bool?
}
@MainActor
protocol ProductCatalogService {
  func categories() async throws -> [ProductCategory]
  func groups() async throws -> [ProductGroup]
  func detail(id: String) async throws -> ProductDetails
}

enum ProductLink {
  /// External content is opened only after a user gesture, without native account headers.
  static func url(_ text: String?) -> URL? {
    guard let text, text.rangeOfCharacter(from: .controlCharacters) == nil,
          let components = URLComponents(string: text), components.scheme?.lowercased() == "https",
          let host = components.host, !host.isEmpty, components.user == nil, components.password == nil,
          let url = components.url else { return nil }
    return url
  }
}

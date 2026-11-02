import Foundation

enum AgreementKind: String, CaseIterable, Hashable {
  case privacy, serviceTerms
  var title: String { self == .privacy ? "隐私政策" : "用户协议" }
}

struct AgreementContext: Equatable {
  let regionCode: String?
  let brandID: String?

  init(regionCode: String?, brandID: String?) throws {
    if let regionCode,
       !Locale.isoRegionCodes.contains(regionCode) {
      throw RowanFailure(code: 400, message: "请选择有效国家或地区")
    }
    if let brandID,
       brandID.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) == nil {
      throw RowanFailure(code: 400, message: "品牌配置无效")
    }
    self.regionCode = regionCode
    self.brandID = brandID
  }

  func path(for kind: AgreementKind) -> String {
    var components = URLComponents()
    components.path = "/api/app/\(kind.rawValue)"
    var query = [URLQueryItem(name: "type", value: "text")]
    if let regionCode { query.append(URLQueryItem(name: "regionCode", value: regionCode)) }
    if let brandID { query.append(URLQueryItem(name: "brandId", value: brandID)) }
    components.queryItems = query
    return components.percentEncodedPath + "?" + (components.percentEncodedQuery ?? "")
  }
}

@MainActor
protocol AgreementContentService {
  func load(_ kind: AgreementKind, context: AgreementContext) async throws -> String
}

/// Counts only foreground-visible reading time. Completion also requires an actual bottom scroll.
struct AgreementReadingGate {
  let requiredSeconds: TimeInterval
  private(set) var elapsedSeconds: TimeInterval = 0
  private(set) var scrolledToBottom = false
  var remainingSeconds: Int { max(0, Int(ceil(requiredSeconds - elapsedSeconds))) }
  var canFinish: Bool { elapsedSeconds >= requiredSeconds && scrolledToBottom }
  mutating func advance(by seconds: TimeInterval) { elapsedSeconds += max(0, seconds) }
  mutating func markBottomReached() { scrolledToBottom = true }
}

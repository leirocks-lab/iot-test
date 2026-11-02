import Foundation

@MainActor
final class HTTPAgreementContentService: AgreementContentService {
  private let http: any HTTPGateway
  init(http: any HTTPGateway) { self.http = http }

  func load(_ kind: AgreementKind, context: AgreementContext) async throws -> String {
    let value = try await http.request("GET", context.path(for: kind))
    try Task.checkCancellation()
    guard let data = value as? [String: Any], data["type"] as? String == "text",
          let content = data["content"] as? String,
          !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw RowanFailure(code: 502, message: "服务未返回可阅读的协议文本，请重试")
    }
    return content
  }
}

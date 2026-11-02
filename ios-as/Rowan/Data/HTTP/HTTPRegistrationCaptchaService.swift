import Foundation

@MainActor
final class HTTPRegistrationCaptchaService: RegistrationCaptchaService {
  private let http: any HTTPGateway
  init(http: any HTTPGateway) { self.http = http }
  func sendCode(email: String) async throws {
    guard RecoveryInput.validEmail(email) else { throw RowanFailure(code: 400, message: "请输入有效邮箱") }
    _ = try await http.request("GET", path("/api/app/captcha", email: email, sending: true))
  }
  func verifyCode(email: String, code: String) async throws {
    guard RecoveryInput.validEmail(email), RecoveryInput.validCode(code) else { throw RowanFailure(code: 400, message: "请输入有效邮箱和6位数字验证码") }
    _ = try await http.request("GET", path("/api/app/captcha/\(code)", email: email, sending: false))
  }
  private func path(_ path: String, email: String, sending: Bool) -> String {
    var components = URLComponents()
    components.path = path
    var query = [URLQueryItem(name: "account", value: email), URLQueryItem(name: "accountType", value: "email")]
    if sending { query.append(URLQueryItem(name: "captchaType", value: "register")) }
    components.queryItems = query
    return components.percentEncodedPath + "?" + (components.percentEncodedQuery ?? "").replacingOccurrences(of: "+", with: "%2B")
  }
}

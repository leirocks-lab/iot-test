import Foundation

@MainActor
final class HTTPPasswordRecoveryService: PasswordRecoveryService {
  private let http: any HTTPGateway
  init(http: any HTTPGateway) { self.http = http }
  func sendCode(email: String) async throws {
    guard RecoveryInput.validEmail(email) else { throw RowanFailure(code: 400, message: "请输入有效邮箱") }
    _ = try await http.request("GET", path("/api/app/captcha", email: email, extra: [URLQueryItem(name: "captchaType", value: "forget")]))
  }
  func verifyCode(email: String, code: String) async throws {
    guard RecoveryInput.validEmail(email), RecoveryInput.validCode(code) else { throw RowanFailure(code: 400, message: "请输入有效邮箱和6位数字验证码") }
    _ = try await http.request("GET", path("/api/app/captcha/\(code)", email: email))
  }
  func resetPassword(email: String, code: String, password: String) async throws {
    guard RecoveryInput.validEmail(email), RecoveryInput.validCode(code), RecoveryInput.validPassword(password) else {
      throw RowanFailure(code: 400, message: "邮箱、验证码或新密码格式不正确")
    }
    // AUTH-07 uses captcha; V1.4 only recommends a future verificationToken for AUTH-02.
    _ = try await http.request("PATCH", "/api/app/user/password", body: ["account": email, "captcha": code, "password": password])
  }
  private func path(_ path: String, email: String, extra: [URLQueryItem] = []) -> String {
    var components = URLComponents()
    components.path = path
    components.queryItems = [URLQueryItem(name: "account", value: email), URLQueryItem(name: "accountType", value: "email")] + extra
    // A plus in an email address is data, not form-query whitespace.
    return components.percentEncodedPath + "?" + (components.percentEncodedQuery ?? "").replacingOccurrences(of: "+", with: "%2B")
  }
}

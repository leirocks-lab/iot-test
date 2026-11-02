import Foundation

@MainActor
final class HTTPEmailLoginCodeService: EmailLoginCodeService {
  private let http: any HTTPGateway
  private let cooldowns: PasswordRecoveryCooldowns
  init(http: any HTTPGateway, cooldowns: PasswordRecoveryCooldowns) { self.http = http; self.cooldowns = cooldowns }
  func remaining(email: String) -> Int { cooldowns.remaining(for: email, purpose: .login) }
  func pending(email: String) -> Bool { cooldowns.pendingSend(for: email, purpose: .login) }
  func sendCode(email: String) async throws {
    try Task.checkCancellation()
    guard RecoveryInput.validEmail(email) else { throw RowanFailure(code: 400, message: "请输入有效邮箱") }
    guard let permit = cooldowns.beginSend(for: email, purpose: .login) else { throw RowanFailure(code: 429, message: "请等待倒计时后重发") }
    defer { cooldowns.finishSend(for: email, purpose: .login, permit: permit) }
    var components = URLComponents(); components.path = "/api/app/captcha"
    components.queryItems = [URLQueryItem(name: "account", value: email), URLQueryItem(name: "accountType", value: "email"), URLQueryItem(name: "captchaType", value: "login")]
    let path = components.percentEncodedPath + "?" + (components.percentEncodedQuery ?? "").replacingOccurrences(of: "+", with: "%2B")
    _ = try await http.request("GET", path)
    // A late successful physical send still reserves its original email/purpose, never a new input.
    cooldowns.reserve(for: email, purpose: .login)
    try Task.checkCancellation()
  }
}

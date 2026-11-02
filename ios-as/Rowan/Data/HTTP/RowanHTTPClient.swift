import Foundation

private final class RejectRedirects: NSObject, URLSessionTaskDelegate {
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                  newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
    completionHandler(nil)
  }
}

final class RowanHTTPClient: HTTPGateway {
  private let platform: String
  private let iot: String
  private let tenant: String
  private let session: URLSession
  init(bundle: Bundle = .main) {
    platform = bundle.object(forInfoDictionaryKey: "RowanPlatformURL") as? String ?? ""
    iot = bundle.object(forInfoDictionaryKey: "RowanIoTURL") as? String ?? ""
    tenant = bundle.object(forInfoDictionaryKey: "RowanTenantID") as? String ?? ""
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 20
    configuration.timeoutIntervalForResource = 30
    session = URLSession(configuration: configuration, delegate: RejectRedirects(), delegateQueue: nil)
  }

  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    guard path.hasPrefix("/api/app/"), tenant.range(of: "^[0-9]+$", options: .regularExpression) != nil else {
      throw RowanFailure(code: 400, message: "请配置服务地址及租户")
    }
    let useIoT = Self.usesIoTBackend(for: path)
    let root = useIoT ? iot : platform
    guard let rootURL = URLComponents(string: root), rootURL.scheme == "https", rootURL.host != nil,
          rootURL.user == nil, rootURL.password == nil, rootURL.query == nil, rootURL.fragment == nil,
          let url = URL(string: root.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/app-api/" + String(path.dropFirst("/api/app/".count))) else {
      throw RowanFailure(code: 400, message: "服务地址必须为有效 HTTPS 地址")
    }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("zh-CN", forHTTPHeaderField: "Accept-Language")
    request.setValue(tenant, forHTTPHeaderField: "tenant-id")
    if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    if let body {
      request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
    }
    let (data, response) = try await session.data(for: request)
    guard let response = response as? HTTPURLResponse,
          let envelope = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let code = envelope["code"] as? Int else {
      throw RowanFailure(code: 502, message: "服务响应格式错误")
    }
    guard (200..<300).contains(response.statusCode), code == 0, envelope["success"] as? Bool != false else {
      let safeMessage: String
      switch code {
      case 401: safeMessage = "登录已失效"
      case 403: safeMessage = "没有操作权限"
      case 1183, 1184: safeMessage = "账号或密码错误"
      case 1011: safeMessage = "暂未提供隐私政策，请稍后重试"
      case 1021: safeMessage = "暂未提供用户协议，请稍后重试"
      case 1141: safeMessage = "发送过于频繁，请稍后重试"
      case 1142: safeMessage = "验证码发送次数已达限制，请稍后重试"
      case 1143: safeMessage = "验证码发送失败，请稍后重试"
      case 1151, 1212: safeMessage = "验证码已过期，请重新获取"
      case 1152, 1213: safeMessage = "验证码错误，请重新输入"
      case 1211: safeMessage = "无法重置，请核对邮箱或稍后重试"
      case 1214: safeMessage = "新密码不能与旧密码相同"
      case 1161: safeMessage = "注册验证码已过期，请重新获取"
      case 1162: safeMessage = "注册验证码错误，请重新输入"
      case 1163, 1144: safeMessage = "无法注册，请核对邮箱或尝试登录"
      default: safeMessage = "请求失败，请重试（\(code)）"
      }
      throw RowanFailure(code: code == 0 ? response.statusCode : code, message: safeMessage)
    }
    return envelope["data"] ?? NSNull()
  }

  static func usesIoTBackend(for resource: String) -> Bool {
    // Select from the resource path only. Query delimiters and query values cannot change service ownership.
    let path = URLComponents(string: resource)?.path ?? resource
    return path.range(of: "^/api/app/(devices?|products?|plugins?|user/(locations|device-shares))(/|$)", options: .regularExpression) != nil
  }
}

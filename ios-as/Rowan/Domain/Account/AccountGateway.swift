import Foundation

struct RowanFailure: LocalizedError {
  let code: Int
  let message: String
  var errorDescription: String? { message }
}

protocol HTTPGateway {
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any
}
extension HTTPGateway {
  func request(_ method: String, _ path: String, body: [String: Any]? = nil, token: String? = nil) async throws -> Any {
    try await perform(method, path, body: body, token: token)
  }
}
/// Completion is the backend-operation barrier. Never return/throw early on caller
/// cancellation while an enqueued write may still finish later. AccountService owns
/// acceptance, revision checks and compensating deletion after that barrier.
protocol SessionStorage: Sendable {
  func read() async throws -> Data?
  func write(_ data: Data?) async throws
}

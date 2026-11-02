import Foundation

enum MQTTWebSocketFrame { case data(Data), text(String) }
enum MQTTWebSocketTransportEvent { case opened(String?), closed, failed }
/// Injectable, single-use suspended task boundary. Production implementation is ephemeral URLSession.
protocol MQTTWebSocketTransport: AnyObject {
  var onEvent: ((MQTTWebSocketTransportEvent) -> Void)? { get set }
  func connect()
  func write(_ data: Data, completion: @escaping (MQTTBrokerFailure?) -> Void)
  func receive(_ completion: @escaping (Result<MQTTWebSocketFrame, MQTTBrokerFailure>) -> Void)
  func cancel()
}

/// Preparation does not resume a network task; the exact SDK connection bridge owns connect/cancel.
final class PreparedMQTTWebSocket: MQTTRedacted, MQTTWebSocketTransport {
  let request: URLRequest
  let configuration: URLSessionConfiguration
  private let session: URLSession
  private let task: URLSessionWebSocketTask
  private let delegate: MQTTWebSocketSessionDelegate
  private let lock = NSLock()
  private var sink: ((MQTTWebSocketTransportEvent) -> Void)?
  var onEvent: ((MQTTWebSocketTransportEvent) -> Void)? {
    get { lock.lock(); defer { lock.unlock() }; return sink }
    set { lock.lock(); sink = newValue; lock.unlock() }
  }
  fileprivate init(request: URLRequest, configuration: URLSessionConfiguration) {
    self.request = request; self.configuration = configuration
    delegate = MQTTWebSocketSessionDelegate()
    let queue = OperationQueue(); queue.maxConcurrentOperationCount = 1; queue.name = "rowan.mqtt.wss"
    session = URLSession(configuration: configuration, delegate: delegate, delegateQueue: queue)
    task = session.webSocketTask(with: request)
    task.maximumMessageSize = 1_048_576
    delegate.event = { [weak self] event in self?.onEvent?(event) }
  }
  func connect() { task.resume() }
  func write(_ data: Data, completion: @escaping (MQTTBrokerFailure?) -> Void) {
    task.send(.data(data)) { error in completion(error == nil ? nil : .transportFailed) }
  }
  func receive(_ completion: @escaping (Result<MQTTWebSocketFrame, MQTTBrokerFailure>) -> Void) {
    task.receive { result in
      switch result {
      case let .success(message):
        switch message {
        case let .data(data): completion(.success(.data(data)))
        case let .string(value): completion(.success(.text(value)))
        @unknown default: completion(.failure(.transportFailed))
        }
      case .failure: completion(.failure(.transportFailed))
      }
    }
  }
  func cancel() { onEvent = nil; task.cancel(with: .goingAway, reason: nil); session.invalidateAndCancel() }
  deinit { task.cancel(with: .goingAway, reason: nil); session.invalidateAndCancel() }
}

enum ControlledMQTTWebSocketFactory {
  static func prepare(_ parameters: MQTTConnectionParameters, hostPolicy: MQTTTransportHostPolicy,
                      now: Date = Date()) throws -> PreparedMQTTWebSocket {
    try hostPolicy.validate(parameters, now: now)
    // Keep the entire signed URL, including order/encoding/token. No rebuilding or ambient headers.
    var request = parameters.withURL { URLRequest(url: $0) }
    request.timeoutInterval = 20; request.cachePolicy = .reloadIgnoringLocalCacheData
    request.setValue("mqtt", forHTTPHeaderField: "Sec-WebSocket-Protocol")
    request.setValue(parameters.httpHostHeader, forHTTPHeaderField: "Host")
    let configuration = URLSessionConfiguration.ephemeral
    configuration.httpShouldSetCookies = false; configuration.httpCookieAcceptPolicy = .never
    configuration.httpCookieStorage = nil; configuration.urlCredentialStorage = nil; configuration.urlCache = nil
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    configuration.timeoutIntervalForRequest = 20; configuration.timeoutIntervalForResource = 30
    configuration.httpAdditionalHeaders = [:]
    return PreparedMQTTWebSocket(request: request, configuration: configuration)
  }
}

/// Platform default certificate/hostname validation only, including task-level challenges.
private final class MQTTWebSocketSessionDelegate: NSObject, URLSessionTaskDelegate, URLSessionWebSocketDelegate {
  var event: ((MQTTWebSocketTransportEvent) -> Void)?
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                  newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
  private func challenge(_ challenge: URLAuthenticationChallenge,
                         completion: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust { completion(.performDefaultHandling, nil) }
    else { completion(.cancelAuthenticationChallenge, nil) }
  }
  func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) { self.challenge(challenge, completion: completionHandler) }
  func urlSession(_ session: URLSession, task: URLSessionTask, didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) { self.challenge(challenge, completion: completionHandler) }
  func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocolName: String?) { event?(.opened(protocolName)) }
  func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) { event?(.closed) }
  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) { if error != nil { event?(.failed) } }
}

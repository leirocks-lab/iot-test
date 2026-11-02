import Foundation
import CocoaMQTT

/// Matches Source/WebSocket/CocoaMQTTWebSocket.swift at exact tag 2.4.1.
/// Builder accepts only the original signed URI and no SDK/default ambient headers.
struct ControlledMQTTWebSocketBuilder: CocoaMQTTWebSocketConnectionBuilder, MQTTRedacted {
  private let parameters: MQTTConnectionParameters
  private let hostPolicy: MQTTTransportHostPolicy
  private let now: () -> Date
  private let makeTransport: (MQTTConnectionParameters, MQTTTransportHostPolicy, Date) throws -> MQTTWebSocketTransport
  init(parameters: MQTTConnectionParameters, hostPolicy: MQTTTransportHostPolicy, now: @escaping () -> Date = Date.init,
       makeTransport: @escaping (MQTTConnectionParameters, MQTTTransportHostPolicy, Date) throws -> MQTTWebSocketTransport = {
         try ControlledMQTTWebSocketFactory.prepare($0, hostPolicy: $1, now: $2)
       }) {
    self.parameters = parameters; self.hostPolicy = hostPolicy; self.now = now; self.makeTransport = makeTransport
  }
  func buildConnection(forURL url: URL, withHeaders headers: [String: String]) throws -> CocoaMQTTWebSocketConnection {
    try hostPolicy.validate(parameters, now: now())
    guard headers.isEmpty, parameters.withURL({ $0.absoluteString.utf8.elementsEqual(url.absoluteString.utf8) }) else {
      throw MQTTBrokerFailure.invalidConfiguration
    }
    return ControlledMQTTWebSocketConnection(transport: try makeTransport(parameters, hostPolicy, now()))
  }
}

extension ControlledMQTTWebSocketFactory {
  static func socket(_ parameters: MQTTConnectionParameters, hostPolicy: MQTTTransportHostPolicy,
                     now: @escaping () -> Date = Date.init) throws -> CocoaMQTTSocketProtocol {
    try hostPolicy.validate(parameters, now: now())
    let builder = ControlledMQTTWebSocketBuilder(parameters: parameters, hostPolicy: hostPolicy, now: now)
    let socket = CocoaMQTTWebSocket(uri: parameters.withURL { $0.absoluteString }, builder: builder)
    socket.shouldConnectWithURIOnly = true; socket.enableSSL = true; socket.headers = [:]
    socket.usesSystemTrustStore = true; socket.manuallyEvaluateTrust = false
    return socket
  }
}

/// SDK callback delivery follows its assigned queue; task/state work stays on a private serial queue.
/// No reconnect, client identity, trust override, raw error forwarding, logs or fallback transport.
final class ControlledMQTTWebSocketConnection: NSObject, CocoaMQTTWebSocketConnection {
  weak var delegate: CocoaMQTTWebSocketConnectionDelegate?
  var queue = DispatchQueue(label: "rowan.mqtt.wss.callbacks")
  private let worker = DispatchQueue(label: "rowan.mqtt.wss.connection")
  private let lifecycle = NSLock()
  private var started = false
  private var closed = false
  private var opened = false // worker only
  private var pending: [UUID: (Error?) -> Void] = [:] // worker only
  private let transport: MQTTWebSocketTransport
  private let maximumMessageSize = 1_048_576
  init(transport: MQTTWebSocketTransport) { self.transport = transport; super.init() }
  private func alive() -> Bool { lifecycle.lock(); defer { lifecycle.unlock() }; return !closed }
  private func begin() -> Bool {
    lifecycle.lock(); defer { lifecycle.unlock() }
    guard !started, !closed else { return false }; started = true; return true
  }
  private func stop() -> Bool {
    lifecycle.lock(); defer { lifecycle.unlock() }
    guard !closed else { return false }; closed = true; return true
  }
  func connect() {
    guard begin() else { return }
    worker.async { [self] in
      guard alive() else { return }
      transport.onEvent = { [weak self] event in self?.worker.async { self?.receive(event) } }
      transport.connect()
    }
  }
  func disconnect() {
    // Close admission synchronously: an already queued open/read cannot resurrect a cancelled socket.
    guard stop() else { return }
    worker.async { [self] in cleanup(error: .retired, notify: false) }
  }
  func write(data: Data, handler: @escaping (Error?) -> Void) {
    worker.async { [self] in
      guard alive(), opened, data.count <= maximumMessageSize, pending.count < 64 else {
        queue.async { handler(MQTTBrokerFailure.offline) }; return
      }
      let operation = UUID(); pending[operation] = handler
      transport.write(data) { [weak self] error in
        self?.worker.async {
          guard let self, let handler = self.pending.removeValue(forKey: operation) else { return }
          self.queue.async { handler(error) }
          if let error { self.fail(error) }
        }
      }
    }
  }
  private func receive(_ event: MQTTWebSocketTransportEvent) {
    guard alive() else { return }
    switch event {
    case let .opened(protocolName):
      guard !opened, protocolName == "mqtt" else { fail(.transportFailed); return }
      opened = true
      queue.async { [weak self] in
        guard let self, self.alive() else { return }; self.delegate?.connectionOpened(self)
        self.worker.async { self.readNext() }
      }
    case .closed, .failed: fail(.transportFailed)
    }
  }
  private func readNext() {
    guard alive(), opened else { return }
    transport.receive { [weak self] result in
      self?.worker.async {
        guard let self, self.alive() else { return }
        switch result {
        case let .failure(error): self.fail(error)
        case let .success(frame):
          let size: Int
          switch frame { case let .data(value): size = value.count; case let .text(value): size = value.utf8.count }
          guard size <= self.maximumMessageSize else { self.fail(.transportFailed); return }
          self.queue.async { [weak self] in
            guard let self, self.alive() else { return }
            switch frame {
            case let .data(data): self.delegate?.connection(self, receivedData: data)
            case let .text(text): self.delegate?.connection(self, receivedString: text)
            }
            // At most one read callback in flight to the SDK's socket queue.
            self.worker.async { self.readNext() }
          }
        }
      }
    }
  }
  private func fail(_ error: MQTTBrokerFailure) {
    guard stop() else { return }; cleanup(error: error, notify: true)
  }
  private func cleanup(error: MQTTBrokerFailure, notify: Bool) {
    opened = false; transport.onEvent = nil; transport.cancel()
    let callbacks = Array(pending.values); pending.removeAll()
    for callback in callbacks { queue.async { callback(error) } }
    if notify { queue.async { [weak self] in guard let self else { return }; self.delegate?.connectionClosed(self, withError: error, withCode: nil) } }
  }
  deinit { transport.onEvent = nil; transport.cancel() }
}

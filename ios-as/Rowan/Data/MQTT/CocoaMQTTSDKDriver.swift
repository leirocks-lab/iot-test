import Foundation
import CocoaMQTT

/// Exact CocoaMQTT 2.4.1 Core + reviewed WSS protocol. Native Host policy remains unknown by default.
@MainActor
final class CocoaMQTTSDKDriver: MQTTSDKDriver {
  typealias SocketFactory = (MQTTConnectionParameters) throws -> CocoaMQTTSocketProtocol
  var onEvent: ((MQTTDriverEvent) -> Void)? {
    didSet {
      delivery.setSink(onEvent)
      if onEvent == nil { state.setSink(nil) }
      else { state.setSink { [delivery] event in delivery.submit(event) } }
    }
  }
  private let delivery = MQTTDriverDelivery()
  private let state: CocoaMQTTDriverState
  init(hostPolicy: MQTTTransportHostPolicy = .unknown, now: @escaping () -> Date = Date.init, socketFactory: SocketFactory? = nil) {
    state = CocoaMQTTDriverState(socketFactory: socketFactory ?? { parameters in
      try ControlledMQTTWebSocketFactory.socket(parameters, hostPolicy: hostPolicy, now: now)
    })
  }
  func start(_ parameters: MQTTConnectionParameters, configuration: MQTTDriverConfiguration) { state.start(parameters, configuration: configuration) }
  func subscribe(_ topics: [String]) { state.subscribe(topics) }
  func unsubscribe(_ topics: [String]) { state.unsubscribe(topics) }
  func publish(operation: UUID, topic: String, payload: Data) { state.publish(operation: operation, topic: topic, payload: payload) }
  func close() { delivery.setSink(nil); state.setSink(nil); state.close() }
}

/// All SDK construction, UserDefaults session access, connect, writes and destruction stay off UI.
private final class CocoaMQTTDriverState {
  private let queue = DispatchQueue(label: "rowan.mqtt.sdk")
  private let lock = NSLock()
  private var sink: ((MQTTDriverEvent) -> Void)?
  private let socketFactory: CocoaMQTTSDKDriver.SocketFactory
  private var client: CocoaMQTT?
  private var socket: CocoaMQTTSocketProtocol?
  private var used = false
  private var connected = false
  private var retired = false

  init(socketFactory: @escaping CocoaMQTTSDKDriver.SocketFactory) { self.socketFactory = socketFactory }
  func setSink(_ sink: ((MQTTDriverEvent) -> Void)?) { lock.lock(); self.sink = sink; lock.unlock() }
  private func emit(_ event: MQTTDriverEvent) { lock.lock(); let currentSink = self.sink; lock.unlock(); currentSink?(event) }

  func start(_ parameters: MQTTConnectionParameters, configuration: MQTTDriverConfiguration) {
    queue.async { [self] in
      guard !used, !retired, configuration.cleanSession, !configuration.autoReconnect, !configuration.loggingEnabled else { emit(.failed(.retired)); return }
      used = true
      do {
        let socket = try socketFactory(parameters)
        let host = try parameters.withURL { url -> String in
          guard let host = url.host else { throw MQTTBrokerFailure.invalidConfiguration }; return host
        }
        let client = CocoaMQTT(clientID: parameters.clientID, host: host, port: 443, socket: socket)
        self.socket = socket; self.client = client
        client.cleanSession = true; client.autoReconnect = false; client.logLevel = .off
        client.delegateQueue = queue; client.enableSSL = true
        client.usesSystemTrustStore = true; client.manuallyEvaluateTrust = false
        client.tlsServerName = host
        switch parameters.authentication {
        case .none: client.username = nil; client.password = nil
        case let .usernamePassword(username, password):
          username.withValue { client.username = $0 }; password.withValue { client.password = $0 }
        }
        client.didConnectAck = { [weak self] _, ack in
          guard let self, !self.retired else { return }
          // 2.4.1 exposes the MQTT 3.1.1 return code as UInt8 rawValue (0 = accepted).
          if ack.rawValue == 4 || ack.rawValue == 5 { self.emit(.failed(.authorization)); return }
          self.connected = ack.rawValue == 0; self.emit(.connack(accepted: self.connected))
        }
        client.didSubscribeTopics = { [weak self] _, granted, failed in
          guard let self, !self.retired else { return }
          var result: [String: Int] = [:]
          for (key, value) in granted {
            guard let key = key as? String, let value = value as? NSNumber else { self.emit(.failed(.subscriptionRejected)); return }
            result[key] = value.intValue
          }
          self.emit(.suback(granted: result, failed: failed))
        }
        client.didPublishAck = { [weak self] _, packetID in
          guard let self, !self.retired else { return }; self.emit(.puback(packetID: packetID))
        }
        client.didUnsubscribeTopics = { [weak self] _, topics in
          guard let self, !self.retired else { return }; self.emit(.unsuback(topics: topics))
        }
        client.didReceiveMessage = { [weak self] _, message, _ in
          guard let self, !self.retired else { return }
          self.emit(.message(topic: message.topic, payload: Data(message.payload)))
        }
        client.didDisconnect = { [weak self] _, _ in
          guard let self, !self.retired else { return }
          self.connected = false; self.emit(.disconnected); self.retireOnQueue()
        }
        // Bool means only that connect was dispatched; ready awaits CONNACK and all SUBACKs.
        if !client.connect(timeout: configuration.connectTimeout) { emit(.failed(.transportFailed)); retireOnQueue() }
      } catch let failure as MQTTBrokerFailure { emit(.failed(failure)); retireOnQueue() }
      catch { emit(.failed(.transportFailed)); retireOnQueue() }
    }
  }
  func subscribe(_ topics: [String]) {
    queue.async { [self] in
      guard connected, !retired, let client, client.connState == .connected else { emit(.failed(.offline)); return }
      client.subscribe(topics.map { ($0, CocoaMQTTQoS.qos1) })
    }
  }
  func publish(operation: UUID, topic: String, payload: Data) {
    queue.async { [self] in
      guard connected, !retired, let client, client.connState == .connected else { emit(.failed(.offline)); return }
      let mid = client.publish(CocoaMQTTMessage(topic: topic, payload: Array(payload), qos: .qos1, retained: false))
      guard mid > 0, mid <= Int(UInt16.max) else { emit(.failed(.resultUnknown)); retireOnQueue(); return }
      // Callback queue is this serial queue, so this admission is emitted before its PUBACK.
      emit(.publication(operation: operation, packetID: UInt16(mid)))
    }
  }
  func unsubscribe(_ topics: [String]) {
    queue.async { [self] in
      guard connected, !retired, let client, client.connState == .connected else { emit(.failed(.offline)); return }
      client.unsubscribe(topics)
    }
  }
  func close() { queue.async { [self] in retireOnQueue() } }
  private func retireOnQueue() {
    retired = true; connected = false
    client?.autoReconnect = false
    // Immediate owned socket close also cancels pending WSS handshake; no graceful queued writes.
    socket?.setDelegate(nil, delegateQueue: nil); socket?.disconnect()
    client = nil; socket = nil
  }
}

/// Reserve capacity on the SDK queue BEFORE enqueuing MainActor work. One drain closure only.
/// An overflow poisons this connection instead of presenting an incomplete stream as a fresh snapshot.
final class MQTTDriverDelivery {
  private let lock = NSLock()
  private var sink: ((MQTTDriverEvent) -> Void)?
  private var events: [MQTTDriverEvent] = []
  private var scheduled = false, poisoned = false
  private var generation = UUID()
  func setSink(_ sink: ((MQTTDriverEvent) -> Void)?) {
    lock.lock(); self.sink = sink; events.removeAll(); scheduled = false; poisoned = false; generation = UUID(); lock.unlock()
  }
  func submit(_ event: MQTTDriverEvent) {
    lock.lock()
    guard sink != nil, !poisoned else { lock.unlock(); return }
    let oversized: Bool
    if case let .message(_, payload) = event { oversized = payload.count > 1_048_576 } else { oversized = false }
    if oversized || events.count >= 64 {
      events = [.failed(.transportFailed)]; poisoned = true; generation = UUID()
      let token = generation; scheduled = true; lock.unlock()
      DispatchQueue.main.async { [weak self] in self?.drain(token) }; return
    } else { events.append(event) }
    let start = !scheduled, token = generation; scheduled = true; lock.unlock()
    if start { DispatchQueue.main.async { [weak self] in self?.drain(token) } }
  }
  private func drain(_ token: UUID) {
    lock.lock()
    guard generation == token else { lock.unlock(); return }
    let batch = events; events.removeAll(); scheduled = false; let callback = sink; lock.unlock()
    for event in batch {
      lock.lock(); let valid = generation == token; lock.unlock()
      if valid { callback?(event) }
    }
  }
}

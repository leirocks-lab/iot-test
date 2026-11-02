import Foundation

/// Native transport configuration, never inferred from URL.port or supplied by JS.
/// `verified` is an integration assertion which still needs an on-device wire check.
enum MQTTTransportHostPolicy: Equatable {
  case unknown
  case verified(MQTTCanonicalHost)

  func canonicalHost() throws -> MQTTCanonicalHost {
    guard case let .verified(value) = self else { throw MQTTBrokerFailure.unverifiedTransport }
    return value
  }
  func validate(_ parameters: MQTTConnectionParameters, now: Date) throws {
    let mode = try canonicalHost()
    try parameters.withURL { url in
      guard url.scheme == "wss", let host = url.host, !host.isEmpty,
            url.user == nil, url.password == nil, url.fragment == nil,
            url.port == nil || url.port == 443,
            parameters.httpHostHeader == host + (mode == .hostnameAndDefaultPort ? ":443" : "") else {
        throw MQTTBrokerFailure.invalidConfiguration
      }
    }
    if let expiry = parameters.signedRequestExpiresAt, expiry <= now { throw MQTTBrokerFailure.expiredCredentials }
    if case let .known(expiry, _) = parameters.credentialExpiry, expiry <= now { throw MQTTBrokerFailure.expiredCredentials }
  }
}

/// No SDK error descriptions, signed URL, packet content or credentials cross this boundary.
enum MQTTBrokerFailure: Error, Equatable {
  case unverifiedTransport, invalidConfiguration, expiredCredentials, staleContext
  case offline, connectionRejected, subscriptionRejected, transportFailed
  case resultUnknown, retired, duplicateObserver, authorization
}

struct MQTTDriverConfiguration {
  let cleanSession = true
  let autoReconnect = false
  let loggingEnabled = false
  let connectTimeout: TimeInterval
}

enum MQTTDriverEvent {
  case connack(accepted: Bool)
  case suback(granted: [String: Int], failed: [String])
  case unsuback(topics: [String])
  case publication(operation: UUID, packetID: UInt16)
  case puback(packetID: UInt16)
  case message(topic: String, payload: Data)
  case failed(MQTTBrokerFailure)
  case disconnected
}

/// Calls and callbacks are serialized on MainActor. SDK work itself runs on its own queue.
/// Driver must emit publication admission before any PUBACK for that operation.
@MainActor
protocol MQTTSDKDriver: AnyObject {
  var onEvent: ((MQTTDriverEvent) -> Void)? { get set }
  func start(_ parameters: MQTTConnectionParameters, configuration: MQTTDriverConfiguration)
  func subscribe(_ topics: [String])
  func unsubscribe(_ topics: [String])
  func publish(operation: UUID, topic: String, payload: Data)
  func close()
}

@MainActor
protocol MQTTBrokerPort: AnyObject {
  var onMessage: ((ShadowContext, String, Data) -> Void)? { get set }
  var onClosed: ((ShadowContext, MQTTBrokerFailure) -> Void)? { get set }
  func connect(_ parameters: MQTTConnectionParameters, context: ShadowContext) async throws
  /// PUBACK only: does not mean desired/accepted or device-reported completion.
  func publish(topic: String, payload: Data, context: ShadowContext) async throws
  func close()
}

/// Single-use client/epoch. A future owner must fetch fresh credentials/signature for another instance.
@MainActor
final class MQTTBrokerAdapter: MQTTBrokerPort {
  var onMessage: ((ShadowContext, String, Data) -> Void)?
  /// Owner must mark observation/online unknown here, including recovery and deliberate close.
  var onClosed: ((ShadowContext, MQTTBrokerFailure) -> Void)?
  private let makeDriver: () -> MQTTSDKDriver
  private let hostPolicy: MQTTTransportHostPolicy
  private let now: () -> Date
  private let timeout: TimeInterval
  private var used = false
  private var ready = false
  private var subscribed = false
  private var driver: MQTTSDKDriver?
  private var context: ShadowContext?
  private var responseTopics = Set<String>()
  private var generation: UUID?
  private var connecting: CheckedContinuation<Void, Error>?
  private var deadline: Task<Void, Never>?
  private struct Publication {
    let continuation: CheckedContinuation<Void, Error>
    var packetID: UInt16?
    let deadline: Task<Void, Never>
  }
  private var publications: [UUID: Publication] = [:]

  init(hostPolicy: MQTTTransportHostPolicy = .unknown, timeout: TimeInterval = 20,
       now: @escaping () -> Date = Date.init, makeDriver: @escaping () -> MQTTSDKDriver) {
    self.hostPolicy = hostPolicy; self.timeout = timeout; self.now = now; self.makeDriver = makeDriver
  }

  func connect(_ parameters: MQTTConnectionParameters, context: ShadowContext) async throws {
    try Task.checkCancellation()
    guard !used else { throw MQTTBrokerFailure.retired }
    guard timeout.isFinite, timeout > 0, timeout <= 120 else { throw MQTTBrokerFailure.invalidConfiguration }
    try hostPolicy.validate(parameters, now: now())
    guard parameters.resourceID == context.resourceID, parameters.thingRef == context.thingRef else { throw MQTTBrokerFailure.staleContext }
    used = true; self.context = context
    responseTopics = Set(["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map { "$aws/things/\(context.thingRef)/shadow/\($0)" })
    let generation = UUID(); self.generation = generation
    let driver = makeDriver(); self.driver = driver
    driver.onEvent = { [weak self] event in self?.receive(event, generation: generation) }
    try await withTaskCancellationHandler(operation: {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        connecting = continuation
        deadline = timer { [weak self] in self?.terminate(.transportFailed) }
        if Task.isCancelled { terminate(.resultUnknown); return }
        driver.start(parameters, configuration: MQTTDriverConfiguration(connectTimeout: timeout))
      }
    }, onCancel: { [weak self] in Task { @MainActor in self?.terminate(.resultUnknown) } })
  }

  func publish(topic: String, payload: Data, context: ShadowContext) async throws {
    try Task.checkCancellation()
    guard self.context == context else { throw MQTTBrokerFailure.staleContext }
    guard ready, let driver else { throw MQTTBrokerFailure.offline }
    let prefix = "$aws/things/\(context.thingRef)/shadow/"
    guard (topic == prefix + "get" && payload.isEmpty) || (topic == prefix + "update" && !payload.isEmpty) else {
      throw MQTTBrokerFailure.invalidConfiguration
    }
    // Bound native pending work; no SDK/offline application queue.
    guard publications.count < 32 else { throw MQTTBrokerFailure.offline }
    let operation = UUID()
    try await withTaskCancellationHandler(operation: {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        let deadline = timer { [weak self] in self?.terminate(.resultUnknown) }
        publications[operation] = Publication(continuation: continuation, packetID: nil, deadline: deadline)
        if Task.isCancelled { terminate(.resultUnknown); return }
        driver.publish(operation: operation, topic: topic, payload: payload)
      }
    }, onCancel: { [weak self] in Task { @MainActor in
      guard self?.publications[operation] != nil else { return }
      self?.terminate(.resultUnknown)
    } })
  }

  func close() { terminate(.retired) }

  private func receive(_ event: MQTTDriverEvent, generation: UUID) {
    guard self.generation == generation else { return }
    switch event {
    case let .connack(accepted):
      guard accepted, connecting != nil, !subscribed else { terminate(.connectionRejected); return }
      subscribed = true; driver?.subscribe(responseTopics.sorted())
    case let .suback(granted, failed):
      guard subscribed, connecting != nil, failed.isEmpty, Set(granted.keys) == responseTopics,
            granted.values.allSatisfy({ $0 == 1 }) else { terminate(.subscriptionRejected); return }
      ready = true; deadline?.cancel(); deadline = nil
      let continuation = connecting; connecting = nil; continuation?.resume()
    case .unsuback: return
    case let .publication(operation, packetID):
      guard let pending = publications[operation], pending.packetID == nil, packetID > 0,
            !publications.values.contains(where: { $0.packetID == packetID }) else { terminate(.resultUnknown); return }
      publications[operation]?.packetID = packetID
    case let .puback(packetID):
      guard let operation = publications.first(where: { $0.value.packetID == packetID })?.key,
            let pending = publications.removeValue(forKey: operation) else { return }
      pending.deadline.cancel(); pending.continuation.resume()
    case let .message(topic, payload):
      guard ready, responseTopics.contains(topic), let context else { return }
      onMessage?(context, topic, payload)
    case let .failed(error): terminate(error)
    case .disconnected: terminate(.transportFailed)
    }
  }

  private func timer(_ action: @escaping @MainActor () -> Void) -> Task<Void, Never> {
    let nanoseconds = UInt64(timeout * 1_000_000_000)
    return Task { @MainActor in
      do { try await Task.sleep(nanoseconds: nanoseconds); action() } catch { }
    }
  }
  private func terminate(_ reason: MQTTBrokerFailure) {
    let notify = generation != nil
    ready = false; generation = nil; deadline?.cancel(); deadline = nil
    driver?.onEvent = nil; driver?.close(); driver = nil
    let connection = self.connecting; self.connecting = nil
    let pending = publications; publications.removeAll()
    connection?.resume(throwing: reason)
    for operation in pending.values {
      operation.deadline.cancel(); operation.continuation.resume(throwing: MQTTBrokerFailure.resultUnknown)
    }
    if notify, let context { onClosed?(context, reason) }
  }
}

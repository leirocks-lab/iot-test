import Foundation

/// Resource-neutral socket boundary. No HTTP, account state, reducer or command queue.
@MainActor
protocol SharedMQTTBrokerPort: AnyObject {
  var onMessage: ((String, Data) -> Void)? { get set }
  var onClosed: ((MQTTBrokerFailure) -> Void)? { get set }
  func connect(_ parameters: MQTTConnectionParameters) async throws
  func subscribe(_ topics: Set<String>) async throws
  func unsubscribe(_ topics: Set<String>) async throws
  func publish(topic: String, payload: Data) async throws
  func close()
}

/// Reuses the existing SDK driver/network stack. SUB/UNSUB are serialized by the pool entry.
@MainActor
final class SharedMQTTBrokerAdapter: SharedMQTTBrokerPort {
  var onMessage: ((String, Data) -> Void)?
  var onClosed: ((MQTTBrokerFailure) -> Void)?
  private enum Waiting { case connect, subscribe(Set<String>), unsubscribe(Set<String>) }
  private struct Control { let id: UUID; let kind: Waiting; let completion: CheckedContinuation<Void, Error>; let timer: Task<Void, Never> }
  private struct Publication { var mid: UInt16?; let completion: CheckedContinuation<Void, Error>; let timer: Task<Void, Never> }
  private var control: Control?
  private var publications: [UUID: Publication] = [:]
  private var active = false, used = false, connected = false
  private let driver: MQTTSDKDriver
  private let hostPolicy: MQTTTransportHostPolicy
  private let timeout: TimeInterval
  private let now: () -> Date
  init(driver: MQTTSDKDriver, hostPolicy: MQTTTransportHostPolicy = .unknown, timeout: TimeInterval = 20, now: @escaping () -> Date = Date.init) {
    self.driver = driver; self.hostPolicy = hostPolicy; self.timeout = timeout; self.now = now
  }
  func connect(_ parameters: MQTTConnectionParameters) async throws {
    try Task.checkCancellation()
    guard !used, timeout.isFinite, timeout > 0, timeout <= 120 else { throw MQTTBrokerFailure.invalidConfiguration }
    try hostPolicy.validate(parameters, now: now())
    used = true; active = true; driver.onEvent = { [weak self] in self?.receive($0) }
    try await wait(.connect) { driver.start(parameters, configuration: MQTTDriverConfiguration(connectTimeout: timeout)) }
  }
  func subscribe(_ topics: Set<String>) async throws {
    guard connected, !topics.isEmpty, topics.allSatisfy(Self.validTopic) else { throw MQTTBrokerFailure.offline }
    try await wait(.subscribe(topics)) { driver.subscribe(topics.sorted()) }
  }
  func unsubscribe(_ topics: Set<String>) async throws {
    guard connected, !topics.isEmpty, topics.allSatisfy(Self.validTopic) else { throw MQTTBrokerFailure.offline }
    try await wait(.unsubscribe(topics)) { driver.unsubscribe(topics.sorted()) }
  }
  private static func validTopic(_ topic: String) -> Bool { !topic.isEmpty && topic.rangeOfCharacter(from: CharacterSet(charactersIn: "+#\0")) == nil }
  private func wait(_ kind: Waiting, action: () -> Void) async throws {
    try Task.checkCancellation()
    guard active, control == nil else { throw MQTTBrokerFailure.offline }
    let id = UUID()
    try await withTaskCancellationHandler(operation: {
      try await withCheckedThrowingContinuation { (completion: CheckedContinuation<Void, Error>) in
        control = Control(id: id, kind: kind, completion: completion, timer: timer())
        if Task.isCancelled { terminate(.resultUnknown) } else { action() }
      }
    }, onCancel: { [weak self] in Task { @MainActor in if self?.control?.id == id { self?.terminate(.resultUnknown) } } })
  }
  func publish(topic: String, payload: Data) async throws {
    try Task.checkCancellation()
    guard active, connected, publications.count < 32, Self.validTopic(topic), payload.count <= 1_048_576 else { throw MQTTBrokerFailure.offline }
    let id = UUID()
    try await withTaskCancellationHandler(operation: {
      try await withCheckedThrowingContinuation { (completion: CheckedContinuation<Void, Error>) in
        publications[id] = Publication(mid: nil, completion: completion, timer: timer())
        if Task.isCancelled { cancelPublication(id) } else { driver.publish(operation: id, topic: topic, payload: payload) }
      }
    }, onCancel: { [weak self] in Task { @MainActor in self?.cancelPublication(id) } })
  }
  private func cancelPublication(_ id: UUID) {
    guard let value = publications.removeValue(forKey: id) else { return }
    value.timer.cancel(); value.completion.resume(throwing: MQTTBrokerFailure.resultUnknown)
  }
  private func timer() -> Task<Void, Never> {
    let duration = UInt64(timeout * 1_000_000_000)
    return Task { @MainActor [weak self] in do { try await Task.sleep(nanoseconds: duration); self?.terminate(.transportFailed) } catch { } }
  }
  private func receive(_ event: MQTTDriverEvent) {
    guard active else { return }
    switch event {
    case let .connack(accepted):
      guard case .connect? = control?.kind, accepted else { terminate(.connectionRejected); return }
      connected = true; completeControl()
    case let .suback(granted, failed):
      guard case let .subscribe(expected)? = control?.kind, Set(granted.keys).union(failed) == expected,
            Set(granted.keys).isDisjoint(with: Set(failed)) else { terminate(.transportFailed); return }
      if !failed.isEmpty || !granted.values.allSatisfy({ $0 == 1 }) { completeControl(error: .subscriptionRejected) }
      else { completeControl() }
    case let .unsuback(topics):
      guard case let .unsubscribe(expected)? = control?.kind, Set(topics) == expected else { terminate(.transportFailed); return }
      completeControl()
    case let .publication(operation, packetID):
      guard publications[operation] != nil else { return } // cancelled caller, never resurrect it
      guard packetID > 0, publications[operation]?.mid == nil, !publications.values.contains(where: { $0.mid == packetID }) else { terminate(.resultUnknown); return }
      publications[operation]?.mid = packetID
    case let .puback(packetID):
      guard let id = publications.first(where: { $0.value.mid == packetID })?.key, let value = publications.removeValue(forKey: id) else { return }
      value.timer.cancel(); value.completion.resume()
    case let .message(topic, payload): if connected { onMessage?(topic, payload) }
    case let .failed(error): terminate(error)
    case .disconnected: terminate(.transportFailed)
    }
  }
  private func completeControl(error: MQTTBrokerFailure? = nil) {
    let value = control; control = nil; value?.timer.cancel()
    if let error { value?.completion.resume(throwing: error) } else { value?.completion.resume() }
  }
  func close() { terminate(.retired) }
  private func terminate(_ error: MQTTBrokerFailure) {
    guard active else { return }; active = false; connected = false
    driver.onEvent = nil; driver.close()
    let waiting = control; control = nil; waiting?.timer.cancel(); waiting?.completion.resume(throwing: error)
    let pending = publications; publications.removeAll()
    for value in pending.values { value.timer.cancel(); value.completion.resume(throwing: MQTTBrokerFailure.resultUnknown) }
    onClosed?(error)
  }
}

import Foundation

enum NativeDeviceReadRequest { case schedules, firmware(OtaKind), summary, members, help, location }
enum NativeDeviceReadValue: Sendable {
  case schedules([DeviceScheduleSummaryDTO]), firmware(DeviceFirmwareOfferDTO), summary(DeviceMoreSummary)
  case members([DeviceMoreMember]), help([DeviceMoreHelp]), location(DeviceLocationSummary)
  var bridgeValue: Any {
    switch self {
    case let .schedules(value): return value.map(\.dictionary)
    case let .firmware(value): return value.dictionary
    case let .summary(value): return value.dictionary
    case let .members(value): return value.map(\.dictionary)
    case let .help(value): return value.map(\.dictionary)
    case let .location(value): return value.dictionary
    }
  }
}

/// Each module has exactly two actual-I/O slots, shared by all six GETs and all its observations.
/// Finishing a JS promise on cancel/timeout never releases an uncooperative native worker's slot.
@MainActor
final class NativeDeviceBridgeReads {
  typealias Completion = (Any?, NSError?) -> Void
  typealias Read = @MainActor (NativeDeviceObservations.ReadContext, NativeDeviceReadGate, NativeDeviceReadRequest) async throws -> NativeDeviceReadValue
  @MainActor private final class Job {
    let observation: String
    var task: Task<Void, Never>?
    var timer: Task<Void, Never>?
    var completion: Completion?
    init(_ observation: String, _ completion: @escaping Completion) { self.observation = observation; self.completion = completion }
    func finish(_ value: Any? = nil, error: NSError? = nil) { let callback = completion; completion = nil; callback?(value, error) }
  }
  private let observations: NativeDeviceObservations
  private let owner: String
  private let read: Read
  private let gate = NativeDeviceReadGate()
  private let deadline: () async throws -> Void
  private var jobs: [UUID: Job] = [:]
  private var closed = false
  init(observations: NativeDeviceObservations, owner: String, read: @escaping Read,
       deadline: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 20_000_000_000) }) {
    self.observations = observations; self.owner = owner; self.read = read; self.deadline = deadline
  }
  func start(_ observation: String, request: NativeDeviceReadRequest, completion: @escaping Completion) {
    guard !closed else { completion(nil, Self.failure("closed")); return }
    guard jobs.count < 2 else { completion(nil, Self.failure("unavailable")); return }
    let context: NativeDeviceObservations.ReadContext
    do { context = try observations.readContext(observation, owner: owner) }
    catch { completion(nil, Self.error(error)); return }
    let id = UUID(), job = Job(observation, completion); jobs[id] = job
    job.task = Task { @MainActor [self] in
      defer { job.timer?.cancel(); jobs.removeValue(forKey: id) }
      do {
        try Task.checkCancellation(); guard !closed, context.current() else { throw DeviceMoreReadFailure.sessionChanged }
        let value = try await read(context, gate, request)
        try Task.checkCancellation(); guard !closed, context.current() else { throw DeviceMoreReadFailure.sessionChanged }
        job.finish(value.bridgeValue)
      } catch {
        // Classifier side effects require this exact still-pending binding/page/handle, too.
        if !closed, !Task.isCancelled, job.completion != nil, context.current(),
           let failure = error as? DeviceMoreReadError, failure.ownershipRevoked {
          observations.deviceOwner.revokeOwnership(context.handle)
          job.finish(error: Self.failure("forbidden"))
        } else if closed || Task.isCancelled { job.finish(error: Self.failure("closed")) }
        else if !context.current() { job.finish(error: Self.failure("session_changed")) }
        else { job.finish(error: Self.error(error)) }
      }
    }
    job.timer = Task { @MainActor [deadline] in
      do { try Task.checkCancellation(); try await deadline(); try Task.checkCancellation() } catch { return }
      job.finish(error: Self.failure("unavailable")); job.task?.cancel()
    }
  }
  func cancel(observation: String? = nil) {
    for job in jobs.values where observation == nil || observation == job.observation {
      job.finish(error: Self.failure("closed")); job.task?.cancel(); job.timer?.cancel()
    }
  }
  func close() { guard !closed else { return }; closed = true; cancel(); gate.close() }
  private static func failure(_ code: String) -> NSError {
    NSError(domain: "RowanDeviceRead", code: 1, userInfo: ["bridgeCode": code, NSLocalizedDescriptionKey: "设备信息暂不可用"])
  }
  private static func error(_ error: Error) -> NSError {
    if let failure = error as? BridgeObservationFailure { return failure.nsError }
    if let failure = error as? DeviceMoreReadError { return Self.failure(failure.code.rawValue) }
    return Self.failure("unavailable")
  }
}

@MainActor
enum NativeDeviceBoundReads {
  static func read(account: AccountService, owner: DeviceReadOwner, context: NativeDeviceObservations.ReadContext,
                   gate: NativeDeviceReadGate, request: NativeDeviceReadRequest) async throws -> NativeDeviceReadValue {
    let more = NativeDeviceMoreReadFactory.makeBound(account: account, owner: owner, handle: context.handle,
      gate: gate, pageCurrent: context.current)
    switch request {
    case .summary: return .summary(try await more.summary(resourceID: context.deviceID, expectedRevision: context.revision))
    case .members: return .members(try await more.members(resourceID: context.deviceID, expectedRevision: context.revision))
    case .help: return .help(try await more.help(resourceID: context.deviceID, expectedRevision: context.revision))
    case .location: return .location(try await more.location(resourceID: context.deviceID, expectedRevision: context.revision))
    case .schedules:
      return try await more.readAuthorized(context.deviceID, revision: context.revision) { scope in
        let records = try await HTTPSchedulesRepository(account: account, scope: ScheduleScope(accountRevision: scope.accountRevision,
          resourceID: scope.resourceID, productID: scope.productID, modelVersion: nil)).load()
        return .schedules(records.map { DeviceScheduleSummaryDTO(itemKey: UUID().uuidString, record: $0) })
      }
    case let .firmware(kind):
      return try await more.readAuthorized(context.deviceID, revision: context.revision) { scope in
        let offer = try await HTTPOtaRepository(account: account, scope: OtaScope(accountRevision: scope.accountRevision,
          resourceID: scope.resourceID, userID: scope.userID)).check(kind)
        return .firmware(DeviceFirmwareOfferDTO(offer: offer))
      }
    }
  }
}

import Foundation

/// Application-owned workflow primitive; no production owner/journal/permit issuer/bridge installed.
/// Views pause observation; they never implicitly DELETE a firmware task.
@MainActor
final class OtaService {
  private let repository: OtaRepository
  private let currentScopeValid: () -> Bool
  private let currentEvidence: () -> OtaOnlineEvidence?
  private let startPermit: () -> OtaStartPermit?
  private let cancelPermit: () -> OtaCancelPermit?
  private let nowMillis: () -> Int64
  private let policy: OtaPolicy
  private(set) var state = OtaState()
  private var closed = false, createLatched = false, cancelLatched = false
  private var polls = 0
  private var lastPollAt: Int64?
  private var offerGeneration: Int64 = 0, startedOfferGeneration: Int64 = -1
  private struct Unconfirmed: Error { }
  private struct InvalidResponse: Error { }
  private final class Deadline { var timedOut = false }

  init(repository: OtaRepository, currentScopeValid: @escaping () -> Bool,
       currentEvidence: @escaping () -> OtaOnlineEvidence? = { nil }, startPermit: @escaping () -> OtaStartPermit? = { nil },
       cancelPermit: @escaping () -> OtaCancelPermit? = { nil },
       nowMillis: @escaping () -> Int64 = { Int64(ProcessInfo.processInfo.systemUptime * 1000) }, policy: OtaPolicy = .standard) {
    self.repository = repository; self.currentScopeValid = currentScopeValid; self.currentEvidence = currentEvidence
    self.startPermit = startPermit; self.cancelPermit = cancelPermit; self.nowMillis = nowMillis; self.policy = policy
  }
  private func expire() { guard !closed else { return }; state = OtaState(sessionExpired: true, observing: false, error: .scopeChanged) }
  private func scopeValid() -> Bool {
    guard !closed, !state.sessionExpired else { return false }
    guard currentScopeValid() else { expire(); return false }; return true
  }
  private func checkCurrent() throws -> Bool { try Task.checkCancellation(); return scopeValid() }
  private func revoked(_ error: Error) -> Bool {
    (error as? RowanFailure).map { [401, 403, 499, 1491, 1492, 1501, 1502, 1511, 1513, 1521, 1522, 1531, 1532].contains($0.code) } == true
  }
  private func update(_ change: (inout OtaState) -> Void) { if !closed { change(&state) } }
  /// Cooperative timeout plus completion barrier, so an uncooperative dependency cannot overlap a retry.
  private func bounded<T>(_ operation: @escaping @MainActor () async throws -> T) async throws -> T {
    let deadline = Deadline(), worker = Task { @MainActor in try await operation() }
    let timer = Task { @MainActor [policy] in
      do { try await Task.sleep(nanoseconds: UInt64(policy.requestTimeoutMillis) * 1_000_000) }
      catch { return }
      deadline.timedOut = true; worker.cancel()
    }
    defer { timer.cancel() }
    do {
      let value = try await withTaskCancellationHandler(operation: { try await worker.value }, onCancel: { worker.cancel() })
      if deadline.timedOut { throw Unconfirmed() }; return value
    } catch { if deadline.timedOut, !Task.isCancelled { throw Unconfirmed() }; throw error }
  }
  func loadCandidate(_ kind: OtaKind) async throws {
    guard !state.busy, try checkCurrent() else { return }
    update { $0.busy = true; $0.error = nil }; defer { update { $0.busy = false } }
    do {
      let offer = try await bounded { [repository] in try await repository.check(kind) }
      guard try checkCurrent() else { return }
      guard offer.kind == kind, otaTextEqual(offer.device.id, repository.scope.resourceID), validOtaID(offer.firmware.id), !offer.firmware.version.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw InvalidResponse() }
      offerGeneration += 1; update { $0.candidate = offer; $0.error = nil }
    } catch is CancellationError { throw CancellationError() }
    catch { if !scopeValid() || revoked(error) { expire() } else { update { $0.error = error is InvalidResponse ? .invalidResponse : .readFailed } } }
  }
  private func startAllowed(_ offer: OtaOffer) -> Bool {
    guard let permit = startPermit(), let evidence = currentEvidence() else { return false }
    return permit.scope == repository.scope && permit.kind == offer.kind && otaTextEqual(permit.firmwareID, offer.firmware.id)
      && permit.expiresAtMillis > nowMillis() && permit.evidence == evidence && evidence.source == .reportedCurrent
      && evidence.online == true && !evidence.stale && evidence.connectionEpoch > 0 && evidence.authorityRevision >= 0
  }
  func start() async throws {
    guard !state.busy, try checkCurrent() else { return }
    guard let offer = state.candidate else { update { $0.error = .noCandidate }; return }
    let freshAfterTerminal = state.lastConfirmed?.terminal == true && offerGeneration > startedOfferGeneration
    guard !((state.task != nil || createLatched) && !freshAfterTerminal), !state.resultUnknown else {
      update { $0.error = $0.resultUnknown ? .resultUnknown : .taskAlreadyExists }; return
    }
    guard startAllowed(offer) else { update { $0.error = .startNotPermitted }; return }
    guard try checkCurrent() else { return }
    createLatched = true; update { $0.busy = true; $0.error = nil }; defer { update { $0.busy = false } }
    do {
      let id = try await bounded { [repository] in try await repository.start(offer.kind, firmwareID: offer.firmware.id) }
      guard scopeValid() else { return }
      guard validOtaID(id) else { throw InvalidResponse() }
      polls = 0; lastPollAt = nil; startedOfferGeneration = offerGeneration; cancelLatched = false
      // Preserve current observing, including a pause which occurred while PUT awaited its ACK.
      update { $0.task = OtaTask(taskID: id, kind: offer.kind, firmwareID: offer.firmware.id); $0.lastConfirmed = nil; $0.resultUnknown = false; $0.error = nil }
      try Task.checkCancellation()
    } catch is CancellationError {
      if scopeValid() { update { $0.resultUnknown = true; $0.error = .resultUnknown } }; throw CancellationError()
    } catch {
      if !scopeValid() || revoked(error) { expire() }
      else {
        let rejected = (error as? RowanFailure).map { [400, 1512, 1514, 1515, 1516].contains($0.code) } == true
        if rejected { createLatched = false }
        update { $0.resultUnknown = !rejected; $0.error = rejected ? .readFailed : .resultUnknown }
      }
    }
  }
  func pollOnce() async throws {
    guard !state.busy, try checkCurrent() else { return }
    try await queryLocked(requireObserving: true)
  }
  private func queryLocked(requireObserving: Bool) async throws {
    guard try checkCurrent(), let task = state.task, state.lastConfirmed?.terminal != true,
          !requireObserving || state.observing else { return }
    if polls >= policy.maxPolls { update { $0.observing = false; $0.resultUnknown = true; $0.error = .pollLimit }; return }
    let now = nowMillis()
    if let lastPollAt, now < lastPollAt || now - lastPollAt < policy.pollIntervalMillis { return }
    polls += 1; lastPollAt = now
    update { $0.busy = true; $0.error = nil }; defer { update { $0.busy = false } }
    do {
      let result = try await bounded { [repository] in try await repository.query(taskID: task.taskID) }
      guard try checkCurrent() else { return }
      let unconfirmed = cancelLatched && !result.terminal
      update { $0.lastConfirmed = result; $0.resultUnknown = unconfirmed; $0.observing = $0.observing && !result.terminal; $0.error = unconfirmed ? .resultUnknown : nil }
    } catch is CancellationError {
      if scopeValid() { update { $0.resultUnknown = true; $0.error = .resultUnknown } }; throw CancellationError()
    } catch {
      if !scopeValid() || revoked(error) { expire() }
      else { update { $0.resultUnknown = true; $0.observing = $0.observing && ((error as? RowanFailure)?.code != 1533); $0.error = .resultUnknown } }
    }
  }
  func cancel() async throws {
    guard !state.busy, try checkCurrent(), let task = state.task, state.lastConfirmed?.terminal != true else { return }
    guard !cancelLatched else { update { $0.error = .resultUnknown }; return }
    guard let permit = cancelPermit(), permit.scope == repository.scope, otaTextEqual(permit.taskID, task.taskID), permit.expiresAtMillis > nowMillis() else {
      update { $0.error = .cancelNotPermitted }; return
    }
    guard try checkCurrent() else { return }
    cancelLatched = true; update { $0.busy = true; $0.error = nil }; defer { update { $0.busy = false } }
    do {
      try await bounded { [repository] in try await repository.cancel(taskID: task.taskID) }
      guard try checkCurrent() else { return }
      update { $0.resultUnknown = true; $0.error = .resultUnknown }
      // DELETE ACK means request accepted, never device cancelled; shares GET rate/budget.
      try await queryLocked(requireObserving: false)
    } catch is CancellationError {
      if scopeValid() { update { $0.resultUnknown = true; $0.error = .resultUnknown } }; throw CancellationError()
    } catch {
      if !scopeValid() || revoked(error) { expire() }
      else { update { $0.resultUnknown = true; $0.error = .resultUnknown } }
    }
  }
  func stopObserving() { update { $0.observing = false } }
  func resumeObserving() {
    guard !closed, !state.sessionExpired, state.lastConfirmed?.terminal != true else { return }
    if !state.observing { polls = 0 }; state.observing = true
  }
  func close() {
    guard !closed else { return }
    let pending = state.busy && (createLatched || cancelLatched)
    closed = true; state.observing = false; state.busy = false
    if pending { state.resultUnknown = true; state.error = .resultUnknown }
  }
}

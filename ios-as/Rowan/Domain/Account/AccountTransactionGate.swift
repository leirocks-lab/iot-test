import Foundation

/// A FIFO async permit, not a blocking lock. A cancelled waiter is removed; a granted
/// permit is always released by run's defer, including cancellation racing with grant.
@MainActor
final class AccountTransactionGate {
  private struct Waiter { let id: UUID; let continuation: CheckedContinuation<Void, Error> }
  private var owner: UUID?
  private var waiters: [Waiter] = []
  func run<T>(_ work: () async throws -> T) async throws -> T {
    let id = UUID()
    try await acquire(id)
    defer { release(id) }
    try Task.checkCancellation()
    return try await work()
  }
  private func acquire(_ id: UUID) async throws {
    try Task.checkCancellation()
    if owner == nil { owner = id; return }
    try await withTaskCancellationHandler(operation: {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        if Task.isCancelled { continuation.resume(throwing: CancellationError()) }
        else { waiters.append(Waiter(id: id, continuation: continuation)) }
      }
    }, onCancel: {
      Task { @MainActor [weak self] in self?.cancelWaiter(id) }
    })
  }
  private func cancelWaiter(_ id: UUID) {
    guard let index = waiters.firstIndex(where: { $0.id == id }) else { return }
    waiters.remove(at: index).continuation.resume(throwing: CancellationError())
  }
  private func release(_ id: UUID) {
    precondition(owner == id, "Account transaction permit mismatch")
    if waiters.isEmpty { owner = nil }
    else { let next = waiters.removeFirst(); owner = next.id; next.continuation.resume() }
  }
}

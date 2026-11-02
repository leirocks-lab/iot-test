import Foundation

/// Local resource budgets, NOT a production QR schema or bind-code field contract.
enum QRScanBudget {
  static let inputBytes = 12 * 1_024 * 1_024
  static let inputPixels = 40_000_000
  static let sampledSide = 2_048
  static let candidates = 4
  static let textBytes = 4_096
  static func permits(width: Int, height: Int) -> Bool {
    width > 0 && height > 0 && height <= inputPixels && width <= inputPixels / height
  }
}
struct QRPayload: Sendable, CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable {
  private let text: String
  init(_ value: String) throws {
    guard !value.isEmpty else { throw QRScanFailure.unreadable }
    guard value.utf8.count <= QRScanBudget.textBytes else { throw QRScanFailure.resourceLimit }
    text = value
  }
  var description: String { "QRPayload(redacted)" }
  var debugDescription: String { description }
  var customMirror: Mirror { Mirror(self, children: ["redacted": true], displayStyle: .struct) }
}
enum QRScanFailure: Error, Sendable, Equatable { case unreadable, resourceLimit, multiple, unavailable }
enum QRPermission { case authorized, denied, restricted, unavailable }
enum QRScanPhase: Equatable { case inactive, permission, camera, picker, processing, denied, restricted, unavailable, unreadable, resourceLimit, multiple, unsupported, closed }
struct QRScanTicket: Equatable, Sendable { let page: UUID; let generation: UInt64; let accountRevision: Int }

/// No production interpreter exists. A decoded payload cannot grant identity, binding or navigation.
enum ProductionQRInterpreter {
  static func interpret(_ payload: QRPayload) -> QRScanPhase { .unsupported }
}

@MainActor
final class QRScanSession {
  private let revision: Int, page = UUID()
  private let accountCurrent: () -> Bool
  private var generation: UInt64 = 0
  private var visible = false, active = false
  private(set) var phase = QRScanPhase.inactive
  init(accountRevision: Int, accountCurrent: @escaping () -> Bool) { revision = accountRevision; self.accountCurrent = accountCurrent }
  func visibility(_ value: Bool, active: Bool, ownedPickerCover: Bool = false) {
    visible = value; self.active = active
    guard phase != .closed else { return }
    guard accountCurrent() else { close(); return }
    if !active || (!value && !ownedPickerCover) { invalidate(); if phase != .closed { phase = .inactive } }
  }
  func beginCamera() -> QRScanTicket? {
    guard available(), phase != .permission, phase != .picker, phase != .processing else { return nil }
    guard let ticket = next() else { return nil }; phase = .permission; return ticket
  }
  func permission(_ value: QRPermission, ticket: QRScanTicket) -> Bool {
    guard accepts(ticket), phase == .permission else { return false }
    switch value { case .authorized: phase = .camera; case .denied: phase = .denied; case .restricted: phase = .restricted; case .unavailable: phase = .unavailable }
    return phase == .camera
  }
  func beginPicker() -> QRScanTicket? {
    guard available(), phase != .processing, phase != .picker else { return nil }
    guard let ticket = next() else { return nil }; phase = .picker; return ticket
  }
  func beginPhoto(_ ticket: QRScanTicket) -> Bool {
    guard accepts(ticket), phase == .picker else { return false }; phase = .processing; return true
  }
  func cancelPicker(_ ticket: QRScanTicket) {
    guard accepts(ticket), phase == .picker else { return }; invalidate(); if phase != .closed { phase = .inactive }
  }
  func received(_ payloads: [QRPayload], ticket: QRScanTicket) {
    guard accepts(ticket), phase == .camera || phase == .processing else { return }
    guard payloads.count == 1 else { phase = payloads.isEmpty ? .unreadable : .multiple; return }
    phase = ProductionQRInterpreter.interpret(payloads[0])
  }
  func failed(_ failure: QRScanFailure, ticket: QRScanTicket) {
    guard accepts(ticket) else { return }
    switch failure { case .unreadable: phase = .unreadable; case .resourceLimit: phase = .resourceLimit; case .multiple: phase = .multiple; case .unavailable: phase = .unavailable }
  }
  func close() { invalidate(); phase = .closed; visible = false }
  private func available() -> Bool { phase != .closed && visible && active && accountCurrent() }
  private func accepts(_ ticket: QRScanTicket) -> Bool { available() && ticket.page == page && ticket.accountRevision == revision && ticket.generation == generation }
  private func invalidate() { if generation < UInt64.max { generation += 1 } else { phase = .closed } }
  private func next() -> QRScanTicket? { guard generation < UInt64.max else { phase = .closed; return nil }; generation += 1; return QRScanTicket(page: page, generation: generation, accountRevision: revision) }
}

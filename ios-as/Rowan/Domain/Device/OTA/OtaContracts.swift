import Foundation

protocol OtaRedacted: CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable { }
extension OtaRedacted {
  var description: String { "\(String(describing: Self.self))(redacted)" }
  var debugDescription: String { description }
  var customMirror: Mirror { Mirror(self, children: ["redacted": true], displayStyle: .struct) }
}

/// Native-only scope. No production permit issuer, registry, persistent journal or UI is installed.
struct OtaScope: Equatable, OtaRedacted {
  let accountRevision: Int
  let resourceID: String
  let userID: String
  static func == (lhs: OtaScope, rhs: OtaScope) -> Bool {
    lhs.accountRevision == rhs.accountRevision && otaTextEqual(lhs.resourceID, rhs.resourceID) && otaTextEqual(lhs.userID, rhs.userID)
  }
}
enum OtaKind: String, CaseIterable { case mcu, wifi }
struct OtaFirmware: Equatable, OtaRedacted { let id: String; let version: String; let remark: String? }
struct OtaDevice: Equatable, OtaRedacted { let id: String; let name: String; let mac: String }
struct OtaOffer: Equatable, OtaRedacted { let kind: OtaKind; let firmware: OtaFirmware; let device: OtaDevice }
struct OtaTask: Equatable, OtaRedacted { let taskID: String; let kind: OtaKind; let firmwareID: String }
/// Complete V1.4 OTA-05 vocabulary. No progress percentage/download/install state is inferred.
enum OtaResult: String, CaseIterable {
  case updating, success, failed, cancelled
  var terminal: Bool { self != .updating }
}
enum OtaEvidenceSource: Equatable { case reportedCurrent, deviceMetadata }
struct OtaOnlineEvidence: Equatable {
  let source: OtaEvidenceSource
  let online: Bool?
  let stale: Bool
  let connectionEpoch: Int64
  let authorityRevision: Int64
}
/// Testable proof DTOs, never issued from JS, DEVICE-02 static online, or a read firmware offer.
struct OtaStartPermit: OtaRedacted {
  let scope: OtaScope; let kind: OtaKind; let firmwareID: String
  let evidence: OtaOnlineEvidence; let expiresAtMillis: Int64
}
struct OtaCancelPermit: OtaRedacted { let scope: OtaScope; let taskID: String; let expiresAtMillis: Int64 }
struct OtaPolicy {
  let pollIntervalMillis: Int64
  let maxPolls: Int
  let requestTimeoutMillis: Int64
  static let standard = OtaPolicy(validatedInterval: 3000, maxPolls: 120, timeout: 20_000)
  private init(validatedInterval: Int64, maxPolls: Int, timeout: Int64) {
    pollIntervalMillis = validatedInterval; self.maxPolls = maxPolls; requestTimeoutMillis = timeout
  }
  init(pollIntervalMillis: Int64 = 3000, maxPolls: Int = 120, requestTimeoutMillis: Int64 = 20_000) throws {
    guard pollIntervalMillis >= 3000, (1...1200).contains(maxPolls), (1...120_000).contains(requestTimeoutMillis) else {
      throw RowanFailure(code: 400, message: "升级观察策略无效")
    }
    self.init(validatedInterval: pollIntervalMillis, maxPolls: maxPolls, timeout: requestTimeoutMillis)
  }
}
enum OtaError: Equatable { case noCandidate, startNotPermitted, cancelNotPermitted, taskAlreadyExists, resultUnknown, readFailed, invalidResponse, pollLimit, scopeChanged }
struct OtaState {
  var candidate: OtaOffer?
  var task: OtaTask?
  var lastConfirmed: OtaResult?
  var busy = false
  var resultUnknown = false
  var sessionExpired = false
  var observing = true
  var error: OtaError?
}
@MainActor
protocol OtaRepository {
  var scope: OtaScope { get }
  func check(_ kind: OtaKind) async throws -> OtaOffer
  func start(_ kind: OtaKind, firmwareID: String) async throws -> String
  func query(taskID: String) async throws -> OtaResult
  func cancel(taskID: String) async throws
}
func validOtaID(_ value: String) -> Bool {
  !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value != "." && value != ".."
    && value.rangeOfCharacter(from: .controlCharacters) == nil
}

func otaTextEqual(_ lhs: String, _ rhs: String) -> Bool { lhs.utf8.elementsEqual(rhs.utf8) }

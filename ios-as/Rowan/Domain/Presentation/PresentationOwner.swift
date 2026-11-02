import Foundation

enum EffectiveTheme: String { case light, dark }

/// OS values supplied explicitly by a future native binder; never reads or writes OS/user prefs.
struct PresentationSystemInput {
  let languageTags: [String]
  let appearance: EffectiveTheme
  fileprivate var renderingLanguage: PreferenceLanguage {
    languageTags.lazy.compactMap(supportedSystemLanguage).first ?? .en
  }
}
struct PresentationSnapshot: Equatable {
  let revision: Int
  let accountRevision: Int
  let authenticated: Bool
  let language: PreferenceLanguage
  let themePreference: PreferenceTheme?
  let effectiveTheme: EffectiveTheme
  let temperatureUnit: TemperatureUnit?
  let measurementSystem: MeasurementSystem?
}
enum PresentationFailure: Error { case invalidAuthority, revisionExhausted }

/// Transient synchronous native account tuple, never persisted, encoded or exposed to RN.
/// The owner never retains this tuple/session; only private UTF8 identity and public signature.
struct PresentationAccountCapture: CustomStringConvertible, CustomDebugStringConvertible {
  let revision: Int
  let session: AccountSession?
  let cleanupRequired: Bool
  var description: String { "PresentationAccountCapture(omitted)" }
  var debugDescription: String { description }
}

/// Pure read-only projection. AccountService remains the sole login/settings authority.
/// Capture, account tuple, private signature and publication all share MainActor without await.
@MainActor
final class PresentationOwner {
  static let maxSafeRevision = 9_007_199_254_740_991
  private let accountSnapshot: () -> PresentationAccountCapture
  private var revision: Int
  private var closed = false
  private var previous: Signature?
  private var published: PresentationSnapshot?
  private struct Signature: Equatable {
    let accountRevision: Int
    let identity: Data?
    let authenticated: Bool
    let language: PreferenceLanguage
    let theme: PreferenceTheme?
    let effective: EffectiveTheme
    let temperature: TemperatureUnit?
    let measurement: MeasurementSystem?
  }
  convenience init(account: AccountService) {
    self.init(accountSnapshot: {
      // MainActor synchronous tuple: never combine a newer revision with an old observer cache.
      PresentationAccountCapture(revision: account.revision, session: account.session,
        cleanupRequired: account.pendingLogoutCleanupRevision != nil)
    })
  }
  /// Synchronous authority port permits controlled offline inputs; production binds init(account:).
  init(accountSnapshot: @escaping () -> PresentationAccountCapture, startingRevision: Int = 0) {
    precondition((0...Self.maxSafeRevision).contains(startingRevision))
    self.accountSnapshot = accountSnapshot; revision = startingRevision
  }
  private func reject(_ error: PresentationFailure) throws -> Never {
    closed = true; previous = nil; published = nil; throw error
  }
  func capture(_ system: PresentationSystemInput) throws -> PresentationSnapshot {
    guard !closed else { throw PresentationFailure.revisionExhausted }
    let account = accountSnapshot() // Exactly one same-actor capture per request.
    guard (0...Self.maxSafeRevision).contains(account.revision) else { try reject(.invalidAuthority) }
    let session = account.cleanupRequired ? nil : account.session
    if let session, session.userID.isEmpty { try reject(.invalidAuthority) }
    let setting = session?.setting
    let language = (setting?.language).flatMap(PreferenceLanguage.init(rawValue:)) ?? system.renderingLanguage
    let theme = (setting?.theme).flatMap(PreferenceTheme.init(rawValue:))
    let effective: EffectiveTheme
    switch theme { case .light?: effective = .light; case .dark?: effective = .dark; default: effective = system.appearance }
    let signature = Signature(accountRevision: account.revision, identity: session.map { Data($0.userID.utf8) },
      authenticated: session != nil, language: language, theme: theme, effective: effective,
      temperature: (setting?.temperatureUnit).flatMap(TemperatureUnit.init(rawValue:)),
      measurement: (setting?.measurementSystem).flatMap(MeasurementSystem.init(rawValue:)))
    if signature == previous, let published { return published }
    guard revision < Self.maxSafeRevision else { try reject(.revisionExhausted) }
    revision += 1
    let value = PresentationSnapshot(revision: revision, accountRevision: account.revision,
      authenticated: session != nil, language: language, themePreference: theme, effectiveTheme: effective,
      temperatureUnit: signature.temperature, measurementSystem: signature.measurement)
    previous = signature; published = value; return value
  }
}

/// Narrow engineering OS fallback, not saved preference aliases or region/tenant policy.
/// Unsupported/malformed tags are skipped; no supported OS tag -> English.
private func supportedSystemLanguage(_ tag: String) -> PreferenceLanguage? {
  guard tag.range(of: "^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$", options: .regularExpression) == tag.startIndex..<tag.endIndex else { return nil }
  let parts = tag.lowercased().split(separator: "-")
  if parts[0] == "en" { return .en }
  guard parts[0] == "zh" else { return nil }
  if parts.count == 1 { return .zhCN }
  switch parts[1] { case "hant", "tw": return .zhTW; case "hans", "cn": return .zhCN; default: return nil }
}

import Foundation

/// live means a valid requested cloud Shadow snapshot, never physical device online evidence.
enum DeviceReadPhase: Equatable { case authorizing, connecting, reading, live, recovering, forbidden, unavailable }
enum DeviceReadFailure: Error, Equatable { case authorization, configuration, connection, initializationTimeout, snapshotTimeout, shadowProtocol, closed }
enum DeviceReadCloseReason: Equatable { case noAccount, accountChanged, released, ownerClosed, duplicateObserver }
struct DeviceReadMetadata: Equatable { let title: String; let productID: String; let category: String; let bindingRole: String? }
/// Native-only merged data. Raw reported is never a JS DTO; authorityRevision is NOT bridge revision.
struct DeviceReadSnapshot: Equatable {
  let accountRevision: Int
  let resourceID: String
  var authorityRevision: Int64
  var connectionEpoch: Int64?
  var metadata: DeviceReadMetadata?
  var reported = ShadowValue.fields([:])
  var online: Bool?
  var phase = DeviceReadPhase.authorizing
  var stale = false
  var snapshotAvailable = false
  var failure: DeviceReadFailure?
}
enum DeviceReadObservationState: Equatable { case current(DeviceReadSnapshot), closed(DeviceReadCloseReason) }

@MainActor
protocol AuthorizedDeviceLease: AnyObject {
  var lease: NativeShadowLeasePort { get }
  func close()
}

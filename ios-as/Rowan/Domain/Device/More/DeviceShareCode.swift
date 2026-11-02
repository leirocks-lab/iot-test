import Foundation

/// Native ephemeral credential, not an access token or a defined production QR payload.
/// Do not persist, log, place in events, infer expiry, or silently regenerate this value.
struct DeviceShareCode:Sendable,CustomStringConvertible,CustomDebugStringConvertible,CustomReflectable {
  let bindCode:String
  var description:String {"DeviceShareCode(redacted)"}
  var debugDescription:String {description}
  var customMirror:Mirror {Mirror(self,children:["redacted":true],displayStyle:.struct)}
}
@MainActor protocol DeviceShareCodeRepository {
  var scope:DeviceMoreScope {get}
  func generate() async throws -> DeviceShareCode
}

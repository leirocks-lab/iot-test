import Foundation

/// Major3 retains the V2 GET allowlists. Local itemKey conveys no write authority or server task/rule ID.
struct DeviceScheduleSummaryDTO: Sendable {
  let itemKey: String
  let name: String
  let type: String
  let startTime: String
  let repeatType: String
  let weekdays: [Int]
  let timeZone: String
  let nextExecutionAt: String
  let enabledState: String
  init(itemKey: String, record: ScheduleRecord) {
    self.itemKey = itemKey; name = record.name ?? ""; type = record.type?.rawValue ?? "unknown"
    startTime = record.startTime ?? ""; repeatType = record.repeatType?.rawValue ?? "unknown"
    weekdays = record.weekdays ?? []; timeZone = record.timeZone ?? ""; nextExecutionAt = record.nextExecutionAt ?? ""
    enabledState = record.enabled.map { $0 ? "enabled" : "disabled" } ?? "unknown"
  }
  var dictionary: [String: Any] {
    ["itemKey": itemKey, "name": name, "type": type, "startTime": startTime, "repeatType": repeatType,
     "weekdays": weekdays, "timeZone": timeZone, "nextExecutionAt": nextExecutionAt, "enabledState": enabledState]
  }
}
struct DeviceFirmwareOfferDTO: Sendable {
  let kind: String
  let version: String
  let remark: String
  let deviceName: String
  init(offer: OtaOffer) {
    kind = offer.kind.rawValue; version = offer.firmware.version; remark = offer.firmware.remark ?? ""; deviceName = offer.device.name
  }
  var dictionary: [String: Any] {
    ["kind": kind, "version": version, "remark": remark, "deviceName": deviceName]
  }
}

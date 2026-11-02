import Foundation

extension DeviceMoreSummary {
  var dictionary: [String: String] { ["deviceNickname": deviceNickname, "deviceName": deviceName, "productName": productName, "productCategory": productCategory,
    "seriesName": seriesName, "modelName": modelName, "mcuVersion": mcuVersion, "wifiVersion": wifiVersion, "bindingRole": bindingRole] }
}
extension DeviceMoreMember { var dictionary: [String: String] { ["itemKey": itemKey, "nickname": nickname, "bindingRole": bindingRole] } }
extension DeviceMoreHelp { var dictionary: [String: String] { ["itemKey": itemKey, "title": title, "content": content, "createdAt": createdAt] } }
extension DeviceLocationSummary { var dictionary: [String: String] { ["assignment": assignment.rawValue, "roomName": roomName] } }

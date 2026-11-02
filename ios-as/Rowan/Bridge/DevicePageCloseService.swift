import UIKit

/// Major3 close intent belongs to one native root instance, never the latest shared module map.
@MainActor
enum DevicePageCloseService {
  @discardableResult
  static func close(_ requestedPageSessionID: String, currentPage: UIViewController?, pageSessionID: String?,
                    authorized: Bool, animated: Bool = true) -> Bool {
    guard !requestedPageSessionID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          let page = currentPage, let pageSessionID,
          requestedPageSessionID.utf8.elementsEqual(pageSessionID.utf8), authorized,
          let navigation = page.navigationController, navigation.topViewController === page,
          navigation.visibleViewController === page,
          page.presentedViewController == nil, navigation.presentedViewController == nil else { return false }
    return navigation.popViewController(animated: animated) === page
  }
}

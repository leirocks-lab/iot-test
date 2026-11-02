import XCTest
import UIKit
@testable import Rowan

/// Actual UIKit navigation service definitions. No RN runtime, observation, backend or Keychain.
/// Windows cannot compile or execute these hosted XCTest cases.
@MainActor
final class DevicePageCloseTests: XCTestCase {
  func testLatePageATokenCannotPopPageBAfterSharedModuleReplacement() {
    let root = UIViewController(), a = UIViewController(), b = UIViewController()
    let aID = UUID().uuidString, bID = UUID().uuidString
    let navigation = UINavigationController(rootViewController: root)
    navigation.setViewControllers([root, a, b], animated: false)
    XCTAssertFalse(DevicePageCloseService.close(aID, currentPage: b, pageSessionID: bID, authorized: true, animated: false))
    XCTAssertTrue(navigation.topViewController === b); XCTAssertEqual(navigation.viewControllers.count, 3)
  }
  func testPageBOwnTokenClosesBAndRestoredPageACanUseItsOriginalToken() {
    let root = UIViewController(), a = UIViewController(), b = UIViewController()
    let aID = UUID().uuidString, bID = UUID().uuidString
    let navigation = UINavigationController(rootViewController: root)
    navigation.setViewControllers([root, a, b], animated: false)
    XCTAssertTrue(DevicePageCloseService.close(bID, currentPage: b, pageSessionID: bID, authorized: true, animated: false))
    XCTAssertTrue(navigation.topViewController === a)
    XCTAssertTrue(DevicePageCloseService.close(aID, currentPage: a, pageSessionID: aID, authorized: true, animated: false))
    XCTAssertTrue(navigation.topViewController === root)
  }
  func testBootstrapFailureWithoutModuleOwnerOrObservationCanCloseOwnPage() {
    let root = UIViewController(), page = UIViewController(), token = UUID().uuidString
    let navigation = UINavigationController(rootViewController: root)
    navigation.setViewControllers([root, page], animated: false)
    // Neither beginModule nor observeDevice is needed to return with this root's initial prop.
    XCTAssertTrue(DevicePageCloseService.close(token, currentPage: page, pageSessionID: token, authorized: true, animated: false))
    XCTAssertTrue(navigation.topViewController === root)
  }
  func testEmptyTokenInvalidAccountMissingPageAndDetachedPageCannotClose() {
    let root = UIViewController(), page = UIViewController(), token = UUID().uuidString
    let navigation = UINavigationController(rootViewController: root)
    navigation.setViewControllers([root, page], animated: false)
    for request in ["", " ", token + " "] {
      XCTAssertFalse(DevicePageCloseService.close(request, currentPage: page, pageSessionID: token, authorized: true, animated: false))
    }
    XCTAssertFalse(DevicePageCloseService.close(token, currentPage: page, pageSessionID: token, authorized: false, animated: false))
    XCTAssertFalse(DevicePageCloseService.close(token, currentPage: nil, pageSessionID: nil, authorized: true, animated: false))
    XCTAssertFalse(DevicePageCloseService.close(token, currentPage: UIViewController(), pageSessionID: token, authorized: true, animated: false))
    XCTAssertTrue(navigation.topViewController === page)
  }
  func testMatchingCoveredPageTokenDoesNotPopCurrentTopPage() {
    let root = UIViewController(), a = UIViewController(), b = UIViewController(), token = UUID().uuidString
    let navigation = UINavigationController(rootViewController: root)
    navigation.setViewControllers([root, a, b], animated: false)
    XCTAssertFalse(DevicePageCloseService.close(token, currentPage: a, pageSessionID: token, authorized: true, animated: false))
    XCTAssertTrue(navigation.topViewController === b)
  }
  func testNativeModalCoverRejectsLateCloseAndDismissRestoresOriginalToken() async {
    for (style, presentFromPage) in [(UIModalPresentationStyle.pageSheet, true), (.fullScreen, false)] {
      let root = UIViewController(), page = UIViewController(), modal = UIViewController(), token = UUID().uuidString
      let navigation = UINavigationController(rootViewController: root)
      navigation.setViewControllers([root, page], animated: false)
      let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
      window.rootViewController = navigation; window.makeKeyAndVisible()
      defer { window.isHidden = true }
      modal.modalPresentationStyle = style
      let presenter: UIViewController = presentFromPage ? page : navigation
      await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
        presenter.present(modal, animated: false) { continuation.resume() }
      }
      XCTAssertTrue(navigation.topViewController === page) // Stack top alone is insufficient.
      XCTAssertFalse(DevicePageCloseService.close(token, currentPage: page, pageSessionID: token, authorized: true, animated: false))
      XCTAssertEqual(navigation.viewControllers.count, 2)
      await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
        presenter.dismiss(animated: false) { continuation.resume() }
      }
      XCTAssertTrue(DevicePageCloseService.close(token, currentPage: page, pageSessionID: token, authorized: true, animated: false))
      XCTAssertTrue(navigation.topViewController === root)
    }
  }
}

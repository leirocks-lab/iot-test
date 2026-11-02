import XCTest
import UIKit
import AVFoundation
@testable import Rowan

private final class QRPhotoTestProvider: QRPhotoFileProvider, @unchecked Sendable {
  let lock = NSLock(), progress = Progress(totalUnitCount: 1)
  private var completion: (@Sendable (URL?) -> Void)?
  private var count = 0
  var loads: Int { lock.lock(); defer { lock.unlock() }; return count }
  func load(_ completion: @escaping @Sendable (URL?) -> Void) -> Progress { lock.lock(); count += 1; self.completion = completion; lock.unlock(); return progress }
  func finish() { lock.lock(); let callback = completion; completion = nil; lock.unlock(); DispatchQueue.global().async { callback?(nil) } }
}
private final class QRPhotoTestTimeout: @unchecked Sendable {
  let lock = NSLock()
  private var callback: (@Sendable () -> Void)?
  func install(_ callback: @escaping @Sendable () -> Void) { lock.lock(); self.callback = callback; lock.unlock() }
  func fire() { lock.lock(); let action = callback; callback = nil; lock.unlock(); action?() }
}
private final class QRPhotoTestCalls: @unchecked Sendable {
  let lock = NSLock()
  private var value = 0
  var count: Int { lock.lock(); defer { lock.unlock() }; return value }
  func increment() { lock.lock(); value += 1; lock.unlock() }
}
private final class QRTestCameraQueue: @unchecked Sendable {
  private let lock = NSLock()
  private var pending: [@Sendable () -> Void] = []
  func enqueue(_ action: @escaping @Sendable () -> Void) { lock.lock(); pending.append(action); lock.unlock() }
  func drain() {
    while true { lock.lock(); let action = pending.isEmpty ? nil : pending.removeFirst(); lock.unlock(); guard let action else { return }; action() }
  }
}
private final class QRTestCameraPort: QRScanCameraPort, @unchecked Sendable {
  let session = AVCaptureSession() // Never configured or started by this fake port.
  private let lock = NSLock()
  private var startCount = 0, stopCount = 0, configureCount = 0
  private var callbacks: [(QRScanTicket, @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void)] = []
  var configureHook: (@Sendable () -> Void)?
  var starts: Int { lock.lock(); defer { lock.unlock() }; return startCount }
  var stops: Int { lock.lock(); defer { lock.unlock() }; return stopCount }
  var configurations: Int { lock.lock(); defer { lock.unlock() }; return configureCount }
  func configure(_ ticket: QRScanTicket, callback: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) throws {
    lock.lock(); configureCount += 1; callbacks.append((ticket, callback)); let hook = configureHook; lock.unlock(); hook?()
  }
  func start() { lock.lock(); startCount += 1; lock.unlock() }
  func stop() { lock.lock(); stopCount += 1; lock.unlock() }
  func emit(_ ticket: QRScanTicket) {
    lock.lock(); let callback = callbacks.first { $0.0 == ticket }?.1; lock.unlock(); callback?(ticket, .failure(.unavailable))
  }
}

/// Draft definitions only. No camera, photo library, runtime QR sample or network is used.
@MainActor
final class QRScanTests: XCTestCase {
  private func element(_ id: String, in view: UIView) -> UIView? {
    if view.accessibilityIdentifier == id { return view }
    for child in view.subviews { if let found = element(id, in: child) { return found } }; return nil
  }
  private func drained(_ reader: QRPhotoReader) async throws {
    for _ in 0..<1000 { if !reader.busy { return }; try await Task.sleep(nanoseconds: 1_000_000) }
    XCTFail("In-memory provider did not drain"); throw QRScanFailure.unavailable
  }
  private func session(_ current: @escaping () -> Bool = { true }) -> QRScanSession {
    let value = QRScanSession(accountRevision: 7, accountCurrent: current); value.visibility(true, active: true); return value
  }
  func testCameraPermissionRequiresCurrentVisibleTicket() throws {
    let value = session(), ticket = try XCTUnwrap(value.beginCamera())
    XCTAssertEqual(value.phase, .permission); XCTAssertTrue(value.permission(.authorized, ticket: ticket)); XCTAssertEqual(value.phase, .camera)
  }
  func testDeniedAndRestrictedCameraStillPermitSystemPhotoPicker() throws {
    for permission in [QRPermission.denied, .restricted, .unavailable] {
      let value = session(), ticket = try XCTUnwrap(value.beginCamera())
      XCTAssertFalse(value.permission(permission, ticket: ticket)); XCTAssertNotNil(value.beginPicker())
    }
  }
  func testAccountChangeBeforePermissionRejectsLateGrant() throws {
    var current = true; let value = session { current }, ticket = try XCTUnwrap(value.beginCamera()); current = false
    XCTAssertFalse(value.permission(.authorized, ticket: ticket)); value.visibility(true, active: true); XCTAssertEqual(value.phase, .closed)
  }
  func testPreviousCameraTicketCannotPublishIntoRestart() throws {
    let value = session(), old = try XCTUnwrap(value.beginCamera()); XCTAssertTrue(value.permission(.authorized, ticket: old)); let next = try XCTUnwrap(value.beginCamera())
    XCTAssertTrue(value.permission(.authorized, ticket: next)); value.received([try QRPayload("untrusted")], ticket: old); XCTAssertEqual(value.phase, .camera)
  }
  func testPageIdentityPreventsCrossPageCallbackWithSameAccountRevision() throws {
    let a = session(), b = session(), ticket = try XCTUnwrap(a.beginCamera()), own = try XCTUnwrap(b.beginCamera())
    XCTAssertTrue(b.permission(.authorized, ticket: own)); b.received([try QRPayload("untrusted")], ticket: ticket); XCTAssertEqual(b.phase, .camera)
  }
  func testBackgroundInvalidatesCameraAndOwnedPickerCallbacks() throws {
    for picker in [false, true] {
      let value = session(), ticket = try XCTUnwrap(picker ? value.beginPicker() : value.beginCamera())
      value.visibility(false, active: false, ownedPickerCover: true); value.visibility(true, active: true)
      XCTAssertFalse(value.permission(.authorized, ticket: ticket)); XCTAssertFalse(value.beginPhoto(ticket))
    }
  }
  func testOwnedPickerCoverPreservesTicketUntilActualDismiss() throws {
    let value = session(), ticket = try XCTUnwrap(value.beginPicker())
    value.visibility(false, active: true, ownedPickerCover: true); XCTAssertFalse(value.beginPhoto(ticket))
    value.visibility(true, active: true); XCTAssertTrue(value.beginPhoto(ticket)); XCTAssertEqual(value.phase, .processing)
  }
  func testOrdinaryPageCoverInvalidatesPickerTicket() throws {
    let value = session(), ticket = try XCTUnwrap(value.beginPicker()); value.visibility(false, active: true)
    value.visibility(true, active: true); XCTAssertFalse(value.beginPhoto(ticket))
  }
  func testCancellationAndCloseDoNotReviveFromLatePhoto() throws {
    let value = session(), ticket = try XCTUnwrap(value.beginPicker()); value.close()
    value.received([try QRPayload("untrusted")], ticket: ticket); XCTAssertEqual(value.phase, .closed)
    XCTAssertNil(value.beginCamera()); XCTAssertNil(value.beginPicker())
  }
  func testPickerCancelStartsNoBusinessAndInvalidatesItsTicket() throws {
    let value = session(), ticket = try XCTUnwrap(value.beginPicker()); value.cancelPicker(ticket)
    XCTAssertEqual(value.phase, .inactive); XCTAssertFalse(value.beginPhoto(ticket)); XCTAssertNotNil(value.beginCamera())
  }
  func testImageAndCameraBothRejectDecodedProductionUnknown() throws {
    for photo in [false, true] {
      let value = session(), ticket = try XCTUnwrap(photo ? value.beginPicker() : value.beginCamera())
      if photo { XCTAssertTrue(value.beginPhoto(ticket)) } else { XCTAssertTrue(value.permission(.authorized, ticket: ticket)) }
      value.received([try QRPayload("https://example.invalid/not-device-authority")], ticket: ticket)
      XCTAssertEqual(value.phase, .unsupported)
    }
  }
  func testLegacyTestSchemaCannotAuthorizeProduction() throws {
    XCTAssertEqual(ProductionQRInterpreter.interpret(try QRPayload("rowan.device/v1/public-fixture")), .unsupported)
  }
  func testNoCodeAndMultipleCodesHaveDistinctLocalFailures() throws {
    for count in [0, 2, 5] {
      let value = session(), ticket = try XCTUnwrap(value.beginCamera()); XCTAssertTrue(value.permission(.authorized, ticket: ticket))
      value.received(try (0..<count).map { try QRPayload("fixture-\($0)") }, ticket: ticket)
      XCTAssertEqual(value.phase, count == 0 ? .unreadable : .multiple)
    }
  }
  func testRawPayloadDescriptionAndReflectionNeverExposeCode() throws {
    let value = try QRPayload("private-payload-bind-code")
    XCTAssertFalse(String(describing: value).contains("private")); XCTAssertFalse(String(reflecting: value).contains("private"))
    XCTAssertEqual(Mirror(reflecting: value).children.first?.label, "redacted")
  }
  func testDecodedTextBudgetUsesUTF8BytesAndRejectsEmpty() throws {
    XCTAssertNoThrow(try QRPayload(String(repeating: "a", count: QRScanBudget.textBytes)))
    XCTAssertThrowsError(try QRPayload(String(repeating: "界", count: QRScanBudget.textBytes / 3 + 1)))
    XCTAssertThrowsError(try QRPayload(""))
  }
  func testPixelBudgetRejectsOverflowZeroAndOversizedBeforeDecode() {
    XCTAssertTrue(QRScanBudget.permits(width: 8_000, height: 5_000))
    for size in [(0, 1), (1, 0), (-1, 10), (Int.max, 2), (1, Int.max), (8_001, 5_000)] { XCTAssertFalse(QRScanBudget.permits(width: size.0, height: size.1)) }
  }
  func testPhotoAndPermissionDuplicatesCannotCreateSecondOperation() throws {
    let value = session(), picker = try XCTUnwrap(value.beginPicker())
    XCTAssertNil(value.beginPicker()); XCTAssertNil(value.beginCamera()); XCTAssertTrue(value.beginPhoto(picker))
    XCTAssertFalse(value.beginPhoto(picker)); XCTAssertNil(value.beginPicker()); XCTAssertNil(value.beginCamera())
  }
  func testAccountChangeAfterPhotoDecodeRejectsPrivateResult() throws {
    var current = true; let value = session { current }, picker = try XCTUnwrap(value.beginPicker())
    XCTAssertTrue(value.beginPhoto(picker)); current = false; value.received([try QRPayload("untrusted")], ticket: picker)
    XCTAssertEqual(value.phase, .processing); value.visibility(true, active: true); XCTAssertEqual(value.phase, .closed)
  }
  func testBoundedCopyUsesRandomOwnedNameAndDoesNotChangeSource() throws {
    let source = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension("private-name")
    let data = Data([0, 1, 2, 3]); try data.write(to: source); defer { try? FileManager.default.removeItem(at: source) }
    let owned = try QRPhotoReader.copyBounded(source); defer { try? FileManager.default.removeItem(at: owned) }
    XCTAssertEqual(try Data(contentsOf: owned), data); XCTAssertEqual(try Data(contentsOf: source), data)
    XCTAssertEqual(owned.pathExtension, "scan"); XCTAssertNotNil(UUID(uuidString: owned.deletingPathExtension().lastPathComponent))
    XCTAssertNotEqual(owned.lastPathComponent, source.lastPathComponent)
  }
  func testBoundedCopyRejectsActualBytesWithoutTrustingSourceLength() throws {
    let source = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try Data(repeating: 0, count: QRScanBudget.inputBytes + 1).write(to: source); defer { try? FileManager.default.removeItem(at: source) }
    XCTAssertThrowsError(try QRPhotoReader.copyBounded(source)) { error in XCTAssertEqual(error as? QRScanFailure, .resourceLimit) }
  }
  func testCorruptOwnedPhotoHasFixedUnreadableFailure() throws {
    let owned = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try Data("not an image".utf8).write(to: owned); defer { try? FileManager.default.removeItem(at: owned) }
    XCTAssertThrowsError(try QRPhotoReader.decode(owned)) { error in XCTAssertEqual(error as? QRScanFailure, .unreadable) }
  }
  func testUncooperativeCancelledProviderRetainsActualAdmissionUntilCallback() async throws {
    let timeout = QRPhotoTestTimeout(), reader = QRPhotoReader(scheduleTimeout: timeout.install), provider = QRPhotoTestProvider(), calls = QRPhotoTestCalls()
    let ticket = QRScanTicket(page: UUID(), generation: 1, accountRevision: 7)
    XCTAssertTrue(reader.read(provider, ticket: ticket) { _, _ in calls.increment() }); reader.cancel(ticket)
    XCTAssertTrue(provider.progress.isCancelled); XCTAssertTrue(reader.busy)
    XCTAssertFalse(reader.read(QRPhotoTestProvider(), ticket: ticket) { _, _ in XCTFail("Overlapping provider") })
    provider.finish(); try await drained(reader); XCTAssertEqual(calls.count, 1)
  }
  func testTimeoutSettlesOnceButCannotAdmitNewPickerUntilActualCompletion() async throws {
    let timeout = QRPhotoTestTimeout(), reader = QRPhotoReader(scheduleTimeout: timeout.install), provider = QRPhotoTestProvider(), calls = QRPhotoTestCalls()
    let ticket = QRScanTicket(page: UUID(), generation: 1, accountRevision: 7)
    XCTAssertTrue(reader.read(provider, ticket: ticket) { _, _ in calls.increment() }); timeout.fire()
    XCTAssertEqual(calls.count, 1); XCTAssertTrue(reader.busy)
    XCTAssertFalse(reader.read(QRPhotoTestProvider(), ticket: ticket) { _, _ in XCTFail("QRPhotoTestTimeout released actual permit") })
    provider.finish(); try await drained(reader); XCTAssertEqual(calls.count, 1)
  }
  func testOldPageCancellationCannotCancelSubsequentPhotoOwner() async throws {
    let timeout = QRPhotoTestTimeout(), reader = QRPhotoReader(scheduleTimeout: timeout.install), first = QRPhotoTestProvider(), second = QRPhotoTestProvider()
    let old = QRScanTicket(page: UUID(), generation: 1, accountRevision: 7), next = QRScanTicket(page: UUID(), generation: 1, accountRevision: 8)
    XCTAssertTrue(reader.read(first, ticket: old) { _, _ in }); first.finish(); try await drained(reader)
    XCTAssertTrue(reader.read(second, ticket: next) { _, _ in }); reader.cancel(old)
    XCTAssertFalse(second.progress.isCancelled); XCTAssertTrue(reader.busy); second.finish(); try await drained(reader)
  }
  func testControllerStalePickerAfterBackgroundDropsImageAndRestoresRetryControls() async throws {
    let (account, _) = try await makeDeviceReadAccount()
    let model = QRScanSession(accountRevision: account.revision, accountCurrent: { true })
    var visible = true, active = true
    model.visibility(visible, active: active)
    let ticket = try XCTUnwrap(model.beginPicker())
    let controller = QRScanViewController(account: account, expectedRevision: account.revision, session: model,
      visibility: { (visible, active) })
    controller.loadViewIfNeeded(); controller.ownPicker(ticket)
    let album = try XCTUnwrap(element("scan_album", in: controller.view) as? UIButton)
    let retry = try XCTUnwrap(element("scan_retry", in: controller.view) as? UIButton)
    XCTAssertFalse(album.isEnabled); XCTAssertTrue(retry.isHidden)
    visible = false; active = false; model.visibility(false, active: false, ownedPickerCover: true)
    active = true; model.visibility(false, active: true, ownedPickerCover: true) // Picker still covers native page.
    visible = true // Actual system-picker dismissal completes.
    let provider = QRPhotoTestProvider(); controller.completePickerDismissal(ticket, provider: provider)
    XCTAssertEqual(provider.loads, 0); XCTAssertNil(controller.pendingPhotoTicket)
    XCTAssertTrue(album.isEnabled); XCTAssertFalse(retry.isHidden); XCTAssertEqual(model.phase, .inactive)
  }
  func testControllerStalePickerWithInvalidAccountRendersClosedInsteadOfLoadingOldImage() async throws {
    let (account, _) = try await makeDeviceReadAccount(); var current = true
    let model = QRScanSession(accountRevision: account.revision, accountCurrent: { current })
    model.visibility(true, active: true); let ticket = try XCTUnwrap(model.beginPicker())
    let controller = QRScanViewController(account: account, expectedRevision: account.revision, session: model, visibility: { (true, true) })
    controller.loadViewIfNeeded(); controller.ownPicker(ticket); current = false
    let provider = QRPhotoTestProvider(); controller.completePickerDismissal(ticket, provider: provider)
    XCTAssertEqual(provider.loads, 0); XCTAssertNil(controller.pendingPhotoTicket); XCTAssertEqual(model.phase, .closed)
    XCTAssertFalse(try XCTUnwrap(element("scan_album", in: controller.view) as? UIButton).isEnabled)
    XCTAssertTrue(try XCTUnwrap(element("scan_retry", in: controller.view) as? UIButton).isHidden)
  }
  func testQueuedCameraStartRetiredBeforeQueueReleaseNeverActivatesHardware() {
    let queue = QRTestCameraQueue(), port = QRTestCameraPort(), calls = QRPhotoTestCalls()
    let camera = QRScanCamera(port: port, enqueue: queue.enqueue), a = QRScanTicket(page: UUID(), generation: 1, accountRevision: 7)
    camera.start(a) { _, _ in calls.increment() }; camera.stop(a); queue.drain()
    XCTAssertEqual(port.configurations, 0); XCTAssertEqual(port.starts, 0); XCTAssertEqual(calls.count, 0)
  }
  func testCancellationDuringCameraConfigurationRechecksBeforeHardwareStart() {
    let queue = QRTestCameraQueue(), port = QRTestCameraPort()
    let camera = QRScanCamera(port: port, enqueue: queue.enqueue), a = QRScanTicket(page: UUID(), generation: 1, accountRevision: 7)
    port.configureHook = { camera.stop(a) }; camera.start(a) { _, _ in XCTFail("Cancelled configure published") }; queue.drain()
    XCTAssertEqual(port.configurations, 1); XCTAssertEqual(port.starts, 0)
    port.configureHook = nil
    let b = QRScanTicket(page: UUID(), generation: 2, accountRevision: 7), calls = QRPhotoTestCalls()
    camera.start(b) { _, _ in calls.increment() }; queue.drain(); XCTAssertEqual(port.starts, 1)
    let stops = port.stops; camera.stop(a); port.emit(a); queue.drain()
    XCTAssertEqual(port.stops, stops); XCTAssertEqual(calls.count, 0)
    port.emit(b); queue.drain(); XCTAssertEqual(calls.count, 1)
  }
  func testLateOldMetadataAndStopCannotEndNewCameraOwner() {
    let queue = QRTestCameraQueue(), port = QRTestCameraPort(), calls = QRPhotoTestCalls()
    let camera = QRScanCamera(port: port, enqueue: queue.enqueue)
    let a = QRScanTicket(page: UUID(), generation: 1, accountRevision: 7), b = QRScanTicket(page: UUID(), generation: 1, accountRevision: 8)
    camera.start(a) { _, _ in XCTFail("Old owner callback") }; queue.drain()
    camera.start(b) { _, _ in calls.increment() }; queue.drain(); XCTAssertEqual(port.starts, 2)
    let stops = port.stops; port.emit(a); camera.stop(a); queue.drain()
    XCTAssertEqual(port.stops, stops); XCTAssertEqual(calls.count, 0)
    port.emit(b); queue.drain(); XCTAssertEqual(calls.count, 1); XCTAssertEqual(port.stops, stops + 1)
  }
}

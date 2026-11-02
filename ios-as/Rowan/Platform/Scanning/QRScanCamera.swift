import AVFoundation

protocol QRScanCameraPort: AnyObject, Sendable {
  var session: AVCaptureSession { get }
  func configure(_ ticket: QRScanTicket, callback: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) throws
  func start()
  func stop()
}

/// Latest intent is synchronous; hardware/configuration remains on the serial worker.
/// A queued request retired before its start boundary cannot activate the camera.
final class QRScanCamera: @unchecked Sendable {
  typealias Enqueue = (@escaping @Sendable () -> Void) -> Void
  private final class Request: Sendable {
    let id = UUID(), ticket: QRScanTicket
    let callback: @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void
    init(_ ticket: QRScanTicket, _ callback: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) { self.ticket = ticket; self.callback = callback }
  }
  private let lock = NSLock(), port: any QRScanCameraPort, enqueue: Enqueue
  private var latest: Request? // protected by lock; never hold lock during SDK I/O
  private var owned: Request? // worker queue only
  var session: AVCaptureSession { port.session }
  init(port: (any QRScanCameraPort)? = nil, enqueue: Enqueue? = nil) {
    let queue = DispatchQueue(label: "com.rowan.scan.camera")
    self.port = port ?? AVFoundationQRScanPort(queue: queue)
    self.enqueue = enqueue ?? { action in queue.async(execute: action) }
  }
  private func live(_ request: Request) -> Bool { lock.lock(); defer { lock.unlock() }; return latest?.id == request.id }
  private func retire(_ request: Request) { lock.lock(); if latest?.id == request.id { latest = nil }; lock.unlock() }
  func start(_ ticket: QRScanTicket, callback: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) {
    let request = Request(ticket, callback)
    lock.lock(); latest = request; lock.unlock()
    enqueue { [self] in
      guard live(request) else { return } // cancellation may precede entry into this queued block
      if owned != nil { port.stop(); owned = nil }
      do {
        try port.configure(ticket) { [weak self, request] expected, value in
          guard let self, expected == request.ticket else { return }
          enqueue { [self] in finish(request, value) }
        }
        guard live(request) else { port.stop(); return } // configuration may have outlived cancellation
        owned = request
        port.start() // Once SDK start has begun, a later cancel queues stop; UI never waits on that I/O.
      } catch { port.stop(); finish(request, .failure(.unavailable)) }
    }
  }
  func stop(_ expected: QRScanTicket?) {
    guard let expected else { return }
    lock.lock(); if latest?.ticket == expected { latest = nil }; lock.unlock()
    enqueue { [self] in
      guard owned?.ticket == expected else { return }
      port.stop(); owned = nil // an old A stop cannot shut down the newer B owner
    }
  }
  private func finish(_ request: Request, _ value: Result<[QRPayload], QRScanFailure>) {
    guard live(request) else { return }
    retire(request)
    if owned?.id == request.id { port.stop(); owned = nil }
    request.callback(request.ticket, value)
  }
}

/// SDK adapter: configuration/start/stop/metadata confined to the coordinator's serial queue.
private final class AVFoundationQRScanPort: NSObject, QRScanCameraPort, @unchecked Sendable {
  private final class MetadataSink: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    let ticket: QRScanTicket
    let receive: (QRScanTicket, [AVMetadataObject]) -> Void
    init(ticket: QRScanTicket, receive: @escaping (QRScanTicket, [AVMetadataObject]) -> Void) { self.ticket = ticket; self.receive = receive }
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) { receive(ticket, objects) }
  }
  let session = AVCaptureSession() // Reference used only for native preview binding on MainActor.
  private let queue: DispatchQueue
  private var configured = false
  private var output: AVCaptureMetadataOutput?
  private var sink: MetadataSink?
  private var notifications: [NSObjectProtocol] = []
  private var ticket: QRScanTicket?
  private var callback: (@Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void)?
  init(queue: DispatchQueue) { self.queue = queue; super.init() }
  func configure(_ ticket: QRScanTicket, callback: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) throws {
    self.ticket = ticket; self.callback = callback
    if !configured {
      guard let camera = AVCaptureDevice.default(for: .video) else { throw QRScanFailure.unavailable }
      let input = try AVCaptureDeviceInput(device: camera), output = AVCaptureMetadataOutput()
      session.beginConfiguration()
      var committed = false
      defer {
        if !committed { session.inputs.forEach { session.removeInput($0) }; session.outputs.forEach { session.removeOutput($0) } }
        session.commitConfiguration()
      }
      guard session.canAddInput(input), session.canAddOutput(output) else { throw QRScanFailure.unavailable }
      session.addInput(input); session.addOutput(output)
      guard output.availableMetadataObjectTypes.contains(.qr) else { throw QRScanFailure.unavailable }
      output.metadataObjectTypes = [.qr]; self.output = output
      configured = true; committed = true
    }
    let sink = MetadataSink(ticket: ticket) { [weak self] expected, values in self?.consume(values, expected: expected) }
    self.sink = sink; output?.setMetadataObjectsDelegate(sink, queue: queue)
    removeNotifications()
    for name in [AVCaptureSession.runtimeErrorNotification, AVCaptureSession.wasInterruptedNotification] {
      notifications.append(NotificationCenter.default.addObserver(forName: name, object: session, queue: nil) { [weak self] _ in
        guard let self else { return }; queue.async { [self] in guard self.ticket == ticket else { return }; finish(.failure(.unavailable)) }
      })
    }
  }
  func start() { if !session.isRunning { session.startRunning() } }
  func stop() {
    ticket = nil; callback = nil; sink = nil; output?.setMetadataObjectsDelegate(nil, queue: nil); removeNotifications()
    if session.isRunning { session.stopRunning() }
  }
  private func consume(_ metadataObjects: [AVMetadataObject], expected: QRScanTicket) {
    guard ticket == expected else { return }
    guard metadataObjects.count <= QRScanBudget.candidates else { finish(.failure(.multiple)); return }
    var unique = Set<Data>(), candidates: [QRPayload] = []
    do {
      for case let item as AVMetadataMachineReadableCodeObject in metadataObjects where item.type == .qr {
        guard let text = item.stringValue else { continue }
        guard text.utf8.count <= QRScanBudget.textBytes else { throw QRScanFailure.resourceLimit }
        if unique.insert(Data(text.utf8)).inserted { candidates.append(try QRPayload(text)) }
      }
      if !candidates.isEmpty { finish(.success(candidates)) }
    } catch let failure as QRScanFailure { finish(.failure(failure)) }
    catch { finish(.failure(.unreadable)) }
  }
  private func removeNotifications() { for token in notifications { NotificationCenter.default.removeObserver(token) }; notifications.removeAll() }
  private func finish(_ value: Result<[QRPayload], QRScanFailure>) {
    guard let ticket, let callback else { return }
    self.ticket = nil; self.callback = nil; sink = nil; output?.setMetadataObjectsDelegate(nil, queue: nil); removeNotifications()
    if session.isRunning { session.stopRunning() }
    callback(ticket, value) // Caller must fence account/page/generation on MainActor.
  }
}

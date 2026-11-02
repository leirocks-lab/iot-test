import Foundation
import PhotosUI
import UniformTypeIdentifiers
import ImageIO
import Vision

protocol QRPhotoFileProvider: Sendable {
  func load(_ completion: @escaping @Sendable (URL?) -> Void) -> Progress
}
struct QRSystemPhotoProvider: QRPhotoFileProvider, @unchecked Sendable {
  let provider: NSItemProvider
  init(_ provider: NSItemProvider) { self.provider = provider }
  func load(_ completion: @escaping @Sendable (URL?) -> Void) -> Progress {
    provider.loadFileRepresentation(forTypeIdentifier: UTType.image.identifier) { url, _ in completion(url) }
  }
}
/// One actual provider/copy/Vision operation at a time. Cancel/timeout cannot release its admission.
final class QRPhotoReader: @unchecked Sendable {
  private final class Job: @unchecked Sendable {
    let id = UUID(), ticket: QRScanTicket
    let lock = NSLock()
    var cancelled = false, delivered = false
    var progress: Progress?
    let completion: @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void
    init(_ ticket: QRScanTicket, completion: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) { self.ticket = ticket; self.completion = completion }
    func check() throws { lock.lock(); let stopped = cancelled; lock.unlock(); if stopped { throw QRScanFailure.unavailable } }
    func deliver(_ value: Result<[QRPayload], QRScanFailure>) {
      lock.lock(); let send = !delivered; delivered = true; lock.unlock()
      if send { completion(ticket, value) }
    }
    func cancel() { lock.lock(); cancelled = true; let pending = progress; lock.unlock(); pending?.cancel() }
    func install(_ value: Progress) { lock.lock(); progress = value; let stopped = cancelled; lock.unlock(); if stopped { value.cancel() } }
  }
  static let shared = QRPhotoReader() // Resource admission only; no account/session ownership.
  private let lock = NSLock(), queue = DispatchQueue(label: "com.rowan.scan.photo")
  private var job: Job?
  private let scheduleTimeout: (@escaping @Sendable () -> Void) -> Void
  init(scheduleTimeout: @escaping (@escaping @Sendable () -> Void) -> Void = { action in DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 8, execute: action) }) { self.scheduleTimeout = scheduleTimeout }
  var busy: Bool { lock.lock(); defer { lock.unlock() }; return job != nil }
  func cancel(_ ticket: QRScanTicket) { lock.lock(); let pending = job?.ticket == ticket ? job : nil; lock.unlock(); pending?.cancel() }
  @discardableResult func read(_ provider: any QRPhotoFileProvider, ticket: QRScanTicket,
    completion: @escaping @Sendable (QRScanTicket, Result<[QRPayload], QRScanFailure>) -> Void) -> Bool {
    lock.lock(); guard job == nil else { lock.unlock(); return false }
    let operation = Job(ticket, completion: completion); job = operation; lock.unlock()
    scheduleTimeout { operation.cancel(); operation.deliver(.failure(.unavailable)) }
    let progress = provider.load { [self, operation] url in
      // Provider URL is valid ONLY during this callback. Never dispatch it to another queue or retain it.
      // A provider unexpectedly completing on Main is rejected rather than blocking UI with the copy.
      guard !Thread.isMainThread, let url else { drain(operation, result: .failure(.unreadable)); return }
      var owned: URL?
      do {
        try operation.check()
        owned = try Self.copyBounded(url, check: operation.check)
        guard let owned else { throw QRScanFailure.unreadable }
        queue.async { [self, operation] in
          defer { try? FileManager.default.removeItem(at: owned); drain(operation) }
          do { try operation.check(); let values = try Self.decode(owned, check: operation.check); try operation.check(); operation.deliver(.success(values)) }
          catch let error as QRScanFailure { operation.deliver(.failure(error)) }
          catch { operation.deliver(.failure(.unreadable)) }
        }
      } catch {
        if let owned { try? FileManager.default.removeItem(at: owned) }
        drain(operation, result: .failure((error as? QRScanFailure) ?? .unreadable))
      }
    }
    operation.install(progress); return true
  }
  private func drain(_ operation: Job, result: Result<[QRPayload], QRScanFailure>? = nil) {
    if let result { operation.deliver(result) }
    lock.lock(); if job === operation { job = nil }; lock.unlock()
  }
  /// Dedicated namespace only. Never enumerate/delete picker sources or arbitrary user files.
  private static func ownedDirectory() throws -> URL {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("rowan-qr-owned-v1", isDirectory: true)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let cutoff = Date().addingTimeInterval(-24 * 60 * 60)
    for file in try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: [.creationDateKey, .isRegularFileKey, .isSymbolicLinkKey]) {
      guard file.pathExtension == "scan", UUID(uuidString: file.deletingPathExtension().lastPathComponent) != nil,
        let values = try? file.resourceValues(forKeys: [.creationDateKey, .isRegularFileKey, .isSymbolicLinkKey]),
        values.isRegularFile == true, values.isSymbolicLink != true, let date = values.creationDate, date < cutoff else { continue }
      try? FileManager.default.removeItem(at: file)
    }
    return root
  }
  static func copyBounded(_ source: URL, check: () throws -> Void = {}) throws -> URL {
    let destination = try ownedDirectory().appendingPathComponent(UUID().uuidString).appendingPathExtension("scan")
    guard let input = InputStream(url: source), let output = OutputStream(url: destination, append: false) else { throw QRScanFailure.unreadable }
    input.open(); output.open(); var kept = false
    defer { input.close(); output.close(); if !kept { try? FileManager.default.removeItem(at: destination) } }
    var buffer = [UInt8](repeating: 0, count: 64 * 1_024), total = 0
    while true {
      try check(); let wanted = min(buffer.count, QRScanBudget.inputBytes - total + 1); let count = input.read(&buffer, maxLength: wanted)
      guard count >= 0 else { throw QRScanFailure.unreadable }; if count == 0 { break }
      guard count <= QRScanBudget.inputBytes - total else { throw QRScanFailure.resourceLimit }; total += count
      var offset = 0
      while offset < count {
        try check()
        let written = buffer.withUnsafeBufferPointer { pointer in output.write(pointer.baseAddress!.advanced(by: offset), maxLength: count - offset) }
        guard written > 0 else { throw QRScanFailure.unreadable }; offset += written
      }
    }
    guard total > 0 else { throw QRScanFailure.unreadable }; kept = true; return destination
  }
  static func decode(_ owned: URL, check: () throws -> Void = {}) throws -> [QRPayload] {
    try check()
    guard let source = CGImageSourceCreateWithURL(owned as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
      CGImageSourceGetCount(source) == 1,
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let width = properties[kCGImagePropertyPixelWidth] as? NSNumber,
      let height = properties[kCGImagePropertyPixelHeight] as? NSNumber else { throw QRScanFailure.unreadable }
    guard QRScanBudget.permits(width: width.intValue, height: height.intValue) else { throw QRScanFailure.resourceLimit }
    guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: QRScanBudget.sampledSide,
      kCGImageSourceShouldCacheImmediately: true] as CFDictionary) else { throw QRScanFailure.unreadable }
    try check(); let request = VNDetectBarcodesRequest(); request.symbologies = [.qr]
    // Thumbnail transform applies original EXIF orientation; Vision receives upright sampled pixels.
    try VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request]); try check()
    let observations = request.results ?? []
    guard observations.count <= QRScanBudget.candidates else { throw QRScanFailure.multiple }
    var unique = Set<Data>(), payloads: [QRPayload] = []
    for item in observations {
      guard let text = item.payloadStringValue else { continue }
      guard text.utf8.count <= QRScanBudget.textBytes else { throw QRScanFailure.resourceLimit }
      if unique.insert(Data(text.utf8)).inserted { payloads.append(try QRPayload(text)) }
    }
    return payloads
  }
}

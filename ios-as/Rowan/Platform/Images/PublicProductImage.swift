import UIKit
import ImageIO

/// Public assets have their own bounded, cookie/credential-free transport and memory-only cache.
// Sendable invariant: cross-queue request state is locked; redirect count is delegate-queue-only;
// UIImage delivery is main-queue-only. Re-audit/remove unchecked conformance during Swift 6 migration.
private final class PublicProductImageRequest: NSObject, URLSessionDataDelegate, @unchecked Sendable {
  private static let workers: OperationQueue = { let value = OperationQueue(); value.maxConcurrentOperationCount = 4; value.qualityOfService = .utility; return value }()
  private static let cache: NSCache<NSString, UIImage> = { let value = NSCache<NSString, UIImage>(); value.totalCostLimit = 8 * 1024 * 1024; value.countLimit = 48; return value }()
  private static let limit = 2 * 1024 * 1024
  private let lock = NSLock()
  private let done = DispatchSemaphore(value: 0)
  private var cancelled = false
  private var finished = false
  private var accepted = false
  private var bytes = Data()
  private var redirects = 0
  private var session: URLSession?
  private var task: URLSessionDataTask?

  static func load(_ url: URL, edge: Int, completion: @escaping @MainActor (UIImage?) -> Void) -> PublicProductImageRequest {
    let request = PublicProductImageRequest()
    workers.addOperation { request.run(url, edge: min(1024, max(128, edge)), completion: completion) }
    return request
  }
  func cancel() {
    lock.lock(); cancelled = true; let session = self.session; lock.unlock()
    session?.invalidateAndCancel(); done.signal()
  }
  private var isCancelled: Bool { lock.lock(); defer { lock.unlock() }; return cancelled }
  private func finish() { lock.lock(); if !finished { finished = true; done.signal() }; lock.unlock() }
  private func run(_ url: URL, edge: Int, completion: @escaping @MainActor (UIImage?) -> Void) {
    guard !isCancelled else { return }
    let key = (url.absoluteString + "#\(edge)") as NSString
    if let image = Self.cache.object(forKey: key) { deliver(image, completion); return }
    let config = URLSessionConfiguration.ephemeral
    config.httpShouldSetCookies = false; config.httpCookieAcceptPolicy = .never; config.httpCookieStorage = nil
    config.urlCredentialStorage = nil; config.urlCache = nil; config.requestCachePolicy = .reloadIgnoringLocalCacheData
    config.timeoutIntervalForRequest = 8; config.timeoutIntervalForResource = 20
    config.httpAdditionalHeaders = ["Accept": "image/*"]
    let delegates = OperationQueue(); delegates.maxConcurrentOperationCount = 1
    let session = URLSession(configuration: config, delegate: self, delegateQueue: delegates)
    var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
    request.httpShouldHandleCookies = false
    let task = session.dataTask(with: request)
    lock.lock(); self.session = session; self.task = task; let stopped = cancelled; lock.unlock()
    if stopped { session.invalidateAndCancel(); return }
    task.resume()
    let timedOut = done.wait(timeout: .now() + 21) == .timedOut
    session.invalidateAndCancel()
    lock.lock(); let data = bytes; let valid = accepted && finished && !cancelled && !timedOut; self.session = nil; self.task = nil; bytes = Data(); lock.unlock()
    guard !isCancelled else { return }
    guard valid, !data.isEmpty, let source = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? NSNumber, let height = properties[kCGImagePropertyPixelHeight] as? NSNumber,
          width.doubleValue > 0, height.doubleValue > 0, width.doubleValue * height.doubleValue <= 32_000_000,
          let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: edge,
            kCGImageSourceShouldCacheImmediately: true] as CFDictionary) else { deliver(nil, completion); return }
    let image = UIImage(cgImage: thumbnail)
    Self.cache.setObject(image, forKey: key, cost: thumbnail.bytesPerRow * thumbnail.height)
    deliver(image, completion)
  }
  private func deliver(_ image: UIImage?, _ completion: @escaping @MainActor (UIImage?) -> Void) {
    DispatchQueue.main.async { [weak self] in guard let self, !self.isCancelled else { return }; completion(image) }
  }
  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
    guard !isCancelled, let response = response as? HTTPURLResponse, response.statusCode == 200,
          response.expectedContentLength <= Int64(Self.limit) else { completionHandler(.cancel); finish(); return }
    lock.lock(); accepted = true; lock.unlock(); completionHandler(.allow)
  }
  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    lock.lock()
    if cancelled || bytes.count + data.count > Self.limit { accepted = false; lock.unlock(); dataTask.cancel(); finish(); return }
    bytes.append(data); lock.unlock()
  }
  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if error != nil { lock.lock(); accepted = false; lock.unlock() }; finish()
  }
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
    redirects += 1
    guard redirects <= 3, !isCancelled, let target = request.url, ProductLink.url(target.absoluteString) != nil else { completionHandler(nil); return }
    var clean = URLRequest(url: target, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
    clean.httpShouldHandleCookies = false; clean.setValue("image/*", forHTTPHeaderField: "Accept")
    completionHandler(clean)
  }
  func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    completionHandler(challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust ? .performDefaultHandling : .cancelAuthenticationChallenge, nil)
  }
}

@MainActor
final class PublicProductImageView: UIView {
  private let picture = UIImageView()
  private let progress = UIActivityIndicatorView(style: .medium)
  private let message = UILabel()
  private let retry = UIButton(type: .system)
  private var source: String?
  private var edge = 256
  private var current: () -> Bool = { false }
  private var request: PublicProductImageRequest?
  private var generation = 0
  override init(frame: CGRect) {
    super.init(frame: frame)
    picture.contentMode = .scaleAspectFit; picture.translatesAutoresizingMaskIntoConstraints = false; addSubview(picture)
    message.font = .preferredFont(forTextStyle: .caption2); message.textColor = .secondaryLabel; message.textAlignment = .center
    message.adjustsFontForContentSizeCategory = true; message.numberOfLines = 0
    retry.setTitle("重试图片", for: .normal); retry.titleLabel?.font = .preferredFont(forTextStyle: .caption1)
    retry.addTarget(self, action: #selector(load), for: .touchUpInside)
    let state = UIStackView(arrangedSubviews: [message, retry]); state.axis = .vertical; state.alignment = .center; state.translatesAutoresizingMaskIntoConstraints = false; addSubview(state)
    progress.translatesAutoresizingMaskIntoConstraints = false; addSubview(progress)
    NSLayoutConstraint.activate([picture.leadingAnchor.constraint(equalTo: leadingAnchor), picture.trailingAnchor.constraint(equalTo: trailingAnchor), picture.topAnchor.constraint(equalTo: topAnchor), picture.bottomAnchor.constraint(equalTo: bottomAnchor), state.centerXAnchor.constraint(equalTo: centerXAnchor), state.centerYAnchor.constraint(equalTo: centerYAnchor), state.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor), progress.centerXAnchor.constraint(equalTo: centerXAnchor), progress.centerYAnchor.constraint(equalTo: centerYAnchor)])
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  func bind(source: String?, edge: Int, description: String, current: @escaping () -> Bool) {
    cancelLoad(); picture.image = nil; self.source = source; self.edge = edge; self.current = current
    picture.isAccessibilityElement = true; picture.accessibilityLabel = description
    load()
  }
  func cancelLoad() { generation += 1; request?.cancel(); request = nil; progress.stopAnimating() }
  func resumeLoad() { if picture.image == nil && request == nil { load() } }
  override func didMoveToWindow() { super.didMoveToWindow(); if window == nil { cancelLoad() } else { resumeLoad() } }
  @objc private func load() {
    guard current(), request == nil else { return }
    guard let url = ProductLink.url(source) else { message.text = "暂无有效图片"; message.isHidden = false; retry.isHidden = true; return }
    generation += 1; let expected = generation
    message.isHidden = true; retry.isHidden = true; progress.startAnimating()
    request = PublicProductImageRequest.load(url, edge: edge) { [weak self] image in
      guard let self, generation == expected, current() else { return }
      request = nil; progress.stopAnimating(); picture.image = image
      message.text = image == nil ? "图片加载失败" : nil; message.isHidden = image != nil; retry.isHidden = image != nil
    }
  }
}

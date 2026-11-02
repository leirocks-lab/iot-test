import UIKit

@MainActor
final class AgreementViewController: UIViewController, UITextViewDelegate {
  private let kind: AgreementKind
  private let context: AgreementContext
  private let service: any AgreementContentService
  private let completed: () -> Void
  private var task: Task<Void, Never>?
  private var timer: Timer?
  private var lastTick: TimeInterval?
  private var loaded = false
  private var gate = AgreementReadingGate(requiredSeconds: 60)
  private let text = UITextView()
  private let status = UILabel()
  private let finish = UIButton(type: .system)

  init(kind: AgreementKind, context: AgreementContext, service: any AgreementContentService,
       completed: @escaping () -> Void) {
    self.kind = kind
    self.context = context
    self.service = service
    self.completed = completed
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  deinit { task?.cancel(); timer?.invalidate() }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = kind.title
    view.backgroundColor = .systemBackground
    text.isEditable = false
    text.isSelectable = true
    text.dataDetectorTypes = []
    text.alwaysBounceVertical = true
    text.font = .preferredFont(forTextStyle: .body)
    text.adjustsFontForContentSizeCategory = true
    text.delegate = self
    text.textContainerInset = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
    status.numberOfLines = 0
    status.textAlignment = .center
    status.font = .preferredFont(forTextStyle: .footnote)
    finish.addTarget(self, action: #selector(confirmRead), for: .touchUpInside)
    let stack = UIStackView(arrangedSubviews: [text, status, finish])
    stack.axis = .vertical
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
      finish.heightAnchor.constraint(greaterThanOrEqualToConstant: 48)
    ])
    navigationItem.rightBarButtonItem = UIBarButtonItem(title: "重试", style: .plain, target: self, action: #selector(load))
    NotificationCenter.default.addObserver(self, selector: #selector(pauseClock), name: UIApplication.willResignActiveNotification, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(resumeClock), name: UIApplication.didBecomeActiveNotification, object: nil)
    load()
  }

  override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); resumeClock() }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    pauseClock()
    task?.cancel()
  }

  @objc private func load() {
    task?.cancel()
    pauseClock()
    loaded = false
    gate = AgreementReadingGate(requiredSeconds: 60)
    text.text = nil
    status.text = "正在加载协议…"
    finish.isEnabled = false
    finish.setTitle("阅读全文，同意并继续 60s", for: .normal)
    navigationItem.rightBarButtonItem?.isEnabled = false
    task = Task { [weak self] in
      guard let self else { return }
      defer { navigationItem.rightBarButtonItem?.isEnabled = true }
      do {
        let content = try await service.load(kind, context: context)
        try Task.checkCancellation()
        text.text = content
        text.setContentOffset(.zero, animated: false)
        loaded = true
        updateGateUI()
        resumeClock()
      } catch is CancellationError { return }
      catch { status.text = (error as? RowanFailure)?.message ?? "无法加载协议，请重试" }
    }
  }

  @objc private func resumeClock() {
    guard loaded, viewIfLoaded?.window != nil, UIApplication.shared.applicationState == .active else { return }
    timer?.invalidate()
    lastTick = ProcessInfo.processInfo.systemUptime
    timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
      // UIKit reader and timer are owned exclusively by the main run loop.
      Task { @MainActor [weak self] in self?.tick() }
    }
  }
  @objc private func pauseClock() {
    tick()
    timer?.invalidate()
    timer = nil
    lastTick = nil
  }
  private func tick() {
    guard let lastTick else { return }
    let now = ProcessInfo.processInfo.systemUptime
    if loaded, viewIfLoaded?.window != nil, UIApplication.shared.applicationState == .active {
      gate.advance(by: now - lastTick)
    }
    self.lastTick = now
    updateGateUI()
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    guard loaded, scrollView.isDragging || scrollView.isDecelerating else { return }
    let visibleBottom = scrollView.contentOffset.y + scrollView.bounds.height - scrollView.adjustedContentInset.bottom
    if visibleBottom >= scrollView.contentSize.height - 1 { gate.markBottomReached() }
    updateGateUI()
  }
  private func updateGateUI() {
    guard loaded else { return }
    status.text = gate.scrolledToBottom ? "请完成阅读倒计时" : "请向下滚动至正文末尾"
    if gate.canFinish { status.text = "阅读完成" }
    finish.isEnabled = gate.canFinish
    finish.setTitle(gate.remainingSeconds > 0 ? "阅读全文，同意并继续 \(gate.remainingSeconds)s" : "阅读全文，同意并继续", for: .normal)
  }
  @objc private func confirmRead() {
    guard loaded, gate.canFinish else { return }
    pauseClock()
    completed()
    navigationController?.popViewController(animated: true)
  }
}

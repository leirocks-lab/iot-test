import UIKit
import SafariServices

private func productConnectionLabel(_ value: String?) -> String? {
  switch value?.lowercased() { case "wifi", "wi-fi": return "Wi-Fi"; case "bluetooth": return "蓝牙"; default: return nil }
}

@MainActor
final class ProductCatalogViewController: UICollectionViewController, UICollectionViewDelegateFlowLayout {
  private let service: any ProductCatalogService
  private let model: ProductCatalogModel
  private let current: () -> Bool
  private let language: String
  private var sections: [(String, [CatalogProduct])] = []
  private let status = UILabel()
  init(service: any ProductCatalogService, account: AccountService) {
    self.service = service
    let revision = account.revision
    let current = { account.session != nil && account.revision == revision }
    self.current = current
    let userLanguage = account.session?.setting?.language ?? "zh-CN"
    language = userLanguage
    model = ProductCatalogModel(service: service, current: current, language: userLanguage)
    let layout = UICollectionViewFlowLayout(); layout.sectionInset = UIEdgeInsets(top: 8, left: 16, bottom: 16, right: 16)
    layout.minimumInteritemSpacing = 10; layout.minimumLineSpacing = 12
    super.init(collectionViewLayout: layout)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override func viewDidLoad() {
    super.viewDidLoad(); title = "添加设备"
    collectionView.backgroundColor = UIColor(white: 242 / 255, alpha: 1)
    collectionView.register(CatalogProductCell.self, forCellWithReuseIdentifier: "product")
    collectionView.register(CatalogSectionHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header")
    status.numberOfLines = 0; status.textAlignment = .center; status.font = .preferredFont(forTextStyle: .body)
    status.adjustsFontForContentSizeCategory = true
    collectionView.backgroundView = status
    navigationItem.rightBarButtonItems = [UIBarButtonItem(title: "品类", style: .plain, target: nil, action: nil), UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(reload))]
    model.onChange = { [weak self] in self?.render() }
    NotificationCenter.default.addObserver(self, selector: #selector(cancelLoad), name: UIApplication.willResignActiveNotification, object: nil)
    reload()
  }
  override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }
  override func viewWillDisappear(_ animated: Bool) { super.viewWillDisappear(animated); cancelLoad() }
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    collectionView.visibleCells.compactMap { $0 as? CatalogProductCell }.forEach { $0.resumeImage() }
    if isViewLoaded, !model.loaded, !model.busy { model.load() }
  }
  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) { super.traitCollectionDidChange(previousTraitCollection); collectionView.collectionViewLayout.invalidateLayout() }
  @objc private func reload() { model.load() }
  @objc private func cancelLoad() { model.cancel(); collectionView.visibleCells.compactMap { $0 as? CatalogProductCell }.forEach { $0.cancelImage() } }
  private func render() {
    guard current() else {
      sections = []; collectionView.reloadData(); status.text = "会话已变化，请返回首页"; navigationItem.rightBarButtonItems?.forEach { $0.isEnabled = false }; return
    }
    sections = []
    if !model.recommendedProducts.isEmpty { sections.append(("推荐", model.recommendedProducts)) }
    sections.append(contentsOf: model.visibleGroups.filter { !$0.products.isEmpty }.map { ($0.localizedName(language: language), $0.sortedProducts) })
    collectionView.reloadData()
    status.text = model.busy && sections.isEmpty ? "正在加载产品目录…" : model.error ?? (sections.isEmpty ? "暂无可添加产品" : nil)
    if let error = model.error, !sections.isEmpty { navigationItem.prompt = error } else { navigationItem.prompt = nil }
    var actions = [UIAction(title: "全部品类", state: model.selectedCategory == nil ? .on : .off) { [weak self] _ in self?.model.select(category: nil) }]
    actions.append(contentsOf: model.categories.map { category in
      UIAction(title: category.name, state: model.selectedCategory == category.value ? .on : .off) { [weak self] _ in self?.model.select(category: category.value) }
    })
    navigationItem.rightBarButtonItems?.first?.menu = UIMenu(title: "选择品类", children: actions)
    navigationItem.rightBarButtonItems?.last?.isEnabled = !model.busy
  }
  override func numberOfSections(in collectionView: UICollectionView) -> Int { sections.count }
  override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int { sections[section].1.count }
  override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
    guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "product", for: indexPath) as? CatalogProductCell else { return UICollectionViewCell() }
    let product = sections[indexPath.section].1[indexPath.item]
    cell.render(product, current: current, shop: { [weak self] in self?.open(ProductLink.url(product.buyLink)) })
    return cell
  }
  override func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
    guard current() else { render(); return }
    let id = sections[indexPath.section].1[indexPath.item].id
    navigationController?.pushViewController(ProductDetailsViewController(service: service, productID: id, current: current), animated: true)
  }
  override func collectionView(_ collectionView: UICollectionView, didEndDisplaying cell: UICollectionViewCell, forItemAt indexPath: IndexPath) { (cell as? CatalogProductCell)?.cancelImage() }
  override func collectionView(_ collectionView: UICollectionView, viewForSupplementaryElementOfKind kind: String, at indexPath: IndexPath) -> UICollectionReusableView {
    let header = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: "header", for: indexPath)
    (header as? CatalogSectionHeader)?.label.text = sections[indexPath.section].0
    return header
  }
  func collectionView(_ collectionView: UICollectionView, layout: UICollectionViewLayout, referenceSizeForHeaderInSection section: Int) -> CGSize { CGSize(width: collectionView.bounds.width, height: UIFontMetrics(forTextStyle: .headline).scaledValue(for: 44)) }
  func collectionView(_ collectionView: UICollectionView, layout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
    let width = collectionView.bounds.inset(by: collectionView.adjustedContentInset).width - 32
    let accessible = traitCollection.preferredContentSizeCategory.isAccessibilityCategory
    let columns = accessible ? 1 : max(1, min(3, Int((width + 10) / 117)))
    return CGSize(width: floor((width - CGFloat(columns - 1) * 10) / CGFloat(columns)), height: UIFontMetrics(forTextStyle: .body).scaledValue(for: 190))
  }
  private func open(_ url: URL?) { guard current(), let url else { return }; present(SFSafariViewController(url: url), animated: true) }
}

@MainActor
private final class CatalogProductCell: UICollectionViewCell {
  private let name = UILabel(), model = UILabel(), connection = UILabel()
  private let image = PublicProductImageView()
  private let shopButton = UIButton(type: .system)
  private var shopAction: (() -> Void)?
  override init(frame: CGRect) {
    super.init(frame: frame); contentView.backgroundColor = .white; contentView.layer.cornerRadius = 12
    let stack = UIStackView(arrangedSubviews: [image, name, model, connection, shopButton]); stack.axis = .vertical; stack.spacing = 4
    stack.translatesAutoresizingMaskIntoConstraints = false; contentView.addSubview(stack)
    NSLayoutConstraint.activate([stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12), stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8), stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8), stack.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -8)])
    for label in [name, model, connection] { label.numberOfLines = 0; label.textAlignment = .center; label.adjustsFontForContentSizeCategory = true }
    name.font = .preferredFont(forTextStyle: .subheadline); model.font = .preferredFont(forTextStyle: .caption1); model.textColor = .secondaryLabel
    connection.font = .preferredFont(forTextStyle: .caption2); connection.textColor = .secondaryLabel
    image.heightAnchor.constraint(equalToConstant: 76).isActive = true
    shopButton.titleLabel?.font = .preferredFont(forTextStyle: .caption1)
    shopButton.setTitle("Shop", for: .normal); shopButton.addTarget(self, action: #selector(shop), for: .touchUpInside)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override func prepareForReuse() { super.prepareForReuse(); image.cancelLoad(); shopAction = nil }
  func cancelImage() { image.cancelLoad() }
  func resumeImage() { image.resumeLoad() }
  func render(_ product: CatalogProduct, current: @escaping () -> Bool, shop: @escaping () -> Void) {
    name.text = product.displayName; model.text = product.modelName; connection.text = productConnectionLabel(product.connectType)
    connection.isHidden = connection.text == nil
    image.bind(source: product.images.first, edge: 384, description: product.displayName, current: current)
    shopButton.isHidden = ProductLink.url(product.buyLink) == nil
    shopAction = shop
    accessibilityLabel = product.displayName
  }
  @objc private func shop() { shopAction?() }
}
@MainActor
private final class CatalogSectionHeader: UICollectionReusableView {
  let label = UILabel()
  override init(frame: CGRect) {
    super.init(frame: frame); label.font = .preferredFont(forTextStyle: .headline); label.adjustsFontForContentSizeCategory = true
    label.translatesAutoresizingMaskIntoConstraints = false; addSubview(label)
    NSLayoutConstraint.activate([label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16), label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16), label.centerYAnchor.constraint(equalTo: centerYAnchor)])
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
}

@MainActor
final class ProductDetailsViewController: UITableViewController {
  private let service: any ProductCatalogService
  private let productID: String
  private let current: () -> Bool
  private var task: Task<Void, Never>?
  private var generation = 0
  private var rows: [(String, URL?)] = []
  private var imageSources: [Int: (String, String)] = [:]
  private var busy = false
  init(service: any ProductCatalogService, productID: String, current: @escaping () -> Bool) {
    self.service = service; self.productID = productID; self.current = current; super.init(style: .insetGrouped)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override func viewDidLoad() {
    super.viewDidLoad(); title = "产品详情"; tableView.backgroundColor = UIColor(white: 242 / 255, alpha: 1)
    navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(load))
    NotificationCenter.default.addObserver(self, selector: #selector(cancel), name: UIApplication.willResignActiveNotification, object: nil)
    load()
  }
  override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }
  override func viewWillAppear(_ animated: Bool) { super.viewWillAppear(animated); tableView.visibleCells.compactMap { $0 as? ProductImageTableCell }.forEach { $0.assetView.resumeLoad() } }
  override func viewWillDisappear(_ animated: Bool) { super.viewWillDisappear(animated); cancel() }
  @objc private func cancel() {
    generation += 1; task?.cancel(); task = nil
    tableView.visibleCells.compactMap { $0 as? ProductImageTableCell }.forEach { $0.assetView.cancelLoad() }
    if busy { rows = [("加载已取消，请重试", nil)]; imageSources = [:]; tableView.reloadData() }
    busy = false; navigationItem.rightBarButtonItem?.isEnabled = true
  }
  @objc private func load() {
    guard !busy, current() else { return }
    generation += 1; let expected = generation; busy = true; rows = [("正在加载产品详情…", nil)]; imageSources = [:]; tableView.reloadData()
    navigationItem.rightBarButtonItem?.isEnabled = false
    task = Task { [weak self] in
      guard let self else { return }
      defer { if generation == expected { busy = false; task = nil; navigationItem.rightBarButtonItem?.isEnabled = true } }
      do {
        let value = try await service.detail(id: productID)
        try Task.checkCancellation(); guard generation == expected else { return }
        guard current() else { rows = [("会话已变化，请返回首页", nil)]; imageSources = [:]; tableView.reloadData(); return }
        let p = value.product
        rows = []; imageSources = [:]
        for source in p.images { imageSources[rows.count] = (source, p.displayName); rows.append(("", nil)) }
        if p.images.isEmpty { rows.append(("暂无产品图片", nil)) }
        rows.append((p.displayName, nil))
        for (label, text) in [("型号", p.modelName), ("系列", p.seriesName)] {
          if let text { rows.append(("\(label)：\(text)", nil)) }
        }
        rows.append(("连接方式：" + (productConnectionLabel(p.connectType) ?? "暂未提供"), nil))
        rows.append(("产品介绍\n" + (value.introduction ?? "暂无产品介绍"), nil))
        rows.append(("产品参数", nil))
        rows.append(contentsOf: value.parameters.map { ("\($0.key)：\($0.value.displayText)", nil) })
        if value.parameters.isEmpty { rows.append(("暂无产品参数", nil)) }
        if let url = ProductLink.url(p.buyLink) { rows.append(("Shop", url)) }
        tableView.reloadData()
      } catch is CancellationError { return }
      catch {
        guard generation == expected else { return }
        imageSources = [:]
        rows = [((current() ? (error as? RowanFailure)?.message ?? "产品详情加载失败，请重试" : "会话已变化，请返回首页"), nil)]
        tableView.reloadData()
      }
    }
  }
  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { rows.count }
  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    if let (source, title) = imageSources[indexPath.row] {
      let cell = tableView.dequeueReusableCell(withIdentifier: "image") as? ProductImageTableCell ?? ProductImageTableCell(style: .default, reuseIdentifier: "image")
      cell.assetView.bind(source: source, edge: 1024, description: title, current: current)
      return cell
    }
    let cell = tableView.dequeueReusableCell(withIdentifier: "text") ?? UITableViewCell(style: .default, reuseIdentifier: "text")
    cell.textLabel?.text = rows[indexPath.row].0; cell.textLabel?.numberOfLines = 0; cell.textLabel?.font = .preferredFont(forTextStyle: .body)
    cell.textLabel?.adjustsFontForContentSizeCategory = true; cell.accessoryType = rows[indexPath.row].1 == nil ? .none : .disclosureIndicator
    cell.selectionStyle = rows[indexPath.row].1 == nil ? .none : .default
    return cell
  }
  override func tableView(_ tableView: UITableView, didEndDisplaying cell: UITableViewCell, forRowAt indexPath: IndexPath) { (cell as? ProductImageTableCell)?.assetView.cancelLoad() }
  override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    guard current(), let url = rows[indexPath.row].1 else { return }
    present(SFSafariViewController(url: url), animated: true)
  }
}

@MainActor
private final class ProductImageTableCell: UITableViewCell {
  let assetView = PublicProductImageView()
  override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: style, reuseIdentifier: reuseIdentifier); selectionStyle = .none
    assetView.translatesAutoresizingMaskIntoConstraints = false; contentView.addSubview(assetView)
    NSLayoutConstraint.activate([assetView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 12), assetView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -12), assetView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12), assetView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12), assetView.heightAnchor.constraint(equalToConstant: 230)])
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }
  override func prepareForReuse() { super.prepareForReuse(); assetView.cancelLoad() }
}

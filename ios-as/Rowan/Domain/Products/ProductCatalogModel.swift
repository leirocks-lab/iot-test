import Foundation

@MainActor
final class ProductCatalogModel {
  private let service: any ProductCatalogService
  private let current: () -> Bool
  private let language: String
  private var generation = 0
  private var task: Task<Void, Never>?
  private(set) var categories: [ProductCategory] = []
  private(set) var groups: [ProductGroup] = []
  private(set) var selectedCategory: String?
  private(set) var busy = false
  private(set) var loaded = false
  private(set) var error: String?
  var onChange: (() -> Void)?
  init(service: any ProductCatalogService, current: @escaping () -> Bool, language: String = "zh-CN") { self.service = service; self.current = current; self.language = language }
  deinit { task?.cancel() }
  var visibleGroups: [ProductGroup] { groups.filter { selectedCategory == nil || $0.category == selectedCategory } }
  var recommendedProducts: [CatalogProduct] {
    let products = visibleGroups.flatMap(\.products).filter { $0.recommended == true }
    return ProductGroup(category: "", names: [:], products: products).sortedProducts
  }
  func select(category: String?) {
    guard current(), category == nil || categories.contains(where: { $0.value == category }) else { return }
    selectedCategory = category; onChange?()
  }
  func cancel() {
    generation += 1; task?.cancel(); task = nil
    if busy { busy = false; error = "加载已取消，请重试"; onChange?() }
  }
  func load() {
    guard current() else { groups = []; categories = []; loaded = false; error = "会话已变化，请返回首页"; onChange?(); return }
    guard !busy else { return }
    generation += 1; let expected = generation
    busy = true; error = nil; onChange?()
    task = Task { [weak self] in
      guard let self else { return }
      defer { if generation == expected { busy = false; task = nil; onChange?() } }
      do {
        let choices = try await service.categories()
        try Task.checkCancellation()
        let values = try await service.groups()
        try Task.checkCancellation()
        guard generation == expected else { return }
        guard current() else { groups = []; categories = []; loaded = false; error = "会话已变化，请返回首页"; return }
        // PAIR-03 drives filter labels; retain a valid category even if the two read snapshots differ.
        var merged = choices
        for group in values where !merged.contains(where: { $0.value == group.category }) {
          merged.append(ProductCategory(value: group.category, name: group.localizedName(language: language)))
        }
        categories = merged; groups = values; loaded = true
        if let selectedCategory, !merged.contains(where: { $0.value == selectedCategory }) { self.selectedCategory = nil }
      } catch is CancellationError { return }
      catch {
        guard generation == expected else { return }
        if !current() { groups = []; categories = []; loaded = false; self.error = "会话已变化，请返回首页" }
        else { self.error = (error as? RowanFailure)?.message ?? "产品目录加载失败，请重试" }
      }
    }
  }
}

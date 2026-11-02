import XCTest
@testable import Rowan

@MainActor
final class ProductCatalogTests: XCTestCase {
  private func product(_ id: String = "product/1", sort: Any = 2) -> [String: Any] {
    ["id": id, "name": "Cloud name", "modelName": "Cloud model", "image": ["https://cdn.example.test/item.png"],
     "configType": ["B", "C"], "connectType": "wifi", "recommended": true, "sort": sort]
  }
  private func group(_ products: [[String: Any]]) -> [[String: Any]] {
    [["category": "stable-code", "categoryName": ["zh-CN": "云端分类", "en": "Cloud category"], "products": products]]
  }
  func testCatalogUsesStableCategoryAndCloudRecommendationSort() throws {
    let value = try HTTPProductCatalog.decodeGroups(group([product("second", sort: 2), product("first", sort: 1)]))
    XCTAssertEqual(value.first?.category, "stable-code")
    XCTAssertEqual(value.first?.localizedName(language: "zh-CN"), "云端分类")
    XCTAssertEqual(value.first?.sortedProducts.map(\.id), ["first", "second"])
    XCTAssertTrue(try XCTUnwrap(value.first?.products.first?.recommended))
  }
  func testEqualAndAbsentSortKeepStableServerOrderWithoutInventedRecommendation() throws {
    var a = product("a", sort: 1), b = product("b", sort: 1)
    a.removeValue(forKey: "recommended"); b.removeValue(forKey: "sort")
    let value = try XCTUnwrap(HTTPProductCatalog.decodeGroups(group([a, product("c", sort: 1), b])).first)
    XCTAssertEqual(value.sortedProducts.map(\.id), ["a", "c", "b"])
    XCTAssertNil(value.products.first?.recommended)
  }
  func testDetailAcceptsDeclaredStringAndObjectShapes() throws {
    var raw = product(); raw["image"] = "https://cdn.example.test/item.png"; raw["configType"] = "C"
    raw["parameters"] = ["volume": "120L", "count": 2]; raw["introduction"] = "<script>plain text</script>"
    let value = try HTTPProductCatalog.decodeDetail(raw, expectedID: "product/1")
    XCTAssertEqual(value.product.images.count, 1); XCTAssertEqual(value.product.configTypes, ["C"])
    XCTAssertEqual(value.parameters.map(\.key), ["count", "volume"])
    XCTAssertEqual(value.introduction, "<script>plain text</script>")
  }
  func testDetailAcceptsActualArrayShapesAndPreservesBooleanFalse() throws {
    var raw = product(); raw["parameters"] = [["key": "volume", "value": "120L"]]; raw["bluetooth"] = false
    let value = try HTTPProductCatalog.decodeDetail(raw, expectedID: "product/1")
    XCTAssertEqual(value.product.configTypes, ["B", "C"])
    XCTAssertEqual(value.parameters.first?.value.displayText, "120L"); XCTAssertEqual(value.bluetooth, false)
  }
  func testInvalidTypesAreNotCoercedIntoProductCapabilities() throws {
    for key in ["image", "configType", "recommended", "sort", "id"] {
      var raw = product(); raw[key] = 123
      if key == "sort" { raw[key] = true }
      XCTAssertThrowsError(try HTTPProductCatalog.decodeGroups(group([raw])))
    }
    var raw = product(); raw["parameters"] = "unexpected"
    XCTAssertThrowsError(try HTTPProductCatalog.decodeDetail(raw, expectedID: "product/1"))
  }
  func testWrongDetailIdentityAndDuplicateCatalogIDsAreRejected() throws {
    XCTAssertThrowsError(try HTTPProductCatalog.decodeDetail(product(), expectedID: "different"))
    XCTAssertThrowsError(try HTTPProductCatalog.decodeGroups(group([product(), product()])))
  }
  func testCategoriesPreserveStableCodesAndRejectDuplicateValues() throws {
    let value = try HTTPProductCatalog.decodeCategories([["name": "Display name", "value": "opaque-code"]])
    XCTAssertEqual(value, [ProductCategory(value: "opaque-code", name: "Display name")])
    XCTAssertThrowsError(try HTTPProductCatalog.decodeCategories([["name": "A", "value": "x"], ["name": "B", "value": "x"]]))
  }
  func testLinksOnlyPermitHTTPSWithoutEmbeddedCredentials() {
    XCTAssertNotNil(ProductLink.url("https://shop.example.test/p?item=1"))
    for value in ["http://example.test", "javascript:alert(1)", "file:///tmp/a", "https://user:pass@example.test/a", "https:///a"] {
      XCTAssertNil(ProductLink.url(value))
    }
  }
  func testPathsHaveOnlyExplicitBrandAndDetailTypeWithOpaqueEscapedID() throws {
    XCTAssertEqual(try HTTPProductCatalog.path("/api/app/products", brandID: nil), "/api/app/products")
    XCTAssertEqual(try HTTPProductCatalog.path("/api/app/products/category", brandID: "brand & 1"), "/api/app/products/category?brandId=brand%20%26%201")
    XCTAssertEqual(try HTTPProductCatalog.detailPath(id: "product/1?x"), "/api/app/products/product%2F1%3Fx?type=text")
  }
  func testAuthenticatedServiceNeverSendsUndefinedCategoryQuery() async throws {
    let http = CatalogGateway(), account = AccountService(http: http, storage: CatalogStorage())
    try await account.login(account: "fixture@example.test", pin: "fixture")
    http.response = group([product()]); let service = HTTPProductCatalog(account: account, brandID: nil)
    _ = try await service.groups()
    XCTAssertEqual(http.paths.last, "/api/app/products")
    http.response = [["name": "Name", "value": "stable-code"]]
    _ = try await service.categories()
    XCTAssertEqual(http.paths.last, "/api/app/products/category")
    http.response = product(); _ = try await service.detail(id: "product/1")
    XCTAssertEqual(http.paths.last, "/api/app/products/product%2F1?type=text")
    XCTAssertTrue(http.tokens.dropFirst().allSatisfy { $0 == "fixture-token" })
  }
  func testOldServiceCannotReadUsingNewAccount() async throws {
    let http = CatalogGateway(), account = AccountService(http: http, storage: CatalogStorage())
    try await account.login(account: "fixture@example.test", pin: "fixture")
    let service = HTTPProductCatalog(account: account, brandID: nil)
    try await account.login(account: "new@example.test", pin: "fixture")
    let count = http.paths.count
    do { _ = try await service.groups(); XCTFail("Stale service used") }
    catch { XCTAssertEqual((error as? RowanFailure)?.code, 499) }
    XCTAssertEqual(http.paths.count, count)
  }
  func testCategorySelectionIsLocalAndPreservesServerRecommendation() async throws {
    let fixture = CatalogServiceFixture(groups: try HTTPProductCatalog.decodeGroups(group([product()])))
    let model = ProductCatalogModel(service: fixture, current: { true })
    model.load(); await settled(model)
    XCTAssertEqual(model.recommendedProducts.map(\.id), ["product/1"])
    model.select(category: "stable-code")
    XCTAssertEqual(model.selectedCategory, "stable-code"); XCTAssertEqual(model.visibleGroups.count, 1)
    model.select(category: "unknown")
    XCTAssertEqual(model.selectedCategory, "stable-code")
    XCTAssertEqual(fixture.reads, 2) // One categories read and one products read; filtering does no I/O.
  }
  func testDuplicateLoadDoesNotStartAnotherCatalogRequest() async {
    let fixture = CatalogServiceFixture(groups: [])
    var pending: CheckedContinuation<[ProductCategory], Never>?
    fixture.delayedCategories = { await withCheckedContinuation { pending = $0 } }
    let model = ProductCatalogModel(service: fixture, current: { true })
    model.load(); model.load()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancel(); XCTFail("Load did not start"); return }
    XCTAssertEqual(fixture.reads, 1)
    pending.resume(returning: []); await settled(model)
    XCTAssertEqual(fixture.reads, 2)
  }
  func testCancelledCatalogCannotPublishLateResponseOrContinueNextRead() async {
    let fixture = CatalogServiceFixture(groups: [])
    var pending: CheckedContinuation<[ProductCategory], Never>?
    fixture.delayedCategories = { await withCheckedContinuation { pending = $0 } }
    let model = ProductCatalogModel(service: fixture, current: { true })
    model.load()
    for _ in 0..<200 where pending == nil { await Task.yield() }
    guard let pending else { model.cancel(); XCTFail("Load did not start"); return }
    model.cancel(); pending.resume(returning: [ProductCategory(value: "late", name: "Late")])
    for _ in 0..<20 { await Task.yield() }
    XCTAssertFalse(model.loaded); XCTAssertTrue(model.categories.isEmpty); XCTAssertEqual(fixture.reads, 1)
  }
  func testChangedAccountCannotPublishCatalogAfterFinalRead() async throws {
    let fixture = CatalogServiceFixture(groups: try HTTPProductCatalog.decodeGroups(group([product()])))
    var current = true
    fixture.beforeProducts = { current = false }
    let model = ProductCatalogModel(service: fixture, current: { current })
    model.load(); await settled(model)
    XCTAssertFalse(model.loaded); XCTAssertTrue(model.groups.isEmpty); XCTAssertNotNil(model.error)
  }
  private func settled(_ model: ProductCatalogModel) async {
    for _ in 0..<300 where model.busy { await Task.yield() }
    XCTAssertFalse(model.busy)
  }
}

@MainActor
private final class CatalogServiceFixture: ProductCatalogService {
  let values: [ProductGroup]
  var reads = 0
  var delayedCategories: (() async -> [ProductCategory])?
  var beforeProducts: (() -> Void)?
  init(groups: [ProductGroup]) { values = groups }
  func categories() async throws -> [ProductCategory] {
    reads += 1
    if let delayedCategories { return await delayedCategories() }
    return [ProductCategory(value: "stable-code", name: "Cloud name")]
  }
  func groups() async throws -> [ProductGroup] { reads += 1; beforeProducts?(); return values }
  func detail(id: String) async throws -> ProductDetails { throw RowanFailure(code: 1091, message: "Product not found") }
}

@MainActor
private final class CatalogGateway: HTTPGateway {
  var paths: [String] = [], tokens: [String?] = []
  var response: Any = []
  func perform(_ method: String, _ path: String, body: [String: Any]?, token: String?) async throws -> Any {
    paths.append(path); tokens.append(token)
    if method == "POST" { return ["accessToken": "fixture-token", "refreshToken": "fixture-refresh", "userID": "fixture-user"] }
    return response
  }
}
@MainActor
private final class CatalogStorage: SessionStorage {
  var value: Data?
  func read() async throws -> Data? { value }
  func write(_ value: Data?) async throws { self.value = value }
}

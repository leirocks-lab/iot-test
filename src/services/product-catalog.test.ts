import { afterEach, describe, expect, it, vi } from "vitest";
import type { HttpRequest } from "../lib/core";
import { MockHttpClient, type HttpFetcher } from "./http";
import { ApiError, type ApiEnvelope, type Product } from "./models";
import {
  ProductCatalogFlow,
  catalogPairingIssue,
  catalogProducts,
  trustedBuyLink,
} from "./product-catalog";
import {
  productData,
  productGroupName,
  productGroups,
  productParameterRows,
} from "./product-data";
import { RealHttpClient } from "./real-http";
import { RowanService } from "./rowan";
import { MemoryStorage, MockDatabase, defaultSettings } from "./store";

const flows: ProductCatalogFlow[] = [];
afterEach(() => {
  for (const flow of flows.splice(0)) flow.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function setup(
  options: ConstructorParameters<typeof ProductCatalogFlow>[1] = {},
) {
  const db = await MockDatabase.open(new MemoryStorage());
  const http = new MockHttpClient(db);
  const service = new RowanService(http, new MemoryStorage());
  await service.login("rowan@example.com", "Rowan@123", "password");
  const flow = new ProductCatalogFlow(service, options);
  flows.push(flow);
  return { db, http, service, flow };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const wineWire = {
  id: "prd_wine",
  name: "Wine cooler",
  category: "WineCooler",
  seriesName: "RW Series",
  modelName: "ADD6830",
  image: ["https://images.example.test/one", "https://images.example.test/two"],
  configType: ["B"],
  connectType: "wifi",
  bluetooth: true,
  cloudPlatform: "aws",
  recommended: true,
  sort: 2,
  parameters: [{ key: "volume", value: "120L" }, { voltage: "220V" }],
  introduction: "Product introduction",
  buyLink: "https://shop.example.test/products/wine",
};

describe("RF-0018 catalog and request lifecycle", () => {
  it.each([
    ["zh-CN", "酒柜"],
    ["zh-TW", "酒櫃"],
    ["en", "Wine cooler"],
  ] as const)(
    "loads PAIR-03 names and details in %s with auth and no guessed brand",
    async (language, name) => {
      const { service, http, flow } = await setup();
      service.session!.setting.language = language;
      const requests = vi.spyOn(http, "request");
      await flow.start();
      expect(flow.state.categories.value?.[0]).toEqual({
        name,
        value: "WineCooler",
      });
      expect(flow.state.products.value?.[0].categoryName?.[language]).toBe(
        name,
      );
      const product = await flow.select("prd_wine");
      expect(product?.parameters).toEqual([{ key: "model", value: "ADD6830" }]);
      expect(product?.introduction).toContain("Mock");
      for (const [request] of requests.mock.calls) {
        expect(request.headers).toMatchObject({
          "Accept-Language": language,
          Authorization: `Bearer ${service.session!.accessToken}`,
        });
        expect(request.query?.brandId).toBeUndefined();
      }
      expect(requests).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/api/app/products/prd_wine",
          query: { type: "text" },
          signal: expect.any(AbortSignal),
        }),
      );
    },
  );

  it("sends only an explicitly configured catalog brand to the list and category endpoints", async () => {
    const { flow, http } = await setup({ brandId: "as" });
    const requests = vi.spyOn(http, "request");
    await flow.start();
    expect(requests.mock.calls.map(([req]) => req.query)).toEqual([
      { brandId: "as" },
      { brandId: "as" },
    ]);
  });

  it.each(
    [
      "/api/app/products/category",
      "/api/app/products",
      "/api/app/products/prd_wine",
    ].flatMap((path) =>
      ["missing", "bare", "refresh", "expired", "invalid"].map((kind) => [
        path,
        kind,
      ]),
    ),
  )("rejects %s with %s authorization", async (path, kind) => {
    const { http, db, service } = await setup();
    const session = service.session!;
    const headers: Record<string, string> = {};
    if (kind === "bare") headers.Authorization = session.accessToken;
    if (kind === "refresh")
      headers.Authorization = `Bearer ${session.refreshToken}`;
    if (kind === "expired") {
      db.state.tokens[session.accessToken].expiresAt = 0;
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
    if (kind === "invalid") headers.Authorization = "Bearer invalid";
    const response = await http.request<ApiEnvelope<unknown>>({
      method: "GET",
      path,
      query: { type: "text" },
      headers,
    });
    expect(response).toMatchObject({
      status: 401,
      data: { success: false, code: 401 },
    });
  });

  it("keeps categories and products independently retryable, without inserting demo products", async () => {
    const { flow, service } = await setup();
    const categories = vi
      .spyOn(service, "categories")
      .mockRejectedValueOnce(new Error("categories offline"));
    vi.spyOn(service, "products").mockResolvedValue([]);
    await flow.start();
    expect(flow.state.categories.error).toBe("categories offline");
    expect(flow.state.products).toMatchObject({
      value: [],
      loading: false,
      error: "",
    });
    await flow.loadCategories();
    expect(categories).toHaveBeenCalledTimes(2);
    expect(flow.state.categories.error).toBe("");
    expect(flow.state.products.value).toEqual([]);
  });

  it("allows product retry while the category request is still pending", async () => {
    const { service, flow } = await setup();
    const wait = deferred<Awaited<ReturnType<RowanService["categories"]>>>();
    vi.spyOn(service, "categories").mockReturnValue(wait.promise);
    const products = vi
      .spyOn(service, "products")
      .mockRejectedValueOnce(new Error("products offline"));
    const start = flow.start();
    await vi.waitFor(() =>
      expect(flow.state.products.error).toBe("products offline"),
    );
    await flow.loadProducts();
    expect(products).toHaveBeenCalledTimes(2);
    expect(flow.state.categories.loading).toBe(true);
    expect(flow.state.products.value).toHaveLength(2);
    wait.resolve([]);
    await start;
  });

  it("aborts category A results when switching to B and ignores the late response", async () => {
    const { service, flow } = await setup();
    await flow.start();
    const a = deferred<Awaited<ReturnType<RowanService["products"]>>>();
    const b = deferred<Awaited<ReturnType<RowanService["products"]>>>();
    const request = vi
      .spyOn(service, "products")
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const first = flow.filter({ kind: "category", value: "WineCooler" });
    const aSignal = request.mock.calls[0][0]!;
    const second = flow.filter({ kind: "category", value: "Dehumidifier" });
    expect(aSignal.aborted).toBe(true);
    b.resolve([
      {
        category: "Dehumidifier",
        products: [
          productData({ ...wineWire, id: "b", category: "Dehumidifier" }),
        ],
      },
    ]);
    await second;
    a.resolve([{ category: "WineCooler", products: [productData(wineWire)] }]);
    await first;
    expect(flow.state.filter).toEqual({
      kind: "category",
      value: "Dehumidifier",
    });
    expect(flow.state.products.value?.[0].products[0].id).toBe("b");
    expect(flow.state.products.error).toBe("");
  });

  it.each(["resolve", "reject"] as const)(
    "ignores a late A detail %s after B was selected",
    async (outcome) => {
      const { service, flow } = await setup();
      await flow.start();
      const a = deferred<Product>();
      const b = productData({ ...wineWire, id: "b" });
      const requests = vi
        .spyOn(service, "product")
        .mockReturnValueOnce(a.promise)
        .mockResolvedValueOnce(b);
      const first = flow.select("prd_wine");
      const second = flow.select("b");
      expect(requests.mock.calls[0][1]?.aborted).toBe(true);
      await second;
      if (outcome === "resolve") a.resolve(productData(wineWire));
      else a.reject(new Error("late A failure"));
      await first;
      expect(flow.state.detail).toMatchObject({
        value: b,
        error: "",
        loading: false,
      });
      expect(flow.state.selectedID).toBe("b");
    },
  );

  it("clears an old executable target when the new detail does not exist and retries the selected ID", async () => {
    const { flow } = await setup();
    await flow.start();
    await flow.select("prd_wine");
    await flow.select("deleted-product");
    expect(flow.state.detail.value).toBeUndefined();
    expect(flow.state.detail.error).toBe("产品不存在");
    expect(flow.state.selectedID).toBe("deleted-product");
    expect(await flow.confirmSelection()).toBeUndefined();
  });

  it("rejects a detail identity mismatch instead of using the previous product", async () => {
    const { service, flow } = await setup();
    await flow.start();
    vi.spyOn(service, "product").mockResolvedValue(
      productData({ ...wineWire, id: "other" }),
    );
    expect(await flow.select("prd_wine")).toBeUndefined();
    expect(flow.state.detail.value).toBeUndefined();
    expect(flow.state.detail.error).toContain("身份不一致");
  });

  it("re-reads detail on confirmation and rejects capabilities changed since the preview", async () => {
    const { service, flow } = await setup();
    await flow.start();
    await flow.select("prd_wine");
    const detail = vi
      .spyOn(service, "product")
      .mockResolvedValue(productData({ ...wineWire, configType: ["A"] }));
    expect(await flow.confirmSelection()).toBeUndefined();
    expect(detail).toHaveBeenCalledOnce();
    expect(flow.state.detail.error).toContain("暂未接入");
    expect(flow.state.detail.value?.configTypes).toEqual(["A"]);
  });

  it("does not confirm A if the user chooses B while A confirmation is waiting", async () => {
    const { service, flow } = await setup();
    await flow.start();
    await flow.select("prd_wine");
    const wait = deferred<Product>();
    vi.spyOn(service, "product")
      .mockReturnValueOnce(wait.promise)
      .mockResolvedValueOnce(productData({ ...wineWire, id: "b" }));
    const confirmation = flow.confirmSelection();
    await flow.select("b");
    wait.resolve(productData(wineWire));
    expect(await confirmation).toBeUndefined();
    expect(flow.state.detail.value?.id).toBe("b");
  });

  it("stops all reads on blur/background and revalidates the detail on return", async () => {
    const { service, flow } = await setup();
    await flow.start();
    const wait = deferred<Product>();
    const detail = vi
      .spyOn(service, "product")
      .mockReturnValueOnce(wait.promise);
    const selected = flow.select("prd_wine");
    flow.stop();
    expect(detail.mock.calls[0][1]?.aborted).toBe(true);
    wait.resolve(productData(wineWire));
    await selected;
    expect(flow.state.active).toBe(false);
    expect(flow.state.detail.value).toBeUndefined();
    expect(await flow.confirmSelection()).toBeUndefined();
    await flow.start();
    expect(flow.state.detail.value?.id).toBe("prd_wine");
  });

  it("clears account-scoped state on logout and rejects a late response after same-account re-login", async () => {
    const { service, flow } = await setup();
    await flow.start();
    const wait = deferred<Product>();
    vi.spyOn(service, "product").mockReturnValueOnce(wait.promise);
    const pending = flow.select("prd_wine");
    await service.clearLocal();
    await service.login("rowan@example.com", "Rowan@123", "password");
    wait.resolve(productData(wineWire));
    await pending;
    expect(flow.state.active).toBe(false);
    expect(flow.state.selectedID).toBeUndefined();
    expect(flow.state.products.value).toBeUndefined();
    expect(flow.state.detail.value).toBeUndefined();
  });

  it("bounds a hung request and ignores a late successful result", async () => {
    const { service, flow } = await setup({ requestTimeout: 20 });
    const wait = deferred<Awaited<ReturnType<RowanService["products"]>>>();
    const request = vi.spyOn(service, "products").mockReturnValue(wait.promise);
    vi.useFakeTimers();
    const start = flow.start();
    await vi.advanceTimersByTimeAsync(21);
    await start;
    expect(request.mock.calls[0][0]?.aborted).toBe(true);
    expect(flow.state.products.error).toContain("超时");
    wait.resolve([]);
    await Promise.resolve();
    expect(flow.state.products.value).toBeUndefined();
  });

  it("filters using stable category values, updates recommendations, and preserves stable sort semantics", () => {
    const a = productData({ ...wineWire, id: "a", sort: 3 });
    const b = productData({ ...wineWire, id: "b", sort: 1 });
    const c = productData({
      ...wineWire,
      id: "c",
      sort: 1,
      recommended: false,
    });
    const groups = [{ category: "WineCooler", products: [a, b, c] }];
    expect(
      catalogProducts(groups, { kind: "manual" }).map((product) => product.id),
    ).toEqual(["b", "c", "a"]);
    expect(
      catalogProducts(groups, { kind: "recommended" }).map(
        (product) => product.id,
      ),
    ).toEqual(["b", "a"]);
    expect(
      catalogProducts(groups, { kind: "category", value: "酒柜" }),
    ).toEqual([]);
    expect(groups[0].products.map((product) => product.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    const missing = { ...b, sort: undefined };
    expect(
      catalogProducts([{ category: "WineCooler", products: [a, missing, c] }], {
        kind: "manual",
      }).map((product) => product.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("does not invent Bluetooth capability or use an unsupported route", () => {
    expect(
      catalogPairingIssue(productData({ ...wineWire, bluetooth: undefined })),
    ).toContain("未完整提供");
    expect(
      catalogPairingIssue(productData({ ...wineWire, configType: ["A", "C"] })),
    ).toContain("暂未接入");
    expect(
      catalogPairingIssue(
        productData({ ...wineWire, connectType: "bluetooth" }),
      ),
    ).toContain("暂未接入");
    expect(
      catalogPairingIssue(productData({ ...wineWire, configType: ["A", "B"] })),
    ).toBe("");
  });

  it("exposes a buy link only for an active, confirmed detail and an explicitly trusted HTTPS origin", async () => {
    const { service, flow } = await setup({
      trustedBuyOrigins: ["https://shop.example.test"],
    });
    await flow.start();
    vi.spyOn(service, "product").mockResolvedValue(productData(wineWire));
    await flow.select("prd_wine");
    expect(flow.buyLink).toBe(wineWire.buyLink);
    flow.clearSelection();
    expect(flow.buyLink).toBeUndefined();
    await flow.select("prd_wine");
    flow.stop();
    expect(flow.buyLink).toBeUndefined();
  });

  it.each([
    "",
    "https://shop.example.test.evil.test/a",
    "http://shop.example.test/a",
    "javascript:alert(1)",
    "https://user:password@shop.example.test/a",
    "https://shop.example.test:8443/a",
    "//shop.example.test/a",
  ])(
    "does not trust a missing, malformed, credentialed or external buy link: %s",
    (link) => {
      expect(
        trustedBuyLink(link, ["https://shop.example.test"]),
      ).toBeUndefined();
    },
  );

  it("keeps all links unavailable when no trust configuration has been supplied", () => {
    expect(trustedBuyLink(wineWire.buyLink)).toBeUndefined();
    expect(
      trustedBuyLink(wineWire.buyLink, ["https://shop.example.test/path"]),
    ).toBeUndefined();
  });
});

describe("RF-0018 real HTTP source mapping", () => {
  function realSetup(responses: Record<string, unknown>) {
    const fetcher = vi.fn<HttpFetcher>().mockImplementation(async (url) => {
      const path = new URL(url).pathname;
      const data = responses[path];
      return new Response(JSON.stringify({ success: true, code: 0, data }), {
        status: 200,
      });
    });
    const client = new RealHttpClient(
      {
        apiBaseUrl: "https://platform.example.test",
        iotApiBaseUrl: "https://iot.example.test/module",
        tenantID: "42",
      },
      fetcher,
    );
    const service = new RowanService(client, new MemoryStorage());
    service.session = {
      userID: "fixture",
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
      tokenType: "Bearer",
      expiresIn: 1,
      setting: defaultSettings(),
    };
    return { fetcher, client, service };
  }

  it("handles category before the generic detail matcher and preserves all detail content", async () => {
    const { service, fetcher } = realSetup({
      "/module/app-api/products/category": [
        { name: "酒柜", value: "WineCooler" },
      ],
      "/module/app-api/products": [
        {
          category: "WineCooler",
          categoryName: { "zh-CN": "酒柜", en: "Wine cooler" },
          products: [wineWire],
        },
      ],
      "/module/app-api/products/prd_wine": wineWire,
    });
    expect(await service.categories()).toEqual([
      { name: "酒柜", value: "WineCooler" },
    ]);
    const groups = await service.products();
    expect(productGroupName(groups[0], "zh-CN")).toBe("酒柜");
    const detail = await service.product("prd_wine");
    expect(detail).toMatchObject({
      images: wineWire.image,
      image: wineWire.image[0],
      configTypes: ["B"],
      parameters: wineWire.parameters,
      introduction: wineWire.introduction,
    });
    expect(productParameterRows(detail.parameters)).toEqual([
      { name: "volume", value: "120L" },
      { name: "voltage", value: "220V" },
    ]);
    expect(fetcher).toHaveBeenLastCalledWith(
      "https://iot.example.test/module/app-api/products/prd_wine?type=text",
      expect.objectContaining({
        headers: expect.objectContaining({
          "tenant-id": "42",
          "Accept-Language": "zh-CN",
        }),
      }),
    );
  });

  it("preserves explicit null text rather than falling back to a different introduction form", () => {
    expect(
      productData({ ...wineWire, introduction: null }).introduction,
    ).toBeNull();
    expect(
      productData({
        ...wineWire,
        image: "",
        configType: "B",
        parameters: { volume: "120L" },
      }),
    ).toMatchObject({
      images: [],
      configTypes: ["B"],
      parameters: { volume: "120L" },
    });
  });

  it.each([
    [{ id: "" }],
    [{ ...wineWire, image: [42] }],
    [{ ...wineWire, configType: { B: true } }],
    [{ ...wineWire, parameters: [null] }],
    [{ ...wineWire, introduction: { text: "unexpected" } }],
    [{ ...wineWire, recommended: "true" }],
    [{ ...wineWire, sort: "1" }],
  ])(
    "rejects malformed product payloads without a fixture fallback",
    (value) => {
      expect(() => productData(value)).toThrow(ApiError);
    },
  );

  it("rejects duplicate products and mismatched group identities", () => {
    expect(() =>
      productGroups([
        { category: "WineCooler", products: [wineWire, wineWire] },
      ]),
    ).toThrow("重复");
    expect(() =>
      productGroups([{ category: "Dehumidifier", products: [wineWire] }]),
    ).toThrow("品类不一致");
  });

  it("preserves real product-not-found errors and refuses malformed category data", async () => {
    const { client, service } = realSetup({
      "/module/app-api/products/category": [
        { name: { en: "invalid" }, value: "WineCooler" },
      ],
    });
    await expect(service.categories()).rejects.toMatchObject({ code: 502 });
    const fetcher: HttpFetcher = async () =>
      new Response(
        JSON.stringify({ code: 1091, message: "产品不存在", data: null }),
      );
    const real = new RealHttpClient(
      { apiBaseUrl: "https://api.example.test", tenantID: "42" },
      fetcher,
    );
    const req: HttpRequest = {
      method: "GET",
      path: "/api/app/products/prd_missing",
      query: { type: "text" },
    };
    expect((await real.request<ApiEnvelope<unknown>>(req)).data).toMatchObject({
      code: 1091,
      success: false,
    });
    expect(client).toBeDefined();
  });
});

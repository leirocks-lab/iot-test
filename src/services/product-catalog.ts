import { withBudget } from "../protocol/device";
import {
  ApiError,
  type Product,
  type ProductCategory,
  type ProductGroup,
} from "./models";
import type { RowanService } from "./rowan";

export interface ProductCatalogOptions {
  brandId?: string;
  trustedBuyOrigins?: readonly string[];
  requestTimeout?: number;
}

export type CatalogFilter =
  | { kind: "recommended" }
  | { kind: "manual" }
  | { kind: "category"; value: string };

interface ReadState<T> {
  value?: T;
  loading: boolean;
  error: string;
}

export interface ProductCatalogState {
  categories: ReadState<ProductCategory[]>;
  products: ReadState<ProductGroup[]>;
  detail: ReadState<Product>;
  selectedID?: string;
  filter: CatalogFilter;
  active: boolean;
}

const emptyRead = <T>(): ReadState<T> => ({ loading: false, error: "" });
const initialState = (): ProductCatalogState => ({
  categories: emptyRead(),
  products: emptyRead(),
  detail: emptyRead(),
  filter: { kind: "recommended" },
  active: false,
});

export function catalogProducts(
  groups: ProductGroup[],
  filter: CatalogFilter,
): Product[] {
  const all = groups.flatMap((group) => group.products);
  const products =
    filter.kind === "recommended"
      ? all.filter((product) => product.recommended === true)
      : filter.kind === "category"
        ? all.filter((product) => product.category === filter.value)
        : all;
  if (
    products.every(
      (product) =>
        typeof product.sort === "number" && Number.isFinite(product.sort),
    )
  ) {
    // Q2: preserve response order for ties; never manufacture a missing sort value.
    return [...products].sort((left, right) => left.sort! - right.sort!);
  }
  return products;
}

/** Mirrors the already implemented add route; other capabilities remain visible, not executable. */
export function catalogPairingIssue(product: Product): string {
  const configTypes =
    product.configTypes ?? (product.configType ? [product.configType] : []);
  if (
    product.bluetooth === undefined ||
    !product.connectType ||
    !configTypes.length
  ) {
    return "产品配网能力未完整提供，暂不能继续";
  }
  if (
    !product.bluetooth ||
    product.connectType !== "wifi" ||
    !configTypes.includes("B")
  ) {
    return "该产品的配网方式暂未接入，可返回选择其他产品";
  }
  return "";
}

export function trustedBuyLink(
  link: string,
  origins: readonly string[] = [],
): string | undefined {
  if (!link || !origins.length) return undefined;
  try {
    const url = new URL(link);
    if (url.protocol !== "https:" || url.username || url.password)
      return undefined;
    const trusted = origins.some((origin) => {
      try {
        const allowed = new URL(origin);
        return (
          allowed.protocol === "https:" &&
          !allowed.username &&
          !allowed.password &&
          allowed.pathname === "/" &&
          !allowed.search &&
          !allowed.hash &&
          allowed.origin === url.origin
        );
      } catch {
        return false;
      }
    });
    return trusted ? url.href : undefined;
  } catch {
    return undefined;
  }
}

type ReadKey = "categories" | "products" | "detail";

/** Read-only catalog context. Each channel owns its own cancellation and retry state. */
export class ProductCatalogFlow {
  state = initialState();
  private listeners = new Set<() => void>();
  private requests = new Map<ReadKey, AbortController>();
  private revision?: number;
  private owner?: string;
  private sessionUnsubscribe?: () => void;
  private budget: number;

  constructor(
    private service: RowanService,
    private options: ProductCatalogOptions = {},
  ) {
    this.budget = options.requestTimeout ?? 10000;
    if (!Number.isFinite(this.budget) || this.budget <= 0) {
      throw new Error("产品目录请求等待预算必须为正数");
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  snapshot = () => this.state;

  private update(patch: Partial<ProductCatalogState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private current() {
    return (
      this.state.active &&
      this.owner === this.service.session?.userID &&
      this.revision === this.service.sessionRevision
    );
  }

  private cancel(key: ReadKey) {
    this.requests.get(key)?.abort();
    this.requests.delete(key);
  }

  async start() {
    this.stop();
    if (!this.service.session) return;
    const changed =
      this.owner !== this.service.userID ||
      this.revision !== this.service.sessionRevision;
    if (changed) this.state = initialState();
    this.owner = this.service.userID;
    this.revision = this.service.sessionRevision;
    this.update({ active: true });
    this.sessionUnsubscribe = this.service.onSessionChange(() => {
      if (this.current()) return;
      this.stop();
      this.state = initialState();
      this.update({});
    });
    const selectedID = this.state.selectedID;
    await Promise.all([
      this.loadCategories(),
      this.loadProducts(),
      ...(selectedID ? [this.select(selectedID)] : []),
    ]);
  }

  stop() {
    for (const key of this.requests.keys()) this.cancel(key);
    this.sessionUnsubscribe?.();
    this.sessionUnsubscribe = undefined;
    this.update({
      active: false,
      categories: { ...this.state.categories, loading: false },
      products: { ...this.state.products, loading: false },
      detail: { ...this.state.detail, loading: false },
    });
  }

  private async read<K extends ReadKey>(
    key: K,
    work: (
      signal: AbortSignal,
    ) => Promise<NonNullable<ProductCatalogState[K]["value"]>>,
  ): Promise<NonNullable<ProductCatalogState[K]["value"]> | undefined> {
    if (!this.current()) return undefined;
    this.cancel(key);
    const controller = new AbortController();
    this.requests.set(key, controller);
    this.update({ [key]: { loading: true, error: "" } });
    const current = () =>
      this.current() &&
      !controller.signal.aborted &&
      this.requests.get(key) === controller;
    try {
      const value = await withBudget(
        work,
        this.budget,
        "产品读取超时，请重试",
        controller.signal,
      );
      if (!current()) return undefined;
      this.update({ [key]: { value, loading: false, error: "" } });
      return value;
    } catch (error) {
      if (current()) {
        this.update({
          [key]: {
            loading: false,
            error:
              error instanceof Error ? error.message : "产品读取失败，请重试",
          },
        });
      }
      return undefined;
    } finally {
      if (this.requests.get(key) === controller) this.requests.delete(key);
    }
  }

  async loadCategories() {
    const categories = await this.read("categories", (signal) =>
      this.service.categories(signal, this.options.brandId),
    );
    const filter = this.state.filter;
    if (
      categories &&
      filter.kind === "category" &&
      !categories.some((category) => category.value === filter.value)
    ) {
      this.update({ filter: { kind: "manual" } });
    }
  }

  async loadProducts() {
    await this.read("products", (signal) =>
      this.service.products(signal, this.options.brandId),
    );
  }

  async filter(filter: CatalogFilter) {
    if (!this.current()) return;
    if (
      filter.kind === "category" &&
      !this.state.categories.value?.some(
        (category) => category.value === filter.value,
      )
    ) {
      this.update({
        categories: {
          ...this.state.categories,
          error: "当前品类不存在，请重新加载品类",
        },
      });
      return;
    }
    this.clearSelection();
    this.update({ filter });
    await this.loadProducts();
  }

  clearSelection() {
    this.cancel("detail");
    this.update({ selectedID: undefined, detail: emptyRead() });
  }

  async select(id: string) {
    if (!this.current()) return undefined;
    this.update({ selectedID: id });
    return this.read("detail", async (signal) => {
      const product = await this.service.product(id, signal);
      if (product.id !== id)
        throw new ApiError(502, "产品详情身份不一致，请重新选择");
      return product;
    });
  }

  async confirmSelection() {
    const id = this.state.selectedID;
    if (!id || this.state.detail.loading || !this.current()) return undefined;
    const product = await this.select(id);
    if (
      !product ||
      !this.current() ||
      this.state.selectedID !== id ||
      this.state.detail.value !== product
    ) {
      return undefined;
    }
    const issue = catalogPairingIssue(product);
    if (issue) {
      this.update({ detail: { value: product, loading: false, error: issue } });
      return undefined;
    }
    return product;
  }

  get buyLink() {
    if (!this.current() || this.state.detail.loading || this.state.detail.error)
      return undefined;
    return trustedBuyLink(
      this.state.detail.value?.buyLink ?? "",
      this.options.trustedBuyOrigins,
    );
  }
}

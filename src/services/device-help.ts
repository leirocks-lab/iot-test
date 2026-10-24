import { withBudget } from "../protocol/device";
import { ApiError, type HelpArticle } from "./models";
import type { RowanService } from "./rowan";

export interface DeviceHelpState {
  value: HelpArticle[] | null;
  loading: boolean;
  error: string;
  active: boolean;
}

const initialState = (): DeviceHelpState => ({
  value: null,
  loading: false,
  error: "",
  active: false,
});

const accessLost = (error: unknown) =>
  error instanceof ApiError && [401, 403, 404, 1451, 1452].includes(error.code);

/** One device and one authenticated session own the visible help content. */
export class DeviceHelpFlow {
  state = initialState();
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private unsubscribeSession?: () => void;
  private generation = 0;
  private owner?: string;
  private revision = -1;

  constructor(
    private service: RowanService,
    readonly deviceID: string,
    private requestTimeout = 10000,
  ) {
    if (!Number.isFinite(requestTimeout) || requestTimeout <= 0) {
      throw new Error("设备帮助请求等待预算必须为正数");
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = () => this.state;

  private update(patch: Partial<DeviceHelpState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private current(generation = this.generation) {
    return (
      this.state.active &&
      generation === this.generation &&
      this.owner === this.service.session?.userID &&
      this.revision === this.service.sessionRevision
    );
  }

  async start() {
    this.stop();
    const owner = this.service.session?.userID;
    const revision = this.service.sessionRevision;
    if (owner !== this.owner || revision !== this.revision) {
      this.state = initialState();
    }
    this.owner = owner;
    this.revision = revision;
    if (!owner) {
      this.update({ error: "请先登录" });
      return;
    }
    if (!this.deviceID) {
      this.update({ error: "设备标识无效" });
      return;
    }
    this.update({ active: true });
    this.unsubscribeSession = this.service.onSessionChange(() => {
      if (this.current()) return;
      this.stop();
      this.state = initialState();
      this.update({ error: "登录状态已变化，请重新进入设备帮助" });
    });
    await this.load();
  }

  stop() {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.update({ active: false, loading: false });
  }

  async load() {
    if (!this.current() || this.state.loading) return;
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.update({ loading: true, error: "" });
    try {
      const articles = await withBudget(
        (signal) => this.service.help(this.deviceID, false, signal),
        this.requestTimeout,
        "设备帮助读取超时，请重试",
        controller.signal,
      );
      if (!this.current(generation) || controller.signal.aborted) return;
      this.update({
        value: articles.filter((article) => article.content.trim().length > 0),
        loading: false,
      });
    } catch (error) {
      if (!this.current(generation) || controller.signal.aborted) return;
      this.update({
        value: accessLost(error) ? null : this.state.value,
        loading: false,
        error: error instanceof Error ? error.message : "设备帮助读取失败，请重试",
      });
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }
}

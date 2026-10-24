import { withBudget } from "../protocol/device";
import { ApiError } from "./models";
import type { RowanService } from "./rowan";

export type DeviceSharePhase =
  | "idle"
  | "loading"
  | "ready"
  | "expired"
  | "unsupported"
  | "blocked"
  | "failed";

export interface DeviceShareState {
  phase: DeviceSharePhase;
  active: boolean;
  deviceName: string;
  qrValue?: string;
  expiresAt?: string;
  error: string;
}

const initial = (): DeviceShareState => ({
  phase: "idle",
  active: false,
  deviceName: "",
  error: "",
});

/** The share code exists only while this device and account are foregrounded. */
export class DeviceShareFlow {
  state = initial();
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private unsubscribeSession?: () => void;
  private generation = 0;
  private owner?: string;
  private revision = -1;

  constructor(
    private service: RowanService,
    readonly deviceID: string,
    private budget = 10000,
    private now: () => number = Date.now,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = () => this.state;

  private update(patch: Partial<DeviceShareState>) {
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

  start() {
    this.stop();
    this.owner = this.service.session?.userID;
    this.revision = this.service.sessionRevision;
    if (!this.owner || !this.deviceID) {
      this.update({ phase: "blocked", error: "请先登录并选择设备" });
      return;
    }
    this.update({ active: true });
    this.unsubscribeSession = this.service.onSessionChange(() => {
      if (this.current()) return;
      this.stop();
      this.update({ phase: "blocked", error: "登录状态已变化，请重新进入设备分享" });
    });
    void this.refresh();
  }

  stop() {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.update(initial());
  }

  tick() {
    if (
      this.current() &&
      this.state.phase === "ready" &&
      this.state.expiresAt &&
      this.now() >= Date.parse(this.state.expiresAt)
    ) {
      this.update({ phase: "expired", qrValue: undefined });
    }
  }

  async refresh() {
    if (!this.current() || this.state.phase === "loading") return;
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.update({
      phase: "loading",
      qrValue: undefined,
      expiresAt: undefined,
      error: "",
    });
    try {
      const view = await withBudget(
        (signal) => this.service.device(this.deviceID, signal),
        this.budget,
        "设备身份读取超时，请重试",
        controller.signal,
      );
      if (!this.current(generation) || controller.signal.aborted) return;
      if (view.device.id !== this.deviceID || view.bindingRole !== "sa") {
        this.update({
          phase: "blocked",
          error: "仅当前设备管理员可生成分享二维码",
        });
        return;
      }
      this.update({ deviceName: view.deviceNickname || this.deviceID });
      const share = await withBudget(
        (signal) => this.service.share(this.deviceID, signal),
        this.budget,
        "设备分享码获取超时，请重试",
        controller.signal,
      );
      if (!this.current(generation) || controller.signal.aborted) return;
      if (this.now() >= Date.parse(share.expiresAt)) {
        this.update({ phase: "expired", expiresAt: share.expiresAt });
        return;
      }
      this.update({phase:'unsupported',expiresAt:share.expiresAt,error:'正式分享二维码协议待确认，暂不能展示可扫码二维码'});
    } catch (error) {
      if (!this.current(generation) || controller.signal.aborted) return;
      this.update({
        phase:
          error instanceof ApiError &&
          [401, 403, 404, 1461, 1462].includes(error.code)
            ? "blocked"
            : "failed",
        qrValue: undefined,
        expiresAt: undefined,
        error: error instanceof Error ? error.message : "设备分享码获取失败",
      });
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }
}

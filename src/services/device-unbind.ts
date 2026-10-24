import { withBudget } from "../protocol/device";
import { ApiError, type HomeGroup } from "./models";
import type { RowanService } from "./rowan";

export type UnbindPhase = "idle" | "submitting" | "checking" | "unknown" | "failed" | "complete";

export interface DeviceUnbindState {
  phase: UnbindPhase;
  error: string;
}

const initial = (): DeviceUnbindState => ({ phase: "idle", error: "" });
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const definiteFailure = (error: unknown) =>
  error instanceof ApiError && [400, 401, 403, 404, 1361, 1362].includes(error.code);

function homeContains(groups: HomeGroup[], deviceID: string) {
  if (
    !Array.isArray(groups) ||
    groups.some(
      (group) =>
        !group ||
        !Array.isArray(group.devices) ||
        group.devices.some((item) => typeof item?.device?.id !== "string"),
    )
  ) {
    throw new ApiError(502, "首页设备关系无法辨识，请稍后核对");
  }
  return groups.some((group) => group.devices.some((item) => item.device.id === deviceID));
}

/** A pending DELETE belongs to one device and one authenticated session. */
export class DeviceUnbindFlow {
  state = initial();

  private active = false;
  private generation = 0;
  private owner?: string;
  private revision = -1;
  private controller?: AbortController;
  private unsubscribeSession?: () => void;
  private listeners = new Set<() => void>();

  constructor(
    private service: RowanService,
    readonly deviceID: string,
    private releaseDevice: (deviceID: string, owner: string, revision: number) => boolean,
    private budget = 10000,
  ) {}

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private update(state: DeviceUnbindState) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  private current(generation = this.generation) {
    return (
      this.active &&
      generation === this.generation &&
      this.owner === this.service.session?.userID &&
      this.revision === this.service.sessionRevision
    );
  }

  get busy() {
    return (
      !!this.controller || this.state.phase === "submitting" || this.state.phase === "checking"
    );
  }

  get pending() {
    return this.state.phase === "unknown" || this.state.phase === "checking";
  }

  start() {
    this.stop();
    const owner = this.service.session?.userID;
    const revision = this.service.sessionRevision;
    if (owner !== this.owner || revision !== this.revision) {
      this.update(initial());
    }
    this.owner = owner;
    this.revision = revision;
    if (!owner) return;
    this.active = true;
    this.unsubscribeSession = this.service.onSessionChange(() => {
      if (!this.current()) {
        this.stop();
        this.owner = undefined;
        this.revision = -1;
        this.update(initial());
      }
    });
  }

  stop() {
    this.active = false;
    this.generation++;
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.controller?.abort();
    this.controller = undefined;
    if (this.state.phase === "submitting" || this.state.phase === "checking") {
      this.update({
        phase: "unknown",
        error: "解绑结果待核对，请先检查当前绑定关系",
      });
    }
  }

  private async request<T>(work: (signal: AbortSignal) => Promise<T>) {
    const controller = new AbortController();
    this.controller = controller;
    try {
      return await withBudget(
        work,
        this.budget,
        "等待解绑结果超时，请核对绑定关系",
        controller.signal,
      );
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  private finish(generation: number) {
    if (!this.current(generation) || !this.owner) return false;
    if (!this.releaseDevice(this.deviceID, this.owner, this.revision)) return false;
    this.update({ phase: "complete", error: "" });
    return true;
  }

  async submit() {
    if (!this.current() || this.busy || this.pending || this.state.phase === "complete") {
      return false;
    }
    const generation = this.generation;
    this.update({ phase: "submitting", error: "" });
    try {
      await this.request((signal) => this.service.unbind(this.deviceID, signal));
      return this.finish(generation);
    } catch (error) {
      if (!this.current(generation)) return false;
      if (definiteFailure(error)) {
        this.update({ phase: "failed", error: errorText(error) });
        if (error instanceof ApiError && (error.code === 1361 || error.code === 1362)) {
          await this.refreshRelationship(generation);
        }
        return false;
      }
      this.update({
        phase: "unknown",
        error: `解绑结果待核对：${errorText(error)}`,
      });
      return this.reconcile();
    }
  }

  private async refreshRelationship(generation: number) {
    try {
      await this.request((signal) => this.service.home(signal));
    } catch (error) {
      if (this.current(generation)) {
        this.update({
          phase: "failed",
          error: `${this.state.error}；首页关系刷新失败：${errorText(error)}`,
        });
      }
    }
  }

  async reconcile() {
    if (!this.current() || this.state.phase !== "unknown") return false;
    const generation = this.generation;
    this.update({ phase: "checking", error: "" });
    try {
      const groups = await this.request((signal) => this.service.home(signal));
      if (!this.current(generation)) return false;
      if (!homeContains(groups, this.deviceID)) return this.finish(generation);
      this.update({
        phase: "unknown",
        error: "首页仍显示该设备，解绑结果待核对；不会自动重发解绑请求",
      });
      return false;
    } catch (error) {
      if (this.current(generation)) {
        this.update({
          phase: "unknown",
          error: `解绑结果待核对：首页读取失败：${errorText(error)}`,
        });
      }
      return false;
    }
  }
}

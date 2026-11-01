import { withBudget } from "../protocol/device";
import { ApiError, type OtaCheck, type OtaTask, type OtaType } from "./models";
import type { RowanService } from "./rowan";

type SavedOta =
  | { kind: "unknown"; type: OtaType; firmwareID: string }
  | { kind: "task"; taskID: string; type?: OtaType; cancelPending?: boolean };

export interface DeviceOtaState {
  active: boolean;
  busy: boolean;
  deviceName: string;
  type: OtaType;
  checked: boolean;
  check?: OtaCheck;
  task?: OtaTask;
  taskID?: string;
  unknown: boolean;
  cancelPending: boolean;
  error: string;
}

const initial = (): DeviceOtaState => ({
  active: false,
  busy: false,
  deviceName: "",
  type: "mcu",
  checked: false,
  unknown: false,
  cancelPending: false,
  error: "",
});

function savedOta(raw: string | null): SavedOta | undefined {
  if (!raw) return undefined;
  // Older builds stored only a task ID. Keep it queryable without guessing its type.
  if (!raw.startsWith("{")) return { kind: "task", taskID: raw };
  try {
    const value = JSON.parse(raw) as SavedOta;
    if (
      value.kind === "unknown" &&
      ["mcu", "wifi"].includes(value.type) &&
      typeof value.firmwareID === "string"
    )
      return value;
    if (value.kind === "task" && typeof value.taskID === "string" && value.taskID) {
      return value;
    }
  } catch {
    // Corrupt task history must not silently permit another PUT.
  }
  return { kind: "unknown", type: "mcu", firmwareID: "" };
}

export class DeviceOtaFlow {
  state = initial();
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private unsubscribeSession?: () => void;
  private generation = 0;
  private owner?: string;
  private revision = -1;
  private saved?: SavedOta;
  private polling = false;

  constructor(
    private service: RowanService,
    readonly deviceID: string,
    private budget = 10000,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = () => this.state;

  private update(patch: Partial<DeviceOtaState>) {
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

  private async persist(value: SavedOta | undefined) {
    const generation = this.generation;
    await this.service.preference(`ota.${this.deviceID}`, value ? JSON.stringify(value) : "");
    if (this.current(generation)) this.saved = value;
  }

  start() {
    if (this.state.active) return;
    this.owner = this.service.session?.userID;
    this.revision = this.service.sessionRevision;
    if (!this.owner || !this.deviceID) {
      this.update({ error: "请先登录并选择设备" });
      return;
    }
    const generation = ++this.generation;
    this.controller = new AbortController();
    this.update({ ...initial(), active: true, busy: true });
    this.unsubscribeSession = this.service.onSessionChange(() => {
      if (this.current()) return;
      this.stop();
    });
    void this.load(generation, this.controller.signal);
  }

  stop() {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.saved = undefined;
    this.polling = false;
    this.update(initial());
  }

  private async load(generation: number, signal: AbortSignal) {
    try {
      const raw = await this.service.preference(`ota.${this.deviceID}`);
      if (!this.current(generation)) return;
      this.saved = savedOta(raw);
      const view = await withBudget(
        (requestSignal) => this.service.device(this.deviceID, requestSignal),
        this.budget,
        "设备身份读取超时",
        signal,
      );
      if (!this.current(generation)) return;
      if (view.device.id !== this.deviceID) throw new ApiError(403, "当前设备身份不匹配");
      this.update({
        busy: false,
        deviceName: view.deviceNickname || view.device.name || this.deviceID,
        unknown: this.saved?.kind === "unknown",
        taskID: this.saved?.kind === "task" ? this.saved.taskID : undefined,
        cancelPending: this.saved?.kind === "task" && !!this.saved.cancelPending,
      });
      if (this.saved?.kind === "task") await this.poll();
    } catch (error) {
      if (this.current(generation)) {
        this.update({ busy: false, error: errorMessage(error, "设备读取失败") });
      }
    }
  }

  select(type: OtaType) {
    if (!this.current() || this.state.busy) return;
    this.update({ type, checked: false, check: undefined, error: "" });
  }

  async check() {
    if (!this.current() || this.state.busy) return;
    const generation = this.generation;
    const type = this.state.type;
    this.update({ busy: true, checked: false, check: undefined, error: "" });
    try {
      const check = await withBudget(
        (signal) => this.service.firmware(this.deviceID, type, signal),
        this.budget,
        "固件检查超时",
        this.controller?.signal,
      );
      if (this.current(generation) && this.state.type === type) {
        this.update({ checked: true, check });
      }
    } catch (error) {
      if (this.current(generation)) this.update({ error: errorMessage(error, "固件检查失败") });
    } finally {
      if (this.current(generation)) this.update({ busy: false });
    }
  }

  async create() {
    const firmware = this.state.check?.firmware;
    if (
      !this.current() ||
      this.state.busy ||
      !this.state.checked ||
      !this.state.check?.hasUpdate ||
      !firmware ||
      this.saved?.kind === "unknown" ||
      (this.saved?.kind === "task" &&
        this.state.task?.result !== "success" &&
        this.state.task?.result !== "failed" &&
        this.state.task?.result !== "cancelled")
    )
      return;
    const generation = this.generation;
    const type = this.state.type;
    this.update({ busy: true, error: "" });
    let sent = false;
    try {
      const view = await withBudget(
        (signal) => this.service.device(this.deviceID, signal),
        this.budget,
        "设备状态读取超时",
        this.controller?.signal,
      );
      if (!this.current(generation)) return;
      if (view.device.id !== this.deviceID || view.online === false) {
        throw new ApiError(400, "设备离线或身份不匹配，无法升级");
      }
      await this.persist({ kind: "unknown", type, firmwareID: firmware.id });
      if (!this.current(generation)) return;
      sent = true;
      const response = await withBudget(
        (signal) => this.service.startOta(this.deviceID, type, firmware.id, signal),
        this.budget,
        "创建升级任务超时",
        this.controller?.signal,
      );
      if (!this.current(generation)) return;
      await this.persist({ kind: "task", taskID: response.taskID, type });
      if (!this.current(generation)) return;
      this.update({ taskID: response.taskID, unknown: false, checked: false });
      await this.poll();
    } catch (error) {
      if (!this.current(generation)) return;
      const definite =
        error instanceof ApiError &&
        [400, 403, 404, 409, 1511, 1512, 1513, 1514, 1515, 1516].includes(error.code);
      if (sent && definite) await this.persist(undefined);
      this.update({
        unknown: sent && !definite,
        error:
          sent && !definite
            ? "创建结果待核对：不能再次发起升级，等待服务端提供任务查询能力"
            : errorMessage(error, "升级任务创建失败"),
      });
    } finally {
      if (this.current(generation)) this.update({ busy: false });
    }
  }

  async poll() {
    if (
      !this.current() ||
      this.polling ||
      this.saved?.kind !== "task" ||
      (this.state.task?.result !== undefined && this.state.task.result !== "updating")
    )
      return;
    const generation = this.generation;
    const taskID = this.saved.taskID;
    this.polling = true;
    try {
      const task = await withBudget(
        (signal) => this.service.otaTask(this.deviceID, taskID, signal),
        this.budget,
        "升级状态读取超时",
        this.controller?.signal,
      );
      if (!this.current(generation) || this.saved?.kind !== "task" || this.saved.taskID !== taskID)
        return;
      if (task.result !== "updating" && this.saved.cancelPending) {
        await this.persist({ ...this.saved, cancelPending: false });
      }
      this.update({
        task,
        cancelPending: this.saved?.kind === "task" && !!this.saved.cancelPending,
        error: "",
      });
    } catch (error) {
      if (this.current(generation)) {
        this.update({ error: `任务状态读取失败：${errorMessage(error, "请重试")}` });
      }
    } finally {
      if (generation === this.generation) this.polling = false;
    }
  }

  async cancel() {
    if (
      !this.current() ||
      this.state.busy ||
      this.polling ||
      this.saved?.kind !== "task" ||
      this.saved.cancelPending ||
      !this.state.task ||
      this.state.task.result !== "updating" ||
      !["waiting", "downloading", "upgrading"].includes(this.state.task.status)
    )
      return;
    const generation = this.generation;
    const taskID = this.saved.taskID;
    this.update({ busy: true, error: "" });
    try {
      await this.persist({ ...this.saved, cancelPending: true });
      if (!this.current(generation)) return;
      this.update({ cancelPending: true });
      try {
        await withBudget(
          (signal) => this.service.cancelOta(this.deviceID, taskID, signal),
          this.budget,
          "取消请求超时",
          this.controller?.signal,
        );
      } catch (error) {
        if (this.current(generation)) {
          this.update({ error: `取消结果待核对：${errorMessage(error, "请查询最终状态")}` });
        }
      }
      if (this.current(generation)) await this.poll();
    } catch (error) {
      if (this.current(generation)) this.update({ error: errorMessage(error, "取消失败") });
    } finally {
      if (this.current(generation)) this.update({ busy: false });
    }
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

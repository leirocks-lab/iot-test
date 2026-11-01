import { deviceTimeouts, withBudget } from "../protocol/device";
import { ApiError, type BindingResult, type Product } from "./models";
import { parseRowanCandidates, type CodeIdentity, type RowanCodeParser } from "./qr";
import type { RowanService } from "./rowan";

export interface ScanState {
  phase: "idle" | "choosing" | "confirming" | "unknown" | "done";
  choices: { type: "device" | "share"; label: string }[];
  selected?: number;
  error: string;
}

export class QrScanCoordinator {
  private current?: QrScanFlow;
  private owner?: string;
  private revision?: number;
  constructor(
    private service: RowanService,
    private realParser?: RowanCodeParser,
    private beforeNewContext?: () => void,
  ) {}
  get pending() {
    return (
      this.owner === this.service.session?.userID &&
      this.revision === this.service.sessionRevision &&
      !!this.current &&
      ["confirming", "unknown"].includes(this.current.state.phase)
    );
  }
  acquire() {
    const owner = this.service.userID;
    if (
      !this.current ||
      this.owner !== owner ||
      this.revision !== this.service.sessionRevision ||
      this.current.state.phase === "done"
    ) {
      this.current?.stop();
      this.owner = owner;
      this.revision = this.service.sessionRevision;
      this.current = new QrScanFlow(this.service, this.realParser, this.beforeNewContext);
    }
    return this.current;
  }
  clear() {
    this.current?.stop();
    this.current = undefined;
    this.owner = undefined;
  }
}
export type ScanDestination = { deviceID: string; product: Product } | { binding: BindingResult };
export class QrScanFlow {
  state: ScanState = { phase: "idle", choices: [], error: "" };
  private codes: CodeIdentity[] = [];
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private round = 0;
  private submitted = false;
  private owner?: string;
  private revision: number;
  constructor(
    private service: RowanService,
    private realParser?: RowanCodeParser,
    private beforeNewContext?: () => void,
  ) {
    this.revision = service.sessionRevision;
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<ScanState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  read(values: readonly string[]) {
    if (this.state.phase !== "idle") return;
    try {
      if (!this.realParser) throw new ApiError(503, "正式二维码协议尚未配置，暂不能扫码绑定");
      this.codes = parseRowanCandidates(values, this.realParser!);
      this.update({
        phase: "choosing",
        choices: this.codes.map((code) => ({
          type: code.type,
          label: code.deviceID,
        })),
        selected: this.codes.length === 1 ? 0 : undefined,
        error: "",
      });
    } catch (error) {
      this.update({ error: (error as Error).message });
    }
  }
  choose(index: number) {
    if (this.state.phase !== "choosing" || !this.codes[index]) return;
    this.update({ selected: index, error: "" });
  }
  reset() {
    if (this.state.phase === "unknown") throw new ApiError(409, "请先核对本次扫码绑定结果");
    this.stop();
    this.codes = [];
    this.submitted = false;
    this.update({ phase: "idle", choices: [], selected: undefined, error: "" });
  }
  stop() {
    ++this.round;
    this.controller?.abort();
    this.controller = undefined;
    if (this.state.phase === "confirming")
      this.update({ phase: this.submitted ? "unknown" : "choosing" });
  }
  private check(round: number, signal: AbortSignal) {
    if (
      round !== this.round ||
      signal.aborted ||
      this.service.session?.userID !== this.owner ||
      this.service.sessionRevision !== this.revision
    )
      throw new ApiError(499, "扫码操作已停止");
  }
  private binding(result: BindingResult, deviceID: string, first = false) {
    if (result.deviceID !== deviceID)
      throw new ApiError(502, "后台返回的设备 ID 与二维码不一致，请核对设备");
    if (result.userID !== this.owner)
      throw new ApiError(502, "后台返回的用户与当前账号不一致，请核对账号");
    if (first && result.bindingRole !== "sa") {
      const role = result.bindingRole === "mbr" ? "普通成员" : result.bindingRole === "obs" ? "观察员" : "未知角色";
      throw new ApiError(502, `后台返回${role}角色，首绑应为管理员；请返回首页核对设备是否已被绑定`);
    }
    if (!first && !["sa", "mbr", "obs"].includes(result.bindingRole))
      throw new ApiError(502, "后台返回的设备角色无效，请核对设备");
  }
  async bindScannedDevice(): Promise<ScanDestination> {
    if (this.state.phase !== "done" || this.state.selected === undefined || this.submitted)
      throw new ApiError(409, "请先完成设备识别，勿重复提交绑定");
    const code = this.codes[this.state.selected];
    if (code?.type !== "device") throw new ApiError(409, "当前不是首绑设备码");
    if (this.service.sessionRevision !== this.revision)
      throw new ApiError(499, "登录上下文已变更，请重新扫码");
    this.beforeNewContext?.();
    const round = ++this.round,
      controller = new AbortController();
    this.controller = controller;
    this.owner = this.service.userID;
    this.submitted = true;
    this.update({ phase: "confirming", error: "" });
    try {
      const binding = await withBudget(
        (signal) => this.service.bindFirstDevice(code.deviceID, signal),
        deviceTimeouts.scanTimeout,
        "绑定结果等待超时，请核对首页设备列表",
        controller.signal,
      );
      this.check(round, controller.signal);
      this.binding(binding, code.deviceID, true);
      this.update({ phase: "unknown" });
      return await this.reconcile();
    } catch (error) {
      if (round === this.round) {
        const definite =
          error instanceof ApiError && [400, 401, 403, 404, 1131, 1132, 1133].includes(error.code);
        this.update({ phase: definite ? "done" : "unknown", error: (error as Error).message });
        if (definite) this.submitted = false;
        else if (!(error instanceof ApiError && [499, 502].includes(error.code))) {
          try {
            return await this.reconcile();
          } catch {
            // Read-only reconciliation must not resubmit PAIR-06.
          }
        }
      }
      throw error;
    } finally {
      if (round === this.round) this.controller = undefined;
    }
  }
  async confirm(): Promise<ScanDestination> {
    if (this.state.phase !== "choosing" || this.state.selected === undefined)
      throw new ApiError(409, "请先选择一个二维码，勿重复确认");
    if (this.service.sessionRevision !== this.revision)
      throw new ApiError(499, "登录上下文已变更，请重新扫码");
    this.beforeNewContext?.();
    const code = this.codes[this.state.selected],
      round = ++this.round,
      controller = new AbortController();
    this.controller = controller;
    this.owner = this.service.userID;
    this.submitted = false;
    this.update({ phase: "confirming", error: "" });
    try {
      const destination = await withBudget(
        async (signal) => {
          if (code.type === "device") {
            const groups = await this.service.products(signal);
            this.check(round, signal);
            const matches = groups
              .flatMap((group) => group.products)
              .filter((product) => product.deviceProductID === code.deviceProductID);
            if (matches.length !== 1)
              throw new ApiError(
                409,
                matches.length ? "设备侧产品标识对应多个产品，请核对产品目录" : "产品目录中没有该设备侧产品标识",
              );
            const product = await this.service.product(matches[0].id, signal);
            this.check(round, signal);
            if (
              product.id !== matches[0].id ||
              (product.deviceProductID && product.deviceProductID !== code.deviceProductID)
            )
              throw new ApiError(502, "产品详情与二维码标识不一致");
            return { deviceID: code.deviceID, product };
          }
          this.submitted = true;
          const binding = await this.service.acceptShare(code.deviceID, code.bindCode, signal);
          this.check(round, signal);
          this.binding(binding, code.deviceID);
          return { binding };
        },
        deviceTimeouts.scanTimeout,
        "扫码结果等待超时，请核对绑定结果",
        controller.signal,
      );
      this.check(round, controller.signal);
      this.update({ phase: "done" });
      return destination;
    } catch (error) {
      if (round === this.round) {
        const definite =
          error instanceof ApiError && [400, 401, 403, 404, 1131, 1132, 1133].includes(error.code);
        if (this.submitted && definite) {
          this.codes = [];
          this.update({
            phase: "idle",
            choices: [],
            selected: undefined,
            error: (error as Error).message,
          });
        } else {
          this.update({
            phase: this.submitted ? "unknown" : "choosing",
            error: (error as Error).message,
          });
        }
        if (this.submitted && !definite && !(error instanceof ApiError && error.code === 502)) {
          try {
            return await this.reconcile();
          } catch {
            // Keep the pending state. Reconciliation never resubmits PAIR-06.
          }
        }
      }
      throw error;
    } finally {
      if (round === this.round) this.controller = undefined;
    }
  }
  async reconcile(): Promise<ScanDestination> {
    if (this.state.phase !== "unknown" || this.state.selected === undefined)
      throw new ApiError(409, "没有待核对的扫码事务");
    const code = this.codes[this.state.selected];
    // Retain the original account. A different account cannot claim this uncertain transaction.
    if (this.service.userID !== this.owner || this.service.sessionRevision !== this.revision)
      throw new ApiError(499, "账号上下文已变更，请返回首页核对");
    const round = ++this.round,
      controller = new AbortController();
    this.controller = controller;
    this.update({ phase: "confirming", error: "" });
    try {
      const groups = await withBudget(
        (signal) => this.service.home(signal),
        deviceTimeouts.scanTimeout,
        "设备结果核对超时",
        controller.signal,
      );
      this.check(round, controller.signal);
      if (
        !Array.isArray(groups) ||
        groups.some(
          (group) =>
            !group ||
            !Array.isArray(group.devices) ||
            group.devices.some((view) => typeof view?.device?.id !== "string"),
        )
      ) {
        throw new ApiError(502, "当前账号设备关系无法辨识，请稍后核对");
      }
      const view = groups
        .flatMap((group) => group.devices)
        .find((device) => device.device.id === code.deviceID);
      if (!view) {
        throw new ApiError(409, "首页尚未显示该设备，绑定结果待核对；不会重复提交绑定码");
      }
      const binding = {
        deviceID: view.device.id,
        userID: this.owner!,
        bindingRole: view.bindingRole,
      };
      this.binding(binding, code.deviceID, code.type === "device");
      this.update({ phase: "done", error: "" });
      return { binding };
    } catch (error) {
      if (round === this.round) {
        this.update({ phase: "unknown", error: (error as Error).message });
      }
      throw error;
    } finally {
      if (round === this.round) this.controller = undefined;
    }
  }
}

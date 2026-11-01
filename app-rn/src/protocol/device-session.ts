import { ApiError, type DeviceView, type ThingModel } from "../services/models";
import { withBudget } from "./device";
import type { MqttConnection } from "./mqtt-connection";
import { sessionFailure, type SessionFailure } from "./session-failure";
import type { PropertyControls } from "../services/device-controls";
import {
  ServiceRejectedError,
  type MaintenanceControls,
  type ServiceCall,
} from "../services/device-maintenance";
import type { DeviceEvent, EventControls, PropertyObservation } from "../services/device-events";

type Values = Record<string, number | string | boolean>;
export interface DeviceSession {
  readonly confirmed: Values;
  readonly ready: boolean;
  readonly sending: boolean;
  readonly connected?: boolean;
  /** Only a confirmed protocol mapping may determine online; missing/stale state is unknown. */
  readonly online?: boolean;
  readonly error?: string;
  readonly failure?: SessionFailure;
  readonly canWrite?: boolean;
  readonly controls?: PropertyControls;
  readonly controlError?: string;
  readonly maintenance?: MaintenanceControls;
  readonly maintenanceError?: string;
  readonly canInvokeService?: boolean;
  readonly events?: EventControls;
  readonly eventError?: string;
  onEvent?(listener: (event: DeviceEvent) => void): () => void;
  onProperties?(listener: (observation: PropertyObservation) => void): () => void;
  invokeService?(call: ServiceCall): Promise<void>;
  connect(signal?: AbortSignal): Promise<void>;
  command(properties: Record<string, unknown>): Promise<void>;
  onChange(listener: () => void): () => void;
  close(): void;
}
export interface Publication {
  topic: string;
  payload: Uint8Array;
}
export type DeviceReport =
  | {
      kind: "full" | "delta";
      version: number;
      reported: Values;
      deleted?: string[];
      clearReported?: boolean;
      requestID?: string;
    }
  | { kind: "accepted"; version: number; requestID: string }
  | { kind: "rejected"; requestID?: string; operation?: "query" | "update"; code?: number }
  | { kind: "serviceResult"; requestID: string; identifier: string; success: boolean }
  | { kind: "event"; event: DeviceEvent }
  | { kind: "revoked"; requestID?: string };
/** Supplied only after the deployment's identity, topics, payloads and permissions are confirmed. */
export interface DeviceSyncProfile {
  confirmation?: "shadow";
  online?: (reported: Values) => boolean | undefined;
  topics: readonly string[];
  query(requestID: string): Publication;
  /** Validate current-device identity, complete-vs-delta semantics and wire correlation before normalizing. */
  decode(topic: string, payload: Uint8Array): DeviceReport | undefined;
  canWrite: boolean;
  command?: (
    properties: Record<string, unknown>,
    requestID: string,
  ) => Publication & { expected: Values };
  service?: (
    call: ServiceCall,
    requestID: string,
  ) => Publication & { confirmation: { kind: "result" } | { kind: "reported"; expected: Values } };
}
export type DeviceProfileResolver = (
  context: { deviceID: string; userID: string; device: DeviceView; model: ThingModel },
  signal: AbortSignal,
) => Promise<DeviceSyncProfile>;
interface Lifecycle {
  current: () => boolean;
  start: () => void;
  stop: () => void;
  credentials: (signal: AbortSignal) => Promise<Record<string, string>>;
}
interface RealSessionOptions extends Lifecycle {
  deviceID: string;
  userID: string;
  connection: () => Promise<MqttConnection>;
  context: (signal: AbortSignal) => Promise<{ device: DeviceView; model: ThingModel }>;
  profile?: DeviceProfileResolver;
  timeout?: number;
}
const cancelled = () => new ApiError(499, "设备会话已停止");
const text = (error: unknown) => (error instanceof Error ? error.message : "设备会话失败");
function confirmationValues(value: unknown, message: string): Values {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Object.keys(value).length ||
    Object.values(value).some(
      (item) =>
        !["number", "string", "boolean"].includes(typeof item) ||
        (typeof item === "number" && !Number.isFinite(item)),
    )
  )
    throw new ApiError(503, message);
  return { ...value } as Values;
}
let sessionSequence = 0;

/** One foreground conversation. Every attempt obtains new credentials; no SDK retry or command replay. */
export class RealtimeDeviceSession implements DeviceSession {
  confirmed: Values = {};
  ready = false;
  connected = false;
  error = "";
  failure?: SessionFailure;
  private version = -1;
  private round = 0;
  private sequence = 0;
  private controller?: AbortController;
  private connection?: MqttConnection;
  private unsub?: () => void;
  private profile?: DeviceSyncProfile;
  private writable = false;
  private flight?: Promise<void>;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: DeviceEvent) => void>();
  private propertyListeners = new Set<(observation: PropertyObservation) => void>();
  private waiting?: {
    id: string;
    expected?: Values;
    service?: { identifier: string; result: boolean };
    acceptedVersion?: number;
    observed?: Record<string, { version: number; value: number | string | boolean }>;
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  private timeout: number;
  private identity: string;
  private shadowIdentity: string;
  constructor(private options: RealSessionOptions) {
    this.timeout = options.timeout ?? 10000;
    this.identity = `${options.userID}-${Date.now()}-${++sessionSequence}`;
    this.shadowIdentity = `app-${Date.now().toString(36)}-${sessionSequence}`;
  }
  get sending() {
    return !!(this.waiting?.expected || this.waiting?.service);
  }
  get online() {
    return this.ready && this.connected ? this.profile?.online?.(this.confirmed) : undefined;
  }
  get canWrite() {
    return (
      this.writable &&
      !!this.profile?.command &&
      (!this.profile.online || this.profile.online(this.confirmed) === true)
    );
  }
  get canInvokeService() {
    return (
      this.writable &&
      !!this.profile?.service &&
      (!this.profile.online || this.profile.online(this.confirmed) === true)
    );
  }
  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  onEvent(listener: (event: DeviceEvent) => void) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
  onProperties(listener: (observation: PropertyObservation) => void) {
    this.propertyListeners.add(listener);
    return () => {
      this.propertyListeners.delete(listener);
    };
  }
  private notify() {
    for (const listener of this.listeners) listener();
  }
  private check(round: number, signal: AbortSignal) {
    if (round !== this.round || signal.aborted || !this.options.current()) throw cancelled();
  }
  private requestID() {
    return `${this.profile?.confirmation === "shadow" ? this.shadowIdentity : this.identity}-${++this.sequence}`;
  }
  private rejectWaiting(error: Error) {
    const waiting = this.waiting;
    if (!waiting) return;
    this.waiting = undefined;
    clearTimeout(waiting.timer);
    waiting.reject(error);
  }
  private wait(id: string, expected?: Values, service?: { identifier: string; result: boolean }) {
    return new Promise<void>((resolve, reject) => {
      this.waiting = {
        id,
        expected,
        service,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiting = undefined;
          if (!expected && !service) {
            this.ready = false;
            this.error = "完整属性等待超时，仍未同步";
          } else this.error = "未确认设备结果";
          this.notify();
          reject(new ApiError(408, this.error));
        }, this.timeout),
      };
    });
  }
  connect(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted || !this.options.current()) return Promise.reject(cancelled());
    if (this.flight) return this.flight;
    this.close();
    this.options.start();
    const controller = new AbortController(),
      round = this.round;
    this.controller = controller;
    this.error = "";
    this.failure = undefined;
    this.notify();
    const abort = () => this.close();
    signal?.addEventListener("abort", abort, { once: true });
    // Deferring also makes synchronous factories subject to the same single-flight guard.
    const flight = Promise.resolve()
      .then(() => this.open(round, controller.signal))
      .catch((error) => {
        if (round === this.round) {
          this.close();
          this.error = text(error);
          this.failure = sessionFailure(error);
          this.notify();
        }
        throw error;
      })
      .finally(() => {
        signal?.removeEventListener("abort", abort);
        if (this.flight === flight) this.flight = undefined;
      });
    this.flight = flight;
    return flight;
  }
  private async open(round: number, signal: AbortSignal) {
    const credentials = await withBudget(
      (budget) => this.options.credentials(budget),
      this.timeout,
      "设备连接凭据读取超时",
      signal,
    );
    this.check(round, signal);
    const connection = await withBudget(
      async (budget) => {
        const created = await this.options.connection();
        try {
          this.check(round, budget);
        } catch (error) {
          created.close();
          throw error;
        }
        return created;
      },
      this.timeout,
      "MQTT连接创建超时",
      signal,
    );
    try {
      this.check(round, signal);
    } catch (error) {
      connection.close();
      throw error;
    }
    this.connection = connection;
    this.unsub = connection.onConnectionChange((connected) => {
      if (round !== this.round) return;
      this.connected = connected;
      if (!connected) {
        this.close();
        this.error = "设备通信中断，请重新同步";
        this.failure = connection.failure ?? { kind: "transient", code: 0 };
      }
      this.notify();
    });
    await connection.connect(credentials, this.options.deviceID, signal);
    this.check(round, signal);
    if (!this.options.profile)
      throw new ApiError(503, "MQTT同步协议尚未配置，属性待同步", "configuration");
    const context = await withBudget(
      (budget) => this.options.context(budget),
      this.timeout,
      "设备同步资料读取超时",
      signal,
    );
    this.check(round, signal);
    if (context.device.device.id !== this.options.deviceID)
      throw new ApiError(403, "设备同步身份不一致");
    const profile = await withBudget(
      (budget) =>
        this.options.profile!(
          { ...context, deviceID: this.options.deviceID, userID: this.options.userID },
          budget,
        ),
      this.timeout,
      "设备同步协议读取超时",
      signal,
    );
    this.check(round, signal);
    if (!profile.topics.length || new Set(profile.topics).size !== profile.topics.length)
      throw new ApiError(503, "设备订阅协议不完整", "configuration");
    this.profile = profile;
    this.writable = profile.canWrite === true && context.device.bindingRole !== "obs";
    for (const topic of profile.topics) {
      await connection.subscribe(
        topic,
        (payload) => {
          if (round !== this.round || signal.aborted || !this.options.current()) return;
          try {
            const report = profile.decode(topic, payload);
            if (report) this.receive(report);
          } catch {
            /* Malformed or foreign reports cannot confirm a device state. */
          }
        },
        signal,
      );
      this.check(round, signal);
    }
    const id = this.requestID(),
      query = profile.query(id),
      received = this.wait(id);
    // Attach rejection before publishing: a socket close can reject the waiter during PUBACK.
    await Promise.all([connection.publish(query.topic, query.payload, signal), received]);
    this.check(round, signal);
  }
  private receive(report: DeviceReport) {
    if (report.kind === "accepted") {
      const w = this.waiting;
      if (
        this.profile?.confirmation !== "shadow" ||
        !w?.expected ||
        report.requestID !== w.id ||
        !Number.isSafeInteger(report.version) ||
        report.version < 0
      )
        return;
      w.acceptedVersion = report.version;
      if (this.shadowConfirmed()) this.completeWaiting();
      return;
    }
    if (report.kind === "event") {
      for (const listener of this.eventListeners) listener(report.event);
      return;
    }
    if (report.kind === "serviceResult") {
      const waiting = this.waiting;
      if (
        !waiting?.service?.result ||
        report.requestID !== waiting.id ||
        report.identifier !== waiting.service.identifier ||
        typeof report.success !== "boolean"
      )
        return;
      if (!report.success) {
        this.rejectWaiting(new ServiceRejectedError());
        this.error = "设备拒绝了维护重置";
      } else {
        clearTimeout(waiting.timer);
        this.waiting = undefined;
        waiting.resolve();
        this.error = "";
      }
      this.notify();
      return;
    }
    if (report.kind === "revoked") {
      this.close();
      this.error = "设备权限已失效";
      this.failure = { kind: "authorization", code: 403 };
      this.notify();
      return;
    }
    if (report.kind === "rejected") {
      const w = this.waiting,
        query = w && !w.expected && !w.service;
      if (
        w &&
        (report.requestID === w.id ||
          (this.profile?.confirmation === "shadow" &&
            query &&
            report.operation === "query" &&
            report.requestID === undefined))
      ) {
        const code = report.code ?? 403;
        this.rejectWaiting(
          w.service
            ? new ServiceRejectedError()
            : new ApiError(
                code,
                code === 404
                  ? "设备影子尚未创建"
                  : code === 409
                    ? "影子版本冲突，请重新同步"
                    : "设备请求被拒绝",
              ),
        );
        this.ready = false;
        this.failure = sessionFailure(new ApiError(code, "设备请求被拒绝"));
        this.error =
          code === 404
            ? "设备影子尚未创建"
            : code === 409
              ? "影子版本冲突，请重新同步"
              : "设备请求被拒绝";
        this.notify();
      }
      return;
    }
    if (report.kind !== "full" && report.kind !== "delta") return;
    if (
      !Number.isSafeInteger(report.version) ||
      report.version < 0 ||
      !report.reported ||
      typeof report.reported !== "object" ||
      Array.isArray(report.reported) ||
      Object.values(report.reported).some(
        (value) =>
          !["number", "string", "boolean"].includes(typeof value) ||
          (typeof value === "number" && !Number.isFinite(value)),
      )
    )
      return;
    if (!this.ready) {
      if (
        report.kind !== "full" ||
        !this.waiting ||
        this.waiting.expected ||
        !(
          report.requestID === this.waiting.id ||
          (this.profile?.confirmation === "shadow" && report.requestID === undefined)
        )
      )
        return;
      this.confirmed = { ...report.reported };
      this.version = report.version;
      this.ready = true;
    } else {
      // A second/foreign GET response is not an incremental device report.
      if (report.kind === "full") return;
      if (report.version <= this.version) return;
      this.confirmed = { ...(report.clearReported ? {} : this.confirmed), ...report.reported };
      this.version = report.version;
    }
    for (const key of report.deleted ?? []) delete this.confirmed[key];
    for (const listener of this.propertyListeners)
      listener({ reported: { ...report.reported }, full: report.kind === "full" });
    const waiting = this.waiting;
    if (waiting?.expected && this.profile?.confirmation === "shadow") {
      if (this.profile.online && !this.profile.online(this.confirmed)) {
        this.rejectWaiting(new ApiError(409, "设备离线，结果未确认"));
        this.error = "设备离线，结果未确认";
        this.notify();
        return;
      }
      waiting.observed ??= {};
      if (report.clearReported) waiting.observed = {};
      for (const key of report.deleted ?? []) delete waiting.observed[key];
      for (const key of Object.keys(waiting.expected))
        if (Object.hasOwn(report.reported, key))
          waiting.observed[key] = { version: report.version, value: report.reported[key] };
      if (this.shadowConfirmed()) this.completeWaiting();
      this.notify();
      return;
    }
    if (
      waiting &&
      !waiting.service?.result &&
      (report.requestID === waiting.id ||
        (this.profile?.confirmation === "shadow" &&
          report.kind === "full" &&
          !waiting.expected &&
          report.requestID === undefined)) &&
      (!waiting.expected ||
        Object.entries(waiting.expected).every(([key, value]) => report.reported[key] === value))
    ) {
      clearTimeout(waiting.timer);
      this.waiting = undefined;
      waiting.resolve();
      this.error = "";
    }
    this.notify();
  }
  private shadowConfirmed() {
    const w = this.waiting;
    return (
      !!w?.expected &&
      w.acceptedVersion !== undefined &&
      Object.entries(w.expected).every(
        ([key, value]) =>
          w.observed?.[key]?.value === value && w.observed[key].version > w.acceptedVersion!,
      )
    );
  }
  private completeWaiting() {
    const w = this.waiting;
    if (!w) return;
    clearTimeout(w.timer);
    this.waiting = undefined;
    w.resolve();
    this.error = "";
    this.notify();
  }
  async command(properties: Record<string, unknown>) {
    if (!this.options.current()) {
      this.close();
      throw cancelled();
    }
    if (!this.ready || this.waiting || !this.connection || !this.profile?.command || !this.canWrite)
      throw new ApiError(409, "设备未同步、离线、权限未确认或正在等待回报");
    const round = this.round,
      signal = this.controller!.signal,
      id = this.requestID(),
      publication = this.profile.command(properties, id);
    const expected = confirmationValues(publication.expected, "控制确认规则尚未配置");
    const received = this.wait(id, expected);
    this.notify();
    try {
      await Promise.all([
        this.connection.publish(publication.topic, publication.payload, signal),
        received,
      ]);
      this.check(round, signal);
    } catch (error) {
      if (round === this.round) {
        this.rejectWaiting(error instanceof Error ? error : new Error(text(error)));
        if (error instanceof ApiError && [0, 401, 403, 499].includes(error.code)) this.close();
        this.error = text(error);
        this.failure ??= sessionFailure(error);
        this.notify();
      }
      throw error;
    }
  }
  async invokeService(call: ServiceCall) {
    if (!this.options.current()) {
      this.close();
      throw cancelled();
    }
    if (
      !this.ready ||
      this.waiting ||
      !this.connection ||
      !this.profile?.service ||
      !this.canInvokeService
    )
      throw new ApiError(409, "设备未同步、离线、服务权限未确认或正在等待回报");
    const round = this.round,
      signal = this.controller!.signal,
      id = this.requestID(),
      publication = this.profile.service(call, id),
      confirmation = publication.confirmation;
    if (!confirmation || !["result", "reported"].includes(confirmation.kind))
      throw new ApiError(503, "维护服务确认规则尚未配置");
    const expected =
      confirmation.kind === "reported"
        ? confirmationValues(confirmation.expected, "维护服务确认规则尚未配置")
        : undefined;
    const received = this.wait(id, expected, {
      identifier: call.identifier,
      result: confirmation.kind === "result",
    });
    this.notify();
    try {
      await Promise.all([
        this.connection.publish(publication.topic, publication.payload, signal),
        received,
      ]);
      this.check(round, signal);
    } catch (error) {
      if (round === this.round) {
        this.rejectWaiting(error instanceof Error ? error : new Error(text(error)));
        if (error instanceof ApiError && [0, 401, 403, 499].includes(error.code)) this.close();
        this.error = text(error);
        this.notify();
      }
      throw error;
    }
  }
  close() {
    ++this.round;
    const controller = this.controller;
    this.controller = undefined;
    controller?.abort();
    this.flight = undefined;
    this.ready = false;
    this.connected = false;
    this.profile = undefined;
    this.writable = false;
    this.unsub?.();
    this.unsub = undefined;
    const connection = this.connection;
    this.connection = undefined;
    connection?.close();
    this.rejectWaiting(cancelled());
    this.options.stop();
    this.notify();
  }
}

import { ApiError } from "../services/models";
import type { DeviceSession } from "./device-session";
import { sessionFailure, type SessionFailure } from "./session-failure";

export type SessionCloseReason =
  "explicit" | "logout_or_account_changed" | "device_unbound" | "runtime_disposed";
/** Runtime owns the connection. A caller's cancellation only stops its own wait. */
export class ManagedDeviceSession implements DeviceSession {
  private closed = false;
  private foreground = true;
  private started = false;
  private flight?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private failures = 0;
  private lastFailure?: SessionFailure;
  private listeners = new Set<() => void>();
  private unsubscribe: () => void;
  readonly diagnostics: { logicalSessionID: string; attempt: number; closeReason: string };
  constructor(
    private inner: DeviceSession,
    private options: { logicalSessionID: string; random?: () => number; current?: () => boolean },
  ) {
    this.diagnostics = {
      logicalSessionID: options.logicalSessionID,
      attempt: 0,
      closeReason: "communication_failure",
    };
    this.unsubscribe = inner.onChange(() => {
      this.notify();
      queueMicrotask(() => {
        if (this.closed || this.flight || !this.started || this.ready) return;
        if (this.inner.failure) this.lastFailure = this.inner.failure;
        this.schedule();
      });
    });
  }
  get isCurrent() {
    return !this.closed && (this.options.current?.() ?? true);
  }
  get ready() {
    return this.isCurrent && this.inner.ready;
  }
  get connected() {
    return this.isCurrent && this.inner.connected;
  }
  get online() {
    return this.closed ? undefined : this.inner.online;
  }
  get confirmed() {
    return this.inner.confirmed;
  }
  get sending() {
    return !this.closed && this.inner.sending;
  }
  get canWrite() {
    return !this.closed && this.inner.canWrite;
  }
  get canInvokeService() {
    return !this.closed && this.inner.canInvokeService;
  }
  get controls() {
    return this.closed ? undefined : this.inner.controls;
  }
  get maintenance() {
    return this.closed ? undefined : this.inner.maintenance;
  }
  get events() {
    return this.closed ? undefined : this.inner.events;
  }
  get error() {
    return this.inner.error;
  }
  get controlError() {
    return this.inner.controlError;
  }
  get maintenanceError() {
    return this.inner.maintenanceError;
  }
  get eventError() {
    return this.inner.eventError;
  }
  get failure() {
    return this.lastFailure ?? this.inner.failure;
  }
  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  onEvent: NonNullable<DeviceSession["onEvent"]> = (listener) =>
    this.inner.onEvent?.(listener) ?? (() => {});
  onProperties: NonNullable<DeviceSession["onProperties"]> = (listener) =>
    this.inner.onProperties?.(listener) ?? (() => {});
  private notify() {
    for (const listener of this.listeners) listener();
  }
  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
  setForeground(foreground: boolean) {
    const changed = this.foreground !== foreground;
    this.foreground = foreground;
    if (!foreground) this.clearTimer();
    else if (
      changed &&
      this.started &&
      !this.ready &&
      !this.closed &&
      this.failure?.kind === "transient"
    ) {
      this.clearTimer();
      void this.connect().catch(() => undefined);
    }
  }
  private schedule() {
    if (
      !this.isCurrent ||
      !this.foreground ||
      this.flight ||
      this.timer ||
      this.ready ||
      this.failure?.kind !== "transient"
    )
      return;
    const base = Math.min(30000, 1000 * 2 ** Math.min(this.failures++, 5));
    const delay = Math.min(30000, base * (1 + (this.options.random ?? Math.random)() * 0.2));
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.connect().catch(() => undefined);
    }, delay);
  }
  connect(signal?: AbortSignal): Promise<void> {
    if (!this.isCurrent || signal?.aborted)
      return Promise.reject(new ApiError(499, "设备会话等待已取消"));
    this.started = true;
    if (this.ready && this.connected && !this.flight) return Promise.resolve();
    if (!this.flight) {
      this.clearTimer();
      this.diagnostics.attempt++;
      this.diagnostics.closeReason = "communication_failure";
      const work = Promise.resolve()
        .then(() => {
          if (this.closed) throw new ApiError(499, "设备会话已关闭");
          return this.inner.connect();
        })
        .then(() => {
          if (this.closed) {
            this.inner.close();
            throw new ApiError(499, "设备会话已关闭");
          }
          this.lastFailure = undefined;
          this.failures = 0;
        })
        .catch((error) => {
          this.lastFailure = this.inner.failure ?? sessionFailure(error);
          throw error;
        });
      const flight = work.finally(() => {
        if (this.flight === flight) {
          this.flight = undefined;
          this.schedule();
        }
        this.notify();
      });
      this.flight = flight;
    }
    const work = this.flight;
    if (!signal) return work;
    return new Promise((resolve, reject) => {
      const abort = () => {
        signal.removeEventListener("abort", abort);
        reject(new ApiError(499, "设备会话等待已取消"));
      };
      signal.addEventListener("abort", abort, { once: true });
      work.then(
        () => {
          signal.removeEventListener("abort", abort);
          resolve();
        },
        (error) => {
          signal.removeEventListener("abort", abort);
          reject(error);
        },
      );
      if (signal.aborted) abort();
    });
  }
  command: DeviceSession["command"] = (properties) =>
    this.closed
      ? Promise.reject(new ApiError(499, "设备会话已关闭"))
      : this.inner.command(properties);
  invokeService: NonNullable<DeviceSession["invokeService"]> = (call) =>
    this.closed || !this.inner.invokeService
      ? Promise.reject(new ApiError(499, "设备会话已关闭或服务不可用"))
      : this.inner.invokeService(call);
  close(reason: SessionCloseReason = "explicit") {
    if (this.closed) return;
    this.closed = true;
    this.diagnostics.closeReason = reason;
    this.clearTimer();
    this.unsubscribe();
    this.inner.close();
    this.notify();
    this.listeners.clear();
  }
}

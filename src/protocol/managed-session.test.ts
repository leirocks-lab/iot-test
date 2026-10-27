import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagedDeviceSession } from "./managed-session";
import type { DeviceSession } from "./device-session";
import { ApiError } from "../services/models";

function fixture() {
  const listeners = new Set<() => void>();
  const inner = {
    ready: false,
    connected: false,
    confirmed: { Power: "on" },
    sending: false,
    failure: undefined as DeviceSession["failure"],
    onChange: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    connect: vi.fn(async () => {
      inner.ready = true;
      inner.connected = true;
      inner.failure = undefined;
    }),
    close: vi.fn(() => {
      inner.ready = false;
      inner.connected = false;
    }),
    command: vi.fn(async () => {}),
  };
  const session = new ManagedDeviceSession(inner, { logicalSessionID: "fixture", random: () => 0 });
  const drop = () => {
    inner.ready = false;
    inner.connected = false;
    inner.failure = { kind: "transient", code: 0 };
    listeners.forEach((fn) => fn());
  };
  return { inner, session, drop };
}
afterEach(() => vi.useRealTimers());
describe("Runtime-owned managed device session", () => {
  it("shares concurrent connects and reuses a synchronized connection", async () => {
    const { session, inner } = fixture();
    await Promise.all([session.connect(), session.connect()]);
    await session.connect();
    expect(inner.connect).toHaveBeenCalledTimes(1);
    expect(inner.close).not.toHaveBeenCalled();
    session.close("runtime_disposed");
  });
  it("cancels only one caller's wait while the shared connection completes", async () => {
    const { session, inner } = fixture();
    let finish!: () => void;
    inner.connect.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new AbortController();
    const first = session.connect(controller.signal),
      second = session.connect();
    const rejected = expect(first).rejects.toMatchObject({ code: 499 });
    await Promise.resolve();
    controller.abort();
    finish();
    await rejected;
    await second;
    expect(inner.close).not.toHaveBeenCalled();
    session.close();
  });
  it("keeps background connections, suspends retries, and recovers on foreground", async () => {
    vi.useFakeTimers();
    const { session, inner, drop } = fixture();
    await session.connect();
    session.setForeground(false);
    expect(inner.close).not.toHaveBeenCalled();
    drop();
    await vi.advanceTimersByTimeAsync(120000);
    expect(inner.connect).toHaveBeenCalledTimes(1);
    session.setForeground(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(inner.connect).toHaveBeenCalledTimes(2);
    session.close();
  });
  it("retries transient failures with capped exponential backoff and resets after success", async () => {
    vi.useFakeTimers();
    const { session, inner } = fixture();
    inner.connect.mockRejectedValue(new ApiError(0, "offline"));
    await expect(session.connect()).rejects.toMatchObject({ code: 0 });
    for (const [index, delay] of [1000, 2000, 4000, 8000, 16000, 30000, 30000].entries()) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(inner.connect).toHaveBeenCalledTimes(index + 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(inner.connect).toHaveBeenCalledTimes(index + 2);
    }
    inner.connect.mockImplementation(async () => {
      inner.ready = true;
      inner.connected = true;
    });
    await vi.advanceTimersByTimeAsync(30000);
    expect(session.ready).toBe(true);
    session.close();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([401, 403, 404])("does not retry permanent error %s", async (code) => {
    vi.useFakeTimers();
    const { session, inner } = fixture();
    inner.connect.mockRejectedValue(new ApiError(code, "denied"));
    await expect(session.connect()).rejects.toMatchObject({ code });
    await vi.advanceTimersByTimeAsync(60000);
    expect(inner.connect).toHaveBeenCalledTimes(1);
    session.close();
  });
  it("treats missing configuration as permanent but retries temporary service failures", async () => {
    vi.useFakeTimers();
    const { session, inner } = fixture();
    inner.connect.mockRejectedValue(new ApiError(503, "missing", "configuration"));
    await expect(session.connect()).rejects.toMatchObject({ code: 503 });
    await vi.advanceTimersByTimeAsync(60000);
    expect(inner.connect).toHaveBeenCalledTimes(1);
    inner.connect.mockRejectedValue(new ApiError(503, "service unavailable"));
    await expect(session.connect()).rejects.toMatchObject({ code: 503 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(inner.connect).toHaveBeenCalledTimes(3);
    session.close();
  });
  it("applies jitter within twenty percent and caps the maximum delay", async () => {
    vi.useFakeTimers();
    const c = fixture();
    c.session.close();
    const session = new ManagedDeviceSession(c.inner, {
      logicalSessionID: "jitter",
      random: () => 1,
    });
    c.inner.connect.mockRejectedValue(new ApiError(0, "offline"));
    await expect(session.connect()).rejects.toMatchObject({ code: 0 });
    await vi.advanceTimersByTimeAsync(1199);
    expect(c.inner.connect).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(c.inner.connect).toHaveBeenCalledTimes(2);
    session.close();
  });
  it("disposal cancels timers and late attempts cannot revive the session", async () => {
    vi.useFakeTimers();
    const { session, inner, drop } = fixture();
    await session.connect();
    drop();
    await vi.advanceTimersByTimeAsync(0);
    session.close("device_unbound");
    await vi.advanceTimersByTimeAsync(60000);
    expect(inner.connect).toHaveBeenCalledTimes(1);
    await expect(session.connect()).rejects.toMatchObject({ code: 499 });
    expect(session.diagnostics.closeReason).toBe("device_unbound");
  });
});

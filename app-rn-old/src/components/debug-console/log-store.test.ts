import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogStore, exportLogs, filterLogs, installConsoleCapture } from "./log-store";

afterEach(() => vi.useRealTimers());

describe("floating log store", () => {
  it("keeps only the latest 500 bounded entries with monotonic IDs", () => {
    const store = createLogStore();
    for (let i = 0; i < 503; i++) store.append("info", ["message", i]);
    const entries = store.getSnapshot().entries;
    expect(entries).toHaveLength(500);
    expect(entries[0].id).toBe(4);
    expect(entries[499].text).toBe("message 502");
    store.append("error", ["x".repeat(20000), "y".repeat(20000)]);
    expect(store.getSnapshot().entries.at(-1)!.text.length).toBeLessThanOrEqual(8192);
    store.clear();
    store.append("debug", ["new"]);
    expect(store.getSnapshot().entries).toHaveLength(1);
    expect(store.getSnapshot().entries[0].id).toBe(505);
  });

  it("redacts structured and serialized JSON secrets without reading accessors", () => {
    const store = createLogStore();
    const getter = vi.fn(() => "getter-secret");
    const details = { password: "pw-secret", nested: { token: "token-secret" } };
    Object.defineProperty(details, "computed", { enumerable: true, get: getter });
    store.append("info", [details]);
    store.append("debug", ['[HTTP] response\n{"authorization":"auth-secret","status":200}']);
    const output = exportLogs(store.getSnapshot().entries);
    expect(output).not.toMatch(/pw-secret|token-secret|auth-secret|getter-secret/);
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("200");
    expect(getter).not.toHaveBeenCalled();
  });

  it("handles circular data and hostile objects without throwing", () => {
    const store = createLogStore();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => store.append("warn", [circular, Symbol("symbol"), 1n])).not.toThrow();
    expect(exportLogs(store.getSnapshot().entries)).toContain("[CIRCULAR]");
    expect(() =>
      store.append("error", [
        new Proxy(
          {},
          {
            ownKeys: () => {
              throw Error();
            },
          },
        ),
      ]),
    ).not.toThrow();
  });

  it("does not evaluate array index getters during log capture", () => {
    const store = createLogStore();
    const getter = vi.fn(() => "array-secret");
    const array = ["normal"];
    Object.defineProperty(array, "1", { enumerable: true, get: getter });
    store.append("info", [{ values: array }]);
    expect(getter).not.toHaveBeenCalled();
    expect(exportLogs(store.getSnapshot().entries)).toContain("[ACCESSOR]");
    expect(exportLogs(store.getSnapshot().entries)).not.toContain("array-secret");
  });

  it("batches notifications, isolates failing listeners, and cancels stale notifications on clear", () => {
    vi.useFakeTimers();
    const store = createLogStore();
    const listener = vi.fn();
    store.subscribe(() => {
      throw Error("bad subscriber");
    });
    const unsubscribe = store.subscribe(listener);
    for (let i = 0; i < 50; i++) store.append("log", [i]);
    expect(listener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(listener).toHaveBeenCalledTimes(1);
    store.append("log", ["pending"]);
    store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(200);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.append("log", ["ignored"]);
    vi.advanceTimersByTime(200);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps snapshot identity stable between writes and models close/hide/restore", () => {
    const store = createLogStore();
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    store.open();
    expect(store.getSnapshot()).toMatchObject({ visible: true, open: true });
    store.close();
    expect(store.getSnapshot()).toMatchObject({ visible: true, open: false });
    store.hide();
    store.append("info", ["captured while hidden"]);
    expect(store.getSnapshot()).toMatchObject({ visible: false, open: false });
    store.show();
    expect(store.getSnapshot()).toMatchObject({ visible: true, open: false });
    expect(store.getSnapshot().entries).toHaveLength(1);
  });

  it("combines level and case-insensitive keyword filters and exports only selected entries", () => {
    const store = createLogStore();
    store.append("debug", ["[HTTP] request"]);
    store.append("error", ["[HTTP] failed"]);
    store.append("error", ["[MQTT] disconnected"]);
    const entries = filterLogs(store.getSnapshot().entries, "error", " http ");
    expect(entries).toHaveLength(1);
    expect(exportLogs(entries)).toMatch(/\[ERROR\].*\[HTTP\] failed/);
    expect(exportLogs(entries)).not.toContain("MQTT");
    expect(filterLogs(store.getSnapshot().entries, "all", "")).toHaveLength(3);
  });
});

describe("console capture", () => {
  it("preserves output arguments and this binding; repeated installation does not duplicate entries", () => {
    const store = createLogStore();
    const original = vi.fn(function (this: unknown, ...args: unknown[]) {
      expect(args).toHaveLength(2);
      expect(this).toBe(target);
    });
    const target = {
      log: original,
      debug: original,
      info: original,
      warn: original,
      error: original,
    };
    const restore = installConsoleCapture(target, store);
    const restoreAgain = installConsoleCapture(target, store);
    const object = { token: "secret" };
    target.log("hello", object);
    expect(original).toHaveBeenCalledExactlyOnceWith("hello", object);
    expect(store.getSnapshot().entries).toHaveLength(1);
    restoreAgain();
    restore();
    expect(target.log).toBe(original);
  });

  it("capture failure cannot suppress original console output", () => {
    const store = createLogStore();
    vi.spyOn(store, "append").mockImplementation(() => {
      throw Error("sink broke");
    });
    const target = { log: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const restore = installConsoleCapture(target, store);
    expect(() => target.error("still printed")).not.toThrow();
    expect(target.error).not.toBeUndefined();
    restore();
    expect(target.error).toHaveBeenCalledWith("still printed");
  });
});

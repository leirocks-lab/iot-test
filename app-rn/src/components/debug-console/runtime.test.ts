import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(async () => {}),
  fallback: vi.fn(),
  ignoreLogs: vi.fn(),
}));
vi.mock("expo-dev-client", () => ({ registerDevMenuItems: mocks.register }));
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  DevSettings: { addMenuItem: mocks.fallback },
  LogBox: { ignoreLogs: mocks.ignoreLogs },
}));

const host = globalThis as typeof globalThis & { __rowanDebugConsole?: unknown };
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete host.__rowanDebugConsole;
  vi.stubGlobal("__DEV__", true);
  vi.stubGlobal("console", {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete host.__rowanDebugConsole;
});

describe("development log console runtime", () => {
  it("filters HTTP diagnostic overlays once while retaining captured errors and unrelated LogBox errors", async () => {
    const originalError = console.error;
    const first = await import("./runtime");
    expect(mocks.ignoreLogs).toHaveBeenCalledTimes(1);
    const [patterns] = mocks.ignoreLogs.mock.calls[0] as unknown as [RegExp[]];
    const message =
      '[HTTP] ✕ [req-14] GET https://iot.test/products/prd_100/thing-model\n{"code":1050186001}';
    expect(patterns.some((pattern) => pattern.test(message))).toBe(true);
    for (const other of [
      "TypeError: undefined is not an object",
      "render failed",
      "[MQTT] failed",
    ]) {
      expect(patterns.some((pattern) => pattern.test(other))).toBe(false);
    }
    console.error(message);
    expect(first.logStore.getSnapshot().entries.at(-1)).toMatchObject({
      level: "error",
      text: expect.stringContaining("1050186001"),
    });
    expect(originalError).toHaveBeenCalledWith(message);
    vi.resetModules();
    await import("./runtime");
    expect(mocks.ignoreLogs).toHaveBeenCalledTimes(1);
  });

  it("registers the Expo menu once across reloads and restores the hidden entry", async () => {
    const first = await import("./runtime");
    await vi.waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
    first.logStore.hide();
    const items = mocks.register.mock.calls[0] as unknown as [
      { callback: () => void; shouldCollapse: boolean }[],
    ];
    expect(items[0][0].shouldCollapse).toBe(true);
    items[0][0].callback();
    expect(first.logStore.getSnapshot()).toMatchObject({ visible: true, open: false });
    vi.resetModules();
    const second = await import("./runtime");
    expect(second.logStore).toBe(first.logStore);
    console.info("single event");
    expect(second.logStore.getSnapshot().entries).toHaveLength(1);
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });

  it("does not install capture or menu registration in release mode", async () => {
    vi.stubGlobal("__DEV__", false);
    const original = console.info;
    const { logStore } = await import("./runtime");
    console.info("release output");
    expect(console.info).toBe(original);
    expect(logStore.getSnapshot().entries).toHaveLength(0);
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.ignoreLogs).not.toHaveBeenCalled();
  });

  it("falls back to the RN menu when the Expo menu is unavailable", async () => {
    mocks.register.mockRejectedValueOnce(Error("no menu"));
    await import("./runtime");
    await vi.waitFor(() =>
      expect(mocks.fallback).toHaveBeenCalledWith("显示日志控制台", expect.any(Function)),
    );
  });
});

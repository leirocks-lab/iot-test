import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ register: vi.fn(async () => {}), fallback: vi.fn() }));
vi.mock("expo-dev-client", () => ({ registerDevMenuItems: mocks.register }));
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  DevSettings: { addMenuItem: mocks.fallback },
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
  });

  it("falls back to the RN menu when the Expo menu is unavailable", async () => {
    mocks.register.mockRejectedValueOnce(Error("no menu"));
    await import("./runtime");
    await vi.waitFor(() =>
      expect(mocks.fallback).toHaveBeenCalledWith("显示日志控制台", expect.any(Function)),
    );
  });
});

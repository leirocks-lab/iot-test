import React from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Runtime } from "../services/runtime";
import { createConfiguredRuntime } from "../services/app-runtime";
import { AppProvider } from "./context";

// Replay Effect setup/cleanup while preserving hook state, as Fast Refresh does.
const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values))
      hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [
      hooks.values[index],
      (next: unknown) => {
        hooks.values[index] = typeof next === "function" ? next(hooks.values[index]) : next;
      },
    ];
  },
  useEffect: (setup: () => void | (() => void)) => {
    hooks.effects.push(setup);
  },
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
}));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));
vi.mock("react-native", () => ({
  AppState: { currentState: "active", addEventListener: () => ({ remove: () => {} }) },
  useColorScheme: () => "light",
}));
vi.mock("../services/app-runtime", () => ({ createConfiguredRuntime: vi.fn() }));

function render() {
  hooks.cursor = 0;
  hooks.effects = [];
  return AppProvider({ children: null }).props.value as { runtime: Runtime | null; error: string };
}
function fixture() {
  let closed = false;
  return {
    service: { session: null, onSessionChange: () => () => {} },
    dispose: vi.fn(() => {
      closed = true;
    }),
    createDeviceSession: () => {
      if (closed) throw new Error("App运行时已关闭");
      return { deviceID: "device-1" };
    },
  } as unknown as Runtime;
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  hooks.values = [];
  vi.mocked(createConfiguredRuntime).mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it("keeps the published runtime usable when startup Effects replay with preserved state", async () => {
  const runtime = fixture();
  vi.mocked(createConfiguredRuntime).mockResolvedValue(runtime);
  render();
  const startup = hooks.effects[0];
  const cleanup = startup();
  await vi.waitFor(() => expect(render().runtime).toBe(runtime));
  if (typeof cleanup === "function") cleanup();
  const replayCleanup = startup();
  expect(() => render().runtime!.createDeviceSession("device-1")).not.toThrow();
  await Promise.resolve();
  expect(runtime.dispose).not.toHaveBeenCalled();
  if (typeof replayCleanup === "function") replayCleanup();
  await vi.waitFor(() => expect(runtime.dispose).toHaveBeenCalledOnce());
});

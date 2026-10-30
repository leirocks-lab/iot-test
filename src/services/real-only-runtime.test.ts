import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryStorage, defaultSettings } from "../test-support/settings-fixture";
import { UnavailableDeviceTransport } from "../protocol/device";
import { createRuntime, type Runtime } from "./runtime";
import { createConfiguredRuntime } from "./app-runtime";
import { realSessionScope } from "./real-http";

vi.mock("./native-storage", () => ({ SessionStorage: MemoryStorage }));
vi.mock("../protocol/native-wifi", () => ({
  createWifiReader: () => ({
    read: async () => ({ connection: "unknown", source: "system", band: "unknown" }),
  }),
}));
const runtimes: Runtime[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
  vi.restoreAllMocks();
});
const config = {
  environment: "development",
  apiBaseUrl: "https://backend.example.test",
  tenantID: "42",
  httpLogLevel: "off" as const,
};
function driver() {
  return Object.assign(new UnavailableDeviceTransport(), { dispose: vi.fn() });
}

describe("real-only runtime resource boundaries", () => {
  it("never constructs a simulator, developer fault controls or an automatic deployment", async () => {
    const transport = driver(),
      runtime = await createRuntime(config, transport);
    runtimes.push(runtime);
    expect(runtime.devices).toBe(transport);
    expect(runtime).not.toHaveProperty("developer");
    expect(runtime.config).not.toHaveProperty("deviceMode");
    expect(runtime.integration.profile).toBeNull();
    expect(runtime.integration.capabilities.every((item) => item.source !== "provided")).toBe(
      false,
    );
    expect(runtime.integration.capabilities.find((item) => item.key === "realtime")?.source).toBe(
      "missing",
    );
    await expect(runtime.wifi!.read()).resolves.toMatchObject({
      connection: "unknown",
      source: "system",
    });
    runtime.dispose();
    runtime.dispose();
    expect(transport.dispose).toHaveBeenCalledOnce();
  });
  it("does not open a device connection or manufacture a snapshot without a realtime profile", async () => {
    const runtime = await createRuntime(config, driver());
    runtimes.push(runtime);
    runtime.service.session = {
      userID: "backend-user",
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
      expiresIn: 3600,
      tokenType: "bearer",
      setting: defaultSettings(),
    };
    vi.spyOn(runtime.service, "device").mockResolvedValue({
      deviceNickname: "Actual",
      bindingRole: "sa",
      bindingAt: "",
      device: { id: "actual-device" },
      product: { id: "actual-product" },
    });
    vi.spyOn(runtime.service, "model").mockResolvedValue({
      version: "actual-model",
      attributes: [],
      services: [],
      events: [],
    });
    const session = runtime.createDeviceSession("actual-device");
    await expect(session.connect()).rejects.toThrow();
    expect(session.ready).toBe(false);
    expect(session.confirmed).toEqual({});
    session.close();
  });
  it("recognizes the App first-binding device code without a deployment share parser", async () => {
    const runtime = await createRuntime(config, driver());
    runtimes.push(runtime);
    runtime.service.session = {
      userID: "backend-user",
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
      expiresIn: 3600,
      tokenType: "bearer",
      setting: defaultSettings(),
    };
    const flow = runtime.scanner.acquire();
    flow.read([JSON.stringify({ type: "rowan.device", v: 1, deviceId: "dev_1900000000000004", productId: "LF-WM05" })]);
    expect(flow.state).toMatchObject({
      phase: "choosing",
      selected: 0,
      choices: [{ type: "device", label: "dev_1900000000000004" }],
    });
    expect(runtime.integration.capabilities.find((item) => item.key === "qr")?.source).toBe(
      "native",
    );
  });
  it("isolates actual API/tenant namespaces", () => {
    const scope = realSessionScope(config);
    expect(realSessionScope({ ...config, tenantID: "43" })).not.toBe(scope);
    expect(
      realSessionScope({ ...config, iotApiBaseUrl: "https://other.example.test/iot" }),
    ).not.toBe(scope);
  });
  it("cancellation disposes a late native adapter exactly once without delivering a runtime", async () => {
    const transport = driver(),
      controller = new AbortController();
    let resolve!: (value: typeof transport) => void;
    const factory = vi.fn(
        () =>
          new Promise<typeof transport>((done) => {
            resolve = done;
          }),
      ),
      create = vi.fn();
    const pending = createConfiguredRuntime(
      { ...config, integrationProfile: "fixture-native" },
      {
        signal: controller.signal,
        create,
        registry: {
          "fixture-native": {
            environments: ["development"],
            create: () => ({ contracts: {}, createDeviceDriver: factory }),
          },
        },
      },
    );
    const rejected = expect(pending).rejects.toMatchObject({ code: 499 });
    await vi.waitFor(() => expect(factory).toHaveBeenCalledOnce());
    controller.abort();
    await rejected;
    resolve(transport);
    await vi.waitFor(() => expect(transport.dispose).toHaveBeenCalledOnce());
    expect(create).not.toHaveBeenCalled();
  });
});

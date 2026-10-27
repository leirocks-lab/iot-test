import { afterEach, describe, expect, it, vi } from "vitest";
import { createConfiguredRuntime } from "./app-runtime";
import type { Runtime, RuntimeContracts } from "./runtime";
import {
  integrationStatus,
  registeredIntegration,
  type IntegrationRegistry,
} from "./runtime-integration";
import { communicationConfig } from "./config";
import { deploymentIntegrations } from "../config/deployment-integrations";
import { UnavailableDeviceTransport } from "../protocol/device";
import type { DeviceProfileResolver } from "../protocol/device-session";
import type { MqttPort } from "../protocol/mqtt-connection";
import { defaultSettings } from "../test-support/settings-fixture";

vi.mock("./native-storage", async () => {
  const { MemoryStorage } = await import("../test-support/settings-fixture");
  return { SessionStorage: MemoryStorage };
});
const testPorts = vi.hoisted(() => ({ ports: [] as MqttPort[] }));
vi.mock("../protocol/mqtt-browser", async () => {
  const { MqttConnection } = await import("../protocol/mqtt-connection");
  return {
    createMqttConnection: () =>
      new MqttConnection(() => {
        let message: (topic: string, value: Uint8Array) => void = () => undefined;
        const connected: (() => void)[] = [];
        const port: MqttPort = {
          on: (name, fn) => {
            if (name === "connect") connected.push(fn);
          },
          onMessage: (fn) => {
            message = fn;
          },
          subscribe: vi.fn((_topic, done) => done()),
          unsubscribe: vi.fn(),
          end: vi.fn(),
          publish: vi.fn((_topic, value, done) => {
            done();
            queueMicrotask(() =>
              message(
                "fixture/state",
                new TextEncoder().encode(
                  JSON.stringify({
                    kind: "full",
                    version: 1,
                    requestID: new TextDecoder().decode(value),
                    reported: { Power: 0, CleanHours: 120 },
                  }),
                ),
              ),
            );
          }),
        };
        testPorts.ports.push(port);
        queueMicrotask(() => connected.forEach((fn) => fn()));
        return port;
      }, 100),
  };
});
const config = communicationConfig({
  environment: "development",
  apiBaseUrl: "https://api.example.test",
  tenantID: "42",
  integrationProfile: "fixture-v1",
});
const qr: RuntimeContracts["qr"] = () => ({ type: "product", productID: "fixture-product" });
const realtime: DeviceProfileResolver = async () => ({
  topics: ["fixture/state"],
  canWrite: false,
  query: (id) => ({ topic: "fixture/query", payload: new TextEncoder().encode(id) }),
  decode: (_topic, value) => JSON.parse(new TextDecoder().decode(value)),
});
const contracts: RuntimeContracts = {
  qr,
  realtime,
  wifi: {
    read: async () => ({ connection: "wifi", source: "system", band: "unknown", ssid: "fixture" }),
  },
  onboarding: {
    profile: { factoryReply: new Uint8Array([1]), stageTimeout: 10000 },
    makeBindCode: async () => "public-fixture",
    validatePassword: () => undefined,
    deviceToken: () => "public-fixture",
    bindingTimeout: 10000,
    operationTimeout: 10000,
  },
  controls: async () => ({ bindings: {} }),
  maintenance: async () => null,
  events: async () => ({ definitions: [] }),
};
const registry = (value: RuntimeContracts = contracts): IntegrationRegistry => ({
  "fixture-v1": { environments: ["development"], create: () => ({ contracts: value }) },
});
const runtimes: Runtime[] = [];
afterEach(() => {
  runtimes.splice(0).forEach((runtime) => runtime.dispose());
  testPorts.ports.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("P1 App启动装配", () => {
  it("reuses one device session across consumers and closes only on unbind or runtime disposal", async () => {
    const runtime = await createConfiguredRuntime(config, { registry: registry() });
    runtimes.push(runtime);
    runtime.service.session = {
      userID: "pool-owner",
      accessToken: "fixture",
      refreshToken: "fixture",
      expiresIn: 3600,
      tokenType: "bearer",
      setting: defaultSettings(),
    };
    vi.spyOn(runtime.service, "device").mockResolvedValue({
      deviceNickname: "fixture",
      bindingRole: "sa",
      bindingAt: "",
      device: { id: "pool-device" },
      product: { id: "pool-product" },
    });
    vi.spyOn(runtime.service, "model").mockResolvedValue({
      version: "1",
      attributes: [],
      services: [],
      events: [],
    });
    const issued = vi.spyOn(runtime.service, "mqtt").mockResolvedValue({
      host: "wss://broker.example.test/mqtt",
      endpoint: "broker.example.test",
      path: "/mqtt",
      clientID: "issued",
      username: "fixture",
      password: "fixture",
      deviceID: "pool-device",
    });
    const first = runtime.createDeviceSession("pool-device"),
      second = runtime.createDeviceSession("pool-device");
    expect(first).toBe(second);
    const controller = new AbortController();
    const one = first.connect(controller.signal),
      two = second.connect();
    const cancelled = expect(one).rejects.toMatchObject({ code: 499 });
    controller.abort();
    await cancelled;
    await two;
    await runtime.createDeviceSession("pool-device").connect();
    expect(issued).toHaveBeenCalledTimes(1);
    expect(testPorts.ports).toHaveLength(1);
    const port = testPorts.ports[0];
    expect(port.subscribe).toHaveBeenCalledTimes(1);
    expect(port.publish).toHaveBeenCalledTimes(1);
    const stop = first.onChange(() => {});
    stop();
    runtime.setForeground?.(false);
    runtime.setForeground?.(true);
    expect(port.end).not.toHaveBeenCalled();
    expect(runtime.releaseDevice("pool-device", "wrong-owner", 0)).toBe(false);
    expect(
      runtime.releaseDevice("pool-device", runtime.service.userID, runtime.service.sessionRevision),
    ).toBe(true);
    expect(port.end).toHaveBeenCalledTimes(1);
    const replacement = runtime.createDeviceSession("pool-device");
    expect(replacement).not.toBe(first);
    await replacement.connect();
    const login = runtime.service.session!;
    await runtime.service.clearLocal();
    expect(testPorts.ports[1].end).toHaveBeenCalledTimes(1);
    expect(replacement.ready).toBe(false);
    runtime.service.session = { ...login, userID: "new-owner" };
    const newOwner = runtime.createDeviceSession("pool-device");
    expect(newOwner).not.toBe(replacement);
    await newOwner.connect();
    runtime.dispose();
    expect(testPorts.ports[2].end).toHaveBeenCalledTimes(1);
    await expect(replacement.connect()).rejects.toMatchObject({ code: 499 });
  });
  it("does not reuse sessions across a changed login generation even before a session notification", async () => {
    const runtime = await createConfiguredRuntime(config, { registry: registry() });
    runtimes.push(runtime);
    runtime.service.session = {
      userID: "pool-owner",
      accessToken: "fixture",
      refreshToken: "fixture",
      expiresIn: 3600,
      tokenType: "bearer",
      setting: defaultSettings(),
    };
    const first = runtime.createDeviceSession("pool-device");
    runtime.service.cancelAuthentication();
    expect(runtime.createDeviceSession("pool-device")).not.toBe(first);
    await expect(first.connect()).rejects.toMatchObject({ code: 499 });
  });
  it("registers the dual BLE development contract with optional binding code and empty 8F payload", () => {
    const selected = registeredIntegration(
      { ...config, integrationProfile: "rowan-ble-dual" },
      deploymentIntegrations,
    );
    expect(selected.contracts.onboarding).toMatchObject({
      profile: { stageTimeout: 120000 },
      bindingTimeout: 60000,
      operationTimeout: 240000,
    });
    expect(selected.contracts.onboarding?.profile?.factoryReply).toEqual(new Uint8Array());
    expect(selected.contracts.onboarding?.makeBindCode).toBeUndefined();
    expect(selected.contracts.onboarding?.deviceToken("public-access-token")).toBe(
      "public-access-token",
    );
  });
  it("passes all seven reviewed ports to the runtime factory without reading executable extra", async () => {
    const fake = { dispose: vi.fn() } as unknown as Runtime,
      create = vi.fn(async () => fake);
    await createConfiguredRuntime(
      {
        ...config,
        qr: () => {
          throw new Error("untrusted extra");
        },
      } as typeof config,
      { registry: registry(), create },
    );
    const passed = (
      create.mock.calls[0] as unknown as [typeof config, undefined, RuntimeContracts]
    )[2];
    expect(passed).toMatchObject(contracts);
    expect(passed.qr).toBe(qr);
    expect(passed.onboarding!.profile!.factoryReply).not.toBe(
      contracts.onboarding!.profile!.factoryReply,
    );
  });
  it("selects only the named profile and rejects inherited/unknown names without executing a factory", async () => {
    const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
    await expect(
      createConfiguredRuntime(
        { ...config, integrationProfile: "constructor" },
        { registry: registry(), create },
      ),
    ).rejects.toThrow("尚未注册");
    expect(create).not.toHaveBeenCalled();
  });
  it("can start partial real configuration without manufacturing missing contracts", async () => {
    const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
    await createConfiguredRuntime({ ...config, integrationProfile: undefined }, { create });
    expect(create.mock.calls[0].slice(0, 3)).toEqual([
      communicationConfig({ ...config, integrationProfile: undefined }),
      undefined,
      {},
    ]);
    const status = integrationStatus(config, { wifi: contracts.wifi });
    expect(
      status.capabilities.filter((item) => item.source === "missing").map((item) => item.key),
    ).toEqual(["qr", "onboarding", "realtime", "controls", "maintenance", "events"]);
  });
  it("factory failure is retained and never invokes a fallback runtime or profile", async () => {
    const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
    await expect(
      createConfiguredRuntime(config, {
        registry: {
          "fixture-v1": {
            environments: ["development"],
            create: () => {
              throw new Error("Reviewed adapter failed");
            },
          },
        },
        create,
      }),
    ).rejects.toThrow("Reviewed adapter failed");
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects an environment mismatch before assembly or driver creation", async () => {
    const assemble = vi.fn();
    await expect(
      createConfiguredRuntime(
        { ...config, environment: "production" },
        { registry: { "fixture-v1": { environments: ["development"], create: assemble } } },
      ),
    ).rejects.toThrow("不适用");
    expect(assemble).not.toHaveBeenCalled();
  });
  it.each(["https://profile.invalid", "../profile", "", "Uppercase", 3, null])(
    "validates public selector %j",
    async (value) => {
      const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
      if (value === "") {
        await createConfiguredRuntime({ ...config, integrationProfile: value }, { create });
        expect(create).toHaveBeenCalledOnce();
      } else {
        await expect(
          createConfiguredRuntime({ ...config, integrationProfile: value } as typeof config, {
            create,
          }),
        ).rejects.toThrow("ROWAN_INTEGRATION_PROFILE");
        expect(create).not.toHaveBeenCalled();
      }
    },
  );
  it.each([{ qr: 1 }, { wifi: {} }, { onboarding: {} }])(
    "rejects malformed selected business ports before runtime work %j",
    async (value) => {
      const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
      await expect(
        createConfiguredRuntime(config, { registry: registry(value as RuntimeContracts), create }),
      ).rejects.toThrow(/无效|不完整/);
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("assembles a reviewed real profile without an additional password validator", async () => {
    const onboarding = { ...contracts.onboarding! };
    delete onboarding.validatePassword;
    const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
    await createConfiguredRuntime(config, {
      registry: registry({ ...contracts, onboarding }),
      create,
    });
    const passed = (
      create.mock.calls[0] as unknown as [typeof config, undefined, RuntimeContracts]
    )[2];
    expect(passed.onboarding?.validatePassword).toBeUndefined();
    expect(passed.onboarding?.makeBindCode).toBe(onboarding.makeBindCode);
  });
  it.each([null, 42, "invalid"])(
    "rejects an explicitly malformed password validator %j",
    async (validatePassword) => {
      const create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
      await expect(
        createConfiguredRuntime(config, {
          registry: registry({
            ...contracts,
            onboarding: { ...contracts.onboarding!, validatePassword: validatePassword as never },
          }),
          create,
        }),
      ).rejects.toThrow("契约不完整");
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("rejects asynchronous factory declarations before runtime construction", () => {
    expect(() =>
      registeredIntegration(config, {
        "fixture-v1": {
          environments: ["development"],
          create: (() =>
            Promise.resolve({ contracts })) as unknown as IntegrationRegistry[string]["create"],
        },
      }),
    ).toThrow("无效声明");
  });
  it("aborted-before-start does not assemble or create resources", async () => {
    const controller = new AbortController();
    controller.abort();
    const assemble = vi.fn();
    await expect(
      createConfiguredRuntime(config, {
        signal: controller.signal,
        registry: { "fixture-v1": { environments: ["development"], create: assemble } },
      }),
    ).rejects.toMatchObject({ code: 499 });
    expect(assemble).not.toHaveBeenCalled();
  });
  it("cancellation during runtime creation never delivers late state and disposes its resources", async () => {
    let complete: (runtime: Runtime) => void = () => undefined;
    const controller = new AbortController(),
      dispose = vi.fn(),
      create = vi.fn(
        () =>
          new Promise<Runtime>((resolve) => {
            complete = resolve;
          }),
      );
    const pending = createConfiguredRuntime(config, {
        signal: controller.signal,
        registry: registry(),
        create,
      }),
      cancelled = expect(pending).rejects.toMatchObject({ code: 499 });
    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
    controller.abort();
    await cancelled;
    complete({ dispose } as unknown as Runtime);
    await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
  });
  it("rejects an invalid declared driver instead of silently falling back to the native driver", async () => {
    const dispose = vi.fn(),
      create = vi.fn(async () => ({ dispose: vi.fn() }) as unknown as Runtime);
    await expect(
      createConfiguredRuntime(config, {
        create,
        registry: {
          "fixture-v1": {
            environments: ["development"],
            create: () => ({
              contracts,
              createDeviceDriver: async () =>
                ({ dispose }) as unknown as UnavailableDeviceTransport,
            }),
          },
        },
      }),
    ).rejects.toThrow("无效端口");
    expect(create).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledOnce();
  });
  it("does not report an optional missing tenant as a local blocker or embed connection secrets", () => {
    const status = integrationStatus({ ...config, tenantID: undefined }, contracts, true);
    expect(status.configurationIssues).not.toContain("测试租户尚未提供，真实接口请求不可用");
    expect(JSON.stringify(status)).not.toMatch(/api\.example|public-fixture|factoryReply|tenantID/);
    expect(status.capabilities.filter((item) => item.source === "provided")).toHaveLength(8);
  });
  it("invalid async assembly reports a configuration failure without leaking an unhandled rejection", async () => {
    await expect(
      createConfiguredRuntime(config, {
        registry: {
          "fixture-v1": {
            environments: ["development"],
            create: (async () => {
              throw new Error("unsupported async assembly");
            }) as unknown as IntegrationRegistry[string]["create"],
          },
        },
      }),
    ).rejects.toThrow("无效声明");
    await Promise.resolve();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntime, type Runtime } from "./runtime";
vi.mock("./native-storage", async () => {
  const { MemoryStorage } = await import("./store");
  return { SessionStorage: MemoryStorage, MockFileStorage: MemoryStorage };
});

const runtimes: Runtime[] = [];

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});

describe("RF-0046 单设备运行时清理", () => {
  it("closes only the unbound device and invalidates its old session lease", async () => {
    const runtime = await createRuntime({ httpMode: "mock", deviceMode: "mock" });
    runtimes.push(runtime);
    await runtime.service.login("rowan@example.com", "Rowan@123", "password");

    const devices = runtime.developer!.http.db.state.devices;
    const secondDevice = structuredClone(devices[0]);
    secondDevice.id = "dev_second";
    secondDevice.thingName = "dev_second";
    devices.push(secondDevice);

    const first = runtime.createDeviceSession("dev_wine");
    const second = runtime.createDeviceSession("dev_second");
    await first.connect();
    await second.connect();
    expect(first.ready).toBe(true);
    expect(second.ready).toBe(true);
    const oldLedger = first.maintenance?.ledger;

    const owner = runtime.service.userID;
    const revision = runtime.service.sessionRevision;
    expect(runtime.releaseDevice("dev_wine", "other-account", revision)).toBe(
      false,
    );
    expect(first.ready).toBe(true);
    expect(runtime.releaseDevice("dev_wine", owner, revision)).toBe(true);
    expect(first.ready).toBe(false);
    expect(second.ready).toBe(true);
    await expect(first.connect()).rejects.toMatchObject({ code: 499 });

    const replacement = runtime.createDeviceSession("dev_wine");
    await replacement.connect();
    expect(replacement.maintenance?.ledger).not.toBe(oldLedger);
    expect(second.ready).toBe(true);

  });

  it("does not apply an old account result after a session revision", async () => {
    const runtime = await createRuntime({ httpMode: "mock", deviceMode: "mock" });
    runtimes.push(runtime);
    await runtime.service.login("rowan@example.com", "Rowan@123", "password");
    const owner = runtime.service.userID;
    const oldRevision = runtime.service.sessionRevision;

    await runtime.service.login("rowan@example.com", "Rowan@123", "password");
    const current = runtime.createDeviceSession("dev_wine");
    await current.connect();
    expect(runtime.releaseDevice("dev_wine", owner, oldRevision)).toBe(false);
    expect(current.ready).toBe(true);
  });
});

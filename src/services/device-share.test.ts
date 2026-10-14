import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceShareFlow } from "./device-share";
import { ApiError, type ShareBinding } from "./models";
import { MockHttpClient } from "./http";
import { RowanService } from "./rowan";
import { MemoryStorage, MockDatabase } from "./store";

async function setup() {
  const db = await MockDatabase.open(new MemoryStorage());
  const service = new RowanService(new MockHttpClient(db), new MemoryStorage());
  await service.login("rowan@example.com", "Rowan@123", "password");
  return { db, service };
}

afterEach(() => vi.restoreAllMocks());

describe("设备分享生命周期", () => {
  it("loads one mock QR on entry and hides it at the server expiry", async () => {
    const { db, service } = await setup();
    let now = Date.now();
    const flow = new DeviceShareFlow(service, "dev_wine", "mock", 10000, () => now);
    const share = vi.spyOn(service, "share");

    flow.start();
    await vi.waitFor(() => expect(flow.state.phase).toBe("ready"));
    expect(share).toHaveBeenCalledOnce();
    expect(flow.state.qrValue).toContain("rowan-mock-v1");
    const firstCode = flow.state.qrValue;
    const firstExpiry = flow.state.expiresAt!;
    expect(Date.parse(firstExpiry) - now).toBeGreaterThan(0);

    await flow.refresh();
    expect(flow.state.phase).toBe("ready");
    expect(flow.state.qrValue).not.toBe(firstCode);
    expect(Object.keys(db.state.shares)).toHaveLength(2);

    now = Date.parse(flow.state.expiresAt!);
    flow.tick();
    expect(flow.state.phase).toBe("expired");
    expect(flow.state.qrValue).toBeUndefined();
    flow.stop();
  });

  it("blocks a direct non-admin route before SHARE-01", async () => {
    const { db, service } = await setup();
    db.state.devices[0].members[service.userID].role = "mbr";
    const share = vi.spyOn(service, "share");
    const flow = new DeviceShareFlow(service, "dev_wine", "mock");

    flow.start();
    await vi.waitFor(() => expect(flow.state.phase).toBe("blocked"));
    expect(share).not.toHaveBeenCalled();
    expect(flow.state.qrValue).toBeUndefined();
    flow.stop();
  });

  it("adapts the real response but never exposes a mock QR", async () => {
    const { service } = await setup();
    const flow = new DeviceShareFlow(service, "dev_wine", "real");

    flow.start();
    await vi.waitFor(() => expect(flow.state.phase).toBe("unsupported"));
    expect(flow.state.qrValue).toBeUndefined();
    expect(flow.state.expiresAt).toBeDefined();
    flow.stop();
  });

  it("clears old QR before refresh errors and ignores late responses after leaving", async () => {
    const { service } = await setup();
    const flow = new DeviceShareFlow(service, "dev_wine", "mock");
    flow.start();
    await vi.waitFor(() => expect(flow.state.phase).toBe("ready"));
    vi.spyOn(service, "share").mockRejectedValueOnce(new ApiError(1462, "无权限"));
    await flow.refresh();
    expect(flow.state.phase).toBe("blocked");
    expect(flow.state.qrValue).toBeUndefined();

    let resolve!: (value: ShareBinding) => void;
    vi.spyOn(service, "share").mockImplementationOnce(
      () => new Promise((done) => { resolve = done; }),
    );
    flow.start();
    await vi.waitFor(() => expect(resolve).toBeTypeOf("function"));
    flow.stop();
    resolve({
      deviceID: "dev_wine",
      bindCode: "late_code",
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });
    await Promise.resolve();
    expect(flow.state.phase).toBe("idle");
    expect(flow.state.qrValue).toBeUndefined();
  });

  it("drops a pending response when the account session changes", async () => {
    const { service } = await setup();
    let resolve!: (value: ShareBinding) => void;
    vi.spyOn(service, "share").mockImplementation(
      () => new Promise((done) => { resolve = done; }),
    );
    const flow = new DeviceShareFlow(service, "dev_wine", "mock");
    flow.start();
    await vi.waitFor(() => expect(resolve).toBeTypeOf("function"));
    await service.login("rowan@example.com", "Rowan@123", "password");
    resolve({
      deviceID: "dev_wine",
      bindCode: "old_session_code",
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });
    await Promise.resolve();
    expect(flow.state.qrValue).toBeUndefined();
    expect(flow.state.phase).toBe("blocked");
  });
});

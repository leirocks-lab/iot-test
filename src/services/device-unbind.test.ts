import { afterEach, describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest, HttpResponse } from "../lib/core";
import { DeviceUnbindFlow } from "./device-unbind";
import type { HttpFetcher } from "./http";
import type { HomeGroup } from "./models";
import { RealHttpClient } from "./real-http";
import { RowanService } from "./rowan";
import {  defaultSettings, MemoryStorage, SettingsFixture , SettingsHttp } from '../test-support/settings-fixture';

const flows: DeviceUnbindFlow[] = [];

afterEach(() => {
  for (const flow of flows.splice(0)) flow.stop();
  vi.restoreAllMocks();
});

async function setup(deviceID = "dev_wine") {
  const db = await SettingsFixture.open(new MemoryStorage());
  const http = new SettingsHttp(db);
  const service = new RowanService(http, new MemoryStorage());
  await service.login("rowan@example.com", "Rowan@123", "password");
  const release = vi.fn(() => true);
  const flow = new DeviceUnbindFlow(service, deviceID, release);
  flow.start();
  flows.push(flow);
  return { db, http, service, release, flow };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("RF-0046 本人解绑", () => {
  it("submits one DELETE and only completes after an explicit success", async () => {
    const { db, service, release, flow } = await setup();
    db.state.devices[0].members.user_member = {
      role: "mbr",
      nickname: "Member",
      roomID: null,
    };
    const remove = vi.spyOn(service, "unbind");

    const first = flow.submit();
    expect(await flow.submit()).toBe(false);
    expect(await first).toBe(true);
    expect(remove).toHaveBeenCalledOnce();
    expect(db.state.devices[0].members.user_demo).toBeUndefined();
    expect(db.state.devices[0].members.user_member).toBeDefined();
    expect(release).toHaveBeenCalledWith(
      "dev_wine",
      "user_demo",
      service.sessionRevision,
    );
    expect(flow.state.phase).toBe("complete");
  });

  it("reads HOME-01 after a committed response is lost, without repeating DELETE", async () => {
    const { service, release, flow } = await setup();
    const original = service.unbind.bind(service);
    const remove = vi.spyOn(service, "unbind").mockImplementation(async (id, signal) => {
      await original(id, signal);
      throw new Error("response lost");
    });
    const home = vi.spyOn(service, "home");

    expect(await flow.submit()).toBe(true);
    expect(remove).toHaveBeenCalledOnce();
    expect(home).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it("keeps an unknown result when the device remains or the read-back fails", async () => {
    const { service, release, flow } = await setup();
    const remove = vi
      .spyOn(service, "unbind")
      .mockRejectedValue(new Error("response lost"));
    const home = vi.spyOn(service, "home");

    expect(await flow.submit()).toBe(false);
    expect(flow.state.phase).toBe("unknown");
    expect(flow.state.error).toContain("仍显示该设备");
    home.mockRejectedValueOnce(new Error("offline"));
    expect(await flow.reconcile()).toBe(false);
    expect(flow.state.error).toContain("首页读取失败");
    expect(remove).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
  });

  it("rejects malformed HOME-01 rather than treating it as absence", async () => {
    const { service, release, flow } = await setup();
    vi.spyOn(service, "unbind").mockRejectedValue(new Error("lost"));
    vi.spyOn(service, "home").mockResolvedValue({} as HomeGroup[]);

    expect(await flow.submit()).toBe(false);
    expect(flow.state.phase).toBe("unknown");
    expect(flow.state.error).toContain("无法辨识");
    expect(release).not.toHaveBeenCalled();
  });

  it("keeps 1361 and 1362 as failures and refreshes the relationship", async () => {
    const missing = await setup("missing-device");
    const readMissing = vi.spyOn(missing.service, "home");
    expect(await missing.flow.submit()).toBe(false);
    expect(missing.flow.state.phase).toBe("failed");
    expect(missing.flow.state.error).toContain("设备不存在");
    expect(readMissing).toHaveBeenCalledOnce();
    expect(missing.release).not.toHaveBeenCalled();

    const unbound = await setup();
    delete unbound.db.state.devices[0].members.user_demo;
    const readUnbound = vi.spyOn(unbound.service, "home");
    expect(await unbound.flow.submit()).toBe(false);
    expect(unbound.flow.state.phase).toBe("failed");
    expect(unbound.flow.state.error).toContain("没有绑定");
    expect(readUnbound).toHaveBeenCalledOnce();
    expect(unbound.release).not.toHaveBeenCalled();
  });

  it("discards a late DELETE result after the account session changes", async () => {
    const { service, release, flow } = await setup();
    const pending = deferred<void>();
    vi.spyOn(service, "unbind").mockImplementation(() => pending.promise);

    const submission = flow.submit();
    await service.login("rowan@example.com", "Rowan@123", "password");
    pending.resolve();
    expect(await submission).toBe(false);
    expect(release).not.toHaveBeenCalled();
    expect(flow.state.phase).toBe("idle");
  });

  it("keeps an interrupted request pending across the same-page focus cycle", async () => {
    const { service, release, flow } = await setup();
    const pending = deferred<void>();
    const remove = vi
      .spyOn(service, "unbind")
      .mockImplementation(() => pending.promise);

    const submission = flow.submit();
    flow.stop();
    expect(await submission).toBe(false);
    expect(flow.state.phase).toBe("unknown");
    flow.start();
    expect(await flow.reconcile()).toBe(false);
    expect(flow.state.phase).toBe("unknown");
    expect(remove).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    pending.resolve();
  });

  it("does not replay MORE-02 on 401 and encodes a device ID in real mode", async () => {
    const calls: HttpRequest[] = [];
    const unauthorized: HttpClient = {
      request: async <T>(request: HttpRequest): Promise<HttpResponse<T>> => {
        calls.push(request);
        return {
          status: 401,
          headers: {},
          data: {
            code: 401,
            message: "expired",
            success: false,
            data: null,
          } as T,
        };
      },
    };
    const service = new RowanService(unauthorized, new MemoryStorage());
    service.session = {
      accessToken: "fixture",
      refreshToken: "fixture",
      expiresIn: 3600,
      tokenType: "Bearer",
      userID: "account-a",
      setting: defaultSettings(),
    };
    await expect(service.unbind("dev/a")).rejects.toMatchObject({ code: 401 });
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe("/api/app/devices/dev%2Fa/users/self");

    const fetcher = vi.fn<HttpFetcher>().mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, success: true, message: "ok", data: null }),
        { status: 200 },
      ),
    );
    const real = new RealHttpClient(
      {
        apiBaseUrl: "https://platform.example.test",
        iotApiBaseUrl: "https://iot.example.test/module",
        tenantID: "42",
      },
      fetcher,
    );
    const realService = new RowanService(real, new MemoryStorage());
    realService.session = service.session;
    const signal = new AbortController().signal;
    await realService.unbind("dev/a", signal);
    expect(fetcher).toHaveBeenCalledWith(
      "https://iot.example.test/module/app-api/devices/dev%2Fa/users/self",
      expect.objectContaining({
        method: "DELETE",
        signal,
        headers: expect.objectContaining({
          Authorization: "Bearer fixture",
          "tenant-id": "42",
        }),
      }),
    );
  });
});

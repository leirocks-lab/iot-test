import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceSettingsFlow } from "./device-settings";
import type { HttpFetcher } from "./http";

import { ApiError } from "./models";
import { deviceMembers } from "./real-api-data";
import { RealHttpClient } from "./real-http";
import { RowanService } from "./rowan";
import {  MemoryStorage, SettingsFixture, defaultSettings , SettingsHttp } from '../test-support/settings-fixture';

const flows: DeviceSettingsFlow[] = [];

afterEach(() => {
  for (const flow of flows.splice(0)) flow.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function setup() {
  const db = await SettingsFixture.open(new MemoryStorage());
  db.state.devices[0].members.user_member = {
    role: "mbr",
    nickname: "Member device name",
    roomID: null,
  };
  db.state.devices[0].members.user_observer = {
    role: "obs",
    nickname: "Observer device name",
    roomID: null,
  };
  const service = new RowanService(new SettingsHttp(db), new MemoryStorage());
  await service.login("rowan@example.com", "Rowan@123", "password");
  const flow = new DeviceSettingsFlow(service, "dev_wine");
  flows.push(flow);
  await flow.start();
  return { db, service, flow };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("RF-0041 成员管理", () => {
  it("uses a supplied nickname while discarding raw contact fields", () => {
    expect(
      deviceMembers([
        {
          userID: "user_alice",
          bindingRole: "mbr",
          nickname: "Alice",
          email: "alice@example.test",
          mobile: "13800000000",
        },
      ]),
    ).toEqual([
      { userID: "user_alice", bindingRole: "mbr", nickname: "Alice" },
    ]);
  });

  it("keeps bindings with missing summaries, counts only ordinary members and removes one after read-back", async () => {
    const { service, flow } = await setup();
    expect(flow.state.members.value).toEqual([
      { userID: "user_demo", nickname: null, bindingRole: "sa" },
      { userID: "user_member", nickname: null, bindingRole: "mbr" },
      { userID: "user_observer", nickname: null, bindingRole: "obs" },
    ]);
    expect(
      flow.state.members.value?.filter(
        (member) => member.bindingRole === "mbr",
      ),
    ).toHaveLength(1);

    const remove = vi.spyOn(service, "removeMember");
    await flow.removeMember("user_member");
    expect(remove).toHaveBeenCalledOnce();
    expect(flow.state.memberRemoval.phase).toBe("removed");
    expect(flow.state.members.value?.map((member) => member.userID)).toEqual([
      "user_demo",
      "user_observer",
    ]);
  });

  it("does not allow a member, observer target or administrator target to be removed", async () => {
    const { db, service, flow } = await setup();
    const remove = vi.spyOn(service, "removeMember");
    await flow.removeMember("user_observer");
    await flow.removeMember("user_demo");
    expect(remove).not.toHaveBeenCalled();

    db.state.devices[0].members.user_demo.role = "mbr";
    await flow.loadDevice();
    await flow.removeMember("user_member");
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps the target after 1373 and refreshes the relationship", async () => {
    const { service, flow } = await setup();
    vi.spyOn(service, "removeMember").mockRejectedValueOnce(
      new ApiError(1373, "该用户没有绑定这台设备"),
    );
    const read = vi.spyOn(service, "members");
    await flow.removeMember("user_member");
    expect(flow.state.memberRemoval.phase).toBe("idle");
    expect(flow.state.memberRemoval.error).toContain("没有绑定");
    expect(
      flow.state.members.value?.some(
        (member) => member.userID === "user_member",
      ),
    ).toBe(true);
    expect(read).toHaveBeenCalledOnce();
  });

  it("refreshes the current role after a 1372 permission change", async () => {
    const { db, service, flow } = await setup();
    db.state.devices[0].members.user_demo.role = "mbr";
    await flow.removeMember("user_member");
    expect(flow.state.memberRemoval.phase).toBe("idle");
    expect(flow.state.memberRemoval.error).toContain("管理员");
    expect(flow.state.device.value?.bindingRole).toBe("mbr");
    expect(
      flow.state.members.value?.some(
        (member) => member.userID === "user_member",
      ),
    ).toBe(true);
    const remove = vi.spyOn(service, "removeMember");
    await flow.removeMember("user_member");
    expect(remove).not.toHaveBeenCalled();
  });

  it("uses MORE-01 and MORE-03 specific missing-device and binding codes", async () => {
    const { db, service } = await setup();
    await expect(service.members("missing")).rejects.toMatchObject({
      code: 1351,
    });
    await expect(
      service.removeMember("missing", "user_member"),
    ).rejects.toMatchObject({ code: 1371 });
    delete db.state.devices[0].members.user_demo;
    await expect(service.members("dev_wine")).rejects.toMatchObject({
      code: 1352,
    });
    await expect(
      service.removeMember("dev_wine", "user_member"),
    ).rejects.toMatchObject({ code: 1372 });
  });

  it("reconciles a committed removal whose response was lost without sending it again", async () => {
    const { service, flow } = await setup();
    const original = service.removeMember.bind(service);
    const remove = vi
      .spyOn(service, "removeMember")
      .mockImplementationOnce(async (...args) => {
        await original(...args);
        throw new Error("response lost");
      });
    await flow.removeMember("user_member");
    expect(flow.state.memberRemoval.phase).toBe("removed");
    expect(
      flow.state.members.value?.some(
        (member) => member.userID === "user_member",
      ),
    ).toBe(false);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("keeps an unknown removal pending while the target remains, without retransmission", async () => {
    const { service, flow } = await setup();
    const remove = vi
      .spyOn(service, "removeMember")
      .mockRejectedValueOnce(new Error("response lost"));
    await flow.removeMember("user_member");
    expect(flow.state.memberRemoval.phase).toBe("unknown");
    expect(
      flow.state.members.value?.some(
        (member) => member.userID === "user_member",
      ),
    ).toBe(true);
    await flow.removeMember("user_member");
    await flow.reconcileMember();
    expect(remove).toHaveBeenCalledOnce();
    expect(flow.state.memberRemoval.phase).toBe("unknown");
  });

  it("bounds a stalled DELETE, aborts it and reads back before any retry", async () => {
    const { service, flow } = await setup();
    const remove = vi
      .spyOn(service, "removeMember")
      .mockReturnValueOnce(new Promise(() => undefined));
    vi.useFakeTimers();
    const saving = flow.removeMember("user_member");
    await vi.advanceTimersByTimeAsync(10000);
    await saving;
    expect(remove.mock.calls[0][2]?.aborted).toBe(true);
    expect(flow.state.memberRemoval.phase).toBe("unknown");
    expect(
      flow.state.members.value?.some(
        (member) => member.userID === "user_member",
      ),
    ).toBe(true);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("keeps an unreadable reconciliation pending and resolves it on a later read", async () => {
    const { db, service, flow } = await setup();
    vi.spyOn(service, "removeMember").mockRejectedValueOnce(
      new Error("response lost"),
    );
    vi.spyOn(service, "members").mockRejectedValueOnce(
      new Error("read offline"),
    );
    await flow.removeMember("user_member");
    expect(flow.state.memberRemoval.phase).toBe("unknown");
    expect(flow.state.members.error).toBe("read offline");
    delete db.state.devices[0].members.user_member;
    await flow.reconcileMember();
    expect(flow.state.memberRemoval.phase).toBe("removed");
  });

  it("isolates a late removal response on blur and checks the same device on focus", async () => {
    const { service, flow } = await setup();
    const wait = deferred<unknown>();
    const remove = vi
      .spyOn(service, "removeMember")
      .mockReturnValueOnce(wait.promise);
    const saving = flow.removeMember("user_member");
    flow.stop();
    wait.resolve({});
    await saving;
    expect(flow.state.memberRemoval.phase).toBe("unknown");
    await flow.start();
    expect(flow.state.memberRemoval.phase).toBe("unknown");
    expect(remove).toHaveBeenCalledOnce();
  });

  it("clears old member data and pending action when the session changes", async () => {
    const { service, flow } = await setup();
    vi.spyOn(service, "removeMember").mockRejectedValueOnce(
      new Error("response lost"),
    );
    await flow.removeMember("user_member");
    expect(flow.state.memberRemoval.phase).toBe("unknown");
    await service.logout();
    expect(flow.state.members.value).toBeNull();
    expect(flow.state.memberRemoval.phase).toBe("idle");
  });

  it("validates actual list fields, drops raw contact details and encodes both DELETE IDs", async () => {
    const config = {
      apiBaseUrl: "https://platform.example.test",
      iotApiBaseUrl: "https://iot.example.test/module",
      tenantID: "42",
    };
    const replies = [
      {
        code: 0,
        success: true,
        data: [
          {
            userID: "user/one",
            bindingRole: "mbr",
            nickname: null,
            email: "raw@example.test",
            mobile: "13800000000",
          },
        ],
      },
      { code: 0, success: true, data: {} },
      {
        code: 0,
        success: true,
        data: [{ userID: "user/one", bindingRole: "other" }],
      },
    ];
    const fetcher = vi
      .fn<HttpFetcher>()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify(replies.shift()), { status: 200 }),
      );
    const service = new RowanService(
      new RealHttpClient(config, fetcher),
      new MemoryStorage(),
    );
    service.session = {
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 3600,
      tokenType: "Bearer",
      userID: "admin",
      setting: defaultSettings(),
    };
    const signal = new AbortController().signal;
    expect(await service.members("dev/one", signal)).toEqual([
      { userID: "user/one", nickname: null, bindingRole: "mbr" },
    ]);
    await service.removeMember("dev/one", "user/one", signal);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://iot.example.test/module/app-api/devices/dev%2Fone/users",
    );
    expect(fetcher.mock.calls[1][0]).toBe(
      "https://iot.example.test/module/app-api/devices/dev%2Fone/users/user%2Fone",
    );
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      signal,
      headers: { Authorization: "Bearer access", "tenant-id": "42" },
    });
    await expect(service.members("dev/one")).rejects.toMatchObject({
      code: 502,
    });
  });

  it("rejects malformed or duplicate member IDs instead of treating them as empty", async () => {
    const { service } = await setup();
    for (const data of [
      {},
      [{ userID: "", bindingRole: "mbr" }],
      [
        { userID: "same", bindingRole: "sa" },
        { userID: "same", bindingRole: "mbr" },
      ],
      [{ userID: "member", bindingRole: "mbr", nickname: 123 }],
    ]) {
      vi.spyOn(service, "request").mockResolvedValueOnce(data);
      await expect(service.members("dev_wine")).rejects.toMatchObject({
        code: 502,
      });
    }
  });
});

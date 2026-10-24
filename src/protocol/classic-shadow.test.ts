import { describe, expect, it, vi } from "vitest";
import { createClassicShadowResolver, shadowTopics } from "./classic-shadow";
import { RealtimeDeviceSession } from "./device-session";
import { MqttConnection, type MqttPort } from "./mqtt-connection";
import type { DeviceView, ThingModel } from "../services/models";

const encode = (body: unknown) => new TextEncoder().encode(JSON.stringify(body));
const device: DeviceView = {
  deviceNickname: "fixture",
  bindingRole: "sa",
  bindingAt: "",
  device: { id: "dev" },
  product: { id: "p" },
};
const model: ThingModel = {
  version: "1",
  attributes: [
    { identifier: "Power", type: "number", writable: true, min: 0, max: 1, step: 1 },
    { identifier: "ConnectType", type: "enum", writable: false, values: ["online", "offline"] },
    { identifier: "Hours", type: "number", writable: false, min: 0, max: 100, step: 1 },
  ],
  services: [],
  events: [],
};
const context = { deviceID: "dev", userID: "user", device, model };
const resolver = createClassicShadowResolver({
  p: {
    writable: ["Power"],
    connection: { identifier: "ConnectType", online: "online", offline: "offline" },
  },
});
const profile = () => resolver(context, new AbortController().signal);
const prefix = "$aws/things/dev/shadow";

describe("V1.6 Classic Shadow adapter", () => {
  it("subscribes only four exact responses and publishes a zero-byte get", async () => {
    const p = await profile();
    expect(p.topics).toEqual(
      ["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map(
        (s) => `${prefix}/${s}`,
      ),
    );
    expect(p.query("local").topic).toBe(`${prefix}/get`);
    expect(p.query("local").payload).toHaveLength(0);
  });
  it("does not invent production product capabilities", async () => {
    const p = await createClassicShadowResolver()(context, new AbortController().signal);
    expect(p.canWrite).toBe(false);
    expect(p.command).toBeUndefined();
    expect(p.service).toBeUndefined();
  });
  it("encodes original case and control envelope; rejects readonly, unknown and illegal values", async () => {
    const p = await profile();
    const value = p.command!({ Power: 1 }, "app1");
    expect(JSON.parse(new TextDecoder().decode(value.payload))).toEqual({
      state: { desired: { EnduserId: "user", DeviceId: "dev", CommandType: "app", Power: 1 } },
      clientToken: "app1",
    });
    for (const props of [{ power: 1 }, { Hours: 0 }, { Power: 2 }, { DeviceId: "foreign" }, {}])
      expect(() => p.command!(props, "id")).toThrow();
  });
  it("rejects clientToken longer than the AWS 64-byte limit before publishing", async () => {
    const p = await profile();
    for (const token of ["x".repeat(65), "测".repeat(22), ""])
      expect(() => p.command!({ Power: 1 }, token)).toThrow("clientToken");
  });
  it("validates device context and rejects wildcard device IDs", async () => {
    await expect(
      resolver({ ...context, deviceID: "other" }, new AbortController().signal),
    ).rejects.toThrow();
    expect(() => shadowTopics("dev/+")).toThrow();
  });
  it("separates own AWS acceptance from device reported, retaining real tokens", async () => {
    const p = await profile();
    expect(
      p.decode(
        `${prefix}/update/accepted`,
        encode({ state: { desired: { Power: 1 } }, version: 6, clientToken: "app1" }),
      ),
    ).toEqual({ kind: "accepted", version: 6, requestID: "app1" });
    expect(
      p.decode(
        `${prefix}/update/accepted`,
        encode({ state: { reported: { Power: 1 } }, version: 7, clientToken: "device1" }),
      ),
    ).toMatchObject({ kind: "delta", version: 7, requestID: "device1", reported: { Power: 1 } });
  });
  it("decodes standard errors, including tokenless GET 404", async () => {
    const p = await profile();
    expect(p.decode(`${prefix}/get/rejected`, encode({ code: 404 }))).toMatchObject({
      kind: "rejected",
      operation: "query",
      code: 404,
    });
    expect(
      p.decode(`${prefix}/update/rejected`, encode({ code: 409, clientToken: "app1" })),
    ).toMatchObject({ kind: "rejected", operation: "update", code: 409, requestID: "app1" });
  });
  it("represents an empty reported snapshot and whole-branch deletion without keeping old online state", async () => {
    const p = await profile();
    expect(p.decode(`${prefix}/get/accepted`, encode({ state: {}, version: 2 }))).toMatchObject({
      kind: "full",
      reported: {},
      version: 2,
    });
    expect(
      p.decode(`${prefix}/update/accepted`, encode({ state: { reported: null }, version: 3 })),
    ).toMatchObject({ kind: "delta", reported: {}, clearReported: true, version: 3 });
  });
  it("ignores foreign, malformed and unsupported responses", async () => {
    const p = await profile();
    for (const body of [
      { state: { reported: { DeviceId: "other", Power: 1 } }, version: 2 },
      { state: { reported: { Power: 1 } }, version: -1 },
      { state: { reported: [] }, version: 2 },
    ])
      expect(p.decode(`${prefix}/update/accepted`, encode(body))).toBeUndefined();
    expect(
      p.decode(
        "$aws/things/other/shadow/get/accepted",
        encode({ state: { reported: { Power: 1 } }, version: 2 }),
      ),
    ).toBeUndefined();
    expect(p.decode(`${prefix}/get/accepted`, new Uint8Array([255]))).toBeUndefined();
  });
  it("maps a product action through desired, preserving its sequence and explicit confirmation", async () => {
    const actionResolver = createClassicShadowResolver({
      p: {
        writable: ["Power"],
        connection: { identifier: "ConnectType", online: "online", offline: "offline" },
        actions: { Reset: () => ({ desired: { Power: 1 }, expected: { Hours: 0 } }) },
      },
    });
    const p = await actionResolver(context, new AbortController().signal),
      publication = p.service!({ identifier: "Reset", params: {} }, "action-sequence");
    expect(publication.topic).toBe(`${prefix}/update`);
    expect(publication.confirmation).toEqual({ kind: "reported", expected: { Hours: 0 } });
    expect(JSON.parse(new TextDecoder().decode(publication.payload)).clientToken).toBe(
      "action-sequence",
    );
    expect(() => p.service!({ identifier: "Unknown", params: {} }, "seq")).toThrow("尚未配置");
  });
  it("rejects an action that writes a readonly field or has invalid native values", async () => {
    const invalid: Record<string, number>[] = [{ Hours: 0 }, { Power: 99 }];
    for (const desired of invalid) {
      const p = await createClassicShadowResolver({
        p: {
          writable: ["Power"],
          connection: { identifier: "ConnectType", online: "online", offline: "offline" },
          actions: { Reset: () => ({ desired, expected: { Hours: 0 } }) },
        },
      })(context, new AbortController().signal);
      expect(() => p.service!({ identifier: "Reset", params: {} }, "seq")).toThrow();
    }
  });
});

class Port implements MqttPort {
  handlers = new Map<string, (() => void)[]>();
  message?: (topic: string, payload: Uint8Array) => void;
  on(event: string, fn: () => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
  }
  onMessage(fn: (topic: string, payload: Uint8Array) => void) {
    this.message = fn;
  }
  emit(event: string) {
    for (const fn of this.handlers.get(event) ?? []) fn();
  }
  report(suffix: string, body: unknown) {
    this.message?.(`${prefix}/${suffix}`, encode(body));
  }
  subscribe = vi.fn((_t: string, done: (error?: Error) => void) => done());
  publish = vi.fn((_t: string, _p: Uint8Array, done: (error?: Error) => void) => done());
  unsubscribe = vi.fn();
  end = vi.fn();
}
async function setup(userID = "user") {
  const port = new Port();
  const session = new RealtimeDeviceSession({
    deviceID: "dev",
    userID,
    current: () => true,
    start: () => undefined,
    stop: () => undefined,
    credentials: async () => ({
      host: "wss://broker.example.test/mqtt",
      endpoint: "broker.example.test",
      path: "/mqtt",
      clientID: "fixture",
      username: "fixture",
      password: "fixture",
      deviceID: "dev",
    }),
    connection: async () =>
      new MqttConnection(() => {
        queueMicrotask(() => port.emit("connect"));
        return port;
      }, 100),
    context: async () => ({ device, model }),
    profile: resolver,
    timeout: 200,
  });
  const pending = session.connect();
  await vi.waitFor(() => expect(port.publish).toHaveBeenCalled());
  return { port, session, pending };
}
async function ready(userID?: string) {
  const c = await setup(userID);
  c.port.report("get/accepted", {
    state: { reported: { Power: 0, Hours: 10, ConnectType: "online" } },
    version: 5,
  });
  await c.pending;
  return c;
}
function commandToken(port: Port) {
  return JSON.parse(new TextDecoder().decode(port.publish.mock.calls.at(-1)![1])).clientToken;
}
describe("V1.6 Shadow session integration (synthetic broker/device)", () => {
  it("generates bounded correlation tokens independently of long account IDs", async () => {
    const c = await ready("u".repeat(120));
    try {
      const sent = c.session.command({ Power: 1 }),
        token = commandToken(c.port);
      expect(new TextEncoder().encode(token).length).toBeLessThanOrEqual(64);
      c.port.report("update/accepted", {
        state: { desired: { Power: 1 } },
        version: 6,
        clientToken: token,
      });
      c.port.report("update/accepted", {
        state: { reported: { Power: 1 } },
        version: 7,
        clientToken: "device",
      });
      await sent;
    } finally {
      c.session.close();
    }
  });
  it("initializes from tokenless GET, waits for own desired acceptance and fresh device report", async () => {
    const c = await ready();
    try {
      const sent = c.session.command({ Power: 1 }),
        token = commandToken(c.port);
      c.port.report("update/accepted", {
        state: { reported: { Power: 1 } },
        version: 6,
        clientToken: "old-device-report",
      });
      expect(c.session.sending).toBe(true);
      c.port.report("update/accepted", {
        state: { desired: { Power: 1 } },
        version: 7,
        clientToken: token,
      });
      expect(c.session.sending).toBe(true);
      c.port.report("update/accepted", {
        state: { reported: { Power: 1 } },
        version: 8,
        clientToken: "device-new",
      });
      await sent;
      expect(c.session.confirmed).toMatchObject({ Power: 1, Hours: 10 });
      expect(c.session.sending).toBe(false);
    } finally {
      c.session.close();
    }
  });
  it("handles a device report delivered before the AWS desired acceptance", async () => {
    const c = await ready();
    try {
      const sent = c.session.command({ Power: 1 }),
        token = commandToken(c.port);
      c.port.report("update/accepted", {
        state: { reported: { Power: 1 } },
        version: 8,
        clientToken: "device",
      });
      expect(c.session.sending).toBe(true);
      c.port.report("update/accepted", {
        state: { desired: { Power: 1 } },
        version: 7,
        clientToken: token,
      });
      await sent;
    } finally {
      c.session.close();
    }
  });
  it("handles tokenless query rejection immediately without fake defaults", async () => {
    const c = await setup(),
      rejected = expect(c.pending).rejects.toMatchObject({ code: 404 });
    c.port.report("get/rejected", { code: 404 });
    await rejected;
    expect(c.session.ready).toBe(false);
    expect(c.session.confirmed).toEqual({});
    c.session.close();
  });
  it("rejects only the matching update and retains confirmed values", async () => {
    const c = await ready();
    try {
      const sent = c.session.command({ Power: 1 }),
        failed = expect(sent).rejects.toMatchObject({ code: 409 }),
        token = commandToken(c.port);
      c.port.report("update/rejected", { code: 409, clientToken: "foreign" });
      expect(c.session.sending).toBe(true);
      c.port.report("update/rejected", { code: 409, clientToken: token });
      await failed;
      expect(c.session.confirmed.Power).toBe(0);
    } finally {
      c.session.close();
    }
  });
  it("blocks writes when reported offline and never replays a pending command after close", async () => {
    const c = await ready();
    try {
      c.port.report("update/accepted", {
        state: { reported: { ConnectType: "offline" } },
        version: 6,
      });
      await expect(c.session.command({ Power: 1 })).rejects.toThrow();
      expect(c.port.publish).toHaveBeenCalledTimes(1);
    } finally {
      c.session.close();
    }
  });
  it("removes deleted properties and does not confirm an action from a deleted old match", async () => {
    const c = await ready();
    try {
      const sent = c.session.command({ Power: 1 }),
        failed = expect(sent).rejects.toMatchObject({ code: 499 }),
        token = commandToken(c.port);
      c.port.report("update/accepted", {
        state: { reported: { Power: 1 } },
        version: 8,
        clientToken: "device",
      });
      c.port.report("update/accepted", {
        state: { reported: { Power: null } },
        version: 9,
        clientToken: "device",
      });
      expect(c.session.confirmed.Power).toBeUndefined();
      c.port.report("update/accepted", {
        state: { desired: { Power: 1 } },
        version: 7,
        clientToken: token,
      });
      expect(c.session.sending).toBe(true);
      c.session.close();
      await failed;
    } finally {
      c.session.close();
    }
  });
  it("ends a pending control on offline without replaying it", async () => {
    const c = await ready();
    try {
      const sent = c.session.command({ Power: 1 }),
        failed = expect(sent).rejects.toThrow("离线");
      c.port.report("update/accepted", {
        state: { reported: { ConnectType: "offline" } },
        version: 6,
      });
      await failed;
      expect(c.session.sending).toBe(false);
      expect(c.session.confirmed.Power).toBe(0);
      expect(c.port.publish).toHaveBeenCalledTimes(2);
    } finally {
      c.session.close();
    }
  });
  it("clears all cached reported values and disables control when the reported branch is removed", async () => {
    const c = await ready();
    try {
      c.port.report("update/accepted", { state: { reported: null }, version: 6 });
      expect(c.session.confirmed).toEqual({});
      expect(c.session.canWrite).toBe(false);
      await expect(c.session.command({ Power: 1 })).rejects.toThrow();
    } finally {
      c.session.close();
    }
  });
  it("times out without assuming execution, then reconnects with a new snapshot and no command replay", async () => {
    const c = await ready();
    try {
      const sent = c.session.command({ Power: 1 }),
        token = commandToken(c.port),
        failed = expect(sent).rejects.toMatchObject({ code: 408 });
      c.port.report("update/accepted", {
        state: { desired: { Power: 1 } },
        version: 6,
        clientToken: token,
      });
      await failed;
      expect(c.session.confirmed.Power).toBe(0);
      expect(c.session.sending).toBe(false);
      c.port.emit("close");
      const reconnect = c.session.connect();
      await vi.waitFor(() => expect(c.port.publish).toHaveBeenCalledTimes(3));
      expect(c.port.publish.mock.calls.at(-1)![0]).toBe(`${prefix}/get`);
      c.port.report("get/accepted", {
        state: { reported: { Power: 1, ConnectType: "online" } },
        version: 10,
      });
      await reconnect;
      expect(c.session.confirmed).toEqual({ Power: 1, ConnectType: "online" });
      expect(c.port.publish).toHaveBeenCalledTimes(3);
    } finally {
      c.session.close();
    }
  });
});

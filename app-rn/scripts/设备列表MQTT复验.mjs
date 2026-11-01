import { fileURLToPath } from "node:url";
// node --import tsx scripts/设备列表MQTT复验.mjs [--live]
// Default: synthetic broker exercising real App sessions, no network.
// --live: issued-account login, authorized target device, read-only Shadow GET/observation.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const unwrap = async (url) => {
  const m = await import(url);
  return m.default ?? m;
};
const { RealtimeDeviceSession } = await unwrap("../src/protocol/device-session.ts");
const { ControlledDeviceSession } = await unwrap("../src/protocol/controlled-session.ts");
const { MqttConnection } = await unwrap("../src/protocol/mqtt-connection.ts");
const { createClassicShadowResolver } = await unwrap("../src/protocol/classic-shadow.ts");
const { deploymentIntegrations } = await unwrap("../src/config/deployment-integrations.ts");
const encode = (body) => new TextEncoder().encode(JSON.stringify(body));
const decode = (payload) =>
  payload.length ? JSON.parse(new TextDecoder().decode(payload)) : "[EMPTY:0 bytes]";
const directory = fileURLToPath(new URL("../../docs/测试报告/MQTT复验-20261027", import.meta.url));
const live = process.argv.includes("--live");
const report = {
  timestamp: new Date().toISOString(),
  mode: live ? "live-readonly" : "synthetic-broker-real-app-code",
  events: [],
  assertions: [],
};
const start = Date.now();
const record = (event) => {
  report.events.push({ elapsedMs: Date.now() - start, ...event });
  console.log(JSON.stringify(event));
};
const check = (name, fn) => {
  fn();
  report.assertions.push({ name, result: "PASS" });
};
const snapshot = (session) => ({
  ready: session.ready,
  connected: session.connected,
  online: session.online ?? "unknown",
  canWrite: session.canWrite,
  sending: session.sending,
  confirmed: session.confirmed,
  controlError: session.controlError,
});

async function synthetic() {
  const device = {
    deviceNickname: "Synthetic audit device",
    bindingRole: "sa",
    bindingAt: "",
    online: false,
    device: { id: "audit-device" },
    product: { id: "audit-product" },
  };
  const model = {
    version: "synthetic-v1",
    attributes: [
      { identifier: "Power", type: "enum", writable: true, values: ["on", "off"] },
      { identifier: "Online", type: "enum", writable: false, values: ["online", "offline"] },
      { identifier: "TempCurrent", type: "number", writable: false, min: -50, max: 100, step: 1 },
    ],
    services: [],
    events: [],
  };
  const credentials = {
    host: "wss://broker.example.test/mqtt",
    endpoint: "broker.example.test",
    path: "/mqtt",
    clientID: "issued-audit-client",
    username: "fixture",
    password: "fixture",
    deviceID: "audit-device",
  };
  const initial = { Online: "online", Power: "on", TempCurrent: 10 };
  async function rig(scenario, profile, controls) {
    const handlers = new Map();
    let receiver;
    const writes = [];
    const prefix = "$aws/things/audit-device/shadow";
    const incoming = (suffix, body) => {
      record({ scenario, direction: "broker-to-app", topic: `${prefix}/${suffix}`, payload: body });
      receiver(`${prefix}/${suffix}`, encode(body));
    };
    const port = {
      on: (event, fn) => {
        const fns = handlers.get(event) ?? [];
        fns.push(fn);
        handlers.set(event, fns);
      },
      onMessage: (fn) => {
        receiver = fn;
      },
      subscribe: (topic, done) => {
        record({ scenario, operation: "SUBSCRIBE", topic });
        done();
        record({ scenario, operation: "SUBACK", topic });
      },
      unsubscribe: (topic) => record({ scenario, operation: "UNSUBSCRIBE", topic }),
      publish: (topic, payload, done) => {
        const body = decode(payload);
        writes.push({ topic, body });
        record({
          scenario,
          direction: "app-to-broker",
          operation: "PUBLISH",
          topic,
          bytes: payload.length,
          payload: body,
        });
        done();
        record({ scenario, operation: "PUBACK", topic });
        if (topic.endsWith("/get"))
          queueMicrotask(() =>
            incoming("get/accepted", { version: 10, state: { reported: initial } }),
          );
      },
      end: () => record({ scenario, operation: "CLOSE" }),
    };
    const inner = new RealtimeDeviceSession({
      deviceID: device.device.id,
      userID: "synthetic-user",
      current: () => true,
      start() {},
      stop() {},
      credentials: async () => credentials,
      context: async () => ({ device, model }),
      profile,
      connection: async () =>
        new MqttConnection(() => {
          queueMicrotask(() => {
            for (const fn of handlers.get("connect") ?? []) fn();
          });
          return port;
        }, 1000),
      timeout: 1000,
    });
    const session = new ControlledDeviceSession(inner, async () => ({ device, model }), controls);
    await session.connect();
    record({ scenario, operation: "STATE", ...snapshot(session) });
    return { session, writes, incoming };
  }
  const deployed = deploymentIntegrations["rowan-v16-shadow"].create().contracts;
  const ro = await rig("deployed-readonly-profile", deployed.realtime, deployed.controls);
  try {
    check("current deployment synchronizes reported values", () =>
      assert.deepEqual(ro.session.confirmed, initial),
    );
    check("current deployment does not infer online or enable controls", () => {
      assert.equal(ro.session.online, undefined);
      assert.equal(ro.session.canWrite, false);
      assert.equal(ro.session.controls, undefined);
    });
    await assert.rejects(ro.session.command({ Power: "off" }), /控制/);
    check("blocked readonly control publishes no desired", () =>
      assert.equal(ro.writes.filter((w) => w.topic.endsWith("/update")).length, 0),
    );
  } finally {
    ro.session.close();
  }
  const resolver = createClassicShadowResolver({
    "audit-product": {
      writable: ["Power"],
      connection: { identifier: "Online", online: "online", offline: "offline" },
    },
  });
  const controls = async () => ({
    bindings: {
      power: {
        identifier: "Power",
        roles: ["sa", "mbr"],
        switch: { on: "on", off: "off" },
        whenLocked: "allowed",
      },
    },
  });
  const c = await rig("explicit-synthetic-control-contract", resolver, controls);
  try {
    check("mapped online overrides stale REST offline", () => assert.equal(c.session.online, true));
    const pending = c.session.controls.toggle("power");
    const command = c.writes.at(-1).body;
    check("control publishes desired off with bounded clientToken", () => {
      assert.equal(command.state.desired.Power, "off");
      assert.ok(Buffer.byteLength(command.clientToken) <= 64);
    });
    check("PUBACK does not confirm execution", () => {
      assert.equal(c.session.sending, true);
      assert.equal(c.session.confirmed.Power, "on");
    });
    record({
      scenario: "explicit-synthetic-control-contract",
      operation: "AFTER_PUBACK",
      ...snapshot(c.session),
    });
    c.incoming("update/accepted", {
      version: 11,
      clientToken: command.clientToken,
      state: { desired: command.state.desired },
    });
    check("own desired acceptance still does not confirm execution", () =>
      assert.equal(c.session.sending, true),
    );
    c.incoming("update/accepted", {
      version: 12,
      clientToken: "synthetic-device-report",
      state: { reported: { Power: "off", TempCurrent: 11 } },
    });
    await pending;
    check("newer reported confirms operation", () => {
      assert.equal(c.session.sending, false);
      assert.equal(c.session.confirmed.Power, "off");
    });
    record({
      scenario: "explicit-synthetic-control-contract",
      operation: "CONFIRMED",
      ...snapshot(c.session),
    });
    c.incoming("update/accepted", { version: 11, state: { reported: { Power: "on" } } });
    check("old version cannot overwrite confirmed state", () =>
      assert.equal(c.session.confirmed.Power, "off"),
    );
    c.incoming("update/accepted", { version: 13, state: { reported: { Online: "offline" } } });
    check("offline mapping disables writes", () => {
      assert.equal(c.session.online, false);
      assert.equal(c.session.canWrite, false);
    });
    await assert.rejects(c.session.controls.toggle("power"));
    check("offline attempt creates no additional publish", () => assert.equal(c.writes.length, 2));
  } finally {
    c.session.close();
  }
  check("closed connection has unknown online status", () =>
    assert.equal(c.session.online, undefined),
  );
}

async function actual() {
  try {
    process.loadEnvFile(".env.local");
  } catch (e) {
    if (e.code !== "ENOENT") throw new Error("LOCAL_CONFIGURATION_UNREADABLE");
  }
  const env = process.env;
  const { RowanService } = await unwrap("../src/services/rowan.ts");
  const { RealHttpClient } = await unwrap("../src/services/real-http.ts");
  const { MemoryStorage } = await unwrap("../src/services/memory-storage.ts");
  const { createMqttConnection } = await unwrap("../src/protocol/mqtt-browser.ts");
  const { diagnosticSnapshot } = await unwrap("../src/services/http-logging.ts");
  const sanitize = (body) =>
    JSON.parse(
      JSON.stringify(diagnosticSnapshot(body), (key, value) =>
        /^(EnduserId|userID|username|account)$/i.test(key) ? "[REDACTED]" : value,
      ),
    );
  const budget = AbortSignal.timeout(65000);
  const id = env.ROWAN_MQTT_TEST_DEVICE_ID ?? "dev_666666";
  report.deviceID = id;
  report.scope =
    "Login + authorized device list + issued MQTT credentials + four subscriptions + zero-byte GET + 35s observation. No desired/reported writes.";
  const safeCode = (e) =>
    typeof e?.code === "number" || /^[A-Z_0-9]+$/.test(String(e?.code)) ? e.code : null;
  let service, session;
  try {
    if (!env.ROWAN_LOGIN_ACCOUNT || !env.ROWAN_LOGIN_PIN)
      throw Object.assign(new Error(), { code: "MISSING_LOGIN_CONFIGURATION" });
    service = new RowanService(
      new RealHttpClient(
        {
          environment: "development",
          apiBaseUrl: env.ROWAN_APP_API_BASE_URL,
          iotApiBaseUrl: env.ROWAN_IOT_API_BASE_URL,
          tenantID: env.ROWAN_TENANT_ID ?? env.ROWAN_LOGIN_TENANT,
        },
        async (url, init) => {
          const response = await fetch(url, {
            ...init,
            redirect: "error",
            signal: AbortSignal.any([budget, ...(init?.signal ? [init.signal] : [])]),
          });
          let code;
          try {
            code = (await response.clone().json()).code;
          } catch {}
          record({
            operation: "HTTP",
            method: init?.method,
            path: new URL(url).pathname,
            status: response.status,
            code: typeof code === "number" ? code : null,
          });
          return response;
        },
      ),
      new MemoryStorage(),
    );
    await service.login(env.ROWAN_LOGIN_ACCOUNT, env.ROWAN_LOGIN_PIN, "password");
    const groups = await service.home(budget);
    const view = groups.flatMap((g) => g.devices).find((d) => d.device.id === id);
    if (!view) throw Object.assign(new Error(), { code: "TARGET_NOT_AUTHORIZED_IN_LIST" });
    record({
      operation: "HOME_METADATA",
      deviceID: id,
      online: view.online,
      productID: view.product?.id,
      role: view.bindingRole,
    });
    const contracts =
      deploymentIntegrations[env.ROWAN_INTEGRATION_PROFILE ?? "rowan-v16-shadow"]?.create()
        .contracts;
    if (!contracts?.realtime)
      throw Object.assign(new Error(), { code: "NO_DEPLOYED_REALTIME_PROFILE" });
    const context = async (signal) => {
      const device = await service.device(id, signal);
      let model = { version: "", attributes: [], services: [], events: [] };
      if (device.product)
        try {
          model = await service.model(device.product.id, signal);
        } catch (e) {
          if (
            signal.aborted ||
            [401, 403, 499].includes(e.code) ||
            !contracts.realtimeModelOptional
          )
            throw e;
          record({ operation: "MODEL_UNAVAILABLE", code: safeCode(e) });
        }
      record({
        operation: "MODEL",
        productID: device.product?.id,
        version: model.version,
        attributes: model.attributes.map((a) => ({
          identifier: a.identifier,
          type: a.type,
          writable: a.writable,
          values: a.values,
        })),
      });
      return { device, model };
    };
    const owner = service.userID,
      revision = service.sessionRevision;
    const inner = new RealtimeDeviceSession({
      deviceID: id,
      userID: owner,
      current: () => service.session?.userID === owner && service.sessionRevision === revision,
      start() {},
      stop() {},
      context,
      profile: contracts.realtime,
      credentials: async (signal) => {
        const c = await service.mqtt(id, signal);
        record({
          operation: "ISSUED_CREDENTIALS",
          deviceMatches: c.deviceID === id,
          fields: Object.keys(c),
          sts: !!c.sessionToken,
          expiresAt: c.expiresAt ?? null,
        });
        return c;
      },
      connection: async () => {
        record({ operation: "TRANSPORT_FACTORY" });
        const logger = {
          debug: (_message, entry) => record({ operation: "MQTT_DIAGNOSTIC", entry }),
          error: (_message, entry) => record({ operation: "MQTT_DIAGNOSTIC", entry }),
          info() {},
          warn() {},
        };
        const connection = createMqttConnection({ level: "debug", logger });
        const connect = connection.connect.bind(connection);
        connection.connect = async (...args) => {
          record({ operation: "CONNECT_BEGIN" });
          try {
            await connect(...args);
            record({ operation: "CONNECT_OK" });
          } catch (e) {
            record({ operation: "CONNECT_FAIL", code: safeCode(e) });
            throw e;
          }
        };
        connection.onConnectionChange((connected) =>
          record({ operation: "CONNECTION", connected }),
        );
        const subscribe = connection.subscribe.bind(connection),
          publish = connection.publish.bind(connection);
        connection.subscribe = async (topic, handler, signal) => {
          record({ operation: "SUBSCRIBE", topic });
          const off = await subscribe(
            topic,
            (payload) => {
              let body;
              try {
                body = decode(payload);
              } catch {
                body = "[MALFORMED]";
              }
              // Apply standard diagnostics redaction and explicitly omit identity control metadata.
              const sanitized = sanitize(body);
              record({
                direction: "broker-to-app",
                topic,
                bytes: payload.length,
                payload: sanitized,
              });
              handler(payload);
            },
            signal,
          );
          record({ operation: "SUBACK", topic });
          return off;
        };
        connection.publish = async (topic, payload, signal) => {
          if (topic !== `$aws/things/${id}/shadow/get` || payload.length !== 0)
            throw Object.assign(new Error(), { code: "READ_ONLY_GUARD" });
          record({
            direction: "app-to-broker",
            operation: "PUBLISH",
            topic,
            bytes: payload.length,
            payload: "[EMPTY:0 bytes]",
          });
          await publish(topic, payload, signal);
          record({ operation: "PUBACK", topic });
        };
        return connection;
      },
      timeout: 10000,
    });
    session = new ControlledDeviceSession(inner, context, contracts.controls);
    session.onChange(() =>
      record({
        operation: "SESSION_STATE",
        ready: session.ready,
        connected: session.connected,
        online: session.online ?? "unknown",
        canWrite: session.canWrite,
        sending: session.sending,
      }),
    );
    await session.connect(budget);
    report.initialSynchronized = session.ready;
    record({ operation: "INITIAL_REPORTED", ...sanitize(snapshot(session)) });
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 35000);
      budget.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    report.finalSynchronized = session.ready;
    record({ operation: "FINAL_REPORTED", ...sanitize(snapshot(session)) });
    if (!session.ready) throw Object.assign(new Error(), { code: "LOST_SYNCHRONIZATION" });
  } finally {
    session?.close();
    if (service?.session)
      try {
        await service.logout();
        record({ operation: "LOGOUT", result: "PASS" });
      } catch (e) {
        record({ operation: "LOGOUT", result: "FAIL", code: safeCode(e) });
      }
  }
}
try {
  if (live) await actual();
  else await synthetic();
  report.execution = "PASS";
} catch (error) {
  report.execution = "FAIL";
  // No raw error text: network libraries may embed credential-bearing URLs.
  report.failure = {
    name: error.name,
    code: error.code ?? null,
    causeCode: error.cause?.code ?? null,
    ...(live ? {} : { message: error.message }),
  };
  record({ operation: "FAILED", ...report.failure });
  process.exitCode = 1;
} finally {
  await mkdir(directory, { recursive: true });
  const output = path.join(directory, live ? "真实链路.json" : "本地发布订阅轨迹.json");
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({ output, execution: report.execution, assertions: report.assertions.length }),
  );
}

import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../lib/core";
import { MqttDiagnostics } from "./mqtt-logging";
import { communicationConfig } from "../services/config";

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
function capture(level: "off" | "error" | "debug" = "debug") {
  const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const connection = new MqttDiagnostics({ level, logger }).connection("dev_fixture");
  const entries = () =>
    [...vi.mocked(logger.debug).mock.calls, ...vi.mocked(logger.error).mock.calls].map(
      (call) => call[1]!,
    );
  return { logger, connection, entries, text: () => JSON.stringify(entries()) };
}
describe("real MQTT console diagnostics", () => {
  it("correlates physical attempts and closure reasons with the stable logical session", () => {
    const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const state = {
      logicalSessionID: "session-fixture",
      attempt: 1,
      closeReason: "communication_failure",
    };
    const connection = new MqttDiagnostics({
      level: "debug",
      logger,
      sessionContext: () => ({ ...state }),
    }).connection("dev_fixture");
    connection.event("connect_attempt");
    state.closeReason = "device_unbound";
    connection.event("close_requested");
    expect(vi.mocked(logger.debug).mock.calls[0][1]).toMatchObject({
      logicalSessionID: "session-fixture",
      attempt: 1,
      closeReason: "communication_failure",
    });
    expect(vi.mocked(logger.debug).mock.calls[1][1]).toMatchObject({
      logicalSessionID: "session-fixture",
      attempt: 1,
      closeReason: "device_unbound",
    });
  });
  it("records one detached Topic/body snapshot with direction, bytes, device and connection", () => {
    const c = capture(),
      bytes = encode({ state: { desired: { Power: 1 } } });
    c.connection.message("out", "$aws/things/dev_fixture/shadow/update", bytes);
    bytes.fill(0);
    expect(c.logger.debug).toHaveBeenCalledOnce();
    expect(vi.mocked(c.logger.debug).mock.calls[0][0]).toContain("[MQTT]");
    expect(c.entries()[0]).toMatchObject({
      event: "publish_attempt",
      mode: "real",
      direction: "out",
      deviceID: "dev_fixture",
      connectionID: expect.any(String),
      timestamp: expect.any(String),
      topic: "$aws/things/dev_fixture/shadow/update",
      bytes: expect.any(Number),
      payload: { state: { desired: { Power: 1 } } },
    });
    c.connection.message("in", "device/topic", encode({ state: { reported: { Power: 1 } } }));
    expect(c.entries()[1]).toMatchObject({
      event: "message",
      direction: "in",
      payload: { state: { reported: { Power: 1 } } },
    });
  });
  it("redacts nested credentials, identity and signed URLs before bounding payloads", () => {
    const c = capture();
    c.connection.message(
      "in",
      "device/topic",
      encode({
        Power: 1,
        password: "password-secret",
        sessionToken: "sts-secret",
        accessKeyId: "access-secret",
        EnduserId: "account-secret",
        nested: {
          Authorization: "Bearer auth-secret",
          url: "wss://broker.test/mqtt?X-Amz-Signature=signature-secret",
          signature: "signature-field-secret",
          http: "https://broker.test/path?X-Amz-Signature=http-secret",
        },
        array: [{ privateKey: "private-secret" }],
      }),
    );
    for (const secret of [
      "password-secret",
      "sts-secret",
      "access-secret",
      "account-secret",
      "auth-secret",
      "signature-secret",
      "signature-field-secret",
      "http-secret",
      "private-secret",
    ])
      expect(c.text()).not.toContain(secret);
    expect(c.text()).toContain("[REDACTED]");
    expect(c.entries()[0].payload).toMatchObject({ Power: 1 });
  });
  it("caps sanitized large Unicode bodies at 4096 UTF-8 bytes and marks truncation", () => {
    const c = capture();
    c.connection.message(
      "in",
      "device/topic",
      encode({ text: "温".repeat(5000), password: "never-print" }),
    );
    const entry = c.entries()[0],
      body = typeof entry.payload === "string" ? entry.payload : JSON.stringify(entry.payload);
    expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(4096);
    expect(body).toContain("[TRUNCATED]");
    expect(entry.truncated).toBe(true);
    expect(body).not.toContain("never-print");
  });
  it("represents empty, non-JSON and invalid UTF-8 messages without logging opaque contents", () => {
    const c = capture();
    c.connection.message("out", "get/topic", new Uint8Array());
    expect(c.entries()[0]).toMatchObject({ bytes: 0, payload: "[EMPTY]", payloadType: "empty" });
    c.connection.message("in", "topic", new TextEncoder().encode("password=opaque-secret"));
    c.connection.message("in", "topic", new Uint8Array([255, 254, 128]));
    expect(c.entries()[1]).toMatchObject({ payload: "[UNPARSEABLE]", payloadType: "non_json" });
    expect(c.entries()[2]).toMatchObject({ payload: "[UNPARSEABLE]", payloadType: "binary" });
    expect(c.text()).not.toContain("opaque-secret");
  });
  it.each(["off", "error"] as const)("does not decode or print bodies at %s level", (level) => {
    const c = capture(level);
    c.connection.message("out", "topic", encode({ Power: 1 }));
    c.connection.event("connected");
    c.connection.failure(
      "subscribe_error",
      "topic",
      new Error("wss://broker/?password=never-print"),
    );
    expect(c.logger.debug).not.toHaveBeenCalled();
    expect(c.logger.error).toHaveBeenCalledTimes(level === "error" ? 1 : 0);
    expect(c.text()).not.toContain("never-print");
    expect(c.text()).not.toContain("payload");
  });
  it("contains failures from a broken sink and isolates connection identifiers", () => {
    const logger: Logger = {
      debug: () => {
        throw new Error("sink");
      },
      info: vi.fn(),
      warn: vi.fn(),
      error: () => {
        throw new Error("sink");
      },
    };
    const c = new MqttDiagnostics({ level: "debug", logger }).connection("dev");
    expect(() => {
      c.message("in", "topic", encode({ Power: 1 }));
      c.event("connected");
      c.failure("error", undefined, new Error("secret"));
    }).not.toThrow();
    const log = capture();
    log.connection.event("connected");
    new MqttDiagnostics({ level: "debug", logger: log.logger })
      .connection("other")
      .event("connected");
    expect(log.entries()[0].connectionID).not.toBe(log.entries()[1].connectionID);
  });
});
describe("MQTT log configuration", () => {
  it("defaults independently from HTTP, disables production logging and rejects invalid values", () => {
    expect(
      communicationConfig({ apiBaseUrl: "https://api.test", httpLogLevel: "off" }).mqttLogLevel,
    ).toBe("debug");
    expect(
      communicationConfig({ apiBaseUrl: "https://api.test", environment: "preview" }).mqttLogLevel,
    ).toBe("debug");
    expect(
      communicationConfig({ apiBaseUrl: "https://api.test", environment: "production" })
        .mqttLogLevel,
    ).toBe("off");
    expect(
      communicationConfig({
        apiBaseUrl: "https://api.test",
        mqttLogLevel: "off",
        httpLogLevel: "debug",
      }).mqttLogLevel,
    ).toBe("off");
    expect(() =>
      communicationConfig({ apiBaseUrl: "https://api.test", mqttLogLevel: "invalid" as never }),
    ).toThrow("ROWAN_MQTT_LOG_LEVEL");
  });
});

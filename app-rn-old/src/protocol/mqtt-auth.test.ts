import { describe, expect, it } from "vitest";
import { mqttConnectParameters } from "./mqtt-auth";
import { mqttCredentials } from "./mqtt-connection";

const credentials = {
  host: "wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt",
  endpoint: "example-ats.iot.ap-southeast-2.amazonaws.com",
  path: "/mqtt",
  clientID: "app-test",
  username: "AKIDEXAMPLE",
  password: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  deviceID: "dev_test",
  sessionToken: "fixture+/=token",
};
const now = new Date("2026-10-22T01:02:03Z");

describe("AWS IoT STS WebSocket认证", () => {
  it("matches an independently calculated Node crypto signature and encodes the STS token", () => {
    const result = mqttConnectParameters(credentials, now);
    const url = new URL(result.url);
    expect(url.searchParams.get("X-Amz-Credential")).toBe(
      "AKIDEXAMPLE/20261022/ap-southeast-2/iotdevicegateway/aws4_request",
    );
    expect(url.searchParams.get("X-Amz-Date")).toBe("20261022T010203Z");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-Signature")).toBe(
      "1bb6fc1e00f9317a345bfffa3fc27bda14c615a9de3ccaa18f1fb99a287b3588",
    );
    expect(url.searchParams.get("X-Amz-Security-Token")).toBe(credentials.sessionToken);
    expect(result.url).toContain("fixture%2B%2F%3Dtoken");
    expect(result.authentication).toEqual({});
    expect(result.url).not.toContain(credentials.password);
  });
  it("keeps non-STS credentials and pre-signed URLs unchanged", () => {
    const { sessionToken: _, ...legacy } = credentials;
    const host = "wss://broker.example.test/mqtt?existing=signature";
    expect(mqttConnectParameters({ ...legacy, host }, now)).toEqual({
      url: host,
      authentication: { username: legacy.username, password: legacy.password },
    });
  });
  it.each([
    "wss://example.test/mqtt",
    "wss://example-ats.iot.ap-southeast-2.amazonaws.com.attacker.test/mqtt",
    "wss://example-ats.iot.ap-southeast-2.amazonaws.com:8443/mqtt",
    "wss://example-ats.iot.ap-southeast-2.amazonaws.com/other",
    "wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt?extra=value",
    "ws://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt",
  ])("rejects unsupported STS target %s", (host) => {
    expect(() => mqttConnectParameters({ ...credentials, host }, now)).toThrow();
  });
  it.each(["", null, 123])(
    "rejects invalid sessionToken without falling back to password auth: %s",
    (sessionToken) => {
      expect(() => mqttCredentials({ ...credentials, sessionToken }, "dev_test")).toThrow();
    },
  );
  it("uses a fresh signing time on each connection attempt", () => {
    const earlier = mqttConnectParameters(credentials, now);
    const later = mqttConnectParameters(credentials, new Date("2026-10-22T02:02:03Z"));
    expect(new URL(later.url).searchParams.get("X-Amz-Signature")).not.toBe(
      new URL(earlier.url).searchParams.get("X-Amz-Signature"),
    );
  });
});

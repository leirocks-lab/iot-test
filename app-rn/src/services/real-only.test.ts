import { describe, expect, it } from "vitest";
import { communicationConfig } from "./config";

describe("real-only runtime configuration", () => {
  const input = {
    environment: "development",
    apiBaseUrl: "https://api.example.test",
    tenantID: "42",
  };
  it("has no selectable transport modes", () => {
    const config = communicationConfig(input);
    expect(config).not.toHaveProperty("httpMode");
    expect(config).not.toHaveProperty("deviceMode");
  });
  it("rejects stale mock configuration instead of silently ignoring it", () => {
    expect(() => communicationConfig({ ...input, httpMode: "mock" } as never)).toThrow(
      /mock.*移除/i,
    );
    expect(() => communicationConfig({ ...input, deviceMode: "mock" } as never)).toThrow(
      /mock.*移除/i,
    );
  });
  it("requires an actual API root in development too", () => {
    expect(() => communicationConfig({ environment: "development" })).toThrow();
  });
});

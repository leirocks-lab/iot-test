import { describe, expect, it } from "vitest";
import { deploymentIntegrations } from "./deployment-integrations";
import { registeredIntegration } from "../services/runtime-integration";
import { communicationConfig } from "../services/config";

describe("V1.6 deployment registration", () => {
  it("explicitly selects readonly Shadow synchronization without inventing product controls", () => {
    const config = communicationConfig({
      environment: "development",
      apiBaseUrl: "https://api.example.test",
      integrationProfile: "rowan-v16-shadow",
    });
    const { contracts } = registeredIntegration(config, deploymentIntegrations);
    expect(contracts.realtime).toBeTypeOf("function");
    expect(contracts.realtimeModelOptional).toBe(true);
    expect(contracts.controls).toBeUndefined();
    expect(contracts.maintenance).toBeUndefined();
    expect(contracts.events).toBeUndefined();
  });
  it("does not enable an unverified deployment in production", () => {
    const config = communicationConfig({
      environment: "production",
      apiBaseUrl: "https://api.example.test",
      integrationProfile: "rowan-v16-shadow",
    });
    expect(() => registeredIntegration(config, deploymentIntegrations)).toThrow("环境");
  });
  it("keeps read-only Shadow synchronization available in the dual BLE deployment", () => {
    const config = communicationConfig({
      environment: "development",
      apiBaseUrl: "https://api.example.test",
      integrationProfile: "rowan-ble-dual",
    });
    const { contracts } = registeredIntegration(config, deploymentIntegrations);
    expect(contracts.onboarding).toBeDefined();
    expect(contracts.realtime).toBeTypeOf("function");
    expect(contracts.realtimeModelOptional).toBe(true);
    expect(contracts.controls).toBeUndefined();
  });
});

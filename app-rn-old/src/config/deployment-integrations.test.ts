import { describe, expect, it } from "vitest";
import { deploymentIntegrations } from "./deployment-integrations";
import { registeredIntegration } from "../services/runtime-integration";
import { communicationConfig } from "../services/config";
import { PropertyControls } from "../services/device-controls";
import type { DeviceView, ThingModel } from "../services/models";

const device: DeviceView = {
  deviceNickname: "test",
  bindingRole: "sa",
  bindingAt: "",
  device: { id: "dev_666666" },
  product: { id: "prd_100" },
};
const model: ThingModel = {
  version: "tm_1",
  attributes: [
    { identifier: "Power", type: "enum", writable: true, values: ["on", "off"] },
    { identifier: "ChildLock", type: "boolean", writable: true },
    { identifier: "Online", type: "enum", writable: false, values: ["online", "offline"] },
  ],
  services: [],
  events: [],
};

describe("V1.6 deployment registration", () => {
  it("registers development product controls without maintenance or event mappings", () => {
    const config = communicationConfig({
      environment: "development",
      apiBaseUrl: "https://api.example.test",
      integrationProfile: "rowan-v16-shadow",
    });
    const { contracts } = registeredIntegration(config, deploymentIntegrations);
    expect(contracts.realtime).toBeTypeOf("function");
    expect(contracts.realtimeModelOptional).toBe(true);
    expect(contracts.controls).toBeTypeOf("function");
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
    expect(contracts.controls).toBeTypeOf("function");
  });
  it.each(["rowan-v16-shadow", "rowan-ble-dual"])(
    "%s controls only the confirmed test product and enforces roles and lock state",
    async (integrationProfile) => {
      const { contracts } = registeredIntegration(
        communicationConfig({
          environment: "development",
          apiBaseUrl: "https://api.example.test",
          integrationProfile,
        }),
        deploymentIntegrations,
      );
      const signal = new AbortController().signal;
      const context = { deviceID: device.device.id, userID: "146", device, model };
      const sync = await contracts.realtime!(context, signal);
      const bindings = await contracts.controls!(context, signal);
      expect(sync.canWrite).toBe(true);
      expect(sync.online?.({ Online: "online" })).toBe(true);
      const sent: unknown[] = [];
      const state = {
        ready: true,
        sending: false,
        canWrite: sync.canWrite,
        confirmed: { Power: "on", ChildLock: false },
      };
      for (const role of ["sa", "mbr", "obs"] as const) {
        const controls = new PropertyControls(
          model,
          bindings,
          role,
          () => state,
          async (values) => {
            sent.push(sync.command!(values, "test-command"));
          },
        );
        expect(controls.list().map((entry) => entry.kind)).toEqual(["power"]);
        if (role === "obs")
          await expect(controls.command({ Power: "off" })).rejects.toThrow("权限");
        else await controls.command({ Power: "off" });
        state.confirmed.ChildLock = true;
        await expect(controls.command({ Power: "off" })).rejects.toThrow();
        state.confirmed.ChildLock = false;
        await expect(controls.command({ TargetTemp: 14 })).rejects.toThrow();
      }
      expect(sent).toHaveLength(2);
      const publication = sent[0] as { topic: string; payload: Uint8Array };
      expect(publication.topic).toBe("$aws/things/dev_666666/shadow/update");
      expect(JSON.parse(new TextDecoder().decode(publication.payload))).toEqual({
        state: {
          desired: { EnduserId: "146", DeviceId: "dev_666666", CommandType: "app", Power: "off" },
        },
        clientToken: "test-command",
      });
      for (const changed of [
        { device: { ...device, product: { id: "other" } }, model },
        { device, model: { ...model, version: "tm_2" } },
        {
          device,
          model: {
            ...model,
            attributes: model.attributes.filter((a) => a.identifier !== "ChildLock"),
          },
        },
        {
          device,
          model: {
            ...model,
            attributes: model.attributes.map((a) =>
              a.identifier === "Power" ? { ...a, values: ["1", "0"] } : a,
            ),
          },
        },
      ]) {
        const other = { ...context, ...changed };
        await expect(contracts.controls!(other, signal)).rejects.toThrow();
        expect((await contracts.realtime!(other, signal)).canWrite).toBe(false);
      }
    },
  );
});

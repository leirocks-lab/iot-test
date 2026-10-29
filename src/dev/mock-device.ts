import type { DeviceSession } from "../protocol/device-session";
import type { ControlKind, ControlView } from "../services/device-controls";
import type { DeviceView, HomeGroup } from "../services/models";

export const mockDeviceView = (id: string): DeviceView => ({
  deviceNickname: "酒柜",
  online: true,
  bindingRole: "sa",
  bindingAt: "2026-01-01T00:00:00.000Z",
  device: {
    id: id || "mock-device",
    name: "酒柜",
    mac: "00:11:22:33:44:55",
    thingName: "mock-wine-cabinet",
    productID: "mock-wine-cabinet-product",
    mcuVersion: "1.0.0",
    wifiVersion: "1.0.0",
    activatedAt: "2026-01-01T00:00:00.000Z",
    online: true,
    protocol: "55AA",
    shadowVersion: 1,
  },
  product: {
    id: "mock-wine-cabinet-product",
    name: "酒柜",
    category: "refrigerator",
    seriesName: "Rowan Home",
    modelName: "RW-WINE-01",
    image: "",
    buyLink: "",
  },
});

export const mockHomeGroups = (): HomeGroup[] => [
  { room: null, devices: [mockDeviceView("mock-device")] },
];

const attributes = {
  power: { identifier: "power", type: "boolean" as const, writable: true },
  childLock: { identifier: "childLock", type: "boolean" as const, writable: true },
  light: { identifier: "light", type: "boolean" as const, writable: true },
  temperature: {
    identifier: "temperature",
    type: "number" as const,
    writable: true,
    min: 0,
    max: 40,
    step: 1,
    unit: "C",
  },
};

export function createMockDeviceSession(): DeviceSession {
  const values: Record<string, number | boolean> = {
    power: true,
    childLock: false,
    light: false,
    temperature: 13,
  };
  const listeners = new Set<() => void>();
  const views: ControlView[] = [
    { kind: "power", attribute: attributes.power, variant: "switch", reason: "", value: true },
    {
      kind: "childLock",
      attribute: attributes.childLock,
      variant: "switch",
      reason: "",
      value: false,
    },
    { kind: "light", attribute: attributes.light, variant: "switch", reason: "", value: false },
    {
      kind: "temperature",
      attribute: attributes.temperature,
      variant: "number",
      reason: "",
      value: 13,
    },
  ];
  const notify = () => listeners.forEach((listener) => listener());
  const controls = {
    list: () => views.map((view) => ({ ...view, value: values[view.attribute.identifier] })),
    isOn: (kind: ControlKind) => {
      const value = values[kind];
      return typeof value === "boolean" ? value : undefined;
    },
    toggle: async (kind: ControlKind) => {
      if (typeof values[kind] === "boolean") {
        values[kind] = !values[kind];
        notify();
      }
    },
    submit: async (kind: ControlKind, input: string) => {
      const value = Number(input);
      if (kind === "temperature" && Number.isFinite(value)) {
        values.temperature = Math.max(0, Math.min(40, value));
        notify();
      }
    },
  } as unknown as DeviceSession["controls"];
  return {
    confirmed: values,
    ready: true,
    sending: false,
    connected: true,
    online: true,
    error: "",
    canWrite: true,
    controls,
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    connect: async () => undefined,
    command: async (properties) => {
      Object.assign(values, properties);
      notify();
    },
    close: () => listeners.clear(),
  };
}

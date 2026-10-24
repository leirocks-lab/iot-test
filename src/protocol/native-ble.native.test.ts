import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLE_0822 } from "./ble-0822";
import { NativeRadio } from "./native-ble.native";

const fixture = vi.hoisted(() => ({
  writes: vi.fn(async () => undefined),
  cancelled: vi.fn(async () => undefined),
}));
vi.mock("react-native", () => ({
  Platform: { OS: "android", Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: "location",
      BLUETOOTH_SCAN: "scan",
      BLUETOOTH_CONNECT: "connect",
    },
    RESULTS: { GRANTED: "granted" },
    requestMultiple: vi.fn(async () => ({
      location: "granted",
      scan: "granted",
      connect: "granted",
    })),
  },
}));
vi.mock("react-native-ble-plx", () => {
  const device = {
    mtu: 247,
    discoverAllServicesAndCharacteristics: vi.fn(async () => device),
    characteristicsForService: vi.fn(async () => [
      { uuid: BLE_0822.write, isWritableWithResponse: true, isWritableWithoutResponse: false },
      { uuid: BLE_0822.notify, isNotifiable: true, isIndicatable: false },
    ]),
    onDisconnected: vi.fn(() => ({ remove: vi.fn() })),
    monitorCharacteristicForService: vi.fn(() => ({ remove: vi.fn() })),
    writeCharacteristicWithResponseForService: fixture.writes,
  };
  return {
    BleManager: class {
      setLogLevel = vi.fn(async () => undefined);
      state = vi.fn(async () => "PoweredOn");
      connectToDevice = vi.fn(async () => device);
      cancelDeviceConnection = fixture.cancelled;
    },
    LogLevel: { None: "None" },
    State: { PoweredOn: "PoweredOn", PoweredOff: "PoweredOff", Unauthorized: "Unauthorized" },
  };
});

beforeEach(() => {
  vi.stubGlobal("__DEV__", false);
  fixture.writes.mockClear();
  fixture.cancelled.mockClear();
});
describe("原生 BLE 会话取消信号", () => {
  it("keeps an established channel writable after its connection budget ends", async () => {
    const radio = new NativeRadio(),
      connectionBudget = new AbortController();
    const channel = await radio.connect(
      "device-handle",
      () => undefined,
      () => undefined,
      connectionBudget.signal,
    );
    connectionBudget.abort();
    const currentWrite = new AbortController();
    await channel.write(new Uint8Array([0xa5, 0x5a, 1, 0, 0]), currentWrite.signal);
    expect(fixture.writes).toHaveBeenCalledOnce();
    currentWrite.abort();
    await expect(channel.write(new Uint8Array([1]), currentWrite.signal)).rejects.toMatchObject({
      code: 499,
    });
    await channel.close();
    await expect(channel.write(new Uint8Array([1]))).rejects.toMatchObject({ code: 499 });
  });
});

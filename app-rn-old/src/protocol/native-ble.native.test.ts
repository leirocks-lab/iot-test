import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLE_0822 } from "./ble-0822";
import { BLE_0922 } from "./ble-0922";
import { NativeRadio } from "./native-ble.native";

const fixture = vi.hoisted(() => ({
  writes: vi.fn(async () => undefined),
  cancelled: vi.fn(async () => undefined),
  scanStarted: vi.fn(async () => undefined),
  scanStopped: vi.fn(async () => undefined),
  connects: vi.fn(),
  events: [] as string[],
  connectFailures: [] as unknown[],
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
      startDeviceScan = fixture.scanStarted;
      stopDeviceScan = vi.fn(async () => {
        fixture.events.push("stopScan");
        await fixture.scanStopped();
      });
      connectToDevice = vi.fn(async () => {
        fixture.events.push("connect");
        fixture.connects();
        const failure = fixture.connectFailures.shift();
        if (failure) throw failure;
        return device;
      });
      cancelDeviceConnection = vi.fn(async () => {
        fixture.events.push("cancel");
        await fixture.cancelled();
      });
    },
    LogLevel: { None: "None" },
    ScanMode: { LowLatency: 2 },
    State: { PoweredOn: "PoweredOn", PoweredOff: "PoweredOff", Unauthorized: "Unauthorized" },
  };
});

beforeEach(() => {
  vi.stubGlobal("__DEV__", false);
  fixture.writes.mockClear();
  fixture.cancelled.mockClear();
  fixture.scanStarted.mockClear();
  fixture.scanStopped.mockClear();
  fixture.connects.mockClear();
  fixture.events.length = 0;
  fixture.connectFailures.length = 0;
});
describe("原生 BLE 会话取消信号", () => {
  it("uses a foreground low-latency Android scan and stops scanning before connecting", async () => {
    const radio = new NativeRadio();
    await radio.startScan(() => undefined);
    expect(fixture.scanStarted).toHaveBeenCalledWith(
      [BLE_0822.service, BLE_0922.service],
      { allowDuplicates: true, scanMode: 2 },
      expect.any(Function),
    );
    const channel = await radio.connect(
      "device-handle",
      () => undefined,
      () => undefined,
    );
    expect(fixture.events.slice(0, 2)).toEqual(["stopScan", "connect"]);
    await channel.close();
  });

  it("retries only a transient Android initial GATT connection failure before any write", async () => {
    const radio = new NativeRadio();
    fixture.connectFailures.push({ androidErrorCode: 62 });
    const channel = await radio.connect(
      "device-handle",
      () => undefined,
      () => undefined,
    );
    expect(fixture.events.slice(0, 4)).toEqual(["stopScan", "connect", "cancel", "connect"]);
    expect(fixture.writes).not.toHaveBeenCalled();
    await channel.close();

    fixture.events.length = 0;
    fixture.connectFailures.push({ androidErrorCode: 8 });
    await expect(
      radio.connect(
        "device-handle",
        () => undefined,
        () => undefined,
      ),
    ).rejects.toMatchObject({ code: 65 });
    expect(fixture.events.filter((event) => event === "connect")).toHaveLength(1);
  });

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

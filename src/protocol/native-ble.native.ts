import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";
import {
  BleManager,
  LogLevel,
  ScanMode,
  State,
  type Device,
  type Subscription,
} from "react-native-ble-plx";
import { ApiError } from "../services/models";
import { BLE_0822 } from "./ble-0822";
import { BLE_0922 } from "./ble-0922";
import { Ble0822DeviceTransport, type BleConnection, type BleRadio } from "./ble-radio";

export class NativeRadio implements BleRadio {
  private manager = new BleManager();
  private sequence = 0;
  async ready() {
    if (Platform.OS === "android") {
      const permissions = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      if (Number(Platform.Version) >= 31)
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
      const grants = await PermissionsAndroid.requestMultiple(permissions);
      if (
        permissions.some((permission) => grants[permission] !== PermissionsAndroid.RESULTS.GRANTED)
      )
        throw new ApiError(403, "蓝牙权限未授权");
    }
    await this.manager.setLogLevel(LogLevel.None);
    const state = await this.manager.state();
    if (state === State.Unauthorized) throw new ApiError(403, "蓝牙权限未授权");
    if (state === State.PoweredOff) throw new ApiError(61, "蓝牙已关闭");
    if (state !== State.PoweredOn) throw new ApiError(503, "蓝牙尚未就绪，请稍后重试");
  }
  async startScan(listener: Parameters<BleRadio["startScan"]>[0]) {
    await this.manager.startDeviceScan(
      [BLE_0822.service, BLE_0922.service],
      {
        allowDuplicates: true,
        ...(Platform.OS === "android" ? { scanMode: ScanMode.LowLatency } : {}),
      },
      (error, device) => {
        if (error) {
          listener(new ApiError(65, "蓝牙扫描失败"));
          return;
        }
        if (!device?.manufacturerData) return;
        listener(null, {
          handle: device.id,
          manufacturer: new Uint8Array(Buffer.from(device.manufacturerData, "base64")),
          services: device.serviceUUIDs ?? [],
          ...(device.rssi !== null ? { rssi: device.rssi } : {}),
        });
      },
    );
  }
  stopScan() {
    return this.manager.stopDeviceScan();
  }
  async connect(
    handle: string,
    onBytes: (data: Uint8Array) => void,
    onDisconnect: (error: Error) => void,
    signal?: AbortSignal,
    service = BLE_0822.service,
  ): Promise<BleConnection> {
    if (service !== BLE_0822.service && service !== BLE_0922.service)
      throw new ApiError(503, "设备广播服务UUID不受支持");
    let device: Device | undefined,
      monitor: Subscription | undefined,
      disconnect: Subscription | undefined,
      closed = false;
    let stage = "connect";
    const close = async () => {
      if (closed) return;
      closed = true;
      monitor?.remove();
      disconnect?.remove();
      await this.manager.cancelDeviceConnection(handle).catch(() => undefined);
    };
    const abort = () => {
      void close();
    };
    signal?.addEventListener("abort", abort, { once: true });
    const check = () => {
      if (closed || signal?.aborted) throw new ApiError(499, "蓝牙连接已停止");
    };
    const checkWrite = (writeSignal?: AbortSignal) => {
      if (closed) throw new ApiError(499, "蓝牙连接已停止");
      if (writeSignal?.aborted) throw new ApiError(499, "蓝牙写入已停止");
    };
    try {
      check();
      // Android may still be finishing the discovery scan when the user selects a device.
      await this.manager.stopDeviceScan().catch(() => undefined);
      check();
      const options = { timeout: 15000, requestMTU: 517 };
      try {
        device = await this.manager.connectToDevice(handle, options);
      } catch (error) {
        const androidCode = (error as { androidErrorCode?: unknown })?.androidErrorCode;
        if (Platform.OS !== "android" || ![62, 133].includes(Number(androidCode))) throw error;
        // Retry only a failed initial link. No provisioning bytes have been written yet.
        await this.manager.cancelDeviceConnection(handle).catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 500));
        check();
        device = await this.manager.connectToDevice(handle, options);
      }
      if (closed || signal?.aborted) {
        await this.manager.cancelDeviceConnection(handle).catch(() => undefined);
        throw new ApiError(499, "蓝牙连接已停止");
      }
      stage = "discover";
      check();
      device = await device.discoverAllServicesAndCharacteristics();
      check();
      stage = "characteristics";
      const characteristics = await device.characteristicsForService(service);
      check();
      const writable = characteristics.find((c) => c.uuid.toLowerCase() === BLE_0822.write);
      const notify = characteristics.find((c) => c.uuid.toLowerCase() === BLE_0822.notify);
      if (
        !writable ||
        !notify ||
        (!notify.isNotifiable && !notify.isIndicatable) ||
        (!writable.isWritableWithResponse && !writable.isWritableWithoutResponse)
      )
        throw new ApiError(503, "设备GATT能力尚未确认");
      disconnect = device.onDisconnected((error) => {
        if (!closed) {
          if (__DEV__)
            console.warn("BLE disconnected", {
              errorCode: error?.errorCode ?? null,
              androidErrorCode: error?.androidErrorCode ?? null,
            });
          void close();
          onDisconnect(new ApiError(65, "蓝牙连接已断开"));
        }
      });
      monitor = device.monitorCharacteristicForService(
        service,
        BLE_0822.notify,
        (error, characteristic) => {
          if (closed) return;
          if (error) {
            if (__DEV__)
              console.warn("BLE notify failed", {
                errorCode: error.errorCode,
                attErrorCode: error.attErrorCode,
                androidErrorCode: error.androidErrorCode,
              });
            void close();
            onDisconnect(new ApiError(65, "蓝牙通知已中断"));
            return;
          }
          if (characteristic?.value)
            onBytes(new Uint8Array(Buffer.from(characteristic.value, "base64")));
        },
      );
      const connected = device;
      return {
        mtu: connected.mtu,
        close,
        write: async (frame, writeSignal) => {
          checkWrite(writeSignal);
          if (frame.length > connected.mtu - 3)
            throw new ApiError(503, "设备MTU不足，长写规则尚未提供");
          const transaction = `rowan-write-${++this.sequence}`;
          const cancel = () => {
            void this.manager.cancelTransaction(transaction).catch(() => undefined);
          };
          writeSignal?.addEventListener("abort", cancel, { once: true });
          try {
            const payload = Buffer.from(frame).toString("base64");
            if (writable.isWritableWithResponse)
              await connected.writeCharacteristicWithResponseForService(
                service,
                BLE_0822.write,
                payload,
                transaction,
              );
            else
              await connected.writeCharacteristicWithoutResponseForService(
                service,
                BLE_0822.write,
                payload,
                transaction,
              );
            checkWrite(writeSignal);
          } catch (error) {
            if (error instanceof ApiError) throw error;
            if (__DEV__) {
              const failure = error as {
                errorCode?: unknown;
                attErrorCode?: unknown;
                androidErrorCode?: unknown;
              };
              console.warn("BLE write failed", {
                errorCode: typeof failure?.errorCode === "number" ? failure.errorCode : null,
                attErrorCode:
                  typeof failure?.attErrorCode === "number" ? failure.attErrorCode : null,
                androidErrorCode:
                  typeof failure?.androidErrorCode === "number" ? failure.androidErrorCode : null,
                frameLength: frame.length,
                mtu: connected.mtu,
                withResponse: writable.isWritableWithResponse,
              });
            }
            throw new ApiError(65, "蓝牙参数写入失败");
          } finally {
            writeSignal?.removeEventListener("abort", cancel);
          }
        },
      };
    } catch (error) {
      if (__DEV__ && error instanceof ApiError && error.code === 499)
        console.warn("BLE connect stopped", {
          stage,
          closed,
          signalAborted: signal?.aborted === true,
        });
      if (__DEV__ && !(error instanceof ApiError)) {
        const failure = error as {
          errorCode?: unknown;
          attErrorCode?: unknown;
          androidErrorCode?: unknown;
        };
        console.warn("BLE connect failed", {
          stage,
          errorCode: typeof failure?.errorCode === "number" ? failure.errorCode : null,
          attErrorCode: typeof failure?.attErrorCode === "number" ? failure.attErrorCode : null,
          androidErrorCode:
            typeof failure?.androidErrorCode === "number" ? failure.androidErrorCode : null,
        });
      }
      await close();
      if (signal?.aborted) throw new ApiError(499, "蓝牙连接已停止");
      if (error instanceof ApiError) throw error;
      throw new ApiError(65, "蓝牙连接或GATT发现失败");
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }
  async dispose() {
    await this.manager.stopDeviceScan().catch(() => undefined);
    await this.manager.destroy();
  }
}
export async function createNativeBleTransport() {
  return new Ble0822DeviceTransport(new NativeRadio());
}

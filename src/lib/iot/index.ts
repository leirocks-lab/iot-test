export type DeviceId = string;

export interface DeviceStatus {
  readonly deviceId: DeviceId;
  readonly online: boolean;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly updatedAt: string;
}

export interface DeviceCommand {
  readonly name: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface DeviceStatusSubscription {
  unsubscribe(): void;
}

export interface IoTClient {
  discoverDevices(): Promise<readonly DeviceStatus[]>;
  sendCommand(deviceId: DeviceId, command: DeviceCommand): Promise<void>;
  subscribeToStatus(
    deviceId: DeviceId,
    listener: (status: DeviceStatus) => void,
  ): DeviceStatusSubscription;
}

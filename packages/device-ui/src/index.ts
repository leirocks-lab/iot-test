import type { DeviceCommand, DeviceId, DeviceStatus } from '@rowan/iot-sdk';

export interface DeviceControlProps {
  readonly deviceId: DeviceId;
  readonly status: DeviceStatus;
  readonly disabled?: boolean;
  readonly onCommand: (command: DeviceCommand) => Promise<void> | void;
}

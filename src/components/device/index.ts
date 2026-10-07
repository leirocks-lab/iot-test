import type { DeviceCommand, DeviceId, DeviceStatus } from '../../lib/iot';

export interface DeviceControlProps {
  readonly deviceId: DeviceId;
  readonly status: DeviceStatus;
  readonly disabled?: boolean;
  readonly onCommand: (command: DeviceCommand) => Promise<void> | void;
}

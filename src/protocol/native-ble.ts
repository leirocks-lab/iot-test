import { UnavailableDeviceTransport, type DeviceTransport } from './device';
export async function createNativeBleTransport():Promise<DeviceTransport> {
  return new UnavailableDeviceTransport();
}

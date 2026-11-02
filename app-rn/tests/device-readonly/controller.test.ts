import {describe, expect, it, vi} from 'vitest';
import {
  DeviceReadController,
  type DeviceReadHost,
  type DeviceReadBinding,
} from '../../src/host/adapter/DeviceReadController';
import type {
  DeviceScheduleSummary,
  DeviceFirmwareOffer,
} from '../../src/host/specs/NativeRowanHost';
const binding: DeviceReadBinding = {
  deviceId: 'device-a',
  observationId: 'observer-a',
  sessionRevision: 7,
};
const schedule = (itemKey = 'item-1'): DeviceScheduleSummary => ({
  itemKey,
  name: '云端定时',
  type: 'periodic',
  startTime: '09:30',
  repeatType: 'custom',
  weekdays: [1, 7],
  timeZone: 'Asia/Shanghai',
  nextExecutionAt: 'opaque-server-time',
  enabledState: 'unknown',
});
const firmware = (kind = 'mcu'): DeviceFirmwareOffer => ({
  kind,
  version: '2.3.4',
  remark: '真实候选说明',
  deviceName: '原生设备名称',
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return {promise, resolve, reject};
}
async function settle() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}
function fixture() {
  const schedules = deferred<DeviceScheduleSummary[]>(),
    mcu = deferred<DeviceFirmwareOffer>(),
    wifi = deferred<DeviceFirmwareOffer>();
  const host: DeviceReadHost = {
    getDeviceMoreSummary: vi.fn(),
    getDeviceMembers: vi.fn(),
    getDeviceHelp: vi.fn(),
    getDeviceLocation: vi.fn(),
    getDeviceSchedules: vi.fn(() => schedules.promise),
    getDeviceFirmware: vi.fn((_, kind) =>
      kind === 'mcu' ? mcu.promise : wifi.promise,
    ),
  };
  const changed = vi.fn();
  const controller = new DeviceReadController(host, changed);
  return {host, schedules, mcu, wifi, changed, controller};
}
describe('observation-bound read-only pages', () => {
  it('uses the observation handle and publishes an explicitly empty list', async () => {
    const f = fixture();
    f.controller.show({feature: 'schedules'}, binding);
    expect(f.host.getDeviceSchedules).toHaveBeenCalledExactlyOnceWith(
      'observer-a',
    );
    expect(f.controller.state.phase).toBe('loading');
    f.schedules.resolve([]);
    await settle();
    expect(f.controller.state.phase).toBe('ready');
    expect(f.controller.state.schedules).toEqual([]);
  });
  it('deduplicates unchanged page/binding and ignores retry while loading', async () => {
    const f = fixture();
    f.controller.show({feature: 'schedules'}, binding);
    f.controller.show({feature: 'schedules'}, {...binding});
    f.controller.retry();
    expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(1);
    f.schedules.resolve([schedule()]);
    await settle();
    f.controller.retry();
    await settle();
    expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(2);
  });
  it('serializes rapid kind switches, ignores MCU response and reads the latest Wi-Fi page', async () => {
    const f = fixture();
    f.controller.show({feature: 'firmware', kind: 'mcu'}, binding);
    f.controller.show({feature: 'firmware', kind: 'wifi'}, binding);
    expect(f.host.getDeviceFirmware).toHaveBeenCalledTimes(1);
    f.mcu.resolve(firmware());
    await settle();
    expect(f.host.getDeviceFirmware).toHaveBeenLastCalledWith(
      'observer-a',
      'wifi',
    );
    expect(f.controller.state.firmware).toBeUndefined();
    f.wifi.resolve(firmware('wifi'));
    await settle();
    expect(f.controller.state.firmware?.kind).toBe('wifi');
  });
  it('retains only the latest queued destination rather than issuing every intermediate page', async () => {
    const f = fixture();
    f.controller.show({feature: 'firmware', kind: 'mcu'}, binding);
    f.controller.show({feature: 'schedules'}, binding);
    f.controller.show({feature: 'firmware', kind: 'wifi'}, binding);
    f.mcu.resolve(firmware());
    await settle();
    expect(f.host.getDeviceSchedules).not.toHaveBeenCalled();
    expect(f.host.getDeviceFirmware).toHaveBeenCalledTimes(2);
  });
  it('clears data and isolates a replaced account/device/observation before its late result', async () => {
    const f = fixture();
    const next = deferred<DeviceScheduleSummary[]>();
    vi.mocked(f.host.getDeviceSchedules)
      .mockReturnValueOnce(f.schedules.promise)
      .mockReturnValueOnce(next.promise);
    f.controller.show({feature: 'schedules'}, binding);
    f.controller.show(
      {feature: 'schedules'},
      {deviceId: 'device-b', observationId: 'observer-b', sessionRevision: 8},
    );
    f.schedules.resolve([schedule('old')]);
    await settle();
    expect(f.controller.state.schedules).toBeUndefined();
    expect(f.host.getDeviceSchedules).toHaveBeenLastCalledWith('observer-b');
    next.resolve([schedule('new')]);
    await settle();
    expect(f.controller.state.schedules?.[0].itemKey).toBe('new');
  });
  it('closing a subpage invalidates an already pending response', async () => {
    const f = fixture();
    f.controller.show({feature: 'schedules'}, binding);
    f.controller.hide();
    f.schedules.resolve([schedule()]);
    await settle();
    expect(f.controller.state.phase).toBe('idle');
    expect(f.controller.state.schedules).toBeUndefined();
    expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(1);
  });
  it('disposing is idempotent and late rejections cannot notify or restart work', async () => {
    const f = fixture();
    f.controller.show({feature: 'schedules'}, binding);
    f.controller.dispose();
    f.controller.dispose();
    const calls = f.changed.mock.calls.length;
    f.schedules.reject(new Error('private raw failure'));
    await settle();
    f.controller.retry();
    f.controller.show({feature: 'firmware', kind: 'mcu'}, binding);
    expect(f.changed).toHaveBeenCalledTimes(calls);
    expect(f.host.getDeviceFirmware).not.toHaveBeenCalled();
  });
  it('background invalidates pending data and foreground refreshes once without overlapping native calls', async () => {
    const f = fixture();
    const fresh = deferred<DeviceScheduleSummary[]>();
    vi.mocked(f.host.getDeviceSchedules)
      .mockReturnValueOnce(f.schedules.promise)
      .mockReturnValueOnce(fresh.promise);
    f.controller.show({feature: 'schedules'}, binding);
    f.controller.setForeground(false);
    f.controller.setForeground(true);
    expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(1);
    f.schedules.resolve([schedule('background-old')]);
    await settle();
    expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(2);
    expect(f.controller.state.schedules).toBeUndefined();
    fresh.resolve([schedule('foreground')]);
    await settle();
    expect(f.controller.state.schedules?.[0].itemKey).toBe('foreground');
  });
  it('does not create native calls when opened in background', async () => {
    const f = fixture();
    f.controller.setForeground(false);
    f.controller.show({feature: 'schedules'}, binding);
    expect(f.host.getDeviceSchedules).not.toHaveBeenCalled();
    f.controller.setForeground(true);
    expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(1);
  });
  it('sanitizes failures and supports only an explicit safe GET retry', async () => {
    const f = fixture();
    vi.mocked(f.host.getDeviceSchedules)
      .mockRejectedValueOnce(new Error('Bearer private-url'))
      .mockResolvedValueOnce([schedule()]);
    f.controller.show({feature: 'schedules'}, binding);
    await settle();
    expect(f.controller.state.error).toBe('UNAVAILABLE');
    expect(JSON.stringify(f.controller.state)).not.toContain('private');
    f.controller.retry();
    await settle();
    expect(f.controller.state.phase).toBe('ready');
  });
  it('permission or closed-handle errors stop retry rather than presenting cached data', async () => {
    for (const code of [
      'forbidden',
      'session_changed',
      'closed',
      'not_authenticated',
    ]) {
      const f = fixture();
      vi.mocked(f.host.getDeviceSchedules).mockRejectedValue({
        code,
        message: 'raw private detail',
      });
      f.controller.show({feature: 'schedules'}, binding);
      await settle();
      expect(['FORBIDDEN', 'EXPIRED']).toContain(f.controller.state.error);
      f.controller.retry();
      expect(f.host.getDeviceSchedules).toHaveBeenCalledTimes(1);
      expect(f.controller.state.schedules).toBeUndefined();
    }
  });
  it('contains a synchronous detached-module throw', () => {
    const f = fixture();
    vi.mocked(f.host.getDeviceSchedules).mockImplementation(() => {
      throw new Error('private native exception');
    });
    expect(() =>
      f.controller.show({feature: 'schedules'}, binding),
    ).not.toThrow();
    expect(f.controller.state.error).toBe('UNAVAILABLE');
  });
  it('rejects malformed rows or duplicate local display keys instead of making them an empty list', async () => {
    for (const rows of [
      [schedule(), schedule()],
      [{...schedule(), weekdays: [0]}],
      [{...schedule(), name: undefined}],
    ]) {
      const f = fixture();
      vi.mocked(f.host.getDeviceSchedules).mockResolvedValue(
        rows as DeviceScheduleSummary[],
      );
      f.controller.show({feature: 'schedules'}, binding);
      await settle();
      expect(f.controller.state.error).toBe('INVALID_RESPONSE');
      expect(f.controller.state.schedules).toBeUndefined();
    }
  });
  it('projects only contract fields and detaches mutable native arrays', async () => {
    const f = fixture();
    const source = {
      ...schedule(),
      action: {private: 'hidden'},
      mode: 'private-mode',
    };
    f.controller.show({feature: 'schedules'}, binding);
    f.schedules.resolve([source]);
    await settle();
    source.weekdays.push(5);
    expect(f.controller.state.schedules?.[0].weekdays).toEqual([1, 7]);
    expect(JSON.stringify(f.controller.state)).not.toContain('private');
  });
  it('rejects a firmware response for the other kind and never invents currentVersion', async () => {
    const f = fixture();
    f.controller.show({feature: 'firmware', kind: 'mcu'}, binding);
    f.mcu.resolve(firmware('wifi'));
    await settle();
    expect(f.controller.state.error).toBe('INVALID_RESPONSE');
    expect(f.controller.state.firmware).toBeUndefined();
  });
  it('does not dispatch for missing/invalid observation context', () => {
    for (const value of [
      {...binding, observationId: ''},
      {...binding, sessionRevision: NaN},
      {...binding, deviceId: ''},
    ]) {
      const f = fixture();
      f.controller.show({feature: 'schedules'}, value);
      expect(f.host.getDeviceSchedules).not.toHaveBeenCalled();
      expect(f.controller.state.error).toBe('EXPIRED');
    }
  });
});

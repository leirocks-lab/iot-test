import {describe, expect, it} from 'vitest';
import {
  readBindingFromSession,
  scheduleLabels,
  firmwareLabels,
} from '../../src/features/device-readonly/presentation';
import type {DeviceSnapshot} from '../../src/host/specs/NativeRowanHost';
const snapshot: DeviceSnapshot = {
  deviceId: 'a',
  observationId: 'o',
  sessionRevision: 7,
  revision: 2,
  authorityRevision: 8,
  connectionEpoch: 1,
  title: '设备',
  productCategory: '',
  phase: 'failed',
  online: 'unknown',
  stale: true,
  snapshotAvailable: false,
  errorCode: 'unavailable',
};
describe('read-only presentation boundaries', () => {
  it('allows cloud metadata reads while device online is unknown without treating it as an online permit', () => {
    expect(
      readBindingFromSession(
        {loading: false, resyncing: false, error: '', snapshot},
        'a',
      ),
    ).toEqual({deviceId: 'a', observationId: 'o', sessionRevision: 7});
  });
  it('refuses missing, closed, wrong-device and forbidden observation contexts', () => {
    expect(
      readBindingFromSession({loading: true, resyncing: false, error: ''}, 'a'),
    ).toBeUndefined();
    for (const patch of [
      {deviceId: 'b'},
      {phase: 'closed'},
      {errorCode: 'forbidden'},
      {errorCode: 'session_changed'},
    ]) {
      expect(
        readBindingFromSession(
          {
            loading: false,
            resyncing: false,
            error: '',
            snapshot: {...snapshot, ...patch},
          },
          'a',
        ),
      ).toBeUndefined();
    }
  });
  it('displays unknown values and the exact server nextExecutionAt instead of computing a date', () => {
    const value = scheduleLabels({
      itemKey: 'local',
      name: '',
      type: 'unknown',
      startTime: '',
      repeatType: 'unknown',
      weekdays: [],
      timeZone: '',
      nextExecutionAt: 'opaque-server-time',
      enabledState: 'unknown',
    });
    expect(value.name).toBe('未命名定时');
    expect(value.enabled).toBe('状态未知');
    expect(value.startTime).toBe('未提供');
    expect(value.weekdays).toBe('星期未提供');
    expect(value.nextExecutionAt).toBe('opaque-server-time');
  });
  it('uses available firmware wording and never substitutes a current or latest device version', () => {
    const value = firmwareLabels({
      kind: 'mcu',
      version: '',
      remark: '',
      deviceName: '',
    });
    expect(value.version).toBe('未提供可用版本');
    expect(value.remark).toBe('暂无固件说明');
    expect(JSON.stringify(value)).not.toContain('最新版');
  });
});

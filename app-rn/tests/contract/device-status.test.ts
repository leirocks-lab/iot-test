import {describe, expect, it} from 'vitest';
import {deviceStatus} from '../../src/entry/deviceStatus';
import type {DeviceSessionState} from '../../src/host/adapter/DeviceSessionController';
const base: DeviceSessionState = {
  loading: false,
  resyncing: false,
  error: '',
  snapshot: {
    deviceId: 'a',
    observationId: 'o',
    sessionRevision: 1,
    revision: 1,
    authorityRevision: 1,
    connectionEpoch: 1,
    title: '原生设备标题',
    productCategory: '',
    phase: 'live',
    online: 'online',
    stale: false,
    snapshotAvailable: true,
    errorCode: '',
  },
};
describe('read-only device status presentation', () => {
  it('uses native title and distinguishes unknown from offline', () => {
    expect(deviceStatus(base).title).toBe('原生设备标题');
    expect(deviceStatus(base).message).toContain('在线');
    expect(
      deviceStatus({...base, snapshot: {...base.snapshot!, online: 'unknown'}})
        .message,
    ).toContain('未知');
    expect(
      deviceStatus({...base, snapshot: {...base.snapshot!, online: 'offline'}})
        .message,
    ).toContain('离线');
  });
  it('does not present cached online as current after connection loss', () => {
    const value = deviceStatus({
      ...base,
      snapshot: {...base.snapshot!, phase: 'recovering', stale: true},
    });
    expect(value.message).toContain('连接已断开');
    expect(value.message).not.toContain('设备在线');
    expect(value.canRetry).toBe(true);
  });
  it('does not expose raw codes or enable retry on permission errors', () => {
    const value = deviceStatus({
      ...base,
      snapshot: {...base.snapshot!, phase: 'failed', errorCode: 'forbidden'},
    });
    expect(value.message).toContain('权限');
    expect(value.canRetry).toBe(false);
    expect(value.message).not.toContain('forbidden');
  });
  it('handles loading, missing snapshots, invalid host and resync without inventing status', () => {
    expect(
      deviceStatus({loading: true, resyncing: false, error: ''}).busy,
    ).toBe(true);
    expect(deviceStatus({...base, snapshot: undefined}).message).toContain(
      '暂无',
    );
    expect(deviceStatus({...base, error: 'INCOMPATIBLE_HOST'}).canRetry).toBe(
      false,
    );
    expect(deviceStatus({...base, resyncing: true}).message).toContain('同步');
  });
});

import {describe, expect, it} from 'vitest';
import type {DeviceSnapshot} from '../../src/host/specs/NativeRowanHost';
import {DeviceObservation} from '../../src/host/adapter/DeviceObservation';

const snapshot: DeviceSnapshot = {
  deviceId: 'a',
  observationId: 'o1',
  sessionRevision: 1,
  revision: 3,
  authorityRevision: 3,
  connectionEpoch: 1,
  title: '设备',
  productCategory: '',
  phase: 'live',
  online: 'online',
  stale: false,
  snapshotAvailable: true,
  errorCode: '',
};
describe('device observation handoff', () => {
  it('applies a buffered newer event after the snapshot arrives', () => {
    const state = new DeviceObservation('a', 1);
    state.receive({...snapshot, revision: 4, online: 'offline'});
    expect(state.install(snapshot).online).toBe('offline');
  });
  it('rejects other devices, observations and previous sessions', () => {
    const state = new DeviceObservation('a', 1);
    state.install(snapshot);
    for (const event of [
      {...snapshot, deviceId: 'b'},
      {...snapshot, observationId: 'o2'},
      {...snapshot, sessionRevision: 2},
    ]) {
      state.receive({...event, revision: 4, online: 'offline'});
    }
    expect(state.current?.online).toBe('online');
  });
  it('ignores duplicate and stale revisions and invalidates released observations', () => {
    const state = new DeviceObservation('a', 1);
    state.install(snapshot);
    state.receive({...snapshot, online: 'offline'});
    expect(state.current?.online).toBe('online');
    state.release();
    state.receive({...snapshot, revision: 4});
    expect(state.current).toBeUndefined();
  });
  it('does not roll back a newer snapshot when an older snapshot returns late', () => {
    const state = new DeviceObservation('a', 1);
    state.install({...snapshot, revision: 4, online: 'offline'});
    expect(state.install(snapshot).revision).toBe(4);
    expect(state.current?.online).toBe('offline');
  });
  it('requests resynchronization on a revision gap or bounded buffer overflow', () => {
    const state = new DeviceObservation('a', 1, 2);
    state.install(snapshot);
    state.receive({...snapshot, revision: 5});
    expect(state.needsResync).toBe(true);
    const buffering = new DeviceObservation('a', 1, 1);
    buffering.receive(snapshot);
    buffering.receive({...snapshot, revision: 4});
    expect(buffering.needsResync).toBe(true);
    expect(buffering.install(snapshot).revision).toBe(3);
    expect(buffering.needsResync).toBe(true);
  });
});

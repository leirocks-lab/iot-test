import {describe, expect, it} from 'vitest';
import {DeviceObservation} from '../../src/host/adapter/DeviceObservation';
import type {DeviceSnapshot} from '../../src/host/specs/NativeRowanHost';
const s = (
  revision: number,
  patch: Partial<DeviceSnapshot> = {},
): DeviceSnapshot => ({
  deviceId: 'a',
  observationId: 'o',
  sessionRevision: 1,
  revision,
  authorityRevision: revision,
  connectionEpoch: 2,
  title: '设备',
  productCategory: '',
  phase: 'live',
  online: 'online',
  stale: false,
  snapshotAvailable: true,
  errorCode: '',
  ...patch,
});
describe('authoritative resync boundaries', () => {
  it('replays the missing-gap event after recovery snapshot', () => {
    const o = new DeviceObservation('a', 1);
    o.install(s(1));
    o.receive(s(3));
    o.beginResync();
    o.receive(s(4));
    o.resync(s(2));
    expect(o.current?.revision).toBe(4);
    expect(o.needsResync).toBe(false);
  });
  it('clears overflow after recovery covers discarded revisions', () => {
    const o = new DeviceObservation('a', 1, 1);
    o.receive(s(2));
    o.receive(s(3));
    o.install(s(1));
    o.beginResync();
    o.resync(s(3));
    expect(o.needsResync).toBe(false);
    o.receive(s(4));
    expect(o.current?.revision).toBe(4);
  });
  it('never swaps observation handles or rolls back epoch through snapshot install', () => {
    const o = new DeviceObservation('a', 1);
    o.install(s(3));
    expect(() => o.install(s(4, {observationId: 'other'}))).toThrow();
    o.beginResync();
    o.resync(s(4, {connectionEpoch: 1}));
    expect(o.current?.revision).toBe(3);
    expect(o.needsResync).toBe(true);
  });
  it('does not clear missing events merely because an older resync completed', () => {
    const o = new DeviceObservation('a', 1, 1);
    o.install(s(1));
    o.receive(s(8));
    o.beginResync();
    o.receive(s(9));
    o.resync(s(2));
    expect(o.needsResync).toBe(true);
  });
});
it('does not let buffered events for another observer poison recovery', () => {
  const o = new DeviceObservation('a', 1, 1);
  o.receive(s(100, {observationId: 'old'}));
  o.receive(s(101, {observationId: 'old'}));
  o.install(s(1));
  o.beginResync();
  o.resync(s(1));
  expect(o.needsResync).toBe(false);
  o.receive(s(2));
  expect(o.current?.revision).toBe(2);
});

import {describe, expect, it, vi} from 'vitest';
import {
  DeviceSessionController,
  type DeviceSessionHost,
} from '../../src/host/adapter/DeviceSessionController';
import type {
  DeviceSnapshot,
  HostContext,
} from '../../src/host/specs/NativeRowanHost';
const context: HostContext = {
  bridgeMajor: 3,
  sessionRevision: 7,
  authenticated: true,
  language: 'zh-CN',
};
export const snapshot = (
  revision = 1,
  patch: Partial<DeviceSnapshot> = {},
): DeviceSnapshot => ({
  deviceId: 'a',
  observationId: 'o1',
  sessionRevision: 7,
  revision,
  authorityRevision: revision,
  connectionEpoch: 1,
  title: '酒柜',
  productCategory: 'wine',
  phase: 'live',
  online: 'online',
  stale: false,
  snapshotAvailable: true,
  errorCode: '',
  ...patch,
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (v: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return {promise, resolve, reject};
}
async function settle() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
  }
}
function fixture(limit = 3) {
  let listener: ((s: DeviceSnapshot) => void) | undefined;
  const initial = deferred<DeviceSnapshot>(),
    resync = deferred<DeviceSnapshot>();
  const host: DeviceSessionHost = {
    getContext: vi.fn(async () => context),
    onDeviceChanged: vi.fn((fn) => {
      listener = fn;
      return {remove: vi.fn()};
    }),
    observeDevice: vi.fn(() => initial.promise),
    getDeviceSnapshot: vi.fn(() => resync.promise),
    releaseObservation: vi.fn(),
    retryObservation: vi.fn(),
    acknowledgeDeviceEvent: vi.fn(),
    closeDevice: vi.fn(),
  };
  const changed = vi.fn();
  const controller = new DeviceSessionController(host, 'a', changed, limit);
  return {
    host,
    initial,
    resync,
    controller,
    changed,
    emit: (s: DeviceSnapshot) => listener?.(s),
  };
}
describe('native device session controller', () => {
  it('subscribes before observe and replays an event preceding initial promise', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    expect(f.host.onDeviceChanged).toHaveBeenCalledBefore(
      vi.mocked(f.host.observeDevice),
    );
    f.emit(snapshot(2));
    f.initial.resolve(snapshot());
    await settle();
    expect(f.controller.state.snapshot?.revision).toBe(2);
  });
  it('resyncs a gap on the same handle and replays events during its promise', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    f.emit(snapshot(3));
    expect(f.host.getDeviceSnapshot).toHaveBeenCalledWith('o1');
    f.emit(snapshot(4));
    f.resync.resolve(snapshot(2));
    await settle();
    expect(f.controller.state.snapshot?.revision).toBe(4);
    expect(f.host.observeDevice).toHaveBeenCalledTimes(1);
    expect(f.controller.state.resyncing).toBe(false);
  });
  it('clears overflow after an authoritative resync and resumes contiguous delivery', async () => {
    const f = fixture(1);
    f.controller.start();
    await settle();
    f.emit(snapshot(2));
    f.emit(snapshot(3));
    f.initial.resolve(snapshot());
    await settle();
    f.resync.resolve(snapshot(3));
    await settle();
    f.emit(snapshot(4));
    expect(f.controller.state.snapshot?.revision).toBe(4);
    expect(f.host.getDeviceSnapshot).toHaveBeenCalledTimes(1);
  });
  it('isolates account, device, observation, epoch and authority regressions', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot(5, {connectionEpoch: 3}));
    await settle();
    for (const patch of [
      {sessionRevision: 6},
      {deviceId: 'b'},
      {observationId: 'o2'},
      {connectionEpoch: 2},
      {authorityRevision: 4},
    ]) {
      f.emit(snapshot(6, {connectionEpoch: 3, ...patch}));
    }
    f.emit(snapshot(4, {connectionEpoch: 3}));
    expect(f.controller.state.snapshot?.revision).toBe(5);
    expect(f.host.getDeviceSnapshot).not.toHaveBeenCalled();
  });
  it('does not roll back a newer epoch through a late resync', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot(1, {connectionEpoch: 3}));
    await settle();
    f.emit(snapshot(3, {connectionEpoch: 3}));
    f.resync.resolve(snapshot(2, {connectionEpoch: 2}));
    await settle();
    expect(f.controller.state.snapshot?.connectionEpoch).toBe(3);
  });
  it('releases the late initial handle after dispose and unsubscribes only once', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    const subscription = vi.mocked(f.host.onDeviceChanged).mock.results[0]
      .value;
    f.controller.dispose();
    f.controller.dispose();
    f.initial.resolve(snapshot());
    await settle();
    expect(f.host.releaseObservation).toHaveBeenCalledExactlyOnceWith('o1');
    expect(subscription.remove).toHaveBeenCalledTimes(1);
    expect(f.controller.state.snapshot).toBeUndefined();
  });
  it('ignores late resync completion after release', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    f.emit(snapshot(3));
    f.controller.dispose();
    const calls = f.changed.mock.calls.length;
    f.resync.resolve(snapshot(4));
    await settle();
    expect(f.changed).toHaveBeenCalledTimes(calls);
    expect(f.host.releaseObservation).toHaveBeenCalledExactlyOnceWith('o1');
  });
  it('does not subscribe or observe on incompatible or unauthenticated context', async () => {
    for (const patch of [{bridgeMajor: 1}, {authenticated: false}]) {
      const f = fixture();
      vi.mocked(f.host.getContext).mockResolvedValue({...context, ...patch});
      f.controller.start();
      await settle();
      expect(f.host.observeDevice).not.toHaveBeenCalled();
      expect(f.host.onDeviceChanged).not.toHaveBeenCalled();
      expect(f.controller.state.error).not.toBe('');
    }
  });
  it('explicitly rejects the old major 2 close contract before subscribing or observing', async () => {
    const f = fixture();
    vi.mocked(f.host.getContext).mockResolvedValue({
      ...context,
      bridgeMajor: 2,
    });
    f.controller.start();
    await settle();
    expect(f.controller.state.error).toBe('INCOMPATIBLE_HOST');
    expect(f.host.onDeviceChanged).not.toHaveBeenCalled();
    expect(f.host.observeDevice).not.toHaveBeenCalled();
    expect(f.host.closeDevice).not.toHaveBeenCalled();
  });
  it('does not observe if disposed before context returns', async () => {
    const f = fixture();
    const pending = deferred<HostContext>();
    vi.mocked(f.host.getContext).mockReturnValue(pending.promise);
    f.controller.start();
    f.controller.dispose();
    pending.resolve(context);
    await settle();
    expect(f.host.observeDevice).not.toHaveBeenCalled();
  });
  it('rejects wrong initial context and releases its native handle', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot(1, {sessionRevision: 8}));
    await settle();
    expect(f.host.releaseObservation).toHaveBeenCalledExactlyOnceWith('o1');
    expect(f.controller.state.snapshot).toBeUndefined();
    expect(f.controller.state.error).toBe('INVALID_SNAPSHOT');
  });
  it('bounds repeated unusable resyncs and exposes a retry without creating observation', async () => {
    const f = fixture();
    vi.mocked(f.host.getDeviceSnapshot).mockResolvedValue(snapshot());
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    f.emit(snapshot(10));
    await settle();
    expect(f.host.getDeviceSnapshot).toHaveBeenCalledTimes(2);
    expect(f.controller.state.error).toBe('RESYNC_FAILED');
    f.controller.retry();
    expect(f.host.retryObservation).toHaveBeenCalledExactlyOnceWith('o1');
    expect(f.host.observeDevice).toHaveBeenCalledTimes(1);
  });
  it('sanitizes rejected promises and does not leave event subscription after observe failure', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.reject(new Error('private uri'));
    await settle();
    expect(f.controller.state.error).toBe('OBSERVATION_FAILED');
    expect(JSON.stringify(f.controller.state)).not.toContain('private');
    expect(
      vi.mocked(f.host.onDeviceChanged).mock.results[0].value.remove,
    ).toHaveBeenCalledTimes(1);
  });
  it('start and retry after disposal cannot create work', async () => {
    const f = fixture();
    f.controller.dispose();
    f.controller.start();
    f.controller.retry();
    await settle();
    expect(f.host.getContext).not.toHaveBeenCalled();
    expect(f.host.retryObservation).not.toHaveBeenCalled();
  });
});

// Native methods may throw synchronously before returning a Promise (e.g. detached bridge).
describe('detached bridge handling', () => {
  it('contains a synchronous resync throw and permits explicit retry', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    vi.mocked(f.host.getDeviceSnapshot).mockImplementation(() => {
      throw new Error('raw URL');
    });
    expect(() => f.emit(snapshot(3))).not.toThrow();
    expect(f.controller.state.error).toBe('RESYNC_FAILED');
  });
  it('replays recovery events without retrying an old observation after replacement controller disposal', async () => {
    const old = fixture();
    old.controller.start();
    await settle();
    old.initial.resolve(snapshot());
    await settle();
    old.emit(snapshot(3));
    old.controller.dispose();
    const next = fixture();
    next.controller.start();
    await settle();
    next.initial.resolve(
      snapshot(1, {observationId: 'o2', connectionEpoch: 4}),
    );
    await settle();
    old.resync.resolve(snapshot(4));
    await settle();
    expect(next.controller.state.snapshot?.observationId).toBe('o2');
    expect(old.host.retryObservation).not.toHaveBeenCalled();
  });
});
describe('resync promise rejection', () => {
  it('contains a rejected resync, then recovers through the same handle on explicit retry', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    f.emit(snapshot(3));
    f.resync.reject(new Error('secret'));
    await settle();
    expect(f.controller.state.error).toBe('RESYNC_FAILED');
    vi.mocked(f.host.getDeviceSnapshot).mockResolvedValue(snapshot(3));
    f.controller.retry();
    await settle();
    expect(f.controller.state.snapshot?.revision).toBe(3);
    expect(f.controller.state.error).toBe('');
    expect(f.host.observeDevice).toHaveBeenCalledTimes(1);
  });
  it('ignores already superseded initial-buffer updates and replays out-of-order contiguous events', async () => {
    const f = fixture();
    f.controller.start();
    await settle();
    f.emit(snapshot(4));
    f.emit(snapshot(3));
    f.emit(snapshot(1));
    f.initial.resolve(snapshot(2));
    await settle();
    expect(f.controller.state.snapshot?.revision).toBe(4);
    expect(f.host.getDeviceSnapshot).not.toHaveBeenCalled();
  });
});
describe('bounded native event receipt acknowledgement', () => {
  it('acks when callback arrives, before the initial observation Promise resolves', async () => {
    const f = fixture();
    const ack = vi.fn();
    Object.assign(f.host, {acknowledgeDeviceEvent: ack});
    f.controller.start();
    await settle();
    f.emit(snapshot(2));
    expect(ack).toHaveBeenCalledExactlyOnceWith('o1', 2);
    expect(f.controller.state.snapshot).toBeUndefined();
    f.initial.resolve(snapshot());
    await settle();
    expect(f.controller.state.snapshot?.revision).toBe(2);
  });
  it('acks old session/observer/epoch and duplicate deliveries without accepting their state', async () => {
    const f = fixture();
    const ack = vi.fn();
    Object.assign(f.host, {acknowledgeDeviceEvent: ack});
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot(5));
    await settle();
    for (const s of [
      snapshot(4),
      snapshot(6, {sessionRevision: 6}),
      snapshot(6, {observationId: 'old'}),
      snapshot(6, {connectionEpoch: 0}),
    ]) {
      f.emit(s);
    }
    expect(ack.mock.calls).toEqual([
      ['o1', 4],
      ['o1', 6],
      ['old', 6],
      ['o1', 6],
    ]);
    expect(f.controller.state.snapshot?.revision).toBe(5);
  });
  it('contains synchronous ack failures while still updating state and releasing on dispose', async () => {
    const f = fixture();
    const ack = vi.fn(() => {
      throw new Error('raw bridge error');
    });
    Object.assign(f.host, {acknowledgeDeviceEvent: ack});
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    expect(() => f.emit(snapshot(2))).not.toThrow();
    expect(ack).toHaveBeenCalledExactlyOnceWith('o1', 2);
    expect(f.controller.state.snapshot?.revision).toBe(2);
    expect(f.controller.state.error).toBe('');
    f.controller.dispose();
    expect(f.host.releaseObservation).toHaveBeenCalledExactlyOnceWith('o1');
  });
  it('acks a callback already queued when disposal removes the subscription', async () => {
    const f = fixture();
    const ack = vi.fn();
    Object.assign(f.host, {acknowledgeDeviceEvent: ack});
    f.controller.start();
    await settle();
    f.initial.resolve(snapshot());
    await settle();
    f.controller.dispose();
    f.emit(snapshot(2));
    expect(ack).toHaveBeenCalledExactlyOnceWith('o1', 2);
    expect(f.controller.state.snapshot).toBeUndefined();
  });
  it('does not forward malformed ack identities or non-integral revisions', async () => {
    const f = fixture();
    const ack = vi.fn();
    Object.assign(f.host, {acknowledgeDeviceEvent: ack});
    f.controller.start();
    await settle();
    for (const s of [
      snapshot(1, {observationId: ''}),
      snapshot(-1),
      snapshot(1.5),
      snapshot(Number.NaN),
    ]) {
      f.emit(s);
    }
    expect(ack).not.toHaveBeenCalled();
  });
});

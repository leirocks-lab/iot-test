import {describe, expect, it} from 'vitest';
import {
  DeviceSelfUnbindController,
  selfUnbindMessage,
} from '../../src/host/adapter/DeviceSelfUnbindController';
import type {DeviceSelfUnbindState} from '../../src/host/specs/NativeRowanHost';

const binding = {observationId: 'observation-a', sessionRevision: 7};
const snapshot = (
  patch: Partial<DeviceSelfUnbindState> = {},
): DeviceSelfUnbindState => ({
  ...binding,
  revision: 1,
  status: 'idle',
  errorCode: '',
  canRequest: true,
  ...patch,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return {promise, resolve};
}
function fixture() {
  const calls = {
    request: [] as string[][],
    cancel: [] as string[][],
    query: [] as string[],
  };
  let read = () => Promise.resolve(snapshot());
  let request = () =>
    Promise.resolve(
      snapshot({revision: 2, status: 'preparing', canRequest: false}),
    );
  const host = {
    getDeviceSelfUnbindState: (id: string) => {
      calls.query.push(id);
      return read();
    },
    requestDeviceSelfUnbind: (id: string, attempt: string) => {
      calls.request.push([id, attempt]);
      return request();
    },
    cancelDeviceSelfUnbindConfirmation: (id: string, attempt: string) => {
      calls.cancel.push([id, attempt]);
    },
  };
  const values: unknown[] = [];
  const controller = new DeviceSelfUnbindController(host, (value) =>
    values.push(value),
  );
  return {
    controller,
    calls,
    values,
    host,
    read: (value: typeof read) => {
      read = value;
    },
    request: (value: typeof request) => {
      request = value;
    },
  };
}
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
};
describe('native self-unbind entry authority', () => {
  it('old hosts never call new methods', async () => {
    const f = fixture();
    f.controller.show(binding, false);
    await flush();
    f.controller.request();
    expect(f.calls.query).toEqual([]);
    expect(f.calls.request).toEqual([]);
    expect(f.controller.state.supported).toBe(false);
  });
  it('entry is a read, not an implicit mutation', async () => {
    const f = fixture();
    f.controller.show(binding, true);
    await flush();
    expect(f.calls.query).toEqual([binding.observationId]);
    expect(f.calls.request).toEqual([]);
    expect(f.controller.state.snapshot?.canRequest).toBe(true);
  });
  it('one explicit attempt is pending and duplicate clicks do not create a second', async () => {
    const f = fixture();
    const pending = deferred<DeviceSelfUnbindState>();
    f.request(() => pending.promise);
    f.controller.show(binding, true);
    await flush();
    f.controller.request();
    f.controller.request();
    expect(f.calls.request).toHaveLength(1);
    expect(f.controller.state.requesting).toBe(true);
    pending.resolve(
      snapshot({revision: 2, status: 'unknown', canRequest: false}),
    );
    await flush();
    expect(f.controller.state.snapshot?.status).toBe('unknown');
    f.controller.request();
    expect(f.calls.request).toHaveLength(1);
  });
  it('More exit cancels its exact native confirmation before clearing its state', async () => {
    const f = fixture();
    const pending = deferred<DeviceSelfUnbindState>();
    f.request(() => pending.promise);
    f.controller.show(binding, true);
    await flush();
    f.controller.request();
    f.controller.hide();
    expect(f.calls.cancel).toEqual(f.calls.request);
    pending.resolve(
      snapshot({revision: 2, status: 'confirmed', canRequest: false}),
    );
    await flush();
    expect(f.controller.state.snapshot).toBeUndefined();
  });
  it('late A query cannot replace B even with a higher revision', async () => {
    const f = fixture();
    const old = deferred<DeviceSelfUnbindState>();
    f.read(() => old.promise);
    f.controller.show(binding, true);
    f.read(() => Promise.resolve(snapshot({observationId: 'b', revision: 1})));
    f.controller.show({observationId: 'b', sessionRevision: 7}, true);
    old.resolve(snapshot({revision: 99, status: 'confirmed'}));
    await flush();
    expect(f.controller.state.snapshot?.observationId).toBe('b');
    expect(f.controller.state.snapshot?.status).toBe('idle');
  });
  it('decreasing and mismatched snapshots cannot overwrite an accepted native state', async () => {
    const f = fixture();
    f.read(() =>
      Promise.resolve(
        snapshot({revision: 5, status: 'unknown', canRequest: false}),
      ),
    );
    f.controller.show(binding, true);
    await flush();
    f.read(() => Promise.resolve(snapshot({revision: 4, status: 'confirmed'})));
    f.controller.refresh();
    await flush();
    expect(f.controller.state.snapshot?.status).toBe('unknown');
    f.read(() =>
      Promise.resolve(
        snapshot({sessionRevision: 8, revision: 8, status: 'confirmed'}),
      ),
    );
    f.controller.refresh();
    await flush();
    expect(f.controller.state.snapshot?.status).toBe('unknown');
  });
  it('unknown, historical and cleanup pending never display direct success', () => {
    for (const status of [
      'unknown',
      'confirmed_cleanup_pending',
      'already_absent_cleanup_pending',
      'historical_confirmed',
      'historical_already_absent',
    ]) {
      expect(selfUnbindMessage(status)).not.toBe(
        selfUnbindMessage('confirmed'),
      );
    }
    expect(selfUnbindMessage('already_absent')).not.toBe(
      selfUnbindMessage('confirmed'),
    );
  });
  it('a settled request is a state, never assumed success', async () => {
    const f = fixture();
    f.request(() =>
      Promise.resolve(
        snapshot({revision: 2, status: 'sending', canRequest: false}),
      ),
    );
    f.controller.show(binding, true);
    await flush();
    f.controller.request();
    await flush();
    expect(f.controller.state.snapshot?.status).toBe('sending');
    expect(f.controller.state.requesting).toBe(false);
  });
  it('background cancels only its pending confirmation and does not replay on foreground', async () => {
    const f = fixture();
    const pending = deferred<DeviceSelfUnbindState>();
    f.request(() => pending.promise);
    f.controller.show(binding, true);
    await flush();
    f.controller.request();
    f.controller.setForeground(false);
    expect(f.calls.cancel).toEqual(f.calls.request);
    pending.resolve(snapshot({revision: 2, status: 'cancelled'}));
    await flush();
    f.controller.setForeground(true);
    await flush();
    expect(f.calls.request).toHaveLength(1);
  });
  it('synchronous cancellation failures do not prevent disposal or permit late state', async () => {
    const f = fixture();
    const pending = deferred<DeviceSelfUnbindState>();
    f.request(() => pending.promise);
    f.host.cancelDeviceSelfUnbindConfirmation = () => {
      throw Error('private message');
    };
    f.controller.show(binding, true);
    await flush();
    f.controller.request();
    expect(() => f.controller.dispose()).not.toThrow();
    pending.resolve(snapshot({status: 'confirmed', revision: 2}));
    await flush();
    expect(f.controller.state.snapshot).toBeUndefined();
  });
  it('does not poll or repeat a mutation while status remains unknown', async () => {
    const f = fixture();
    f.read(() =>
      Promise.resolve(snapshot({status: 'unknown', canRequest: false})),
    );
    f.controller.show(binding, true);
    await flush();
    await flush();
    expect(f.calls.query).toHaveLength(1);
    f.controller.request();
    expect(f.calls.request).toHaveLength(0);
    f.controller.refresh();
    await flush();
    expect(f.calls.query).toHaveLength(2);
  });
  it('invalid native statuses and unsafe revisions fail closed without exposing raw values', async () => {
    const f = fixture();
    f.read(() =>
      Promise.resolve(
        snapshot({
          status: 'raw-private-error',
          revision: Number.MAX_SAFE_INTEGER + 1,
        }),
      ),
    );
    f.controller.show(binding, true);
    await flush();
    expect(f.controller.state.error).toBe('INVALID_STATE');
    expect(f.controller.state.snapshot).toBeUndefined();
    expect(JSON.stringify(f.controller.state)).not.toContain(
      'raw-private-error',
    );
  });
  it('whitelists snapshots instead of retaining accidental private extra fields', async () => {
    const f = fixture();
    f.read(() =>
      Promise.resolve({
        ...snapshot(),
        raw: 'private-extra',
        operationId: 'private-operation',
      }),
    );
    f.controller.show(binding, true);
    await flush();
    expect(JSON.stringify(f.controller.state)).not.toContain('private');
    expect(Object.isFrozen(f.controller.state.snapshot)).toBe(true);
  });
  it('late A confirmation cannot settle or overwrite a pending B intent', async () => {
    const f = fixture(),
      a = deferred<DeviceSelfUnbindState>(),
      b = deferred<DeviceSelfUnbindState>();
    f.request(() => a.promise);
    f.controller.show(binding, true);
    await flush();
    f.controller.request();
    f.read(() => Promise.resolve(snapshot({observationId: 'b'})));
    f.controller.show({observationId: 'b', sessionRevision: 7}, true);
    await flush();
    f.request(() => b.promise);
    f.controller.request();
    a.resolve(snapshot({revision: 99, status: 'confirmed', canRequest: false}));
    await flush();
    expect(f.controller.state.requesting).toBe(true);
    expect(f.controller.state.snapshot?.observationId).toBe('b');
    b.resolve(
      snapshot({
        observationId: 'b',
        revision: 2,
        status: 'unknown',
        canRequest: false,
      }),
    );
    await flush();
    expect(f.controller.state.snapshot?.status).toBe('unknown');
  });
  it.each([null, undefined])(
    'malformed native request result %s fails closed and never retries',
    async (malformed) => {
      const f = fixture();
      f.request(() =>
        Promise.resolve(malformed as unknown as DeviceSelfUnbindState),
      );
      f.controller.show(binding, true);
      await flush();
      f.controller.request();
      await flush();
      expect(f.controller.state.error).toBe('INVALID_STATE');
      expect(f.controller.state.requesting).toBe(false);
      f.controller.request();
      expect(f.calls.request).toHaveLength(1);
    },
  );
});

import {describe, expect, it, vi} from 'vitest';
import {createNativePageClose} from '../../src/host/adapter/NativePageClose';

describe('native page-scoped close dispatch', () => {
  it('a queued old-page handler never acquires the current page token from a shared host', async () => {
    let nativeVisible = 'native-page-a';
    const closed: string[] = [];
    const host = {
      closeDevice: vi.fn((token: string) => {
        // An independent native page check: JS supplies its captured capability, never latest context.
        if (token === nativeVisible) {
          closed.push(token);
          nativeVisible = '';
        }
      }),
      getContext: vi.fn(() => {
        throw new Error('Close must not fetch the latest page context');
      }),
    };
    const pageA = createNativePageClose(host, 'native-page-a');
    let dispatchOld!: () => void;
    const queuedA = new Promise<void>((resolve) => {
      dispatchOld = resolve;
    }).then(() => pageA.requestClose());
    nativeVisible = 'native-page-b';
    const pageB = createNativePageClose(host, 'native-page-b');
    dispatchOld();
    await queuedA;
    expect(host.closeDevice).toHaveBeenCalledExactlyOnceWith('native-page-a');
    expect(nativeVisible).toBe('native-page-b');
    expect(closed).toEqual([]);
    expect(pageB.requestClose()).toBe(true);
    expect(closed).toEqual(['native-page-b']);
    expect(host.getContext).not.toHaveBeenCalled();
  });
  it('captures the initial prop value even if a parent later reuses its mutable props object', () => {
    const props = {pageSessionId: 'native-page-a'};
    const host = {closeDevice: vi.fn()};
    const close = createNativePageClose(host, props.pageSessionId);
    props.pageSessionId = 'native-page-b';
    close.requestClose();
    expect(host.closeDevice).toHaveBeenCalledExactlyOnceWith('native-page-a');
  });
  it('does not dispatch a close RPC when the native token is missing or malformed', () => {
    for (const token of [
      undefined,
      '',
      '  ',
      'bad\u0000token',
      7 as unknown as string,
    ]) {
      const host = {closeDevice: vi.fn()};
      const close = createNativePageClose(host, token);
      expect(close.canClose).toBe(false);
      expect(close.requestClose()).toBe(false);
      expect(host.closeDevice).not.toHaveBeenCalled();
    }
  });
  it('repeated old-page gestures remain harmless through the native page-token boundary', () => {
    let currentNativePage = 'a';
    const closed: string[] = [];
    const host = {
      closeDevice: vi.fn((token: string) => {
        if (token === currentNativePage) {
          closed.push(token);
          currentNativePage = token === 'a' ? 'b' : '';
        }
      }),
    };
    const a = createNativePageClose(host, 'a'),
      b = createNativePageClose(host, 'b');
    expect(a.requestClose()).toBe(true);
    expect(a.requestClose()).toBe(true); // another intent still carries A, never the latest B token
    expect(currentNativePage).toBe('b');
    expect(b.requestClose()).toBe(true);
    expect(closed).toEqual(['a', 'b']);
    expect(host.closeDevice.mock.calls).toEqual([['a'], ['a'], ['b']]);
  });
  it('the same A action can close restored A after its earlier delayed close was rejected over B', () => {
    const nativeStack = ['home', 'a', 'b'];
    const closed: string[] = [];
    const host = {
      closeDevice: vi.fn((token: string) => {
        if (nativeStack.at(-1) === token) {
          closed.push(nativeStack.pop()!);
        }
      }),
    };
    const a = createNativePageClose(host, 'a'),
      b = createNativePageClose(host, 'b');
    expect(a.requestClose()).toBe(true); // dispatch is not an acknowledgement that native accepted A
    expect(nativeStack).toEqual(['home', 'a', 'b']);
    expect(b.requestClose()).toBe(true);
    expect(nativeStack).toEqual(['home', 'a']);
    expect(a.requestClose()).toBe(true); // exactly the same helper/action, not recreated after restore
    expect(nativeStack).toEqual(['home']);
    expect(closed).toEqual(['b', 'a']);
    expect(host.closeDevice.mock.calls).toEqual([['a'], ['b'], ['a']]);
  });
  it('contains a detached native module throw and retries only the same captured page', () => {
    const host = {
      closeDevice: vi.fn().mockImplementationOnce(() => {
        throw new Error('private native message');
      }),
    };
    const close = createNativePageClose(host, 'a');
    expect(close.requestClose()).toBe(false);
    expect(close.requestClose()).toBe(true);
    expect(host.closeDevice.mock.calls).toEqual([['a'], ['a']]);
  });
});

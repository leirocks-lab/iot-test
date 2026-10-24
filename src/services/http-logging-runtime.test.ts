import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConfiguredRuntime } from './app-runtime';
import type { Runtime } from './runtime';

vi.mock('./native-storage', async () => {
  const { MemoryStorage } = await import('./store');
  return { SessionStorage: MemoryStorage, MockFileStorage: MemoryStorage };
});
let runtime: Runtime | undefined;
afterEach(() => { runtime?.dispose(); runtime = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('configured runtime HTTP diagnostics', () => {
  it('wires default debug into real platform and IoT calls from public app configuration', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 0, msg: 'ok', data: {} }))));
    runtime = await createConfiguredRuntime({ httpMode: 'real', deviceMode: 'mock', apiBaseUrl: 'https://platform.test', iotApiBaseUrl: 'https://iot.test/iot' });
    await runtime.service.request({ method: 'GET', path: '/api/app/config' });
    await runtime.service.request({ method: 'GET', path: '/api/app/device/connection' });
    const text = debug.mock.calls.map(call => call.join(' ')).join('\n');
    expect(text).toContain('https://platform.test/app-api/config');
    expect(text).toContain('https://iot.test/iot/app-api/device/connection');
    expect(text).toContain('"target": "iot"');
    expect(debug).toHaveBeenCalledTimes(4);
  });

  it.each(['off', 'error'] as const)('respects explicit %s for mock login and refresh', async httpLogLevel => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    runtime = await createConfiguredRuntime({ httpLogLevel });
    await runtime.service.login('rowan@example.com', 'Rowan@123', 'password');
    await runtime.service.refresh();
    expect(debug).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    runtime.developer!.http.fault = 'offline';
    await expect(runtime.service.request({ method: 'GET', path: '/api/app/config' })).rejects.toBeInstanceOf(Error);
    expect(error).toHaveBeenCalledTimes(httpLogLevel === 'error' ? 1 : 0);
  });
});

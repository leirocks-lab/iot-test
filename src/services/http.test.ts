import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchHttpClient, type HttpFetcher } from './http';
import { RealHttpClient } from './real-http';

afterEach(() => vi.unstubAllGlobals());

describe('browser host fetch context', () => {
  function installHostFetch() {
    const hostFetch = vi.fn(function (this: unknown, _url: string, _init?: RequestInit) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(new Response(JSON.stringify({
        code: 0, success: true, message: 'ok', data: {},
      }), { headers: { 'Content-Type': 'application/json' } }));
    });
    vi.stubGlobal('fetch', hostFetch);
    return hostFetch;
  }

  it('uses the global receiver for the default FetchHttpClient transport', async () => {
    const hostFetch = installHostFetch();
    const controller = new AbortController();
    const client = new FetchHttpClient('http://platform.example.test', undefined, 'development');
    await expect(client.request({
      method: 'POST', path: '/app-api/session', body: { verify: 'password' },
      headers: { 'tenant-id': '1' }, signal: controller.signal,
    })).resolves.toMatchObject({ status: 200, data: { code: 0 } });
    expect(hostFetch).toHaveBeenCalledWith('http://platform.example.test/app-api/session',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ verify: 'password' }),
        headers: expect.objectContaining({ 'tenant-id': '1' }), signal: controller.signal }));
  });

  it.each([
    ['/api/app/config', 'http://platform.example.test/app-api/config'],
    ['/api/app/device/connection', 'http://iot.example.test/iot/app-api/device/connection'],
  ])('uses the global receiver through the real client for %s', async (path, url) => {
    const hostFetch = installHostFetch();
    const client = new RealHttpClient({
      apiBaseUrl: 'http://platform.example.test', iotApiBaseUrl: 'http://iot.example.test/iot',
      tenantID: '1', environment: 'development',
    });
    await expect(client.request({ method: 'GET', path })).resolves.toMatchObject({
      status: 200, data: { code: 0, success: true },
    });
    expect(hostFetch).toHaveBeenCalledWith(url,
      expect.objectContaining({ headers: expect.objectContaining({ 'tenant-id': '1' }) }));
  });

  it('keeps an explicitly injected transport and propagates its failure', async () => {
    const hostFetch = installHostFetch();
    const injected = vi.fn<HttpFetcher>().mockRejectedValue(new Error('offline'));
    const client = new FetchHttpClient('https://platform.example.test', injected);
    await expect(client.request({ method: 'GET', path: '/app-api/config' })).rejects.toThrow('offline');
    expect(injected).toHaveBeenCalledOnce();
    expect(hostFetch).not.toHaveBeenCalled();
  });
});

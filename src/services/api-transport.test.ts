import { describe, expect, it, vi } from 'vitest';
import { allowsHttpApi, validateApiBaseUrl } from './api-transport';
import { communicationConfig } from './config';
import { FetchHttpClient, type HttpFetcher } from './http';
import { RealHttpClient } from './real-http';
import { RowanService } from './rowan';
import { MemoryStorage } from './store';

const roots = { apiBaseUrl: 'http://platform.example.test', iotApiBaseUrl: 'http://iot.example.test/iot', tenantID: '1' };

describe('business API environment policy', () => {
  it.each(['development', 'preview'])('routes actual HTTP requests through all layers in %s', async (environment) => {
    const config = communicationConfig({ ...roots, environment, httpMode: 'real', deviceMode: 'real' });
    const fetcher = vi.fn<HttpFetcher>().mockResolvedValue(new Response(JSON.stringify({ code: 401, msg: '未登录', data: null }), { status: 200 }));
    const service = new RowanService(new RealHttpClient(config, fetcher), new MemoryStorage());
    await expect(service.request({ method: 'GET', path: '/api/app/config', query: { brandId: 'rowan' } })).rejects.toMatchObject({ code: 401 });
    // A fresh Response is needed for each real body read.
    fetcher.mockResolvedValue(new Response(JSON.stringify({ code: 401, msg: '未登录', data: null }), { status: 200 }));
    await expect(service.home()).rejects.toMatchObject({ code: 401 });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'http://platform.example.test/app-api/config?brandId=rowan',
      'http://iot.example.test/iot/app-api/devices',
    ]);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ 'tenant-id': '1' });
    expect(service.session).toBeNull();
  });

  it.each(['development', 'preview', 'production'])('retains HTTPS support in %s', (environment) => {
    const config = communicationConfig({ environment, httpMode: 'real', deviceMode: 'real', apiBaseUrl: 'https://api.example.test' });
    expect(() => new RealHttpClient(config)).not.toThrow();
  });

  it.each(['apiBaseUrl', 'iotApiBaseUrl'] as const)('rejects a production HTTP %s before fetch', (key) => {
    const config = { environment: 'production', httpMode: 'real' as const, deviceMode: 'real' as const, apiBaseUrl: 'https://platform.example.test', iotApiBaseUrl: 'https://iot.example.test', [key]: 'http://insecure.example.test' };
    const fetcher = vi.fn<HttpFetcher>();
    expect(() => communicationConfig(config)).toThrow('HTTPS');
    expect(() => new RealHttpClient(config, fetcher)).toThrow('HTTPS');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps direct clients strict when the environment is absent', () => {
    expect(() => new RealHttpClient(roots)).toThrow('HTTPS');
    expect(() => new FetchHttpClient(roots.apiBaseUrl)).toThrow('HTTPS');
    expect(allowsHttpApi()).toBe(false);
    expect(() => new FetchHttpClient(roots.apiBaseUrl, undefined, 'preview')).not.toThrow();
    expect(() => new FetchHttpClient(roots.apiBaseUrl, undefined, 'production')).toThrow('HTTPS');
    expect(communicationConfig({}).environment).toBe('development');
  });

  it.each(['', 'Production', 'staging', 'prod', null, true])('rejects unknown environment %s', (environment) => {
    expect(() => allowsHttpApi(environment)).toThrow('environment');
    expect(() => communicationConfig({ environment: environment as string })).toThrow('environment');
    expect(() => new RealHttpClient({ ...roots, environment: environment as string })).toThrow('environment');
  });

  it.each([
    'ftp://api.example.test', 'wss://api.example.test', 'file:///tmp/api', 'http://',
    ' http://api.example.test', 'http://api.example.test ', 'http://user:pass@api.example.test',
    'http://api.example.test?tenant=1', 'http://api.example.test#fragment',
    'http://api.example.test?', 'http://api.example.test#', 'http://api.example.test/app-api/',
  ])('does not accept ambiguous API roots in preview: %s', (base) => {
    expect(() => validateApiBaseUrl(base, 'preview')).toThrow();
    expect(() => communicationConfig({ httpMode: 'real', apiBaseUrl: base, environment: 'preview' })).toThrow();
  });

  it('propagates a real HTTP transport failure without a successful fallback', async () => {
    const fetcher = vi.fn<HttpFetcher>().mockRejectedValue(new Error('backend offline'));
    const service = new RowanService(new RealHttpClient({ ...roots, environment: 'development' }, fetcher), new MemoryStorage());
    await expect(service.home()).rejects.toThrow('backend offline');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

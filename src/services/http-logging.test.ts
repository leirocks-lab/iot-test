import { describe, expect, it, vi } from 'vitest';
import type { HttpResponse, Logger } from '../lib/core';
import { HttpDiagnostics, LoggedHttpClient } from './http-logging';
import { FetchHttpClient, MockHttpClient } from './http';
import { RealHttpClient } from './real-http';
import { communicationConfig } from './config';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase } from './store';

function capture(level: 'debug' | 'error' | 'off' = 'debug') {
  const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const diagnostics = new HttpDiagnostics({ level, logger });
  const entries = () => Object.values(logger).flatMap(fn => (fn as ReturnType<typeof vi.fn>).mock.calls.map(call => call[1]));
  return { logger, diagnostics, entries, text: () => JSON.stringify(entries()) };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const request = { method: 'GET' as const, path: '/app-api/config' };

describe('HTTP diagnostic lifecycle', () => {
  it('logs actual requests and raw responses with a shared ID without changing the wire', async () => {
    const log = capture();
    const fetcher = vi.fn(async () => json({ code: 0, msg: 'ok', data: { value: 42 } }));
    const client = new RealHttpClient({ apiBaseUrl: 'https://platform.test', iotApiBaseUrl: 'https://iot.test/iot', tenantID: '1' }, fetcher, log.diagnostics);
    await expect(client.request({ method: 'GET', path: '/api/app/config', query: { page: 2 } })).resolves.toMatchObject({ data: { message: 'ok' } });
    const [sent, received] = log.entries();
    expect(sent).toMatchObject({ event: 'request', target: 'platform', sourcePath: '/api/app/config', url: 'https://platform.test/app-api/config?page=2', headers: { 'tenant-id': '1' } });
    expect(received).toMatchObject({ event: 'response', requestId: sent.requestId, status: 200, result: 'success', body: { code: 0, msg: 'ok', data: { value: 42 } }, durationMs: expect.any(Number), timestamp: expect.any(String) });
    expect(fetcher.mock.calls[0]).toHaveLength(2);
    expect(log.text()).not.toContain('message'); // Capture backend msg, not the normalized envelope.
  });

  it('correlates concurrent requests independently and labels IoT routing', async () => {
    const log = capture();
    const client = new RealHttpClient({ apiBaseUrl: 'https://platform.test', iotApiBaseUrl: 'https://iot.test/iot' }, async () => json({ code: 1, msg: 'failed' }), log.diagnostics);
    await Promise.all([client.request({ method: 'GET', path: '/api/app/config' }), client.request({ method: 'GET', path: '/api/app/devices' })]);
    const sent = log.entries().filter(entry => entry.event === 'request');
    expect(new Set(sent.map(entry => entry.requestId)).size).toBe(2);
    expect(sent[1]).toMatchObject({ target: 'iot', url: 'https://iot.test/iot/app-api/devices' });
    for (const entry of sent) expect(log.entries().filter(item => item.requestId === entry.requestId)).toHaveLength(2);
  });

  it.each([
    [200, { code: 123, msg: 'denied' }, 'business_error'],
    [200, { code: 0, success: false }, 'business_error'],
    [503, { message: 'unavailable' }, 'http_error'],
  ])('classifies status %s without altering the response', async (status, body, result) => {
    const log = capture('error');
    const client = new FetchHttpClient('https://api.test', async () => json(body, status), undefined, log.diagnostics);
    await expect(client.request(request)).resolves.toMatchObject({ status, data: body });
    expect(log.entries()).toHaveLength(1);
    expect(log.entries()[0]).toMatchObject({ event: 'response', result, status, method: 'GET', url: 'https://api.test/app-api/config' });
  });

  it.each(['network_error', 'response_parse_error', 'response_adapter_error', 'cancelled'] as const)('preserves errors and identifies %s', async result => {
    const log = capture();
    const error = result === 'cancelled' ? new DOMException('secret-value', 'AbortError') : new TypeError('secret-value');
    const fetcher = async () => {
      if (result === 'network_error' || result === 'cancelled') throw error;
      if (result === 'response_parse_error') {
        const response = json({});
        vi.spyOn(response, 'json').mockRejectedValue(error);
        return response;
      }
      return json({ code: 0, data: {} });
    };
    const client = new FetchHttpClient('https://api.test', fetcher, undefined, log.diagnostics);
    const work = result === 'response_adapter_error'
      ? client.request(request, { adapt: () => { throw error; } })
      : client.request(request);
    await expect(work).rejects.toBe(error);
    expect(log.entries().at(-1)).toMatchObject({ event: 'failure', result });
    expect(log.text()).not.toContain('secret-value');
  });

  it('logs real response adaptation errors against the same wire request', async () => {
    const log = capture();
    const client = new RealHttpClient({ apiBaseUrl: 'https://api.test' }, async () => json({ code: 0, data: {} }), log.diagnostics);
    await expect(client.request({ method: 'GET', path: '/api/app/devices' })).rejects.toBeInstanceOf(Error);
    expect(log.entries()).toHaveLength(2);
    expect(log.entries()[1]).toMatchObject({ result: 'response_adapter_error', requestId: log.entries()[0].requestId, status: 200, body: { code: 0, data: {} } });
  });

  it('keeps 204 behavior, reads a response once, and tolerates a broken log sink', async () => {
    const logger: Logger = { debug: () => { throw new Error('sink'); }, info: vi.fn(), warn: vi.fn(), error: () => { throw new Error('sink'); } };
    const response = json({ code: 0, data: {} });
    const read = vi.spyOn(response, 'json');
    const client = new FetchHttpClient('https://api.test', async () => response, undefined, new HttpDiagnostics({ level: 'debug', logger }));
    await expect(client.request(request)).resolves.toMatchObject({ status: 200 });
    expect(read).toHaveBeenCalledOnce();
    const empty = new FetchHttpClient('https://api.test', async () => new Response(null, { status: 204 }), undefined, capture().diagnostics);
    await expect(empty.request(request)).resolves.toMatchObject({ status: 204, data: { success: true, code: 0 } });
  });

  it('does not inspect log-only fields when off and omits successful/error-mode cancellation logs', async () => {
    const log = capture('off');
    const response = { status: 200, data: { get token() { throw new Error('must not inspect'); } }, headers: {} };
    await expect(new LoggedHttpClient({ request: async <T>() => response as HttpResponse<T> }, log.diagnostics).request(request)).resolves.toBe(response);
    expect(log.entries()).toHaveLength(0);
    const errors = capture('error');
    const client = new FetchHttpClient('https://api.test', async () => json({ code: 0 }), undefined, errors.diagnostics);
    await client.request(request);
    const cancelled = new FetchHttpClient('https://api.test', async () => { throw new DOMException('', 'AbortError'); }, undefined, errors.diagnostics);
    await expect(cancelled.request(request)).rejects.toBeInstanceOf(DOMException);
    expect(errors.entries()).toHaveLength(0);
  });

  it('does not invoke response getters or let diagnostic classification break a successful request', async () => {
    const log = capture();
    const getter = vi.fn(() => { throw new Error('do not invoke'); });
    const data = Object.defineProperty({}, 'code', { get: getter, enumerable: true });
    const response = { status: 200, data, headers: {} };
    const client = new LoggedHttpClient({ request: async <T>() => response as HttpResponse<T> }, log.diagnostics);
    await expect(client.request(request)).resolves.toBe(response);
    expect(getter).not.toHaveBeenCalled();
  });

  it('covers mock login and refresh including direct RowanService HTTP calls', async () => {
    const log = capture();
    const db = await MockDatabase.open(new MemoryStorage());
    const service = new RowanService(new LoggedHttpClient(new MockHttpClient(db), log.diagnostics), new MemoryStorage());
    await service.login('rowan@example.com', 'Rowan@123', 'password');
    await service.refresh();
    const sent = log.entries().filter(entry => entry.event === 'request');
    expect(sent.map(entry => entry.method)).toEqual(['POST', 'PATCH']);
    expect(sent.every(entry => entry.target === 'mock')).toBe(true);
    expect(log.text()).not.toContain('Rowan@123');
    expect(log.text()).not.toContain(service.session!.accessToken);
    expect(log.text()).not.toContain(service.session!.refreshToken);
  });
});

describe('HTTP diagnostic redaction', () => {
  it('redacts sensitive queries in relative paths and percent-encoded email path segments', async () => {
    const log = capture();
    const client = new FetchHttpClient('https://api.test', async () => json({ code: 0, endpoint: '/reset?password=relative-secret' }), undefined, log.diagnostics);
    await client.request({ method: 'GET', path: '/app-api/user/leon%40example.com?access_token=path-secret' });
    expect(log.text()).not.toContain('path-secret');
    expect(log.text()).not.toContain('relative-secret');
    expect(log.text()).not.toContain('leon%40example.com');
    expect(log.text()).not.toContain('leon@example.com');
  });

  it('redacts nested keys, headers, path/query and email without mutating inputs', async () => {
    const log = capture();
    const body = { Password: 'password-secret', nested: [{ refresh_token: 'refresh-secret', pin: 'pin-secret', email: 'leon@example.com' }], endpoint: 'https://api.test?token=query-secret' };
    const responseBody = { code: 0, data: { accessToken: 'token-secret', mqttPassword: 'mqtt-secret', Cookie: 'cookie-secret' } };
    const client = new FetchHttpClient('https://api.test', async () => json(responseBody), undefined, log.diagnostics);
    await client.request({ method: 'POST', path: '/app-api/captcha/123456', query: { account: 'leon@example.com', access_token: 'query-secret' }, headers: { aUtHoRiZaTiOn: 'Bearer auth-secret', 'X-Api-Key': 'key-secret' }, body });
    for (const secret of ['password-secret', 'refresh-secret', 'pin-secret', 'token-secret', 'mqtt-secret', 'cookie-secret', 'auth-secret', 'key-secret', 'query-secret', '123456', 'leon@example.com']) expect(log.text()).not.toContain(secret);
    expect(log.text()).toContain('[REDACTED]');
    expect(log.text()).toContain('l***@example.com');
    expect(body.Password).toBe('password-secret');
  });

  it('bounds large/circular data and snapshots before later mutation', async () => {
    const log = capture();
    const data: Record<string, unknown> = { text: 'a'.repeat(20000), password: 'hidden' };
    data.self = data;
    const client = new LoggedHttpClient({ request: async <T>() => ({ status: 200, data: data as T, headers: {} }) }, log.diagnostics);
    await client.request(request);
    data.text = 'changed-after-log';
    expect(log.text()).toContain('TRUNCATED');
    expect(log.text()).not.toContain('changed-after-log');
    expect(log.text()).not.toContain('hidden');
    expect(log.text().length).toBeLessThan(12000);
  });
});

describe('HTTP log configuration', () => {
  it.each([['development', 'debug'], ['preview', 'debug'], ['production', 'off']])('defaults %s to %s', (environment, expected) => {
    expect(communicationConfig({ environment, apiBaseUrl: 'https://api.test' }).httpLogLevel).toBe(expected);
  });
  it.each(['off', 'error', 'debug'] as const)('allows explicit level %s', httpLogLevel => {
    expect(communicationConfig({ httpLogLevel }).httpLogLevel).toBe(httpLogLevel);
  });
  it('rejects invalid levels', () => {
    expect(() => communicationConfig({ httpLogLevel: 'verbose' as 'debug' })).toThrow('ROWAN_HTTP_LOG_LEVEL');
  });
});

import { EventEmitter } from 'node:events';
import mqtt from 'mqtt';
import { describe, expect, it, vi } from 'vitest';
import { createMqttConnection } from './mqtt-browser';

vi.mock('mqtt', () => ({ default: { connect: vi.fn() } }));

describe('App真实MQTT工厂认证接线', () => {
  it('signs the WebSocket URL without sending STS secrets in MQTT CONNECT', async () => {
    const client = Object.assign(new EventEmitter(), { end: vi.fn() });
    vi.mocked(mqtt.connect).mockReturnValue(client as unknown as ReturnType<typeof mqtt.connect>);
    const connection = createMqttConnection();
    const credentials = {
      host: 'wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt',
      endpoint: 'example-ats.iot.ap-southeast-2.amazonaws.com', path: '/mqtt',
      clientID: 'backend-issued-client', username: 'AKIDEXAMPLE', password: 'fixture-secret',
      deviceID: 'dev_test', sessionToken: 'fixture-token',
    };
    const pending = connection.connect(credentials, 'dev_test');
    try {
      client.emit('connect');
      await pending;
      const [url, options] = vi.mocked(mqtt.connect).mock.calls.at(-1)!;
      expect(new URL(url as string).searchParams.has('X-Amz-Signature')).toBe(true);
      expect(options).not.toHaveProperty('username');
      expect(options).not.toHaveProperty('password');
      expect(options).toMatchObject({ clientId: credentials.clientID, reconnectPeriod: 0, resubscribe: false });
    } finally { connection.close(); }
  });
});

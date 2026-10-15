import { describe, expect, it, vi } from 'vitest';
import type { HttpClient, HttpRequest, HttpResponse } from '../lib/core';
import { DeviceOtaFlow } from './device-ota';
import { MockHttpClient } from './http';
import type { ApiEnvelope } from './models';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase } from './store';

async function setup(client?: (mock: MockHttpClient) => HttpClient) {
  const database = await MockDatabase.open(new MemoryStorage());
  const mock = new MockHttpClient(database);
  const storage = new MemoryStorage();
  const service = new RowanService(client ? client(mock) : mock, storage);
  await service.login('rowan@example.com', 'Rowan@123', 'password');
  return { database, service, storage };
}

async function ready(flow: DeviceOtaFlow) {
  flow.start();
  await vi.waitFor(() => expect(flow.state.busy).toBe(false));
}

describe('RF-0045 OTA flow', () => {
  it('checks, creates once, shows real progress and restores a task after leaving', async () => {
    const { service, database } = await setup();
    database.state.devices[0].members.user_demo.role = 'mbr';
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    expect(flow.state.check).toMatchObject({ hasUpdate: true, deviceID: 'dev_wine' });
    await Promise.all([flow.create(), flow.create()]);
    expect(Object.keys(database.state.tasks)).toHaveLength(1);
    expect(flow.state.task).toMatchObject({ result: 'updating', progress: 30 });
    const taskID = flow.state.taskID;
    flow.stop();

    const restored = new DeviceOtaFlow(service, 'dev_wine');
    await ready(restored);
    await vi.waitFor(() => expect(restored.state.task?.progress).toBe(60));
    expect(restored.state.taskID).toBe(taskID);
    await restored.poll();
    expect(restored.state.task).toMatchObject({ result: 'success', progress: 100 });
    const polls = database.state.tasks[taskID!].polls;
    await restored.poll();
    expect(database.state.tasks[taskID!].polls).toBe(polls);
    expect((await service.firmware('dev_wine', 'mcu')).hasUpdate).toBe(false);
    restored.stop();
  });

  it('persists an unknown create result and never repeats the PUT', async () => {
    let puts = 0;
    const { service, storage } = await setup((mock) => ({
      request: async <T>(request: HttpRequest): Promise<HttpResponse<T>> => {
        if (request.method === 'PUT' && request.path.endsWith('/ota/task')) {
          puts++;
          await mock.request<ApiEnvelope<unknown>>(request);
          throw new Error('response lost');
        }
        return mock.request<T>(request);
      },
    }));
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    await flow.create();
    expect(flow.state.unknown).toBe(true);
    expect(flow.state.taskID).toBeUndefined();
    expect(storage.values.get('user_demo.ota.dev_wine')).toContain('unknown');
    flow.stop();

    const restored = new DeviceOtaFlow(service, 'dev_wine');
    await ready(restored);
    expect(restored.state.unknown).toBe(true);
    await restored.check();
    await restored.create();
    expect(puts).toBe(1);
    restored.stop();
  });

  it('confirms cancellable states through a readback and never cancels a terminal task', async () => {
    let deletes = 0;
    const { service } = await setup((mock) => ({
      request: async <T>(request: HttpRequest): Promise<HttpResponse<T>> => {
        if (request.method === 'DELETE' && request.path.endsWith('/ota/task')) deletes++;
        return mock.request<T>(request);
      },
    }));
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    await flow.create();
    expect(flow.state.task?.status).toBe('downloading');
    await flow.cancel();
    expect(flow.state.task?.result).toBe('cancelled');
    await flow.cancel();
    expect(deletes).toBe(1);
    flow.stop();
  });

  it('blocks a known offline device before submitting OTA-03', async () => {
    const { service, database } = await setup();
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    database.state.devices[0].online = false;
    await flow.create();
    expect(Object.keys(database.state.tasks)).toHaveLength(0);
    expect(flow.state.error).toContain('设备离线');
    flow.stop();
  });

  it('does not refresh and resend OTA-03 after a 401 response', async () => {
    let puts = 0;
    const { service } = await setup((mock) => ({
      request: async <T>(request: HttpRequest): Promise<HttpResponse<T>> => {
        if (request.method === 'PUT' && request.path.endsWith('/ota/task')) {
          puts++;
          return {
            status: 401,
            headers: {},
            data: { success: false, code: 401, message: 'expired', data: null } as T,
          };
        }
        return mock.request<T>(request);
      },
    }));
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    await flow.create();
    expect(puts).toBe(1);
    expect(flow.state.unknown).toBe(true);
    flow.stop();
  });

  it('keeps an uncertain cancellation pending while the task still runs', async () => {
    let deletes = 0;
    const { service, storage } = await setup((mock) => ({
      request: async <T>(request: HttpRequest): Promise<HttpResponse<T>> => {
        if (request.method === 'DELETE' && request.path.endsWith('/ota/task')) {
          deletes++;
          throw new Error('response lost');
        }
        return mock.request<T>(request);
      },
    }));
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    await flow.create();
    await flow.cancel();
    expect(flow.state.cancelPending).toBe(true);
    expect(storage.values.get('user_demo.ota.dev_wine')).toContain('cancelPending');
    await flow.cancel();
    expect(deletes).toBe(1);
    flow.stop();
  });

  it('separates task history by device and account', async () => {
    const { service, database } = await setup();
    const flow = new DeviceOtaFlow(service, 'dev_wine');
    await ready(flow);
    await flow.check();
    await flow.create();
    const taskID = flow.state.taskID;

    database.state.devices.push({ ...database.state.devices[0], id: 'dev_other' });
    const otherDevice = new DeviceOtaFlow(service, 'dev_other');
    await ready(otherDevice);
    expect(otherDevice.state.taskID).toBeUndefined();
    otherDevice.stop();

    await service.sendCaptcha('other@example.com', 'register');
    await service.register('other@example.com', 'Other@123', '123456', 'US');
    await service.login('other@example.com', 'Other@123', 'password');
    expect(flow.state.active).toBe(false);
    const otherAccount = new DeviceOtaFlow(service, 'dev_wine');
    await ready(otherAccount);
    expect(otherAccount.state.taskID).toBeUndefined();
    expect(otherAccount.state.error).toContain('设备权限');
    expect(taskID).toBeDefined();
    otherAccount.stop();
  });
});

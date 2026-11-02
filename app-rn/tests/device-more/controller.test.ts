import {describe, expect, it, vi} from 'vitest';
import {
  DeviceReadController,
  type DeviceReadHost,
} from '../../src/host/adapter/DeviceReadController';
const binding = {
  deviceId: 'device',
  observationId: 'native-handle',
  sessionRevision: 4,
};
const summary = {
  deviceNickname: '名称',
  deviceName: '',
  productName: '',
  productCategory: '',
  seriesName: '',
  modelName: '',
  mcuVersion: '',
  wifiVersion: '',
  bindingRole: 'unknown',
};
async function settle() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
  }
}
function fixture() {
  const calls: Array<{
    method: string;
    id: string;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];
  const call = (method: string) =>
    vi.fn(
      (id: string) =>
        new Promise((resolve, reject) =>
          calls.push({method, id, resolve, reject}),
        ),
    );
  const host = {
    getDeviceSchedules: call('schedules'),
    getDeviceFirmware: call('firmware'),
    getDeviceMoreSummary: call('more'),
    getDeviceMembers: call('members'),
    getDeviceHelp: call('help'),
    getDeviceLocation: call('location'),
  } as unknown as DeviceReadHost;
  const changed = vi.fn();
  return {
    calls,
    host,
    changed,
    controller: new DeviceReadController(host, changed),
  };
}
describe('more pages use the existing observation-bound GET controller', () => {
  it('dispatches all four methods with only the current observation handle', async () => {
    const f = fixture();
    for (const [feature, result, field] of [
      ['more', summary, 'more'],
      ['members', [], 'members'],
      ['help', [], 'help'],
      ['location', {assignment: 'unknown', roomName: ''}, 'location'],
    ] as const) {
      f.controller.show({feature}, binding);
      expect(f.calls.at(-1)?.method).toBe(feature);
      expect(f.calls.at(-1)?.id).toBe('native-handle');
      f.calls.at(-1)!.resolve(result);
      await settle();
      expect(f.controller.state.phase).toBe('ready');
      expect(f.controller.state[field]).toEqual(result);
    }
  });
  it('serializes cross-feature navigation and retains only the latest destination', async () => {
    const f = fixture();
    f.controller.show({feature: 'more'}, binding);
    f.controller.show({feature: 'members'}, binding);
    f.controller.show({feature: 'help'}, binding);
    expect(f.calls).toHaveLength(1);
    f.calls[0].resolve(summary);
    await settle();
    expect(f.calls.map((x) => x.method)).toEqual(['more', 'help']);
    expect(f.controller.state.more).toBeUndefined();
    f.calls[1].resolve([]);
    await settle();
    expect(f.controller.state.help).toEqual([]);
  });
  it('clears members immediately and rejects old-account results after a binding switch', async () => {
    const f = fixture();
    f.controller.show({feature: 'members'}, binding);
    f.controller.show(
      {feature: 'members'},
      {...binding, observationId: 'new-handle', sessionRevision: 5},
    );
    f.calls[0].resolve([
      {itemKey: 'old', nickname: '旧私有名称', bindingRole: 'sa'},
    ]);
    await settle();
    expect(JSON.stringify(f.controller.state)).not.toContain('旧私有名称');
    expect(f.calls[1].id).toBe('new-handle');
    f.calls[1].resolve([]);
    await settle();
    expect(f.controller.state.members).toEqual([]);
  });
  it('foreground refreshes the same page without exposing its background response', async () => {
    const f = fixture();
    f.controller.show({feature: 'location'}, binding);
    f.controller.setForeground(false);
    f.controller.setForeground(true);
    f.calls[0].resolve({assignment: 'assigned', roomName: '旧房间'});
    await settle();
    expect(f.calls).toHaveLength(2);
    expect(f.controller.state.location).toBeUndefined();
    f.calls[1].resolve({assignment: 'unknown', roomName: ''});
    await settle();
    expect(f.controller.state.location?.assignment).toBe('unknown');
  });
  it('hiding or disposing help drops late results and does not create more work', async () => {
    for (const dispose of [false, true]) {
      const f = fixture();
      f.controller.show({feature: 'help'}, binding);
      if (dispose) {
        f.controller.dispose();
      } else {
        f.controller.hide();
      }
      const notifications = f.changed.mock.calls.length;
      f.calls[0].resolve([
        {itemKey: 'a', title: '旧文章', content: '', createdAt: ''},
      ]);
      await settle();
      expect(f.changed).toHaveBeenCalledTimes(notifications);
      expect(f.calls).toHaveLength(1);
      expect(f.controller.state.help).toBeUndefined();
    }
  });
  it('does not treat malformed members as empty success or leak raw errors', async () => {
    const f = fixture();
    f.controller.show({feature: 'members'}, binding);
    f.calls[0].resolve({raw: 'private'});
    await settle();
    expect(f.controller.state.error).toBe('INVALID_RESPONSE');
    expect(f.controller.state.members).toBeUndefined();
    f.controller.retry();
    f.calls[1].reject({code: 'forbidden', message: 'private'});
    await settle();
    expect(f.controller.state.error).toBe('FORBIDDEN');
    f.controller.retry();
    expect(f.calls).toHaveLength(2);
    expect(JSON.stringify(f.controller.state)).not.toContain('private');
  });
});

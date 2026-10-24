import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceSettingsFlow } from './device-settings';

import { ApiError, type DeviceView } from './models';
import { RowanService } from './rowan';
import {  MemoryStorage, SettingsFixture , SettingsHttp } from '../test-support/settings-fixture';

const flows: DeviceSettingsFlow[] = [];
afterEach(() => { for (const flow of flows.splice(0)) flow.stop(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function setup(start = true) {
  const db = await SettingsFixture.open(new MemoryStorage()), http = new SettingsHttp(db);
  const service = new RowanService(http, new MemoryStorage());
  await service.login('rowan@example.com', 'Rowan@123', 'password');
  const flow = new DeviceSettingsFlow(service, 'dev_wine'); flows.push(flow);
  if (start) await flow.start();
  return { db, http, service, flow };
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('李P1 昵称与所属房间闭环', () => {
  it('keeps nickname available when member and candidate requests fail, with independent retries', async () => {
    const { service, flow } = await setup(false);
    const members = vi.spyOn(service, 'members').mockRejectedValueOnce(new ApiError(403, '成员暂不可读'));
    vi.spyOn(service, 'rooms').mockRejectedValueOnce(new Error('候选断网'));
    await flow.start();
    expect(flow.state.device.value?.deviceNickname).toBe('Living room cooler');
    expect(flow.state.members.error).toBe('成员暂不可读'); expect(flow.state.rooms.error).toBe('候选断网');
    expect(flow.writable).toBe(true);
    flow.editName('  书房酒柜  '); await flow.saveName();
    expect(flow.state.name.phase).toBe('saved'); expect(flow.state.device.value?.deviceNickname).toBe('书房酒柜');
    await flow.loadMembers(); await flow.loadRooms();
    expect(members).toHaveBeenCalledTimes(2); expect(flow.state.members.error).toBe(''); expect(flow.state.rooms.value).toHaveLength(2);
  });
  it('can save a room while the independent members request is still pending', async () => {
    const { service, flow } = await setup(false), wait = deferred<Awaited<ReturnType<RowanService['members']>>>();
    vi.spyOn(service, 'members').mockReturnValue(wait.promise);
    const started = flow.start(); await vi.waitFor(() => expect(flow.writable).toBe(true));
    flow.selectRoom('room_kitchen'); await flow.saveRoom();
    expect(flow.state.room.phase).toBe('saved'); expect(flow.state.location.value?.id).toBe('room_kitchen');
    expect(flow.state.members.loading).toBe(true); wait.resolve([]); await started;
  });
  it('cancels edits without writing and trims/validates only on explicit nickname save', async () => {
    const { service, flow } = await setup(), write = vi.spyOn(service, 'renameDevice');
    flow.editName('Draft'); flow.cancelName(); expect(flow.state.name.draft).toBe('Living room cooler'); expect(write).not.toHaveBeenCalled();
    flow.editName('   '); await flow.saveName(); expect(flow.state.name.error).toContain('不能为空'); expect(write).not.toHaveBeenCalled();
    flow.editName(' Living room cooler '); await flow.saveName(); expect(write).not.toHaveBeenCalled();
    flow.editName('  Office  '); await flow.saveName();
    expect(write).toHaveBeenCalledWith('dev_wine', 'Office', expect.any(AbortSignal));
    expect((await service.device('dev_wine')).deviceNickname).toBe('Office');
    expect((await service.home()).flatMap(group => group.devices)[0].deviceNickname).toBe('Office');
  });
  it('allows only one same-device write even under duplicate save and a second editor', async () => {
    const { service, flow } = await setup(), original = service.renameDevice.bind(service), wait = deferred<void>();
    const write = vi.spyOn(service, 'renameDevice').mockImplementation(async (...args) => { await wait.promise; return original(...args); });
    flow.editName('Office'); const save = flow.saveName();
    flow.selectRoom('room_kitchen'); await flow.saveRoom(); await flow.saveName();
    expect(write).toHaveBeenCalledOnce(); expect(flow.state.room.draft).toBe('room_living');
    wait.resolve(); await save; expect(flow.state.name.phase).toBe('saved');
  });
  it('retains the full rejected nickname draft and cloud name without imposing a new character counter', async () => {
    const { service, flow } = await setup(), name = '123456789012345678901';
    const write = vi.spyOn(service, 'renameDevice'); flow.editName(name); await flow.saveName();
    expect(write).toHaveBeenCalledOnce(); expect(flow.state.name.draft).toBe(name);
    expect(flow.state.name.phase).toBe('idle'); expect(flow.state.device.value?.deviceNickname).toBe('Living room cooler');
    flow.editName('Office'); await flow.saveName(); expect(flow.state.name.phase).toBe('saved');
  });
  it('recovers a committed nickname with a lost response by reading, without another PATCH', async () => {
    const { service, flow } = await setup(), original = service.renameDevice.bind(service);
    const write = vi.spyOn(service, 'renameDevice').mockImplementationOnce(async (...args) => { await original(...args); throw new Error('response lost'); });
    flow.editName('Office'); await flow.saveName();
    expect(flow.state.name.phase).toBe('saved'); expect(flow.state.device.value?.deviceNickname).toBe('Office');
    await flow.saveName(); expect(write).toHaveBeenCalledOnce();
  });
  it('blocks retransmission until unknown nickname results have been read successfully', async () => {
    const { service, flow } = await setup();
    const write = vi.spyOn(service, 'renameDevice').mockRejectedValueOnce(new Error('offline'));
    const read = vi.spyOn(service, 'device').mockRejectedValueOnce(new Error('read offline'));
    flow.editName('Office'); await flow.saveName(); expect(flow.state.name.phase).toBe('unknown');
    await flow.saveName(); expect(write).toHaveBeenCalledOnce();
    await flow.reconcileName(); expect(flow.state.name.phase).toBe('idle'); expect(flow.state.name.draft).toBe('Office');
    expect(read).toHaveBeenCalledTimes(2); await flow.saveName(); expect(write).toHaveBeenCalledTimes(2);
  });
  it('retries only the detail read after an acknowledged write with a failed or stale query', async () => {
    const { service, flow } = await setup(), old = flow.state.device.value!;
    const write = vi.spyOn(service, 'renameDevice');
    vi.spyOn(service, 'device').mockRejectedValueOnce(new Error('read failed')).mockResolvedValueOnce(old);
    flow.editName('Office'); await flow.saveName(); expect(flow.state.name.phase).toBe('unknown');
    await flow.reconcileName(); expect(flow.state.name.phase).toBe('unknown');
    await flow.saveName(); expect(write).toHaveBeenCalledOnce();
    await flow.reconcileName(); expect(flow.state.name.phase).toBe('saved'); expect(write).toHaveBeenCalledOnce();
  });
  it('keeps successful writes confirmed when home refresh fails and retries HOME only', async () => {
    const { service, flow } = await setup(), write = vi.spyOn(service, 'renameDevice');
    const home = vi.spyOn(service, 'home').mockRejectedValueOnce(new Error('home unavailable'));
    flow.editName('Office'); await flow.saveName(); expect(flow.state.name.phase).toBe('saved');
    expect(flow.state.home.error).toBe('home unavailable'); expect(flow.state.device.value?.deviceNickname).toBe('Office');
    await flow.refreshHome(); expect(flow.state.home.value).toBe(true); expect(home).toHaveBeenCalledTimes(2); expect(write).toHaveBeenCalledOnce();
  });
  it('does not call a stale home snapshot synchronized', async () => {
    const { service, flow } = await setup(), oldHome = await service.home();
    vi.spyOn(service, 'home').mockResolvedValueOnce(oldHome);
    flow.editName('Office'); await flow.saveName();
    expect(flow.state.name.phase).toBe('saved'); expect(flow.state.home.error).toContain('尚未同步');
    await flow.refreshHome(); expect(flow.state.home.error).toBe('');
  });
  it('preserves a dirty name and selection when successful refreshes or refresh failures occur', async () => {
    const { service, flow } = await setup(); flow.editName('Unsaved'); flow.selectRoom('room_kitchen');
    await flow.loadDevice(); await flow.loadLocation();
    vi.spyOn(service, 'device').mockRejectedValueOnce(new Error('detail offline')); vi.spyOn(service, 'location').mockRejectedValueOnce(new Error('room offline'));
    await flow.loadDevice(); await flow.loadLocation();
    expect(flow.state.name.draft).toBe('Unsaved'); expect(flow.state.room.draft).toBe('room_kitchen');
    expect(flow.state.location.value?.id).toBe('room_living'); expect(flow.writable).toBe(false);
    await flow.loadDevice(); await flow.loadLocation(); expect(flow.writable).toBe(true);
  });
  it('selects/cancels without PUT, skips unchanged selection and saves/clears explicitly', async () => {
    const { service, flow } = await setup(), write = vi.spyOn(service, 'moveDevice');
    flow.selectRoom('room_kitchen'); expect(write).not.toHaveBeenCalled(); flow.cancelRoom();
    expect(flow.state.room.draft).toBe('room_living'); await flow.saveRoom(); expect(write).not.toHaveBeenCalled();
    flow.selectRoom('room_kitchen'); await flow.saveRoom();
    expect(flow.state.location.value?.id).toBe('room_kitchen'); expect(flow.state.home.value).toBe(true);
    flow.selectRoom(null); expect(write).toHaveBeenCalledOnce(); await flow.saveRoom();
    expect(write).toHaveBeenLastCalledWith('dev_wine', null, expect.any(AbortSignal));
    expect(flow.state.location.value?.id).toBeNull(); expect(flow.state.home.value).toBe(true);
    expect((await service.home()).find(group => group.devices.some(device => device.device.id === 'dev_wine'))?.room?.id).toBeNull();
  });
  it.each([1393,1431])('refreshes candidates after deleted room error %s and requires an explicit reselection', async code => {
    const { service, flow, db } = await setup(); flow.selectRoom('room_kitchen');
    const write = vi.spyOn(service, 'moveDevice').mockRejectedValueOnce(new ApiError(code, '房间不存在'));
    db.state.accounts[0].rooms = db.state.accounts[0].rooms.filter(room => room.id !== 'room_kitchen');
    await flow.saveRoom(); expect(flow.state.roomNeedsSelection).toBe(true);
    expect(flow.state.room.draft).toBe('room_kitchen'); expect(flow.state.location.value?.id).toBe('room_living');
    expect(flow.state.rooms.value?.some(room => room.id === 'room_kitchen')).toBe(false);
    await flow.saveRoom(); expect(write).toHaveBeenCalledOnce();
    flow.selectRoom(null); await flow.saveRoom(); expect(write).toHaveBeenCalledTimes(2); expect(flow.state.location.value?.id).toBeNull();
  });
  it('reconciles a committed room with a lost response and recovers failed reads without PUT', async () => {
    const { service, flow } = await setup(), original = service.moveDevice.bind(service);
    const write = vi.spyOn(service, 'moveDevice').mockImplementationOnce(async (...args) => { await original(...args); throw new Error('response lost'); });
    vi.spyOn(service, 'location').mockRejectedValueOnce(new Error('read offline'));
    flow.selectRoom('room_kitchen'); await flow.saveRoom(); expect(flow.state.room.phase).toBe('unknown');
    await flow.saveRoom(); expect(write).toHaveBeenCalledOnce(); await flow.reconcileRoom();
    expect(flow.state.room.phase).toBe('saved'); expect(flow.state.location.value?.id).toBe('room_kitchen'); expect(write).toHaveBeenCalledOnce();
  });
  it('keeps acknowledged room writes pending while queries are stale and separates home failures', async () => {
    const { service, flow } = await setup(), oldLocation = flow.state.location.value!;
    const write = vi.spyOn(service, 'moveDevice'); vi.spyOn(service, 'location').mockResolvedValueOnce(oldLocation);
    flow.selectRoom(null); await flow.saveRoom(); expect(flow.state.room.phase).toBe('unknown');
    vi.spyOn(service, 'home').mockResolvedValueOnce([]); await flow.reconcileRoom();
    expect(flow.state.room.phase).toBe('saved'); expect(flow.state.home.error).toContain('尚未同步');
    await flow.refreshHome(); expect(flow.state.home.error).toBe(''); expect(write).toHaveBeenCalledOnce();
  });
  it('does not invent an unassigned room or an empty list on first-load failure', async () => {
    const { service, flow } = await setup(false);
    vi.spyOn(service, 'location').mockRejectedValueOnce(new Error('location offline'));
    vi.spyOn(service, 'rooms').mockRejectedValueOnce(new Error('list offline'));
    const write = vi.spyOn(service, 'moveDevice'); await flow.start(); flow.selectRoom(null); await flow.saveRoom();
    expect(flow.state.location.value).toBeNull(); expect(flow.state.rooms.value).toBeNull(); expect(write).not.toHaveBeenCalled();
    await flow.loadRooms(); await flow.loadLocation(); flow.selectRoom(null); await flow.saveRoom(); expect(write).toHaveBeenCalledOnce();
  });
  it.each(['name','room'] as const)('preserves confirmed %s values and blocks writes after a binding permission denial', async kind => {
    const { service, flow } = await setup();
    const write = kind === 'name' ? vi.spyOn(service, 'renameDevice').mockRejectedValueOnce(new ApiError(1382, '无绑定权限')) : vi.spyOn(service, 'moveDevice').mockRejectedValueOnce(new ApiError(1392, '无绑定权限'));
    if (kind === 'name') { flow.editName('Office'); await flow.saveName(); } else { flow.selectRoom(null); await flow.saveRoom(); }
    expect(flow.writable).toBe(false); expect(flow.state.device.value?.deviceNickname).toBe('Living room cooler'); expect(flow.state.location.value?.id).toBe('room_living');
    await flow.saveName(); await flow.saveRoom(); expect(write).toHaveBeenCalledOnce();
  });
  it('retains the existing observer guard', async () => {
    const { db, service, flow } = await setup(false); db.state.devices[0].members[service.userID].role = 'obs'; await flow.start();
    const rename = vi.spyOn(service, 'renameDevice'), move = vi.spyOn(service, 'moveDevice');
    flow.editName('Office'); flow.selectRoom(null); await flow.saveName(); await flow.saveRoom();
    expect(rename).not.toHaveBeenCalled(); expect(move).not.toHaveBeenCalled();
  });
  it.each([1401,1402])('keeps confirmed room data and disables writes after location read denial %s', async code => {
    const { service, flow } = await setup();
    vi.spyOn(service, 'location').mockRejectedValueOnce(new ApiError(code, '设备或绑定已失效'));
    await flow.loadLocation(); expect(flow.state.location.value?.id).toBe('room_living'); expect(flow.writable).toBe(false);
    const write=vi.spyOn(service,'renameDevice'); flow.editName('Office'); await flow.saveName(); expect(write).not.toHaveBeenCalled();
    await flow.loadDevice(); await flow.loadLocation(); expect(flow.writable).toBe(true);
  });
  it('ignores late reads after blur and loads afresh on focus', async () => {
    const { service, flow } = await setup(), old = flow.state.device.value!, wait = deferred<DeviceView>();
    const read = vi.spyOn(service, 'device').mockReturnValueOnce(wait.promise); const refresh = flow.loadDevice();
    flow.stop(); await refresh; await flow.start();
    wait.resolve({ ...old, deviceNickname: 'Late response' }); await Promise.resolve();
    expect(flow.state.device.value?.deviceNickname).toBe('Living room cooler'); expect(read).toHaveBeenCalledTimes(2);
  });
  it('reconciles an interrupted write when returning without replaying it', async () => {
    const { service, flow } = await setup(), original = service.renameDevice.bind(service), wait = deferred<void>();
    const write = vi.spyOn(service, 'renameDevice').mockImplementationOnce(async (...args) => { await original(...args); await wait.promise; });
    flow.editName('Office'); const save = flow.saveName(); await vi.waitFor(async () => expect((await service.device('dev_wine')).deviceNickname).toBe('Office'));
    flow.stop(); await save; await flow.start(); wait.resolve(); await Promise.resolve();
    expect(flow.state.name.phase).toBe('saved'); expect(flow.state.device.value?.deviceNickname).toBe('Office'); expect(write).toHaveBeenCalledOnce();
  });
  it('clears old account state on same-user reauthentication but keeps edits during token refresh', async () => {
    const { service, flow } = await setup(); flow.editName('Unsaved'); flow.selectRoom('room_kitchen');
    const revision = service.sessionRevision; await service.refresh();
    expect(service.sessionRevision).toBe(revision); expect(flow.state.name.draft).toBe('Unsaved'); expect(flow.state.room.draft).toBe('room_kitchen');
    await service.login('rowan@example.com', 'Rowan@123', 'password');
    expect(service.sessionRevision).not.toBe(revision); expect(flow.state.device.value).toBeNull(); expect(flow.state.name.draft).toBe('');
    await flow.start(); expect(flow.state.device.value?.deviceNickname).toBe('Living room cooler');
  });
  it('bounds never-returning writes and allows read-only reconciliation without retransmission', async () => {
    const { service, flow } = await setup();
    const write = vi.spyOn(service, 'renameDevice').mockReturnValueOnce(new Promise(() => undefined));
    vi.spyOn(service, 'device').mockRejectedValueOnce(new Error('query offline'));
    vi.useFakeTimers(); flow.editName('Office'); const save = flow.saveName(); await vi.advanceTimersByTimeAsync(10000); await save;
    expect(write.mock.calls[0][2]?.aborted).toBe(true); expect(flow.state.name.phase).toBe('unknown');
    await flow.saveName(); expect(write).toHaveBeenCalledOnce(); await flow.reconcileName(); expect(flow.state.name.phase).toBe('idle');
  });
  it('does not let an in-flight location read overwrite a newly submitted room', async () => {
    const { service, flow } = await setup(), wait = deferred<Awaited<ReturnType<RowanService['location']>>>();
    const read = vi.spyOn(service, 'location').mockReturnValueOnce(wait.promise), write = vi.spyOn(service, 'moveDevice');
    flow.selectRoom('room_kitchen'); const refresh = flow.loadLocation(); await flow.saveRoom();
    expect(write).not.toHaveBeenCalled(); wait.resolve({id:'room_living',name:'Living room'}); await refresh;
    expect(flow.state.room.draft).toBe('room_kitchen'); await flow.saveRoom();
    expect(read).toHaveBeenCalledTimes(2); expect(write).toHaveBeenCalledOnce(); expect(flow.state.location.value?.id).toBe('room_kitchen');
  });
  it('ignores a late room query from a previous focus while the new query is running', async () => {
    const { service, flow } = await setup(), old = deferred<Awaited<ReturnType<RowanService['location']>>>(), next = deferred<Awaited<ReturnType<RowanService['location']>>>();
    vi.spyOn(service, 'location').mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const refresh = flow.loadLocation(); flow.stop(); await refresh; const started = flow.start();
    old.resolve({id:null,name:''}); await Promise.resolve(); expect(flow.state.location.loading).toBe(true);
    next.resolve({id:'room_kitchen',name:'Kitchen'}); await started; expect(flow.state.location.value?.id).toBe('room_kitchen');
  });
  it('isolates a late write from a previous login epoch, including same-user reauthentication', async () => {
    const { service, flow } = await setup(), wait = deferred<unknown>();
    vi.spyOn(service, 'renameDevice').mockReturnValueOnce(wait.promise);
    flow.editName('Office'); const saved = flow.saveName();
    await service.login('rowan@example.com','Rowan@123','password'); await saved; await flow.start();
    wait.resolve({}); await Promise.resolve(); expect(flow.state.name.phase).toBe('idle'); expect(flow.state.device.value?.deviceNickname).toBe('Living room cooler');
  });
  it('discards a cancelled unsaved draft on a later focus', async () => {
    const { service, flow } = await setup(), write = vi.spyOn(service,'renameDevice');
    flow.editName('Unsaved'); flow.selectRoom('room_kitchen'); flow.stop(); await flow.start();
    expect(flow.state.name.draft).toBe('Living room cooler'); expect(flow.state.room.draft).toBe('room_living'); expect(write).not.toHaveBeenCalled();
  });
});

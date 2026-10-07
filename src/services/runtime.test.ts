import { describe, expect, it } from 'vitest';
import { MockDatabase, MemoryStorage } from './store';
import { MockHttpClient, FetchHttpClient } from './http';
import { RowanService } from './rowan';

async function setup() {
  const storage = new MemoryStorage();
  const db = await MockDatabase.open(storage);
  const service = new RowanService(new MockHttpClient(db), new MemoryStorage());
  await service.login('rowan@example.com', 'Rowan@123', 'password');
  return { db, service, storage };
}
describe('document-backed API flows', () => {
  it('keeps credentials private and restores persisted state', async () => {
    const { service, storage } = await setup();
    await service.createRoom('Bedroom');
    expect(storage.values.get('database')).not.toContain('Rowan@123');
    const reopened = await MockDatabase.open(storage);
    expect(reopened.state.accounts[0].rooms.some(r => r.name === 'Bedroom')).toBe(true);
  });
  it('unifies unknown-account and wrong-password errors', async () => {
    const { service } = await setup();
    await expect(service.login('nobody@example.com', 'wrong', 'password')).rejects.toThrow('账号或密码错误');
    await expect(service.login('rowan@example.com', 'wrong', 'password')).rejects.toThrow('账号或密码错误');
  });
  it('registers without opening a session and isolates the new account', async () => {
    const { service } = await setup();
    await service.logout();
    await service.sendCaptcha('new@example.com', 'register');
    await service.register('new@example.com', ' New@123 ', '123456', 'US');
    expect(service.session).toBe(null);
    await service.login('new@example.com', ' New@123 ', 'password');
    expect((await service.home()).flatMap(r => r.devices)).toHaveLength(0);
  });
  it('preserves unknown preferences and only patches supplied fields', async () => {
    const { service, db } = await setup();
    db.state.accounts[0].setting.homeLayout = 'future-layout';
    db.state.accounts[0].setting.wallpaper={id:'kept-wallpaper',name:{en:'Saved wallpaper','zh-CN':'已有壁纸','zh-TW':'已有桌布'},image:'https://invalid.example.test/wallpaper.png'};
    await service.updateSettings({ language: 'en' });
    expect((await service.settings()).homeLayout).toBe('future-layout');
    expect((await service.settings()).wallpaper?.id).toBe('kept-wallpaper');
    expect((await service.settings()).notification).toBe(true);
  });
  it('rejects stale room saves and rooms containing devices', async () => {
    const { service } = await setup();
    const snapshot = await service.rooms();
    await service.createRoom('Office');
    await expect(service.saveRooms(snapshot.rooms, snapshot.version)).rejects.toMatchObject({ code: 409 });
    const fresh = await service.rooms();
    await expect(service.saveRooms(fresh.rooms.filter(r => r.id !== 'room_living'), fresh.version)).rejects.toThrow('房间内仍有设备');
  });
  it('only unbinds self, immediately removing authorization', async () => {
    const { service } = await setup();
    await service.unbind('dev_wine');
    await expect(service.device('dev_wine')).rejects.toMatchObject({ code: 403 });
  });
  it('refreshes once for concurrent callers and discards stale session results', async () => {
    const { service, db } = await setup();
    const before = db.state.sequence;
    await Promise.all([service.refresh(), service.refresh(), service.refresh()]);
    expect(db.state.sequence - before).toBe(2);
    const pending = service.refresh();
    await service.logout();
    await pending.catch(() => undefined);
    expect(service.session).toBe(null);
  });
  it('covers schedule creation, enabled-preserving edits, deletion and OTA terminal state', async () => {
    const { service } = await setup();
    const schedule = await service.saveSchedule('dev_wine', { type: 'periodic', name: 'Night', enabled: false, startTime: '22:00', endTime: '07:00', repeatType: 'weekdays', weekdays: [1,2,3,4,5], mode: 'sleep', action: { Power: 0 }, timeZone: 'America/Chicago' });
    const edited = await service.saveSchedule('dev_wine', { ...schedule, name: 'Quiet' });
    expect(edited.enabled).toBe(false);
    await service.deleteSchedule('dev_wine', schedule.id);
    expect(await service.schedules('dev_wine')).toHaveLength(0);
    const task = await service.startOta('dev_wine', 'mcu', 'fw_mcu_2');
    await service.otaTask('dev_wine', task.taskID);
    await service.otaTask('dev_wine', task.taskID);
    expect((await service.otaTask('dev_wine', task.taskID)).result).toBe('success');
    await expect(service.cancelOta('dev_wine', task.taskID)).rejects.toMatchObject({ code: 409 });
  });
  it('does not silently fall back to mock in real HTTP mode', async () => {
    const client = new FetchHttpClient('https://api.example.test', async () => { throw new Error('offline'); });
    await expect(client.request({ method: 'GET', path: '/api/app/devices' })).rejects.toThrow('offline');
  });
  it('refreshes expired access for room snapshots through the shared service',async()=>{
    const {service,db}=await setup();db.state.tokens[service.session!.accessToken].expiresAt=0;
    expect((await service.rooms()).rooms).toHaveLength(2);
  });
  it('accepts share idempotently and revokes the removed member',async()=>{
    const {service:admin,db}=await setup();const share=await admin.share('dev_wine');
    const member=new RowanService(new MockHttpClient(db),new MemoryStorage());
    await member.sendCaptcha('member@example.com','register');await member.register('member@example.com','Member@123','123456','US');await member.login('member@example.com','Member@123','password');
    await member.acceptShare('dev_wine',share.bindCode);await member.acceptShare('dev_wine',share.bindCode);
    expect((await member.device('dev_wine')).bindingRole).toBe('mbr');
    expect((await admin.members('dev_wine')).filter(m=>m.bindingRole==='mbr')).toHaveLength(1);
    await expect(member.share('dev_wine')).rejects.toMatchObject({code:403});
    await admin.removeMember('dev_wine',member.userID);await expect(member.device('dev_wine')).rejects.toMatchObject({code:403});
  });
  it('allows an observer to unbind self without gaining write access',async()=>{
    const {service,db}=await setup();db.state.devices[0].members.user_demo.role='obs';
    await expect(service.renameDevice('dev_wine','x')).rejects.toMatchObject({code:403});
    await service.unbind('dev_wine');expect(db.state.devices[0].members.user_demo).toBeUndefined();
  });
  it('covers captcha login and reset without automatically signing in',async()=>{
    const {service}=await setup();await service.logout();
    await service.sendCaptcha('rowan@example.com','login');await service.login('rowan@example.com','123456','captcha');await service.logout();
    // Controlled expiry of send cooldown avoids sleeping for production-sized budgets.
    const {service:reset,db}=await setup();await reset.logout();
    await reset.sendCaptcha('rowan@example.com','forget');await reset.resetPassword('rowan@example.com','Changed@123','123456');
    expect(reset.session).toBeNull();await expect(reset.login('rowan@example.com','Rowan@123','password')).rejects.toThrow();
    await reset.login('rowan@example.com','Changed@123','password');expect(reset.userID).toBe('user_demo');expect(db.state.captchas['rowan@example.com']).toBeUndefined();
  });
});

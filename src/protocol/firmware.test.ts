import { describe, expect, it } from 'vitest';
import { decodeFrame, encodeFrame, fragment, reassemble, parseAdvertisement, deriveKey } from './ble';
import { MockDatabase, MemoryStorage } from '../services/store';
import { MockDeviceTransport, Provisioner, ShadowSession } from './device';

describe('firmware V1.1 simulated vectors (not hardware golden vectors)', () => {
  it('round-trips AES CTR and detects corrupt CRC', () => {
    const key = deriveKey('80a036d51aac', 'ADD6830');
    const frame = encodeFrame(1, new TextEncoder().encode('ROWAN WiFi'), key);
    expect([...frame.slice(0, 2)]).toEqual([0xa5, 0x5a]);
    expect(decodeFrame(frame, key).command).toBe(1);
    frame[frame.length - 1] ^= 1;
    expect(() => decodeFrame(frame, key)).toThrow('CRC');
  });
  it.each([23,128,247,517])('reassembles long packets at MTU %i', mtu => {
    const payload = new Uint8Array(220).fill(42);
    const packets = fragment(payload, mtu);
    expect(reassemble(packets)).toEqual(payload);
    expect(() => reassemble(packets.slice(1))).toThrow();
  });
  it('uses manufacturer MAC rather than the platform handle', () => {
    const a = parseAdvertisement({ handle:'ios-uuid', service:'0822', manufacturer:new Uint8Array([0,0,0x80,0xa0,0x36,0xd5,0x1a,0xac,7,65,68,68,54,56,51,48]) });
    expect(a.mac).toBe('80a036d51aac');
    expect(a.handle).toBe('ios-uuid');
  });
  it('provisions ACK by ACK, then A C B D E F before binding confirmation', async () => {
    const db = await MockDatabase.open(new MemoryStorage());
    const transport = new MockDeviceTransport(db, { delay: 0 });
    const states: string[] = [];
    const result = await new Provisioner(transport).run({ userID:'user_demo', mac:'80a036d51aac', model:'ADD6830', ssid:'ROWAN WiFi', password:'wifi-password', token:'mock-access', bindCode:'txn-test', productID:'prd_wine', modelID:'ADD6830' }, x => states.push(x));
    expect(states.filter(x=> /^[A-F][01]$/.test(x))).toEqual(['A1','A0','C1','C0','B1','B0','D1','D0','E1','E0','F1','F0']);
    expect(result.deviceID).toBe('dev_wine');
  });
  it('rejects incorrect ACK and Wi-Fi password instead of succeeding', async () => {
    const db = await MockDatabase.open(new MemoryStorage());
    for (const fault of ['wrong-ack','wifi-password'] as const) {
      const transport = new MockDeviceTransport(db, { delay: 0, fault });
      await expect(new Provisioner(transport).run({ userID:'user_demo', mac:'80a036d51aac', model:'ADD6830', ssid:'ROWAN WiFi', password:'x', token:'x', bindCode:'t', productID:'prd_wine', modelID:'ADD6830' }, () => undefined)).rejects.toThrow();
    }
  });
  it('updates confirmed state only after correlated reported, not accepted', async () => {
    const db = await MockDatabase.open(new MemoryStorage());
    const transport = new MockDeviceTransport(db, { delay: 0, fault:'no-report' });
    const session = new ShadowSession(transport, 'dev_wine', 'user_demo', 10);
    await session.connect();
    await expect(session.command({ Power: 0 })).rejects.toThrow('未确认设备结果');
    expect(session.confirmed.Power).toBe(1);
    session.close();
  });
  it.each(['AT','55AA'] as const)('confirms %s control and ignores stale versions', async protocol => {
    const db = await MockDatabase.open(new MemoryStorage());
    db.state.devices[0].protocol = protocol;
    const transport = new MockDeviceTransport(db, { delay: 0 });
    const session = new ShadowSession(transport, 'dev_wine', 'user_demo');
    await session.connect();
    await session.command({ Power: 0 });
    expect(session.confirmed.Power).toBe(0);
    expect(transport.executionTrace[0].protocol).toBe(protocol);
    expect(typeof transport.executionTrace[0].request).toBe(protocol==='AT'?'string':'object');
    session.receive({ version: 0, state: { reported: { Power: 1 } } });
    expect(session.confirmed.Power).toBe(0);
    session.close();
  });
  it.each(['drop-fragment','out-of-order','crc','disconnect'] as const)('rejects %s without creating a binding',async fault=>{
    const db=await MockDatabase.open(new MemoryStorage()),driver=new MockDeviceTransport(db,{delay:0,fault});
    await expect(new Provisioner(driver).run({userID:'user_demo',mac:'80a036d51aad',model:'RW-DH01',ssid:'2.4 GHz',password:'x',token:'x',bindCode:'fault-test',productID:'prd_humidity',modelID:'RW-DH01'},()=>undefined)).rejects.toThrow();
    expect(db.state.binds['fault-test']).toBeUndefined();expect(db.state.devices).toHaveLength(1);
  });
  it('uses only Classic Shadow topics and persists command deduplication',async()=>{
    const storage=new MemoryStorage(),db=await MockDatabase.open(storage),driver=new MockDeviceTransport(db,{delay:0}),topics:string[]=[];
    driver.subscribe('dev_wine','user_demo',(topic)=>topics.push(topic));
    const message={version:1,clientToken:'same-token',state:{desired:{Power:0}}};
    await driver.publish('dev_wine','user_demo',message);
    expect(topics.every(t=>t.startsWith('$aws/things/dev_wine/shadow/'))).toBe(true);
    expect(topics.some(t=>t.endsWith('/update/reported'))).toBe(false);
    const version=db.state.devices[0].shadowVersion;
    const reopened=await MockDatabase.open(storage);await new MockDeviceTransport(reopened,{delay:0}).publish('dev_wine','user_demo',message);
    expect(reopened.state.devices[0].shadowVersion).toBe(version);
  });
});

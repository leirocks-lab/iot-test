import { describe, expect, it, vi } from 'vitest';
import { fragment } from './ble';
import { MockDatabase, MemoryStorage } from '../services/store';
import { MockDeviceTransport, Provisioner, ShadowSession } from './device';

const input={userID:'user_demo',mac:'80a036d51aac',model:'ADD6830',ssid:'2.4 GHz',password:'test',token:'test',bindCode:'bounds',productID:'prd_wine',modelID:'ADD6830'};
describe('mock protocol boundaries',()=>{
  it('uses document fragment tags 00 / 01 / 10 / 11',()=>{
    expect(fragment(new Uint8Array(50),23).map(p=>p[0])).toEqual([0x01,0x10,0x11]);
  });
  it('receives a separate module 0x0F challenge',async()=>{
    const db=await MockDatabase.open(new MemoryStorage());const driver=new MockDeviceTransport(db,{delay:0});
    const challenge=vi.spyOn(driver,'challenge');
    await new Provisioner(driver).run(input,()=>undefined);
    expect(challenge).toHaveBeenCalledOnce();
  });
  it('enforces ACK budget and aborts the pending transport',async()=>{
    vi.useFakeTimers();
    try {
      const db=await MockDatabase.open(new MemoryStorage());const driver=new MockDeviceTransport(db,{delay:6000});
      const result=new Provisioner(driver).run(input,()=>undefined);
      const rejected=expect(result).rejects.toThrow('ACK');await vi.advanceTimersByTimeAsync(5001);await rejected;
    }finally{vi.useRealTimers();}
  });
  it('invalidates control readiness after credential rejection',async()=>{
    const db=await MockDatabase.open(new MemoryStorage()),driver=new MockDeviceTransport(db,{delay:0}),session=new ShadowSession(driver,'dev_wine','user_demo');
    await session.connect();driver.fault='credentials';await expect(session.command({Power:0})).rejects.toThrow();
    expect(session.ready).toBe(false);expect(session.sending).toBe(false);session.close();
  });
  it('keeps waiting when a correlated report does not match the requested value',async()=>{
    const db=await MockDatabase.open(new MemoryStorage()),driver=new MockDeviceTransport(db,{delay:0}),session=new ShadowSession(driver,'dev_wine','user_demo');
    await session.connect();let waiting=false;
    vi.spyOn(driver,'publish').mockImplementation(async(_id,_user,message)=>{
      session.receive({version:2,clientToken:message.clientToken,state:{reported:{Power:1}}});waiting=session.sending;
      session.receive({version:3,clientToken:message.clientToken,state:{reported:{Power:0}}});
    });
    await session.command({Power:0});expect(waiting).toBe(true);expect(session.confirmed.Power).toBe(0);session.close();
  });
  it('does not apply an in-flight control to fresh reset data',async()=>{
    const db=await MockDatabase.open(new MemoryStorage()),driver=new MockDeviceTransport(db,{delay:20});
    const pending=driver.publish('dev_wine','user_demo',{version:1,clientToken:'before-reset',state:{desired:{Power:0}}});
    const rejection=expect(pending).rejects.toMatchObject({code:499});
    await db.reset();await rejection;expect(db.state.devices[0].properties.Power).toBe(1);
  });
});

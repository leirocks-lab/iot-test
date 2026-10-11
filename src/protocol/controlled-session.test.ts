import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlledDeviceSession } from './controlled-session';
import { MockDeviceSession, type DeviceSession } from './device-session';
import { MockDeviceTransport } from './device';
import { mockControlProfile, type ControlProfileResolver } from '../services/device-controls';
import { MockDatabase, MemoryStorage } from '../services/store';
import { MockHttpClient } from '../services/http';
import { RowanService } from '../services/rowan';
import type { DeviceView, ThingModel } from '../services/models';

const context:{device:DeviceView;model:ThingModel}={device:{deviceNickname:'fixture',device:{id:'dev'},product:{id:'fixture-product'},bindingAt:'',bindingRole:'sa'},model:{version:'2',attributes:[{identifier:'actual_relay',type:'boolean',writable:true}],services:[],events:[]}};
const resolveProfile:ControlProfileResolver=async()=>({bindings:{power:{identifier:'actual_relay',roles:['sa'],switch:{on:true,off:false}}}});
function setup(resolver:ControlProfileResolver|undefined=resolveProfile){
  const listeners=new Set<()=>void>();
  const inner:DeviceSession={ready:false,sending:false,canWrite:true,confirmed:{actual_relay:false},connect:vi.fn(async()=>{Object.assign(inner,{ready:true});}),command:vi.fn(async()=>undefined),
    close:vi.fn(()=>{Object.assign(inner,{ready:false});for(const fn of listeners)fn();}),onChange:fn=>{listeners.add(fn);return ()=>{listeners.delete(fn);};},
  };
  const load=vi.fn(async()=>structuredClone(context)),session=new ControlledDeviceSession(inner,load,resolver);return {inner,load,session};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('能力与会话入口生命周期（构造模型）',()=>{
  it('blocks bypassing UI validation and never fabricates a Power field',async()=>{
    const {session,inner}=setup();await session.connect();await expect(session.command({Power:1})).rejects.toThrow('未授权');
    await expect(session.command({actual_relay:1})).rejects.toThrow('布尔');await session.command({actual_relay:true});expect(inner.command).toHaveBeenCalledWith({actual_relay:true});
    session.close();await expect(session.command({actual_relay:true})).rejects.toThrow('未确认');
  });
  it('keeps synchronization separate from unavailable production controls',async()=>{
    const {inner,load}=setup(),session=new ControlledDeviceSession(inner,load);await session.connect();expect(session.ready).toBe(true);
    expect(session.controls).toBeUndefined();expect(session.controlError).toContain('映射尚未配置');await expect(session.command({actual_relay:true})).rejects.toThrow('映射尚未配置');expect(inner.command).not.toHaveBeenCalled();session.close();
  });
  it('invalidates a retained old controls object after reconnecting with new capabilities',async()=>{
    const {session,inner,load}=setup();await session.connect();const old=session.controls!;session.close();await session.connect();
    await expect(old.toggle('power')).rejects.toThrow();expect(inner.command).not.toHaveBeenCalled();await session.controls!.toggle('power');expect(inner.command).toHaveBeenCalledOnce();expect(load).toHaveBeenCalledTimes(2);session.close();
  });
  it('does not attach a late model from a cancelled context to the new session',async()=>{
    const {session,load}=setup();let done:(value:typeof context)=>void=()=>undefined;load.mockImplementationOnce(()=>new Promise(resolve=>{done=resolve;}));
    const pending=session.connect(),rejected=expect(pending).rejects.toMatchObject({code:499});session.close();await rejected;await session.connect();const fresh=session.controls;
    done({...structuredClone(context),model:{...context.model,version:'old'}});await Promise.resolve();expect(session.controls).toBe(fresh);expect(session.controls!.model.version).toBe('2');session.close();
  });
  it('keeps an invalid model error visible while retaining full-sync state',async()=>{
    const {session,load}=setup();load.mockResolvedValue({...context,model:{...context.model,attributes:[]}});await session.connect();
    expect(session.ready).toBe(true);expect(session.controls).toBeUndefined();expect(session.controlError).toContain('不在当前');session.close();
  });
  it('bounds capability loading without converting full sync into control authorization',async()=>{
    vi.useFakeTimers();const {session,load}=setup();load.mockImplementation(()=>new Promise(()=>undefined));const pending=session.connect();
    await vi.advanceTimersByTimeAsync(10001);await pending;expect(session.ready).toBe(true);expect(session.controlError).toContain('能力读取超时');expect(session.controls).toBeUndefined();session.close();
  });
});

async function mockSetup(humidity=false){
  const db=await MockDatabase.open(new MemoryStorage()),service=new RowanService(new MockHttpClient(db),new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
  if(humidity){const d=db.state.devices[0];d.productID='prd_humidity';d.properties={Power:1,TargetHumidity:50,CurrentHumidity:55,Mode:'normal',Light:0,Brightness:50,ChildLock:0,Mute:false};}
  const driver=new MockDeviceTransport(db,{delay:0}),owner=service.userID,revision=service.sessionRevision;
  const session=new ControlledDeviceSession(new MockDeviceSession(driver,'dev_wine',owner,{current:()=>service.session?.userID===owner&&service.sessionRevision===revision,start:()=>undefined,stop:()=>undefined,credentials:signal=>service.mqtt('dev_wine',signal)}),
    async signal=>{const device=await service.device('dev_wine',signal);return {device,model:await service.model(device.product!.id,signal)};},mockControlProfile);
  await session.connect();return {db,service,driver,session};
}
describe('七项控制Mock HTTP→策略→Shadow→MCU→reported闭环',()=>{
  it('covers power/temperature/mode/light/brightness/lock/mute with exact single-property writes',async()=>{
    const {session,db,driver,service}=await mockSetup(),notification=service.session!.setting.notification,settings=vi.spyOn(service,'updateSettings');
    const controls=session.controls!;expect(controls.list()).toHaveLength(7);await controls.toggle('power');expect(session.confirmed.Power).toBe(0);
    await controls.submit('temperature','59','F');expect(session.confirmed.TargetTemperature).toBe(15);
    await controls.choose('mode','sleep');expect(session.confirmed.Mode).toBe('sleep');expect(session.confirmed.TargetTemperature).toBe(15);
    await controls.submit('brightness','60','C');expect(session.confirmed.Brightness).toBe(60);expect(session.confirmed.Light).toBe(0);
    await controls.toggle('light');expect(session.confirmed.Light).toBe(1);await controls.toggle('mute');expect(session.confirmed.Mute).toBe(true);expect(typeof session.confirmed.Mute).toBe('boolean');
    await controls.toggle('childLock');expect(session.confirmed.ChildLock).toBe(1);await expect(controls.toggle('power')).rejects.toThrow('童锁');await controls.toggle('childLock');expect(session.confirmed.ChildLock).toBe(0);
    expect(driver.executionTrace).toHaveLength(8);expect(db.state.devices[0].properties.Mute).toBe(true);expect(service.session!.setting.notification).toBe(notification);expect(settings).not.toHaveBeenCalled();session.close();
  });
  it('uses the humidity product model and never adds a temperature control',async()=>{
    const {session}=await mockSetup(true);expect(session.controls!.list().some(item=>item.kind==='temperature')).toBe(false);
    await session.controls!.submit('humidity','65','C');expect(session.confirmed.TargetHumidity).toBe(65);expect(session.confirmed.TargetTemperature).toBeUndefined();session.close();
  });
  it('preserves old lock and mute on timeout, stops waiting and never resends',async()=>{
    const {session,driver}=await mockSetup();driver.fault='no-report';vi.useFakeTimers();
    const pending=session.controls!.toggle('childLock'),rejected=expect(pending).rejects.toThrow('未确认设备结果');expect(session.sending).toBe(true);expect(session.confirmed.ChildLock).toBe(0);
    await vi.advanceTimersByTimeAsync(10001);await rejected;expect(session.sending).toBe(false);expect(session.confirmed.ChildLock).toBe(0);expect(session.confirmed.Mute).toBe(false);expect(driver.executionTrace).toHaveLength(0);session.close();
  });
  it('keeps a legacy persisted device without Mute unknown rather than defaulting confirmed false',async()=>{
    const {session,db}=await mockSetup();session.close();delete db.state.devices[0].properties.Mute;await session.connect();
    expect(session.confirmed.Mute).toBeUndefined();await expect(session.controls!.toggle('mute')).rejects.toThrow('未知');expect(db.state.devices[0].properties.Mute).toBeUndefined();session.close();
  });
  it('does not release locked controls when an unlock times out',async()=>{
    const {session,driver}=await mockSetup();await session.controls!.toggle('childLock');driver.fault='no-report';vi.useFakeTimers();
    const pending=session.controls!.toggle('childLock'),rejected=expect(pending).rejects.toThrow('未确认');expect(session.confirmed.ChildLock).toBe(1);
    await vi.advanceTimersByTimeAsync(10001);await rejected;expect(session.confirmed.ChildLock).toBe(1);await expect(session.controls!.toggle('power')).rejects.toThrow('童锁');expect(driver.executionTrace).toHaveLength(1);session.close();
  });
  it('retains confirmed mute and stops writes after role revocation/disconnect',async()=>{
    const {session,service,driver}=await mockSetup();await session.controls!.toggle('mute');driver.fault='permission';
    await expect(session.controls!.toggle('mute')).rejects.toThrow('权限');expect(session.confirmed.Mute).toBe(true);expect(session.ready).toBe(false);
    await service.logout();await expect(session.command({Mute:false})).rejects.toThrow();session.close();
  });
});

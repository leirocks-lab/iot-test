import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlledDeviceSession } from './controlled-session';
import { MockDeviceSession, RealtimeDeviceSession, type DeviceProfileResolver, type DeviceSyncProfile } from './device-session';
import { MockDeviceTransport } from './device';
import { MqttConnection, type MqttPort } from './mqtt-connection';
import { maintenanceLedger, mockMaintenanceProfile, type MaintenanceProfileResolver } from '../services/device-maintenance';
import { mockControlProfile } from '../services/device-controls';
import { MemoryStorage, MockDatabase } from '../services/store';
import { MockHttpClient } from '../services/http';
import { RowanService } from '../services/rowan';

const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),decode=(value:Uint8Array)=>JSON.parse(new TextDecoder().decode(value));
async function mockSetup(){
  const db=await MockDatabase.open(new MemoryStorage()),service=new RowanService(new MockHttpClient(db),new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
  const driver=new MockDeviceTransport(db,{delay:0}),load=async(signal:AbortSignal)=>{const device=await service.device('dev_wine',signal);return {device,model:await service.model(device.product!.id,signal)};};
  const inner=new MockDeviceSession(driver,'dev_wine',service.userID,{current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:s=>service.mqtt('dev_wine',s)});
  const ledger=maintenanceLedger(),session=new ControlledDeviceSession(inner,load,mockControlProfile,mockMaintenanceProfile,ledger);await session.connect();return {db,service,driver,session,ledger,load};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('维护服务Mock完整链路',()=>{
  it('confirms once through MCU/reported, cancel publishes nothing and legacy property shortcut is blocked',async()=>{
    const {session,driver,db}=await mockSetup(),publish=vi.spyOn(driver,'publish');expect(session.maintenance!.text).toBe('120 h');
    session.maintenance!.requestReset().cancel();expect(publish).not.toHaveBeenCalled();await expect(session.command({Service:'CleanReset'})).rejects.toThrow('未授权');
    const ticket=session.maintenance!.requestReset(),pending=ticket.confirm();expect(session.confirmed.CleanHours).toBe(120);expect(session.sending).toBe(true);await pending;
    expect(publish).toHaveBeenCalledOnce();expect(session.confirmed.CleanHours).toBe(0);expect(db.state.devices[0].properties.CleanHours).toBe(0);expect(driver.executionTrace).toHaveLength(1);expect(session.maintenance!.ledger.phase).toBe('confirmed');session.close();
  });
  it('timeout does not resend or reopen reset; failed full query stays blocked until valid synchronization',async()=>{
    const {session,driver,ledger}=await mockSetup(),publish=vi.spyOn(driver,'publish');driver.fault='no-report';vi.useFakeTimers();
    const pending=session.maintenance!.requestReset().confirm(),rejected=expect(pending).rejects.toThrow('未确认');await vi.advanceTimersByTimeAsync(10001);await rejected;
    expect(session.confirmed.CleanHours).toBe(120);expect(ledger.phase).toBe('unknown');expect(()=>session.maintenance!.requestReset()).toThrow('先同步');expect(publish).toHaveBeenCalledOnce();
    vi.useRealTimers();
    driver.fault='network';await expect(session.connect()).rejects.toThrow('离线');expect(ledger.phase).toBe('unknown');expect(publish).toHaveBeenCalledOnce();
    driver.fault='none';await session.connect();expect(ledger.phase).toBe('idle');expect(publish).toHaveBeenCalledOnce();expect(driver.executionTrace).toHaveLength(0);
    await session.maintenance!.requestReset().confirm();expect(publish).toHaveBeenCalledTimes(2);session.close();
  });
  it('old confirmation cannot execute after reconnect and missing legacy count is not defaulted to zero',async()=>{
    const {session,db,driver}=await mockSetup();const old=session.maintenance!,ticket=old.requestReset();session.close();await session.connect();
    await expect(ticket.confirm()).rejects.toThrow('失效');expect(driver.executionTrace).toHaveLength(0);session.close();delete db.state.devices[0].properties.CleanHours;await session.connect();
    expect(session.maintenance!.value).toBeUndefined();expect(()=>session.maintenance!.requestReset()).toThrow('未知');session.close();
  });
  it('sending then leaving keeps unknown for the next controller until a new full snapshot',async()=>{
    const {session,driver,ledger,load}=await mockSetup();driver.fault='no-report';const pending=session.maintenance!.requestReset().confirm(),rejected=expect(pending).rejects.toMatchObject({code:499});session.close();await rejected;
    expect(ledger.phase).toBe('unknown');driver.fault='none';const inner=new MockDeviceSession(driver,'dev_wine','user_demo',{current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:async()=>({})});
    const next=new ControlledDeviceSession(inner,load,mockControlProfile,mockMaintenanceProfile,ledger);await next.connect();expect(next.maintenance!.ledger.phase).toBe('idle');expect(driver.executionTrace).toHaveLength(0);next.close();
  });
  it('production controls are not a substitute for a missing maintenance resolver',async()=>{
    const {session,load}=await mockSetup();session.close();const next=new ControlledDeviceSession(session,load,mockControlProfile);await next.connect();expect(next.maintenance).toBeUndefined();expect(next.maintenanceError).toContain('映射尚未配置');next.close();
  });
  it('a late reset report from a replaced session cannot confirm a new reset even within the same millisecond',async()=>{
    const {session,driver,ledger,load}=await mockSetup();vi.useFakeTimers();driver.fault='no-report';const publish=vi.spyOn(driver,'publish'),subscribe=vi.spyOn(driver,'subscribe');
    const old=session.maintenance!.requestReset().confirm(),cancelled=expect(old).rejects.toMatchObject({code:499});const oldToken=publish.mock.calls[0][2].clientToken;session.close();await cancelled;
    const inner=new MockDeviceSession(driver,'dev_wine','user_demo',{current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:async()=>({})}),next=new ControlledDeviceSession(inner,load,mockControlProfile,mockMaintenanceProfile,ledger);await next.connect();
    const pending=next.maintenance!.requestReset().confirm(),newToken=publish.mock.calls[1][2].clientToken;expect(newToken).not.toBe(oldToken);
    const receive=subscribe.mock.calls.at(-1)![2];receive('$aws/things/dev_wine/shadow/update/accepted',{version:2,clientToken:oldToken,state:{reported:{CleanHours:0}}});expect(next.sending).toBe(true);expect(ledger.phase).toBe('sending');
    receive('$aws/things/dev_wine/shadow/update/accepted',{version:3,clientToken:newToken,state:{reported:{CleanHours:0}}});await pending;expect(ledger.phase).toBe('confirmed');next.close();
  });
});

function realtimeSetup(resultOnly=true){
  const listeners=new Map<string,(()=>void)[]>();let message:(topic:string,payload:Uint8Array)=>void=()=>undefined;
  const port:MqttPort={on:(event,fn)=>{listeners.set(event,[...(listeners.get(event)??[]),fn]);},onMessage:fn=>{message=fn;},subscribe:(_topic,done)=>done(),unsubscribe:vi.fn(),end:vi.fn(),publish:vi.fn((_topic,_payload,done)=>done())};
  const context={device:{deviceNickname:'fixture',device:{id:'dev'},product:{id:'fixture'},bindingAt:'',bindingRole:'sa' as const},model:{version:'v2',attributes:[{identifier:'filter_seconds',type:'number' as const,writable:false,unit:'s'}],services:[{identifier:'reset_v2'}],events:[]}};
  const sync:DeviceSyncProfile={topics:['fixture/state'],canWrite:true,query:id=>({topic:'fixture/query',payload:encode({id})}),decode:(_topic,data)=>decode(data),
    service:(call,id)=>({topic:'fixture/service',payload:encode({id,...call}),confirmation:resultOnly?{kind:'result'}:{kind:'reported',expected:{filter_seconds:0}}})};
  const profile:DeviceProfileResolver=async()=>sync;
  const inner=new RealtimeDeviceSession({deviceID:'dev',userID:'user',current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:async()=>({host:'wss://broker.example.test/mqtt',endpoint:'broker.example.test',path:'/mqtt',clientID:'issued',username:'issued',password:'public-fixture',deviceID:'dev'}),context:async()=>context,profile,connection:async()=>new MqttConnection(()=>{queueMicrotask(()=>{for(const fn of listeners.get('connect')??[])fn();});return port;},100)});
  const resolver:MaintenanceProfileResolver=async()=>({attribute:'filter_seconds',reset:{identifier:'reset_v2',params:{target:'filter'},roles:['sa'],conditions:[]}});
  const session=new ControlledDeviceSession(inner,async()=>context,undefined,resolver);
  const report=(value:unknown)=>message('fixture/state',encode(value));
  const start=async(count=215)=>{const before=vi.mocked(port.publish).mock.calls.length,pending=session.connect();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledTimes(before+1));report({kind:'full',version:1,requestID:decode(vi.mocked(port.publish).mock.calls.at(-1)![1]).id,reported:{filter_seconds:count}});await pending;};
  const call=()=>{const pending=session.maintenance!.requestReset().confirm(),publication=decode(vi.mocked(port.publish).mock.calls.at(-1)![1]);return {pending,id:publication.id,publication};};
  return {session,port,report,start,call,sync};
}
describe('维护服务实时会话（合成MQTT协议）',()=>{
  it('PUBACK and unrelated/incorrect/invalid service results cannot confirm; successful result alone never zeros data',async()=>{
    const {session,port,report,start,call}=realtimeSetup();await start();const {pending,id,publication}=call();expect(publication).toMatchObject({identifier:'reset_v2',params:{target:'filter'}});
    report({kind:'serviceResult',requestID:'foreign',identifier:'reset_v2',success:true});report({kind:'serviceResult',requestID:id,identifier:'other',success:true});report({kind:'serviceResult',requestID:id,identifier:'reset_v2',success:'true'});
    report({kind:'delta',version:2,requestID:id,reported:{filter_seconds:0}});expect(session.sending).toBe(true);
    report({kind:'delta',version:3,reported:{filter_seconds:7}});report({kind:'serviceResult',requestID:id,identifier:'reset_v2',success:true});await pending;
    expect(session.confirmed.filter_seconds).toBe(7);expect(session.maintenance!.ledger.phase).toBe('confirmed');expect(port.publish).toHaveBeenCalledTimes(2);session.close();
  });
  it('keeps actual count unchanged after an explicitly matched refusal',async()=>{
    const {session,report,start,call}=realtimeSetup();await start();const {pending,id}=call(),rejected=expect(pending).rejects.toThrow('拒绝');report({kind:'serviceResult',requestID:id,identifier:'reset_v2',success:false});await rejected;
    expect(session.confirmed.filter_seconds).toBe(215);expect(session.maintenance!.ledger.phase).toBe('failed');expect(session.sending).toBe(false);session.close();
  });
  it('reported confirmation requires a new correlated update even when the old value is already zero',async()=>{
    const {session,report,start,call}=realtimeSetup(false);await start(0);const {pending,id}=call();expect(session.sending).toBe(true);
    report({kind:'serviceResult',requestID:id,identifier:'reset_v2',success:true});report({kind:'delta',version:2,requestID:'foreign',reported:{filter_seconds:0}});expect(session.sending).toBe(true);
    report({kind:'delta',version:3,requestID:id,reported:{filter_seconds:0}});await pending;expect(session.sending).toBe(false);session.close();
  });
  it('result timeout retains actual data and blocks another service until full resynchronization',async()=>{
    const {session,port,start,call,report}=realtimeSetup();await start();vi.useFakeTimers();const {pending,id}=call(),rejected=expect(pending).rejects.toThrow('未确认');await vi.advanceTimersByTimeAsync(10001);await rejected;
    expect(session.confirmed.filter_seconds).toBe(215);expect(session.maintenance!.ledger.phase).toBe('unknown');expect(()=>session.maintenance!.requestReset()).toThrow('先同步');
    report({kind:'serviceResult',requestID:id,identifier:'reset_v2',success:true});expect(session.maintenance!.ledger.phase).toBe('unknown');expect(port.publish).toHaveBeenCalledTimes(2);session.close();
  });
  it('matched request rejection is an explicit failure and cannot authorize another unsynchronized reset',async()=>{
    const {session,report,start,call}=realtimeSetup();await start();const {pending,id}=call(),rejected=expect(pending).rejects.toThrow('拒绝');report({kind:'rejected',requestID:id});await rejected;
    expect(session.maintenance!.ledger.phase).toBe('failed');expect(session.ready).toBe(false);expect(session.confirmed.filter_seconds).toBe(215);expect(()=>session.maintenance!.requestReset()).toThrow('未同步');session.close();
  });
  it('missing confirmation rule or unpublished service capability never publishes a reset',async()=>{
    const {session,port,start,sync}=realtimeSetup();await start();sync.service=()=>({topic:'fixture/service',payload:encode({}),confirmation:{kind:'reported',expected:{}}});
    await expect(session.maintenance!.requestReset().confirm()).rejects.toThrow('确认规则');expect(port.publish).toHaveBeenCalledOnce();session.close();
    sync.service=undefined;await start();expect(()=>session.maintenance!.requestReset()).toThrow('权限');session.close();
  });
});

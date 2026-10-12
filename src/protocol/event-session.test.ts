import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlledDeviceSession } from './controlled-session';
import { MockDeviceSession, RealtimeDeviceSession, type DeviceSyncProfile } from './device-session';
import { MockDeviceTransport } from './device';
import { MqttConnection, type MqttPort } from './mqtt-connection';
import { eventLedger, mockEventProfile, type DeviceEvent, type EventProfileResolver } from '../services/device-events';
import { MemoryStorage, MockDatabase } from '../services/store';
import { MockHttpClient } from '../services/http';
import { RowanService } from '../services/rowan';

const encode=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)),decode=(v:Uint8Array)=>JSON.parse(new TextDecoder().decode(v));
const event=(extra:Partial<DeviceEvent>={}):DeviceEvent=>({identifier:'Fault',occurrenceID:'i1',revision:1,data:{code:7},...extra});
const context={device:{deviceNickname:'fixture',device:{id:'dev'},product:{id:'fixture'},bindingAt:'',bindingRole:'obs' as const},model:{version:'v1',attributes:[{identifier:'fault_state',type:'number' as const,writable:false},{identifier:'Power',type:'number' as const,writable:true}],services:[],events:[{identifier:'Fault',level:'warning'},{identifier:'FaultRecovery',level:'info'}]}};
const eventsResolver:EventProfileResolver=async()=>({definitions:[{identifier:'Fault',title:'明确故障',recovery:{event:'FaultRecovery',property:{identifier:'fault_state',equals:0}}}]});
function setup(resolver:EventProfileResolver|null=eventsResolver,writable=false){
  const listeners=new Map<string,(()=>void)[]>();let message:(topic:string,payload:Uint8Array)=>void=()=>undefined;
  const port:MqttPort={on:(name,fn)=>{listeners.set(name,[...(listeners.get(name)??[]),fn]);},onMessage:fn=>{message=fn;},subscribe:vi.fn((_topic,done)=>done()),unsubscribe:vi.fn(),end:vi.fn(),publish:vi.fn((_topic,_payload,done)=>done())};
  const sync:DeviceSyncProfile={topics:['fixture/dev/state','fixture/dev/event'],canWrite:writable,query:id=>({topic:'fixture/dev/query',payload:encode({id})}),decode:(_topic,value)=>{const decoded=decode(value);return decoded.deviceID==='dev'?decoded.report:undefined;},command:(properties,id)=>({topic:'fixture/dev/set',payload:encode({id,properties}),expected:properties as Record<string,number>})};
  const inner=new RealtimeDeviceSession({deviceID:'dev',userID:'user',current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:async()=>({host:'wss://broker.example.test/mqtt',endpoint:'broker.example.test',path:'/mqtt',clientID:'issued',username:'issued',password:'fixture',deviceID:'dev'}),context:async()=>({...context,device:{...context.device,bindingRole:writable?'sa':'obs'}}),profile:async()=>sync,connection:async()=>new MqttConnection(()=>{queueMicrotask(()=>{for(const fn of listeners.get('connect')??[])fn();});return port;},100)});
  const ledger=eventLedger(),session=new ControlledDeviceSession(inner,async()=>context,undefined,undefined,undefined,resolver??undefined,ledger);
  const report=(report:unknown,topic='fixture/dev/state',deviceID='dev')=>message(topic,encode({deviceID,report}));
  const start=async()=>{const before=vi.mocked(port.publish).mock.calls.length,pending=session.connect();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledTimes(before+1));report({kind:'full',requestID:decode(vi.mocked(port.publish).mock.calls.at(-1)![1]).id,version:1,reported:{fault_state:1,Power:0}});await pending;};
  return {session,inner,port,ledger,report,start,disconnect:()=>{for(const fn of listeners.get('close')??[])fn();}};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('告警实时会话（合成协议）',()=>{
  it('subscribes explicit event Topic; event is independent from full sync and cannot confirm property commands',async()=>{
    const {session,inner,port,report}=setup(),pending=session.connect();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledOnce());
    report({kind:'event',event:event()},'fixture/dev/event');expect(session.ready).toBe(false);expect(session.events!.records[0].event.identifier).toBe('Fault');
    report({kind:'full',requestID:decode(vi.mocked(port.publish).mock.calls[0][1]).id,version:1,reported:{fault_state:1,Power:0}});await pending;
    expect(vi.mocked(port.subscribe).mock.calls.map(call=>call[0])).toEqual(['fixture/dev/state','fixture/dev/event']);expect(session.confirmed).toEqual({fault_state:1,Power:0});expect(inner.sending).toBe(false);session.close();
  });
  it('foreign identity/unsubscribed Topic and old socket cannot update current incidents',async()=>{
    const {session,report,start}=setup();await start();report({kind:'event',event:event()},'fixture/dev/event','foreign');report({kind:'event',event:event()},'fixture/other/event');expect(session.events!.records).toHaveLength(0);
    report({kind:'event',event:event()},'fixture/dev/event');session.close();report({kind:'event',event:event({identifier:'FaultRecovery',revision:2})},'fixture/dev/event');expect(session.events!.records[0]).toMatchObject({state:'active',needsCheck:true});
  });
  it('buffers early event/recovery observations in receive order while product mapping is loading',async()=>{
    let resolve:(value:Awaited<ReturnType<EventProfileResolver>>)=>void=()=>undefined;
    const {session,port,report}=setup(()=>new Promise(done=>{resolve=done;})),pending=session.connect();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledOnce());
    report({kind:'event',event:event()},'fixture/dev/event');report({kind:'full',requestID:decode(vi.mocked(port.publish).mock.calls[0][1]).id,version:1,reported:{fault_state:0}});
    expect(session.events!.records).toHaveLength(0);resolve(await eventsResolver(context,new AbortController().signal));await pending;expect(session.events!.records[0]).toMatchObject({title:'明确故障',state:'recovered'});session.close();
  });
  it('cached zero/invalid/old delta and unrelated fields cannot recover a new incident',async()=>{
    const {session,report,start}=setup();await start();report({kind:'delta',version:2,reported:{fault_state:0}});report({kind:'event',event:event()},'fixture/dev/event');
    report({kind:'delta',version:2,reported:{fault_state:0}});report({kind:'delta',version:3,reported:{Power:1}});report({kind:'delta',version:4,reported:{fault_state:null}});expect(session.events!.records[0].state).toBe('active');
    report({kind:'delta',version:4,reported:{fault_state:0}});expect(session.events!.records[0].state).toBe('recovered');session.close();
  });
  it('disconnect marks pending verification; reconnect/full property success alone keeps the incident',async()=>{
    const {session,report,start,disconnect,port}=setup();await start();report({kind:'event',event:event()},'fixture/dev/event');session.events!.dismiss(session.events!.records[0].key);disconnect();
    expect(session.events!.records[0]).toMatchObject({state:'active',needsCheck:true,dismissed:true});await start();expect(session.events!.records[0]).toMatchObject({state:'active',needsCheck:true,dismissed:true});
    report({kind:'event',event:event({identifier:'FaultRecovery',revision:2})},'fixture/dev/event');expect(session.events!.records[0].state).toBe('recovered');expect(port.publish).toHaveBeenCalledTimes(2);session.close();
  });
  it('missing production mapping shows error and preserves incoming event as unknown, with no Mock recovery',async()=>{
    const {session,report,start}=setup(null);await start();report({kind:'event',event:event()},'fixture/dev/event');report({kind:'event',event:event({identifier:'FaultRecovery',revision:2})},'fixture/dev/event');
    expect(session.eventError).toContain('尚未配置');expect(session.events!.records).toHaveLength(2);expect(session.events!.records[0]).toMatchObject({title:'设备告警',state:'active'});session.close();
  });
  it('event and explicit recovery never resolve an in-flight control or manufacture confirmed values',async()=>{
    const {session,inner,port,report,start}=setup(eventsResolver,true);await start();const pending=inner.command({Power:1}),id=decode(vi.mocked(port.publish).mock.calls.at(-1)![1]).id;
    report({kind:'event',event:event()},'fixture/dev/event');report({kind:'event',event:event({identifier:'FaultRecovery',revision:2})},'fixture/dev/event');expect(inner.sending).toBe(true);expect(session.confirmed.Power).toBe(0);
    report({kind:'delta',version:2,requestID:id,reported:{Power:1}});await pending;expect(inner.sending).toBe(false);expect(session.events!.records[0].state).toBe('recovered');session.close();
  });
  it('mapping timeout flushes early event as unknown without losing context or guessing recovery',async()=>{
    const {session,report,port}=setup(async()=>new Promise(()=>undefined));vi.useFakeTimers();const connecting=session.connect();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledOnce());
    report({kind:'event',event:event()},'fixture/dev/event');report({kind:'full',requestID:decode(vi.mocked(port.publish).mock.calls[0][1]).id,version:1,reported:{fault_state:0}});
    await vi.advanceTimersByTimeAsync(10001);await connecting;expect(session.ready).toBe(true);expect(session.eventError).toContain('超时');expect(session.events!.records[0]).toMatchObject({title:'设备告警',state:'active',event:{data:{code:7}}});session.close();
  });
  it('leaving during capability loading retains early events as pending verification and invalidates late mapping',async()=>{
    let resolve:(value:Awaited<ReturnType<EventProfileResolver>>)=>void=()=>undefined;
    const {session,port,report}=setup(()=>new Promise(done=>{resolve=done;})),connecting=session.connect(),cancelled=expect(connecting).rejects.toMatchObject({code:499});await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledOnce());
    report({kind:'event',event:event()},'fixture/dev/event');session.close();await cancelled;expect(session.events!.records[0]).toMatchObject({state:'active',needsCheck:true,title:'设备告警'});
    resolve(await eventsResolver(context,new AbortController().signal));await Promise.resolve();expect(session.events!.records[0].title).toBe('设备告警');expect(session.ready).toBe(false);
  });
  it('disconnect after full reply but before event mapping completes stays pending verification on replay',async()=>{
    let resolve:(value:Awaited<ReturnType<EventProfileResolver>>)=>void=()=>undefined;
    const {session,inner,port,report,disconnect}=setup(()=>new Promise(done=>{resolve=done;})),connecting=session.connect();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalledOnce());const innerConnecting=inner.connect();
    report({kind:'event',event:event()},'fixture/dev/event');report({kind:'full',requestID:decode(vi.mocked(port.publish).mock.calls[0][1]).id,version:1,reported:{fault_state:1}});
    await innerConnecting;expect(session.ready).toBe(true);disconnect();resolve(await eventsResolver(context,new AbortController().signal));await connecting;
    expect(session.ready).toBe(false);expect(session.events!.records[0]).toMatchObject({state:'active',needsCheck:true,title:'明确故障'});session.close();
  });
});

describe('告警Mock独立事件通道',()=>{
  it('retains observed event across page-created sessions; local dismissal sends no device command',async()=>{
    const db=await MockDatabase.open(new MemoryStorage()),service=new RowanService(new MockHttpClient(db),new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
    const driver=new MockDeviceTransport(db,{delay:0}),load=async(signal:AbortSignal)=>{const device=await service.device('dev_wine',signal);return {device,model:await service.model(device.product!.id,signal)};},ledger=eventLedger();
    const make=()=>new ControlledDeviceSession(new MockDeviceSession(driver,'dev_wine',service.userID,{current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:signal=>service.mqtt('dev_wine',signal)}),load,undefined,undefined,undefined,mockEventProfile,ledger);
    const first=make();await first.connect();const publish=vi.spyOn(driver,'publish');driver.emitEvent('dev_wine',event({identifier:'Alarm'}));first.events!.dismiss(first.events!.records[0].key);first.close();
    const next=make();await next.connect();expect(next.events!.records[0]).toMatchObject({state:'active',needsCheck:true,dismissed:true});next.events!.dismiss(next.events!.records[0].key,false);
    driver.emitEvent('dev_wine',event({identifier:'AlarmRecovered',revision:2}));expect(next.events!.records[0]).toMatchObject({state:'recovered',dismissed:false});expect(publish).not.toHaveBeenCalled();next.close();
  });
  it('duplicate/invalid Shadow observations cannot serve as fresh property recovery evidence',async()=>{
    const db=await MockDatabase.open(new MemoryStorage()),service=new RowanService(new MockHttpClient(db),new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
    const driver=new MockDeviceTransport(db,{delay:0}),inner=new MockDeviceSession(driver,'dev_wine',service.userID,{current:()=>true,start:()=>undefined,stop:()=>undefined,credentials:signal=>service.mqtt('dev_wine',signal)}),observations=vi.fn();inner.onProperties(observations);await inner.connect();observations.mockClear();
    inner.receive({version:inner.version,state:{reported:{Power:0}}});inner.receive({version:inner.version+1,state:{reported:{Power:NaN}}});inner.receive({version:inner.version-1,state:{reported:{Power:0}}});expect(observations).not.toHaveBeenCalled();
    inner.receive({version:inner.version+1,state:{reported:{Power:0}}});expect(observations).toHaveBeenCalledExactlyOnceWith({full:false,reported:{Power:0}});inner.close();
  });
});

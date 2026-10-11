import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntime, type Runtime } from './runtime';
import { MemoryStorage, MockDatabase } from './store';
import { MockDeviceTransport } from '../protocol/device';
import type { DeviceProfileResolver } from '../protocol/device-session';
import type { MqttCredentials, MqttPort } from '../protocol/mqtt-connection';
import type { ControlProfileResolver } from './device-controls';
import type { MaintenanceProfileResolver } from './device-maintenance';
import type { EventProfileResolver } from './device-events';

vi.mock('./native-storage',async()=>{const {MemoryStorage}=await import('./store');return {SessionStorage:MemoryStorage,MockFileStorage:MemoryStorage};});
const testPorts=vi.hoisted(()=>({ports:[] as MqttPort[],issued:[] as MqttCredentials[],reports:[] as ((value:unknown)=>void)[]}));
vi.mock('../protocol/mqtt-browser',async()=>{
  const {MqttConnection}=await import('../protocol/mqtt-connection');
  return {createMqttConnection:()=>new MqttConnection(credentials=>{
    testPorts.issued.push(credentials);const listeners=new Map<string,(()=>void)[]>();let message:(topic:string,payload:Uint8Array)=>void=()=>undefined;
    const port:MqttPort={on:(event,fn)=>{listeners.set(event,[...(listeners.get(event)??[]),fn]);},onMessage:fn=>{message=fn;},subscribe:(_topic,done)=>done(),unsubscribe:vi.fn(),end:vi.fn(),
      publish:vi.fn((topic:string,payload:Uint8Array,done:(error?:Error)=>void)=>{done();const text=new TextDecoder().decode(payload),command=topic==='fixture/set'?JSON.parse(text):undefined,service=topic==='fixture/service'?JSON.parse(text):undefined;
        queueMicrotask(()=>message('fixture/state',new TextEncoder().encode(JSON.stringify(service?{kind:'serviceResult',requestID:service.id,identifier:service.identifier,success:true}:command?{kind:'delta',version:2,requestID:command.id,reported:command.properties}:{kind:'full',version:1,requestID:text,reported:{Power:0,CleanHours:120}}))));}),
    };
    testPorts.ports.push(port);testPorts.reports.push(value=>message('fixture/state',new TextEncoder().encode(JSON.stringify(value))));queueMicrotask(()=>{for(const fn of listeners.get('connect')??[])fn();});return port;
  },100)};
});
// Fixture protocol, intentionally unrelated to either pending production route.
const resolver:DeviceProfileResolver=async()=>({topics:['fixture/state'],query:id=>({topic:'fixture/query',payload:new TextEncoder().encode(id)}),decode:(_topic,payload)=>JSON.parse(new TextDecoder().decode(payload)),canWrite:false});
const runtimes:Runtime[]=[];
async function setup(profile:DeviceProfileResolver|undefined=resolver,controls?:ControlProfileResolver,maintenance?:MaintenanceProfileResolver,events?:EventProfileResolver){
  const driver=new MockDeviceTransport(await MockDatabase.open(new MemoryStorage()),{delay:0});
  const runtime=await createRuntime({httpMode:'mock',deviceMode:'real'},driver,{realtime:profile,controls,maintenance,events,wifi:{read:async()=>({connection:'wifi',band:'unknown',source:'system',ssid:'fixture'})}});
  runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');return runtime;
}
afterEach(()=>{for(const runtime of runtimes)runtime.dispose();runtimes.length=0;testPorts.ports.length=0;testPorts.issued.length=0;testPorts.reports.length=0;vi.restoreAllMocks();});
describe('Runtime设备会话接线（Mock HTTP/构造MQTT）',()=>{
  it('consumes DEVICE-01 and shares one active device lease across callers',async()=>{
    const runtime=await setup(),read=vi.spyOn(runtime.service,'mqtt');
    const first=runtime.createDeviceSession('dev_wine');await first.connect();expect(first.ready).toBe(true);
    const second=runtime.createDeviceSession('dev_wine');await second.connect();expect(first.ready).toBe(false);expect(testPorts.ports[0].end).toHaveBeenCalledOnce();
    expect(second.ready).toBe(true);expect(read).toHaveBeenCalledTimes(2);expect(testPorts.issued[1]).toMatchObject({deviceID:'dev_wine',host:'wss://mock.rowan.invalid/mqtt'});
    first.close();expect(second.ready).toBe(true);runtime.dispose();expect(second.ready).toBe(false);
  });
  it('clears sockets on same-account re-login and never reuses the old identity revision',async()=>{
    const runtime=await setup(),session=runtime.createDeviceSession('dev_wine');await session.connect();
    await runtime.service.login('rowan@example.com','Rowan@123','password');expect(session.ready).toBe(false);expect(testPorts.ports[0].end).toHaveBeenCalledOnce();
    await expect(session.connect()).rejects.toMatchObject({code:499});expect(testPorts.ports).toHaveLength(1);
    const next=runtime.createDeviceSession('dev_wine');await next.connect();expect(next.ready).toBe(true);
  });
  it('does not return mock shadow success when a production profile is absent',async()=>{
    const driver=new MockDeviceTransport(await MockDatabase.open(new MemoryStorage()),{delay:0});
    const missing=await createRuntime({httpMode:'mock',deviceMode:'real'},driver,{wifi:{read:async()=>({connection:'wifi',band:'unknown',source:'system',ssid:'fixture'})}});runtimes.push(missing);
    await missing.service.login('rowan@example.com','Rowan@123','password');const session=missing.createDeviceSession('dev_wine');
    await expect(session.connect()).rejects.toThrow('协议尚未配置');expect(session.ready).toBe(false);expect(session.confirmed).toEqual({});expect(missing.config.deviceMode).toBe('real');
  });
  it('uses the same real session for add results and retries only realtime after a profile failure',async()=>{
    let available=false;
    const runtime=await setup(async(context,signal)=>{if(!available)throw new Error('实际协议未提供');return resolver(context,signal);});
    const flow=runtime.onboarding.acquire();flow.adoptBinding({deviceID:'dev_wine',userID:runtime.service.userID,bindingRole:'sa'});
    const rename=vi.spyOn(runtime.service,'renameDevice'),home=vi.spyOn(runtime.service,'home'),bind=vi.spyOn(runtime.service,'bindStatus');
    await flow.finish(null);expect(flow.state).toMatchObject({stage:'complete',visible:true,realtime:'failed'});expect(testPorts.issued).toHaveLength(1);
    available=true;await flow.retryRealtime();expect(flow.state.realtime).toBe('ready');expect(testPorts.issued).toHaveLength(2);
    expect(home).toHaveBeenCalledOnce();expect(rename).not.toHaveBeenCalled();expect(bind).not.toHaveBeenCalled();flow.stop();expect(testPorts.ports[1].end).toHaveBeenCalledOnce();
  });
  it('cancels late credentials on account replacement before opening a broker connection',async()=>{
    const runtime=await setup();let resolve:(value:Record<string,string>)=>void=()=>undefined;vi.spyOn(runtime.service,'mqtt').mockImplementation(()=>new Promise(done=>{resolve=done;}));
    const session=runtime.createDeviceSession('dev_wine'),pending=session.connect(),rejected=expect(pending).rejects.toMatchObject({code:499});
    await vi.waitFor(()=>expect(runtime.service.mqtt).toHaveBeenCalled());await runtime.service.login('rowan@example.com','Rowan@123','password');await rejected;
    resolve({});await Promise.resolve();expect(testPorts.ports).toHaveLength(0);expect(session.ready).toBe(false);
  });
  it('validates explicitly provided real-mode controls before MQTT and confirms only the correlated reported result',async()=>{
    const runtime=await setup(async(context,signal)=>({...await resolver(context,signal),canWrite:true,command:(properties,id)=>({topic:'fixture/set',payload:new TextEncoder().encode(JSON.stringify({id,properties})),expected:properties as Record<string,number>})}),
      async()=>({bindings:{power:{identifier:'Power',roles:['sa'],switch:{on:1,off:0}}}}));
    const session=runtime.createDeviceSession('dev_wine');await session.connect();expect(session.controls).toBeDefined();
    const port=testPorts.ports[0];await expect(session.command({Power:true})).rejects.toThrow('有效数值');expect(port.publish).toHaveBeenCalledOnce();
    const command=session.controls!.toggle('power');expect(session.confirmed.Power).toBe(0);await command;expect(session.confirmed.Power).toBe(1);expect(port.publish).toHaveBeenCalledTimes(2);
    expect(session.sending).toBe(false);session.close();await expect(session.command({Power:0})).rejects.toThrow('未确认');
  });
  it('uses an explicit maintenance resolver and independent real-mode service result without zeroing fixture data',async()=>{
    const runtime=await setup(async(context,signal)=>({...await resolver(context,signal),canWrite:true,service:(call,id)=>({topic:'fixture/service',payload:new TextEncoder().encode(JSON.stringify({id,...call})),confirmation:{kind:'result'}})}),undefined,
      async()=>({attribute:'CleanHours',reset:{identifier:'CleanReset',params:{},roles:['sa'],conditions:[]}}));
    const session=runtime.createDeviceSession('dev_wine');await session.connect();expect(session.controls).toBeUndefined();expect(session.maintenance).toBeDefined();
    await session.maintenance!.requestReset().confirm();expect(session.maintenance!.ledger.phase).toBe('confirmed');expect(session.confirmed.CleanHours).toBe(120);expect(testPorts.ports[0].publish).toHaveBeenCalledTimes(2);session.close();
  });
  it('retains unknown reset across page-created sessions until a new complete maintenance query',async()=>{
    const runtime=await createRuntime({httpMode:'mock',deviceMode:'mock'});runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');
    const first=runtime.createDeviceSession('dev_wine');await first.connect();const driver=runtime.developer!.devices,publish=vi.spyOn(driver,'publish');driver.fault='no-report';vi.useFakeTimers();
    const pending=first.maintenance!.requestReset().confirm(),rejected=expect(pending).rejects.toThrow('未确认');await vi.advanceTimersByTimeAsync(10001);await rejected;const ledger=first.maintenance!.ledger;first.close();vi.useRealTimers();
    let full:(message:Awaited<ReturnType<MockDeviceTransport['shadowGet']>>)=>void=()=>undefined;vi.spyOn(driver,'shadowGet').mockImplementationOnce(()=>new Promise(resolve=>{full=resolve;}));
    const next=runtime.createDeviceSession('dev_wine'),connecting=next.connect();await vi.waitFor(()=>expect(next.maintenance).toBeDefined());expect(next.maintenance!.ledger).toBe(ledger);expect(ledger.phase).toBe('unknown');
    expect(()=>next.maintenance!.requestReset()).toThrow('先同步');full({version:2,state:{desired:{},reported:{CleanHours:4,Power:1,ChildLock:0}}});await connecting;
    expect(ledger.phase).toBe('idle');expect(next.maintenance!.text).toBe('4 h');expect(publish).toHaveBeenCalledOnce();runtime.dispose();
  });
  it('does not share reset transaction records across account revisions',async()=>{
    const runtime=await createRuntime({httpMode:'mock',deviceMode:'mock'});runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');
    const first=runtime.createDeviceSession('dev_wine');await first.connect();const old=first.maintenance!.ledger,ticket=first.maintenance!.requestReset();await runtime.service.login('rowan@example.com','Rowan@123','password');
    await expect(ticket.confirm()).rejects.toThrow('失效');const next=runtime.createDeviceSession('dev_wine');await next.connect();expect(next.maintenance!.ledger).not.toBe(old);expect(next.maintenance!.ledger.phase).toBe('idle');runtime.dispose();
  });
  it('keeps events across page-created sessions and isolates device/old lease callbacks',async()=>{
    const runtime=await createRuntime({httpMode:'mock',deviceMode:'mock'});runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');
    const first=runtime.createDeviceSession('dev_wine');await first.connect();const driver=runtime.developer!.devices,subscribe=vi.spyOn(driver,'subscribeEvents'),publish=vi.spyOn(driver,'publish');
    driver.emitEvent('dev_wine',{identifier:'Alarm',occurrenceID:'incident',revision:1,data:{code:7}});first.events!.dismiss(first.events!.records[0].key);first.close();
    const second=runtime.createDeviceSession('dev_wine');await second.connect();const oldCallback=subscribe.mock.calls[0][2];
    const third=runtime.createDeviceSession('dev_wine');await third.connect();expect(second.ready).toBe(false);oldCallback({identifier:'AlarmRecovered',occurrenceID:'incident',revision:2,data:{}});
    expect(third.events!.records[0]).toMatchObject({state:'active',needsCheck:true,dismissed:true});driver.emitEvent('dev_wine',{identifier:'AlarmRecovered',occurrenceID:'incident',revision:2,data:{}});expect(third.events!.records[0].state).toBe('recovered');
    await driver.db.transact(()=>{driver.db.state.devices.push({...JSON.parse(JSON.stringify(driver.db.state.devices[0])),id:'dev_second',thingName:'dev_second',mac:'80a036d51aae'});});
    const other=runtime.createDeviceSession('dev_second');await other.connect();expect(other.events!.records).toHaveLength(0);expect(publish).not.toHaveBeenCalled();runtime.dispose();
  });
  it('clears event context on account revision and old callbacks cannot insert into new records',async()=>{
    const runtime=await createRuntime({httpMode:'mock',deviceMode:'mock'});runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');const driver=runtime.developer!.devices,subscribe=vi.spyOn(driver,'subscribeEvents');
    const first=runtime.createDeviceSession('dev_wine');await first.connect();driver.emitEvent('dev_wine',{identifier:'Alarm',data:{code:1}});const old=subscribe.mock.calls[0][2];
    await runtime.service.login('rowan@example.com','Rowan@123','password');const next=runtime.createDeviceSession('dev_wine');await next.connect();expect(next.events!.records).toHaveLength(0);
    old({identifier:'Alarm',data:{code:2}});expect(next.events!.records).toHaveLength(0);driver.emitEvent('dev_wine',{identifier:'Alarm',data:{code:3}});expect(next.events!.records[0].event.data).toEqual({code:3});runtime.dispose();
  });
  it('consumes an explicit event resolver in real deviceMode without installing Mock event definitions',async()=>{
    const runtime=await setup(resolver,undefined,undefined,async()=>({definitions:[{identifier:'Alarm',title:'Explicit fixture event',recovery:{event:'AlarmRecovered'}}]})),session=runtime.createDeviceSession('dev_wine');await session.connect();
    testPorts.reports[0]({kind:'event',event:{identifier:'Alarm',occurrenceID:'fixture-incident',revision:1,data:{sensor:7}}});expect(session.events!.records[0].title).toBe('Explicit fixture event');expect(session.eventError).toBe('');
    testPorts.reports[0]({kind:'event',event:{identifier:'AlarmRecovered',occurrenceID:'fixture-incident',revision:2,data:{}}});expect(session.events!.records[0].state).toBe('recovered');expect(session.confirmed).toEqual({Power:0,CleanHours:120});expect(testPorts.ports[0].publish).toHaveBeenCalledOnce();session.close();
  });
});

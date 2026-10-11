import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntime, type Runtime } from './runtime';
import { MemoryStorage, MockDatabase } from './store';
import { MockDeviceTransport } from '../protocol/device';
import type { DeviceProfileResolver } from '../protocol/device-session';
import type { MqttCredentials, MqttPort } from '../protocol/mqtt-connection';

vi.mock('./native-storage',async()=>{const {MemoryStorage}=await import('./store');return {SessionStorage:MemoryStorage,MockFileStorage:MemoryStorage};});
const testPorts=vi.hoisted(()=>({ports:[] as MqttPort[],issued:[] as MqttCredentials[]}));
vi.mock('../protocol/mqtt-browser',async()=>{
  const {MqttConnection}=await import('../protocol/mqtt-connection');
  return {createMqttConnection:()=>new MqttConnection(credentials=>{
    testPorts.issued.push(credentials);const listeners=new Map<string,(()=>void)[]>();let message:(topic:string,payload:Uint8Array)=>void=()=>undefined;
    const port:MqttPort={on:(event,fn)=>{listeners.set(event,[...(listeners.get(event)??[]),fn]);},onMessage:fn=>{message=fn;},subscribe:(_topic,done)=>done(),unsubscribe:vi.fn(),end:vi.fn(),
      publish:(_topic,payload,done)=>{done();const id=new TextDecoder().decode(payload);queueMicrotask(()=>message('fixture/state',new TextEncoder().encode(JSON.stringify({kind:'full',version:1,requestID:id,reported:{Power:0}}))));},
    };
    testPorts.ports.push(port);queueMicrotask(()=>{for(const fn of listeners.get('connect')??[])fn();});return port;
  },100)};
});
// Fixture protocol, intentionally unrelated to either pending production route.
const resolver:DeviceProfileResolver=async()=>({topics:['fixture/state'],query:id=>({topic:'fixture/query',payload:new TextEncoder().encode(id)}),decode:(_topic,payload)=>JSON.parse(new TextDecoder().decode(payload)),canWrite:false});
const runtimes:Runtime[]=[];
async function setup(profile:DeviceProfileResolver|undefined=resolver){
  const driver=new MockDeviceTransport(await MockDatabase.open(new MemoryStorage()),{delay:0});
  const runtime=await createRuntime({httpMode:'mock',deviceMode:'real'},driver,{realtime:profile,wifi:{read:async()=>({connection:'wifi',band:'unknown',source:'system',ssid:'fixture'})}});
  runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');return runtime;
}
afterEach(()=>{for(const runtime of runtimes)runtime.dispose();runtimes.length=0;testPorts.ports.length=0;testPorts.issued.length=0;vi.restoreAllMocks();});
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
});

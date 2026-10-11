import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockDeviceSession, RealtimeDeviceSession, type DeviceProfileResolver, type DeviceSyncProfile } from './device-session';
import { MqttConnection, type MqttCredentials, type MqttPort } from './mqtt-connection';
import { ShadowSession, type DeviceTransport, type ShadowMessage } from './device';
import type { DeviceView, ThingModel } from '../services/models';

// Synthetic wire contract only: never selected by the production Runtime.
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
const decode=(value:Uint8Array)=>JSON.parse(new TextDecoder().decode(value));
const credentials={host:'wss://broker.example.test/mqtt',endpoint:'broker.example.test',path:'/mqtt',clientID:'issued-dev',username:'issued',password:'public-test',deviceID:'dev'};
const device:DeviceView={deviceNickname:'真实元数据fixture',bindingRole:'sa',bindingAt:'',device:{id:'dev'},product:{id:'product'}};
const model:ThingModel={version:'1',attributes:[],services:[],events:[]};
class Port implements MqttPort {
  listeners=new Map<string,(()=>void)[]>();message?:(topic:string,payload:Uint8Array)=>void;
  on(event:string,fn:()=>void){this.listeners.set(event,[...(this.listeners.get(event)??[]),fn]);}
  onMessage(fn:(topic:string,payload:Uint8Array)=>void){this.message=fn;}
  emit(event:string){for(const fn of this.listeners.get(event)??[])fn();}
  report(value:unknown,topic='fixture/state'){this.message?.(topic,encode(value));}
  subscribe=vi.fn((_topic:string,done:(error?:Error)=>void)=>done());
  unsubscribe=vi.fn();publish=vi.fn((_topic:string,_payload:Uint8Array,done:(error?:Error)=>void)=>done());end=vi.fn();
}
function setup(options:{profile?:false;role?:'obs';write?:boolean;query?:DeviceSyncProfile['query']}={}){
  let current=true;
  const ports:Port[]=[],issued:MqttCredentials[]=[],start=vi.fn(),stop=vi.fn();
  const read=vi.fn(async()=>({...credentials,password:`public-${issued.length}`}));
  const profile:DeviceSyncProfile={topics:['fixture/state','fixture/permissions'],canWrite:options.write??true,
    query:options.query??(id=>({topic:'fixture/query',payload:encode({id})})),decode:(_topic,payload)=>decode(payload),
    command:(properties,id)=>({topic:'fixture/set',payload:encode({id,properties}),expected:properties as Record<string,number>}),
  };
  const resolver=vi.fn<DeviceProfileResolver>(async()=>profile);
  const create=vi.fn(async()=>new MqttConnection(value=>{issued.push(value);const port=new Port();ports.push(port);return port;},100));
  const session=new RealtimeDeviceSession({deviceID:'dev',userID:'user',current:()=>current,start,stop,credentials:read,
    connection:create,
    context:async()=>({device:{...device,bindingRole:options.role??device.bindingRole},model}),profile:options.profile===false?undefined:resolver,timeout:100,
  });
  const begin=async()=>{const pending=session.connect();await vi.waitFor(()=>expect(ports).not.toHaveLength(0));ports.at(-1)!.emit('connect');return {pending,port:ports.at(-1)!};};
  const full=async(port:Port,pending:Promise<void>,reported:Record<string,number>={Power:0,Removed:2},version=5)=>{
    await vi.waitFor(()=>expect(port.publish).toHaveBeenCalled());const id=decode(port.publish.mock.calls[0][1]).id;
    port.report({kind:'full',version,reported,requestID:id});await pending;
  };
  return {session,ports,issued,read,resolver,profile,start,stop,begin,full,create,invalidate:()=>{current=false;}};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('真实MQTT会话（构造协议/端口）',()=>{
  it('consumes exactly issued credentials; CONNACK, SUBACK and PUBACK never alone set ready',async()=>{
    const c=setup(),{pending,port}=await c.begin();await vi.waitFor(()=>expect(port.publish).toHaveBeenCalled());
    expect(c.issued[0]).toEqual({...credentials,password:'public-0'});expect(c.session.connected).toBe(true);expect(c.session.ready).toBe(false);
    expect(port.subscribe.mock.calls.map(call=>call[0])).toEqual(c.profile.topics);
    await c.full(port,pending);expect(c.session.confirmed).toEqual({Power:0,Removed:2});expect(c.session.ready).toBe(true);c.session.close();
  });
  it('deduplicates overlapping connects and requests no credentials after pre-abort',async()=>{
    const c=setup(),pending=c.session.connect();expect(c.session.connect()).toBe(pending);
    await vi.waitFor(()=>expect(c.ports).toHaveLength(1));c.ports[0].emit('connect');await c.full(c.ports[0],pending);
    expect(c.read).toHaveBeenCalledOnce();c.session.close();const controller=new AbortController();controller.abort();
    await expect(c.session.connect(controller.signal)).rejects.toMatchObject({code:499});expect(c.read).toHaveBeenCalledOnce();
  });
  it('requires an explicit production profile and never guesses topics or returns mock values',async()=>{
    const c=setup({profile:false}),pending=c.session.connect(),rejected=expect(pending).rejects.toThrow('协议尚未配置');
    await vi.waitFor(()=>expect(c.ports).toHaveLength(1));c.ports[0].emit('connect');await rejected;
    expect(c.issued).toHaveLength(1);expect(c.ports[0].subscribe).not.toHaveBeenCalled();expect(c.session.ready).toBe(false);expect(c.session.confirmed).toEqual({});expect(c.ports[0].end).toHaveBeenCalledOnce();
  });
  it('waits for all subscriptions before querying and ignores early/foreign/desired/malformed reports',async()=>{
    const c=setup(),pending=c.session.connect();await vi.waitFor(()=>expect(c.ports).toHaveLength(1));const port=c.ports[0];
    let ack:(error?:Error)=>void=()=>undefined;port.subscribe.mockImplementation((_topic,done)=>{ack=done;});port.emit('connect');
    await vi.waitFor(()=>expect(port.subscribe).toHaveBeenCalledTimes(1));
    port.report({kind:'full',version:1,reported:{Power:1},requestID:'foreign'});expect(port.publish).not.toHaveBeenCalled();ack();
    await vi.waitFor(()=>expect(port.subscribe).toHaveBeenCalledTimes(2));expect(port.publish).not.toHaveBeenCalled();ack();
    await vi.waitFor(()=>expect(port.publish).toHaveBeenCalled());const id=decode(port.publish.mock.calls[0][1]).id;
    port.report({kind:'delta',version:99,reported:{Power:1},requestID:id});port.report({kind:'full',version:99,reported:{Power:1},requestID:'foreign'});
    port.report({kind:'full',version:99,state:{desired:{Power:1}},requestID:id});port.message?.('fixture/state',new Uint8Array([255]));
    port.report({kind:'full',version:99,reported:{Power:1},requestID:id},'other-device');expect(c.session.ready).toBe(false);
    await c.full(port,pending);c.session.close();
  });
  it('rejects denied subscriptions, closing the connection without querying',async()=>{
    const c=setup(),pending=c.session.connect(),rejected=expect(pending).rejects.toThrow('订阅未确认');
    await vi.waitFor(()=>expect(c.ports).toHaveLength(1));const port=c.ports[0];port.subscribe.mockImplementation((_topic,done)=>done(new Error('denied')));port.emit('connect');await rejected;
    expect(port.publish).not.toHaveBeenCalled();expect(port.end).toHaveBeenCalledOnce();expect(c.session.ready).toBe(false);
  });
  it('bounds full sync, closes its socket and ignores the late snapshot',async()=>{
    const c=setup(),{pending,port}=await c.begin(),rejected=expect(pending).rejects.toThrow('完整属性等待超时');
    await vi.waitFor(()=>expect(port.publish).toHaveBeenCalled());const id=decode(port.publish.mock.calls[0][1]).id;await rejected;
    port.report({kind:'full',version:5,reported:{Power:1},requestID:id});expect(c.session.ready).toBe(false);expect(c.session.confirmed).toEqual({});expect(port.end).toHaveBeenCalledOnce();
  });
  it('retains last confirmed values on disconnect; reconnect obtains new credentials and replaces full state',async()=>{
    const c=setup(),first=await c.begin();await c.full(first.port,first.pending);first.port.emit('close');
    expect(c.session.ready).toBe(false);expect(c.session.confirmed).toEqual({Power:0,Removed:2});await expect(c.session.command({Power:1})).rejects.toThrow('未同步');
    const pending=c.session.connect();await vi.waitFor(()=>expect(c.ports).toHaveLength(2));const port=c.ports[1];port.emit('connect');
    first.port.report({kind:'delta',version:999,reported:{Power:9}});expect(c.session.confirmed.Power).toBe(0);
    await c.full(port,pending,{Power:1},1);expect(c.read).toHaveBeenCalledTimes(2);expect(c.issued[1].password).toBe('public-1');
    expect(c.session.confirmed).toEqual({Power:1});expect(port.subscribe).toHaveBeenCalledTimes(2);expect(port.publish).toHaveBeenCalledTimes(1);c.session.close();
  });
  it('accepts monotonic deltas only after a full report, discarding duplicate/older versions',async()=>{
    const c=setup(),{pending,port}=await c.begin();await c.full(port,pending);
    port.report({kind:'delta',version:6,reported:{Power:1}});port.report({kind:'delta',version:5,reported:{Power:2}});port.report({kind:'delta',version:6,reported:{Power:3}});
    port.report({kind:'delta',version:-1,reported:{Power:4}});port.report({kind:'delta',version:7,reported:{Power:null}});
    expect(c.session.confirmed).toEqual({Power:1,Removed:2});c.session.close();
  });
  it('confirms a command only with matching requestID and reported values, never PUBACK',async()=>{
    const c=setup(),{pending,port}=await c.begin();await c.full(port,pending);const command=c.session.command({Power:1});
    const id=decode(port.publish.mock.calls[1][1]).id;expect(c.session.sending).toBe(true);expect(c.session.confirmed.Power).toBe(0);
    port.report({kind:'delta',version:6,reported:{Power:1},requestID:'other'});expect(c.session.sending).toBe(true);
    port.report({kind:'delta',version:7,reported:{Power:0},requestID:id});expect(c.session.sending).toBe(true);
    port.report({kind:'delta',version:8,reported:{Power:1},requestID:id});await command;expect(c.session.sending).toBe(false);c.session.close();
  });
  it('times out unconfirmed control, retaining values without retry or optimistic state',async()=>{
    const c=setup(),{pending,port}=await c.begin();await c.full(port,pending);vi.useFakeTimers();const command=c.session.command({Power:1}),rejected=expect(command).rejects.toThrow('未确认设备结果');
    await vi.advanceTimersByTimeAsync(101);await rejected;expect(c.session.sending).toBe(false);expect(c.session.confirmed.Power).toBe(0);expect(port.publish).toHaveBeenCalledTimes(2);c.session.close();
  });
  it('aborts pending commands on disconnect without replay during recovery',async()=>{
    const c=setup(),{pending,port}=await c.begin();await c.full(port,pending);const command=c.session.command({Power:1}),rejected=expect(command).rejects.toThrow();port.emit('close');await rejected;
    expect(c.session.sending).toBe(false);expect(c.session.confirmed.Power).toBe(0);expect(port.publish).toHaveBeenCalledTimes(2);
    const next=c.session.connect();await vi.waitFor(()=>expect(c.ports).toHaveLength(2));c.ports[1].emit('connect');await c.full(c.ports[1],next);expect(c.ports[1].publish).toHaveBeenCalledTimes(1);c.session.close();
  });
  it.each([{role:'obs' as const},{write:false}])('does not allow an observer or unconfirmed write permission: %o',async options=>{
    const c=setup(options),{pending,port}=await c.begin();await c.full(port,pending);expect(c.session.canWrite).toBe(false);await expect(c.session.command({Power:1})).rejects.toThrow('权限未确认');expect(port.publish).toHaveBeenCalledTimes(1);c.session.close();
  });
  it('closes on access revocation, preserving history and stopping pending control',async()=>{
    const c=setup(),{pending,port}=await c.begin();await c.full(port,pending);const command=c.session.command({Power:1}),rejected=expect(command).rejects.toThrow();port.report({kind:'revoked'});await rejected;
    expect(c.session.ready).toBe(false);expect(c.session.error).toContain('权限');expect(c.session.confirmed.Power).toBe(0);expect(port.end).toHaveBeenCalledOnce();
  });
  it('rejects stale credentials after context replacement, without creating a socket',async()=>{
    const c=setup();let resolve:(value:typeof credentials)=>void=()=>undefined;c.read.mockImplementation(()=>new Promise(done=>{resolve=done;}));
    const pending=c.session.connect(),rejected=expect(pending).rejects.toMatchObject({code:499});await vi.waitFor(()=>expect(c.read).toHaveBeenCalled());c.invalidate();resolve(credentials);await rejected;expect(c.ports).toHaveLength(0);
  });
  it('cancels pending sync on background/leave, ignoring late callbacks',async()=>{
    const c=setup(),controller=new AbortController(),pending=c.session.connect(controller.signal),rejected=expect(pending).rejects.toMatchObject({code:499});
    await vi.waitFor(()=>expect(c.ports).toHaveLength(1));const port=c.ports[0];port.emit('connect');await vi.waitFor(()=>expect(port.publish).toHaveBeenCalled());
    const id=decode(port.publish.mock.calls[0][1]).id;controller.abort();await rejected;port.report({kind:'full',version:10,reported:{Power:1},requestID:id});port.emit('connect');
    expect(c.session.ready).toBe(false);expect(c.session.connected).toBe(false);expect(c.session.confirmed).toEqual({});expect(port.end).toHaveBeenCalledOnce();
  });
  it('keeps new recovery independent of an old pending promise',async()=>{
    const c=setup(),first=await c.begin(),rejected=expect(first.pending).rejects.toThrow();c.session.close();
    const next=c.session.connect();await rejected;expect(c.session.connect()).toBe(next);
    await vi.waitFor(()=>expect(c.ports).toHaveLength(2));c.ports[1].emit('connect');await c.full(c.ports[1],next);expect(c.session.ready).toBe(true);c.session.close();
  });
  it('rejects a full query denial without confirming state',async()=>{
    const c=setup(),{pending,port}=await c.begin(),rejected=expect(pending).rejects.toThrow('请求被拒绝');
    await vi.waitFor(()=>expect(port.publish).toHaveBeenCalled());const id=decode(port.publish.mock.calls[0][1]).id;
    port.report({kind:'rejected',requestID:id});await rejected;expect(c.session.ready).toBe(false);expect(c.session.confirmed).toEqual({});expect(port.end).toHaveBeenCalledOnce();
  });
  it('closes on denied command delivery, disabling control without changing confirmed values',async()=>{
    const c=setup(),{pending,port}=await c.begin();await c.full(port,pending);
    port.publish.mockImplementation((_topic,_payload,done)=>done(new Error('denied')));
    await expect(c.session.command({Power:1})).rejects.toThrow('投递未确认');expect(c.session.ready).toBe(false);expect(c.session.sending).toBe(false);expect(c.session.confirmed.Power).toBe(0);expect(port.end).toHaveBeenCalledOnce();
  });
  it('settles cancelled factory loading and closes its late-created resource',async()=>{
    const c=setup();let resolve:(connection:MqttConnection)=>void=()=>undefined;
    c.create.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const pending=c.session.connect(),rejected=expect(pending).rejects.toMatchObject({code:499});await vi.waitFor(()=>expect(c.create).toHaveBeenCalled());c.session.close();await rejected;
    const connection=new MqttConnection(()=>new Port()),close=vi.spyOn(connection,'close');resolve(connection);await vi.waitFor(()=>expect(close).toHaveBeenCalledOnce());expect(c.ports).toHaveLength(0);expect(c.session.ready).toBe(false);
  });
});

describe('Mock会话关闭与完整快照隔离',()=>{
  function mockTransport(){return {subscribe:vi.fn(()=>()=>undefined),shadowGet:vi.fn(async()=>({version:1,state:{reported:{Power:0}}})),publish:vi.fn(async()=>undefined)} as unknown as DeviceTransport;}
  it('cannot be revived by an old query after close/reconnect',async()=>{
    const transport=mockTransport();let resolve:(value:ShadowMessage)=>void=()=>undefined;vi.spyOn(transport,'shadowGet').mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const session=new ShadowSession(transport,'dev','user'),old=session.connect(),rejected=expect(old).rejects.toMatchObject({code:499});session.close();await session.connect();
    resolve({version:999,state:{reported:{Power:9}}});await rejected;expect(session.confirmed).toEqual({Power:0});expect(session.ready).toBe(true);session.close();
  });
  it('replaces complete snapshots and refuses missing reported data',async()=>{
    const transport=mockTransport(),session=new ShadowSession(transport,'dev','user');await session.connect();
    vi.spyOn(transport,'shadowGet').mockResolvedValueOnce({version:2,state:{reported:{Temperature:20}}});await session.connect();expect(session.confirmed).toEqual({Temperature:20});
    vi.spyOn(transport,'shadowGet').mockResolvedValueOnce({version:3,state:{desired:{Power:1}}});await expect(session.connect()).rejects.toThrow('完整属性');expect(session.ready).toBe(false);session.close();
  });
  it('managed mock refreshes credentials on every resume and stops a cancelled query',async()=>{
    const transport=mockTransport(),read=vi.fn(async()=>credentials),stop=vi.fn();const session=new MockDeviceSession(transport,'dev','user',{current:()=>true,start:()=>undefined,stop,credentials:read});
    await session.connect();expect(session.ready).toBe(true);session.close();await session.connect();expect(read).toHaveBeenCalledTimes(2);
    const controller=new AbortController();let resolve:(value:ShadowMessage)=>void=()=>undefined;vi.spyOn(transport,'shadowGet').mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const pending=session.connect(controller.signal),rejected=expect(pending).rejects.toMatchObject({code:499});await vi.waitFor(()=>expect(transport.shadowGet).toHaveBeenCalledTimes(3));controller.abort();await rejected;
    resolve({version:99,state:{reported:{Power:9}}});expect(session.ready).toBe(false);expect(session.confirmed.Power).toBe(0);expect(stop).toHaveBeenCalled();
  });
});

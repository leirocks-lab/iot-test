import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConfiguredRuntime } from './app-runtime';
import { createRuntime, type Runtime, type RuntimeContracts } from './runtime';
import { applicableContracts, integrationStatus, registeredIntegration, type IntegrationRegistry } from './runtime-integration';
import { communicationConfig } from './config';
import { MockDeviceTransport } from '../protocol/device';
import { defaultSettings, MemoryStorage, MockDatabase } from './store';
import { RowanService } from './rowan';
import type { DeviceProfileResolver } from '../protocol/device-session';
import type { MqttPort } from '../protocol/mqtt-connection';

vi.mock('./native-storage',async()=>{const {MemoryStorage}=await import('./store');return {SessionStorage:MemoryStorage,MockFileStorage:MemoryStorage};});
const testPorts=vi.hoisted(()=>({ports:[] as MqttPort[]}));
vi.mock('../protocol/mqtt-browser',async()=>{
  const {MqttConnection}=await import('../protocol/mqtt-connection');
  return {createMqttConnection:()=>new MqttConnection(()=>{
    let message:(topic:string,value:Uint8Array)=>void=()=>undefined;const connected:(()=>void)[]=[];
    const port:MqttPort={on:(name,fn)=>{if(name==='connect')connected.push(fn);},onMessage:fn=>{message=fn;},subscribe:(_topic,done)=>done(),unsubscribe:vi.fn(),end:vi.fn(),publish:vi.fn((_topic,value,done)=>{done();queueMicrotask(()=>message('fixture/state',new TextEncoder().encode(JSON.stringify({kind:'full',version:1,requestID:new TextDecoder().decode(value),reported:{Power:0,CleanHours:120}}))));})};
    testPorts.ports.push(port);queueMicrotask(()=>connected.forEach(fn=>fn()));return port;
  },100)};
});
const config=communicationConfig({environment:'development',httpMode:'real',deviceMode:'real',apiBaseUrl:'https://api.example.test',tenantID:'42',integrationProfile:'fixture-v1'});
const qr:RuntimeContracts['qr']=()=>({type:'product',productID:'fixture-product'});
const realtime:DeviceProfileResolver=async()=>({topics:['fixture/state'],canWrite:false,query:id=>({topic:'fixture/query',payload:new TextEncoder().encode(id)}),decode:(_topic,value)=>JSON.parse(new TextDecoder().decode(value))});
const contracts:RuntimeContracts={qr,realtime,wifi:{read:async()=>({connection:'wifi',source:'system',band:'unknown',ssid:'fixture'})},
  onboarding:{profile:{factoryReply:new Uint8Array([1]),stageTimeout:10000},makeBindCode:async()=> 'public-fixture',validatePassword:()=>undefined,deviceToken:()=> 'public-fixture',bindingTimeout:10000,operationTimeout:10000},
  controls:async()=>({bindings:{}}),maintenance:async()=>null,events:async()=>({definitions:[]})};
const registry=(value:RuntimeContracts=contracts):IntegrationRegistry=>({'fixture-v1':{environments:['development'],create:()=>({contracts:value})}});
const runtimes:Runtime[]=[];
afterEach(()=>{runtimes.splice(0).forEach(runtime=>runtime.dispose());testPorts.ports.length=0;vi.useRealTimers();vi.restoreAllMocks();});
describe('P1 App启动装配',()=>{
  it('passes all seven reviewed ports to the runtime factory without reading executable extra',async()=>{
    const fake={dispose:vi.fn()} as unknown as Runtime,create=vi.fn(async()=>fake);
    await createConfiguredRuntime({...config,qr:()=>{throw new Error('untrusted extra');}} as typeof config,{registry:registry(),create});
    const passed=(create.mock.calls[0] as unknown as [typeof config,undefined,RuntimeContracts])[2];expect(passed).toMatchObject(contracts);expect(passed.qr).toBe(qr);expect(passed.onboarding!.profile.factoryReply).not.toBe(contracts.onboarding!.profile.factoryReply);
  });
  it('selects only the named profile and rejects inherited/unknown names without executing a factory',async()=>{
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));await expect(createConfiguredRuntime({...config,integrationProfile:'constructor'},{registry:registry(),create})).rejects.toThrow('尚未注册');expect(create).not.toHaveBeenCalled();
  });
  it('does not run real factories in the default double-Mock app',async()=>{
    const assemble=vi.fn(),create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));await createConfiguredRuntime({}, {registry:{unused:{environments:['development'],create:assemble}},create});expect(assemble).not.toHaveBeenCalled();
    expect(create.mock.calls[0].slice(0,3)).toEqual([communicationConfig({}),undefined,{}]);
    await expect(createConfiguredRuntime({integrationProfile:'fixture-v1'},{registry:registry(),create})).rejects.toThrow('双Mock');
  });
  it('can start partial real configuration without manufacturing missing contracts',async()=>{
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));await createConfiguredRuntime({...config,integrationProfile:undefined},{create});expect(create.mock.calls[0].slice(0,3)).toEqual([communicationConfig({...config,integrationProfile:undefined}),undefined,{}]);
    const status=integrationStatus(config,{wifi:contracts.wifi});expect(status.capabilities.filter(item=>item.source==='missing').map(item=>item.key)).toEqual(['qr','onboarding','realtime','controls','maintenance','events']);
  });
  it('factory failure is retained and never invokes a fallback runtime or profile',async()=>{
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));await expect(createConfiguredRuntime(config,{registry:{'fixture-v1':{environments:['development'],create:()=>{throw new Error('Reviewed adapter failed');}}},create})).rejects.toThrow('Reviewed adapter failed');expect(create).not.toHaveBeenCalled();
  });
  it('rejects an environment mismatch before assembly or driver creation',async()=>{
    const assemble=vi.fn();await expect(createConfiguredRuntime({...config,environment:'production'},{registry:{'fixture-v1':{environments:['development'],create:assemble}}})).rejects.toThrow('不适用');expect(assemble).not.toHaveBeenCalled();
  });
  it.each(['https://profile.invalid','../profile','','Uppercase',3,null])('validates public selector %j',async value=>{
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));if(value===''){await createConfiguredRuntime({...config,integrationProfile:value},{create});expect(create).toHaveBeenCalledOnce();}
    else{await expect(createConfiguredRuntime({...config,integrationProfile:value} as typeof config,{create})).rejects.toThrow('ROWAN_INTEGRATION_PROFILE');expect(create).not.toHaveBeenCalled();}
  });
  it.each([{qr:1},{wifi:{}},{onboarding:{}}])('rejects malformed selected business ports before runtime work %j',async value=>{
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));await expect(createConfiguredRuntime(config,{registry:registry(value as RuntimeContracts),create})).rejects.toThrow(/无效|不完整/);expect(create).not.toHaveBeenCalled();
  });
  it('assembles a reviewed real profile without an additional password validator',async()=>{
    const onboarding={...contracts.onboarding!};delete onboarding.validatePassword;
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));
    await createConfiguredRuntime(config,{registry:registry({...contracts,onboarding}),create});
    const passed=(create.mock.calls[0] as unknown as [typeof config,undefined,RuntimeContracts])[2];
    expect(passed.onboarding?.validatePassword).toBeUndefined();expect(passed.onboarding?.makeBindCode).toBe(onboarding.makeBindCode);
  });
  it.each([null,42,'invalid'])('rejects an explicitly malformed password validator %j',async validatePassword=>{
    const create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));
    await expect(createConfiguredRuntime(config,{registry:registry({...contracts,onboarding:{...contracts.onboarding!,validatePassword:validatePassword as never}}),create})).rejects.toThrow('契约不完整');
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects asynchronous factory declarations before runtime construction',()=>{
    expect(()=>registeredIntegration(config,{'fixture-v1':{environments:['development'],create:(()=>Promise.resolve({contracts})) as unknown as IntegrationRegistry[string]['create']}})).toThrow('无效声明');
  });
  it('assembles HTTP-real and device-real dimensions independently, preserving existing mixed-mode semantics',()=>{
    const http=applicableContracts({...config,deviceMode:'mock'},contracts);expect(Object.keys(http)).toEqual(['qr','controls','maintenance','events']);
    const device=applicableContracts({...config,httpMode:'mock'},contracts);expect(Object.keys(device)).toEqual(['onboarding','wifi','realtime','controls','maintenance','events']);
    const status=integrationStatus({...config,httpMode:'mock'},device);expect(status.capabilities.find(item=>item.key==='qr')?.source).toBe('mock');expect(status.capabilities.find(item=>item.key==='ble')?.source).toBe('native');
    expect(integrationStatus(communicationConfig({})).capabilities.every(item=>item.source==='mock')).toBe(true);
  });
  it('follows the same bootstrap path into actual Runtime sessions with an explicit fixture MQTT resolver',async()=>{
    const driver=Object.assign(new MockDeviceTransport(await MockDatabase.open(new MemoryStorage()),{delay:0}),{dispose:vi.fn()}),dispose=driver.dispose;
    const selected:RuntimeContracts={...contracts,controls:async()=>({bindings:{}}),maintenance:async()=>null,events:async()=>({definitions:[]})};
    const runtime=await createConfiguredRuntime({...config,httpMode:'mock'},{registry:{'fixture-v1':{environments:['development'],create:()=>({contracts:selected,createDeviceDriver:async()=>driver})}}});runtimes.push(runtime);await runtime.service.login('rowan@example.com','Rowan@123','password');
    const session=runtime.createDeviceSession('dev_wine');await session.connect();expect(session.ready).toBe(true);expect(session.controlError).toBe('');expect(session.maintenanceError).toBe('');expect(session.eventError).toBe('');expect(session.confirmed.Power).toBe(0);expect(runtime.wifi).toBe(contracts.wifi);expect(runtime.integration.profile).toBe('fixture-v1');expect(testPorts.ports[0].publish).toHaveBeenCalledOnce();runtime.dispose();runtime.dispose();expect(dispose).toHaveBeenCalledOnce();
  });
  it('aborted-before-start does not assemble or create resources',async()=>{
    const controller=new AbortController();controller.abort();const assemble=vi.fn();await expect(createConfiguredRuntime(config,{signal:controller.signal,registry:{'fixture-v1':{environments:['development'],create:assemble}}})).rejects.toMatchObject({code:499});expect(assemble).not.toHaveBeenCalled();
  });
  it('cancellation during driver creation promptly rejects and disposes the late driver once',async()=>{
    let complete:(driver:MockDeviceTransport)=>void=()=>undefined;const controller=new AbortController(),driver=Object.assign(new MockDeviceTransport(await MockDatabase.open(new MemoryStorage())),{dispose:vi.fn()}),create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));
    const creating=vi.fn(()=>new Promise<MockDeviceTransport>(resolve=>{complete=resolve;})),pending=createConfiguredRuntime(config,{signal:controller.signal,create,registry:{'fixture-v1':{environments:['development'],create:()=>({contracts,createDeviceDriver:creating})}}}),cancelled=expect(pending).rejects.toMatchObject({code:499});
    await vi.waitFor(()=>expect(creating).toHaveBeenCalledOnce());controller.abort();await cancelled;complete(driver);await vi.waitFor(()=>expect(driver.dispose).toHaveBeenCalledOnce());expect(create).not.toHaveBeenCalled();
  });
  it('cancellation during runtime creation never delivers late state and disposes its resources',async()=>{
    let complete:(runtime:Runtime)=>void=()=>undefined;const controller=new AbortController(),dispose=vi.fn(),create=vi.fn(()=>new Promise<Runtime>(resolve=>{complete=resolve;}));
    const pending=createConfiguredRuntime(config,{signal:controller.signal,registry:registry(),create}),cancelled=expect(pending).rejects.toMatchObject({code:499});await vi.waitFor(()=>expect(create).toHaveBeenCalledOnce());controller.abort();await cancelled;
    complete({dispose} as unknown as Runtime);await vi.waitFor(()=>expect(dispose).toHaveBeenCalledOnce());
  });
  it('initialization failure cleans an owned driver and cloud timer and preserves the original failure',async()=>{
    const driver=Object.assign(new MockDeviceTransport(await MockDatabase.open(new MemoryStorage())),{dispose:vi.fn()}),restore=vi.spyOn(RowanService.prototype,'restore').mockRejectedValueOnce(new Error('fixture restore failure'));vi.useFakeTimers();
    await expect(createRuntime({httpMode:'mock',deviceMode:'real'},driver,{wifi:contracts.wifi})).rejects.toThrow('fixture restore failure');expect(restore).toHaveBeenCalledOnce();expect(driver.dispose).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects invalid module roots before a driver factory creates any resources',async()=>{
    const driver=Object.assign(new MockDeviceTransport(await MockDatabase.open(new MemoryStorage())),{dispose:vi.fn()}),createDeviceDriver=vi.fn(async()=>driver);await expect(createConfiguredRuntime({...config,apiBaseUrl:'https://public-user:public-fixture@api.example.test'},{registry:{'fixture-v1':{environments:['development'],create:()=>({contracts,createDeviceDriver})}}})).rejects.toThrow('无凭据');expect(createDeviceDriver).not.toHaveBeenCalled();expect(driver.dispose).not.toHaveBeenCalled();
  });
  it('rejects an invalid declared driver instead of silently falling back to the native driver',async()=>{
    const dispose=vi.fn(),create=vi.fn(async()=>({dispose:vi.fn()} as unknown as Runtime));await expect(createConfiguredRuntime(config,{create,registry:{'fixture-v1':{environments:['development'],create:()=>({contracts,createDeviceDriver:async()=>({dispose}) as unknown as MockDeviceTransport})}}})).rejects.toThrow('无效端口');expect(create).not.toHaveBeenCalled();expect(dispose).toHaveBeenCalledOnce();
  });
  it('unmount during session restoration eagerly stops the owned driver and cloud timer exactly once',async()=>{
    let complete:()=>void=()=>undefined;const restore=vi.spyOn(RowanService.prototype,'restore').mockImplementationOnce(()=>new Promise<void>(resolve=>{complete=resolve;})),controller=new AbortController(),driver=Object.assign(new MockDeviceTransport(await MockDatabase.open(new MemoryStorage())),{dispose:vi.fn()});vi.useFakeTimers();
    const pending=createConfiguredRuntime({...config,httpMode:'mock'},{signal:controller.signal,registry:{'fixture-v1':{environments:['development'],create:()=>({contracts,createDeviceDriver:async()=>driver})}}}),cancelled=expect(pending).rejects.toMatchObject({code:499});await vi.waitFor(()=>expect(restore).toHaveBeenCalledOnce());controller.abort();await cancelled;
    expect(driver.dispose).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);complete();await Promise.resolve();await Promise.resolve();expect(driver.dispose).toHaveBeenCalledOnce();
  });
  it('uses the selected real QR parser with Mock device transport instead of the Mock QR codec',async()=>{
    const runtime=await createConfiguredRuntime({...config,deviceMode:'mock'},{registry:registry()});runtimes.push(runtime);
    runtime.service.session={userID:'fixture-user',accessToken:'public-fixture',refreshToken:'public-fixture',expiresIn:3600,tokenType:'Bearer',setting:defaultSettings()};
    const flow=runtime.scanner.acquire();flow.read(['explicit-fixture']);expect(flow.state.error).toBe('');expect(flow.state.choices).toEqual([{type:'product',label:'fixture-product'}]);expect(runtime.wifi).toBeUndefined();
  });
  it('does not report an optional missing tenant as a local blocker or embed connection secrets',()=>{
    const status=integrationStatus({...config,tenantID:undefined},contracts,true);expect(status.configurationIssues).not.toContain('测试租户尚未提供，真实接口请求不可用');
    expect(JSON.stringify(status)).not.toMatch(/api\.example|public-fixture|factoryReply|tenantID/);expect(status.capabilities.filter(item=>item.source==='provided')).toHaveLength(8);
  });
  it('invalid async assembly reports a configuration failure without leaking an unhandled rejection',async()=>{
    await expect(createConfiguredRuntime(config,{registry:{'fixture-v1':{environments:['development'],create:(async()=>{throw new Error('unsupported async assembly');}) as unknown as IntegrationRegistry[string]['create']}}})).rejects.toThrow('无效声明');await Promise.resolve();
  });
});

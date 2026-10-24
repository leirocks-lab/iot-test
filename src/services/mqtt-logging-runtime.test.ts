import { afterEach, describe, expect, it, vi } from 'vitest';
import mqtt from 'mqtt';
import { createRuntime, type Runtime } from './runtime';
import { MockDeviceTransport } from '../protocol/device';
import { MemoryStorage, MockDatabase } from './store';

vi.mock('./native-storage',async()=>{const {MemoryStorage}=await import('./store');return {SessionStorage:MemoryStorage,MockFileStorage:MemoryStorage};});
vi.mock('mqtt',async()=>{
  const {EventEmitter}=await import('node:events');
  return {default:{connect:vi.fn(()=>{
    const client=Object.assign(new EventEmitter(),{
      subscribe:(topic:string,_options:unknown,done:(error:null,grants:{topic:string;qos:number}[])=>void)=>done(null,[{topic,qos:1}]),
      publish:(_topic:string,payload:Uint8Array,_options:unknown,done:()=>void)=>{done();queueMicrotask(()=>client.emit('message','fixture/state',new TextEncoder().encode(JSON.stringify({kind:'full',version:1,requestID:new TextDecoder().decode(payload),reported:{Power:0}}))));},
      unsubscribe:(_topic:string,done:()=>void)=>done(),end:()=>client.emit('close'),
    });
    queueMicrotask(()=>client.emit('connect'));return client;
  })}};
});
const runtimes:Runtime[]=[];
afterEach(()=>{for(const r of runtimes)r.dispose();runtimes.length=0;vi.restoreAllMocks();vi.clearAllMocks();});
const mqttCalls=(spy:{mock:{calls:unknown[][]}})=>spy.mock.calls.filter(call=>String(call[0]).startsWith('[MQTT]'));
async function real(level:'debug'|'off'|'error'){
  const driver=new MockDeviceTransport(await MockDatabase.open(new MemoryStorage()),{delay:0});
  const r=await createRuntime({httpMode:'mock',deviceMode:'real',httpLogLevel:'off',mqttLogLevel:level},driver,{
    realtime:async()=>({topics:['fixture/state'],canWrite:false,query:id=>({topic:'fixture/get',payload:new TextEncoder().encode(id)}),decode:(_topic,payload)=>JSON.parse(new TextDecoder().decode(payload))}),
    wifi:{read:async()=>({connection:'wifi',band:'unknown',source:'system',ssid:'fixture'})},
  });
  runtimes.push(r);await r.service.login('rowan@example.com','Rowan@123','password');return r;
}
describe('runtime real-only MQTT diagnostics',()=>{
  it('wires debug through both device sessions and standalone realtime connections',async()=>{
    const debug=vi.spyOn(console,'debug').mockImplementation(()=>undefined),r=await real('debug');
    const session=r.createDeviceSession('dev_wine');await session.connect();expect(mqttCalls(debug).some(call=>String(call[0]).includes('publish_attempt'))).toBe(true);
    expect(mqttCalls(debug).some(call=>String(call[0]).includes('message'))).toBe(true);session.close();
    debug.mockClear();const connection=await r.createRealtimeConnection!();await connection.connect(await r.service.mqtt('dev_wine'),'dev_wine');
    expect(mqttCalls(debug).some(call=>String(call[0]).includes('connected'))).toBe(true);connection.close();
  });
  it.each(['off','error'] as const)('respects explicit %s without printing bodies',async level=>{
    const debug=vi.spyOn(console,'debug').mockImplementation(()=>undefined),r=await real(level);
    const session=r.createDeviceSession('dev_wine');await session.connect();expect(mqttCalls(debug)).toHaveLength(0);session.close();
  });
  it('never logs MQTT or starts a real client in Mock device mode',async()=>{
    const debug=vi.spyOn(console,'debug').mockImplementation(()=>undefined);
    const r=await createRuntime({httpLogLevel:'off',mqttLogLevel:'debug'});runtimes.push(r);
    await r.service.login('rowan@example.com','Rowan@123','password');const session=r.createDeviceSession('dev_wine');await session.connect();
    expect(mqttCalls(debug)).toHaveLength(0);expect(mqtt.connect).not.toHaveBeenCalled();session.close();
  });
});

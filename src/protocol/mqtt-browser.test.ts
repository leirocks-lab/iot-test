import { EventEmitter } from 'node:events';
import mqtt from 'mqtt';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../lib/core';
import { createMqttConnection } from './mqtt-browser';

vi.mock('mqtt', () => ({ default: { connect: vi.fn() } }));
afterEach(()=>vi.restoreAllMocks());

function fixture(level:'debug'|'error'|'off'='debug',broken=false){
  const client=Object.assign(new EventEmitter(),{
    subscribe:vi.fn((topic:string,_options:unknown,done:(error:Error|null,grants:{topic:string;qos:number}[])=>void)=>done(null,[{topic,qos:1}])),
    publish:vi.fn((_topic:string,_payload:unknown,_options:unknown,done:(error?:Error)=>void)=>done()),
    unsubscribe:vi.fn((_topic:string,done:(error?:Error)=>void)=>done()),
    end:vi.fn(()=>{client.emit('close');}),
  });
  vi.mocked(mqtt.connect).mockReturnValue(client as unknown as ReturnType<typeof mqtt.connect>);
  const logger:Logger={debug:vi.fn(()=>{if(broken)throw new Error('sink');}),info:vi.fn(),warn:vi.fn(),error:vi.fn(()=>{if(broken)throw new Error('sink');})};
  const connection=createMqttConnection({level,logger});
  const credentials={host:'wss://broker.example.test/mqtt',endpoint:'broker.example.test',path:'/mqtt',clientID:'fixture',username:'private-user',password:'private-password',deviceID:'dev_fixture'};
  const connect=async()=>{const pending=connection.connect(credentials,credentials.deviceID);client.emit('connect');await pending;};
  const entries=()=>[...vi.mocked(logger.debug).mock.calls,...vi.mocked(logger.error).mock.calls].map(call=>call[1]!);
  return {client,logger,connection,connect,entries};
}

describe('App真实MQTT工厂认证接线', () => {
  it('logs each inbound/outbound wire message once, separately from ACKs, without altering bytes',async()=>{
    const c=fixture();try{await c.connect();const receive=vi.fn();const remove=await c.connection.subscribe('device/topic',receive);
      const payload=new TextEncoder().encode('{"Power":1,"password":"payload-private"}');
      let ack:((error?:Error)=>void)|undefined;c.client.publish.mockImplementation((_t,_p,_o,done)=>{ack=done;});
      const publishing=c.connection.publish('device/topic',payload);
      expect(c.entries().filter(x=>x.event==='publish_attempt')).toHaveLength(1);expect(c.entries().filter(x=>x.event==='puback')).toHaveLength(0);
      expect(new Uint8Array(c.client.publish.mock.calls[0][1] as Uint8Array)).toEqual(payload);ack!();await publishing;
      c.client.emit('message','device/topic',payload);
      expect(receive).toHaveBeenCalledOnce();expect(receive).toHaveBeenCalledWith(payload);
      expect(c.entries().filter(x=>x.event==='message')).toHaveLength(1);expect(c.entries().filter(x=>x.event==='puback')).toHaveLength(1);
      expect(c.entries().find(x=>x.event==='message')).toMatchObject({topic:'device/topic',payload:{Power:1,password:'[REDACTED]'}});
      remove();expect(c.entries().some(x=>x.event==='unsubscribe')).toBe(true);expect(c.entries().some(x=>x.event==='unsuback')).toBe(true);
      expect(JSON.stringify(c.entries())).not.toMatch(/private-user|private-password|payload-private/);
    }finally{c.connection.close();}
  });
  it('logs errors without raw messages or signed URLs, and keeps off/error bodies silent',async()=>{
    for(const level of ['off','error'] as const){const c=fixture(level);try{await c.connect();
      c.client.emit('message','topic',new TextEncoder().encode('{"Power":1}'));
      c.client.emit('error',new Error('wss://host/mqtt?X-Amz-Signature=raw-secret'));
      expect(c.logger.debug).not.toHaveBeenCalled();expect(c.logger.error).toHaveBeenCalledTimes(level==='error'?1:0);
      expect(JSON.stringify(c.entries())).not.toMatch(/raw-secret|payload/);
    }finally{c.connection.close();}}
  });
  it('does not let a broken logger change connect, subscribe, publish or cleanup',async()=>{
    const c=fixture('debug',true);await c.connect();const remove=await c.connection.subscribe('topic',vi.fn());
    await c.connection.publish('topic',new Uint8Array());expect(()=>{remove();c.connection.close();}).not.toThrow();expect(c.client.end).toHaveBeenCalledOnce();
  });
  it('signs the WebSocket URL without sending STS secrets in MQTT CONNECT', async () => {
    const client = Object.assign(new EventEmitter(), { end: vi.fn() });
    vi.mocked(mqtt.connect).mockReturnValue(client as unknown as ReturnType<typeof mqtt.connect>);
    const connection = createMqttConnection();
    const credentials = {
      host: 'wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt',
      endpoint: 'example-ats.iot.ap-southeast-2.amazonaws.com', path: '/mqtt',
      clientID: 'backend-issued-client', username: 'AKIDEXAMPLE', password: 'fixture-secret',
      deviceID: 'dev_test', sessionToken: 'fixture-token',
    };
    const pending = connection.connect(credentials, 'dev_test');
    try {
      client.emit('connect');
      await pending;
      const [url, options] = vi.mocked(mqtt.connect).mock.calls.at(-1)!;
      expect(new URL(url as string).searchParams.has('X-Amz-Signature')).toBe(true);
      expect(options).not.toHaveProperty('username');
      expect(options).not.toHaveProperty('password');
      expect(options).toMatchObject({ clientId: credentials.clientID, reconnectPeriod: 0, resubscribe: false });
    } finally { connection.close(); }
  });
});

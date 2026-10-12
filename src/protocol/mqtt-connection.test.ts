import { afterEach, describe, expect, it, vi } from 'vitest';
import { MqttConnection, mqttCredentials, type MqttClientOptions, type MqttCredentials, type MqttPort } from './mqtt-connection';

const credentials={host:'wss://broker.example.test/mqtt',endpoint:'broker.example.test',path:'/mqtt',clientID:'issued-client',username:'issued-user',password:'public-test',deviceID:'dev_real'};
class Port implements MqttPort {
  listeners=new Map<string,(()=>void)[]>();
  message?:(topic:string,payload:Uint8Array)=>void;
  on(event:string,listener:()=>void){this.listeners.set(event,[...(this.listeners.get(event)??[]),listener]);}
  onMessage(listener:(topic:string,payload:Uint8Array)=>void){this.message=listener;}
  emit(event:string){for(const listener of this.listeners.get(event)??[])listener();}
  subscribe=vi.fn((_topic:string,done:(error?:Error)=>void)=>done());
  unsubscribe=vi.fn();
  publish=vi.fn((_topic:string,_payload:Uint8Array,done:(error?:Error)=>void)=>done());
  end=vi.fn();
}
function setup(){const port=new Port(),factory=vi.fn((_credentials:MqttCredentials,_options:MqttClientOptions)=>port),connection=new MqttConnection(factory,100);return {port,factory,connection};}
async function connected(){const context=setup(),pending=context.connection.connect(credentials,'dev_real');context.port.emit('connect');await pending;return context;}
afterEach(()=>vi.useRealTimers());
describe('MQTT WSS连接准备（注入端口）',()=>{
  it('requires issued credentials, WSS and the expected device, without guessing defaults',()=>{
    expect(mqttCredentials(credentials,'dev_real')).toEqual(credentials);
    for(const value of [{...credentials,password:''},{...credentials,host:'ws://broker.example.test/mqtt'}])expect(()=>mqttCredentials(value,'dev_real')).toThrow();
    expect(()=>mqttCredentials(credentials,'different')).toThrow('身份');
  });
  it('only confirms transport after CONNACK, with reconnect/offline replay disabled',async()=>{
    const {connection,port,factory}=setup(),change=vi.fn();connection.onConnectionChange(change);
    const pending=connection.connect(credentials,'dev_real');expect(connection.isConnected).toBe(false);
    expect(factory).toHaveBeenCalledWith(credentials,expect.objectContaining({reconnectPeriod:0,queueQoSZero:false,resubscribe:false,clean:true}));
    port.emit('connect');await pending;expect(connection.isConnected).toBe(true);expect(change).toHaveBeenCalledWith(true);connection.close();
  });
  it('closes cancelled connection attempts and ignores late CONNACK',async()=>{
    const {connection,port}=setup(),controller=new AbortController(),pending=connection.connect(credentials,'dev_real',controller.signal);
    const rejected=expect(pending).rejects.toMatchObject({code:499});controller.abort();await rejected;port.emit('connect');
    expect(connection.isConnected).toBe(false);expect(port.end).toHaveBeenCalledOnce();
  });
  it('releases a port created during synchronous cancellation',async()=>{
    const port=new Port(),controller=new AbortController();
    const connection=new MqttConnection(()=>{controller.abort();return port;},100);
    await expect(connection.connect(credentials,'dev_real',controller.signal)).rejects.toMatchObject({code:499});
    expect(port.end).toHaveBeenCalledOnce();expect(connection.isConnected).toBe(false);
  });
  it('ends timed-out connects without retrying',async()=>{
    vi.useFakeTimers();const {connection,port,factory}=setup(),pending=connection.connect(credentials,'dev_real');
    const rejected=expect(pending).rejects.toMatchObject({code:408});await vi.advanceTimersByTimeAsync(101);await rejected;
    expect(factory).toHaveBeenCalledOnce();expect(port.end).toHaveBeenCalledOnce();
  });
  it('uses literal topics and waits for SUBACK before confirming a subscription',async()=>{
    const {connection,port}=await connected();let ack!:(error?:Error)=>void;
    port.subscribe.mockImplementation((_topic,done)=>{ack=done;});const handler=vi.fn();
    const subscribe=connection.subscribe('provided/topic',handler);
    await expect(connection.subscribe('provided/topic',vi.fn())).rejects.toMatchObject({code:409});
    ack();const remove=await subscribe;port.message!('other/topic',new Uint8Array([1]));expect(handler).not.toHaveBeenCalled();
    port.message!('provided/topic',new Uint8Array([1]));expect(handler).toHaveBeenCalledOnce();remove();expect(port.unsubscribe).toHaveBeenCalledWith('provided/topic');
    await expect(connection.subscribe('$aws/things/+/shadow/#',handler)).rejects.toMatchObject({code:400});connection.close();
  });
  it('does not confirm a rejected subscription or keep its handler',async()=>{
    const {connection,port}=await connected();port.subscribe.mockImplementation((_topic,done)=>done(new Error('rejected')));const handler=vi.fn();
    await expect(connection.subscribe('provided/topic',handler)).rejects.toMatchObject({code:0});
    port.message!('provided/topic',new Uint8Array([1]));expect(handler).not.toHaveBeenCalled();connection.close();
  });
  it('does not send commands while offline',async()=>{
    const {connection,port}=setup();await expect(connection.publish('provided/topic',new Uint8Array([1]))).rejects.toMatchObject({code:409});
    expect(port.publish).not.toHaveBeenCalled();
  });
  it('times out unconfirmed delivery and closes the old session, without retransmitting',async()=>{
    vi.useFakeTimers();const {connection,port}=await connected();port.publish.mockImplementation(()=>undefined);
    const pending=connection.publish('provided/topic',new Uint8Array([1])),rejected=expect(pending).rejects.toMatchObject({code:408});
    await vi.advanceTimersByTimeAsync(101);await rejected;expect(port.publish).toHaveBeenCalledOnce();expect(port.end).toHaveBeenCalledOnce();expect(connection.isConnected).toBe(false);
  });
  it('reports disconnects and prevents stale messages from changing a new connection',async()=>{
    const {connection,port}=await connected(),handler=vi.fn(),change=vi.fn();connection.onConnectionChange(change);
    await connection.subscribe('provided/topic',handler);port.emit('close');port.message!('provided/topic',new Uint8Array([1]));
    expect(connection.isConnected).toBe(false);expect(change).toHaveBeenCalledWith(false);expect(handler).not.toHaveBeenCalled();
  });
  it('does not let cancelled subscription cleanup delete a newer round subscription',async()=>{
    const {connection,port}=await connected(),acks:((error?:Error)=>void)[]=[];
    port.subscribe.mockImplementation((_topic,done)=>{acks.push(done);});
    const old=connection.subscribe('provided/topic',vi.fn()),rejected=expect(old).rejects.toMatchObject({code:499});
    connection.close();const reconnect=connection.connect(credentials,'dev_real');port.emit('connect');
    const handler=vi.fn(),fresh=connection.subscribe('provided/topic',handler);
    await rejected;await reconnect;acks[1]();await fresh;
    port.message!('provided/topic',new Uint8Array([1]));expect(handler).toHaveBeenCalledOnce();connection.close();
  });
});

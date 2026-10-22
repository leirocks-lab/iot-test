import { ApiError } from '../services/models';

export interface MqttCredentials {host:string;endpoint:string;path:string;clientID:string;username:string;password:string;deviceID:string;sessionToken?:string}
export interface MqttPort {
  on(event:'connect'|'error'|'close',listener:()=>void):void;
  onMessage(listener:(topic:string,payload:Uint8Array)=>void):void;
  subscribe(topic:string,done:(error?:Error)=>void):void;
  unsubscribe(topic:string):void;
  publish(topic:string,payload:Uint8Array,done:(error?:Error)=>void):void;
  end():void;
}
export interface MqttClientOptions {reconnectPeriod:0;resubscribe:false;queueQoSZero:false;clean:true;connectTimeout:number}
export type MqttFactory=(credentials:MqttCredentials,options:MqttClientOptions)=>MqttPort;
const cancelError=()=>new ApiError(499,'MQTT客户端操作已停止');
function topicLiteral(topic:string){if(!topic||/[+#\0]/.test(topic))throw new ApiError(400,'必须使用当前设备已确认的显式Topic');}
export function mqttCredentials(value:Record<string,unknown>,expectedDeviceID:string):MqttCredentials {
  for(const key of ['host','endpoint','path','clientID','username','password','deviceID'])
    if(typeof value[key]!=='string'||!value[key])throw new ApiError(503,'实际MQTT凭据尚未完整提供');
  if(value.sessionToken!==undefined&&(typeof value.sessionToken!=='string'||!value.sessionToken.trim()))throw new ApiError(503,'AWS STS会话令牌无效');
  const url=new URL(value.host as string);
  if(url.protocol!=='wss:'||url.username||url.password||url.hash)throw new ApiError(503,'MQTT连接必须使用服务端提供的WSS地址');
  if(value.deviceID!==expectedDeviceID||!expectedDeviceID)throw new ApiError(403,'MQTT凭据设备身份不一致');
  return {...value} as unknown as MqttCredentials;
}

/** Transport acknowledgement only. Topic/profile mapping and reported-state confirmation belong to the device session. */
export class MqttConnection {
  private port?:MqttPort;
  private connected=false;
  private round=0;
  private pending=new Set<(error:Error)=>void>();
  private messages=new Map<string,Set<(payload:Uint8Array)=>void>>();
  private subscribed=new Set<string>();
  private changes=new Set<(connected:boolean)=>void>();
  constructor(private factory:MqttFactory,private timeout=10000){}
  get isConnected(){return this.connected;}
  onConnectionChange(listener:(connected:boolean)=>void){this.changes.add(listener);return ()=>{this.changes.delete(listener);};}
  private notify(){for(const listener of this.changes)listener(this.connected);}
  private operation(start:(done:(error?:Error)=>void)=>void,signal?:AbortSignal):Promise<void> {
    if(signal?.aborted)return Promise.reject(cancelError());
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending.delete(fail);if(error)reject(error);else resolve();};
      const fail=(error:Error)=>finish(error);
      const abort=()=>{finish(cancelError());this.close();};
      const timer=setTimeout(()=>{finish(new ApiError(408,'MQTT传输结果未确认'));this.close();},this.timeout);
      this.pending.add(fail);signal?.addEventListener('abort',abort,{once:true});
      try{start(finish);}catch{finish(new ApiError(0,'MQTT传输操作失败'));this.close();}
    });
  }
  async connect(value:Record<string,unknown>,deviceID:string,signal?:AbortSignal) {
    this.close();const credentials=mqttCredentials(value,deviceID),round=this.round;
    await this.operation(done=>{
      const port=this.factory(credentials,{reconnectPeriod:0,resubscribe:false,queueQoSZero:false,clean:true,connectTimeout:this.timeout});
      if(round!==this.round||signal?.aborted){port.end();done(cancelError());return;}
      this.port=port;
      port.on('connect',()=>{if(round!==this.round)return;this.connected=true;done();this.notify();});
      port.on('error',()=>{if(round===this.round){done(new ApiError(0,'MQTT连接失败，请核对实际凭据'));this.close();}});
      port.on('close',()=>{if(round===this.round){done(new ApiError(0,'MQTT连接已断开'));this.close();}});
      port.onMessage((topic,payload)=>{if(round!==this.round||!this.connected)return;for(const handler of this.messages.get(topic)??[])handler(payload.slice());});
    },signal);
  }
  async subscribe(topic:string,handler:(payload:Uint8Array)=>void,signal?:AbortSignal):Promise<()=>void> {
    topicLiteral(topic);const port=this.port,round=this.round;
    if(!port||!this.connected)throw new ApiError(409,'MQTT尚未连接');
    let handlers=this.messages.get(topic);
    if(handlers){
      if(!this.subscribed.has(topic))throw new ApiError(409,'当前Topic仍在等待订阅确认');
      handlers.add(handler);return ()=>{handlers!.delete(handler);if(!handlers!.size&&this.messages.get(topic)===handlers){this.messages.delete(topic);this.subscribed.delete(topic);if(this.connected&&this.port===port)port.unsubscribe(topic);}};
    }
    handlers=new Set([handler]);this.messages.set(topic,handlers);
    try{await this.operation(done=>port.subscribe(topic,error=>done(error?new ApiError(0,'MQTT订阅未确认'):undefined)),signal);}
    catch(error){if(this.messages.get(topic)===handlers)this.messages.delete(topic);throw error;}
    if(round!==this.round||this.port!==port||!this.connected)throw cancelError();
    this.subscribed.add(topic);
    return ()=>{handlers!.delete(handler);if(!handlers!.size&&this.messages.get(topic)===handlers){this.messages.delete(topic);this.subscribed.delete(topic);if(this.connected&&this.port===port)port.unsubscribe(topic);}};
  }
  async publish(topic:string,payload:Uint8Array,signal?:AbortSignal) {
    topicLiteral(topic);const port=this.port;
    if(!port||!this.connected)throw new ApiError(409,'MQTT未连接，不排队或重发旧命令');
    await this.operation(done=>port.publish(topic,payload,error=>done(error?new ApiError(0,'MQTT投递未确认'):undefined)),signal);
  }
  close() {
    ++this.round;const wasConnected=this.connected;this.connected=false;const port=this.port;this.port=undefined;this.messages.clear();this.subscribed.clear();
    for(const fail of [...this.pending])fail(cancelError());this.pending.clear();
    try{port?.end();}catch{/* A closed native/socket resource must not reopen itself. */}
    if(wasConnected)this.notify();
  }
}

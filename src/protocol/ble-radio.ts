import { deriveKey, reassemble, type DiscoveredDevice } from './ble';
import { BLE_0822, classify0822, decode0822, decodeDevice0822, expectedAck0822, FrameStream0822, key0822, parseAdvertisement0822 } from './ble-0822';
import { BLE_0922, decrypt0922, packets0922, PacketStream0922, parseAdvertisement0922 } from './ble-0922';
import { ApiError } from '../services/models';
import { ProvisionNotSentError, UnavailableDeviceTransport, withBudget, type ProvisionInput } from './device';
import { resolveDeviceScanDuration } from '../config/device-discovery';

export interface BleConnection {
  mtu:number;
  write(frame:Uint8Array,signal?:AbortSignal):Promise<void>;
  close():Promise<void>;
}
export interface BleRadio {
  ready():Promise<void>;
  startScan(listener:(error:Error|null,advertisement?:{handle:string;manufacturer:Uint8Array;services?:readonly string[];rssi?:number})=>void):Promise<void>;
  stopScan():Promise<void>;
  connect(handle:string,onBytes:(bytes:Uint8Array)=>void,onDisconnect:(error:Error)=>void,signal?:AbortSignal,service?:string):Promise<BleConnection>;
  dispose():Promise<void>;
}
const aborted=()=>new ApiError(499,'当前蓝牙客户端操作已停止');
interface Session {
  mac:string;model:string;key:Uint8Array;stream:FrameStream0822;frames:{command:number;raw:Uint8Array}[];
  channel?:BleConnection;closed:boolean;error?:Error;
  writeStarted:boolean;
  pending?:{command:number|'stage';resolve:(frame:Uint8Array)=>void;reject:(error:Error)=>void;clear:()=>void};
}
interface LegacyMessage {type:string;data?:{error_code?:number;describe?:string}}
interface LegacySession {
  mac:string;model:string;key:Uint8Array;stream:PacketStream0922;messages:LegacyMessage[];
  channel?:BleConnection;closed:boolean;error?:Error;writeStarted:boolean;
  pending?:{resolve:(message:LegacyMessage)=>void;reject:(error:Error)=>void;clear:()=>void};
}
const route=(service?:string)=>service==='0922'||service===BLE_0922.service?BLE_0922.service:BLE_0822.service;
const advertisedService=(value:string)=>{
  const normalized=value.toLowerCase();
  return normalized==='0822'?BLE_0822.service:normalized==='0922'?BLE_0922.service:normalized;
};
const sessionKey=(input:ProvisionInput)=>input.bindCode||input.mac;

/** Native BLE capability; cloud binding and MQTT remain separate, explicitly unavailable boundaries. */
export class Ble0822DeviceTransport extends UnavailableDeviceTransport {
  readonly reportsProvisionWriteStart=true;
  private found=new Map<string,DiscoveredDevice>();
  private sessions=new Map<string,Session>();
  private legacySessions=new Map<string,LegacySession>();
  private scanCancel?:()=>void;
  private disposed=false;
  private writing=false;
  constructor(private radio:BleRadio,private scanWindow=resolveDeviceScanDuration(),private ackTimeout=5000){super();}
  async scan(signal?:AbortSignal,onDiscovered?:(device:DiscoveredDevice)=>void,durationMs=this.scanWindow):Promise<DiscoveredDevice[]> {
    const duration=resolveDeviceScanDuration(durationMs);
    if(this.disposed)throw new ApiError(503,'蓝牙客户端已关闭');
    if(this.scanCancel)throw new ApiError(409,'已有蓝牙扫描进行中');
    this.found.clear();
    return withBudget(async budget=>{
      await this.radio.ready();if(budget.aborted||this.disposed)throw aborted();
      return new Promise<DiscoveredDevice[]>((resolve,reject)=>{
        let settled=false;
        const finish=(error?:Error)=>{
          if(settled)return;settled=true;clearTimeout(timer);budget.removeEventListener('abort',cancel);
          if(this.scanCancel===cancel)this.scanCancel=undefined;
          void this.radio.stopScan().catch(()=>undefined);
          if(error)reject(error);else resolve([...this.found.values()]);
        };
        const cancel=()=>finish(aborted());
        const timer=setTimeout(()=>finish(),duration);
        this.scanCancel=cancel;budget.addEventListener('abort',cancel,{once:true});
        if(budget.aborted){cancel();return;}
        void this.radio.startScan((error,advertisement)=>{
          if(settled||budget.aborted)return;
          if(error){finish(error);return;}
          if(!advertisement)return;
          try{
            const services=(advertisement.services??[]).map(advertisedService);
            const service=services.includes(BLE_0822.service)?BLE_0822.service:services.includes(BLE_0922.service)?BLE_0922.service:undefined;
            if(!service)return;
            const device=service===BLE_0822.service?parseAdvertisement0822(advertisement):parseAdvertisement0922(advertisement);
            const key=`${service}:${device.mac}`;
            if(!this.found.has(key)){this.found.set(key,device);onDiscovered?.({...device});}
          }
          catch{/* Unsupported advertisements are not eligible devices in this profile. */}
        }).catch(error=>finish(error instanceof Error?error:new ApiError(65,'蓝牙扫描失败')));
      });
    },Math.min(duration+30000,2_147_483_647),'蓝牙扫描超时',signal).catch(error=>{if(error instanceof ApiError&&error.code===408&&!signal?.aborted&&this.found.size)return [...this.found.values()];throw error;});
  }
  private close(session:Session,error:Error=aborted()) {
    if(session.closed)return;session.closed=true;session.error=error;
    session.pending?.clear();session.pending?.reject(error);session.pending=undefined;
    for(const frame of session.frames)frame.raw.fill(0);session.frames=[];session.stream.clear();session.key.fill(0);
    void session.channel?.close().catch(()=>undefined);
  }
  private received(session:Session,bytes:Uint8Array) {
    if(session.closed)return;
    try{for(const raw of session.stream.push(bytes)){
      const decoded=decodeDevice0822(raw,session.key),command=decoded.command;decoded.data.fill(0);
      if(typeof __DEV__!=='undefined'&&__DEV__)console.info('0822 notification command',command.toString(16).toUpperCase());
      if(session.pending&&(this.matches(session.pending.command,command)||classify0822(command).kind==='failure')){
        const job=session.pending;job.clear();session.pending=undefined;
        if(this.matches(job.command,command))job.resolve(raw);else{raw.fill(0);job.reject(new ApiError(command,`设备拒绝配网参数（${command.toString(16).toUpperCase()}）`));}
      }else{
        if(session.frames.length>=32){raw.fill(0);throw new ApiError(0x63,'蓝牙通知队列超出限制');}
        session.frames.push({command,raw});
      }
    }}catch(error){this.close(session,error instanceof Error?error:new ApiError(0x63,'蓝牙通知解析失败'));}
  }
  private async session(input:ProvisionInput,signal?:AbortSignal) {
    if(signal?.aborted||this.disposed)throw aborted();
    const key=sessionKey(input),previous=this.sessions.get(key);
    if(previous&&!previous.closed){
      if(previous.mac!==input.mac||previous.model!==input.model)throw new ApiError(409,'当前蓝牙事务身份不一致');
      return previous;
    }
    const candidate=this.found.get(`${BLE_0822.service}:${input.mac}`);
    if(!candidate||candidate.model!==input.model)throw new ApiError(503,'蓝牙发现身份已失效，请重新扫描');
    const session:Session={mac:input.mac,model:input.model,key:key0822(input.mac,input.model),stream:new FrameStream0822(),frames:[],closed:false,writeStarted:false};
    this.sessions.set(key,session);
    const cancel=()=>this.close(session);
    signal?.addEventListener('abort',cancel,{once:true});
    try{
      await this.radio.ready();if(session.closed||signal?.aborted||this.disposed)throw session.error??aborted();
      session.channel=await this.radio.connect(candidate.handle,bytes=>this.received(session,bytes),error=>this.close(session,error),signal,BLE_0822.service);
      if(session.closed||signal?.aborted||this.disposed){await session.channel.close();throw session.error??aborted();}
      if(!Number.isInteger(session.channel.mtu)||session.channel.mtu<23)throw new ApiError(503,'设备协商MTU无效');
      return session;
    }catch(error){this.close(session);throw error;}
    finally{signal?.removeEventListener('abort',cancel);}
  }
  private matches(expected:number|'stage',command:number){return expected==='stage'?classify0822(command).kind==='stage':expected===command;}
  private wait(session:Session,command:number|'stage',signal?:AbortSignal):Promise<Uint8Array> {
    if(session.closed||signal?.aborted)return Promise.reject(session.error??aborted());
    if(session.pending)return Promise.reject(new ApiError(409,'已有蓝牙应答等待'));
    const index=session.frames.findIndex(frame=>this.matches(command,frame.command)||classify0822(frame.command).kind==='failure');
    if(index>=0){const item=session.frames.splice(index,1)[0];
      if(!this.matches(command,item.command)){item.raw.fill(0);return Promise.reject(new ApiError(item.command,`设备拒绝配网参数（${item.command.toString(16).toUpperCase()}）`));}
      return Promise.resolve(item.raw);
    }
    return new Promise((resolve,reject)=>{
      const abort=()=>{if(session.pending?.resolve===resolve){clear();session.pending=undefined;reject(aborted());}};
      const timer=command==='stage'?undefined:setTimeout(()=>{if(session.pending?.resolve===resolve){clear();session.pending=undefined;reject(new ApiError(408,'0822 ACK等待超时'));}},this.ackTimeout);
      const clear=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
      session.pending={command,resolve,reject,clear};signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted)abort();
    });
  }
  async exchange(input:ProvisionInput,packets:Uint8Array[],signal?:AbortSignal,onWriteStart?:()=>void):Promise<Uint8Array[]> {
    if(route(input.service)===BLE_0922.service)return this.exchangeLegacy(input,packets,signal,onWriteStart);
    if(this.writing)throw new ApiError(409,'已有蓝牙参数写入');
    if(packets.length!==1||packets[0][0]!==0xa5||packets[0][1]!==0x5a)throw new ApiError(400,'0822不接受旧版应用分片');
    let activeSession=this.sessions.get(sessionKey(input));
    this.writing=true;
    try{return await withBudget(async budget=>{
      const session=await this.session(input,budget);activeSession=session;
      const frame=packets[0],decoded=decode0822(frame,session.key),command=decoded.command;
      decoded.data.fill(0);const expected=expectedAck0822(command);
      if(expected===undefined&&command!==0x8f)throw new ApiError(503,'当前客户端未开放该设备命令');
      if(frame.length>session.channel!.mtu-3)throw new ApiError(503,'设备MTU不能发送完整0822帧，禁止猜测长写');
      onWriteStart?.();session.writeStarted=true;await session.channel!.write(frame,budget);if(budget.aborted)throw aborted();
      return expected===undefined?[]:[await this.wait(session,expected,budget)];
    },this.ackTimeout+15000,'0822蓝牙写入超时',signal);}
    catch(error){const unsent=(activeSession??this.sessions.get(sessionKey(input)))?.writeStarted!==true;this.releaseProvision(sessionKey(input));throw unsent?new ProvisionNotSentError(error):error;}
    finally{this.writing=false;}
  }
  async challenge(input:ProvisionInput,signal?:AbortSignal):Promise<Uint8Array[]> {
    const session=this.sessions.get(sessionKey(input));if(!session||session.closed)throw new ApiError(409,'尚未建立0822校验会话');
    try{return [await this.wait(session,0x0f,signal)];}catch(error){this.releaseProvision(sessionKey(input));throw error;}
  }
  async provision(input?:ProvisionInput,onStatus?:(status:string)=>void,signal?:AbortSignal):Promise<void>{
    if(input&&route(input.service)===BLE_0922.service)return this.provisionLegacy(input,onStatus,signal);
    const session=input&&this.sessions.get(sessionKey(input));
    if(!session||!onStatus)throw new ApiError(503,'尚未建立完整0822配网会话');
    try{for(;;){
      const raw=await this.wait(session,'stage',signal);
      let command:number;
      try{const decoded=decodeDevice0822(raw,session.key);command=decoded.command;decoded.data.fill(0);}finally{raw.fill(0);}
      const stage=classify0822(command);
      if(stage.kind!=='stage')throw new ApiError(0x63,'设备配网状态无效');
      onStatus(stage.status);
      if(stage.outcome==='failure')throw new ApiError(command,`配网未完成（${stage.status}）`);
      if(command===0xf0)return;
    }}finally{if(input)this.releaseProvision(sessionKey(input));}
  }
  private closeLegacy(session:LegacySession,error:Error=aborted()) {
    if(session.closed)return;session.closed=true;session.error=error;
    session.pending?.clear();session.pending?.reject(error);session.pending=undefined;
    session.messages=[];session.stream.clear();session.key.fill(0);
    void session.channel?.close().catch(()=>undefined);
  }
  private receivedLegacy(session:LegacySession,bytes:Uint8Array) {
    if(session.closed)return;
    try{for(const payload of session.stream.push(bytes)){
      let plain=new TextDecoder('utf-8',{fatal:true}).decode(payload).trim();
      if(!plain.startsWith('{'))plain=decrypt0922(payload,session.key);
      const message=JSON.parse(plain) as LegacyMessage;
      if(!message||typeof message.type!=='string'||!message.data||!Number.isInteger(message.data.error_code))throw new ApiError(0x63,'0922通知格式无效');
      if(session.pending){const job=session.pending;job.clear();session.pending=undefined;job.resolve(message);}
      else{if(session.messages.length>=32)throw new ApiError(0x63,'0922通知队列超出限制');session.messages.push(message);}
      payload.fill(0);
    }}catch(error){this.closeLegacy(session,error instanceof Error?error:new ApiError(0x63,'0922通知解析失败'));}
  }
  private async legacySession(input:ProvisionInput,signal?:AbortSignal) {
    if(signal?.aborted||this.disposed)throw aborted();
    const key=sessionKey(input),previous=this.legacySessions.get(key);
    if(previous&&!previous.closed){if(previous.mac!==input.mac||previous.model!==input.model)throw new ApiError(409,'当前蓝牙事务身份不一致');return previous;}
    const candidate=this.found.get(`${BLE_0922.service}:${input.mac}`);
    if(!candidate||candidate.model!==input.model)throw new ApiError(503,'0922蓝牙发现身份已失效，请重新扫描');
    const session:LegacySession={mac:input.mac,model:input.model,key:deriveKey(input.mac,input.model),stream:new PacketStream0922(),messages:[],closed:false,writeStarted:false};
    this.legacySessions.set(key,session);
    const cancel=()=>this.closeLegacy(session);signal?.addEventListener('abort',cancel,{once:true});
    try{
      await this.radio.ready();if(session.closed||signal?.aborted||this.disposed)throw session.error??aborted();
      session.channel=await this.radio.connect(candidate.handle,bytes=>this.receivedLegacy(session,bytes),error=>this.closeLegacy(session,error),signal,BLE_0922.service);
      if(session.closed||signal?.aborted||this.disposed){await session.channel.close();throw session.error??aborted();}
      if(!Number.isInteger(session.channel.mtu)||session.channel.mtu<23)throw new ApiError(503,'设备协商MTU无效');
      return session;
    }catch(error){this.closeLegacy(session);throw error;}
    finally{signal?.removeEventListener('abort',cancel);}
  }
  private waitLegacy(session:LegacySession,signal?:AbortSignal,timeout?:number):Promise<LegacyMessage> {
    if(session.closed||signal?.aborted)return Promise.reject(session.error??aborted());
    const existing=session.messages.shift();if(existing)return Promise.resolve(existing);
    if(session.pending)return Promise.reject(new ApiError(409,'已有0922应答等待'));
    return new Promise((resolve,reject)=>{
      const abort=()=>{if(session.pending?.resolve===resolve){clear();session.pending=undefined;reject(aborted());}};
      const timer=timeout===undefined?undefined:setTimeout(()=>{if(session.pending?.resolve===resolve){clear();session.pending=undefined;reject(new ApiError(408,'0922应答等待超时'));}},timeout);
      const clear=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
      session.pending={resolve,reject,clear};signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted)abort();
    });
  }
  private async exchangeLegacy(input:ProvisionInput,packets:Uint8Array[],signal?:AbortSignal,onWriteStart?:()=>void):Promise<Uint8Array[]> {
    if(this.writing)throw new ApiError(409,'已有蓝牙参数写入');
    let active=this.legacySessions.get(sessionKey(input));this.writing=true;
    try{return await withBudget(async budget=>{
      const payload=reassemble(packets);let type:string|undefined;
      try{
        let plain:string;
        if(payload[0]===0x7b)plain=new TextDecoder().decode(payload);
        else{const key=deriveKey(input.mac,input.model);try{plain=decrypt0922(payload,key);}finally{key.fill(0);}}
        type=(JSON.parse(plain) as {type?:string}).type;
      }catch{throw new ApiError(400,'0922请求格式无效');}
      const session=await this.legacySession(input,budget);active=session;
      const frames=packets0922(payload,session.channel!.mtu);
      try{for(const frame of frames){if(budget.aborted)throw aborted();if(!session.writeStarted){onWriteStart?.();session.writeStarted=true;}await session.channel!.write(frame,budget);}}
      finally{for(const frame of frames)frame.fill(0);payload.fill(0);}
      if(type!=='cipher')return [];
      for(;;){const message=await this.waitLegacy(session,budget,this.ackTimeout);
        if(message.type==='cipher_reply')return [new TextEncoder().encode(JSON.stringify(message))];
        if(message.data?.error_code!==0)throw new ApiError(0x70,'0922设备身份校验失败');
      }
    },this.ackTimeout+20000,'0922蓝牙写入超时',signal);}
    catch(error){const unsent=(active??this.legacySessions.get(sessionKey(input)))?.writeStarted!==true;this.releaseProvision(sessionKey(input));throw unsent?new ProvisionNotSentError(error):error;}
    finally{this.writing=false;}
  }
  private async provisionLegacy(input:ProvisionInput,onStatus?:(status:string)=>void,signal?:AbortSignal):Promise<void> {
    const session=this.legacySessions.get(sessionKey(input));if(!session||!onStatus)throw new ApiError(503,'尚未建立完整0922配网会话');
    try{for(;;){
      const message=await this.waitLegacy(session,signal),code=message.data?.error_code;
      if(code===undefined)throw new ApiError(0x63,'0922状态缺少错误码');
      if(message.type==='status_update'){onStatus('A1');continue;}
      if(message.type==='wifi_reply'){onStatus(code===0?'A0':'A2');if(code!==0)throw new ApiError(0xa2,`设备Wi-Fi连接失败（0922:${code}）`);continue;}
      if(message.type!=='cloud_reply')continue;
      const mapped:Record<number,string>={0:'C1',1:'B0',2:'B2',3:'B3',4:'B4',5:'C0',6:'C2',7:'C3',8:'D0',9:'D4',10:'D3',11:'E0',12:'E2'};
      onStatus(mapped[code]??`0922:${code}`);
      if([2,3,4,6,7,9,10,12].includes(code))throw new ApiError(code,`设备云端配网失败（0922:${code}）`);
      if(code===8)return;
    }}finally{this.releaseProvision(sessionKey(input));}
  }
  releaseProvision(bindCode:string){const session=this.sessions.get(bindCode);if(session){this.close(session);this.sessions.delete(bindCode);}const legacy=this.legacySessions.get(bindCode);if(legacy){this.closeLegacy(legacy);this.legacySessions.delete(bindCode);}}
  async dispose(){this.disposed=true;this.scanCancel?.();for(const session of this.sessions.values())this.close(session);for(const session of this.legacySessions.values())this.closeLegacy(session);this.sessions.clear();this.legacySessions.clear();this.found.clear();await this.radio.dispose();}
}

export const scanService0822=BLE_0822.service;

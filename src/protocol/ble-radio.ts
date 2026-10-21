import type { DiscoveredDevice } from './ble';
import { BLE_0822, classify0822, decode0822, expectedAck0822, FrameStream0822, key0822, parseAdvertisement0822 } from './ble-0822';
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
  startScan(listener:(error:Error|null,advertisement?:{handle:string;manufacturer:Uint8Array;rssi?:number})=>void):Promise<void>;
  stopScan():Promise<void>;
  connect(handle:string,onBytes:(bytes:Uint8Array)=>void,onDisconnect:(error:Error)=>void,signal?:AbortSignal):Promise<BleConnection>;
  dispose():Promise<void>;
}
const aborted=()=>new ApiError(499,'当前蓝牙客户端操作已停止');
interface Session {
  mac:string;model:string;key:Uint8Array;stream:FrameStream0822;frames:{command:number;raw:Uint8Array}[];
  channel?:BleConnection;closed:boolean;error?:Error;
  writeStarted:boolean;
  pending?:{command:number|'stage';resolve:(frame:Uint8Array)=>void;reject:(error:Error)=>void;clear:()=>void};
}

/** Native BLE capability; cloud binding and MQTT remain separate, explicitly unavailable boundaries. */
export class Ble0822DeviceTransport extends UnavailableDeviceTransport {
  readonly reportsProvisionWriteStart=true;
  private found=new Map<string,DiscoveredDevice>();
  private sessions=new Map<string,Session>();
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
          try{const device=parseAdvertisement0822(advertisement);if(!this.found.has(device.mac)){this.found.set(device.mac,device);onDiscovered?.({...device});}}
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
      const decoded=decode0822(raw,session.key),command=decoded.command;decoded.data.fill(0);
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
    const previous=this.sessions.get(input.bindCode);
    if(previous&&!previous.closed){
      if(previous.mac!==input.mac||previous.model!==input.model)throw new ApiError(409,'当前蓝牙事务身份不一致');
      return previous;
    }
    const candidate=this.found.get(input.mac);
    if(!candidate||candidate.model!==input.model)throw new ApiError(503,'蓝牙发现身份已失效，请重新扫描');
    const session:Session={mac:input.mac,model:input.model,key:key0822(input.mac,input.model),stream:new FrameStream0822(),frames:[],closed:false,writeStarted:false};
    this.sessions.set(input.bindCode,session);
    const cancel=()=>this.close(session);
    signal?.addEventListener('abort',cancel,{once:true});
    try{
      await this.radio.ready();if(session.closed||signal?.aborted||this.disposed)throw session.error??aborted();
      session.channel=await this.radio.connect(candidate.handle,bytes=>this.received(session,bytes),error=>this.close(session,error),signal);
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
      if(!this.matches(command,item.command)){item.raw.fill(0);return Promise.reject(new ApiError(item.command,'设备拒绝配网参数'));}
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
    if(this.writing)throw new ApiError(409,'已有蓝牙参数写入');
    if(packets.length!==1||packets[0][0]!==0xa5||packets[0][1]!==0x5a)throw new ApiError(400,'0822不接受旧版应用分片');
    let activeSession=this.sessions.get(input.bindCode);
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
    catch(error){const unsent=(activeSession??this.sessions.get(input.bindCode))?.writeStarted!==true;this.releaseProvision(input.bindCode);throw unsent?new ProvisionNotSentError(error):error;}
    finally{this.writing=false;}
  }
  async challenge(input:ProvisionInput,signal?:AbortSignal):Promise<Uint8Array[]> {
    const session=this.sessions.get(input.bindCode);if(!session||session.closed)throw new ApiError(409,'尚未建立0822校验会话');
    try{return [await this.wait(session,0x0f,signal)];}catch(error){this.releaseProvision(input.bindCode);throw error;}
  }
  async provision(input?:ProvisionInput,onStatus?:(status:string)=>void,signal?:AbortSignal):Promise<void>{
    const session=input&&this.sessions.get(input.bindCode);
    if(!session||!onStatus)throw new ApiError(503,'尚未建立完整0822配网会话');
    try{for(;;){
      const raw=await this.wait(session,'stage',signal);
      let command:number;
      try{const decoded=decode0822(raw,session.key);command=decoded.command;decoded.data.fill(0);}finally{raw.fill(0);}
      const stage=classify0822(command);
      if(stage.kind!=='stage')throw new ApiError(0x63,'设备配网状态无效');
      onStatus(stage.status);
      if(stage.outcome==='failure')throw new ApiError(command,`配网未完成（${stage.status}）`);
      if(command===0xf0)return;
    }}finally{if(input)this.releaseProvision(input.bindCode);}
  }
  releaseProvision(bindCode:string){const session=this.sessions.get(bindCode);if(session){this.close(session);this.sessions.delete(bindCode);}}
  async dispose(){this.disposed=true;this.scanCancel?.();for(const session of this.sessions.values())this.close(session);this.sessions.clear();this.found.clear();await this.radio.dispose();}
}

export const scanService0822=BLE_0822.service;

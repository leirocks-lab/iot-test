import { ApiError, type DeviceView, type ThingModel } from '../services/models';
import { ShadowSession, withBudget, type DeviceTransport } from './device';
import type { MqttConnection } from './mqtt-connection';
import type { PropertyControls } from '../services/device-controls';
import { ServiceRejectedError, type MaintenanceControls, type ServiceCall } from '../services/device-maintenance';

type Values = Record<string, number|string|boolean>;
export interface DeviceSession {
  readonly confirmed:Values;
  readonly ready:boolean;
  readonly sending:boolean;
  readonly connected?:boolean;
  readonly error?:string;
  readonly canWrite?:boolean;
  readonly controls?:PropertyControls;
  readonly controlError?:string;
  readonly maintenance?:MaintenanceControls;
  readonly maintenanceError?:string;
  readonly canInvokeService?:boolean;
  invokeService?(call:ServiceCall):Promise<void>;
  connect(signal?:AbortSignal):Promise<void>;
  command(properties:Record<string,unknown>):Promise<void>;
  onChange(listener:()=>void):()=>void;
  close():void;
}
export interface Publication {topic:string;payload:Uint8Array}
export type DeviceReport =
  | {kind:'full'|'delta';version:number;reported:Values;requestID?:string}
  | {kind:'rejected';requestID?:string}
  | {kind:'serviceResult';requestID:string;identifier:string;success:boolean}
  | {kind:'revoked';requestID?:string};
/** Supplied only after the deployment's identity, topics, payloads and permissions are confirmed. */
export interface DeviceSyncProfile {
  topics:readonly string[];
  query(requestID:string):Publication;
  /** Validate current-device identity, complete-vs-delta semantics and wire correlation before normalizing. */
  decode(topic:string,payload:Uint8Array):DeviceReport|undefined;
  canWrite:boolean;
  command?:(properties:Record<string,unknown>,requestID:string)=>Publication & {expected:Values};
  service?:(call:ServiceCall,requestID:string)=>Publication & {confirmation:{kind:'result'}|{kind:'reported';expected:Values}};
}
export type DeviceProfileResolver = (context:{deviceID:string;userID:string;device:DeviceView;model:ThingModel},signal:AbortSignal)=>Promise<DeviceSyncProfile>;
interface Lifecycle {
  current:()=>boolean;
  start:()=>void;
  stop:()=>void;
  credentials:(signal:AbortSignal)=>Promise<Record<string,string>>;
}
interface RealSessionOptions extends Lifecycle {
  deviceID:string;userID:string;
  connection:()=>Promise<MqttConnection>;
  context:(signal:AbortSignal)=>Promise<{device:DeviceView;model:ThingModel}>;
  profile?:DeviceProfileResolver;
  timeout?:number;
}
const cancelled=()=>new ApiError(499,'设备会话已停止');
const text=(error:unknown)=>error instanceof Error?error.message:'设备会话失败';
let sessionSequence=0;

/** One foreground conversation. Every attempt obtains new credentials; no SDK retry or command replay. */
export class RealtimeDeviceSession implements DeviceSession {
  confirmed:Values={};ready=false;connected=false;error='';
  private version=-1;
  private round=0;
  private sequence=0;
  private controller?:AbortController;
  private connection?:MqttConnection;
  private unsub?:()=>void;
  private profile?:DeviceSyncProfile;
  private writable=false;
  private flight?:Promise<void>;
  private listeners=new Set<()=>void>();
  private waiting?:{id:string;expected?:Values;service?:{identifier:string;result:boolean};resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  private timeout:number;
  private identity:string;
  constructor(private options:RealSessionOptions){this.timeout=options.timeout??10000;this.identity=`${options.userID}-${Date.now()}-${++sessionSequence}`;}
  get sending(){return !!(this.waiting?.expected||this.waiting?.service);}
  get canWrite(){return this.writable&&!!this.profile?.command;}
  get canInvokeService(){return this.writable&&!!this.profile?.service;}
  onChange(listener:()=>void){this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
  private notify(){for(const listener of this.listeners)listener();}
  private check(round:number,signal:AbortSignal){if(round!==this.round||signal.aborted||!this.options.current())throw cancelled();}
  private requestID(){return `${this.identity}-${++this.sequence}`;}
  private rejectWaiting(error:Error){const waiting=this.waiting;if(!waiting)return;this.waiting=undefined;clearTimeout(waiting.timer);waiting.reject(error);}
  private wait(id:string,expected?:Values,service?:{identifier:string;result:boolean}){
    return new Promise<void>((resolve,reject)=>{this.waiting={id,expected,service,resolve,reject,timer:setTimeout(()=>{
      this.waiting=undefined;
      if(!expected&&!service){this.ready=false;this.error='完整属性等待超时，仍未同步';}
      else this.error='未确认设备结果';
      this.notify();reject(new ApiError(408,this.error));
    },this.timeout)};});
  }
  connect(signal?:AbortSignal):Promise<void>{
    if(signal?.aborted||!this.options.current())return Promise.reject(cancelled());
    if(this.flight)return this.flight;
    this.close();this.options.start();
    const controller=new AbortController(),round=this.round;this.controller=controller;this.error='';this.notify();
    const abort=()=>this.close();signal?.addEventListener('abort',abort,{once:true});
    // Deferring also makes synchronous factories subject to the same single-flight guard.
    const flight=Promise.resolve().then(()=>this.open(round,controller.signal)).catch(error=>{
      if(round===this.round){this.close();this.error=text(error);this.notify();}
      throw error;
    }).finally(()=>{signal?.removeEventListener('abort',abort);if(this.flight===flight)this.flight=undefined;});
    this.flight=flight;return flight;
  }
  private async open(round:number,signal:AbortSignal){
    const credentials=await withBudget(budget=>this.options.credentials(budget),this.timeout,'设备连接凭据读取超时',signal);this.check(round,signal);
    const connection=await withBudget(async budget=>{
      const created=await this.options.connection();
      try{this.check(round,budget);}catch(error){created.close();throw error;}
      return created;
    },this.timeout,'MQTT连接创建超时',signal);
    try{this.check(round,signal);}catch(error){connection.close();throw error;}
    this.connection=connection;
    this.unsub=connection.onConnectionChange(connected=>{
      if(round!==this.round)return;
      this.connected=connected;
      if(!connected){this.close();this.error='设备通信中断，请重新同步';}
      this.notify();
    });
    await connection.connect(credentials,this.options.deviceID,signal);this.check(round,signal);
    if(!this.options.profile)throw new ApiError(503,'MQTT同步协议尚未配置，属性待同步');
    const context=await withBudget(budget=>this.options.context(budget),this.timeout,'设备同步资料读取超时',signal);this.check(round,signal);
    if(context.device.device.id!==this.options.deviceID)throw new ApiError(403,'设备同步身份不一致');
    const profile=await withBudget(budget=>this.options.profile!({...context,deviceID:this.options.deviceID,userID:this.options.userID},budget),this.timeout,'设备同步协议读取超时',signal);this.check(round,signal);
    if(!profile.topics.length||new Set(profile.topics).size!==profile.topics.length)throw new ApiError(503,'设备订阅协议不完整');
    this.profile=profile;this.writable=profile.canWrite===true&&context.device.bindingRole!=='obs';
    for(const topic of profile.topics){
      await connection.subscribe(topic,payload=>{
        if(round!==this.round||signal.aborted||!this.options.current())return;
        try{const report=profile.decode(topic,payload);if(report)this.receive(report);}
        catch{/* Malformed or foreign reports cannot confirm a device state. */}
      },signal);this.check(round,signal);
    }
    const id=this.requestID(),query=profile.query(id),received=this.wait(id);
    // Attach rejection before publishing: a socket close can reject the waiter during PUBACK.
    await Promise.all([connection.publish(query.topic,query.payload,signal),received]);
    this.check(round,signal);
  }
  private receive(report:DeviceReport){
    if(report.kind==='serviceResult'){
      const waiting=this.waiting;
      if(!waiting?.service?.result||report.requestID!==waiting.id||report.identifier!==waiting.service.identifier||typeof report.success!=='boolean')return;
      if(!report.success){this.rejectWaiting(new ServiceRejectedError());this.error='设备拒绝了维护重置';}
      else{clearTimeout(waiting.timer);this.waiting=undefined;waiting.resolve();this.error='';}
      this.notify();return;
    }
    if(report.kind==='revoked'){
      this.close();this.error='设备权限已失效';this.notify();return;
    }
    if(report.kind==='rejected'){
      if(this.waiting&&report.requestID===this.waiting.id){this.rejectWaiting(this.waiting.service?new ServiceRejectedError():new ApiError(403,'设备请求被拒绝'));this.ready=false;this.error='设备请求被拒绝';this.notify();}
      return;
    }
    if(report.kind!=='full'&&report.kind!=='delta')return;
    if(!Number.isSafeInteger(report.version)||report.version<0||!report.reported||typeof report.reported!=='object'||Array.isArray(report.reported)||
      Object.values(report.reported).some(value=>!['number','string','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value)))return;
    if(!this.ready){
      if(report.kind!=='full'||!this.waiting||this.waiting.expected||report.requestID!==this.waiting.id)return;
      this.confirmed={...report.reported};this.version=report.version;this.ready=true;
    } else {
      // A second/foreign GET response is not an incremental device report.
      if(report.kind==='full')return;
      if(report.version<=this.version)return;
      this.confirmed={...this.confirmed,...report.reported};this.version=report.version;
    }
    const waiting=this.waiting;
    if(waiting&&!waiting.service?.result&&report.requestID===waiting.id&&(!waiting.expected||Object.entries(waiting.expected).every(([key,value])=>report.reported[key]===value))){
      clearTimeout(waiting.timer);this.waiting=undefined;waiting.resolve();this.error='';
    }
    this.notify();
  }
  async command(properties:Record<string,unknown>){
    if(!this.options.current()){this.close();throw cancelled();}
    if(!this.ready||this.waiting||!this.connection||!this.profile?.command||!this.writable)throw new ApiError(409,'设备未同步、权限未确认或正在等待回报');
    const round=this.round,signal=this.controller!.signal,id=this.requestID(),publication=this.profile.command(properties,id);
    if(!Object.keys(publication.expected).length)throw new ApiError(503,'控制确认规则尚未配置');
    const received=this.wait(id,publication.expected);this.notify();
    try{await Promise.all([this.connection.publish(publication.topic,publication.payload,signal),received]);this.check(round,signal);}
    catch(error){if(round===this.round){this.rejectWaiting(error instanceof Error?error:new Error(text(error)));if(error instanceof ApiError&&[0,401,403,499].includes(error.code))this.close();this.error=text(error);this.notify();}throw error;}
  }
  async invokeService(call:ServiceCall){
    if(!this.options.current()){this.close();throw cancelled();}
    if(!this.ready||this.waiting||!this.connection||!this.profile?.service||!this.writable)throw new ApiError(409,'设备未同步、服务权限未确认或正在等待回报');
    const round=this.round,signal=this.controller!.signal,id=this.requestID(),publication=this.profile.service(call,id),confirmation=publication.confirmation;
    if(!confirmation||!['result','reported'].includes(confirmation.kind)||confirmation.kind==='reported'&&(!confirmation.expected||typeof confirmation.expected!=='object'||Array.isArray(confirmation.expected)||!Object.keys(confirmation.expected).length||Object.values(confirmation.expected).some(value=>!['number','boolean','string'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))))throw new ApiError(503,'维护服务确认规则尚未配置');
    const received=this.wait(id,confirmation.kind==='reported'?confirmation.expected:undefined,{identifier:call.identifier,result:confirmation.kind==='result'});this.notify();
    try{await Promise.all([this.connection.publish(publication.topic,publication.payload,signal),received]);this.check(round,signal);}
    catch(error){if(round===this.round){this.rejectWaiting(error instanceof Error?error:new Error(text(error)));if(error instanceof ApiError&&[0,401,403,499].includes(error.code))this.close();this.error=text(error);this.notify();}throw error;}
  }
  close(){
    ++this.round;const controller=this.controller;this.controller=undefined;controller?.abort();this.flight=undefined;
    this.ready=false;this.connected=false;this.profile=undefined;this.writable=false;
    this.unsub?.();this.unsub=undefined;const connection=this.connection;this.connection=undefined;connection?.close();
    this.rejectWaiting(cancelled());this.options.stop();this.notify();
  }
}

/** Mock keeps its transport contract but follows the same credential and ownership boundary. */
export class MockDeviceSession extends ShadowSession {
  get canWrite(){return this.ready;}
  get canInvokeService(){return this.ready;}
  private controller?:AbortController;
  private flight?:Promise<void>;
  constructor(transport:DeviceTransport,id:string,user:string,private lifecycle:Lifecycle){super(transport,id,user);}
  override connect(signal?:AbortSignal):Promise<void>{
    if(signal?.aborted||!this.lifecycle.current())return Promise.reject(cancelled());
    if(this.flight)return this.flight;
    this.close();this.lifecycle.start();const controller=new AbortController();this.controller=controller;
    const abort=()=>this.close();signal?.addEventListener('abort',abort,{once:true});
    const flight=Promise.resolve().then(async()=>{
      await withBudget(budget=>this.lifecycle.credentials(budget),10000,'设备连接凭据读取超时',controller.signal);
      if(controller.signal.aborted||!this.lifecycle.current())throw cancelled();
      await super.connect(controller.signal);
    }).catch(error=>{if(this.controller===controller)this.close();throw error;}).finally(()=>{
      signal?.removeEventListener('abort',abort);if(this.flight===flight)this.flight=undefined;
    });this.flight=flight;return flight;
  }
  override close(){const controller=this.controller;this.controller=undefined;controller?.abort();this.flight=undefined;super.close();this.lifecycle.stop();}
  override async command(properties:Record<string,unknown>){if(!this.lifecycle.current()){this.close();throw cancelled();}return super.command(properties);}
  async invokeService(call:ServiceCall){if(call.identifier!=='CleanReset'||Object.keys(call.params).length)throw new ApiError(400,'Mock维护服务或参数不支持');await this.command({Service:'CleanReset'});}
}

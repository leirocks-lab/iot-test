import { simulateMcu } from './mcu';
import { ApiError, type BindingResult, type Role } from '../services/models';
import { MockDatabase, products } from '../services/store';
import { validateProperties } from '../services/http';
import { decodeFrame, deriveKey, encodeFrame, fragment, handshakeDigest, parseAdvertisement, reassemble, utf8, type DiscoveredDevice } from './ble';
import type { DeviceEvent, PropertyObservation } from '../services/device-events';

export type DeviceFault='none'|'drop-fragment'|'out-of-order'|'wrong-ack'|'crc'|'disconnect'|'wifi-password'|'wifi-ssid'|'network'|'no-report'|'permission'|'credentials'|'cloud';
export interface ProvisionInput {userID:string;mac:string;model:string;ssid:string;password:string;token:string;bindCode:string;productID:string;modelID:string;seriesName?:string;urls?:Record<string,string>}
export interface ShadowMessage {version:number;clientToken?:string;state?:{desired?:Record<string,unknown>;reported?:Record<string,number|string|boolean>;[key:string]:unknown};code?:number}
export interface DeviceTransport {
  subscribeEvents?(deviceID:string,userID:string,listener:(event:DeviceEvent)=>void):()=>void;
  dispose?():void|Promise<void>;
  scan(signal?:AbortSignal):Promise<DiscoveredDevice[]>;
  exchange(input:ProvisionInput,packets:Uint8Array[],signal?:AbortSignal):Promise<Uint8Array[]>;
  challenge(input:ProvisionInput,signal?:AbortSignal):Promise<Uint8Array[]>;
  provision(input:ProvisionInput,onStatus:(status:string)=>void,signal?:AbortSignal):Promise<void>;
  binding(input:ProvisionInput):Promise<{deviceID:string;bindingRole:Role;userID:string}>;
  shadowGet(deviceID:string,userID:string):Promise<ShadowMessage>;
  subscribe(deviceID:string,userID:string,listener:(topic:string,message:ShadowMessage)=>void):()=>void;
  publish(deviceID:string,userID:string,message:ShadowMessage):Promise<void>;
  releaseProvision?(bindCode:string):void;
}
export const mockProfile = {version:'mock-v1',scanTimeout:30000,ackTimeout:5000,routerTimeout:60000,bindInterval:3000,bindAttempts:10,controlTimeout:10000,mtu:128};
export async function pause(ms:number,signal?:AbortSignal) {
  if(signal?.aborted)throw new ApiError(499,'操作已取消');
  await new Promise<void>((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new ApiError(499,'操作已取消'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    signal?.addEventListener('abort',abort,{once:true});
  });
}
// Timers are replaceable by test clocks; aborting a budget also stops adapter work.
export async function withBudget<T>(work:(signal:AbortSignal)=>Promise<T>,ms:number,message:string,signal?:AbortSignal):Promise<T> {
  if(signal?.aborted)throw new ApiError(499,'操作已取消');
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  let rejectCancelled:(error:Error)=>void=()=>undefined;
  const stopped=new Promise<never>((_,reject)=>{rejectCancelled=reject;});
  const abort=()=>{rejectCancelled(new ApiError(499,'操作已取消'));controller.abort();};
  signal?.addEventListener('abort',abort,{once:true});
  try { return await Promise.race([work(controller.signal),stopped,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new ApiError(408,message));controller.abort();},ms);})]); }
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
export class MockDeviceTransport implements DeviceTransport {
  fault:DeviceFault;
  private delay:number;
  private listeners=new Map<string,Set<{userID:string;fn:(topic:string,message:ShadowMessage)=>void}>>();
  private eventListeners=new Map<string,Set<{userID:string;fn:(event:DeviceEvent)=>void}>>();
  subscribeEvents(id:string,userID:string,listener:(event:DeviceEvent)=>void){this.db.device(id,userID);let set=this.eventListeners.get(id);if(!set){set=new Set();this.eventListeners.set(id,set);}const entry={userID,fn:listener};set.add(entry);return ()=>{set.delete(entry);};}
  /** Explicit simulation input, not a device clear-alarm command or production Topic. */
  emitEvent(id:string,event:DeviceEvent){for(const entry of this.eventListeners.get(id)??[]){try{this.db.device(id,entry.userID);}catch{this.eventListeners.get(id)?.delete(entry);continue;}entry.fn(JSON.parse(JSON.stringify(event)));}}
  executionTrace:{protocol:string;request:string|Uint8Array}[]=[];
  private exchanges=new Map<string,{step:number;validated:boolean;parameters:Record<number,string>;generation?:string}>();
  releaseProvision(bindCode:string){const exchange=this.exchanges.get(bindCode);if(exchange)for(const key of Object.keys(exchange.parameters))delete exchange.parameters[Number(key)];this.exchanges.delete(bindCode);}
  constructor(public db:MockDatabase,options:{delay?:number;fault?:DeviceFault}={}){this.delay=options.delay??180;this.fault=options.fault??'none';}
  async scan(signal?:AbortSignal):Promise<DiscoveredDevice[]> {
    await pause(this.delay,signal);if(this.fault==='disconnect')throw new ApiError(61,'蓝牙已关闭');
    if(this.fault==='permission')throw new ApiError(403,'蓝牙权限未授权');
    const adverts=[{handle:'mock-ble-wine',service:'0822',manufacturer:new Uint8Array([0,0,0x80,0xa0,0x36,0xd5,0x1a,0xac,7,...utf8('ADD6830')])},{handle:'mock-ble-humidity',service:'0922',manufacturer:new Uint8Array([0,0,0x80,0xa0,0x36,0xd5,0x1a,0xad,7,...utf8('RW-DH01')])}];
    // mock-v1 registry resolves firmware model identities; pages never infer product capability from a name.
    return [...new Map(adverts.map(a=>{const d=parseAdvertisement(a);return [d.mac,{...d,productID:products.find(p=>p.modelName===d.model)?.id}];})).values()];
  }
  async exchange(input:ProvisionInput,packets:Uint8Array[],signal?:AbortSignal) {
    await pause(this.delay,signal);if(this.fault==='disconnect')throw new ApiError(65,'蓝牙连接已断开');
    const key=deriveKey(input.mac,input.model),decoded=decodeFrame(reassemble(packets),key);
    let session=this.exchanges.get(input.bindCode);
    if(decoded.command===0){session={step:0,validated:false,parameters:{},generation:this.db.state.generation};this.exchanges.set(input.bindCode,session);
      const product=products.find(p=>p.id===input.productID);
      if(new TextDecoder().decode(decoded.data)!==handshakeDigest(`${input.mac},${product?.seriesName},${input.model}`))throw new ApiError(0x70,'设备身份校验失败');
    } else if(decoded.command===0x8f){if(!session||new TextDecoder().decode(decoded.data)!=='ok')throw new ApiError(0x7f,'厂商校验失败');session.validated=true;}
    else if(!session?.validated||decoded.command!==session.step+1)throw new ApiError(0x63,'参数或 ACK 顺序错误');
    else {session.step++;session.parameters[decoded.command]=new TextDecoder('utf-8',{fatal:true}).decode(decoded.data);}
    if(decoded.command===0x8f)return []; // write completion; firmware does not define an ACK to 0x8F
    const command=decoded.command===0?0x80:decoded.command===0x8f?0x8f:decoded.command+0x80;
    const data=new Uint8Array();
    const response=encodeFrame(this.fault==='wrong-ack'?0x99:command,data,key);
    if(this.fault==='crc')response[response.length-1]^=1;
    const chunks=fragment(response,mockProfile.mtu);
    if(this.fault==='drop-fragment')return [];if(this.fault==='out-of-order')return [new Uint8Array([0x11,...response])];
    return chunks;
  }
  async challenge(input:ProvisionInput,signal?:AbortSignal) {
    await pause(this.delay,signal);
    if(!this.exchanges.has(input.bindCode))throw new ApiError(0x7f,'设备尚未校验');
    return fragment(encodeFrame(0x0f,utf8(handshakeDigest(`${input.mac},ROWAN`)),deriveKey(input.mac,input.model)),mockProfile.mtu);
  }
  async provision(input:ProvisionInput,onStatus:(status:string)=>void,signal?:AbortSignal) {
    const transaction=this.exchanges.get(input.bindCode);
    if(transaction?.generation!==this.db.state.generation)throw new ApiError(499,'模拟数据已重置');
    if(transaction?.step!==10)throw new ApiError(0x63,'配网参数未完整确认');
    const params=transaction.parameters;
    if(params[1]!==input.ssid||params[2]!==input.password||params[3]!==input.token||params[4]!==input.bindCode||params[5]!==input.productID||params[6]!==input.modelID||[7,8,9,10].some(c=>!/^https:\/\//.test(params[c]??'')))throw new ApiError(0x63,'模组参数与事务不匹配');
    for(const stage of ['A','C','B','D','E','F']) {
      onStatus(stage+'1');await pause(this.delay*2,signal);
      if(stage==='A'&&this.fault==='wifi-password'){onStatus('A4');throw new ApiError(0xa4,'Wi-Fi 密码错误');}
      if(stage==='A'&&this.fault==='wifi-ssid'){onStatus('A3');throw new ApiError(0xa3,'找不到 Wi-Fi');}
      if(stage==='A'&&(!input.ssid||this.fault==='network')){onStatus('A2');throw new ApiError(0xa2,'网络连接超时');}
      if(stage==='C'&&this.fault==='cloud'){onStatus('C3');throw new ApiError(0xc3,'云端不可达');}
      onStatus(stage+'0');
    }
    await this.db.transact(()=>{
      if(transaction.generation!==this.db.state.generation)throw new ApiError(499,'模拟数据已重置');
      let d=this.db.state.devices.find(d=>d.mac===input.mac);
      if(!d){const id=this.db.id('dev');d={id,name:products.find(p=>p.id===input.productID)?.name??input.model,mac:input.mac,thingName:id,productID:input.productID,mcuVersion:'1.0.0',wifiVersion:'1.0.0',activatedAt:new Date().toISOString(),online:true,protocol:input.productID==='prd_humidity'?'55AA':'AT',properties:{Power:1,...(input.productID==='prd_wine'?{CurrentTemperature:14,TargetTemperature:12}:{CurrentHumidity:55,TargetHumidity:50}),Mode:'normal',Light:0,Brightness:50,ChildLock:0,Mute:false,CleanHours:10,Alarm:''},shadowVersion:1,members:{}};this.db.state.devices.push(d);}
      this.db.account(input.userID);
      if(Object.keys(d.members).length&&!d.members[input.userID])throw new ApiError(403,'设备已有绑定，请通过管理员分享加入');
      if(!d.members[input.userID])d.members[input.userID]={role:'sa',nickname:d.name,roomID:null};
      this.db.state.binds[input.bindCode]={userID:input.userID,deviceID:d.id,bindingRole:d.members[input.userID].role==='sa'?'sa':'mbr'};
    });
  }
  async binding(input:ProvisionInput) {const b=this.db.state.binds[input.bindCode];if(!b||b.userID!==input.userID)throw new ApiError(404,'绑定尚未确认');return b;}
  async shadowGet(id:string,userID:string) {
    if(this.fault==='credentials')throw new ApiError(401,'MQTT 凭据已失效');
    const d=this.db.device(id,userID);if(!d.online||this.fault==='network')throw new ApiError(0,'设备离线');
    return {version:d.shadowVersion,state:{desired:{...d.shadowDesired},reported:{...d.properties}}};
  }
  subscribe(id:string,userID:string,listener:(topic:string,message:ShadowMessage)=>void) {
    this.db.device(id,userID);let set=this.listeners.get(id);if(!set){set=new Set();this.listeners.set(id,set);}const entry={userID,fn:listener};set.add(entry);return ()=>{set.delete(entry);};
  }
  private emit(id:string,topic:string,message:ShadowMessage){const thing=this.db.state.devices.find(d=>d.id===id)?.thingName;if(!thing)return;const fullTopic=`$aws/things/${thing}/shadow/${topic}`;for(const entry of this.listeners.get(id)??[]){try{this.db.device(id,entry.userID);entry.fn(fullTopic,message);}catch{entry.fn(`$aws/things/${thing}/shadow/update/rejected`,{version:message.version,code:403});this.listeners.get(id)?.delete(entry);}}}
  syncCloud(){for(const d of this.db.state.devices)this.emit(d.id,'get/accepted',{version:d.shadowVersion,state:{reported:{...d.properties}}});}
  async publish(id:string,userID:string,message:ShadowMessage) {
    const generation=this.db.state.generation;
    const d=this.db.device(id,userID,true);
    if(this.fault==='permission')throw new ApiError(403,'没有控制权限');
    if(this.fault==='credentials')throw new ApiError(401,'MQTT 凭据已失效');
    if(!d.online||this.fault==='network')throw new ApiError(0,'设备离线');
    const desired=message.state?.desired??{}, {EnduserId:_,DeviceId:__,CommandType:___,...properties}=desired;
    const clean=properties.Service==='CleanReset';if(clean)delete properties.Service;
    validateProperties(d.productID,properties);
    if(d.properties.ChildLock===1&&Object.keys(properties).some(k=>k!=='ChildLock'))throw new ApiError(409,'请先解除童锁');
    const token=message.clientToken;if(!token)throw new ApiError(400,'缺少 clientToken');
    const dedup=id+':'+token;
    await this.db.transact(()=>{if(generation!==this.db.state.generation)throw new ApiError(499,'模拟数据已重置');this.db.device(id,userID,true).shadowDesired={...desired};});
    this.emit(id,'update/accepted',{version:d.shadowVersion,clientToken:token,state:{desired}});
    this.emit(id,'update/delta',{version:d.shadowVersion,clientToken:token,state:{...properties}});
    if(this.fault==='no-report')return;
    await pause(this.delay);
    await this.db.transact(()=>{
      if(generation!==this.db.state.generation)throw new ApiError(499,'模拟数据已重置');
      const current=this.db.device(id,userID,true); // re-read after transactional rollback or revocation
      const commands=this.db.state.processedCommands??(this.db.state.processedCommands={});const seen=commands[id]??[];
      if(!seen.includes(dedup)){const execution=simulateMcu(current.protocol,properties);this.executionTrace.push({protocol:current.protocol,request:execution.request});if(clean)current.properties.CleanHours=0;Object.assign(current.properties,execution.reported);current.shadowVersion++;commands[id]=[...seen,dedup].slice(-100);}
    });
    // MCU protocol-specific execution is modeled by this boundary; reported uses common cloud fields.
    const current=this.db.device(id,userID);
    this.emit(id,'update/accepted',{version:current.shadowVersion,clientToken:token,state:{reported:{...current.properties}}});
  }
}
export class Provisioner {
  constructor(private transport:DeviceTransport) {}
  async run(input:ProvisionInput,onStatus:(status:string)=>void,signal?:AbortSignal,confirmBinding?:(signal?:AbortSignal)=>Promise<BindingResult>) {
    try{return await this.execute(input,onStatus,signal,confirmBinding);}
    finally{this.transport.releaseProvision?.(input.bindCode);}
  }
  private async execute(input:ProvisionInput,onStatus:(status:string)=>void,signal?:AbortSignal,confirmBinding?:(signal?:AbortSignal)=>Promise<BindingResult>) {
    const key=deriveKey(input.mac,input.model);
    const send=async(command:number,value:string,expected?:number)=>{
      const packets=fragment(encodeFrame(command,utf8(value),key),mockProfile.mtu);
      const response=await withBudget(s=>this.transport.exchange(input,packets,s),mockProfile.ackTimeout,'ACK 等待超时',signal);
      if(expected===undefined)return;const reply=decodeFrame(reassemble(response),key);
      if(reply.command!==expected)throw new ApiError(0x63,'参数或 ACK 顺序错误');return reply;
    };
    onStatus('校验设备');const seriesName=input.seriesName??'RW Series'; // mock-v1 fallback for simulated test fixtures only
    await send(0,handshakeDigest(`${input.mac},${seriesName},${input.model}`),0x80);
    const identity=decodeFrame(reassemble(await withBudget(s=>this.transport.challenge(input,s),mockProfile.ackTimeout,'厂商挑战超时',signal)),key);
    if(identity.command!==0x0f||new TextDecoder().decode(identity.data)!==handshakeDigest(`${input.mac},ROWAN`))throw new ApiError(0x7f,'厂商挑战不匹配');
    await send(0x8f,'ok');
    const urls=input.urls??{certificationURL:'https://mock.rowan.invalid/device/certification',activationURL:'https://mock.rowan.invalid/device/activation',bindingURL:'https://mock.rowan.invalid/enduser/bindDevice/',otaURL:'https://mock.rowan.invalid/ota/updatecheck/'};
    const values=[input.ssid,input.password,input.token,input.bindCode,input.productID,input.modelID,urls.certificationURL,urls.activationURL,urls.bindingURL,urls.otaURL];
    for(let i=0;i<values.length;i++){onStatus(`参数 ${i+1}/10`);await send(i+1,values[i],0x81+i);}
    await withBudget(s=>this.transport.provision(input,onStatus,s),mockProfile.routerTimeout,'配网等待超时',signal);
    onStatus('确认绑定');
    // App flows confirm through PAIR-05; the legacy transport query remains for protocol-only callers.
    if(confirmBinding)return confirmBinding(signal);
    for(let attempt=0;attempt<mockProfile.bindAttempts;attempt++) {
      try{return await this.transport.binding(input);}catch(error){if(!(error instanceof ApiError)||error.code!==404||attempt===9)throw error;await pause(mockProfile.bindInterval,signal);}
    }
    throw new ApiError(0,'未确认绑定结果');
  }
}
let shadowSessionSequence=0;
function validReported(value:Record<string,unknown>){return typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(item=>['number','boolean','string'].includes(typeof item)&&(typeof item!=='number'||Number.isFinite(item)));}
export class ShadowSession {
  confirmed:Record<string,number|string|boolean>={};
  version=-1; ready=false;
  private unsubscribe?:()=>void;
  private pending?:{token:string;expected:Record<string,unknown>;resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  private listeners=new Set<()=>void>();
  private propertyListeners=new Set<(observation:PropertyObservation)=>void>();
  private sequence=0;
  private identity=++shadowSessionSequence;
  private connectRound=0;
  private connectController?:AbortController;
  constructor(private transport:DeviceTransport,private deviceID:string,private userID:string,private timeout:number=mockProfile.controlTimeout) {}
  onChange(fn:()=>void){this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};}
  onProperties(listener:(observation:PropertyObservation)=>void){this.propertyListeners.add(listener);return ()=>{this.propertyListeners.delete(listener);};}
  private notify(){for(const fn of this.listeners)fn();}
  get sending(){return !!this.pending;}
  async connect(signal?:AbortSignal){
    if(signal?.aborted)throw new ApiError(499,'设备会话已停止');
    this.resetSession();const round=this.connectRound;
    const controller=new AbortController();this.connectController=controller;
    const abort=()=>this.close();signal?.addEventListener('abort',abort,{once:true});
    const current=()=>round===this.connectRound&&!controller.signal.aborted&&!signal?.aborted;
    this.unsubscribe=this.transport.subscribe(this.deviceID,this.userID,(topic,msg)=>{if(!current())return;if(topic.endsWith('/update/rejected')){this.ready=false;if(this.pending){const p=this.pending;clearTimeout(p.timer);this.pending=undefined;p.reject(new ApiError(msg.code??403,'设备权限已失效'));}this.notify();}else if(this.ready&&(topic.endsWith('/update/accepted')||topic.endsWith('/get/accepted')))this.receive(msg);});
    try{
      const msg=await withBudget(()=>this.transport.shadowGet(this.deviceID,this.userID),this.timeout,'完整属性等待超时',controller.signal);
      if(!current())throw new ApiError(499,'设备会话已停止');
      if(!msg.state?.reported||!Number.isSafeInteger(msg.version)||msg.version<0||!validReported(msg.state.reported))throw new ApiError(503,'完整属性尚未确认');
      this.confirmed={...msg.state.reported};this.version=msg.version;this.ready=true;for(const listener of this.propertyListeners)listener({reported:{...msg.state.reported},full:true});this.notify();
    }catch(error){if(current())this.close();throw error;}
    finally{signal?.removeEventListener('abort',abort);}
  }
  receive(message:ShadowMessage){
    if(!message.state?.reported||!Number.isSafeInteger(message.version)||message.version<0||message.version<this.version||!validReported(message.state.reported))return;
    const fresh=message.version>this.version;
    this.version=message.version;this.confirmed={...this.confirmed,...message.state.reported};
    if(fresh)for(const listener of this.propertyListeners)listener({reported:{...message.state.reported},full:false});
    if(this.pending&&message.clientToken===this.pending.token&&!message.state.desired&&Object.entries(this.pending.expected).every(([key,value])=>message.state!.reported![key]===value)){const p=this.pending;clearTimeout(p.timer);this.pending=undefined;p.resolve();}
    this.notify();
  }
  async command(properties:Record<string,unknown>){
    if(!this.ready||this.pending)throw new ApiError(409,'设备未同步或正在等待回报');
    const token=`${this.userID}-${Date.now()}-${this.identity}-${++this.sequence}`;
    const result=new Promise<void>((resolve,reject)=>{this.pending={token,expected:properties.Service==='CleanReset'?{CleanHours:0}:properties,resolve,reject,timer:setTimeout(()=>{this.pending=undefined;this.notify();reject(new ApiError(0,'未确认设备结果'));},this.timeout)};});
    this.notify();
    void this.transport.publish(this.deviceID,this.userID,{version:this.version,clientToken:token,state:{desired:{EnduserId:this.userID,DeviceId:this.deviceID,CommandType:'app',...properties}}}).catch(error=>{
      if(this.pending?.token===token){const pending=this.pending;clearTimeout(pending.timer);this.pending=undefined;if(error instanceof ApiError&&[401,403,499,0].includes(error.code))this.ready=false;this.notify();pending.reject(error);}
    });
    await result;
  }

  private resetSession(){++this.connectRound;const controller=this.connectController;this.connectController=undefined;controller?.abort();this.ready=false;this.unsubscribe?.();this.unsubscribe=undefined;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new ApiError(499,'控制监听已关闭'));this.pending=undefined;}this.notify();}
  close(){this.resetSession();}
}
export class UnavailableDeviceTransport implements DeviceTransport {
  private unavailable():never{throw new ApiError(503,'真实设备驱动尚未接入');}
  async scan():Promise<DiscoveredDevice[]>{return this.unavailable();}
  async exchange(_input:ProvisionInput,_packets:Uint8Array[],_signal?:AbortSignal):Promise<Uint8Array[]>{return this.unavailable();}
  async challenge(_input:ProvisionInput,_signal?:AbortSignal):Promise<Uint8Array[]>{return this.unavailable();}
  async provision():Promise<void>{return this.unavailable();}
  async binding():Promise<{deviceID:string;bindingRole:Role;userID:string}>{return this.unavailable();}
  async shadowGet():Promise<ShadowMessage>{return this.unavailable();}
  subscribe():()=>void{return this.unavailable();}
  async publish():Promise<void>{return this.unavailable();}
}

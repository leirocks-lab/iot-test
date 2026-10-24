import { ApiError, type Role } from '../services/models';
import type { DiscoveredDevice } from './ble';
import type { DeviceEvent } from '../services/device-events';

export interface ProvisionInput {userID:string;mac:string;model:string;service?:string;ssid:string;password:string;token:string;bindCode:string;productID:string;modelID:string;seriesName?:string;urls?:Record<string,string>}
export interface ShadowMessage {version:number;clientToken?:string;state?:{desired?:Record<string,unknown>;reported?:Record<string,number|string|boolean>;[key:string]:unknown};code?:number}
/** Certified local failure before any write in this provisioning transaction. Never infer from a status code. */
export class ProvisionNotSentError extends ApiError {constructor(error:unknown){super(error instanceof ApiError?error.code:503,error instanceof Error?error.message:'配网尚未发送');}}
export interface DeviceTransport {
  readonly reportsProvisionWriteStart?:boolean;
  subscribeEvents?(deviceID:string,userID:string,listener:(event:DeviceEvent)=>void):()=>void;
  dispose?():void|Promise<void>;
  /** Keep discovering for durationMs even after the first result; report results as they arrive. */
  scan(signal?:AbortSignal,onDiscovered?:(device:DiscoveredDevice)=>void,durationMs?:number):Promise<DiscoveredDevice[]>;
  exchange(input:ProvisionInput,packets:Uint8Array[],signal?:AbortSignal,onWriteStart?:()=>void):Promise<Uint8Array[]>;
  challenge(input:ProvisionInput,signal?:AbortSignal):Promise<Uint8Array[]>;
  provision(input:ProvisionInput,onStatus:(status:string)=>void,signal?:AbortSignal):Promise<void>;
  binding(input:ProvisionInput):Promise<{deviceID:string;bindingRole:Role;userID:string}>;
  shadowGet(deviceID:string,userID:string):Promise<ShadowMessage>;
  subscribe(deviceID:string,userID:string,listener:(topic:string,message:ShadowMessage)=>void):()=>void;
  publish(deviceID:string,userID:string,message:ShadowMessage):Promise<void>;
  releaseProvision?(bindCode:string):void;
}
export const deviceTimeouts = { scanTimeout:30000, bindInterval:3000, bindingTimeout:30000 };
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
export class UnavailableDeviceTransport implements DeviceTransport {
  private unavailable():never{throw new ApiError(503,'当前平台不支持原生蓝牙，请使用 Android/iOS Development Build');}
  async scan():Promise<DiscoveredDevice[]>{return this.unavailable();}
  async exchange(_input:ProvisionInput,_packets:Uint8Array[],_signal?:AbortSignal):Promise<Uint8Array[]>{return this.unavailable();}
  async challenge(_input:ProvisionInput,_signal?:AbortSignal):Promise<Uint8Array[]>{return this.unavailable();}
  async provision():Promise<void>{return this.unavailable();}
  async binding():Promise<{deviceID:string;bindingRole:Role;userID:string}>{return this.unavailable();}
  async shadowGet():Promise<ShadowMessage>{return this.unavailable();}
  subscribe():()=>void{return this.unavailable();}
  async publish():Promise<void>{return this.unavailable();}
}

import { ApiError, type DeviceView, type Role, type ThingModel } from './models';
import type { PropertyValue } from './device-controls';

export interface ServiceCall {identifier:string;params:Record<string,unknown>}
export class ServiceRejectedError extends ApiError {constructor(){super(409,'设备拒绝了维护重置');}}
export interface MaintenanceProfile {
  attribute:string;
  reset?:{identifier:string;params:Record<string,unknown>;roles:readonly Role[];conditions:readonly {identifier:string;equals:PropertyValue}[]};
}
export type MaintenanceProfileResolver=(context:{device:DeviceView;model:ThingModel},signal:AbortSignal)=>Promise<MaintenanceProfile|null>;
export interface MaintenanceLedger {phase:'idle'|'confirming'|'sending'|'confirmed'|'failed'|'unknown';serial:number;message:string}
export const maintenanceLedger=():MaintenanceLedger=>({phase:'idle',serial:0,message:''});
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function paramsCopy(value:Record<string,unknown>){return JSON.parse(JSON.stringify(value,(_key,item)=>{
  if(item===undefined||['function','symbol','bigint'].includes(typeof item)||typeof item==='number'&&!Number.isFinite(item))throw new ApiError(503,'维护服务参数不是已确认JSON值');return item;
})) as Record<string,unknown>;}
interface State {ready:boolean;sending:boolean;canInvokeService?:boolean;confirmed:Record<string,PropertyValue>}
export interface ResetConfirmation {title:string;body:string;confirm:()=>Promise<void>;cancel:()=>void}
/** Product semantics are explicit; neither UI labels nor service names supply wire defaults. */
export class MaintenanceControls {
  private profile:MaintenanceProfile;
  private unit?:string;
  constructor(model:ThingModel,profile:MaintenanceProfile,private device:DeviceView,private state:()=>State,
    private invoke:(call:ServiceCall)=>Promise<void>,readonly ledger:MaintenanceLedger,private changed:()=>void=()=>undefined){
    this.profile=copy(profile);
    const attributes=model.attributes.filter(item=>item.identifier===profile.attribute);
    if(!model.version||!profile.attribute||attributes.length!==1||attributes[0].type!=='number'||attributes[0].unit!==undefined&&typeof attributes[0].unit!=='string')throw new ApiError(503,'维护计时属性或模型版本尚未确认');
    this.unit=attributes[0].unit;
    if(profile.reset&&(!profile.reset.identifier||model.services.filter(item=>item.identifier===profile.reset!.identifier).length!==1||!profile.reset.params||Array.isArray(profile.reset.params)||typeof profile.reset.params!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(profile.reset.params))))throw new ApiError(503,'维护重置服务或参数尚未确认');
    if(profile.reset){this.profile.reset!.params=paramsCopy(profile.reset.params);
      if(!Array.isArray(profile.reset.roles)||profile.reset.roles.some(role=>!['sa','mbr','obs'].includes(role))||!Array.isArray(profile.reset.conditions)||profile.reset.conditions.some(item=>!item||model.attributes.filter(attribute=>attribute.identifier===item.identifier).length!==1||!['number','string','boolean'].includes(typeof item.equals)||typeof item.equals==='number'&&!Number.isFinite(item.equals)))throw new ApiError(503,'维护重置权限或操作条件尚未确认');
    }
  }
  get value(){const value=this.state().confirmed[this.profile.attribute];return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:undefined;}
  get text(){return this.value===undefined?'未知 · 计时待同步':`${this.value} ${this.unit?.trim()||'单位待确认'}`;}
  get identifier(){return this.profile.attribute;}
  private eligibility(){
    const state=this.state(),reset=this.profile.reset;
    if(!reset)return '当前产品未提供维护重置能力';
    if(!reset.roles?.includes(this.device.bindingRole)||this.device.bindingRole==='obs'||state.canInvokeService!==true)return '当前账号没有维护重置权限或服务协议未配置';
    if(!state.ready)return '维护状态尚未同步';
    if(this.value===undefined)return '维护计时未知，请先同步';
    if(!this.unit?.trim())return '维护计时单位尚未确认';
    if(!Array.isArray(reset.conditions))return '维护重置操作条件尚未确认';
    if(reset.conditions.some(item=>state.confirmed[item.identifier]!==item.equals))return '当前设备状态不满足维护重置条件';
    if(state.sending)return '正在等待设备结果';
    return '';
  }
  get reason(){return this.ledger.phase==='unknown'?'上次重置结果未确认，请先同步维护状态':this.ledger.phase==='sending'?'正在等待维护重置结果':this.ledger.phase==='confirming'?'请完成或取消当前确认':this.eligibility();}
  requestReset():ResetConfirmation {
    const reason=this.reason;if(reason)throw new ApiError(409,reason);
    const serial=++this.ledger.serial;this.ledger.phase='confirming';this.ledger.message='';this.changed();
    const current=()=>this.ledger.serial===serial&&this.ledger.phase==='confirming';
    return {title:'确认重置维护计时',body:`将重置“${this.device.deviceNickname}”的维护计时（当前确认 ${this.text}）。计时以设备回报为准。`,
      cancel:()=>{if(current()){this.ledger.phase='idle';++this.ledger.serial;this.changed();}},
      confirm:async()=>{
        if(!current())throw new ApiError(409,'维护重置确认已失效');
        const reason=this.eligibility();if(reason){this.ledger.phase='idle';++this.ledger.serial;this.changed();throw new ApiError(409,reason);}
        this.ledger.phase='sending';this.ledger.message='等待设备确认，保留最近确认计时';this.changed();
        try{
          await this.invoke({identifier:this.profile.reset!.identifier,params:copy(this.profile.reset!.params)});
          if(this.ledger.serial!==serial)throw new ApiError(499,'维护重置上下文已停止');
          this.ledger.phase='confirmed';this.ledger.message='设备已确认服务结果，计时以设备回报为准';
        }catch(error){
          if(this.ledger.serial===serial){this.ledger.phase=error instanceof ServiceRejectedError?'failed':'unknown';this.ledger.message=error instanceof Error?error.message:'维护重置结果未确认';}
          throw error;
        }finally{this.changed();}
      },
    };
  }
  /** Called only after a new complete snapshot; a spontaneous delta never unlocks an unknown reset. */
  synchronized(){if(this.ledger.phase==='unknown'&&this.state().ready&&this.value!==undefined&&this.unit?.trim()){
    ++this.ledger.serial;this.ledger.phase='idle';this.ledger.message='维护计时已重新同步；未推断上次重置结果，需重新确认才能再次重置';this.changed();
  }}
  stop(){if(this.ledger.phase==='sending'){this.ledger.phase='unknown';this.ledger.message='维护重置已中断，结果未确认，请先同步';}
    else if(this.ledger.phase==='confirming')this.ledger.phase='idle';++this.ledger.serial;this.changed();}
}

/** Only selected when both HTTP and device modes are mock. */
export const mockMaintenanceProfile:MaintenanceProfileResolver=async({device})=>{
  if(!['prd_wine','prd_humidity'].includes(device.product?.id??''))return null;
  return {attribute:'CleanHours',reset:{identifier:'CleanReset',params:{},roles:['sa','mbr'],conditions:[]}};
};

import { mockProfile, withBudget } from '../protocol/device';
import { ApiError, type BindingResult } from './models';
import { parseRowanCandidates, type CodeIdentity, type RowanCodeParser } from './qr';
import type { RowanService } from './rowan';

export interface ScanState {
  phase: 'idle'|'choosing'|'confirming'|'unknown'|'done';
  choices: {type:'product'|'share';label:string}[];
  selected?:number;
  error:string;
}

export class QrScanCoordinator {
  private current?:QrScanFlow;
  private owner?:string;
  private revision?:number;
  constructor(private service:RowanService,private codecMode:'mock'|'real',private realParser?:RowanCodeParser){}
  acquire(){const owner=this.service.userID;if(!this.current||this.owner!==owner||this.revision!==this.service.sessionRevision||this.current.state.phase==='done'){this.current?.stop();this.owner=owner;this.revision=this.service.sessionRevision;this.current=new QrScanFlow(this.service,this.codecMode,this.realParser);}return this.current;}
  clear(){this.current?.stop();this.current=undefined;this.owner=undefined;}
}
export type ScanDestination={productID:string}|{binding:BindingResult};
export class QrScanFlow {
  state:ScanState={phase:'idle',choices:[],error:''};
  private codes:CodeIdentity[]=[];
  private listeners=new Set<()=>void>();
  private controller?:AbortController;
  private round=0;
  private submitted=false;
  private owner?:string;
  private revision:number;
  constructor(private service:RowanService,private codecMode:'mock'|'real',private realParser?:RowanCodeParser){this.revision=service.sessionRevision;}
  snapshot=()=>this.state;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private update(patch:Partial<ScanState>){this.state={...this.state,...patch};for(const listener of this.listeners)listener();}
  read(values:readonly string[]) {
    if(this.state.phase!=='idle')return;
    try {
      if(this.codecMode==='real'&&!this.realParser)throw new ApiError(503,'正式二维码协议尚未冻结，不能使用模拟格式绑定');
      this.codes=parseRowanCandidates(values,this.codecMode==='real'?this.realParser:undefined);
      this.update({phase:'choosing',choices:this.codes.map(code=>({type:code.type,label:code.type==='product'?code.productID:code.deviceID})),selected:this.codes.length===1?0:undefined,error:''});
    }catch(error){this.update({error:(error as Error).message});}
  }
  choose(index:number){if(this.state.phase!=='choosing'||!this.codes[index])return;this.update({selected:index,error:''});}
  reset(){if(this.state.phase==='unknown')throw new ApiError(409,'请先核对本次扫码绑定结果');this.stop();this.codes=[];this.submitted=false;this.update({phase:'idle',choices:[],selected:undefined,error:''});}
  stop(){++this.round;this.controller?.abort();this.controller=undefined;if(this.state.phase==='confirming')this.update({phase:this.submitted?'unknown':'choosing'});}
  private check(round:number,signal:AbortSignal){if(round!==this.round||signal.aborted||this.service.session?.userID!==this.owner||this.service.sessionRevision!==this.revision)throw new ApiError(499,'扫码操作已停止');}
  private binding(result:BindingResult,deviceID:string){if(result.deviceID!==deviceID||result.userID!==this.owner||!['sa','mbr','obs'].includes(result.bindingRole))throw new ApiError(0,'绑定结果不一致，请核对设备');}
  async confirm():Promise<ScanDestination> {
    if(this.state.phase!=='choosing'||this.state.selected===undefined)throw new ApiError(409,'请先选择一个二维码，勿重复确认');
    if(this.service.sessionRevision!==this.revision)throw new ApiError(499,'登录上下文已变更，请重新扫码');
    const code=this.codes[this.state.selected],round=++this.round,controller=new AbortController();this.controller=controller;this.owner=this.service.userID;this.submitted=false;
    this.update({phase:'confirming',error:''});
    try {
      const destination=await withBudget(async signal=>{
        if(code.type==='product'){await this.service.product(code.productID,signal);this.check(round,signal);return {productID:code.productID};}
        this.submitted=true;
        const binding=await this.service.acceptShare(code.deviceID,code.bindCode,signal);this.check(round,signal);this.binding(binding,code.deviceID);return {binding};
      },mockProfile.scanTimeout,'扫码结果等待超时，请核对绑定结果',controller.signal);
      this.check(round,controller.signal);this.update({phase:'done'});return destination;
    }catch(error){
      if(round===this.round){const definite=error instanceof ApiError&&[400,401,403,404,1131,1132,1133].includes(error.code);this.update({phase:this.submitted&&!definite?'unknown':'choosing',error:(error as Error).message});}
      throw error;
    }finally{if(round===this.round)this.controller=undefined;}
  }
  async reconcile():Promise<ScanDestination> {
    if(this.state.phase!=='unknown'||this.state.selected===undefined)throw new ApiError(409,'没有待核对的扫码事务');
    const code=this.codes[this.state.selected];if(code.type!=='share')throw new ApiError(409,'当前不是扫码绑定');
    // Retain the original account. A different account cannot claim this uncertain transaction.
    if(this.service.userID!==this.owner||this.service.sessionRevision!==this.revision)throw new ApiError(499,'账号上下文已变更，请返回首页核对');
    const round=++this.round,controller=new AbortController();this.controller=controller;this.update({phase:'confirming',error:''});
    try {
      const view=await withBudget(signal=>this.service.device(code.deviceID,signal),mockProfile.scanTimeout,'设备结果核对超时',controller.signal);
      this.check(round,controller.signal);const binding={deviceID:view.device.id,userID:this.owner!,bindingRole:view.bindingRole};this.binding(binding,code.deviceID);
      this.update({phase:'done'});return {binding};
    }catch(error){if(round===this.round)this.update({phase:'unknown',error:(error as Error).message});throw error;}
    finally{if(round===this.round)this.controller=undefined;}
  }
}

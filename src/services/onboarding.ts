import type { DiscoveredDevice } from '../protocol/ble';
import { mockProfile, pause, Provisioner, ShadowSession, withBudget, type DeviceTransport } from '../protocol/device';
import { ApiError, type BindingResult, type Product } from './models';
import type { RowanService } from './rowan';
import { Provisioner0822, type Profile0822 } from '../protocol/provision-0822';
import { requireCurrentWifi, type WifiReader } from './wifi';

export interface RealAddContract {
  profile:Profile0822;
  makeBindCode:(signal:AbortSignal)=>Promise<string>;
  validatePassword:(password:string)=>void;
  deviceToken:(accessToken:string)=>string;
  bindingTimeout:number;
  operationTimeout:number;
}

export type AddStage = 'idle' | 'scanning' | 'selecting' | 'selected' | 'provisioning' | 'binding' | 'unknown' | 'failed' | 'bound' | 'finishing' | 'complete';
export interface AddState {
  stage: AddStage;
  message: string;
  error: string;
  discovered: DiscoveredDevice[];
  product?: Product;
  candidate?: DiscoveredDevice;
  binding?: BindingResult;
  nickname: 'pending' | 'saved' | 'skipped';
  nicknameUnknown:boolean;
  visible: boolean;
  realtime: 'pending' | 'ready' | 'failed';
  realtimeError: string;
  busy: boolean;
  deviceStep?: string;
}
export interface AddOptions {
  mode: 'mock' | 'real';
  scanTimeout?: number;
  bindingTimeout?: number;
  pollInterval?: number;
  operationTimeout?: number;
  makeBindCode?: () => string;
  real?:RealAddContract;
  wifi?:WifiReader;
}
const initial = (): AddState => ({stage:'idle',message:'',error:'',discovered:[],nickname:'pending',nicknameUnknown:false,visible:false,realtime:'pending',realtimeError:'',busy:false});
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
const cancelled = () => new ApiError(499,'当前添加操作已停止');
const stageLabels: Record<string,string> = {A:'连接家庭 Wi-Fi',C:'认证设备',B:'激活设备',D:'绑定账号',E:'获取设备证书',F:'连接设备服务器'};
export function describeProvisionStatus(status: string) {
  const match = /^([ACBDEF])([0-9A-F])$/.exec(status);
  return match ? `${stageLabels[match[1]]} · ${match[2]==='0'?'已完成':match[2]==='1'?'进行中':`异常（${status}）`}` : status;
}
export function validateWifi(ssid: string, password: string, mode: 'mock'|'real',validator?:(password:string)=>void) {
  if(!ssid || new TextEncoder().encode(ssid).length>32)throw new ApiError(400,'Wi-Fi 名称不能为空或超过32字节');
  if(mode==='mock') {
    if(!password || new TextEncoder().encode(password).length>254)throw new ApiError(400,'请输入模拟 Wi-Fi 密码（不超过254字节）');
  } else {
    // Security type / open-network policy is not frozen: do not assume WPA, WEP or an empty password.
    if(!validator)throw new ApiError(503,'真实 Wi-Fi 密码规则尚未配置');
    if(new TextEncoder().encode(password).length>254)throw new ApiError(400,'Wi-Fi 密码超出当前0822协议范围');
    validator(password);
  }
}
export function matchesDiscoveredProduct(candidate:DiscoveredDevice,product:Product){return candidate.productID?candidate.productID===product.id:candidate.model===product.modelName;}

/** One foreground add context. Snapshots never contain passwords, access tokens or bind codes. */
export class AddDeviceFlow {
  state: AddState = initial();
  private listeners = new Set<() => void>();
  private round = 0;
  private controller?: AbortController;
  private bindCode?: string;
  private owner?: string;
  private revision?:number;
  private submitted=false;
  private pendingNickname?:string;
  private serial = 0;
  private session?: ShadowSession;
  constructor(private service: RowanService, private devices: DeviceTransport, private options: AddOptions) {
    if((options.pollInterval??mockProfile.bindInterval)<2000)throw new Error('绑定查询间隔不能低于2秒');
  }
  subscribe = (listener: () => void) => {this.listeners.add(listener);return () => {this.listeners.delete(listener);};};
  snapshot = () => this.state;
  private update(patch: Partial<AddState>) {this.state={...this.state,...patch};for(const listener of this.listeners)listener();}
  private check(round: number, signal: AbortSignal) {
    if(round!==this.round || signal.aborted || this.service.session?.userID!==this.owner || this.service.sessionRevision!==this.revision)throw cancelled();
  }
  private async operate<T>(work: (round: number, signal: AbortSignal) => Promise<T>): Promise<T> {
    if(this.state.busy)throw new ApiError(409,'已有添加操作进行中');
    const userID=this.service.userID;
    if(this.owner && (this.owner!==userID||this.revision!==this.service.sessionRevision)){this.stop();this.bindCode=undefined;this.pendingNickname=undefined;this.state=initial();this.update({error:'账号上下文已变更，请重新添加'});throw cancelled();}
    this.owner=userID;this.revision=this.service.sessionRevision;
    const round=++this.round,controller=new AbortController();this.controller=controller;
    this.update({busy:true,error:''});
    try{return await work(round,controller.signal);}
    catch(error){if(round===this.round)this.update({error:errorText(error)});throw error;}
    finally{if(round===this.round){this.controller=undefined;this.update({busy:false});}}
  }
  stop() {
    const uncertain=['binding','unknown'].includes(this.state.stage)||this.state.stage==='provisioning'&&this.submitted;
    ++this.round;this.controller?.abort();this.controller=undefined;this.session?.close();this.session=undefined;
    this.update({busy:false,...(uncertain?{stage:'unknown' as const,message:'客户端已停止，请核对绑定结果；设备端结果仍待确认'}:this.state.stage==='provisioning'?{stage:'selected' as const,message:'客户端已停止，本次尚未发送配网参数'}:['scanning','selecting'].includes(this.state.stage)?{stage:'idle' as const,message:'本次客户端扫描已停止'}:this.state.stage==='finishing'?{stage:'bound' as const,message:'已停止结果刷新，绑定事实保留'}:{}),...(this.state.realtime==='ready'?{realtime:'pending' as const}:{})});
  }
  reset() {
    if(this.state.busy || this.state.stage==='unknown' || this.state.binding)throw new ApiError(409,'请先核对或完成当前设备的添加结果');
    this.stop();this.bindCode=undefined;this.pendingNickname=undefined;this.owner=undefined;this.revision=undefined;this.state=initial();this.update({});
  }
  async scan() {
    if(this.state.stage==='unknown' || this.state.binding)throw new ApiError(409,'请先完成当前绑定结果');
    return this.operate(async(round,signal)=>{
      this.update({stage:'scanning',message:'正在扫描蓝牙设备',discovered:[],candidate:undefined});
      try {
        const found=await withBudget(s=>this.devices.scan(s),this.options.scanTimeout??mockProfile.scanTimeout,'蓝牙扫描超时',signal);
        this.check(round,signal);
        const unique=new Map<string,DiscoveredDevice>();
        for(const device of found)if(device.mac && !unique.has(device.mac.toLowerCase()))unique.set(device.mac.toLowerCase(),device);
        this.update({stage:'idle',discovered:[...unique.values()],message:unique.size?'扫描已结束，请选择设备':'未发现设备，可重试或选择已有产品'});
      } catch(error) {this.check(round,signal);this.update({stage:'failed',message:'扫描未完成'});throw error;}
    });
  }
  async select(candidate: DiscoveredDevice,selectedProductID?:string) {
    if(this.state.stage==='unknown' || this.state.binding)throw new ApiError(409,'请先完成当前绑定结果');
    return this.operate(async(round,signal)=>{
      this.update({stage:'selecting',message:'正在确认产品能力',candidate:undefined,product:undefined});
      try {
          let productID=selectedProductID??candidate.productID;
          if(!productID&&this.options.mode==='real'){
            const groups=await withBudget(budget=>this.service.products(budget),10000,'产品目录读取超时',signal);this.check(round,signal);
            const matches=groups.flatMap(group=>group.products).filter(product=>product.modelName===candidate.model);
            if(matches.length===1)productID=matches[0].id;
          }
          if(!productID)throw new ApiError(503,'设备产品身份尚未解析或不唯一，不能仅凭广播名称配网');
          const product=await withBudget(budget=>this.service.product(productID!,budget),10000,'产品能力读取超时',signal);this.check(round,signal);
        if(this.options.mode==='real'&&(product.modelName!==candidate.model||!product.seriesName))throw new ApiError(503,'实际产品系列或型号与广播身份不一致');
        if(!product.bluetooth || product.connectType!=='wifi' || !(product.configTypes?.includes('B')??product.configType==='B'))throw new ApiError(503,'当前产品配网路线尚未接入');
        this.bindCode=undefined;
        this.update({stage:'selected',candidate,product,message:'设备已选择，请确认 Wi-Fi'});
      } catch(error){this.check(round,signal);this.update({stage:'failed'});throw error;}
    });
  }
  private async poll(round: number, signal: AbortSignal) {
    const result=await withBudget(async(budget)=>{
      for(;;) {
        this.check(round,budget);
        try {
          const result=await this.service.bindStatus(this.bindCode!,budget);this.check(round,budget);
          this.validateBinding(result);return result;
        } catch(error) {
          this.check(round,budget);
          if(!(error instanceof ApiError) || error.code!==1121)throw error;
          await pause(this.options.pollInterval??mockProfile.bindInterval,budget);
        }
      }
    },this.options.bindingTimeout??this.options.real?.bindingTimeout??mockProfile.bindInterval*mockProfile.bindAttempts,'绑定结果等待超时，请核对结果',signal);
    this.check(round,signal);return result;
  }
  private validateBinding(result: BindingResult) {
    if(!result.deviceID || result.userID!==this.owner || !['sa','mbr','obs'].includes(result.bindingRole))throw new ApiError(0,'绑定响应身份或角色不一致，请核对结果');
  }
  async provision(ssid: string, password: string) {
    if(this.state.binding || this.state.stage==='unknown')throw new ApiError(409,'已有绑定结果或结果待确认，请勿重复配网');
    const {candidate,product}=this.state;
    if(!candidate || !product)throw new ApiError(400,'请先选择已确认产品的设备');
    validateWifi(ssid,password,this.options.mode,this.options.real?.validatePassword);
    return this.operate(async(round,signal)=>{
      let sent=false;
      this.submitted=false;
      try {
        // Generated codes exist only in the explicitly approved mock-v1 profile.
        if(this.options.mode==='real'){
          if(!this.options.real||!this.options.wifi)throw new ApiError(503,'真实绑定码及0822工厂确认契约尚未配置');
          if([this.options.real.bindingTimeout,this.options.real.operationTimeout].some(value=>!Number.isFinite(value)||value<=0))throw new ApiError(503,'真实绑定及配网等待预算未配置');
          const network=await withBudget(budget=>this.options.wifi!.read(budget),10000,'当前Wi-Fi读取超时',signal);this.check(round,signal);
          requireCurrentWifi(network,ssid);
          this.bindCode=await withBudget(budget=>this.options.real!.makeBindCode(budget),10000,'绑定码获取超时',signal);this.check(round,signal);
          if(typeof this.bindCode!=='string'||!this.bindCode)throw new ApiError(503,'未获得有效真实绑定码');
        }else this.bindCode=this.options.makeBindCode?.()??`bind-${this.owner}-${Date.now()}-${++this.serial}`;
        this.update({stage:'selected',message:'正在获取配网服务地址',deviceStep:undefined});
        const urls=await withBudget(budget=>this.service.connection(budget),10000,'配网服务地址读取超时',signal);this.check(round,signal);
        const token=this.options.mode==='real'?this.options.real!.deviceToken(this.service.session!.accessToken):this.service.session!.accessToken;
        const input={userID:this.owner!,mac:candidate.mac,model:candidate.model,ssid,password,token,bindCode:this.bindCode,productID:product.id,seriesName:product.seriesName,modelID:product.modelName,urls};
        if(this.options.mode==='real'){
          const network=await withBudget(budget=>this.options.wifi!.read(budget),10000,'当前Wi-Fi读取超时',signal);this.check(round,signal);requireCurrentWifi(network,ssid);
        }
        const result=await withBudget(async budget=>{
          this.update({stage:'provisioning'});
          const runner=this.options.mode==='real'?new Provisioner0822(this.devices,this.options.real!.profile):new Provisioner(this.devices);
          return runner.run(input,status=>{this.check(round,budget);sent=true;this.submitted=true;this.update({message:describeProvisionStatus(status),deviceStep:describeProvisionStatus(status)});},budget,async bindingSignal=>{
            this.check(round,budget);this.update({stage:'binding',message:'正在查询云端绑定结果'});
            return this.poll(round,bindingSignal!);
          });
        },this.options.operationTimeout??this.options.real?.operationTimeout??13*mockProfile.ackTimeout+mockProfile.routerTimeout+mockProfile.bindInterval*mockProfile.bindAttempts,'配网结果等待超时，请核对绑定结果',signal);
        this.check(round,signal);this.validateBinding(result);
        this.update({binding:result,stage:'bound',message:'绑定已确认，可设置昵称'});
      } catch(error) {
        this.check(round,signal);
        const definite=this.state.stage!=='binding' && error instanceof ApiError && [0x63,0x70,0x7f,0xa2,0xa3,0xa4,0xc3,403].includes(error.code);
        this.update({stage:!sent||definite?'failed':'unknown',message:!sent||definite?'配网未完成，可检查原因后重试':'绑定结果未知，请先核对；不要重复配网'});
        throw error;
      }
    });
  }
  async reconcile() {
    if(this.state.stage!=='unknown' || !this.bindCode)throw new ApiError(409,'没有待核对的绑定事务');
    return this.operate(async(round,signal)=>{
      this.update({stage:'binding',message:'正在核对绑定结果'});
      try {const binding=await this.poll(round,signal);this.update({binding,stage:'bound',message:'绑定已确认，可设置昵称'});}
      catch(error){this.check(round,signal);this.update({stage:'unknown',message:'结果仍未确认，请保留当前事务'});throw error;}
    });
  }
  adoptBinding(binding: BindingResult) {
    if(this.state.busy || this.state.binding)throw new ApiError(409,'已有添加事务');
    this.owner=this.service.userID;this.revision=this.service.sessionRevision;this.validateBinding(binding);this.update({binding,stage:'bound',message:'绑定已确认，可设置昵称'});
  }
  async finish(nickname: string|null) {
    const binding=this.state.binding;if(!binding)throw new ApiError(409,'设备尚未确认绑定');
    const name=this.pendingNickname?'':nickname?.trim()??'';
    if([...name].length>20)throw new ApiError(400,'昵称不能超过20个字符');
    return this.operate(async(round,signal)=>{
      this.update({stage:'finishing',message:'正在完成添加结果'});
      try {
        if(this.state.nickname==='pending') {
          if(this.pendingNickname){
            const view=await withBudget(budget=>this.service.device(binding.deviceID,budget),10000,'昵称结果核对超时',signal);this.check(round,signal);
            if(view.device.id!==binding.deviceID)throw new ApiError(409,'昵称响应设备身份不一致，请继续核对原提交');
            if(view.deviceNickname!==this.pendingNickname){this.pendingNickname=undefined;this.update({nicknameUnknown:false});throw new ApiError(409,'云端昵称与提交值不同，已读取当前值；可重试昵称或跳过');}
            this.pendingNickname=undefined;this.update({nickname:'saved',nicknameUnknown:false});
          }
          else if(name){
            this.pendingNickname=name;this.update({nicknameUnknown:true});
            try{await withBudget(budget=>this.service.renameDevice(binding.deviceID,name,budget),10000,'昵称保存结果未知，请核对结果',signal);this.check(round,signal);this.pendingNickname=undefined;this.update({nickname:'saved',nicknameUnknown:false});}
            catch(error){if(error instanceof ApiError&&[400,401,403,404,1381,1382,1401,1402].includes(error.code)&&round===this.round){this.pendingNickname=undefined;this.update({nicknameUnknown:false});}throw error;}
          }
          else this.update({nickname:'skipped'});
        }
        const groups=await withBudget(budget=>this.service.home(budget),10000,'首页结果刷新超时',signal);this.check(round,signal);
        if(!groups.some(group=>group.devices.some(device=>device.device.id===binding.deviceID)))throw new ApiError(0,'绑定已确认，首页暂未显示设备，请重试刷新结果');
        this.update({visible:true});
        await this.connectRealtime(round,signal,binding.deviceID);
        this.check(round,signal);this.update({stage:'complete',message:'设备已添加，首页已确认显示'});
      } catch(error){this.check(round,signal);this.update({stage:'bound',message:'绑定已确认，请重试未完成的步骤'});throw error;}
    });
  }
  private async connectRealtime(round:number,signal:AbortSignal,id:string) {
    this.session?.close();this.session=undefined;
    let session:ShadowSession|undefined;
    try {
      await withBudget(budget=>this.service.mqtt(id,budget),mockProfile.controlTimeout,'实时凭据获取超时',signal);this.check(round,signal);
      session=new ShadowSession(this.devices,id,this.owner!);
      await withBudget(async budget=>{await session!.connect();this.check(round,budget);},mockProfile.controlTimeout,'实时连接等待超时',signal);
      this.check(round,signal);this.session=session;this.update({realtime:'ready',realtimeError:''});
    } catch(error) {
      session?.close();this.check(round,signal);this.update({realtime:'failed',realtimeError:errorText(error)});
    }
  }
  async retryRealtime() {
    if(!this.state.binding || !this.state.visible)throw new ApiError(409,'请先确认首页设备结果');
    return this.operate((round,signal)=>this.connectRealtime(round,signal,this.state.binding!.deviceID));
  }
}

/** Re-entering an add route resumes an uncertain transaction instead of generating a new code. */
export class AddDeviceCoordinator {
  private current?:AddDeviceFlow;
  private owner?:string;
  private revision?:number;
  constructor(private service:RowanService,private devices:DeviceTransport,private options:AddOptions){}
  acquire() {
    const owner=this.service.userID;
    if(!this.current || this.owner!==owner || this.revision!==this.service.sessionRevision || this.current.state.stage==='complete'){
      this.current?.stop();this.owner=owner;this.revision=this.service.sessionRevision;this.current=new AddDeviceFlow(this.service,this.devices,this.options);
    }
    return this.current;
  }
  clear(){this.current?.stop();this.current=undefined;this.owner=undefined;}
}

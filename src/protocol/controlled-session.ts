import { ApiError, type DeviceView, type ThingModel } from '../services/models';
import { PropertyControls, type ControlProfileResolver } from '../services/device-controls';
import { withBudget } from './device';
import type { DeviceSession } from './device-session';
import { MaintenanceControls, maintenanceLedger, type MaintenanceLedger, type MaintenanceProfileResolver } from '../services/device-maintenance';

/** Capability context is refreshed with every connection; a previous model cannot authorize a new session. */
export class ControlledDeviceSession implements DeviceSession {
  controls?:PropertyControls;
  controlError='';
  maintenance?:MaintenanceControls;
  maintenanceError='';
  private round=0;
  private controller?:AbortController;
  private flight?:Promise<void>;
  private listeners=new Set<()=>void>();
  constructor(private inner:DeviceSession,private load:(signal:AbortSignal)=>Promise<{device:DeviceView;model:ThingModel}>,private resolver?:ControlProfileResolver,
    private maintenanceResolver?:MaintenanceProfileResolver,private ledger:MaintenanceLedger=maintenanceLedger()){}
  get confirmed(){return this.inner.confirmed;}
  get ready(){return !!this.controller&&!this.controller.signal.aborted&&this.inner.ready;}
  get sending(){return !!this.controller&&!this.controller.signal.aborted&&this.inner.sending;}
  get connected(){return !!this.controller&&!this.controller.signal.aborted&&this.inner.connected;}
  get canWrite(){return this.controller&&!this.controller.signal.aborted?this.inner.canWrite:false;}
  get canInvokeService(){return this.controller&&!this.controller.signal.aborted?this.inner.canInvokeService:false;}
  get error(){return this.inner.error;}
  onChange(listener:()=>void){this.listeners.add(listener);const unsub=this.inner.onChange(listener);return ()=>{this.listeners.delete(listener);unsub();};}
  private notify(){for(const listener of this.listeners)listener();}
  connect(signal?:AbortSignal):Promise<void>{
    if(signal?.aborted)return Promise.reject(new ApiError(499,'设备控制会话已停止'));if(this.flight)return this.flight;
    this.close();const round=this.round,controller=new AbortController();this.controller=controller;this.controlError='';this.maintenanceError='';
    const abort=()=>this.close();signal?.addEventListener('abort',abort,{once:true});
    const valid=()=>round===this.round&&!controller.signal.aborted;
    // Shared context avoids reading two different product versions for controls and maintenance.
    const context=withBudget(budget=>this.load(budget),10000,'产品能力读取超时',controller.signal);
    void context.catch(()=>undefined);
    const capabilities=withBudget(async budget=>{
      if(!this.resolver)throw new ApiError(503,'产品控制映射尚未配置');
      const data=await context,profile=await this.resolver(data,budget);
      if(budget.aborted||!valid())throw new ApiError(499,'设备控制上下文已停止');
      this.controls=new PropertyControls(data.model,profile,data.device.bindingRole,
        ()=>valid()?this:{ready:false,sending:false,canWrite:false,confirmed:{}},
        properties=>{if(!valid())throw new ApiError(499,'产品控制上下文已停止');return this.inner.command(properties);},()=>{if(valid())this.notify();});this.notify();
    },10000,'产品控制能力读取超时',controller.signal).catch(error=>{if(valid()){this.controlError=error instanceof Error?error.message:'产品控制能力未确认';this.notify();}});
    const maintenance=withBudget(async budget=>{
      if(!this.maintenanceResolver)throw new ApiError(503,'产品维护能力映射尚未配置');
      const data=await context,profile=await this.maintenanceResolver(data,budget);
      if(budget.aborted||!valid())throw new ApiError(499,'维护上下文已停止');
      if(profile)this.maintenance=new MaintenanceControls(data.model,profile,data.device,
        ()=>valid()?this:{ready:false,sending:false,canInvokeService:false,confirmed:{}},
        call=>{if(!valid()||!this.inner.invokeService)throw new ApiError(503,'维护服务协议尚未配置');return this.inner.invokeService(call);},this.ledger,()=>{if(valid())this.notify();});
      this.notify();
    },10000,'产品维护能力读取超时',controller.signal).catch(error=>{if(valid()){this.maintenanceError=error instanceof Error?error.message:'维护能力未确认';this.notify();}});
    const flight=Promise.all([this.inner.connect(controller.signal),capabilities,maintenance]).then(()=>{if(!valid())throw new ApiError(499,'设备控制会话已停止');this.maintenance?.synchronized();}).catch(error=>{if(valid())this.close();throw error;}).finally(()=>{
      signal?.removeEventListener('abort',abort);if(this.flight===flight)this.flight=undefined;
    });this.flight=flight;return flight;
  }
  async command(properties:Record<string,unknown>){
    if(!this.controls)throw new ApiError(503,this.controlError||'产品控制能力尚未确认');
    return this.controls.command(properties);
  }
  close(){++this.round;this.maintenance?.stop();this.maintenance=undefined;const controller=this.controller;this.controller=undefined;controller?.abort();this.flight=undefined;this.controls=undefined;this.inner.close();this.notify();}
}

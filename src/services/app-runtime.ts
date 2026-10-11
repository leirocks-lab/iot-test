import { communicationConfig, type CommunicationConfig } from './config';
import { deploymentIntegrations } from '../config/deployment-integrations';
import { registeredIntegration, type IntegrationRegistry } from './runtime-integration';
import { createRuntime, disposeStartupDriver, type Runtime } from './runtime';
import { ApiError } from './models';

const cancelled=()=>new ApiError(499,'App启动装配已停止');
function abortable<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
  if(signal.aborted){void work.catch(()=>undefined);return Promise.reject(cancelled());}
  return new Promise((resolve,reject)=>{
    const abort=()=>{reject(cancelled());signal.removeEventListener('abort',abort);};signal.addEventListener('abort',abort,{once:true});
    work.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  });
}
/** Used by AppProvider and injectable integration tests; never reads executable contracts from extra. */
export async function createConfiguredRuntime(extra:Partial<CommunicationConfig>,options:{registry?:IntegrationRegistry;create?:typeof createRuntime;signal?:AbortSignal}={}):Promise<Runtime>{
  const signal=options.signal??new AbortController().signal;if(signal.aborted)throw cancelled();
  const config=communicationConfig(extra),registration=registeredIntegration(config,options.registry??deploymentIntegrations);
  const driver=registration.createDeviceDriver?await abortable(Promise.resolve().then(()=>registration.createDeviceDriver!(signal)).then(async value=>{
    if(signal.aborted){await disposeStartupDriver(value);throw cancelled();}
    if(!value||['scan','exchange','challenge','provision','binding','shadowGet','subscribe','publish'].some(key=>typeof value[key as keyof typeof value]!=='function')){await disposeStartupDriver(value);throw new Error('真实蓝牙驱动工厂返回无效端口');}return value;
  }),signal):undefined;
  if(signal.aborted){await disposeStartupDriver(driver);throw cancelled();}
  // Ownership transfers to createRuntime at invocation, including initialization failure cleanup.
  const work=Promise.resolve().then(async()=>{
    if(signal.aborted){await disposeStartupDriver(driver);throw cancelled();}
    const runtime=await (options.create??createRuntime)(config,driver,registration.contracts,signal);
    if(signal.aborted){runtime.dispose();throw cancelled();}return runtime;
  });
  return abortable(work,signal);
}

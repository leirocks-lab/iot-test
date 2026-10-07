import { MockCloud } from './mock-cloud';
import type { DeviceTransport } from '../protocol/device';
import { MockDeviceTransport, UnavailableDeviceTransport } from '../protocol/device';
import { communicationConfig, type CommunicationConfig } from './config';
import { FetchHttpClient, MockHttpClient } from './http';
import { MockDatabase } from './store';
import { SessionStorage, MockFileStorage } from './native-storage';
import { RowanService } from './rowan';
export interface Runtime {
  service:RowanService; devices:DeviceTransport; config:CommunicationConfig;
  dispose:()=>void;
  developer?:{cloud:MockCloud;http:MockHttpClient;devices:MockDeviceTransport;reset:()=>Promise<void>};
}
export async function createRuntime(input:Partial<CommunicationConfig>, realDeviceDriver?:DeviceTransport):Promise<Runtime> {
  const config=communicationConfig(input);
  const db=config.httpMode==='mock'||config.deviceMode==='mock'?await MockDatabase.open(new MockFileStorage()):undefined;
  const storage=new SessionStorage(()=>`rowan.${config.httpMode}.${config.httpMode==='mock'?(db?.state.generation??'legacy-v1'):'session'}`);
  const mockHttp=db?new MockHttpClient(db):undefined, mockDevices=db?new MockDeviceTransport(db):undefined;
  const http=config.httpMode==='mock'?mockHttp!:new FetchHttpClient(config.apiBaseUrl);
  const devices=config.deviceMode==='mock'?mockDevices!:realDeviceDriver??new UnavailableDeviceTransport();
  const cloud=db?new MockCloud(db):undefined;let working=false;
  const timer=cloud?setInterval(()=>{if(working)return;working=true;void cloud.advance().then(()=>mockDevices?.syncCloud()).catch(()=>undefined).finally(()=>{working=false;});},15000):undefined;
  const service=new RowanService(http,storage);await service.restore();
  return {dispose:()=>clearInterval(timer),service,devices,config,
    developer:config.environment!=='production'&&mockHttp&&mockDevices?{cloud:cloud!,http:mockHttp,devices:mockDevices,reset:async()=>{await service.clearLocal();await db!.reset();mockHttp.fault='none';mockDevices.fault='none';}}:undefined};
}

import { MockCloud } from './mock-cloud';
import type { DeviceTransport } from '../protocol/device';
import { MockDeviceTransport, UnavailableDeviceTransport } from '../protocol/device';
import { communicationConfig, type CommunicationConfig } from './config';
import { FetchHttpClient, MockHttpClient } from './http';
import { MockDatabase } from './store';
import { SessionStorage, MockFileStorage } from './native-storage';
import { RowanService } from './rowan';
import { AddDeviceCoordinator } from './onboarding';
import { QrScanCoordinator } from './scan-flow';
export interface Runtime {
  service:RowanService; devices:DeviceTransport; config:CommunicationConfig;
  dispose:()=>void;
  onboarding:AddDeviceCoordinator;
  scanner:QrScanCoordinator;
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
  const onboarding=new AddDeviceCoordinator(service,devices,{mode:config.deviceMode});
  const scanner=new QrScanCoordinator(service,config.httpMode);
  let owner=service.session?.userID;
  const unsubscribe=service.onSessionChange(()=>{const next=service.session?.userID;if(next!==owner){onboarding.clear();scanner.clear();owner=next;}});
  return {dispose:()=>{clearInterval(timer);unsubscribe();onboarding.clear();scanner.clear();},service,devices,config,onboarding,scanner,
    developer:config.environment!=='production'&&mockHttp&&mockDevices?{cloud:cloud!,http:mockHttp,devices:mockDevices,reset:async()=>{await service.clearLocal();await db!.reset();mockHttp.fault='none';mockDevices.fault='none';}}:undefined};
}

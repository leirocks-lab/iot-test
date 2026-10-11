import { MockCloud } from './mock-cloud';
import type { DeviceTransport } from '../protocol/device';
import { MockDeviceTransport } from '../protocol/device';
import { communicationConfig, type CommunicationConfig } from './config';
import { MockHttpClient } from './http';
import { RealHttpClient, realSessionScope } from './real-http';
import { MockDatabase } from './store';
import { SessionStorage, MockFileStorage } from './native-storage';
import { RowanService } from './rowan';
import { AddDeviceCoordinator } from './onboarding';
import { QrScanCoordinator } from './scan-flow';
import type { MqttConnection } from '../protocol/mqtt-connection';
export interface Runtime {
  service:RowanService; devices:DeviceTransport; config:CommunicationConfig;
  dispose:()=>void;
  onboarding:AddDeviceCoordinator;
  scanner:QrScanCoordinator;
  createRealtimeConnection?:()=>Promise<MqttConnection>;
  developer?:{cloud:MockCloud;http:MockHttpClient;devices:MockDeviceTransport;reset:()=>Promise<void>};
}
export async function createRuntime(input:Partial<CommunicationConfig>, realDeviceDriver?:DeviceTransport):Promise<Runtime> {
  const config=communicationConfig(input);
  const db=config.httpMode==='mock'||config.deviceMode==='mock'?await MockDatabase.open(new MockFileStorage()):undefined;
  const storage=new SessionStorage(()=>`rowan.${config.httpMode}.${config.httpMode==='mock'?(db?.state.generation??'legacy-v1'):realSessionScope(config)}`);
  const mockHttp=db?new MockHttpClient(db):undefined, mockDevices=db?new MockDeviceTransport(db):undefined;
  const http=config.httpMode==='mock'?mockHttp!:new RealHttpClient(config);
  const devices:DeviceTransport=config.deviceMode==='mock'?mockDevices!:realDeviceDriver??await (await import('../protocol/native-ble')).createNativeBleTransport();
  const cloud=db?new MockCloud(db):undefined;let working=false;
  const timer=cloud?setInterval(()=>{if(working)return;working=true;void cloud.advance().then(()=>mockDevices?.syncCloud()).catch(()=>undefined).finally(()=>{working=false;});},15000):undefined;
  const service=new RowanService(http,storage);await service.restore();
  const onboarding=new AddDeviceCoordinator(service,devices,{mode:config.deviceMode});
  const scanner=new QrScanCoordinator(service,config.httpMode);
  let owner=service.session?.userID;
  const connections=new Set<MqttConnection>();let disposed=false;
  const closeConnections=()=>{for(const connection of connections)connection.close();connections.clear();};
  const unsubscribe=service.onSessionChange(()=>{const next=service.session?.userID;if(next!==owner){onboarding.clear();scanner.clear();closeConnections();owner=next;}});
  return {dispose:()=>{disposed=true;clearInterval(timer);unsubscribe();onboarding.clear();scanner.clear();closeConnections();void Promise.resolve(devices.dispose?.()).catch(()=>undefined);},service,devices,config,onboarding,scanner,
    ...(config.deviceMode==='real'?{createRealtimeConnection:async()=>{
      const userID=service.userID,connection=(await import('../protocol/mqtt-browser')).createMqttConnection();
      if(disposed||service.session?.userID!==userID){connection.close();throw new Error('设备连接上下文已变更');}
      connections.add(connection);return connection;
    }}:{}),
    developer:config.environment!=='production'&&mockHttp&&mockDevices?{cloud:cloud!,http:mockHttp,devices:mockDevices,reset:async()=>{await service.clearLocal();await db!.reset();mockHttp.fault='none';mockDevices.fault='none';}}:undefined};
}

import { MockCloud } from './mock-cloud';
import type { DeviceTransport } from '../protocol/device';
import { MockDeviceTransport } from '../protocol/device';
import { communicationConfig, type CommunicationConfig } from './config';
import { MockHttpClient } from './http';
import { RealHttpClient, realSessionScope } from './real-http';
import { MockDatabase } from './store';
import { SessionStorage, MockFileStorage } from './native-storage';
import { RowanService } from './rowan';
import { AddDeviceCoordinator, type RealAddContract } from './onboarding';
import type { WifiReader } from './wifi';
import type { RowanCodeParser } from './qr';
import { QrScanCoordinator } from './scan-flow';
import type { MqttConnection } from '../protocol/mqtt-connection';
export interface Runtime {
  service:RowanService; devices:DeviceTransport; config:CommunicationConfig;
  dispose:()=>void;
  onboarding:AddDeviceCoordinator;
  scanner:QrScanCoordinator;
  wifi?:WifiReader;
  createRealtimeConnection?:()=>Promise<MqttConnection>;
  developer?:{cloud:MockCloud;http:MockHttpClient;devices:MockDeviceTransport;reset:()=>Promise<void>};
}
export async function createRuntime(input:Partial<CommunicationConfig>, realDeviceDriver?:DeviceTransport,contracts?:{onboarding?:RealAddContract;qr?:RowanCodeParser;wifi?:WifiReader}):Promise<Runtime> {
  const config=communicationConfig(input);
  const db=config.httpMode==='mock'||config.deviceMode==='mock'?await MockDatabase.open(new MockFileStorage()):undefined;
  const storage=new SessionStorage(()=>`rowan.${config.httpMode}.${config.httpMode==='mock'?(db?.state.generation??'legacy-v1'):realSessionScope(config)}`);
  const mockHttp=db?new MockHttpClient(db):undefined, mockDevices=db?new MockDeviceTransport(db):undefined;
  const http=config.httpMode==='mock'?mockHttp!:new RealHttpClient(config);
  const devices:DeviceTransport=config.deviceMode==='mock'?mockDevices!:realDeviceDriver??await (await import('../protocol/native-ble')).createNativeBleTransport();
  const cloud=db?new MockCloud(db):undefined;let working=false;
  const timer=cloud?setInterval(()=>{if(working)return;working=true;void cloud.advance().then(()=>mockDevices?.syncCloud()).catch(()=>undefined).finally(()=>{working=false;});},15000):undefined;
  const service=new RowanService(http,storage);await service.restore();
  const wifi=config.deviceMode==='real'?contracts?.wifi??(await import('../protocol/native-wifi')).createWifiReader():undefined;
  const onboarding=new AddDeviceCoordinator(service,devices,{mode:config.deviceMode,real:contracts?.onboarding,wifi});
  const scanner=new QrScanCoordinator(service,config.httpMode,contracts?.qr);
  let revision=service.sessionRevision;
  const connections=new Set<MqttConnection>();let disposed=false;
  const closeConnections=()=>{for(const connection of connections)connection.close();connections.clear();};
  const unsubscribe=service.onSessionChange(()=>{const next=service.sessionRevision;if(next!==revision){onboarding.clear();scanner.clear();closeConnections();revision=next;}});
  return {dispose:()=>{disposed=true;clearInterval(timer);unsubscribe();onboarding.clear();scanner.clear();closeConnections();void Promise.resolve(devices.dispose?.()).catch(()=>undefined);},service,devices,config,onboarding,scanner,wifi,
    ...(config.deviceMode==='real'?{createRealtimeConnection:async()=>{
      const userID=service.userID,sessionRevision=service.sessionRevision,connection=(await import('../protocol/mqtt-browser')).createMqttConnection();
      if(disposed||service.session?.userID!==userID||service.sessionRevision!==sessionRevision){connection.close();throw new Error('设备连接上下文已变更');}
      connections.add(connection);return connection;
    }}:{}),
    developer:config.environment!=='production'&&mockHttp&&mockDevices?{cloud:cloud!,http:mockHttp,devices:mockDevices,reset:async()=>{await service.clearLocal();await db!.reset();mockHttp.fault='none';mockDevices.fault='none';}}:undefined};
}

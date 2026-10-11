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
import { MockDeviceSession, RealtimeDeviceSession, type DeviceProfileResolver, type DeviceSession } from '../protocol/device-session';
import { ControlledDeviceSession } from '../protocol/controlled-session';
import { mockControlProfile, type ControlProfileResolver } from './device-controls';
export interface Runtime {
  service:RowanService; devices:DeviceTransport; config:CommunicationConfig;
  dispose:()=>void;
  onboarding:AddDeviceCoordinator;
  scanner:QrScanCoordinator;
  wifi?:WifiReader;
  createRealtimeConnection?:()=>Promise<MqttConnection>;
  createDeviceSession:(id:string)=>DeviceSession;
  developer?:{cloud:MockCloud;http:MockHttpClient;devices:MockDeviceTransport;reset:()=>Promise<void>};
}
export async function createRuntime(input:Partial<CommunicationConfig>, realDeviceDriver?:DeviceTransport,contracts?:{onboarding?:RealAddContract;qr?:RowanCodeParser;wifi?:WifiReader;realtime?:DeviceProfileResolver;controls?:ControlProfileResolver}):Promise<Runtime> {
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
  let disposed=false;
  const sessions=new Map<string,DeviceSession>();
  const createDeviceSession=(id:string):DeviceSession=>{
    const userID=service.userID,revision=service.sessionRevision;
    let session:DeviceSession;
    const lifecycle={
      current:()=>!disposed&&service.session?.userID===userID&&service.sessionRevision===revision,
      start:()=>{if(!lifecycle.current())throw new Error('设备连接上下文已变更');const previous=sessions.get(id);if(previous&&previous!==session)previous.close();sessions.set(id,session);},
      stop:()=>{if(sessions.get(id)===session)sessions.delete(id);},
      credentials:(signal:AbortSignal)=>service.mqtt(id,signal),
    };
    const context=async(signal:AbortSignal)=>{const device=await service.device(id,signal);if(device.device.id!==id)throw new Error('产品控制设备身份不一致');if(!device.product)throw new Error('产品信息尚未确认');return {device,model:await service.model(device.product.id,signal)};};
    const inner=config.deviceMode==='mock'?new MockDeviceSession(devices,id,userID,lifecycle):new RealtimeDeviceSession({...lifecycle,deviceID:id,userID,
      connection:async()=> (await import('../protocol/mqtt-browser')).createMqttConnection(),
      context,
      profile:contracts?.realtime,
    });session=new ControlledDeviceSession(inner,context,config.deviceMode==='mock'&&config.httpMode==='mock'?mockControlProfile:contracts?.controls);return session;
  };
  const onboarding=new AddDeviceCoordinator(service,devices,{mode:config.deviceMode,real:contracts?.onboarding,wifi,createSession:createDeviceSession});
  const scanner=new QrScanCoordinator(service,config.httpMode,contracts?.qr);
  let revision=service.sessionRevision;
  const connections=new Set<MqttConnection>();
  const closeConnections=()=>{for(const session of [...sessions.values()])session.close();sessions.clear();for(const connection of connections)connection.close();connections.clear();};
  const unsubscribe=service.onSessionChange(()=>{const next=service.sessionRevision;if(next!==revision){onboarding.clear();scanner.clear();closeConnections();revision=next;}});
  return {dispose:()=>{disposed=true;clearInterval(timer);unsubscribe();onboarding.clear();scanner.clear();closeConnections();void Promise.resolve(devices.dispose?.()).catch(()=>undefined);},service,devices,config,onboarding,scanner,wifi,createDeviceSession,
    ...(config.deviceMode==='real'?{createRealtimeConnection:async()=>{
      const userID=service.userID,sessionRevision=service.sessionRevision,connection=(await import('../protocol/mqtt-browser')).createMqttConnection();
      if(disposed||service.session?.userID!==userID||service.sessionRevision!==sessionRevision){connection.close();throw new Error('设备连接上下文已变更');}
      connections.add(connection);return connection;
    }}:{}),
    developer:config.environment!=='production'&&mockHttp&&mockDevices?{cloud:cloud!,http:mockHttp,devices:mockDevices,reset:async()=>{await service.clearLocal();await db!.reset();mockHttp.fault='none';mockDevices.fault='none';}}:undefined};
}

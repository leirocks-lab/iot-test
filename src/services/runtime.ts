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
import { maintenanceLedger, mockMaintenanceProfile, type MaintenanceLedger, type MaintenanceProfileResolver } from './device-maintenance';
import { eventLedger, mockEventProfile, type EventLedger, type EventProfileResolver } from './device-events';
import { integrationStatus, type IntegrationStatus } from './runtime-integration';
import { ApiError } from './models';
import { HttpDiagnostics, LoggedHttpClient } from './http-logging';
import { DeviceUnbindFlow } from './device-unbind';
export interface RuntimeContracts {onboarding?:RealAddContract;qr?:RowanCodeParser;wifi?:WifiReader;realtime?:DeviceProfileResolver;controls?:ControlProfileResolver;maintenance?:MaintenanceProfileResolver;events?:EventProfileResolver}
export interface Runtime {
  service:RowanService; devices:DeviceTransport; config:CommunicationConfig;
  integration:IntegrationStatus;
  dispose:()=>void;
  onboarding:AddDeviceCoordinator;
  scanner:QrScanCoordinator;
  wifi?:WifiReader;
  createRealtimeConnection?:()=>Promise<MqttConnection>;
  createDeviceSession:(id:string)=>DeviceSession;
  unbindFlow: (id: string) => DeviceUnbindFlow;
  releaseDevice: (id: string, owner: string, revision: number) => boolean;
  developer?:{cloud:MockCloud;http:MockHttpClient;devices:MockDeviceTransport;reset:()=>Promise<void>};
}
export async function createRuntime(input:Partial<CommunicationConfig>, realDeviceDriver?:DeviceTransport,contracts?:RuntimeContracts,startupSignal?:AbortSignal):Promise<Runtime> {
  let ownedDriver=realDeviceDriver,timer:ReturnType<typeof setInterval>|undefined,initializingService:RowanService|undefined;
  let releasedDriver:DeviceTransport|undefined,releaseFlight:Promise<void>|undefined;
  const releaseDriver=()=>{if(!ownedDriver)return Promise.resolve();if(releasedDriver===ownedDriver)return releaseFlight!;releasedDriver=ownedDriver;return releaseFlight=disposeStartupDriver(ownedDriver);};
  const check=()=>{if(startupSignal?.aborted)throw new ApiError(499,'App启动装配已停止');};
  const abort=()=>{clearInterval(timer);initializingService?.cancelAuthentication();void releaseDriver();};
  startupSignal?.addEventListener('abort',abort,{once:true});
  try{
  check();
  const config=communicationConfig(input);
  const db=config.httpMode==='mock'||config.deviceMode==='mock'?await MockDatabase.open(new MockFileStorage()):undefined;
  check();
  const storage=new SessionStorage(()=>`rowan.${config.httpMode}.${config.httpMode==='mock'?(db?.state.generation??'legacy-v1'):realSessionScope(config)}`);
  const mockHttp=db?new MockHttpClient(db):undefined, mockDevices=db?new MockDeviceTransport(db):undefined;
  const diagnostics=new HttpDiagnostics({level:config.httpLogLevel});
  const http=config.httpMode==='mock'?new LoggedHttpClient(mockHttp!,diagnostics):new RealHttpClient(config,undefined,diagnostics);
  const devices:DeviceTransport=config.deviceMode==='mock'?mockDevices!:realDeviceDriver??await (await import('../protocol/native-ble')).createNativeBleTransport();
  ownedDriver=devices;
  check();
  const cloud=db?new MockCloud(db):undefined;let working=false;
  const service=new RowanService(http,storage);initializingService=service;await service.restore();check();
  const wifi=config.deviceMode==='real'?contracts?.wifi??(await import('../protocol/native-wifi')).createWifiReader():undefined;
  check();
  let disposed=false;
  timer=cloud?setInterval(()=>{if(working)return;working=true;void cloud.advance().then(()=>mockDevices?.syncCloud()).catch(()=>undefined).finally(()=>{working=false;});},15000):undefined;
  const sessions=new Map<string,DeviceSession>();
  const maintenanceStates=new Map<string,MaintenanceLedger>();
  const eventStates=new Map<string,EventLedger>();
  const deviceEpochs = new Map<string, number>();
  const unbindFlows = new Map<string, DeviceUnbindFlow>();
  const releaseDevice = (id: string, owner: string, revision: number) => {
    if (
      disposed ||
      service.session?.userID !== owner ||
      service.sessionRevision !== revision
    ) {
      return false;
    }
    deviceEpochs.set(id, (deviceEpochs.get(id) ?? 0) + 1);
    sessions.get(id)?.close();
    sessions.delete(id);
    maintenanceStates.delete(id);
    eventStates.delete(id);
    return true;
  };
  const unbindFlow = (id: string) => {
    let flow = unbindFlows.get(id);
    if (!flow || flow.state.phase === 'complete') {
      flow?.stop();
      flow = new DeviceUnbindFlow(service, id, releaseDevice);
      unbindFlows.set(id, flow);
    }
    return flow;
  };
  const createDeviceSession=(id:string):DeviceSession=>{
    const userID=service.userID,revision=service.sessionRevision;
    const deviceEpoch = deviceEpochs.get(id) ?? 0;
    let ledger=maintenanceStates.get(id);if(!ledger){ledger=maintenanceLedger();maintenanceStates.set(id,ledger);}
    let eventState=eventStates.get(id);if(!eventState){eventState=eventLedger();eventStates.set(id,eventState);}
    let session:DeviceSession;
    const lifecycle={
      current:() =>
        !disposed &&
        service.session?.userID === userID &&
        service.sessionRevision === revision &&
        (deviceEpochs.get(id) ?? 0) === deviceEpoch,
      start:()=>{if(!lifecycle.current())throw new Error('设备连接上下文已变更');const previous=sessions.get(id);if(previous&&previous!==session)previous.close();sessions.set(id,session);},
      stop:()=>{if(sessions.get(id)===session)sessions.delete(id);},
      credentials:(signal:AbortSignal)=>service.mqtt(id,signal),
    };
    const context=async(signal:AbortSignal)=>{const device=await service.device(id,signal);if(device.device.id!==id)throw new Error('产品控制设备身份不一致');if(!device.product)throw new Error('产品信息尚未确认');return {device,model:await service.model(device.product.id,signal)};};
    const inner=config.deviceMode==='mock'?new MockDeviceSession(devices,id,userID,lifecycle):new RealtimeDeviceSession({...lifecycle,deviceID:id,userID,
      connection:async()=> (await import('../protocol/mqtt-browser')).createMqttConnection(),
      context,
      profile:contracts?.realtime,
    });const mock=config.deviceMode==='mock'&&config.httpMode==='mock';session=new ControlledDeviceSession(inner,context,mock?mockControlProfile:contracts?.controls,mock?mockMaintenanceProfile:contracts?.maintenance,ledger,mock?mockEventProfile:contracts?.events,eventState);return session;
  };
  let scanner:QrScanCoordinator;
  const onboarding=new AddDeviceCoordinator(service,devices,{mode:config.deviceMode,real:contracts?.onboarding,wifi,createSession:createDeviceSession,beforeNewContext:()=>{if(scanner?.pending)throw new ApiError(409,'请先核对或完成当前扫码绑定结果');}});
  scanner=new QrScanCoordinator(service,config.httpMode,contracts?.qr,()=>{if(onboarding.pending)throw new ApiError(409,'请先核对或完成当前蓝牙添加结果');});
  let revision=service.sessionRevision;
  const connections=new Set<MqttConnection>();
  const closeConnections = () => {
    for (const flow of unbindFlows.values()) flow.stop();
    unbindFlows.clear();
    for (const session of [...sessions.values()]) session.close();
    sessions.clear();
    maintenanceStates.clear();
    eventStates.clear();
    deviceEpochs.clear();
    for (const connection of connections) connection.close();
    connections.clear();
  };
  const unsubscribe=service.onSessionChange(()=>{const next=service.sessionRevision;if(next!==revision){onboarding.clear();scanner.clear();closeConnections();revision=next;}});
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      unsubscribe();
      onboarding.clear();
      scanner.clear();
      closeConnections();
      void releaseDriver();
    },
    service,
    devices,
    config,
    integration: integrationStatus(config, contracts, !!realDeviceDriver),
    onboarding,
    scanner,
    wifi,
    createDeviceSession,
    unbindFlow,
    releaseDevice,
    ...(config.deviceMode === 'real'
      ? {
          createRealtimeConnection: async () => {
            const userID = service.userID;
            const sessionRevision = service.sessionRevision;
            const connection = (
              await import('../protocol/mqtt-browser')
            ).createMqttConnection();
            if (
              disposed ||
              service.session?.userID !== userID ||
              service.sessionRevision !== sessionRevision
            ) {
              connection.close();
              throw new Error('设备连接上下文已变更');
            }
            connections.add(connection);
            return connection;
          },
        }
      : {}),
    developer:
      config.environment !== 'production' && mockHttp && mockDevices
        ? {
            cloud: cloud!,
            http: mockHttp,
            devices: mockDevices,
            reset: async () => {
              await service.clearLocal();
              await db!.reset();
              mockHttp.fault = 'none';
              mockDevices.fault = 'none';
            },
          }
        : undefined,
  };
  }catch(error){clearInterval(timer);initializingService?.cancelAuthentication();await releaseDriver();throw error;}
  finally{startupSignal?.removeEventListener('abort',abort);}
}
export async function disposeStartupDriver(driver?:DeviceTransport){try{await driver?.dispose?.();}catch{/* Preserve the original startup error, never fall back to Mock. */}}

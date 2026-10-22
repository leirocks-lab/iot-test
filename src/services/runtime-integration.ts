import type { CommunicationConfig } from './config';
import type { DeviceTransport } from '../protocol/device';
import type { RuntimeContracts } from './runtime';

export interface IntegrationRegistration {
  environments:readonly string[];
  /** Pure synchronous assembly; no network calls or resources before validation. */
  create:(config:Readonly<CommunicationConfig>)=>{contracts:RuntimeContracts;createDeviceDriver?:(signal:AbortSignal)=>Promise<DeviceTransport>};
}
export type IntegrationRegistry=Readonly<Record<string,IntegrationRegistration>>;
export interface IntegrationCapability {key:keyof RuntimeContracts|'ble';label:string;source:'mock'|'native'|'provided'|'missing'}
export interface IntegrationStatus {profile:string|null;httpMode:'mock'|'real';deviceMode:'mock'|'real';configurationIssues:readonly string[];capabilities:readonly IntegrationCapability[]}
export function integrationStatus(config:CommunicationConfig,contracts:RuntimeContracts={},driverProvided=false):IntegrationStatus{
  const dualMock=config.httpMode==='mock'&&config.deviceMode==='mock';
  const capability=(key:keyof RuntimeContracts,label:string,mock:boolean,native=false):IntegrationCapability=>({key,label,source:mock?'mock':contracts[key]?'provided':native?'native':'missing'});
  const configurationIssues=[...(!dualMock&&!config.integrationProfile?['尚未选择已确认的真实接入配置']:[])];
  return Object.freeze({profile:config.integrationProfile??null,httpMode:config.httpMode,deviceMode:config.deviceMode,configurationIssues:Object.freeze(configurationIssues),capabilities:Object.freeze([
    Object.freeze({key:'ble' as const,label:'蓝牙驱动',source:config.deviceMode==='mock'?'mock' as const:driverProvided?'provided' as const:'native' as const}),
    capability('qr','二维码解析',config.httpMode==='mock'),capability('onboarding','Wi-Fi配网协议',config.deviceMode==='mock'),
    capability('wifi','系统Wi-Fi读取',config.deviceMode==='mock',true),capability('realtime','MQTT同步协议',config.deviceMode==='mock'),
    capability('controls','产品控制映射',dualMock),capability('maintenance','清洁维护映射',dualMock),capability('events','故障告警映射',dualMock),
  ].map(item=>Object.freeze(item)))});
}
/** Do not assemble adapters that would be ignored by the selected communication dimensions. */
export function applicableContracts(config:CommunicationConfig,contracts:RuntimeContracts):RuntimeContracts{
  return {...(config.httpMode==='real'?{qr:contracts.qr}:{}),...(config.deviceMode==='real'?{onboarding:contracts.onboarding,wifi:contracts.wifi,realtime:contracts.realtime}:{}),
    ...(config.httpMode==='real'||config.deviceMode==='real'?{controls:contracts.controls,maintenance:contracts.maintenance,events:contracts.events}:{})};
}
export function registeredIntegration(config:CommunicationConfig,registry:IntegrationRegistry){
  const id=config.integrationProfile;if(!id)return {contracts:{} as RuntimeContracts};
  if(config.httpMode==='mock'&&config.deviceMode==='mock')throw new Error('双Mock模式不使用真实接入配置，请清空ROWAN_INTEGRATION_PROFILE');
  const registration=Object.hasOwn(registry,id)?registry[id]:undefined;
  if(!registration)throw new Error('选择的真实接入配置尚未注册，请核对ROWAN_INTEGRATION_PROFILE');
  if(!Array.isArray(registration.environments)||!registration.environments.includes(config.environment))throw new Error('真实接入配置不适用于当前App环境');
  if(typeof registration.create!=='function')throw new Error('真实接入配置工厂尚未提供');
  const value=registration.create(Object.freeze({...config}));
  if(value&&typeof value==='object'&&'then' in value){void Promise.resolve(value).catch(()=>undefined);throw new Error('真实接入配置工厂返回无效声明');}
  if(!value||typeof value!=='object'||!value.contracts||typeof value.contracts!=='object'||Array.isArray(value.contracts)||value.createDeviceDriver!==undefined&&typeof value.createDeviceDriver!=='function')throw new Error('真实接入配置工厂返回无效声明');
  const contracts=applicableContracts(config,value.contracts);
  for(const key of ['qr','realtime','controls','maintenance','events'] as const)if(contracts[key]!==undefined&&typeof contracts[key]!=='function')throw new Error('真实接入配置包含无效业务端口');
  if(contracts.wifi!==undefined&&(!contracts.wifi||typeof contracts.wifi.read!=='function'))throw new Error('真实接入配置包含无效Wi-Fi读取端口');
  const add=contracts.onboarding;
  if(add!==undefined){
    if(!add||!add.profile||!(add.profile.factoryReply instanceof Uint8Array)||typeof add.makeBindCode!=='function'||(add.validatePassword!==undefined&&typeof add.validatePassword!=='function')||typeof add.deviceToken!=='function'||[add.profile.stageTimeout,add.bindingTimeout,add.operationTimeout].some(value=>typeof value!=='number'||!Number.isFinite(value)||value<=0))throw new Error('真实配网契约不完整，不能装配');
    contracts.onboarding=Object.freeze({...add,profile:Object.freeze({...add.profile,factoryReply:add.profile.factoryReply.slice()})});
  }
  return {contracts:Object.freeze(contracts),createDeviceDriver:config.deviceMode==='real'?value.createDeviceDriver:undefined};
}

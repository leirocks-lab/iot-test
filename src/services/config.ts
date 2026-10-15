export interface CommunicationConfig { httpMode:'mock'|'real'; deviceMode:'mock'|'real'; apiBaseUrl:string; iotApiBaseUrl?:string; tenantID?:string; environment:string; integrationProfile?:string; allowTestHttp?:boolean }
export function validateApiRoot(base:string,policy:Pick<Partial<CommunicationConfig>,'environment'|'allowTestHttp'>={}) {
  const url=new URL(base);
  const testHttp=policy.environment==='development'&&policy.allowTestHttp===true&&url.origin==='http://47.107.80.36'&&['/','/iot','/iot/'].includes(url.pathname);
  if((url.protocol!=='https:'&&!testHttp)||url.username||url.password||url.search||url.hash)
    throw new Error('真实 API 必须配置无凭据、查询或片段的 HTTPS 地址；指定开发测试 HTTP 需显式启用');
  if(/\/app-api\/?$/.test(url.pathname))throw new Error('请配置模块根地址，不要包含/app-api');
}
/** A public identifier, never a URL, executable module path or credential. */
export function integrationProfileID(value:unknown):string|undefined {
  if(value===undefined||value==='')return undefined;
  if(typeof value!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(value))throw new Error('ROWAN_INTEGRATION_PROFILE must be a bundled lowercase profile ID');
  return value;
}
export function communicationConfig(input:Partial<CommunicationConfig>):CommunicationConfig {
  const environment=input.environment??'development';
  const httpMode=input.httpMode??(environment==='production'?'real':'mock');
  const deviceMode=input.deviceMode??(environment==='production'?'real':'mock');
  if(!['mock','real'].includes(httpMode)||!['mock','real'].includes(deviceMode))throw new Error('Invalid communication mode');
  if(environment==='production'&&(httpMode!=='real'||deviceMode!=='real'))throw new Error('Production requires real transports');
  const apiBaseUrl=input.apiBaseUrl??'';
  const iotApiBaseUrl=input.iotApiBaseUrl??apiBaseUrl;
  const allowTestHttp=input.allowTestHttp===true;
  if(allowTestHttp&&environment!=='development')throw new Error('Test HTTP exception requires development; other environments require HTTPS');
  if(httpMode==='real')for(const root of [apiBaseUrl,iotApiBaseUrl])validateApiRoot(root,{environment,allowTestHttp});
  const tenantID=input.tenantID?.trim()||undefined;
  if(tenantID!==undefined&&!/^\d+$/.test(tenantID))throw new Error('tenant-id must be an integer supplied by the backend');
  const integrationProfile=integrationProfileID(input.integrationProfile);
  return {environment,httpMode,deviceMode,apiBaseUrl,iotApiBaseUrl,tenantID,allowTestHttp,...(integrationProfile?{integrationProfile}:{})};
}

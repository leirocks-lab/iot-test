import { allowsHttpApi, validateApiBaseUrl } from './api-transport';
import type { HttpLogLevel } from './http-logging';

export interface CommunicationConfig { httpMode:'mock'|'real'; deviceMode:'mock'|'real'; apiBaseUrl:string; iotApiBaseUrl?:string; tenantID?:string; environment:string; integrationProfile?:string; httpLogLevel?:HttpLogLevel }
/** A public identifier, never a URL, executable module path or credential. */
export function integrationProfileID(value:unknown):string|undefined {
  if(value===undefined||value==='')return undefined;
  if(typeof value!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(value))throw new Error('ROWAN_INTEGRATION_PROFILE must be a bundled lowercase profile ID');
  return value;
}
export function communicationConfig(input:Partial<CommunicationConfig>):CommunicationConfig {
  const environment=input.environment===undefined?'development':input.environment;
  allowsHttpApi(environment);
  const httpMode=input.httpMode??(environment==='production'?'real':'mock');
  const deviceMode=input.deviceMode??(environment==='production'?'real':'mock');
  if(!['mock','real'].includes(httpMode)||!['mock','real'].includes(deviceMode))throw new Error('Invalid communication mode');
  if(environment==='production'&&(httpMode!=='real'||deviceMode!=='real'))throw new Error('Production requires real transports');
  const apiBaseUrl=input.apiBaseUrl??'';
  const iotApiBaseUrl=input.iotApiBaseUrl??apiBaseUrl;
  if(httpMode==='real')for(const base of [apiBaseUrl,iotApiBaseUrl])validateApiBaseUrl(base,environment);
  const tenantID=input.tenantID?.trim()||undefined;
  if(tenantID!==undefined&&!/^\d+$/.test(tenantID))throw new Error('tenant-id must be an integer supplied by the backend');
  const integrationProfile=integrationProfileID(input.integrationProfile);
  const httpLogLevel=input.httpLogLevel??(environment==='production'?'off':'debug');
  if(!['off','error','debug'].includes(httpLogLevel))throw new Error('Invalid ROWAN_HTTP_LOG_LEVEL; expected off, error or debug');
  return {environment,httpMode,deviceMode,apiBaseUrl,iotApiBaseUrl,tenantID,...(integrationProfile?{integrationProfile}:{}),httpLogLevel};
}

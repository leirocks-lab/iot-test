export interface CommunicationConfig { httpMode:'mock'|'real'; deviceMode:'mock'|'real'; apiBaseUrl:string; environment:string }
export function communicationConfig(input:Partial<CommunicationConfig>):CommunicationConfig {
  const environment=input.environment??'development';
  const httpMode=input.httpMode??(environment==='production'?'real':'mock');
  const deviceMode=input.deviceMode??(environment==='production'?'real':'mock');
  if(!['mock','real'].includes(httpMode)||!['mock','real'].includes(deviceMode))throw new Error('Invalid communication mode');
  if(environment==='production'&&(httpMode!=='real'||deviceMode!=='real'))throw new Error('Production requires real transports');
  const apiBaseUrl=input.apiBaseUrl??'';
  if(httpMode==='real'&&!/^https:\/\//.test(apiBaseUrl))throw new Error('Real HTTP requires an HTTPS API base URL');
  return {environment,httpMode,deviceMode,apiBaseUrl};
}

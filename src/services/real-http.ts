import { bytesToHex } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { HttpClient, HttpRequest, HttpResponse } from '../lib/core';
import type { CommunicationConfig } from './config';
import { FetchHttpClient, type HttpFetcher } from './http';
import { ApiError } from './models';
import { realEnvelope, realResponseData } from './real-api-data';

type RealHttpConfig=Pick<CommunicationConfig,'apiBaseUrl'|'iotApiBaseUrl'|'tenantID'>;
export function realSessionScope(config:RealHttpConfig) {
  const scope=JSON.stringify([config.apiBaseUrl,config.iotApiBaseUrl??config.apiBaseUrl,config.tenantID??null]);
  return bytesToHex(sha256(new TextEncoder().encode(scope)));
}
export class RealHttpClient implements HttpClient {
  private platform:FetchHttpClient;
  private iot:FetchHttpClient;
  private tenantID?:string;
  constructor(config:RealHttpConfig,fetcher:HttpFetcher=fetch) {
    for(const root of [config.apiBaseUrl,config.iotApiBaseUrl??config.apiBaseUrl]){
      const url=new URL(root);
      if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)
        throw new Error('真实模块根必须是无凭据、查询和片段的HTTPS地址');
      if(/\/app-api\/?$/.test(url.pathname))throw new Error('请配置模块根地址，不要包含/app-api');
    }
    this.tenantID=config.tenantID;
    this.platform=new FetchHttpClient(config.apiBaseUrl,fetcher);
    this.iot=new FetchHttpClient(config.iotApiBaseUrl??config.apiBaseUrl,fetcher);
  }
  async request<T>(req:HttpRequest):Promise<HttpResponse<T>> {
    if(req.signal?.aborted)throw new ApiError(499,'操作已取消');
    if(!this.tenantID||!/^\d+$/.test(this.tenantID))throw new ApiError(503,'请配置后端提供的ROWAN_TENANT_ID');
    if(!req.path.startsWith('/api/app/'))throw new ApiError(400,'接口不属于App通信边界');
    const isIot=/^\/api\/app\/(?:device(?:s)?(?:\/|$)|products?(?:\/|$)|plugins?(?:\/|$)|user\/(?:locations|device-shares)(?:\/|$))/.test(req.path);
    const body=req.method==='PUT'&&/^\/api\/app\/devices\/[^/]+\/location$/.test(req.path)&&
      (req.body as {id?:unknown}|undefined)?.id===null?{}:req.body;
    const response=await (isIot?this.iot:this.platform).request<unknown>({...req,
      path:req.path.replace(/^\/api\/app\//,'/app-api/'),body,
      headers:{...req.headers,'tenant-id':this.tenantID}});
    if(req.signal?.aborted)throw new ApiError(499,'操作已取消');
    const envelope=realEnvelope(response.data,response.status);
    if(envelope.success)envelope.data=realResponseData(req,envelope.data);
    return {...response,data:envelope as T};
  }
}

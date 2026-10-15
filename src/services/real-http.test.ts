import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiEnvelope, type Product } from './models';
import { communicationConfig } from './config';
import { RealHttpClient, realSessionScope } from './real-http';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase, defaultSettings } from './store';
import { AddDeviceFlow } from './onboarding';
import { MockDeviceTransport } from '../protocol/device';
import type { HttpFetcher } from './http';

const config={apiBaseUrl:'https://platform.example.test',iotApiBaseUrl:'https://iot.example.test/module',tenantID:'42'};
const ok=(data:unknown)=>({code:0,message:'成功',success:true,data});
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const view={deviceNickname:null,online:true,bindingRole:'sa',device:{id:'dev_test',name:'Factory name',mac:'aabbccddeeff'}};
function setup(data:unknown=ok({})){
  const fetcher=vi.fn<HttpFetcher>().mockImplementation(async()=>response(data));
  return {fetcher,client:new RealHttpClient(config,fetcher)};
}

describe('真实HTTP边界',()=>{
  it.each([
    ['/api/app/session','https://platform.example.test/app-api/session'],
    ['/api/app/user/setting','https://platform.example.test/app-api/user/setting'],
    ['/api/app/devices','https://iot.example.test/module/app-api/devices'],
    ['/api/app/device/connection','https://iot.example.test/module/app-api/device/connection'],
    ['/api/app/products/prd/thing-model','https://iot.example.test/module/app-api/products/prd/thing-model'],
    ['/api/app/user/locations','https://iot.example.test/module/app-api/user/locations'],
  ])('routes %s to the configured module, without guessing gateway prefixes',async(path,url)=>{
    const {fetcher,client}=setup({code:403,msg:'not authorized',data:null});
    await client.request({method:'GET',path,headers:{Authorization:'Bearer public-fixture','Accept-Language':'en','tenant-id':'wrong'},query:{skip:undefined}});
    expect(fetcher).toHaveBeenCalledWith(url,expect.objectContaining({headers:expect.objectContaining({'tenant-id':'42',Authorization:'Bearer public-fixture','Accept-Language':'en'})}));
  });
  it('preserves query encoding and abort signal',async()=>{
    const {client,fetcher}=setup(ok({userID:'user',deviceID:'dev',bindingRole:'sa'})),controller=new AbortController();
    await client.request({method:'GET',path:'/api/app/device/bindStatus',query:{bindCode:'a+b/&'},signal:controller.signal});
    expect(fetcher.mock.calls[0][0]).toBe('https://iot.example.test/module/app-api/device/bindStatus?bindCode=a%2Bb%2F%26');
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
  it('omits absent tenants and preserves the actual gateway denial',async()=>{
    const fetcher=vi.fn<HttpFetcher>().mockResolvedValue(response({code:400,msg:'请求的租户标识未传递',data:null})),client=new RealHttpClient({...config,tenantID:undefined},fetcher);
    const result=await client.request<ApiEnvelope<unknown>>({method:'GET',path:'/api/app/devices'});
    expect(result.data).toMatchObject({code:400,success:false});
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty('tenant-id');
  });
  it('rejects HTTP, embedded credentials and ambiguous app-api roots',()=>{
    for(const apiBaseUrl of ['http://api.example.test','https://u:p@api.example.test','https://api.example.test/app-api'])
      expect(()=>new RealHttpClient({...config,apiBaseUrl})).toThrow();
    expect(()=>communicationConfig({httpMode:'real',apiBaseUrl:config.apiBaseUrl,iotApiBaseUrl:'http://iot.example.test'})).toThrow('HTTPS');
    expect(()=>communicationConfig({tenantID:'not-issued'})).toThrow('integer');
  });
  it('does not normalize cancelled late results even if fetch ignores abort',async()=>{
    let resolve!:(value:Response)=>void;
    const fetcher=vi.fn<HttpFetcher>().mockImplementation(()=>new Promise(done=>{resolve=done;}));
    const client=new RealHttpClient(config,fetcher),controller=new AbortController();
    const pending=client.request({method:'GET',path:'/api/app/devices',signal:controller.signal});
    controller.abort();resolve(response(ok([])));
    await expect(pending).rejects.toMatchObject({code:499});
  });
  it('keeps gateway failures and explicit success=false',async()=>{
    const {client}=setup({code:401,msg:'账号未登录',data:null});
    expect((await client.request<ApiEnvelope<unknown>>({method:'GET',path:'/api/app/devices'})).data).toMatchObject({code:401,success:false,message:'账号未登录'});
    const failed=setup({code:0,success:false,message:'not confirmed',data:[]});
    expect((await failed.client.request<ApiEnvelope<unknown>>({method:'GET',path:'/api/app/devices'})).data.success).toBe(false);
    await expect(setup({data:[]}).client.request({method:'GET',path:'/api/app/devices'})).rejects.toMatchObject({code:502});
  });
  it('never falls back to fixtures after network or malformed data errors',async()=>{
    const fetcher=vi.fn<HttpFetcher>().mockRejectedValue(new Error('offline'));
    await expect(new RealHttpClient(config,fetcher).request({method:'GET',path:'/api/app/devices'})).rejects.toThrow('offline');
    await expect(setup(ok({})).client.request({method:'GET',path:'/api/app/devices'})).rejects.toMatchObject({code:502});
  });
  it('keeps all product capabilities and does not invent Bluetooth from a list',async()=>{
    const data={id:'prd',name:'Device',modelName:'MODEL',image:['https://img.example.test/one'],configType:['A','B','C'],connectType:'wifi'};
    const list=setup(ok([{category:'Dehumidifier',products:[data]}]));
    const groups=(await list.client.request<ApiEnvelope<{products:Product[]}[]>>({method:'GET',path:'/api/app/products'})).data.data;
    expect(groups[0].products[0]).toMatchObject({id:'prd',category:'Dehumidifier',configTypes:['A','B','C'],image:'https://img.example.test/one'});
    expect(groups[0].products[0].bluetooth).toBeUndefined();
    expect(groups[0].products[0].sort).toBeUndefined();
    expect(groups[0].products[0].recommended).toBeUndefined();
    const detail=setup(ok({...data,bluetooth:true,category:'Dehumidifier'}));
    const product=(await detail.client.request<ApiEnvelope<Product>>({method:'GET',path:'/api/app/products/prd'})).data.data;
    expect(product.bluetooth).toBe(true);expect(product.configTypes).toEqual(['A','B','C']);
    const db=await MockDatabase.open(new MemoryStorage()),driver=new MockDeviceTransport(db,{delay:0});
    const service=new RowanService(detail.client,new MemoryStorage());
    service.session={accessToken:'a',refreshToken:'r',userID:'u',tokenType:'Bearer',expiresIn:1,setting:defaultSettings()};
    const flow=new AddDeviceFlow(service,driver,{mode:'mock'});
    await flow.select({handle:'handle',mac:'aabbccddeeff',model:'MODEL',service:'0822',rssi:-50,productID:'prd'});
    expect(flow.state.stage).toBe('selected');flow.stop();
  });
  it('preserves unassigned groups and missing product metadata without making fake capabilities',async()=>{
    const {client}=setup(ok([{room:null,devices:[view]}]));
    const service=new RowanService(client,new MemoryStorage()),groups=await service.home();
    expect(groups[0].room).toBeNull();expect(groups[0].devices[0].deviceNickname).toBe('Factory name');
    expect(groups[0].devices[0].product).toBeNull();
    expect(groups[0].devices[0].device.thingName).toBeUndefined();
    expect(groups[0].devices[0].device.protocol).toBeUndefined();
    expect(groups[0].devices[0].device.shadowVersion).toBeUndefined();
    await expect(setup(ok({...view,bindingRole:'unknown'})).client.request({method:'GET',path:'/api/app/devices/dev_test'})).rejects.toMatchObject({code:502});
  });
  it('keeps all help articles and optional timestamps',async()=>{
    const {client}=setup(ok([{id:'h1',title:'One',content:'First'},{id:'h2',title:'Two',content:'Second',createdAt:'2026-10-11T00:00:00Z'}]));
    const service=new RowanService(client,new MemoryStorage()),articles=await service.help('prd',true);
    expect(articles.map(a=>a.id)).toEqual(['h1','h2']);expect(articles[0].createdAt).toBeUndefined();
    expect(articles[1].content).toBe('Second');
  });
  it('uses documented omitted room id for clearing, leaving ordinary assignments intact',async()=>{
    const {client,fetcher}=setup(ok({})),service=new RowanService(client,new MemoryStorage());
    await service.moveDevice('dev/one',null);
    expect(fetcher.mock.calls[0][0]).toBe('https://iot.example.test/module/app-api/devices/dev%2Fone/location');
    expect(fetcher.mock.calls[0][1]?.body).toBe('{}');
    await service.moveDevice('dev/one','room_real');
    expect(fetcher.mock.calls[1][1]?.body).toBe('{"id":"room_real"}');
  });
  it('does not invent unassigned location from an undocumented empty response',async()=>{
    await expect(setup(ok({})).client.request({method:'GET',path:'/api/app/devices/dev/location'})).rejects.toMatchObject({code:502});
  });
  it('normalizes documented omitted location data but rejects null, empty or invalid room ids',async()=>{
    const {client}=setup({code:0,message:'成功',success:true}),service=new RowanService(client,new MemoryStorage());
    expect(await service.location('dev')).toEqual({id:null,name:''});
    for(const data of [null,{}, {id:7,name:'Not a string'}])
      await expect(setup(ok(data)).client.request({method:'GET',path:'/api/app/devices/dev/location'})).rejects.toMatchObject({code:502});
    const denied=setup({code:1392,msg:'无绑定权限'});
    await expect(new RowanService(denied.client,new MemoryStorage()).location('dev')).rejects.toMatchObject({code:1392});
  });
  it('validates the actual room choices without creating IDs or converting failed reads to empty lists',async()=>{
    const service=new RowanService(setup(ok([{id:'room_actual',name:'Study'}])).client,new MemoryStorage());
    expect((await service.rooms()).rooms).toEqual([{id:'room_actual',name:'Study'}]);
    for(const data of [[{id:12,name:'Bad ID'}],[{id:'room',name:null}],{}])
      await expect(new RowanService(setup(ok(data)).client,new MemoryStorage()).rooms()).rejects.toMatchObject({code:502});
    await expect(new RowanService(setup({code:403,msg:'拒绝'}).client,new MemoryStorage()).rooms()).rejects.toMatchObject({code:403});
  });
  it('passes cancellation and encoded IDs through all settings reads and room writes',async()=>{
    const {client,fetcher}=setup(ok([])),service=new RowanService(client,new MemoryStorage()),controller=new AbortController();
    await service.rooms(controller.signal);await service.members('dev/one',controller.signal);await service.moveDevice('dev/one','room',controller.signal);
    expect(fetcher.mock.calls.map(call=>call[0])).toEqual(['https://iot.example.test/module/app-api/user/locations','https://iot.example.test/module/app-api/devices/dev%2Fone/users','https://iot.example.test/module/app-api/devices/dev%2Fone/location']);
    expect(fetcher.mock.calls.every(call=>call[1]?.signal===controller.signal)).toBe(true);
  });
  it('rejects unrecognised model structure rather than allowing Mock fields to enable control',async()=>{
    const result=ok({version:'v1',attributes:[{code:'power',dataType:'bool'}],services:[],events:[]});
    await expect(setup(result).client.request({method:'GET',path:'/api/app/products/prd/thing-model'})).rejects.toMatchObject({code:503});
  });
  it('isolates session namespaces across tenants and module roots',()=>{
    expect(realSessionScope(config)).not.toBe(realSessionScope({...config,tenantID:'43'}));
    expect(realSessionScope(config)).not.toBe(realSessionScope({...config,iotApiBaseUrl:'https://other.example.test'}));
    expect(realSessionScope(config)).toBe(realSessionScope({...config}));
  });
  it('obtains actual user settings when login omits them, then persists the complete session',async()=>{
    const storage=new MemoryStorage(),setting=defaultSettings();
    const fetcher=vi.fn<HttpFetcher>()
      .mockResolvedValueOnce(response(ok({accessToken:'access',refreshToken:'refresh',userID:'user',tokenType:'Bearer',expiresIn:3600})))
      .mockResolvedValueOnce(response(ok(setting)));
    const service=new RowanService(new RealHttpClient(config,fetcher),storage);
    await service.login('test@example.test','public-test','password');
    expect(fetcher.mock.calls[1][0]).toBe('https://platform.example.test/app-api/user/setting');
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({Authorization:'Bearer access','tenant-id':'42'});
    expect(service.session?.setting).toEqual(setting);expect(storage.values.has('session')).toBe(true);
  });
  it('does not persist an incomplete login after settings retrieval fails',async()=>{
    const storage=new MemoryStorage(),fetcher=vi.fn<HttpFetcher>()
      .mockResolvedValueOnce(response(ok({accessToken:'access',refreshToken:'refresh',userID:'user'})))
      .mockResolvedValueOnce(response({code:503,msg:'settings unavailable',data:null}));
    const service=new RowanService(new RealHttpClient(config,fetcher),storage);
    await expect(service.login('test@example.test','public-test','password')).rejects.toBeInstanceOf(ApiError);
    expect(service.session).toBeNull();expect(storage.values.has('session')).toBe(false);
  });
});

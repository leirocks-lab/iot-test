import { describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from './http';
import type { ApiEnvelope, Language } from './models';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase } from './store';

async function setup(){
  const db=await MockDatabase.open(new MemoryStorage()),http=new MockHttpClient(db);
  const service=new RowanService(http,new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
  return {db,http,service};
}
const path='/api/app/products/prd_humidity/connectHelping';
describe('PAIR-07 Mock contract',()=>{
  it.each([
    ['zh-CN','配网帮助','蓝牙'],['zh-TW','配網幫助','藍牙'],['en','Pairing help','Bluetooth'],
  ] as const)('returns existing text in %s with product and language request',async(language,title,word)=>{
    const {http,service}=await setup();service.session!.setting.language=language as Language;
    const request=vi.spyOn(http,'request'),result=await service.help('prd_humidity',true);
    expect(result.title).toBe(title);expect(result.content).toContain(word);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({method:'GET',path,query:{type:'text'},headers:expect.objectContaining({'Accept-Language':language})}));
  });
  it.each(['missing','bare','refresh','expired','invalid'] as const)('rejects %s authorization instead of serving public help',async(kind)=>{
    const {db,http,service}=await setup();const session=service.session!;
    const headers:Record<string,string>={};
    if(kind==='bare')headers.Authorization=session.accessToken;
    if(kind==='refresh')headers.Authorization='Bearer '+session.refreshToken;
    if(kind==='invalid')headers.Authorization='Bearer invalid';
    if(kind==='expired'){db.state.tokens[session.accessToken].expiresAt=0;headers.Authorization='Bearer '+session.accessToken;}
    const response=await http.request<ApiEnvelope<unknown>>({method:'GET',path,query:{type:'text'},headers});
    expect(response.status).toBe(401);expect(response.data).toMatchObject({success:false,code:401});
  });
  it('preserves unknown-product errors and existing product-detail Mock behavior',async()=>{
    const {http,service}=await setup();
    await expect(service.help('missing-product',true)).rejects.toMatchObject({code:404});
    const response=await http.request<ApiEnvelope<{id:string}>>({method:'GET',path:'/api/app/products/prd_humidity'});
    expect(response.status).toBe(200);expect(response.data.data.id).toBe('prd_humidity');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { communicationConfig } from './config';
import { RealHttpClient } from './real-http';
import { FetchHttpClient } from './http';
import { RowanService } from './rowan';
import { MemoryStorage } from './store';

const testConfig={environment:'development',apiBaseUrl:'http://47.107.80.36',iotApiBaseUrl:'http://47.107.80.36/iot',tenantID:'42'};
const reply=(data:unknown,code=0)=>new Response(JSON.stringify({code,data,msg:code?'failed':'ok'}));

describe('confirmed development HTTP environment',()=>{
  it('routes real platform and IoT calls with the issued tenant without using Mock',async()=>{
    const config=communicationConfig({...testConfig,httpMode:'real',deviceMode:'mock'});
    const fetcher=vi.fn().mockResolvedValueOnce(reply({configVersion:'live'})).mockResolvedValueOnce(reply([]));
    const service=new RowanService(new RealHttpClient(config,fetcher),new MemoryStorage());
    expect(await service.config('android')).toEqual({configVersion:'live'});
    expect(await service.home()).toEqual([]);
    expect(fetcher.mock.calls.map(call=>new URL(call[0]).pathname)).toEqual(['/app-api/config','/iot/app-api/devices']);
    expect(fetcher.mock.calls.every(call=>call[1].headers['tenant-id']==='42')).toBe(true);
  });
  it('allows development/preview HTTP roots while rejecting production HTTP and malformed roots',()=>{
    for(const environment of ['development','preview'])
      for(const apiBaseUrl of ['http://47.107.80.37','http://47.107.80.36:8080','http://47.107.80.36/other'])
        expect(()=>communicationConfig({...testConfig,environment,httpMode:'real',apiBaseUrl})).not.toThrow();
    expect(()=>communicationConfig({...testConfig,environment:'production',httpMode:'real',deviceMode:'real'})).toThrow();
    for(const apiBaseUrl of ['http://u:p@47.107.80.36','http://47.107.80.36?x=1'])
      expect(()=>communicationConfig({...testConfig,httpMode:'real',apiBaseUrl})).toThrow();
    expect(()=>new RealHttpClient({...testConfig,environment:'production'})).toThrow();
    expect(()=>new FetchHttpClient('http://47.107.80.36')).toThrow();
  });
  it.each(['register','login','forget'] as const)('sends the documented language query for %s',async purpose=>{
    const fetcher=vi.fn().mockResolvedValue(reply(null));
    const service=new RowanService(new RealHttpClient({apiBaseUrl:'https://platform.test',tenantID:'42'},fetcher),new MemoryStorage());
    await service.sendCaptcha('zhanglei@verveso.com',purpose);
    const url=new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get('language')).toBe('zh-CN');
    expect(url.searchParams.get('captchaType')).toBe(purpose);
    expect(url.searchParams.get('account')).toBe('zhanglei@verveso.com');
  });
  it('omits an unspecified tenant instead of blocking the confirmed registration flow locally',async()=>{
    const fetcher=vi.fn().mockResolvedValue(reply(null));
    const service=new RowanService(new RealHttpClient({apiBaseUrl:'https://platform.test'},fetcher),new MemoryStorage());
    await service.sendCaptcha('zhanglei@verveso.com','register');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('tenant-id');
  });
});

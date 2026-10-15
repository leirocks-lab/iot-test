import { expect, it, vi } from 'vitest';
import { RowanService } from './rowan';
import { MemoryStorage } from './store';
import { ApiError } from './models';

it('uses a last valid startup configuration after failure, isolated by platform',async()=>{
  const storage=new MemoryStorage(),http={request:vi.fn()};
  const service=new RowanService(http,storage);
  http.request.mockResolvedValueOnce({status:200,data:{code:0,success:true,data:{configVersion:'one'}}});
  expect(await service.startupConfig('android')).toEqual({configVersion:'one'});
  http.request.mockRejectedValue(new Error('offline'));
  expect(await service.startupConfig('android')).toEqual({configVersion:'one'});
  expect(await service.startupConfig('ios')).toBeNull();
});
it('does not let cached settings bypass an explicitly disabled app version',async()=>{
  const http={request:vi.fn()},service=new RowanService(http,new MemoryStorage());
  http.request.mockResolvedValueOnce({status:200,data:{code:0,success:true,data:{configVersion:'one'}}});
  await service.startupConfig('android');
  http.request.mockResolvedValueOnce({status:200,data:{code:1802,success:false,message:'版本禁用'}});
  await expect(service.startupConfig('android')).rejects.toMatchObject({code:1802});
});
it('does not block the account entry when no valid cache exists or storage fails',async()=>{
  const storage=new MemoryStorage(),service=new RowanService({request:vi.fn().mockRejectedValue(new ApiError(0,'offline'))},storage);
  storage.values.set('startup.android','{"invalid":true}');
  expect(await service.startupConfig('android')).toBeNull();
  vi.spyOn(storage,'get').mockRejectedValue(new Error('storage unavailable'));
  expect(await service.startupConfig('android')).toBeNull();
});

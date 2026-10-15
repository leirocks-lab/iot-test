import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './models';
import { MockHttpClient } from './http';
import { encodeProductCode, encodeShareCode, parseRowanCandidates } from './qr';
import { QrScanCoordinator, QrScanFlow } from './scan-flow';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase } from './store';
import { observeNetwork, wifiGuidance } from './network-policy';

async function setup() {
  const db=await MockDatabase.open(new MemoryStorage()),service=new RowanService(new MockHttpClient(db),new MemoryStorage());
  await service.login('rowan@example.com', 'Rowan@123', 'password');
  return { db, service, flow: new QrScanFlow(service, 'mock') };
}
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
describe('扫码及相册共用业务流程',()=>{
  it('acquires a fresh scanner on same-user login revision while keeping old confirmations invalid',async()=>{
    const {service}=await setup(),coordinator=new QrScanCoordinator(service,'mock'),old=coordinator.acquire();old.read([encodeProductCode('prd_wine')]);const user=service.userID;
    await service.login('rowan@example.com','Rowan@123','password');expect(service.userID).toBe(user);await expect(old.confirm()).rejects.toMatchObject({code:499});const next=coordinator.acquire();expect(next).not.toBe(old);expect(next.state.phase).toBe('idle');next.read([encodeProductCode('prd_humidity')]);expect(await next.confirm()).toEqual({productID:'prd_humidity'});coordinator.clear();
  });
  it('filters invalid barcodes and deduplicates valid candidates without auto-binding a multi-code image',async()=>{
    const {flow,service}=await setup(),first=encodeProductCode('prd_wine'),second=encodeProductCode('prd_humidity');
    flow.read(['not a code',first,first,second]);expect(flow.state.choices).toHaveLength(2);expect(flow.state.selected).toBeUndefined();
    await expect(flow.confirm()).rejects.toMatchObject({code:409});flow.choose(1);
    const detail=vi.spyOn(service,'product');expect(await flow.confirm()).toEqual({productID:'prd_humidity'});expect(detail).toHaveBeenCalledOnce();
  });
  it('recovers from invalid codes and pauses subsequent camera frames after one candidate',async()=>{
    const {flow}=await setup();flow.read(['[]']);expect(flow.state.error).toContain('没有有效');
    flow.read([encodeProductCode('prd_wine')]);flow.read([encodeProductCode('prd_humidity')]);expect(flow.state.choices[0].label).toBe('prd_wine');
    flow.reset();expect(flow.state.phase).toBe('idle');
  });
  it('does not allow mock QR contracts in real HTTP mode',async()=>{
    const {service}=await setup(),flow=new QrScanFlow(service,'real'),bind=vi.spyOn(service,'acceptShare');
    flow.read([encodeProductCode('prd_wine')]);expect(flow.state.phase).toBe('idle');expect(flow.state.error).toContain('正式');expect(bind).not.toHaveBeenCalled();
  });
  it('shares an injected real parser across camera/image candidates without defining a production format',async()=>{
    const {service}=await setup(),parser=vi.fn((value:string)=>{if(value==='fixture-wine')return {type:'product' as const,productID:'prd_wine'};if(value==='fixture-humidity')return {type:'product' as const,productID:'prd_humidity'};throw new Error('invalid fixture');}),flow=new QrScanFlow(service,'real',parser);
    flow.read(['fixture-wine','invalid','fixture-humidity','fixture-wine']);expect(flow.state.choices).toHaveLength(2);expect(flow.state.selected).toBeUndefined();
    flow.choose(1);expect(await flow.confirm()).toEqual({productID:'prd_humidity'});expect(parser).toHaveBeenCalledTimes(4);
  });
  it('isolates a QR result from a same-account re-login',async()=>{
    const {service,flow}=await setup();flow.read([encodeProductCode('prd_wine')]);const product=vi.spyOn(service,'product');
    await service.login('rowan@example.com','Rowan@123','password');await expect(flow.confirm()).rejects.toMatchObject({code:499});expect(product).not.toHaveBeenCalled();
  });
  it('prevents duplicate confirmation while product lookup is in flight',async()=>{
    const {flow,service}=await setup();let resolve!:()=>void;
    vi.spyOn(service,'product').mockImplementation(()=>new Promise(done=>{resolve=()=>done({} as Awaited<ReturnType<typeof service.product>>);}));
    flow.read([encodeProductCode('prd_wine')]);const task=flow.confirm();await expect(flow.confirm()).rejects.toMatchObject({code:409});resolve();await task;
  });
  it('discards late product responses when leaving the scanner',async()=>{
    const {flow,service}=await setup();let resolve!:(value:Awaited<ReturnType<typeof service.product>>)=>void;
    vi.spyOn(service,'product').mockImplementation(()=>new Promise(done=>{resolve=done;}));flow.read([encodeProductCode('prd_wine')]);
    const task=flow.confirm(),rejected=expect(task).rejects.toMatchObject({code:499});flow.stop();await rejected;resolve({} as Awaited<ReturnType<typeof service.product>>);
    expect(flow.state.phase).toBe('choosing');
  });
  it('keeps binding timeout unknown and reconciles via GET without replaying a single-use code',async()=>{
    const {flow,service}=await setup();const share=await service.share('dev_wine');flow.read([encodeShareCode(share)]);
    const bind=vi.spyOn(service,'acceptShare').mockRejectedValue(new ApiError(0,'结果未知'));
    vi.spyOn(service, 'home').mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(flow.confirm()).rejects.toMatchObject({code:0});expect(flow.state.phase).toBe('unknown');
    expect(()=>flow.reset()).toThrow('核对');await expect(flow.confirm()).rejects.toMatchObject({code:409});
    await expect(flow.reconcile()).rejects.toMatchObject({ code: 409 });
    expect(flow.state.phase).toBe('unknown');
    const destination=await flow.reconcile();expect(destination).toMatchObject({binding:{deviceID:'dev_wine',userID:service.userID}});expect(bind).toHaveBeenCalledOnce();
    expect(JSON.stringify(flow.state)).not.toContain(share.bindCode);
  });
  it('accepts a mock share only after confirmation and consumes its code once', async () => {
    const { db, service: admin } = await setup();
    const share = await admin.share('dev_wine');
    const member = new RowanService(new MockHttpClient(db), new MemoryStorage());
    await member.sendCaptcha('sharee@example.com', 'register');
    await member.register('sharee@example.com', 'Member@123', '123456', 'US');
    await member.login('sharee@example.com', 'Member@123', 'password');
    const flow = new QrScanFlow(member, 'mock');
    const bind = vi.spyOn(member, 'acceptShare');

    flow.read([encodeShareCode(share)]);
    expect(bind).not.toHaveBeenCalled();
    expect((await flow.confirm())).toMatchObject({
      binding: { deviceID: 'dev_wine', userID: member.userID, bindingRole: 'mbr' },
    });
    expect(bind).toHaveBeenCalledOnce();
    const visible = (await member.home())
      .flatMap((group) => group.devices)
      .some((view) => view.device.id === 'dev_wine');
    expect(visible).toBe(true);

    const repeat = new QrScanFlow(member, 'mock');
    repeat.read([encodeShareCode(share)]);
    await expect(repeat.confirm()).rejects.toMatchObject({ code: 1133 });
    expect(repeat.state.phase).toBe('idle');
  });
  it('reads back a lost PAIR-06 response without resubmitting the code', async () => {
    const { db, service: admin } = await setup();
    const share = await admin.share('dev_wine');
    const member = new RowanService(new MockHttpClient(db), new MemoryStorage());
    await member.sendCaptcha('lost@example.com', 'register');
    await member.register('lost@example.com', 'Member@123', '123456', 'US');
    await member.login('lost@example.com', 'Member@123', 'password');
    const flow = new QrScanFlow(member, 'mock');
    flow.read([encodeShareCode(share)]);
    const original = member.acceptShare.bind(member);
    const bind = vi.spyOn(member, 'acceptShare').mockImplementation(async (...args) => {
      await original(...args);
      throw new ApiError(0, '响应丢失');
    });

    expect(await flow.confirm()).toMatchObject({
      binding: { deviceID: 'dev_wine', userID: member.userID, bindingRole: 'mbr' },
    });
    expect(bind).toHaveBeenCalledOnce();
    expect(flow.state.phase).toBe('done');
  });
  it('rejects mismatched binding role/identity results',async()=>{
    const {flow,service}=await setup();const share=await service.share('dev_wine');flow.read([encodeShareCode(share)]);
    vi.spyOn(service,'acceptShare').mockResolvedValue({deviceID:'foreign',userID:service.userID,bindingRole:'sa'});
    await expect(flow.confirm()).rejects.toThrow('不一致');expect(flow.state.phase).toBe('unknown');
  });
  it('shows an expired-code failure without an automatic retry',async()=>{
    const {flow,service}=await setup();flow.read([encodeShareCode({deviceID:'dev_wine',bindCode:'expired'})]);const bind=vi.spyOn(service,'acceptShare').mockRejectedValue(new ApiError(1133,'已过期'));
    await expect(flow.confirm()).rejects.toMatchObject({ code: 1133 });
    expect(flow.state.phase).toBe('idle');
    expect(bind).toHaveBeenCalledOnce();
    await expect(flow.confirm()).rejects.toMatchObject({ code: 409 });
  });
  it('does not fabricate network type, SSID or band from unknown platform fields',()=>{
    expect(observeNetwork({type:'UNKNOWN',isConnected:false})).toMatchObject({connection:'unknown',band:'unknown',source:'system'});
    expect(observeNetwork({type:'WIFI',isConnected:true})).toMatchObject({connection:'wifi',band:'unknown'});
    expect(observeNetwork({type:'VPN',isConnected:true}).connection).toBe('unknown');
    expect(wifiGuidance(observeNetwork({type:'WIFI'}))).toContain('无法读取SSID');
    expect(wifiGuidance(observeNetwork({type:'CELLULAR',isConnected:true}))).toContain('未检测到');
    expect(()=>parseRowanCandidates(['null','[]','bad'])).toThrow('没有有效');
  });
  it('retains an uncertain single-use code across scanner route instances',async()=>{
    const {service}=await setup(),coordinator=new QrScanCoordinator(service,'mock'),flow=coordinator.acquire();
    flow.read([encodeShareCode({deviceID:'dev_wine',bindCode:'unknown_code'})]);vi.spyOn(service,'acceptShare').mockRejectedValue(new ApiError(0,'未知'));
    vi.spyOn(service, 'home').mockResolvedValueOnce([]);
    await expect(flow.confirm()).rejects.toThrow('未知');flow.stop();expect(coordinator.acquire()).toBe(flow);expect(coordinator.acquire().state.phase).toBe('unknown');coordinator.clear();
  });
});

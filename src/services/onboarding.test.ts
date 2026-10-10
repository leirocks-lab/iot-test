import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockDeviceTransport, withBudget } from '../protocol/device';
import { ApiError } from './models';
import { MockHttpClient } from './http';
import { AddDeviceCoordinator, AddDeviceFlow, describeProvisionStatus, validateWifi } from './onboarding';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase } from './store';

async function setup() {
  const db=await MockDatabase.open(new MemoryStorage()),http=new MockHttpClient(db);
  const service=new RowanService(http,new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
  const driver=new MockDeviceTransport(db,{delay:0});
  const flow=new AddDeviceFlow(service,driver,{mode:'mock',bindingTimeout:10000});
  return {db,http,service,driver,flow};
}
async function selected() {
  const context=await setup();await context.flow.scan();await context.flow.select(context.flow.state.discovered[1]);return context;
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('添加设备业务闭环',()=>{
  it('confirms binding through HTTP PAIR-05, skips nickname and checks home/realtime independently',async()=>{
    const {flow,service,driver}=await selected();
    const status=vi.spyOn(service,'bindStatus'),transportQuery=vi.spyOn(driver,'binding'),rename=vi.spyOn(service,'renameDevice');
    await flow.provision('Test Wi-Fi','test');
    expect(status).toHaveBeenCalledOnce();expect(transportQuery).not.toHaveBeenCalled();
    const snapshot=JSON.stringify(flow.state);expect(snapshot).not.toContain(service.session!.accessToken);expect(snapshot).not.toContain('bind-user');
    await flow.finish(null);expect(rename).not.toHaveBeenCalled();
    expect(flow.state).toMatchObject({stage:'complete',nickname:'skipped',visible:true,realtime:'ready'});flow.stop();
  });
  it('polls only 1121 with >=2 second gaps and stops on success',async()=>{
    const {flow,service}=await selected();const read=service.bindStatus.bind(service),times:number[]=[];
    vi.spyOn(service,'bindStatus').mockImplementation(async(code,signal)=>{times.push(Date.now());if(times.length<3)throw new ApiError(1121,'正在绑定');return read(code,signal);});
    vi.useFakeTimers();const task=flow.provision('Test','test');await vi.runAllTimersAsync();await task;
    expect(times).toHaveLength(3);expect(times[1]-times[0]).toBe(3000);expect(times[2]-times[1]).toBe(3000);
    expect(flow.state.stage).toBe('bound');flow.stop();
  });
  it('times out pending binding and reconciles without retransmitting Wi-Fi',async()=>{
    const {flow,service,driver}=await selected();const read=service.bindStatus.bind(service);
    const status=vi.spyOn(service,'bindStatus').mockRejectedValue(new ApiError(1121,'正在绑定')),provision=vi.spyOn(driver,'provision');
    vi.useFakeTimers();const task=flow.provision('Test','test');const rejected=expect(task).rejects.toMatchObject({code:408});
    await vi.runAllTimersAsync();await rejected;
    expect(flow.state.stage).toBe('unknown');await expect(flow.provision('Test','test')).rejects.toMatchObject({code:409});
    status.mockImplementation(read);await flow.reconcile();expect(flow.state.stage).toBe('bound');expect(provision).toHaveBeenCalledOnce();flow.stop();
  });
  it('keeps cloud binding errors unknown and never loops expired codes',async()=>{
    const {flow,service}=await selected();const status=vi.spyOn(service,'bindStatus').mockRejectedValue(new ApiError(1123,'已过期'));
    await expect(flow.provision('Test','test')).rejects.toMatchObject({code:1123});
    expect(status).toHaveBeenCalledOnce();expect(flow.state.stage).toBe('unknown');flow.stop();
  });
  it('keeps nickname failures separate from successful binding and can skip',async()=>{
    const {flow,service,driver}=await selected();await flow.provision('Test','test');
    const provision=vi.spyOn(driver,'provision'),rename=vi.spyOn(service,'renameDevice').mockRejectedValueOnce(new ApiError(500,'昵称未保存'));
    await expect(flow.finish('Bedroom')).rejects.toThrow('昵称未保存');
    expect(flow.state).toMatchObject({stage:'bound',nickname:'pending'});expect(flow.state.binding).toBeDefined();
    await flow.finish(null);expect(rename).toHaveBeenCalledOnce();expect(provision).not.toHaveBeenCalled();flow.stop();
  });
  it('does not resave nickname or rebind when home refresh fails',async()=>{
    const {flow,service,driver}=await selected();await flow.provision('Test','test');
    const rename=vi.spyOn(service,'renameDevice'),home=vi.spyOn(service,'home').mockRejectedValueOnce(new Error('offline')),provision=vi.spyOn(driver,'provision');
    await expect(flow.finish('Office')).rejects.toThrow('offline');expect(flow.state.nickname).toBe('saved');
    await flow.finish(null);expect(rename).toHaveBeenCalledOnce();expect(home).toHaveBeenCalledTimes(2);expect(provision).not.toHaveBeenCalled();flow.stop();
  });
  it('does not fabricate a visible device when HOME-01 does not include it',async()=>{
    const {flow,service}=await selected();await flow.provision('Test','test');
    vi.spyOn(service,'home').mockResolvedValue([]);
    await expect(flow.finish(null)).rejects.toThrow('暂未显示');expect(flow.state.visible).toBe(false);expect(flow.state.binding).toBeDefined();flow.stop();
  });
  it('retains completion if realtime fails and retries realtime only',async()=>{
    const {flow,service}=await selected();await flow.provision('Test','test');
    const mqtt=vi.spyOn(service,'mqtt').mockRejectedValueOnce(new ApiError(401,'凭据失效'));
    await flow.finish(null);expect(flow.state).toMatchObject({stage:'complete',visible:true,realtime:'failed'});
    const home=vi.spyOn(service,'home');await flow.retryRealtime();expect(home).not.toHaveBeenCalled();expect(mqtt).toHaveBeenCalledTimes(2);expect(flow.state.realtime).toBe('ready');flow.stop();
  });
  it('isolates a stopped scan even when the driver ignores abort',async()=>{
    const {flow,driver}=await setup();let resolve!:(devices:Awaited<ReturnType<typeof driver.scan>>)=>void;
    vi.spyOn(driver,'scan').mockImplementation(()=>new Promise(done=>{resolve=done;}));
    const task=flow.scan(),rejected=expect(task).rejects.toMatchObject({code:499});flow.stop();
    await rejected;resolve([{handle:'late',mac:'late',model:'x',service:'0822',rssi:-50}]);await Promise.resolve();
    expect(flow.state.discovered).toHaveLength(0);expect(flow.state.busy).toBe(false);
  });
  it('deduplicates stable identities while preserving same-name devices and first discovery order',async()=>{
    const {flow,driver}=await setup(),sample=(mac:string)=>({handle:mac,mac,model:'same name',service:'0822',rssi:-50});
    vi.spyOn(driver,'scan').mockResolvedValue([sample('AA'),sample('bb'),sample('aa')]);await flow.scan();
    expect(flow.state.discovered.map(device=>device.mac)).toEqual(['AA','bb']);
  });
  it('distinguishes denied permission, Bluetooth off and zero devices',async()=>{
    const {flow,driver}=await setup();driver.fault='permission';await expect(flow.scan()).rejects.toThrow('权限');
    driver.fault='disconnect';await expect(flow.scan()).rejects.toThrow('关闭');
    vi.spyOn(driver,'scan').mockResolvedValue([]);await flow.scan();expect(flow.state.error).toBe('');expect(flow.state.message).toContain('未发现');
  });
  it('refuses unresolved product identity and reloads PAIR-02 before selecting',async()=>{
    const {flow,service}=await setup();const candidate={handle:'a',mac:'80a036d51aad',model:'same',service:'0922',rssi:-50};
    await expect(flow.select(candidate)).rejects.toThrow('产品身份');expect(flow.state.candidate).toBeUndefined();
    const detail=vi.spyOn(service,'product');await flow.select({...candidate,productID:'prd_humidity'});expect(detail).toHaveBeenCalledWith('prd_humidity',expect.any(AbortSignal));
  });
  it('rejects repeated submit during an in-flight provisioning transaction',async()=>{
    const {flow,service}=await selected();let resolve!:(value:Record<string,string>)=>void;
    vi.spyOn(service,'connection').mockImplementation(()=>new Promise(done=>{resolve=done;}));
    const task=flow.provision('Test','test'),rejected=expect(task).rejects.toMatchObject({code:499});
    await expect(flow.provision('Test','test')).rejects.toMatchObject({code:409});flow.stop();resolve({});await rejected;
  });
  it('rejects cross-account binding results and excludes secrets from observable state',async()=>{
    const {flow,service}=await selected();vi.spyOn(service,'bindStatus').mockResolvedValue({deviceID:'foreign',userID:'other-user',bindingRole:'sa'});
    await expect(flow.provision('Test','secretPassword')).rejects.toThrow('身份');
    expect(flow.state.binding).toBeUndefined();expect(JSON.stringify(flow.state)).not.toContain('secretPassword');flow.stop();
  });
  it('rejects reuse of a flow after account switching',async()=>{
    const {flow,service}=await selected();service.session={...service.session!,userID:'another'};
    await expect(flow.scan()).rejects.toMatchObject({code:499});expect(flow.state.candidate).toBeUndefined();
  });
  it('accepts authoritative direct bindings and never rebinds on finish',async()=>{
    const {flow,service}=await setup();flow.adoptBinding({deviceID:'dev_wine',userID:service.userID,bindingRole:'sa'});
    await flow.finish(null);expect(flow.state.stage).toBe('complete');flow.stop();
  });
  it('keeps real Wi-Fi/profile limitations explicit and validates mock input byte limits',()=>{
    expect(()=>validateWifi('Test','password','real')).toThrow('尚未接入');
    expect(()=>validateWifi('网'.repeat(11),'test','mock')).toThrow('32字节');
    expect(()=>validateWifi('Test','','mock')).toThrow('模拟');
    expect(()=>validateWifi('Test','test','mock')).not.toThrow();
    expect(describeProvisionStatus('A1')).toBe('连接家庭 Wi-Fi · 进行中');
    expect(describeProvisionStatus('F0')).toBe('连接设备服务器 · 已完成');
  });
  it('settles budgets immediately on cancellation even if work never cooperates',async()=>{
    const controller=new AbortController();const task=withBudget(()=>new Promise(()=>undefined),60000,'timeout',controller.signal);
    const rejected=expect(task).rejects.toMatchObject({code:499});controller.abort();await rejected;
  });
  it('resumes an uncertain transaction across route instances until the account changes',async()=>{
    const {service,driver}=await setup(),coordinator=new AddDeviceCoordinator(service,driver,{mode:'mock'}),flow=coordinator.acquire();
    await flow.scan();await flow.select(flow.state.discovered[1]);
    vi.spyOn(service,'bindStatus').mockRejectedValue(new ApiError(0,'未知'));
    await expect(flow.provision('Test','test')).rejects.toThrow('未知');flow.stop();
    expect(coordinator.acquire()).toBe(flow);expect(coordinator.acquire().state.stage).toBe('unknown');
    service.session={...service.session!,userID:'another'};expect(coordinator.acquire()).not.toBe(flow);coordinator.clear();
  });
  it('keeps a specific device failure stage and permits explicit retry after a Wi-Fi failure',async()=>{
    const {flow,driver}=await selected();driver.fault='wifi-password';
    await expect(flow.provision('Test','wrong')).rejects.toMatchObject({code:0xa4});
    expect(flow.state.stage).toBe('failed');expect(flow.state.deviceStep).toBe('连接家庭 Wi-Fi · 异常（A4）');
    driver.fault='none';await flow.provision('Test','correct');expect(flow.state.stage).toBe('bound');flow.stop();
  });
  it('releases volatile Wi-Fi handshake context after completion while retaining cloud result lookup',async()=>{
    const {flow,service,driver}=await selected();const exchange=vi.spyOn(driver,'exchange');await flow.provision('Test','private-password');
    const input=exchange.mock.calls[0][0];await expect(driver.challenge(input)).rejects.toThrow('尚未校验');
    expect((await service.bindStatus(input.bindCode)).deviceID).toBe(flow.state.binding!.deviceID);flow.stop();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockDeviceTransport, ProvisionNotSentError, withBudget } from '../protocol/device';
import type { DiscoveredDevice } from '../protocol/ble';
import { ApiError } from './models';
import { MockHttpClient } from './http';
import { AddDeviceCoordinator, AddDeviceFlow, describeProvisionStatus, matchesDiscoveredProduct, provisionProgress, validateWifi } from './onboarding';
import { RowanService } from './rowan';
import { MemoryStorage, MockDatabase } from './store';
import { Provisioner0822 } from '../protocol/provision-0822';
import { deviceDiscoveryConfig } from '../config/device-discovery';

async function setup() {
  const db=await MockDatabase.open(new MemoryStorage()),http=new MockHttpClient(db);
  const service=new RowanService(http,new MemoryStorage());await service.login('rowan@example.com','Rowan@123','password');
  const driver=new MockDeviceTransport(db,{delay:0});
  const flow=new AddDeviceFlow(service,driver,{mode:'mock',scanTimeout:10,bindingTimeout:10000});
  return {db,http,service,driver,flow};
}
async function selected() {
  const context=await setup();await context.flow.scan();await context.flow.select(context.flow.state.discovered[1]);return context;
}
describe('P1审计：扫描与发送证据',()=>{
  it.each(['incremental','empty','early-result'] as const)('keeps a default scan active for the full minute: %s',async(kind)=>{
    const {service,driver}=await setup(),flow=new AddDeviceFlow(service,driver,{mode:'mock'});
    const candidate={handle:'fixture',mac:'80a036d51aad',model:'RW-DH01',service:'0822',productID:'prd_humidity'};
    const scan=vi.spyOn(driver,'scan');
    if(kind!=='incremental')scan.mockResolvedValue(kind==='empty'?[]:[candidate]);
    vi.useFakeTimers();const task=flow.scan();
    await vi.advanceTimersByTimeAsync(59999);
    expect(scan).toHaveBeenCalledWith(expect.any(AbortSignal),expect.any(Function),60000);
    expect(flow.state).toMatchObject({stage:'scanning',busy:true,error:''});
    expect(flow.state.discovered).toHaveLength(kind==='empty'?0:kind==='incremental'?2:1);
    await vi.advanceTimersByTimeAsync(1);await task;
    expect(flow.state).toMatchObject({stage:'idle',busy:false,error:''});
    expect(flow.state.discovered).toHaveLength(kind==='empty'?0:kind==='incremental'?2:1);
    if(kind==='empty')expect(flow.state.message).toContain('未发现');
    flow.stop();
  });
  it('uses the configured duration on every retry and immediately cancels the current window',async()=>{
    const {service,driver}=await setup(),flow=new AddDeviceFlow(service,driver,{mode:'mock',scanTimeout:120000});
    let report:(device:DiscoveredDevice)=>void=()=>undefined,signal:AbortSignal|undefined;
    vi.spyOn(driver,'scan').mockImplementation(async(current,onDiscovered,duration)=>{
      signal=current;report=onDiscovered!;expect(duration).toBe(120000);return [];
    });
    vi.useFakeTimers();const first=flow.scan();await vi.advanceTimersByTimeAsync(60000);
    expect(flow.state.stage).toBe('scanning');const oldReport=report;
    const rejected=expect(first).rejects.toMatchObject({code:499});flow.stop();await rejected;
    expect(signal?.aborted).toBe(true);expect(flow.state.busy).toBe(false);
    const next=flow.scan();await vi.advanceTimersByTimeAsync(119999);
    oldReport({handle:'late',mac:'late',model:'RW-DH01',service:'0822'});
    expect(flow.state).toMatchObject({stage:'scanning',discovered:[]});
    await vi.advanceTimersByTimeAsync(1);await next;expect(flow.state.stage).toBe('idle');
    expect(signal?.aborted).toBe(true);flow.stop();
  });
  it('reads the shared scan configuration and rejects invalid durations before scanning',async()=>{
    const {service,driver}=await setup();
    const original=deviceDiscoveryConfig.scanDurationMs;
    try {
      deviceDiscoveryConfig.scanDurationMs=45000;
      const flow=new AddDeviceFlow(service,driver,{mode:'mock'}),scan=vi.spyOn(driver,'scan').mockResolvedValue([]);
      vi.useFakeTimers();const task=flow.scan();await vi.advanceTimersByTimeAsync(44999);expect(flow.state.stage).toBe('scanning');
      await vi.advanceTimersByTimeAsync(1);await task;expect(scan).toHaveBeenCalledWith(expect.any(AbortSignal),expect.any(Function),45000);
      for(const scanTimeout of [0,-1,NaN,Infinity,1.5,2147483648])expect(()=>new AddDeviceFlow(service,driver,{mode:'mock',scanTimeout})).toThrow('正整数');
      flow.stop();
    } finally {deviceDiscoveryConfig.scanDurationMs=original;}
  });
  it('replaces an unsent different-product target but preserves same-product help and binding facts',async()=>{
    const {flow,service}=await selected(),original=flow.state.candidate!,same=flow.state.product!;flow.adoptProduct(same);expect(flow.state.candidate).toBe(original);
    const other=await service.product('prd_wine');flow.adoptProduct(other);expect(flow.state.candidate).toBeUndefined();expect(flow.state.product).toBeUndefined();expect(flow.state.stage).toBe('idle');
    flow.adoptBinding({deviceID:'dev_wine',userID:service.userID,bindingRole:'sa'});flow.adoptProduct(same);expect(flow.state.binding?.deviceID).toBe('dev_wine');flow.stop();
  });
  it('retains incremental discoveries on the outer scan deadline and ignores late old callbacks',async()=>{
    const {service,driver}=await setup(),flow=new AddDeviceFlow(service,driver,{mode:'mock',scanTimeout:25});let report:(device:DiscoveredDevice)=>void=()=>undefined;
    vi.spyOn(driver,'scan').mockImplementation((_signal,onDiscovered)=>{report=onDiscovered!;report({handle:'fixture',mac:'80a036d51aad',model:'RW-DH01',service:'0822',productID:'prd_humidity'});return new Promise(()=>undefined);});
    vi.useFakeTimers();const scanning=flow.scan();await vi.advanceTimersByTimeAsync(26);await scanning;expect(flow.state).toMatchObject({stage:'idle',scanIssue:'timeout',busy:false});expect(flow.state.discovered).toHaveLength(1);
    report({handle:'late',mac:'80a036d51aae',model:'RW-DH01',service:'0822'});expect(flow.state.discovered).toHaveLength(1);vi.useRealTimers();await flow.select(flow.state.discovered[0]);expect(flow.state.stage).toBe('selected');flow.stop();
  });
  it.each([[403,'permission'],[61,'bluetooth']] as const)('classifies scan error %s so the page can offer the appropriate settings recovery',async(code,scanIssue)=>{
    const {flow,driver}=await setup();vi.spyOn(driver,'scan').mockRejectedValue(new ApiError(code,'scan fixture'));await expect(flow.scan()).rejects.toMatchObject({code});expect(flow.state).toMatchObject({stage:'failed',scanIssue,discovered:[]});flow.stop();
  });
  it.each([false,true])('distinguishes certified local rejection from a 503 after an attempted write: %s',async written=>{
    const {service,driver}=await setup(),flow=new AddDeviceFlow(service,driver,{mode:'real',wifi:{read:async()=>({source:'system',connection:'wifi',ssid:'Test',band:'unknown'})},real:{profile:{factoryReply:new Uint8Array([1]),stageTimeout:60000},bindingTimeout:30000,operationTimeout:165000,makeBindCode:async()=> 'provided-fixture',validatePassword:()=>undefined,deviceToken:token=>token}});
    await flow.select({handle:'fixture',mac:'80a036d51aad',model:'RW-DH01',service:'0822'},'prd_humidity');vi.spyOn(Provisioner0822.prototype,'run').mockImplementation(async(_input,status,_signal,_confirm,submitted)=>{status('校验设备');if(written){submitted!();throw new ApiError(503,'reported fixture failure after write');}throw new ProvisionNotSentError(new ApiError(503,'local MTU fixture'));});
    await expect(flow.provision('Test','public-password')).rejects.toMatchObject({code:503});expect(flow.state.stage).toBe(written?'unknown':'failed');if(written)expect(()=>flow.reset()).toThrow('核对');else{expect(()=>flow.reset()).not.toThrow();expect(flow.state.stage).toBe('idle');}flow.stop();
  });
});
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
    const provision=vi.spyOn(driver,'provision'),rename=vi.spyOn(service,'renameDevice').mockRejectedValueOnce(new ApiError(400,'昵称未保存'));
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
  it('rejects an overlength nickname without losing binding and retries only the result',async()=>{
    const {flow,service,driver}=await selected();const provision=vi.spyOn(driver,'provision');
    await flow.provision('Test','test');const binding=flow.state.binding,rename=vi.spyOn(service,'renameDevice');
    await expect(flow.finish('123456789012345678901')).rejects.toMatchObject({code:400});
    expect(rename).not.toHaveBeenCalled();expect(flow.state.binding).toEqual(binding);
    expect(flow.state).toMatchObject({stage:'bound',nickname:'pending'});
    await flow.finish('Office');expect(rename).toHaveBeenCalledOnce();expect(provision).toHaveBeenCalledOnce();
    expect(flow.state).toMatchObject({stage:'complete',nickname:'saved',visible:true});flow.stop();
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
  it('validates mock input byte limits and describes device stages',()=>{
    expect(()=>validateWifi('网'.repeat(11),'test','mock')).toThrow('32字节');
    expect(()=>validateWifi('Test','','mock')).toThrow('模拟');
    expect(()=>validateWifi('Test','test','mock')).not.toThrow();
    expect(describeProvisionStatus('A1')).toBe('连接家庭 Wi-Fi · 进行中');
    expect(describeProvisionStatus('F0')).toBe('连接设备服务器 · 已完成');
  });
  it.each(['a',' leading and trailing ','中文密钥','a'.repeat(254),'网'.repeat(84)+'ab'])('accepts documented real Wi-Fi input without an extra validator (case %#)',password=>{
    expect(()=>validateWifi('Test',password,'real')).not.toThrow();
  });
  it.each(['','a'.repeat(255),'网'.repeat(85)])('rejects empty or oversized real Wi-Fi input before additional validation (case %#)',password=>{
    const validator=vi.fn();expect(()=>validateWifi('Test',password,'real',validator)).toThrow(ApiError);expect(validator).not.toHaveBeenCalled();
  });
  it('preserves raw password input and honors explicitly supplied additional rules',()=>{
    const password=' 原始 input ',validator=vi.fn();validateWifi('Test',password,'real',validator);expect(validator).toHaveBeenCalledExactlyOnceWith(password);
    expect(()=>validateWifi('Test',password,'real',()=>{throw new ApiError(400,'provided product rule');})).toThrow('provided product rule');
  });
  it('reports other missing real contracts without sending Wi-Fi credentials after password validation succeeds',async()=>{
    const {service,driver}=await setup(),flow=new AddDeviceFlow(service,driver,{mode:'real'});
    await flow.select({handle:'real',mac:'80a036d51aad',model:'RW-DH01',service:'0822'},'prd_humidity');
    const exchange=vi.spyOn(driver,'exchange'),connection=vi.spyOn(service,'connection');
    await expect(flow.provision('Test','a')).rejects.toMatchObject({code:503,message:'真实绑定码及0822工厂确认契约尚未配置'});
    expect(flow.state.stage).toBe('failed');expect(exchange).not.toHaveBeenCalled();expect(connection).not.toHaveBeenCalled();flow.stop();
  });
  it('maps only real provisioning events to monotonic progress',()=>{
    const statuses=['A1','A0','C1','C0','B1','B0','D1','D0','E1','E0','F1','F0'];
    const values=statuses.map(provisionProgress);
    expect(values[0]).toBeCloseTo(1/13);
    expect(values.at(-1)).toBeCloseTo(12/13);
    expect(values.every((value,index)=>index===0||value!>values[index-1]!)).toBe(true);
    expect(provisionProgress('A4')).toBeUndefined();
    expect(provisionProgress('binding')).toBeUndefined();
  });
  it('settles budgets immediately on cancellation even if work never cooperates',async()=>{
    const controller=new AbortController();const task=withBudget(()=>new Promise(()=>undefined),60000,'timeout',controller.signal);
    const rejected=expect(task).rejects.toMatchObject({code:499});controller.abort();await rejected;
  });
  it('resumes an uncertain transaction across route instances until the account changes',async()=>{
    const {service,driver}=await setup(),coordinator=new AddDeviceCoordinator(service,driver,{mode:'mock',scanTimeout:10}),flow=coordinator.acquire();
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
  it('isolates a late scan when the same account logs in again',async()=>{
    const {flow,driver,service}=await setup();let resolve!:(value:Awaited<ReturnType<typeof driver.scan>>)=>void;
    vi.spyOn(driver,'scan').mockImplementation(()=>new Promise(done=>{resolve=done;}));const task=flow.scan(),rejected=expect(task).rejects.toMatchObject({code:499});
    await service.login('rowan@example.com','Rowan@123','password');resolve([{handle:'late',mac:'AA',model:'late',service:'0822'}]);await rejected;
    expect(flow.state.discovered).toHaveLength(0);await expect(flow.scan()).rejects.toMatchObject({code:499});
  });
  it('does not reuse an uncertain context after same-account re-login',async()=>{
    const {service,driver}=await setup(),coordinator=new AddDeviceCoordinator(service,driver,{mode:'mock',scanTimeout:10}),flow=coordinator.acquire();
    await flow.scan();await flow.select(flow.state.discovered[1]);await service.login('rowan@example.com','Rowan@123','password');
    expect(coordinator.acquire()).not.toBe(flow);coordinator.clear();
  });
  it('queries a lost nickname response and does not resubmit even when retry receives a different draft',async()=>{
    const {flow,service,driver}=await selected();await flow.provision('Test','test');
    const write=service.renameDevice.bind(service),rename=vi.spyOn(service,'renameDevice').mockImplementationOnce(async(...args)=>{await write(...args);throw new ApiError(0,'response lost');});
    const query=vi.spyOn(service,'device'),provision=vi.spyOn(driver,'provision');
    await expect(flow.finish('Original')).rejects.toThrow('response lost');await flow.finish('Different');
    expect(rename).toHaveBeenCalledOnce();expect(query).toHaveBeenCalledOnce();expect(flow.state).toMatchObject({nickname:'saved',stage:'complete'});expect(provision).not.toHaveBeenCalled();flow.stop();
  });
  it('keeps a nickname unknown if its result query fails, and prevents skip from masking it',async()=>{
    const {flow,service}=await selected();await flow.provision('Test','test');
    const rename=vi.spyOn(service,'renameDevice').mockRejectedValue(new ApiError(0,'response lost'));
    await expect(flow.finish('Original')).rejects.toThrow('response lost');vi.spyOn(service,'device').mockRejectedValue(new Error('offline'));
    await expect(flow.finish(null)).rejects.toThrow('offline');expect(rename).toHaveBeenCalledOnce();expect(flow.state.nickname).toBe('pending');expect(flow.state.binding).toBeDefined();flow.stop();
  });
  it('allows explicit recovery after a successful query confirms a different current nickname',async()=>{
    const {flow,service}=await selected();await flow.provision('Test','test');
    const rename=vi.spyOn(service,'renameDevice').mockRejectedValueOnce(new ApiError(0,'write failed without response'));
    await expect(flow.finish('Original')).rejects.toThrow('without response');await expect(flow.finish(null)).rejects.toThrow('云端昵称与提交值不同');
    expect(rename).toHaveBeenCalledOnce();await flow.finish(null);expect(flow.state.nickname).toBe('skipped');flow.stop();
  });
  it('bounds a hung home query and preserves acknowledged nickname/binding',async()=>{
    const {flow,service}=await selected();await flow.provision('Test','test');
    vi.spyOn(service,'home').mockImplementation(()=>new Promise(()=>undefined));vi.useFakeTimers();
    const task=flow.finish('Office'),rejected=expect(task).rejects.toMatchObject({code:408});await vi.advanceTimersByTimeAsync(10001);await rejected;
    expect(flow.state).toMatchObject({nickname:'saved',stage:'bound'});expect(flow.state.binding).toBeDefined();flow.stop();
  });
  it('matches unresolved real broadcasts to the selected product and maps hexadecimal stages',async()=>{
    const {service}=await setup(),product=await service.product('prd_humidity');
    expect(matchesDiscoveredProduct({handle:'real',mac:'AA',model:product.modelName,service:'0822'},product)).toBe(true);
    expect(matchesDiscoveredProduct({handle:'real',mac:'AA',model:'other',service:'0822'},product)).toBe(false);
    expect(describeProvisionStatus('EB')).toBe('获取设备证书 · 异常（EB）');
  });
  it('does not send real credentials when the current system Wi-Fi has changed',async()=>{
    const {service,driver}=await setup(),contract={profile:{factoryReply:new Uint8Array([1]),stageTimeout:60000},bindingTimeout:30000,operationTimeout:165000,makeBindCode:vi.fn(async()=> 'issued-code'),validatePassword:()=>undefined,deviceToken:(token:string)=>token};
    const flow=new AddDeviceFlow(service,driver,{mode:'real',real:contract,wifi:{read:async()=>({source:'system',connection:'wifi',ssid:'changed',band:'unknown'})}});
    await flow.select({handle:'real',mac:'80a036d51aad',model:'RW-DH01',service:'0822',productID:'prd_humidity'});
    const exchange=vi.spyOn(driver,'exchange');await expect(flow.provision('previous','password')).rejects.toMatchObject({code:409});
    expect(exchange).not.toHaveBeenCalled();expect(contract.makeBindCode).not.toHaveBeenCalled();expect(flow.state.stage).toBe('failed');flow.stop();
  });
  it('rejects a selected real product whose service model contradicts the broadcast',async()=>{
    const {service,driver}=await setup(),flow=new AddDeviceFlow(service,driver,{mode:'real'});
    await expect(flow.select({handle:'real',mac:'80a036d51aad',model:'Wrong Model',service:'0822'},'prd_humidity')).rejects.toMatchObject({code:503});
    expect(flow.state.candidate).toBeUndefined();
  });
  it('routes real onboarding without an additional password validator to 0822 and treats only PAIR-05 as authoritative',async()=>{
    const {service,driver}=await setup(),wifi=vi.fn(async()=>({source:'system' as const,connection:'wifi' as const,ssid:'actual-WiFi',band:'unknown' as const})),makeBindCode=vi.fn(async()=> 'issued-test-code');
    const flow=new AddDeviceFlow(service,driver,{mode:'real',wifi:{read:wifi},real:{profile:{factoryReply:new Uint8Array([1]),stageTimeout:60000},bindingTimeout:30000,operationTimeout:165000,makeBindCode,deviceToken:token=>`confirmed-fixture:${token}`}});
    await flow.select({handle:'real',mac:'80a036d51aad',model:'RW-DH01',service:'0822'},'prd_humidity');
    const bind=vi.spyOn(service,'bindStatus').mockResolvedValue({deviceID:'test-bound',userID:service.userID,bindingRole:'sa'}),exchange=vi.spyOn(driver,'exchange');
    const password=' 原始 private-input ',runner=vi.spyOn(Provisioner0822.prototype,'run').mockImplementation(async(input,onStatus,signal,confirm)=>{expect(input.password).toBe(password);expect(input.bindCode).toBe('issued-test-code');expect(input.token).toContain('confirmed-fixture:');onStatus('F0');expect(flow.state.binding).toBeUndefined();return confirm!(signal);});
    await flow.provision('actual-WiFi',password);expect(runner).toHaveBeenCalledOnce();expect(wifi).toHaveBeenCalledTimes(2);expect(makeBindCode).toHaveBeenCalledOnce();expect(bind).toHaveBeenCalledWith('issued-test-code',expect.any(AbortSignal));
    expect(exchange).not.toHaveBeenCalled();expect(flow.state.stage).toBe('bound');expect(JSON.stringify(flow.state)).not.toContain(password);flow.stop();
  });
  it('rechecks the network after fetching connection data before starting the radio',async()=>{
    const {service,driver}=await setup(),wifi=vi.fn().mockResolvedValueOnce({source:'system',connection:'wifi',ssid:'actual-WiFi',band:'unknown'}).mockResolvedValueOnce({source:'system',connection:'wifi',ssid:'changed',band:'unknown'});
    const flow=new AddDeviceFlow(service,driver,{mode:'real',wifi:{read:wifi},real:{profile:{factoryReply:new Uint8Array([1]),stageTimeout:60000},bindingTimeout:30000,operationTimeout:165000,makeBindCode:async()=> 'issued-test-code',validatePassword:()=>undefined,deviceToken:token=>token}});
    await flow.select({handle:'real',mac:'80a036d51aad',model:'RW-DH01',service:'0822'},'prd_humidity');const exchange=vi.spyOn(driver,'exchange');
    await expect(flow.provision('actual-WiFi','private-input')).rejects.toMatchObject({code:409});expect(exchange).not.toHaveBeenCalled();expect(flow.state.stage).toBe('failed');flow.stop();
  });
  it('bounds an uncooperative connection-address request before any Wi-Fi write',async()=>{
    const {flow,service,driver}=await selected();vi.spyOn(service,'connection').mockImplementation(()=>new Promise(()=>undefined));const exchange=vi.spyOn(driver,'exchange');
    vi.useFakeTimers();const task=flow.provision('Test','test'),rejected=expect(task).rejects.toMatchObject({code:408});await vi.advanceTimersByTimeAsync(10001);await rejected;
    expect(exchange).not.toHaveBeenCalled();expect(flow.state).toMatchObject({stage:'failed',busy:false});flow.stop();
  });
});

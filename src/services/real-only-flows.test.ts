import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../lib/core';
import { UnavailableDeviceTransport } from '../protocol/device';
import { ControlledDeviceSession } from '../protocol/controlled-session';
import type { DeviceSession } from '../protocol/device-session';
import { Provisioner0822 } from '../protocol/provision-0822';
import { MemoryStorage, defaultSettings } from '../test-support/settings-fixture';
import { ApiError, type DeviceView, type Product } from './models';
import { RowanService } from './rowan';
import { AddDeviceFlow, validateWifi } from './onboarding';
import { QrScanFlow } from './scan-flow';
import { DeviceShareFlow } from './device-share';

const product:Product={id:'actual-product',name:'Backend product',modelName:'Actual01',seriesName:'Actual',category:'Other',image:'',configType:'B',connectType:'wifi',bluetooth:true,buyLink:''};
const view:DeviceView={deviceNickname:'Backend device',bindingRole:'sa',bindingAt:'',device:{id:'actual-device'},product:{id:product.id}};
function setup(){
  const http:HttpClient={request:vi.fn().mockRejectedValue(new Error('No HTTP fixture configured'))};
  const service=new RowanService(http,new MemoryStorage());
  service.session={userID:'actual-user',accessToken:'test-access',refreshToken:'test-refresh',expiresIn:3600,tokenType:'bearer',setting:defaultSettings()};
  vi.spyOn(service,'product').mockResolvedValue(product);
  vi.spyOn(service,'device').mockResolvedValue(view);
  return {service,http};
}
const candidate={handle:'native-handle',mac:'aabbccddeeff',model:product.modelName,service:'0822',productID:product.id};
const contract={profile:{factoryReply:new Uint8Array([1]),stageTimeout:1000},makeBindCode:vi.fn(async()=> 'issued-bind'),deviceToken:(token:string)=>token,bindingTimeout:1000,operationTimeout:1000};
const wifi={read:vi.fn(async()=>({connection:'wifi' as const,source:'system' as const,band:'2.4' as const,ssid:'Actual WiFi'}))};

afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});

describe('real-only device onboarding',()=>{
  it('rejects unsupported platform scans without inventing discoveries',async()=>{
    const {service}=setup(),flow=new AddDeviceFlow(service,new UnavailableDeviceTransport(),{});
    await expect(flow.scan()).rejects.toThrow();expect(flow.state.discovered).toEqual([]);flow.stop();
  });
  it('blocks missing provisioning contracts before reading addresses or writing BLE',async()=>{
    const {service}=setup(),driver=new UnavailableDeviceTransport(),write=vi.spyOn(driver,'exchange'),connection=vi.spyOn(service,'connection');
    const flow=new AddDeviceFlow(service,driver,{});await flow.select(candidate);
    await expect(flow.provision('Actual WiFi','pass')).rejects.toThrow('契约尚未配置');
    expect(write).not.toHaveBeenCalled();expect(connection).not.toHaveBeenCalled();expect(flow.state.binding).toBeUndefined();flow.stop();
  });
  it('uses issued bind codes and confirmed runner; reconciles uncertain results without another write',async()=>{
    const {service}=setup();vi.spyOn(service,'connection').mockResolvedValue({certificationURL:'https://device.test/cert'});
    const binding={deviceID:view.device.id,userID:service.userID,bindingRole:'sa' as const};
    const status=vi.spyOn(service,'bindStatus').mockRejectedValueOnce(new ApiError(0,'response lost')).mockResolvedValue(binding);
    const runner=vi.spyOn(Provisioner0822.prototype,'run').mockImplementation(async(_input,_status,signal,readBinding,onWrite)=>{onWrite?.();return readBinding!(signal);});
    const flow=new AddDeviceFlow(service,new UnavailableDeviceTransport(),{real:contract,wifi});await flow.select(candidate);
    await expect(flow.provision('Actual WiFi','pass')).rejects.toThrow('response lost');expect(flow.state.stage).toBe('unknown');
    await expect(flow.provision('Actual WiFi','pass')).rejects.toThrow('结果待确认');await flow.reconcile();
    expect(flow.state.binding).toEqual(binding);expect(status).toHaveBeenCalledTimes(2);expect(runner).toHaveBeenCalledOnce();expect(runner.mock.calls[0][0].bindCode).toBe('issued-bind');flow.stop();
  });
  it('does not accept a different system Wi-Fi or fabricate a binding',async()=>{
    const {service}=setup(),flow=new AddDeviceFlow(service,new UnavailableDeviceTransport(),{real:contract,wifi});await flow.select(candidate);
    await expect(flow.provision('Other WiFi','pass')).rejects.toThrow('Wi-Fi已变化');expect(flow.state.binding).toBeUndefined();flow.stop();
  });
  it('keeps the firmware byte limits and explicit product password validation',()=>{
    expect(()=>validateWifi('wifi','')).toThrow('密码');expect(()=>validateWifi('wifi','a'.repeat(255))).toThrow('0822');
    const validate=vi.fn();validateWifi('wifi','short',validate);expect(validate).toHaveBeenCalledWith('short');
  });
});

describe('real-only QR boundaries',()=>{
  it('cannot parse or confirm a code without a supplied protocol',async()=>{
    const {service}=setup(),flow=new QrScanFlow(service);flow.read(['{"version":"rowan-mock-v1","type":"product","productID":"demo"}']);
    expect(flow.state.phase).toBe('idle');expect(flow.state.error).toContain('协议尚未配置');await expect(flow.confirm()).rejects.toThrow('请先选择');expect(service.product).not.toHaveBeenCalled();
  });
  it('uses only the supplied parser and asks for selection when multiple identities remain',async()=>{
    const {service}=setup(),flow=new QrScanFlow(service,value=>({type:'product',productID:value}));flow.read(['one','two','one']);
    expect(flow.state.choices).toHaveLength(2);await expect(flow.confirm()).rejects.toThrow('请先选择');flow.choose(1);expect(await flow.confirm()).toEqual({productID:'two'});
  });
  it('reconciles a lost share response by reading HOME and never repeats the single-use code',async()=>{
    const {service}=setup(),accept=vi.spyOn(service,'acceptShare').mockRejectedValue(new ApiError(0,'response lost'));
    vi.spyOn(service,'home').mockResolvedValueOnce([]).mockResolvedValue([{room:null,devices:[view]}]);
    const flow=new QrScanFlow(service,()=>({type:'share',deviceID:view.device.id,bindCode:'issued-share'}));flow.read(['actual-qr']);
    await expect(flow.confirm()).rejects.toThrow('response lost');expect(flow.state.phase).toBe('unknown');await expect(flow.confirm()).rejects.toThrow('勿重复确认');
    expect(await flow.reconcile()).toEqual({binding:{deviceID:view.device.id,userID:service.userID,bindingRole:'sa'}});expect(accept).toHaveBeenCalledOnce();
  });
  it('ignores late product results after leaving the scanner',async()=>{
    const {service}=setup();let resolve!:(product:Product)=>void;vi.mocked(service.product).mockReturnValue(new Promise(done=>{resolve=done;}));
    const flow=new QrScanFlow(service,()=>({type:'product',productID:product.id}));flow.read(['actual']);const result=flow.confirm();const rejected=expect(result).rejects.toMatchObject({code:499});
    flow.stop();resolve(product);await rejected;expect(flow.state.phase).not.toBe('done');
  });
  it('does not generate a QR from a share response while serialization is unconfirmed',async()=>{
    const {service}=setup();vi.spyOn(service,'share').mockResolvedValue({deviceID:view.device.id,bindCode:'issued-share',expiresAt:new Date(Date.now()+60000).toISOString()});
    const flow=new DeviceShareFlow(service,view.device.id);flow.start();await vi.waitFor(()=>expect(flow.state.phase).toBe('unsupported'));expect(flow.state.qrValue).toBeUndefined();flow.stop();
  });
  it('blocks non-admin sharing before requesting a share code',async()=>{
    const {service}=setup();vi.mocked(service.device).mockResolvedValue({...view,bindingRole:'mbr'});const share=vi.spyOn(service,'share');const flow=new DeviceShareFlow(service,view.device.id);
    flow.start();await vi.waitFor(()=>expect(flow.state.phase).toBe('blocked'));expect(share).not.toHaveBeenCalled();flow.stop();
  });
});

describe('real-only capability gates',()=>{
  it('never uses built-in product, maintenance or alarm mappings when none is supplied',async()=>{
    const inner:DeviceSession={ready:true,sending:false,confirmed:{relay:false},connect:vi.fn(async()=>undefined),close:vi.fn(),command:vi.fn(),onChange:()=>()=>undefined};
    const session=new ControlledDeviceSession(inner,async()=>({device:view,model:{version:'actual',attributes:[],services:[],events:[]}}));
    await session.connect();expect(session.controls).toBeUndefined();expect(session.maintenance).toBeUndefined();expect(session.controlError).toContain('尚未配置');expect(session.maintenanceError).toContain('尚未配置');expect(session.eventError).toContain('尚未配置');
    await expect(session.command({relay:true})).rejects.toThrow('尚未配置');expect(inner.command).not.toHaveBeenCalled();session.close();expect(inner.close).toHaveBeenCalled();
  });
});

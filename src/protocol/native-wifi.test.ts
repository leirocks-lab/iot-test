import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWifiReader } from './native-wifi.native';
const ports=vi.hoisted(()=>({platform:{OS:'android'},check:vi.fn(),request:vi.fn(),fetch:vi.fn()}));
vi.mock('react-native',()=>({Platform:ports.platform,PermissionsAndroid:{PERMISSIONS:{ACCESS_FINE_LOCATION:'fine-location'},RESULTS:{GRANTED:'granted'},check:ports.check,request:ports.request}}));
vi.mock('@react-native-community/netinfo',()=>({default:{fetch:ports.fetch}}));

beforeEach(()=>{vi.resetAllMocks();ports.platform.OS='android';ports.check.mockResolvedValue(true);ports.request.mockResolvedValue('granted');ports.fetch.mockResolvedValue({type:'wifi',isConnected:true,details:{ssid:'public-WiFi',frequency:2457}});});
describe('原生SSID端口接线（构造系统响应，非手机验收）',()=>{
  it('reads the Wi-Fi interface and actual frequency without prompting when already permitted',async()=>{
    expect(await createWifiReader().read()).toMatchObject({ssid:'public-WiFi',band:'2.4'});expect(ports.fetch).toHaveBeenCalledWith('wifi');expect(ports.request).not.toHaveBeenCalled();
  });
  it('does not pop up a permission prompt on an automatic read',async()=>{
    ports.check.mockResolvedValue(false);
    expect(await createWifiReader().read()).toMatchObject({connection:'wifi',ssidAccess:'denied',ssid:undefined});expect(ports.request).not.toHaveBeenCalled();
  });
  it('requests the required permission on an explicit read and handles denial',async()=>{
    ports.check.mockResolvedValue(false);ports.request.mockResolvedValue('denied');
    expect(await createWifiReader().read(undefined,true)).toMatchObject({ssid:undefined,ssidAccess:'denied'});expect(ports.request).toHaveBeenCalledWith('fine-location');
  });
  it('keeps an unconnected network distinct from denied SSID permission',async()=>{
    ports.check.mockResolvedValue(false);ports.fetch.mockResolvedValue({type:'none',isConnected:false,details:null});
    expect(await createWifiReader().read()).toEqual({connection:'offline',band:'unknown',source:'system'});
  });
  it('does not enable restricted iOS SSID capability without signed prerequisites',async()=>{
    ports.platform.OS='ios';ports.fetch.mockResolvedValue({type:'wifi',isConnected:true,details:{ssid:null,frequency:null}});
    expect(await createWifiReader().read(undefined,true)).toEqual({connection:'wifi',band:'unknown',source:'system'});expect(ports.check).not.toHaveBeenCalled();expect(ports.request).not.toHaveBeenCalled();
  });
  it('ignores a permission result that arrives after cancellation',async()=>{
    let finish!:(value:boolean)=>void;ports.check.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const controller=new AbortController();
    const task=createWifiReader().read(controller.signal,true),rejected=expect(task).rejects.toMatchObject({code:499});controller.abort();finish(false);await rejected;
    expect(ports.fetch).not.toHaveBeenCalled();expect(ports.request).not.toHaveBeenCalled();
  });
});

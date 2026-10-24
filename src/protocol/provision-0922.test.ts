import { afterEach, describe, expect, it, vi } from 'vitest';
import { utf8 } from './ble';
import { BLE_0922, decrypt0922, encrypt0922, PacketStream0922 } from './ble-0922';
import { Ble0822DeviceTransport, type BleConnection, type BleRadio } from './ble-radio';
import { Provisioner0922 } from './provision-0922';

const input={userID:'owner',mac:'aabbccddeeff',model:'Cheetah02',service:BLE_0922.service,seriesName:'Test Series',ssid:'public-wifi',password:'public-password',token:'public-token',bindCode:'',productID:'public-product',modelID:'Cheetah02',
  urls:{certificationURL:'https://test.invalid/cert',activationURL:'https://test.invalid/activate',bindingURL:'https://test.invalid/bind',otaURL:'https://test.invalid/ota'}};
const key=utf8('aabbccddeeffChee');
const binding={deviceID:'bound-device',userID:'owner',bindingRole:'sa' as const};
class LegacyRadio implements BleRadio {
  bytes?:(bytes:Uint8Array)=>void;
  request=new PacketStream0922();
  sent:string[]=[];
  service?:string;
  failCode?:number;
  ready=vi.fn(async()=>undefined);
  startScan=vi.fn(async(listener:Parameters<BleRadio['startScan']>[0])=>{
    const manufacturer=new Uint8Array(25);manufacturer.set([0x22,0x09,0x1c,0xaa,0xbb,0xcc,0xdd,0xee,0xff,input.model.length,...utf8(input.model)]);
    listener(null,{handle:'legacy',manufacturer,services:[BLE_0922.service]});
  });
  stopScan=vi.fn(async()=>undefined);
  dispose=vi.fn(async()=>undefined);
  channel:BleConnection={mtu:128,close:vi.fn(async()=>undefined),write:vi.fn(async frame=>{
    for(const payload of this.request.push(frame)){
      const text=new TextDecoder().decode(payload),plain=text.startsWith('{')?text:decrypt0922(payload,key),type=(JSON.parse(plain) as {type:string}).type;
      this.sent.push(plain);
      if(type==='cipher')this.reply('cipher_reply',0);
      if(type==='apinfo'){this.reply('status_update',0);this.reply('wifi_reply',0);this.reply('cloud_reply',this.failCode??8);}
    }
  })};
  connect=vi.fn(async(_handle:string,onBytes:(bytes:Uint8Array)=>void,_onDisconnect:(error:Error)=>void,_signal?:AbortSignal,service?:string)=>{this.bytes=onBytes;this.service=service;return this.channel;});
  reply(type:string,error_code:number){const payload=encrypt0922(JSON.stringify({type,data:{error_code}}),key);this.bytes!(new Uint8Array([0,...payload]));}
}
async function setup(){vi.useFakeTimers();const radio=new LegacyRadio(),driver=new Ble0822DeviceTransport(radio,1,100);const scan=driver.scan();await vi.advanceTimersByTimeAsync(2);expect(await scan).toMatchObject([{service:BLE_0922.service}]);return {radio,driver};}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('0922 legacy provisioning port (synthetic firmware only)',()=>{
  it('sends original HTTPS addresses and rejects HTTP before any BLE write',async()=>{
    const {radio,driver}=await setup();
    const urls=Object.fromEntries(Object.entries(input.urls).map(([name,value])=>[name,value.replace('https:','http:')]));
    expect(await new Provisioner0922(driver,1000,'development').run(input,()=>undefined,undefined,async()=>binding)).toEqual(binding);
    const apinfo=JSON.parse(radio.sent[2]).data;
    expect([apinfo.certificationUrl,apinfo.activate_url,apinfo.bindUrl,apinfo.otaUrl]).toEqual(Object.values(input.urls));
    for(const environment of ['development','preview','production']){
      radio.sent=[];
      await expect(new Provisioner0922(driver,1000,environment).run({...input,urls},()=>undefined,undefined,async()=>binding)).rejects.toThrow('有效HTTPS地址');
      expect(radio.sent).toHaveLength(0);
    }
    await driver.dispose();
  });
  it('uses the advertised GATT service and sends the empty optional binding_code in encrypted apinfo',async()=>{
    const {radio,driver}=await setup(),statuses:string[]=[];
    const result=await new Provisioner0922(driver,1000).run(input,status=>statuses.push(status),undefined,async()=>binding);
    expect(result).toEqual(binding);expect(radio.service).toBe(BLE_0922.service);
    expect(radio.sent).toHaveLength(3);
    expect(JSON.parse(radio.sent[0])).toEqual({type:'encrypt_note'});
    expect(JSON.parse(radio.sent[1])).toMatchObject({type:'cipher',data:{cipher:expect.stringMatching(/^[0-9a-f]{32}$/)}});
    expect(JSON.parse(radio.sent[2])).toMatchObject({type:'apinfo',data:{ssid:input.ssid,password:input.password,binding_code:'',certificationUrl:input.urls.certificationURL,
      activate_url:input.urls.activationURL,bindUrl:input.urls.bindingURL,otaUrl:input.urls.otaURL}});
    expect(statuses).toContain('D0');await driver.dispose();
  });
  it('preserves a device-side bind failure and does not invoke cloud confirmation',async()=>{
    const {radio,driver}=await setup();radio.failCode=10;const confirm=vi.fn(async()=>binding);
    await expect(new Provisioner0922(driver,1000).run(input,()=>undefined,undefined,confirm)).rejects.toMatchObject({code:10});
    expect(confirm).not.toHaveBeenCalled();await driver.dispose();
  });
});

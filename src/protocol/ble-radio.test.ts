import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/models';
import { utf8 } from './ble';
import { BLE_0822, decode0822, encode0822, key0822 } from './ble-0822';
import { Ble0822DeviceTransport, type BleConnection, type BleRadio } from './ble-radio';
import { ProvisionNotSentError } from './device';

const input={userID:'node-user',mac:'aabbccddeeff',model:'Cheetah02',ssid:'public-wifi',password:'public-test',token:'public-token',bindCode:'provided-fixture',productID:'prd-fixture',modelID:'Cheetah02'};
const key=key0822(input.mac,input.model);
const advert=()=>{const manufacturer=new Uint8Array(25);manufacturer.set([0x22,0x08,0x1c,0xaa,0xbb,0xcc,0xdd,0xee,0xff,input.model.length,...utf8(input.model)]);return {handle:'native-handle',manufacturer};};
class Radio implements BleRadio {
  listeners:Parameters<BleRadio['startScan']>[0][]=[];
  bytes?:(data:Uint8Array)=>void;
  disconnect?:(error:Error)=>void;
  ready=vi.fn(async()=>undefined);
  startScan=vi.fn(async(listener:Parameters<BleRadio['startScan']>[0])=>{this.listeners.push(listener);});
  stopScan=vi.fn(async()=>undefined);
  dispose=vi.fn(async()=>undefined);
  channel:BleConnection={mtu:517,close:vi.fn(async()=>undefined),write:vi.fn(async()=>undefined)};
  connect=vi.fn(async(_handle:string,onBytes:(data:Uint8Array)=>void,onDisconnect:(error:Error)=>void)=>{this.bytes=onBytes;this.disconnect=onDisconnect;return this.channel;});
}
async function selected(){
  vi.useFakeTimers();const radio=new Radio(),driver=new Ble0822DeviceTransport(radio,50,100);
  const scan=driver.scan();await vi.advanceTimersByTimeAsync(0);radio.listeners[0](null,advert());
  await vi.advanceTimersByTimeAsync(51);await scan;return {radio,driver};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('原生BLE端口编排（注入端口，无真机结论）',()=>{
  it('retains valid discoveries when readiness consumes part of the overall scan budget',async()=>{
    vi.useFakeTimers();const radio=new Radio();radio.ready.mockImplementationOnce(()=>new Promise(resolve=>setTimeout(resolve,8000)));const driver=new Ble0822DeviceTransport(radio),observed=vi.fn(),scan=driver.scan(undefined,observed);
    await vi.advanceTimersByTimeAsync(8000);radio.listeners[0](null,advert());await vi.advanceTimersByTimeAsync(22001);const discovered=await scan;expect(discovered).toHaveLength(1);expect(observed).toHaveBeenCalledOnce();expect(radio.stopScan).toHaveBeenCalled();
    const next=driver.scan();await vi.advanceTimersByTimeAsync(0);radio.listeners[0](null,advert());await vi.advanceTimersByTimeAsync(25001);expect(await next).toEqual([]);await driver.dispose();
  });
  it('certifies a first-frame MTU rejection as not sent but never certifies errors after a write',async()=>{
    const {radio,driver}=await selected();radio.channel.mtu=23;const started=vi.fn(),first=driver.exchange(input,[encode0822(0,new Uint8Array(16),key)],undefined,started);await expect(first).rejects.toBeInstanceOf(ProvisionNotSentError);await expect(first).rejects.toMatchObject({code:503});expect(started).not.toHaveBeenCalled();expect(radio.channel.write).not.toHaveBeenCalled();
    radio.channel.mtu=517;radio.channel.write=vi.fn(async()=>radio.bytes!(encode0822(0x80,new Uint8Array(),key)));await driver.exchange(input,[encode0822(0,new Uint8Array(16),key)],undefined,started);expect(started).toHaveBeenCalledOnce();
    radio.channel.mtu=23;let failure:unknown;try{await driver.exchange(input,[encode0822(1,new Uint8Array(32),key)],undefined,started);}catch(error){failure=error;}
    expect(failure).toMatchObject({code:503});expect(failure).not.toBeInstanceOf(ProvisionNotSentError);expect(started).toHaveBeenCalledOnce();await driver.dispose();
  });
  it('keeps write evidence when disposal clears the session map during an ACK wait',async()=>{
    const {radio,driver}=await selected(),started=vi.fn(),pending=driver.exchange(input,[encode0822(0,new Uint8Array(16),key)],undefined,started);const captured=pending.catch(error=>error);
    await vi.advanceTimersByTimeAsync(0);expect(radio.channel.write).toHaveBeenCalledOnce();await driver.dispose();const failure=await captured;expect(failure).toMatchObject({code:499});expect(failure).not.toBeInstanceOf(ProvisionNotSentError);expect(started).toHaveBeenCalledOnce();
  });
  it('deduplicates manufacturer identities and leaves product capabilities unresolved',async()=>{
    vi.useFakeTimers();const radio=new Radio(),driver=new Ble0822DeviceTransport(radio,50);
    const scan=driver.scan();await vi.advanceTimersByTimeAsync(0);
    radio.listeners[0](null,advert());radio.listeners[0](null,{...advert(),handle:'duplicate'});
    const bad=advert();bad.manufacturer[1]=0x09;radio.listeners[0](null,bad);
    await vi.advanceTimersByTimeAsync(51);const found=await scan;
    expect(found).toHaveLength(1);expect(found[0]).toMatchObject({handle:'native-handle',service:BLE_0822.service});expect(found[0].productID).toBeUndefined();
    expect(radio.stopScan).toHaveBeenCalled();await driver.dispose();
  });
  it('stops scans immediately and ignores late callbacks from the old round',async()=>{
    vi.useFakeTimers();const radio=new Radio(),driver=new Ble0822DeviceTransport(radio,50),controller=new AbortController();
    const scan=driver.scan(controller.signal);const rejected=expect(scan).rejects.toMatchObject({code:499});
    await vi.advanceTimersByTimeAsync(0);controller.abort();await rejected;radio.listeners[0](null,advert());
    const next=driver.scan();await vi.advanceTimersByTimeAsync(0);radio.listeners[0](null,advert());
    await vi.advanceTimersByTimeAsync(51);expect(await next).toEqual([]);await driver.dispose();
  });
  it('does not start scanning when permission or power readiness fails',async()=>{
    const radio=new Radio();radio.ready.mockRejectedValueOnce(new ApiError(403,'权限未授权'));
    const driver=new Ble0822DeviceTransport(radio);
    await expect(driver.scan()).rejects.toMatchObject({code:403});expect(radio.startScan).not.toHaveBeenCalled();await driver.dispose();
  });
  it('retains the separate factory response when ACK and challenge arrive together',async()=>{
    const {radio,driver}=await selected();
    radio.channel.write=vi.fn(async()=>radio.bytes!(new Uint8Array([...encode0822(0x80,utf8('ack'),key),...encode0822(0x0f,utf8('factory'),key)])));
    const ack=await driver.exchange(input,[encode0822(0,utf8('digest-fixture'),key)]);
    expect(decode0822(ack[0],key).command).toBe(0x80);
    const challenge=await driver.challenge(input);expect(decode0822(challenge[0],key).command).toBe(0x0f);
    driver.releaseProvision(input.bindCode);expect(radio.channel.close).toHaveBeenCalledOnce();await driver.dispose();
  });
  it('rejects insufficient MTU before any parameter write',async()=>{
    const {radio,driver}=await selected();radio.channel.mtu=23;
    await expect(driver.exchange(input,[encode0822(2,utf8('public-test-value-exceeds-mtu'),key)])).rejects.toMatchObject({code:503});
    expect(radio.channel.write).not.toHaveBeenCalled();expect(radio.channel.close).toHaveBeenCalled();await driver.dispose();
  });
  it('preserves parameter rejection codes and clears the connection',async()=>{
    const {radio,driver}=await selected();radio.channel.write=vi.fn(async()=>radio.bytes!(encode0822(0x73,new Uint8Array(),key)));
    await expect(driver.exchange(input,[encode0822(3,utf8('public-token'),key)])).rejects.toMatchObject({code:0x73});
    expect(radio.channel.close).toHaveBeenCalled();await driver.dispose();
  });
  it('terminates missing ACK waits without automatically retransmitting',async()=>{
    const {radio,driver}=await selected();
    const write=driver.exchange(input,[encode0822(1,utf8('public-wifi'),key)]),rejected=expect(write).rejects.toMatchObject({code:408});
    await vi.advanceTimersByTimeAsync(101);await rejected;
    expect(radio.channel.write).toHaveBeenCalledOnce();expect(radio.channel.close).toHaveBeenCalledOnce();await driver.dispose();
  });
  it('releases a connection that completes after client cancellation',async()=>{
    const {radio,driver}=await selected();let finish!:(channel:BleConnection)=>void;
    radio.connect.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const controller=new AbortController();
    const exchange=driver.exchange(input,[encode0822(0,utf8('digest'),key)],controller.signal),rejected=expect(exchange).rejects.toMatchObject({code:499});
    await vi.advanceTimersByTimeAsync(0);controller.abort();await rejected;
    finish(radio.channel);await vi.advanceTimersByTimeAsync(0);expect(radio.channel.close).toHaveBeenCalled();await driver.dispose();
  });
  it('never treats scan/GATT capability as configured cloud provisioning or MQTT',async()=>{
    const radio=new Radio(),driver=new Ble0822DeviceTransport(radio);
    await expect(driver.provision()).rejects.toMatchObject({code:503});await expect(driver.shadowGet()).rejects.toMatchObject({code:503});
    await expect(driver.exchange(input,[new Uint8Array([0,0xa5,0x5a])])).rejects.toMatchObject({code:400});
    expect(radio.connect).not.toHaveBeenCalled();await driver.dispose();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { ApiError } from '../services/models';
import { utf8 } from './ble';
import { appDigest0822, decode0822, encode0822, key0822 } from './ble-0822';
import { Ble0822DeviceTransport, type BleRadio, type BleConnection } from './ble-radio';
import { Provisioner0822 } from './provision-0822';

// Constructed port fixture. Neither the reply DATA nor CRC is a captured firmware vector.
const input={userID:'test-user',mac:'aabbccddeeff',model:'Cheetah02',seriesName:'Test Series',ssid:'public-WiFi',password:'public-password',token:'public-token',bindCode:'issued-test-code',productID:'test-product',modelID:'Cheetah02',
  urls:{certificationURL:'https://test.invalid/cert',activationURL:'https://test.invalid/activate',bindingURL:'https://test.invalid/bind',otaURL:'https://test.invalid/ota'}};
const key=key0822(input.mac,input.model);
const profile={factoryReply:new Uint8Array([0x42,0x13]),stageTimeout:60000};
const binding={deviceID:'bound-test-device',userID:input.userID,bindingRole:'sa' as const};
class FirmwarePort implements BleRadio {
  sent:{command:number;data:Uint8Array}[]=[];
  stages=[0xa1,0xa0,0xc1,0xc0,0xb1,0xb0,0xd1,0xd0,0xe1,0xe0,0xf1,0xf0];
  dropAck=false;wrongFactory=false;wrongEcho=false;
  bytes?:(bytes:Uint8Array)=>void;
  ready=vi.fn(async()=>undefined);
  startScan=vi.fn(async(listener:Parameters<BleRadio['startScan']>[0])=>{
    const manufacturer=new Uint8Array(25);manufacturer.set([0x22,0x08,0x1c,0xaa,0xbb,0xcc,0xdd,0xee,0xff,input.model.length,...utf8(input.model)]);
    listener(null,{handle:'test-radio',manufacturer});
  });
  stopScan=vi.fn(async()=>undefined);
  dispose=vi.fn(async()=>undefined);
  channel:BleConnection={mtu:517,close:vi.fn(async()=>undefined),write:vi.fn(async(frame)=>{
    const decoded=decode0822(frame,key);this.sent.push(decoded);
    if(decoded.command===0x8f||this.dropAck)return;
    const response=[encode0822(decoded.command+0x80,decoded.command===1||decoded.command===2?this.wrongEcho?utf8('incorrect'):decoded.data:new Uint8Array(),key)];
    if(decoded.command===0){const hash=bytesToHex(sha256(utf8(`${input.mac},leapfive`)).slice(0,16));response.push(encode0822(0x0f,utf8(this.wrongFactory?'0'.repeat(32):hash),key));}
    if(decoded.command===10)for(const stage of this.stages)response.push(encode0822(stage,new Uint8Array(),key));
    this.bytes!(new Uint8Array(response.flatMap(bytes=>[...bytes])));
  })};
  connect=vi.fn(async(_handle:string,onBytes:(bytes:Uint8Array)=>void)=>{this.bytes=onBytes;return this.channel;});
}
async function setup(){
  vi.useFakeTimers();const radio=new FirmwarePort(),driver=new Ble0822DeviceTransport(radio,1,100);
  const scan=driver.scan();await vi.advanceTimersByTimeAsync(2);await scan;
  return {radio,driver,runner:new Provisioner0822(driver,profile)};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('uses conservative submission evidence when an adapter does not declare the exact supported capability',async()=>{
  const {driver,runner}=await setup();Object.defineProperty(driver,'reportsProvisionWriteStart',{value:'unverified',configurable:true});const exchange=vi.spyOn(driver,'exchange').mockRejectedValue(new ApiError(503,'opaque adapter failure')),submitted=vi.fn();
  await expect(runner.run(input,()=>undefined,undefined,async()=>binding,submitted)).rejects.toMatchObject({code:503});expect(exchange).toHaveBeenCalledOnce();expect(submitted).toHaveBeenCalledOnce();await driver.dispose();
});
describe('0822真实编排端口验证（非固件/云端验收）',()=>{
  it('writes binary handshake and raw ordered parameters, drains coalesced stages, then confirms HTTP binding',async()=>{
    const {radio,driver,runner}=await setup(),confirm=vi.fn(async()=>binding),statuses:string[]=[];
    expect(await runner.run(input,status=>statuses.push(status),undefined,confirm)).toEqual(binding);
    expect(radio.sent.map(frame=>frame.command)).toEqual([0,0x8f,1,2,3,4,5,6,7,8,9,10]);
    expect(radio.sent[0].data).toEqual(appDigest0822(input.mac,input.seriesName,input.model));
    expect(radio.sent[1].data).toEqual(profile.factoryReply);
    expect(statuses.slice(-13)).toEqual(['A1','A0','C1','C0','B1','B0','D1','D0','E1','E0','F1','F0','确认绑定']);
    expect(confirm).toHaveBeenCalledOnce();expect(radio.channel.close).toHaveBeenCalledOnce();await driver.dispose();
  });
  it('rejects the factory challenge before Wi-Fi credentials are sent',async()=>{
    const {radio,driver,runner}=await setup();radio.wrongFactory=true;const confirm=vi.fn(async()=>binding);
    await expect(runner.run(input,()=>undefined,undefined,confirm)).rejects.toMatchObject({code:0x7f});
    expect(radio.sent.map(frame=>frame.command)).toEqual([0]);expect(confirm).not.toHaveBeenCalled();await driver.dispose();
  });
  it('does not continue after mismatching SSID/password echo',async()=>{
    const {radio,driver,runner}=await setup();radio.wrongEcho=true;
    await expect(runner.run(input,()=>undefined,undefined,async()=>binding)).rejects.toMatchObject({code:0x63});
    expect(radio.sent.map(frame=>frame.command)).toEqual([0,0x8f,1]);await driver.dispose();
  });
  it.each(['token','password'] as const)('preflights oversized %s before any device write',async field=>{
    const {radio,driver,runner}=await setup();
    await expect(runner.run({...input,[field]:'a'.repeat(255)},()=>undefined,undefined,async()=>binding)).rejects.toMatchObject({code:400});
    expect(radio.connect).not.toHaveBeenCalled();expect(radio.sent).toHaveLength(0);await driver.dispose();
  });
  it('rejects missing/mismatching real product identity and invalid URLs before sending',async()=>{
    const {radio,driver,runner}=await setup();
    await expect(runner.run({...input,modelID:'Other'},()=>undefined,undefined,async()=>binding)).rejects.toMatchObject({code:503});
    await expect(runner.run({...input,urls:{...input.urls,bindingURL:''}},()=>undefined,undefined,async()=>binding)).rejects.toMatchObject({code:503});
    expect(radio.sent).toHaveLength(0);await driver.dispose();
  });
  it('requires explicit factory DATA, budget and cloud result boundary',async()=>{
    const {radio,driver}=await setup();
    await expect(new Provisioner0822(driver,{...profile,factoryReply:undefined as never}).run(input,()=>undefined,undefined,async()=>binding)).rejects.toMatchObject({code:503});
    await expect(new Provisioner0822(driver,profile).run(input,()=>undefined)).rejects.toMatchObject({code:503});
    expect(radio.sent).toHaveLength(0);await driver.dispose();
  });
  it('retains a hex failure stage and never treats it as cloud binding success',async()=>{
    const {radio,driver,runner}=await setup();radio.stages=[0xd0,0xe1,0xeb];const statuses:string[]=[],confirm=vi.fn(async()=>binding);
    await expect(runner.run(input,status=>statuses.push(status),undefined,confirm)).rejects.toMatchObject({code:0xeb});
    expect(statuses.at(-1)).toBe('EB');expect(confirm).not.toHaveBeenCalled();await driver.dispose();
  });
  it('waits for cloud-stage notifications beyond the parameter ACK timeout',async()=>{
    const {radio,driver,runner}=await setup();radio.stages=[];
    const task=runner.run(input,()=>undefined,undefined,async()=>binding);
    await vi.advanceTimersByTimeAsync(200);
    radio.bytes!(encode0822(0xf0,new Uint8Array(),key));expect(await task).toEqual(binding);await driver.dispose();
  });
  it('times out missing ACK without automatically resending the handshake',async()=>{
    const {radio,driver,runner}=await setup();radio.dropAck=true;
    const task=runner.run(input,()=>undefined,undefined,async()=>binding),rejected=expect(task).rejects.toMatchObject({code:408});
    await vi.advanceTimersByTimeAsync(101);await rejected;expect(radio.sent).toHaveLength(1);await driver.dispose();
  });
  it('cancels stage waiting, closes BLE and never sends device-side 6F',async()=>{
    const {radio,driver,runner}=await setup();radio.stages=[0xa1];const controller=new AbortController(),confirm=vi.fn(async()=>binding);
    const task=runner.run(input,()=>undefined,controller.signal,confirm),rejected=expect(task).rejects.toMatchObject({code:499});
    await vi.advanceTimersByTimeAsync(0);controller.abort();await rejected;
    expect(radio.sent).toHaveLength(12);expect(radio.sent.some(frame=>frame.command===0x6f)).toBe(false);expect(confirm).not.toHaveBeenCalled();
    expect(radio.channel.close).toHaveBeenCalledOnce();await driver.dispose();
  });
  it('bounds missing stages and releases the session without automatic retransmission',async()=>{
    const {radio,driver}=await setup();radio.stages=[];
    const task=new Provisioner0822(driver,{...profile,stageTimeout:500}).run(input,()=>undefined,undefined,async()=>binding),rejected=expect(task).rejects.toMatchObject({code:408});
    await vi.advanceTimersByTimeAsync(501);await rejected;
    expect(radio.sent).toHaveLength(12);expect(radio.channel.close).toHaveBeenCalledOnce();await driver.dispose();
  });
  it('preserves the cloud query error after F0 instead of returning a transport binding',async()=>{
    const {driver,runner}=await setup();
    await expect(runner.run(input,()=>undefined,undefined,async()=>{throw new ApiError(1123,'test expired');})).rejects.toMatchObject({code:1123});await driver.dispose();
  });
  it('does not send the factory reply after a noncooperative exchange completes past cancellation',async()=>{
    const {radio,driver,runner}=await setup();let finish!:(frames:Uint8Array[])=>void;
    const exchange=vi.spyOn(driver,'exchange').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const controller=new AbortController(),task=runner.run(input,()=>undefined,controller.signal,async()=>binding),rejected=expect(task).rejects.toMatchObject({code:499});
    controller.abort();finish([encode0822(0x80,new Uint8Array(),key)]);await rejected;
    expect(exchange).toHaveBeenCalledOnce();expect(radio.sent).toHaveLength(0);await driver.dispose();
  });
});

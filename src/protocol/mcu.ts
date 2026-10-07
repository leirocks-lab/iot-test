// mock-v1 execution envelopes, not physical UART commands or firmware golden vectors.
// Real MCU wire layouts remain inside firmware; App adapters share the returned properties.
import type { Device } from '../services/models';
export function simulateMcu(protocol:Device['protocol'],properties:Record<string,unknown>) {
  const body=JSON.stringify(properties);
  if(protocol==='AT'){
    const request=`AT+MOCK_PROPERTY=${body}\r\n`;
    if(!request.endsWith('\r\n'))throw new Error('AT mock terminator');
    return {request,reported:JSON.parse(request.slice(17,-2)) as Record<string,number|string|boolean>};
  }
  const data=new TextEncoder().encode(body);
  const frame=new Uint8Array([0x55,0xaa,0x01,0x01,data.length>>8,data.length&255,...data,0]);
  frame[frame.length-1]=frame.slice(0,-1).reduce((sum,n)=>(sum+n)&255,0);
  const length=(frame[4]<<8)|frame[5];
  if(length!==frame.length-7)throw new Error('55AA mock length');
  return {request:frame,reported:JSON.parse(new TextDecoder().decode(frame.slice(6,-1))) as Record<string,number|string|boolean>};
}

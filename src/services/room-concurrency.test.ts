import {describe,it,expect,vi} from 'vitest';
import {RealHttpClient} from './real-http';
import {RowanService} from './rowan';
import {MemoryStorage} from './memory-storage';
import type {Room} from './models';

const rooms=[{id:'default',name:'Default',isDefault:true,deviceCount:0,version:0,updatedAt:'2026-10-18T00:00:00Z'},
  {id:'test',name:'Test',deviceCount:0,version:2,updatedAt:'2026-10-18T01:00:00Z'}];
function fixture(lists:unknown[],writeCode=0){
 const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>new Response(JSON.stringify(init?.method==='GET'
  ?{code:0,data:lists.shift()}: {code:writeCode,message:writeCode?'并发冲突':'成功'}),{headers:{'Content-Type':'application/json'}}));
 return {fetcher,service:new RowanService(new RealHttpClient({apiBaseUrl:'https://example.test',iotApiBaseUrl:'https://iot.test'},fetcher),new MemoryStorage())};
}
describe('ROOM-06 deployed row concurrency',()=>{
 it('round-trips zero versions and UTC timestamps, preflights complete membership, and reads back order',async()=>{
  const next=[rooms[1],rooms[0]],{service,fetcher}=fixture([rooms,rooms,next]);
  const baseline=await service.rooms();
  const actual=await service.saveRooms([...baseline.rooms].reverse(),baseline.rooms);
  expect(actual.rooms.map(r=>r.id)).toEqual(['test','default']);
  const put=fetcher.mock.calls.find(([,init])=>init?.method==='PUT')!;
  expect(JSON.parse(String(put[1]?.body))).toEqual({rooms:next.map(({id,name,version,updatedAt})=>({id,name,version,updatedAt}))});
  expect(put[1]?.headers).not.toHaveProperty('If-Match');
 });
 it.each([undefined,-1,NaN,1.5,'2'])('blocks missing or malformed row version %s before any request',async(version)=>{
  const {service,fetcher}=fixture([]);
  const baseline=[{...rooms[0],version}] as unknown as Room[];
  await expect(service.saveRooms(baseline,baseline)).rejects.toMatchObject({code:409});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('blocks an incomplete baseline even when the dropped row is the one being deleted',async()=>{
  const {service,fetcher}=fixture([]);const baseline=[rooms[0],{id:'test',name:'Test'}];
  await expect(service.saveRooms([rooms[0]],baseline)).rejects.toMatchObject({code:409});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it.each(['missing','renamed','added'])('rejects %s rows in the current complete list without PUT',async(change)=>{
  const latest=change==='missing'?[rooms[0]]:change==='renamed'?[rooms[0],{...rooms[1],version:3,name:'Changed'}]:[...rooms,{...rooms[1],id:'external'}];
  const {service,fetcher}=fixture([latest]);
  await expect(service.saveRooms([...rooms].reverse(),rooms)).rejects.toMatchObject({code:409});
  expect(fetcher.mock.calls.every(([,init])=>init?.method==='GET')).toBe(true);
 });
 it('does not retry server conflicts after a successful preflight',async()=>{
  const {service,fetcher}=fixture([rooms],409);
  await expect(service.saveRooms([...rooms].reverse(),rooms)).rejects.toMatchObject({code:409});
  expect(fetcher.mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(1);
 });
 it('refuses to confirm a successful write whose readback order differs',async()=>{
  const {service}=fixture([rooms,rooms]);
  await expect(service.saveRooms([...rooms].reverse(),rooms)).rejects.toThrow('核对');
 });
 it('cancels the whole save when authentication changes after preflight and before PUT',async()=>{
  const {service,fetcher}=fixture([[...rooms].reverse()]);
  vi.spyOn(service,'rooms').mockImplementationOnce(async()=>{service.cancelAuthentication();return {rooms};});
  await expect(service.saveRooms([...rooms].reverse(),rooms)).rejects.toMatchObject({code:499});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('rechecks the current device count before deleting, even when row versions are unchanged',async()=>{
  const {service,fetcher}=fixture([[rooms[0],{...rooms[1],deviceCount:1}]]);
  await expect(service.saveRooms([rooms[0]],rooms)).rejects.toMatchObject({code:409});
  expect(fetcher.mock.calls.every(([,init])=>init?.method==='GET')).toBe(true);
 });
});

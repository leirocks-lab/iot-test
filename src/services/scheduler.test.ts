import { describe,expect,it } from 'vitest';
import { nextExecution } from './scheduler';
import { MockCloud } from './mock-cloud';
import { MemoryStorage,MockDatabase } from './store';
import type { Schedule } from './models';
const schedule:Schedule={id:'test',type:'periodic',enabled:true,name:'test',startTime:'02:30',endTime:'05:00',repeatType:'daily',weekdays:[],action:{Power:1},timeZone:'America/New_York'};
describe('mock cloud scheduling',()=>{
  it('skips DST gap and chooses the first fold occurrence',()=>{
    expect(nextExecution(schedule,new Date('2026-03-08T05:00:00Z'))).toBe('2026-03-09T06:30:00.000Z');
    expect(nextExecution({...schedule,startTime:'01:30'},new Date('2026-11-01T04:00:00Z'))).toBe('2026-11-01T05:30:00.000Z');
  });
  it('rejects a past once time instead of selecting tomorrow',()=>{
    expect(()=>nextExecution({...schedule,type:'once'},new Date('2026-10-07T12:00:00Z'))).toThrow('已过去');
  });
  it('applies current execution once and skips offline execution without backfill',async()=>{
    const db=await MockDatabase.open(new MemoryStorage()),cloud=new MockCloud(db);
    db.state.devices[0].properties.Power=0;
    db.state.schedules.dev_wine=[{...schedule,type:'once',nextExecutionAt:'2026-10-07T06:30:00Z'}];
    await cloud.advance(new Date('2026-10-07T06:29:30Z'));await cloud.advance(new Date('2026-10-07T06:30:00Z'));
    expect(db.state.devices[0].properties.Power).toBe(1);expect(db.state.schedules.dev_wine[0].enabled).toBe(false);
    db.state.devices[0].online=false;db.state.schedules.dev_wine=[{...schedule,type:'once',action:{Power:0},nextExecutionAt:'2026-10-07T06:31:00Z'}];
    await cloud.advance(new Date('2026-10-07T06:31:00Z'));db.state.devices[0].online=true;await cloud.advance(new Date('2026-10-07T06:32:00Z'));
    expect(db.state.devices[0].properties.Power).toBe(1);
  });
});

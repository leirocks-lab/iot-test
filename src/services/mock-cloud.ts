import type { MockDatabase } from './store';
import { localParts, nextExecution } from './scheduler';

// In-process cloud simulation with an injectable clock. Missed ticks are skipped on restart;
// a real cloud scheduler continues independently of App lifecycle.
export class MockCloud {
  private last=0;
  constructor(private db:MockDatabase){}
  async advance(now=new Date()) {
    const previous=this.last||now.getTime()-60000;this.last=now.getTime();
    await this.db.transact(()=>{
      for(const device of this.db.state.devices){
        const schedules=this.db.state.schedules[device.id]??[];
        for(const schedule of schedules){
          if(!schedule.enabled)continue;
          const due=schedule.nextExecutionAt?Date.parse(schedule.nextExecutionAt):NaN;
          if(due<=now.getTime()){
            // Execute only the current window. Offline and old executions are never backfilled.
            if(due>previous&&device.online){Object.assign(device.properties,schedule.action);device.shadowVersion++;}
            if(schedule.type==='once'){schedule.enabled=false;schedule.nextExecutionAt=undefined;}
            else schedule.nextExecutionAt=nextExecution(schedule,now);
          }
          if(schedule.type==='periodic'&&schedule.endTime){
            const p=localParts(now,schedule.timeZone);
            const priorDay=localParts(new Date(now.getTime()-(schedule.endTime<schedule.startTime?86400000:0)),schedule.timeZone);
            const days=schedule.repeatType==='daily'?[1,2,3,4,5,6,7]:schedule.repeatType==='weekdays'?[1,2,3,4,5]:schedule.weekdays;
            if(device.online&&p.time===schedule.endTime&&days.includes(priorDay.weekday)&&localParts(new Date(previous),schedule.timeZone).time!==p.time){device.properties.Power=0;device.shadowVersion++;}
          }
        }
      }
    });
  }
}

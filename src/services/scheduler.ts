import { ApiError, type Schedule } from './models';

export function localParts(date: Date, zone: string) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(date);
  const get = (name: string) => p.find(x=>x.type===name)!.value;
  const day = `${get('year')}-${get('month')}-${get('day')}`;
  return { day, time:`${get('hour')}:${get('minute')}`, weekday:(new Date(day+'T12:00:00Z').getUTCDay() || 7) };
}
export function nextExecution(schedule: Schedule, now = new Date()): string | undefined {
  if (!schedule.enabled) return undefined;
  const formatter = new Intl.DateTimeFormat('en-US',{timeZone:schedule.timeZone});
  formatter.format(now); // reject invalid IANA zones even for disabled fixture data
  const start = Math.floor(now.getTime()/60000)*60000+60000;
  const today = localParts(now,schedule.timeZone).day;
  const allowed = schedule.repeatType==='daily' ? [1,2,3,4,5,6,7] : schedule.repeatType==='weekdays' ? [1,2,3,4,5] : schedule.weekdays;
  for (let t=start;t<start+8*86400000;t+=60000) {
    const date=new Date(t), p=localParts(date,schedule.timeZone);
    if(schedule.type==='once' && p.day!==today) break;
    if(p.time!==schedule.startTime || schedule.type==='periodic'&&!allowed.includes(p.weekday)) continue;
    // DST fold: only the first occurrence. Missing local times naturally have no candidate.
    const prior=localParts(new Date(t-3600000),schedule.timeZone);
    if(prior.day===p.day&&prior.time===p.time)continue;
    return date.toISOString();
  }
  if(schedule.type==='once')throw new ApiError(400,'一次定时时间已过去，请重新选择');
  return undefined;
}
export function validateSchedule(input: Schedule) {
  const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if(!time.test(input.startTime)||!['once','periodic'].includes(input.type))throw new ApiError(400,'定时时间格式错误');
  new Intl.DateTimeFormat('en',{timeZone:input.timeZone}).format();
  if(input.type==='periodic' && (!input.endTime || !time.test(input.endTime)||input.startTime===input.endTime))throw new ApiError(400,'周期起止时间不可相同');
  if(input.repeatType==='custom'&&(!input.weekdays.length||input.weekdays.some(n=>!Number.isInteger(n)||n<1||n>7)))throw new ApiError(400,'请选择有效星期');
  if(!Object.keys(input.action).length)throw new ApiError(400,'请选择执行动作');
}

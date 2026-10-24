import { ApiError, type DeviceView, type ThingModel } from './models';
import type { PropertyValue } from './device-controls';

/** Internal normalization only; the adapter must validate topic/device identity and wire semantics. */
export interface DeviceEvent {identifier:string;occurrenceID?:string;revision?:number;occurredAt?:string;level?:string;data:Record<string,unknown>}
export interface PropertyObservation {reported:Record<string,PropertyValue>;full:boolean}
export interface EventDefinition {identifier:string;title:string;level?:string;guidance?:string;recovery?:{event?:string;property?:{identifier:string;equals:PropertyValue}}}
export interface EventProfile {definitions:readonly EventDefinition[]}
export type EventProfileResolver=(context:{device:DeviceView;model:ThingModel},signal:AbortSignal)=>Promise<EventProfile>;
export interface EventRecord {key:string;scope?:string;event:DeviceEvent;latestRevision?:number;title:string;level?:string;guidance?:string;state:'active'|'recovered';needsCheck:boolean;dismissed:boolean;recovery?:DeviceEvent|PropertyObservation}
export interface EventLedger {sequence:number;records:EventRecord[]}
export const eventLedger=():EventLedger=>({sequence:0,records:[]});
function copy<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
function normalized(value:DeviceEvent):DeviceEvent|undefined{
  if(!value||typeof value.identifier!=='string'||!value.identifier.trim()||value.occurrenceID!==undefined&&(typeof value.occurrenceID!=='string'||!value.occurrenceID.trim())||value.revision!==undefined&&(!Number.isSafeInteger(value.revision)||value.revision<0)||!value.data||typeof value.data!=='object'||Array.isArray(value.data))return;
  try{
    const data=JSON.parse(JSON.stringify(value.data,(_key,item)=>{if(item===undefined||['function','symbol','bigint'].includes(typeof item)||typeof item==='number'&&!Number.isFinite(item))throw new Error('Invalid event data');return item;}));
    return {identifier:value.identifier,...(value.occurrenceID!==undefined?{occurrenceID:value.occurrenceID}:{}),...(value.revision!==undefined?{revision:value.revision}:{}),
      ...(typeof value.occurredAt==='string'&&Number.isFinite(Date.parse(value.occurredAt))?{occurredAt:value.occurredAt}:{}),...(typeof value.level==='string'&&value.level.trim()?{level:value.level}:{}),data};
  }catch{return;}
}
/** Current-device context, never a historical query or a device repair command. */
export class EventControls {
  private profile?:EventProfile;
  private scope?:string;
  constructor(private ledger:EventLedger,private current:()=>boolean=()=>true,private changed:()=>void=()=>undefined){}
  configure(context:{device:DeviceView;model:ThingModel},profile:EventProfile){
    const {model,device}=context;
    if(!model.version||!device.product?.id||!profile||!Array.isArray(profile.definitions))throw new ApiError(503,'产品事件能力尚未确认');
    const ids=new Set<string>(),recoveries=new Set<string>();
    for(const definition of profile.definitions){
      if(!definition||typeof definition.identifier!=='string'||!definition.identifier.trim()||ids.has(definition.identifier)||model.events.filter(item=>item.identifier===definition.identifier).length!==1||typeof definition.title!=='string'||!definition.title.trim()||definition.level!==undefined&&typeof definition.level!=='string'||definition.guidance!==undefined&&typeof definition.guidance!=='string')throw new ApiError(503,'产品事件定义尚未确认');
      ids.add(definition.identifier);
      if(definition.recovery){const {event,property}=definition.recovery;
        if(!event&&!property||event!==undefined&&(typeof event!=='string'||!event.trim()||recoveries.has(event)||model.events.filter(item=>item.identifier===event).length!==1)||property!==undefined&&(!property||model.attributes.filter(item=>item.identifier===property.identifier).length!==1||!['number','string','boolean'].includes(typeof property.equals)||typeof property.equals==='number'&&!Number.isFinite(property.equals)))throw new ApiError(503,'产品事件恢复依据尚未确认');
        if(event)recoveries.add(event);
      }
    }
    if([...recoveries].some(id=>ids.has(id)))throw new ApiError(503,'发生与恢复事件定义存在冲突');
    this.profile=copy(profile);this.scope=JSON.stringify([device.product.id,model.version]);
  }
  get records():readonly EventRecord[]{return copy(this.ledger.records);}
  receive(value:DeviceEvent){
    if(!this.current())return;const event=normalized(value);if(!event)return;
    const recovered=this.profile?.definitions.find(item=>item.recovery?.event===event.identifier);
    const original=recovered&&event.occurrenceID!==undefined&&event.revision!==undefined?this.ledger.records.find(item=>item.scope===this.scope&&item.event.identifier===recovered.identifier&&item.event.occurrenceID===event.occurrenceID&&item.event.revision!==undefined):undefined;
    if(original){if(event.revision! <= original.latestRevision!)return;original.latestRevision=event.revision;original.state='recovered';original.needsCheck=false;original.recovery=copy(event);this.changed();return;}
    const previous=event.occurrenceID!==undefined&&event.revision!==undefined?this.ledger.records.find(item=>item.scope===this.scope&&item.event.identifier===event.identifier&&item.event.occurrenceID===event.occurrenceID&&item.event.revision!==undefined):undefined;
    if(previous&&event.revision! <= previous.latestRevision!)return;
    const definition=this.profile?.definitions.find(item=>item.identifier===event.identifier);
    const record:EventRecord={key:previous?.key??String(++this.ledger.sequence),scope:this.scope,event,latestRevision:event.revision,title:definition?.title??'设备告警',level:event.level??definition?.level,guidance:definition?.guidance,state:'active',needsCheck:false,dismissed:false};
    if(previous)this.ledger.records[this.ledger.records.indexOf(previous)]=record;else this.ledger.records.push(record);this.changed();
  }
  properties(observation:PropertyObservation){
    if(!this.current())return;let changed=false;
    for(const record of this.ledger.records){
      const condition=this.profile?.definitions.find(item=>item.identifier===record.event.identifier)?.recovery?.property;
      if(record.state!=='active'||record.scope!==this.scope||!condition||!Object.hasOwn(observation.reported,condition.identifier)||observation.reported[condition.identifier]!==condition.equals)continue;
      record.state='recovered';record.needsCheck=false;record.recovery=copy(observation);changed=true;
    }
    if(changed)this.changed();
  }
  dismiss(key:string,dismissed=true){if(!this.current())return;const record=this.ledger.records.find(item=>item.key===key);if(record){record.dismissed=dismissed;this.changed();}}
  stop(){for(const record of this.ledger.records)if(record.state==='active')record.needsCheck=true;this.changed();}
}

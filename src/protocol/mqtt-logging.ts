import type { Logger } from '../lib/core';
import { ConsoleLogger, diagnosticSnapshot } from '../services/http-logging';

export type MqttLogLevel='off'|'error'|'debug';
export interface MqttLogOptions {level?:MqttLogLevel;logger?:Logger}
type Event='connect_attempt'|'connected'|'disconnected'|'close_requested'|'subscribe'|'suback'|'puback'|'unsubscribe'|'unsuback';
type Failure='connect_error'|'error'|'subscribe_error'|'publish_error'|'unsubscribe_error'|'disconnected';
export interface MqttLogConnection {
  event(event:Event,topic?:string):void;
  message(direction:'in'|'out',topic:string,payload:Uint8Array):void;
  failure(event:Failure,topic?:string,error?:unknown):void;
}
const LIMIT=4096,TRUNCATED='[TRUNCATED]',REDACTED='[REDACTED]';
let sequence=0;
const sensitive=(key:string)=>/accesskey|credential|signature|^enduserid$|^userid$|^username$|^account$|^email$|^phone$/i.test(key.replace(/[^a-z0-9]/gi,''));
function extraRedaction(key:string,value:unknown):unknown{
  if(sensitive(key))return REDACTED;
  if(typeof value==='string'&&(/wss?:\/\/|X-Amz-/i.test(value)||/(?:password|secret|token|authorization)\s*[:=]/i.test(value)))return REDACTED;
  return value;
}
const metadata=(value:string)=>diagnosticSnapshot(extraRedaction('',value));
function boundedBody(value:unknown){
  const snapshot=diagnosticSnapshot(value),serialized=JSON.stringify(snapshot);
  const text=typeof snapshot==='string'?snapshot:serialized;
  const bytes=new TextEncoder().encode(text);
  if(bytes.length<=LIMIT)return {payload:snapshot,truncated:serialized.includes(TRUNCATED)};
  let end=LIMIT-new TextEncoder().encode(TRUNCATED).length;
  // Never split a UTF-8 character; the marker is part of the 4096-byte payload budget.
  while(end>0){try{return {payload:new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,end))+TRUNCATED,truncated:true};}catch{end--;}}
  return {payload:TRUNCATED,truncated:true};
}
function body(payload:Uint8Array){
  if(!payload.length)return {payload:'[EMPTY]',payloadType:'empty',truncated:false};
  let text:string;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(payload);}catch{return {payload:'[UNPARSEABLE]',payloadType:'binary',truncated:false};}
  try{return {...boundedBody(JSON.parse(text,extraRedaction)),payloadType:'json'};}
  catch{return {payload:'[UNPARSEABLE]',payloadType:'non_json',truncated:false};}
}
function errorInfo(error:unknown){
  const code=error&&typeof error==='object'?Object.getOwnPropertyDescriptor(error,'code')?.value:undefined;
  return {errorType:error instanceof Error&&['Error','TypeError','SyntaxError','AbortError','TimeoutError'].includes(error.name)?error.name:'Error',
    ...(typeof code==='number'&&Number.isFinite(code)||typeof code==='string'&&/^(?:E[A-Z0-9_]{1,30}|ERR_[A-Z0-9_]{1,40})$/.test(code)?{code}:{})};
}
/** Receives only safe metadata and wire messages, never credentials or a signed connection URL. */
export class MqttDiagnostics {
  private level:MqttLogLevel;
  private logger:Logger;
  constructor(options:MqttLogOptions={}){
    this.level=options.level??'off';this.logger=options.logger??new ConsoleLogger();
    if(!['off','error','debug'].includes(this.level))throw new Error('Invalid ROWAN_MQTT_LOG_LEVEL; expected off, error or debug');
  }
  connection(deviceID:string):MqttLogConnection{
    const connectionID=`mqtt-${++sequence}`;
    const emit=(event:string,topic:string|undefined,failed:boolean,details:()=>Record<string,unknown>)=>{
      if(this.level==='off'||this.level==='error'&&!failed)return;
      try{
        const safeTopic=topic===undefined?undefined:metadata(topic);
        const entry={timestamp:new Date().toISOString(),mode:'real',connectionID,deviceID:metadata(deviceID),event,
          ...(safeTopic!==undefined?{topic:safeTopic}:{}),...details()};
        const title=`[MQTT] [${connectionID}] ${event}${safeTopic!==undefined?' '+String(safeTopic).replace(/[\r\n\t]/g,' '):''}`;
        if(failed)this.logger.error(title,entry);else this.logger.debug(title,entry);
      }catch{/* Diagnostic decoding or a broken sink must never change transport behavior. */}
    };
    return {
      event:(event,topic)=>emit(event,topic,false,()=>({})),
      message:(direction,topic,payload)=>emit(direction==='out'?'publish_attempt':'message',topic,false,()=>({direction,bytes:payload.byteLength,...body(payload)})),
      failure:(event,topic,error)=>emit(event,topic,true,()=>error===undefined?{}:errorInfo(error)),
    };
  }
}

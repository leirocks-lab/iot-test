import mqtt from 'mqtt';
import { Buffer } from 'buffer';
import { MqttConnection, type MqttFactory } from './mqtt-connection';
import { mqttConnectParameters } from './mqtt-auth';
import { MqttDiagnostics, type MqttLogOptions } from './mqtt-logging';

export function createMqttConnection(logOptions:MqttLogOptions={}){
  const diagnostics=new MqttDiagnostics(logOptions);
  const factory:MqttFactory=(credentials,options)=>{
    const log=diagnostics.connection(credentials.deviceID);let closing=false;
    log.event('connect_attempt');
    let client:ReturnType<typeof mqtt.connect>;
    try{
      const parameters=mqttConnectParameters(credentials);
      // Never enable MQTT.js raw logging: it may expose STS credentials or signed URLs.
      client=mqtt.connect(parameters.url,{...options,clientId:credentials.clientID,...parameters.authentication,log:()=>undefined});
    }catch(error){log.failure('connect_error',undefined,error);throw error;}
    client.on('connect',()=>log.event('connected'));
    client.on('error',error=>log.failure('error',undefined,error));
    client.on('close',()=>{if(closing)log.event('disconnected');else log.failure('disconnected');});
    // One listener for diagnostics, independently of business subscribers and decoding.
    client.on('message',(topic,payload)=>log.message('in',topic,payload));
    return {
      on:(event,listener)=>{client.on(event,listener);},
      onMessage:listener=>{client.on('message',(topic,payload)=>listener(topic,new Uint8Array(payload)));},
      subscribe:(topic,done)=>{
        log.event('subscribe',topic);
        try{client.subscribe(topic,{qos:1},(error,grants)=>{
          const failure=error||(!grants?.some(grant=>grant.topic===topic&&grant.qos!==128)?new Error('subscribe rejected'):undefined);
          if(failure)log.failure('subscribe_error',topic,failure);else log.event('suback',topic);
          done(failure);
        });}catch(error){log.failure('subscribe_error',topic,error);throw error;}
      },
      unsubscribe:topic=>{
        log.event('unsubscribe',topic);
        try{client.unsubscribe(topic,error=>{if(error)log.failure('unsubscribe_error',topic,error);else log.event('unsuback',topic);});}
        catch(error){log.failure('unsubscribe_error',topic,error);throw error;}
      },
      publish:(topic,payload,done)=>{
        log.message('out',topic,payload);
        try{client.publish(topic,Buffer.from(payload),{qos:1,retain:false},error=>{
          if(error)log.failure('publish_error',topic,error);else log.event('puback',topic);
          done(error??undefined);
        });}catch(error){log.failure('publish_error',topic,error);throw error;}
      },
      end:()=>{closing=true;log.event('close_requested');client.end(true);},
    };
  };
  return new MqttConnection(factory);
}

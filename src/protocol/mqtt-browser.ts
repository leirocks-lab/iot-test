import mqtt from 'mqtt';
import { Buffer } from 'buffer';
import { MqttConnection, type MqttFactory } from './mqtt-connection';

const factory:MqttFactory=(credentials,options)=>{
  const client=mqtt.connect(credentials.host,{...options,clientId:credentials.clientID,username:credentials.username,password:credentials.password,log:()=>undefined});
  return {
    on:(event,listener)=>{client.on(event,listener);},
    onMessage:listener=>{client.on('message',(topic,payload)=>listener(topic,new Uint8Array(payload)));},
    subscribe:(topic,done)=>{client.subscribe(topic,{qos:1},(error,grants)=>done(error||!grants?.some(grant=>grant.topic===topic&&grant.qos!==128)?new Error('subscribe rejected'):undefined));},
    unsubscribe:topic=>{client.unsubscribe(topic,()=>undefined);},
    publish:(topic,payload,done)=>{client.publish(topic,Buffer.from(payload),{qos:1,retain:false},error=>done(error??undefined));},
    end:()=>{client.end(true);},
  };
};
export function createMqttConnection(){return new MqttConnection(factory);}

// node --import tsx scripts/MQTT影子联调.mjs
// Read-only: no desired/reported writes, device actions, certificate or Policy changes.
import { mkdir, writeFile } from 'node:fs/promises';
const unwrap=async path=>{const m=await import(path);return m.default??m;};
const {RowanService}=await unwrap('../src/services/rowan.ts');
const {RealHttpClient}=await unwrap('../src/services/real-http.ts');
const {MemoryStorage}=await unwrap('../src/services/store.ts');
const {createMqttConnection}=await unwrap('../src/protocol/mqtt-browser.ts');
const {RealtimeDeviceSession}=await unwrap('../src/protocol/device-session.ts');
const {createClassicShadowResolver}=await unwrap('../src/protocol/classic-shadow.ts');
try{process.loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw new Error('LOCAL_CONFIGURATION_UNREADABLE');}
const report={time:new Date().toISOString(),environment:'Windows Node / actual App STS-WSS and Classic Shadow adapter',scope:'authorized-device four SUBACKs + zero-byte Shadow get only; no physical controls',stages:[]};
const record=value=>{report.stages.push({elapsedMs:Date.now()-started,...value});console.log(JSON.stringify(value));};
const safeCode=value=>typeof value==='number'||typeof value==='string'&&/^[A-Z_0-9]+$/.test(value)?value:null;
const started=Date.now(),budget=AbortSignal.timeout(45000);
let service,session,stage='configuration';
try{
 const env=process.env;
 if(!env.ROWAN_LOGIN_ACCOUNT||!env.ROWAN_LOGIN_PIN||!env.ROWAN_APP_API_BASE_URL||!env.ROWAN_IOT_API_BASE_URL)throw Object.assign(new Error(),{code:'MISSING_LOCAL_CONFIGURATION'});
 service=new RowanService(new RealHttpClient({environment:'development',apiBaseUrl:env.ROWAN_APP_API_BASE_URL,iotApiBaseUrl:env.ROWAN_IOT_API_BASE_URL,tenantID:env.ROWAN_TENANT_ID??env.ROWAN_LOGIN_TENANT},async(url,init)=>{
  const response=await fetch(url,{...init,redirect:'error',signal:AbortSignal.any([budget,...(init?.signal?[init.signal]:[])])});
  // Log only HTTP status and numeric business code. Never raw response, signed URL or login data.
  let code;try{code=(await response.clone().json()).code;}catch{}
  record({stage:'http',path:new URL(url).pathname,status:response.status,code:safeCode(code)});return response;
 }),new MemoryStorage());
 stage='login';await service.login(env.ROWAN_LOGIN_ACCOUNT,env.ROWAN_LOGIN_PIN,'password');
 stage='home';const groups=await service.home(budget),ids=[...new Set(groups.flatMap(g=>g.devices.map(v=>v.device.id)))];
 const id=env.ROWAN_MQTT_TEST_DEVICE_ID??ids[0];if(!id||!ids.includes(id))throw Object.assign(new Error(),{code:'NO_AUTHORIZED_DEVICE'});
 report.deviceID=id;record({stage,authorizedDeviceCount:ids.length,deviceID:id});
 let owner=service.userID;const revision=service.sessionRevision;
 session=new RealtimeDeviceSession({deviceID:id,userID:owner,current:()=>service.userID===owner&&service.sessionRevision===revision,start:()=>undefined,stop:()=>undefined,
  credentials:async signal=>{stage='credentials';const c=await service.mqtt(id,signal);record({stage,deviceIdentityMatches:c.deviceID===id,fields:Object.keys(c),sts:!!c.sessionToken});return c;},
  connection:async()=>{
   stage='connect';const connection=createMqttConnection({level:env.ROWAN_MQTT_LOG_LEVEL??'debug'});connection.onConnectionChange(connected=>record({stage:'connection',connected}));
   const subscribe=connection.subscribe.bind(connection),publish=connection.publish.bind(connection);
   connection.subscribe=async(topic,handler,signal)=>{stage='subscribe';record({stage,topic});const remove=await subscribe(topic,payload=>{
    try{const b=JSON.parse(new TextDecoder().decode(payload));record({stage:'response',topic,version:b.version,code:safeCode(b.code),reportedKeys:b.state?.reported?Object.keys(b.state.reported):[]});}catch{record({stage:'response',topic,malformed:true});}handler(payload);
   },signal);record({stage:'SUBACK',topic});return remove;};
   connection.publish=async(topic,payload,signal)=>{stage='get';record({stage,topic,bytes:payload.length});await publish(topic,payload,signal);record({stage:'PUBACK',topic});};return connection;
  },
  context:async signal=>{stage='context';const device=await service.device(id,signal);report.productID=device.product?.id;
   let model={version:'',attributes:[],services:[],events:[]};
   if(device.product){try{model=await service.model(device.product.id,signal);record({stage:'model',available:true,version:model.version,attributeIdentifiers:model.attributes.map(a=>a.identifier)});}catch(e){if(signal.aborted||[401,403,499].includes(e.code))throw e;record({stage:'model',available:false,code:safeCode(e.code)});}}
   return {device,model};},profile:createClassicShadowResolver(),timeout:10000});
 await session.connect(budget);report.synchronized=session.ready;
 record({stage:'synchronized',ready:session.ready,canWrite:session.canWrite,reportedKeys:Object.keys(session.confirmed)});
}catch(e){report.synchronized=false;record({stage,result:'failed',code:safeCode(e.code),causeCode:safeCode(e.cause?.code)});process.exitCode=1;}
finally{
 session?.close();if(service?.session){try{await service.logout();record({stage:'logout',result:'passed'});}catch{record({stage:'logout',result:'failed'});process.exitCode=1;}}
 const directory='sdd/迭代变更/变更-20261024-001/联调证据';await mkdir(directory,{recursive:true});
 const name=report.time.replace(/[:.]/g,'-');await writeFile(`${directory}/App影子实测-${name}.json`,JSON.stringify(report,null,2)+'\n');
}

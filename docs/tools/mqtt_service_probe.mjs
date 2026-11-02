// Explicit actual-service read-only MQTT probe. Never publishes desired or device commands.
// Uses old installed MQTT.js only as a test harness; no production dependency on old RN.
import {createRequire} from 'node:module';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {signIoTWebSocket} from './aws_iot_signing.mjs';
process.env.DEBUG='';delete process.env.NODE_DEBUG;
const require=createRequire(new URL('../../app-rn-old/package.json',import.meta.url));
const {connect}=require('mqtt');
const runId=new Date().toISOString().replaceAll(':','-'),results=[];
let token,client;
const platform=process.env.ROWAN_APP_API_BASE_URL,iot=process.env.ROWAN_IOT_API_BASE_URL,tenant=process.env.ROWAN_TENANT_ID;
const portVariant=process.argv.includes('--host-port');
async function request(base,path,method='GET',body) {
  const response=await fetch(base.replace(/\/$/,'')+'/app-api/'+path,{method,redirect:'error',signal:AbortSignal.timeout(20000),
    headers:{'tenant-id':tenant,'Content-Type':'application/json','Accept-Language':'zh-CN',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  const envelope=await response.json();
  if(!response.ok||envelope.code!==0||envelope.success===false)throw new Error('HTTP_SERVICE_FAILURE');
  return envelope.data;
}
try {
  if(!process.argv.includes('--authenticated-readonly')||!platform||!iot||!/^\d+$/.test(tenant??'')||!process.env.ROWAN_LOGIN_ACCOUNT||!process.env.ROWAN_LOGIN_PIN)throw new Error('CONFIGURATION_REQUIRED');
  for(const root of [platform,iot]) {const u=new URL(root);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw new Error('CONFIGURATION_REQUIRED');}
  const fixture=signIoTWebSocket({host:'wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt',username:'AKIDEXAMPLE',password:'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',sessionToken:'fixture+/=token'},new Date('2026-10-22T01:02:03Z'));
  if(new URL(fixture).searchParams.get('X-Amz-Signature')!=='1bb6fc1e00f9317a345bfffa3fc27bda14c615a9de3ccaa18f1fb99a287b3588')throw new Error('SIGNATURE_VECTOR_FAILED');
  results.push({id:'sigv4-public-fixture',result:'通过'});
  const session=await request(platform,'session','POST',{account:process.env.ROWAN_LOGIN_ACCOUNT,pin:process.env.ROWAN_LOGIN_PIN,verify:'password',language:'zh-CN',system:'android'});
  if(typeof session?.accessToken!=='string')throw new Error('SESSION_SHAPE');token=session.accessToken;
  const groups=await request(iot,'devices');
  const owned=Array.isArray(groups)?groups.flatMap(group=>group&&Array.isArray(group.devices)?group.devices:[]).find(item=>item&&typeof item.device?.id==='string'&&item.device.id):null;
  if(!owned)throw new Error('OWNED_DEVICE_REQUIRED');
  const credentials=await request(iot,`devices/${encodeURIComponent(owned.device.id)}/mqtt`);
  if(!credentials||!['host','clientID','deviceID'].every(key=>typeof credentials[key]==='string'&&credentials[key])||/[\/+#\0]/.test(credentials.deviceID))throw new Error('CREDENTIAL_SHAPE');
  const url=new URL(credentials.host);
  if(url.protocol!=='wss:'||url.username||url.password||url.hash)throw new Error('UNSUPPORTED_CONFIGURATION');
  const sts=Object.hasOwn(credentials,'sessionToken');
  const signedURL=sts?signIoTWebSocket(credentials,new Date(),portVariant):credentials.host;
  const prefix=`$aws/things/${credentials.deviceID}/shadow`;
  const topics=['get/accepted','get/rejected','update/accepted','update/rejected'].map(suffix=>`${prefix}/${suffix}`);
  const started=Date.now();let querySent=false,puback=false,snapshot=null;
  await new Promise(resolve=>{
    let done=false;
    const timer=setTimeout(()=>finish('mqtt-readonly-chain','阻塞','连接、订阅或快照超时'),25000);
    function finish(id,result,reason) {if(done)return;done=true;clearTimeout(timer);results.push({id,result,...(reason?{reason}:{})});try{client?.end(true);}catch{}resolve();}
    function complete() {if(snapshot&&puback)finish('mqtt-readonly-chain','通过');}
    try {
      client=connect(signedURL,{clientId:credentials.clientID,protocolVersion:4,clean:true,reconnectPeriod:0,resubscribe:false,queueQoSZero:false,connectTimeout:15000,
        log:()=>undefined,...(!sts?{username:credentials.username,password:credentials.password}:{}),
        ...(portVariant?{wsOptions:{headers:{Host:url.hostname+':443'}}}:{}),transformWsUrl:()=>signedURL});
      client.on('error',()=>finish('mqtt-readonly-chain','失败','Broker握手、认证或传输失败；未记录原始错误/地址/凭据'));
      client.on('close',()=>{if(!done)finish('mqtt-readonly-chain','失败','快照完成前连接关闭');});
      client.on('connect',()=>{
        results.push({id:'mqtt-connect',result:'通过',durationMs:Date.now()-started,authentication:sts?'STS SigV4':'MQTT username/password',hostIncludesDefaultPort:portVariant});
        client.subscribe(topics,{qos:1},(error,grants)=>{
          if(error||!Array.isArray(grants)||grants.length!==4||grants.some(grant=>grant.qos===128))return finish('mqtt-subscriptions','失败','至少一项明确订阅未授权');
          results.push({id:'mqtt-four-explicit-subscriptions',result:'通过',grantedQoS:grants.map(grant=>grant.qos)});
          querySent=true;
          client.publish(prefix+'/get',Buffer.alloc(0),{qos:1,retain:false},error=>{
            if(error)return finish('mqtt-get-puback','失败','查询传输结果未确认');
            puback=true;results.push({id:'mqtt-empty-get-puback',result:'通过'});complete();
          });
        });
      });
      client.on('message',(topic,payload)=>{
        if(!querySent||payload.length>128*1024)return;
        if(topic!==prefix+'/get/accepted'&&topic!==prefix+'/get/rejected')return;
        let value;try{value=JSON.parse(payload.toString('utf8'));}catch{return finish('mqtt-get-response','失败','响应JSON无法解析');}
        if(topic.endsWith('/rejected')) {
          results.push({id:'mqtt-get-rejected',result:'失败',businessCode:typeof value.code==='number'?value.code:null});
          return finish('mqtt-readonly-chain','失败','影子查询被拒绝');
        }
        const reported=value.state?.reported;
        if(!reported||typeof reported!=='object'||Array.isArray(reported))return finish('mqtt-get-response','阻塞','影子无可用reported；未构造默认状态');
        if(snapshot)return;snapshot=true;
        results.push({id:'mqtt-get-reported',result:'通过',version:typeof value.version==='number'?value.version:null,
          reportedFields:Object.keys(reported).sort(),identityMatchesCredential:typeof reported.DeviceId==='string'?reported.DeviceId===credentials.deviceID:null,
          note:'只记录字段名与版本；未记录状态值、设备标识、地址或凭据；不证明设备在线或控制执行'});
        complete();
      });
    }catch{finish('mqtt-readonly-chain','失败','传输参数或构造失败；未记录原始异常');}
  });
}catch(error) {
  const known=['CONFIGURATION_REQUIRED','SIGNATURE_VECTOR_FAILED','SESSION_SHAPE','OWNED_DEVICE_REQUIRED','CREDENTIAL_SHAPE','UNSUPPORTED_CONFIGURATION','UNSUPPORTED_STS_CONFIGURATION'];
  results.push({id:'probe-prerequisite',result:'阻塞',reason:known.includes(error.message)?error.message:'HTTP认证/归属/配置查询失败；未记录请求或响应正文'});
}finally {
  try{client?.end(true);}catch{}
  if(token) {try {await request(platform,'session','DELETE');results.push({id:'probe-session-logout',result:'通过'});}catch{results.push({id:'probe-session-logout',result:'阻塞'});}}
  token=undefined;client=undefined;
  const directory=new URL('../测试报告/重构实施-20261101/',import.meta.url);await mkdir(directory,{recursive:true});
  const report={runId,execution:'Actual Node/MQTT.js service harness; NOT native/emulator MQTT acceptance',libraryVersion:require('mqtt/package.json').version,
    scriptSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),hostIncludesDefaultPort:portVariant,results,
    exclusions:['desired/control publishes','real hardware execution','native transport','RN device integration','reconnect and expiry refresh']};
  await writeFile(new URL(`mqtt-readonly-${runId}.json`,directory),JSON.stringify(report,null,2)+'\n');
}
for(const result of results)console.log(`${result.id}: ${result.result}`);
if(results.some(result=>result.result!=='通过'))process.exitCode=1;

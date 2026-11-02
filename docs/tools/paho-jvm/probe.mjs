// Independent actual-service JVM/Paho probe. No desired/control or native acceptance claim.
import {spawn, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {delimiter, join} from 'node:path';
import {signIoTWebSocket} from '../aws_iot_signing.mjs';
process.env.DEBUG='';delete process.env.NODE_DEBUG;
const root=fileURLToPath(new URL('../../../',import.meta.url));
const source=fileURLToPath(new URL('PahoJvmProbe.java',import.meta.url));
const jar=join(root,'.cache/refactor/paho-1.2.5.jar');
const classes=join(root,'.cache/refactor/paho-jvm/classes');
const jdk='D:/Android/Java/jdk-17.0.20.1+1/bin';
const runId=new Date().toISOString().replaceAll(':','-');
const results=[];
const stages=new Set(['SDK_READY','LOGGER_SELF_CHECK','INPUT','CONNECT','SUBSCRIBE','GET_PUBACK','GET_ACCEPTED','GET_REJECTED','DISCONNECT','WATCHDOG','UNCAUGHT']);
const categories=new Set(['DNS','CONNECT','TLS','TIMEOUT','WEBSOCKET','IO','OTHER']);
const kinds=new Set(['NONE','AUTHORIZATION','TIMEOUT','UNAVAILABLE','CONFIGURATION']);
const safeEnv=Object.fromEntries(['SystemRoot','WINDIR','TEMP','TMP'].filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
class ProbeFailure extends Error {constructor(code){super(code);this.code=code;}}
const mark=(stage,result,code)=>results.push({stage,result,...(code?{code}:{})});
const sha=value=>createHash('sha256').update(value).digest('hex');
let token,platform,iot,tenant,stage='PREPARE',scriptHash,javaHash,jarHash;
function frame(fields){
  const chunks=[];
  for(const field of fields){const bytes=Buffer.from(field,'utf8');if(bytes.length>65536)throw new ProbeFailure('INPUT_LIMIT');const size=Buffer.alloc(4);size.writeInt32BE(bytes.length);chunks.push(size,bytes);}
  return Buffer.concat(chunks);
}
function parseOutput(output){
  const rows=output.trim().split(/\r?\n/).filter(Boolean);
  if(rows.length<1||rows.length>16)throw new ProbeFailure('JVM_OUTPUT_REJECTED');
  return rows.map(line=>{
    let v;try{v=JSON.parse(line);}catch{throw new ProbeFailure('JVM_OUTPUT_REJECTED');}
    if(!v||typeof v!=='object'||Object.keys(v).sort().join(',')!=='causeCategory,durationMs,kind,reasonCode,result,stage'||!stages.has(v.stage)||!['PASS','FAILURE','TIMEOUT'].includes(v.result)||!kinds.has(v.kind)||!categories.has(v.causeCategory)||!(v.reasonCode===null||Number.isInteger(v.reasonCode)&&v.reasonCode>=-2147483648&&v.reasonCode<=2147483647)||!Number.isInteger(v.durationMs)||v.durationMs<0||v.durationMs>120000)throw new ProbeFailure('JVM_OUTPUT_REJECTED');
    return v;
  });
}
function launch(input,selfCheck=false){return new Promise((resolve,reject)=>{
  const args=['-Xms16m','-Xmx96m','-cp',classes+delimiter+jar,'com.rowan.tools.pahojvm.PahoJvmProbe',jar,...(selfCheck?['--self-check']:[])];
  const child=spawn(join(jdk,'java.exe'),args,{cwd:root,env:safeEnv,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',overflow=false,settled=false;
  const timer=setTimeout(()=>{child.kill();finish(new ProbeFailure('JVM_PROCESS_TIMEOUT'));},65000);
  function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);input?.fill(0);error?reject(error):resolve(value);}
  child.stdout.on('data',chunk=>{if(output.length+chunk.length>16384){overflow=true;child.kill();}else{output+=chunk.toString('utf8');}});
  // Drain and discard: JVM/SDK stderr is never printed, retained in reports or rethrown.
  child.stderr.on('data',()=>undefined);
  child.on('error',()=>finish(new ProbeFailure('JVM_LAUNCH_FAILED')));
  child.stdin.on('error',()=>undefined);
  child.on('close',code=>{try{if(overflow)throw new ProbeFailure('JVM_OUTPUT_LIMIT');const rows=parseOutput(output);finish(null,{rows,exitCode:code});}catch{finish(new ProbeFailure('JVM_OUTPUT_REJECTED'));}});
  child.stdin.end(input??Buffer.alloc(0),()=>{input?.fill(0);});
});}
async function request(base,path,method='GET',body){
  const response=await fetch(base.replace(/\/$/,'')+'/app-api/'+path,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{'tenant-id':tenant,'Content-Type':'application/json','Accept-Language':'zh-CN',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json();if(!response.ok||value?.code!==0||value?.success===false)throw new ProbeFailure('HTTP_SERVICE_FAILURE');return value.data;
}
async function prepare(){
  scriptHash=sha(await readFile(fileURLToPath(import.meta.url)));javaHash=sha(await readFile(source));jarHash=sha(await readFile(jar));
  await mkdir(classes,{recursive:true});
  try{execFileSync(join(jdk,'javac.exe'),['--release','17','-encoding','UTF-8','-cp',jar,'-d',classes,source],{cwd:root,env:safeEnv,windowsHide:true,timeout:30000,maxBuffer:262144,stdio:['ignore','pipe','pipe']});}catch{throw new ProbeFailure('JAVAC_FAILED');}
  const checked=await launch(undefined,true);
  if(checked.exitCode!==0||checked.rows.length!==2||checked.rows.some(row=>row.result!=='PASS')||checked.rows[1].stage!=='LOGGER_SELF_CHECK')throw new ProbeFailure('JVM_PREFLIGHT_FAILED');
  mark('JAVAC_AND_LOGGER_PREFLIGHT','PASS');
}
try{
  await prepare();
  if(!process.argv.includes('--preflight')){
    stage='CONFIGURATION';
    if(!process.argv.includes('--authenticated-readonly'))throw new ProbeFailure('READONLY_AUTHORIZATION_REQUIRED');
    platform=process.env.ROWAN_APP_API_BASE_URL;iot=process.env.ROWAN_IOT_API_BASE_URL;tenant=process.env.ROWAN_TENANT_ID;
    if(!platform||!iot||!/^\d+$/.test(tenant??'')||!process.env.ROWAN_LOGIN_ACCOUNT||!process.env.ROWAN_LOGIN_PIN)throw new ProbeFailure('CONFIGURATION_REQUIRED');
    for(const base of [platform,iot]){const u=new URL(base);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw new ProbeFailure('CONFIGURATION_REQUIRED');}
    const fixture=signIoTWebSocket({host:'wss://example-ats.iot.ap-southeast-2.amazonaws.com/mqtt',username:'AKIDEXAMPLE',password:'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',sessionToken:'fixture+/=token'},new Date('2026-10-22T01:02:03Z'),true);
    if(new URL(fixture).searchParams.get('X-Amz-Signature')!=='872790fdb74959803525eaabc7ba186bae286909fcc980175130948ca66de47f')throw new ProbeFailure('SIGNATURE_VECTOR_FAILED');
    mark('SIGV4_HOST443_VECTOR','PASS');
    stage='LOGIN';
    const session=await request(platform,'session','POST',{account:process.env.ROWAN_LOGIN_ACCOUNT,pin:process.env.ROWAN_LOGIN_PIN,verify:'password',language:'zh-CN',system:'android'});
    if(typeof session?.accessToken!=='string'||!session.accessToken)throw new ProbeFailure('SESSION_SHAPE');token=session.accessToken;mark(stage,'PASS');
    stage='HOME_OWNERSHIP';
    const groups=await request(iot,'devices');
    const owned=Array.isArray(groups)?groups.flatMap(group=>group&&Array.isArray(group.devices)?group.devices:[]).find(item=>item&&typeof item.device?.id==='string'&&item.device.id):null;
    if(!owned)throw new ProbeFailure('OWNED_DEVICE_REQUIRED');mark(stage,'PASS');
    stage='DEVICE01_CREDENTIALS';
    const credentials=await request(iot,`devices/${encodeURIComponent(owned.device.id)}/mqtt`);
    if(!credentials||!['host','clientID','deviceID'].every(key=>typeof credentials[key]==='string'&&credentials[key])||/[\/+#\x00-\x1f\x7f]/.test(credentials.deviceID))throw new ProbeFailure('CREDENTIAL_SHAPE');
    const url=new URL(credentials.host);if(url.protocol!=='wss:'||url.username||url.password||url.hash||url.pathname!=='/mqtt')throw new ProbeFailure('UNSUPPORTED_CONFIGURATION');
    const sts=Object.hasOwn(credentials,'sessionToken');
    const signedURI=sts?signIoTWebSocket(credentials,new Date(),true):credentials.host;
    const username=sts?'':credentials.username,password=sts?'':credentials.password;
    if(typeof username!=='string'||typeof password!=='string')throw new ProbeFailure('CREDENTIAL_SHAPE');
    mark(stage,'PASS');stage='JVM_READONLY_CHAIN';
    const executed=await launch(frame(['ROWAN_JVM_PAHO_V1',signedURI,credentials.clientID,credentials.deviceID,username,password]));
    results.push(...executed.rows);
    if(executed.exitCode!==0||!executed.rows.some(row=>row.stage==='GET_ACCEPTED'&&row.result==='PASS'))throw new ProbeFailure('JVM_CHAIN_FAILED');
    mark(stage,'PASS');
  }
}catch(error){mark(stage,'FAILURE',error instanceof ProbeFailure?error.code:'SANITIZED_PROBE_FAILURE');}
finally{
  if(token){try{await request(platform,'session','DELETE');mark('LOGOUT','PASS');}catch{mark('LOGOUT','FAILURE','HTTP_SERVICE_FAILURE');}}
  token=undefined;
  if(!process.argv.includes('--preflight')){
    const directory=new URL('../../测试报告/重构实施-20261101/',import.meta.url);await mkdir(directory,{recursive:true});
    const report={runId,execution:'Actual isolated JVM/Paho 1.2.5 read-only service harness; NOT native/Android/RN acceptance',sdkVersion:'1.2.5',javaRuntime:'JDK17',scriptSha256:scriptHash,javaSourceSha256:javaHash,sdkJarSha256:jarHash,hostIncludesDefaultPort:true,results,exclusions:['desired/control','reported JSON parsing or device state values','physical device online/execution','native/emulator/RN acceptance','reconnect/credential renewal','Android TLS provider equivalence']};
    await writeFile(new URL(`paho-jvm-readonly-${runId}.json`,directory),JSON.stringify(report,null,2)+'\n');
  }
}
for(const value of results)console.log(JSON.stringify(value));
if(results.some(value=>value.result!=='PASS'))process.exitCode=1;

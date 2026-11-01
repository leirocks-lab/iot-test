import { fileURLToPath } from "node:url";
// node --import tsx scripts/张负责功能联调.mjs before|after
import process from 'node:process';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {RowanService} from '../src/services/rowan.ts';
import {RealHttpClient} from '../src/services/real-http.ts';
import {MemoryStorage} from '../src/services/memory-storage.ts';
import {cleanupTemporaryRooms} from './联调房间清理.ts';
try{process.loadEnvFile('.env.local');}catch{/* invoking process can supply configuration */}
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw new Error('请选择before或after；after会创建并清理临时房间');
const base=fileURLToPath(new URL("../../docs/联调证据/张负责功能联调", import.meta.url));
const runID=`${phase}-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`;
const dir=`${base}/联调证据/${runID}`;await mkdir(dir,{recursive:true});
const account=process.env.ROWAN_LOGIN_ACCOUNT,pin=process.env.ROWAN_LOGIN_PIN;
const secrets=[account,pin].filter(Boolean);
const sensitive=/^(authorization|cookie|set-cookie|account|pin|password|captcha|accessToken|refreshToken|username|email)$/i;
function learn(value){if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){if(sensitive.test(key)&&typeof v==='string'&&v)secrets.push(v);else learn(v);}}
function clean(value){if(typeof value==='string')return secrets.reduce((v,s)=>v.replaceAll(s,'[redacted]'),value);if(Array.isArray(value))return value.map(clean);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,sensitive.test(k)?'[redacted]':clean(v)]));return value;}
const report={change:'CHG-20261018-001',runID,phase,time:new Date().toISOString(),environment:'Windows Node / development HTTP / RowanService / RealHttpClient / MemoryStorage',scenarios:[],requests:[],limitations:['未执行Android/iOS真机SecureStore、导航及加载/空态/断网UI验收','未指定测试设备，不执行设备移动及开关，不用Mock替代真实MQTT'],cleanup:[]};
let context;let wireID=0;
const fetcher=async(url,init)=>{
 const id=++wireID,start=Date.now();let body=init?.body;try{body=JSON.parse(body);}catch{/* no JSON body */}
 const wire={id,scenario:context,time:new Date().toISOString(),url,method:init?.method??'GET',requestHeaders:Object.fromEntries(new Headers(init?.headers).entries()),query:Object.fromEntries(new URL(url).searchParams),requestBody:body};
 try{const response=await fetch(url,{...init,redirect:'error',signal:init?.signal??AbortSignal.timeout(20000)});const raw=await response.clone().text();let data;try{data=JSON.parse(raw);}catch{data=raw;}learn(data);Object.assign(wire,{durationMs:Date.now()-start,httpStatus:response.status,responseHeaders:Object.fromEntries(response.headers.entries()),response:data});return response;}
 catch(e){Object.assign(wire,{durationMs:Date.now()-start,transportError:e.message,cause:e.cause?.message});throw e;}
 finally{const safe=clean(wire);report.requests.push(safe);await writeFile(`${dir}/${String(id).padStart(3,'0')}.json`,JSON.stringify(safe,null,2)+'\n',{flag:'wx'});}
};
const client=new RealHttpClient({environment:'development',apiBaseUrl:'http://47.107.80.36',iotApiBaseUrl:'http://47.107.80.36/iot',tenantID:process.env.ROWAN_LOGIN_TENANT},fetcher);
const storage=new MemoryStorage();let service=new RowanService(client,storage);
async function run(name,api,reqs,work){context=name;const start=wireID;try{const value=await work();report.scenarios.push({name,api,reqs,result:'passed',wireIDs:report.requests.filter(r=>r.id>start).map(r=>r.id)});return {ok:true,value};}catch(e){report.scenarios.push({name,api,reqs,result:'failed',code:e.code,message:clean(e.message),wireIDs:report.requests.filter(r=>r.id>start).map(r=>r.id)});return {ok:false};}finally{context=undefined;await writeFile(`${dir}/结果.json`,JSON.stringify(clean(report),null,2)+'\n');}}
function blocked(name,api,reqs,reason){report.scenarios.push({name,api,reqs,result:'blocked',reason});}
const selected=JSON.parse(await readFile(`${base}/来源核对.json`,'utf8')).rows.filter(r=>r.selected).map(r=>r.id);
let originalRooms,createdIDs=new Set();const attemptedNames=new Set();
const names=[`联调-${runID.slice(-16)}-A`,`联调-${runID.slice(-16)}-B`];
async function readRooms(){const value=await service.rooms();assert.ok(Array.isArray(value.rooms),'房间列表必须为数组');return value;}
async function save(snapshot,rooms){await service.saveRooms(rooms,snapshot.rooms);}
try{
 for(const platform of ['android','ios']){
  await run(`${platform}启动配置完整性`,'APP-01',[2],async()=>{const config=await service.config(platform);assert.ok(typeof config?.configVersion==='string'&&config.configVersion,'响应缺少有效configVersion，startupConfig无法使用该配置');});
  await run(`${platform}无有效配置允许启动回退`,'APP-01',[2],async()=>{const value=await service.startupConfig(platform);assert.ok(value===null||typeof value?.configVersion==='string');report.startupFallback={...report.startupFallback,[platform]:value===null?'null（无缓存继续账号入口）':'有效配置'};});
 }
 const login=account&&pin?await run('App原始密码登录及内存会话保存','AUTH-04',[15,17],async()=>{await service.login(account,pin,'password');assert.ok(await storage.get('session'));assert.ok(service.session?.accessToken);}):{ok:false};
 if(!account||!pin)blocked('登录前置配置','AUTH-04',[15,17],'本机测试账号/PIN缺失，未发送登录请求');
 if(login.ok){
  await run('会话恢复刷新','AUTH-05',[3],async()=>{const restored=new RowanService(client,storage);await restored.restore();assert.ok(restored.session,'刷新后应存在会话');service=restored;});
  const home=await run('鉴权首页设备列表','HOME-01',[23,24,25,27],async()=>{const groups=await service.home();assert.ok(Array.isArray(groups));return groups;});
  const devices=home.ok?[...new Map(home.value.flatMap(g=>g.devices).map(d=>[d.device.id,d])).values()]:[];
  report.deviceCount=devices.length;
  for(const d of devices){await run(`设备详情:${d.device.id}`,'DEVICE-02',[30],()=>service.device(d.device.id));await run(`MQTT配置:${d.device.id}`,'DEVICE-01',[25,27,28,29,30],()=>service.mqtt(d.device.id));}
  if(!devices.length)blocked('设备详情及MQTT配置','DEVICE-01/02',[25,27,28,29,30],'真实首页无可用设备，无法取得有效deviceID');
  const list=await run('房间列表与版本基线','ROOM-03',[97],async()=>{const value=await readRooms();originalRooms=value.rooms;report.roomBaseline={count:originalRooms.length,etagPresent:!!value.version,rowVersions:originalRooms.map(r=>({id:r.id,version:r.version,updatedAt:r.updatedAt}))};return value;});
  if(phase==='after'&&list.ok){
   let prerequisites=true;
   for(const name of names){
    attemptedNames.add(name);report.roomCandidates=[...attemptedNames];
    await writeFile(`${dir}/结果.json`,JSON.stringify(clean(report),null,2)+'\n');
    const result=await run(`新建临时房间:${name}`,'ROOM-04',[98],async()=>{let writeError;try{await service.createRoom(name);}catch(e){writeError=e;}const fresh=await readRooms();const matches=fresh.rooms.filter(r=>r.name===name);if(matches.length===1)createdIDs.add(matches[0].id);if(writeError)throw writeError;assert.equal(matches.length,1,'写后必须读取到唯一新房间');});
    if(!result.ok){prerequisites=false;break;}
   }
   if(prerequisites){
    const a=[...createdIDs][0];
    await run('临时房间改名并核对','ROOM-05',[99],async()=>{await service.renameRoom(a,`${names[0]}-改`);const fresh=await readRooms();assert.equal(fresh.rooms.find(r=>r.id===a)?.name,`${names[0]}-改`);});
    await run('临时房间排序并核对','ROOM-06',[100],async()=>{const fresh=await readRooms();const others=fresh.rooms.filter(r=>!createdIDs.has(r.id));const own=fresh.rooms.filter(r=>createdIDs.has(r.id)).reverse();await save(fresh,[...others,...own]);const actual=await readRooms();assert.deepEqual(actual.rooms.map(r=>r.id),[...others,...own].map(r=>r.id));});
    await run('过期逐行版本应拒绝整体覆盖','ROOM-06',[102],async()=>{const stale=await readRooms();await service.renameRoom(a,`${names[0]}-新`);let conflict;try{await save(stale,stale.rooms);}catch(e){conflict=e;}assert.equal(conflict?.code,409,'App应在预读时拒绝过期版本');let serverConflict;try{await service.request({method:'PUT',path:'/api/app/user/locations',body:{rooms:stale.rooms.map(({id,name,version,updatedAt})=>({id,name,version,updatedAt}))}});}catch(e){serverConflict=e;}assert.equal(serverConflict?.code,409,'服务端必须拒绝逐房间过期版本');const fresh=await readRooms();assert.equal(fresh.rooms.find(r=>r.id===a)?.name,`${names[0]}-新`,'冲突后不得覆盖新名称');});
   }else blocked('临时房间改名/排序/冲突','ROOM-05/06',[99,100,102],'创建临时房间未完成，停止后续写操作');
  }else blocked('房间写操作','ROOM-04/05/06',[98,99,100,101,102],phase==='before'?'修复前阶段仅读取，不执行无锁整体覆盖':'房间列表前置失败');
  blocked('设备移动与快速开关及MQTT恢复','ROOM-01/MQTT',[25,28,29,103],'未明确指定测试设备；不执行移动、开关、断线及真实属性回报验收');
 }else{
  for(const [name,api,reqs] of [['会话恢复','AUTH-05',[3]],['鉴权首页与设备','HOME-01/DEVICE-01/02',[23,24,25,27,28,29,30]],['房间管理','ROOM-03/04/05/06/01',[97,98,99,100,101,102,103]]])blocked(name,api,reqs,'App原始登录未建立会话，禁止用脚本注入字段或Mock代替');
 }
}finally{
 if(attemptedNames.size){
  await run('删除临时房间及清理核对','ROOM-06',[101],async()=>{
   const cleanup=service.session?await cleanupTemporaryRooms(service,[...attemptedNames],createdIDs,originalRooms??[]):{result:'failed',candidateNames:[...attemptedNames],reason:'会话已丢失，请人工核对候选房间'};
   report.cleanup.push(cleanup);assert.equal(cleanup.result,'passed',cleanup.reason);
  });
 }
 if(service.session)await run('退出并清理内存会话','AUTH-06',[22],async()=>{await service.logout();assert.equal(service.session,null);assert.equal(await storage.get('session'),null);});
 report.requirements=selected.map(req=>({req,scenarios:report.scenarios.filter(s=>s.reqs.includes(req)).map(s=>({name:s.name,result:s.result})),nativeAcceptance:'未验证'}));
 await writeFile(`${dir}/结果.json`,JSON.stringify(clean(report),null,2)+'\n');
 console.log(`证据目录：${dir}`);for(const s of report.scenarios)console.log(`${s.result}: ${s.name}${s.code?` (${s.code})`:''}`);
 if(report.scenarios.some(s=>s.result==='failed'))process.exitCode=1;
}

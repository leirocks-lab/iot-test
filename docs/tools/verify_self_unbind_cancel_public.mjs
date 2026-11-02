// Continues one recorded login; this tool never selects the positive dialog action.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dumpHierarchy} from './android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
import {sourceFingerprint} from './source_fingerprint.mjs';
import {nodes,safeTarget,cancelTarget,packageId as pkg} from './self-unbind-cancel-guard.mjs';
import {parseForeground} from './android-home-fixture-matrix/state.mjs';
const id=process.argv.find(v=>v.startsWith('--parent-run='))?.slice(13);
if(!id||!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(id))throw Error('RECORDED_PARENT_REQUIRED');
const dir=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const parent=JSON.parse(await readFile(new URL(`android-emulator-${id}.json`,dir),'utf8'));
if(!parent.sessionKept||!parent.installedArtifactMatchesBuild||!parent.results.some(r=>r.id==='AUTH-04-native-emulator'&&r.result==='通过'))throw Error('VERIFIED_KEPT_SESSION_REQUIRED');
const source=sourceFingerprint(['android-as','app-rn']);
if(source.sourceSha256!==parent.sourceSha256)throw Error('PARENT_SOURCE_CHANGED');
const serial='emulator-5554',runId=new Date().toISOString().replaceAll(':','-');
const adb=args=>execFileSync('D:/Android/Sdk/platform-tools/adb.exe',['-s',serial,...args],{encoding:'utf8',timeout:20000,maxBuffer:3*1024*1024,stdio:['ignore','pipe','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const allowed=new Set(['home_device_open','rn-open-more','rn-more-self-unbind','rn-feature-back','rn-device-close']);
let relay=null,stage='verify-apk',ownedConfirmation=false;const results=[];
function screen(){const xml=dumpHierarchy(serial,'/sdcard/rowan-self-unbind-cancel.xml');if(nodes(xml).some(n=>n.package&&n.package!==pkg))throw Error('UNKNOWN_SURFACE');return xml;}
const find=(xml,id)=>nodes(xml).find(n=>n['resource-id']===id||n['resource-id']===`${pkg}:id/${id}`);
function tap(target){adb(['shell','input','tap',String(target.x),String(target.y)]);}
async function until(predicate){for(let n=0;n<12;n++){const xml=screen();if(predicate(xml))return xml;await sleep(400);}throw Error('EXPECTED_STATE_MISSING');}
async function click(id,{scroll=false}={}){
 if(!allowed.has(id))throw Error('UNSAFE_ACTION');
 for(let n=0;n<(scroll?6:1);n++){
  let xml=screen(),a=find(xml,id);
  if(a){const first=safeTarget(a);await sleep(250);xml=screen();const second=safeTarget(find(xml,id));if(JSON.stringify(first)!==JSON.stringify(second))throw Error('UNSTABLE_ACTION');tap(second);return;}
  if(!scroll)break;
  const b=nodes(xml)[0]?.bounds?.match(/^\[0,0\]\[(\d+),(\d+)\]$/);if(!b)throw Error('VIEWPORT_MISSING');
  adb(['shell','input','swipe',String(Math.floor(+b[1]*.94)),String(Math.floor(+b[2]*.8)),String(Math.floor(+b[1]*.94)),String(Math.floor(+b[2]*.3)),'350']);
 }throw Error('EXPECTED_ACTION_MISSING');
}
function foreground(){const value=parseForeground(adb(['shell','dumpsys','activity','activities']));if(value.packageId!==pkg||value.activity!=='com.rowan.iot.rnhost.DeviceActivity')throw Error('DEVICE_ACTIVITY_NOT_RESUMED');}
function pass(id){results.push({id,result:'通过'});console.log(`${id}: 通过`);}
try{
 const path=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).find(v=>v.endsWith('/base.apk'))?.slice(8);
 if(!path||adb(['shell','sha256sum',path]).trim().split(/\s+/)[0]!==parent.installedArtifactSha256)throw Error('APK_CHANGED');
 relay=await startLoopbackDnsRelay({upstream:'192.168.31.1'});
 stage='device-entry';await click('home_device_open');await until(x=>!!find(x,'rn-device-status'));
 stage='more-entry';await click('rn-open-more');await until(x=>!!find(x,'rn-more-loaded'));
 stage='confirmation';await click('rn-more-self-unbind',{scroll:true});
 const xml=await until(x=>nodes(x).some(n=>n.text==='解除设备关联'));foreground();cancelTarget(xml);ownedConfirmation=true;pass('S096-native-confirmation');
 stage='cancel';const target=cancelTarget(screen());foreground();tap(target);ownedConfirmation=false;
 await until(x=>find(x,'rn-self-unbind-status')?.text==='已取消，本次未发送请求');pass('S096-cancel-visible-result');
 stage='return';await click('rn-feature-back');await until(x=>!!find(x,'rn-device-close'));await click('rn-device-close');await until(x=>!!find(x,'home_logout'));pass('S096-cancel-return-home');
}catch(error){results.push({id:'S096-cancel-flow',result:'阻塞',stage,code:['UNKNOWN_SURFACE','UNEXPECTED_CONFIRMATION','UNEXPECTED_BUTTONS','UNSAFE_ACTION','INVALID_BOUNDS','EXPECTED_STATE_MISSING','UNSTABLE_ACTION','EXPECTED_ACTION_MISSING','VIEWPORT_MISSING','DEVICE_ACTIVITY_NOT_RESUMED','APK_CHANGED'].includes(error.message)?error.message:'CANCEL_VALIDATION_FAILURE'});console.log(`S096-cancel-flow: 阻塞 (${stage})`);}
finally{
 if(ownedConfirmation)try{foreground();tap(cancelTarget(screen()));}catch{results.push({id:'confirmation-cleanup',result:'阻塞'});}
 if(relay)await relay.close();
 const after=sourceFingerprint(['android-as','app-rn']);
 if(after.sourceSha256!==source.sourceSha256)results.push({id:'source-unchanged',result:'失败'});
 await writeFile(new URL(`android-self-unbind-cancel-${runId}.json`,dir),JSON.stringify({runId,parentRunId:id,scriptSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),guardSha256:createHash('sha256').update(await readFile(new URL('./self-unbind-cancel-guard.mjs',import.meta.url))).digest('hex'),installedArtifactSha256:parent.installedArtifactSha256,source,sourceUnchanged:source.sourceSha256===after.sourceSha256,results,positiveActions:0,dnsForwarding:relay?.snapshot()??null,limits:'仅验证确认和取消，未执行真实解绑；未抓包，不据此声称网络层零请求。真实关系写联调仍阻塞；未截图或保存设备昵称。会话须由后续正常退出流程关闭。'},null,2)+'\n');
}
if(results.some(r=>r.result!=='通过'))process.exitCode=1;

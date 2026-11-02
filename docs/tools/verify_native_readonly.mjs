// Continue a recorded successful native login. No login, room mutation, binding or device command.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dumpHierarchy} from './android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
const scriptSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
const parentId=process.argv.find(value=>value.startsWith('--parent-run='))?.slice(13);
if(!parentId||!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentId))throw new Error('A recorded parent run is required');
const directory=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const parent=JSON.parse(await readFile(new URL(`android-emulator-${parentId}.json`,directory),'utf8'));
if(!parent.results.some(value=>value.id==='AUTH-04-native-emulator'&&value.result==='通过'))throw new Error('Parent login was not verified');
const pkg='com.rowan.iot.dev.refactor',serial='emulator-5554',runId=new Date().toISOString().replaceAll(':','-');
const adb=args=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let stage='existing-home';const results=[],screenshots=[];
const has=(xml,id)=>xml.includes(`${pkg}:id/${id}`);
function target(xml,id) {
  const tag=[...xml.matchAll(/<node\b[^>]*>/g)].map(value=>value[0]).find(value=>value.includes(`resource-id="${id}"`)||value.includes(`resource-id="${pkg}:id/${id}"`));
  if(!tag)throw new Error('EXPECTED_VIEW_MISSING');return fromTag(tag);
}
function fromTag(tag) {
  const bounds=tag.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)?.slice(1).map(Number);
  if(!bounds||bounds[2]<=bounds[0]||bounds[3]<=bounds[1])throw new Error('EXPECTED_VIEW_BOUNDS');
  return {tag,bounds};
}
function tap(value) {const b=value.bounds;adb(['shell','input','tap',String(Math.floor((b[0]+b[2])/2)),String(Math.floor((b[1]+b[3])/2))]);}
async function screen() {
  const xml=dumpHierarchy(serial,'/sdcard/rowan-readonly.xml');
  if(!xml.includes('<hierarchy'))throw new Error('HIERARCHY_UNAVAILABLE');
  if(xml.includes('android:id/aerr_wait'))throw new Error('APP_OR_SYSTEM_ANR');return xml;
}
async function until(predicate) {
  for(let attempt=0;attempt<12;attempt++) {const xml=await screen();if(predicate(xml))return xml;await wait(500);}
  throw new Error('EXPECTED_STATE_MISSING');
}
async function stable(id) {
  let previous='';
  for(let attempt=0;attempt<10;attempt++) {
    const xml=await screen();let value;
    try {value=target(xml,id);}catch {await wait(400);continue;}
    const key=value.bounds.join(',')+'|'+value.tag.match(/text="[^"]*"/)?.[0];
    if(key===previous)return {xml,value};previous=key;await wait(400);
  }
  throw new Error('VIEW_NOT_STABLE');
}
async function scrollTo(id) {
  for(let n=0;n<6;n++) {
    const xml=await screen();try {target(xml,id);return stable(id);}catch{}
    const b=xml.match(/bounds="\[0,0\]\[(\d+),(\d+)\]"/);if(!b)throw new Error('VIEWPORT_MISSING');
    adb(['shell','input','swipe',String(Math.floor(+b[1]*.94)),String(Math.floor(+b[2]*.8)),String(Math.floor(+b[1]*.94)),String(Math.floor(+b[2]*.3)),'350']);
  }
  throw new Error('SCROLL_TARGET_MISSING');
}
async function capture(label) {
  const name=`${runId}-${label}.png`;screenshots.push(name);
  await writeFile(new URL(name,directory),execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{timeout:30000,stdio:['ignore','pipe','pipe']}));
}
function pass(id,note) {results.push({id,result:'通过',stage,note});console.log(`${id}: 通过`);}
const home=xml=>['home_title','home_add','home_rooms','home_logout'].some(id=>has(xml,id));
let installedArtifactSha256=null,relay=null;
const dnsUpstream=process.argv.find(x=>x.startsWith('--dns-upstream='))?.slice('--dns-upstream='.length);
try {
  if(dnsUpstream)relay=await startLoopbackDnsRelay({upstream:dnsUpstream});
  const path=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).find(value=>value.endsWith('/base.apk'))?.slice(8);
  if(!path)throw new Error('INSTALLED_ARTIFACT_MISSING');
  installedArtifactSha256=adb(['shell','sha256sum',path]).trim().split(/\s+/)[0];
  if(installedArtifactSha256!==parent.installedArtifactSha256)throw new Error('PARENT_ARTIFACT_CHANGED');
  let xml=dumpHierarchy(serial,'/sdcard/rowan-native-readonly.xml');
  if(process.argv.includes('--logout-only')&&xml.includes('resource-id="rn-device-close"'))tap(target(xml,'rn-device-close'));
  xml=await until(home);
  if(!process.argv.includes('--skip-rn-bootstrap')&&!process.argv.includes('--logout-only')) {
    stage='rn-stable-entry';tap((await stable('home_device_open')).value);
    xml=await until(value=>value.includes('resource-id="rn-device-status"'));
    pass('RN-release-bundle-host-context-retest','仅内置包及只读页面渲染，真实 MQTT 快照另有证据');
    await capture('rn-bootstrap-retest');tap(target(xml,'rn-device-close'));
    xml=await until(home);pass('RN-native-return-retest');
  }
  if(!process.argv.includes('--logout-only')) {
  stage='rooms-read-only';tap((await scrollTo('home_rooms')).value);
  xml=await until(value=>has(value,'rooms_add')&&target(value,'rooms_add').tag.includes('enabled="true"'));
  pass('ROOM-03-native-read','只读加载，不证明编辑、默认标记或删除通过');await capture('rooms-read-only');
  tap((await stable('rooms_back')).value);xml=await until(home);
  stage='catalog-read-only';tap((await scrollTo('home_add')).value);
  xml=await until(value=>has(value,'add_manual')&&has(value,'add_scan'));
  pass('ADD-native-entry-sheet','真实原生添加入口，不代表蓝牙发现或完整视觉');
  tap((await stable('add_manual')).value);
  xml=await until(value=>has(value,'products_card')||value.includes('暂无可添加产品'));
  pass('PAIR-01-03-native-catalog','真实目录加载，不包含配网/绑定');await capture('catalog-read-only');
  const tag=[...xml.matchAll(/<node\b[^>]*>/g)].map(value=>value[0]).find(value=>value.includes(`resource-id="${pkg}:id/products_open_details"`));
  if(tag) {
    stage='product-details-read-only';tap(fromTag(tag));
    xml=await until(value=>has(value,'product_details_content')&&!has(value,'product_details_status'));
    pass('PAIR-02-native-detail','真实目录 ID 的文本详情；没有打开图片/Shop');await capture('product-detail-read-only');
    tap((await stable('products_back')).value);xml=await until(value=>has(value,'products_title'));
  }else results.push({id:'PAIR-02-native-detail',result:'未验收',stage,note:'没有可打开产品，不猜 ID'});
  tap((await stable('products_back')).value);xml=await until(home);pass('catalog-rooms-return-stack');
  }
  stage='logout';tap((await scrollTo('home_logout')).value);
  await until(value=>has(value,'welcome_login'));pass('AUTH-06-native-logout-continuation');
}catch(error) {
  const allowed=['EXPECTED_VIEW_MISSING','EXPECTED_VIEW_BOUNDS','HIERARCHY_UNAVAILABLE','APP_OR_SYSTEM_ANR','EXPECTED_STATE_MISSING','VIEW_NOT_STABLE','VIEWPORT_MISSING','SCROLL_TARGET_MISSING','INSTALLED_ARTIFACT_MISSING','PARENT_ARTIFACT_CHANGED'];
  const errorCode=allowed.includes(error.message)?error.message:'READONLY_RUNTIME_FAILURE';
  results.push({id:'readonly-flow',result:'阻塞',stage,errorCode});console.log(`readonly-flow: 阻塞 (${stage}/${errorCode})`);
}finally {
  if(relay)try{await relay.close();}catch{results.push({id:'dns-cleanup',result:'阻塞',stage,errorCode:'DNS_CLOSE_UNCONFIRMED'});}
  try {adb(['shell','rm','-f','/sdcard/rowan-readonly.xml']);}catch{}
  await writeFile(new URL(`android-native-readonly-${runId}.json`,directory),JSON.stringify({runId,parentRunId:parentId,serial,packageId:pkg,
    scriptSha256,
    installedArtifactSha256,buildProvenance:parent.buildProvenance,dnsForwarding:relay?.snapshot()??null,results,screenshots,
    limits:'继续已记录的本轮测试会话；不登录、不改房间、不绑定、不发送 MQTT 控制；完整UI/iOS/硬件未验收',
    rnExcludedForIsolation:process.argv.includes('--skip-rn-bootstrap')||process.argv.includes('--logout-only'),
    logoutOnly:process.argv.includes('--logout-only')},null,2)+'\n');
}
if(results.some(value=>value.result!=='通过'))process.exitCode=1;

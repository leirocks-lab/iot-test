// Root-only exclusive AVD window. Two native denied-camera layouts; never opens the gallery.
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dumpHierarchy,AndroidUiSnapshotError} from './android-ui/snapshot.mjs';
import {sourceFingerprint} from './source_fingerprint.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
import {parseCameraAppOps,cameraAppOpsEquivalent} from './android-ui/camera-appops.mjs';

const root=new URL('../../',import.meta.url),reports=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const pkg='com.rowan.iot.dev.refactor',permission='android.permission.CAMERA',adbPath='D:/Android/Sdk/platform-tools/adb.exe';
const runId=new Date().toISOString().replaceAll(':','-'),expectedStatus='相机暂不可用，可使用相册或返回。';
const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const sha=data=>createHash('sha256').update(data).digest('hex');
const scriptSha256=sha(await readFile(new URL(import.meta.url))),results=[],screenshots=[];
const cameraAppOpsSha256=sha(await readFile(new URL('./android-ui/camera-appops.mjs',import.meta.url)));
let serial=null,parentSha=null,parentId=null,installed=null,sourceBefore=null;
let ready=false,environment=null,originalPermission=null,environmentTouched=false,permissionTouched=false,relay=null;
let restoring=false,interrupted=false,stage='arguments',environmentRestoration=null,permissionRestoration=null,logout=null,logoutActions=0;
let activeDensity=null;
let displayViewport=null,permissionRequestOwned=false,permissionDialogRestoration=null;
class Failure extends Error {constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new Failure(code);};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stop=()=>{interrupted=true;};process.on('SIGINT',stop);process.on('SIGTERM',stop);
function adb(args,timeout=20_000) {
  if(!/^emulator-\d+$/.test(serial??''))fail('EMULATOR_REQUIRED');
  if(interrupted&&!restoring)fail('INTERRUPTED');
  try{return execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8',timeout,maxBuffer:3*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch{fail('ADB_OPERATION_UNAVAILABLE');}
}
const attr=(tag,key)=>tag?.match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1]??'';
const nodes=xml=>[...xml.matchAll(/<node\b[^>]*>/g)].map(x=>x[0]);
const id=value=>pkg+':id/'+value;
function node(xml,value){const matches=nodes(xml).filter(x=>attr(x,'resource-id')===id(value));return matches.length===1?matches[0]:null;}
const rect=tag=>tag?.match(/bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/)?.slice(1).map(Number);
// Runtime permission/dialog windows can have offscreen or empty outer bounds.
// Target coordinates are absolute; the verified wm display is the stable boundary.
function viewport(xml){if(!displayViewport)fail('VIEWPORT_UNCONFIRMED');return displayViewport;}
function useDisplayEnvironment(value){const [width,height]=(value.size.override??value.size.physical).split('x').map(Number);displayViewport={width,height};}
function geometry(xml,value) {
  const tag=node(xml,value),bounds=rect(tag),v=viewport(xml);
  const minimum=activeDensity&&['scan_back','scan_album','scan_permission','scan_settings'].includes(value)?Math.floor(48*activeDensity/160)-1:0;
  return {id:value,bounds:bounds??null,enabled:tag?attr(tag,'enabled')!=='false':false,clickable:attr(tag,'clickable')==='true',minimumActionSizePx:minimum,
    withinViewport:Boolean(bounds&&bounds[0]>=0&&bounds[1]>=0&&bounds[2]>bounds[0]&&bounds[3]>bounds[1]&&bounds[2]<=v.width&&bounds[3]<=v.height&&bounds[2]-bounds[0]>=minimum&&bounds[3]-bounds[1]>=minimum)};
}
async function screen() {
  for(let n=0;n<3;n++)try {
    const xml=dumpHierarchy(serial,'/sdcard/rowan-scan-denied-layout.xml');
    if(nodes(xml).some(x=>['android:id/aerr_wait','android:id/aerr_close'].includes(attr(x,'resource-id'))))fail('SYSTEM_ANR_DIALOG');
    return xml;
  }catch(error){if(error instanceof AndroidUiSnapshotError&&error.code==='ROOT_NOT_READY'&&n<2){await wait(300);continue;}if(error instanceof Failure)throw error;fail('SNAPSHOT_UNAVAILABLE');}
}
async function until(predicate) {const deadline=Date.now()+30_000;for(let n=0;n<22&&Date.now()<deadline;n++){const xml=await screen();if(predicate(xml))return xml;await wait(350);}fail('EXPECTED_STATE_TIMEOUT');}
function tap(xml,tag) {const r=rect(tag),v=viewport(xml);if(!r||attr(tag,'enabled')==='false'||attr(tag,'clickable')!=='true'||r[0]<0||r[1]<0||r[2]>v.width||r[3]>v.height||r[2]<=r[0]||r[3]<=r[1])fail('TARGET_NOT_ACTIONABLE');adb(['shell','input','tap',String(Math.floor((r[0]+r[2])/2)),String(Math.floor((r[1]+r[3])/2))]);}
async function stable(select) {let before=null;for(let n=0;n<16;n++){const xml=await screen(),tag=select(xml),r=rect(tag),v=viewport(xml);const valid=r&&attr(tag,'enabled')!=='false'&&r[0]>=0&&r[1]>=0&&r[2]>r[0]&&r[3]>r[1]&&r[2]<=v.width&&r[3]<=v.height;const key=valid?r.join(','):null;if(key&&key===before)return {xml,tag};before=key;await wait(300);}fail('STABLE_TARGET_UNAVAILABLE');}
async function click(value){const target=await stable(xml=>node(xml,value));tap(target.xml,target.tag);}
function installedSha(){const file=adb(['shell','pm','path',pkg]).split(/\r?\n/).map(x=>x.trim()).find(x=>x.endsWith('/base.apk'))?.replace(/^package:/,'');if(!file||!/^\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(file))fail('ARTIFACT_UNVERIFIABLE');const hash=adb(['shell','sha256sum',file]).trim().split(/\s+/)[0];if(!/^[a-f0-9]{64}$/.test(hash))fail('ARTIFACT_UNVERIFIABLE');return hash;}
function parseWm(text,label,pattern) {
  const lines=text.replaceAll('\r','').split('\n').map(x=>x.trim()).filter(Boolean);
  const physical=lines.filter(x=>new RegExp('^Physical '+label+': '+pattern+'$').test(x));
  const overrides=lines.filter(x=>new RegExp('^Override '+label+': '+pattern+'$').test(x));
  if(physical.length!==1||overrides.length>1||lines.length!==physical.length+overrides.length)fail('DISPLAY_PRESTATE_UNRESTORABLE');
  return {physical:physical[0].split(': ')[1],override:overrides[0]?.split(': ')[1]??null};
}
function readEnvironment() {
  const size=parseWm(adb(['shell','wm','size']),'size','[1-9]\\d*x[1-9]\\d*');
  const density=parseWm(adb(['shell','wm','density']),'density','[1-9]\\d*');
  const font=adb(['shell','settings','get','system','font_scale']).trim();
  if(font!=='null'&&(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(font)||!Number.isFinite(Number(font))||Number(font)<=0))fail('FONT_PRESTATE_UNRESTORABLE');
  return {size,density,fontScale:font};
}
function permissionState() {
  const rows=[...adb(['shell','dumpsys','package',pkg]).matchAll(/^\s*android\.permission\.CAMERA:\s*granted=(true|false),\s*flags=\[([ A-Z_|]*)\]/gm)];
  if(rows.length!==1)fail('CAMERA_PRESTATE_UNCONFIRMED');
  const flags=rows[0][2].split('|').map(x=>x.trim()).filter(Boolean).sort(),allowed=new Set(['USER_SET','USER_FIXED','USER_SENSITIVE_WHEN_GRANTED','USER_SENSITIVE_WHEN_DENIED']);
  if(flags.some(x=>!allowed.has(x)))fail('CAMERA_FLAGS_UNRESTORABLE');
  const output=adb(['shell','cmd','appops','get',pkg,'CAMERA']);
  const modes=parseCameraAppOps(output);
  if(!modes)fail('CAMERA_APPOP_UNRESTORABLE');
  return {granted:rows[0][1]==='true',flags,...modes};
}
function setFlags(flags){adb(['shell','pm','clear-permission-flags',pkg,permission,'user-set','user-fixed']);for(const [flag,cli]of [['USER_SET','user-set'],['USER_FIXED','user-fixed']])if(flags.includes(flag))adb(['shell','pm','set-permission-flags',pkg,permission,cli]);}
function prepareDenial(){permissionTouched=true;adb(['shell','pm','revoke',pkg,permission]);setFlags([]);adb(['shell','cmd','appops','set',pkg,'CAMERA','default']);const value=permissionState();if(value.granted||value.flags.includes('USER_SET')||value.flags.includes('USER_FIXED'))fail('DENIAL_DIALOG_PRECONDITION_FAILED');}
function activityIsScan() {
  // Fixed activity identity only; the full dumpsys body remains in memory.
  const rows=adb(['shell','dumpsys','activity','activities']).split(/\r?\n/).filter(x=>/\b(?:mResumedActivity|topResumedActivity)\s*[:=]/.test(x));
  const meaningful=rows.filter(x=>!/[=:]\s*null\s*$/.test(x));
  return meaningful.length>0&&meaningful.every(x=>/\bcom\.rowan\.iot\.dev\.refactor\/(?:com\.rowan\.iot\.features\.scan\.ScanActivity|\.features\.scan\.ScanActivity)(?=\s|\})/.test(x));
}
function activityIsHome() {
  const rows=adb(['shell','dumpsys','activity','activities']).split(/\r?\n/).filter(x=>/\b(?:mResumedActivity|topResumedActivity)\s*[:=]/.test(x)&&!/[=:]\s*null\s*$/.test(x));
  return rows.length>0&&rows.every(x=>/\bcom\.rowan\.iot\.dev\.refactor\/(?:com\.rowan\.iot\.features\.home\.HomeActivity|\.features\.home\.HomeActivity)(?=\s|\})/.test(x));
}
function scanShape(xml){return attr(nodes(xml)[0],'package')===pkg&&!node(xml,'home_title')&&!node(xml,'welcome_login')&&!node(xml,'account_email');}
function guardScan(xml,{fixedText=false}={}) {
  if(!scanShape(xml)||!activityIsScan()||permissionState().granted)fail('NATIVE_DENIED_SCAN_GUARD');
  const status=node(xml,'scan_status');
  if(status&&attr(status,'text')!==expectedStatus)fail('DENIED_STATE_CHANGED');
  if(fixedText&&(!status||!geometry(xml,'scan_status').withinViewport))fail('FIXED_ERROR_NOT_VISIBLE');
}
function swipe(xml,direction) {const v=viewport(xml);adb(['shell','input','swipe',String(Math.floor(v.width*.86)),String(Math.floor(v.height*(direction==='down'?.30:.78))),String(Math.floor(v.width*.86)),String(Math.floor(v.height*(direction==='down'?.78:.30))),'300']);}
async function reach(value,direction,scan=false) {
  for(let n=0;n<7;n++) {
    const xml=await screen();if(scan)guardScan(xml);else if(attr(nodes(xml)[0],'package')!==pkg||!activityIsHome())fail('HOME_ROUTE_CHANGED');
    const view=geometry(xml,value);if(view.withinViewport&&view.enabled)return {xml,swipes:n};swipe(xml,direction);await wait(300);
  }fail('SCROLL_TARGET_UNREACHABLE');
}
async function coldHome(){if(installedSha()!==installed)fail('ARTIFACT_CHANGED');adb(['shell','am','force-stop',pkg]);adb(['shell','am','start','-n',pkg+'/com.rowan.iot.features.auth.WelcomeActivity']);return until(xml=>node(xml,'home_title')||node(xml,'welcome_login'));}
async function enterDeniedScan() {
  const home=await coldHome();if(!node(home,'home_title'))fail('PARENT_SESSION_NOT_RESTORED');
  stage=stage+'-home';await reach('home_add','up');await click('home_add');
  stage=stage+'-add-sheet';permissionRequestOwned=true;await click('add_scan');
  stage=stage+'-permission-dialog';
  const deny=await stable(xml=>{if(!['com.google.android.permissioncontroller','com.android.permissioncontroller'].includes(attr(nodes(xml)[0],'package')))return null;const matches=nodes(xml).filter(x=>['com.google.android.permissioncontroller:id/permission_deny_button','com.android.permissioncontroller:id/permission_deny_button'].includes(attr(x,'resource-id')));return matches.length===1?matches[0]:null;});
  tap(deny.xml,deny.tag);
  permissionRequestOwned=false;
  await until(xml=>scanShape(xml)&&['scan_title','scan_album','scan_permission','scan_status'].some(x=>node(xml,x)));
  // Error may initially be below the fold in small/large-font layouts; inspect scroll reachability.
  const reached=await reach('scan_status','up',true);guardScan(reached.xml,{fixedText:true});
}
async function capture(configuration) {
  const before=await screen();guardScan(before,{fixedText:true});
  let png;try{png=execFileSync(adbPath,['-s',serial,'exec-out','screencap','-p'],{timeout:15_000,maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});}catch{fail('SAFE_CAPTURE_FAILED');}
  const after=await screen();guardScan(after,{fixedText:true});
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||png.readUInt32BE(16)!==configuration.width||png.readUInt32BE(20)!==configuration.height)fail('CAPTURE_VIEWPORT_MISMATCH');
  const file=runId+'-scan-denied-layout-'+configuration.name+'.png';await writeFile(new URL(file,reports),png);screenshots.push(file);return file;
}
async function inspect(configuration) {
  stage=configuration.name+'-geometry';const ids=['scan_back','scan_title','scan_status','scan_album','scan_permission'];
  const frames=[],reached=[];
  const record=xml=>{
    guardScan(xml);const v=viewport(xml);if(v.width!==configuration.width||v.height!==configuration.height)fail('VIEWPORT_MISMATCH');
    const observed=ids.map(x=>geometry(xml,x)),overlaps=[];
    for(let a=0;a<observed.length;a++)for(let b=a+1;b<observed.length;b++)if(observed[a].withinViewport&&observed[b].withinViewport){const x=observed[a].bounds,y=observed[b].bounds;if(Math.min(x[2],y[2])>Math.max(x[0],y[0])&&Math.min(x[3],y[3])>Math.max(x[1],y[1]))overlaps.push([observed[a].id,observed[b].id]);}
    frames.push({viewport:v,observed,overlaps,settingsObserved:geometry(xml,'scan_settings').withinViewport});
  };
  await reach('scan_back','down',true);record(await screen());
  for(const value of ids) {
    const found=await reach(value,['scan_back','scan_title'].includes(value)?'down':'up',true);record(found.xml);
    const target=await stable(xml=>node(xml,value));guardScan(target.xml);const view=geometry(target.xml,value);
    reached.push({id:value,reached:view.withinViewport&&view.enabled&&(!['scan_back','scan_album','scan_permission'].includes(value)||view.clickable),scrollAttempts:found.swipes,reachableViaScroll:found.swipes>0});
  }
  await reach('scan_status','down',true);const screenshot=await capture(configuration);
  const passed=reached.every(x=>x.reached)&&frames.every(x=>x.overlaps.length===0);
  results.push({id:configuration.name+'-denied-scan-geometry',configuration,geometryResult:passed?'通过':'失败',frames,reached,screenshot,
    visualResult:'未验收：几何/滚动可达不证明字形、换行、触摸、遮罩及蓝湖视觉一致',settingsPolicy:'条件显示；仅记录观察，不点击设置或授予相机'});
  await reach('scan_back','down',true);await click('scan_back');await until(xml=>node(xml,'home_title'));
}
async function restoreEnvironment() {
  const attempts=[];for(const [kind,args]of [
    ['size',['shell','wm','size',environment.size.override??'reset']],['density',['shell','wm','density',environment.density.override??'reset']],
    ['font',environment.fontScale==='null'?['shell','settings','delete','system','font_scale']:['shell','settings','put','system','font_scale',environment.fontScale]]])
    try{adb(args);attempts.push({kind,completed:true});}catch{attempts.push({kind,completed:false});}
  await wait(500);let observed=null;try{observed=readEnvironment();}catch{}
  return {result:attempts.every(x=>x.completed)&&JSON.stringify(observed)===JSON.stringify(environment)?'通过':'阻塞',attempts,observed};
}
function restorePermission(){
  adb(['shell','am','force-stop',pkg]);const attempts=[];
  for(const [kind,run]of [
    ['grant',()=>adb(['shell','pm',originalPermission.granted?'grant':'revoke',pkg,permission])],
    ['flags',()=>setFlags(originalPermission.flags)],
    ['appOp',()=>adb(['shell','cmd','appops','set',pkg,'CAMERA',originalPermission.appOp])]])
    try{run();attempts.push({kind,completed:true});}catch{attempts.push({kind,completed:false});}
  let observed=null;try{observed=permissionState();}catch{}
  const matched=observed&&observed.granted===originalPermission.granted&&
    observed.flags.join('|')===originalPermission.flags.join('|')&&cameraAppOpsEquivalent(originalPermission,observed);
  return {result:attempts.every(x=>x.completed)&&matched?'通过':'阻塞',attempts,observed,
    packageEntryPresenceMatches:observed?observed.packageEntryPresent===originalPermission.packageEntryPresent:null,
    historyRestored:false,comparison:'Strict grant/flags/UID mode; Android16 CAMERA effective package mode. Package entry/history is not restored.'};
}
async function normalLogout(){
  const xml=await coldHome();if(node(xml,'welcome_login'))return {result:'通过',actionCount:0,state:'already-signed-out'};
  const target=await reach('home_logout','up');if(attr(node(target.xml,'home_logout'),'text')==='重试本地清理')fail('LOCAL_CLEANUP_PENDING');
  const stableTarget=await stable(value=>node(value,'home_logout'));
  if(attr(stableTarget.tag,'text')!=='退出登录')fail('NORMAL_LOGOUT_TARGET_UNCONFIRMED');
  logoutActions++;tap(stableTarget.xml,stableTarget.tag);await until(value=>node(value,'welcome_login'));
  return {result:'通过',actionCount:1,state:'normal-logout-confirmed'};
}

await mkdir(reports,{recursive:true});
try {
  if(process.argv.slice(2).some(x=>!['--parent-run=','--dns-upstream='].some(prefix=>x.startsWith(prefix))))fail('UNKNOWN_ARGUMENT');
  parentId=arg('--parent-run');if(!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentId??''))fail('RECORDED_PARENT_REQUIRED');
  const bytes=await readFile(new URL('android-emulator-'+parentId+'.json',reports)),parent=JSON.parse(bytes);parentSha=sha(bytes);
  if(parent.sessionKept!==true||parent.packageId!==pkg||!/^emulator-\d+$/.test(parent.serial??'')||!parent.results?.some(x=>x.id==='AUTH-04-native-emulator'&&x.result==='通过'))fail('RETAINED_PARENT_REQUIRED');
  serial=parent.serial;installed=installedSha();if(installed!==parent.installedArtifactSha256)fail('PARENT_ARTIFACT_CHANGED');
  const avd=adb(['emu','avd','name']).split(/\r?\n/).map(x=>x.trim()).find(x=>x&&x!=='OK');
  if(!['ROWAN_API36','ROWAN_API_36'].includes(avd)||adb(['shell','getprop','sys.boot_completed']).trim()!=='1')fail('DEDICATED_READY_AVD_REQUIRED');
  sourceBefore=sourceFingerprint(['android-as','app-rn']);
  if(parent.sourceSha256!==sourceBefore.sourceSha256||parent.installedArtifactMatchesBuild!==true||parent.buildProvenance?.sourceUnchangedDuringBuild!==true||parent.buildProvenance?.artifactSha256!==installed||parent.buildProvenance?.sourceAfter?.sourceSha256!==sourceBefore.sourceSha256)fail('PARENT_SOURCE_UNVERIFIED');
  stage='exact-environment-prestate';environment=readEnvironment();useDisplayEnvironment(environment);originalPermission=permissionState();ready=true;
  if(arg('--dns-upstream'))relay=await startLoopbackDnsRelay({upstream:arg('--dns-upstream')});
  const [width,height]=(environment.size.override??environment.size.physical).split('x').map(Number);
  const configurations=[{name:'small',size:'640x1280',density:'320',densityDpi:320,font:'1.0',width:640,height:1280},
    {name:'font150',size:environment.size.override??'reset',density:environment.density.override??'reset',densityDpi:Number(environment.density.override??environment.density.physical),font:'1.5',width,height}];
  for(const configuration of configurations) {
    activeDensity=configuration.densityDpi;
    stage=configuration.name+'-configure';adb(['shell','am','force-stop',pkg]);environmentTouched=true;
    adb(['shell','wm','size',configuration.size]);adb(['shell','wm','density',configuration.density]);adb(['shell','settings','put','system','font_scale',configuration.font]);
    prepareDenial();await wait(600);
    const observed=readEnvironment();
    if((observed.size.override??observed.size.physical)!==configuration.width+'x'+configuration.height||
      Number(observed.density.override??observed.density.physical)!==configuration.densityDpi||Number(observed.fontScale)!==Number(configuration.font))fail('CONFIGURATION_UNCONFIRMED');
    useDisplayEnvironment(observed);
    configuration.observedEnvironment=observed;
    stage=configuration.name+'-native-scan';await enterDeniedScan();await inspect(configuration);
  }
}catch(error){results.push({id:'scan-denied-layout-flow',stage,geometryResult:'阻塞',errorCode:error instanceof Failure?error.code:'SCAN_LAYOUT_ENVIRONMENT_UNAVAILABLE'});}
finally {
  restoring=true;
  if(ready&&permissionRequestOwned)try {
    const xml=await screen();
    if(['com.google.android.permissioncontroller','com.android.permissioncontroller'].includes(attr(nodes(xml)[0],'package'))) {
      const deny=nodes(xml).filter(tag=>/:(?:id)\/permission_deny_button$/.test(attr(tag,'resource-id')));
      if(deny.length!==1)fail('OWN_PERMISSION_DIALOG_UNCONFIRMED');
      tap(xml,deny[0]);await until(value=>!['com.google.android.permissioncontroller','com.android.permissioncontroller'].includes(attr(nodes(value)[0],'package')));
      permissionDialogRestoration={result:'通过',action:'deny-own-pending-camera-dialog'};
    }else permissionDialogRestoration={result:'不适用'};
  }catch{permissionDialogRestoration={result:'阻塞',errorCode:'PERMISSION_DIALOG_DISMISS_UNCONFIRMED'};}
  else permissionDialogRestoration={result:'不适用'};
  if(ready)try{adb(['shell','am','force-stop',pkg]);}catch{results.push({id:'finally-force-stop',geometryResult:'阻塞',errorCode:'APP_STOP_UNCONFIRMED'});}
  if(environmentTouched)try{environmentRestoration=await restoreEnvironment();if(environmentRestoration.observed)useDisplayEnvironment(environmentRestoration.observed);}catch{environmentRestoration={result:'阻塞',errorCode:'DISPLAY_RESTORE_UNCONFIRMED'};}
  else environmentRestoration={result:'不适用'};
  if(permissionTouched)try{permissionRestoration=restorePermission();}catch{permissionRestoration={result:'阻塞',errorCode:'PERMISSION_RESTORE_UNCONFIRMED'};}
  else permissionRestoration={result:'不适用'};
  if(ready)try{logout=await normalLogout();}catch(error){logout={result:'阻塞',actionCount:logoutActions,errorCode:error instanceof Failure?error.code:'NORMAL_LOGOUT_UNCONFIRMED'};}
  else logout={result:'不适用',actionCount:0};
  if(relay)try{await relay.close();}catch{results.push({id:'dns-close',geometryResult:'阻塞',errorCode:'DNS_CLOSE_UNCONFIRMED'});}
  let sourceAfter=null;try{if(sourceBefore)sourceAfter=sourceFingerprint(['android-as','app-rn']);}catch{}
  const report={runId,parentRunId:/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentId??'')?parentId:null,parentReportSha256:parentSha,scriptSha256,cameraAppOpsSha256,packageId:pkg,serial,installedArtifactSha256:installed,
    sourceBefore,sourceAfter,sourceUnchanged:Boolean(sourceBefore&&sourceBefore.sourceSha256===sourceAfter?.sourceSha256),
    originalEnvironment:environment,originalPermission,environmentRestoration,permissionRestoration,permissionDialogRestoration,logout,dnsForwarding:relay?.snapshot()??null,results,screenshots,
    scope:'Two native denied-camera Scan layouts only; no gallery selection or real camera frame capture.',
    limits:['Not pixel/visual/touch acceptance; online Lanhu version remains unverified.','No camera frame decoding, production QR parser, binding, hardware, iOS or whole scope acceptance.',
      'No raw XML/dumpsys/CLI/account/gallery data is retained. Captures require native Scan identity, denied CAMERA and exact visible error before AND after screencap.',
      'Restore display/font and compare strict CAMERA grant/flags/UID plus Android16 effective package mode; absent package default is allow. Package entry/history is not restored and UID AppOps are never explicitly written.','SIGINT/SIGTERM enter finally after bounded commands; force-kill cannot guarantee restoration.']};
  await writeFile(new URL('android-scan-denied-layout-'+runId+'.json',reports),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:'android-scan-denied-layout-'+runId+'.json',configurations:results.filter(x=>x.configuration).length,environmentRestoration:environmentRestoration.result,permissionRestoration:permissionRestoration.result,logout:logout.result}));
  if(results.some(x=>x.geometryResult!=='通过')||[environmentRestoration,permissionRestoration,permissionDialogRestoration,logout].some(x=>x.result==='阻塞')||!report.sourceUnchanged)process.exitCode=1;
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);if(interrupted)process.exitCode=130;
}

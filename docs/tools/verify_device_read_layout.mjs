// Executes real GET-only RN layout checks in an explicitly retained validation session.
// Never archives hierarchy/text or writes device relationships, schedules, firmware or preferences.
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dumpHierarchy,AndroidUiSnapshotError} from './android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
import {sourceFingerprint} from './source_fingerprint.mjs';

const directory=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const argument=name=>process.argv.find(value=>value.startsWith(`${name}=`))?.slice(name.length+1);
const parentId=argument('--parent-run');
if(!parentId||!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentId))throw new Error('RECORDED_PARENT_REQUIRED');
const parentBytes=await readFile(new URL(`android-emulator-${parentId}.json`,directory));
const parent=JSON.parse(parentBytes.toString('utf8'));
const pkg='com.rowan.iot.dev.refactor',serial=parent.serial;
if(parent.sessionKept!==true||!Array.isArray(parent.results)||
   !parent.results.some(row=>row.id==='AUTH-04-native-emulator'&&row.result==='通过')||
   parent.packageId!==pkg||typeof serial!=='string'||!/^emulator-\d+$/.test(serial)||
   !/^[a-f0-9]{64}$/.test(parent.installedArtifactSha256??''))throw new Error('RETAINED_VALIDATION_PARENT_REQUIRED');
const runId=new Date().toISOString().replaceAll(':','-');
const results=[],screenshots=[];
const sourceBefore=sourceFingerprint(['android-as','app-rn']);
const scriptSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
const parentReportSha256=createHash('sha256').update(parentBytes).digest('hex');
let interrupted=false,cleanupPhase=false;
const interrupt=()=>{interrupted=true;};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
const adb=args=>{
  if(interrupted&&!cleanupPhase)fail('INTERRUPTED');
  return execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:25_000,stdio:['ignore','pipe','pipe']});
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const remoteXml='/sdcard/rowan-device-read-layout.xml';
let stage='precondition',validatedParent=false,environment=null,environmentTouched=false,relay=null;
let installedArtifactSha256=null,avdName=null,restoration=null,logout=null;

class LayoutFailure extends Error {constructor(code){super(code);this.code=code;}}
function fail(code){throw new LayoutFailure(code);}
function attribute(tag,name){return tag?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]??null;}
function bounds(tag){
  const match=tag?.match(/bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/);
  return match?match.slice(1).map(Number):null;
}
function nodes(xml){return [...xml.matchAll(/<node\b[^>]*>/g)].map(value=>value[0]);}
function node(xml,id){return nodes(xml).find(tag=>attribute(tag,'resource-id')===id);}
const nativeId=id=>`${pkg}:id/${id}`;
const has=(xml,id)=>Boolean(node(xml,id));
function within(rect,viewport){return Boolean(rect&&rect[0]>=0&&rect[1]>=0&&rect[2]<=viewport.width&&rect[3]<=viewport.height&&rect[2]>rect[0]&&rect[3]>rect[1]);}
function geometry(xml,id,viewport){const tag=node(xml,id),rect=bounds(tag);return {id,bounds:rect,withinViewport:within(rect,viewport),enabled:tag?attribute(tag,'enabled')!=='false':false};}
function viewportOf(xml){
  const rect=bounds(nodes(xml)[0]);
  if(!rect||rect[0]!==0||rect[1]!==0||rect[2]<=0||rect[3]<=0)fail('VIEWPORT_UNAVAILABLE');
  return {width:rect[2],height:rect[3]};
}
function overlap(a,b){return Math.min(a[2],b[2])>Math.max(a[0],b[0])&&Math.min(a[3],b[3])>Math.max(a[1],b[1]);}
function tap(xml,id){
  const view=geometry(xml,id,viewportOf(xml));
  if(!view.withinViewport||!view.enabled)fail('TARGET_NOT_ACTIONABLE');
  const [x1,y1,x2,y2]=view.bounds;
  adb(['shell','input','tap',String(Math.floor((x1+x2)/2)),String(Math.floor((y1+y2)/2))]);
}
async function screen(){
  // No stale-file fallback; only this explicit transient root-not-ready status retries.
  for(let attempt=0;attempt<3;attempt++){
    if(interrupted&&!cleanupPhase)fail('INTERRUPTED');
    try {
      const xml=dumpHierarchy(serial,remoteXml);
      if(xml.includes('resource-id="android:id/aerr_wait"')||xml.includes('resource-id="android:id/aerr_close"'))fail('SYSTEM_ANR_DIALOG');
      if(!xml.includes('<hierarchy'))fail('HIERARCHY_UNAVAILABLE');
      return xml;
    }catch(error){
      if(error instanceof AndroidUiSnapshotError&&error.code==='ROOT_NOT_READY'&&attempt<2){await wait(350);continue;}
      throw error;
    }
  }
  fail('ROOT_RETRY_LIMIT');
}
async function until(predicate,{milliseconds=30_000,attempts=18}={}){
  const deadline=Date.now()+milliseconds;
  for(let attempt=0;attempt<attempts&&Date.now()<deadline;attempt++){
    const xml=await screen();if(predicate(xml))return xml;await wait(450);
  }
  fail('EXPECTED_STATE_TIMEOUT');
}
function parseWm(text,label,shape){
  const physical=[...text.matchAll(new RegExp(`^Physical ${label}: (${shape})\\s*$`,'gm'))];
  const overrides=[...text.matchAll(new RegExp(`^Override ${label}: (${shape})\\s*$`,'gm'))];
  if(physical.length!==1||overrides.length>1)fail('ENVIRONMENT_SHAPE_UNSUPPORTED');
  return {physical:physical[0][1],override:overrides[0]?.[1]??null};
}
function captureEnvironment(){
  const size=parseWm(adb(['shell','wm','size']).replaceAll('\r',''),'size','[1-9][0-9]*x[1-9][0-9]*');
  const density=parseWm(adb(['shell','wm','density']).replaceAll('\r',''),'density','[1-9][0-9]*');
  const font=adb(['shell','settings','get','system','font_scale']).trim();
  if(font!=='null'&&(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(font)||Number(font)<=0))fail('FONT_PRESTATE_UNSUPPORTED');
  return {size,density,fontScale:font,fontWasAbsent:font==='null'};
}
function installedSha(){
  const path=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).find(line=>line.endsWith('/base.apk'))?.replace(/^package:/,'');
  if(!path||!/^\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(path))fail('INSTALLED_ARTIFACT_MISSING');
  const sha=adb(['shell','sha256sum',path]).trim().split(/\s+/)[0];
  if(!/^[a-f0-9]{64}$/.test(sha))fail('INSTALLED_ARTIFACT_UNVERIFIABLE');
  return sha;
}
async function coldHome(){
  adb(['shell','am','force-stop',pkg]);
  adb(['shell','am','start','-n',`${pkg}/com.rowan.iot.features.auth.WelcomeActivity`]);
  const xml=await until(value=>has(value,nativeId('home_title'))||has(value,nativeId('welcome_login')));
  if(has(xml,nativeId('welcome_login')))fail('SESSION_NOT_RESTORED');
  // Central pending-cleanup is not a valid retained login and is never clicked as logout.
  if(attribute(node(xml,nativeId('home_logout')),'text')==='重试本地清理')fail('SESSION_CLEANUP_PENDING');
  return xml;
}
async function stableTarget(id){
  let previous=null,repeats=0;
  const deadline=Date.now()+30_000;
  for(let attempt=0;attempt<18&&Date.now()<deadline;attempt++){
    const xml=await screen(),view=geometry(xml,id,viewportOf(xml));
    if(view.withinViewport&&view.enabled){
      const key=view.bounds.join(',');repeats=key===previous?repeats+1:1;previous=key;
      if(repeats>=2)return xml;
    }else {previous=null;repeats=0;}
    await wait(450);
  }
  fail('STABLE_TARGET_UNAVAILABLE');
}
async function scrollTo(id){
  for(let attempt=0;attempt<6;attempt++){
    const xml=await screen(),viewport=viewportOf(xml);
    if(geometry(xml,id,viewport).withinViewport)return xml;
    adb(['shell','input','swipe',String(Math.floor(viewport.width*.92)),String(Math.floor(viewport.height*.78)),
      String(Math.floor(viewport.width*.92)),String(Math.floor(viewport.height*.32)),'300']);
    await wait(300);
  }
  fail('SCROLL_TARGET_UNAVAILABLE');
}
function terminal(xml,feature){
  if(feature==='schedules'){
    if(has(xml,'rn-schedules-empty')&&!has(xml,'rn-schedules-loaded'))return 'empty';
    if(has(xml,'rn-schedules-loaded'))return 'loaded';
    if(has(xml,'rn-schedules-error'))return 'error';
  }else if(has(xml,'rn-firmware-kind-mcu')){
    if(has(xml,'rn-firmware-error')&&has(xml,'rn-firmware-error-mcu')&&!has(xml,'rn-firmware-loaded'))return 'error';
    if(has(xml,'rn-firmware-loaded')&&has(xml,'rn-firmware-result-mcu'))return 'loaded';
  }
  return null;
}
async function readTerminal(feature){return until(xml=>terminal(xml,feature)!==null,{milliseconds:35_000,attempts:22});}
async function inspectGeometry(xml,required,feature,state,configuration){
  const frames=[],reachable=[];
  const record=value=>{
    const viewport=viewportOf(value);
    if(viewport.width!==configuration.width||viewport.height!==configuration.height)fail('VIEWPORT_MISMATCH');
    if(terminal(value,feature)!==state)fail('READ_STATE_CHANGED');
    const observed=required.map(id=>geometry(value,id,viewport));
    const overlaps=[];
    for(let a=0;a<observed.length;a++)for(let b=a+1;b<observed.length;b++){
      if(observed[a].withinViewport&&observed[b].withinViewport&&overlap(observed[a].bounds,observed[b].bounds))
        overlaps.push([observed[a].id,observed[b].id]);
    }
    frames.push({index:frames.length,viewport,observed,overlaps});return observed;
  };
  record(xml);
  for(const id of required){
    let observed=geometry(xml,id,viewportOf(xml)),swipes=0;
    while(!observed.withinViewport&&swipes<4){
      const viewport=viewportOf(xml),above=observed.bounds?observed.bounds[1]<0:swipes>=2;
      // Content-only swipes; do not touch the fixed navigation/footer controls.
      adb(['shell','input','swipe',String(Math.floor(viewport.width*.85)),String(Math.floor(viewport.height*(above?0.32:0.72))),
        String(Math.floor(viewport.width*.85)),String(Math.floor(viewport.height*(above?0.72:0.32))),'300']);
      await wait(350);xml=await screen();record(xml);swipes++;
      observed=geometry(xml,id,viewportOf(xml));
    }
    reachable.push({id,withinInitialViewport:frames[0].observed.find(view=>view.id===id).withinViewport,
      reached:observed.withinViewport,scrollAttempts:swipes,reachableViaScroll:swipes>0&&observed.withinViewport});
  }
  const geometryPassed=reachable.every(view=>view.reached)&&frames.every(frame=>frame.overlaps.length===0);
  return {xml,geometry:{result:geometryPassed?'通过':'失败',allWithinInitialViewport:reachable.every(view=>view.withinInitialViewport),
    reachable,frames,limits:'Only accessible node rectangles and reachability; glyph clipping, padding, safe-area appearance and touch quality require manual visual review.'}};
}
async function safeCapture(xml,feature,state,name){
  const safe=value=>{
    const expected=feature==='schedules'?state==='empty'&&terminal(value,feature)==='empty':
      state==='error'&&terminal(value,feature)==='error'&&has(value,'rn-firmware-error-mcu');
    return expected&&!has(value,nativeId('home_title'))&&!has(value,nativeId('account_email'))&&!has(value,nativeId('welcome_login'));
  };
  if(!safe(xml)||!safe(await screen()))fail('SCREENSHOT_PRIVACY_GUARD');
  const file=`${runId}-device-read-layout-${name}.png`;
  const bytes=execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{timeout:15_000,stdio:['ignore','pipe','pipe']});
  // A navigation/account transition after the precheck must discard the in-memory PNG.
  if(!safe(await screen()))fail('SCREENSHOT_PRIVACY_GUARD');
  await writeFile(new URL(file,directory),bytes);screenshots.push(file);return file;
}
async function inspectFeature(feature,configuration){
  stage=`${configuration.name}-${feature}`;
  const entry=await stableTarget(`rn-open-${feature}`);tap(entry,`rn-open-${feature}`);
  let xml=await readTerminal(feature);const state=terminal(xml,feature);
  const status=feature==='schedules'?(state==='empty'?'rn-schedules-empty':state==='loaded'?'rn-schedules-loaded':'rn-schedules-error'):
    state==='error'?'rn-firmware-error-mcu':'rn-firmware-result-mcu';
  const required=['rn-feature-back',status,`${feature==='schedules'?'rn-schedules':'rn-firmware'}-retry`,'rn-device-close'];
  const inspected=await inspectGeometry(xml,required,feature,state,configuration);xml=inspected.xml;
  const expectedLayout=feature==='schedules'?state==='empty'||state==='loaded':state==='error';
  const screenshot=(feature==='schedules'&&state==='empty'||feature==='firmware'&&state==='error')?
    await safeCapture(xml,feature,state,`${configuration.name}-${feature}-${state}`):null;
  results.push({id:`${configuration.name}-${feature}-geometry`,configuration:configuration.name,feature,kind:feature==='firmware'?'mcu':null,state,
    geometryResult:expectedLayout?inspected.geometry.result:'阻塞',geometry:inspected.geometry,screenshot,
    businessResult:feature==='firmware'?'阻塞：本矩阵不证明可用固件候选或升级业务通过':state==='error'?'阻塞：日程列表未取得':'通过：仅真实只读列表/空态呈现',
    visualResult:'未验收：需人工对照参考，检查字形、换行、间距、状态与触摸',
    note:feature==='schedules'&&state==='loaded'?'Contains user-entered data: geometry metadata only, no screenshot/text/hierarchy archived.':
      feature==='firmware'?'Real read error may validate error layout; it does not establish the backend cause or firmware availability.':
      'Empty list screenshot only; no schedule creation/edit/enable/delete.'});
  console.log(`${configuration.name}-${feature}: ${results.at(-1).geometryResult} (${state})`);
  xml=await stableTarget('rn-feature-back');tap(xml,'rn-feature-back');
  await until(value=>has(value,'rn-device-status')&&!has(value,'rn-feature-back'));
}
async function restoreEnvironment(){
  const attempts=[];
  const operations=[['size',['shell','wm','size',environment.size.override??'reset']],
    ['density',['shell','wm','density',environment.density.override??'reset']],
    ['font',environment.fontWasAbsent?['shell','settings','delete','system','font_scale']:
      ['shell','settings','put','system','font_scale',environment.fontScale]]];
  for(const [kind,args] of operations){try{adb(args);attempts.push({kind,completed:true});}catch{attempts.push({kind,completed:false});}}
  await wait(600);
  let observed=null;try{observed=captureEnvironment();}catch{}
  const matched=observed&&observed.size.physical===environment.size.physical&&observed.size.override===environment.size.override&&
    observed.density.physical===environment.density.physical&&observed.density.override===environment.density.override&&
    observed.fontWasAbsent===environment.fontWasAbsent&&(environment.fontWasAbsent||Number(observed.fontScale)===Number(environment.fontScale));
  return {result:attempts.every(attempt=>attempt.completed)&&matched?'通过':'阻塞',attempts,observed,
    policy:'Restore original overrides verbatim; reset only when the original override was absent. Restore/delete the original font setting.'};
}

await mkdir(directory,{recursive:true});
try {
  installedArtifactSha256=installedSha();
  if(installedArtifactSha256!==parent.installedArtifactSha256)fail('PARENT_ARTIFACT_CHANGED');
  avdName=adb(['emu','avd','name']).split(/\r?\n/).map(line=>line.trim()).find(line=>line&&line!=='OK');
  if(!['ROWAN_API_36','ROWAN_API36'].includes(avdName))fail('DEDICATED_AVD_REQUIRED');
  if(adb(['shell','getprop','sys.boot_completed']).trim()!=='1')fail('EMULATOR_NOT_READY');
  environment=captureEnvironment();validatedParent=true;
  const upstream=argument('--dns-upstream');
  if(upstream)relay=await startLoopbackDnsRelay({upstream});
  const [baseWidth,baseHeight]=(environment.size.override??environment.size.physical).split('x').map(Number);
  const baseDensity=Number(environment.density.override??environment.density.physical);
  const configurations=[{name:'baseline',width:baseWidth,height:baseHeight,density:baseDensity,fontScale:'1.0'},
    {name:'small',width:640,height:1280,density:320,fontScale:'1.0'},
    {name:'large',width:860,height:1864,density:320,fontScale:'1.0'},
    {name:'font150',width:baseWidth,height:baseHeight,density:baseDensity,fontScale:'1.5'}];
  for(const configuration of configurations){
    stage=`${configuration.name}-configuration`;environmentTouched=true;
    adb(['shell','wm','size',`${configuration.width}x${configuration.height}`]);
    adb(['shell','wm','density',String(configuration.density)]);
    adb(['shell','settings','put','system','font_scale',configuration.fontScale]);await wait(650);
    await coldHome();
    const xml=await stableTarget(nativeId('home_device_open'));
    const viewport=viewportOf(xml);
    if(viewport.width!==configuration.width||viewport.height!==configuration.height)fail('VIEWPORT_MISMATCH');
    tap(xml,nativeId('home_device_open'));
    await until(value=>has(value,'rn-device-status'));
    await inspectFeature('schedules',configuration);
    await inspectFeature('firmware',configuration);
    const close=await stableTarget('rn-device-close');tap(close,'rn-device-close');
    await until(value=>has(value,nativeId('home_title')));
    results.push({id:`${configuration.name}-return-home`,geometryResult:'通过',note:'Normal RN back/close navigation; no device or relationship mutation.'});
  }
}catch(error){
  results.push({id:'device-read-layout-flow',geometryResult:'阻塞',stage,
    reason:error instanceof LayoutFailure?error.code:error instanceof AndroidUiSnapshotError?'SNAPSHOT_HELPER_UNAVAILABLE':'ENVIRONMENT_OR_FLOW_UNAVAILABLE'});
}finally{
  cleanupPhase=true;
  if(environmentTouched&&environment){
    try{restoration=await restoreEnvironment();}catch{restoration={result:'阻塞',reason:'ENVIRONMENT_RESTORE_UNCONFIRMED'};}
  }else restoration={result:'不适用',note:'No display/font overrides were changed.'};
  // Only the validated parent session is eligible for normal UI logout. No pm clear,
  // storage deletion, forced token clearing or repeated logout/cleanup clicks.
  if(validatedParent){
    try{
      stage='finally-normal-logout';
      if(installedSha()!==installedArtifactSha256)fail('PARENT_ARTIFACT_CHANGED');
      adb(['shell','am','force-stop',pkg]);
      adb(['shell','am','start','-n',`${pkg}/com.rowan.iot.features.auth.WelcomeActivity`]);
      let xml=await until(value=>has(value,nativeId('home_title'))||has(value,nativeId('welcome_login')));
      if(has(xml,nativeId('welcome_login')))logout={result:'通过',state:'already-signed-out',note:'Welcome observed; no logout request or clearing action sent.'};
      else {
        xml=await scrollTo(nativeId('home_logout'));
        if(attribute(node(xml,nativeId('home_logout')),'text')==='重试本地清理')fail('SESSION_CLEANUP_PENDING');
        tap(xml,nativeId('home_logout')); // Exactly one normal logout action.
        await until(value=>has(value,nativeId('welcome_login')));
        logout={result:'通过',state:'normal-logout-confirmed',note:'Single normal Home logout, Welcome confirmed.'};
      }
    }catch{logout={result:'阻塞',state:'logout-unconfirmed',note:'No session clearing, repeated DELETE, or local cleanup retry was attempted.'};}
  }else logout={result:'不适用',note:'Parent/artifact/environment preconditions were not established; no logout action.'};
  try{adb(['shell','rm','-f',remoteXml]);}catch{}
  if(relay){try{await relay.close();}catch{results.push({id:'dns-relay-cleanup',geometryResult:'阻塞',reason:'DNS_RELAY_CLOSE_FAILED'});}}
  let sourceAfter=null;
  try{sourceAfter=sourceFingerprint(['android-as','app-rn']);}catch{}
  const report={runId,parentRunId:parentId,parentReportSha256,scriptSha256,serial,packageId:pkg,avdName,
    installedArtifactSha256,parentInstalledArtifactSha256:parent.installedArtifactSha256,buildProvenance:parent.buildProvenance??null,
    sourceBefore,sourceAfter,sourceUnchanged:sourceBefore.sourceSha256===sourceAfter?.sourceSha256,
    originalEnvironment:environment,restoration,logout,dnsForwarding:relay?.snapshot()??null,screenshots,results,
    scope:'Real native GET + RN geometry matrix; no timer/OTA writes, sharing, unbinding, preferences mutation or data clearing.',
    limits:['Firmware error geometry is independent of blocked firmware-candidate business acceptance.',
      'Only empty schedules and MCU error pages may be captured; populated lists have geometry metadata only.',
      'Rectangles/reachability do not prove glyph wrapping, touch accuracy, reference fidelity, all UI states, iOS or hardware.']};
  await writeFile(new URL(`android-device-read-layout-${runId}.json`,directory),JSON.stringify(report,null,2)+'\n');
  console.log(`environment-restore: ${restoration.result}; normal-logout: ${logout.result}`);
  if(results.some(row=>row.geometryResult!=='通过')||restoration.result==='阻塞'||logout.result==='阻塞'||!report.sourceUnchanged)process.exitCode=1;
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
  if(interrupted)process.exitCode=130;
}

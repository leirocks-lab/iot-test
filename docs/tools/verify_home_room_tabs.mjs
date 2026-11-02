// HOME-01 UI-only, retained native session. Never logs in/out, opens a device, or writes rooms.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sourceFingerprint} from './source_fingerprint.mjs';
import {dumpHierarchy} from './android-ui/snapshot.mjs';
import {resumeOwnTask} from './android-ui/owned-task-resume.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';

const serial='emulator-5554',pkg='com.rowan.iot.dev.refactor',activity='com.rowan.iot.features.home.HomeActivity';
const adbPath='D:/Android/Sdk/platform-tools/adb.exe';
const reports=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const apk=new URL('../../android-as/app/build/outputs/apk/development/release/app-development-release.apk',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Failure extends Error {constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new Failure(code);};
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
export function nodes(xml){return [...xml.matchAll(/<node\b[^>]*>/g)].map(x=>{
  const a=Object.fromEntries([...x[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
  return {...a,bounds:a.bounds?.match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/)?.slice(1).map(Number)};
});}
const id=value=>`${pkg}:id/${value}`;
const find=(xml,value)=>nodes(xml).filter(n=>n['resource-id']===id(value));
const one=(xml,value)=>{const xs=find(xml,value);return xs.length===1?xs[0]:null;};
const rectangle=n=>n?.bounds?.length===4&&n.bounds.every(Number.isFinite)&&n.bounds[0]>=0&&n.bounds[1]>=0&&n.bounds[2]>n.bounds[0]&&n.bounds[3]>n.bounds[1];
function inside(n,parent){return rectangle(n)&&rectangle(parent)&&n.bounds[0]>=parent.bounds[0]&&n.bounds[1]>=parent.bounds[1]&&n.bounds[2]<=parent.bounds[2]&&n.bounds[3]<=parent.bounds[3];}
export function homeShape(xml){return nodes(xml)[0]?.package===pkg&&!!one(xml,'home_title')&&!!one(xml,'home_room_tabs')&&!!one(xml,'home_room_all')&&
  !nodes(xml).some(n=>/:id\/(?:welcome_|account_|startup_|home_selection_)/.test(n['resource-id']??'')&&rectangle(n));}
export function tabState(xml){
  const all=one(xml,'home_room_all'),tabs=find(xml,'home_room_tab');
  return {roomCount:tabs.length,selectedAll:all?.selected==='true',selectedRooms:tabs.filter(n=>n.selected==='true').length};
}
export function parentMatches(parent,source,h){return parent?.sessionKept===true&&parent.packageId===pkg&&parent.serial===serial&&validHash(h)&&parent.installedArtifactSha256===h&&
  parent.sourceSha256===source?.sourceSha256&&parent.installedArtifactMatchesBuild===true&&parent.buildProvenance?.artifactSha256===h&&parent.buildProvenance?.sourceUnchangedDuringBuild===true&&
  parent.buildProvenance?.sourceBefore?.sourceSha256===source?.sourceSha256&&parent.buildProvenance?.sourceAfter?.sourceSha256===source?.sourceSha256&&
  parent.results?.some(r=>r.id==='AUTH-04-native-emulator'&&r.result==='通过')===true;}
export function sidecarMatches(sidecar,source,h){return validHash(h)&&validHash(source?.sourceSha256)&&sidecar?.artifactSha256===h&&sidecar.architecture==='x86_64'&&sidecar.sourceUnchangedDuringBuild===true&&
  sidecar.sourceBefore?.sourceSha256===source.sourceSha256&&sidecar.sourceAfter?.sourceSha256===source.sourceSha256;}
export function foregroundIdentity(output){
  const all=[...output.matchAll(/(?:topResumedActivity|mResumedActivity)[^\r\n]*?ActivityRecord\{([a-f0-9]+)\s+u\d+\s+([A-Za-z0-9_.$]+\/[A-Za-z0-9_.$]+)\s+t(\d+)/g)];
  const unique=[...new Set(all.map(x=>`${x[1]}:${x[2]}:${x[3]}`))];
  return unique.length===1&&all[0][2]===`${pkg}/${activity}`?unique[0]:null;
}

async function selfTest(){
  const n=(value,extra='')=>`<node resource-id="${id(value)}" package="${pkg}" bounds="[0,0][100,100]" ${extra}/>`;
  const xml=n('home_title')+n('home_room_tabs')+n('home_room_all','selected="true"')+n('home_room_tab','selected="false"');
  assert(homeShape(xml));assert.deepEqual(tabState(xml),{roomCount:1,selectedAll:true,selectedRooms:0});
  assert(!homeShape(xml+n('welcome_login')));assert(!homeShape(xml+n('home_room_all')));
  assert(!homeShape(xml+n('home_selection_bar')));assert(homeShape(xml+n('home_selection_bar').replace('[0,0][100,100]','[0,0][0,0]')));
  assert.equal(tabState(n('home_room_all','selected="false"')+n('home_room_tab','selected="true"')).selectedRooms,1);
  assert.equal(nodes(n('x','text="&lt;a&amp;b&gt;"'))[0].text,'<a&b>');
  assert(inside({bounds:[1,1,5,5]},{bounds:[0,0,10,10]}));assert(!inside({bounds:[-1,1,5,5]},{bounds:[0,0,10,10]}));
  const h='a'.repeat(64),source={sourceSha256:h},sidecar={artifactSha256:h,architecture:'x86_64',sourceUnchangedDuringBuild:true,sourceBefore:source,sourceAfter:source};
  const parent={sessionKept:true,serial,packageId:pkg,installedArtifactSha256:h,installedArtifactMatchesBuild:true,sourceSha256:h,buildProvenance:sidecar,results:[{id:'AUTH-04-native-emulator',result:'通过'}]};
  assert(parentMatches(parent,source,h));assert(!parentMatches({...parent,serial:'emulator-5556'},source,h));assert(!parentMatches({...parent,sessionKept:false},source,h));
  assert(sidecarMatches(sidecar,source,h));assert(!sidecarMatches({...sidecar,sourceAfter:{sourceSha256:'b'.repeat(64)}},source,h));
  assert.equal(foregroundIdentity(`topResumedActivity=ActivityRecord{abc u0 ${pkg}/${activity} t12}`),`abc:${pkg}/${activity}:12`);
  assert.equal(foregroundIdentity(`topResumedActivity=ActivityRecord{abc u0 ${pkg}/com.rowan.iot.features.auth.WelcomeActivity t12}`),null);
  console.log(JSON.stringify({result:'PASS',scope:'offline parser/parent/provenance/foreground fixtures; zero ADB/git/APK/network/report actions'}));
}

async function run(parentRun,dnsUpstream){
  const runId=new Date().toISOString().replaceAll(':','-'),results=[];
  let sourceBefore=null,sourceAfter=null,installedArtifactSha256=null,parentReportSha256=null,sidecarSha256=null;
  let stage='provenance',owned=false,backgroundOwned=false,interrupted=false,cleanup='not-needed',roomCount=null,relay=null;
  const stop=()=>{interrupted=true;};process.on('SIGINT',stop);process.on('SIGTERM',stop);
  const adb=args=>{try{return execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});}catch{fail('ADB_UNAVAILABLE');}};
  const current=()=>foregroundIdentity(adb(['shell','dumpsys','activity','activities']));
  const screen=()=>{
    if(interrupted)fail('INTERRUPTED');if(!current())fail('NATIVE_HOME_FOREGROUND_REQUIRED');
    let xml;try{xml=dumpHierarchy(serial,'/sdcard/rowan-home-room-tabs.xml');}catch{fail('SNAPSHOT_UNAVAILABLE');}
    if(!homeShape(xml))fail('NATIVE_HOME_SHAPE_REQUIRED');
    if(one(xml,'home_logout')?.text==='重试本地清理')fail('LOCAL_CLEANUP_PENDING');
    return xml;
  };
  const record=(value,pass)=>{results.push({id:value,result:pass?'通过':'失败'});if(!pass)fail('HOME_TAB_STATE_MISMATCH');};
  async function until(test){for(let i=0;i<22;i++){const xml=screen();if(test(xml))return xml;await wait(250);}fail('HOME_STATE_NOT_CONFIRMED');}
  async function settled(){return until(xml=>{const status=one(xml,'home_room_status');if(!status)return false;if(/失败|变化|清理/.test(status.text??''))fail('HOME_READ_NOT_CONFIRMED');return !(status.text??'').includes('正在');});}
  function target(xml,kind,label){
    if(kind==='all')return one(xml,'home_room_all');
    if(kind==='room')return find(xml,'home_room_tab').find(n=>label===undefined||n.text===label)??null;
    if(kind==='refresh'){const xs=nodes(xml).filter(n=>n.class==='android.widget.Button'&&n.text==='刷新'&&n.package===pkg);return xs.length===1?xs[0]:null;}
    fail('FORBIDDEN_TARGET');
  }
  async function stable(kind,label){
    let last=null,count=0;
    for(let i=0;i<18;i++){
      const xml=screen(),n=target(xml,kind,label),container=kind==='refresh'?nodes(xml)[0]:one(xml,'home_room_tabs');
      const key=n?.enabled==='true'&&n.clickable==='true'&&inside(n,container)&&inside(n,nodes(xml)[0])?`${n.bounds.join(',')}:${n.text}`:null;
      count=key&&key===last?count+1:key?1:0;last=key;
      if(count>=3)return n;
      if(!key&&i%3===2){
        const scroll=nodes(xml).find(x=>x.class==='android.widget.ScrollView'&&rectangle(x));
        if(scroll){const [l,t,r,b]=scroll.bounds,x=Math.floor(r-Math.min(8,(r-l)/20)),down=kind!=='refresh';
          adb(['shell','input','swipe',`${x}`,`${Math.floor(t+(b-t)*(down ? .25 : .8))}`,`${x}`,`${Math.floor(t+(b-t)*(down ? .8 : .25))}`,'250']);}
      }
      await wait(200);
    }
    fail('HOME_TARGET_UNSTABLE_OR_NOT_VISIBLE');
  }
  async function click(kind,label){const n=await stable(kind,label),[l,t,r,b]=n.bounds;adb(['shell','input','tap',`${Math.floor((l+r)/2)}`,`${Math.floor((t+b)/2)}`]);return n;}
  async function refreshObserved(checkId){
    await click('refresh');let observed=false;
    for(let i=0;i<4;i++){
      const xml=screen(),status=one(xml,'home_room_status')?.text??'';
      if(status.includes('正在刷新')){observed=true;break;}
      if(/失败|变化|清理/.test(status))fail('HOME_READ_NOT_CONFIRMED');
      await wait(150);
    }
    await settled();
    if(!observed)results.push({id:checkId,result:'未验收',reason:'REFRESH_LOADING_WINDOW_NOT_OBSERVED'});
    return observed;
  }
  const selectedRoom=(xml,label)=>{const s=tabState(xml);return !s.selectedAll&&s.selectedRooms===1&&find(xml,'home_room_tab').some(n=>n.selected==='true'&&n.text===label);};
  async function safeAll(){await click('all');await until(xml=>tabState(xml).selectedAll&&tabState(xml).selectedRooms===0);}
  function installedSha(){const paths=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).map(x=>x.replace(/^package:/,''));
    const bases=paths.filter(x=>/^\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(x));if(bases.length!==1)fail('APK_PATH_UNCONFIRMED');
    const h=adb(['shell','sha256sum',bases[0]]).trim().split(/\s/)[0];if(!validHash(h))fail('APK_HASH_UNCONFIRMED');return h;}
  try{
    if(!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentRun))fail('VALID_PARENT_RUN_REQUIRED');
    const parentBytes=await readFile(new URL(`android-emulator-${parentRun}.json`,reports)),parent=JSON.parse(parentBytes);parentReportSha256=sha(parentBytes);
    sourceBefore=sourceFingerprint(['android-as','app-rn']);const localSha=sha(await readFile(apk)),sidecarBytes=await readFile(new URL(apk.href+'.provenance.json'));sidecarSha256=sha(sidecarBytes);
    if(!sidecarMatches(JSON.parse(sidecarBytes),sourceBefore,localSha)||!parentMatches(parent,sourceBefore,localSha))fail('PARENT_BUILD_SOURCE_MISMATCH');
    installedArtifactSha256=installedSha();if(installedArtifactSha256!==localSha)fail('INSTALLED_ARTIFACT_CHANGED');
    const avd=adb(['emu','avd','name']).split(/\r?\n/).map(x=>x.trim()).find(x=>x&&x!=='OK');
    if(!['ROWAN_API36','ROWAN_API_36'].includes(avd)||adb(['shell','getprop','sys.boot_completed']).trim()!=='1')fail('DEDICATED_READY_AVD_REQUIRED');
    if(dnsUpstream)relay=await startLoopbackDnsRelay({upstream:dnsUpstream});
    stage='initial-home';await settled();owned=true;await safeAll();let xml=await settled();roomCount=tabState(xml).roomCount;
    record('all-selected',tabState(xml).selectedAll&&tabState(xml).selectedRooms===0);
    const allRefresh=await refreshObserved('all-retained-after-refresh');await stable('all');xml=screen();
    if(allRefresh)record('all-retained-after-refresh',tabState(xml).selectedAll&&tabState(xml).selectedRooms===0);
    if(roomCount===0){results.push({id:'real-room-selection',result:'未验收',reason:'NO_SERVER_ROOM_TABS'});}
    else{
      stage='actual-room-tab';const room=await click('room'),label=room.text;await until(value=>selectedRoom(value,label));record('real-room-selected',true);
      // Label is held only in memory to locate the same UI tab; never serialized.
      if(find(screen(),'home_room_tab').filter(n=>n.text===label).length!==1)fail('ROOM_LABEL_AMBIGUOUS_NO_ID_IN_UI');
      const roomRefresh=await refreshObserved('room-retained-after-refresh');await stable('room',label);xml=screen();
      if(roomRefresh)record('room-retained-after-refresh',selectedRoom(xml,label));
      await safeAll();record('return-to-all',true);
    }
    stage='home-background-resume';const before=current();if(!before)fail('HOME_IDENTITY_UNCONFIRMED');
    adb(['shell','input','keyevent','3']);backgroundOwned=true;await wait(500);
    const paused=current();if(paused)fail('BACKGROUND_TRANSITION_UNCONFIRMED');
    await resumeOwnTask({adb,rawScreen:()=>dumpHierarchy(serial,'/sdcard/rowan-home-room-recents.xml'),isExpectedForeground:()=>current()===before});backgroundOwned=false;
    await settled();record('same-home-activity-after-background',current()===before);
    await stable('all');xml=screen();record('all-retained-after-background',tabState(xml).selectedAll&&tabState(xml).selectedRooms===0);
    await safeAll();cleanup='all-confirmed-session-retained';
  }catch(error){results.push({id:'home-room-tabs-flow',stage,result:'阻塞',errorCode:error instanceof Failure?error.code:'RUNTIME_UNAVAILABLE'});}
  finally{
    if(owned)try{
      if(backgroundOwned)await resumeOwnTask({adb,rawScreen:()=>dumpHierarchy(serial,'/sdcard/rowan-home-room-recents.xml'),isExpectedForeground:()=>!!current()});
      const cancelled=interrupted;interrupted=false;try{await safeAll();cleanup='all-confirmed-session-retained';}finally{interrupted=cancelled;}
    }catch{cleanup='blocked-safe-return-unconfirmed';}
    if(relay)try{await relay.close();}catch{results.push({id:'dns-cleanup',result:'阻塞',errorCode:'DNS_CLOSE_UNCONFIRMED'});}
    try{if(sourceBefore)sourceAfter=sourceFingerprint(['android-as','app-rn']);}catch{}
    const sourceUnchanged=!!sourceBefore&&sourceBefore.sourceSha256===sourceAfter?.sourceSha256;
    const report={runId,parentRunId:/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentRun)?parentRun:null,parentReportSha256,serial,packageId:pkg,installedArtifactSha256,sidecarSha256,scriptSha256:sha(await readFile(new URL(import.meta.url))),taskResumeSha256:sha(await readFile(new URL('./android-ui/owned-task-resume.mjs',import.meta.url))),sourceBefore,sourceAfter,sourceUnchanged,roomCount,results,cleanup,dnsForwarding:relay?.snapshot()??null,
      sessionKept:owned&&cleanup==='all-confirmed-session-retained',screenshots:[],loginActions:0,logoutActions:0,roomWriteActions:0,
      limits:['HOME UI selected-state/refresh/lifecycle only; no raw names, device/room IDs, XML, dumpsys or error payloads are stored.',
        'No room creation/change/removal, DELETE, device/RN navigation, account switch, login, logout, force-stop or clear-data. UI refresh/resume may invoke native HOME-01 GET.',
        'Room identity uses a unique UI label only in memory; this does not prove opaque typed ID/membership or protocol correctness. No tabs means fixture coverage missing.',
        'No screenshots or visual acceptance, real hardware/iOS/whole scope acceptance. Existing domain fixtures remain separate.',
        'SIGINT/SIGTERM attempt only safe All return; force-kill/device loss cannot guarantee restoration.']};
    await mkdir(reports,{recursive:true});const name=`android-home-room-tabs-${runId}.json`;await writeFile(new URL(name,reports),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({report:name,checks:results.length,roomCount,cleanup,sourceUnchanged}));
    if(results.some(x=>x.result!=='通过')||!sourceUnchanged||cleanup!=='all-confirmed-session-retained')process.exitCode=1;
    process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);if(interrupted)process.exitCode=130;
  }
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--self-test')await selfTest();
else if(args.length>=1&&args.length<=2&&args.filter(x=>x.startsWith('--parent-run=')).length===1&&args.filter(x=>x.startsWith('--dns-upstream=')).length<=1&&args.every(x=>x.startsWith('--parent-run=')||x.startsWith('--dns-upstream=')))await run(args.find(x=>x.startsWith('--parent-run=')).slice('--parent-run='.length),args.find(x=>x.startsWith('--dns-upstream='))?.slice('--dns-upstream='.length));
else{console.log('Usage: node docs/tools/verify_home_room_tabs.mjs --self-test | --parent-run=<timestamp> [--dns-upstream=<IPv4>]');process.exitCode=2;}

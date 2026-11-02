// Root executes only with an exclusive emulator and a fresh --keep-session parent.
// No decoded text, gallery hierarchy, MediaStore output or raw subprocess error is archived.
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash, randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dumpHierarchy, AndroidUiSnapshotError} from './android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
import {sourceFingerprint} from './source_fingerprint.mjs';
import {parseCameraAppOps,cameraAppOpsEquivalent} from './android-ui/camera-appops.mjs';

const root = new URL('../../', import.meta.url), reports = new URL('../测试报告/重构实施-20261101/', import.meta.url);
const pkg = 'com.rowan.iot.dev.refactor', camera = 'android.permission.CAMERA';
const mediaCollection='content://media/external_primary/images/media';
const adbPath = 'D:/Android/Sdk/platform-tools/adb.exe';
const runId = new Date().toISOString().replaceAll(':', '-'), nonce = randomBytes(6).toString('hex');
const remoteXml = '/sdcard/rowan-scan-verification.xml';
const arg = name => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const scriptSha256 = sha(await readFile(new URL(import.meta.url)));
const cameraAppOpsSha256=sha(await readFile(new URL('./android-ui/camera-appops.mjs',import.meta.url)));
const results = [], media = [], screenshots = [];
let serial = null, parent = null, parentSha = null, installedArtifactSha256 = null, sourceBefore = null;
let validated = false, stage = 'arguments', interrupted = false, cleanup = false, relay = null;
let permissionOriginal = null, permissionTouched = false, permissionRestoration = null, logout = null, logoutActions = 0;
let pickerOpened=false,pickerRestoration=null,pickerDiagnostics=null,activeFixtureAlbum=null;
const mediaParentsCreated=[];
class ScanFailure extends Error {constructor(code) {super(code); this.code = code;}}
function fail(code) {throw new ScanFailure(code);}
const stop = () => {interrupted = true;};
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function adb(args, timeout = 20_000) {
  if (!/^emulator-\d+$/.test(serial ?? '')) fail('EMULATOR_REQUIRED');
  if (interrupted && !cleanup) fail('INTERRUPTED');
  try {return execFileSync(adbPath, ['-s', serial, ...args], {encoding:'utf8', timeout, maxBuffer:3*1024*1024, stdio:['ignore','pipe','pipe']});}
  catch {fail('ADB_OPERATION_UNAVAILABLE');}
}
function pass(id, details = {}) {results.push({id, stage, result:'通过', ...details}); console.log(id + ': 通过');}
function attr(tag, key) {return tag?.match(new RegExp('\\b' + key + '="([^"]*)"'))?.[1] ?? '';}
const tags = xml => [...xml.matchAll(/<node\b[^>]*>/g)].map(value => value[0]);
const id = name => pkg + ':id/' + name;
const find = (xml, resource) => tags(xml).find(tag => attr(tag,'resource-id') === resource);
const has = (xml, resource) => Boolean(find(xml, resource));
const rect = tag => tag?.match(/bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/)?.slice(1).map(Number);
function box(xml, tag) {
  const r = rect(tag), screen = rect(tags(xml)[0]);
  return r && screen && attr(tag,'enabled') !== 'false' && r[0]>=0 && r[1]>=0 &&
    r[2]>r[0] && r[3]>r[1] && r[2]<=screen[2] && r[3]<=screen[3] ? r : null;
}
function tapTag(xml, tag) {
  const r = box(xml,tag); if (!r) fail('TARGET_NOT_ACTIONABLE');
  adb(['shell','input','tap',String(Math.floor((r[0]+r[2])/2)),String(Math.floor((r[1]+r[3])/2))]);
}
async function screen() {
  for (let n=0;n<3;n++) try {
    const xml = dumpHierarchy(serial,remoteXml);
    if (has(xml,'android:id/aerr_wait') || has(xml,'android:id/aerr_close')) fail('SYSTEM_ANR_DIALOG');
    if(isPicker(xml)) {
      const controls=tags(xml),labels=new Set(['Photos','Albums','Collections','Camera','照片','相册','收藏集','相机','相機']);
      pickerDiagnostics={stage,
        knownTabs:controls.filter(tag=>labels.has(attr(tag,'text'))).map(tag=>({label:attr(tag,'text'),selected:attr(tag,'selected'),clickable:attr(tag,'clickable')})),
        localCameraCategoryVisible:controls.some(tag=>['Camera','相机','相機'].includes(attr(tag,'text'))),
        resourceIds:[...new Set(controls.map(tag=>attr(tag,'resource-id')).filter(value=>/^[a-z.]+:id\/[a-z_]+$/.test(value)))].slice(0,80)};
    }
    return xml; // Redacted XML only in memory, including system picker.
  } catch(error) {
    if (error instanceof AndroidUiSnapshotError && error.code === 'ROOT_NOT_READY' && n<2) {await wait(300);continue;}
    if (error instanceof ScanFailure) throw error;
    fail('SNAPSHOT_UNAVAILABLE');
  }
}
async function until(predicate, milliseconds=25_000) {
  const end=Date.now()+milliseconds;
  for(let n=0;n<30 && Date.now()<end;n++) {const xml=await screen();if(predicate(xml))return xml;await wait(350);}
  fail('EXPECTED_STATE_TIMEOUT');
}
async function stable(select) {
  let previous=null;
  for(let n=0;n<18;n++) {
    const xml=await screen(), tag=select(xml), r=box(xml,tag), current=r?.join(',');
    if(current && current===previous)return {xml,tag};
    previous=current;await wait(300);
  }
  fail('STABLE_TARGET_UNAVAILABLE');
}
async function click(resource) {const target=await stable(xml=>find(xml,resource));tapTag(target.xml,target.tag);}
function installedSha() {
  const file=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).find(line=>line.endsWith('/base.apk'))?.replace(/^package:/,'');
  if(!file || !/^\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(file))fail('ARTIFACT_UNVERIFIABLE');
  const hash=adb(['shell','sha256sum',file]).trim().split(/\s+/)[0];
  if(!/^[a-f0-9]{64}$/.test(hash))fail('ARTIFACT_UNVERIFIABLE');return hash;
}
async function home() {
  if(installedSha()!==installedArtifactSha256)fail('PARENT_ARTIFACT_CHANGED');
  adb(['shell','am','force-stop',pkg]);
  adb(['shell','am','start','-n',pkg+'/com.rowan.iot.features.auth.WelcomeActivity']);
  return until(xml=>has(xml,id('home_title')) || has(xml,id('welcome_login')));
}
async function normalLogout() {
  let xml=await home();
  if(has(xml,id('welcome_login')))return {result:'通过',actionCount:0,state:'already-signed-out'};
  for(let n=0;n<7;n++) {
    if(box(xml,find(xml,id('home_logout'))))break;
    const r=rect(tags(xml)[0]);if(!r)fail('VIEWPORT_UNAVAILABLE');
    adb(['shell','input','swipe',String(Math.floor(r[2]*.92)),String(Math.floor(r[3]*.8)),String(Math.floor(r[2]*.92)),String(Math.floor(r[3]*.3)),'300']);
    await wait(300);xml=await screen();
  }
  if(attr(find(xml,id('home_logout')),'text')==='重试本地清理')fail('SESSION_CLEANUP_PENDING');
  // No replay even if dispatch returns unknown.
  logoutActions++;tapTag(xml,find(xml,id('home_logout')));
  await until(value=>has(value,id('welcome_login')));
  return {result:'通过',actionCount:1,state:'normal-logout-confirmed'};
}
function permissionState() {
  // All package output stays in memory; exact CAMERA line only is interpreted.
  const dump=adb(['shell','dumpsys','package',pkg]);
  const lines=[...dump.matchAll(/^\s*android\.permission\.CAMERA:\s*granted=(true|false),\s*flags=\[([ A-Z_|]*)\]/gm)];
  if(lines.length!==1)fail('CAMERA_PERMISSION_PRESTATE_UNCONFIRMED');
  const flags=lines[0][2].split('|').map(value=>value.trim()).filter(Boolean).sort();
  const allowed=new Set(['USER_SET','USER_FIXED','USER_SENSITIVE_WHEN_GRANTED','USER_SENSITIVE_WHEN_DENIED']);
  if(flags.some(value=>!allowed.has(value)))fail('CAMERA_PERMISSION_FLAGS_UNRESTORABLE');
  const output=adb(['shell','cmd','appops','get',pkg,'CAMERA']);
  const operations=parseCameraAppOps(output);
  if(!operations)fail('CAMERA_APPOP_PRESTATE_UNCONFIRMED');
  return {granted:lines[0][1]==='true',flags,...operations};
}
function samePermission(a,b) {return a.granted===b.granted && cameraAppOpsEquivalent(a,b) && a.flags.join('|')===b.flags.join('|');}
function setUserFlags(flags) {
  adb(['shell','pm','clear-permission-flags',pkg,camera,'user-set','user-fixed']);
  for(const [key,cli] of [['USER_SET','user-set'],['USER_FIXED','user-fixed']])
    if(flags.includes(key))adb(['shell','pm','set-permission-flags',pkg,camera,cli]);
}
function prepareDenial() {
  permissionTouched=true; // Before first mutation; partial failures still restore.
  adb(['shell','pm','revoke',pkg,camera]);setUserFlags([]);
  adb(['shell','cmd','appops','set',pkg,'CAMERA','default']);
  const state=permissionState();
  if(state.granted || state.flags.includes('USER_SET') || state.flags.includes('USER_FIXED'))fail('CAMERA_DIALOG_PRECONDITION_FAILED');
}
function restorePermission() {
  adb(['shell','am','force-stop',pkg]); // Do not let a foreground request race restoration.
  adb(['shell','pm',permissionOriginal.granted?'grant':'revoke',pkg,camera]);
  setUserFlags(permissionOriginal.flags);
  adb(['shell','cmd','appops','set',pkg,'CAMERA',permissionOriginal.appOp]);
  const observed=permissionState();
  return {result:samePermission(permissionOriginal,observed)?'通过':'阻塞',observed,
    packageEntryPresenceRestored:permissionOriginal.packageEntryPresent===observed.packageEntryPresent,
    comparison:'Grant and flags exact; effective package CAMERA mode and UID mode match. AppOp entry/history presence is reported separately.'};
}
const golden = {
  normal:'08af3ffd005d0100f258abf04b96f9bb916b08062910266e104fc3a11738b593',
  blank:'6477f9b774db808235b98b5558211a8606f6bbc844e3afc2017f37ad3424cb9a',
  multiple:'1da2c2b463e633cc9fb54a80411d172056b6474414de7f440b95dd69981660b5'
};
async function fixtureFiles() {
  const run=arg('--fixture-run');
  if(!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(run??''))fail('PUBLIC_FIXTURE_RUN_REQUIRED');
  const directory=new URL('.cache/refactor/zxing-jvm/run-'+run+'/',root);
  let summary;try {summary=JSON.parse(await readFile(new URL('summary.json',directory),'utf8'));}catch {fail('PUBLIC_FIXTURE_REPORT_UNAVAILABLE');}
  if(summary.passed!==true || summary.version!=='3.5.4' || summary.result?.productionParser!=='absent')fail('PUBLIC_FIXTURE_REPORT_INVALID');
  const selected=[];
  for(const kind of Object.keys(golden)) {
    const file=new URL(kind+'.png',directory), bytes=await readFile(file);
    const manifest=summary.result.fixtures?.find(value=>value.file===kind+'.png');
    if(sha(bytes)!==golden[kind] || manifest?.sha256!==golden[kind] || bytes.length!==manifest?.bytes)fail('PUBLIC_FIXTURE_HASH_MISMATCH');
    selected.push({kind,file,sha256:golden[kind],bytes:bytes.length});
  }
  return selected;
}
function queryMedia(row) {
  if(!/^content:\/\/media\/external_primary\/images\/media\/[1-9]\d*$/.test(row.uri))fail('MEDIA_HANDLE_INVALID');
  const output=adb(['shell','content','query','--uri',row.uri,'--projection','_id:_data:bucket_display_name']);
  const rows=output.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^Row: \d+ /.test(line));
  if(rows.length!==1 || !rows[0].includes('_data='+row.file+',') ||
    !rows[0].endsWith('bucket_display_name='+row.album))fail('MEDIA_OWNERSHIP_UNCONFIRMED');
  return true;
}
function exactMediaRows(column,value) {
  // Fixed columns and generated shell-safe values only; keep SQL string quotes
  // inside a shell double-quoted argument (adb shell otherwise strips them).
  if(!['_data','bucket_display_name'].includes(column) || !/^[A-Za-z0-9_./-]+$/.test(value))fail('MEDIA_QUERY_ARGUMENT_INVALID');
  const output=adb(['shell',"content query --uri "+mediaCollection+" --projection _id:_data:bucket_display_name --where \""+column+"='"+value+"'\""]);
  if(/^No result found\.?\s*$/.test(output.trim()))return [];
  const rows=output.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^Row: \d+ /.test(line));
  if(rows.length===0)fail('MEDIA_QUERY_UNCONFIRMED');return rows;
}
function requireOnlyFixtureInAlbum(row) {
  const rows=exactMediaRows('bucket_display_name',row.album);
  if(rows.length!==1 || !rows[0].includes('_data='+row.file+',') || !rows[0].endsWith('bucket_display_name='+row.album))fail('MEDIA_ALBUM_NOT_EXCLUSIVE');
  assertNoCloudProvider();
  const category=cameraCategoryRows();
  if(category.length!==1||!category[0].includes('_data='+row.file+',')||!category[0].endsWith('bucket_display_name='+row.album))fail('CAMERA_CATEGORY_NOT_EXCLUSIVE');
}
function assertNoCloudProvider(){
  if(!/^Result: Bundle\[\{get_cloud_provider_result=null\}\]$/.test(adb(['shell','content','call','--uri','content://media','--method','get_cloud_provider']).trim()))fail('LOCAL_ONLY_PICKER_UNCONFIRMED');
}
function cameraCategoryRows(){
  const output=adb(['shell',"content query --uri "+mediaCollection+" --projection _id:_data:bucket_display_name --where \"relative_path LIKE 'DCIM/Camera/%' AND is_pending=0 AND is_trashed=0\""]);
  if(/^No result found\.?\s*$/.test(output.trim()))return [];
  const rows=output.replaceAll('\r','').split('\n').filter(line=>/^Row: \d+ /.test(line));
  if(!rows.length)fail('CAMERA_CATEGORY_QUERY_UNCONFIRMED');return rows;
}
function ensureMediaParents(){
  for(const path of ['/sdcard/DCIM','/sdcard/DCIM/Camera']) {
    const state=adb(['shell',`if [ -d ${path} ]; then echo present; else echo absent; fi`]).trim();
    if(state==='present')continue;if(state!=='absent')fail('MEDIA_PARENT_UNCONFIRMED');
    adb(['shell','mkdir',path]);mediaParentsCreated.push(path);
  }
}
function mediaHash(row) {return adb(['shell','sha256sum',row.file]).trim().split(/\s+/)[0];}
async function stageMedia(fixture) {
  assertNoCloudProvider();if(cameraCategoryRows().length!==0)fail('CAMERA_CATEGORY_NOT_EMPTY');
  ensureMediaParents();
  const album='rowan-scan-'+nonce+'-'+fixture.kind, dir='/sdcard/DCIM/Camera/'+album;
  const file='/storage/emulated/0/DCIM/Camera/'+album+'/fixture.png';
  const row={kind:fixture.kind,album,dir,file,sha256:fixture.sha256,uri:null,pushed:false,pushAttempted:false,created:false,indexed:false};
  media.push(row);
  // All remote names are generated from safe alphabets. Never replace an existing path.
  adb(['shell','test','!','-e',dir]);adb(['shell','mkdir',dir]);row.created=true;
  row.pushAttempted=true;adb(['push',fileURLToPath(fixture.file),file]);row.pushed=true;
  if(mediaHash(row)!==fixture.sha256)fail('PUSHED_FIXTURE_HASH_MISMATCH');
  adb(['shell','content','insert','--uri',mediaCollection,
    '--bind','_data:s:'+file,'--bind','mime_type:s:image/png','--bind','_display_name:s:fixture.png']);
  // API36 content insert/delete can be silent. Confirm actual state, never CLI prose.
  const inserted=exactMediaRows('_data',file);
  const key=inserted.length===1?inserted[0].match(/(?:^Row: \d+ |, )_id=([1-9]\d*)(?:,|$)/)?.[1]:null;
  if(!key)fail('MEDIA_INSERT_UNCONFIRMED');
  row.uri=mediaCollection+'/'+key;queryMedia(row);
  adb(['shell','am','broadcast','--receiver-include-background','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file://'+file]);
  for(let n=0;n<20;n++) {
    const output=adb(['shell','content','query','--uri',row.uri,'--projection','_id:_size:width:height:is_pending:is_trashed']);
    const lines=output.replaceAll('\r','').split('\n').filter(line=>/^Row: \d+ /.test(line));
    if(lines.length===1) {
      const value=name=>lines[0].match(new RegExp('(?: |, )'+name+'=([^,]*)'))?.[1];
      if(Number(value('_size'))===fixture.bytes&&Number(value('width'))>0&&Number(value('height'))>0&&value('is_pending')==='0'&&value('is_trashed')==='0') {
        row.indexed=true;break;
      }
    }
    await wait(350);
  }
  if(!row.indexed)fail('PUBLIC_FIXTURE_INDEX_UNCONFIRMED');
  queryMedia(row);requireOnlyFixtureInAlbum(row);return row;
}
// Build just enough tree to identify an actionable album parent and one actual media thumbnail.
// No external XML package, raw text retention or generic click-first-photo fallback.
function tree(xml) {
  const all=[], stack=[];
  for(const match of xml.matchAll(/<node\b[^>]*>|<\/node>/g)) {
    const raw=match[0];
    if(raw==='</node>'){stack.pop();continue;}
    const item={raw,parent:stack.at(-1),children:[]};item.parent?.children.push(item);all.push(item);
    if(!raw.endsWith('/>'))stack.push(item);
  }
  return all;
}
const pickerPackages = new Set(['com.google.android.providers.media.module','com.android.providers.media.module','com.android.providers.media']);
function isPicker(xml) {return pickerPackages.has(attr(tags(xml)[0],'package'));}
function nearestAction(item) {while(item && attr(item.raw,'clickable')!=='true')item=item.parent;return item;}
async function chooseFixture(row) {
  activeFixtureAlbum='Camera';
  queryMedia(row);if(mediaHash(row)!==row.sha256)fail('MEDIA_OWNERSHIP_UNCONFIRMED');
  await click(id('scan_album'));
  pickerOpened=true;
  await until(isPicker);
  stage='photo-picker-'+row.kind+'-albums-tab';
  // Albums label is a fixed platform control; never match a user photo description.
  let target=await stable(xml=>{
    if(!isPicker(xml))return null;
    const items=tree(xml).filter(item=>['Albums','Collections','相册','收藏集'].includes(attr(item.raw,'text')));
    if(items.length!==1)return null;return nearestAction(items[0])?.raw;
  });
  tapTag(target.xml,target.tag);
  stage='photo-picker-'+row.kind+'-exclusive-camera-category';
  target=await stable(xml=>{
    if(!isPicker(xml))return null;
    const matches=tree(xml).filter(item=>['Camera','相机','相機'].includes(attr(item.raw,'text')));
    if(matches.length!==1)return null;return nearestAction(matches[0])?.raw;
  });
  tapTag(target.xml,target.tag);
  stage='photo-picker-'+row.kind+'-unique-thumbnail';
  target=await stable(xml=>{
    if(!isPicker(xml))return null;
    const all=tree(xml);
    // Require a visible, exact current album heading; no guessing which gallery is open.
    if(!all.some(item=>['Camera','相机','相機'].includes(attr(item.raw,'text'))))return null;
    const thumbnails=all.filter(item=>/:(?:id)\/(?:icon_thumbnail|media_item_thumbnail|image_thumbnail)$/.test(attr(item.raw,'resource-id')));
    const clickable=[...new Set(thumbnails.map(nearestAction).filter(Boolean))];
    if(clickable.length!==1)return null;
    return clickable[0].raw;
  });
  // Prove the app-selected album still contains only our exact row before the tap.
  requireOnlyFixtureInAlbum(row);
  tapTag(target.xml,target.tag);
}
async function expectDecision(text) {
  await until(xml=>has(xml,id('scan_status')) && attr(find(xml,id('scan_status')),'text')===text &&
    has(xml,id('scan_retry')) && attr(tags(xml)[0],'package')===pkg,40_000);
}
async function captureScan(name, expectedText) {
  if(!process.argv.includes('--screenshots'))return;
  const xml=await screen();
  if(attr(tags(xml)[0],'package')!==pkg || !has(xml,id('scan_title')) ||
    attr(find(xml,id('scan_status')),'text')!==expectedText || permissionState().granted)fail('SAFE_SCAN_CAPTURE_UNCONFIRMED');
  const filename=runId+'-scan-'+name+'.png';
  let png;
  try {png=execFileSync(adbPath,['-s',serial,'exec-out','screencap','-p'],{timeout:15_000,maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch {fail('SAFE_SCAN_CAPTURE_FAILED');}
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('SAFE_SCAN_CAPTURE_FAILED');
  // Retain bytes only in memory until a second guard excludes intervening navigation.
  const after=await screen();
  if(attr(tags(after)[0],'package')!==pkg || !has(after,id('scan_title')) ||
    attr(find(after,id('scan_status')),'text')!==expectedText || permissionState().granted)fail('SAFE_SCAN_CAPTURE_UNCONFIRMED');
  await writeFile(new URL(filename,reports),png);screenshots.push(filename);
}
function cleanupMedia() {
  const rows=[];
  for(const row of [...media].reverse()) {
    try {
      if(row.cleaned){rows.push({kind:row.kind,result:'通过',alreadyCleaned:true});continue;}
      // A command may have inserted successfully before its response was lost.
      // Recover ONLY an exact generated file row, never a broad album deletion.
      if(!row.uri && row.pushed) {
        const matches=exactMediaRows('_data',row.file);
        if(matches.length>1)fail('MEDIA_CLEANUP_OWNERSHIP_LOST');
        if(matches.length===1) {
          const key=matches[0].match(/(?:^Row: \d+ |, )_id=([1-9]\d*)(?:,|$)/)?.[1];
          if(!key)fail('MEDIA_CLEANUP_OWNERSHIP_LOST');
          row.uri=mediaCollection+'/'+key;
        }
      }
      if(row.uri){queryMedia(row);if(mediaHash(row)!==row.sha256)fail('MEDIA_CLEANUP_OWNERSHIP_LOST');
        adb(['shell','content','delete','--uri',row.uri]);
        if(exactMediaRows('_data',row.file).length!==0)fail('MEDIA_DELETE_UNCONFIRMED');
        // MediaProvider normally deletes the file too; rm only this generated, verified name.
        adb(['shell','rm','-f',row.file]);
      } else if(row.pushed) {
        if(mediaHash(row)!==row.sha256)fail('MEDIA_CLEANUP_OWNERSHIP_LOST');adb(['shell','rm','-f',row.file]);
      } else if(row.created && row.pushAttempted) {
        // Failed push can leave a partial file. This exact destination did not
        // exist before we created its nonce directory; never recurse/delete peers.
        adb(['shell','rm','-f',row.file]);
      }
      if(row.created)adb(['shell','rmdir',row.dir]);
      row.cleaned=true;
      rows.push({kind:row.kind,result:'通过'});
    }catch{rows.push({kind:row.kind,result:'阻塞',errorCode:'MEDIA_CLEANUP_UNCONFIRMED'});}
  }
  return rows;
}
let mediaCleanup=[], fixtures=null;
await mkdir(reports,{recursive:true});
try {
  if(process.argv.slice(2).some(value=>value!=='--screenshots'&&!['--parent-run=','--fixture-run=','--dns-upstream='].some(prefix=>value.startsWith(prefix))))fail('UNKNOWN_ARGUMENT');
  fixtures=await fixtureFiles(); // Local, fixed public bytes only; before any ADB.
  const parentRun=arg('--parent-run');
  if(!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentRun??''))fail('RECORDED_PARENT_REQUIRED');
  const bytes=await readFile(new URL('android-emulator-'+parentRun+'.json',reports));
  parentSha=sha(bytes);parent=JSON.parse(bytes);
  if(parent.sessionKept!==true || parent.packageId!==pkg || !/^emulator-\d+$/.test(parent.serial??'') ||
    !/^[a-f0-9]{64}$/.test(parent.installedArtifactSha256??'') ||
    !parent.results?.some(row=>row.id==='AUTH-04-native-emulator' && row.result==='通过'))fail('RETAINED_VALIDATION_PARENT_REQUIRED');
  serial=parent.serial;stage='parent-artifact-source-avd';
  installedArtifactSha256=installedSha();
  if(installedArtifactSha256!==parent.installedArtifactSha256)fail('PARENT_ARTIFACT_CHANGED');
  const avd=adb(['emu','avd','name']).split(/\r?\n/).map(value=>value.trim()).find(value=>value && value!=='OK');
  if(!['ROWAN_API36','ROWAN_API_36'].includes(avd) || adb(['shell','getprop','sys.boot_completed']).trim()!=='1')fail('DEDICATED_READY_AVD_REQUIRED');
  sourceBefore=sourceFingerprint(['android-as','app-rn']);
  if(parent.sourceSha256!==sourceBefore.sourceSha256 || parent.installedArtifactMatchesBuild!==true ||
    parent.buildProvenance?.sourceUnchangedDuringBuild!==true || parent.buildProvenance?.artifactSha256!==installedArtifactSha256 ||
    parent.buildProvenance?.sourceAfter?.sourceSha256!==sourceBefore.sourceSha256)fail('PARENT_BUILD_SOURCE_UNVERIFIED');
  validated=true;
  if(arg('--dns-upstream'))relay=await startLoopbackDnsRelay({upstream:arg('--dns-upstream')});
  stage='permission-prestate';permissionOriginal=permissionState();prepareDenial();
  stage='home-add-scan';
  const initial=await home();if(!has(initial,id('home_title')))fail('RETAINED_SESSION_NOT_HOME');
  await click(id('home_add'));await click(id('add_scan'));
  stage='actual-camera-permission-denial';
  const deny=await stable(xml=>tags(xml).find(tag=>[
    'com.google.android.permissioncontroller:id/permission_deny_button',
    'com.android.permissioncontroller:id/permission_deny_button'].includes(attr(tag,'resource-id'))));
  tapTag(deny.xml,deny.tag);
  await until(xml=>has(xml,id('scan_status')) && attr(find(xml,id('scan_status')),'text')==='相机暂不可用，可使用相册或返回。');
  if(permissionState().granted)fail('CAMERA_DENIAL_UNCONFIRMED');
  const album=await stable(xml=>find(xml,id('scan_album')));
  if(!album.tag)fail('ALBUM_NOT_AVAILABLE_AFTER_DENIAL');
  pass('camera-denied-album-available',{actualSystemDenial:true});
  await captureScan('camera-denied','相机暂不可用，可使用相册或返回。');
  const expected={normal:'暂时无法处理此二维码，请尝试其他添加方式。',blank:'没有识别到二维码，请重试或选择其他图片。',
    multiple:'识别到多个二维码，请只保留一个后重试。'};
  for(const fixture of fixtures) {
    stage='photo-picker-'+fixture.kind;
    const row=await stageMedia(fixture);
    await chooseFixture(row);await expectDecision(expected[fixture.kind]);
    pass('photo-picker-'+fixture.kind,{fixtureSha256:fixture.sha256,route:'system-picker-to-native-decoder',fixedDecision:fixture.kind==='normal'?'unsupported':fixture.kind==='blank'?'no-code':'multiple-codes'});
    await captureScan(fixture.kind,expected[fixture.kind]);
    stage='photo-picker-'+fixture.kind+'-cleanup';
    if(cleanupMedia().some(item=>item.result!=='通过'))fail('FIXTURE_INTERIM_CLEANUP_UNCONFIRMED');
  }
  stage='scan-return-home';await click(id('scan_back'));await until(xml=>has(xml,id('home_title')));
  pass('scan-return-home');
  results.push({id:'live-camera-frame-decode',stage,result:'未验收',reason:'No controlled virtual camera input was supplied; preview presence is not frame/decode evidence.'});
} catch(error) {
  const errorCode=error instanceof ScanFailure?error.code:'SCAN_ENVIRONMENT_OR_FLOW_UNAVAILABLE';
  results.push({id:'scan-software',stage,result:'阻塞',errorCode});console.log('scan-software: 阻塞 ('+stage+'/'+errorCode+')');
} finally {
  cleanup=true;
  if(validated&&pickerOpened)try {
    if(isPicker(await screen())) {
      adb(['shell','input','keyevent','4']);await until(value=>!isPicker(value));
      pickerRestoration={result:'通过',action:'dismiss-own-system-picker'};
    }else pickerRestoration={result:'不适用',reason:'picker-already-closed'};
  }catch {pickerRestoration={result:'阻塞',errorCode:'SYSTEM_PICKER_DISMISS_UNCONFIRMED'};}
  else pickerRestoration={result:'不适用'};
  if(validated && permissionTouched)try {permissionRestoration=restorePermission();}catch {permissionRestoration={result:'阻塞',errorCode:'CAMERA_PERMISSION_RESTORE_UNCONFIRMED'};}
  else permissionRestoration={result:'不适用'};
  mediaCleanup=cleanupMedia();
  for(const path of [...mediaParentsCreated].reverse())try{adb(['shell','rmdir',path]);}
  catch{mediaCleanup.push({kind:'created-empty-parent',result:'阻塞',errorCode:'MEDIA_PARENT_CLEANUP_UNCONFIRMED'});}
  // Permission cleanup precedes the single normal logout; no network/display settings were changed.
  if(validated)try {logout=await normalLogout();}catch(error) {logout={result:'阻塞',actionCount:logoutActions,errorCode:error instanceof ScanFailure?error.code:'NORMAL_LOGOUT_UNCONFIRMED'};}
  else logout={result:'不适用',actionCount:0};
  if(relay)try {await relay.close();}catch {results.push({id:'dns-relay-close',result:'阻塞',errorCode:'DNS_RELAY_CLOSE_FAILED'});}
  let sourceAfter=null;try {if(sourceBefore)sourceAfter=sourceFingerprint(['android-as','app-rn']);}catch {}
  const report={runId,parentRunId:/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(arg('--parent-run')??'')?arg('--parent-run'):null,parentReportSha256:parentSha,scriptSha256,cameraAppOpsSha256,packageId:pkg,serial,
    installedArtifactSha256,sourceBefore,sourceAfter,sourceUnchanged:Boolean(sourceBefore && sourceAfter?.sourceSha256===sourceBefore.sourceSha256),
    permissionOriginal,permissionRestoration,pickerRestoration,pickerDiagnostics,media:media.map(row=>({kind:row.kind,sha256:row.sha256,staged:row.pushed,registered:Boolean(row.uri),indexed:row.indexed,
      generatedRelativePath:'DCIM/Camera/'+row.album+'/fixture.png'})),
    mediaCleanup,logout,display:{changed:false,restoration:'not-required'},dnsForwarding:relay?.snapshot()??null,results,screenshots,
    scope:'Actual Home/Add/Scan, real camera denial and system PhotoPicker with fixed identity-free public PNGs, native ZXing decisions. No decoder injection.',
    limits:['No production QR interpretation, binding, upload, control, verification codes or other relationship writes.',
      'No real camera frame delivery/decode, hardware, iOS or full visual acceptance.',
      'No raw XML/gallery content/URI/QR/error/CLI dump is archived. Optional screenshots require the known native scan page and denied camera; system picker is never captured. No display, OS or network configuration changes.',
      'Only generated nonce paths and verified MediaStore rows are deleted; unknown picker layout blocks rather than selecting a real photo.',
      'Only current validation package CAMERA grant/user-set/user-fixed/effective AppOp mode is restored; Android16 absent package default equals allow. UID mode is independently compared and never written. AppOp entry/history presence and timestamps are not rewound.',
      'SIGINT/SIGTERM restore after bounded current command; force-kill cannot guarantee finally cleanup.']};
  await writeFile(new URL('android-scan-software-'+runId+'.json',reports),JSON.stringify(report,null,2)+'\n');
  console.log('permission-restore: '+permissionRestoration.result+'; normal-logout: '+logout.result);
  if(results.some(row=>row.result==='阻塞') || pickerRestoration.result==='阻塞' || permissionRestoration.result==='阻塞' || logout.result==='阻塞' ||
    mediaCleanup.some(row=>row.result!=='通过') || !report.sourceUnchanged)process.exitCode=1;
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);if(interrupted)process.exitCode=130;
}


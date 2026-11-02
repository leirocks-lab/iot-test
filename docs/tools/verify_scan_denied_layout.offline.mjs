// Pure checks of the actual tool's parser/restoration/identity functions. No module execution or ADB.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseCameraAppOps,cameraAppOpsEquivalent} from './android-ui/camera-appops.mjs';
const source=await readFile(new URL('./verify_scan_denied_layout.mjs',import.meta.url),'utf8');
const functionText=(begin,end)=>source.slice(source.indexOf(begin),source.indexOf(end,source.indexOf(begin)));
const fail=code=>{throw new Error(code);};
const viewportReader=new Function('displayViewport','fail',functionText('function viewport(', 'function geometry(')+';return viewport;')({width:640,height:1280},fail);
for(const xml of ['<node bounds="[0,0][640,1280]"/>','<node bounds="[0,700][640,1280]"/>','<node bounds="[-40,-100][680,1380]"/>','<node bounds="[0,0][0,0]"/>'])assert.deepEqual(viewportReader(xml),{width:640,height:1280});
const unknownViewport=new Function('displayViewport','fail',functionText('function viewport(', 'function geometry(')+';return viewport;')(null,fail);
assert.throws(()=>unknownViewport('<node bounds="[0,0][640,1280]"/>'));
// Exact observed API36 format: UID override is not the package operation.
assert.deepEqual(parseCameraAppOps('Uid mode: CAMERA: ignore'),{appOp:'default',uidAppOp:'ignore',packageEntryPresent:false});
assert.deepEqual(parseCameraAppOps('CAMERA: allow'),{appOp:'allow',uidAppOp:null,packageEntryPresent:true});
assert.deepEqual(parseCameraAppOps('Uid mode: CAMERA: ignore\nCAMERA: allow'),{appOp:'allow',uidAppOp:'ignore',packageEntryPresent:true});
const cameraDump='android.permission.CAMERA: granted=false, flags=[ USER_SENSITIVE_WHEN_GRANTED|USER_SENSITIVE_WHEN_DENIED ]';
const permissionReader=new Function('adb','pkg','fail','parseCameraAppOps',functionText('function permissionState()', 'function setFlags(')+'; return permissionState;')
  (args=>args[1]==='dumpsys'?cameraDump:'Uid mode: CAMERA: ignore','com.rowan.iot.dev.refactor',fail,parseCameraAppOps);
const uidOriginal={granted:false,flags:['USER_SENSITIVE_WHEN_DENIED','USER_SENSITIVE_WHEN_GRANTED'],appOp:'default',uidAppOp:'ignore',packageEntryPresent:false};
assert.deepEqual(permissionReader(),uidOriginal);
const permissionRestoreText=functionText('function restorePermission()', 'async function normalLogout(');
for(const [observed,expected]of [
  [{...uidOriginal},'通过'],
  [{...uidOriginal,appOp:'allow',packageEntryPresent:true},'通过'],
  [{...uidOriginal,appOp:'allow',packageEntryPresent:true,uidAppOp:null},'阻塞'],
  [{...uidOriginal,appOp:'allow',packageEntryPresent:true,uidAppOp:'allow'},'阻塞'],
  [{...uidOriginal,packageEntryPresent:true},'阻塞'],
  [{...uidOriginal,appOp:'allow',packageEntryPresent:true,granted:true},'阻塞'],
  [{...uidOriginal,appOp:'allow',packageEntryPresent:true,flags:[...uidOriginal.flags,'USER_SET']},'阻塞']]) {
  const commands=[];
  const restore=new Function('originalPermission','adb','pkg','permission','setFlags','permissionState','cameraAppOpsEquivalent',permissionRestoreText+'; return restorePermission;')
    (uidOriginal,args=>{commands.push(args);return '';},'com.rowan.iot.dev.refactor','android.permission.CAMERA',()=>{},()=>observed,cameraAppOpsEquivalent);
  const restoration=restore();assert.equal(restoration.result,expected);
  assert.equal(restoration.packageEntryPresenceMatches,observed.packageEntryPresent===uidOriginal.packageEntryPresent);
  assert.equal(restoration.historyRestored,false);
  assert.deepEqual(commands.find(x=>x[1]==='cmd'),['shell','cmd','appops','set','com.rowan.iot.dev.refactor','CAMERA','default']);
  assert.equal(commands.some(x=>x.includes('--uid')),false);
  assert.equal(commands.some(x=>x.includes('reset')),false);
}
assert.equal(cameraAppOpsEquivalent({...uidOriginal,packageEntryPresent:true},{...uidOriginal,appOp:'allow',packageEntryPresent:true}),false);
const parse=new Function('fail',functionText('function parseWm(', 'function readEnvironment(')+'; return parseWm;')(fail);
assert.deepEqual(parse('Physical size: 1080x2400\r\r\n','size','[1-9]\\d*x[1-9]\\d*'),{physical:'1080x2400',override:null});
assert.deepEqual(parse('Physical size: 1080x2400\nOverride size: 640x1280\n','size','[1-9]\\d*x[1-9]\\d*'),{physical:'1080x2400',override:'640x1280'});
assert.throws(()=>parse('Physical density: 420\nUnexpected field: 320','density','[1-9]\\d*'));
assert.throws(()=>parse('Physical size: 1080x2400\nOverride size: 640x1280\nOverride size: 750x1624','size','[1-9]\\d*x[1-9]\\d*'));
assert.throws(()=>parse('Override size: 640x1280','size','[1-9]\\d*x[1-9]\\d*'));
const isScan=dump=>new Function('adb',functionText('function activityIsScan(', 'function scanShape(')+'; return activityIsScan();')(()=>dump);
const isHome=dump=>new Function('adb',functionText('function activityIsHome(', 'function scanShape(')+'; return activityIsHome();')(()=>dump);
assert.equal(isScan('topResumedActivity=ActivityRecord{x u0 com.rowan.iot.dev.refactor/com.rowan.iot.features.scan.ScanActivity t1}'),true);
assert.equal(isScan('mResumedActivity: ActivityRecord{x u0 com.rowan.iot.dev.refactor/.features.scan.ScanActivity t1}'),true);
assert.equal(isScan('topResumedActivity=ActivityRecord{x u0 com.rowan.iot.dev.refactor/com.rowan.iot.features.home.HomeActivity t1}'),false);
assert.equal(isScan('topResumedActivity=ActivityRecord{x u0 com.google.android.providers.media.module/.PhotoPicker t1}'),false);
assert.equal(isScan('topResumedActivity=null'),false);
assert.equal(isHome('topResumedActivity=ActivityRecord{x u0 com.rowan.iot.dev.refactor/com.rowan.iot.features.home.HomeActivity t1}'),true);
assert.equal(isHome('topResumedActivity=ActivityRecord{x u0 com.rowan.iot.dev.refactor/com.rowan.iot.features.scan.ScanActivity t1}'),false);
const restoreText=functionText('async function restoreEnvironment()', 'function restorePermission(');
for(const original of [
  {size:{physical:'1080x2400',override:null},density:{physical:'420',override:null},fontScale:'null'},
  {size:{physical:'1080x2400',override:'750x1624'},density:{physical:'420',override:'320'},fontScale:'1.25'}]) {
  const commands=[];
  const restore=new Function('environment','adb','wait','readEnvironment',restoreText+';return restoreEnvironment;')
    (original,args=>{commands.push(args);return '';},async()=>{},()=>original);
  assert.equal((await restore()).result,'通过');
  assert.deepEqual(commands,[['shell','wm','size',original.size.override??'reset'],['shell','wm','density',original.density.override??'reset'],
    original.fontScale==='null'?['shell','settings','delete','system','font_scale']:['shell','settings','put','system','font_scale','1.25']]);
}
const original={size:{physical:'1080x2400',override:null},density:{physical:'420',override:null},fontScale:'1.0'},attempted=[];
const failedRestore=new Function('environment','adb','wait','readEnvironment',restoreText+';return restoreEnvironment;')
  (original,args=>{attempted.push(args);if(args[2]==='size')throw new Error('fixture');return '';},async()=>{},()=>original);
assert.equal((await failedRestore()).result,'阻塞');assert.equal(attempted.length,3);
console.log('Offline parser, UID/package AppOps, native identity and exact-restoration checks passed; no ADB/GUI executed.');

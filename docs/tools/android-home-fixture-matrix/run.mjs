// PREPARED ONLY: requires Root-exclusive emulator window and matching installed APK pair.
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,openSync,writeSync,closeSync,existsSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {configurations,Failure,fail,parseEnvironment,runMatrix,parseForeground,welcomeGuard,surfaceGuard,sourceProjects,collectorRelativePath,fingerprintForBuild} from './state.mjs';
import {dumpHierarchy,AndroidUiSnapshotError} from '../../../docs/tools/android-ui/snapshot.mjs';
import {sourceFingerprint} from '../../../docs/tools/source_fingerprint.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const adbPath='D:/Android/Sdk/platform-tools/adb.exe',serial='emulator-5554';
const pkg='com.rowan.iot.dev.refactor',testPkg=pkg+'.test',runner='com.rowan.iot.fixtures.HomeFixtureInstrumentation';
const collector=resolve(root,collectorRelativePath);
const sha=b=>createHash('sha256').update(b).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let interrupted=false,owned=false,index=0;
const stop=()=>{interrupted=true;};
function adb(args,{allowAbsent=false,cleanup=false}={}){
 if(interrupted&&!cleanup)fail('INTERRUPTED');
 try{return execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8',timeout:20000,maxBuffer:3*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch(error){if(allowAbsent&&error.status===1&&String(error.stdout??'').trim()==='')return '';fail('ADB_UNAVAILABLE');}
}
function environment(cleanup=false){return parseEnvironment(adb(['shell','wm','size'],{cleanup}),adb(['shell','wm','density'],{cleanup}),adb(['shell','settings','get','system','font_scale'],{cleanup}));}
function installed(packageId){
 const lines=adb(['shell','pm','path',packageId]).replaceAll('\r','').split('\n').filter(Boolean);
 if(lines.length!==1||!/^package:\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(lines[0]))fail('INSTALLED_APK_UNVERIFIABLE');
 const value=adb(['shell','sha256sum',lines[0].slice(8)]).trim().split(/\s+/)[0];if(!/^[a-f0-9]{64}$/.test(value))fail('INSTALLED_SHA_INVALID');return value;
}
function foreground(){return parseForeground(adb(['shell','dumpsys','activity','activities']));}
async function safeSurface(){
 for(let attempt=0;attempt<3;attempt++)try{return dumpHierarchy(serial,'/sdcard/rowan-home-fixture-matrix.xml');}
 catch(error){if(!(error instanceof AndroidUiSnapshotError)||error.code!=='ROOT_NOT_READY'||attempt===2)fail('SAFE_SURFACE_UNAVAILABLE');await pause(200);}
}
async function safeWelcome(){
 for(let n=0;n<2;n++){
  const before=foreground(),xml=await safeSurface(),after=foreground();
  if(JSON.stringify(before)!==JSON.stringify(after))fail('FOREGROUND_CHANGED');welcomeGuard(after,xml);
 }
}
async function safeLauncher(){
 for(let n=0;n<12;n++){
  const f=foreground();if(['com.google.android.apps.nexuslauncher','com.android.launcher3'].includes(f.packageId)){const xml=await safeSurface();surfaceGuard(xml,f.packageId);if(JSON.stringify(f)!==JSON.stringify(foreground()))fail('FOREGROUND_CHANGED');return;}
  if(f.packageId!==pkg)fail('UNKNOWN_DIALOG_OR_APP');
  await pause(150);
 }fail('OWNED_RETURN_NOT_LAUNCHER');
}
async function retire(){
 if(!owned)return;
 adb(['shell','am','force-stop',pkg],{cleanup:true});
 for(let n=0;n<12;n++){
  const p=adb(['shell','pidof',pkg],{allowAbsent:true,cleanup:true}).trim();
  const t=adb(['shell','pidof',testPkg],{allowAbsent:true,cleanup:true}).trim();
  if(!p&&!t){owned=false;return;}await pause(150);
 }fail('OWNED_PROCESS_UNCONFIRMED');
}
function instrument(logPath){return new Promise((resolveRun,reject)=>{
 const fd=openSync(logPath,'wx');let bytes=0,settled=false,problem=null;
 const child=spawn(adbPath,['-s',serial,'shell','am','instrument','-w','-e','emitPublicArtifacts','true',testPkg+'/'+runner],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 const timer=setTimeout(()=>{problem='INSTRUMENTATION_TIMEOUT';child.kill();},180000);
 const interruptTimer=setInterval(()=>{if(interrupted){problem='INTERRUPTED';child.kill();}},200);
 child.stdout.on('data',chunk=>{if(problem)return;bytes+=chunk.length;if(bytes>64*1024*1024){problem='LOG_BUDGET_EXCEEDED';child.kill();return;}try{writeSync(fd,chunk);}catch{problem='LOG_WRITE_FAILED';child.kill();}});
 child.stderr.on('data',()=>{}); // Never print/archive arbitrary platform stderr.
 const finish=code=>{if(settled)return;settled=true;clearTimeout(timer);clearInterval(interruptTimer);closeSync(fd);if(problem)reject(new Failure(problem));else if(code!==0)reject(new Failure('INSTRUMENTATION_PROCESS_FAILED'));else resolveRun({bytes});};
 child.once('error',()=>{problem='INSTRUMENTATION_START_FAILED';finish(-1);});child.once('close',finish);
 });}
function argumentsOnly(argv){
 const values=new Map();for(const item of argv){const m=/^--(host-sha|test-sha|host-provenance|test-provenance|collector-sha)=(.+)$/.exec(item);if(!m||values.has(m[1]))fail('ARGUMENTS_INVALID');values.set(m[1],m[2]);}
 if(values.size!==5||['host-sha','test-sha','collector-sha'].some(k=>!/^[a-f0-9]{64}$/.test(values.get(k))))fail('EXACT_SHA_ARGUMENTS_REQUIRED');return values;
}
function formalJson(value){const path=resolve(root,value),base=resolve(root,'docs/测试报告');if(!path.startsWith(base+sep)||!path.endsWith('.json'))fail('FORMAL_PROVENANCE_REQUIRED');return {path,value:JSON.parse(readFileSync(path,'utf8')),sha256:sha(readFileSync(path))};}
export async function main(argv){
 const args=argumentsOnly(argv),host=formalJson(args.get('host-provenance')),test=formalJson(args.get('test-provenance'));
 const source=host.value.sourceAfter?.sourceSha256;
 for(const [entry,role,task,artifact]of [[host,'native-application',':app:assembleDevelopmentRelease',args.get('host-sha')],[test,'sdk-instrumentation-test-only',':app:assembleDevelopmentReleaseAndroidTest',args.get('test-sha')]]){
  const v=entry.value;if(v.artifactRole!==role||v.task!==task||v.artifactSha256!==artifact||!v.sourceUnchangedDuringBuild||v.sourceBefore?.sourceSha256!==source||v.sourceAfter?.sourceSha256!==source||v.isolatedValidation!==true||v.architecture!=='x86_64')fail('FORMAL_PROVENANCE_MISMATCH');
 }
 if(!/^[a-f0-9]{64}$/.test(source??'')||test.value.targetArtifactSha256!==args.get('host-sha')||sha(readFileSync(collector))!==args.get('collector-sha'))fail('PAIR_OR_COLLECTOR_MISMATCH');
 const runId=randomUUID(),directory=resolve(root,'.cache/refactor/android-home-fixture-matrix-runs',runId);mkdirSync(directory,{recursive:true});
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 const guardHashes=()=>{if(sha(readFileSync(collector))!==args.get('collector-sha'))fail('COLLECTOR_CHANGED');if(installed(pkg)!==args.get('host-sha')||installed(testPkg)!==args.get('test-sha')||fingerprintForBuild(sourceFingerprint).sourceSha256!==source)fail('INSTALLED_OR_SOURCE_CHANGED');};
 const report=await runMatrix({
  preflight:async()=>{if(adb(['shell','getprop','ro.build.version.sdk']).trim()!=='36'||adb(['get-state']).trim()!=='device'||adb(['shell','getprop','sys.boot_completed']).trim()!=='1')fail('EMULATOR_NOT_READY');const name=adb(['emu','avd','name']).replaceAll('\r','').split('\n').map(x=>x.trim()).filter(x=>x&&x!=='OK');if(name.length!==1||!['ROWAN_API36','ROWAN_API_36'].includes(name[0]))fail('DEDICATED_AVD_REQUIRED');guardHashes();await safeWelcome();},
  readEnvironment:()=>environment(true),command:cmd=>adb(cmd,{cleanup:true}),
  beforeConfiguration:async()=>{guardHashes();if(index===0)await safeWelcome();else await safeLauncher();},
  configure:async c=>{if(index===0)adb(['shell','am','force-stop',pkg]);adb(['shell','wm','size',c.size]);adb(['shell','wm','density',c.density]);adb(['shell','settings','put','system','font_scale',c.fontScale]);await safeLauncher();},
  instrumentAndCollect:async c=>{
   const log=resolve(directory,c.id+'.instrument.log');owned=true;const captured=await instrument(log);
   let stdout='',exitCode=0;try{stdout=execFileSync(process.execPath,[collector,'--input='+log,'--expected-apk-sha='+args.get('host-sha'),'--expected-test-apk-sha='+args.get('test-sha')],{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});}catch(error){exitCode=error.status??-1;stdout=String(error.stdout??'');}
   let collected;try{collected=JSON.parse(stdout.trim());}catch{fail('COLLECTOR_REJECTED');}
   if(![0,1,2].includes(exitCode)||collected.fixtureOnly!==true||!['passed','partial','failed'].includes(collected.status)||exitCode!==({passed:0,failed:1,partial:2}[collected.status]))fail('COLLECTOR_EXIT_MISMATCH');
   const path=resolve(collected.directory,'report.json');if(!path.startsWith(resolve(root,'.cache/refactor/android-home-ui-fixtures-runs')+sep)||!existsSync(path))fail('COLLECTOR_REPORT_MISSING');
   return {status:collected.status,collectorExitCode:exitCode,log:relative(root,log),logBytes:captured.bytes,report:relative(root,path),passed:collected.passed,blocked:collected.blocked};
  },
  afterConfiguration:async()=>{await retire();await safeLauncher();index++;},retireOwned:retire
 });
 report.runId=runId;report.serial=serial;report.packageId=pkg;report.sourceSha256=source;report.sourceProjects=sourceProjects;report.collectorPath=collectorRelativePath;report.hostSha256=args.get('host-sha');report.testSha256=args.get('test-sha');report.collectorSha256=args.get('collector-sha');report.scriptSha256=sha(readFileSync(fileURLToPath(import.meta.url)));report.stateMachineSha256=sha(readFileSync(new URL('./state.mjs',import.meta.url)));report.snapshotHelperSha256=sha(readFileSync(resolve(root,'docs/tools/android-ui/snapshot.mjs')));report.formalProvenance=[host,test].map(x=>({path:relative(root,x.path),sha256:x.sha256}));
 try{report.finalSourceMatches=fingerprintForBuild(sourceFingerprint).sourceSha256===source;}catch{report.finalSourceMatches=false;}if(!report.finalSourceMatches)report.status='blocked';
 writeFileSync(resolve(directory,'matrix.json'),JSON.stringify(report,null,2)+'\n');process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
 console.log(JSON.stringify({directory,status:report.status,configurations:report.configurations.length,restoration:report.restoration.result,fixtureOnly:true}));return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(r=>{process.exitCode=r.status==='passed'?0:r.status==='partial'?2:1;}).catch(()=>{console.error('Matrix preflight unavailable; no arbitrary error details emitted.');process.exitCode=1;});

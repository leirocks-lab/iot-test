// Offline only. Reads an already-recorded am instrument stdout file; never invokes ADB or network.
import {statSync,openSync,fstatSync,readSync,closeSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');

export const caseArtifacts={
 'empty-home':['00-empty-home.png'],
 'multiple-rooms-same-name-and-opaque-id':['01-same-name-room.png'],
 'known-empty-room':['02-empty-room.png'],
 'long-room-label-reachable':['03-long-room-name.png'],
 'loading-and-offline-retain-confirmed-selection':['04-loading-cache.png','05-error-cache.png'],
 'native-return-rejects-old-uncooperative-read':['06-return-old-read-rejected.png'],
 'real-device-container-navigation-and-back':['07-real-device-return.png'],
 'old-account-read-cannot-populate-new-home':['08-account-revision-fence.png'],
 's031-reviewed-draft-compatibility':['09-local-selection.png']};
export const navigationRequirements=[
 {case:'native-return-rejects-old-uncooperative-read',stage:'entered',actualNativePage:'RoomsActivity',resumedAndFocused:true},
 {case:'native-return-rejects-old-uncooperative-read',stage:'returned',fromPage:'RoomsActivity',actualNativePage:'HomeActivity',resumedAndFocused:true,publicRowsMatched:true,lateReadIgnored:true,expectedRevisionMatched:true},
 {case:'real-device-container-navigation-and-back',stage:'entered',actualNativePage:'DeviceActivity',resumedAndFocused:true,publicDeviceAndExpectedRevisionMatched:true,actualRnTestIdsMounted:true},
 {case:'real-device-container-navigation-and-back',stage:'returned',fromPage:'DeviceActivity',actualNativePage:'HomeActivity',resumedAndFocused:true,publicRowsMatched:true,expectedRevisionMatched:true},
 {case:'old-account-read-cannot-populate-new-home',stage:'recreated',actualNativePage:'HomeActivity',resumedAndFocused:true,currentFixtureRevisionChanged:true,oldReadIgnored:true,publicRowsMatched:true}];
// No output may be created until this bounded, mutation-checked read and parse both finish.
export function readBoundedLog(path,limit=64*1024*1024,io={statSync,openSync,fstatSync,readSync,closeSync}) {
 const valid=s=>s.isFile()&&Number.isSafeInteger(s.size)&&s.size>=0&&s.size<=limit;
 const before=io.statSync(path);if(!valid(before))throw Error('log budget/type rejected');
 const fd=io.openSync(path,'r');try {
  const initial=io.fstatSync(fd);if(!valid(initial))throw Error('log budget/type rejected');
  const stable=s=>valid(s)&&['size','mtimeMs','ctimeMs','dev','ino'].every(k=>s[k]===initial[k]);
  if(!stable(before))throw Error('log changed before open');
  let total=0;const chunks=[];
  for(;;){if(!stable(io.fstatSync(fd)))throw Error('log changed during read');
   const buffer=Buffer.alloc(Math.min(64*1024,limit-total+1));const count=io.readSync(fd,buffer,0,buffer.length,null);
   if(count<0||count>buffer.length||total+count>limit)throw Error('log budget exceeded');
   if(!stable(io.fstatSync(fd)))throw Error('log changed during read');
   if(count===0)break;total+=count;chunks.push(buffer.subarray(0,count));
  }
  if(total!==initial.size||!stable(io.fstatSync(fd)))throw Error('log incomplete or changed');
  return Buffer.concat(chunks,total).toString('utf8');
 }finally{io.closeSync(fd);}
}

export function parse(log,expectedApk,expectedTestApk) {
  if(!/^[a-f0-9]{64}$/.test(expectedApk)||!/^[a-f0-9]{64}$/.test(expectedTestApk))throw Error('target and test APK SHAs are required');
  if(Buffer.byteLength(log)>64*1024*1024)throw Error('log budget exceeded');
  let status={},encodedReport=null,instrumentCode=null;const images=new Map();
  for(const line of log.replaceAll('\r','').split('\n')) {
    const value=/^INSTRUMENTATION_STATUS: ([a-zA-Z0-9_]+)=(.*)$/.exec(line);
    if(value) {status[value[1]]=value[2];continue;}
    if(/^INSTRUMENTATION_STATUS_CODE: /.test(line)) {
      if(status.rowan_fixture_name) {
        const name=status.rowan_fixture_name,index=Number(status.rowan_fixture_index),count=Number(status.rowan_fixture_count);
        if(!/^[0-9]{2}-[a-z0-9-]+\.png$/.test(name)||!Number.isInteger(index)||!Number.isInteger(count)||count<1||count>128||index<0||index>=count||
          !/^[a-f0-9]{64}$/.test(status.rowan_fixture_sha256)||!/^[A-Za-z0-9+/=]+$/.test(status.rowan_fixture_data??'')||status.rowan_fixture_data.length>24*1024)throw Error('bad artifact chunk');
        const item=images.get(name)??{sha:status.rowan_fixture_sha256,count,chunks:new Map()};
        if(item.sha!==status.rowan_fixture_sha256||item.count!==count||item.chunks.has(index))throw Error('duplicate or inconsistent chunk');
        item.chunks.set(index,status.rowan_fixture_data);images.set(name,item);
      }
      status={};continue;
    }
    const report=/^INSTRUMENTATION_RESULT: rowan_fixture_report=(.*)$/.exec(line);
    if(report){if(encodedReport!==null)throw Error('duplicate report');encodedReport=report[1];}
    const end=/^INSTRUMENTATION_CODE: (-?\d+)$/.exec(line);if(end)instrumentCode=Number(end[1]);
  }
  if(encodedReport===null)throw Error('missing report');
  const report=JSON.parse(Buffer.from(encodedReport,'base64').toString('utf8'));
  if(report.schemaVersion!==1||report.fixtureOnly!==true||report.businessHttpDelegate!=='none'||report.realHttpAcceptance!==false||
    report.pixelAcceptance!==false||report.iosRuntimeAcceptance!==false||report.sdk!==36||report.targetPackage!=='com.rowan.iot.dev.refactor'||
    report.targetApkSha256!==expectedApk||report.testApkSha256!==expectedTestApk||!/^[a-f0-9-]{36}$/.test(report.runId)||!Array.isArray(report.results)||!Array.isArray(report.artifacts)||
    report.artifacts.length>10)throw Error('report provenance mismatch');
  const output=new Map();let total=0;
  for(const artifact of report.artifacts) {
    if(output.has(artifact.name)||!caseArtifacts[artifact.caseId]?.includes(artifact.name)||artifact.geometryResult!=='passed'||!Array.isArray(artifact.geometry?.nodes)||artifact.geometry.nodes.length===0||!/^[0-9]{2}-[a-z0-9-]+\.png$/.test(artifact.name)||artifact.realWindowFrame!==true||artifact.semanticGuardBeforeAfter!==true||artifact.visualResult!=='not_reviewed'||
      !(artifact.frameFence?.requestedNanos>0)||!(artifact.frameFence?.completedVsyncNanos>=artifact.frameFence?.requestedNanos))throw Error('unsafe artifact metadata/frame fence');
    const item=images.get(artifact.name);if(!item||item.chunks.size!==item.count)throw Error('missing public artifact chunks');
    const bytes=Buffer.from(Array.from({length:item.count},(_,i)=>item.chunks.get(i)).join(''),'base64');
    if(bytes.length!==artifact.bytes||bytes.length>2*1024*1024||hash(bytes)!==artifact.sha256||hash(bytes)!==item.sha||
      bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.length<24||bytes.toString('ascii',12,16)!=='IHDR'||
      bytes.readUInt32BE(16)!==artifact.geometry?.windowWidth||bytes.readUInt32BE(20)!==artifact.geometry?.windowHeight)throw Error('artifact bytes/dimensions mismatch');
    total+=bytes.length;if(total>16*1024*1024)throw Error('artifact run budget exceeded');output.set(artifact.name,bytes);
  }
  if(images.size!==output.size)throw Error('unlisted artifact');
  const failed=report.results.some(x=>x.result==='failed');
  const mandatory=['empty-home','multiple-rooms-same-name-and-opaque-id','known-empty-room','long-room-label-reachable','loading-and-offline-retain-confirmed-selection',
    'native-return-rejects-old-uncooperative-read','real-device-container-navigation-and-back','old-account-read-cannot-populate-new-home'];
  if(!failed){
    if(report.results.length!==9||new Set(report.results.map(x=>x.id)).size!==9)throw Error('incomplete/duplicate successful cases');
    for(const [id,names] of Object.entries(caseArtifacts)){
      const result=report.results.find(x=>x.id===id);if(!result)throw Error('missing case');
      const optional=id==='s031-reviewed-draft-compatibility';
      if(optional&&result.result==='blocked'){
        if(result.code!=='selection_source_not_present'||result.geometryResult!=='not_run'||JSON.stringify(result.artifactNames)!=='[]'||names.some(n=>output.has(n)))throw Error('invalid partial case');
      }else if(result.result!=='passed'||result.geometryResult!=='passed'||JSON.stringify(result.artifactNames)!==JSON.stringify(names)||names.some(n=>!output.has(n)))throw Error('missing case geometry/artifact');
    }
    // Optional position is not authority; derive count from its explicit ID.
    const optional=report.results.find(x=>x.id==='s031-reviewed-draft-compatibility');
    if(output.size!==(optional.result==='blocked'?9:10))throw Error('incomplete artifact matrix');
    if(!Array.isArray(report.nativeNavigation)||report.nativeNavigation.length!==navigationRequirements.length||new Set(report.nativeNavigation.map(x=>x.case+':'+x.stage)).size!==navigationRequirements.length)throw Error('missing/duplicate native navigation');
    for(const required of navigationRequirements){const actual=report.nativeNavigation.find(x=>x.case===required.case&&x.stage===required.stage);
      if(!actual||Object.entries(required).some(([key,value])=>actual[key]!==value))throw Error('native navigation proof mismatch');}
  }
  if((!failed&&instrumentCode!==-1)||(failed&&instrumentCode!==0))throw Error('instrumentation exit disagrees with cases');
  const partial=!failed&&report.results.some(x=>x.result==='blocked');
  return {report,output,failed,partial,status:failed?'failed':partial?'partial':'passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))) {
  const args=new Map(process.argv.slice(2).map(x=>{const i=x.indexOf('=');if(i<0)throw Error('use --input= and --expected-apk-sha=');return [x.slice(0,i),x.slice(i+1)];}));
  if([...args.keys()].some(k=>!['--input','--expected-apk-sha','--expected-test-apk-sha'].includes(k)))throw Error('unknown argument');
  const parsed=parse(readBoundedLog(resolve(args.get('--input')??'')),args.get('--expected-apk-sha')??'',args.get('--expected-test-apk-sha')??'');
  const directory=resolve('.cache/refactor/android-home-ui-fixtures-runs',parsed.report.runId);
  if(existsSync(directory))throw Error('run directory exists; refusing overwrite');mkdirSync(directory,{recursive:true});
  for(const[name,bytes]of parsed.output)writeFileSync(join(directory,name),bytes);
  writeFileSync(join(directory,'report.json'),JSON.stringify(parsed.report,null,2)+'\n');
  console.log(JSON.stringify({directory,passed:parsed.report.results.filter(x=>x.result==='passed').length,blocked:parsed.report.results.filter(x=>x.result==='blocked').length,failed:parsed.failed,status:parsed.status,complete:!parsed.failed&&!parsed.partial,fixtureOnly:true}));
  if(parsed.failed)process.exitCode=1;else if(parsed.partial)process.exitCode=2;
}

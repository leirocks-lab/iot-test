import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parse,readBoundedLog,caseArtifacts,navigationRequirements} from './collect_results.mjs';
// Entire vector is public synthetic collector input, NOT Android screenshots/navigation evidence.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYoQAAAAASUVORK5CYII=','base64');
const digest=createHash('sha256').update(png).digest('hex'),apk='a'.repeat(64),testApk='b'.repeat(64);
function fixture(optional=false){
 const entries=Object.entries(caseArtifacts),included=optional?entries:entries.slice(0,-1);
 return {schemaVersion:1,runId:'00000000-0000-4000-8000-000000000001',fixtureOnly:true,businessHttpDelegate:'none',realHttpAcceptance:false,
  pixelAcceptance:false,iosRuntimeAcceptance:false,sdk:36,targetPackage:'com.rowan.iot.dev.refactor',targetApkSha256:apk,testApkSha256:testApk,
  results:entries.map(([id,names],i)=>i===8&&!optional?{id,result:'blocked',code:'selection_source_not_present',geometryResult:'not_run',artifactNames:[]}:{id,result:'passed',geometryResult:'passed',artifactNames:names}),
  nativeNavigation:structuredClone(navigationRequirements),artifacts:included.flatMap(([caseId,names])=>names.map(name=>({caseId,name,sha256:digest,bytes:png.length,geometryResult:'passed',realWindowFrame:true,semanticGuardBeforeAfter:true,visualResult:'not_reviewed',frameFence:{requestedNanos:1,completedVsyncNanos:2},geometry:{windowWidth:1,windowHeight:1,nodes:[{id:'home_room_all',selected:true,checked:null}]}})))};
}
function log(r=fixture(),code=-1){return [...Array.from(new Map(r.artifacts.map(a=>[a.name,a])).values()).flatMap(a=>[
 `INSTRUMENTATION_STATUS: rowan_fixture_name=${a.name}`,'INSTRUMENTATION_STATUS: rowan_fixture_index=0','INSTRUMENTATION_STATUS: rowan_fixture_count=1',
 `INSTRUMENTATION_STATUS: rowan_fixture_sha256=${digest}`,`INSTRUMENTATION_STATUS: rowan_fixture_data=${png.toString('base64')}`,'INSTRUMENTATION_STATUS_CODE: 1']),
 `INSTRUMENTATION_RESULT: rowan_fixture_report=${Buffer.from(JSON.stringify(r)).toString('base64')}`,`INSTRUMENTATION_CODE: ${code}`].join('\r\r\n');}
let count=0;function test(work){work();count++;}function rejects(edit,optional=false){test(()=>{const r=fixture(optional);edit(r);assert.throws(()=>parse(log(r),apk,testApk));});}
test(()=>{const p=parse(log(),apk,testApk);assert.equal(p.output.size,9);assert.equal(p.status,'partial');assert.equal(p.partial,true);assert.deepEqual(p.output.get('08-account-revision-fence.png'),png);});
test(()=>{const p=parse(log(fixture(true)),apk,testApk);assert.equal(p.output.size,10);assert.equal(p.status,'passed');});
rejects(r=>r.artifacts=[]);rejects(r=>r.artifacts.pop());rejects(r=>r.nativeNavigation=[]);
rejects(r=>r.nativeNavigation.splice(1,1));rejects(r=>r.nativeNavigation[2].actualRnTestIdsMounted=false);
rejects(r=>r.nativeNavigation[1].actualNativePage='RoomsActivity');
rejects(r=>r.artifacts.push({...r.artifacts[0]}));rejects(r=>r.artifacts[0].caseId='known-empty-room');
rejects(r=>delete r.results[0].geometryResult);rejects(r=>r.results[0].geometryResult='failed');
rejects(r=>r.results[0].artifactNames=[]);rejects(r=>r.artifacts[0].geometryResult='failed');
rejects(r=>r.artifacts[0].geometry.nodes=[]);rejects(r=>r.results[8].geometryResult='passed');
rejects(r=>r.artifacts.pop(),true);rejects(r=>r.results[8]={...fixture().results[8]},true);
rejects(r=>r.results[1]={...r.results[0]});rejects(r=>r.pixelAcceptance=true);
rejects(r=>r.artifacts[0].name='../private.png');rejects(r=>r.artifacts[0].geometry.windowWidth=2);
rejects(r=>r.artifacts[0].frameFence={requestedNanos:5,completedVsyncNanos:4});
test(()=>assert.throws(()=>parse(log(),'c'.repeat(64),testApk)));
test(()=>assert.throws(()=>parse(log(),apk,'c'.repeat(64))));
test(()=>assert.throws(()=>parse(log(fixture(),0),apk,testApk)));
test(()=>assert.throws(()=>parse(log().replace('rowan_fixture_index=0','rowan_fixture_index=2'),apk,testApk)));
test(()=>assert.throws(()=>parse(log().replace(png.toString('base64'),png.subarray(0,20).toString('base64')),apk,testApk)));
test(()=>{const r=fixture();r.results=[{id:'empty-home',result:'failed'}];assert.equal(parse(log(r,0),apk,testApk).status,'failed');});
function fakeIO({data='12345678',preSize=8,fdSize=8,changeAt=Infinity,changedSize=9,changeMtime=false,chunk=4}={}){
 let reads=0,opens=0,closes=0,offset=0;
 const stat=size=>({isFile:()=>true,size,mtimeMs:1,ctimeMs:1,dev:1,ino:1});
 return {statSync:()=>stat(preSize),openSync:()=>{opens++;return 1;},fstatSync:()=>({...stat(reads>=changeAt?changedSize:fdSize),mtimeMs:changeMtime&&reads>=changeAt?2:1}),
 readSync:(_fd,b,_off,length)=>{reads++;const n=Math.min(length,chunk,Buffer.byteLength(data)-offset);b.write(data.slice(offset,offset+n));offset+=n;return n;},
 closeSync:()=>{closes++;},counts:()=>({reads,opens,closes})};
}
test(()=>{const io=fakeIO();assert.equal(readBoundedLog('unused',8,io),'12345678');assert.equal(io.counts().closes,1);});
test(()=>{const io=fakeIO({preSize:9});assert.throws(()=>readBoundedLog('unused',8,io));assert.deepEqual(io.counts(),{reads:0,opens:0,closes:0});});
test(()=>{const io=fakeIO({fdSize:9});assert.throws(()=>readBoundedLog('unused',8,io));assert.deepEqual(io.counts(),{reads:0,opens:1,closes:1});});
test(()=>{const io=fakeIO({preSize:4,fdSize:4,changeAt:1,changedSize:6});assert.throws(()=>readBoundedLog('unused',8,io));assert.equal(io.counts().closes,1);});
test(()=>{const io=fakeIO({changeAt:1,changedSize:9});assert.throws(()=>readBoundedLog('unused',8,io));});
test(()=>{const io=fakeIO({changeAt:1,changedSize:8,changeMtime:true});assert.throws(()=>readBoundedLog('unused',8,io));});
test(()=>{const io=fakeIO({data:'123456789',chunk:9});assert.throws(()=>readBoundedLog('unused',8,io));});
test(()=>{const io=fakeIO({data:'1234'});assert.throws(()=>readBoundedLog('unused',8,io));});
console.log(`${count} offline synthetic matrix/integrity/bounded-read cases passed; no Android/ADB/Gradle/network executed.`);

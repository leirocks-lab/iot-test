import assert from 'node:assert/strict';
import {parseEnvironment,restoreEnvironment,runMatrix,Failure,configurations,parseForeground,welcomeGuard,surfaceGuard,sourceProjects,collectorRelativePath,fingerprintForBuild} from './state.mjs';
let count=0;async function test(work){await work();count++;}
const original=parseEnvironment('Physical size: 1080x2400\r\r\nOverride size: 900x1800\r\r\n','Physical density: 420\nOverride density: 360\n','null\n');
await test(()=>assert.deepEqual(original,{size:{physical:'1080x2400',override:'900x1800'},density:{physical:'420',override:'360'},fontScale:'null'}));
await test(()=>assert.throws(()=>parseEnvironment('unknown','Physical density: 420','1')));
await test(()=>assert.throws(()=>parseEnvironment('Physical size: 1080x2400\nOverride size: 1x2\nOverride size: 3x4','Physical density: 420','1')));
await test(()=>assert.throws(()=>parseEnvironment('Physical size: 1080x2400','Physical density: 420','NaN')));
await test(async()=>{const calls=[];const r=await restoreEnvironment(original,args=>calls.push(args),()=>original);assert.equal(r.result,'passed');assert.deepEqual(calls,[['shell','wm','size','900x1800'],['shell','wm','density','360'],['shell','settings','delete','system','font_scale']]);});
await test(async()=>{const o=parseEnvironment('Physical size: 1080x2400','Physical density: 420','1.25');const calls=[];const r=await restoreEnvironment(o,args=>calls.push(args),()=>o);assert.equal(r.result,'passed');assert.deepEqual(calls,[['shell','wm','size','reset'],['shell','wm','density','reset'],['shell','settings','put','system','font_scale','1.25']]);});
await test(async()=>{let calls=0;const r=await restoreEnvironment(original,()=>{calls++;if(calls===1)throw Error();},()=>original);assert.equal(calls,3);assert.equal(r.result,'blocked');});
await test(async()=>{const r=await restoreEnvironment(original,()=>{},()=>({...original,fontScale:'1'}));assert.equal(r.result,'blocked');});
function harness(options={}){
 let env=structuredClone(original),n=0;const events=[];
 const io={
 preflight:()=>{events.push('preflight');if(options.preflightFail)throw new Failure('WELCOME_REQUIRED');},
 readEnvironment:()=>{if(options.prestateFail&&events.length===1)throw new Failure('UNKNOWN_PRESTATE');return env;},
 beforeConfiguration:c=>{events.push('before:'+c.id);if(options.beforeFail===c.id)throw new Failure('UNKNOWN_DIALOG');},
 configure:c=>{events.push('configure:'+c.id);env={size:{physical:'1080x2400',override:c.size},density:{physical:'420',override:c.density},fontScale:c.fontScale};if(options.configureFail===c.id)throw new Failure('CONFIGURE_INTERRUPTED');if(options.badReadback===c.id)env.fontScale='2';},
 instrumentAndCollect:c=>{events.push('instrument:'+c.id);n++;if(options.instrumentThrow===c.id)throw new Failure('COLLECTOR_REJECTED');return {status:options.status??'passed',collectorExitCode:options.status==='partial'?2:options.status==='failed'?1:0};},
 afterConfiguration:c=>{events.push('after:'+c.id);if(options.afterFail===c.id)throw new Failure('UNKNOWN_DIALOG');},
 retireOwned:()=>{events.push('retire');if(options.retireFail)throw Error();},
 command:args=>{events.push('restore:'+args[2]);if(args[2]==='size')env.size.override=original.size.override;if(args[2]==='density')env.density.override=original.density.override;if(args.includes('font_scale'))env.fontScale=options.badRestore?'1':original.fontScale;}
 };return {io,events,get count(){return n;}};
}
await test(async()=>{const h=harness();const r=await runMatrix(h.io);assert.equal(r.status,'passed');assert.equal(r.configurations.length,4);assert.equal(r.restoration.result,'passed');assert.equal(h.count,4);assert.ok(h.events.indexOf('after:base')<h.events.indexOf('before:small'));});
await test(async()=>{const h=harness({preflightFail:true});const r=await runMatrix(h.io);assert.equal(r.status,'blocked');assert.equal(r.restoration.result,'not_changed');assert.equal(h.count,0);assert.equal(h.events.length,1);});
await test(async()=>{const h=harness({prestateFail:true});const r=await runMatrix(h.io);assert.equal(r.status,'blocked');assert.equal(r.restoration.result,'not_changed');assert.equal(h.count,0);});
await test(async()=>{const h=harness({configureFail:'base'});const r=await runMatrix(h.io);assert.equal(r.status,'blocked');assert.equal(r.restoration.result,'passed');assert.equal(h.count,0);});
await test(async()=>{const h=harness({badReadback:'base'});const r=await runMatrix(h.io);assert.equal(r.errorCode,'CONFIGURATION_READBACK_MISMATCH');assert.equal(r.restoration.result,'passed');assert.equal(h.count,0);});
await test(async()=>{const h=harness({instrumentThrow:'base'});const r=await runMatrix(h.io);assert.equal(r.status,'failed');assert.equal(r.configurations[0].code,'COLLECTOR_REJECTED');assert.equal(h.count,4);assert.ok(h.events.includes('after:base'));assert.equal(r.restoration.result,'passed');});
await test(async()=>{const h=harness({status:'partial'});const r=await runMatrix(h.io);assert.equal(r.status,'partial');assert.equal(r.configurations.every(x=>x.collectorExitCode===2),true);});
await test(async()=>{const h=harness({status:'failed'});const r=await runMatrix(h.io);assert.equal(r.status,'failed');assert.equal(h.count,4);});
await test(async()=>{const h=harness({afterFail:'base'});const r=await runMatrix(h.io);assert.equal(r.errorCode,'UNKNOWN_DIALOG');assert.equal(h.count,1);assert.equal(r.restoration.result,'passed');});
await test(async()=>{const h=harness({beforeFail:'small'});const r=await runMatrix(h.io);assert.equal(r.errorCode,'UNKNOWN_DIALOG');assert.equal(h.count,1);assert.equal(r.restoration.result,'passed');});
await test(async()=>{const h=harness({retireFail:true});const r=await runMatrix(h.io);assert.equal(r.status,'blocked');assert.equal(r.retireCode,'OWNED_PROCESS_UNCONFIRMED');assert.equal(r.restoration.result,'passed');});
await test(async()=>{const h=harness({badRestore:true});const r=await runMatrix(h.io);assert.equal(r.status,'blocked');assert.equal(r.restoration.result,'blocked');});
const focus=parseForeground('  topResumedActivity=ActivityRecord{123 u0 com.rowan.iot.dev.refactor/com.rowan.iot.features.auth.WelcomeActivity t1}\r\r\n');
const login='<node package="com.rowan.iot.dev.refactor" resource-id="com.rowan.iot.dev.refactor:id/welcome_login" bounds="[1,1][90,50]" enabled="true" clickable="true"/>';
const register='<node package="com.rowan.iot.dev.refactor" resource-id="com.rowan.iot.dev.refactor:id/welcome_register" bounds="[1,51][90,100]" enabled="true" clickable="true"/>';
const wrap=children=>'<node package="com.rowan.iot.dev.refactor" bounds="[0,0][100,200]">'+children+'</node>';
const welcome=wrap(login+register);
await test(()=>welcomeGuard(focus,welcome));
await test(()=>assert.throws(()=>parseForeground('mCurrentFocus=Window{123 Application Not Responding: com.android.systemui}')));
await test(()=>assert.throws(()=>parseForeground('mCurrentFocus=null')));
await test(()=>assert.throws(()=>welcomeGuard({...focus,activity:'com.rowan.iot.features.home.HomeActivity'},welcome)));
await test(()=>assert.throws(()=>welcomeGuard(focus,welcome+'<node resource-id="com.rowan.iot.dev.refactor:id/home_title"/>')));
await test(()=>assert.throws(()=>welcomeGuard(focus,welcome+'<node resource-id="android:id/aerr_wait"/>')));
await test(()=>assert.deepEqual(sourceProjects,['android-as','app-rn']));
await test(()=>assert.equal(collectorRelativePath,'docs/tools/android-home-fixtures/collect_results.mjs'));
await test(()=>assert.deepEqual(parseForeground('topResumedActivity=ActivityRecord{a u0 x.y/.Main t1}\nmResumedActivity: ActivityRecord{a u0 x.y/.Main t1}'),{packageId:'x.y',activity:'.Main'}));
await test(()=>assert.throws(()=>parseForeground('topResumedActivity=ActivityRecord{a u0 x.y/.Main t1}\nmResumedActivity: ActivityRecord{b u0 z.y/.Main t2}')));
await test(()=>assert.throws(()=>surfaceGuard('<node package="com.android.systemui"/>','com.google.android.apps.nexuslauncher')));
await test(()=>assert.throws(()=>surfaceGuard('<node package="com.google.android.apps.nexuslauncher"><node resource-id="android:id/aerr_wait"/></node>','com.google.android.apps.nexuslauncher')));
await test(()=>{let actual;const v=fingerprintForBuild(projects=>{actual=projects;return {sourceSha256:'public'};});assert.deepEqual(actual,['android-as','app-rn']);assert.equal(v.sourceSha256,'public');});
await test(()=>assert.throws(()=>welcomeGuard(focus,wrap(login))));
await test(()=>assert.throws(()=>welcomeGuard(focus,wrap(login+login+register))));
await test(()=>assert.throws(()=>welcomeGuard(focus,wrap(login.replace('enabled="true"','enabled="false"')+register))));
await test(()=>assert.throws(()=>welcomeGuard(focus,wrap(login.replace('[1,1][90,50]','[1,1][1,50]')+register))));
await test(()=>assert.throws(()=>welcomeGuard(focus,wrap(login.replace('clickable="true"','clickable="true" visible-to-user="false"')+register))));
await test(()=>assert.throws(()=>welcomeGuard(focus,wrap(login+register+'<node resource-id="com.rowan.iot.dev.refactor:id/startup_retry"/>'))));
await test(()=>assert.throws(()=>welcomeGuard(focus,welcome.replace('package="com.rowan.iot.dev.refactor"','package="other.app"'))));
console.log(`${count} offline state/restoration/admission tests passed; no ADB/Gradle/network/Android execution.`);

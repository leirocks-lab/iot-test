export const sourceProjects=Object.freeze(['android-as','app-rn']);
export const fingerprintForBuild=fingerprint=>fingerprint([...sourceProjects]);
export const collectorRelativePath='docs/tools/android-home-fixtures/collect_results.mjs';
export const configurations=Object.freeze([
 {id:'base',size:'1080x2400',density:'420',fontScale:'1'},
 {id:'small',size:'640x1280',density:'320',fontScale:'1'},
 {id:'large',size:'1440x2560',density:'420',fontScale:'1'},
 {id:'font150',size:'1080x2400',density:'420',fontScale:'1.5'}]);
export class Failure extends Error {constructor(code){super(code);this.code=code;}}
export const fail=code=>{throw new Failure(code);};
export function parseWm(text,label,pattern){
 const lines=text.replaceAll('\r','').split('\n').map(x=>x.trim()).filter(Boolean);
 const physical=lines.filter(x=>new RegExp('^Physical '+label+': '+pattern+'$').test(x));
 const override=lines.filter(x=>new RegExp('^Override '+label+': '+pattern+'$').test(x));
 if(physical.length!==1||override.length>1||lines.length!==physical.length+override.length)fail('ENVIRONMENT_UNRESTORABLE');
 return {physical:physical[0].split(': ')[1],override:override[0]?.split(': ')[1]??null};
}
export function parseEnvironment(size,density,font){
 font=font.trim();if(font!=='null'&&(!/^\d+(?:\.\d+)?$/.test(font)||!Number.isFinite(Number(font))||Number(font)<=0||Number(font)>3))fail('FONT_UNRESTORABLE');
 return {size:parseWm(size,'size','[1-9]\\d*x[1-9]\\d*'),density:parseWm(density,'density','[1-9]\\d*'),fontScale:font};
}
export async function restoreEnvironment(original,command,read){
 const attempts=[];
 for(const [kind,args]of [
  ['size',['shell','wm','size',original.size.override??'reset']],
  ['density',['shell','wm','density',original.density.override??'reset']],
  ['font',original.fontScale==='null'?['shell','settings','delete','system','font_scale']:['shell','settings','put','system','font_scale',original.fontScale]]]){
  try{await command(args);attempts.push({kind,result:'passed'});}catch{attempts.push({kind,result:'failed'});}
 }
 let after=null;try{after=await read();}catch{}
 return {result:attempts.every(x=>x.result==='passed')&&JSON.stringify(after)===JSON.stringify(original)?'passed':'blocked',attempts,after};
}
export async function runMatrix(io){
 const report={fixtureOnly:true,realHttpAcceptance:false,pixelAcceptance:false,configurations:[],restoration:null};
 let original=null,touched=false;
 try{
  await io.preflight();original=await io.readEnvironment();report.original=original;
  for(const configuration of configurations){
   await io.beforeConfiguration(configuration);touched=true;
   await io.configure(configuration);
   const readback=await io.readEnvironment();
   if((readback.size.override??readback.size.physical)!==configuration.size||(readback.density.override??readback.density.physical)!==configuration.density||Number(readback.fontScale)!==Number(configuration.fontScale))fail('CONFIGURATION_READBACK_MISMATCH');
   let result;try{result=await io.instrumentAndCollect(configuration);}catch(error){result={status:'failed',code:error instanceof Failure?error.code:'RUN_UNAVAILABLE'};}
   report.configurations.push({configuration,environment:readback,...result});
   // Every outcome, including collector error, must retire the actual owned process and prove no dialog.
   await io.afterConfiguration(configuration,result);
  }
 }catch(error){report.errorCode=error instanceof Failure?error.code:'MATRIX_UNAVAILABLE';}
 finally{
  if(touched){try{await io.retireOwned();}catch{report.retireCode='OWNED_PROCESS_UNCONFIRMED';}
   report.restoration=await restoreEnvironment(original,args=>io.command(args),()=>io.readEnvironment());}
  else report.restoration={result:'not_changed'};
 }
 report.status=report.errorCode||report.retireCode||report.restoration.result==='blocked'?'blocked':report.configurations.length===4&&report.configurations.every(x=>x.status==='passed')?'passed':report.configurations.some(x=>x.status==='failed')?'failed':'partial';
 return report;
}

export function parseForeground(output){
 // Same public activity service used by verify_email_login_public; window dumps may omit focus on API36.
 const matches=[...output.matchAll(/(?:topResumedActivity|mResumedActivity)[^\r\n]*?ActivityRecord\{[a-f0-9]+\s+u\d+\s+([A-Za-z0-9_.]+)\/([A-Za-z0-9_.$]+)(?:\s|})/g)]
  .map(x=>({packageId:x[1],activity:x[2]}));
 const unique=new Map(matches.map(x=>[x.packageId+'/'+x.activity,x]));
 if(unique.size!==1)fail('FOREGROUND_UNVERIFIABLE');return [...unique.values()][0];
}
export function surfaceGuard(xml,expectedPackage){
 if(/resource-id="[^"]*:id\/aerr_(?:wait|close)"/.test(xml))fail('SYSTEM_ANR_DIALOG');
 const first=xml.match(/<node\b[^>]*>/)?.[0];const packageId=first?.match(/\bpackage="([A-Za-z0-9_.]+)"/)?.[1];
 if(packageId!==expectedPackage)fail('UNKNOWN_DIALOG_OR_APP');
}
export function welcomeGuard(focus,xml){
 const pkg='com.rowan.iot.dev.refactor';surfaceGuard(xml,pkg);
 if(focus.packageId!==pkg||focus.activity!=='com.rowan.iot.features.auth.WelcomeActivity')fail('UNAUTHENTICATED_WELCOME_REQUIRED');
 const nodes=[...xml.matchAll(/<node\b[^>]*>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]])));
 const bounds=n=>n?.bounds?.match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/)?.slice(1).map(Number);
 const visible=b=>b?.length===4&&b[0]>=0&&b[1]>=0&&b[2]>b[0]&&b[3]>b[1];
 const root=bounds(nodes[0]);
 if(!visible(root)||nodes.some(n=>/:id\/(home_|startup_|account_|aerr_)/.test(n['resource-id']??'')))fail('WELCOME_OR_DIALOG_GUARD_FAILED');
 for(const id of ['welcome_login','welcome_register']){
  const found=nodes.filter(n=>n['resource-id']===pkg+':id/'+id);const n=found[0],b=bounds(n);
  if(found.length!==1||n.enabled!=='true'||n.clickable!=='true'||n['visible-to-user']==='false'||!visible(b)||b[0]<root[0]||b[1]<root[1]||b[2]>root[2]||b[3]>root[3])fail('WELCOME_OR_DIALOG_GUARD_FAILED');
 }
}

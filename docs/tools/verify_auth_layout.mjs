// Geometry/empty-state checks and screenshots, not pixel-perfect or full UI acceptance.
// This dedicated AVD's temporary size/density overrides are reset on exit.
import {execFileSync} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {dumpHierarchy} from './android-ui/snapshot.mjs';
const serial='emulator-5554',pkg='com.rowan.iot.dev.refactor';
const directory=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const runId=new Date().toISOString().replaceAll(':','-'),results=[];
const adb=args=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const previousFont=adb(['shell','settings','get','system','font_scale']).trim();
async function screen() {
  const xml=dumpHierarchy(serial,'/sdcard/rowan-layout.xml');
  if(!xml.includes('<hierarchy'))throw new Error('HIERARCHY_UNAVAILABLE');
  if(xml.includes('android:id/aerr_wait')) throw new Error('SYSTEM_DIALOG');
  if(xml.includes(`${pkg}:id/home_title`)) throw new Error('SESSION_PRESENT');
  return xml;
}
try {
  for(const [name,width,height,font] of [['baseline',750,1624,'1.0'],['small',640,1280,'1.0'],['large',860,1864,'1.0'],['font150',750,1624,'1.5']]) {
    adb(['shell','wm','size',`${width}x${height}`]);adb(['shell','wm','density','320']);
    adb(['shell','settings','put','system','font_scale',font]);await wait(750);
    adb(['shell','am','force-stop',pkg]);adb(['shell','am','start','-n',`${pkg}/com.rowan.iot.features.auth.WelcomeActivity`]);
    let xml='',loginRequested=false;
    for(let n=0;n<8;n++) {
      await wait(500);xml=await screen();
      if(!loginRequested&&xml.includes(`${pkg}:id/welcome_login`)) {
        const tag=xml.split('<node').find(item=>item.includes(`resource-id="${pkg}:id/welcome_login"`));
        const bounds=tag.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);
        adb(['shell','input','tap',String(Math.floor((bounds[0]+bounds[2])/2)),String(Math.floor((bounds[1]+bounds[3])/2))]);loginRequested=true;continue;
      }
      const rootBounds=xml.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      if(xml.includes(`${pkg}:id/account_submit`) && Number(rootBounds?.[3])===width && Number(rootBounds?.[4])===height) break;
    }
    const fields=['account_email','account_password','account_consent','account_submit'];
    const observed=fields.map(id=>{
      const tag=xml.split('<node').find(item=>item.includes(`resource-id="${pkg}:id/${id}"`))?.split('>')[0];
      const values=tag?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)?.slice(1).map(Number);
      return {id,withinViewport:Boolean(values&&values[0]>=0&&values[1]>=0&&values[2]<=width&&values[3]<=height&&values[2]>values[0]&&values[3]>values[1]),
        bounds:values??null,disabled:id==='account_submit'?tag?.includes('enabled="false"'):undefined};
    });
    const screenshot=`${runId}-login-layout-${name}.png`;
    await writeFile(new URL(screenshot,directory),execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{timeout:30000}));
    results.push({name,size:`${width}x${height}`,density:320,fontScale:font,observed,screenshot,
      geometryResult:observed.every(field=>field.withinViewport)&&observed.find(field=>field.id==='account_submit').disabled?'通过':'失败',
      visualResult:'未验收：需要人工对照参考及检查字形/换行/触摸'});
  }
}catch(error) {results.push({geometryResult:'阻塞',reason:error.message==='SESSION_PRESENT'?'检测到现有会话，未清理':'系统或页面未就绪'});}
finally {
  for(const args of [['shell','wm','size','reset'],['shell','wm','density','reset'],['shell','settings','put','system','font_scale',/^[0-9.]+$/.test(previousFont)?previousFont:'1.0'],['shell','rm','-f','/sdcard/rowan-layout.xml']]) {
    try {adb(args);}catch{}
  }
  let buildProvenance=null;
  try {buildProvenance=JSON.parse(await readFile(new URL('../../android-as/app/build/outputs/apk/development/release/app-development-release.apk.provenance.json',import.meta.url),'utf8'));}catch{}
  await writeFile(new URL(`android-auth-layout-${runId}.json`,directory),JSON.stringify({runId,serial,packageId:pkg,buildProvenance,
    limits:'仅登录空态几何与截图；未证明键盘、所有触摸、所有页面或iOS视觉通过',results},null,2)+'\n');
}
for(const row of results) console.log(`${row.name??'precondition'}: ${row.geometryResult}`);
if(results.some(row=>row.geometryResult!=='通过'))process.exitCode=1;

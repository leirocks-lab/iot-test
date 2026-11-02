// Continues an explicitly retained validation session. Only optional theme mutation, restored below.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dumpHierarchy} from './android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
import {sourceFingerprint} from './source_fingerprint.mjs';

const directory=new URL('../测试报告/重构实施-20261101/',import.meta.url);
const parentId=process.argv.find(value=>value.startsWith('--parent-run='))?.slice('--parent-run='.length);
if(!parentId||!/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentId))throw new Error('RECORDED_PARENT_REQUIRED');
const parent=JSON.parse(await readFile(new URL(`android-emulator-${parentId}.json`,directory),'utf8'));
if(!parent.sessionKept||!parent.results.some(value=>value.id==='AUTH-04-native-emulator'&&value.result==='通过'))throw new Error('RETAINED_LOGIN_REQUIRED');
const serial='emulator-5554',pkg='com.rowan.iot.dev.refactor';
if(parent.packageId!==pkg)throw new Error('VALIDATION_PACKAGE_REQUIRED');
const runId=new Date().toISOString().replaceAll(':','-'),results=[],screenshots=[];
const sourceAtStart=sourceFingerprint(['android-as','app-rn']);
const scriptSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
const adb=args=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const tags=xml=>[...xml.matchAll(/<node\b[^>]*>/g)].map(value=>value[0]);
const idTag=(xml,id)=>tags(xml).find(value=>value.includes(`resource-id="${pkg}:id/${id}"`));
function point(tag) {
  const b=tag?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)?.slice(1).map(Number);
  if(!b)throw new Error('EXPECTED_TARGET_MISSING');
  return [String(Math.floor((b[0]+b[2])/2)),String(Math.floor((b[1]+b[3])/2))];
}
function tap(tag) {adb(['shell','input','tap',...point(tag)]);}
function screen() {
  const xml=dumpHierarchy(serial,'/sdcard/rowan-preferences-native.xml');
  if(xml.includes('android:id/aerr_wait'))throw new Error('ANR_DIALOG');
  return xml;
}
async function until(predicate) {
  const deadline=Date.now()+30000;
  do {const xml=screen();if(predicate(xml))return xml;await wait(400);}while(Date.now()<deadline);
  throw new Error('EXPECTED_STATE_TIMEOUT');
}
async function scrollTo(id) {
  for(let n=0;n<6;n++) {
    const xml=screen(),tag=idTag(xml,id);
    if(tag)return tag;
    const sizes=adb(['shell','wm','size']).match(/\d+x\d+/g)?.at(-1)?.split('x').map(Number);
    if(!sizes)throw new Error('VIEWPORT_UNAVAILABLE');
    const [w,h]=sizes;adb(['shell','input','swipe',String(Math.floor(w/2)),String(Math.floor(h*.82)),String(Math.floor(w/2)),String(Math.floor(h*.35)),'350']);
    await wait(300);
  }
  throw new Error('SCROLLED_TARGET_MISSING');
}
const pass=(id,note)=>{results.push({id,result:'通过',note});console.log(`${id}: 通过`);};
async function capture(name) {
  const file=`${runId}-preferences-${name}.png`;
  execFileSync('adb',['-s',serial,'shell','screencap','-p','/sdcard/rowan-preferences.png'],{stdio:'ignore',timeout:15000});
  execFileSync('adb',['-s',serial,'pull','/sdcard/rowan-preferences.png',fileURLToPath(new URL(file,directory))],{stdio:'ignore',timeout:15000});
  adb(['shell','rm','-f','/sdcard/rowan-preferences.png']);screenshots.push(file);
}
const optionTags=xml=>tags(xml).filter(value=>value.includes('class="android.widget.CheckedTextView"'));
const text=tag=>tag?.match(/text="([^"]*)"/)?.[1]??'';
const themeNames={system:['跟随系统','跟隨系統','System'],light:['明亮','Light'],dark:['暗黑','深色','Dark']};
const themeCode=tag=>Object.entries(themeNames).find(([,names])=>names.includes(text(tag)))?.[0];
const ready=xml=>idTag(xml,'prefs_reload')?.includes('enabled="true"')&&idTag(xml,'prefs_theme')?.includes('enabled="true"');
async function dismissChoices() {const xml=screen();tap(tags(xml).find(value=>value.includes('resource-id="android:id/button2"')));await until(ready);}
async function readTheme() {
  tap(await scrollTo('prefs_theme'));
  const xml=await until(value=>optionTags(value).length===3),options=optionTags(xml);
  const code=themeCode(options.find(value=>value.includes('checked="true"')));
  if(!options.every(themeCode)||!code) {await dismissChoices();return null;}
  await dismissChoices();return code;
}
async function saveTheme(code) {
  tap(await scrollTo('prefs_theme'));
  const xml=await until(value=>optionTags(value).length===3);
  const selected=optionTags(xml).find(value=>themeCode(value)===code);
  if(!selected)throw new Error('THEME_OPTION_UNAVAILABLE');
  tap(selected);
  await until(value=>ready(value)&&themeNames[code].some(name=>idTag(value,'prefs_theme')?.includes(`，${name}`)));
}
let stage='parent-artifact',relay=null,installedArtifactSha256=null,originalTheme=null,themeAttempted=false,validatedSession=false;
const mutate=process.argv.includes('--exercise-theme');
try {
  const upstream=process.argv.find(value=>value.startsWith('--dns-upstream='))?.slice('--dns-upstream='.length);
  if(upstream)relay=await startLoopbackDnsRelay({upstream});
  const path=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).find(value=>value.endsWith('/base.apk'))?.replace(/^package:/,'');
  if(!path)throw new Error('INSTALLED_ARTIFACT_MISSING');
  installedArtifactSha256=adb(['shell','sha256sum',path]).trim().split(/\s+/)[0];
  if(installedArtifactSha256!==parent.installedArtifactSha256)throw new Error('PARENT_ARTIFACT_CHANGED');
  validatedSession=true;
  await until(value=>idTag(value,'home_title'));
  stage='mine';tap(await scrollTo('home_mine'));
  let xml=await until(value=>idTag(value,'mine_title')&&idTag(value,'mine_preferences'));
  pass('S035-native-mine-defined-entries','仅设置/退出入口，不代表未冻结Mine全部视觉或额外功能');
  tap(idTag(xml,'mine_preferences'));xml=await until(ready);
  pass('USER01-native-preferences-read','实际原生GET及账号缓存提交完成；不是所有异常状态验收');await capture('loaded');
  stage='language-options';tap(await scrollTo('prefs_language'));
  xml=await until(value=>idTag(value,'prefs_language_zh_cn')&&idTag(value,'prefs_language_zh_tw')&&idTag(value,'prefs_language_en'));
  pass('S105-native-three-language-options','只读核对三选项，未切换语言，不证明全应用资源刷新');await capture('language-options');
  tap(idTag(xml,'prefs_back'));await until(ready);
  stage='temperature-options';tap(await scrollTo('prefs_temperature_unit'));
  xml=await until(value=>optionTags(value).length===2);
  if(!['°C','°F'].every(label=>optionTags(xml).some(value=>text(value)===label)))throw new Error('TEMPERATURE_OPTIONS_MISMATCH');
  pass('S110-native-temperature-options','只读选项，不修改偏好或设备目标');await dismissChoices();
  stage='measurement-options';tap(await scrollTo('prefs_measurement_system'));
  xml=await until(value=>optionTags(value).length===2);
  if(!optionTags(xml).every(value=>['公制','Metric','英制','Imperial'].includes(text(value))))throw new Error('MEASUREMENT_OPTIONS_MISMATCH');
  pass('S111-native-measurement-options','只读公制/英制选项，不修改偏好或推断组合矩阵');await dismissChoices();
  stage='theme-contract';originalTheme=await readTheme();
  if(mutate) {
    if(!originalTheme)throw new Error('RESTORABLE_THEME_REQUIRED');
    const target=originalTheme==='dark'?'light':'dark';themeAttempted=true;
    await saveTheme(target);pass('USER02-native-theme-write-readback','单字段真实PATCH→GET→持久化/发布；不证明全App主题已应用');await capture('theme-changed');
    await saveTheme(originalTheme);themeAttempted=false;
    pass('USER02-native-theme-restored','已将本次唯一修改恢复到实际已读取的原始枚举');
  }
  stage='notifications-and-unavailable-selectors';
  if(!idTag(screen(),'prefs_notification'))throw new Error('CLOUD_NOTIFICATION_ROW_MISSING');
  if(!await scrollTo('prefs_system_notifications'))throw new Error('SYSTEM_NOTIFICATION_ROW_MISSING');
  pass('S106-native-cloud-system-notification-separation','仅分开展示和入口存在；未请求/改变系统权限或云偏好');
  for(const id of ['prefs_wallpaper','prefs_home_layout']) {
    if(!((await scrollTo(id)).includes('enabled="false"')))throw new Error('UNDEFINED_SELECTOR_ENABLED');
  }
  pass('S108-S109-no-invented-selector','完整选择器仍阻塞：缺壁纸目录和布局选项；本项仅检查未构造假选项');await capture('appearance-limits');
}catch(error) {
  results.push({id:'preferences-flow',result:'失败',stage,reason:error.message==='ANR_DIALOG'?'无响应弹窗遮挡，需另核归属':'实际页面/服务或恢复前置未满足；未记录层级与原始错误'});
}finally {
  if(themeAttempted&&originalTheme) {
    try {
      stage='restore-after-unknown';tap(await scrollTo('prefs_reload'));await until(ready);
      const current=await readTheme();if(!current)throw new Error('RESTORE_STATE_UNKNOWN');
      if(current!==originalTheme)await saveTheme(originalTheme);
      themeAttempted=false;pass('USER02-native-theme-finally-restored','先重新读取再恢复原值；未重放未知的旧请求');
    }catch {results.push({id:'USER02-native-theme-restore',result:'阻塞',note:'无法确认/恢复本次原始主题，需继续处理，不能报告已恢复'});}
  }
  try {
    if(validatedSession&&!themeAttempted) {
      let xml=screen();
      for(let n=0;n<3&&idTag(xml,'prefs_back');n++) {tap(idTag(xml,'prefs_back'));await wait(300);xml=screen();}
      if(idTag(xml,'mine_back')) {tap(idTag(xml,'mine_back'));await until(value=>idTag(value,'home_title'));}
      tap(await scrollTo('home_logout'));await until(value=>idTag(value,'welcome_login'));
      pass('AUTH06-native-preferences-session-logout','正常退出本轮显式保留的验证会话');
    }
  }catch {results.push({id:'preferences-return-logout',result:'阻塞',note:'返回或退出未确认，未自动清数据/重放操作'});}
  if(relay)await relay.close();
  const report={runId,parentRunId:parentId,execution:'Actual Android preferences UI and native HTTP; not complete scope acceptance',
    ...sourceAtStart,scriptSha256,serial,packageId:pkg,installedArtifactSha256,buildProvenance:parent.buildProvenance,
    dnsForwarding:relay?.snapshot()??null,originalTheme,themeRestorationPending:themeAttempted,themeMutationRequested:mutate,
    screenshots,results,limits:['全App/RN语言与主题尚未完成','壁纸/布局选择器缺权威目录','iOS运行/视觉未验收','没有设备控制、通知授权或其他偏好写入']};
  await writeFile(new URL(`android-preferences-${runId}.json`,directory),JSON.stringify(report,null,2)+'\n');
}
if(results.some(value=>value.result!=='通过'))process.exitCode=1;

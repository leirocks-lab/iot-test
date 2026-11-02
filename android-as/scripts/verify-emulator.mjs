// node --env-file=<private env> android-as/scripts/verify-emulator.mjs [--authenticated]
// Screen hierarchy is held in memory; password and login identifier are never persisted.
import {execFileSync} from 'node:child_process';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {sourceFingerprint} from '../../docs/tools/source_fingerprint.mjs';
import {dumpHierarchy,AndroidUiSnapshotError} from '../../docs/tools/android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from '../../docs/tools/android-network/loopback-dns-relay.mjs';

const serial = process.env.ROWAN_EMULATOR_SERIAL ?? 'emulator-5554';
if (!/^emulator-\d+$/.test(serial)) {throw new Error('This verifier only targets a named emulator');}
const packageId = process.env.ROWAN_VALIDATION_PACKAGE ?? 'com.rowan.iot.dev';
if (!/^com\.rowan\.iot\.dev(?:\.refactor)?$/.test(packageId)) {throw new Error('Unsupported validation application ID');}
const directory = new URL('../../docs/测试报告/重构实施-20261101/', import.meta.url);
await mkdir(directory, {recursive: true});
const adb = args => execFileSync('adb', ['-s', serial, ...args], {encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
const runId = new Date().toISOString().replaceAll(':', '-');
const startedEpochSeconds=Date.now()/1000;
const screenshots = [];
const sourceAtStart = sourceFingerprint(['android-as', 'app-rn']);
const dnsUpstream=process.argv.find(value=>value.startsWith('--dns-upstream='))?.slice('--dns-upstream='.length);
let dnsRelay=null,dnsForwarding=null;
let artifact = null;
try { artifact = JSON.parse(await readFile(new URL('../app/build/outputs/apk/development/release/app-development-release.apk.provenance.json', import.meta.url),'utf8')); } catch { /* Older builds have no sidecar. */ }
let stage = 'boot';
let sessionKept=false;
const uiCaptureRetries=[];
async function screen() {
  let xml;
  for(let attempt=0;attempt<3;attempt++) {
    try {xml=dumpHierarchy(serial,'/sdcard/rowan-refactor-ui.xml');break;}
    catch(error) {
      if(!(error instanceof AndroidUiSnapshotError)||error.code!=='ROOT_NOT_READY'||attempt===2)throw error;
      uiCaptureRetries.push({stage,code:'ROOT_NOT_READY'});await wait(250);
    }
  }
  if(!xml.includes('<hierarchy'))throw new Error('HIERARCHY_UNAVAILABLE');
  if (xml.includes('android:id/aerr_wait')) {throw new Error('SYSTEM_ANR_DIALOG');}
  return xml;
}
function node(xml, id) {
  return resourceNode(xml, `${packageId}:id/${id}`);
}
function resourceNode(xml, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = xml.match(new RegExp(`<node[^>]*resource-id="${escaped}"[^>]*>`))?.[0];
  if (!tag) {throw new Error(`Expected view missing: ${id}`);}
  const bounds = tag.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  return {tag, x: Math.floor((Number(bounds[1]) + Number(bounds[3])) / 2), y: Math.floor((Number(bounds[2]) + Number(bounds[4])) / 2)};
}
function tap(xml, id) {
  const target = node(xml, id);
  adb(['shell', 'input', 'tap', String(target.x), String(target.y)]);
}
function enter(value) {
  if (!/^[\x21-\x7E]+$/.test(value) || value.includes('%s')) {throw new Error('Test input requires a supported printable ASCII value');}
  // adb shell reconstructs a remote shell command: single-quote input, including literal quotes.
  const escaped = "'" + value.replaceAll("'", "'\\''") + "'";
  adb(['shell', 'input', 'text', escaped]);
}
async function capture(name) {
  const data = execFileSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], {timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']});
  await writeFile(new URL(name, directory), data);
  const archived = `${runId}-${name}`;
  await writeFile(new URL(archived, directory), data);
  screenshots.push(archived);
}
async function scrollTo(id, xml) {
  for(let attempt=0;attempt<5;attempt++) {
    try {const target=node(xml,id);if(target.x>0&&target.y>0&&target.tag.includes('enabled="true"'))return xml;}catch{}
    const root=xml.match(/bounds="\[0,0\]\[(\d+),(\d+)\]"/);
    if(!root)throw new Error('VIEWPORT_UNAVAILABLE');
    const width=Number(root[1]),height=Number(root[2]);
    adb(['shell','input','swipe',String(Math.floor(width*.94)),String(Math.floor(height*.8)),String(Math.floor(width*.94)),String(Math.floor(height*.35)),'350']);
    await wait(300);xml=await screen();
  }
  throw new Error('EXPECTED_SCROLL_TARGET_MISSING');
}
async function waitFor(predicate) {
  for(let attempt=0;attempt<12;attempt++) {
    const xml=await screen();if(predicate(xml))return xml;
    await wait(750);
  }
  throw new Error('EXPECTED_FLOW_STATE_MISSING');
}
const has=(xml,id)=>xml.includes(`${packageId}:id/${id}`);
const homeVisible=xml=>['home_title','home_add','home_rooms','home_logout'].some(id=>has(xml,id));
async function stableResource(id) {
  let previous='',count=0;
  for(let attempt=0;attempt<10;attempt++) {
    const xml=await screen();
    try {
      const target=node(xml,id),key=target.tag.match(/bounds="[^"]+"/)?.[0]+'|'+target.tag.match(/text="[^"]*"/)?.[0];
      count=key===previous?count+1:1;previous=key;
      if(count>=2)return xml;
    }catch {previous='';count=0;}
    await wait(500);
  }
  throw new Error('RESOURCE_NOT_STABLE');
}
try {
  if(dnsUpstream) {
    stage='dns-environment';
    dnsRelay=await startLoopbackDnsRelay({upstream:dnsUpstream});
  }
  if (adb(['shell', 'getprop', 'sys.boot_completed']).trim() !== '1') {throw new Error('Emulator boot incomplete');}
  stage = 'launch';
  adb(['shell', 'am', 'force-stop', packageId]);
  adb(['shell', 'am', 'start', '-n', `${packageId}/com.rowan.iot.features.auth.WelcomeActivity`]);
  await wait(1500);
  stage = 'initial-screen';
  let xml = await screen();
  for (let attempt=0; attempt<8 && !xml.includes(`${packageId}:id/account_submit`) && !xml.includes(`${packageId}:id/home_title`) && !xml.includes(`${packageId}:id/welcome_login`); attempt++) {
    await wait(750); xml = await screen();
  }
  if(xml.includes(`${packageId}:id/welcome_login`)) {
    results.push({id:'STARTUP-no-session-native-entry',result:'通过'});
    tap(xml,'welcome_login');
    for(let attempt=0;attempt<8;attempt++) {await wait(500);xml=await screen();if(xml.includes(`${packageId}:id/account_submit`))break;}
  }
  // Never clear an existing session automatically. A dedicated logged-out test state is required.
  if (xml.includes(`${packageId}:id/home_title`)) {throw new Error('Existing session: log out explicitly before running login acceptance');}
  const submit = node(xml, 'account_submit');
  results.push({id: 'AUTH-UI-empty', result: submit.tag.includes('enabled="false"') ? '通过' : '失败'});
  await capture('android-login-initial.png');
  if (process.argv.includes('--authenticated')) {
    const email = process.env.ROWAN_LOGIN_ACCOUNT;
    const pin = process.env.ROWAN_LOGIN_PIN;
    if (!email || !pin) {throw new Error('Private test credentials not configured');}
    stage = 'input';
    tap(xml, 'account_email'); enter(email);
    tap(xml, 'account_password'); enter(pin);
    adb(['shell', 'input', 'keyevent', '111']);
    xml = await screen();
    results.push({id: 'AUTH-UI-consent-gate', result: node(xml, 'account_submit').tag.includes('enabled="false"') ? '通过' : '失败'});
    // Click the checkbox glyph. The text contains separate, working agreement links.
    const consent = node(xml, 'account_consent');
    const consentLeft = Number(consent.tag.match(/bounds="\[(\d+),/)?.[1]);
    adb(['shell', 'input', 'tap', String(consentLeft + 12), String(consent.y)]);
    xml = await screen();
    if (!node(xml, 'account_submit').tag.includes('enabled="true"')) {
      results.push({id: 'AUTH-UI-valid-input', result: '失败'});
      throw new Error('SUBMIT_DISABLED');
    }
    stage = 'login-request';
    tap(xml, 'account_submit');
    let loggedIn = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      await wait(1000);
      xml = await screen();
      if (xml.includes(`${packageId}:id/home_title`)) {loggedIn = true; break;}
      const status = node(xml, 'account_status').tag.match(/text="([^"]*)"/)?.[1] ?? '';
      if (status && status !== '正在登录…') {break;}
    }
    results.push({id: 'AUTH-04-native-emulator', result: loggedIn ? '通过' : '失败'});
    if (loggedIn) {
      await capture('android-home-after-login.png');
      stage = 'cold-session-restore';
      adb(['shell', 'am', 'force-stop', packageId]);
      adb(['shell', 'am', 'start', '-n', `${packageId}/com.rowan.iot.features.auth.WelcomeActivity`]);
      let restored = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        await wait(1000); xml = await screen();
        if (xml.includes(`${packageId}:id/home_title`)) {restored = true; break;}
      }
      results.push({id: 'AUTH-03-05-cold-restore-native', result: restored ? '通过' : '失败'});
      if (!restored) {throw new Error('RESTORE_FAILED');}
      if (xml.includes(`${packageId}:id/home_device_open`)) {
        stage = 'rn-bootstrap';
        xml=await stableResource('home_device_open');
        tap(xml, 'home_device_open');
        let bootstrapped = false;
        for (let attempt = 0; attempt < 8; attempt++) {
          await wait(1000); xml = await screen();
          if (xml.includes('resource-id="rn-device-status"')) {bootstrapped = true; break;}
        }
        results.push({id: 'RN-release-bundle-host-context', result: bootstrapped ? '通过' : '失败',
          note: '验证内置包及只读状态页面渲染；真实 MQTT 快照及设备控制须另有证据'});
        if (!bootstrapped) {throw new Error('RN_BOOTSTRAP_FAILED');}
        await capture('android-rn-bootstrap.png');
        if(process.argv.includes('--native-mqtt-readonly')) {
          stage='native-mqtt-readonly';
          const liveCopy=['设备在线','设备离线','设备在线状态未知'];
          let snapshot=false;
          const snapshotDeadline=Date.now()+45_000;
          for(let attempt=0;attempt<35&&Date.now()<snapshotDeadline;attempt++) {
            xml=await screen();
            const status=xml.match(/<node[^>]*resource-id="rn-device-status"[^>]*>/)?.[0];
            if(status&&liveCopy.some(text=>status.includes(`text="${text}"`))) {snapshot=true;break;}
            if(status&&status.includes('text="设备状态暂不可用，请重试"'))break;
            await wait(1000);
          }
          results.push({id:'MQTT-native-authorized-cloud-snapshot',result:snapshot?'通过':'失败',
            note:'仅认证原生只读云端快照与RN摘要；无desired命令，不证明设备执行或硬件在线'});
          await capture('android-rn-native-readonly.png');
          if(!snapshot)throw new Error('NATIVE_SNAPSHOT_UNAVAILABLE');
        }
        if(process.argv.includes('--device-features-readonly')) {
          for(const feature of ['schedules','firmware']) {
            stage=`rn-${feature}-readonly`;
            const entry=resourceNode(xml,`rn-open-${feature}`);
            adb(['shell','input','tap',String(entry.x),String(entry.y)]);
            const inspect=async(kind=null)=> {
              const deadline=Date.now()+25000;
              let outcome='timeout';
              do {
                xml=await screen();
                if(xml.includes(`resource-id="rn-${feature}-error"`)&&
                  (feature!=='firmware'||xml.includes(`resource-id="rn-firmware-error-${kind}"`))) {outcome='error';break;}
                if(xml.includes(`resource-id="rn-${feature}-loaded"`)&&
                  (feature!=='firmware'||xml.includes(`resource-id="rn-firmware-result-${kind}"`))) {outcome='loaded';break;}
                if(feature==='schedules'&&xml.includes('resource-id="rn-schedules-empty"')) {outcome='empty';break;}
                await wait(500);
              }while(Date.now()<deadline);
              results.push({id:`${feature==='schedules'?'TIMER-01':'OTA-read'}-native-rn${kind?`-${kind}`:''}`,
                result:outcome==='loaded'||outcome==='empty'?'通过':'阻塞',state:outcome,
                note:'真实原生HTTP与RN只读摘要；无定时/升级写操作，不代表完整视觉或硬件验收'});
              // A list may contain user-entered names; screenshots are limited to the firmware summary.
              if(feature==='firmware')await capture(`android-rn-firmware-${kind??'mcu'}-${outcome}.png`);
            };
            await inspect(feature==='firmware'?'mcu':null);
            if(feature==='firmware') {
              const wifi=resourceNode(xml,'rn-firmware-wifi');
              adb(['shell','input','tap',String(wifi.x),String(wifi.y)]);
              await inspect('wifi');
            }
            const back=resourceNode(xml,'rn-feature-back');
            adb(['shell','input','tap',String(back.x),String(back.y)]);
            xml=await waitFor(value=>value.includes('resource-id="rn-device-status"'));
            results.push({id:`RN-${feature}-return-stack`,result:'通过'});
          }
        }
        if(process.argv.includes('--device-more-readonly')) {
          stage='rn-more-readonly';
          const open=resourceNode(xml,'rn-open-more');
          adb(['shell','input','tap',String(open.x),String(open.y)]);
          xml=await waitFor(value=>value.includes('resource-id="rn-more-loaded"')||value.includes('resource-id="rn-more-error"'));
          const moreLoaded=xml.includes('resource-id="rn-more-loaded"');
          results.push({id:'MORE-native-rn-summary',result:moreLoaded?'通过':'阻塞',
            note:'真实原生设备元数据摘要，只读；无昵称保存、分享生成或关系修改'});
          if(moreLoaded) {
            for(const feature of ['members','location','help']) {
              stage=`rn-more-${feature}-readonly`;
              const entry=resourceNode(xml,`rn-more-open-${feature}`);
              adb(['shell','input','tap',String(entry.x),String(entry.y)]);
              xml=await waitFor(value=>['loaded','empty','error'].some(state=>value.includes(`resource-id="rn-${feature}-${state}"`)));
              const error=xml.includes(`resource-id="rn-${feature}-error"`);
              const state=error?'error':xml.includes(`resource-id="rn-${feature}-empty"`)?'empty':
                feature==='location'?['assigned','unassigned','unknown'].find(value=>xml.includes(`resource-id="rn-location-${value}"`))??'unknown':'loaded';
              results.push({id:`MORE-native-rn-${feature}`,result:error?'阻塞':'通过',state,
                note:feature==='location'&&state==='unknown'?'真实响应未能确认归属，仅验证未知态，不等同已分配或未分配':'仅实际只读呈现及返回，不含修改、成员移除或自解绑'});
              if((feature==='help'&&state==='empty')||(feature==='location'&&state==='unknown'))
                await capture(`android-rn-more-${feature}-${state}.png`);
              const back=resourceNode(xml,'rn-feature-back');
              adb(['shell','input','tap',String(back.x),String(back.y)]);
              xml=await waitFor(value=>value.includes('resource-id="rn-more-loaded"')||value.includes('resource-id="rn-more-error"'));
              results.push({id:`RN-more-${feature}-return`,result:'通过'});
            }
          }
          const back=resourceNode(xml,'rn-feature-back');
          adb(['shell','input','tap',String(back.x),String(back.y)]);
          xml=await waitFor(value=>value.includes('resource-id="rn-device-status"'));
          results.push({id:'RN-more-return-device',result:'通过'});
        }
        const close = resourceNode(xml, 'rn-device-close');
        adb(['shell', 'input', 'tap', String(close.x), String(close.y)]);
        await wait(1000); xml = await screen();
        results.push({id: 'RN-host-close-navigation', result: xml.includes(`${packageId}:id/home_title`) ? '通过' : '失败'});
      } else {
        results.push({id: 'RN-release-bundle-host-context', result: '未验收', reason: '当前账号未返回可打开的设备；不伪造设备入口'});
      }
      if(process.argv.includes('--catalog-and-rooms')) {
        stage='rooms-read-only';
        xml=await scrollTo('home_rooms',xml);tap(xml,'home_rooms');
        xml=await waitFor(value=>has(value,'rooms_add')&&node(value,'rooms_add').tag.includes('enabled="true"'));
        results.push({id:'ROOM-03-native-read-navigation',result:'通过',note:'只读加载与返回；默认标记、编辑/删除/移动及完整UI尚未验收'});
        await capture('android-rooms-read-only.png');tap(xml,'rooms_back');xml=await waitFor(homeVisible);
        stage='catalog-read-only';
        xml=await scrollTo('home_add',xml);tap(xml,'home_add');
        xml=await waitFor(value=>has(value,'add_manual')&&has(value,'add_scan'));
        results.push({id:'ADD-native-entry-sheet',result:'通过',note:'真实原生扫一扫/手动入口；不代表BLE发现或完整视觉通过'});
        tap(xml,'add_manual');
        xml=await waitFor(value=>has(value,'products_card')||value.includes('暂无可添加产品'));
        results.push({id:'PAIR-01-03-native-catalog',result:'通过',note:'真实服务目录加载；尚未覆盖品类切换、推荐顺序及完整视觉'});
        await capture('android-products-read-only.png');
        const detail=xml.match(new RegExp(`<node[^>]*resource-id="${packageId}:id/products_open_details"[^>]*>`))?.[0];
        if(detail) {
          const bounds=detail.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)?.slice(1).map(Number);
          if(!bounds)throw new Error('DETAIL_BUTTON_BOUNDS_MISSING');
          adb(['shell','input','tap',String(Math.floor((bounds[0]+bounds[2])/2)),String(Math.floor((bounds[1]+bounds[3])/2))]);
          stage='product-details-read-only';
          xml=await waitFor(value=>has(value,'product_details_content')&&!has(value,'product_details_status'));
          results.push({id:'PAIR-02-native-product-detail',result:'通过',note:'真实目录ID查询并显示文本；没有点击Shop/图片、配网或绑定'});
          await capture('android-product-detail-read-only.png');tap(xml,'products_back');xml=await waitFor(value=>has(value,'products_title'));
        } else results.push({id:'PAIR-02-native-product-detail',result:'未验收',note:'本次未显示产品详情入口，不猜产品标识'});
        tap(xml,'products_back');xml=await waitFor(homeVisible);
        results.push({id:'catalog-rooms-native-return-stack',result:'通过'});
      }
      if(process.argv.includes('--keep-session')) {
        stage='retain-validated-session';
        xml=await screen();
        if(!homeVisible(xml))throw new Error('RETAINED_HOME_REQUIRED');
        sessionKept=true;
      } else {
        stage = 'logout';
        xml=await scrollTo('home_logout',xml);
        tap(xml, 'home_logout');
        await wait(1000);
        xml = await screen();
        const loggedOut=xml.includes(`${packageId}:id/welcome_login`);
        results.push({id: 'AUTH-06-native-emulator', result: loggedOut ? '通过' : '失败'});
        if(loggedOut) {tap(xml,'welcome_login');await wait(500);}
      }
    }
  }
} catch (error) {
  results.push({id: 'emulator-prerequisite-or-flow', result: '阻塞', stage,
    captureFailure:error instanceof AndroidUiSnapshotError?{code:error.code,stage:error.stage}:null,
    reason: error.message === 'SYSTEM_ANR_DIALOG' ? '出现无响应弹窗遮挡；按实际归属排查，不能计为通过' :
      error.message === 'NATIVE_SNAPSHOT_UNAVAILABLE' ? '实际原生连接未取得有效请求快照；保留失败，不替换为Node或测试替身成功' :
      '启动、安装、页面状态或测试配置未满足；未记录凭据或层级正文'});
} finally {
  if(dnsRelay) {
    await dnsRelay.close();
    dnsForwarding={...dnsRelay.snapshot(),mode:'Real upstream DNS packet forwarding; no business mock or TLS bypass',
      moduleSha256:createHash('sha256').update(await readFile(new URL('../../docs/tools/android-network/loopback-dns-relay.mjs',import.meta.url))).digest('hex')};
  }
  try {adb(['shell', 'rm', '-f', '/sdcard/rowan-refactor-ui.xml']);} catch { /* Report remains usable if emulator disconnected. */ }
  const metadata = args => {try {return adb(args).trim();} catch {return 'unavailable';}};
  let installedArtifactSha256 = null;
  try {
    const installed = adb(['shell','pm','path',packageId]).trim().split(/\r?\n/).find(line => line.endsWith('/base.apk'))?.replace(/^package:/,'');
    if (installed) installedArtifactSha256 = adb(['shell','sha256sum',installed]).trim().split(/\s+/)[0];
  } catch { /* Still preserve failure evidence if installation is absent. */ }
  let nativeDiagnostics=[];
  try {
    nativeDiagnostics=adb(['logcat','-d','-v','epoch','-s','RowanStartup:I','RowanDeviceRead:I','RowanMqtt:I','*:S'])
      .split(/\r?\n/).filter(line=>Number(line.trim().split(/\s+/)[0])>=startedEpochSeconds-1)
      .map(line=>line.match(/(?:RowanStartup|RowanDeviceRead|RowanMqtt)\s*:\s*(.*)$/)?.[1])
      .filter(value=>value&&/^(?:[a-z_]+ (?:begin t=\d+ main=(?:true|false)|end t=\d+ durationMs=\d+)|phase=(?:authorizing|connecting|reading|live|recovering|failed|closed) snapshot=(?:true|false) epoch=\d+ delivery=\d+|kind=(?:UNAVAILABLE|TIMEOUT|AUTHORIZATION|SUBSCRIPTION_DENIED|CONFIGURATION|EXPIRED_CREDENTIALS|STALE_CONTEXT|DUPLICATE_OBSERVER|CLOSED|UNKNOWN_RESULT) reasonCode=-?\d+ cause=(?:DNS|CONNECT|TLS|TIMEOUT|WEBSOCKET|IO|OTHER))$/.test(value));
  }catch { /* Only allowlisted non-sensitive diagnostic fields are retained. */ }
  const report = {date: new Date().toISOString(), runId, ...sourceAtStart, serial, packageId,nativeDiagnostics,dnsForwarding,sessionKept,uiCaptureRetries,
    verificationScriptSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
    deferredCases:sessionKept?['AUTH-06-native-emulator; continued acceptance must explicitly log out']:[],
    installedArtifactSha256,buildProvenance:artifact,installedArtifactMatchesBuild:artifact ? artifact.artifactSha256===installedArtifactSha256 : null,
    viewport: metadata(['shell', 'wm', 'size']), density: metadata(['shell', 'wm', 'density']),
    fontScale: metadata(['shell', 'settings', 'get', 'system', 'font_scale']), screenshots,
    scope: 'Android native startup/login/cold restore/logout and packaged RN navigation; not complete UI/HTTP/MQTT acceptance', results, hardware: '未验收'};
  await writeFile(new URL('android-emulator.json', directory), JSON.stringify(report, null, 2) + '\n');
  await writeFile(new URL(`android-emulator-${runId}.json`, directory), JSON.stringify(report, null, 2) + '\n');
}
for (const result of results) {console.log(`${result.id}: ${result.result}`);}
if (results.some(result => result.result !== '通过')) {process.exitCode = 1;}

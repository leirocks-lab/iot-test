// S016 public UI only. --self-test never invokes adb/git, reads an APK, or creates a report.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sourceFingerprint} from './source_fingerprint.mjs';
import {dumpHierarchy} from './android-ui/snapshot.mjs';
import {resumeOwnTask} from './android-ui/owned-task-resume.mjs';

const serial = 'emulator-5554', pkg = 'com.rowan.iot.dev.refactor';
const adbPath = 'D:/Android/Sdk/platform-tools/adb.exe';
const welcomeActivity = 'com.rowan.iot.features.auth.WelcomeActivity';
const accountActivity = 'com.rowan.iot.features.auth.AccountActivity';
const artifact = new URL('../../android-as/app/build/outputs/apk/development/release/app-development-release.apk', import.meta.url);
const reports = new URL('../测试报告/重构实施-20261101/', import.meta.url);
const editable = new Set(['account_email', 'account_password', 'account_code']);
const clickable = new Set(['welcome_login', 'account_mode', 'account_consent']);
const publicInputs = new Set(['rowan-public@example.invalid', 'other-public@example.invalid', 'invalid-email', 'PublicOnly123', '12345', '123456', '1234567', '12a456']);
class Failure extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new Failure(code); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
export function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*>/g)].map(match => {
    const value = Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], decode(x[2])]));
    return {...value, bounds: value.bounds?.match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/)?.slice(1).map(Number)};
  });
}
const visible = n => n?.bounds?.length === 4 && n.bounds.every(Number.isFinite) && n.bounds[0] >= 0 && n.bounds[1] >= 0 && n.bounds[2] > n.bounds[0] && n.bounds[3] > n.bounds[1];
export function view(xml, id) {
  const matches = nodes(xml).filter(n => n['resource-id'] === `${pkg}:id/${id}`);
  return matches.length === 1 && visible(matches[0]) ? matches[0] : null;
}
export function welcomeShape(xml) {
  return ['welcome_login', 'welcome_register'].every(id => view(xml, id)?.enabled === 'true') &&
    !nodes(xml).some(n => /:id\/(home_|startup_|account_)/.test(n['resource-id'] ?? ''));
}
export function modeShape(xml, mode) {
  return !!view(xml, 'account_email') && !!view(xml, 'account_submit') && !!view(xml, 'account_consent') &&
    !!view(xml, 'account_mode') &&
    (mode === 'password' ? !!view(xml, 'account_password') && !view(xml, 'account_code') && !view(xml, 'account_send_code') :
      !!view(xml, 'account_code') && !!view(xml, 'account_send_code') && !view(xml, 'account_password'));
}
export function clickAllowed(id, n) {
  if (!clickable.has(id) || n?.enabled !== 'true') return false;
  return id === 'account_consent' ? n.class === 'android.widget.CheckBox' && n.checkable === 'true' : n.clickable === 'true';
}
export function accountBack(xml) {
  const email = view(xml, 'account_email');
  if (!email) return null;
  // The privacy exporter redacts sibling descriptions. Stable form geometry distinguishes
  // the one native back control above email from the password eye within the input row.
  const candidates = nodes(xml).filter(n => n.class === 'android.widget.ImageButton' && n.enabled === 'true' &&
    visible(n) && n.bounds[3] <= email.bounds[1]);
  return candidates.length === 1 ? candidates[0] : null;
}
export function provenanceMatches(value, source, artifactSha) {
  return hash(artifactSha) && value?.artifactSha256 === artifactSha && value.sourceUnchangedDuringBuild === true &&
    value.architecture === 'x86_64' && hash(source?.sourceSha256) &&
    value.sourceBefore?.sourceSha256 === source.sourceSha256 && value.sourceAfter?.sourceSha256 === source.sourceSha256;
}
function resumedComponent(output) {
  const matches = [...output.matchAll(/(?:topResumedActivity|mResumedActivity)[^\r\n]*?\s(com\.rowan\.iot\.dev\.refactor\/[A-Za-z0-9_.$]+)(?:\s|})/g)].map(x => x[1]);
  return matches.length > 0 && new Set(matches).size === 1 ? matches[0] : null;
}
function resumedIdentity(output) {
  const matches = [...output.matchAll(/(?:topResumedActivity|mResumedActivity)[^\r\n]*?ActivityRecord\{([a-f0-9]+)\s+u\d+\s+(com\.rowan\.iot\.dev\.refactor\/[A-Za-z0-9_.$]+)(?:\s|})/g)].map(x => `${x[1]}:${x[2]}`);
  return matches.length > 0 && new Set(matches).size === 1 ? matches[0] : null;
}
function withinViewport(xml, n) {
  const root=nodes(xml)[0];
  return visible(n)&&visible(root)&&n.bounds[0]>=root.bounds[0]&&n.bounds[1]>=root.bounds[1]&&n.bounds[2]<=root.bounds[2]&&n.bounds[3]<=root.bounds[3];
}

export async function selfTest() {
  const n = (id, extra = '') => `<node resource-id="${pkg}:id/${id}" package="${pkg}" bounds="[2,3][100,50]" enabled="true" ${extra}/>`;
  assert(welcomeShape(n('welcome_login') + n('welcome_register')));
  assert(!welcomeShape(n('welcome_login') + n('welcome_register') + n('startup_retry')));
  assert(!welcomeShape(n('welcome_login') + n('welcome_login') + n('welcome_register')));
  assert(!view(n('account_code').replace('[2,3][100,50]', '[2,3][2,50]'), 'account_code'));
  assert(!view(n('account_code').replace('[2,3][100,50]', '[-2,3][100,50]'), 'account_code'));
  const common = n('account_email') + n('account_submit') + n('account_consent');
  assert(modeShape(common + n('account_mode', 'text="使用验证码登录"') + n('account_password'), 'password'));
  const captcha = common + n('account_mode', 'text="使用密码登录"') + n('account_code') + n('account_send_code');
  assert(modeShape(captcha, 'captcha')); assert(!modeShape(captcha + n('account_password'), 'captcha'));
  assert(modeShape(captcha.replace('text="使用密码登录"','text="[redacted]"'), 'captcha'));
  const email = `<node resource-id="${pkg}:id/account_email" bounds="[20,200][400,260]" enabled="true"/>`;
  const back = '<node class="android.widget.ImageButton" content-desc="[redacted]" bounds="[20,40][80,100]" enabled="true"/>';
  const eye = '<node class="android.widget.ImageButton" bounds="[340,300][400,360]" enabled="true"/>';
  assert(accountBack(email+back+eye)); assert(!accountBack(email+back+back+eye)); assert(!accountBack(email+eye));
  assert.equal(nodes(n('x', 'text="&lt;x&amp;y&gt;"'))[0].text, '<x&y>');
  const h = 'a'.repeat(64), s = {sourceSha256: h};
  const p = {artifactSha256: h, architecture: 'x86_64', sourceUnchangedDuringBuild: true, sourceBefore: s, sourceAfter: s};
  assert(provenanceMatches(p, s, h));
  assert(!provenanceMatches({...p, sourceUnchangedDuringBuild: false}, s, h));
  assert(!provenanceMatches({...p, sourceAfter: {sourceSha256: 'b'.repeat(64)}}, s, h));
  assert(!provenanceMatches(p, s, 'b'.repeat(64)));
  assert.equal(resumedComponent(`topResumedActivity=ActivityRecord{a u0 ${pkg}/${accountActivity} t1}`), `${pkg}/${accountActivity}`);
  assert.equal(resumedComponent('topResumedActivity=ActivityRecord{a u0 another.app/.Main t1}'), null);
  assert.equal(resumedIdentity(`topResumedActivity=ActivityRecord{abc123 u0 ${pkg}/${accountActivity} t1}`), `abc123:${pkg}/${accountActivity}`);
  assert(!clickable.has('account_submit')); assert(!clickable.has('account_send_code'));
  assert(clickAllowed('account_consent',{enabled:'true',class:'android.widget.CheckBox',checkable:'true',clickable:'false'}));
  assert(!clickAllowed('account_consent',{enabled:'false',class:'android.widget.CheckBox',checkable:'true'}));
  assert(!clickAllowed('account_mode',{enabled:'true',clickable:'false'}));
  assert(!clickAllowed('account_submit',{enabled:'true',clickable:'true'}));
  console.log(JSON.stringify({result: 'PASS', scope: 'offline parser/provenance/target-policy fixtures only; zero ADB, APK reads, git, reports or network'}));
}

async function run(visualOnly=false) {
  const runId = new Date().toISOString().replaceAll(':', '-');
  const results = [], screenshots = [];
  let stage = 'artifact-preflight', sourceBefore = null, sourceAfter = null, installed = null, sidecarSha256 = null;
  let owned = false, interrupted = false, cleanup = 'not-needed', backgroundOwned = false;
  const stop = () => { interrupted = true; };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const adb = args => { try { return execFileSync(adbPath, ['-s', serial, ...args], {encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']}); } catch { fail('ADB_COMMAND_FAILED'); } };
  const current = activity => resumedComponent(adb(['shell', 'dumpsys', 'activity', 'activities'])) === `${pkg}/${activity}`;
  const guard = activity => { if (!current(activity)) fail('EXPECTED_NATIVE_FOREGROUND_REQUIRED'); };
  const screen = () => {
    if (interrupted) fail('INTERRUPTED');
    let xml; try { xml = dumpHierarchy(serial, '/sdcard/rowan-email-login-public.xml'); } catch { fail('SNAPSHOT_UNAVAILABLE'); }
    if (nodes(xml).some(n => /:id\/aerr_(wait|close)$/.test(n['resource-id'] ?? ''))) fail('SYSTEM_ANR_DIALOG');
    if (nodes(xml)[0]?.package !== pkg) fail('APP_ROOT_REQUIRED');
    return xml;
  };
  async function until(predicate) {
    for (let i = 0; i < 16; i++) { const xml = screen(); if (predicate(xml)) return xml; await wait(250); }
    fail('EXPECTED_PUBLIC_STATE_MISSING');
  }
  function record(id, pass) { results.push({id, result: pass ? '通过' : '失败'}); if (!pass) fail('PUBLIC_GATE_MISMATCH'); }
  async function stable(select, activity = accountActivity) {
    let last, count = 0;
    for (let i = 0; i < 20; i++) {
      guard(activity); const xml = screen(), target = select(xml), key = withinViewport(xml,target) ? target.bounds.join(',') : null;
      count = key && key === last ? count + 1 : key ? 1 : 0; last = key;
      if (count >= 3) return target;
      // Scroll only blank right gutter; never near form buttons or checkbox text.
      if (!key && i % 4 === 3) {
        const scroll = nodes(xml).find(n => n.class === 'android.widget.ScrollView' && visible(n));
        if (scroll) { const [l,t,r,b] = scroll.bounds, x = Math.floor(r - Math.min(8, (r-l)/20));
          const down=target?.bounds?.[1]<t||(!target&&i>=11);
          adb(['shell','input','swipe',`${x}`,`${Math.floor(t+(b-t)*(down ? .3 : .8))}`,`${x}`,`${Math.floor(t+(b-t)*(down ? .8 : .3))}`,'250']); }
      }
      await wait(200);
    }
    fail('TARGET_NOT_STABLE');
  }
  async function hideKeyboard() {
    guard(accountActivity);
    if (/\bmInputShown=true\b/.test(adb(['shell', 'dumpsys', 'input_method']))) {
      adb(['shell','input','keyevent','4']); await wait(250); guard(accountActivity);
    }
  }
  async function click(id) {
    if (!clickable.has(id)) fail('FORBIDDEN_ACTION');
    await hideKeyboardIfAccount(id);
    const n = await stable(xml => view(xml,id), id === 'welcome_login' ? welcomeActivity : accountActivity);
    if (!clickAllowed(id,n)) fail('CLICK_TARGET_DISABLED');
    const [l,t,r,b] = n.bounds;
    // Checkable indicator, not the clickable agreement spans.
    const x = id === 'account_consent' ? l + Math.min(12*density, (r-l)*.08) : (l+r)/2;
    adb(['shell','input','tap',`${Math.floor(x)}`,`${Math.floor((t+b)/2)}`]); await wait(200);
    if(id === 'account_consent') await until(xml => view(xml,id)?.checked !== n.checked);
  }
  async function hideKeyboardIfAccount(id) { if (id !== 'welcome_login') await hideKeyboard(); }
  async function fill(id, text) {
    if (!editable.has(id) || !publicInputs.has(text)) fail('NON_PUBLIC_INPUT_FORBIDDEN');
    const n = await stable(xml => view(xml,id)); if (n.enabled !== 'true') fail('INPUT_DISABLED');
    const [l,t,r,b] = n.bounds; adb(['shell','input','tap',`${Math.floor((l+r)/2)}`,`${Math.floor((t+b)/2)}`]);
    await until(xml => view(xml,id)?.focused === 'true'); guard(accountActivity);
    adb(['shell','input','keyevent','123', ...Array(80).fill('67')]);
    adb(['shell','input','text',text]); await hideKeyboard();
  }
  async function gates(id, submit, send = null) {
    const xml = await until(value => view(value,'account_submit') && (send === null || view(value,'account_send_code')));
    record(id, view(xml,'account_submit').enabled === String(submit) && (send === null || view(xml,'account_send_code').enabled === String(send)));
  }
  async function backgroundReturn(mode) {
    guard(accountActivity);const before=resumedIdentity(adb(['shell','dumpsys','activity','activities']));if(!before)fail('ACTIVITY_IDENTITY_UNKNOWN');
    adb(['shell','input','keyevent','3']);backgroundOwned=true;await wait(500);
    if(current(accountActivity))fail('BACKGROUND_TRANSITION_UNCONFIRMED');
    await resumeOwnTask({adb,rawScreen:()=>dumpHierarchy(serial,'/sdcard/rowan-email-login-recents.xml'),isExpectedForeground:()=>resumedIdentity(adb(['shell','dumpsys','activity','activities']))===before});backgroundOwned=false;
    await until(xml=>modeShape(xml,mode));guard(accountActivity);
    if(resumedIdentity(adb(['shell','dumpsys','activity','activities']))!==before)fail('RESUMED_EXISTING_INSTANCE_UNCONFIRMED');
  }
  async function backWelcome() {
    if (current(welcomeActivity)) { if (!welcomeShape(screen())) fail('WELCOME_NOT_CONFIRMED'); return; }
    guard(accountActivity); await hideKeyboard();
    // Exact native Account foreground and unique upper form control are required; descriptions are redacted.
    const select = accountBack;
    // Return to the top using the empty right gutter before selecting Back.
    for (let i=0;i<5&&!select(screen());i++) {
      const scroll=nodes(screen()).find(n=>n.class==='android.widget.ScrollView'&&visible(n)); if(!scroll)fail('SCROLL_REQUIRED');
      const [l,t,r,b]=scroll.bounds,x=Math.floor(r-Math.min(8,(r-l)/20));adb(['shell','input','swipe',`${x}`,`${Math.floor(t+(b-t)*.25)}`,`${x}`,`${Math.floor(t+(b-t)*.8)}`,'250']);await wait(150);
    }
    const n=await stable(select); const [l,t,r,b]=n.bounds;adb(['shell','input','tap',`${Math.floor((l+r)/2)}`,`${Math.floor((t+b)/2)}`]);
    await until(welcomeShape); guard(welcomeActivity);
  }
  async function captureWelcome(label) {
    guard(welcomeActivity); if (!welcomeShape(screen())) fail('SAFE_CAPTURE_REQUIRED');
    let png;try { png=execFileSync(adbPath,['-s',serial,'exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}); } catch {fail('CAPTURE_FAILED');}
    guard(welcomeActivity);if(!welcomeShape(screen())||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('SAFE_CAPTURE_UNCONFIRMED');
    const name=`${runId}-email-login-${label}.png`;await writeFile(new URL(name,reports),png);screenshots.push(name);
  }
  async function capturePublicForm(label,mode) {
    // Called only after this tool entered its fixed public dummy email/password; no private env input.
    guard(accountActivity);if(!modeShape(screen(),mode))fail('PUBLIC_FORM_CAPTURE_REQUIRED');
    let png;try {png=execFileSync(adbPath,['-s',serial,'exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}catch{fail('CAPTURE_FAILED');}
    guard(accountActivity);if(!modeShape(screen(),mode)||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('PUBLIC_FORM_CAPTURE_UNCONFIRMED');
    const name=`${runId}-email-login-${label}.png`;await writeFile(new URL(name,reports),png);screenshots.push(name);
  }
  const installedSha = () => {
    const paths=adb(['shell','pm','path',pkg]).trim().split(/\r?\n/).map(x=>x.replace(/^package:/,''));
    const base=paths.filter(x=>/^\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(x)); if(base.length!==1)fail('INSTALLED_APK_PATH_INVALID');
    const value=adb(['shell','sha256sum',base[0]]).trim().split(/\s/)[0];if(!hash(value))fail('INSTALLED_APK_HASH_INVALID');return value;
  };
  let density=1;
  try {
    sourceBefore=sourceFingerprint(['android-as','app-rn']);
    const bytes=await readFile(artifact), raw=await readFile(new URL(artifact.href+'.provenance.json'));
    const artifactSha=sha(bytes), sidecar=JSON.parse(raw);sidecarSha256=sha(raw);
    if(!provenanceMatches(sidecar,sourceBefore,artifactSha))fail('BUILD_SOURCE_PROVENANCE_MISMATCH');
    installed=installedSha();if(installed!==artifactSha)fail('INSTALLED_APK_MISMATCH');
    const avd=adb(['emu','avd','name']).split(/\r?\n/).map(x=>x.trim()).find(x=>x&&x!=='OK');
    if(!['ROWAN_API36','ROWAN_API_36'].includes(avd)||adb(['shell','getprop','sys.boot_completed']).trim()!=='1')fail('DEDICATED_READY_AVD_REQUIRED');
    density=Number(adb(['shell','wm','density']).match(/(?:Override|Physical) density: (\d+)(?![\s\S]*density:)/)?.[1])/160;
    if(!Number.isFinite(density)||density<=0)fail('DENSITY_UNKNOWN');
    stage='welcome-precondition';guard(welcomeActivity);if(!welcomeShape(screen()))fail('LOGGED_OUT_WELCOME_REQUIRED');
    owned=true;await mkdir(reports,{recursive:true});await captureWelcome('initial-welcome');
    stage='default-password';await click('welcome_login');await until(xml=>modeShape(xml,'password'));await gates('default-password-disabled',false);
    if(visualOnly) {
      stage='public-visual-subset';
      await fill('account_email','rowan-public@example.invalid');
      await capturePublicForm('password-visual','password');record('password-public-form-capture',true);
      await click('account_mode');await until(xml=>modeShape(xml,'captcha'));await gates('empty-captcha-disabled',false,false);
      await capturePublicForm('captcha-visual','captcha');record('captcha-public-form-capture',true);
      await backWelcome();cleanup='welcome-confirmed';await captureWelcome('final-welcome');return;
    }
    await fill('account_email','rowan-public@example.invalid');await fill('account_password','PublicOnly123');await gates('password-consent-required',false);
    await click('account_consent');await gates('password-public-gate-enabled-no-submit',true);await capturePublicForm('password-public','password');
    await fill('account_email','other-public@example.invalid');await gates('email-change-cleared-password',false);
    await fill('account_email','rowan-public@example.invalid');await fill('account_password','PublicOnly123');await gates('password-restored-no-submit',true);
    stage='mode-clears-password';await click('account_mode');await until(xml=>modeShape(xml,'captcha'));await gates('captcha-initial-empty',false,true);await capturePublicForm('captcha-public','captcha');
    await fill('account_email','invalid-email');await gates('invalid-email-send-and-submit-disabled',false,false);
    await fill('account_email','rowan-public@example.invalid');await gates('valid-email-no-code',false,true);
    await click('account_mode');await until(xml=>modeShape(xml,'password'));await gates('mode-cleared-password',false);
    await click('account_mode');await until(xml=>modeShape(xml,'captcha'));
    stage='captcha-format';
    for(const [text,label,enabled] of [['12345','five-digits',false],['1234567','seven-digits',false],['12a456','alphabetic-input-attempt',false],['123456','six-ascii-digits',true]]) {await fill('account_code',text);await gates(label,enabled,true);}
    await click('account_consent');await gates('captcha-consent-required',false,false);await click('account_consent');await gates('captcha-consent-restored',true,true);
    stage='email-clears-code';await fill('account_email','other-public@example.invalid');await gates('email-change-cleared-code',false,true);
    stage='mode-clears-code';await fill('account_code','123456');await gates('code-ready-before-switch',true,true);await click('account_mode');await until(xml=>modeShape(xml,'password'));await gates('code-not-password',false);
    await click('account_mode');await until(xml=>modeShape(xml,'captcha'));await gates('mode-cleared-code',false,true);
    stage='background-clears-code';await fill('account_code','123456');await gates('code-ready-before-background',true,true);
    await backgroundReturn('captcha');await gates('background-cleared-code',false,true);
    stage='background-clears-password';await click('account_mode');await until(xml=>modeShape(xml,'password'));await fill('account_password','PublicOnly123');await gates('password-ready-before-background',true);
    await backgroundReturn('password');await gates('background-cleared-password',false);
    stage='back-and-return';await backWelcome();await click('welcome_login');await until(xml=>modeShape(xml,'password'));await gates('return-default-password-disabled',false);
    await click('account_mode');await until(xml=>modeShape(xml,'captcha'));await gates('return-captcha-disabled',false,false);
    await backWelcome();cleanup='welcome-confirmed';await captureWelcome('final-welcome');
  } catch(error) {results.push({id:'public-flow',stage,result:'阻塞',errorCode:error instanceof Failure?error.code:'PUBLIC_RUNTIME_UNAVAILABLE'});}
  finally {
    // Never logout, clear app data, force-stop or dismiss an unknown page/dialog.
    if(owned)try {
      if(backgroundOwned) await resumeOwnTask({adb,rawScreen:()=>dumpHierarchy(serial,'/sdcard/rowan-email-login-recents.xml'),isExpectedForeground:()=>current(accountActivity)});
      const cancelled=interrupted;interrupted=false;try {await backWelcome();cleanup='welcome-confirmed';} finally {interrupted=cancelled;}
    }catch {cleanup='blocked-native-return-unconfirmed';}
    try {if(sourceBefore)sourceAfter=sourceFingerprint(['android-as','app-rn']);}catch{}
    const sourceUnchanged=!!sourceBefore&&sourceBefore.sourceSha256===sourceAfter?.sourceSha256;
    const report={runId,serial,packageId:pkg,scriptSha256:sha(await readFile(new URL(import.meta.url))),taskResumeSha256:sha(await readFile(new URL('./android-ui/owned-task-resume.mjs',import.meta.url))),installedArtifactSha256:installed,sidecarSha256,sourceBefore,sourceAfter,sourceUnchanged,
      results,screenshots,cleanup,visualOnly,sendActions:0,submitActions:0,scope:'Public dummy-only S016 UI gates; not real captcha/email/login/backend validation.',
      limits:['Input text is redacted by the existing snapshot exporter; clearing is inferred through disabled submit after a previously enabled gate.',
        'Alphabetic attempt passes through numeric EditText filtering; this is not a direct validator proof or Unicode IME coverage.',
        'No actual send/cooldown/SMTP, AUTH04, AUTH02, login, account switch, persistence, hardware, iOS or pixel/online-Lanhu acceptance.',
        'Welcome and tool-owned fixed-public-input form screenshots, guarded before/after. Raw XML/dumpsys/CLI/error payloads and input values are not archived.',
        'SIGINT/SIGTERM use bounded finally; force-kill cannot guarantee return. Existing authenticated/unknown pages are never logged out or cleared.']};
    await mkdir(reports,{recursive:true});const reportName=`android-email-login-public-${runId}.json`;await writeFile(new URL(reportName,reports),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({report:reportName,checks:results.length,cleanup,sourceUnchanged,sendActions:0,submitActions:0}));
    if(results.some(x=>x.result!=='通过')||!sourceUnchanged||cleanup!=='welcome-confirmed')process.exitCode=1;
    process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);if(interrupted)process.exitCode=130;
  }
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--self-test')await selfTest();
else if(args.length===1&&args[0]==='--run')await run();
else if(args.length===1&&args[0]==='--visual-only')await run(true);
else {console.log('Usage: node docs/tools/verify_email_login_public.mjs --self-test | --run | --visual-only');process.exitCode=2;}

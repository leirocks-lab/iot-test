// Public-state emulator checks only. Never taps code-send/verify/register/reset controls.
// Region selection and actual public agreement loading are the only data-reading flows.
import {execFileSync} from 'node:child_process';
import {writeFile, readFile} from 'node:fs/promises';
import {sourceFingerprint} from './source_fingerprint.mjs';
import {dumpHierarchy} from './android-ui/snapshot.mjs';

const serial = 'emulator-5554', pkg = 'com.rowan.iot.dev.refactor';
const directory = new URL('../测试报告/重构实施-20261101/', import.meta.url);
const runId = new Date().toISOString().replaceAll(':', '-');
const results = [], screenshots = [], metadataErrors = [];
let stage = 'startup';
class PublicFlowError extends Error {
  constructor(errorCode) { super(errorCode); this.errorCode = errorCode; }
}
const adb = args => execFileSync('adb', ['-s', serial, ...args], {encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const resource = id => id.includes(':') ? id : `${pkg}:id/${id}`;
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*>/g)].map(match => {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(value => [value[1], decode(value[2])]));
    const bounds = attrs.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)?.slice(1).map(Number);
    return {...attrs, bounds, left: bounds?.[0], top: bounds?.[1], right: bounds?.[2], bottom: bounds?.[3]};
  });
}
const find = (xml, id) => nodes(xml).find(node => node['resource-id'] === resource(id));
function view(xml, id) {
  const node = find(xml, id);
  if (!node) throw new PublicFlowError('EXPECTED_VIEW_MISSING');
  return node;
}
const visible = node => !!node?.bounds && node.right > node.left && node.bottom > node.top;
const disabled = node => node?.enabled === 'false';
function tap(target) {
  if (!visible(target)) throw new PublicFlowError('VIEW_BOUNDS_INVALID');
  adb(['shell', 'input', 'tap', String(Math.floor((target.left + target.right) / 2)), String(Math.floor((target.top + target.bottom) / 2))]);
}
async function screen() {
  const xml=dumpHierarchy(serial,'/sdcard/rowan-public-ui.xml');
  if(!xml.includes('<hierarchy'))throw new PublicFlowError('HIERARCHY_UNAVAILABLE');
  if (xml.includes('android:id/aerr_wait')) throw new PublicFlowError('SYSTEM_DIALOG');
  return xml; // Never print/persist raw XML, tags, account input or service content.
}
async function until(id) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const xml = await screen();
    if (find(xml, id)) return xml;
    await wait(500);
  }
  throw new PublicFlowError('EXPECTED_VIEW_MISSING');
}
/** Transition-safe: three consecutive matching, non-empty rectangles before any tap. */
async function stable(select, errorCode = 'VIEW_BOUNDS_UNSTABLE') {
  let previous = null, repeats = 0;
  for (let attempt = 0; attempt < 16; attempt++) {
    const xml = await screen(), target = select(xml);
    const key = visible(target) ? target.bounds.join(',') : null;
    repeats = key && key === previous ? repeats + 1 : key ? 1 : 0;
    previous = key;
    if (repeats >= 3) return {xml, target};
    await wait(400);
  }
  throw new PublicFlowError(errorCode);
}
async function stableId(id) { return stable(xml => find(xml, id)); }
function usRegionRow(xml) {
  const list = find(xml, 'auth_region_list');
  if (!visible(list)) return null;
  return nodes(xml).find(node => node['content-desc'] === '美国，US' && node.enabled !== 'false' && visible(node) &&
    node.left >= list.left && node.right <= list.right && node.top >= list.top && node.bottom <= list.bottom);
}
async function stableUSRegion() {
  // "US" also matches English country names such as Australia. Scroll the live
  // list if needed rather than treating the first match as the intended country.
  for (let attempt = 0; attempt < 10; attempt++) {
    const {xml, target: list} = await stableId('auth_region_list');
    if (usRegionRow(xml)) return stable(usRegionRow, 'REGION_US_ROW_NOT_STABLE');
    const x = Math.floor((list.left + list.right) / 2), height = list.bottom - list.top;
    adb(['shell', 'input', 'swipe', String(x), String(Math.floor(list.top + height * 0.8)), String(x), String(Math.floor(list.top + height * 0.25)), '300']);
    await wait(400);
  }
  throw new PublicFlowError('REGION_US_ROW_NOT_FOUND');
}
async function reveal(ids) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const xml = await screen();
    if (ids.every(id => visible(find(xml, id)))) return xml;
    const scroll = nodes(xml).find(node => node.class === 'android.widget.ScrollView' && visible(node));
    if (!scroll) throw new PublicFlowError('SCROLL_CONTAINER_MISSING');
    const x = Math.floor(scroll.left + (scroll.right - scroll.left) * 0.94);
    const height = scroll.bottom - scroll.top;
    adb(['shell', 'input', 'swipe', String(x), String(Math.floor(scroll.top + height * 0.8)), String(x), String(Math.floor(scroll.top + height * 0.3)), '300']);
    await wait(400);
  }
  throw new PublicFlowError('PUBLIC_GATE_NOT_VISIBLE');
}
function record(id, result, errorCode = null, extra = {}) { results.push({id, stage, result, errorCode, ...extra}); }
function check(id, pass, errorCode) {
  record(id, pass ? '通过' : '失败', pass ? null : errorCode);
  if (!pass) throw new PublicFlowError(errorCode);
}
async function capture(label) {
  const name = `${runId}-${label}.png`;
  await writeFile(new URL(name, directory), execFileSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], {timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']}));
  screenshots.push(name);
}
async function backTo(id) { tap((await stableId('auth_flow_back')).target); return until(id); }

try {
  adb(['shell', 'am', 'force-stop', pkg]);
  adb(['shell', 'am', 'start', '-n', `${pkg}/com.rowan.iot.features.auth.WelcomeActivity`]);
  await until('welcome_register');
  await capture('welcome-entry');
  stage = 'registration-initial';
  tap((await stableId('welcome_register')).target);
  let xml = await until('registration_region');
  check('registration-explicit-region-empty', view(xml, 'registration_region').text === '请选择国家或地区', 'REGION_NOT_EXPLICITLY_EMPTY');
  xml = await reveal(['registration_continue', 'registration_consent']);
  check('registration-empty-continue-blocked', disabled(view(xml, 'registration_continue')), 'REGISTRATION_EMPTY_CONTINUE_ENABLED');
  check('registration-unread-consent-blocked', disabled(view(xml, 'registration_consent')), 'UNREAD_CONSENT_ENABLED');
  check('registration-send-only-on-code-step', !find(xml, 'registration_send') && !find(xml, 'registration_code') && !find(xml, 'registration_submit'), 'REGISTRATION_STEP_LAYOUT_MISMATCH');

  stage = 'region-search';
  // Return to the top if gates required scrolling. Never reuse coordinates from a previous page.
  for (let attempt = 0; !visible(find(xml, 'registration_region')) && attempt < 6; attempt++) {
    const scroll = nodes(xml).find(node => node.class === 'android.widget.ScrollView' && visible(node));
    if (!scroll) throw new PublicFlowError('SCROLL_CONTAINER_MISSING');
    const x = Math.floor((scroll.left + scroll.right) / 2), height = scroll.bottom - scroll.top;
    adb(['shell', 'input', 'swipe', String(x), String(Math.floor(scroll.top + height * 0.3)), String(x), String(Math.floor(scroll.top + height * 0.8)), '300']);
    xml = await screen();
  }
  tap((await stableId('registration_region')).target);
  await until('auth_region_list');
  tap((await stableId('auth_region_search')).target);
  adb(['shell', 'input', 'text', 'US']);
  // Keep the keyboard state as-is. No ESC followed by a stale/guessed list coordinate.
  const selected = await stableUSRegion();
  tap(selected.target);
  xml = (await stableId('registration_region')).xml;
  check('registration-local-region-search-selection', view(xml, 'registration_region').text === '美国', 'REGION_SELECTION_NOT_US');
  xml = await reveal(['registration_continue', 'registration_consent']);
  check('registration-unread-consent-submit-blocked', ['registration_consent', 'registration_continue'].every(id => disabled(view(xml, id))), 'UNREAD_REGISTRATION_GATE_ENABLED');
  await capture('registration-unread-state');

  for (const [kind, id] of [['privacy', 'registration_privacy'], ['terms', 'registration_terms']]) {
    stage = `registration-${kind}-actual-content`;
    await reveal([id]);
    tap((await stableId(id)).target);
    xml = await until('agreement_status');
    for (let attempt = 0; attempt < 40 && view(xml, 'agreement_status').text.includes('正在加载'); attempt++) { await wait(750); xml = await screen(); }
    const expectedTitle = kind === 'privacy' ? '隐私政策' : '用户协议';
    check(`${kind}-navigation`, nodes(xml).some(node => node.text === expectedTitle), 'AGREEMENT_TITLE_MISMATCH');
    const status = view(xml, 'agreement_status').text ?? '';
    const failed = /请求失败|加载失败|内容为空|未返回|响应|配置|无效|暂不可用/.test(status);
    const code = status.match(/[（(]([0-9]{1,12})[）)]/)?.[1] ?? null;
    record(`${kind}-real-content`, failed ? '阻塞' : '未验收', code ?? (failed ? 'AGREEMENT_CONTENT_UNAVAILABLE' : status.includes('正在加载') ? 'AGREEMENT_STILL_LOADING' : null),
      {code, note: failed ? '真实正文未取得，阅读闭环未通过' : '本工具不等待60秒、不滚动阅读全文、不确认阅读'});
    check(`${kind}-unread-cannot-confirm`, disabled(view(xml, 'agreement_complete')), 'AGREEMENT_CONFIRM_ENABLED_WITHOUT_READING');
    if (failed) check(`${kind}-failure-cannot-confirm`, disabled(view(xml, 'agreement_complete')), 'AGREEMENT_FAILURE_CONFIRM_ENABLED');
    else record(`${kind}-failure-cannot-confirm`, '未验收', null, {note: '本次未观察到正文失败，未覆盖失败态'});
    await capture(`${kind}-actual-service-state`);
    adb(['shell', 'input', 'keyevent', '4']);
    xml = await until('registration_region');
  }
  stage = 'registration-after-agreement-errors';
  xml = await reveal(['registration_consent', 'registration_continue']);
  check('registration-no-fake-reading-completion', ['registration_consent', 'registration_continue'].every(id => disabled(view(xml, id))), 'PUBLIC_READING_GATE_CHANGED');
  await backTo('welcome_login');

  stage = 'recovery-initial';
  tap((await stableId('welcome_login')).target);
  // A logged-out screen is required. This tool never clears an existing account.
  await until('account_recovery');
  await reveal(['account_recovery']);
  tap((await stableId('account_recovery')).target);
  xml = await until('recovery_send');
  check('recovery-empty-gates', disabled(view(xml, 'recovery_send')), 'RECOVERY_EMPTY_SEND_ENABLED');
  check('recovery-email-step-only', !find(xml, 'recovery_verify') && !find(xml, 'recovery_code') && !find(xml, 'recovery_submit'), 'RECOVERY_STEP_LAYOUT_MISMATCH');
  await capture('recovery-initial');
  stage = 'recovery-invalid-email';
  await reveal(['recovery_email']);
  tap((await stableId('recovery_email')).target);
  adb(['shell', 'input', 'text', 'invalid-email']);
  xml = await reveal(['recovery_send']);
  check('recovery-invalid-email-no-send', disabled(view(xml, 'recovery_send')), 'RECOVERY_INVALID_EMAIL_SEND_ENABLED');
  await capture('recovery-invalid-email');
  await backTo('account_consent');
} catch (error) {
  // Never emit Error.message from adb/Node: it may embed raw stdout/stderr or XML.
  const errorCode = error instanceof PublicFlowError ? error.errorCode : 'PUBLIC_RUNTIME_FAILURE';
  record('public-flow-prerequisite', '阻塞', errorCode, {reason: errorCode === 'SYSTEM_DIALOG' ? '系统弹窗遮挡' : '页面或运行条件未满足'});
} finally {
  try { adb(['shell', 'rm', '-f', '/sdcard/rowan-public-ui.xml']); } catch { metadataErrors.push('TEMP_UI_CLEANUP_FAILED'); }
  async function metadata(errorCode, work) { try { return await work(); } catch { metadataErrors.push(errorCode); return null; } }
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value) ? value : null;
  const buildProvenance = await metadata('BUILD_PROVENANCE_UNAVAILABLE', async () => {
    const raw = JSON.parse(await readFile(new URL('../../android-as/app/build/outputs/apk/development/release/app-development-release.apk.provenance.json', import.meta.url), 'utf8'));
    return {artifactSha256: hash(raw.artifactSha256), sourceBeforeSha256: hash(raw.sourceBefore?.sourceSha256), sourceAfterSha256: hash(raw.sourceAfter?.sourceSha256),
      sourceUnchangedDuringBuild: raw.sourceUnchangedDuringBuild === true, architecture: raw.architecture === 'x86_64' ? 'x86_64' : null};
  });
  const fingerprint = await metadata('SOURCE_FINGERPRINT_UNAVAILABLE', () => sourceFingerprint(['android-as', 'app-rn']));
  const viewport = await metadata('VIEWPORT_UNAVAILABLE', () => adb(['shell', 'wm', 'size']).split(/\r?\n/).filter(line => /^(Physical|Override) size: \d+x\d+$/.test(line)).join('; ') || null);
  const fontScale = await metadata('FONT_SCALE_UNAVAILABLE', () => {
    const value = adb(['shell', 'settings', 'get', 'system', 'font_scale']).trim();
    return /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
  });
  try {
    // Timestamped reports preserve all historical reports. Missing metadata cannot discard results.
    await writeFile(new URL(`android-auth-public-${runId}.json`, directory), JSON.stringify({runId, ...(fingerprint ?? {}), stage,
      errorCode: results.findLast(item => item.result === '失败' || item.id === 'public-flow-prerequisite')?.errorCode ?? null,
      serial, packageId: pkg, buildProvenance, viewport, fontScale, metadataErrors, results, screenshots,
      limits: '仅两步界面空态/非法输入/地区选择/协议真实加载及未读门禁；未点击验证码发送、验证码校验、注册或重置；无测试替身'}, null, 2) + '\n');
  } catch { console.log('PUBLIC_REPORT_WRITE_FAILED'); process.exitCode = 1; }
}
for (const item of results) console.log(`${item.id}: ${item.result}`);
if (results.some(item => item.result === '失败' || item.id === 'public-flow-prerequisite')) process.exitCode = 1;

// Real GET-only lifecycle continuation. Root runs this only after native builds stop.
// Hierarchies, CLI dumps, account/device texts and raw errors never enter reports/stdout.
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dumpHierarchy, AndroidUiSnapshotError} from './android-ui/snapshot.mjs';
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
import {sourceFingerprint} from './source_fingerprint.mjs';

const directory = new URL('../测试报告/重构实施-20261101/', import.meta.url);
const argument = name => process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
const pkg = 'com.rowan.iot.dev.refactor';
const adbPath = 'D:/Android/Sdk/platform-tools/adb.exe';
const remoteXml = '/sdcard/rowan-device-read-lifecycle.xml';
const runId = new Date().toISOString().replaceAll(':', '-');
const results = [], screenshots = [];
let parent = null, parentRunId = null, serial = null, parentReportSha256 = null, installedArtifactSha256 = null, avdName = null;
let sourceBefore = null, stage = 'parent', validatedSession = false, interrupted = false, cleanupPhase = false;
let relay = null, originalNetwork = null, networkTouched = false, restoration = null, logout = null, activity = null;
let capabilities = null;
let logoutActionCount = 0;
const scriptSha256 = createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
class LifecycleFailure extends Error {constructor(code) {super(code); this.code = code;}}
function fail(code) {throw new LifecycleFailure(code);}
const interrupt = () => {interrupted = true;};
process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function adb(args, timeout = 20_000) {
  if (!serial || !/^emulator-\d+$/.test(serial)) fail('EMULATOR_REQUIRED');
  if (interrupted && !cleanupPhase) fail('INTERRUPTED');
  try {return execFileSync(adbPath, ['-s', serial, ...args], {encoding: 'utf8', timeout, maxBuffer: 3 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});}
  catch {fail('ADB_OPERATION_UNAVAILABLE');}
}
function pass(id, metadata = {}) {results.push({id, result: '通过', stage, ...metadata}); console.log(`${id}: 通过`);}
function attribute(tag, name) {return tag?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;}
function nodes(xml) {return [...xml.matchAll(/<node\b[^>]*>/g)].map(value => value[0]);}
function node(xml, id) {return nodes(xml).find(tag => attribute(tag, 'resource-id') === id);}
const nativeId = id => `${pkg}:id/${id}`;
const has = (xml, id) => Boolean(node(xml, id));
function bounds(tag) {return tag?.match(/bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/)?.slice(1).map(Number) ?? null;}
function actionable(xml, id) {
  const target = node(xml, id), rect = bounds(target), viewport = bounds(nodes(xml)[0]);
  return rect && viewport && attribute(target, 'enabled') !== 'false' && rect[0] >= 0 && rect[1] >= 0 &&
    rect[2] > rect[0] && rect[3] > rect[1] && rect[2] <= viewport[2] && rect[3] <= viewport[3] ? rect : null;
}
function tap(xml, id) {
  const rect = actionable(xml, id); if (!rect) fail('TARGET_NOT_ACTIONABLE');
  adb(['shell', 'input', 'tap', String(Math.floor((rect[0] + rect[2]) / 2)), String(Math.floor((rect[1] + rect[3]) / 2))]);
}
async function screen() {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (interrupted && !cleanupPhase) fail('INTERRUPTED');
    try {
      const xml = dumpHierarchy(serial, remoteXml);
      if (has(xml, 'android:id/aerr_wait') || has(xml, 'android:id/aerr_close')) fail('SYSTEM_ANR_DIALOG');
      if (!xml.includes('<hierarchy')) fail('HIERARCHY_UNAVAILABLE');
      return xml;
    } catch (error) {
      if (error instanceof AndroidUiSnapshotError && error.code === 'ROOT_NOT_READY' && attempt < 2) {await wait(300); continue;}
      if (error instanceof LifecycleFailure) throw error;
      fail('SNAPSHOT_HELPER_UNAVAILABLE');
    }
  }
  fail('ROOT_NOT_READY');
}
async function until(predicate, {milliseconds = 55_000, attempts = 32} = {}) {
  const deadline = Date.now() + milliseconds;
  for (let attempt = 0; attempt < attempts && Date.now() < deadline; attempt++) {
    const xml = await screen(); if (predicate(xml)) return xml; await wait(450);
  }
  fail('EXPECTED_STATE_TIMEOUT');
}
async function stable(id) {
  let previous = null;
  for (let attempt = 0; attempt < 16; attempt++) {
    const xml = await screen(), rect = actionable(xml, id), key = rect?.join(',');
    if (key && key === previous) return xml;
    previous = key; await wait(350);
  }
  fail('STABLE_TARGET_UNAVAILABLE');
}
async function scrollTo(id) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const xml = await screen(); if (actionable(xml, id)) return stable(id);
    const rect = bounds(nodes(xml)[0]); if (!rect) fail('VIEWPORT_UNAVAILABLE');
    adb(['shell', 'input', 'swipe', String(Math.floor(rect[2] * .92)), String(Math.floor(rect[3] * .78)),
      String(Math.floor(rect[2] * .92)), String(Math.floor(rect[3] * .32)), '300']); await wait(350);
  }
  fail('SCROLL_TARGET_UNAVAILABLE');
}
function installedSha() {
  const path = adb(['shell', 'pm', 'path', pkg]).trim().split(/\r?\n/).find(line => line.endsWith('/base.apk'))?.replace(/^package:/, '');
  if (!path || !/^\/data\/app\/[A-Za-z0-9_./+=~-]+\/base\.apk$/.test(path)) fail('INSTALLED_ARTIFACT_MISSING');
  const hash = adb(['shell', 'sha256sum', path]).trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(hash)) fail('INSTALLED_ARTIFACT_UNVERIFIABLE'); return hash;
}

// Nonzero usage exits apply ONLY to exact read-only help invocations with matching bodies.
// This reader must never be reused for normal ADB operations or network mutations.
function readonlyHelp(kind) {
  const requests = {
    am: {args: ['shell', 'am', 'help'], exits: [0], syntax: /(?:^|\s|\[)--activity-reorder-to-front(?=\s|:|\]|$)/m},
    connectivity: {args: ['shell', 'cmd', 'connectivity', 'help'], exits: [0, 255], syntax: /\bairplane-mode\s+\[\s*enable\s*\|\s*disable\s*\]/i},
    wifi: {args: ['shell', 'svc', 'wifi'], exits: [0, 1], syntax: /\busage:\s*svc\s+wifi\s+\[\s*enable\s*\|\s*disable\s*\]/i},
    data: {args: ['shell', 'svc', 'data'], exits: [0, 1], syntax: /\busage:\s*svc\s+data\s+\[\s*enable\s*\|\s*disable\s*\]/i},
  };
  const request = requests[kind];
  if (!request || !serial || !/^emulator-\d+$/.test(serial)) fail('INVALID_HELP_INVOCATION');
  if (interrupted && !cleanupPhase) fail('INTERRUPTED');
  const output = spawnSync(adbPath, ['-s', serial, ...request.args], {encoding: 'utf8', timeout: 20_000,
    maxBuffer: 3 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  if (output.error || output.signal || !Number.isInteger(output.status) || !request.exits.includes(output.status)) fail('READONLY_HELP_UNAVAILABLE');
  const exitCode = output.status, body = String(output.stdout ?? '') + '\n' + String(output.stderr ?? '');
  if (!request.syntax.test(body)) fail(`REQUIRED_CLI_CAPABILITY_UNCONFIRMED_${kind.toUpperCase()}`);
  return {exitCode, verified: true}; // Raw stdout/stderr never leave this stack frame.
}
// A fixed no-argument probe cannot focus a task: the ROM must reject it before any task ID exists.
// The two observed diagnostics together prove this hidden subcommand is implemented; neither
// generic exit1 nor a random IllegalArgumentException/stack frame is sufficient on its own.
function readonlyTaskFocusProbe() {
  if (!serial || !/^emulator-\d+$/.test(serial)) fail('INVALID_FOCUS_PROBE_INVOCATION');
  if (interrupted && !cleanupPhase) fail('INTERRUPTED');
  const output = spawnSync(adbPath, ['-s', serial, 'shell', 'am', 'task', 'focus'], {encoding: 'utf8', timeout: 20_000,
    maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  if (output.error || output.signal || ![1,255].includes(output.status)) fail('TASK_FOCUS_PROBE_UNAVAILABLE');
  const body = String(output.stdout ?? '') + '\n' + String(output.stderr ?? '');
  const missingFocusArgument = /(?:java\.lang\.)?IllegalArgumentException:\s*Argument expected after ["']focus["']/.test(body);
  const focusImplementation = /^\s*at\s+com\.android\.server\.am\.ActivityManagerShellCommand\.runTaskFocus\(/m.test(body);
  if (!missingFocusArgument || !focusImplementation) fail('TASK_FOCUS_SUPPORT_UNCONFIRMED');
  return {verified: true, exitCode: output.status}; // No raw exception/stack is returned or archived.
}
// Network mutations still require their exact advertised syntax. Focus uses the read-only probe.
function discoverCapabilities() {
  const focus = readonlyTaskFocusProbe(), connectivity = readonlyHelp('connectivity');
  // With no argument svc prints its command usage; it cannot toggle a radio.
  const wifi = readonlyHelp('wifi'), data = readonlyHelp('data');
  return {resumeMethod: 'verified-task-focus', taskFocus: focus.verified,
    airplane: connectivity.verified, wifi: wifi.verified, data: data.verified,
    helpExitCodes: {focusProbe: focus.exitCode, connectivity: connectivity.exitCode, wifi: wifi.exitCode, data: data.exitCode}};
}
function booleanSetting(key) {
  const value = adb(['shell', 'settings', 'get', 'global', key]).trim();
  if (value !== '0' && value !== '1') fail('NETWORK_PRESTATE_UNSUPPORTED'); return value;
}
function networkState() {
  const airplane = adb(['shell', 'cmd', 'connectivity', 'airplane-mode']).trim();
  if (!['enabled', 'disabled'].includes(airplane)) fail('AIRPLANE_QUERY_UNCONFIRMED');
  const airplaneSetting = booleanSetting('airplane_mode_on'), wifiSetting = booleanSetting('wifi_on'), mobileData = booleanSetting('mobile_data');
  const status = adb(['shell', 'cmd', 'wifi', 'status']);
  const physical = status.match(/^Wi-?Fi is (enabled|disabled)\s*$/im)?.[1];
  if (!physical || (physical === 'enabled') !== (wifiSetting === '1') || (airplane === 'enabled') !== (airplaneSetting === '1')) fail('RADIO_STATE_UNCONFIRMED');
  // Full dumps stay in memory. Never retain IPs, SSIDs, network IDs, URLs or interface dumps.
  const dump = adb(['shell', 'dumpsys', 'connectivity']);
  const defaults = [...dump.matchAll(/^\s*Active default network:\s*(none|null|-1|[0-9]+)\s*$/gm)];
  if (defaults.length !== 1) fail('DEFAULT_NETWORK_STATE_UNCONFIRMED');
  return {airplane, airplaneSetting, wifiSetting, wifiEnabled: physical === 'enabled', mobileData,
    defaultNetworkPresent: !['none', 'null', '-1'].includes(defaults[0][1])};
}
const sameNetwork = (a, b) => ['airplane', 'airplaneSetting', 'wifiSetting', 'wifiEnabled', 'mobileData', 'defaultNetworkPresent'].every(key => a[key] === b[key]);
async function waitNetwork(predicate) {
  for (let attempt = 0; attempt < 18; attempt++) {
    try {const state = networkState(); if (predicate(state)) return state;}
    catch (error) {
      // Radio transitions can temporarily disagree with their persisted flags.
      if (!(error instanceof LifecycleFailure) || !['RADIO_STATE_UNCONFIRMED', 'NETWORK_PRESTATE_UNSUPPORTED'].includes(error.code)) throw error;
    }
    await wait(500);
  }
  fail('NETWORK_STATE_TIMEOUT');
}
async function isolateNetwork() {
  networkTouched = true; // Set BEFORE first command: even a partial failure requires restoration.
  adb(['shell', 'svc', 'wifi', 'disable']); adb(['shell', 'svc', 'data', 'disable']);
  adb(['shell', 'cmd', 'connectivity', 'airplane-mode', 'enable']);
  return waitNetwork(state => state.airplane === 'enabled' && !state.wifiEnabled && state.mobileData === '0' && !state.defaultNetworkPresent);
}
async function restoreNetwork() {
  const attempts = [];
  for (const [kind, args] of [
    ['airplane', ['shell', 'cmd', 'connectivity', 'airplane-mode', originalNetwork.airplane === 'enabled' ? 'enable' : 'disable']],
    ['mobileData', ['shell', 'svc', 'data', originalNetwork.mobileData === '1' ? 'enable' : 'disable']],
    ['wifi', ['shell', 'svc', 'wifi', originalNetwork.wifiEnabled ? 'enable' : 'disable']],
  ]) {try {adb(args); attempts.push({kind, completed: true});} catch {attempts.push({kind, completed: false});}}
  let observed = null;
  try {observed = await waitNetwork(state => sameNetwork(originalNetwork, state));} catch {}
  return {result: attempts.every(row => row.completed) && observed ? '通过' : '阻塞', attempts, observed,
    policy: 'Restore only the captured AVD airplane/mobile-data/Wi-Fi values; compare physical Wi-Fi and default-network presence. No host/network/proxy/DNS-setting changes.'};
}

function activityState() {
  const dump = adb(['shell', 'dumpsys', 'activity', 'activities']);
  const escaped = pkg.replaceAll('.', '\\.');
  const pattern = `ActivityRecord\\{([0-9a-f]+)\\s+u[0-9]+\\s+${escaped}/(?:com\\.rowan\\.iot\\.rnhost\\.DeviceActivity|\\.rnhost\\.DeviceActivity)\\s+t([0-9]+)`;
  const records = [...dump.matchAll(new RegExp(pattern, 'g'))].map(match => ({record: match[1], task: Number(match[2])}));
  const resumedLines = dump.split(/\r?\n/).filter(line => /\b(?:mResumedActivity|topResumedActivity)\s*[:=]/.test(line));
  const resumed = resumedLines.flatMap(line => [...line.matchAll(new RegExp(pattern, 'g'))]).map(match => ({record: match[1], task: Number(match[2])}));
  if (!resumedLines.length) fail('ACTIVITY_STATE_UNCONFIRMED');
  return {records, resumed};
}
const sameActivity = (a, b) => a.record === b.record && a.task === b.task;
function requireSameActivity() {
  const state = activityState();
  if (!state.resumed.some(value => sameActivity(value, activity))) fail('DEVICE_ACTIVITY_INSTANCE_CHANGED');
}
async function background() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  for (let attempt = 0; attempt < 12; attempt++) {
    const state = activityState();
    if (!state.records.some(value => sameActivity(value, activity))) fail('DEVICE_ACTIVITY_DESTROYED');
    if (!state.resumed.some(value => sameActivity(value, activity))) {await wait(650); return;}
    await wait(350);
  }
  fail('BACKGROUND_NOT_CONFIRMED');
}
async function resumeSameActivity() {
  const before = activityState();
  if (!before.records.some(value => sameActivity(value, activity))) fail('DEVICE_ACTIVITY_DESTROYED');
  // Never start a private Activity. The implemented focus command receives only the captured task ID.
  if (capabilities?.taskFocus !== true) fail('RESUME_CAPABILITY_UNCONFIRMED');
  if (!Number.isInteger(activity.task) || activity.task <= 0 || activity.task > 2_147_483_647) fail('TASK_ID_UNCONFIRMED');
  adb(['shell', 'am', 'task', 'focus', String(activity.task)]);
  for (let attempt = 0; attempt < 12; attempt++) {
    const state = activityState();
    if (state.resumed.some(value => sameActivity(value, activity))) return;
    await wait(350);
  }
  fail('EXISTING_TASK_RESUME_UNCONFIRMED');
}
async function screenshotError() {
  const safe = xml => has(xml, 'rn-more-error') && !has(xml, 'rn-more-loaded') &&
    !has(xml, nativeId('home_title')) && !has(xml, nativeId('account_email')) &&
    attribute(nodes(xml)[0], 'package') === pkg;
  if (!safe(await screen())) fail('SCREENSHOT_PRIVACY_GUARD'); requireSameActivity();
  let bytes;
  try {bytes = execFileSync(adbPath, ['-s', serial, 'exec-out', 'screencap', '-p'], {timeout: 15_000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});}
  catch {fail('SCREENSHOT_UNAVAILABLE');}
  if (!safe(await screen())) fail('SCREENSHOT_PRIVACY_GUARD'); requireSameActivity();
  const file = `${runId}-device-read-lifecycle-offline-error.png`;
  await writeFile(new URL(file, directory), bytes); screenshots.push(file);
}
async function normalLogout() {
  if (installedSha() !== installedArtifactSha256) fail('PARENT_ARTIFACT_CHANGED');
  // Cold start is cleanup ONLY, never the lifecycle-resume mechanism.
  adb(['shell', 'am', 'force-stop', pkg]);
  adb(['shell', 'am', 'start', '-n', `${pkg}/com.rowan.iot.features.auth.WelcomeActivity`]);
  let xml = await until(value => has(value, nativeId('home_title')) || has(value, nativeId('welcome_login')));
  if (has(xml, nativeId('welcome_login'))) return {result: '通过',state: 'already-signed-out', actionCount: 0};
  xml = await scrollTo(nativeId('home_logout'));
  if (attribute(node(xml, nativeId('home_logout')), 'text') === '重试本地清理') fail('SESSION_CLEANUP_PENDING');
  logoutActionCount++; tap(xml, nativeId('home_logout')); // Exactly one intent; unknown dispatch is never replayed.
  await until(value => has(value, nativeId('welcome_login')));
  return {result: '通过', state: 'normal-logout-confirmed', actionCount: 1};
}

// Validate the actual CLI and reversible radio prestate before creating a login session.
// This mode has no page actions, radio changes, DNS relay, parent session or report mutation.
if(process.argv.includes('--preflight-only')) {
  serial='emulator-5554';
  try {
    const name=adb(['emu','avd','name']).split(/\r?\n/).map(value=>value.trim()).find(value=>value&&value!=='OK');
    if(!['ROWAN_API_36','ROWAN_API36'].includes(name))fail('DEDICATED_AVD_REQUIRED');
    console.log(JSON.stringify({mode:'read-only-preflight',capabilities:discoverCapabilities(),network:networkState()}));
  } catch(error) {
    console.log(JSON.stringify({mode:'read-only-preflight',result:'阻塞',code:error instanceof LifecycleFailure?error.code:'PREFLIGHT_UNAVAILABLE'}));
    process.exitCode=1;
  }
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
  process.exit(process.exitCode??0);
}
await mkdir(directory, {recursive: true});
try {
  const parentId = argument('--parent-run');
  if (!parentId || !/^\d{4}-\d\d-\d\dT[\d.-]+Z$/.test(parentId)) fail('RECORDED_PARENT_REQUIRED');
  parentRunId = parentId;
  let parentBytes;
  try {parentBytes = await readFile(new URL(`android-emulator-${parentId}.json`, directory)); parent = JSON.parse(parentBytes.toString('utf8'));}
  catch {fail('PARENT_REPORT_UNAVAILABLE');}
  parentReportSha256 = createHash('sha256').update(parentBytes).digest('hex');
  if (parent.sessionKept !== true || parent.packageId !== pkg || !/^emulator-\d+$/.test(parent.serial ?? '') ||
      !/^[a-f0-9]{64}$/.test(parent.installedArtifactSha256 ?? '') ||
      !parent.results?.some(row => row.id === 'AUTH-04-native-emulator' && row.result === '通过')) fail('RETAINED_VALIDATION_PARENT_REQUIRED');
  serial = parent.serial;
  stage = 'artifact-avd-guard'; installedArtifactSha256 = installedSha();
  if (installedArtifactSha256 !== parent.installedArtifactSha256) fail('PARENT_ARTIFACT_CHANGED');
  const selectedAvd = adb(['emu', 'avd', 'name']).split(/\r?\n/).map(line => line.trim()).find(line => line && line !== 'OK');
  if (!['ROWAN_API_36', 'ROWAN_API36'].includes(selectedAvd)) fail('DEDICATED_AVD_REQUIRED'); avdName = selectedAvd;
  if (adb(['shell', 'getprop', 'sys.boot_completed']).trim() !== '1') fail('EMULATOR_NOT_READY');
  sourceBefore = sourceFingerprint(['android-as', 'app-rn']);
  if (parent.sourceSha256 !== sourceBefore.sourceSha256) fail('PARENT_SOURCE_CHANGED');
  if (parent.installedArtifactMatchesBuild !== true || parent.buildProvenance?.sourceUnchangedDuringBuild !== true ||
      parent.buildProvenance?.artifactSha256 !== installedArtifactSha256 ||
      parent.buildProvenance?.sourceAfter?.sourceSha256 !== sourceBefore.sourceSha256) fail('PARENT_BUILD_SOURCE_UNVERIFIED');
  validatedSession = true;
  if (argument('--dns-upstream')) relay = await startLoopbackDnsRelay({upstream: argument('--dns-upstream')});
  stage = 'readonly-cli-preflight'; capabilities = discoverCapabilities(); originalNetwork = networkState();
  // Do not attempt to normalize an unusual initial environment or restore a guessed absent setting.
  if (originalNetwork.airplane !== 'disabled' || !originalNetwork.defaultNetworkPresent) fail('BASELINE_NETWORK_UNAVAILABLE');
  stage = 'baseline-more';
  let xml = await until(value => has(value, nativeId('home_title')) || has(value, 'rn-device-status'));
  if (has(xml, nativeId('home_title'))) {xml = await stable(nativeId('home_device_open')); tap(xml, nativeId('home_device_open')); await until(value => has(value, 'rn-device-status'));}
  xml = await stable('rn-open-more'); tap(xml, 'rn-open-more');
  await until(value => has(value, 'rn-more-loaded'));
  const state = activityState(); const unique = [...new Map(state.resumed.map(value => [`${value.record}:${value.task}`, value])).values()];
  if (unique.length !== 1) fail('DEVICE_ACTIVITY_IDENTITY_UNCONFIRMED'); activity = unique[0];
  pass('more-baseline-real-read', {state: 'loaded'});

  stage = 'same-activity-background-resume'; await background(); await resumeSameActivity();
  await until(value => has(value, 'rn-more-loaded')); requireSameActivity();
  pass('more-background-resume', {sameActivityRecord: true, sameTask: true, state: 'loaded'});

  stage = 'network-isolation'; await background(); const offline = await isolateNetwork();
  pass('avd-network-isolation', {offline, evidence: 'Recognized CLI state plus no active default network; no host/ADB/proxy/TLS modification.'});
  stage = 'offline-resume-read'; await resumeSameActivity();
  await until(value => has(value, 'rn-more-error') && !has(value, 'rn-more-loaded')); requireSameActivity();
  pass('more-offline-read-error', {sameActivityRecord: true, state: 'error', causalLimit: 'Generic error is not a backend diagnosis; transport isolation was independently checked.'});
  if (process.argv.includes('--screenshots')) await screenshotError();

  stage = 'network-restoration'; restoration = await restoreNetwork();
  if (restoration.result !== '通过') fail('NETWORK_RESTORE_UNCONFIRMED'); networkTouched = false;
  stage = 'read-recovery'; xml = await stable('rn-more-retry'); tap(xml, 'rn-more-retry');
  await until(value => has(value, 'rn-more-loaded') && !has(value, 'rn-more-error')); requireSameActivity();
  pass('more-network-read-recovery', {sameActivityRecord: true, explicitGetRetryActions: 1, state: 'loaded'});
} catch (error) {
  const errorCode = error instanceof LifecycleFailure ? error.code : 'LIFECYCLE_ENVIRONMENT_OR_FLOW_UNAVAILABLE';
  results.push({id: 'device-read-lifecycle', result: '阻塞', stage, errorCode}); console.log(`device-read-lifecycle: 阻塞 (${stage}/${errorCode})`);
} finally {
  cleanupPhase = true;
  if (networkTouched && originalNetwork) {
    try {restoration = await restoreNetwork();} catch {restoration = {result: '阻塞', errorCode: 'NETWORK_RESTORE_UNCONFIRMED'};}
  } else if (!restoration) restoration = {result: '不适用', note: 'No AVD radio state changed.'};
  if (validatedSession) {
    stage = 'finally-normal-logout';
    // Never dispatch even normal logout while restoration remains unconfirmed.
    if (restoration.result === '阻塞') logout = {result: '阻塞', state: 'network-restore-required', actionCount: 0};
    else {try {logout = await normalLogout();} catch {logout = {result: '阻塞', state: 'logout-unconfirmed', actionCount: logoutActionCount, errorCode: 'NORMAL_LOGOUT_UNCONFIRMED'};}}
  } else logout = {result: '不适用', state: 'parent-not-validated', actionCount: 0};
  if (serial && /^emulator-\d+$/.test(serial)) try {adb(['shell', 'rm', '-f', remoteXml]);} catch {}
  if (relay) {try {await relay.close();} catch {results.push({id: 'dns-relay-cleanup', result: '阻塞', errorCode: 'DNS_RELAY_CLOSE_FAILED'});}}
  let sourceAfter = null; try {if (sourceBefore) sourceAfter = sourceFingerprint(['android-as', 'app-rn']);} catch {}
  const report = {runId, parentRunId, parentReportSha256, scriptSha256,
    serial, packageId: pkg, avdName, installedArtifactSha256,
    parentInstalledArtifactSha256: /^[a-f0-9]{64}$/.test(parent?.installedArtifactSha256 ?? '') ? parent.installedArtifactSha256 : null,
    buildProvenance: validatedSession ? parent.buildProvenance : null, sourceBefore, sourceAfter,
    sourceUnchanged: Boolean(sourceBefore && sourceBefore.sourceSha256 === sourceAfter?.sourceSha256),
    capabilities, activity, originalNetwork, restoration, logout, dnsForwarding: relay?.snapshot() ?? null, results, screenshots,
    scope: 'One retained test session; real metadata GETs, same native Activity background/resume, explicitly verified AVD network isolation/recovery, one normal logout.',
    limits: ['No desired/control/relationship/OTA/schedule writes, sharing codes, verification codes, new login or account A/B switch.',
      'No raw hierarchy/text/CLI dumps/errors archived. Optional PNG only on fixed More error state, never populated metadata.',
      'ActivityRecord/task identity proves reuse; loaded alone does not prove exact HTTP request counts or physical IO cancellation.',
      'Noncooperative HTTP may outlive cancellation; bounded polling records blocking rather than declaring a hard deadline.',
      'CLI/state formats not recognized are a precondition block, never a simulated offline success. Force-kill cannot guarantee JS finally restoration.',
      'No iOS/hardware/full visual acceptance.']};
  await writeFile(new URL(`android-device-read-lifecycle-${runId}.json`, directory), JSON.stringify(report, null, 2) + '\n');
  console.log(`network-restore: ${restoration.result}; normal-logout: ${logout.result}`);
  if (results.some(row => row.result !== '通过') || restoration.result === '阻塞' || logout.result === '阻塞' || !report.sourceUnchanged) process.exitCode = 1;
  process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  if (interrupted) process.exitCode = 130;
}

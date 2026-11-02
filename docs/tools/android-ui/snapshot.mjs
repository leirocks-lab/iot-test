import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const adbPath = 'D:/Android/Sdk/platform-tools/adb.exe';
const mainClass = 'com.rowan.tools.androidui.RowanUiSnapshot';
const helperCodes = new Set(['OK', 'INVALID_ARGUMENT', 'STALE_OUTPUT_DELETE_FAILED', 'ROOT_NOT_READY', 'DEPTH_LIMIT', 'NODE_LIMIT', 'BYTE_LIMIT', 'AUTOMATION_FAILURE', 'WATCHDOG_TIMEOUT', 'CAPTURE_FAILED']);
function helperStatus(output, id) {
  if (typeof output !== 'string') return null;
  try {
    const line = output.split(/\r?\n/).find(value => value.startsWith('{"code":'));
    const value = line ? JSON.parse(line) : null;
    return value?.captureId === id && helperCodes.has(value.code) ? value : null;
  } catch { return null; }
}
export class AndroidUiSnapshotError extends Error {
  constructor(code, stage) { super(code); this.code = code; this.stage = stage; }
}

/** Synchronous, redacted XML in memory only; caller must pass its exact remote XML path. */
export function dumpHierarchy(serial, path) {
  if (typeof serial !== 'string' || !/^emulator-\d+$/.test(serial)) throw new AndroidUiSnapshotError('EMULATOR_REQUIRED', 'arguments');
  if (typeof path !== 'string' || path.length > 128 || !/^\/sdcard\/rowan-[a-z0-9-]+\.xml$/.test(path)) throw new AndroidUiSnapshotError('INVALID_OUTPUT_PATH', 'arguments');
  const id = randomBytes(6).toString('hex'), processName = `rowan-ui-${id.slice(0, 6)}`;
  const adb = (args, timeout = 15000) => execFileSync(adbPath, ['-s', serial, ...args], {encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  let stage = 'remove-stale', started = false;
  try {
    adb(['shell', 'rm', '-f', path]);
    stage = 'capture'; started = true;
    // Every interpolated argument is fixed or matched against a shell-safe alphabet above.
    const command = `CLASSPATH=/data/local/tmp/rowan-ui-export.jar:/system/framework/uiautomator.jar app_process /system/bin --nice-name=${processName} ${mainClass} ${path} ${id}`;
    const output = adb(['shell', command], 14000);
    const metadata = helperStatus(output, id);
    if (metadata?.code !== 'OK') throw new AndroidUiSnapshotError(metadata?.code ?? 'HELPER_CAPTURE_FAILED', stage);
    stage = 'read';
    const xml = adb(['exec-out', 'cat', path]);
    if (Buffer.byteLength(xml, 'utf8') > 1024 * 1024 || !xml.includes(`<hierarchy capture-id="${id}"`) || !xml.includes('</hierarchy>')) throw new AndroidUiSnapshotError('INVALID_CAPTURE_OUTPUT', stage);
    return xml;
  } catch (error) {
    if (error instanceof AndroidUiSnapshotError) throw error;
    const nativeStatus = stage === 'capture' ? helperStatus(error.stdout, id) : null;
    if (nativeStatus && nativeStatus.code !== 'OK') throw new AndroidUiSnapshotError(nativeStatus.code, stage);
    throw new AndroidUiSnapshotError(stage === 'capture' ? 'CAPTURE_PROCESS_FAILED' : 'CAPTURE_IO_FAILED', stage);
  } finally {
    // A unique short Linux comm name prevents cleanup from touching another helper/app.
    if (started) try { adb(['shell', 'pkill', '-9', '-x', processName], 3000); } catch { }
    try { adb(['shell', 'rm', '-f', path], 3000); } catch { }
  }
}

// Optional safe metadata-only smoke invocation. Never prints or archives the returned XML.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const started = Date.now();
  try {
    const xml = dumpHierarchy(process.argv[2] ?? 'emulator-5554', process.argv[3] ?? '/sdcard/rowan-ui-smoke.xml');
    const nodes = [...xml.matchAll(/<node\b/g)].length;
    const first = xml.match(/<node\b[^>]*>/)?.[0] ?? '';
    const rootClass = first.match(/class="([A-Za-z0-9_.$]+)"/)?.[1] ?? '';
    const bounds = first.match(/bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/)?.slice(1).map(Number) ?? [0, 0, 0, 0];
    console.log(JSON.stringify({code: 'OK', nodes, rootClass, width: bounds[2] - bounds[0], height: bounds[3] - bounds[1], elapsedMs: Date.now() - started}));
  } catch (error) { console.log(JSON.stringify({code: error instanceof AndroidUiSnapshotError ? error.code : 'SNAPSHOT_FAILED', elapsedMs: Date.now() - started})); process.exitCode = 1; }
}

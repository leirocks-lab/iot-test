// Builds only this standalone read-only helper; no Gradle, APK install, app launch or UI action.
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync, mkdirSync, existsSync, unlinkSync, copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const serial = process.argv[2] ?? 'emulator-5554';
const java = 'D:/Android/Java/jdk-17.0.20.1+1/bin/';
const sdk = 'D:/Android/Sdk';
const androidJar = join(sdk, 'platforms/android-36/android.jar');
const d8 = join(sdk, 'build-tools/36.0.0/lib/d8.jar');
const source = fileURLToPath(new URL('./RowanUiSnapshot.java', import.meta.url));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
let stage = 'arguments';
try {
  if (!/^emulator-\d+$/.test(serial)) throw new Error('EMULATOR_REQUIRED');
  const sourceSha256 = hash(source);
  const build = join(root, '.cache/refactor/android-ui-helper', sourceSha256.slice(0, 12));
  const classes = join(build, 'classes'); mkdirSync(classes, {recursive: true});
  stage = 'javac';
  execFileSync(java + 'javac.exe', ['-encoding', 'UTF-8', '--release', '8', '-classpath', androidJar, '-d', classes, source], {stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000});
  const classFiles = [];
  const collect = directory => { for (const item of readdirSync(directory, {withFileTypes: true})) { const path = join(directory, item.name); if (item.isDirectory()) collect(path); else if (item.name.endsWith('.class')) classFiles.push(path); } };
  collect(classes);
  const artifact = join(build, 'rowan-ui-export.jar');
  if (existsSync(artifact)) unlinkSync(artifact); // A single verified helper output file, no recursive deletion.
  stage = 'd8';
  execFileSync(java + 'java.exe', ['-cp', d8, 'com.android.tools.r8.D8', '--min-api', '24', '--lib', androidJar, '--output', artifact, ...classFiles.sort()], {stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000});
  const stableArtifact = join(root, '.cache/refactor/rowan-ui-export.jar'); copyFileSync(artifact, stableArtifact);
  stage = 'push';
  execFileSync(join(sdk, 'platform-tools/adb.exe'), ['-s', serial, 'push', artifact, '/data/local/tmp/rowan-ui-export.jar'], {stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000});
  console.log(JSON.stringify({code: 'OK', stage, sourceSha256, artifactSha256: hash(artifact), classFiles: classFiles.length, api: 36, minApi: 24}));
} catch {
  console.log(JSON.stringify({code: stage === 'arguments' ? 'EMULATOR_REQUIRED' : `PREPARE_${stage.toUpperCase()}_FAILED`, stage}));
  process.exitCode = 1;
}

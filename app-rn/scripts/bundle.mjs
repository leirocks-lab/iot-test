import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) {throw new Error('Expected android or ios');}
const root = fileURLToPath(new URL('../', import.meta.url));
const out = new URL(`../dist/${platform}/`, import.meta.url);
await mkdir(new URL('assets/', out), {recursive: true});
const result = spawnSync(process.execPath, ['node_modules/react-native/cli.js', 'bundle', '--platform', platform, '--dev', 'false', '--max-workers', '2', '--entry-file', 'index.ts', '--bundle-output', fileURLToPath(new URL(platform === 'ios' ? 'main.jsbundle' : 'index.android.bundle', out)), '--assets-dest', fileURLToPath(new URL('assets/', out))], {cwd: root, stdio: 'inherit'});
if (result.error) {throw result.error;}
process.exitCode = result.status ?? 1;

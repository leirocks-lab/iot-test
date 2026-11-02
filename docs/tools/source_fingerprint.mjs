import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function sourceFingerprint(projects = ['android-as', 'ios-as', 'app-rn']) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...projects], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean))].sort();
  const digest = createHash('sha256');
  for (const file of files) {
    const path = resolve(root, file);
    digest.update(file); digest.update('\0');
    digest.update(existsSync(path) ? readFileSync(path) : '<deleted>'); digest.update('\0');
  }
  return {commit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    worktreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim()),
    sourceSha256: digest.digest('hex'), sourceFiles: files.length};
}

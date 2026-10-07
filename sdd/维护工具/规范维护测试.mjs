import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tooling = await import('./规范维护.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const sha = (value) => createHash('sha256').update(value).digest('hex');
async function put(root, name, value) {
  await mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await writeFile(path.join(root, name), value, 'utf8');
}
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'rowan-specs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(root, 'docs/source.txt', 'scope baseline');
  await put(root, 'sdd/来源资料/来源登记.yaml', JSON.stringify({ sources: [{
    id: 'SRC-SCOPE-001', path: 'docs/source.txt', kind: 'file', sha256: sha('scope baseline'),
  }] }));
  await put(root, 'sdd/来源资料/范围快照.yaml', JSON.stringify({
    source_id: 'SRC-SCOPE-001', source_sha256: sha('scope baseline'),
    requirements: [{ id: 1, title: '登录', description: '建立会话', api_refs: [] }],
  }));
  await put(root, 'sdd/来源资料/待确认事项.md', '# 冲突\n\n暂无。\n');
  await put(root, 'sdd/公共规则/接口契约.yaml', '{"apis": []}\n');
  const metadata = {
    id: 'RF-0001', title: '验证码登录', domain: 'account', domain_title: '公共启动与账号', group: 'authentication', group_title: '登录认证',
    version: '0.1.0', spec_status: 'draft', delivery_status: 'unplanned',
    owners: ['傅'], updated_at: '2026-10-07', dependencies: [], requirements: [1],
    apis: [], conflicts: [], sources: [{ id: 'SRC-SCOPE-001', locator: '条目 1' }],
  };
  const featurePath = 'sdd/业务功能/公共启动与账号/登录认证/验证码登录';
  const sections = ['目标与边界', '前置条件与业务规则', '主流程与异常流程', 'UI 关联',
    'API 与数据关联', '验收标准', '依赖与待确认事项'];
  const body = sections.map((name) => `## ${name}\n\n${name === '验收标准' ?
    '- **RF-0001-AC-001**：有效验证码提交后建立会话。' : '本功能说明。'}`).join('\n\n');
  const save = async (meta = metadata, suffix = '') => put(root, `${featurePath}/功能规范.md`,
    `---\n${JSON.stringify(meta)}\n---\n\n# ${meta.title}\n\n${body}${suffix}\n`);
  await save();
  await put(root, `${featurePath}/版本记录.md`, '# 版本记录\n\n## 0.1.0 — 2026-10-07\n\n初版。\n');
  return { root, metadata, featurePath, save };
}
function requireTool(name) {
  assert.equal(typeof tooling[name], 'function', `需要实现 ${name}`);
  return tooling[name];
}

test('索引含业务层级、版本和条目；移动目录后重新生成链接', async (t) => {
  const buildIndex = requireTool('buildIndex');
  const buildCoverage = requireTool('buildCoverage');
  const f = await fixture(t);
  const first = decodeURI(await buildIndex(f.root));
  assert.match(first, /RF-0001/);
  assert.match(first, /0\.1\.0/);
  assert.match(first, /draft/);
  assert.match(first, /公共启动与账号\/登录认证\/验证码登录\/功能规范\.md/);
  await rename(path.join(f.root, f.featurePath), path.join(f.root, f.featurePath + '-改名'));
  const moved = decodeURI(await buildIndex(f.root));
  assert.match(moved, /验证码登录-改名\/功能规范\.md/);
  assert.doesNotMatch(moved, /登录认证\/验证码登录\/功能规范\.md/);
  assert.match(decodeURI(await buildCoverage(f.root)), /验证码登录-改名\/功能规范\.md/);
});

test('搜索支持功能 ID、业务名称、原始条目和 API 路径', async (t) => {
  const searchFeatures = requireTool('searchFeatures');
  const f = await fixture(t);
  f.metadata.apis = ['AUTH-04'];
  await f.save();
  await put(f.root, 'sdd/公共规则/接口契约.yaml', JSON.stringify({ apis: [{
    id: 'AUTH-04', method: 'POST', path: '/api/app/session',
  }] }));
  for (const query of ['RF-0001', '验证码', 'REQ-001', '/api/app/session']) {
    assert.equal((await searchFeatures(f.root, query)).length, 1, query);
  }
});

test('拒绝未覆盖、重复归属和范围外条目', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const f = await fixture(t);
  f.metadata.requirements = [2, 2];
  await f.save();
  const result = await validateWorkspace(f.root, { checkIndex: false });
  assert.ok(result.errors.some((s) => s.includes('范围外')));
  assert.ok(result.errors.some((s) => s.includes('未覆盖')));
  assert.ok(result.errors.some((s) => s.includes('重复')));
});

test('拒绝重复功能 ID、验收编号和不存在的依赖', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const f = await fixture(t);
  f.metadata.dependencies = ['RF-9999'];
  await f.save(f.metadata, '\n- **RF-0001-AC-001**：重复条目。');
  await put(f.root, 'sdd/业务功能/公共启动与账号/其他/功能规范.md',
    `---\n${JSON.stringify(f.metadata)}\n---\n\nRF-0001-AC-001\n`);
  const result = await validateWorkspace(f.root, { checkIndex: false });
  for (const expected of ['功能 ID 重复', '验收编号重复', '依赖不存在']) {
    assert.ok(result.errors.some((s) => s.includes(expected)), expected);
  }
});

test('拒绝来源漂移、无效本地链接和未登记 API', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const f = await fixture(t);
  f.metadata.apis = ['AUTH-99'];
  await f.save(f.metadata, '\n[不存在的页面](missing.png)\n');
  await put(f.root, 'docs/source.txt', 'changed source');
  const result = await validateWorkspace(f.root, { checkIndex: false });
  for (const expected of ['来源哈希不匹配', '本地链接不存在', 'API 未登记']) {
    assert.ok(result.errors.some((s) => s.includes(expected)), expected);
  }
});

test('索引过期时检查失败，正常初版草稿通过', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const buildIndex = requireTool('buildIndex');
  const buildCoverage = requireTool('buildCoverage');
  const f = await fixture(t);
  await put(f.root, 'sdd/功能索引.md', await buildIndex(f.root));
  await put(f.root, 'sdd/来源资料/范围覆盖.md', await buildCoverage(f.root));
  assert.deepEqual((await validateWorkspace(f.root)).errors, []);
  await put(f.root, 'sdd/功能索引.md', 'stale');
  assert.ok((await validateWorkspace(f.root)).errors.some((s) => s.includes('索引过期')));
});

test('已批准规范不能带未解决冲突；不允许循环依赖', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const f = await fixture(t);
  f.metadata.spec_status = 'approved';
  f.metadata.conflicts = ['C-001'];
  f.metadata.dependencies = ['RF-0001'];
  await put(f.root, 'sdd/来源资料/待确认事项.md', '## C-001\r\n\r\n状态：open\r\n');
  await f.save();
  const result = await validateWorkspace(f.root, { checkIndex: false });
  assert.ok(result.errors.some((s) => s.includes('已批准规范含未解决冲突')));
  assert.ok(result.errors.some((s) => s.includes('循环依赖')));
});

test('首次生成索引不被 README 对尚未生成索引的引用阻断', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const f = await fixture(t);
  await put(f.root, 'sdd/使用说明.md', '[功能索引](功能索引.md)\n');
  assert.deepEqual((await validateWorkspace(f.root, { checkIndex: false })).errors, []);
});

test('发布清单按指定提交核对版本与交付状态，不接受占位 SHA', () => {
  const validateRelease = requireTool('validateRelease');
  const feature = { id: 'RF-0001', version: '1.0.0', spec_status: 'approved',
    delivery_status: 'verified', path: '业务功能/公共启动与账号/登录认证/验证码登录/功能规范.md' };
  const release = { app_version: '1.0.0', released_at: '2026-10-07',
    spec_git_commit: 'a'.repeat(40), features: [{ id: feature.id, version: '1.0.0', path: feature.path }], changes: [] };
  assert.deepEqual(validateRelease(release, [feature]), []);
  assert.ok(validateRelease({ ...release, spec_git_commit: '<SHA>' }, [feature]).length);
  assert.ok(validateRelease(release, [{ ...feature, version: '2.0.0' }]).length);
  assert.ok(validateRelease(release, [{ ...feature, delivery_status: 'planned' }]).length);
});

test('历史发布从真实 Git 提交恢复，不因工作区规范升级而失效', async (t) => {
  const validateWorkspace = requireTool('validateWorkspace');
  const f = await fixture(t);
  f.metadata.version = '1.0.0';
  f.metadata.spec_status = 'approved';
  f.metadata.delivery_status = 'verified';
  await f.save();
  await put(f.root, `${f.featurePath}/版本记录.md`, '## 1.0.0 — 2026-10-07\n');
  const git = (args) => execFileSync(process.env.SPECS_GIT ?? 'git', args, {
    cwd: f.root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  git(['init']);
  git(['add', '.']);
  git(['-c', 'user.name=Spec Test', '-c', 'user.email=spec-test@example.invalid',
    '-c', 'core.hooksPath=', 'commit', '--no-verify', '-m', 'spec baseline']);
  const commit = git(['rev-parse', 'HEAD']).trim();
  await put(f.root, 'sdd/发布基线/应用-1.0.0/发布清单.yaml', JSON.stringify({
    app_version: '1.0.0', released_at: '2026-10-07', spec_git_commit: commit,
    features: [{ id: f.metadata.id, version: '1.0.0', path: f.featurePath.replace('sdd/', '') + '/功能规范.md' }],
    changes: [],
  }));
  f.metadata.version = '2.0.0';
  await f.save();
  await put(f.root, `${f.featurePath}/版本记录.md`, '## 2.0.0 — 2026-10-07\n');
  assert.deepEqual((await validateWorkspace(f.root, { checkIndex: false })).errors, []);
});

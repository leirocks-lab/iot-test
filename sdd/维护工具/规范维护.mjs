import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SPEC_STATES = ['draft', 'approved', 'deprecated'];
const DELIVERY_STATES = ['unplanned', 'planned', 'in_progress', 'verified', 'released'];
const SECTIONS = ['目标与边界', '前置条件与业务规则', '主流程与异常流程', 'UI 关联',
  'API 与数据关联', '验收标准', '依赖与待确认事项'];
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const posix = (value) => value.split(path.sep).join('/');
const cell = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', '<br>');
const link = (value) => encodeURI(posix(value)).replaceAll('(', '%28').replaceAll(')', '%29');
const yamlFile = async (root, name) => parse(await readFile(path.join(root, name), 'utf8'));
async function filesUnder(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesUnder(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return nested.flat().sort();
}
export function parseSpec(text, name) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${name}: 缺少 YAML frontmatter`);
  const metadata = parse(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`${name}: 元数据必须是对象`);
  }
  return { ...metadata, body: text.slice(match[0].length) };
}
export async function loadFeatures(root) {
  const names = (await filesUnder(path.join(root, 'sdd/业务功能')))
    .filter((name) => path.basename(name) === '功能规范.md');
  const features = await Promise.all(names.map(async (name) => ({
    ...parseSpec(await readFile(name, 'utf8'), name),
    path: posix(path.relative(path.join(root, 'sdd'), name)),
  })));
  return features.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
async function context(root) {
  const [features, scope, registry, contracts] = await Promise.all([
    loadFeatures(root), yamlFile(root, 'sdd/来源资料/范围快照.yaml'),
    yamlFile(root, 'sdd/来源资料/来源登记.yaml'), yamlFile(root, 'sdd/公共规则/接口契约.yaml'),
  ]);
  return { features, scope, registry, contracts };
}
function renderIndex({ features, scope, contracts }) {
  const requirements = new Map(scope.requirements.map((r) => [r.id, r]));
  const apiMap = new Map(contracts.apis.map((a) => [a.id, a]));
  const lines = ['# ROWAN App 功能索引', '',
    '> 自动生成：运行 `pnpm specs:index`。维护功能 spec 元数据，不直接编辑本文件。', '',
    `功能规范：${features.length} 份；范围条目：${requirements.size} 项；关联 API：${apiMap.size} 个。`, '',
    '功能边界以 [Excel 范围快照](来源资料/范围快照.yaml) 为准。所有初版均为待评审草稿，文档状态不代表应用已经实现。', '',
    '[资料与哈希](来源资料/来源登记.yaml) · [范围覆盖](来源资料/范围覆盖.md) · [资料冲突](来源资料/待确认事项.md) · [管理约定](规范管理/管理约定.md)', ''];
  const domains = [...new Set(features.map((f) => f.domain))];
  for (const domain of domains) {
    const selected = features.filter((f) => f.domain === domain);
    lines.push(`## ${selected[0].domain_title ?? domain} (${domain})`, '');
    for (const group of [...new Set(selected.map((f) => f.group))]) {
      const grouped = selected.filter((f) => f.group === group);
      lines.push(`### ${grouped[0].group_title ?? group ?? '功能'}`, '',
        '| 功能 ID | 功能 | 版本 | 规范状态 | 交付状态 | 优先级 | 负责人 | 原始条目 |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |');
      for (const f of grouped) {
        lines.push(`| ${f.id} | [${cell(f.title)}](${link(f.path)}) | ${cell(f.version)} | ${cell(f.spec_status)} | ${cell(f.delivery_status)} | ${cell(f.priority)} | ${cell((f.owners ?? []).join('、'))} | ${cell((f.requirements ?? []).map((id) => `REQ-${String(id).padStart(3, '0')}`).join('、'))} |`);
      }
      lines.push('');
    }
  }
  lines.push('## API 反向索引', '', '| 编号 | Method / Path | 关联功能 |', '| --- | --- | --- |');
  for (const api of contracts.apis) {
    const owners = features.filter((f) => (f.apis ?? []).includes(api.id));
    lines.push(`| ${api.id} | \`${api.method} ${api.path}\` | ${owners.map((f) => `[${f.id}](${link(f.path)})`).join('、')} |`);
  }
  lines.push('', '## 原始条目检索', '', '| 条目 | 原始业务层级 | 功能归属 |', '| --- | --- | --- |');
  for (const r of scope.requirements) {
    const owners = features.filter((f) => (f.requirements ?? []).includes(r.id));
    lines.push(`| REQ-${String(r.id).padStart(3, '0')} | ${cell([r.level1, r.level2, r.title].filter(Boolean).join(' / '))} | ${owners.map((f) => `[${f.id} ${cell(f.title)}](${link(f.path)})`).join('、')} |`);
  }
  return `${lines.join('\n')}\n`;
}
export async function buildIndex(root) { return renderIndex(await context(root)); }
function renderCoverage({ features, scope, registry }) {
  const source = registry.sources.find((s) => s.id === scope.source_id);
  const lines = ['# Excel 范围覆盖', '',
    '> 自动生成：运行 `pnpm specs:index`。条目归属仅在功能 spec 元数据中维护。', '',
    `唯一范围：[原始 Excel](${link(`../../${source.path}`)})。`, '',
    `范围快照中的 ${scope.requirements.length} 个条目必须各有且仅有一个主归属；跨功能复用通过依赖表示。`, '',
    'Store 仅导航占位，Mine 仅明确的退出与偏好入口；它们不授权额外业务。', '',
    '| 条目 | 工作表 / 行 | 原始功能层级 | 功能归属 | 处理 |', '| --- | --- | --- | --- | --- |'];
  for (const r of scope.requirements) {
    const owners = features.filter((f) => (f.requirements ?? []).includes(r.id));
    const disposition = r.id === 34 ? '占位，不开发商城' : r.id === 35 ? '仅已明确入口'
      : r.id === 109 ? '布局待定义，仅保留字段' : '范围内规范';
    lines.push(`| REQ-${String(r.id).padStart(3, '0')} | ${cell(r.sheet)} / ${cell(r.row)} | ${cell([r.level1, r.level2, r.title].filter(Boolean).join(' / '))} | ${owners.map((f) => `[${f.id} ${cell(f.title)}](${link(`../${f.path}`)})`).join('、')} | ${disposition} |`);
  }
  return `${lines.join('\n')}\n`;
}
export async function buildCoverage(root) { return renderCoverage(await context(root)); }
export async function searchFeatures(root, query) {
  if (!query?.trim()) throw new Error('搜索词不能为空');
  const { features, scope, contracts } = await context(root);
  const needle = query.toLocaleLowerCase();
  return features.filter((f) => {
    const reqs = scope.requirements.filter((r) => (f.requirements ?? []).includes(r.id));
    const apis = contracts.apis.filter((a) => (f.apis ?? []).includes(a.id));
    return [f.id, f.title, f.domain, f.domain_title, f.group, f.group_title, f.body,
      ...reqs.map((r) => `REQ-${String(r.id).padStart(3, '0')} ${r.title} ${r.description}`),
      ...apis.map((a) => `${a.id} ${a.method} ${a.path}`)]
      .join('\n').toLocaleLowerCase().includes(needle);
  }).map(({ id, title, version, path: specPath }) => ({ id, title, version, path: specPath }));
}
export function validateRelease(release, committedFeatures) {
  const errors = [];
  if (!release || !SEMVER.test(release.app_version ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(release.released_at ?? '')) {
    errors.push('发布版本或日期无效');
  }
  if (!/^[0-9a-f]{40}$/.test(release?.spec_git_commit ?? '')) errors.push('发布基线必须填写完整 Git SHA');
  if (!Array.isArray(release?.features) || !release.features.length) errors.push('发布基线不能为空');
  if (!Array.isArray(release?.changes)) errors.push('发布变更列表无效');
  const seen = new Set();
  for (const item of release?.features ?? []) {
    if (seen.has(item.id)) errors.push(`发布功能重复：${item.id}`);
    seen.add(item.id);
    const f = committedFeatures.find((feature) => feature.id === item.id && feature.path === item.path);
    if (!f || f.version !== item.version) errors.push(`发布功能路径或版本不匹配：${item.id}`);
    else if (f.spec_status !== 'approved' || !['verified', 'released'].includes(f.delivery_status)) {
      errors.push(`发布功能尚未验收：${item.id}`);
    }
  }
  return errors;
}
async function verifyReleaseCommit(root, release) {
  const sha = release.spec_git_commit;
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) return validateRelease(release, []);
  const git = process.env.SPECS_GIT ?? 'git';
  const gitRead = (args) => execFileSync(git, args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    gitRead(['cat-file', '-e', `${sha}^{commit}`]);
    const committed = [];
    for (const item of release.features ?? []) {
      if (!/^业务功能\/(?:[\p{L}\p{N}][\p{L}\p{N} 、（）()_-]*\/)+功能规范\.md$/u.test(item.path ?? '')) throw new Error('发布功能路径无效');
      const text = gitRead(['show', `${sha}:sdd/${item.path}`]);
      committed.push({ ...parseSpec(text, item.path), path: item.path });
    }
    const errors = validateRelease(release, committed);
    for (const change of release.changes ?? []) {
      if (!/^CHG-\d{8}-\d{3}$/.test(change)) errors.push(`发布变更 ID 无效：${change}`);
      else gitRead(['cat-file', '-e', `${sha}:sdd/迭代变更/变更-${change.slice(4)}/变更提案.md`]);
    }
    return errors;
  } catch (error) { return [`无法恢复发布基线 ${sha}：${error.message}`]; }
}
export async function validateWorkspace(root, { checkIndex = true, checkSources = true } = {}) {
  const errors = [];
  const warnings = [];
  let ctx;
  try { ctx = await context(root); } catch (error) { return { errors: [error.message], warnings }; }
  const { features, scope, registry, contracts } = ctx;
  const sourceMap = new Map(registry.sources.map((s) => [s.id, s]));
  const apiMap = new Map(contracts.apis.map((a) => [a.id, a]));
  const reqMap = new Map(scope.requirements.map((r) => [r.id, r]));
  if (sourceMap.size !== registry.sources.length) errors.push('来源 ID 重复');
  if (apiMap.size !== contracts.apis.length) errors.push('API ID 重复');
  if (reqMap.size !== scope.requirements.length) errors.push('范围条目 ID 重复');
  if (scope.source_sha256 !== sourceMap.get(scope.source_id)?.sha256) errors.push('范围快照与来源登记哈希不一致');
  const allowedApis = new Set(scope.requirements.flatMap((r) => r.api_refs ?? []));
  for (const a of contracts.apis) if (!allowedApis.has(a.id)) errors.push(`范围外 API：${a.id}`);
  const ids = new Set();
  const acIds = new Set();
  const ownership = new Map();
  let conflictText = '';
  try { conflictText = (await readFile(path.join(root, 'sdd/来源资料/待确认事项.md'), 'utf8')).replaceAll('\r\n', '\n'); }
  catch { errors.push('缺少资料冲突记录'); }
  for (const f of features) {
    const label = `${f.id ?? '?'} (${f.path})`;
    if (!/^RF-\d{4,}$/.test(f.id ?? '')) errors.push(`${label}：功能 ID 无效`);
    if (ids.has(f.id)) errors.push(`功能 ID 重复：${f.id}`);
    ids.add(f.id);
    if (!f.title || !SEMVER.test(f.version ?? '')) errors.push(`${label}：名称或版本无效`);
    if (!SPEC_STATES.includes(f.spec_status) || !DELIVERY_STATES.includes(f.delivery_status)) errors.push(`${label}：状态无效`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.updated_at ?? '') || Number.isNaN(Date.parse(f.updated_at))) errors.push(`${label}：日期无效`);
    for (const key of ['owners', 'dependencies', 'requirements', 'sources', 'apis', 'conflicts']) {
      if (!Array.isArray(f[key])) errors.push(`${label}：${key} 必须是数组`);
    }
    const parts = f.path.split('/');
    if (parts[1] !== (f.domain_title ?? f.domain) || (f.group && parts[2] !== (f.group_title ?? f.group))) errors.push(`${label}：业务层级与目录不一致`);
    if (!(f.requirements ?? []).length) errors.push(`${label}：缺少范围归属`);
    for (const id of f.requirements ?? []) {
      if (!reqMap.has(id)) errors.push(`${label}：范围外条目 ${id}`);
      const owners = ownership.get(id) ?? [];
      owners.push(f.id); ownership.set(id, owners);
      const requirement = reqMap.get(id);
      if (requirement?.owner && !(f.owners ?? []).includes(requirement.owner)) errors.push(`${label}：负责人遗漏 ${requirement.owner}`);
    }
    for (const s of f.sources ?? []) if (!sourceMap.has(s.id) || !s.locator?.trim()) errors.push(`${label}：来源未登记或定位为空 ${s.id}`);
    if (!(f.sources ?? []).some((s) => s.id === scope.source_id)) errors.push(`${label}：缺少 Excel 范围来源`);
    for (const id of f.apis ?? []) if (!apiMap.has(id)) errors.push(`${label}：API 未登记 ${id}`);
    const needed = new Set((f.requirements ?? []).flatMap((id) => reqMap.get(id)?.api_refs ?? []));
    for (const id of needed) if (!(f.apis ?? []).includes(id)) errors.push(`${label}：遗漏范围条目 API ${id}`);
    const localAcs = [...f.body.matchAll(/\*\*(RF-\d{4,}-AC-\d{3,})\*\*/g)].map((m) => m[1]);
    if (!localAcs.length) errors.push(`${label}：缺少验收标准`);
    for (const id of localAcs) {
      if (!id.startsWith(`${f.id}-AC-`)) errors.push(`${label}：验收编号归属错误 ${id}`);
      if (acIds.has(id)) errors.push(`验收编号重复：${id}`);
      acIds.add(id);
    }
    for (const heading of SECTIONS) if (!f.body.includes(`## ${heading}`)) errors.push(`${label}：缺少 ${heading}`);
    for (const conflict of f.conflicts ?? []) {
      const chunk = conflictText.split(`## ${conflict}\n`)[1]?.split('\n## ')[0];
      if (!chunk) errors.push(`${label}：冲突未登记 ${conflict}`);
      else if (f.spec_status === 'approved' && /状态：open/.test(chunk)) errors.push(`${label}：已批准规范含未解决冲突 ${conflict}`);
    }
    try {
      const changelog = await readFile(path.join(root, 'sdd', path.dirname(f.path), '版本记录.md'), 'utf8');
      if (!changelog.includes(`## ${f.version} `)) errors.push(`${label}：当前版本未记入变更记录`);
    } catch { errors.push(`${label}：缺少 版本记录.md`); }
  }
  for (const id of reqMap.keys()) if (!ownership.has(id)) errors.push(`范围条目未覆盖：${id}`);
  for (const [id, owners] of ownership) if (owners.length > 1) errors.push(`范围条目重复归属：${id} → ${owners.join(', ')}`);
  const byId = new Map(features.map((f) => [f.id, f]));
  const visited = new Set(); const visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`循环依赖：${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id)?.dependencies ?? []) {
      if (!byId.has(dep)) errors.push(`依赖不存在：${id} → ${dep}`); else visit(dep);
    }
    visiting.delete(id); visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  if (checkSources) for (const s of registry.sources) {
    try {
      if (s.kind === 'directory') {
        const actualFiles = (await filesUnder(path.join(root, s.path))).map((name) => posix(path.relative(root, name)));
        if (JSON.stringify(actualFiles) !== JSON.stringify(s.files.map((f) => f.path).sort())) errors.push(`来源目录文件集合变化：${s.id}`);
        const entries = [];
        for (const file of s.files) {
          const actual = hash(await readFile(path.join(root, file.path)));
          if (actual !== file.sha256) errors.push(`来源哈希不匹配：${file.path}`);
          entries.push(`${file.path}\0${actual}\n`);
        }
        if (hash(entries.sort().join('')) !== s.sha256) errors.push(`来源哈希不匹配：${s.id}`);
      } else if (hash(await readFile(path.join(root, s.path))) !== s.sha256) errors.push(`来源哈希不匹配：${s.id}`);
    } catch (error) { errors.push(`来源不可读取：${s.id} (${error.message})`); }
  }
  const markdownFiles = (await filesUnder(path.join(root, 'sdd'))).filter((name) => name.endsWith('.md')
    && !posix(name).includes('/规范模板/') && !['功能索引.md', '范围覆盖.md'].includes(path.basename(name)));
  for (const name of markdownFiles) {
    const text = await readFile(name, 'utf8');
    const withoutCode = text.replace(/```[\s\S]*?```/g, '');
    for (const match of withoutCode.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
      const target = match[1] ?? match[2];
      if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
      const resolved = path.resolve(path.dirname(name), decodeURIComponent(target.split('#')[0]));
      if (!checkIndex && [path.join(root, 'sdd/功能索引.md'), path.join(root, 'sdd/来源资料/范围覆盖.md')].includes(resolved)) continue;
      try { await stat(resolved); }
      catch { errors.push(`本地链接不存在：${posix(path.relative(root, name))} → ${target}`); }
    }
  }
  if (checkIndex) {
    try { if (await readFile(path.join(root, 'sdd/功能索引.md'), 'utf8') !== renderIndex(ctx)) errors.push('索引过期：运行 pnpm specs:index'); }
    catch { errors.push('缺少 功能索引.md：运行 pnpm specs:index'); }
    try { if (await readFile(path.join(root, 'sdd/来源资料/范围覆盖.md'), 'utf8') !== renderCoverage(ctx)) errors.push('范围覆盖报告过期：运行 pnpm specs:index'); }
    catch { errors.push('缺少 范围覆盖.md：运行 pnpm specs:index'); }
  }
  for (const name of (await filesUnder(path.join(root, 'sdd/发布基线'))).filter((n) => path.basename(n) === '发布清单.yaml')) {
    try { errors.push(...await verifyReleaseCommit(root, parse(await readFile(name, 'utf8')))); }
    catch (error) { errors.push(`发布清单无效：${error.message}`); }
  }
  const drafts = features.filter((f) => f.spec_status === 'draft').length;
  if (drafts) warnings.push(`${drafts} 份草稿待业务评审；检查通过不等于规范批准或功能交付。`);
  return { errors, warnings, featureCount: features.length, requirementCount: reqMap.size, apiCount: apiMap.size };
}
async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const [command, ...args] = process.argv.slice(2);
  if (command === 'index') {
    const result = await validateWorkspace(root, { checkIndex: false });
    if (result.errors.length) throw new Error(result.errors.join('\n'));
    await writeFile(path.join(root, 'sdd/功能索引.md'), await buildIndex(root), 'utf8');
    await writeFile(path.join(root, 'sdd/来源资料/范围覆盖.md'), await buildCoverage(root), 'utf8');
    console.log(`已生成索引：${result.featureCount} 个功能 / ${result.requirementCount} 个条目 / ${result.apiCount} 个 API`);
  } else if (command === 'check') {
    const result = await validateWorkspace(root);
    for (const warning of result.warnings) console.log(`提示：${warning}`);
    if (result.errors.length) throw new Error(result.errors.join('\n'));
    console.log(`检查通过：${result.featureCount} 个功能 / ${result.requirementCount} 个条目 / ${result.apiCount} 个 API`);
  } else if (command === 'search') {
    const matches = await searchFeatures(root, args.join(' '));
    console.log(matches.map((f) => `${f.id}\t${f.title}\t${f.version}\t${f.path}`).join('\n') || '无匹配功能');
  } else throw new Error('用法：node sdd/维护工具/规范维护.mjs <index|check|search 搜索词>');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

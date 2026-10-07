# ROWAN App 需求与开发执行规则

本文件适用于仓库中的所有新增、修改、删除或停用需求，以及改变业务行为、接口契约、交互规则或验收结果的实现与缺陷修复。每次必须执行下述 SDD 流程，不得先修改业务代码再补需求文档。纯格式调整、工具维护等不涉及需求的工作，不强制创建功能变更包。

## 范围与规范入口

- [项目计划与需求范围](<docs/智能家居物联网项目计划&需求范围（补充API关联及开发人员）.xlsx>) 是唯一业务范围依据。产品文档、UI 和流程图只补充范围内细节，不授权新增功能。
- 范围外需求先记录差异和待确认事项；获得用户明确授权并更新范围依据后，才能进入实现。不得通过修改快照或哈希绕过范围限制。
- 开始任务前阅读 [SDD 使用说明](<sdd/使用说明.md>)、[管理约定](<sdd/规范管理/管理约定.md>)、[功能索引](<sdd/功能索引.md>) 和相关功能、依赖、来源及待确认事项。
- `sdd/业务功能/` 保存功能规范，功能元数据是索引的唯一维护入口。`sdd/迭代变更/` 保存一次变更的执行上下文。
- SDD 内的文件夹和文件名称使用中文；根目录保留 `sdd`，稳定 ID、API 标识、YAML 字段及标准扩展名保留原值。

## 业务功能规范必须先进行 GrillMe 问询

新增、修改或重新生成 `sdd/业务功能/` 下的规范时，必须先使用 `engineering-suite-grill-me:grill-me` 进行需求问询，再执行下述 SDD 流程。用户明确要求跳过时，记录其指令及适用范围；不得自行以资料齐全为由省略问询。

- 技能入口：[grill-me](<C:/Users/Leon/.codex/plugins/cache/openai-curated-remote/engineering-suite-grill-me/2.0.0/skills/grill-me/SKILL.md>)；读取插件入口的路由规则及实际依赖的 `grilling`；仓库场景按路由使用 `grill-with-docs` 和 `domain-modeling`。技能路径不可用时先查找已安装副本，不假装已执行。
- 先核对 Excel、关联 UI、产品/API 文档、流程图、现有规范及实现。事实自行查证；仅将资料未决定的业务选择、矛盾或边界提交用户问询，不要求用户重复提供可读取的信息。
- 将决策按依赖关系组织成设计树。每轮询问当前前置条件已确定的问题，编号并给出建议及理由；等待实际回答后再进入下一轮。建议、沉默和超时均不构成确认。
- 用户明确授权“直接采纳建议”时，可在授权业务范围内执行自动采纳问询：仍逐功能记录问题、建议、理由和依赖轮次，将决定标为“依据用户批量授权采纳”，无需逐题等待或重复确认。必须记录用户原话、日期及范围，不伪造逐题回答；协议字段、接口能力、资料缺失和范围外功能不能靠批量采纳变为事实。该模式仅适用于相应授权，不默认延续到之后的新需求。
- 每个变更包增加中文文件 `需求问询.md`，记录范围、已核实事实及来源、决策树、每轮问题与建议、用户实际回答、待确认项和最终共同理解确认。用户回答及时写入，不编造决定、确认人或确认时间。
- 问询形成共同理解后，向用户展示最终决策及残余限制，并取得明确确认，再重新生成或批准目标规范。未确认的分支保持待确认；可维护问询记录和草稿，但不得将建议写成已冻结行为或直接实施。
- 自动采纳模式下，用户对建议的明确批量授权作为本轮业务决策与规范生成依据；最终记录完整决策和残余技术限制即可，不再次索要同一授权。接口缺口仍保持待确认，规范批准、真实实现、验收及发布条件保持原要求。
- 已确认业务术语及时同步 `sdd/规范管理/业务术语.md`；业务决策及理由记录在变更包，避免创建重复的术语或需求事实源。
- 只重新生成用户指定业务范围；其他业务规范保留，依赖只引用。不得删除其他功能以绕过范围覆盖，也不得因首页入口而扩展商城、Mine、设备控制或添加设备范围。
- 最终规范关联问询记录与 CHG，保留稳定 RF/AC 编号，同步功能版本、版本记录、索引及检查结果。文档问询完成不等于功能已实现或验收通过。

## 每次需求变更必须执行的流程

1. **定位与核对范围**：检索受影响 RF 功能、REQ 原始条目、API、UI、依赖和冲突。执行上节 GrillMe 问询并记录确认依据。明确变化前后的行为及可观察结果；没有来源的行为标为待确认，不写成已批准要求。
2. **建立变更包**：使用 [规范模板](<sdd/规范模板/>) 创建 `sdd/迭代变更/变更-YYYYMMDD-NNN/`，分配唯一 `CHG-YYYYMMDD-NNN`。同一次跨功能变更共用一个变更包。
3. **填写变更提案.md**：写目标、范围、功能 ID、原始条目、版本变化、规范差异、关联验收 ID、影响与待确认事项；记录用户指令或其他实际确认依据。已有明确授权无需重复询问，涉及未授权范围或未解决的业务冲突时先确认相关内容。
4. **填写实施计划.md 与任务清单.md**：记录技术方案、接口和数据变化、兼容性、依赖、测试方案；每个业务实现任务引用 RF 和对应 AC 编号，明确完成条件。
5. **先更新目标规范**：需求确认后、实现前更新 `功能规范.md` 的业务规则、流程、UI/API 关联和验收标准，调整版本、日期及 `版本记录.md`，关联 CHG。新增功能使用模板，分配全局递增且不复用的 RF ID，并登记范围条目的唯一主归属。未解决的冲突保持 draft；只有有实际确认依据且满足管理约定才能设置 approved。
6. **按规范实现与验证**：按任务清单实施，逐条验证受影响 AC；记录平台、环境、输入、操作、预期、实际结果和证据。发现新需求或行为差异时，回到提案和规范更新步骤，不擅自扩大实现范围。
7. **同步索引与检查**：执行下述必需命令；修改维护工具时还须执行工具测试。修复检查失败后重新验证，不以文档检查替代业务验收。
8. **记录交付结果**：更新任务勾选、验收证据、交付状态和实施提交（如已存在）。只有真实验收通过才能标为 verified；未完成项写明阻塞和后续动作，不虚报交付。
9. **实际发布时建立基线**：使用发布模板记录实际 App 版本、日期、已提交的完整规范 Git SHA、实际交付的功能版本和关联 CHG；确保规范及必要来源可由该提交恢复。没有实际发布时不创建虚假发布清单，也不标为 released。

## 必需检查与版本规则

在仓库根目录执行：

```bash
pnpm specs:index
pnpm specs:check
```

修改 `sdd/维护工具/` 时额外执行：

```bash
pnpm specs:test
```

业务代码还须执行与变更相符的测试，并在任务清单记录结果。命令无法执行时记录原因及未验证内容，不宣称检查通过。

- MAJOR：不兼容的业务行为、接口或验收变化；MINOR：兼容新增能力或场景；PATCH：不改变行为和验收结果的文字或引用修正。
- 功能 ID 和验收 ID 保持稳定；改名、移动目录不重新编号。变更规范须同步版本记录，不复制多套历史规范文件。
- 规范状态 `draft / approved / deprecated` 与交付状态 `unplanned / planned / in_progress / verified / released` 分开维护。
- 索引及范围覆盖通过命令生成；不得手工维护重复功能清单。来源变化必须核对实际差异后更新登记、快照及关联规范。

## 完成标准

需求变更只有在变更包、目标规范、版本记录、索引、检查结果及相应验收证据一致时，才能报告完成。最终回复说明受影响的 RF/CHG、规范版本、实际验证结果和剩余待确认项。仅编写需求时如实报告规范完成程度，不报告业务已实现。

子目录的代理指引继续适用；所有业务需求工作仍须遵守本文件的 SDD 流程。用户的明确指令优先；若明确要求例外，在变更包记录例外范围和依据，不自行跳过流程。

# Expo 单项目开发规则

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md


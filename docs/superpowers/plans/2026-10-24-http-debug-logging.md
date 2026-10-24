# HTTP Debug Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 为现有真实和 Mock HTTP 客户端提供可关联、可关闭且脱敏的控制台调试日志。

**Architecture:** HttpDiagnostics 负责快照、日志级别和请求生命周期；FetchHttpClient 捕获传输及解析，RealHttpClient 在相同生命周期内适配原始返回；LoggedHttpClient 包装 Mock。runtime 依据公共配置统一注入。

**Tech Stack:** TypeScript、现有 Logger/HttpClient 接口、Vitest、Expo SDK 57 配置 extra。

**Spec:** ../specs/2026-10-24-http-debug-logging-design.md

## Global Constraints

- 不新增依赖，不修改业务规范，不上传日志。
- 保持原有请求内容、路由、错误身份、204 和取消行为。
- off/error/debug；development/preview 默认 debug，production 默认 off。
- 先脱敏后截断，关闭日志不遍历对象。

## Review Focus

- URL 路径/query、嵌套响应中的密码与 Token。
- 日志本身抛错时请求继续正常完成。
- HTTP 200 中 code 非零或 success=false。
- 解析/适配失败不误报网络错误，不重复读取流。
- 并发请求、登录与刷新各有可关联请求 ID。

## Task 1: 日志核心与传输接入

- [x] 在 src/services/http-logging.test.ts 先覆盖上述行为，运行失败测试。
- [x] 新建 src/services/http-logging.ts，实现 HttpDiagnostics、LoggedHttpClient、ConsoleLogger 与安全快照。
- [x] 修改 http.ts 和 real-http.ts，注入 HttpDiagnostics，真实请求传递逻辑路径、目标和响应适配函数。
- [x] 运行日志及已有 HTTP 测试。

## Task 2: 应用装配、配置及交付验证

- [x] 先覆盖默认开关与非法配置测试，再修改 config.ts、runtime.ts、app.config.ts。
- [x] 更新 .env.example 和 README.md，说明日志格式、开关、脱敏限制与查看方法。
- [x] 运行 pnpm test、pnpm lint、pnpm typecheck、pnpm specs:index、pnpm specs:check；结果见下文，不表示所有检查通过。
- [x] 代码审查，修复真实问题，记录验证结果。保留 worktree 供用户审阅，不合并或发布。

## Execution ledger

- 原工作区存在未提交的业务/协议改动，不复制。基线 fb44fdd。
- 应用 managed worktree 注册停留 creating，attach 无法验证归属；改用仓库内独立 worktree，原工作区通过本地 exclude 忽略 .worktrees。
- 独立 worktree 从本机缓存安装锁定依赖；未调整依赖清单。
- 缓存缺少 masked-view 的锁定 tarball，联网补齐后安装成功；没有新增或升级依赖。
- 初始 HTTP 基线 31 项通过；新增日志模块测试先失败（模块不存在），再实现。
- 日志分类读取响应 getter 的回归先失败，再用属性描述符读取修复；相对路径 query/编码邮箱泄露回归先失败，再统一解析相对 URL 和逐路径段解码修复。
- 独立审查（requesting-code-review）提出相对 query 和编码邮箱两项问题，修复后复审无剩余可操作发现。
- 最终完整测试 `pnpm test --silent --maxWorkers=2 src/services/http-logging.test.ts src/services/http-logging-runtime.test.ts`：Vitest 因脚本固定传入 src 实际运行全量，44 文件 / 661 项通过。最初与 lint/typecheck 并行的全量运行遇到一个 MQTT 短定时超时；降低并发后全量通过，未修改协议代码。
- `pnpm lint`：清理测试文件重复导入及空对象类型后通过，0 错误、0 警告。
- `pnpm typecheck`：9 项已有样式错误，位于 src/app/(tabs)/_layout.tsx 和 src/components/Loading.tsx。用 TypeScript compiler host 将本次改动文件虚拟还原到 HEAD、排除新增日志文件后，得到同样 9 项错误；日志改动未新增类型诊断。
- `pnpm specs:index`、`pnpm specs:check`：均未通过，已有历史变更包链接缺失及平台/物联网 OpenAPI、MQTT 快照缺失。未伪造来源或改写规范以通过检查。本次没有 SDD 文件变化，无 RF/CHG/规范版本调整。
- Mock 和构造 fetch 的装配测试覆盖公共配置到 runtime、真实双模块请求、Mock 登录/刷新和错误级别过滤。未连接实际后台或真机，不报告真实平台验收。

# 手机悬浮日志控制台实施计划

> 按 superpowers:executing-plans 在当前会话实施，用户已确认方案及隐藏规则。

**目标：** 开发版 App 内查看、筛选、复制日志并可隐藏入口。

**架构：** 独立的有界内存 store 采集 console，组件订阅批量通知。根布局通过 `__DEV__` 条件加载，开发菜单恢复隐藏入口。

**技术：** Expo 57、React Native 0.86、React 19、Vitest、expo-clipboard。

**设计：** [设计说明](../specs/2026-10-25-floating-console-design.md)。

## 全局约束

- 保留电脑 console 输出，异常采集不影响业务，不持久化、不上传。
- 最多 500 条，每条 8192 字符，通知间隔 200ms。
- 发布构建不加载面板或安装采集器。
- 不修改产品业务规范及 RF/CHG。

## 审查重点

- HTTP 已格式化 JSON 和直接 console 对象都应脱敏，不读取 getter。
- 隐藏后无悬浮按钮，开发菜单及重启可恢复。
- 拖动不误触开面板，旋转后按钮仍在屏幕内。
- 高流量日志与错误订阅不影响 console、请求或列表滚动。
- Fast Refresh 不重复包装 console；剪贴板不可用给出提示。

## 任务 1：有界日志采集

- [x] 新建 `src/components/debug-console/log-store.test.ts`：覆盖容量/截断、脱敏及循环、过滤导出、批量通知、坏订阅、可见状态、原 console 行为和重复安装。
- [x] 运行新测试，确认缺少实现导致失败。
- [x] 新建 `log-store.ts`：提供 `createLogStore()`、`installConsoleCapture()`、`filterLogs()`、`exportLogs()`；复用 diagnosticSnapshot。
- [x] 重跑测试并确认通过。

## 任务 2：悬浮 UI 与开发菜单

- [x] 使用 `expo install expo-clipboard` 安装 SDK 匹配模块。
- [x] 新建 `FloatingConsole.tsx`：安全区域内拖动、Modal 面板、虚拟列表、筛选搜索、复制反馈、收起隐藏。
- [x] 在根布局通过 `__DEV__` 按需加载组件，初始化采集及开发菜单一次。
- [x] 更新 README 使用方法、隐藏恢复、原生模块构建要求和能力边界。

## 任务 3：验证与交付

- [x] 运行相关/全量测试、lint、typecheck、specs:index、specs:check（实际结果见下文，并非全部通过）。
- [x] 审查 diff，检查发布构建隔离和 UI 可访问性；记录真机未验证项。
- [x] 更新本计划的验证结果，保留改动供用户审查。

## 执行记录

2026-10-25，Windows、Node 24.10.0、pnpm 11.19.0。

- RED：首次正常测试确认缺少 `./log-store` 而失败；实现后发现并修正 `[HTTP]` 标题影响多行 JSON 脱敏识别的问题。
- 相关测试：`pnpm exec vitest run src/components/debug-console src/services/http-logging.test.ts src/protocol/mqtt-logging.test.ts` 首轮 42/42 通过；随后新增数组 getter 回归。
- 独立审查：只读 reviewer 审查所有改动，发现共享脱敏器数组 `slice/map` 会执行索引 getter。新增回归测试观察到 getter 被调用一次（RED），改用最多 30 个元素的属性描述符读取；全量回归覆盖此修复（GREEN）。无其他重要审查发现。
- `pnpm exec vitest run src --maxWorkers=2`：41 个文件、518 项全部通过。首次默认并发 `pnpm test` 为 515/517，两个设备会话短超时；原文件单独复跑 30/30，通过限制测试并发完成全量复验，没有修改设备会话实现或测试。
- `pnpm lint`：退出码 0，0 错误、12 条既有未使用导入/变量警告。根布局的条件 require 用于 release 消除；PanResponder 的 refs 规则误判以单行注释说明（API 存储事件回调，不在创建时读取 ref）。
- `pnpm typecheck`：未通过。剩余 6 处报错均位于未修改的 `src/services/device-ota.test.ts`（product/device/taskID 类型）和 `src/services/password-recovery.test.ts`（泛型 mock 返回类型）；新模块及根布局无类型报错。
- `pnpm specs:index`、`pnpm specs:check`：未通过，现有 package scripts 的中文路径乱码。补跑实际 `node sdd/维护工具/规范维护.mjs index` 与 `check` 仍失败：缺少三份登记来源（平台 OpenAPI、IoT OpenAPI、MQTT 快照）、多处既有历史变更包链接缺失，索引过期。未更改业务规范、来源登记或范围快照以绕过检查。
- `git diff --check`、修改文件的 Prettier 检查通过。
- Web 手工界面验证（本地 Expo 开发服务、1280×720）：LOG 点击展开、关键词无匹配/有匹配、关键词与级别组合、清空、收起保留按钮、完全隐藏移除按钮、刷新恢复入口、按钮从右侧拖动至左上且不误打开面板，均观察到预期结果。面板截图已目视检查。
- 现有运行配置仍设置旧 mock 通信模式，应用初始化显示迁移错误；日志面板可在初始化失败时工作。未修改 `.env.local` 或通信配置。
- 未验证：Android/iOS 真机拖动/安全区域/返回键、设备开发菜单入口及原生剪贴板、生产完整打包。ADB 在本机未能启动服务；开发菜单注册与 release 不安装捕获已由单元测试验证。新增 expo-clipboard 需要重建开发客户端；旧客户端复制失败会显示提示。
- 保留所有改动供用户审查，未提交、未推送、未发布。

## 提交前复验（2026-10-25）

用户指令：提交代码并推送到远程。

- `pnpm exec vitest run src --maxWorkers=2`：正常环境退出码 0，41 个文件、518 项通过。首次沙箱执行因临时文件 rename EPERM 无法加载测试，改在正常环境复验。
- `pnpm typecheck`：退出码 2；仍为未修改的 device-ota.test.ts 和 password-recovery.test.ts 中 6 处既有类型错误。
- `pnpm specs:index`、`pnpm specs:check`：退出码 1，package scripts 中文路径乱码。直接运行实际维护脚本 index/check 亦退出码 1，缺少登记来源、历史链接及索引过期；未改写来源或规范绕过检查。
- `pnpm lint`：沙箱与正常环境均长时间没有返回，已中止；本轮不声称 lint 通过。
- `git diff --check` 及暂存差异检查：通过。
- Android 模拟器验证仍以证据目录中的记录为准，待验证项未视为通过；本次未发布。

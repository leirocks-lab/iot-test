# ROWAN 原生 + React Native 重构

`refactor` 是原生 + RN 架构重构分支。iOS 和 Android 原生应用负责全局页面及平台服务，RN 承载从首页设备列表进入后的整个设备子流程。

## 目录

| 目录 | 职责 | 当前状态 |
| --- | --- | --- |
| `docs/` | 业务范围、原始资料、SDD、迁移计划和验收证据 | 保留原有资料，新增 SDD |
| `android-as/` | Android 原生宿主、原生业务页面和平台服务 | 目录及说明已建立，原生工程待建设 |
| `ios-as/` | iOS 原生宿主、原生业务页面和平台服务 | 目录及说明已建立，原生工程待建设 |
| `app-rn/` | 共享 RN 设备项目、资源及相关工具 | 现有 Expo/RN 工程已整体迁入，尚未裁剪旧页面 |

根目录保留 Git、编辑器及代理规则等仓库配置；四个目录是业务资料与源码的正式入口。本次目录整理不代表混合架构、原生应用或动态发布系统已经实现。

## 方案与业务范围

- [原生与 RN 混合架构重构方案](docs/SDD/2026-11-01-原生与RN混合架构重构方案.md)
- [目录迁移实施计划](docs/SDD/2026-11-01-目录迁移实施计划.md)
- [SDD 索引](docs/SDD/README.md)
- [唯一业务范围依据](<docs/智能家居物联网项目计划&需求范围（补充API关联及开发人员）.xlsx>)

设备子流程包含控制、更多、设备内分享、定时和固件升级页面；首页、添加设备列表、扫码、配网、我的及全局设置采用原生。底层账号、设备通信、配网及升级任务由原生服务统一管理。

## RN 开发与验证

所有 RN 命令在 `app-rn/` 执行：

```powershell
cd app-rn
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:config
pnpm verify:runtime
```

也可以在仓库根目录执行 `pnpm --dir app-rn lint` 等命令。根目录不是 Node 应用根目录，不增加根级 package.json 或 pnpm 工作区。

现有 RN 工程说明见 [app-rn/README.md](app-rn/README.md)。迁移前生成的 Android 工程仅保留在本机 `app-rn/android/`，不是 `android-as/` 原生宿主。迁移前原生构建缓存可能包含旧绝对路径，后续构建需按对应工程重新生成或清理；不将旧缓存视为可交付源码。

后续正式维护的 `android-as/`、`ios-as/` 必须提交源码并独立可构建，不得由 RN 工程的 `prebuild --clean` 覆盖。

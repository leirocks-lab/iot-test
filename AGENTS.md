# ROWAN 原生 + RN 开发规则

## 业务范围

- [项目计划与需求范围](<docs/智能家居物联网项目计划&需求范围（补充API关联及开发人员）.xlsx>) 是唯一业务范围依据。产品文档、UI 和流程图只补充范围内细节，不授权新增功能。
- 范围外需求先记录差异和待确认事项；获得用户明确授权并更新范围依据后，才能进入实现。
- 本轮已授权 refactor 分支、四目录整理及方案保存，不代表全部原生重写或发布平台实现已获授权。

## 架构与目录

- `docs/`：原始资料、需求范围、SDD、计划和验收证据；架构方案见 [SDD](docs/SDD/2026-11-01-原生与RN混合架构重构方案.md)。
- `android-as/`：Android 原生宿主、页面及平台服务，正式源码纳入 Git。
- `ios-as/`：iOS 原生宿主、页面及平台服务，正式源码纳入 Git。
- `app-rn/`：共享 RN 项目；当前保留完整旧工程作迁移基线，最终只承载设备子流程。
- RN 页面包括从首页设备列表进入后的控制、更多、设备内分享、定时及固件升级。首页、账号、添加设备列表、扫码、配网、我的、房间及全局设置采用原生。
- 原生统一管理全局导航、账号及安全存储、设备通信、权限、配网、升级任务、RN 容器和资源包。
- RN 与原生通过版本化契约通信，不各自维护登录态或互相争抢设备会话。

## 工程与命令

- RN 安装、启动、检查和导出在 `app-rn/` 执行，使用其 package.json 与 pnpm-lock.yaml；例如 `pnpm --dir app-rn lint`。
- RN 具体规则见 [app-rn/AGENTS.md](app-rn/AGENTS.md)。修改 Expo、EAS 或 RN API 前，读取 app-rn/package.json 并查阅匹配版本的官方文档，不从记忆实现。
- 全局导航由原生管理；Expo Router 仅用于 RN 内部导航和迁移期旧工程。
- `android-as/`、`ios-as/` 不由 Expo prebuild 管理，禁止用 `prebuild --clean` 覆盖。
- `app-rn/android/`、`app-rn/ios/` 是 Expo 生成内容，原生行为仍通过 app-rn/app.config.ts、Config Plugin 或 Expo Module 配置。
- 原生构建工具链和第三方 SDK 需在技术验证后锁定，未建宿主时不能宣称原生编译通过。
- 完成 RN 相关变更前运行 `pnpm --dir app-rn lint` 和 `pnpm --dir app-rn typecheck`；按改动执行相关测试和配置检查。
- 测试或 Bundle 导出成功不等于双端签名构建、真机通信或完整业务验收通过。

## 文档与交付

- SDD 保存于 docs/SDD；历史资料保留日期、限制和结论，不因目录迁移改写验收状态。
- 凭据及私钥不提交，构建依赖、锁文件、脚本及非秘密配置须完整交付。

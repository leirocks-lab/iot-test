# ROWAN IoT App

ROWAN 移动端工程基于 Expo Development Build、React Native 新架构、Expo Router、TypeScript 和 pnpm 单项目。当前版本提供可验证的工程底座，不包含登录、配网、MQTT、OTA 或正式设备控制功能。

## 环境要求

- Node.js 22.13 或更高版本
- pnpm 11 或更高版本
- Git
- Android：Android Studio、Android SDK、JDK 17，以及模拟器或开启 USB 调试的真机
- iOS：macOS、Xcode 和 CocoaPods；Windows 不能执行本地 iOS 编译

安装 pnpm：

```bash
npm install --global pnpm@11.19.0
```

安装项目依赖：

```bash
pnpm install
```

## 目录结构

```text
src/app                  Expo Router 页面与导航布局
src/config/brand         品牌、构建环境与应用标识
src/theme                主题和设计令牌
src/lib/core             日志、错误、HTTP 接口
src/lib/iot              设备状态、命令与连接接口
src/components/device    设备控制组件属性接口
assets                   图片、图标等静态资源
scripts                  工程维护与验证脚本
tests                    工程工具测试
docs                     原始需求与设计资料
sdd                      功能规范、变更与验收证据
app.config.ts            Expo、原生及构建配置
package.json             唯一应用清单与命令入口
pnpm-lock.yaml           单项目依赖锁文件
tsconfig.json            继承 Expo 的 TypeScript 配置
```

仓库根目录即 Expo 应用根目录，所有安装、开发、构建及检查命令均在根目录执行。项目使用 pnpm 管理单个应用，不使用工作区包或独立内部包。pnpm 11 的 `pnpm-workspace.yaml` 仅保存本项目安装设置和 esbuild 构建许可，不含 `packages` 或工作区包定义。通过 `@/*` 导入 `src` 模块；`app.config.ts` 注册 `tsx/cjs` 后使用相对路径导入 TypeScript 品牌配置。

`src/app` 只保存路由与布局，非路由组件、hooks、业务实现放在其外。随着已确认功能实现，按需增加 `src/features`、`src/hooks` 等目录。品牌与主题已接入应用；core、iot、device 目前仍是接口和类型占位，不代表正式业务功能已实现。

应用包和 Expo 配置的版本均为 `1.0.0`，SDD 功能版本单独管理。`node_modules`、`.expo`、`dist`、`android` 和 `ios` 是安装或生成内容，由根目录 `.gitignore` 忽略。原生配置通过 `app.config.ts`、Config Plugin 或 Expo Module 维护。

迁移前的本地生成工程和缓存保留在 `.codex-tmp/单项目迁移-20261007`，仅供恢复或排查，正式命令使用当前根目录配置。首次原生运行请从根目录重新生成和构建 Development Build。

## 业务规范与 SDD

业务规范入口为 [sdd/使用说明.md](<sdd/使用说明.md>)，功能导航为 [sdd/功能索引.md](<sdd/功能索引.md>)。功能范围仅以补充 API 及开发人员的 Excel 为准，UI、产品文档和流程图只补充范围内细节。

```bash
pnpm specs:index
pnpm specs:check
pnpm specs:search RF-0020
pnpm specs:test
```

规范、交付和 App 发布分别记录状态；初版草稿不代表功能已经实现。后续迭代通过 `sdd/迭代变更/` 记录规范差异、实施任务和验收证据。

## Development Build

开发/测试环境（`APP_ENV=development` 或 `preview`）的真实业务 API 支持 HTTP/HTTPS；`production` 正式交付只支持 HTTPS，平台与 IoT 模块根任一为 HTTP 都会在配置阶段失败。模块根不包含 `/app-api`，不在 URL 中保存账号、密码、query 或 fragment。直接构造低层 HTTP 客户端时需显式传入开发/测试环境，否则只允许 HTTPS。

例如仅使用公开配置接测试后台：

```dotenv
APP_ENV=development
ROWAN_HTTP_MODE=real
ROWAN_DEVICE_MODE=real
ROWAN_APP_API_BASE_URL=http://47.107.80.36
ROWAN_IOT_API_BASE_URL=http://47.107.80.36/iot
ROWAN_TENANT_ID=1
```

租户须与目标后台确认；密码和 Token 通过正常登录取得，不写入配置。未装配正式设备协议时仍会提示具体缺项；真实 API 不会因失败回落 Mock。网页可用 `pnpm web` 查看，HTTP 测试 API 应从本地 HTTP 页面联调，浏览器的 CORS/混合内容规则仍生效。

Web 的 Expo Constants 配置会内嵌到编译后的 JavaScript；切换 Mock/real、API 根或租户后，旧 Metro 转换缓存可能仍保留之前配置，即使服务端 manifest 已更新。`pnpm web` 默认带 `--clear`：修改环境后先停止旧服务、重新启动，再完整刷新浏览器页面。手动运行 Expo CLI 时也需加 `--clear`。验证 Web 通信模式应核对实际网页包和浏览器请求，不能只查原生 manifest 或根路由是否跳到登录页。

Android 明文策略由 Config Plugin/CNG 按环境生成，preview 的 release 测试包也适用；production 关闭明文。iOS ATS 配置遵循同一环境边界，平台运行验收单独记录。**原生网络策略改变后须重新构建并安装开发/测试包，仅重启 Metro 不会更新已安装包。** MQTT、外部链接及模组自身协议仍遵守原规则。详见 [CHG-20261016-002](<sdd/迭代变更/变更-20261016-002/变更提案.md>)。

本项目使用 `expo-dev-client`，不将 Expo Go 作为正式开发运行环境。首次运行或原生配置变化后，需要重新构建 Development Build。

启动 Metro：

```bash
pnpm dev
```

本地构建并运行 Android：

```bash
pnpm android
```

在 macOS 上本地构建并运行 iOS：

```bash
pnpm ios
```

以下变化需要重新构建 Development Build：

- 新增、删除或升级包含原生代码的依赖
- 修改 Config Plugin、权限、URL Scheme、Bundle Identifier 或 Android Application ID
- 升级 Expo SDK 或 React Native
- 修改 Expo Module 或其他 Android/iOS 原生代码

仅修改 TypeScript、React 组件、样式或业务逻辑时，通常不需要重新构建 Development Build。

## 品牌与环境

复制环境示例：

```bash
copy .env.example .env
```

支持的配置：

| 变量 | 可选值 | 默认值 |
| --- | --- | --- |
| `APP_BRAND` | `rowan` | `rowan` |
| `APP_ENV` | `development`、`preview`、`production` | `development` |

应用标识：

| 环境 | Android Application ID / iOS Bundle Identifier |
| --- | --- |
| development | `com.rowan.iot.dev` |
| preview | `com.rowan.iot.preview` |
| production | `com.rowan.iot` |

未知的品牌或环境会在配置阶段直接失败，不会静默回退。

`APP_BRAND` 和 `APP_ENV` 只能承载公开的构建选择。不要将访问令牌、签名私钥、服务端密钥、设备密钥或其他敏感信息写入 `.env`、`EXPO_PUBLIC_*`、源码或客户端构建配置。

## CNG 与原生目录

项目使用 Expo Continuous Native Generation。`android/` 和 `ios/` 是由配置生成的目录，不提交到仓库。需要重新生成时运行：

```bash
pnpm prebuild
```

该命令执行 `expo prebuild --clean`，会重新创建原生目录。长期原生定制应通过 `app.config.ts`、Config Plugin 或 Expo Module 表达。只有团队明确决定维护原生工程时，才改为提交 `android/` 和 `ios/`。

EAS 是可选构建服务，不是唯一构建路径。本工程当前未启用 EAS Update，也不需要 EAS 项目凭据即可执行本地验证。

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm run doctor
pnpm verify:config
pnpm verify:bundle
pnpm verify
```

`pnpm verify` 会依次执行 ESLint、TypeScript、单元测试、Expo Doctor、应用配置检查和 Android Expo 导出。它验证单项目 JavaScript/TypeScript 和 Metro 打包链路，不等同于完成 Android APK 或 iOS App 的原生签名构建。

## Windows 原生构建路径

pnpm 配置使用 `nodeLinker: hoisted`，将原生依赖安装到根目录 `node_modules`，避免 `.pnpm` 版本目录使 CMake 对象文件路径超过限制。此配置不定义工作区包，项目仍为单一 Expo/CNG 应用。修改安装布局后执行 `pnpm install --frozen-lockfile`；已有原生生成缓存需要重新生成或清理后再构建。

Windows 上建议使用 Ninja 1.12 或更高版本，参见 [Reanimated Windows 构建说明](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/)。本机 SDK 的 CMake 3.22.1 附带 Ninja 1.10.2，实际兼容性以原生构建结果为准。


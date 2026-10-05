# ROWAN IoT App

ROWAN 移动端工程基于 Expo Development Build、React Native 新架构、Expo Router、TypeScript 和 pnpm Monorepo。当前版本提供可验证的工程底座，不包含登录、配网、MQTT、OTA 或正式设备控制功能。

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
apps/mobile                 Expo Router 移动应用
packages/brand-config      品牌和构建环境配置
packages/core              日志、错误和 HTTP 能力边界
packages/iot-sdk           设备状态、命令和连接能力边界
packages/device-ui         设备控制组件接口
packages/design-system     主题和设计令牌
```

移动应用和共享包只能通过 `@rowan/*` 的公开入口相互引用，不要导入其他包的内部文件。

## Development Build

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

`pnpm verify` 会依次执行 ESLint、TypeScript、单元测试、Expo Doctor、应用配置检查和 Android Expo 导出。它验证 JavaScript/TypeScript 和 Metro 打包链路，不等同于完成 Android APK 或 iOS App 的原生签名构建。

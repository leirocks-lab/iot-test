# Android 开发环境与运行指南

适用项目：ROWAN Expo / React Native 应用。操作系统：Windows。

> 核实状态：本地命令工具启动失败，尚未读取 `package.json`、锁文件、Expo 配置、`eas.json` 和环境变量示例，也未实际启动验证。本文是依据官方文档整理的操作指南。具体版本、项目脚本、原生依赖和后端配置需按仓库实际内容核对。

## 1. 环境清单

| 环境 | 用途 | 安装条件 |
| --- | --- | --- |
| Git | 获取代码、版本管理 | 开发电脑安装 |
| Node.js | 运行 Expo 和开发服务器 | 优先遵循项目 `engines`、版本文件，选兼容 Expo SDK 的 LTS 版本 |
| pnpm 或 Bun | 安装项目依赖 | 按 `packageManager` 和锁文件选择，避免混用 |
| Android Studio | 管理 Android SDK、模拟器 | 使用模拟器或本地编译时安装 |
| Android SDK Platform-Tools | 提供 ADB，连接设备 | 模拟器、USB 真机调试需要 |
| Android Emulator、系统镜像 | 创建模拟器 | 使用模拟器时需要 |
| Android SDK Platform、Build-Tools | 本地编译 Android 应用 | 版本需匹配项目 Expo SDK 和构建配置 |
| JDK | 本地 Android 编译 | 当前官方指南使用 JDK 17，需与项目版本核对 |
| Expo Go 或项目开发包 | 运行应用 | 按原生依赖支持情况选择 |
| Expo 账号、EAS CLI | 云端构建开发包 | 使用 EAS 时需要 |

仅用真机 Expo Go 预览时，不需要本地 Android 编译工具链。通过 EAS 云端构建开发包也不需要本地 JDK 和编译 SDK；运行模拟器仍需要 Android Studio 的模拟器组件。

官方参考：[Android 环境配置](https://docs.expo.dev/workflow/android-studio-emulator/)。

## 2. 先核对仓库配置

进入项目根目录：

```powershell
Set-Location 'D:\workspace\rowaniot\rowan-iot-app'
Get-Content package.json
```

核对以下信息后再安装依赖：

- `packageManager`、锁文件：确认使用 pnpm、Bun 或其他包管理器及版本。
- `engines`、`.nvmrc` 等版本文件：确认 Node.js 要求。
- `dependencies.expo`：确认 Expo SDK 主版本，查阅对应的 `https://docs.expo.dev/versions/v<主版本>.0.0/` 文档。
- `scripts`：优先使用项目已有启动、检查脚本。
- 原生依赖和 `expo-dev-client`：确认能否使用 Expo Go。
- `app.json` 或 `app.config.*`：确认 Android 应用配置、插件和权限。
- `eas.json`：确认是否已有开发构建 profile。
- README、环境变量示例和 API 配置：确认后端地址、必填变量及启动依赖。

本文命令默认使用 `npx`。按照仓库规则，存在 `bun.lock` 时将 `npx` 改为 `bunx`，例如 `bunx expo start`。不要安装已废弃的全局 `expo-cli`。

官方参考：[Expo 文档索引与 CLI 注意事项](https://docs.expo.dev/llms.txt)。

## 3. 安装并配置 Android 工具

### 3.1 安装 SDK 组件

安装 Android Studio，在首次启动向导中完成 SDK 安装和许可证接受。

打开 **Settings → Languages & Frameworks → Android SDK**：

1. 在 SDK Platforms 中安装项目所需的 Android SDK Platform。
2. 在 SDK Tools 中安装 Android SDK Platform-Tools、Build-Tools、Android Emulator；按构建要求安装 Command-line Tools。
3. 记录 Android SDK Location，后续环境变量使用这个实际路径。

不要仅根据最新文档将所有项目固定为同一 SDK Platform 版本。

### 3.2 配置 Windows 用户环境变量

SDK 默认路径通常为：

```text
C:\Users\Leon\AppData\Local\Android\Sdk
```

在 Windows“编辑账户的环境变量”中设置：

```text
ANDROID_HOME = C:\Users\Leon\AppData\Local\Android\Sdk

Path 增加：
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

本地编译时，将 `JAVA_HOME` 设置为实际 JDK 安装目录，并把 `%JAVA_HOME%\bin` 加入 Path。路径需以实际安装位置为准。

关闭并重新打开 PowerShell，检查：

```powershell
node --version
adb version
java -version
```

按实际包管理器执行 `pnpm --version` 或 `bun --version`。仅使用 Expo Go 或云端构建时，可跳过本地 Java 检查。

官方参考：[Windows Android 环境配置](https://docs.expo.dev/workflow/android-studio-emulator/)。

## 4. 安装项目依赖

进入仓库后，按项目实际配置选择一条命令：

```powershell
# pnpm 项目
pnpm install --frozen-lockfile
```

```powershell
# Bun 项目
bun install --frozen-lockfile
```

如果锁文件检查失败，先核对包管理器版本及依赖与锁文件的一致性，不直接删除锁文件。

按项目说明补齐必需环境变量。当前未核实变量名称、API 地址以及是否需要本地后端，不能据此假定全部业务可直接运行。

## 5. 选择运行方式

| 方式 | 适用条件 | 首次准备 |
| --- | --- | --- |
| Expo Go | 项目所有原生依赖均受 Expo Go 支持 | 安装与项目 SDK 兼容的 Expo Go |
| 项目开发包 | 存在 Expo Go 未包含的原生模块或需测试原生配置 | 构建并安装项目自己的开发包 |

蓝牙、配网或厂商 SDK 可能需要开发包；是否需要必须通过实际依赖确认，不能仅根据项目名称判断。

官方参考：[开发包介绍](https://docs.expo.dev/develop/development-builds/introduction/)。

## 6. 运行到 Android 模拟器

### 6.1 创建并启动模拟器

1. 打开 Android Studio 的 Device Manager。
2. 选择 Create Virtual Device，选择 Pixel 等手机型号。
3. 下载适合电脑架构、满足应用最低 Android 版本的系统镜像。
4. 完成创建，点击播放按钮启动，等待进入 Android 桌面。
5. 若无法启动，检查 BIOS/UEFI 虚拟化和 Android Emulator 的硬件加速配置。

检查模拟器连接：

```powershell
adb devices
```

预期看到类似输出：

```text
List of devices attached
emulator-5554    device
```

官方参考：[模拟器配置](https://docs.expo.dev/workflow/android-studio-emulator/)。

### 6.2 使用 Expo Go

确认项目兼容 Expo Go 后执行：

```powershell
npx expo start --go
```

在终端按 `a` 打开 Android 应用，保持开发服务器运行。

官方参考：[启动开发服务器](https://docs.expo.dev/get-started/start-developing/)。

### 6.3 使用项目开发包

如果项目已配置 `expo-dev-client`，首次本地构建：

```powershell
npx expo run:android --device
```

选择模拟器。该命令编译原生应用、安装到所选设备并启动开发服务器。首次运行会自动生成缺失的原生目录，按仓库规则通过 Expo 配置和 config plugins 管理，不手工创建或修改生成目录。

如果项目还未配置开发包，应先评估依赖与配置。确需添加时使用 Expo 兼容安装命令：

```powershell
npx expo install expo-dev-client
```

安装开发包后，日常启动：

```powershell
npx expo start --dev-client
```

按 `a` 打开已安装的开发包。只修改 JS/TS 通常无需重新编译；新增原生库或修改原生配置后需要重新构建。

官方参考：[本地构建](https://docs.expo.dev/guides/local-app-development/) · [使用开发包](https://docs.expo.dev/develop/development-builds/use-development-builds/)。

## 7. 运行到 Android 真机

### 7.1 Expo Go：Wi-Fi 扫码

1. 手机安装与项目 Expo SDK 兼容的 Expo Go。
2. 手机和电脑连接同一 Wi-Fi。
3. 电脑执行：

```powershell
npx expo start --go
```

4. 用 Expo Go 扫描终端二维码。

如果局域网连接失败，检查 Windows 防火墙、VPN 和路由器客户端隔离。也可尝试：

```powershell
npx expo start --go --tunnel
```

Tunnel 依赖网络服务，通常比局域网慢；它解决开发服务器连接，不自动代理项目业务 API。

官方参考：[真机启动与 Tunnel](https://docs.expo.dev/get-started/start-developing/)。

### 7.2 开发包：USB 安装和调试

1. 手机开启开发者选项和 USB 调试。
2. 使用支持数据传输的 USB 线连接电脑。
3. 解锁手机并允许电脑的调试授权。
4. Windows 无法识别设备时安装对应厂商的 ADB 驱动。
5. 执行：

```powershell
adb devices
```

手机应显示为 `device`。显示 `unauthorized` 时，需在手机上确认调试授权。

项目已配置开发包且本地编译环境就绪后执行：

```powershell
npx expo run:android --device
```

选择手机，等待编译安装。后续日常运行：

```powershell
npx expo start --dev-client
```

在手机开发包中连接开发服务器，通常保持手机和电脑处于同一 Wi-Fi。USB 能安装应用并不代表所有网络连接都已配置完成。

官方参考：[Android 真机连接](https://developer.android.com/studio/run/device) · [开发包运行](https://docs.expo.dev/develop/development-builds/use-development-builds/)。

### 7.3 EAS 云端生成开发 APK

前提：项目已配置 `expo-dev-client`，且 `eas.json` 中存在可用的 `development` profile。若不存在，先按官方指南完成配置，不直接假定命令可用。

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

Bun 项目使用：

```powershell
bunx eas-cli login
bunx eas-cli build --platform android --profile development
```

构建完成后下载并安装开发 APK。电脑启动 `expo start --dev-client`，手机连接开发服务器。开发包仍需要开发服务器提供开发阶段的 JS 内容。

官方参考：[EAS Android 开发包](https://docs.expo.dev/tutorial/eas/android-development-build/)。

## 8. 后端地址与环境变量

运行应用前需要确认项目实际使用的 API 地址、环境变量和后端服务。不要自行编造变量名称。

如果后端运行在开发电脑上：

| 客户端 | 访问电脑后端的地址 |
| --- | --- |
| Android Studio 模拟器 | 通常使用 `http://10.0.2.2:<后端端口>` |
| Android 真机 | 使用电脑可访问的局域网 IP，例如 `http://192.168.1.100:<后端端口>` |

设备上的 `localhost` 指向设备本身。真机访问本地后端还要求后端监听可访问的网络接口、电脑防火墙放行对应端口、网络允许设备互通。示例地址不是本项目的已确认配置。

官方参考：[Android 模拟器网络](https://developer.android.com/studio/run/emulator-networking)。

## 9. 常见问题

| 现象 | 排查方向 |
| --- | --- |
| 找不到 `adb` | 检查 SDK 路径、ANDROID_HOME 和 Path，重新打开终端 |
| `adb devices` 无设备 | 检查模拟器是否启动，或真机数据线、驱动、USB 调试 |
| 设备为 `unauthorized` | 解锁手机并确认电脑调试授权 |
| 模拟器无法启动 | 检查虚拟化、硬件加速和系统镜像架构 |
| Expo Go 提示 SDK 不兼容 | 安装匹配的 Expo Go，或使用项目开发包 |
| 原生模块不存在 | 确认依赖已安装，重新构建包含该模块的开发包 |
| 扫码连接失败 | 检查同一 Wi-Fi、防火墙、VPN、网络隔离，必要时尝试 Tunnel |
| 页面正常但接口失败 | 检查 API 地址、后端状态、环境变量和设备网络可达性 |
| 修改后显示旧内容 | 检查 Fast Refresh，必要时执行 `npx expo start --clear` |

## 10. 本地验证清单

以下为待执行项，不代表已经验证通过：

- [ ] 已确认 Node.js、包管理器和 Expo SDK 版本。
- [ ] 已按锁文件安装依赖。
- [ ] 已核对 API 地址与必填环境变量。
- [ ] `adb devices` 能识别目标模拟器或手机。
- [ ] 已确认使用 Expo Go 或项目开发包。
- [ ] 应用能启动、页面能打开、修改后能刷新。
- [ ] 业务 API 能从目标设备访问。
- [ ] 涉及蓝牙、配网等能力时已在真机验证。
- [ ] 已运行项目要求的 lint 和 typecheck。

常用检查命令（优先遵循项目已有 scripts；Bun 项目改用 bunx）：

```powershell
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

本文仅整理开发环境和运行操作，不改变业务要求，不表示任何 RF 功能已完成业务验收或发布。

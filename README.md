# ROWAN 原生 + React Native

目标架构：Android/iOS 原生应用负责全局页面、业务与平台服务，共享 RN 模块负责设备子流程。重构以正式业务流程、协议语义、视觉及最终结果一致为目标，旧实现不约束新架构。

架构入口：[架构总览](docs/architecture/架构总览.md)，共 8 份文档，覆盖分层、桥接、通信、业务、安全、构建和验证。

## 当前工程状态

已根据 RN 0.86.3 官方模板建立独立 Android、iOS 与 RN 工程。Android 原生账号、房间、目录、设置及只读设备观察已完成部分真实接口与模拟器验证，RN 六类只读查询及原生自解绑确认入口已接线；全范围继续实施。最近正式源码 Android 58 套 701 项 JVM 检查通过，新增分享码协议适配尚未接入页面；RN 116 项及 lint/typecheck 通过，Release 与配对测试 APK 构建通过。首页受控 UI 历史四配置已通过，当前新包回归分别记录，不沿用旧包结论。iOS 只有源码与静态结构检查，无 macOS/Xcode 编译运行。全部 111 项尚未完成验收；缺失产品字段、第二账号与隔离设备、真实硬件等阻塞独立列出。各批对应源码、APK 与实际结果见[实施证据](docs/测试报告/重构实施-20261101/README.md)。

| 项目 | 当前状态 |
| --- | --- |
| [android-as](android-as/README.md) | 独立宿主及原生服务、major3只读桥接已构建运行；全范围继续实施验收 |
| [ios-as](ios-as/README.md) | Xcode 工程、原生账号及最小桥接源码已建立；macOS 构建未验证 |
| [app-rn](app-rn/README.md) | 独立 package.json、锁文件、Codegen 规格和检查脚本已建立；完整设备子流程未完成 |
| [app-rn-old](app-rn-old/README.md) | 旧工程独立保留，未作为新工程依赖 |
| [实施证据](docs/测试报告/重构实施-20261101/README.md) | 实际检查、接口结果、差异及未验收项 |

## 项目间的关系

```text
共享 RN 页面 → TypeScript 宿主适配 → TurboModule → 当前平台原生业务服务
原生页面 ───────────────────────────────────→ 同一原生业务服务
原生业务服务 → HTTP / MQTT / BLE / 存储 / 权限等平台或协议适配
原生 RN 容器 → 加载 RN 资源、传入入口参数、管理页面和 runtime 生命周期
```

Android 与 iOS 是两个独立客户端，各自编译 RN 所需原生依赖并实现同一桥接契约；不通过 TurboModule 彼此通信。RN 编译产物分别嵌入两个宿主安装包，RN ZIP/Bundle 本身不是可安装 App。

- 原生页面：启动、账号、首页、添加、扫码、配网、我的、房间及全局设置。
- RN 页面：设备控制、更多、设备内分享、定时及设备固件升级。
- 原生服务持有登录态、设备会话和任务；RN 管理展示状态，不创建第二套 HTTP/MQTT/BLE 或账号。
- RN 内部路由由 RN 管理；全局导航和关闭设备流程由宿主管理。
- Codegen 规格位于 app-rn/src/host/specs；Android/iOS 构建显式引用同一输入，生成接入代码，不生成业务实现。
- 两端均引用新 app-rn，不引用 app-rn-old。新模块不依赖旧工程的 node_modules、runtime、路由或脚本。
- Expo 模块只有经双端验证且确有用途才保留；正式原生宿主不由 Expo prebuild 管理。

## 仓库与目录功能

```text
rowan-iot-app/
├─ android-as/        正式 Android 工程位置，详见其 README
│  ├─ app/src/main/   Kotlin 分层代码及原生资源
│  ├─ app/src/test/   单元测试
│  ├─ app/src/androidTest/ 设备集成测试
│  ├─ config/        非秘密构建配置模板
│  └─ scripts/       构建及产物归档
├─ ios-as/            正式 iOS 工程位置，详见其 README
│  ├─ Rowan/         App、Navigation、Features、Domain、Data、Bridge、RNHost 等
│  ├─ Tests/         Unit、Integration、UI
│  ├─ Config/        非秘密构建及导出模板
│  └─ Scripts/       构建及归档
├─ app-rn/            共享 RN 工程位置，详见其 README
│  ├─ src/           entry、navigation、features、components、design、products
│  │                 application、host/specs、host/adapter、models
│  ├─ assets/        共享图片及字体
│  ├─ tests/         unit、contract、fixtures
│  ├─ config/        非秘密产品与构建配置
│  └─ scripts/       检查、Bundle 及资源归档
├─ app-rn-old/        旧 Expo/RN 应用，独立保留
└─ docs/
   ├─ prd/           HTTP/App V1.4、MQTT V1.6 等正式参考
   ├─ ui/            蓝湖地址和导出图
   └─ SDD/           架构、代码规范、图示、实施及验收记录
```

空目录用 .gitkeep 保留，开始实现后可随实际文件移除。物理目录是逻辑职责边界，不要求创建多个 Gradle 模块、Swift Package 或 JS 工作区。根目录不新增 package.json。

## 工程、代码与环境命名

| 对象 | 约定 |
| --- | --- |
| Android 工程 / module | RowanAndroid / app |
| Kotlin namespace | com.rowan.iot；不随环境变化 |
| iOS 工程 / Target | Rowan / Rowan |
| RN package.name | @rowan/device-module，已创建独立 package.json |
| RN 注册组件 | RowanDeviceModule；注册入口及双端容器保持一致 |
| TurboModule 类型文件 | Native 前缀，放 src/host/specs；模块名与原生实现一致 |
| 类型 / 组件 | PascalCase；函数与属性 camelCase；Hooks 以 use 开头 |
| 原生构建环境 | development、preview、production |

| 环境 | Android applicationId / iOS Bundle ID | Android 目标变体 | iOS 目标 Scheme |
| --- | --- | --- | --- |
| development | com.rowan.iot.dev | developmentDebug | RowanDevelopment |
| preview | com.rowan.iot.preview | previewRelease | RowanPreview |
| production | com.rowan.iot | productionRelease | Rowan |

以上身份延续现有项目约定，初始化时须核对已注册应用、Team、签名与渠道；不自动变更既有线上身份。环境不等于编译模式：preview/production 验收和分发采用 Release；开发环境也可建立 Release 来验证离线包内资源。API 地址及功能配置通过非秘密模板与受控环境提供，凭据不写入客户端或仓库。

## 依赖与工具链

| 项目 | 初始化后锁定内容 |
| --- | --- |
| RN | Node、pnpm、RN/React、JS 引擎、原生依赖、package.json 与 pnpm-lock.yaml |
| Android | JDK、Gradle Wrapper、AGP/Kotlin、Android SDK/NDK 及原生 SDK |
| iOS | macOS、Xcode/Swift、最低系统版本、依赖管理及原生 SDK；使用 CocoaPods 时提交 Podfile.lock |

旧工程 RN 0.86.3 / Expo 57 仅为候选参考，不直接决定新工程版本。新工具链在最小双端容器、Codegen、方法/事件和包内资源验证后冻结。生成代码、第三方依赖、构建缓存及本机配置不作为手写源码提交。正式 Gradle/Xcode 工程、共享 Scheme、非秘密配置和锁文件须纳入交付。

## 新工程构建顺序

以下为待初始化后实现的构建契约，已建立 Wrapper、Rowan Scheme 及部分 RN scripts；下表保留完整目标，未落实项不可执行。

1. 在 app-rn 按独立锁文件安装依赖，运行 lint、typecheck 和相关测试。
2. 两端从同一 specs 运行 Codegen，并分别接入原生业务适配；规格变更需双方构建验证。
3. 开发时启动新 RN 的 Metro，由原生宿主加载；原生页面使用各平台工具链编译。
4. Release 按平台构建并验证 Bundle/资源，嵌入宿主；宿主构建和独立资源脚本使用同一配置，避免重复产出不同资源。
5. Android 在本机或受控构建环境生成 APK/AAB；iOS 在 macOS/Xcode 环境完成测试、Archive 及按渠道 Export。
6. 验证安装、离线资源、真实设备业务及视觉，再生成归档名称、Hash 和版本追溯信息。

| 目标操作 | 目标命令 / 入口 | 当前状态 |
| --- | --- | --- |
| RN 开发及检查 | pnpm --dir app-rn start / lint / typecheck / test | 未配置 |
| RN 按平台打包 | pnpm --dir app-rn bundle:android / bundle:ios / verify:bundle | 未配置 |
| Android 开发 APK | android-as 下 Wrapper 执行 :app:assembleDevelopmentDebug | 未配置 |
| Android 预览 APK | :app:assemblePreviewRelease | 未配置 |
| Android 正式 AAB | :app:bundleProductionRelease | 未配置 |
| iOS 归档及导出 | RowanDevelopment / RowanPreview / Rowan 共享 Scheme | 未配置 |

RN 不需要新建独立可安装应用来承担宿主职责。Metro 用于开发/构建，正式 App 不依赖开发机 Metro。iOS 具体 xcodebuild 命令在真实工程、Scheme、签名及导出模板就绪后记录，不提供虚构可运行命令。

## 产物、版本与打包命名

平台构建保留工具原始产物名，归档脚本再复制为统一文件名，不通过改扩展名改变格式。每个项目的归档副本放其 dist/，不提交仓库。

| 产物 | 统一归档名 |
| --- | --- |
| Android 安装/分发 | rowan-android-{environment}-{appVersion}-{buildNumber}-{gitSha8}.apk 或 .aab |
| iOS 安装分发 | rowan-ios-{environment}-{appVersion}-{buildNumber}-{gitSha8}.ipa |
| iOS Archive | rowan-ios-{environment}-{appVersion}-{buildNumber}-{gitSha8}.xcarchive |
| RN 资源归档 | rowan-device-{platform}-{environment}-{bundleVersion}-bridge{bridgeMajor}-{gitSha8}.zip |

示例（仅命名示例）：rowan-android-preview-1.0.0-100-a1b2c3d4.apk；rowan-device-ios-preview-1.0.0-bridge1-a1b2c3d4.zip。

- appVersion：宿主公开版本，对应 Android versionName 与 iOS CFBundleShortVersionString。
- buildNumber：宿主递增构建号，对应 versionCode 与 CFBundleVersion，满足平台约束。
- bundleVersion：RN 资源独立版本，不因文本版本相同就认为与宿主兼容。
- bridgeMajor：桥接主版本；完整兼容判断还需能力、RN/引擎、原生 SDK、物模型及 API 范围。
- gitSha8：文件名使用的短提交号；追溯记录保存完整 Commit，不仅保存短值。
- platform：android 或 ios；不同平台/运行时的字节码不能假设互通。

RN ZIP 内部规划 manifest.json、bundle/、assets/ 和 checksums.json。Manifest 记录资源标识、版本、平台/产品适配、环境、兼容范围、运行时、完整 Commit 及 Hash；签名和发布策略另按已授权资源设计冻结。文件名和 Hash 不是可信来源证明。RN ZIP、JS Bundle、Hermes 字节码、APK/AAB、IPA 不能互相改后缀使用。

原生包内置可用 RN 资源。远程资源更新还需要兼容校验、可信签名、健康检查、回滚及服务端发布治理；创建目录和资源压缩包不表示已实现这些能力。设备固件 OTA 与 RN 资源更新分别管理。

## 检查、签名与交付

新 RN 已有独立检查命令；原生按平台分别构建和记录，不以旧工程或 Android 结果代替 iOS。当前本轮运行验收到 Android 模拟器；真实硬件项目单列未验收。

Token、Wi-Fi 密码、设备密钥、keystore、证书私钥、描述文件和签名密码不提交。配置模板可提交，秘密通过受控渠道注入。验收记录关联宿主构建号、资源版本/Hash、完整 Commit、桥接版本、测试设备及结果。

唯一业务范围表已由用户确认为 docs/prd/智能家居物联网项目计划&需求范围.xlsx；逐项追踪及验证状态见重构实施总计划。

## 旧工程使用

旧工程保留在 app-rn-old，可从根目录执行 `pnpm --dir app-rn-old lint`、`pnpm --dir app-rn-old typecheck`，其安装、启动、配置验证及原生缓存限制见 [旧工程说明](app-rn-old/README.md)。编辑器暂使用旧工程工具配置，待新工程初始化后分别接入；新旧依赖和配置不混用。

## 设计与官方参考

- [重构实施总计划](docs/SDD/2026-11-01-重构实施总计划.md)：当前阶段安排、依赖、交付物与验收门槛。

- [架构总览](docs/architecture/架构总览.md)：当前架构及 7 份专题的统一入口；旧接入文档保留为历史稿。

- [架构及通信设计](docs/SDD/原生与RN架构及通信设计.md)、[架构图与时序图](docs/SDD/架构图与时序图.md)、[代码规范](docs/SDD/原生与RN代码规范.md)。
- [SDD 索引](docs/SDD/README.md)；HTTP/App 按 V1.4，仅 MQTT 按 V1.6，视觉按蓝湖。
- [RN 0.86 原生集成参考](https://reactnative.dev/docs/0.86/integration-with-existing-apps)、[Codegen](https://reactnative.dev/docs/0.86/the-new-architecture/using-codegen)；实施时按最终锁定版本复核。
- [Android build variants](https://developer.android.com/build/build-variants)。

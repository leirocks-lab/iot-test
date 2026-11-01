# iOS 原生宿主

工程及应用 Target 名称约定：`Rowan`。当前只建立目录和 `.gitkeep`，尚无 Xcode project/workspace、Scheme、入口、签名配置或可安装产物。

## 目录职责

```text
ios-as/
├─ Rowan/
│  ├─ App/                  应用入口与依赖装配
│  ├─ Navigation/           全局导航与 RN 容器入口
│  ├─ Features/             原生页面与页面状态
│  │  ├─ Auth/              账号流程
│  │  ├─ Home/              首页、设备列表、快捷控制
│  │  ├─ AddDevice/         发现、扫码、配网页面
│  │  ├─ Profile/           我的
│  │  ├─ Rooms/             房间管理
│  │  └─ Settings/          全局设置
│  ├─ Domain/
│  │  ├─ Account/           账号、租户及会话
│  │  ├─ Device/            设备状态、控制及设备内业务
│  │  ├─ Provisioning/      配网状态机与绑定
│  │  └─ Firmware/          固件升级任务
│  ├─ Data/{HTTP,MQTT,BLE,Storage}/ 数据、协议及存储实现
│  ├─ Bridge/               TurboModule 与薄 Objective-C++ 接入
│  ├─ RNHost/               RN 容器、生命周期及资源装载
│  ├─ Platform/             权限、系统能力、第三方 SDK
│  ├─ Design/               设计令牌与原生公共 UI
│  └─ Resources/            图片、字体及包内资源
├─ Tests/{Unit,Integration,UI}/ 单元、集成及 UI 测试
├─ Config/                  非秘密环境及导出配置模板
└─ Scripts/                 构建、导出及归档脚本
```

Swift 负责业务服务，Bridge 适配 Codegen 与业务接口，不在 Objective-C++ 重复实现业务。Domain 不反向依赖 RN 或页面。

## 初始化与编译

后续补齐正式 Xcode 工程、共享 Scheme、Build Configuration、入口、Info.plist、Entitlements、资源编目、RN 与 Codegen。若选用 CocoaPods，维护 Podfile/Podfile.lock，并从生成的 workspace 构建；依赖管理方案、Xcode/RN/Swift 及最低系统版本先验证再冻结。

宿主定位 `../app-rn/node_modules` 和 `../app-rn/src/host/specs`，不引用 app-rn-old。生成代码由构建管理，不手改，不允许 Expo prebuild 覆盖本工程。

以下为初始化目标，目前对应 Scheme 和配置尚不存在：

| 环境 | 共享 Scheme | Build Configuration |
| --- | --- | --- |
| development | `RowanDevelopment` | `DevelopmentDebug` / `DevelopmentRelease` |
| preview | `RowanPreview` | `PreviewDebug` / `PreviewRelease` |
| production | `Rowan` | `ProductionDebug` / `ProductionRelease` |

Bundle Identifier 按根 README 约定。共享 Scheme 与非秘密配置纳入版本管理，签名凭据不提交。建立工程后提供基于真实 Scheme 的 xcodebuild 命令，不使用占位命令冒充已可编译。

构建需要 macOS/Xcode：锁定依赖安装 → Codegen → 编译/测试 → Archive → 按渠道 Export → 归档。真机导出还需对应签名环境。Windows 不作为 iOS 编译及真机验收环境。

Archive 产物为 .xcarchive，导出包为 .ipa；模拟器 .app 不能作为真机 IPA。CFBundleShortVersionString 对应宿主版本，CFBundleVersion 对应构建号。归档副本放 dist，遵循根 README 命名。导出渠道与签名方式通过 Config 模板及受控环境决定。

Release 包必须内置匹配的 RN Bundle 和资源，不依赖开发机 Metro。当前未执行 iOS 构建。

## 关联项目

- [根 README](../README.md)：环境、版本、构建顺序及产物命名。
- [RN 模块](../app-rn/README.md)：共享页面及桥接规格。
- [Android 宿主](../android-as/README.md)：同一契约的另一平台实现。
- [架构设计](../docs/SDD/原生与RN架构及通信设计.md) 与 [代码规范](../docs/SDD/原生与RN代码规范.md)。

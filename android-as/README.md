# Android 原生宿主

工程名约定：`RowanAndroid`；应用模块：`app`；Kotlin namespace：`com.rowan.iot`。当前仅建立目录骨架和 `.gitkeep`，尚无 Gradle Wrapper、构建配置、Manifest、应用入口或可安装产物。

## 目录职责

```text
android-as/
├─ app/src/main/kotlin/com/rowan/iot/
│  ├─ app/                 应用入口、依赖装配
│  ├─ navigation/          全局导航、RN 容器入口和返回边界
│  ├─ features/            原生页面及页面状态
│  │  ├─ auth/             账号流程
│  │  ├─ home/             首页、设备列表、快捷控制
│  │  ├─ adddevice/        发现、扫码、配网页面
│  │  ├─ profile/          我的
│  │  ├─ rooms/            房间管理
│  │  └─ settings/         全局设置
│  ├─ domain/             用例、服务接口与业务状态
│  │  ├─ account/          账号、租户及会话
│  │  ├─ device/           设备状态、控制、设置、定时及分享
│  │  ├─ provisioning/     配网状态机与绑定
│  │  └─ firmware/         固件升级任务
│  ├─ data/{http,mqtt,ble,storage}/ 数据、协议和存储实现
│  ├─ bridge/             Kotlin TurboModule 薄适配
│  ├─ rnhost/             RN 容器、生命周期与资源装载
│  ├─ platform/           权限、系统能力、第三方 SDK 适配
│  └─ design/             设计令牌与原生公共 UI
├─ app/src/main/res/{drawable,font,values}/ 图片、字体及资源
├─ app/src/test/kotlin/com/rowan/iot/        单元测试
├─ app/src/androidTest/kotlin/com/rowan/iot/ 设备集成测试
├─ config/                非秘密环境配置模板
└─ scripts/               构建与归档脚本
```

页面和 bridge 调用同一原生业务服务；domain 不依赖页面或 RN runtime。这是单应用模块内的逻辑分层，不代表已创建多 Gradle 模块。

## 初始化与编译

后续需补齐 settings.gradle.kts、根与 app 的 build.gradle.kts、Wrapper、工具链版本配置、Manifest、Application/Activity、资源和 RN/Codegen 集成；由经过验证的模板生成，不复制旧 Expo 生成工程。

宿主显式定位 `../app-rn/node_modules` 和 `../app-rn/src/host/specs`。Codegen 输出由构建管理，不手改。RN/JDK/Gradle/AGP/SDK/NDK 版本经集成验证后锁定。

以下为初始化后应提供的目标任务，当前不可执行：

| 用途 | 目标 Gradle 任务 | 输出 |
| --- | --- | --- |
| 开发调试 | `:app:assembleDevelopmentDebug` | APK |
| 预览验收 | `:app:assemblePreviewRelease` | 签名 APK |
| 正式分发 | `:app:bundleProductionRelease` | 签名 AAB |

这些任务依赖后续配置 development/preview/production flavors 及 debug/release build types。Windows 从本目录调用 `./gradlew.bat`，例如 `./gradlew.bat :app:assembleDevelopmentDebug`；其他构建环境使用对应 Wrapper。

namespace 保持 com.rowan.iot；环境 applicationId 按根 README 约定。原始产物位于 app/build/outputs，归档副本放 dist；versionName 对应宿主版本，versionCode 对应递增构建号。签名文件及密码不提交。Release 必须内置匹配的 RN 资源，不依赖 Metro。

当前未执行原生编译。建立工程后配置静态检查、单元测试及真机测试，记录实际命令和结果。

## 关联项目

- [根 README](../README.md)：项目关系、环境、版本与归档命名。
- [RN 模块](../app-rn/README.md)：共享页面及 Codegen 规格；不引用 app-rn-old。
- [iOS 宿主](../ios-as/README.md)：同一业务契约的另一平台实现。
- [架构设计](../docs/SDD/原生与RN架构及通信设计.md) 与 [代码规范](../docs/SDD/原生与RN代码规范.md)。

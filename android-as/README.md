# Android 原生宿主

> 当前实施状态（2026-11-02）：独立宿主、原生服务及 major3 只读桥接已构建并在 API36 运行；测试、静态检查、Release、真实接口与局部受控 UI 分版本记录。首页多房间受控 UI 尚在诊断与复测，局部检查不关闭范围条目。完整业务、蓝湖视觉、硬件及生产签名仍未验收；具体计数、源码与 APK 对应关系以[批次证据](../docs/测试报告/重构实施-20261101/README.md)为准。

工程名：`RowanAndroid`；应用模块：`app`；Kotlin namespace：`com.rowan.iot`。实际完成状态见上方说明与实施报告。

## 目录职责

```text
android-as/
├─ app/src/main/kotlin/com/rowan/iot/
│  ├─ app/                 应用入口、依赖装配
│  ├─ navigation/          全局导航、RN 容器入口和返回边界
│  ├─ features/            原生页面及页面状态
│  │  ├─ auth/             账号流程
│  │  ├─ home/             首页、设备列表、快捷控制
│  │  ├─ scan/             添加菜单、扫码及单图选择
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

已建立settings.gradle、根与app的build.gradle、Wrapper、Manifest、Application/Activity、资源和RN/Codegen集成；基于独立官方模板，没有复制旧Expo生成工程。

宿主显式定位 `../app-rn/node_modules` 和 `../app-rn/src/host/specs`。Codegen 输出由构建管理，不手改。RN/JDK/Gradle/AGP/SDK/NDK 版本经集成验证后锁定。

已配置下列目标任务；目前已执行development Debug测试/lint及development Release构建，preview/production签名交付未验收：

| 用途 | 目标 Gradle 任务 | 输出 |
| --- | --- | --- |
| 开发调试 | `:app:assembleDevelopmentDebug` | APK |
| 预览验收 | `:app:assemblePreviewRelease` | 签名 APK |
| 正式分发 | `:app:bundleProductionRelease` | 签名 AAB |

工程已有development/preview/production flavors及debug/release build types。Windows从本目录调用`./gradlew.bat`；可用`node scripts/build.mjs :app:assembleDevelopmentRelease`记录来源指纹并剔除测试凭据，仅将公开环境配置传入构建。

namespace 保持 com.rowan.iot；环境 applicationId 按根 README 约定。原始产物位于 app/build/outputs，归档副本放 dist；versionName 对应宿主版本，versionCode 对应递增构建号。签名文件及密码不提交。Release 必须内置匹配的 RN 资源，不依赖 Metro。

构建脚本、settings和应用依赖图已有真实Gradle锁文件，正常构建使用STRICT模式。更新依赖后显式执行`node scripts/build.mjs :resolveAndLockAll --write-locks`并审阅锁差异；生成任务覆盖三环境的原生编译/运行/测试图，排除没有Android构建类型的Kotlin common metadata图。锁状态记录见[依赖锁证据](../docs/测试报告/重构实施-20261101/android-dependency-locks.json)，锁图不代表全部变体都已构建。

当前已执行原生编译、静态检查、单元测试及部分模拟器验证。真机硬件未验收，development debug key不代表production签名完成；生产构建交付仍需单独核验。

## 关联项目

- [根 README](../README.md)：项目关系、环境、版本与归档命名。
- [RN 模块](../app-rn/README.md)：共享页面及 Codegen 规格；不引用 app-rn-old。
- [iOS 宿主](../ios-as/README.md)：同一业务契约的另一平台实现。
- [架构设计](../docs/SDD/原生与RN架构及通信设计.md) 与 [代码规范](../docs/SDD/原生与RN代码规范.md)。

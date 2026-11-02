# 共享 RN 设备模块

> 当前实施状态（2026-11-02）：独立工程、pnpm锁和major3契约已建立；设备状态、定时/固件与更多只读页面已接线，100项测试及lint/typecheck/Codegen通过。Android内置包实际只读运行已有证据；完整控制、分享、写操作和iOS集成仍未验收。版本及限制见[实施证据](../docs/测试报告/重构实施-20261101/README.md)，下文未落实的约定不代表完成。

包名约定：`@rowan/device-module`；RN 根组件注册名约定：`RowanDeviceModule`。后续 package.json、注册入口与双端容器需一致配置。

当前已有独立依赖、锁文件、入口及构建/检查配置，Android JS Bundle 已导出；完整业务和双端宿主验收仍未完成，不继承旧 Expo 依赖。

## 目录职责

```text
app-rn/
├─ src/
│  ├─ entry/                宿主入口参数、根组件和上下文初始化
│  ├─ navigation/           设备子流程内部导航
│  ├─ features/
│  │  ├─ control/           设备控制
│  │  ├─ more/              设备更多及设置
│  │  ├─ sharing/           设备内分享
│  │  ├─ schedules/         定时
│  │  └─ firmware/          固件升级展示
│  ├─ components/           共享展示组件，不直接调用 TurboModule
│  ├─ design/               设计令牌及样式
│  ├─ products/             产品能力到控件的展示映射
│  ├─ application/          用例、Hooks 和展示状态编排
│  ├─ host/
│  │  ├─ specs/             Native 前缀的 Codegen 类型规格
│  │  └─ adapter/           TS 宿主服务封装、事件与错误处理
│  └─ models/               展示模型、单位及数据转换
├─ assets/{images,fonts}/   共享图片与字体
├─ tests/{unit,contract,fixtures}/ 单元、契约测试和测试向量
├─ config/                  非秘密构建及产品配置模板
└─ scripts/                 检查、Bundle 构建与归档脚本
```

调用方向：页面 → application → host/adapter → host/specs → TurboModule → 原生业务服务。RN 不创建生产 HTTP/MQTT/BLE 连接，不持有登录凭据或实际升级任务。产品映射决定展示，不能代替原生权限和参数校验。

## 初始化与构建

技术验证后补齐 package.json、pnpm-lock.yaml、包管理器配置、入口及注册、Metro/Babel/TypeScript/ESLint 与 Codegen 配置。Codegen 输入为 src/host/specs；模块名称和方法签名通过双端编译验证后冻结。

目标 scripts：start、lint、typecheck、test、bundle:android、bundle:ios、verify:bundle。start、lint、typecheck、test 及两个 bundle 脚本已配置；verify:bundle 尚未配置。新工程使用独立依赖和锁文件，根目录不建立 JS 工作区。

开发时 Metro 提供 RN 代码，由原生宿主加载。Release 按平台构建 Bundle/资源并集成到宿主，手机不运行 Metro。宿主构建与独立打包脚本需共享同一配置，避免重复打包产生不同版本。

输出放本目录 dist。Android/iOS 分别打包，不假设平台间字节码通用；如使用 Hermes 字节码，必须由匹配运行时的构建链生成，不能只改扩展名。

RN 归档包：`rowan-device-{platform}-{environment}-{bundleVersion}-bridge{bridgeMajor}-{gitSha8}.zip`。包内规划 manifest.json、bundle/、assets/、checksums.json；内置 Bundle 文件名和格式由最终集成方式冻结。ZIP 不是可安装 App，也不代表已实现远程热更新。

RN 资源版本独立于宿主版本；必须记录宿主兼容范围、平台、RN/引擎运行时、桥接与物模型/API 版本。远程发布另需范围授权、来源签名及回滚方案，Hash 不替代签名；资源包不能补齐宿主缺失的原生能力。

## 依据与关联

- HTTP/App 按 V1.4，仅 MQTT 按 V1.6；样式按蓝湖。
- [旧工程](../app-rn-old/README.md) 仅作业务与结果对照，不是运行时依赖。
- [Android](../android-as/README.md) 和 [iOS](../ios-as/README.md) 各自实现同一契约。
- [根 README](../README.md)、[本目录规则](AGENTS.md)、[架构设计](../docs/SDD/原生与RN架构及通信设计.md)、[代码规范](../docs/SDD/原生与RN代码规范.md)。

## Major 3 只读状态接入（当前源码，待双端集成）

DeviceEntry现通过native观察controller展示设备title/加载/在线、离线、未知/断线/权限及失败状态，并释放观察句柄；不再停留在major1 bootstrap固定提示。仅对适用状态提供native retry。完整字段及并发恢复语义见[src/host/README.md](src/host/README.md)。此批不是完整控制或视觉通过；WineCabinet受控组件仍等待核验产品字典后接入。当前closeDevice(pageSessionId:string)只使用页面原生初始props的token；旧major1/2 APK与新源码不兼容，原生同步major3及Codegen后才能统一运行验收。既有major2截图与Android410项GREEN保留为旧契约历史，不作为新版验收。

## 定时 / 固件只读桥接扩展

Major3保留getDeviceSchedules/getDeviceFirmware，DeviceEntry提供定时摘要与可用固件查询入口。生命周期控制、白名单DTO、状态与QA IDs见[device-readonly README](src/features/device-readonly/README.md)。本批不开放任何定时写操作或OTA启动/取消；原图current-version/hasUpdate/升级进度所需数据与生产许可仍未具备，页面不填样例或假状态。TS变化需同步原生后重新打包；独立RN检查不代表双端或真实硬件验收。

## 设备更多只读桥接扩展

Major3保留当前观察下的设备摘要、成员安全昵称/角色、纯文本帮助及房间归属四GET。更多内复用定时/固件入口，不重复创建观察；成员计数排除obs，未知房间不造未分配。没有关系写操作或分享二维码。DTO、生命周期、样式依据、QA IDs与检查边界见[device-more README](src/features/device-more/README.md)。本批RN源码需三端契约同步及重新打包后再做实际运行验收。

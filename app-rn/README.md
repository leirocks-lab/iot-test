# 共享 RN 设备模块

包名约定：`@rowan/device-module`；RN 根组件注册名约定：`RowanDeviceModule`。后续 package.json、注册入口与双端容器需一致配置。

当前只有目录、规则和 `.gitkeep`，尚无 package.json、锁文件、源码入口或 Metro/TypeScript/Codegen 配置，不能运行或打包；不自动继承旧 Expo 依赖。

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

目标 scripts：start、lint、typecheck、test、bundle:android、bundle:ios、verify:bundle。当前都未实现，不可直接执行。新工程使用独立依赖和锁文件，根目录不建立 JS 工作区。

开发时 Metro 提供 RN 代码，由原生宿主加载。Release 按平台构建 Bundle/资源并集成到宿主，手机不运行 Metro。宿主构建与独立打包脚本需共享同一配置，避免重复打包产生不同版本。

输出放本目录 dist。Android/iOS 分别打包，不假设平台间字节码通用；如使用 Hermes 字节码，必须由匹配运行时的构建链生成，不能只改扩展名。

RN 归档包：`rowan-device-{platform}-{environment}-{bundleVersion}-bridge{bridgeMajor}-{gitSha8}.zip`。包内规划 manifest.json、bundle/、assets/、checksums.json；内置 Bundle 文件名和格式由最终集成方式冻结。ZIP 不是可安装 App，也不代表已实现远程热更新。

RN 资源版本独立于宿主版本；必须记录宿主兼容范围、平台、RN/引擎运行时、桥接与物模型/API 版本。远程发布另需范围授权、来源签名及回滚方案，Hash 不替代签名；资源包不能补齐宿主缺失的原生能力。

## 依据与关联

- HTTP/App 按 V1.4，仅 MQTT 按 V1.6；样式按蓝湖。
- [旧工程](../app-rn-old/README.md) 仅作业务与结果对照，不是运行时依赖。
- [Android](../android-as/README.md) 和 [iOS](../ios-as/README.md) 各自实现同一契约。
- [根 README](../README.md)、[本目录规则](AGENTS.md)、[架构设计](../docs/SDD/原生与RN架构及通信设计.md)、[代码规范](../docs/SDD/原生与RN代码规范.md)。

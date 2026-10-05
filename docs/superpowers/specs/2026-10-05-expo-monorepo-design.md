# ROWAN Expo Monorepo 项目设计

## 目标

在保留现有产品文档和 UI 资料的前提下，为 ROWAN 建立可持续演进的 React Native Expo 移动端工程。工程需要支持 Android 和 iOS、多品牌独立构建、公司自主构建发布，以及后续 BLE、Wi-Fi 配网、Push、语音和设备控制等原生能力扩展。

首轮只建设工程底座，不实现登录、设备配网、MQTT、OTA 或正式产品界面。

## 技术路线

采用 React Native 新架构、TypeScript 严格模式和 Expo Development Build。使用 Expo CNG 和 Prebuild 管理 Android、iOS 原生工程，原生配置优先通过 `app.config.ts`、Config Plugin 或 Expo Module 表达。

不使用 Expo Go 作为生产开发环境。开发、预览和生产包均使用 Development Build 或正式原生构建。

如果后续厂商 BLE 或 Wi-Fi SDK 无法通过 Config Plugin 或 Expo Module 稳定管理，则保留切换为提交并维护 `android`、`ios` 原生目录的能力。该切换不改变 JavaScript、TypeScript 和工作区模块边界。

## 仓库结构

```text
rowan-iot-app/
├─ apps/
│  └─ mobile/                 Expo Router 移动端应用
├─ packages/
│  ├─ core/                   网络、鉴权、日志和错误模型
│  ├─ iot-sdk/                IoT 能力接口和后续原生适配边界
│  ├─ device-ui/              设备控制能力组件
│  ├─ design-system/          主题、设计令牌和基础组件
│  └─ brand-config/           品牌元数据和差异配置
├─ docs/                      现有产品、技术和 UI 资料
├─ package.json               根工作区命令
└─ pnpm-workspace.yaml        pnpm 工作区定义
```

移动应用只能通过各包公开入口使用共享能力，不直接依赖包的内部文件。共享包之间保持单向依赖，避免循环引用。

## 移动应用

`apps/mobile` 使用 Expo Router 和 TypeScript。首轮提供一个最小首页，用于验证：

- Expo Router 可以正常启动。
- 当前品牌与运行环境能够从统一配置读取。
- 工作区共享包可以被 Metro 和 TypeScript 正确解析。
- Android 与 iOS 使用同一业务入口。

首页不承担正式产品功能，也不复制现有 UI 设计稿。

## 多品牌和多环境

使用 `app.config.ts` 根据 `APP_BRAND` 和 `APP_ENV` 生成 Expo 配置。

首轮支持一个品牌：

- `rowan`

首轮支持三个环境：

- `development`
- `preview`
- `production`

品牌配置至少包含应用名称、品牌显示名称、Android Application ID、iOS Bundle Identifier 和基础主题标识。开发与预览环境使用独立应用标识后缀，使其能够与生产应用同时安装。

环境变量只用于非敏感的构建选择和公开配置。Token、签名私钥、服务端密钥及设备密钥不得进入仓库或客户端环境变量。

## 共享包职责

### core

定义与业务无关的基础能力边界，包括日志、错误模型、网络请求接口和鉴权接口。首轮只建立包结构与公开入口。

### iot-sdk

定义设备发现、配网、连接、状态订阅、命令和 OTA 等能力的 TypeScript 接口。首轮不接入真实 BLE、MQTT 或厂商 SDK，也不提供伪造的生产实现。

### device-ui

作为后续开关、滑杆、模式、档位、定时和故障组件的归属包。首轮只建立公开入口。

### design-system

承载主题令牌和跨品牌基础组件。首轮提供最小主题令牌，供验证首页使用。

### brand-config

保存品牌元数据和类型安全的查询接口。Expo 构建配置与运行时界面读取同一份品牌定义，避免包名、显示名称和主题配置分别维护。

## 原生扩展原则

BLE、Wi-Fi 配网、Push、语音、深链及生命周期敏感能力由原生模块承载。新增原生依赖时必须：

1. 验证 React Native 新架构兼容性。
2. 使用 Development Build 在 Android、iOS 真机验证。
3. 将原生配置固化为 Config Plugin、Expo Module 或受版本控制的原生改动。
4. 记录权限、隐私声明、初始化顺序和失败降级行为。
5. 验证供应商账号移除后公司仍可独立构建。

## 构建和发布控制

源码、依赖锁文件、品牌配置和构建脚本由公司仓库管理。EAS 是可选服务，不作为唯一构建或发布路径。工程需要保留本地及公司 CI 构建入口。

首轮不启用 EAS Update。产品 Schema、文案和图片等动态内容由后续 ROWAN API 或 CDN 管理；新增功能、原生模块和权限变化通过应用商店正式发版。

## 错误处理

配置解析遇到未知品牌或环境时必须在构建阶段失败，不得静默回退到生产配置。应用运行时的错误边界和业务错误模型在后续功能开发时实现；首轮只建立类型和模块边界。

## 质量验证

首轮必须通过：

- pnpm 工作区依赖安装。
- TypeScript 类型检查。
- ESLint 检查。
- Expo Doctor 检查。
- Expo 配置解析。
- `development`、`preview`、`production` 三种环境的应用标识检查。
- Expo 导出或等价的非交互构建验证。

原生 Android 和 iOS 的完整真机构建依赖对应 SDK、Xcode、签名和开发者账号，不作为仅有 Windows 环境时的虚假通过项。相关命令和要求必须在项目说明中明确记录。

## Git 基线

当前目录不是 Git 仓库。项目搭建前初始化本地 Git 仓库，采用适用于 Node、Expo、Android、iOS、环境文件和本地签名材料的 `.gitignore`。首轮不添加远程仓库，不创建或上传生产签名材料。

## 验收标准

完成时应满足：

1. 现有 `docs`、UI 图片和办公文档保持不变。
2. Monorepo 目录清晰，移动应用与共享包职责明确。
3. Expo Development Build 配置存在，不依赖 Expo Go。
4. TypeScript 严格模式启用。
5. ROWAN 三种环境可生成不同的应用标识。
6. 工作区共享包能被移动应用引用。
7. 检查与构建验证命令可重复执行。
8. 公司可以在不依赖供应商个人账号的前提下继续开发和构建。

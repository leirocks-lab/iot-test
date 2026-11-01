# ROWAN App 开发规则

本目录是重构前完整 Expo/RN 基线。新设备模块位于 `../app-rn/`；新功能迁移优先在新模块与原生宿主中实现，不在本目录重新建设混合架构。旧工程仅作对照、必要修复和可追溯迁移来源。

## 业务范围

- [项目计划与需求范围](<../docs/智能家居物联网项目计划&需求范围（补充API关联及开发人员）.xlsx>) 是唯一业务范围依据。产品文档、UI 和流程图只补充范围内细节，不授权新增功能。
- 范围外需求先记录差异和待确认事项；获得用户明确授权并更新范围依据后，才能进入实现。

# app-rn-old：Expo/RN 开发规则

## 当前阶段实现依据

- HTTP 接口与 App 产品功能、页面及业务流程参考 [V1.4](../docs/prd/ROWAN公共App产品功能及API详细设计说明书_V1.4.docx)。
- 仅 MQTT 部分参考 [V1.6 Corrected](../docs/prd/ROWAN_AS_App_Spec_V1.6_Corrected.docx)，不得将其非 MQTT 内容用于替代 V1.4；交叉约定有冲突时先记录并确认。
- 页面视觉样式按 [蓝湖地址](../docs/ui/蓝湖地址.txt) 对应设计稿还原，`../docs/ui/` 导出图辅助核对布局、间距、字体、颜色、图标、图片及状态样式；设计稿不改变已确定的功能和接口依据，不授权新增功能。蓝湖访问受限或与导出图不一致时记录待核对项，不臆造设计参数。
- 产品文档只补充已授权业务范围内的细节，不授权新增功能。

This directory contains the existing Expo/React Native project during migration to the native + RN architecture. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

所有命令在 `app-rn-old/` 执行。正式原生宿主位于 `../android-as/` 和 `../ios-as/`；本目录下 `android/`、`ios/` 仅是 Expo 生成内容，不得移作正式宿主。现有全局页面作为迁移基线暂存，通过原生替代验收后再移除。

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for navigation within this RN project during migration. Global application navigation belongs to the native hosts; the target RN scope is the complete device subflow only. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

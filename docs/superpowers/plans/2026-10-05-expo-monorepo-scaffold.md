# ROWAN Expo Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible Expo Development Build monorepo for the ROWAN Android and iOS app, with typed brand/environment configuration and clear extension points for shared UI and IoT capabilities.

**Architecture:** A pnpm workspace contains one Expo Router application under `apps/mobile` and five focused TypeScript packages under `packages`. Expo CNG reads a dynamic `app.config.ts`; the same typed brand configuration drives build identifiers and runtime display. Native IoT integrations are intentionally deferred, but their public TypeScript boundaries are established.

**Tech Stack:** Expo current stable SDK resolved by `create-expo-app`, React Native New Architecture, Expo Router, TypeScript strict mode, pnpm workspaces, Vitest, ESLint, Expo Doctor.

**Spec:** `docs/superpowers/specs/2026-10-05-expo-monorepo-design.md`

## Global Constraints

- Preserve every existing file under `docs/` other than the approved Superpowers design and plan documents.
- Use Expo Development Build; do not treat Expo Go as the production development runtime.
- Keep EAS optional and do not enable EAS Update in this scaffold.
- Use CNG/Prebuild; any later native customization must be expressed through app config, a Config Plugin, an Expo Module, or an explicitly committed native project.
- Enable TypeScript strict mode and React Native New Architecture.
- Support brand `rowan` and environments `development`, `preview`, and `production`.
- Missing `APP_BRAND` and `APP_ENV` default to `rowan` and `development`; any non-empty unknown value fails configuration.
- Use provisional base application identifier `com.rowan.iot`; append `.dev` for development and `.preview` for preview.
- Never place signing material, tokens, service secrets, or device credentials in tracked configuration.
- Initialize local Git only; do not configure a remote or publish any artifact.

## Review Focus

- Unknown non-empty `APP_BRAND` must fail with a readable error rather than silently building ROWAN.
- Unknown non-empty `APP_ENV` must fail rather than silently selecting a production or development identity.
- Production, preview, and development must produce distinct Android package names and iOS bundle identifiers.
- Workspace packages must resolve from both Metro and TypeScript without importing package-internal paths.
- Running the validation commands on Windows must not require EAS credentials, Android signing material, or Xcode.

---

### Task 1: Workspace and Expo Application Baseline

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/mobile/**` from the current stable `create-expo-app` default TypeScript/Expo Router template
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/tsconfig.json`
- Delete: `apps/mobile/.git/` if the generator creates a nested repository

**Interfaces:**
- Consumes: Approved repository structure from the design specification.
- Produces: pnpm workspace commands `lint`, `typecheck`, `test`, `doctor`, and `verify`; Expo app workspace named `@rowan/mobile`.

- [ ] **Step 1: Create the Expo Router application without installing dependencies**

Run: `npx create-expo-app@latest apps/mobile --template default --no-install`

Expected: `apps/mobile` contains an Expo Router TypeScript application and existing `docs` files are unchanged.

- [ ] **Step 2: Add the root workspace files**

Create a private root `package.json` using pnpm scripts that delegate checks to workspaces, `pnpm-workspace.yaml` including `apps/*` and `packages/*`, a strict shared TypeScript configuration, and a `.gitignore` covering Node, Expo, generated native directories, local environment files, build outputs, signing files, IDE state, and Office lock files.

- [ ] **Step 3: Normalize the generated mobile package**

Set the package name to `@rowan/mobile`, mark it private, retain the generated Expo/React Native dependency versions, add `expo-dev-client`, and make its `tsconfig.json` extend the root strict configuration plus `expo/tsconfig.base` settings.

- [ ] **Step 4: Install the workspace**

Run: `pnpm install`

Expected: command exits 0 and creates one root `pnpm-lock.yaml` without creating nested lockfiles.

- [ ] **Step 5: Verify the generated baseline**

Run: `pnpm --filter @rowan/mobile exec expo config --type public`

Expected: command exits 0 and prints a valid Expo configuration.

- [ ] **Step 6: Commit the workspace baseline**

```bash
git add .gitignore package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml apps/mobile
git commit -m "chore: scaffold Expo workspace"
```

### Task 2: Typed Brand and Environment Configuration

**Files:**
- Create: `packages/brand-config/package.json`
- Create: `packages/brand-config/tsconfig.json`
- Create: `packages/brand-config/src/index.ts`
- Test: `packages/brand-config/src/index.test.ts`
- Create: `apps/mobile/app.config.ts`
- Delete: `apps/mobile/app.json`

**Interfaces:**
- Consumes: Root TypeScript and Vitest configuration from Task 1.
- Produces: `BrandId`, `AppEnvironment`, `BrandConfig`, `AppIdentity`, `getBrandConfig(brandId?: string)`, `getAppEnvironment(value?: string)`, and `getAppIdentity(brandId?: string, environment?: string)` from `@rowan/brand-config`.

- [ ] **Step 1: Write failing brand configuration tests**

Test names and assertions:

- `defaults to ROWAN development identity`: expects `com.rowan.iot.dev` for both platform identifiers.
- `returns preview identity`: expects `com.rowan.iot.preview`.
- `returns production identity`: expects `com.rowan.iot`.
- `rejects an unknown brand`: expects error `Unknown APP_BRAND: other`.
- `rejects an unknown environment`: expects error `Unknown APP_ENV: staging`.
- `keeps all environment identities unique`: expects a set size of three.

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm vitest run packages/brand-config/src/index.test.ts`

Expected: FAIL because `@rowan/brand-config` has not been implemented.

- [ ] **Step 3: Implement the brand configuration API**

Implement the interfaces from this task using one immutable ROWAN definition with display name `ROWAN`, slug `rowan-iot`, scheme `rowan`, and base identifier `com.rowan.iot`. Missing values use the documented defaults; unknown non-empty values throw the exact errors exercised by the tests.

- [ ] **Step 4: Run the package tests**

Run: `pnpm vitest run packages/brand-config/src/index.test.ts`

Expected: PASS with six tests.

- [ ] **Step 5: Replace static Expo configuration**

Create `apps/mobile/app.config.ts` that calls `getAppIdentity(process.env.APP_BRAND, process.env.APP_ENV)`, preserves the generated router and platform settings, enables `newArchEnabled`, registers `expo-dev-client`, and uses the returned Android package and iOS bundle identifier.

- [ ] **Step 6: Verify all configuration variants**

Run Expo config for `development`, `preview`, and `production` with `APP_BRAND=rowan` and the corresponding `APP_ENV` value.

Expected: each command exits 0 and shows the identifier fixed in Global Constraints.

- [ ] **Step 7: Commit typed configuration**

```bash
git add packages/brand-config apps/mobile/app.config.ts apps/mobile/app.json package.json pnpm-lock.yaml
git commit -m "feat: add typed brand build configuration"
```

### Task 3: Shared Package Boundaries and Runtime Verification Screen

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/iot-sdk/package.json`
- Create: `packages/iot-sdk/tsconfig.json`
- Create: `packages/iot-sdk/src/index.ts`
- Create: `packages/device-ui/package.json`
- Create: `packages/device-ui/tsconfig.json`
- Create: `packages/device-ui/src/index.ts`
- Create: `packages/design-system/package.json`
- Create: `packages/design-system/tsconfig.json`
- Create: `packages/design-system/src/index.ts`
- Test: `packages/design-system/src/index.test.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/index.tsx`
- Delete: generated example routes and components that are not used by the verification screen

**Interfaces:**
- Consumes: `getAppIdentity()` from Task 2.
- Produces: `AppError`, `Logger`, and `HttpClient` types from `@rowan/core`; `IoTClient` and device command/status types from `@rowan/iot-sdk`; `DeviceControlProps` from `@rowan/device-ui`; `rowanTheme` and `ThemeTokens` from `@rowan/design-system`.

- [ ] **Step 1: Write the failing design-token test**

Test `ROWAN theme exposes required semantic colors` and assert non-empty values for `background`, `surface`, `text`, `mutedText`, `primary`, `success`, `warning`, and `danger`.

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm vitest run packages/design-system/src/index.test.ts`

Expected: FAIL because the theme package is not implemented.

- [ ] **Step 3: Create the shared packages and public interfaces**

Give every package a private `@rowan/*` name and `src/index.ts` public entry. Define only the interfaces and minimal immutable theme tokens required by this scaffold; do not implement networking, authentication, Bluetooth, MQTT, OTA, or production device controls.

- [ ] **Step 4: Run shared-package tests and type checking**

Run: `pnpm vitest run packages/design-system/src/index.test.ts && pnpm typecheck`

Expected: both commands exit 0.

- [ ] **Step 5: Replace the generated sample UI**

Create a single Expo Router screen that displays the ROWAN name, current environment, Android package/iOS bundle identifier, and a clear `Development Build Ready` status using `@rowan/brand-config` and `@rowan/design-system`. Keep the screen intentionally functional and minimal rather than recreating final product UI.

- [ ] **Step 6: Validate Metro-compatible bundling**

Run: `pnpm --filter @rowan/mobile exec expo export --platform android --output-dir dist/android`

Expected: command exits 0 and resolves every `@rowan/*` workspace import.

- [ ] **Step 7: Commit shared boundaries and verification screen**

```bash
git add packages apps/mobile package.json pnpm-lock.yaml
git commit -m "feat: establish shared mobile package boundaries"
```

### Task 4: Build Scripts, Automated Configuration Checks, and Handoff Documentation

**Files:**
- Create: `.env.example`
- Create: `scripts/verify-app-config.mjs`
- Create: `README.md`
- Modify: `package.json`
- Modify: `apps/mobile/package.json`

**Interfaces:**
- Consumes: Expo app and typed configuration from Tasks 1-3.
- Produces: root commands `dev`, `android`, `ios`, `prebuild`, `lint`, `typecheck`, `test`, `doctor`, `verify:config`, and `verify`.

- [ ] **Step 1: Write the failing configuration verification script**

Implement assertions for the five Review Focus conditions owned by configuration: defaults, unknown brand failure, unknown environment failure, three unique identifiers, and no EAS credential requirement. Initially run it before wiring the final root scripts.

- [ ] **Step 2: Run the script and verify it identifies missing command wiring**

Run: `node scripts/verify-app-config.mjs`

Expected: FAIL with a readable message naming the missing root or mobile command.

- [ ] **Step 3: Add developer and CI commands**

Wire root scripts to start the ROWAN development build, run local Android/iOS builds, execute clean Prebuild, lint, type-check, test, run Expo Doctor, verify all app configurations, and run the complete validation sequence. Commands must work from the repository root.

- [ ] **Step 4: Document the workflow**

Document prerequisites, pnpm installation, Development Build usage, environment selection, local Android/iOS commands, CNG rules, the prohibition on secrets in client environment variables, and the conditions that require rebuilding the development client. State that a Mac with Xcode is required for local iOS compilation.

- [ ] **Step 5: Run the complete validation suite**

Run: `pnpm verify`

Expected: lint, type checking, unit tests, Expo Doctor, configuration verification, and Android Expo export all exit 0.

- [ ] **Step 6: Confirm repository scope**

Run: `git status --short` and compare the tracked diff with the plan.

Expected: no existing product document or UI asset is modified; generated caches and local secrets are untracked or ignored.

- [ ] **Step 7: Commit the verified scaffold**

```bash
git add .env.example .gitignore README.md package.json pnpm-workspace.yaml pnpm-lock.yaml scripts apps packages
git commit -m "chore: finalize Expo development scaffold"
```

## Final Verification

- [ ] Run `pnpm verify` from a clean shell and record the successful output.
- [ ] Run `git status --short` and confirm only pre-existing untracked documentation assets remain.
- [ ] Report that Android/iOS native builds were not claimed unless their required local toolchains were actually executed.

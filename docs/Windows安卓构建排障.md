# Windows 安卓构建排障记录

日期：2026-10-07。维护范围：依赖安装布局与本地构建缓存；不改变业务行为、RF/AC 或规范版本，不建立业务变更包。

## 故障与证据

用户执行 `pnpm android --device ROWAN_API_36`，Worklets CMake 对象目录长 212 字符，出现 `CMAKE_OBJECT_PATH_MAX=250` 警告，随后 Ninja 报 `build.ninja still dirty after 100 tries`。

本机 SDK CMake 3.22.1 附带 Ninja 1.10.2。路径过长与旧 Ninja 均是需核查的风险，不能仅凭警告认定唯一根因。

## 维护动作

- `pnpm-workspace.yaml` 添加 `nodeLinker: hoisted`，不定义 packages/catalogs，保持单项目 CNG。
- 使用 `pnpm install --frozen-lockfile --offline --force` 重建依赖；未主动更新依赖版本。
- Worklets/Reanimated 实际路径已缩短为根目录 `node_modules/react-native-worklets` 与 `node_modules/react-native-reanimated`。
- 旧 `android/.cxx`、`android/app/.cxx`、`android/build/generated`、`android/app/build/generated/autolinking`（存在时）移入 `.codex-tmp/Windows原生构建-20261007`，未删除业务代码或全局 Gradle 缓存。
- 另一个进程同时执行过 pnpm install；等待其结束后重新执行冻结离线安装。

## 验证

- Lint、TypeScript、单元测试 2 文件/7 测试、`pnpm verify:config`：通过。
- `pnpm specs:index`、`pnpm specs:check`：通过，59 功能/111 条目/45 API；业务规范状态未改变。
- Expo Doctor：本次联网配置校验发生 ECONNRESET，不能据此宣称全部检查通过。
- Worklets x86_64 原生编译：通过，7 分 14 秒，38 个任务；未重现路径长度警告或 Ninja dirty 错误；仍使用原 Ninja 1.10.2。日志 `.codex-tmp/Windows原生构建-20261007/worklets-build.log`。
- 完整 x86_64 Debug APK：通过，19 分 54 秒；455 个任务（216 执行、178 缓存、61 无需重建），未重现路径长度警告或 Ninja dirty 错误；日志 `.codex-tmp/Windows原生构建-20261007/apk-build.log`。模拟器未连接，实际启动待验证。

## 参考

- [Expo 的 pnpm hoisted 安装建议](https://docs.expo.dev/guides/monorepos/#isolated-dependencies)
- [Reanimated Windows 构建说明](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/)
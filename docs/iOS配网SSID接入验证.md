# iOS 配网 SSID 接入验证

日期：2026-10-28。关联 RF-0020 / REQ-050 / AC-004，以及既有“SSID 未读取与未连接分别提示”的规则。本次补齐既有实现，不调整产品要求、规范版本或新建 CHG。

## 实施

- 使用 SDK 57 匹配的 expo-location 57.0.22 检查前台定位权限；仅显式刷新且系统允许再次询问时申请权限。只有精确位置授权后才开启 NetInfo 的 SSID 获取。
- 普通团队构建声明 Wi-Fi Information entitlement；Personal Team 构建不声明该能力，并在读取时给出明确限制。运行标记与原生配置由同一条件生成。
- 只声明前台定位用途，不申请后台定位或运动权限；保留取消检查及 Android 原有权限流程。
- 配网页区分读取失败、权限不足和网络状态；权限不足时提供系统设置入口，不把空 SSID 当成未连接。

## 验证结果

- macOS / Node / Expo SDK 57：pnpm test，44 个测试文件、568 项测试通过；含 iOS 未启用能力、精确授权、显式申请、近似定位及 Android 回归场景。测试替身不代表真机验收。
- pnpm lint、pnpm typecheck、git diff --check 通过。
- 分别设置 ROWAN_IOS_PERSONAL_TEAM=1 / 0 运行 expo config --type introspect，验证 entitlement、运行标记及前台定位用途匹配。
- 预加载本地环境变量后 iOS JS/资源导出通过；直接运行 export 最初因未加载业务 API 环境配置失败。导出不等于原生签名构建或安装成功。
- pnpm specs:index 与 pnpm specs:check 失败：仓库已有来源快照缺失、历史链接失效和索引过期；未修改来源哈希或伪造规范检查通过。

## 未完成的真机验收

用户确认目前只有免费 Personal Team。当前无法签发包含 Wi-Fi Information 能力的测试包，iOS 自动读取 SSID 的真实验收仍阻塞；本次未重装设备或声称配网成功。

后续需要可用的 Apple Developer Program 团队与匹配的签名配置，关闭 Personal Team 构建模式，重新生成原生项目并构建安装。需验证首次授权、拒绝、精确位置关闭、从设置恢复权限、Wi-Fi 切换、取消及真实配网；禁止仅更改 JS 标记后沿用旧安装包验收。

官方参考：
- https://docs.expo.dev/versions/v57.0.0/sdk/location/
- https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.networking.wifi-info
- https://github.com/react-native-netinfo/react-native-netinfo

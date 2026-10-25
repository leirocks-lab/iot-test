# Android 模拟器验证

日期：2026-10-25。目标：验证本次开发版悬浮日志控制台；不代表业务接口或真实 BLE 设备验收。

## 环境与准备

- Windows、Android Emulator `ROWAN_API_36`，ADB 设备 `emulator-5554`，Android API 36 / x86_64，1080×2400、420 dpi。
- WHPX 可用，模拟器启动后 `sys.boot_completed=1`。
- 原安装包最后更新时间 2026-10-18，需重建以加入 `expo-clipboard`。
- 使用 Expo CNG `expo prebuild --platform android --no-install` 更新生成工程，随后 `expo run:android --device ROWAN_API_36 --no-bundler`；未手改生成目录。
- Metro：`expo start --dev-client --clear --port 8085`；ADB reverse 8085。
- Windows 窗口捕获报 `window crop is outside captured monitor`，备用工具同样失败。改用 Android 官方 ADB 截图、UI hierarchy 和 Android 输入接口验证。
- 冷启动一度出现 System UI 无响应提示，选择 Wait 后恢复。原生构建与模拟器均保留用户数据。

## 验证清单

| 项目 | 实际结果 | 证据 |
| --- | --- | --- |
| 新开发包构建及安装 | 进行中 | 构建终端 |
| 点击 LOG 展开 | 待验证 | |
| 拖动且不误展开 | 待验证 | |
| 级别与关键词组合筛选 | 待验证 | |
| 原生剪贴板复制 | 待验证 | |
| 清空 | 待验证 | |
| Android 返回键收起 | 待验证 | |
| 完全隐藏入口 | 待验证 | |
| 开发菜单恢复入口 | 待验证 | |
| 原生崩溃检查 | 待验证 | |

尚未完成上述验证，不能将表中待验证项视为通过。

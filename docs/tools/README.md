# 本地核对工具

工具本身、离线测试和实际设备执行结果分别记录；脚本存在不表示对应验收已经通过。

| 工具 | 说明 |
| --- | --- |
| [zxing-jvm/probe.mjs](zxing-jvm/probe.mjs) | 固定ZXing3.5.4与Java17的公开图片解码POC；[使用及16项结果](zxing-jvm/README.md)，javase仅工具、不代表Android或生产二维码验收 |
| [verify_device_read_layout.mjs](verify_device_read_layout.mjs) | 承接已归档且显式保留的dev.refactor会话，执行真实只读定时/MCU错误页的baseline、small、large、font150布局矩阵；[使用、隐私及恢复说明](verify_device_read_layout.md) |
| [verify_preferences_native.mjs](verify_preferences_native.mjs) | 原生设置独立验证；须阅读其会话前置和可选主题修改/恢复边界，不能作为普通只读布局脚本运行 |
| [verify_auth_layout.mjs](verify_auth_layout.mjs) | 原有登录空态几何工具；不用于已保留登录会话，也不替代设备只读矩阵的原override恢复策略 |

新设备只读矩阵必须提供`--parent-run`；由Root在确认parent会话、同一已安装APK及独占验证窗口后执行。它不登录新账号、不清数据、不创建/修改/删除定时、不启动/取消升级、不分享或解绑。only-GET业务检查之外，finally仅执行一次正常UI退出登录，并先恢复原显示/字体设置。实际固件候选缺失仍单列业务阻塞，错误页几何通过不改变该结论。

# 设备只读RN布局矩阵

`verify_device_read_layout.mjs`承接主`android-as/scripts/verify-emulator.mjs --authenticated --device-features-readonly --keep-session`留下的验证会话。它是实际原生GET与RN界面的几何/滚动检查，不是完整视觉、可用固件候选、设备执行或硬件验收。

由Root安排实际执行；本批交付脚本时没有运行ADB、网络、Gradle或脚本本身。

```powershell
node docs/tools/verify_device_read_layout.mjs --parent-run=2026-11-01T14-02-53.569Z --dns-upstream=192.168.31.1
```

parent-run引用归档目录中的`android-emulator-{run}.json`，不是任意会话选择。脚本要求sessionKept严格为true、AUTH-04实际通过、包名严格为`com.rowan.iot.dev.refactor`、serial为对应emulator，并核验当前已安装APK SHA与parent记录相同。AVD仅允许ROWAN_API_36/ROWAN_API36；不满足时不改变显示配置或退出其他会话。脚本不读取账号凭据，不登录新账号，不清App数据或存储。

## 配置与流程

| 配置 | size / density | fontScale |
| --- | --- | --- |
| baseline | 运行前已读取的effective size/density；本次parent环境为1080×2400 / 420 | 1.0 |
| small | 640×1280 / 320 | 1.0 |
| large | 860×1864 / 320 | 1.0 |
| font150 | 与baseline相同 | 1.5 |

每个配置正常force-stop并从Welcome冷恢复到Home，等待真实`home_device_open`按钮连续两次bounds稳定、在viewport且可点，再进入RN。只打开定时列表及MCU固件读取页；没有日程创建/启停/删除、OTA启动/取消、分享生成、绑定、解绑或偏好写入。

定时empty允许截图；若服务返回已有列表，只记录关键控件ID和bounds，不记录名称、正文、完整层级或截图。固件仅在`kind-mcu`与`error-mcu`匹配、没有旧loaded结果时截图。实际服务返回null候选等错误可用于错误页几何验证；报告仍将固件候选业务列为阻塞，脚本不从通用错误页断言后台具体原因。若固件变成loaded，不截候选页，也不将未出现的error布局标为通过。

检查`rn-feature-back`、empty/error内容、retry和固定`rn-device-close`页脚动作是否在viewport、同一帧是否重叠。每个目标最多四次内容区滚动，记录初始可见、滚动次数及最终可达，不把“滚动后可达”写成“全部初始在屏”。实际截图的字体、换行、间距、安全区、触摸及参考稿比对始终单列人工未验收；可访问节点bounds不能证明字形没有截断。

ROOT_NOT_READY仅有限重试，不回用旧XML文件。其他helper/系统ANR/页面缺失记录固定状态码；没有将原始XML、账号层级或后台错误写入报告。脚本不点retry按钮以制造额外请求，只检查可见性及返回链路。

截图前后再次取得当前安全页面状态；PNG先仅留内存，若出现页面/账号状态变化则丢弃，不写文件。SIGINT/SIGTERM在当前有限同步调用返回后进入finally清理；进程被强制杀死无法由JavaScript保证恢复，应按报告前环境值人工核对。

## 恢复、退出与DNS

开始改变配置前解析并保存`wm size`、`wm density`的Physical及Override和font原始值。finally先恢复原Override；原本没有Override时才reset，绝不盲目reset已有配置。font原本缺失时delete，否则恢复原数值；随后读取确认恢复结果。

环境恢复尝试之后，脚本重新核验安装SHA，正常冷恢复并只点击一次Home退出登录，等待Welcome。已在Welcome时只记录已退出；未确认时保留阻塞，不清数据、不删除Token、不自动重发DELETE或点击“重试本地清理”。即使中间几何失败仍执行这些finally清理；恢复失败与退出失败分别报告。

`--dns-upstream`是显式可选的真实DNS转发：复用[loopback-dns-relay](android-network/loopback-dns-relay.mjs)，没有业务mock或TLS绕过；finally关闭relay并只保留允许的统计元数据。不设置该参数就不启动relay。

结果保存为`docs/测试报告/重构实施-20261101/android-device-read-layout-{run}.json`及受限页面截图，包含parent/report/script哈希、安装APK、源码前后指纹、原环境及恢复、正常退出、每配置几何、滚动和人工visual限制。退出码只反映本矩阵几何/前置/恢复/退出及源码是否稳定；不把固件业务阻塞合并为候选成功。

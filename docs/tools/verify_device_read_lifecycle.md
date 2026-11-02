# 设备更多只读生命周期与 AVD 网络恢复

`verify_device_read_lifecycle.mjs`由 Root 在停止 Gradle、独占 ADB 后执行。本次工具交付仅做 `node --check`；没有运行 ADB、真实服务、登录、网络切换或退出。不能把工具源码当作实际生命周期验收。

```powershell
node docs/tools/verify_device_read_lifecycle.mjs --parent-run=<新主回归runId> --dns-upstream=<显式IPv4> --screenshots
```

不硬编码旧 major 2 run。parent 必须来自主 harness `--keep-session` 的已记录成功登录，包固定 `com.rowan.iot.dev.refactor`，serial 来自 parent 且只能 emulator；核验安装 SHA、指定 ROWAN_API_36/ROWAN_API36 AVD、boot、parent/source fingerprint 与 APK provenance 的 sourceAfter 一致且构建期间 source 未变。没有凭据/env 输入、第二账号假设或安装步骤。

流程先打开真实 More 摘要。记录当前 DeviceActivity 的 ActivityRecord identity 与 taskID，再按 HOME 进入后台。DeviceActivity nonexported，不放宽Manifest也不再用Shell启动它。当前ROM虽未在help广告task focus，但Root实际固定无参`am task focus`返回exit1、`IllegalArgumentException: Argument expected after "focus"`及`ActivityManagerShellCommand.runTaskFocus`栈帧；该组合证明实现存在且缺参在取得taskID前被拒绝。脚本运行时重做这一只读探测，仅同时识别这两项及exit1、且无timeout/signal时接受；原异常/栈仅内存匹配，不输出或归档。其它响应前置阻塞，不能仅凭exit1或普通异常猜支持。

实际恢复只使用已核验的`am task focus <原taskID>`；恢复前原record须仍在栈，taskID必须是正整数；恢复后必须同ActivityRecord/task且More状态恢复。若原实例丢失、出现新record/task或页面初始化重置即阻塞，不启动DeviceActivity替代。不添加deviceId、accountRevision、pageSessionId或外来业务extras。记录“同实例回到 loaded”，不据此声称精确 GET 次数或硬中断后台 IO。

下一轮后台执行 AVD 断网：除独立无参focus探测，先读`cmd connectivity help`、`svc wifi`/`svc data`无参数usage，只有明确支持airplane-mode enable/disable、wifi/data enable/disable才允许操作。read-only help reader继续保留am help的括号边界匹配与按kind错误码，但reorder广告不再是恢复前置。专用reader仅对固定help调用且正文匹配syntax时接受已观察的退出码：am=0、connectivity=0/255、svc wifi/data=0/1。超时/信号/未知退出/缺syntax仍阻塞；普通ADB、真实focus、恢复和网络修改继续严格要求exit0，绝不全局吞掉失败。原始stdout/stderr仅在内存匹配，不归档。只接受可明确解析的初始airplane/wifi/mobile global 0/1、物理Wi-Fi状态及已存在default network；不猜缺失设置、特殊radio状态或其他AVD名称。

本机RN0.86.3源码核对：ReactActivity.java:133–136把onNewIntent转交delegate；ReactActivityDelegate.java:230–231继续转发；ReactDelegate.kt:189–201转交ReactHost；ReactHostImpl.kt:692–706转发context事件。该链没有setIntent。当前DeviceActivity读取原intent中的设备/账号上下文，没有onNewIntent/setIntent覆盖；脚本不传空业务extras去替换原上下文。以上是源码证据，仍须实际同record/More守卫通过才算复用，不能据此宣称运行已通过。

首次实际运行40944因help命令非零usage退出而在readonly-cli-preflight阻塞，radio零变更，finally正常退出通过。该记录保留；本次修正只改变工具的能力发现/恢复方式，不能回写首次结果，也未由工具作者重新运行ADB。

前三次失败报告均保留。第三次29224已真实More baseline GET通过，但Shell的reorder启动在非导出Activity边界被拒；radio零变更，正常logout通过。当前focus修正待Root重新创建parent后执行，不能将前次baseline或源码检查升级为新恢复/断网已通过。

使用已核验的 svc 关闭 Wi-Fi/data，再开启 airplane；必须通过物理 Wi-Fi disabled、mobile_data=0、airplane enabled 和 dumpsys connectivity 中唯一明确的“无 active default network”同时确认隔离。若 Ethernet/其他网络仍有 default，或者命令/状态形状不支持，记录前置阻塞并恢复，不能把普通服务错误页当作断网成功。只改 AVD radio，不改主机网络、ADB 连接、代理、TLS、OS DNS 或 AVD 启动参数。

恢复同 DeviceActivity 后等待真实 More error，旧 loaded 不作为通过。原网络恢复并复核后只点一次 More 重新读取，等待从 error 回到 loaded。全部是原生授权后的实际 GET；Owner 自动重连/get仍属只读。没有 desired/control、设备关系、分享凭据、验证码、日程/OTA写入或账号A/B切换。

## 精确复原与退出

在首个网络修改前标记 touched；即使命令部分失败也进入 finally。先恢复捕获的 airplane、mobile_data、Wi-Fi 原状态，然后读取设置/物理 Wi-Fi/default network presence 比对；不强制改成“全开”，也不盲删设置。如果状态不能确认恢复，退出标阻塞，保留安全原值供人工核对，不在失联条件下盲发 logout。

网络恢复后核验 APK SHA，正常从 Welcome 冷恢复至 Home，最多点击一次 Home 退出，确认 Welcome。此处 force-stop/start 只用于 finally 清理，不计入同实例恢复证据。已在 Welcome 时不点击；遇“重试本地清理”或 logout 未确认，不重复 DELETE、不 pm clear、不删除 Token。最后关闭本脚本启动的 DNS relay。`--dns-upstream`复用真实 loopback 转发，既不是业务 mock，也不会配置网络或猜上游。

SIGINT/SIGTERM在有限同步命令返回后进入 finally；强制终止进程无法保证 JavaScript 复原，应按报告原状态人工核对。阻塞 HTTP 可能超过本地取消时限；脚本采用有限等待，超出即记录阻塞，不通过重新打开新 Activity 绕过。

## 报告与隐私

报告 `android-device-read-lifecycle-{run}.json` 包含脚本/parent/APK/source hashes、安全 radio 布尔状态、命令能力布尔值、ActivityRecord/task身份、阶段固定错误码、恢复与logout结果、DNS真实上游计数。CLI帮助、dumpsys、SSID/IP/networkID、原始XML、页面正文及原始错误都不输出/归档。

默认不截图。`--screenshots`仅允许 More 固定 error 状态，截图前后均检查 package/error/没有 loaded，PNG只在通过后置守卫后写盘；不保存 loaded metadata、成员、房间或账号截图。Node/JS纯检查不代替 Root 实际执行、iOS、硬件、完整视觉或网络异常根因验收。

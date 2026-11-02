# 模拟器 ANR 排查

状态：进行中，缺陷未关闭。此记录区分应用 ANR、先前系统组件 ANR 与正常条件下的复测。

## 已知事实

- 2026-11-01 基准验证中，品牌入口及空登录检查通过，输入阶段出现无响应弹窗。初始自动化只识别为弹窗阻塞；后续标题确认是 **ROWAN 验证 isn't responding**，归属本次验证应用，按应用缺陷保留。
- Android `lastanr` 返回：`Input dispatching timed out`，组件为 `com.rowan.iot.dev.refactor/...WelcomeActivity`，等待 `FocusEvent(hasFocus=true)` 5011ms。
- 当时 Windows 可用物理内存约 626MB / 总约 16GB。本任务 Gradle 9.3.1 守护进程约 2074MB Working Set；另有 Kotlin/Java 进程约 555MB。未停止用户其他应用。
- 确认本任务无运行中的 Gradle 后，用当前 Wrapper `--stop` 停止 1 个守护进程；随后主机可用内存约 3407MB。
- 仅查询本验证应用的 ANR 主线程记录，未取得可读栈；未采集全设备 bugreport、其他应用日志、账号输入或凭据。
- 在无并行 Gradle 构建、释放资源后，**同一 APK** 重跑，品牌入口、空输入/同意门禁、真实登录、冷启动刷新、RN 内置包与返回、退出全部通过。此结果不能单独证明 ANR 的全部根因。

## 后续验证

继续控制构建与模拟器并发，完成注册、屏幕及字体矩阵并记录运行条件；排查原生存储/密钥访问是否可能落在 UI 线程。若复现，优先获取该应用主线程证据，不用等待或关闭弹窗改写已有失败。此前 Pixel Launcher/System UI 无响应是独立记录，不能用来解释本次应用 ANR。

## 后续复现与原生页面隔离（2026-11-01）

- APK SHA256 `1654a469b6ece181ead0d8c999e222d0a0ab9ceec02adeb29889ba59e40f315a` 在 `android-emulator-2026-11-01T09-49-57.441Z.json` 再次出现 RN 首次进入失败。`lastanr` 指向本应用 HomeActivity 等待 `FocusEvent(hasFocus=false)` 约 5003ms，当前前台为 DeviceActivity。不能将该失败解释为自动化没有点击设备。
- 此次无并行 Gradle，主机可用内存约 5563MB / 16268MB，模拟器可用内存约 1128256kB。内存不足不能单独解释这次复现。目标 ANR 文件没有可读 Java 主线程栈；稍后实时主线程采样位于 Looper/epoll 等待，该采样不代表超时发生时的栈。
- 使用仅限本模拟器的有界 UI 导出工具确认弹窗归属，并通过键盘选择等待后取得 RN 页面；这是诊断恢复，未计为修复通过。未采集其他应用或全设备 bugreport。
- 强制停止本验证应用后，隔离 RN 的只读原生流程 `android-native-readonly-2026-11-01T10-32-04.152Z.json` 中房间读取、产品分类与详情、返回栈、退出登录 5 项通过。RN 在该报告中明确排除，不能用此结果关闭 ANR。
- 已加入 development 构建专用 `RowanStartup` 阶段耗时日志，仅含阶段、线程及耗时，不含账号、设备标识或连接参数。尚需用新包测量首次 React Host/Hermes 创建与窗口焦点切换，再根据证据修复；当前缺陷仍未关闭。

## 带诊断新包首次进入复测

`android-emulator-2026-11-01T11-12-52.560Z.json` 对 APK `568d4cbc5c953d781215da1454d8b565009d9d113ceb785c43f8f0e711603ebf` 验证启动、真实登录、冷恢复和 RN 只读页面渲染通过，本次没有出现 ANR。报告内脱敏 `nativeDiagnostics` 记录第一次 Host factory 158ms、DeviceActivity 创建485ms、恢复3ms、首页丢焦点0ms、设备页得焦点4ms；应用加载阶段分别177ms和523ms。

该单次正常结果没有定位或证明历史 FocusEvent ANR 的根因，缺陷仍保留观察和回归状态。本次原生 MQTT 未产生 Ready/有效快照，状态为connecting→recovering→connecting→failed，另计连接失败，不能因没有ANR就把设备链路标通过。

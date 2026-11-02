# 原生首页房间标签只读核验

只核验当前原生 Home 的全屋/真实房间标签 selected 状态、刷新保留、回全屋及同 Home 实例前后台返回。不重复登录、不退出、不清数据/force-stop、不打开设备/RN或房间管理、不写房间关系。刷新与恢复会触发现有原生 HOME-01 GET；工具不直接调用业务 HTTP。作者本批未运行 ADB/Gradle/模拟器或网络。

## 离线检查

```powershell
node --check docs/tools/verify_home_room_tabs.mjs
node docs/tools/verify_home_room_tabs.mjs --self-test
```

内置纯 XML/父报告/sidecar/前台组件 fixtures；此模式不运行 ADB/git、不读取 APK、不写报告、不联网，不能当成 UI 或平台验收。

## Root 后续独占 UI 窗口执行

```powershell
node docs/tools/verify_home_room_tabs.mjs --parent-run=2026-11-02T00-00-00.000Z
```

示例时间戳须替换为真实 `android-emulator-<timestamp>.json` 的已登录 keep-session 父报告；不提供凭据。固定基础 `emulator-5554`、专用 API36 AVD、隔离包 `com.rowan.iot.dev.refactor`，不接受其他串口、包名、环境或用户名参数。前置必须已是原生 Home 前台；不能靠此工具恢复、登录或切换账号。

严格要求父报告 AUTH-04 实际通过且 `sessionKept=true`、本地 release APK及 `.provenance.json`、已安装 base.apk SHA、当前 `sourceFingerprint(['android-as','app-rn'])` 全部匹配，构建前后源码一致且 x86_64。Root 并发修改源码或安装新包后，旧父报告会被拒绝；不可跳过校验。还需既有 `android-ui/snapshot.mjs` helper 已部署；工具不安装、不启动模拟器、不改权限或系统设置。

## 运行范围及输出

1. 确认 Home 非清理/多选/账号页面，安全选择全屋；验证恰好全屋 selected，刷新后仍是全屋。
2. 存在真实服务返回房间标签时，仅点击第一个稳定且完整可见的房间 tab，验证只有该 tab selected；刷新后定位内存中唯一同名 UI tab，验证仍 selected，再回全屋。不滚动猜不可见房间、不造房间或样本数据。同名标签无法确定身份时阻塞，不能拿 ordinal 充当 opaque room ID。
3. HOME 键后台，再 REORDER_TO_FRONT/SINGLE_TOP 返回；要求同 resumed ActivityRecord/task identity、全屋仍 selected。不能用重新创建空 Home 冒充同页面恢复。本工具不按 Home 的系统返回键（可能退出任务），不进入别页模拟返回。
4. finally 仅在本工具已验证/拥有 Home 时尝试回全屋；不关闭陌生页面、不登出或清会话。恢复失败明确阻塞。

刷新核验必须实际观察原生“正在刷新设备…”状态，然后等待读取结束再检查 selected；如果网络很快、快照没捕获加载窗口，记录 `未验收/REFRESH_LOADING_WINDOW_NOT_OBSERVED`，不把点击后仍显示的旧列表当成刷新完成。工具不为捕获窗口自动重复刷新。

没有房间 tab 时记录 `未验收/NO_SERVER_ROOM_TABS`，退出码非零，仍执行全屋及前后台检查并保留会话。它表示实际 fixture 不足，不是功能失败或覆盖通过。加载失败、当前账号/前台变化、目标不稳定或实例不同也阻塞。

报告为 `docs/测试报告/重构实施-20261101/android-home-room-tabs-<timestamp>.json`，仅保留数量、固定状态/检查ID、APK/sidecar/脚本/父报告及源码指纹、恢复状态和零写操作记录。房间标签文本只在内存辅助匹配，不输出房间/设备名称或 ID，不保存 XML、dumpsys、命令错误正文；没有截图选项。`sessionKept` 只表示工具最终确认仍在 Home 全屋，不能替代父报告身份或证明没有外部账号切换。

工具不能通过公开UI读取 native accountRevision，运行期间必须避免外部账号操作；原生前台发生变化即停止，不能宣称覆盖账号变化隔离。typed ID/房间成员关系仍由域层 fixture 和独立真实接口记录验证；本工具不能借 UI selected 状态假证明。视觉/在线蓝湖版本、iOS和真实硬件仍未验收。SIGINT/SIGTERM会在有界调用后尝试安全回全屋，强杀或设备失联不能保证恢复。

前后台恢复已修订为系统最近任务：仅匹配桌面组件下唯一、完整可见的“ROWAN 验证”snapshot卡片，之后核对原ActivityRecord。不会启动内部非导出组件，也不修改exported/权限或用新页面替代原实例。共享helper有独立8项离线防误触检查，公开Welcome实际同实例恢复probe已归档。

基础AVD使用127.0.0.1 DNS时可加 `--dns-upstream=192.168.31.1`；复用既有仅内存DNS真实UDP转发器，在finally关闭并记录状态，无业务mock、TLS绕过或主机全局网络变更。主报告的转发器已关闭，子工具须自行开启，不能依赖过期DNS缓存。

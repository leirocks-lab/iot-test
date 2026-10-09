# CHG-20261009-001 添加设备业务与UI对接

整体视觉还原由UI同事负责，本轮没有重做公共主题/素材/卡片。新增业务模块均在src/app之外，现有add/scan路由仍为Expo Router页面。

## 业务接口

`runtime.onboarding.acquire()`获得当前账号的AddDeviceFlow；`runtime.scanner.acquire()`获得QrScanFlow。两者有`subscribe`、`snapshot`，可直接使用React的useSyncExternalStore。重新进入页面保留未知事务；账号变化清除旧上下文，完成后下一次添加创建新上下文。上下文只在本次Runtime内存中恢复，重启App后的事务恢复未实现，不能宣称跨进程持久恢复。

Add操作：`scan`、`select(candidate)`、`provision(ssid,password)`、`reconcile`、`finish(nickname|null)`、`retryRealtime`、`stop`。`finish(null)`表示跳过，绑定未确认前不可调用。当前真实配网未接入，页面只接受明确标注的模拟SSID/密码。

| 状态 | UI消费与可用动作 |
| --- | --- |
| idle / failed | 发现、已有产品、重试；有error则显示错误，不以无结果解释拒权 |
| scanning / selecting | 显示扫描或详情加载；禁用重复提交；可停止客户端操作 |
| selected | 设备/产品、网络能力提示、密码显隐、配网帮助、连接操作 |
| provisioning / binding | 展示message；deviceStep是最近设备阶段；不按计时填百分比 |
| unknown | 保留原事务，只提供reconcile；不显示再次配网或换设备操作 |
| bound / finishing | 绑定事实已确认；昵称保存/跳过及完成步骤；失败仅重试失败步骤 |
| complete | HOME-01已经包含设备；允许回首页；realtime失败单独显示及重试 |

`nickname`区分pending/saved/skipped；`visible`区分首页结果；`realtime`区分pending/ready/failed。密码/Token/bindCode不进入公开状态。`stop`仅停止客户端活动，不代表设备端或服务端已取消。

Scan操作：`read(string[])`、`choose(index)`、`confirm`、`reconcile`、`reset`、`stop`。多码图没有默认selected，确认按钮保持禁用；只选一个候选。`confirm`返回产品入口或已确认BindingResult；绑定结果后由Add页面读取设备当前权限信息再进入昵称结果流程。

## 生命周期接线

- 菜单打开不申请相机/蓝牙权限。扫码相机仅在页面聚焦、App前台、无候选且未选图时挂载。
- 相机权限不能再问时显示系统设置和相册方式；相册使用系统单张选图，不提前索要完整相册权限。
- 失焦、后台或明确停止时清理本轮监听/请求及页面密码；晚到结果不能导航或覆盖新轮次。
- 原生协议由DeviceTransport承载；productID是适配层解析/映射结果，Mock注册表仅在Mock适配器中使用，不在页面按型号推产品能力。
- 网络类型取自expo-network，UNKNOWN/VPN不当作确定无Wi-Fi；SSID/频段无能力时明确提示，不显示假SSID或按名称猜测频段。

## 开发演练

执行`pnpm web`，用rowan@example.com / Rowan@123登录Mock。Home“+”→添加设备→直接扫描蓝牙→选除湿机→填模拟SSID及非空模拟密码→绑定确认→昵称/跳过→返回首页。

相册测试图片为本包验收证据目录中的“模拟产品二维码.png”和“模拟多码图片.png”。正式二维码/真实设备驱动未支持，页面与Node结果均不能作为设备实测结论。新相册/网络模块及插件配置需要重新构建原生开发包。

待继续：真实SSID/原生权限与驱动、生产二维码及绑定码、双平台相机/相册/后台/网络运行验收、MQTT真实连接及凭据生命周期。

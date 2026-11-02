# 酒柜受控展示模块（未接生产入口）

实现位置仅在本特性与 `app-rn/tests/device-control/`。当前不被 `DeviceEntry` 引用；无 HTTP、MQTT、BLE、账号、存储、凭据、定时器或自动重试。测试数据只存在于单元测试，不作为页面运行数据。

## 输入与动作契约

`WineCabinetScreenProps` 见 `types.ts`：

- `input.context` 包含 resourceId、accountRevision、connectionEpoch。所有 `ControlIntent` 携带完整上下文；旧设备、账号或连接的命令反馈不参与展示。
- `input.capabilities` 是宿主根据**已核验产品能力映射**提供的语义控件配置。每项必须有不透明 bindingId、kind、permission、writable、requiresPower 和 conflictsWithChildLock；可附加 disabledReason。字段名称、布尔值编码、倍率、模式、灯色、亮度档位、产品权限全部由宿主映射，页面不从产品名称推断。无有效映射时显示说明并禁用控制。
- `reported` 是宿主归一化的最近设备确认值。布尔值必须是真正 boolean；数字须有限且在明确范围内，未知显示 `--`，不转换成 0/false。只读能力仍可展示确认值。
- 温区目标、min/max/step 必须已经由宿主按用户偏好转换，并明确 `temperatureUnit` 与 `unit`。切单位通过 `onTemperatureUnitChange` 回调交给宿主；新单位对应的目标和范围未到达前禁用。`currentTemperature` 的实际测量值可带明确源单位，纯适配器只做其 C/F 显示换算。
- 数字输入按 min/step 检查网格和边界。连续点按基于最高有效 sequence 的待确认目标前进，主数字始终保留 reported，不将发送中的目标冒充设备值。宿主/容器应及时发布新 intent sequence 的展示反馈，随后由原生任务回传阶段；页面不拥有原生任务。
- `commands` 来自宿主，阶段为 sending/sent/cloudAccepted/targetReached/rejected/unknown。取当前上下文下每控件最高 sequence，同序旧 sending 不回退终态。云接受文案为“云端已接受，等待设备确认”；targetReached 仅为“目标状态已到达”，不证明命令因果或自动改写 reported。超时、离线、拒绝停止等待指示，保留确认值。
- 清洁重置是 action 能力；点击先调用 `onRequestCleaningResetConfirmation(context)`，由外部 `confirmingCleaningReset: DeviceControlContext | null` 控制弹窗，确认后才产生 value=`trigger` 的意图。确认对象必须与当前资源、账号和连接相同，切换后旧确认不显示且不能产生新设备操作。待定 action 禁止重复提交；未知结果不自动重放。宿主须再次校验且持有一次性任务。
- 告警保留 id/code/message/occurredAt/active 上下文，active=null 不显示为已恢复。维护计时仅展示宿主提供的带单位值。
- `actions` 仅为展示层回调；onBack/onMore 请求导航，onReconnect 请求宿主恢复，onControl 传递已做输入校验的意图。原生仍须重新校验上下文、权限、能力、单位与取值。
- `insets` 由原生容器提供。本页不画系统状态时间、信号或手势条；原生接入时须避免重复标题栏。底部开关/童锁在滚动区外，童锁开启时仍可访问解锁入口。

## S059–S073 范围逐项对应

已逐项读取 `docs/SDD/重构范围追踪.json`，这里只实现已授权的受控展示部分。

| 范围 | 本特性职责 | 宿主职责/尚未集成 |
| --- | --- | --- |
| S059 静态元数据 | title 等输入展示 | DEVICE-02 读取及归属校验 |
| S060 MQTT 连接 | loading/connection/unknown 展示 | DEVICE-01、凭据、连接、订阅、查询 |
| S061 开关 | 受控开关和阶段反馈 | 下发和 reported 结果 |
| S062 目标温度 | 双温区、显式单位/范围、用户偏好回调 | 正式产品映射及目标/范围单位转换 |
| S063 目标湿度 | 仅有显式能力时显示数字控制 | 正式湿度字段、范围与结果 |
| S064 模式 | 仅显示传入枚举 | 产品枚举与协议映射 |
| S065 灯光与亮度 | 开关、传入灯色/亮度选项或数字范围 | 正式映射及设备回报 |
| S066 童锁 | 锁定展示、按显式冲突标记禁用控件 | 锁状态和控制权限 |
| S067 静音 | 可选受控静音及失败反馈 | 产品是否支持及执行结果 |
| S068 清洁计时 | 带单位维护使用值 | 正式计时上报和归一化 |
| S069 清洁重置 | 确认弹窗、一次性动作意图、防待定重复提交 | 产品动作字段和原生任务结果 |
| S070 属性同步 | 只展示传入确认状态 | 单一权威状态、订阅和恢复 |
| S071 故障告警 | 保留事件上下文，不推断恢复 | 原消息/设备接口、告警映射 |
| S072 控制超时 | unknown/rejected/offline 结束等待、保留确认值 | 原生命令超时与任务归属 |
| S073 断线重连 | 显式重连意图回调 | 凭据刷新、订阅恢复、一次 get |

范围原文保留的 property/set、property/update、service/call 名称不授权 RN 建立通道；具体 MQTT 以 V1.6 Corrected Classic Shadow 为依据，由原生负责。本模块仅使用语义意图接口。

## 视觉依据、资源与已知差异

- 逐张查看本地 `docs/ui/酒柜插件首页-完整.png`、`酒柜插件首页-完整离线.png`、`酒柜插件首页-完整关机.png`、`酒柜插件页-童锁开.png`。
- 对照读取蓝湖本地导出 `lanhu_jiuguichajianshouyewanzheng` 的 JSX/CSS、关机页 CSS、童锁页 JSX/CSS。背景 #F2F2F2、343/375 卡宽关系（左右16）、圆角12、间距10、温度36、单位16、说明12、主蓝 #186DAF、灯色圆42、单位组136×44、开关图48、灯光轨48×24等取自这些资料。卡片随容器宽度伸缩；文字允许字号缩放，44最小触摸尺寸优先于原稿较小触摸外框。
- 13 个 PNG 为蓝湖原文件直接复制，不重新绘制产品，不使用新插画。`assets/sources.json` 列出每个源路径和 SHA-256；`design-sources.json` 固定参考文件哈希。酒柜由导出的原产品/阴影/灯光图层组合，不把整张屏幕截图当交互背景。
- 导出页 page.json 的 pageId=null、groupStatus=not_verified；完整页 JSX 同时包含 C/F 两套叠层布局，截图可见 F 布局。采用可见截图的说明在上、温度在下结构，不复制隐藏的叠层。截图第二温区说明重复“左温区”，本实现按左右温区业务语义显示“右温区”，列为待设计核对。
- 原稿 DINAlternate-Bold 没有随本次交付可验证字体文件；iOS请求系统 DINAlternate-Bold，Android使用系统 condensed 数字字形，正式字体及像素比对仍待核对。没有引入字体或图标依赖。
- 灯色/亮度/模式选项必须来自能力配置；缺少时显示未配置说明。额外湿度/模式/静音/维护/告警只在有明确能力或数据时出现，视觉为现有卡片规范的保守延伸，未计为蓝湖像素验收通过。

## 检查与验收边界

纯 view-model 测试验证空值、映射/单位/范围、权限、锁定、并发 sequence、云接受、失败、未知、一次性动作与告警上下文；`pnpm --dir app-rn lint`、`typecheck` 和 `test --maxWorkers=1` 独立执行。未接入口、未在原生容器渲染、不运行 Metro/Bundle，本组件没有 Android/iOS UI、通信或硬件验收结论。后续须用真实能力、真实原生回调和各状态截图验证。

版本核对：React Native 0.86.3 / React 19.2.3；参考官方 [Pressable](https://reactnative.dev/docs/0.86/pressable)、[Switch](https://reactnative.dev/docs/0.86/switch)、[ScrollView](https://reactnative.dev/docs/0.86/scrollview)、[TextInput](https://reactnative.dev/docs/0.86/textinput)、[Image](https://reactnative.dev/docs/0.86/image)、[Modal](https://reactnative.dev/docs/0.86/modal)、[Accessibility](https://reactnative.dev/docs/0.86/accessibility)、[StyleSheet](https://reactnative.dev/docs/0.86/stylesheet)。未新增依赖。

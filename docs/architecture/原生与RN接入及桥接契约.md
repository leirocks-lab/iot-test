# 原生与 RN 接入及桥接契约

[返回架构总览](架构总览.md)

## 接入与导航

双端引用同一 `app-rn`，参与原生依赖解析、自动链接、Codegen 和 Bundle 构建。注册组件为 `RowanDeviceModule`，模块为 `NativeRowanHost`。

Android 容器为 [DeviceActivity](../../android-as/app/src/main/kotlin/com/rowan/iot/rnhost/DeviceActivity.kt)，iOS 为 [DeviceViewController](../../ios-as/Rowan/RNHost/DeviceViewController.swift)。初始 props 为 `deviceId`、`pageSessionId`；账号修订由原生持有，不由 props 授权。

RN 内部返回由本地页面栈处理；退出设备流程交宿主。`closeDevice(pageSessionId)` 绑定本页实例，原生拒绝旧令牌关闭后继页面；void 返回不表示已成功关闭。

## 当前契约

唯一签名来源为 [NativeRowanHost.ts](../../app-rn/src/host/specs/NativeRowanHost.ts)。当前 `bridgeMajor=3`，16 个方法、1 个事件。

| 能力 | 方法 |
| --- | --- |
| 上下文 | getContext |
| 观察 | observeDevice、getDeviceSnapshot、retryObservation、releaseObservation |
| 投递确认 | acknowledgeDeviceEvent |
| 六类只读查询 | getDeviceSchedules、getDeviceFirmware、getDeviceMoreSummary、getDeviceMembers、getDeviceHelp、getDeviceLocation |
| 原生确认解绑 | requestDeviceSelfUnbind、cancelDeviceSelfUnbindConfirmation、getDeviceSelfUnbindState |
| 页面关闭 | closeDevice |

`onDeviceChanged` 与观察 Promise 使用相同完整摘要 DTO。上下文含 `bridgeMajor`、`sessionRevision`、`authenticated`、`language`；可选 `selfUnbindVersion=1` 只表示契约支持，不授予解绑权限。

## 方法和事件语义

- RN 先监听，再调用 observe；Promise 返回前的事件有界缓存。
- `observationId` 标识观察，`sessionRevision` 隔离账号，`connectionEpoch` 隔离连接代际。
- `revision` 是观察投递序号，`authorityRevision` 是原生资源修订；二者不等于 MQTT Shadow version。
- 重复和倒退事件不更新展示；缺序时用同一观察句柄读取快照，不重复建连接。
- ACK 仅确认收到事件，不代表设备执行成功。释放观察和 dispose 必须幂等，迟到结果不得回写页面。
- 当前错误类别包括 not_authenticated、session_changed、forbidden、unavailable、timeout、closed、invalid_snapshot；UI 使用固定脱敏文案。

原生按账号、观察句柄及页面重新校验查询和操作。DTO 不携带 Token、MQTT 凭据、任意 URL 或可任意执行的请求。

## 兼容与扩展

当前 RN 拒绝 major 2 宿主。增量能力通过明确版本门禁；破坏性语义升级 major。新增控制、分享写入、定时写入和 OTA 操作前，应同步规格、双端适配、运行时校验和契约测试。

规格变更后重新生成双端代码，分别编译和运行；Codegen parser 成功不能代替原生集成验收。当前实现细节见 [host 说明](../../app-rn/src/host/README.md)，历史 major 2/3 记录保留原时间边界。

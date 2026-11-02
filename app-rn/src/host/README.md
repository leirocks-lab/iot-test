# NativeRowanHost major 3：设备状态、页面关闭与原生确认解绑

原只读批次接入原生 read owner 的元资料与状态摘要；新增S096可选契约见本文末尾，仍待原生统一构建与运行验证。它不是完整设备控制、MQTT实机验收或蓝湖视觉验收。`features/device-control/WineCabinetScreen` 仍保留为未接线的受控展示组件；未核验产品字典、权限与字段映射前不把摘要拼成控制能力。不新增连接、登录态、存储或控制方法。

## 契约

Codegen输入为 `specs/NativeRowanHost.ts`，模块名 `NativeRowanHost`、根注册名 `RowanDeviceModule` 不变。HostContext保留bridgeMajor/sessionRevision/authenticated/language，major必须等于3且已认证才观察；旧major2明确不兼容。当前Spec方法总数为16，其中S096三方法由可选selfUnbindVersion=1门禁；事件仍为onDeviceChanged。

- `observeDevice(deviceId): Promise<DeviceSnapshot>` 建立观察并返回初始完整摘要；RN先注册事件监听。
- `getDeviceSnapshot(observationId): Promise<DeviceSnapshot>` 读取已有观察者的原子最新摘要。缺序/溢出不再次observe，不制造新连接。
- `retryObservation(observationId): void` 仅请求原生所有者重试；不代表设备上线或执行成功。
- `releaseObservation(observationId): void` 释放该观察，不能关闭其他使用者连接。
- `getContext(): Promise<HostContext>` 保持原四字段；`closeDevice(pageSessionId: string): void` 只请求关闭该原生页面实例。
- `onDeviceChanged: CodegenTypes.EventEmitter<DeviceSnapshot>` 与Promise使用相同完整DTO。

所有字段必填；字符串无值用空串，布尔值与数值显式返回。摘要字段：deviceId、observationId、sessionRevision、revision、authorityRevision、connectionEpoch、title、productCategory、phase、online、stale、snapshotAvailable、errorCode。没有reportedJson、credentials、URI或任意请求能力。

`revision` 是每observer投递序号；`authorityRevision` 是原生owner资源版本；`connectionEpoch` 是连接代际，0只表示尚未连接。已有观察不能倒退epoch或authorityRevision，terminal摘要同样应保留其最后epoch。`phase` 固定为authorizing/connecting/reading/live/recovering/failed/closed，`online`固定为online/offline/unknown。RN不把unknown当false或offline。errorCode有限为空串、not_authenticated、session_changed、forbidden、unavailable、timeout、closed、invalid_snapshot；未知码只选择固定通用文案，绝不显示码或原始错误。

## 交错、取消及恢复

`DeviceSessionController` 是可注入host的纯TS单次生命周期对象。它先核验context，再订阅事件、调用observe；初始Promise返回前的事件有界保存。设备/账号/句柄/旧epoch/owner版本倒退或重复delivery都不会替换当前显示副本。缺序事件保留给resync重放；resync期间继续有界缓存，返回快照先安装，再按序重放更晚事件。原生Promise被拒绝或同步抛异常只返回固定本地错误类别。

缓存默认128事件；丢弃watermark与初始observer索引同样有界。成功恢复覆盖缺失投递后清除溢出标记；未知observer过量导致无法证明安全恢复时保守失败。单轮最多两次自动snapshot读取，仍缺序则显示失败等待用户显式重试，避免Promise循环。重试复用相同handle，不重新observe。

dispose幂等、立即解除订阅并清显示副本；尚未返回的observe若晚到，仍释放其handle。已经释放后的resync/事件不会回写UI，旧controller不能影响替代controller。原生应在账号切换时发当前观察的终止摘要并清理owner；RN不会自行产生第二账号状态。

## UI与验证边界

DeviceEntry使用原生title，固定中文状态文案以及返回/适用重试。状态控件ID：`rn-device-status`、`rn-device-retry`（仅适用时出现）、`rn-device-close`。旧 `rn-bootstrap-status` 已由新的status替代。断线或stale不把缓存online呈现成实时在线，权限与会话终止不给重试。页面没有控制成功提示。

本轮只运行独立pnpm lint/typecheck、Vitest单worker及已安装0.86.3 Codegen parser；未运行Gradle/ADB/Metro或HTTP/MQTT。旧major1/2 APK不能作为此契约的装机验收，需Android/iOS双方签名和Codegen一致后由Root统一集成。

官方版本依据：[RN0.86事件](https://reactnative.dev/docs/0.86/the-new-architecture/native-modules-custom-events)、[RN0.86 Codegen](https://reactnative.dev/docs/0.86/the-new-architecture/using-codegen)。事件返回的subscription以remove释放，变更Spec后必须重新生成双端原生产物；TS parser成功不等于双端编译或运行验收。

### 有界事件收件确认（major 2阶段引入，major 3保留）

新增 `acknowledgeDeviceEvent(observationId: string, revision: number): void`，仅确认该投递已抵达JS回调，不是设备执行、云接受或状态有效性的确认。原生每observer只保留一个在途事件和一个待发latest，待发内容覆盖旧摘要；ack只能释放匹配的在途序号，旧ack/未知ID由原生忽略。覆盖造成的序号gap继续使用同handle的getDeviceSnapshot重同步。

controller在callback入口、上下文/旧版本/已dispose筛选之前，先对非空字符串observationId与非负safe-integer revision发ack，因此旧账号、旧observer、旧epoch和已排队的卸载后回调也能完成收件确认。异常ID/非法revision不转发；ack同步抛错被隔离，不中断显示处理或最终release。原生仍负责生命周期门禁、终止与队列上限，RN缓存上限不能代替Native→JS待发队列限量。

### 页面实例关闭（major 3破坏性变更）

Native每次创建设备页面时生成独立pageSessionId，并通过DeviceEntry初始props注入；它不是账号、设备ID或观察ID，也不加入getContext。Native必须验证token仍属于当前可关闭的页面实例，旧token不得关闭替代页面。

RN的createNativePageClose从该组件props捕获不可变token，排队的旧A回调仍只能发送A；不能在关闭时向getContext或全局变量索取最新B的token。每个用户关闭意图都携本页原token；void RPC不表示原生已经接受关闭，因此不设永久one-shot锁。原生按token/当前top页面校验，使迟到或重复意图不能关闭别页；A恢复后同action仍可请求关闭A。native同步抛错被隔离且只能重试原token。props缺失/非法时不发关闭RPC，按钮禁用并提示使用原生返回键/手势。系统Back/原生返回导航不依赖这个RPC。

测试覆盖共享host的A延迟关闭与B独立关闭、props对象复用、缺token、重复手势、同步异常及major2拒绝；它们是纯TS调度与controller检查，不是原生页面policy或双root运行验收。日志/schema/source hashes归档app-rn/.cache/verification/native-page-close；既有major2截图与410项Android GREEN均保留为旧契约历史证据。

后续修复去掉永久requested锁：新增“同A helper迟到关闭被B拒绝→B合法关闭→恢复A后原action再次派发A并关闭”的回归，旧重复手势用例改为验证native token边界阻止A误关B。先实际RED观察这两项失败，再移除锁；完整100项单worker测试及lint/typecheck/Codegen的当前日志在app-rn/.cache/verification/single-close-repeat。先前99项与原生生命周期报告仍按当时源码保留，不冒作该修复的新APK验收；major3/13方法未变。


### S096 原生确认与解绑状态（兼容 major 3 的增量契约）

新增可选 HostContext.selfUnbindVersion=1 仅表示桥支持，不授予权限。缺字段的旧 major3 宿主不会被调用新方法；旧只读/关闭契约保持。当前接口由13增至16方法，原onDeviceChanged/ACK不变。新增 requestDeviceSelfUnbind(observationId,attemptId)、cancelDeviceSelfUnbindConfirmation(observationId,attemptId)、getDeviceSelfUnbindState(observationId)。attemptId仅有限相关ID；native从真实观察者/页面派生注册、用native metadata展示确认并生成独立intent，RN没有用户/设备关系ID、receipt、HTTP或持久任务。

DeviceSelfUnbindState只含observationId、sessionRevision、独立revision、status、errorCode、canRequest。canRequest由native实际账号、handle、页面和已有任务计算。确认取消、More离开、后台与dispose撤精确待确认请求，不取消已派发app任务；没有周期轮询或自动重发。状态Promise完成不代表解绑成功；UNKNOWN、待清理、已不存在和历史结果各自显示，原页面自身撤权后仍能查询已知任务。返回首页沿用本页V3原生关闭能力；HOME实际新读和原资源清理完成前不报成功。

这是待统一原生构建/安装验证的源码契约。RN缓存副本检查不能替代真实DELETE或双端运行；iOS仍无macOS编译/XCTest证据。原13方法/100项测试与旧APK记录均保持其历史语义。

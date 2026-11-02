# Paho 1.2.5 原生 BrokerPort 适配

仅实现 `BrokerTransportFactory` / `BrokerPort`，不拥有账号、设备归属、凭据续期、连接共享、命令目标、超时重试或产品字段映射。这些仍由原生 pool/service/reducer 管理。本目录未接入 AppServices、RN 或生产设备入口；没有真实 broker 验收。

## 固定 SDK 行为

- 精确依赖版本由根 Gradle 配置管理：`org.eclipse.paho:org.eclipse.paho.client.mqttv3:1.2.5`。本代理未修改 Gradle。
- 创建使用服务端给出的 clientID、未经改写的签名 URI 和 `MemoryPersistence`，不调用默认磁盘持久化构造器。
- `cleanSession=true`、MQTT 3.1.1、`automaticReconnect=false`、断线 buffer 与 buffer persistence 均关闭。没有 will、离线队列、自动重连或 desired 重放。
- 默认平台 TLS trust chain，显式开启 HTTPS hostname verification；不设置宽松 HostnameVerifier、SSLProperties 或替代 endpoint/ServerURIs。
- connect 仅在 SDK CONNACK action success 后完成；subscribe 仅在对应 SUBACK grant 数量与请求数量相同且每项恰好为1后完成，0/2/128/缺项均拒绝。publish 固定 QoS1/retain=false，仅对应 action callback 的 PUBACK 完成，不解释为设备执行结果。unsubscribe 等待对应完成回调。

## Host 与签名一致性

已用下载的官方1.2.5 jar `javap -c -p` 核对实际 `WebSocketHandshake` 与 `WebSocketSecureNetworkModuleFactory`：WSS 默认端口443；handshake 只在端口80省略端口，因此实际 Host 为 hostname:443。customWebSocketHeaders 在默认头之后追加，不能覆盖默认 Host。

故此适配器要求 URI **显式 :443**，且 URI rawAuthority 与 BrokerKey 的 canonical authority 完全相同。拒绝省略端口、`:0443`、大小写/authority不一致等情况，不改写 URL、不添加第二个 Host、不替调用方重新签名。签名准备阶段应使用 `MqttCanonicalHost.HOSTNAME_AND_DEFAULT_PORT`，让 URI 和已签 Host 同为 hostname:443。

CONNECT 用户名与密码必须同时存在或同时缺失；有签名查询的 URI 不允许附加 CONNECT 用户名/密码，从而避免将 STS Access Key/Secret 误发进 CONNECT。普通无查询 WSS 可显式传入原生已核验的用户名/密码。

## 取消、关闭与 SDK 日志

- `suspendCancellableCoroutine` 每次操作有独立 waiter。调用方取消仅摘除该 waiter；`IMqttToken` 没有 cancel API，不能声称操作未被 broker 接受。不会因此关闭共享 client、退订其他资源或重发命令。取消 SUBSCRIBE 后已发/未知 grant 的清理由 pool 的订阅引用与取消清理策略承担。
- close 先同步 CLOSED 并终结待定 waiter，随后交独立 IO worker 清理。可注入 teardown 调度器测试关闭前后顺序；默认 worker 不依赖已取消的 applicationScope，也不阻塞主线程等待远程回执。SDK断开等待使用有限100ms而非零值无限等待，之后强制本地关闭；重复 close 不重复调度。
- SDK callback 不持有适配器锁进入 pool/listener，晚回调/重复 action callback 不重用其他 waiter。连接丢失不触发此适配器重连。
- `LoggerFactory.setLogger` 在 SDK client 构造前安装公开无参 `PahoNoopLogger`。按实际jar实现全部28个抽象方法；包括 formatMessage 也只返回固定字符串，不保留或调用参数、URL、clientID、Throwable 的 toString。没有原始SDK日志。
- 出口异常只构造有限 `BrokerFailureKind` 和固定消息，不附加 SDK cause，不读取其 message/toString。默认描述隐藏 BrokerOptions。反射式/显式调用者仍不得记录传输输入。

## 检查状态与后续接线

17项行为测试使用真实 `IMqttAsyncClient` / token 接口的动态 Proxy，注入 clientFactory 与 teardown，不另造整套SDK接口；没有真实SDK client、socket、网络或私有环境。根已观察到实现前缺失 `PahoBrokerTransportFactory` / `PahoNoopLogger` 的测试编译失败；不将其冒称为行为断言失败。按根要求，代理未运行 Gradle，最终编译和17测试待根统一 GREEN。

后续须由原生连接池注入此factory，凭据解析与签名仍从native auth模块准备；在明确测试设备上完成真实 CONNACK、四条 SUBACK、只读get、断线/续期/账号切换和 SDK退出验证后，才能声称实际链路通过。

## 安全失败诊断（默认关闭）

Factory新增可选 `diagnostics: (PahoFailureDiagnostic) -> Unit = {}`；只有宿主注入才消费事件。DTO只含原有BrokerFailureKind、可空整数SDK reasonCode、固定PahoFailureCause（DNS/CONNECT/TLS/TIMEOUT/WEBSOCKET/IO/OTHER）。没有Throwable、message、URL、host、clientID、凭据、stack或任意文字字段。SDK logger仍为NoopLogger；此回调不恢复原SDK日志。

现有五类sdkFailure入口均通知：client构造、port初始化、action callback失败、同步SDK调用失败、connectionLost。诊断观察者抛出的Throwable被隔离，不改变BrokerFailure映射、continuation结果、共享连接或清理路径。默认行为和TLS/连接参数保持原样。

分类只检查异常类型与数值SDK码。cause链按对象身份去重且最多八层，不读取message/toString/stack，也不把原始cause保留到DTO。通用IOException仅IO，不能从含URL的错误字符串猜测WebSocket响应；ProtocolException在本WSS边界标为WEBSOCKET，仍不代表已知道具体HTTP状态/响应头。SSLException/CertificateException标TLS，不擅自推断证书校验、SNI或协议版本细因。

新增5项@Test（分类表内9向量），Paho测试由17增至22；Root已实际观察到诊断类型/构造参数缺失的RED编译失败。此实现未由代理运行Gradle，最终GREEN及开发环境安全日志注入由Root统一完成。没有新broker请求或TLS行为变更，不宣称解决现场连接故障。

只读jar核对：SSLNetworkModule先设置SNIHostName，再设置HTTPS endpoint identification并startHandshake。Google官方Conscrypt当前[Platform.java](https://github.com/google/conscrypt/blob/master/platform/src/main/java/org/conscrypt/Platform.java)对null serverNames不调用setHostname，因此第二次SSLParameters本身不是SNI被清除的充分证据。未核对AVD精确provider构建，不能据此改连接行为或把现场失败归因SNI。

### Generic reason 0 的 typed transient fallback

Paho实际可用MqttException(reasonCode=0)包裹UnknownHostException。此前只看数值码会误标为永久CONFIGURATION。现仅在reason0时复用一次已有有界cause类型分类：DNS/CONNECT/IO→UNAVAILABLE，TIMEOUT→TIMEOUT；TLS/WEBSOCKET/OTHER继续CONFIGURATION。显式AUTH及其他已定reason映射优先且不变。诊断DTO与返回BrokerFailure共享最终kind，不做第二次cause遍历或解析异常文本。

Root已实际观察到本轮223项测试中的两项映射断言RED；新增3项回归使Paho共25项。代码分类修正不表示模拟器DNS环境已恢复，亦不代表真实Android MQTT链路通过。最终GREEN由Root统一运行。

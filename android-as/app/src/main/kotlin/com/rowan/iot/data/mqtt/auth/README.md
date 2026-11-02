# Android DEVICE-01 凭据与 AWS IoT WSS 签名纯核心

仅负责内存解析和每次连接尝试的参数准备。没有 broker SDK、HTTP、连接池、环境配置读取、后台循环、日志、存储或真实请求。不依赖 domain/device/mqtt/transport，也不接入 AppServices。

## 数据和信任边界

- `MqttCredentials.decode(raw, resourceId, expiryEncoding)` 接受已取得的 DEVICE-01 data 对象；V1.4 字段 host/endpoint/path/clientID/username/password/deviceID 严格要求实际字符串，不填默认值或做数字转换。HTTP resourceId 与 AWS thingRef（响应 deviceID）分别保留，clientID 不改写。
- 当前服务已确认 expiresAt 的数值单位为 **epochSeconds**。实际原生接入应明确传 `ExpiryEncoding.EPOCH_SECONDS`；核心仍要求调用方显式选择 EPOCH_MILLIS/EPOCH_SECONDS/ISO8601/UNKNOWN，不从数值量级猜单位。ISO8601 需要实际字符串、有效日期和明确时区。
- expiresAt 缺失为 `Absent`，已提供但编码未确认时为 `Unknown`。这两种状态均不捏造凭据截止时间；签名 URI 的独立截止时间不能替代凭据期限。后续池不能据 unknown 编造续期缓存策略。
- sessionToken 只在字段缺失时走普通 WSS CONNECT 用户名/密码。字段已存在但为 null、空、错误类型或控制字符时拒绝，不降级。有效 STS 将 username/password 解释为 Access Key ID/Secret Access Key，签名后 CONNECT authentication 为 `None`，不将 STS 密钥放进 MQTT CONNECT。
- host 仅允许 WSS/default TLS port；URI authority 原文只接受 hostname 或 hostname:443。拒绝 userinfo、query（含空 `?` 和外部预签名 URL）、fragment、路径转义、dot segment、双斜杠和非标准端口写法。endpoint 必须是相同 DNS hostname，raw path 必须与独立 path 相同；不猜冲突字段。
- `MqttEndpointPolicy` 默认全部拒绝。STS 要求原生可信来源注入**精确**域名允许列表，并额外验证 AWS IoT 域名形态及 `/mqtt`。不能只凭 AWS-looking host、RN 输入或未经归属验证的响应产生信任。普通 WSS 要求完整 `MqttTarget` 精确允许列表。构造时复制集合，外部修改原集合不会扩大授权。

## 签名和未来传输适配

`AwsIotWebSocketSigner.prepare` 必须显式传入 `MqttCanonicalHost`。HOSTNAME_ONLY 和 HOSTNAME_AND_DEFAULT_PORT 均返回匹配的 `httpHostHeader` 与 URI rawAuthority。未来 Paho 若实际 upgrade 使用 `Host: hostname:443`，就必须选择后者并使用返回的原始 URI，不能签 hostname 后擅自追加端口，或签 :443 后改写成无端口。

签名使用 JCA SHA-256/HMAC-SHA256、UTC 秒级签名时间、空 GET payload、iotdevicegateway scope、逐 UTF-8 字节 URI 编码及编码后排序。AWS IoT 的 STS token 在签名完成后附加，不参与 canonical query。每次调用按传入时间重新签名，无 URL 或密钥缓存。已知凭据期限限制 URL 有效时长；已过期或不足一个可签名秒时拒绝。

默认 900 秒仅是本实现单个签名请求的上限，不保证 STS 存活 900 秒。`credentialExpiry` 与 `signedRequestExpiresAtEpochSeconds` 明确分开。时钟与期限都使用显式 epochSeconds；使用 API24 可用的 Date/严格 GregorianCalendar 工具和 JCA，不引入 java.time desugaring 或新依赖。

`MqttSecret.withValue` / `MqttConnectionParameters.withUri` 是显式传输取值边界。普通 toString 和固定错误不包含密钥、Token、完整 URL 或底层 URI 异常原因；相关持有类没有 Serializable/持久化接口。取值边界的使用方仍不得记录或持久化返回值。Java 反射能绕过 private，且 JVM String 不可保证立即擦除；这里不声称反射防护或安全内存擦除。

## 跨端与检查状态

与 iOS 的 `MQTTCredentials.swift`、`AWSIoTWebSocketSigner.swift`、`MQTTCredentialsTests.swift` 对齐；Kotlin命名使用 Mqtt/AwsIot 前缀，原字段与协议语义保持一致。Android本次按已确认的 epochSeconds 记录，iOS旧README中的“单位尚待确认”属于待同步文字，不改变显式编码 API。

23 项 Android 纯测试覆盖两个公开 golden、期限/类型/目标拒绝、policy 隔离、鉴权分支、Host/URI 一致、fresh 时间与脱敏。根已在实现前观察到缺失核心 API 的测试编译失败；此失败仅证明尚无实现，不冒称行为断言失败。按根要求，本代理未运行 Gradle，Android编译/23测试尚待根统一 GREEN 窗口。

已离线运行 `docs/tools/aws_iot_signing.mjs` 的公开 fixture，复核以下签名与 iOS XCTest 逐字一致，仅输出核对结论，未读取环境或发起网络连接：

- hostname：`1bb6fc1e00f9317a345bfffa3fc27bda14c615a9de3ccaa18f1fb99a287b3588`
- hostname:443：`872790fdb74959803525eaabc7ba186bae286909fcc980175130948ca66de47f`

官方依据：[AWS IoT STS token 后签名附加规则](https://docs.aws.amazon.com/iot/latest/developerguide/iam-users-groups-roles.html)、[SigV4 canonical request / URI 编码 / HMAC](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html)。没有 Android/iOS WSS upgrade、SDK 或真实 MQTT 验收结论。

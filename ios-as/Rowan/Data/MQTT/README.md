# DEVICE-01 临时凭证与 AWS IoT WSS 签名

本目录仅提供纯内存连接参数准备，不接入 HTTP、broker SDK、连接池、UI 或 RN；不会发起连接。`resourceID` 保留 HTTP 资源标识，`thingRef` 使用响应 `deviceID`，两者不要求相等。`clientID` 原样保留。

V1.4 定义的 `host`、`endpoint`、`path`、`clientID`、`username`、`password`、`deviceID` 均严格按字符串解析。实际服务额外返回的 `sessionToken`、`expiresAt` 是尚未冻结的扩展字段。当前 `expiresAt` 的 number 单位尚待确认：调用方必须显式传入 `ExpiryEncoding`，支持 epochMillis、epochSeconds、ISO8601 与 unknown，不按数值大小猜单位。unknown/缺失不产生推测的凭证截止时间，也不能据此安排缓存续期；后续连接池应逐次获取凭证并签名。已知期限会限制签名 URL 时长，已过期则拒绝。

`sessionToken` 字段存在但为空、非字符串或含控制字符时直接拒绝，不能降级。有效 STS 使用 username/password 作为 Access Key ID/Secret Access Key，MQTT CONNECT 不包含这两项。仅缺少该字段时，才提供 V1.4 普通 WSS 的 CONNECT 用户名/密码认证；普通 WSS 同样要求可信目标策略。

`MQTTEndpointPolicy` 默认拒绝全部目标。STS 需要可信原生来源注入精确域名允许列表，且域名必须符合 AWS IoT 形式并使用 `/mqtt`。后续集成可从经过原生 Account/tenant/ownership 校验的已认证 DEVICE-01 响应显式构造 expectedEndpoint；不得从 RN 参数、未经验证的响应或仅凭 AWS 域名语法生成信任，无需增加人工审批或用户输入。普通 WSS 使用明确的完整目标允许列表。仅支持 wss/default TLS port，拒绝 userinfo、query（包括外部预签名 URL）、fragment、路径转义、host/endpoint/path 冲突与非标准端口写法。不会猜冲突字段或信任任意 STS 目标。

签名使用 CryptoKit SHA256/HMAC、`iotdevicegateway` scope、空 GET payload、UTF-8 字节 URI 编码及排序查询。AWS IoT 的 STS token 在完成签名后附加。每次调用重新使用传入的当前时间签名；无签名 URL 缓存。传输适配器必须显式选择 canonical Host 是否含 `:443`，并实际使用返回的相同 `httpHostHeader`，不能在升级时擅自改写。默认 900 秒是本实现的单次 URL 上限，不代表凭证具有 900 秒寿命。

凭证及连接参数没有 Codable/持久化接口；默认 description、debugDescription、Mirror 与固定错误文案不输出密钥或 URL。`withValue`/`withURL` 是显式的传输取值边界，使用方仍不得记录传出的值。没有日志、网络或 SDK 调用。

依据：

- [AWS IoT WebSocket authentication](https://docs.aws.amazon.com/iot/latest/developerguide/iam-users-groups-roles.html)：token 在签名后加入。
- [AWS Signature Version 4 request construction](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html)：canonical request、URI 编码及 HMAC key derivation。
- [Apple CryptoKit HMAC](https://developer.apple.com/documentation/cryptokit/hmac)。

离线 XCTest 源码使用公开 fixture，包含旧工程公开 `1bb6…3588` 向量及独立 Node/Python 对照的 Host `:443` 向量、字段/目标拒绝、期限编码、鉴权分支和诊断脱敏。Windows 仅完成工程结构检查；Swift 编译、XCTest、iOS WSS upgrade 与真实 MQTT 均未执行。已有 Node 只读链路报告不能代替 iOS 验收。

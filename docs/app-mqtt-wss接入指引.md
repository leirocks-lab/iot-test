# App 端 MQTT over WebSocket 接入指引

适用：ROWAN App（V1.4 接口面）连接 AWS IoT Core 收发设备 Shadow。
目标链路已实测全通（2026-10-24，CONNACK=0 / SUBACK 5/5 / shadow get+update 应答收发）。
参考实现：`e2e-mqtt-wss-test.mjs`（本目录，Node 可直接跑通全链路，建议移植前先跑一遍对照）。

## 1. 总流程

```
登录 POST /app-api/session（tenant-id 头 + 账号密码）
  → GET /app-api/devices 拿设备列表（deviceId 形如 dev_209）
  → GET /app-api/devices/{deviceId}/mqtt 拿连接凭证
  → 用凭证预签名 WSS URL → 连接 → 订阅 → 收发 Shadow
  → expiresAt 到期前重新取凭证
```

凭证接口返回字段（DEVICE-01）：

| 字段 | 用途 |
|---|---|
| `endpoint` / `host` / `path` | ATS endpoint，如 `a1tr1j1rc3dn2o-ats.iot.ap-southeast-2.amazonaws.com` |
| `clientID` | **必须原值使用，禁止自拼**（服务端下发，含会话随机后缀；自拼会触发策略拒绝） |
| `username` | STS 临时 AccessKeyId（ASIA 开头） |
| `password` | STS 临时 SecretAccessKey |
| `sessionToken` | STS 会话令牌（SigV4 三要素之一） |
| `deviceID` | 设备对外 ID（dev_ 前缀） |
| `expiresAt` | 凭证到期时间（UTC 秒级时间戳）；**到期前必须重新取**，不要拿签名窗口当有效期 |

## 2. 连接方式：只有一条正路 —— 预签名 URL

AWS IoT Core 的 MQTT-over-WebSocket **不支持** MQTT username/password 内嵌 SigV4。
App 必须把 STS 凭证签成预签名 HTTPS URL，作为 WSS 地址连接：

```
wss://{endpoint}/mqtt?X-Amz-Algorithm=AWS4-HMAC-SHA256
    &X-Amz-Credential={AK}%2F{YYYYMMDD}%2F{region}%2Fiotdevicegateway%2Faws4_request
    &X-Amz-Date={YYYYMMDD'T'HHmmss'Z'}
    &X-Amz-SignedHeaders=host
    &X-Amz-Signature={签名}
    &X-Amz-Security-Token={sessionToken，URL 编码}
```

签名要点（四处都是踩过的坑，与 aws-iot-device-sdk v1 `prepareWebSocketUrl` 一致）：

1. **service 用 `iotdevicegateway`** —— 不是 `iot` 也不是 `iotdata`，用错直接 403。
2. **canonical query 只含** `X-Amz-Algorithm / X-Amz-Credential / X-Amz-Date / X-Amz-SignedHeaders` 四项；
   **`X-Amz-Security-Token` 在算完签名之后追加**到 URL 末尾，不参与 canonical request。
3. **payload 哈希 = `sha256("")` 的 hex** —— 不是 `UNSIGNED-PAYLOAD`。
4. 子协议必须带：握手时 `Sec-WebSocket-Protocol: mqttv3.1`，缺了直接 426。
   （JS: `new WebSocket(url, 'mqttv3.1')`；其它框架找 subprotocols 参数。）

### 签名伪代码

```
canonicalRequest = "GET\n/mqtt\n" + 四项query串(按名排序,值URL编码)\n"
                   + "host:" + 小写endpoint + "\n\nhost\n" + sha256hex("")
stringToSign     = "AWS4-HMAC-SHA256\n" + amzDate + "\n"
                   + "{YYYYMMDD}/{region}/iotdevicegateway/aws4_request\n"
                   + sha256hex(canonicalRequest)
signingKey       = HMAC(HMAC(HMAC(HMAC("AWS4"+SK, YYYYMMDD), region), "iotdevicegateway"), "aws4_request")
signature        = hex(HMAC(signingKey, stringToSign))
```

注意：URL 编码用 RFC3986（`*` 也要编成 `%2A`，JS 的 `encodeURIComponent` 不编码 `*`，需补）。

### 参考实现（可直接抄）

`e2e-mqtt-wss-test.mjs` 第 45~61 行：预签名 URL 生成；第 77~92 行：MQTT 3.1.1
CONNECT/SUBSCRIBE/PUBLISH 组包。移动端用 paho-mqtt / mqtt.js 时，只需把预签名
URL 传给 connect 的 url 参数 + subprotocol 传 `mqttv3.1` + clientId 用接口原值，
组包库都替你做了。

## 3. 订阅与收发（Shadow 协议）

连接成功后订阅 5 个应答 topic（`{did}` = 接口返回的 `deviceID` 原值）：

```
$aws/things/{did}/shadow/update/accepted
$aws/things/{did}/shadow/update/rejected
$aws/things/{did}/shadow/update/documents
$aws/things/{did}/shadow/get/accepted
$aws/things/{did}/shadow/get/rejected
```

读写操作：

```
读（全量拉）   发布到 $aws/things/{did}/shadow/get            载荷 {}
               → get/accepted 回全量文档（404 无 shadow 时回 get/rejected）
写（下期望值） 发布到 $aws/things/{did}/shadow/update         载荷 {"state":{"desired":{...}}}
               → update/accepted 回新文档；update/documents 回变更前后对照
               失败回 update/rejected（载荷含 error.code/message，如 405 payload 版本冲突）
```

下行控制（属性设置/服务调用）由后端写入 shadow desired，设备侧消费 delta；
App 端如需直写 desired 才走 update，常规查询走 get。

## 4. 错误对照

| 现象 | 原因 |
|---|---|
| HTTP 403 握手失败 | 签名四要点之一错了（service / token 位置 / payload hash / URL 编码） |
| HTTP 426 | 没带 `mqttv3.1` 子协议 |
| CONNACK 返回码非 0 | clientID 自拼了（用接口原值）；或凭证过期 |
| SUBACK 返回 0x87 | 订阅了策略外 topic（只允许上面 5 个 + 官方 SDK 场景） |
| 连上但收不到 | 没订阅对应 accepted/documents topic；或凭证里 sessionToken 没参与签名 |
| 一段时间后全部超时 | 到 expiresAt 了 —— 到期前重新调 DEVICE-01 取新凭证重连 |

## 5. 凭证生命周期

- `expiresAt` 是 STS 到期时刻（UTC 秒）。**提前 5 分钟**重新取凭证并重连，不要等失败。
- 每次进入设备页重新调 DEVICE-01 即可（服务端按次签发，无并发限制）。
- 凭证不落盘、不进日志（含 sessionToken）。

## 6. 环境常量（当前部署）

| 项 | 值 |
|---|---|
| 区域 | ap-southeast-2 |
| endpoint | a1tr1j1rc3dn2o-ats.iot.ap-southeast-2.amazonaws.com |
| 路径 | /mqtt |
| 子协议 | mqttv3.1 |
| API 基址 | https://47.107.80.36（联调期 HTTP；迁 443 后以部署通知为准） |

## 7. 快速自验

本机有 Node 的同学可直接跑参考实现验证环境：

```bash
node e2e-mqtt-wss-test.mjs dev_209
```

输出四行全 ✅（CONNECT / SUBSCRIBE / RECEIVE / verdict=OK）即链路正常；失败时按第 4 节对照。

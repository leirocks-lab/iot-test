# MQTT 原生接入核对

日期：2026-11-01。状态：原生接入实施中；Node 只读真实 MQTT 链路已验证，原生 MQTT 和设备执行尚未验收。

HTTP 依据 V1.4 DEVICE-01/02、THING-01，MQTT 依据 V1.6 Corrected 第 10 章。文段号按 DOCX XML 内所有 `w:p` 从 1 计数，包含表格；不是页码。

## 已定义的边界

- DEVICE-01：`GET /api/app/devices/{deviceID}/mqtt`，原生持有凭据；字段 host、endpoint、path、clientID、username、password、deviceID。V1.4 ¶2064–2129 要求凭据过期前刷新，未规定到期字段和认证模式。
- DEVICE-02 提供绑定角色与设备/产品静态资料；THING-01 提供已发布属性、服务、事件及 version/etag。属性名不能替代业务映射、范围、枚举、单位和访问权限核验。
- V1.6 ¶2163–2180、2366–2371：Topic 用 AWS thingRef；订阅四条明确的 get/update accepted/rejected，全部 SUBACK 后发布空字节 get。不得订阅所有设备、connect、notice 或 mcu/ota。
- V1.6 ¶2281–2311、2407–2424：PUBACK、云端接受 desired、较新 reported 达到目标分别记录。设备上报不保证携带 App 的 clientToken；目标状态到达不等于因果归属已证明。控制 QoS=1、retain=false。
- reported 是确认状态；部分更新缺字段不能清空已有字段，旧上下文/版本不能覆盖新状态，嵌套及 null 删除要保留版本语义。断线、超时和一次性动作结果不明时不自动重放。
- 404 无影子不造全零；401/403 不无限重试；409 先重新查询。连接成功不代表设备在线，在线判定必须有显式产品映射。

## 实际测试服务核对

对实际 HOME-01 返回且归当前测试账号的首个设备执行只读 DEVICE-01、DEVICE-02、THING-01；未猜测设备标识、未下发控制。HTTP 结果见 [HTTP 记录](../测试报告/重构实施-20261101/http-service-2026-11-01T08-56-27.593Z.json)。记录不保存地址、设备标识、MQTT 用户名/密码、STS Token 或响应正文。

该环境 DEVICE-01 除 V1.4 字段外实际返回 `expiresAt`、`sessionToken`，host 的 scheme 为 WSS，未返回 `authMode`。本次安全形状探测确认 expiresAt 是 number，按 epoch seconds 换算落在未来 24 小时，epoch milliseconds 换算不成立；原生解析仍要求显式选择编码，不自动猜测其他部署格式。不能把一个环境的结构当作所有部署已冻结契约。

THING-01 返回 version、etag、attributes、services、events；当前设备的公开属性标识包括 Power、Mode、TargetTemp、TargetHumidity、TempCurrent、HumidityCurrent、LightSwitch、LightBrightness、ChildLock、Mute、Online。记录只含结构、标识及访问类型，不含设备状态值。不能以本设备的字典代替范围内全部产品。

旧 `app-rn-old/src/protocol/mqtt-auth.ts` 支持 sessionToken 存在时使用 STS SigV4、缺失时按普通认证处理，是理解该环境及测试向量的参考。AWS 官方确认 IoT 的 STS 安全 Token 在计算签名后附加；实现须验证真实握手，尤其 WebSocket Host 的默认端口处理，不能只用签名字符串单测宣称连接通过。[AWS IoT 身份与签名](https://docs.aws.amazon.com/iot/latest/developerguide/iam-users-groups-roles.html)

Android 传输候选 Paho Java 1.2.5 的握手源码保留 URL 查询参数，并在非 80 端口的 Host 中包含端口。若采用该适配，签名的 canonical Host 必须与实际握手一致，另以真实连接验证。[Paho 1.2.5 握手源码](https://github.com/eclipse-paho/paho.mqtt.java/blob/v1.2.5/org.eclipse.paho.client.mqttv3/src/main/java/org/eclipse/paho/client/mqttv3/internal/websocket/WebSocketHandshake.java)

## 尚需确认与验收

2026-11-01 两次独立 Node 只读连接均通过：CONNACK、四条精确 QoS1 订阅、空字节 get 的 PUBACK 及 get/accepted reported。第二次显式以 `Host:443` 签名与握手，验证了 Paho 候选所需的 authority 行为。证据：[默认 Host](../测试报告/重构实施-20261101/mqtt-readonly-2026-11-01T08-19-12.064Z.json)、[显式 443](../测试报告/重构实施-20261101/mqtt-readonly-2026-11-01T08-19-54.164Z.json)。使用 MQTT.js 5.16.0 作为独立联调工具，没有向生产 RN 添加通信能力。

实际影子 version 为 9，reported 只包含 ConnectType、DeviceVersion、ProductId、WifiManufacturer、WifiVersion，没有控制值或已映射的在线状态。不得由连接成功推断设备在线，或把缺少的字段显示为零/关闭；本次没有发送 desired、控制、升级或硬件操作。上述结果不是原生 MQTT、重连、桥接或 RN 控制验收证据。

其他部署的认证模式与到期格式、host/endpoint 冲突规则、clientID 并发策略、HTTP 资源 ID 到 thingRef 映射、产品在线/控制字段字典、一次性动作的去重与确认、告警结果通道，以及真实 broker 授权、重连和状态一致性。缺字典时只能显示明确的未知/不可用状态，不复制示例 Power/ConnectType 作为全部产品规则。真实设备执行与硬件升级仍为未验收。

# V1.6 MQTT 接入与联调

本项目真实通道使用 AWS Classic Shadow。业务决策与范围修订见 CHG-20261024-001（历史资料已移除），结果见 任务与证据（历史资料已移除）。通用协议已有自动化覆盖，真实订阅、产品控制及告警接口仍按实测缺口分别记录。

## App 配置

开发或预览环境可显式选择以下公开配置；账号、密码和STS凭据只保存在既有私密环境/内存中。

```dotenv
ROWAN_HTTP_MODE=real
ROWAN_DEVICE_MODE=real
ROWAN_INTEGRATION_PROFILE=rowan-v16-shadow
```

该profile已注册到App启动链路，但本次不修改当前私密环境的默认通信模式。其仅在development/preview可选，未作为已验收生产profile开放。真实设备模式需要项目已有原生Development Build环境；BLE配网契约没有因此补齐。

没有正式产品字典时，该profile只同步影子，不提供控制/维护映射。物模型接口失败可继续只读同步，界面仍保留模型/能力错误，不能把空模型当正式模型或返回Mock成功。账号/设备鉴权失败不降级为只读成功。

## 消息与确认

- 精确订阅本设备的get/accepted、get/rejected、update/accepted、update/rejected；不订阅业务notice/connect/OTA或update/delta。
- 全部SUBACK之后向`$aws/things/{deviceID}/shadow/get`发布零字节消息。get返回快照，不强制设备立即上报。
- 属性与一次性动作都向shadow/update写desired；动作保留原计数/清零/流水语义，不新增service/reply。
- clientToken校验1～64字节，生成关联标识不包含长账号ID。自己的desired accepted关联App token，记录AWS接受版本；更新版本之后的reported满足目标属性才确认执行。设备token独立，不改写成App token。
- 部分属性合并、删除属性移除缓存，整个reported被删除时清空缓存并禁写。旧版本不能覆盖新状态。
- 超时10秒、断线或离线时不显示假成功，不重发旧命令；显式同步及前台恢复重新取凭据/订阅/get。

## 产品接入

`src/protocol/classic-shadow.ts`的`createClassicShadowResolver(products)`接收显式产品契约：可写原字段、在线/离线原值，以及可选动作编码和reported确认值。每个字段必须存在于当前正式模型中；普通属性校验类型、范围和步长，动作期望值也按原字典校验。

物模型字段名本身不代表业务能力。接入产品还须为Runtime提供已确认的`ControlProfileResolver`及需要时的维护映射，不能从文档演示的Power等字段推断所有产品语义。默认注册表没有生产产品字典。

告警按V1.6由云端消费notice，App需已有的同设备告警读取、恢复和顺序契约。2026-10-24核对公开OpenAPI未找到该契约，现阶段明确待接入；不猜测路径、不订阅notice、不新增消息中心。

## 可重复执行的只读实测

```powershell
node --import tsx scripts/MQTT影子联调.mjs
```

脚本使用现有`.env.local`或进程环境中的`ROWAN_APP_API_BASE_URL`、`ROWAN_IOT_API_BASE_URL`、`ROWAN_LOGIN_ACCOUNT`、`ROWAN_LOGIN_PIN`及租户。默认选账号首页中的首个获授权设备；可用`ROWAN_MQTT_TEST_DEVICE_ID`指定首页已有设备。后端目前按设备签发固定clientID，不要同时运行同一设备的多个测试会话。

执行链路为真实RowanService→DEVICE-01→App STS/WSS→实际RealtimeDeviceSession→Classic Shadow适配器。仅订阅及get，不发送desired/reported，不控制设备、不创建或改动AWS资源。退出关闭连接并登出本轮会话。

脱敏结果按实际时间另存至变更包`联调证据/App影子实测-*.json`，不覆盖旧实测，也不记录签名URL、Token、账号或密钥。SUBACK、PUBACK、get响应和真实设备执行分别判定，不混为一次成功。

## 真实 MQTT 控制台日志

设置 `ROWAN_MQTT_LOG_LEVEL=off|error|debug` 后重新加载 App 配置。开发和预览环境默认 `debug`，生产默认 `off`；它与 `ROWAN_HTTP_LOG_LEVEL` 独立。当前本地通信模式不因此改变，Mock 始终不打印 MQTT 日志。

- `debug`：使用 `console.debug` 输出 `[MQTT]` 前缀、时间、连接标识、设备 ID，以及收发 Topic、方向、原始字节数和脱敏消息体。连接、断开、订阅/SUBACK、取消订阅/UNSUBACK、PUBACK 也有单独事件；错误使用 `console.error`。
- `error`：仅输出脱敏错误事件和安全错误类型/错误码，不打印消息体或原始异常文本。
- `off`：关闭 MQTT 日志。MQTT.js 原生调试日志保持关闭，避免泄露签名 URL 或认证信息；开发环境和脚本也不要设置 `DEBUG=mqttjs*`，其 WebSocket 调试模块独立于本日志开关。

发送事件 `publish_attempt` 仅表示尝试发布；`puback` 表示 MQTT 服务端确认接收，设备执行仍须业务协议中的 reported 确认。接收事件为 `message`。每条消息在真实传输入口记录一次，不在会话层重复打印。

JSON 内容先脱敏；凭据、Token、密码和签名 URL 不输出。消息体最多 4096 个 UTF-8 字节，超过限制添加 `[TRUNCATED]`，并设置 `truncated: true`；结构深度和条目数也有保护限制。零字节显示 `[EMPTY]`；非 JSON 和无效 UTF-8/二进制显示 `[UNPARSEABLE]`、类型和原始字节数，不输出不透明原文。日志解码或 Logger 抛错不会中断连接、收发、订阅与清理。

只读联调脚本显式默认开启 `debug`，也可通过同一环境变量关闭或仅保留错误。新增诊断只输出控制台，不写文件、不上传；脚本既有阶段验收证据仍按原方式保存。单独调用 `createMqttConnection()` 保持兼容，默认关闭日志；需要时传入 `{level: 'debug', logger}`，Logger 可选。

## 当前外部联调缺口（实测状态）

1. 2026-10-24历史实测在首个get/accepted订阅阶段断连。用户调整权限后，2026-10-25的dev_209复测已获得四个SUBACK、get PUBACK及get/rejected 404，当前阻塞为所请求的Classic Shadow不存在，详见下节；dev_1本轮未复测。
2. 只读链路需要Subscribe四个精确topicfilter、Receive对应四个topic、Publish本设备shadow/get。现有STS鉴权应核对IAM/会话策略及其他适用限制，不应直接套用设备证书Policy或放宽到全设备通配权限。
3. prd_208的thing-model返回业务码1050186001。需提供实际已发布模型及原产品字典，不能拿目录存在或源码中的旧错误码推断该接口可用。
4. 2026-10-24的DEVICE-01响应和公开schema未提供topics及凭证到期字段；2026-10-25实际响应已新增expiresAt，未返回topics。本轮只记录字段存在，未验收有效期语义或续期行为；900秒签名窗口不是凭证有效期。
5. 告警读取/恢复接口、原动作字段和OTA触发路径仍需接口方资料。真机和100次/网络的性能验收尚未执行。

## 权限调整后真实复测（2026-10-25）

北京时间10:09:25启动，使用现有实际App栈、重新签发的STS凭据，指定dev_209，只读执行四响应订阅及零字节get。证据：App影子实测-2026-10-25T02-09-25-432Z.json（历史资料已移除）。

| 阶段 | 实际结果 |
| --- | --- |
| CONNACK | 成功 |
| get/accepted、get/rejected、update/accepted、update/rejected | 四个精确Topic均获得SUBACK |
| shadow/get | 发布0字节，收到PUBACK |
| 响应 | 收到shadow/get/rejected，消息为`{"code":404,"message":"No shadow exists with name: 'dev_209'"}` |
| 会话 | 收到404后App主动关闭并登出，不是此前的订阅阶段断连；synchronized=false |
| prd_208模型 | 仍返回1050186001，未获得正式模型 |

结论：该设备本轮订阅确认和get请求/错误响应链路已通；update两个响应Topic只验证了订阅确认，未发布update，未验证其消息投递或设备执行。404不能作为同步成功。下一步核对AWS账号/区域、实际ThingName与App设备ID映射、Classic或Named Shadow类型，并由设备端按真实状态初始化/上报正确Shadow。未创建Shadow、未写desired/reported、未控制设备，也未修改云端权限。相关行为参见[AWS Shadow错误说明](https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-error-messages.html)及[设备Shadow初始化](https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-comms-device.html)。

## 本地验证

```powershell
New-Item -ItemType Directory -Force .codex-tmp/mqtt-v16-temp | Out-Null
$env:TEMP=(Resolve-Path .codex-tmp/mqtt-v16-temp).Path
$env:TMP=$env:TEMP
node node_modules/vitest/vitest.mjs run src --exclude '**/.worktrees/**' --maxWorkers=2 --no-file-parallelism
pnpm lint
pnpm typecheck
```

Windows沙箱默认临时目录可能在测试transform阶段出现rename EPERM；工作区TEMP/TMP可避免。旧测试使用100ms真实计时，在重度并行lint/规范扫描下出现过超时；限制文件并行用于区分运行资源争用，不修改生产10秒超时。

若类型检查仅报已存在路由未进入生成声明，按Expo官方流程执行`node node_modules/expo/bin/cli customize tsconfig.json`刷新；本次没有改房间代码、路由或tsconfig。规范检查仍受既有缺失历史文件影响，不能写为通过。

## Debug 日志验证记录（2026-10-24）

本轮为工程调试能力，不改变 RF、AC、业务协议或规范版本，不新建 CHG。测试环境为 Windows 工作区、Node/Vitest，使用合成凭据和 MQTT 客户端替身验证真实传输工厂；未连接真实 AWS 或控制设备。

| 检查 | 输入/操作 | 实际结果 |
| --- | --- | --- |
| 消息与 ACK | 发布 JSON、零字节 get、模拟入站和 PUBACK/SUBACK | 正确记录 Topic、方向、原始字节数和对应消息；每条收发消息一次，发布尝试与 ACK 分开 |
| 脱敏与限长 | 嵌套密码/Token/密钥、签名 URL、长 Unicode JSON | 秘密值不输出；消息体不超过 4096 UTF-8 字节，截断明确标记 |
| 异常输入 | 非 JSON 文本、无效 UTF-8 字节 | 只输出不可解析标记、类型和长度 |
| 日志故障隔离 | 注入会抛错的 Logger，执行连接、订阅、收发和清理 | 通信与清理继续完成 |
| 级别与模式 | off/error/debug、真实 Runtime 两个创建入口、Mock | 级别生效；error 不输出消息体；Mock 不创建真实客户端且无 MQTT 日志 |
| App 配置 | 实际 Expo 配置默认值、三级覆盖、非法值 | `pnpm verify:config` 通过，开发/预览 debug、生产 off，独立于 HTTP |
| 自动化回归 | 工作区 TEMP/TMP；排除嵌套 worktree；串行文件执行 | 48 个测试文件、700 项测试通过，包含 HTTP 日志回归；MQTT 专项 3 文件 16 项通过 |
| 静态检查 | `pnpm lint`、`pnpm typecheck` | 均通过 |
| 联调脚本 | `node --check scripts/MQTT影子联调.mjs`，核对工厂接线 | 语法通过；脚本显式默认 debug，可用同一环境变量覆盖 |
| 规范检查 | `pnpm specs:index`、`pnpm specs:check` | 均失败，仍为既有历史来源文件与本地链接缺失；不将文档检查记为通过 |

自动化结果保存在忽略目录 `.codex-tmp/mqtt-logging-tests.json`（测试报告，不是运行时 MQTT 消息日志）。AWS 首次订阅断连、产品字典及告警接口缺口仍见上文，本轮未重新实测或标记解除。

提交前复核：首次运行 698/700 通过，暴露 App 两处真实工厂调用缺少 `mqttLogLevel` 接线，以及一个既有 100ms 会话等待超时。补齐两处接线后，MQTT Runtime 与设备会话专项 2 文件 37 项通过，最终全量 48 文件 700 项通过；未修改生产超时或放宽断言。最终回归报告使用 `.codex-tmp/mqtt-commit-tests-final.json`。

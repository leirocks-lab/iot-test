# 独立 JVM / Paho 1.2.5 只读服务探针

用途是区分同服务下 SDK 的全局行为与 Android 集成/平台行为。不是原生、模拟器、RN、真实设备在线或控制验收。没有改生产 SDK/TLS 配置；没有复用或修改 MQTT.js 探针。

```powershell
node docs/tools/paho-jvm/probe.mjs --preflight
node --env-file=app-rn-old/.env.local docs/tools/paho-jvm/probe.mjs --authenticated-readonly
```

独立 javac/java 使用 `D:/Android/Java/jdk-17.0.20.1+1/bin` 与已下载 `.cache/refactor/paho-1.2.5.jar`，不运行 Gradle/ADB/Metro。先编译并检查 jar Bundle-Version=1.2.5、NoopLogger 反射安装及不格式化参数，再执行服务链路。类文件输出 `.cache/refactor/paho-jvm/classes`；源码始终位于本目录。没有新增包依赖。

每次执行都从私有 env 在 Node 进程内读取配置、fresh login、HOME选一个已归属资源、DEVICE01查询 MQTT 配置，复用现有公开向量及 `aws_iot_signing.mjs` 的显式 Host:443 签名。没有把签名 URI、clientID、thingRef、username/password 放到参数、文件、报告或日志；这些字段仅以有界长度的 UTF-8 stdin 帧传给 Java，发送用 Buffer 完成后清零。Java只继承最小非秘密OS环境，不继承Node私有env；Java字符串在内存中交给SDK，不声称可强制擦除JVM/JS不可变字符串。

Java启动时先关闭JUL、Paho Logger及常规System.out/err，只有保留的输出流能写固定枚举阶段JSON。Node再次校验完整字段、阶段/result/kind/cause枚举、整数reasonCode和耗时范围；不记录原始stdout/stderr、异常、消息、URL、证书、payload或业务状态值。异常分类只读类型/数值reasonCode，cause链最多八层且去环。child stdin外没有secretIPC，也不使用shell执行Java。

通信固定为内存persistence、clean MQTT3.1.1、无自动重连/离线buffer、默认JDK TLS trust/HTTPS hostname验证，不设置宽松verifier。仅请求四个精确响应topic、逐条要求SUBACK=1，再发布零字节`get`（QoS1/retain=false）；完全没有desired/update/control发布。GET_ACCEPTED只表示请求后收到匹配accepted topic且payload未超限，不解析或归档reported，也不代表设备在线或命令执行。PUBACK和accepted的先后交错由latch保存；两者都到达才算链路通过。

SDK token等待分别有界，进程独立55秒watchdog，Node65秒外层退出边界；结束断开/关闭SDK，Node finally退出本次HTTP登录session。失败不重连、不重放。只读服务执行仍需任务授权；本轮Root已明确授权一次实际探针及隔离权限下重试。

脱敏报告自动保存到 `docs/测试报告/重构实施-20261101/paho-jvm-readonly-<time>.json`，包括SDK版本、三个源码/SDK哈希、固定阶段结果及限制；没有设备/账号标识或状态值。

本轮实测：默认sandbox在LOGIN前置失败，未取得token、未触发MQTT；授权escalation后，`paho-jvm-readonly-2026-11-01T11-29-00.094Z.json`所有阶段通过（CONNACK2233ms、四SUBACK309ms、get PUBACK284ms、accepted118ms、断开1009ms、logout通过）。这证明Paho1.2.5在本次JDK17/Host443环境可连接同服务；Android TLS provider、native签名/时钟/连接配置是否相同仍需分别验证，不能据此认定Android故障原因。

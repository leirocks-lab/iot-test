# 模拟器DNS与原生MQTT验证

## 失败定位

APK `568d4cbc…`和`494a45b3…`的原生MQTT曾连接失败；对应[带诊断报告](android-emulator-2026-11-01T11-30-25.791Z.json)记录reasonCode=0、固定分类DNS，尚无Ready epoch。同期[Node探针](mqtt-readonly-2026-11-01T11-24-08.839Z.json)及[独立JVM/Paho探针](paho-jvm-readonly-2026-11-01T11-29-00.094Z.json)实际链路通过，仅用于区分服务/SDK/平台，不能替代原生验收。

模拟器UTC与主机一致；默认DNS10.0.2.3及显式本机DNS重启后公共域名解析仍失败。有限检查中模拟器到DNS的UDP查询未收到应答，已知DNS的TCP端口可达；主机自身DNS查询成功。这里只认定观察到的测试环境限制，没有证明Windows防火墙、VPN或系统解析器的具体根因。

SDK还存在独立分类缺陷：MqttException reasonCode=0包装DNS错误被归永久CONFIGURATION。新增回归实际失败后，改用有界类型检查，将DNS/CONNECT/IO映射UNAVAILABLE、TIMEOUT映射TIMEOUT；显式AUTH等reason策略保留。诊断不读取/输出异常消息、URL、原始栈或凭据。该修复在[223项回归](android-unit-2026-11-01T11-36-34.324Z/summary.json)通过。

## 显式测试网络

保留ROWAN_API_36的userdata及原启动参数，仅为本次验证加入`-dns-server 127.0.0.1`。宿主临时UDP53转发器将真实DNS包转给本机原有DNS；不改Windows DNS、路由、防火墙，不合成/缓存记录，不记录查询名，不替换HTTP/MQTT，不降低TLS校验。初次临时实例转发36条、收到36条真实应答，10分钟自动停止。

正式[loopback工具](../../tools/android-network/README.md)固定监听127.0.0.1:53，限制128待处理请求、4096字节、2.5秒TTL和最多10分钟；校验响应关联并恢复ID，关闭幂等，端口占用即失败。模拟器harness通过显式`--dns-upstream=<本机已确认IPv4>`启动并在finally关闭，报告保存上游、计数及模块哈希。没有后台DNS辅助进程在这些harness结束后继续运行。

当前AVD仍使用这个显式DNS测试配置；独立手工使用或后续验收时需要启动相同转发器，或者正常关闭后恢复原启动参数。普通默认网络路径尚未证明修复，不能隐去此环境条件。

## 真实原生通过证据

- [001d包13项回归](android-emulator-2026-11-01T11-56-59.426Z.json)：含实际原生MQTT及正常退出。前次冷启动System UI ANR已单列阻塞，选择等待后独立重跑，不改旧记录。
- [39a5包12项回归](android-emulator-2026-11-01T12-33-06.557Z.json)：报告内有正式转发器计数和指纹，账号归属校验后原生连接、订阅及请求快照进入`reading(epoch=1)→live(snapshot=true)`，RN显示摘要。退出延期到[设置验收](android-preferences-2026-11-01T12-35-32.932Z.json)，其最终退出通过。

这里证明Release包内RN与真实原生只读云端快照链路；未发送desired、未执行设备控制/固件升级。读取到ConnectType不等于独立物理在线验收。断网恢复、凭据到期、真实权限变化及全产品状态仍需各自验证。历史应用FocusEvent ANR单次未复现不能据此关闭，见[排查](模拟器ANR排查.md)。

# Android 模拟器显式 DNS loopback relay

仅用于已声明的测试网络环境。模块不会探测/猜测上游，不改OS DNS、路由、防火墙或AVD配置，不夺取已有进程的53端口。HTTP、TLS、MQTT仍访问真实服务；DNS UDP转发不是业务mock。

## 接入

```js
import {startLoopbackDnsRelay} from './android-network/loopback-dns-relay.mjs';
const relay = await startLoopbackDnsRelay({upstream: explicitlySelectedIpv4});
try {
  // 由宿主harness执行自己的验证；relay不启动/控制模拟器。
} finally {
  await relay.close();
  const counters = relay.snapshot(); // 只包含配置、有限错误码、状态及计数，可放脱敏报告。
}
```

API为 `startLoopbackDnsRelay({upstream, maxDurationMs?}) -> Promise<{close, snapshot}>`。upstream必须显式指定IPv4，端口固定53；拒绝127.0.0.1自转发、unspecified/multicast/broadcast地址。允许127.0.0.2仅用于本地fixture smoke。默认生命周期600000ms，允许1..600000ms，不能创建无限运行relay。`close(): Promise<void>` 幂等，等待自身两UDP socket关闭；自动超时/运行时socket错误同样清理，不抛原始错误。

监听严格固定 `127.0.0.1:53`，reuseAddr=false、exclusive=true。地址/端口无覆盖参数，绑定被占用时固定BIND_FAILED并关闭自身socket，绝不终止其他进程。上游socket使用UDP connect固定目标IPv4:53，收件再次验证来源IP/端口。

手工CLI：

```powershell
node docs/tools/android-network/loopback-dns-relay.mjs --upstream=<explicit-IPv4>
```

CLI默认最多10分钟，SIGINT/SIGTERM有界清理，只打印READY/CLOSED及安全metadata。库本身不注册进程signal handler，方便harness start/finally close。

## 边界与隐私

- 每请求仅改16位DNS transaction ID；响应恢复原ID，其余原始UDP内容不修改。不缓存、不合成记录，不转TCP，不接管系统resolver。
- 最多128个pending、每包12..4096字节、2.5秒TTL。到期删除关联，不伪造DNS错误响应。全局时限和关闭会清空pending及全部timer。
- 响应需匹配当前pending的ID、上游来源、QR/opcode，以及有序question语义摘要。名称仅在内存解析并按DNS大小写不敏感规则归一，支持有界压缩指针；question数量最多128、指针/标签步数有界，非法循环或不完整包丢弃。
- pending只保留源端口、原ID、opcode、question摘要及deadline/timer。无查询名、完整报文、响应内容、业务凭据或秘密日志/文件；snapshot不暴露packet或question摘要。只接收127.0.0.1客户端。
- snapshot包含实际显式upstream、固定bind、state/running、有限lastError、pending及received/forwarded/rejected/expired/capacity/send/socket计数。它表示真实forwarder上游，报告不得把它描述为业务mock或原生网络已修复。
- 普通默认模拟器DNS UDP限制仍是独立环境问题。当前验证AVD显式以 `-dns-server 127.0.0.1` 启动时才依赖该relay；没有relay不能假设该AVD可正常解析。此模块不修改启动参数，harness需记录该测试环境。

## 本轮检查

```powershell
node --check docs/tools/android-network/loopback-dns-relay.mjs
node --check docs/tools/android-network/smoke.mjs
node docs/tools/android-network/smoke.mjs
```

smoke只绑定127.0.0.2:53作为公开本地fixture上游及127.0.0.1客户端，不查询真实DNS/业务、不运行Gradle/ADB。实际通过：相同原ID的两个客户端各收到正确恢复后的包；错误question/QR报文不消耗pending；绑定占用不夺端口；2.5s过期；重复close/自动超时关闭及socket回收。仅输出阶段/计数，不输出任何查询名称或报文。

默认sandbox允许bind但本地UDP投递未到relay(receivedQueries=0)，授权escalation后的同一smoke全通过。此权限限制不作为DNS上游/relay失败证据。

历史真实环境依据由Root提供：临时relay转发至本机显式192.168.31.1，36query/36reply；原生模拟器13case报告时间2026-11-01T11-56-59.426Z全通过。该临时工具已在10分钟自动停止。此正式模块本轮只做本地socket验证，未重跑该原生/业务验收，也未改生产网络策略。

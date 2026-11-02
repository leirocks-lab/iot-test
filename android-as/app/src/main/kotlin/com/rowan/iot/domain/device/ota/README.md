# V1.4 OTA 原生基础核心（S091–S095）

只实现独立typed models、account/resource-bound task workflow与HTTP适配，不接DI/RN/UI，不发行生产start/cancel permit，不执行真实OTA PUT或DELETE。依据V1.4完整8.10；S094/95编号冲突采用用户已确认的正文映射：OTA-04为DELETE取消，OTA-05为GET查询。不能将此基础源码或离线测试视为真实硬件升级验收。

## HTTP与真实结果

- `GET /api/app/devices/{deviceID}/ota/mcu|wifi` → firmware{id,version,remark}与device{id,name,mac}。没有必需hasUpdate字段；不发明hasUpdate/up-to-date默认状态。缺少明确firmware对象或关键字段时保守报响应错误，不臆测没有更新；正式的“无候选”响应形态仍待服务确认。
- `PUT .../ota/task?type=mcu|wifi`，body仅firmwareID，响应必须有非空taskID。HTTP ACK/taskID只表示任务已创建，不表示设备成功。
- `GET .../ota/task/{taskID}`，仅接受updating/success/failed/cancelled。未知值报格式错误，不猜百分比、下载/安装阶段或执行成功。
- `DELETE .../ota/task`，body仅taskID。公共成功envelope无需data。DELETE ACK只表示请求取消；必须用OTA-05确认，1523/网络未知不能变成cancelled。

HttpOtaRepository每次请求传account.expectedRevision，前后核验原生scope的revision/user，所有resource/task path segment逐UTF8 percent编码；空/控制字符/完整dot segment拒绝。适配器不重试PUT/DELETE，不解析固件下载URL，不持有网络SDK。

## 原生所有权和权限

`OtaService` 必须由未来原生application owner按授权scope保留，不能每次view mount新建以绕过unknown latch。scope绑定accountRevision/resourceId/userId；当前没有生产scope/permit发行器、任务注册表或桥接入口。测试fixture可以创建internal typed permit，不构成真实控制授权。

StartPermit绑定scope、kind、具体firmwareID、期限及当前reported证据。当前证据必须与permit一致，source=REPORTED_CURRENT、online=true、stale=false、有正connectionEpoch及有效authorityRevision；DEVICE-02静态online、未知/离线、旧epoch/旧authority或已过期许可均不允许开始。产品online字段/profile和匹配/现有升级状态须由未来受信native发行器验证，不能从产品名、静态元数据或旧fixture猜测；默认permit/evidence都为空，控制关闭。

CancelPermit必须由未来native明确验证当前任务可撤销窗口，绑定scope/task/期限。updating结果自身不授予取消权，没有permit只返回取消条件不可用。没有臆造升级阶段→取消权限矩阵。

## 并发、未知和观察

同一owner用mutex串行任务动作和状态GET，不跨操作重绑账号。Start一旦可能已发且结果不明就保留unknown latch，不重复创建；已知task也不重复创建。明确pre-acceptance业务拒绝可供用户重新核验/重新授权后再尝试，不自动重试。完成的旧任务只有显式读取新的候选后才可能接受新的原生授权尝试。

pollOnce是手动tick的安全原语，不创建轮询线程。未来native scheduler只能在观察开启时调用；每个status GET（含取消readback）共享至少3000ms间隔、单在途、有限poll count和请求timeout。默认120次/20s为本地工程策略，不是固件进度/完成承诺。预算耗尽保留最后确认结果并标unknown；显式resume开启新的观察窗口不会重建或重发任务。终态停止继续poll。

stopObserving/close从不DELETE，也不隐式取消设备任务。stop/resume只控制后续观察，已经在途的只读GET可能完成并更新原生确认值；close丢弃本owner后续发布，并保留已知task/未确认动作标记。未来owner应在原生application作用域执行升级动作，不能让RN离页销毁该owner；此批未集成这一生命周期。账号/设备权限失效会停止旧scope并清除其可展示任务信息。

取消请求只发送一次；ACK后GET若仍updating，保留最近确认结果并标unknown。若3秒预算暂不允许立即readback，保持unknown等待下一次允许的只读tick，不绕过限频。网络失败/超时/未知result不生成failed/cancelled，也不自动重放变更。

## 检查与限制

30个JUnit测试：OtaServiceTest21项、HttpOtaRepositoryTest9项，含多个权限/结果向量。Root实际RED94890已确认未来类型/adapter缺失的编译失败；此代理未运行Gradle，最终GREEN由Root统一执行。测试全部是fake HTTP/typed fixtures，无真实OTA请求。

尚未实现/验收：生产授权/在线profile permit发行器、应用级task registry/恢复与持久化、后台scheduler、RN展示/操作、Android/iOS完整集成及真实设备任务生命周期。无taskID的未知创建不能从V1.4现有已知接口自行发现或重建；未来native owner须保留不确定性并获取正式的查询/对账能力后再开放控制。Android旧安装/先前只读native13case均不覆盖此批升级动作。

创建ACK与观察生命周期独立：PUT挂起期间的stop/resume以当前observing为准，ACK只发布taskID，不强制恢复观察。Root实际RED94323在332项中仅此交错回归失败；本修复未由代理执行Gradle，统一GREEN由Root确认。

# App AWS IoT连接测试

当前DEVICE-01返回可选sessionToken时，App使用username作为AWS AccessKeyId、password作为SecretAccessKey，结合sessionToken生成SigV4 WSS握手。区域从AWS IoT区域域名提取；支持标准443端口、/mqtt路径。签名窗口900秒不等于STS凭证有效期。没有sessionToken的旧七字段连接保持原实现。

在项目根目录运行：

```powershell
node --import tsx scripts/AWS连接实测.mjs
```

执行器使用本地.env.local或进程环境中的ROWAN_APP_API_BASE_URL、ROWAN_IOT_API_BASE_URL、ROWAN_LOGIN_ACCOUNT、ROWAN_LOGIN_PIN，以及可选ROWAN_TENANT_ID。账号与密钥不得写入源码或公开App配置。

测试登录后读取首页，默认只选择首台获准设备。可用进程环境变量ROWAN_MQTT_TEST_DEVICE_ID明确选择首页中的设备。脚本只获取凭证、等待MQTT CONNACK，然后断开并登出本轮会话；不订阅、不发布、不控制设备、不创建AWS证书或修改Policy。重跑前应确认测试账号与设备适合当前联调；当前后端为按设备固定clientID，多客户端同时使用同一clientID会互相断开。

脱敏结果写入[sdd连接实测结果](../sdd/迭代变更/变更-20261022-001/连接实测结果.json)，重跑覆盖该结果；历史修复前证据单独保留。不要启用可能打印完整签名URL或凭证的调试日志。

2026-10-22：Windows Node使用App实际MQTT传输代码，dev_209真实AWS IoT连接成功。仅证明WSS/MQTT认证及CONNACK；不代表Android/iOS真机、设备在线、Topic权限、状态同步或控制已验收。App仍保留按设备会话和缺少生产profile时的待同步提示。

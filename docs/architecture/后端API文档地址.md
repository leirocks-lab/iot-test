# 后端 API 文档地址

记录日期：2026-11-01；2026-11-10 用户更新统一 HTTPS 文档入口。

| 文档入口 | 地址 |
| --- | --- |
| 当前统一后端 API 文档首页（2026-11-10 用户提供） | [打开文档](https://47.107.80.36/doc.html#/home) |
| IoT 后端 API 文档首页 | [打开文档](http://47.107.80.36/iot/doc.html#/home) |
| 后端 API 文档（App 启动配置 `AppConfig_getConfig` 入口） | [打开文档](http://47.107.80.36/doc.html#/all/App%20-%20%E5%90%AF%E5%8A%A8%E9%85%8D%E7%BD%AE/AppConfig_getConfig) |

本文仅收录文档地址，不改变项目业务范围及现阶段 HTTP/App 与 MQTT 的实现依据分工。

2026-11-10 接入核对：新版 `/v3/api-docs/swagger-config` 列出 system、infra、iot 三组服务；system OpenAPI 路径将登录列为 `POST /api/app/session`，其描述仍写 `/app-api/session`，两者存在差异，不能仅凭文档路径决定客户端改写规则。对 HTTPS 下这两个路径携带 `tenant-id: 1` 发送空 JSON，均返回业务码 400 和“请求的租户标识未传递，请进行排查”，尚不能确认真实登录路由可用。本机默认 TLS 校验报告不受信任的证书根；以上公开文档与空请求仅采用临时诊断读取，未修改 App 证书校验，未在此连接发送账号密码。当前 API 配置和安装包尚未据此变更。

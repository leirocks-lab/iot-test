# HTTP 调试日志设计

2026-10-24 用户在请求/响应示例后明确授权“创建 worktree 并实现该功能”。这是工程调试能力维护，不修改业务要求、接口契约或 RF 版本，不创建 CHG。

实现已有 Logger 接口，采用控制台输出，不新增依赖或上传日志。FetchHttpClient 记录实际 URL、请求头、请求体、原始 JSON 响应、状态、耗时和时间；RealHttpClient 提供逻辑路径、platform/iot 目标并关联响应适配异常；Mock 使用相同格式。所有请求包括登录和 Token 刷新通过共同客户端，不能仅包装 RowanService.request。

本地 requestId 关联每次发送和返回，不向后台增加请求头。HTTP 错误、业务失败、网络失败、解析失败、适配失败和取消分别标识。日志失败不能改变业务结果或错误对象，响应仅解析一次，204 保留已有语义。

ROWAN_HTTP_LOG_LEVEL 支持 off/error/debug；development/preview 默认 debug，production 默认 off；显式配置可覆盖。error 仅记录失败与业务错误，取消仅 debug。直接构造客户端未注入诊断器时关闭日志，应用装配统一注入。

日志先生成脱敏快照再格式化，隐藏大小写及常见分隔符变体的认证、Token、密码、pin、captcha、secret、Cookie 和密钥字段；邮箱掩码；验证码路径及 URL query 同样处理。自由文本中的敏感内容无法保证逐字识别，因此错误文本与非 JSON 正文不直接输出。字符串内容超过限制时截断，递归深度/字段/数组长度有界，循环引用安全。开关关闭时不遍历日志对象。

验证覆盖真实/Mock、登录和刷新、平台/IoT 分流、原始响应、并发 ID、业务失败、HTTP 错误、解析与适配失败、取消、异常原样抛出、日志 sink 抛错、嵌套脱敏、路径/query 脱敏、截断和生产默认开关。真机与真实后台联调单独如实报告。

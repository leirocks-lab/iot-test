# Web实际模式与缓存排查

日期：2026-10-16；关联RF-0001 0.6.0、CHG-20261016-002，AC-014。本次为已确认真实模式目标下的启动缓存修复和维护命令调整，不改业务规范、登录字段、环境边界或功能版本，不新增业务决策，因此不重新进行规范问询。

## 用户反馈与此前结论更正

用户提供两张截图：网页点击登录没有POST session请求，并显示账号或密码错误；同一账号在后台API文档调试中code0登录成功。截图中的账号、密码及Token不复制到仓库。

此前依据本机.env.local、服务端manifest real配置，以及根路由能进入账号入口，推断Web已真实调用，证据不足。该结论现予更正：那些检查不能证明已编译网页实际所用模式；当时的错误来自旧Mock包，不应归因为后台凭据错误。用户的Network观察与实际编译产物吻合。

## 根因与来源

- `src/ui/context.tsx`读取 `Constants.expoConfig.extra` 创建Runtime；Mock模式由本地MockHttpClient处理，不发出登录HTTP请求。
- Expo57已安装源码 `expo-constants/src/ExponentConstants.web.ts` 的manifest来自编译内联APP_MANIFEST；`babel-preset-expo/build/plugins/expo-inline-manifest-plugin.js`提供内联配置和配置memo。只重启服务但保留转换缓存，不能保证Web内联值更新。
- 从当前页面HTML定位实际entry.bundle地址，直接核对服务返回的Web JavaScript：修复前Constants manifest内嵌 `httpMode:mock`、`deviceMode:mock`、双API根为空；与服务端原生manifest real不一致。没有从页面提取密码或Token，没有猜测错误码原因。

## 处理及实际结果

1. 停止旧Metro，以已存在的公开.env.local配置执行 `node node_modules/expo/bin/cli start --web --localhost --port 8081 --clear`，日志确认清缓存重编译。
2. 再次解析同一entry.bundle里的内联manifest：httpMode=real、deviceMode=real、平台根http://47.107.80.36、IoT根http://47.107.80.36/iot、tenant1。此证据来自实际Web包，非仅服务端配置。
3. 对登录路径执行浏览器等价CORS预检：Origin=http://localhost:8081，POST，content-type/tenant-id；后台HTTP200，允许对应origin、POST和上述头。
4. 使用用户先前提供的入参HTML中的测试登录样例，经App原有RowanService和RealHttpClient发送登录请求；凭据只在内存使用，响应只记录状态/业务码/消息，未保存或打印Token。POST /app-api/session→HTTP200、code0、success=true、“登录成功”，应用服务成功建立含setting的内存会话。没有注册、改密码或其他业务写入；此项是App服务层真实登录验证，不等于浏览器按钮或Android实机验收。
5. package.json的web维护命令改为 `expo start --web --clear`，README记录环境变更后停止旧服务、重启并完整刷新浏览器；不改App业务代码或后台错误映射。

## 后续验证边界

已经打开的旧页面持有既有Runtime，需要完整刷新；外部Chrome与内置浏览器分别处理。刷新后点击登录应在Network观察POST /app-api/session，不能再用本地Mock结果判断后台凭据。未代用户重新勾选协议或声称浏览器登录已通过；界面与Network最终结果按实际操作追加。

Android包原生策略及版本不变，本次没有原生配置变化，不重复构建APK；手机实测仍待连接。工程检查和SDD检查见任务清单。

## 后续缺陷：浏览器fetch上下文（WEB-005）

用户完整刷新后的新截图显示 `Failed to execute 'fetch' on 'Window': Illegal invocation`，与前述Mock缓存为两个先后暴露的问题。FetchHttpClient原先默认接收裸fetch并用this.fetcher调用，浏览器宿主fetch收到客户端实例作为this后在发送前抛错；RealHttpClient默认参数也传入裸fetch。Node服务层成功无法验证该浏览器限制。

实现前在本CHG提案、计划和任务清单追加修复目标，维持RF-0001 0.6.0与既有AC-008/014，不改业务规范或接口契约。FetchHttpClient默认值改为包装调用globalThis.fetch；RealHttpClient省略自定义fetcher时使用下层默认值，保留注入能力。

验证证据：

- 新增http.test.ts四例。修复前，默认FetchHttpClient和RealHttpClient平台/IoT共三例均复现Illegal invocation；注入失败透传例通过。修复后四例通过。
- 关联http、real-http、api-transport、app-runtime四文件共86项通过；pnpm lint、pnpm typecheck、pnpm specs:index、pnpm specs:check、git diff --check均退出0。未改维护工具或原生配置，不重复工具测试、配置矩阵或APK构建；前述567项为此前全量结果，本次未重跑全量。
- 使用esbuild将当前实际App客户端源码编译至临时本机验证服务（127.0.0.1:8082，仅内存产物），通过内置浏览器点击Run HTTP checks，直接使用默认fetch，无自定义fetcher。FetchHttpClient与RealHttpClient平台GET /app-api/config均HTTP200/code0/success=true；RealHttpClient IoT GET /iot/app-api/device/connection返回HTTP200/code401/success=false、账号未登录，证明浏览器真实请求和错误透传。无凭据、Token、协议接受或业务写入。
- 截图本机路径：E:/ideaProject/rowan-iot-app-mobile/.codex-tmp/web-fetch-browser-20261016.png。临时服务和标签页验证后关闭；截图不纳入Git。该传输验证不是登录按钮验收，也不是Android实机结果。
- 内置浏览器App登录页已刷新；用户外部Chrome需单独完整刷新后重试。WEB-004仍待实际按钮登录及Network证据。

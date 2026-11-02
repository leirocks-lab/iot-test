# S016 公共输入 UI 核验工具

此工具仅验证 Android 原生邮箱登录 UI 门禁，不是真实验证码、SMTP、AUTH-04 或登录联调。脚本源码只允许点击 Welcome 登录入口、模式切换、协议勾选指示区和原生返回；没有发送/提交点击路径，不读取环境变量、账号凭据或私密输入，不清数据、不退出已有账号。

## 离线检查（不调用 ADB）

```powershell
node --check docs/tools/verify_email_login_public.mjs
node docs/tools/verify_email_login_public.mjs --self-test
```

内置 fixtures 覆盖 XML 实体、唯一 ID/有效坐标、Welcome/两种模式识别、构建来源不匹配拒绝、原生前台组件识别以及禁止点击发送/提交。离线检查不读 APK、不执行 git、不生成 UI 报告，不等于模拟器或业务执行通过。

## 后续模拟器执行

本批作者未运行 ADB、Gradle或模拟器。待 Root 释放 UI 窗口并核对构建后，手工将专用基础模拟器停留在已退出登录的 Welcome，再执行：

```powershell
node docs/tools/verify_email_login_public.mjs --run
```

固定 `emulator-5554`、AVD `ROWAN_API36` / `ROWAN_API_36`、隔离包 `com.rowan.iot.dev.refactor`，不接受串口或包名覆盖。必须已有 UI snapshot helper（参照 `docs/tools/android-ui/snapshot.mjs` 的安装说明/既有流程）；此脚本不安装 helper/APK、不启动模拟器。

预检读取本地 `android-as/app/build/outputs/apk/development/release/app-development-release.apk` 及其 `.provenance.json`：要求 SHA256、本机构建前后 `sourceFingerprint(['android-as','app-rn'])`、`sourceUnchangedDuringBuild=true`、x86_64 和已安装 base.apk SHA 全部匹配。不匹配即阻塞，不以安装时间/文件名推定来源。运行结束再次检查当前源未变化；Root 并发修改源码会使本轮不通过。

前台必须是 WelcomeActivity 且具有登录/注册入口，无启动恢复错误/重试状态。Home、会话恢复、待清理、系统遮挡或未知页面均阻塞；脚本不会为取得前置状态退出账号、清数据或 force-stop。用 Welcome 页面行为作为公开前置证据，不声称直接读取过 Keychain/账户存储。

## 覆盖及操作边界

- 默认密码模式；未勾选协议不可提交；固定公共假邮箱、假密码填入后只观察按钮，绝不提交。
- 验证码模式切换、5/6/7 位 ASCII 数字及含字母输入尝试；协议未选时发送和提交均不可用。
- 切换模式、改邮箱、前后台返回后，先前可提交的密码/验证码不能继续提交；离页回入口再进入恢复默认密码空态。
- 验证码发送按钮仅观察 enabled，不点击；不覆盖实际发送并发、60 秒倒计时、后端验证码错误/超时或真实账号切换。这些需要既有离线业务定义和另行明确的真实联调证据。

只使用脚本内固定 `.invalid` 假邮箱和公共占位输入。快照 helper 隐藏所有输入文本，因此清空通过“先有效可提交→生命周期/输入改变→不可提交”观察，不能拿 redacted 文本证明精确长度。数字控件可能过滤字母，含字母输入尝试不等于直接验证 domain 正则；Unicode IME 输入未覆盖。测试不改系统输入法/权限/显示配置。

前后台通过 HOME 和 REORDER_TO_FRONT/SINGLE_TOP 返回同一个已启动原生 AccountActivity，要求 dumpsys 中 resumed ActivityRecord identity 前后一致，同时保持 mode 返回断言；无法确认同实例就阻塞，不以重新创建页面替代清空语义。只在已识别 IME 显示时发一次返回键收起键盘；页面返回使用经Account前台校验、唯一位于邮箱输入框上方的原生ImageButton（helper会遮蔽同组content-description），不盲按返回跨越未知页面。协议只点左侧勾选指示区，不打开正文链接。

## 输出与恢复

运行时在 `docs/测试报告/重构实施-20261101/` 新建时间戳 `android-email-login-public-*.json`。包含脚本/sidecar/安装包 SHA、源指纹、固定检查 ID 和结果、回 Welcome 状态及零发送/零提交记录；不写原始 XML、dumpsys、命令错误正文或输入值。只有 Welcome 初始/最终截图，并在截屏前后检查原生前台及 Welcome 形状；不截输入页面。

正常结束和可恢复失败都会尝试从本工具拥有的原生登录页面回 Welcome；不会碰未知页面或既有账号。若返回失败，报告 `blocked-native-return-unconfirmed` 并非零退出，操作者需只读核对当前页面；不可把报告当清理成功。SIGINT/SIGTERM 在有界调用后进入 finally；强杀/设备丢失无法保证恢复。

报告通过仅代表本批公开 UI 门禁与导航观察，不代表视觉还原、在线蓝湖版本、真实验证码/登录、iOS、硬件或完整 S016 验收通过。

实际工具修订：隐私快照会遮蔽邮箱输入框同组按钮文案，因此模式仅由稳定ID及密码/验证码控件可见组合识别，不依赖按钮文案。返回控件须在已确认的Account页面且唯一、完全位于邮箱框上方；歧义即阻塞。未降低helper遮蔽。

协议控件使用LinkMovementMethod，可能报告clickable=false；工具仅对已启用、checkable的精确原生CheckBox点击指示区，并实际等待checked翻转。其它按钮仍要求clickable=true，发送/提交不在白名单。

前后台恢复已修订为系统最近任务：仅匹配桌面组件下唯一、完整可见的“ROWAN 验证”snapshot卡片，之后核对原ActivityRecord。不会启动内部非导出组件，也不修改exported/权限或用新页面替代原实例。共享helper有独立8项离线防误触检查，公开Welcome实际同实例恢复probe已归档。

本轮额外保存密码/验证码两种表单截图，仅在本工具已填入固定公开假邮箱/假密码后截取；不读取私密env或真实验证码，前后均校验页面。早期文中“仅Welcome截图”是原工具限制，此处修订后还包括这两种公开状态。

`--visual-only`仅执行原生密码/验证码表单截图子集、空验证码门禁和正常返回；报告visualOnly=true，不替代25项全流程或真实登录/验证码联调。始终只填固定公开假邮箱，不发送或提交。

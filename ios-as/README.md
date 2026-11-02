# iOS 原生宿主

> 最新源码核对（2026-11-02）：账号、首页房间页签、多选、自解绑与展示基础源码持续同步；各批结构计数见[实施证据](../docs/测试报告/重构实施-20261101/README.md)。缺 macOS/Xcode，均未 Swift/ObjC++ 编译、XCTest 执行、模拟器视觉或 Keychain 运行验收；下面保留各历史批次原计数与限制。
> 当前实施状态（2026-11-01）：已从 RN 0.86.3 官方模板建立 Rowan.xcodeproj、原生账号/Keychain 与最小桥接源码，并补齐 RowanTests hosted XCTest target、三环境六配置及三个共享 Scheme。Windows 结构静态检查已执行；CocoaPods/Codegen、Podfile.lock、Swift 编译、XCTest 执行、模拟器/真机及签名仍未验证，不宣称 iOS 可运行或测试通过。

工程及应用 Target 名称约定：`Rowan`。工程已开始初始化；实际完成状态见上方说明与实施报告。

已补齐 HOME-01 原生元数据列表源码（房间分组、加载/空态/错误刷新及退出登录），由唯一 AccountService 发起鉴权请求；并发读取失效时共享刷新任务，仅安全读取重试一次，旧账号修订的迟到结果拒绝交付。AppDelegate 管理导航及 RN factory，点击服务端返回的设备进入 `RowanDeviceModule`，原生关闭设备容器返回首页。MQTT只读owner/pool/SDK边界现已通过应用级NativeDeviceServices接入major3生产桥源码；默认Host/expiry仍unknown，真实metadata可显示，传输配置不可用时online仍unknown且无快照，不以元数据列表冒充设备通信闭环。Swift/ObjC++/iOS运行尚未验收。

`Tests/Unit/HomeAndAccountTests.swift` 包含元数据映射、并发刷新、旧账号隔离和变更不重放的 XCTest 源码，现已与其余三十四份测试源码文件一起纳入正式 `RowanTests` 的 Sources、宿主依赖和共享 Scheme TestAction，但仍未执行。新增源码的工程引用可在 Windows 静态核对；Swift 类型检查、CocoaPods/Codegen、iOS 编译运行及设计稿视觉比对仍需 macOS/Xcode 实测。当前首页为基础原生列表，未声明完整设计稿还原或全范围业务完成。

CONTENT-01/02 使用独立内容服务，以 `type=text` 请求并用原生只读文本显示，不执行服务端 HTML，也不自动访问返回的 URL。登录页可进入隐私政策/用户协议，支持加载失败及重试。阅读完成门禁要求实际滑动至正文底部并累计 60 秒前台可见阅读时间；更改地区会清空本次阅读状态。S008 的“读完才能提交”用于注册，现有账号登录只要求主动勾选同意，不依赖协议内容服务成功。60 秒来自 `docs/ui/lanhu/project/src/view/lanhu_zhuceyinsixieyidaojishi/index.jsx` 的本地导出文案，线上设计版本尚待核对。地区仅来自用户主动选择的 ISO 地区，未选时按 V1.4 可选参数省略；品牌只来自显式 `ROWAN_BRAND_ID` 构建配置，空配置不传 `brandId`。不从系统地区或应用名称推断这两个值。

会话 Keychain Codable 数据包含 `expiresIn`、`tokenType` 及完整 `setting`（语言、通知、主题、壁纸、布局、单位及未知嵌套字段），AUTH-05 未返回设置时保留旧快照；缺失元数据保留为 nil，不伪造有效期。`expiresIn` 按 V1.4 是 refreshToken 寿命，不当作 accessToken 到期时间。`Tests/Unit/AgreementAndSessionTests.swift` 的依据为 V1.4 CONTENT-01/02、AUTH-04/05、USER-01 结构及上述 60s 本地 UI，覆盖显式参数、门禁、URL/空正文拒绝和刷新后设置完整存储；同样未执行。V1.4 未明确协议版本返回/注册提交字段，本轮按用户确认保留该缺口为阻塞，不编造版本，也不把本次本地阅读结果当成版本化注册凭据。

AUTH-01/02/07 已补齐独立 HTTP 服务、单一原生找回密码状态模型及邮箱→六位数字验证码校验→新密码→成功返回登录的基础页面；确认密码仅本地比较。发送使用 `GET /api/app/captcha` 的 `accountType=email&captchaType=forget`，校验使用 `GET /api/app/captcha/{code}`，重置使用 `PATCH /api/app/user/password` 的 `account/captcha/password`。请求不携带账号 Token，不自动重试发送或重置；未臆造 V1.4 仅建议的 verificationToken。

60 秒重发限制依据同一本地导出 `lanhu_dengluzhuce/index.jsx` 的“倒计时60S后才能重新发送验证码”，在应用内按邮箱共享；发送成功计满 60 秒，发送取消/结果不明仍保留尝试时的本地节流，服务端频率限制始终有效。账号或验证码变化撤销旧校验；取消、重复点击及迟到响应按流程修订隔离。密码依据该导出“8-12个字符，包括数字和英文”，要求 8–12 字符且至少含 ASCII 英文字母和数字各一，允许 `Rowan@123` 等特殊字符；拒绝空白为明确的本地输入约束。重置成功清理本地会话后显示成功并返回登录，不自动登录；新账号已建立时不让旧重置响应清除新会话。重置结果未知提示返回登录确认，不重复提交；服务端已成功但本地 Keychain 清理失败时，只重试本地清理。

`Tests/Unit/PasswordRecoveryTests.swift` 包含 9 个离线用例源码，覆盖上述 V1.4 请求映射、密码/验证码边界、跨页面重发限制、输入变化及取消后的旧校验失效、成功清会话、重置结果未知不重放、新账号隔离和本地清理重试；均未运行，也未发送真实邮件。登录与找回页采用可滚动容器及键盘布局避让，完整蓝湖视觉比对仍未验收。

S004–S014 邮箱注册已补齐独立原生页面、验证码服务和流程状态模型，品牌入口提供真实登录/注册导航。注册必须在本流程主动选择地区；地区变化清除两份阅读完成状态、同意及验证码校验，旧地区修订的迟到阅读回调无效。协议复用真实 CONTENT-01/02 阅读页的 60 秒/滚动到底门禁；两份已读且主动同意、当前邮箱六位验证码校验通过、密码与本地确认一致后才允许提交。验证码发送为 AUTH-01 `captchaType=register`，校验为 AUTH-02；register/forget 的 60 秒重发记录按用途隔离，邮箱及验证码变化撤销旧校验。

AUTH-03 由唯一 AccountService 发起 `PUT /api/app/user`，请求只含 V1.4 已定义的 `account/password/type=email/captcha/regionCode/system=ios/language=zh-CN`；不发送确认密码、虚构协议版本或 verificationToken。注册返回的完整会话直接安全保存，成功进入已有原生 Home，不再额外登录；登录页不额外附加注册按钮，原生返回进入品牌入口；取消及旧账号响应不接受迟到会话，超时/结果未知不重放、不报成功，提示返回登录确认。协议版本返回及注册提交字段契约仍记录为外部缺口，按用户确认不阻断已定义 V1.4 字段实现。`Tests/Unit/EmailRegistrationTests.swift` 有 10 个离线用例源码，覆盖请求/安全存储、注册条件、地区及旧阅读修订、迟到校验、用途冷却、取消/超时、旧账号及存储失败隔离；未执行、未发送邮件、未实际创建账号。完整注册 UI/流程仍待 macOS 编译运行和设计稿比对。

HTTP 后端路由现只按 `URLComponents.path` 判断，避免 `/api/app/products?category=...` 因 `?` 被误分发到平台服务；请求前缀转换只修改开头的 `/api/app/`，保留原始查询字符串。注册测试源码包含带查询参数及查询值不能改变服务归属的路由断言；不以静态检查代表真实接口联调通过。

## 目录职责

```text
ios-as/
├─ Rowan/
│  ├─ App/                  应用入口与依赖装配
│  ├─ Navigation/           全局导航与 RN 容器入口
│  ├─ Features/             原生页面与页面状态
│  │  ├─ Auth/              账号流程
│  │  ├─ Home/              首页、设备列表、快捷控制
│  │  ├─ AddDevice/         发现、扫码、配网页面
│  │  ├─ Profile/           我的
│  │  ├─ Rooms/             房间管理
│  │  └─ Settings/          全局设置
│  ├─ Domain/
│  │  ├─ Account/           账号、租户及会话
│  │  ├─ Device/            设备状态、控制及设备内业务
│  │  ├─ Provisioning/      配网状态机与绑定
│  │  └─ Firmware/          固件升级任务
│  ├─ Data/{HTTP,MQTT,BLE,Storage}/ 数据、协议及存储实现
│  ├─ Bridge/               TurboModule 与薄 Objective-C++ 接入
│  ├─ RNHost/               RN 容器、生命周期及资源装载
│  ├─ Platform/             权限、系统能力、第三方 SDK
│  ├─ Design/               设计令牌与原生公共 UI
│  └─ Resources/            图片、字体及包内资源
├─ Tests/{Unit,Integration,UI}/ 单元、集成及 UI 测试
├─ Config/                  非秘密环境及导出配置模板
└─ Scripts/                 构建、导出及归档脚本
```

Swift 负责业务服务，Bridge 适配 Codegen 与业务接口，不在 Objective-C++ 重复实现业务。Domain 不反向依赖 RN 或页面。

## S002 品牌启动与账号入口

系统 LaunchScreen 使用蓝底白色真实品牌图；运行期 Welcome 统一负责一次本地会话读取/续期。有有效会话进入既有 Home，无会话展示品牌和“登录 / 注册”两个真实原生入口。账号页不再自行恢复或额外堆叠注册按钮，返回键回到品牌入口。恢复期间显示实际进度与取消入口，不加固定延时。取消只放弃本次恢复、递增修订并拒绝迟到响应，在尚未进入持久化写入时保留 Keychain 凭据供下次启动；若物理写已入队/开始，取消后须补偿删除，不能保留该未接受写入。显式退出账号仍清理持久化会话。已有新账号时，旧恢复取消不能撤销新会话。返回入口也取消未完成登录，迟到登录响应不保存或跳转。

入口布局依据 `docs/ui/登录注册页.png` 与 `lanhu_dengluzhuceye` 的 JSX/CSS：375×812 参考画板，顶部内容面板 375×375，从系统安全区下方开始；logo 显示框 150×84，参考坐标 x113/y189；按钮参考 x47、宽280、高46、圆角8、y459/y521、间距16。外背景实测 `#F2F2F2`，上部面板 `#F4F5F6`，登录按钮黑底白字、注册白底 `#332C2B` 字，16pt semibold。启动依据 `docs/ui/启动页.png`、`lanhu_qidongye` 导出，蓝色 `#186DAF`，白 logo 显示框 150×84，375×812 下 y325（中心相对屏幕中心上移39）。安全区使用真实系统栏，不嵌入导出的时间、电量、底部手势栏或按钮截图。

使用可滚动入口内容、动态字体及按钮最小高度；窄屏按可用宽度布局并允许纵向滚动。下列原始透明 PNG 原字节复制到本工程 Images.xcassets，以高分辨率来源复用品牌形状；实际文件尺寸与口述尺寸不同时以文件核对结果记录，不拉伸、重绘或从截图截取假 UI：

| 本工程资源 | 原始来源 | 实际像素 | SHA256 |
| --- | --- | --- | --- |
| `BrandLogo.imageset/BrandLogo.png` | `app-rn-old/assets/images/login-logo.png` | 300×170 | `9bfaa1064414e67356e29cc1a50b07cc6141c201b5038d7a235ea2e2764b1bac` |
| `BrandLogoWhite.imageset/BrandLogoWhite.png` | `app-rn-old/assets/images/logo-white.png` | 302×170 | `42a91472f066b100d962f21448082940c49421c93a1216cdee6b8c6d40af8dec` |

`Tests/Unit/WelcomeTests.swift` 的 6 个离线源码用例覆盖空会话无网络且只恢复一次、有效会话续期、取消后迟到恢复、新账号隔离、拒绝续期及返回入口后迟到登录拒绝。已加入正式 RowanTests Sources；没有读取当前凭据、发起真实接口或运行 XCTest。LaunchScreen/Welcome 的布局、资源编译、小屏与大字号仍需 macOS 构建和设备截图比对，未声明视觉验收通过。

## 安全存储异步事务

只读审查确认旧 AccountService 的 read/write/delete 均直接在 MainActor 调用同步 SecItem。本批改 `SessionStorage.read/write` 为 async，`KeychainSessionStorage` 私有串行 DispatchQueue 执行 SecItemCopyMatching/Delete/Update/Add；后台只接收/返回 Data，安全API错误仍为固定文案。可注入 `SessionStorageBackend` 用于离线线程断言，生产backend为私有Security实现。async存储与同步backend协议都要求Sendable；生产适配器为仅含不可变queue/backend的final class，backend访问仍限于私有queue，需Mac编译与线程诊断复核。不可用Task.cancel假装撤销已经入队/开始的同步系统调用；本机无swift/swiftc或tree-sitter，未运行Swift语法/类型检查。

会话另有仅进程内使用的publication identity：每次session保存/restore安装都更换，即使返回完整相同token也视为新发布；request捕获该identity，迟到旧401只复用已发布会话重试，不再次refresh。它不编码/桥接，也不增加账号revision、authorityRevision或connectionEpoch。新增离线定义控制两请求均已使用旧会话，先让第一条401完整刷新并以相同token完成重试，再交付第二条401；断言仅一次PATCH、每请求只重试一次且账号revision不变，Mac未执行。

AccountService保持MainActor状态发布，`AccountTransactionGate` 用FIFO异步permit串行化 read+安装、save及clear；等待取消移除waiter，取消与授予交错时由run的defer可靠释放permit，不阻塞UI线程。`login/register`门内清旧→门外HTTP→门内保存；`logout`门外DELETE→门内复核并清理；`request`不持门，401走独立single-flight refresh；refresh网络门外、保存/失败清理门内，私有saveLocked/clearLocked不递归取门。JSON校验/编码目前仍在MainActor，未测其CPU耗时；本批不宣称整条UI性能验收。

保存时gate覆盖物理write完成、写后取消/revision复核，以及必要补偿删除。写后取消、过代或存储异常会先让内存失效，再由不继承调用方取消的owned cleanup Task删除残留；删除完成或中央失败phase确立前不释放gate，旧补偿不能删新账号。原取消仍抛CancellationError，补偿失败也必须保留中央pending，不能由取消抹掉。restore的物理read与安装同样在gate内，避免读到取消写的临时值后等补偿完成又复活它；释放gate后才做refresh HTTP。cancelRestore仅同步失效接受代次，不做IO，pending/in-progress cleanup时不得增代绕过。

所有清理路径（登录前、注册前、refresh/restore失效、密码重置、logout）统一先发布null session/新revision/pending，再执行不可提前放弃的物理delete；成功才清pending，失败保持同revision并抛AccountLogoutCleanupFailure。`cleanupInProgress`区分进行中和失败，原revision的retry只重做本地删除，不重放DELETE/注册PUT/重置PATCH。Home本地重试迁为busy保护的Task+await并跟随phase，Welcome再次出现会识别中央pending，密码重置finishReset/成功闭包改async、保存confirmedReset并对清理后的账号再次复核，旧失败不能更新到新账号revision。

`AccountPersistenceTests` 新增10项离线源码：worker backend非主线程、物理写后取消先补偿再新账号、补偿失败中央phase、任意初始delete失败、取消排队不丢permit、迟到read、旧refresh错误、新账号不能被迟到delete清除、restore写中失效、排队restore不能复活临时写。既有9份内存存储替身及调用点已迁async并由MainActor隔离测试状态；没有在XCTest autoclosure里await。本批仅源码/工程/调用点静态检查，未运行这些用例、实际Keychain、Xcode或网络；强杀进程与系统存储不可用仍没有持久化tombstone设计，不虚称已完成该验收。

## RN bridge major3 的原生只读观察

`NativeRowanHost.ts` 当前为major3，13个方法名保持不变，破坏性修改为`closeDevice(pageSessionId:string):void`，getContext.bridgeMajor固定3。设备摘要仍保留V2的13字段白名单、六类GET与ACK语义。历史major2内存TypeScriptParser/ObjC++ generator比对结论仅适用于当时签名，不作为V3验收；当前只做13方法及close单string参数的源码静态检查，未写生成产物、未执行CocoaPods/正式Codegen或Xcode。

合法原生 DeviceViewController 的deviceID/accountRevision才可建立真实DeviceReadOwner句柄，每个TurboModule最多8个观察。RowanAppServices lazy持唯一NativeDeviceServices（proof/pool/owner）；完整13字段allowlist投影native metadata与真实快照状态，不含reported、用户身份、令牌、凭证或URI。默认Host及ExpiryEncoding均unknown，在DEVICE01取凭证前安全拒绝未经验证的传输配置；HOME/DEVICE02授权metadata可真实返回，online保持unknown、snapshotAvailable=false，不能宣称连接成功。getDeviceSnapshot只读已有句柄，不新建连接；已释放/其他模块句柄拒绝。终态清私有metadata并保留最近authority/epoch；bridge delivery仅内容变化+1，与native authority独立；authority/epoch回退闭合invalid_snapshot，终态不可复活。

每个binding只保留一条在途事件和一个latest；精确ack匹配delivery才释放在途并发latest，错误owner/过期ack无效，不能把每次native变化无界排进JS队列。getSnapshot可读最新摘要，由RN处理缺序resync。可见性来自实际viewDidAppear/viewWillDisappear与UIApplication状态；初始不默认true，后台不emit，恢复可见才flush latest。暂时原生覆盖/后台或取消交互式返回只暂停投递，确认从导航栈移除才释放页面句柄；账号校验与是否可见分开，不把暂停当会话终止。显式retry调用同一native handle重新核对归属/初始化，不能伪造成功或counter；当前unknown Host仍如实失败。

registry由MainActor按TurboModule owner与原生page隔离；release、页面关闭、invalidate只释放各自句柄。原生AccountService在revision失效与持久化/清理阶段变化时发内部通知，桥接核对同一账号实例并闭合旧观察；同步get/retry也复核页面与账号，迟到回调不能重新打开终态。关闭容器只凭调用页初始props中的native pageSessionId匹配当前top page及账号上下文，不能用共享module最新映射授权；旧module invalidate不清新module资源。以上为iOS生产只读接线源码，尚未Swift/ObjC++编译、iOS事件或真实broker验收；不以Android结果代替iOS证据。

`BridgeObservationTests` 9项离线源码包含13字段白名单、固定未知不可用、终态counter保留/回退、重试无假counter、session隔离、精确ack/单inflight/latest、初始后台不可见、owner/page释放及旧页不能observe。已进入正式RowanTests，但未运行；Swift/ObjC++编译、代码生成链接、RN事件投递及真机生命周期仍待macOS验收。注册提示同时按“未选地区/已选未读/读完未同意”分支同步，不再在已选地区时提示重新选地区。

## Classic Shadow 纯状态核心

`Rowan/Domain/Device/MQTT/` 已实现 Foundation/Swift 纯状态核心，以 V1.6 Corrected 第10章 MQTT 语义为准，Android 对应核心与21项行为用例作为跨端对照；不引用其非 MQTT 业务定义。`ClassicShadowReducer` 由 MainActor 串行管理，输入包含 accountRevision、connectionEpoch、resourceID、thingRef 和 userID；旧账号/连接/资源回调拒绝，重连必须新建 epoch/reducer。该核心未接 Broker SDK、网络、凭据、Home 或 RN 设备观察服务，不表示真实 MQTT 或设备控制已经可用。

仅产生四个精确响应订阅 Topic，以及 get/update 发布描述；get 为零字节空消息，发布 QoS1、retain=false。typed `ShadowValue` 与按路径版本树保留部分 reported，嵌套 null/父级替换形成删除屏障，迟到旧快照只能补缺失字段、不能回滚新字段或复活已删除状态。输入限128KiB、32层、单容器4096项，拒绝无效UTF-8、非整数/负版本及越界字段结构；不把 malformed 输入部分写入状态。

命令分为 sending、sent（PUBACK）、cloudAccepted、targetReached、rejected、unknown。desired/PUBACK/云接受都不改写 reported；只有 update/reported 中版本严格新于本命令基线及接受版本、且当前实际字段仍匹配的目标观察才达成 targetReached。设备 reported 无须复制 App clientToken，先 reported 后 desired accepted 的有效证据会保留；get 快照不作为设备执行确认。targetReached 表示观察到较新目标状态，不证明本命令独自导致执行。连续重叠目标取代旧命令，超时/断线/close 标未知，绝不自动重放。默认2000ms仅是可注入的本地工程超时，不是协议保证。

断线、close 或任何非none恢复状态下 online 都是未知，缓存仍保留；404显示暂不可用、409要求get，只有主动查询后的有效且足够新 get/accepted 才恢复控制资格；401/403需修复授权，不盲重试。控制必须注入已核验 `ShadowProfile` 字段/值校验及 `ShadowMetadata` 的身份、来源命令和值路径；没有映射拒绝控制。生产核心不硬编码 Power、EnduserId、DeviceId 或 CommandType，备用产品测试证明这些示例名可以只是普通产品属性。

`hasRequestedSnapshot` 仅在本reducer主动get后的有效且足够新get/accepted才为true，空state或空reported也是真实完成；update/旧快照/malformed不完成新query。新query、get拒绝或任何recovery、disconnect/close均清除该标志并保留reported缓存。新增3项对照源码与Android同语义。

`Tests/Unit/ClassicShadowReducerTests.swift` 21项离线源码用例已纳入正式 RowanTests Sources，覆盖精确Topic/空get、三层确认、先reported后accepted、乱序/删除屏障、上下文隔离、连续目标、快照非确认、超时/断线/close、错误恢复、恶意payload、在线缓存及显式产品/元字段映射。Windows只完成工程结构与文本核对，未编译Swift、执行XCTest、连接真实Broker或验证设备。真实会话/订阅/PUBACK/重连/业务状态服务及双端联调仍待后续集成。

## 账号 UI 本地稿对齐

登录、邮箱注册、找回密码与地区选择已改用共享 UIKit `AccountDesign`：背景 `#F2F2F2`，白色圆角8输入、默认46pt最小高度、16pt字体、source 邮箱/锁/地球/返回/搜索/复选框图标，黑色可用主按钮及20%黑色禁用按钮。登录/注册大标题32pt；参考375×812下表单左右47/48pt、标题后40pt、输入间16pt，原生导航栏和返回不复制截图系统栏。找回/验证码使用160×160原始锁/信封插图，16pt导航标题、真实邮箱蓝色文字、六格数字输入、实际60秒重发状态。可滚动表单避让键盘，字体跟随系统；地区页为真实ISO数据的本地化分组、搜索、字母索引、当前选择标记及可关闭说明，无默认地区。

资源依据为 `docs/ui/注册.png`、注册验证码状态图、注册地区选择器图、登录-忘记密码系列及各自 `lanhu_zhuce`、`lanhu_zhuceshuruwanchengyanzhengmafasongchenggong`、`lanhu_zhucediquxuanzeqi`、`lanhu_dengluwangjimima`、`lanhu_dengluwangjimimashezhixinmima`、`lanhu_denglu` JSX/CSS。14份新增原始PNG原字节复制，精确来源与SHA256见 `Config/AccountAssetSources.json`，静态脚本检查打包资源hash；密码显隐的默认闭眼图从原始无文字输入底图中按源24px图标矩形运行期读取，源文件不改写。未打包页面截图、假系统栏、演示邮箱、默认美国或重复国家列表。

注册整理为“地区/邮箱/密码/本地确认 + 两份真实协议读完并同意 → 发送register验证码 → 六格输入/重发 → AUTH-02校验 → AUTH-03创建并直接保存返回会话进入Home”。第二步确认由本次显式点击发起，只在当前校验成功后调用既有注册方法；返回第一步撤销验证码校验。找回呈现“邮箱 → 验证码 → 新密码 → 成功返回登录”，成功返回不增加固定延时。所有网络行为仍由原有domain模型负责；未知结果不重放、地区/输入修订、协议60s/滚动门禁、版本字段缺口及不二次登录均保持。现有账号登录只要求主动同意，不以协议服务可用性锁住登录。

差异记录：独立旧注册图没有captcha，完整流程图/V1.4要求真实验证码，因此分步补齐；图示“美国”及重复列表只作样例，实际必须主动选地区。地区图的客服按钮及找回图“忘记账号”没有本批已实现的明确动作，未添加无效按钮；注册后地区变更规则以V1.4为准，说明文字明确区分注册前选择。状态反馈采用实际操作的原生内联文本，未用固定3秒Toast或假成功覆盖异步结果。原图仅明确默认闭眼样式，显隐后的图标状态、动态字号/小屏、原生分组圆角和完整页面间距仍需蓝湖线上版本核对及iOS运行截图，不据本地导出认定最新版。

本轮仅调整UIKit布局/绑定及资源，HTTP wire字段、domain业务状态与现有52个离线测试源码未改。Windows已核对Sources、资源hash、XML/JSON及空白；未运行Swift编译、XCTest、模拟器、真实后端/验证码邮件/账号注册，也未声明像素或视觉验收通过。

## S097–S103 房间模块

已补齐 `Domain/Rooms`、`HTTPRoomRepository` 和原生 `RoomsViewController`。ROOM-03仅采用服务端名称、默认标识及deviceCount；缺字段保持未知，不遍历HOME设备推算或伪造0。RoomID明确保留opaque字符串或64位整数类型，路径标识按独立URL segment编码。所有生产请求由唯一AccountService鉴权，repository捕获创建时账号修订并在请求前后及取消时校验，不另存Token。新建/改名要求去空白后非空、当前列表不重名，服务端仍作最终校验；错误保留原列表/原名称。

S100按根已确认裁决实现排序：GET最新列表→与编辑基线比较→如不同则刷新并丢弃旧草稿、要求重新编辑→仅发送V1.4 `rooms[{id,name}]` 的ROOM-06 PUT→GET核验顺序/名称及删除结果。没有发送虚构version、updatedAt、force、overwrite许可等字段；前置GET不是原子CAS，GET与PUT之间仍有竞争窗口，S102服务端乐观锁字段/错误契约冻结前不能宣称并发保护完成。此缺口不阻断已定义的S100整体排序实现。

删除仅允许设备数明确为0且isDefault明确为false的房间，确认后先从本地草稿移除、点击完成才整体保存，并GET确认；非空房迁移、默认房及默认/数量未知的删除分支继续阻塞，不自动移出设备或推断默认规则。默认标识仅展示，不在写入中改写。取消、超时、切账号、重复点击及迟到结果均有修订/任务守卫；超时或提交后无法GET核验标为结果未知并锁住后续写入，只有显式刷新核对后才允许新动作，不自动重复提交。页面拥有可取消的35秒工程截止时间，非协议时限保证。

S103已提供typed `DeviceRoomRepository.location/move` 服务入口（AppServices可创建当前修订实例）：ROOM-02 GET当前归属，ROOM-01 PUT绑定指定ID后GET确认；解除归属按V1.4省略id，发送空body，不发明null/Delete端点。返回值不匹配或读回失败不能算保存成功。该服务尚未接入RN更多页或扩展桥接规格，不把typed端口当作设备移动完整UI闭环通过。

Home有真实“房间”入口；从房间页返回时不论成功、取消或未知结果，都会重新加载HOME-01，因为服务端可能已接受写入。原生房间页按本地房间管理图的浅灰底、白卡片、名称/数量/默认标识、编辑/完成、黑色添加按钮及名称编辑面板组织。ROOM-03未提供设备子列表，因此不复制图中示例Air Conditioner、图片或假展开功能。排序提供可访问的上移/下移按钮，尚未实现原图拖拽手势；名称编辑采用原生sheet，系统尺寸与本地底部稿仍待比对。添加房间为V1.4单name请求，不臆造图中推荐名称批量新增、20字符后端限制或额外数据字段。

`HTTPRoomRepositoryTests` 14项及`RoomManagerTests` 6项离线源码已加入正式RowanTests，覆盖ID类型/未知字段、精确请求和读回、最新基线拒绝、安全删除、超时/读回失败未知、业务错误、账号/取消隔离、设备location/move、重复提交、草稿取消及未知锁写。依据是V1.4 ROOM详章、S097–S103映射与Android20项对照用例；iOS未编译或执行这些测试，也未真实加载/写入房间、移动设备、读取凭据或通过Mac/视觉验收。现有无原子CAS、删除迁移/默认规则及拖拽差异均保留。

## 原生设备归属与凭证入口

`HTTPDeviceAccess.authorize(resourceID:expectedRevision:)` 先由 AccountService 认证读取 HOME-01 确认真实成员，再读取 DEVICE-02 核对 device.id，并捕获同一原生账号 revision/userID 与产品 id/category、昵称及 bindingRole。`AuthorizedDevice` 只能由该文件的验证路径构造，不可 Codable、无凭证内容且默认诊断脱敏；bindingRole 只是服务端元数据，本批不据此推导控制能力。未归属直接拒绝，不请求设备详情或 MQTT。

`connection(_:)` 只接受原生 AuthorizedDevice，获取 DEVICE-01 前后复核账号/取消。ExpiryEncoding 为初始化必选参数：测试服务已有 number/epochSeconds 证据只供后续该环境显式集成，不作为所有后端默认；unknown 保持 unknown。exact target policy 从已认证、已检查归属的本次 DEVICE-01 响应生成，无 RN host/brand/token 或任意 URL 入参，不单靠 AWS 域名语法获得信任。STS 目标仍需通过既有 signer 的 AWS/path 校验，凭证不进入 MQTT CONNECT；仅 token 缺失才使用普通 WSS。签名固定采用显式 Host:443，未来传输必须保持相同 Host/authority。HTTP resourceID、返回 thingRef 和 clientID 独立保留，不强制相等或改写。

返回仅是既有 `MQTTConnectionParameters`，不创建 broker、连接池或持久化缓存，不改变 Home/RN 容器或扩展 NativeRowanHost。`DeviceConnectionFailure` 用固定 typed 错误区分 authorization/staleContext/unavailable/configuration/expiredCredentials，不将服务端凭证错误原文、密钥或签名 URL 带到诊断。此处为HTTP授权/凭证边界；后续生产只读owner接线见文末，仍未真实broker验收，也未授予控制。

`HTTPDeviceAccessTests` 10项离线源码覆盖 Android 对照6项（成员+详情、未归属、错误详情、ID分离及STS CONNECT隔离、旧账号阻止凭证、迟到详情）以及取消/迟到凭证、unknown/普通WSS、非AWS STS目标拒绝与错误脱敏。已加入正式 RowanTests；Windows 只做工程结构和源码检查，未编译 Swift、未运行 XCTest/实际 HTTP、未读取环境或凭据、未连接 MQTT。

## 添加设备目录（S036 / S042–S045）

Home 加号进入独立原生产品目录与产品详情。`ProductCatalogService` / `HTTPProductCatalog` 只负责 PAIR-01/02/03 只读元数据，生产请求统一经过 AccountService，实例绑定账号 revision；页面拥有加载、重复点击、取消和迟到响应隔离。关闭/离开页面或应用失去前台时取消加载，可显式刷新重试；不自动循环重试。未接入 BLE 扫描、设备绑定或配网，不显示伪造扫描/成功状态，也不按型号猜连接、配网或云平台。

PAIR-01 `/api/app/products` 与 PAIR-03 `/api/app/products/category` 仅在 Info.plist 中已有显式 `RowanBrandID` 配置时发送 brandId，空配置不传且不默认 as。品类按 PAIR-03 的稳定 value 在客户端筛选；当两次读取快照不同，保留 PAIR-01 实际返回的 category 并用国际化 categoryName 补充筛选项；不发送未定义 category query。推荐区域只采用 recommended=true，sort 按云端数值升序、同值保持服务端顺序，缺失 sort 放在已排序项后并保留原顺序，缺失 recommended 保持 unknown；不内置产品、推荐或假默认配网属性。

PAIR-02 使用目录实际 id（独立 path segment 编码）与 `type=text`，校验详情 id 一致。V1.4 字段表 image/configType 写 String、parameters 写 Object，示例及 2026-11-01 17:19 前只读形状记录则 image/configType 为 Array、parameters 为 key/value Array：实现明确兼容这两组形态，其他类型拒绝，不宣称文档契约已经修订。参数采用明确递归 JSON 类型和深度/容器限制；产品介绍只用原生纯文本显示，即使含 HTML 也不执行或注入 WebView。

视觉参考本地 `lanhu_tianjiashebeisaomiaozhongyoutuijianbanben` 及 `lanhu_shouyetianjiashebei` 的 #F2F2F2 背景、白色圆角12卡片、三列/分组、14/12字体与 Shop 入口；按小屏及动态字体减少列数和增高卡片。原图扫描状态、固定 AS1100 等产品示例不作为真实数据。旧 ProductThumbnail/旧资源仅作对照，没有把任何示例产品图替代云端产品图；本批未新增本地资源。后续UI修复批次已将图片改为页面内自动缩略图与详情大图，保留加载、失败与重试，缺图不使用其他型号图片；整卡进入详情，Shop保留小文字入口，仅用户手势打开HTTPS Safari，不附账号头。连接方式用Wi-Fi/蓝牙用户文案，未知不猜，UI隐藏cloudPlatform/configType A/B/C与品类编码；模型仍保留原始元数据。品类原生菜单、详情原生图文/参数及完整间距/字体、小屏效果仍待Mac/设计比对，不宣称完整还原。

`Platform/Images/PublicProductImage.swift` 为独立公共HTTPS图片组件，使用ephemeral URLSession，禁用cookie接收/发送、credential storage、URL cache及账号/租户headers；拒绝非HTTPS/userinfo重定向、限制3跳，2MiB下载、20秒resource/21秒worker截止、4后台worker，ImageIO先检查32MP源尺寸再生成最长边<=1024缩略图，8MiB/48项内存NSCache。图片解码不占主线程，视图MainActor按generation/账号复核交付，页面/复用/detach取消；没有图片日志、磁盘缓存或新依赖。URLSession代理对象使用有明确锁/代理队列不变量的@unchecked Sendable，仍为Swift5源码，需在Mac编译与未来Swift6迁移时审计，不据此宣称并发验收。依据 [Apple cookie设置](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/httpshouldsetcookies) 与 [URLSession配置](https://developer.apple.com/documentation/foundation/urlsessionconfiguration)。图片服务失败会保留真实错误/重试，尚未运行下载或图像解码。

`ProductCatalogTests` 15项离线源码覆盖真实字段映射/两种形态、缺失值/错误类型、推荐与稳定排序、详情身份、URL/path边界、品牌查询、实际认证请求映射、客户端筛选无I/O、旧账号、取消/重复及迟到结果隔离。已加入正式 RowanTests Sources；Windows 仅完成结构与源码静态检查，Swift/XCTest、图片/Shop 实际打开及 iOS 视觉均未运行。Root Node 三 API 只读记录不等于本原生链路通过，未执行任何真实请求/设备写入或读取凭据。

## 退出登录与本地清理

AUTH-06 只发送一次 `DELETE /api/app/session`，不刷新 Token 或自动重放。`AccountLogoutResult` 区分 `serverConfirmed`（服务端确认）、`alreadyUnauthenticated`（401，仅清理同一旧会话）与 `noLocalSession`（未调用服务端）；403/网络异常保留会话并抛出原错误，不宣称退出成功。成功和401响应都先检查账号修订与取消，迟到结果不能清除新账号。

本地 Keychain 删除失败时，内存已失效但退出尚未完成：`AccountLogoutCleanupFailure.expectedRevision` 与 `pendingLogoutCleanupRevision` 标记专属清理状态。Home 留在当前页清空列表并禁用设备、房间、刷新等入口，只提供“重试本地清理”；`retryLogoutCleanup(expectedRevision:)` 只删除本地存储，不重发 DELETE。清理未完成时 AccountService 阻止登录、注册、恢复及普通清会话旁路；重试成功才回品牌入口，旧修订不能删除新会话。应用仍存活时重建 Welcome/根导航会将 pending 清理路由到 Home 专属清理状态，Home 从 AccountService 重新取得 cleanupRevision，不恢复普通登录入口、不请求 HOME-01；Welcome 成功、错误与取消分支均保留该路由。删除失败后强制结束进程仍可能留下旧 Keychain 数据，此时不宣称已完成持久化退出；真实安全存储异常及冷启动仍须 macOS/设备验证。

恢复入口先检查取消，已有活跃账号时不重新读取或覆盖；存储数据也经过完整会话校验。恢复拥有者仍通过 `cancelRestore(expectedRevision:)` 使迟到刷新失效；刷新接受响应与已重试GET错误处理增加取消检查。`SessionStorage` 已迁为async协议，所有安全存储调用经独立串行worker；接受/提交边界由上述事务门与写后补偿维护，不依赖MainActor同步IO阻止交错。

`AccountLogoutTests` 新增19项离线源码，覆盖成功/401/403/超时、迟到新账号隔离、取消、存储删除失败及专属重试/账号入口阻断、恢复前取消/活跃账号/无效存储/旧刷新不能持久化。已加入正式 RowanTests；Windows 仅运行结构检查，未执行 Swift 类型检查、XCTest、真实接口或 Keychain 故障注入。

## 工程环境与 XCTest

`Rowan` 为应用 Target；`RowanTests` 为 `com.apple.product-type.bundle.unit-test` 的 hosted XCTest Target。三十九份 `Tests/Unit/*.swift`（含共享离线fixture源码）（共 534 个用例源码）只进入测试 Target 的 Sources，不进入应用 Sources；通过 PBXTargetDependency/PBXContainerItemProxy 依赖 `Rowan`，`TEST_HOST` 指向 `$(BUILT_PRODUCTS_DIR)/Rowan.app/Rowan`，`BUNDLE_LOADER=$(TEST_HOST)`。三个 Scheme 的 TestAction 均明确包含该真实测试 Target，使用各环境 Debug 配置及宿主 MacroExpansion。

| 环境 | 共享 Scheme | Run | Test / Analyze | Profile / Archive | App Bundle ID |
| --- | --- | --- | --- | --- | --- |
| development | `RowanDevelopment` | `DevelopmentDebug` | `DevelopmentDebug` | `DevelopmentRelease` | `com.rowan.iot.dev` |
| preview | `RowanPreview` | `PreviewRelease` | `PreviewDebug` | `PreviewRelease` | `com.rowan.iot.preview` |
| production | `Rowan` | `ProductionRelease` | `ProductionDebug` | `ProductionRelease` | `com.rowan.iot` |

修正说明：原模板只有 Debug/Release，二者都是开发 Bundle ID，而唯一 `Rowan` Scheme 的 TestAction 引用了不存在的旧测试 Target ID。本次保留应用 Target 名称与源码引用，替换成上表正式身份；开发调试须改选 `RowanDevelopment`，`Rowan` 现在表示 production，不能继续当开发 Scheme 使用。测试 Bundle ID 为对应 App ID 加 `.tests`。Release 默认关闭 testability，执行 XCTest 使用 Scheme 的 Debug TestAction；不要强行覆盖为 Release 后把构建失败误判为测试失败。

`Podfile` 显式将六个配置映射到 `:debug/:release`，并为 `RowanTests` 使用 `inherit! :search_paths`。`Config/*.xcconfig` 引入应用 Pods 配置；`Config/Tests/*.xcconfig` 引入 `Pods-RowanTests` 配置。后者名称按 CocoaPods Core 1.16.2 的 target label 规则核对。`Config/Environments/` 保存已确认环境/Bundle ID，`Config/Modes/` 保存 Debug/Release 语义，`Config/Common.xcconfig` 的 API 地址、租户与品牌均为空。复制 `Config/Overrides.example.xcconfig` 到 `Config/Local/Development.xcconfig`（或 Preview/Production）后仅填非秘密配置；本地覆盖文件已忽略，不从其他项目、系统地区或应用名推断环境值。未配置 API 时明确失败，无生产地址兜底；不向工程写入 Team、签名私钥或描述文件。

TestAction 仅对测试进程设置 `ROWAN_UNIT_TEST_HOST=1`。仅 Debug 编译保留此测试入口，AppDelegate 因此创建最小 UIKit 宿主，不恢复真实 Keychain 会话、不创建 RN runtime、不访问后端。普通 Launch/Profile/Archive 不携带该变量，保持正式启动路径。`getContext` 从同一 MainActor 账号快照读取 `session.setting.language`，缺失/空值才回退 `zh-CN`；新增只允许 bridgeMajor/sessionRevision/authenticated/language 四字段、不得泄漏会话 Token 的离线语义用例。当前 534 个用例使用离线替身，不需要 Metro；这不覆盖真实 RN 容器启动、后端或 Keychain 集成测试。

以下命令按当前实际工程、Target、Scheme 和配置编写，供 macOS/Xcode 上执行；本轮没有运行。RN 来自 `../app-rn/node_modules`，Codegen 输入来自新模块，禁止 Expo prebuild 覆盖本工程。先从仓库根目录安装新 RN 依赖，再进入 iOS：

```sh
pnpm --dir app-rn install --frozen-lockfile
cd ios-as
bundle install
bundle exec pod install
python3 Scripts/verify_project.py
xcodebuild -list -workspace Rowan.xcworkspace
xcodebuild -showdestinations -workspace Rowan.xcworkspace -scheme RowanDevelopment
xcrun simctl list devices available
```

`pod install` 后才会生成正式 workspace、Pods 配置、Codegen 和真实 `Podfile.lock`。当前没有这些安装结果，未伪造锁文件。Ruby/CocoaPods 版本依据 Gemfile；Xcode 及 SDK 版本仍需在真实 macOS 环境验证并记录。静态脚本也可在仓库根目录执行 `python ios-as/Scripts/verify_project.py`，只检查 OpenStep 对象/引用、Sources、宿主依赖、配置与 Scheme XML，不能证明编译或测试通过。

从上面列表选取实际可用模拟器 UDID 并设置 `ROWAN_SIMULATOR_UDID` 后执行（不硬编码未经确认的机型/系统）：

```sh
mkdir -p dist
xcodebuild -workspace Rowan.xcworkspace -scheme RowanDevelopment -destination "platform=iOS Simulator,id=${ROWAN_SIMULATOR_UDID}" -resultBundlePath dist/RowanDevelopment-UnitTests.xcresult CODE_SIGNING_ALLOWED=NO test
xcodebuild -workspace Rowan.xcworkspace -scheme RowanPreview -configuration PreviewRelease -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
xcodebuild -workspace Rowan.xcworkspace -scheme Rowan -configuration ProductionRelease -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
xcodebuild -workspace Rowan.xcworkspace -scheme RowanDevelopment -configuration DevelopmentRelease -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

另外两环境的离线测试可将首条命令 Scheme 改成 `RowanPreview` 或 `Rowan`，并更换 resultBundlePath；TestAction 自动选择 PreviewDebug/ProductionDebug。重复运行须使用新的 resultBundlePath，Xcode 不覆盖既有 xcresult。Release 构建必须验证包内 `main.jsbundle`、资源和脱离 Metro 的启动，模拟器 build 成功仍不等于签名归档或业务验收。

当前宿主版本为 `1.0`、构建号 `1`。下面仅生成不签名的 production 归档供结构检查；文件名按根 README 的平台/环境/版本/构建/提交约定，未宣称已产出：

```sh
ROWAN_GIT_SHA8=$(git rev-parse --short=8 HEAD)
xcodebuild -workspace Rowan.xcworkspace -scheme Rowan -configuration ProductionRelease -destination 'generic/platform=iOS' -archivePath "dist/rowan-ios-production-1.0-1-${ROWAN_GIT_SHA8}.xcarchive" CODE_SIGNING_ALLOWED=NO archive
```

不签名 `.xcarchive` 不能作为已签名渠道包。Team、已注册 App ID、签名与导出渠道需受控环境实际确认；尚未建立已验证 ExportOptions，不提供虚构 IPA 导出结论。`.app`、`.xcarchive` 和 `.ipa` 不互相改扩展名。CFBundleShortVersionString/CFBundleVersion 分别对应公开版本/构建号。

工程结构依据 Apple 的 [添加测试](https://developer.apple.com/documentation/xcode/adding-tests-to-your-xcode-project)、[hosted 单元测试设置](https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/UnitTesting/02-Setting_Up_Unit_Tests_in_a_Project/setting_up.html)、[xcconfig 文件](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)；Pods 测试配置名称参考 [CocoaPods Core 1.16.2 官方源码](https://github.com/CocoaPods/Core/blob/1.16.2/lib/cocoapods-core/podfile/target_definition.rb)。本地 RN 0.86.3 `scripts/cocoapods/helpers.rb` 的最低 iOS 版本为 15.1，工程保持一致。上述结构检查尚不能替代 Xcode 对 Swift、Objective-C++、CocoaPods/Codegen、链接、测试启动和签名的验证。

## 关联项目

- [根 README](../README.md)：环境、版本、构建顺序及产物命名。
- [RN 模块](../app-rn/README.md)：共享页面及桥接规格。
- [Android 宿主](../android-as/README.md)：同一契约的另一平台实现。
- [架构设计](../docs/SDD/原生与RN架构及通信设计.md) 与 [代码规范](../docs/SDD/原生与RN代码规范.md)。


## 已发布物模型的纯约束解析

`Domain/Device/Capabilities` 仅解析 V1.4 THING-01 的 data：version、attributes、services、events、可选 etag。本地 `ThingModelPayload.productID` 是调用方持有的产品来源，响应没有新增 productID；必须精确匹配原生预期 productID 与已发布 version，不拆 HTTP envelope、不接受旧字段别名，不按名称/型号猜能力。服务、事件保留独立不可变定义，缺失或错误集合以 known=false/diagnostics 表达，重复/非法属性隔离而不覆盖无关属性。

BOOLEAN 严格区分 CFBoolean 与 NSNumber(0/1)，ENUM 只接受精确、唯一字符串，INTEGER 必须显式声明安全整数 range、正整数 step 与 unit；不默认 step=1、不猜温度单位，不将只读 access 提升为可写。数值通过 Decimal 与 Int64 网格检查避免 Double 余数舍入；JSON 数值文本若超出 Decimal 可精确保留的范围则拒绝整个文档，重复 JSON key 同样拒绝，避免解码器静默舍入或覆盖。输入限制为 512KiB、32 层、每集合4096项，是本地失败关闭的工程边界，不是额外后端契约。`WriteConstraintStatus.complete` 仅表示约束完整，candidate 校验不产生产品控制映射、生产 ShadowProfile、设备权限或 MQTT 写能力。

`PublishedThingModelTests` 新增17项离线 XCTest 源码，覆盖产品/版本来源、data-only、严格布尔/枚举/整数、安全边界网格、缺失与混合字段、重复标识、服务/事件定义及集合未知状态；已加入正式测试 Target。仅执行 Windows 工程结构和源码静态检查，未编译 Swift、未执行 XCTest/THING-01/真实设备通信；HTTP 获取、生产能力绑定与设备写入仍不在此纯模型批次中。


## 认证请求的调用方账号边界

`AccountService.request(..., expectedRevision: Int? = nil)` 在 MainActor 同一同步段捕获 revision/session/publication，先比对调用方绑定修订再选 token；旧绑定遇到新账号时以499结束且不调用网关。请求发出后账号变化同样拒绝迟到响应，不换新账号重放。安全GET/HEAD仍只在原账号revision内单次刷新/重试，publication身份继续避免相同token文本触发重复刷新，不为普通token续期递增账号revision。Room/Catalog/DeviceAccess传既有绑定修订；Home页面通过 `loadGroups(expectedRevision:)` 显式传入页面修订，跨账号复用的Home仓库不保存首次初始化的账号。

`HomeAndAccountTests` 新增3项离线源码定义：旧绑定发出前499且网关零调用、已用A发出后切B拒绝且不重放、同revision刷新后使用新token。现有测试文件已纳入正式Target，不新增工程引用。本批仅源码/工程结构和空白检查，未编译Swift或执行XCTest/网络。工程当前SWIFT_VERSION=5.0；HTTPGateway的Any/[String:Any]跨actor传递是未来Swift6严格并发迁移需在macOS核对的风险，未获得编译诊断，不在本批无证据重构HTTP架构或宣称并发编译验收。


## 用户偏好的独立业务服务

`Domain/Preferences` 对齐 V1.4 USER-01/02：读取保留完整不可变 rawJSON（含未知字段和未知枚举），提供严格可选语言/通知/主题/壁纸ID/布局/温度单位/计量制投影，不制造缺省值。GET壁纸是对象，PATCH仅发送选中string ID；typed patch仅包含显式变更，false不丢失、nil不发送、不回写整个读取对象或null。语言仅zh-CN/zh-TW/en，主题仅system/light/dark；布局和壁纸ID只作不空且无控制字符的不透明标识，不造列表。USER-02各字段独立可选；正文“单位组合一致”没有冻结允许矩阵，故不猜C/metric或F/imperial配对、不为单字段更新补写另一字段。

`HTTPPreferencesRepository` 捕获原生revision/userID/清理状态，所有请求前后检查并向AccountService传expectedRevision；使用真实GET/PATCH `/api/app/user/setting`，原生网关已解包data，GET必须对象而空对象有效，PATCH允许无data。仓库无token或偏好缓存。`PreferencesService` 串行PATCH→GET逐个目标字段核对→注入commitSettings(expectedRevision,rawJSON)→confirmed。超时/取消/回读不符/提交失败保留最近确认值、标记unknown并要求load成功解除，不自动重放PATCH；明确接受前4xx拒绝与结果未知分开。串行等待者取消不改当前操作状态；20秒watchdog取消worker，每次await后校验账号/取消，依赖忽略取消时仍等待其完成屏障才释放permit，不让迟到工作越过下一次保存。底层不响应取消时完成时间可能超过20秒，不宣称已强制中断I/O。

偏好服务通过注入commitSettings契约调用账号所有者；该账号primitive已由后续批次实现（见下），后续已接原生设置DI/UI（见下）、没有保存第二登录态，也不声称主题或语言已应用。32项离线XCTest源码（12模型/12服务/8仓库）已登记正式Target；Windows只运行工程结构和源码静态检查，未编译Swift/执行XCTest、真实HTTP、账号持久化或视觉验收。


## 账号所有者的完整设置提交事务

`AccountService.commitSettings(expectedRevision:rawJSON:)` 在同一事务门内核对revision/活跃账号/无pending清理，基于当时最新session只替换完整setting，保留accessToken、refreshToken、userID、expiresIn和tokenType，账号revision不变。AccountSettings保留完整typed JSON，已知字段仅严格可选投影，未知或错误类型仍保留原字段。旧revision遇新账号在存储写前499，不回写旧凭证快照。

进入物理写入后由owned非取消MainActor Task覆盖write和成功发布，串行门等待屏障完成再释放；已取消调用方随后收到Cancellation。普通偏好写入失败保留有效登录态与最近确认设置，不走凭证saveLocked失败删除逻辑、不制造pending清理。若底层写入后才抛异常，不能断言磁盘保持旧字节，服务仍按unknown要求重新读取；此处没有伪造持久化原子成功。若cancelRestore在物理写入期间使内存失效，则在门内清理该旧物理写（失败进入既有pending），防止冷恢复复活旧账号；新账号登录不能越过此屏障。

credentialPublication仅在凭证安装/续期/失效时替换，settings提交保留此identity，避免迟到401因设置发布而跳过必要refresh。独立settingsPublication记录已确认提交；refresh HTTP起点捕获它，在门内重读latest session后合并，若期间有设置确认，则无论刷新响应含旧setting或缺setting均保留最新setting，同时安装新credentials。未改请求一次重试/single-flight和expectedRevision边界。

`AccountSettingsCommitTests` 9项离线源码覆盖刷新后提交保最新凭证/未知字段、旧revision零写、物理写后取消仍发布、B登录等待旧写、普通写失败保会话、设置发布不压制迟到401续期、迟到刷新旧/缺setting不回滚确认设置，以及cancelRestore在设置写中失效后的补偿/排队B隔离与补偿失败pending，已纳入RowanTests。本批仅Windows结构/源码/空白检查；未执行Swift编译、XCTest、实际Keychain/HTTP/设备或语言主题应用。偏好服务与此primitive已由后续原生设置页接入（见下）。


## 原生我的/设置入口（基础实现，非完整视觉或全局应用验收）

首页保留房间、添加、刷新和退出原有路径，新增“我的”；我的仅设置与退出，不添加个人资料/删除账号/反馈占位。`RowanAppServices.newPreferences(expectedRevision:)` 在同一MainActor同步段校验revision/user/pending，连接HTTPPreferencesRepository、currentAccountValid和AccountService.commitSettings；页面绑定原生revision，旧账号/取消/迟到结果受既有业务边界约束。Mine退出清理失败、页面检测pending都返回现有Home中央本地清理UI，不展示普通登录入口或重复发服务端DELETE。

设置与选项子页参照本地 `设置-语言.png` 及 `lanhu_shezhiyuyan` CSS的#F2F2F2底色、白圆角列表、蓝色勾选与原生返回，使用可滚动UIKit表单/动态字体。语言仅简体中文/繁體中文/English；设计图的“跟随系统”、德法西意等与V1.4枚举不符，未加入。主题明确跟随系统/浅色/深色，单位独立选°C/°F、公制/英制，通知云偏好明确开启/关闭；系统通知授权只读取展示，不自动申请权限。加载/busy/unknown禁用写项，保留重新读取；壁纸与布局只显示真实当前是否提供/已有设置，不露wire布局ID，不造壁纸/布局选项，选择器因缺权威目录继续阻塞。

已确认主题仅用于设置页本身的显示；语言仅作为云端偏好显示与提交，全App及RN的语言/主题资源应用尚未实现/验收，不能认定S105/S107全通过。Mine/Home整体视觉尚未冻结，现有全局入口布局也不是完整设计稿还原。无新增图片资源/依赖，系统栏不嵌假图。稳定accessibilityIdentifier包括prefs_title/status/reload/language/theme/temperature_unit/measurement_system/notification/back与mine_title/preferences/logout/back；保留home_logout并新增home_mine。

Windows已核对Sources、导航调用点、稳定ID和工程结构；未运行Swift编译、XCTest、系统通知读取、真实HTTP/偏好写入、iOS模拟器或视觉截图。本批低影响原生UI复用已有业务测试定义，未新增镜像测试，全部iOS行为及视觉仍需macOS/Xcode验证。


## TIMER纯业务基础（无生产动作发行器/页面/DI）

`Domain/Device/Schedules` 对齐V1.4 TIMER-01～05。ScheduleScope绑定accountRevision/resourceID/productID/modelVersion；内部ActionPermit是原生已验证动作的精确scope/非空object actionJSON/可选mode DTO，仅测试构造，不存在生产issuer/产品registry，不从读取action或物模型自动授予权限，不默认power。只读ScheduleRecord保留完整rawJSON、未知字段/枚举及服务端opaque nextExecutionAt；写入ScheduleDraft只含参数表字段，不回写id/nextExecutionAt/future，不造date，不在App计算DST或下次执行时间。

时间严格5字节HH:mm，时区使用系统已知精确IANA ID（Etc/UTC作为标准IANA ID显式接受），custom星期1～7必填并去重排序；不猜type/repeat组合矩阵。创建enabled未指定则省略，显式false/true发送；编辑保留existing false，未知enabled必须明确选择，其他可选字段不合成null或mode。未来生产ActionPermit发行器必须另行核实真实产品能力、设备权限与版本，当前constructor不代表完成该验收。

HTTPSchedulesRepository使用原生AccountService expectedRevision及绑定user检查五路径：GET/POST `/api/app/devices/{deviceID}/schedules`、PATCH/DELETE `/api/app/devices/{deviceID}/schedules/{scheduleID}`、PUT `/api/app/devices/{deviceID}/schedules/{scheduleID}/enabled`；设备/日程ID分别编码。列表错形/重复ID拒绝；create须真实服务端ID，update须同ID，enabled须真实bool且等于目标，DELETE允许无data。1701～1704和明确4xx拒绝保留类型，传输超时/坏mutation响应等为unknown，不自动重放。

SchedulesService单一inflight拒绝重复提交而不排队，mutation→GET精确目标核对后发布。缺ACK/ID的create保持unknown，即使显式load出现相似规则也不解锁；有真实ACK ID及其他已知ID操作只读回核对，不重复POST/PATCH/PUT/DELETE。读取可展示当前列表，但不是对请求归因或原子CAS保证。20秒本地watchdog取消worker，await后复核取消/账号；不配合取消的依赖须完成屏障后才解除busy，因此不承诺强制20秒中断底层I/O。unknown只在内存中保留，尚无进程重启事务恢复契约。

40项离线XCTest源码（16模型/9服务/15仓库）已进入正式Target，覆盖scope/permit/timezone/HH:mm/false/未知字段、创建丢ID不推断、已知ID回读、重复/取消/旧账号及五HTTP契约。本批仅Windows结构/源码/空白检查；没有Swift编译/XCTest、实际创建或修改定时、网络、Gradle/ADB、DI/UI及硬件验收。相关配网/扫码只读研究另存[协议缺口核对](../docs/SDD/配网与扫码协议缺口核对.md)，不代表该链路已实现。


TIMER时区补充：新增真实IANA别名/UTC与Java-only短ID的对照测试定义，包含EST/MST/HST、Australia/ACT、US/Eastern、CST6CDT及拒绝PST/ACT。Foundation仍使用既有严格knownTimeZoneIdentifiers名单与Etc/UTC，不盲加Java SHORT_IDS过滤；该新增用例尚未在Darwin Foundation/XCTest执行，不能据Android GREEN推定iOS名单验证通过。


TIMER未知物模型版本补充：ScheduleScope.modelVersion现为显式String?，nil允许原生已授权列表和已读取known ID启停/删除，不制造dummy版本，也不为这些元数据操作强行获取控制字典。ActionPermit构造及draft序列化均拒绝unknown model；raw读取action不能反向授予动作许可。取得真实modelVersion后须重建scope并重新读取，不改写既有scope。新增4项离线定义覆盖unknown只读、双重动作门禁、仅loaded ID元数据操作及原生HTTP/旧账号守卫，仍无DI/UI或Swift/XCTest执行。


## MQTT SDK适配第一阶段（候选依赖，运行时尚未接入）

Podfile新增`CocoaMQTT/WebSockets`精确Git tag `2.4.1`候选pin；只读核对[官方tag](https://github.com/emqx/CocoaMQTT/releases/tag/2.4.1)、[podspec](https://raw.githubusercontent.com/emqx/CocoaMQTT/2.4.1/CocoaMQTT.podspec)、[Core API](https://raw.githubusercontent.com/emqx/CocoaMQTT/2.4.1/Source/CocoaMQTT.swift)、[socket协议](https://raw.githubusercontent.com/emqx/CocoaMQTT/2.4.1/Source/CocoaMQTTSocket.swift)与[消息](https://raw.githubusercontent.com/emqx/CocoaMQTT/2.4.1/Source/CocoaMQTTMessage.swift)。尚未在macOS解析依赖/安装Pods，没有Podfile.lock、Codegen或技术锁定验收；不修改全局use_frameworks配置，传递依赖也未被实测锁定。

`MQTTBrokerPort`与MainActor单次使用adapter注入driver，捕获accountRevision/connectionEpoch/resourceID/thingRef/userID上下文，CONNECT仅在CONNACK成功及四个精确responseTopic全部QoS1 SUBACK后返回。只允许空get或非空update，QoS1/retain=false；publication MID仅匹配其PUBACK，不能把socket写入、云接受或reported目标到达混为成功。最多32个在途本地发布，无App离线队列；离线拒发，断线/超时/close/提交后取消均淘汰client，所有未确认发布结果unknown，不跨连接重放。该Port尚无账号owner/pool，调用方未来仍须核对当前账号并在变更/后台/释放时close，不代表设备在线或控制成功。

`CocoaMQTTSDKDriver`仅使用已核对2.4.1 Core签名，SDK构造/会话存储访问/连接/发布/销毁在专用串行queue；cleanSession=true、autoReconnect=false、logLevel.off、默认系统TLS及hostname校验，STS不进入CONNECT，普通V1.4 WSS才注入username/password。不转发SDK原始错误、packet或签名URL到日志。SDK本身的同连接QoS1协议DUP重传不是App业务重放；未声称SDK具有已核实的全局no-offline-queue开关，wrapper仅在线时准入且断线销毁client，不能跨client继承旧队列。

2.4.1 WSS协议源码现已完整核对，先前cache miss阻塞已解除：[官方exact文件](https://github.com/emqx/CocoaMQTT/blob/2.4.1/Source/WebSocket/CocoaMQTTWebSocket.swift)，本轮已读参考字节SHA256 `c6ad6d01cc31c31ae0366dd463537ea72fbef35b12c6bc16da3251bd8d8e2d89`。`ControlledMQTTWebSocketBuilder`按exact buildConnection(forURL:withHeaders:)返回自有connection，校验原始签名URL字节并拒绝外来headers；socket设置完整uri/shouldConnectWithURIOnly=true，连接受控ephemeral URLSession factory，保留mqtt子协议、拒redirect/ambient cookie/cache/credential/非TLS身份挑战及默认系统TLS验证。默认driver已使用真实受控socket工厂；不存在缺源码stub，未知Host仍在建socket前拒绝。尚无生产verified Host配置、pool/owner/桥接注册，不能声称运行时设备通信已接通。

Host canonical模式由原生显式`MQTTTransportHostPolicy`注入，unknown默认拒绝；HTTPDeviceAccess在DEVICE01请求前即拒绝unknown，不能因URL带443推断真实wire Host。测试可以明确注入hostnameOnly或hostnameAndDefaultPort；受控request虽然设置Host，URLSession实际Host/:authority及签名升级仍须真机/模拟器实测，当前没有生产verified配置。先前Node两种形式成功不构成iOS传输验证。

新增20项adapter/受控factory/默认driver离线测试定义及2项HTTPDeviceAccess Host策略定义（该文件共12项），已纳正式Target；检查CONNACK/四SUBACK/QoS降级、PUBACK MID、取消/超时/离线/迟到epoch、signedURL与无ambient stores。受控factory测试仅创建suspended task并cancel，不resume或请求网络。Windows只运行工程结构/引用/空白检查，当前74份app Sources、35份XCTest Sources合计452方法；没有Swift编译、XCTest执行、Pods/Codegen、真实API、broker、iOS模拟器、TLS/Host线级或硬件验收，也没有pool/owner/桥接集成。


## OTA纯业务基础与major2定时/固件只读方法

`Domain/Device/OTA`与`HTTPOtaRepository`按V1.4 OTA-01～05建立原生scope/accountRevision/resourceID/userID、MCU/Wi-Fi候选、任务ID及严格`updating/success/failed/cancelled`结果。精确路径为GET `/devices/{id}/ota/mcu`、GET `/devices/{id}/ota/wifi`、PUT `/devices/{id}/ota/task?type=mcu|wifi` body仅firmwareID、DELETE `/devices/{id}/ota/task` body仅taskID、GET `/devices/{id}/ota/task/{taskID}`（统一`/api/app`前缀）。ID按独立segment编码，设备返回ID须匹配，统一AccountService expectedRevision/当前user校验，写操作不重放；不下载固件，不推导hasUpdate/百分比/当前版本/升级阶段。

OtaService只提供未接入运行时的原生状态核心；默认start/cancel许可均nil，固件offer、DEVICE02静态online、RN参数及updating均不能授权。测试中的许可绑定scope/固件/实时reportedCurrent证据/epoch/authority/期限；取消须独立许可窗口，DELETE ACK须OTA05终态确认，回读updating/丢响应/超时保持unknown且不重复DELETE；未知create缺任务ID不因重新读offer、resume或相似任务解锁。当前没有生产permit issuer、持久journal、App级任务owner、DI/UI/写桥，**不能实际启动/取消升级**。进程重启任务恢复和硬件执行尚未验收，纯测试构造器不代表生产授权已完成。

轮询为单一inflight的GET primitive，最短3000ms、默认120次/每请求20秒本地限制；并发重复调用不排队写入，不自行建无限poll loop。失败保留lastConfirmed，后台/离栈仅stopObserving，不取消/忘记云任务。迟到create ACK发布task时保留当时observing；显式新观察窗口可重置读取预算，绝不重试任务。Swift timeout采用取消worker后等待完成屏障；不配合取消的依赖完成前仍busy，不承诺强制20秒打断底层IO。账号/设备撤权后清展示scope并停止后续请求。

major2同步`getDeviceSchedules(observationId)`与`getDeviceFirmware(observationId,kind)` ObjC++/Swift签名，kind仅mcu/wifi。安全DTO只存允许显示字段，所有字符串非null、缺失为空串；未知业务枚举/启停为unknown，weekdays为数字数组。itemKey为本地展示键，非写授权；nextExecutionAt仅来自服务端。固件只含kind/version/remark/deviceName，不含ID/MAC/URL/raw action/mode/认证材料。现已按文末生产接线接入真实native handle的fresh授权GET，只有当前模块/页面/账号/非撤权handle可调用；不接受任意deviceID反向授权，不返回假空数组或假offer。模块共用2个实际I/O名额，离栈/后台/取消/超时均一次终结promise，实际I/O未结束继续占槽。

新增30项OTA对照XCTest源码（21服务/9HTTP）及4项只读桥接定义，均已纳正式Target。Windows工程结构检查实际通过293 objects、74 app Sources、35 XCTest Sources合计452方法，空白检查通过。未执行Swift类型检查/XCTest、CocoaPods/Codegen、iOS模拟器/真机/签名、真实GET/PUT/DELETE、broker、固件任务或硬件验证；Android测试结果不代替iOS验收。正式桥接依据为[设备只读功能桥接契约](../docs/SDD/设备只读功能桥接契约.md)，Codegen后的生成签名与真实RN容器仍待macOS编译验证。


TIMER路径补充：ScheduleRecord.decode现拒绝完整`.`/`..` ID；HTTPSchedulesRepository.segment原已拒绝同类resource/日程路径段，本轮新增零dispatch对照定义，并验证`foo..bar`及字面`%2E`仍是opaque ID（后者编码为`%252E`，不预解码）。新增3项模型/HTTP离线定义，TIMER现40项，全部工程现452方法；仍未Swift/XCTest执行。


WSS连接桥补充：新增exact2.4.1协议实现`CocoaMQTTWebSocketBridge`及9项假transport测试定义，覆盖builder原URL/空headers、仅显式connect启动、mqtt子协议、SDK指定queue上的open/data/text、单次read交付、取消/断线终态、pending write只完成一次及迟到callback丢弃、1MiB消息上限。默认driver未知Host测试现预期unverifiedTransport；已移除sdkWebSocketBridgeUnavailable旧stub。连接工作与SDK回调queue分开，取消同步关闭准入后cancel/invalidate会话，write完成仍只是socket完成而非PUBACK；当前测试既未resume生产task也未发网络。构建入口仍为候选Pod tag，Windows只核对293 objects/74 app Sources/35 XCTest Sources/452方法及源码/空白，未Swift编译/XCTest、Pods、真实签名升级、TLS/Host/:authority、broker或设备验证。Swift 6严格并发与第三方SDK实际链接也须macOS编译核对，不凭此源码称依赖已验收。


## MQTT共享pool阶段（待review，尚未接只读owner或生产观察）

新增resource-neutral `SharedMQTTBrokerPort/Adapter`，复用同一CocoaMQTTSDKDriver及受控WSS，不复制网络实现。CONNECT仅等CONNACK，四精确topic分别由pool批量SUB并要求全部QoS1，UNSUB等精确UNSUBACK，PUB完成仍仅对应MID PUBACK。新增UNSUB接口按[exact2.4.1官方Core API](https://raw.githubusercontent.com/emqx/CocoaMQTT/2.4.1/Source/CocoaMQTT.swift)核对。单资源被拒订阅清理部分grant，不退休其他有效resource；协议错配/真实断线则淘汰整个client。取消单个publish等待为unknown，迟到MID/ACK不能恢复该调用或关闭其他正常等待；SDK无离线App队列/自动重连。

`NativeSharedBrokerPool`按accountRevision+authority/path/serverClientID共享连接，签名query不进key，不改服务端clientID。NativeShadowLease绑定accountRevision/user/resourceID/thingRef及原生observer ID；同resource多lease共享一次credential请求/订阅，同broker的不同resource共享client并按精确topic计数，最后resource/lease释放关闭SDKclient，部分订阅取消后清理未引用topic。所有创建/返回/发布/消息交付复核当前账号与entry/generation，账号变更关闭旧lease及旧连接；迟到旧credentials/port/ACK不能获得新账号权限。

pool只暴露空payload get，不暴露update/control，也不自动发业务命令。lease ready仅指CONNACK+该resource全部SUBACK完成，绝不代表设备在线或已取得快照；未来DeviceReadOwner必须在每个ready/new epoch新建reducer并query/get。每lease有独立单调epoch，有界消息队列及一个in-flight delivery，仅精确sequence ACK释放下一项；gap丢弃受影响的旧batch/在途/缓存，发布bufferRecovery新epoch以要求重新get。SDK线程到MainActor先预留64事件容量，至多一个常规drain；overflow使旧drain代次失效并排一个固定连接失败，不能先无界enqueue再截断。entry/lease容量默认32（本地限制1～256）、消息1MiB、最多64resource/128lease/64排队SUB操作；这些是原生资源限制，非产品字段或已测性能参数。

每次新连接/重试/续期重新调用注入credentials provider，不保留旧凭证seed供重连、不重放任何先前get/command。只有transportFailed/offline按本地1/2/4秒、默认最多3次退避（配置限0～5）自动恢复，配置/授权/订阅拒绝需显式retry；ready重置连续失败预算。仅显式已解码credentialExpiry触发提前30秒续期，未知有效期不猜；same-key新client影响其所有resource且均取fresh credentials，新key迁移有新epoch，续期返回未延长的已知有效期拒绝。签名URL过期只约束新握手，不当作已连接STS有效期。credential读取有20秒watchdog；不配合取消的provider完成前该resource不再次load，避免无限叠加读取，但不能据此声称强制20秒中断依赖。

历史pool阶段边界（后续owner与桥接已接源码，运行状态仍未验收）：当时只有pool源码和离线定义，不是生产授权入口。credentials provider未来必须由已认证HOME成员+DEVICE02复核+DEVICE01精确target的原生proof registry提供；当前pool接受的是内部依赖，不能由RN制造LeaseResource就越权取凭证。该阶段尚未接入owner/proof/reducer/桥接；后续源码接线见文末。旧UnavailableDeviceObservations仅保留为历史安全投影测试，不再作为生产registry。Host策略仍默认unknown，未新增生产verified形态、未启动SDK或真实HTTP/broker。后续须先review pool，再实现owner，最后在macOS验证Host/TLS/取消/并发/流量与生命周期；不把Android结果当iOS证据。

新增41项离线测试定义（34 pool/ingress、7 shared Port），纳入正式Target，覆盖连接复用/引用计数/部分SUB清理/GET门禁/旧epoch/账号与迟到callback/ACK/gap/有界重连/续期/单caller取消等。Windows结构实际核对293 objects、74 app Sources、35 XCTest Sources合计452方法，空白/新增源无raw logging检查通过。未安装Pods/Codegen、未Swift编译/严格并发验证/XCTest执行、未真实服务/SDK连接/硬件，仍没有Podfile.lock；本阶段按Root约定停在pool供review，owner继续作为未完成事项。


Pool取消评审P2修复：静态调用链确认旧实现会在20秒watchdog取消非合作credentials后进入recovering，21秒退避调用load因旧resource.load仍非nil而直接丢弃，22秒旧I/O结束仅清nil，无新调度，因而永久recovering。本轮Resource保留一个deferredLoadReason，退避到期时只记录意图；旧actual I/O完成defer清槽、取走意图并复核同一live resource/账号后才建一次独立fresh读取，不叠加I/O。正常关闭/最后release/账号invalidate的detach清除意图，迟到完成不可复活；恢复预算/退避不因延后而重置。watchdog等待抽成可注入timer，生产默认仍20秒，仅用于离线控制时序。

新增3项离线定义通过可控timer/退避信号与不合作I/O continuation排列上述顺序，检查等待中zero extra、实际完成后exactly one fresh，以及release/account change后zero fresh。它们是在Swift工具链缺失下保存的测试定义，没有实际RED/GREEN或运行repro；本轮仅静态路径自审与工程/空白核对，当前293 objects、74 app Sources、35 XCTest Sources共452方法。DeviceReadOwner及proof/reducer/观察接线仍待下一独立阶段，不因该修复标为已完成。


## Native DeviceReadOwner源码阶段（等待review，未替换生产观察）

新增DeviceReadState/DeviceReadOwner、AuthorizedDeviceConnections、NativeDeviceServices及离线fixture。HTTPDeviceAccess只新增原生gateway协议并将HOME/detail/user等opaque身份比较收紧为UTF8字节相等；没有放宽AuthorizedDevice的fileprivate发行入口。proof registry必须先经原生HOME成员+DEVICE02返回ID复核，再DEVICE01取得独立thingRef；bootstrap只用于核对scope，不作为连接seed，每次pool credentials仍fresh DEVICE01。登记proof先于pool.observe，proof token与registration对象共同隔离旧close，新账号/释放后迟到credentials拒绝。resourceID、thingRef、server clientID各保原义，不强制相等、不重写clientID。HTTP opaque ID含Unicode时也不把规范等价的不同wire bytes视为同一ID。

每accountRevision/user/resource只有一个应用持有的owner、授权、lease和reducer，多原生handle共享snapshot；UI取消等待不取消该应用任务，最后handle释放才关lease/proof。初始化与lease交接由generation/独立transfer关闭保证；初始化30秒本地deadline后若实际I/O不配合取消，显式retry只保留一个意图，实际完成后才fresh授权；关闭/换账号清意图。所有旧generation事件在入有界队列前被拒绝，避免旧state覆盖新ready；state提示合并、frame同步reserve后处理并精确ACK，不建每消息无限Task。mailbox/pending默认32（限制1～256），owner最多64resource/128handle，单次drain逐事件yield。

每新ready epoch重建context/reducer，先登记query再调用空get；预先缓冲的响应不能跳过get调用，valid get snapshot可在PUBACK前确认，PUBACK本身不制造snapshot/online。未来epoch frame仅有界缓存，溢出毒化同epoch旧history，等待ready及新get响应；旧epoch不能回滚新值。断线/connecting/recovery保留同账号缓存但stale=true、snapshotAvailable=false、online=nil。只有有效requested cloud get可进入live，live不是物理在线；readProfile默认为nil，缺产品映射不猜ConnectType，仍可读取cloud reported。明确注入的原生profile保留只读identity/online信息，但write/target validators清空，owner/handle均无command/update方法。

Shadow 404/409在同epoch的连续未确认恢复期间至多自动补一次有效get并等待真实accepted；有效snapshot后才重置这项恢复预算，不将历史缓存当恢复；重复拒绝转unavailable等待显式重读，避免busy loop。401/403与订阅授权拒绝清reported/metadata缓存、关闭binding并forbidden，不盲重试。snapshot默认10秒本地deadline，结果未知不制造空成功；无同意产品控制映射也不阻塞只读cloud snapshot。reducer单frame限制仍128KiB，解析/合并当前运行于MainActor并逐frame yield；Mac性能、Swift6严格并发及系统后台行为尚未实测，不宣称完全无UI耗时。

NativeDeviceServices现由RowanAppServices lazy持有唯一实例：同MainActor账号快照+HTTP gateway+proof registry+共享pool+owner，账号通知在identity不变（如token refresh/settings publication）时不新开authority。默认Host仍unknown；可先读取HOME/DEVICE02，但在DEVICE01之前拒绝未知传输配置，不创建SDK连接。owner独立源码review后，现已接RowanHostServices/原生page生命周期；bridge调用不可从safe DTO反向构造proof。RN/Android本批未修改。

native authorityRevision独立单调计数，纯getSnapshot不增长、同resource observers相同；它不是JS binding revision，也不是账号credential publication。Native snapshot的reported只留原生，不是JS DTO；major3投影仍只选V2原白名单，binding自己的revision/ACK/可见性独立。native closed handle不可取旧cache，JS terminal应保留binding最后已知authority/epoch，不能把closed原生状态映射为0，也不能由原生authority变化绕过JS单事件在途限制。

新增39项离线定义（28 owner、10 proof/composition、1 opaque-ID身份边界）及共享fixture，均纳正式Target；覆盖引用/取消/迟到handoff/初始化超时单次retry、epoch/快照/PUBACK/缓存/授权拒绝/404409、proof先登记与fresh请求/旧close/new registration。Windows结构实际核对293 objects、74 app Sources、35 XCTest Sources合计452方法，空白与无raw logging静态检查；未Swift编译/XCTest执行、Pods/Codegen、真实HTTP/SDK/broker/Host/TLS/iOS后台/模拟器/硬件，不能称这些测试通过。此阶段最小必要diff为4个业务/组合源、2个原有边界协议扩展及身份比较、3个测试源和工程/README；观察生产接线继续作为未完成项。


## Owner组合评审修复与More只读源码

Owner评审两条P2已在源码中修复，并新增5项真实组合端口定义（HTTPDeviceAccess→AuthorizedDeviceConnections→NativeSharedBrokerPool→SharedMQTTBrokerAdapter→Owner，HTTP/SDK均为内存fixture）。第一条：DEVICE01的401/403/1332映射authorization，proof将配置/过期/失效/网络错误完整映射为有限BrokerFailure，不再被pool统一降成transportFailed退避；SDK CONNACK4/5也为authorization。403/1332应forbidden并清cache；persistent401按现AccountService安全刷新一次后清本地session/增rev，观察正确终结为accountChanged且旧cache不可读取。配置与已知过期不自动退避。第二条：getFailed与deadline携带queryID，旧同epoch GET取消后抛resultUnknown时，取消标记/代次在catch入队、处理、success/defer均隔离，不能取消新的404409恢复get及其deadline。新增组合定义特意悬挂第一个PUBACK，再触发404/409和旧cancel unknown，最后以真实accepted snapshot确认第二读取；**这些定义没有在Windows执行，不能称RED/GREEN**。

按[设备更多只读桥接契约](../docs/SDD/设备更多只读桥接契约.md)新增More typed scope/service、HTTP仓库、安全DTO及bound native factory。summary只含九个文本字段，members/help仅随机本地itemKey与允许文本，role只认sa/mbr/obs，其余unknown；缺失或localized object/array/number文本为空串，不用.description、不拿email/mobile作昵称、不输出ID/MAC/contacts/raw JSON/URL字段。帮助只GET `/api/app/devices/{id}/helping?type=text`，普通文本原样保留，不执行HTML或自动开URL。数组缺失/错形/重复native ID报错，实际空数组才是空结果；原始ID仅用于本次原生解码去重，不作为后续操作授权。

More四读取均fresh核同一账号修订/页面观察→HOME归属/DEVICE02身份→功能仓库，并在返回前复核账号及页面，Scope含native user/product。HTTP仓库只GET DEVICE02、MORE01 `/users`、MORE05 helping，统一AccountService expectedRevision；房间复用DeviceRoomRepository和ROOM02，没有复制ROOM HTTP。已知403与明确未绑定码为固定forbidden；旧账号/页面变化优先session_changed，transport为unavailable，其余格式错误read_failed，均不携带后台原始cause。未新增分享生成/消费、昵称/成员修改、解绑或第三方发送。

NativeDeviceReadGate每实例最多2个在途，取消/20秒本地超时等待实际worker结束才释放permit，不自动重放；close阻止新请求并取消等待，迟到结果不交付。公开factory只提供makeBound，要求显式传入同一模块共享gate、Owner与handle实例及pageCurrent闭包；内部共同检查owner.featureReadCurrent(handle)，生产定时/固件/More现共用该模块gate，不能每次RPC新建以绕过上限。四个More及定时/固件现调用bound factory和真实typed HTTP仓库；13项RN Spec方法名静态对齐，但没有Codegen实编。

ROOM02的null/缺data只投影unknown，合法string/number ID才assigned，roomName独立未知可空，localized非文本不stringify；空对象/错形固定失败，不造unassigned。Root明确同步修正既有move(nil)：PUT接受但GET nil/unknown不能再确认解除，保留RoomOperationError.resultUnknown、只PUT一次；非nil目标可由真实assigned ID匹配确认。旧离线定义把null当解绑成功的断言已改为unknown，并新增专门定义。全部房间/device路径段拒完整`.`/`..`和控制字符，保留`a..b`、斜杠/字面百分号等opaque ID编码；RoomID.string比较/hash按UTF8 wire bytes，仍区分string/number。

本批新增47项离线定义：5 Owner组合、14 More HTTP、20 More服务/DTO/factory、5 Room边界、3 handle撤权边界（含PUT接受但ROOM02缺data不能确认、精确opaque ID）。新源/测试均纳工程。Windows结构核对293 objects、74 app Sources、35 XCTest Sources共452方法，空白/静态无raw logging/方法名检查；未Swift编译、XCTest执行、Pods/Codegen、实际HTTP/关系写入/SDK/broker、iOS模拟器/视觉/硬件。More factory和Owner组合均未接AppServices/生产观察；完整S084–S090及S103的写操作、UI与运行验收不因这些GET源码标为完成。


跨页撤权P2同步：More fresh authorize的明确HOME403/DEVICE02 1342只在原生错误中携带ownershipRevoked=true；功能仓库单独403/权限不足仍是forbidden但标记false，不把局部功能拒绝当整设备撤权。旧账号/页面先被current guard终结session_changed，不能用迟到classifier触发副作用。Owner.revokeOwnership(handle)在MainActor同步核验handle实例、所属owner/resource表、当前账号及released状态；以resource revoked latch与generation封闭旧事件/显式retry，清全部同resource观察的reported/metadata为FORBIDDEN并停lease，其他device不动，resource保留至最后handle释放。旧释放/旧账号handle不能伤替换resource。

所有六个feature GET RPC均复用featureReadCurrent(handle)在入口、返回和classifier应用前检查：Closed、FORBIDDEN、AUTHORIZATION或revoked一律拒绝；MQTT离线/connection failure不等于HTTP权限丢失，仍允许fresh归属验证读取。More公开makeBound工厂已组合该共享守卫与pageCurrent，底层无handle工厂为private。新增回归定义覆盖A功能repo await、B fresh403标记并revoke同resource、A迟到success被session_changed拒绝；也覆盖普通MQTT failed仍可fresh HTTP读、旧handle与其他device隔离。现生产NativeDeviceBridgeReads已完成catch撤权接线：必须先完整current guard，再按marker调用handle API，返回守卫同样保留。上述8项额外定义（5 More/3 Owner）包含在当前总数534中，仍未Swift/XCTest执行。


## 生产只读观察与六个GET接线（源码；未执行iOS）

NativeDeviceObservations替代生产Unavailable registry：真实Owner handle按native page/module绑定，weak page闭包不延长控制器寿命，初始visibility来自viewDidAppear与UIApplication.active；离开页面先取消其feature promises，导航离栈或控制器释放关闭其native handles。后台不emit，恢复仅投递latest；每binding最多1个未ACK事件及1个latest，精确匹配inflight revision才推进，错误/旧ACK不释放permit。RPC getSnapshot用于缺序resync；delivery revision不充当native authority，terminal保留原生epoch/authority并清私有metadata。

RowanHostServices为每module持有一个NativeDeviceBridgeReads和一个NativeDeviceReadGate：六类GET合计最多2个actual I/O，8个观察共享名额。这是iOS本地资源策略，不改变桥接协议；不要求与Android每观察名额相同。ObjC++六个promise现转显式Swift completion selector，不同步阻塞UI或自行存账号。取消/后台/离栈/module invalidate/20秒本地deadline一次终结promise，取消actual worker但不自动重放、不因worker忽略取消提前释放名额，迟到结果不能再次resolve。模块close阻止新工作；实际worker完成后释放其槽。

全部GET从当前binding实际handle取得native resource/revision；makeBound共享page/account/featureReadCurrent守卫，入口和await返回及classifier均复核。普通MQTT offline/configuration failure不等于HTTP撤权，允许fresh HOME/DEVICE02再GET；Closed/FORBIDDEN/AUTHORIZATION一律拒绝。每次定时、固件、更多、成员、帮助、房间读取均fresh授权，仓库只GET并传AccountService expectedRevision；定时modelVersion未知不造版本，固件只mcu/wifi。没有生产mutation permit/OTA journal/控制映射，也没有写或重放。

明确未绑定码1332/1342/1352/1402/1452/1492/1502在fresh proof或功能仓库阶段均携内部ownershipRevoked=true；fresh授权403同样true，而generic功能403仅forbidden、不撤整个device。404/类似xx1/任意xx2不推断撤权。catch仅当exact binding/page/account/handle仍current且该promise未终结才同步revoke实际handle，清同resource所有观察缓存、隔离晚旧事件；其他device和新handle不受旧任务伤害。不向JS发送该内部marker、backend message或raw cause。

NativeDeviceBridgeTests新增17项离线定义，涵盖真实owner metadata/config-failed投影、8上限、initial hidden、max1+latest/exactACK、terminal epoch/authority、任意ID零dispatch、两个不合作IO取消后仍占槽、超时/close一次终结、离页/撤权后迟到DTO拒绝、旧binding迟到marker不伤新handle、generic403不撤权、同账号token/settings publication不取消在途读取，以及真实AccountService→NativeDeviceServices→registry→bound六GET typed仓库组合（7读取含mcu/wifi，unknown Host下零DEVICE01/零写）与schedule1492跨观察撤权。More另补2项分类正负/迟到账号定义并修旧码断言。所有fixture均内存公开值，不执行真实HTTP/broker/Keychain。

本批仅运行Windows结构/文本检查；尚未CocoaPods/Codegen、Swift/ObjC++ typecheck、XCTest、RN事件真实投递、iOS前后台/交互返回/弱页销毁或SDK wire Host验证。Default Host/expiry保持unknown，不把根Node签名成功当iOS传输证明；无Podfile.lock、未签名发布、未声称硬件/控制已完成。macOS需先安装候选依赖再执行前述xcodebuild test命令，并独立验证生命周期/并发/Host/TLS及错误路径。


## V3按原生页面实例关闭（源码修复，未执行iOS）

依据[原生页面关闭与桥接V3](../docs/SDD/原生页面关闭与桥接V3.md)，每个DeviceViewController独立生成随机pageSessionID，与deviceId一起作为`RowanDeviceModule`初始props的pageSessionId传入。该值不是设备ID/登录凭据，不进入HTTP、getContext、设备摘要或日志。不能在点击时改取最新module/context中的令牌，也不能凭同账号/同deviceID或module复用授权关闭后继页面。

ObjC++入口为`closeDevice:(NSString *)pageSessionId`，拒绝空/非字符串或已invalidate模块；无需beginModule/observe就可将本页原始token交给原生。Swift只读取当前native DeviceViewController，DevicePageCloseService在MainActor核对token精确字节匹配、账号修订/本地清理状态有效、页面仍在当前navigation top且visibleViewController为本页、本页和navigation均无presented controller，才pop；宿主入口另核bridgeVisible与UIApplication.active，避免paused/后台页面消费关闭意图。已移除旧modulePages最新映射，bootstrap失败或没有观察句柄也能安全返回；旧A迟到token不能关B，B返回后恢复A仍可使用A原始token。空token、失效账号、离栈/覆盖页面均拒绝。

DevicePageCloseTests新增6项实际UIKit UINavigationController服务测试定义（同module A→B迟到close、B合法close及恢复A、本页bootstrap无observe返回、空token/账号失效/缺页/离栈拒绝、被覆盖A不能pop当前B，以及真实UIWindow内pageSheet/fullScreen原生modal覆盖时拒绝A迟到关闭、dismiss后同token恢复），并将getContext断言更新为major3。均纳入正式RowanTests Sources，仍未Swift/ObjC++编译或XCTest运行；不以纯源码/Windows结构检查代替真实双Root RN runtime交互验收。历史V2报告/截图/构建结论不改写，也不支持V2内置包与V3宿主混用。本批未改六GET/Owner/ACK业务语义、Pod依赖或Host unknown策略。

V3 modal覆盖补核：旧`deviceController`提供者在sheet不触发viewWillDisappear时可能保留A，authorizedBridgeContext只核账号/栈成员，nav.top也仍为A，故原条件确有缺口。现服务同时核navigation.visibleViewController===page及page/navigation无presentedViewController，配合宿主真实visible/active条件拒绝被覆盖页；不把token一次消费锁当修复，dismiss后原token可再用。新增实际UIKit present/dismiss离线测试定义，仍未macOS运行或真实RN modal验收。


## 原生扫码软件批次（源码；未运行iOS）

Home Add原生sheet接“扫一扫/手动添加”，手动复用云端产品目录。AVFoundation仅video授权与QR metadata，session配置/start/stop/回调串行后台，MainActor只预览与UI；PHPicker单图images过滤，不请求全相册权限，不提供PhotoKit枚举/保存。照片只本地ImageIO/Vision QR识别，不上传、日志、URL打开或推断device/product/bindCode。缺生产解析合同，所有成功解码候选仍unsupported，不触发PAIR-06/BLE帧/绑定/配网或成功页。

页面/账号修订/generation隔离晚权限、metadata、picker和照片回调；系统picker临时覆盖保留其操作，真实后台/离栈/账号变化使旧操作失效。相机权限拒绝仍可相册。相册actual I/O全App共享单槽，取消/8秒本地超时不释放仍在provider/copy/Vision中的槽，取消精确ticket，旧页不会取消新页任务。provider回调有效期内按真实字节流最多12MiB复制到自有随机UUID.scan临时名；预检40MP后采样最长边2048，候选最多4个、decoded UTF8最多4096B，多码不任选；这些是本地资源预算，不是生产QR字段长度。处理finally删临时副本，崩溃残留仅清自身rowan-qr-owned-v1目录中24h前UUID.scan普通文件，不接触原图/相册。provider如异常在Main回调则拒绝copy，避免UI阻塞。

29项离线定义包括权限拒绝可选图、晚account/page/generation隔离、picker覆盖/后台区别、unsupported生产解释器、资源预算/overflow、脱敏描述、随机有界copy/损坏图片、不合作provider取消/超时仍占槽及旧ticket不取消新owner。另含controller层后台picker失效返回恢复交互与队列阻塞start取消/旧stop不伤新owner定义，均未Swift编译或XCTest运行。UI按本地扫一扫文本/240px参考框/16与14字体/白色圆角相册入口适配native预览和动态字体，未嵌入样机照片/假系统栏；原生actionSheet、绘制白框（非原corner/扫描线精确资产）、未限定ROI及线上蓝湖最新版尚有视觉差异，不能宣称逐像素还原。BLE发现/生产二维码解析与绑定/硬件仍阻塞，未提供假蓝牙扫描按钮或假成功。

只使用iOS15.1系统框架，无新Pod。尚待macOS验证SDK可用性、Swift6/AVFoundation跨队列边界、PHPicker文件生命周期/取消、Vision/EXIF与多码真实样本、真机相机/权限/后台/旋转/内存/临时清理；Windows结构与补丁核对不能替代这些。实际扫码硬件、生产编码、绑定及配网均未验收。

本批逐阶段应用、行尾差异处理、SDK/Swift只读自审及限制见[扫码软件批次记录](Verification/扫码软件批次-20261102.md)。506仅为测试方法定义数，未执行XCTest。


## S016邮箱验证码登录（源码；未运行）

复用AUTH01 GET /api/app/captcha account/accountType=email/captchaType=login及AUTH04 POST /api/app/session account/pin/verify=captcha/language=zh-CN/system=ios，直接由唯一AccountService接会话。无AUTH02预校验、新HTTP路径、第二登录态或推送ID猜值。密码路径仍verify=password。共用协议checkbox，不把协议服务故障当已读门禁；切模式清两种secret，6位ASCII码，App级purpose/email独立60s单调冷却（不确认的send也保留），不自动重放。

登录native入口增加expectedRevision，gate内清理前核对，密码wrapper也在等gate前捕获R。onReserved在同gate完成自身清理后/取消检查前只交付authority receipt，不给tokens/RN；model可跟随自己R并显式重试拒绝，不盲认B。晚回调由输入/page取消及saveLocked补偿隔离；本地native commit已经发布后不因后续UI取消自动logout，仅拒旧页导航。错误显示通用文案防枚举。注册入口同类修复：入口捕获expectedRevision，gate清理前/HTTP前核对，注册model显式传绑定R，仅跟随自身receipt，不改变V1.4注册body及协议版本提交阻塞。全局login在途lease独立于60s，actual发码HTTP未结束即便倒计时归零也不重发。新增26项XCTest定义，未编译/执行；UIKit模式入口和发送行复用现账号样式，未找到独立验证码登录Lanhu导出，精确位置/字体/状态视觉未验收。

S016两阶段应用与取消/补偿receipt边界见[独立记录](Verification/S016邮箱验证码登录-20261102.md)。正式534项仍为定义未执行；真实SMTP/验证码/登录及独立切换视觉均未验收。

S016返回页R3修正：旧请求忽略取消、返回时仍busy，rebindLoggedOut在nil/noPending前置后先恢复active，busy期间保留旧expectedR，不领取新账号authority。新增1个早回页/actual结束后显式retry定义；正式533仅定义未执行。

S016返回页R4：自身reservation/compensation receipt即使inactive也在exact native sameR/nil/noPending时记录expectedR，不激活/恢复secret/导航；解决receipt先在后台发出、随后busy早回页丢authority。新增同步contextChanged observer复现定义，正式534仅定义未执行。

## MORE-04昵称原生基础（源码；未接生产入口）

新增应用级昵称任务核心、复用AccountService expectedRevision的精确PATCH/读回仓库，以及独立Keychain串行原子UNKNOWN journal。缺少正式角色/空串/计数规则时policy默认nil，禁止写入；不自动重发未知PATCH，不以公共ACK、产品名fallback或Unicode规范等价假确认。只有明确deviceNickname的UTF8精确目标读回、durable terminal CAS完成后才能通知当前原生绑定刷新。

本批按批准patch先测试后实现，仅新增6源及PBX引用，未接DI、桥接、UI、production许可或canonical metadata同步。S016父续体guard另行落地后基线535定义，本批新增34定义；当前实际结构核对331 objects / 86 app Sources / 42 XCTest Sources / 569方法定义。没有Mac，未执行真实RED、Swift编译、XCTest或Keychain/真实改名；Android对应稿仍待独立实际TDD，不能宣称双端完整业务通过。阶段与hash证据见[独立记录](Verification/设备昵称基础-20261102.md)。

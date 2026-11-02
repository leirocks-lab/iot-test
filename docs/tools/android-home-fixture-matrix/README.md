# Home SDK instrumentation 串行 UI 矩阵（实测工具）

当前仅执行 Node syntax 与40项离线状态/恢复用例。未调用ADB、Gradle、网络、安装、真实Android或生产业务。正式App未改，SDK fixture实际结果仍以Root报告为准。

四固定配置按序：base1080×2400/420/1；small640×1280/320/1；large1440×2560/420/1；font1501080×2400/420/1.5。环境变化不是像素还原验收。每配置运行同一真实Home/公开fixture runner，不添加生产测试Intent或通信。S031未落地可选blocked使矩阵partial，不借其余通过关闭行。

## Root独占运行入口（尚未执行）

Root先准备同源双APK正式构建报告、安装配对包，并让模拟器5554当前稳定停在**真实未登录Welcome**（有真实登录态/未知页面时脚本拒绝，不自动退出/清session）。先前手动base不作为本矩阵的配置证据。测试前停止其他工具/编译/界面操作。

```powershell
node docs/tools/android-home-fixture-matrix/run.mjs --host-sha=<64hex> --test-sha=<64hex> --host-provenance=docs/测试报告/重构实施-20261101/<host-provenance>.json --test-provenance=docs/测试报告/重构实施-20261101/<test-provenance>.json --collector-sha=<current-collector-64hex>
```

五参数全部必需，重复/未知参数拒绝。ADB绝对路径固定D:/Android/Sdk/platform-tools/adb.exe、5554、ROWAN_API36/ROWAN_API_36、API36 fixture包和runner固定，不允许任意shell/runner/场景/输入。双正式报告必须在docs/测试报告下、host/test准确task/role、x86_64/isolatedValidation、同sourceBefore/After且unchanged、test指向同host；当前android-as+app-rn两目录sourceFingerprint与双已安装base.apk SHA每配置前重核，collector SHA也固定。脚本不负责等待安装或生成新构建。

首配置前仅验证现有Welcome两次真实层级与focus（不启动正常宿主，不触发真实账号冷恢复）；不保存XML/账号文字，snapshot helper本身使用受限临时路径并清理。配置后只从本矩阵所有权确认的launcher进入测试runner，后续不打开正常宿主。未知窗口/其他app/ANR拒绝且不自动dismiss。不会清数据、碰securestorage、改权限、登录/退出真实账号、发码、绑定或删除设备。fixture自己的内存账号由runner清理，App安全存储不参与。允许force-stop仅固定目标包，首配置已确认未登录Welcome，后续仅本矩阵owned fixture进程。

am instrument只带emitPublicArtifacts=true；stdout流写.cache/refactor/android-home-fixture-matrix-runs/<UUID>/<config>.instrument.log，64MiB上限、180秒有界、stderr不存不打印。受限脚本异常只输出固定码，不把base64刷会话。每份日志调用正式docs/tools/android-home-fixtures/collect_results.mjs CLI，核双SHA及完整图/几何/导航门。collector非零1=failed/2=partial不会被当通过；失败日志保留。只有owned进程确认已停止、前台为已知launcher且无未知dialog才续跑；超时会停止owned目标包，无法证实进程结束则blocked，不关闭系统弹窗。

## 精确恢复

修改前严格解析wm physical/override size、density与font_scale原始值；无法解析拒绝修改。finally逐项尝试恢复原override，只有原本无override才wm reset；字体原null用settings delete，否则写原值。各项即使前一失败仍继续，然后完整readback严格JSON比对；失败或未知为blocked，不假称恢复。字体字符串1.0不规范化为1。SIGINT/SIGTERM进入受限清理；强杀/主机掉电无法保证finally，须Root对照matrix报告原值人工复核。脚本不自动dismiss ANR或重启系统来掩盖问题。

matrix.json保存原/各配置/恢复状态、固定错误码、源码/双APK/脚本/collector及正式报告哈希、子日志和collector报告索引。整个矩阵passed仅四配置collector全部passed+进程退休+环境精确恢复+源未变；有失败为failed，可选blocked为partial，环境/守卫失败为blocked。退出0只passed，2只partial，其余1。报告仅控制fixture UI，不替代真实HTTP/MQTT/硬件/iOS/生产协议/完整像素验收。

## 已运行的离线验证

node --check run.mjs/state.mjs 与 node offline.mjs，共40项：override/null字体解析、未知原状态零修改、精确恢复vs无override reset、部分写失败继续恢复、读回不符、四配置串行、预态/前置失败、配置中途取消、collector错误仍保失败、可选blocked不变pass、未知dialog禁止续跑、进程退休失败与恢复失败等。所有IO为内存替身；不是Android环境恢复/真实UI证据。

R2：指纹目录严格匹配host build的android-as/app-rn两目录；collector仅正式docs路径并锁SHA。前台用正式公开工具已采用的dumpsys activity activities解析唯一topResumedActivity/mResumedActivity，结合真实active-window XML根package及aerr检查，前后activity再核；不依赖API36可能缺失的window mCurrentFocus。Launcher也有真实XML守卫，不靠resumed活动单独推无dialog。

R2补充：Welcome必须root为本包、唯一可见且enabled/clickable的login+register、真实非空且viewport内bounds，无home/account/startup/aerr节点；隐藏/禁用/重复/只有login/错误root均拒绝。正式verify_email_login_public末尾存在无条件CLI args分支，直接import会设置exitCode，因此本稿采用等价纯函数而未引入其CLI副作用。新增真实参数注入用例证明fingerprint函数收到且只收到android-as/app-rn两个目录，正式collector路径有明确回归断言。

# 扫码拒绝相机态最小布局矩阵

准备工具，等待Root停止Gradle、独占ADB并冻结扫码新APK源码后实际执行。本文交付时**没有运行ADB、改变模拟器、截图、读取图库或调用业务服务**；仅Node语法和纯函数离线检查通过。

```powershell
node docs/tools/verify_scan_denied_layout.mjs --parent-run=<新扫码APK且keep-session的主回归runId> --dns-upstream=<显式IPv4>
```

`--dns-upstream`可省略；如该AVD已依赖loopback DNS测试环境则显式提供，工具只启动自己的真实转发并finally关闭，不改系统DNS/代理/radio/TLS。拒绝其他参数，不登录、不安装/构建、不运行Metro、不读取env/账号凭据。不能用无扫码的旧APK或已logout父记录凑前置。

## 前置与两个配置

父报告必须sessionKept=true、AUTH-04通过、固定`com.rowan.iot.dev.refactor`、同emulator和已启动ROWAN_API36/ROWAN_API_36；实际安装APK SHA、parent/source/buildProvenance与当前Android+RN源码均匹配。Windows ADB的CRCRLF按行trim处理。先完整读取并严格解析原wm size/density physical/override、font_scale（含未设置）、CAMERA granted/已识别flags/AppOp；出现未知输出或不可恢复flags时，修改前阻塞且保留父会话。权限AppOp复用[共享解析/比较模块](android-ui/camera-appops.mjs)，分别记录package `appOp`、`uidAppOp`及`packageEntryPresent`；实际`Uid mode: CAMERA: ignore`且无普通CAMERA行解释为package default/不存在记录、UID ignore，不混成package ignore，报告同时记录共享模块SHA。

| 配置 | 操作 |
| --- | --- |
| small | wm640×1280，density320，font_scale1.0 |
| font150 | size/density恢复为原有override；原无override时reset；font_scale1.5 |

每配置设置后实际读回有效size/density/font核对，不依赖命令退出码推断配置已生效。不是另加四套重复用例。每配置从Welcome正常冷恢复到Home，滚动找到真实Home添加按钮→Add的扫一扫，真实点击系统CAMERA拒绝按钮，达到原生固定“相机暂不可用，可使用相册或返回。”。不点击相册、允许相机、设置或任意图库；本矩阵不创建MediaStore行/测试媒体，也不识别二维码。固定错误态只验证布局，实际PhotoPicker/解码另用`verify_scan_software.mjs`，原工具不受本工具修改。

## 检查与截图

检查`scan_back/title/status/album/permission`的已启用、屏内bounds、非重叠与滚动可达；动作控件还要求至少接近当前源码48dp的可见触达区域，避免把一条被裁切的边当可达。点击导航前要求两次稳定bounds。小屏/大字可滚动，不强行要求所有内容同时出现在首屏。settings只按条件观察，不点击、不把未显示的条件入口当功能缺失。

几何只保存固定resource ID、数字bounds、滚动次数和可达布尔值。系统/账号/Home层级及dumpsys正文仅在内存，helper负责其远端临时XML清理；无原始XML、照片、设备名或CLI输出归档。每次滚动检查顶层package、实际resumed ScanActivity身份、CAMERA仍为denied；状态文案在可见时必须匹配固定值。

每配置最多一张错误页PNG：先滚动让固定status可见，捕获前后都再次检查**实际原生ScanActivity、验证包、无Home/账号入口、CAMERA拒绝及固定可见文案**。PNG只在内存，后置守卫失败则丢弃、不写盘；签名和像素尺寸也要匹配配置。不会保存相册/系统picker或真实相机帧。截图为该矩阵的固定输出，不另开截图开关。

文字裁切、换行、间距、遮罩、角框/扫描线、真实触摸和线上蓝湖版本仍须人工视觉检查。几何“通过”不等于视觉、S037/S038全流程或业务范围行通过，当前网页/蓝湖规格版本仍待核对。

## finally与失败

变更标志在第一次命令前置位，部分失败也进入finally。先force-stop验证包，再分别尝试恢复原size/density override与font（原未设置则delete，不盲写1.0），逐项读回精确比较；恢复原CAMERA grant、USER_SET/USER_FIXED和原package AppOp，grant/完整已识别flags及UID模式严格相等。package模式使用共享`cameraAppOpsEquivalent`：依据Root已核对的Android16 CAMERA默认MODE_ALLOWED，仅“无包记录的default”与allow同效；显式`CAMERA: default`不映射allow。官方依据与实际观察见[扫码软件工具说明](verify_scan_software.md)。

工具从不主动写UID AppOp，也不执行全包appops reset；grant/revoke若未使UID模式回到原值（含原无UID覆盖），恢复记录阻塞。package entry可能从不存在变为显式allow，报告的`packageEntryPresenceMatches`单列该差异，`historyRestored=false`明确未恢复原始记录/历史。有效模式恢复不等于记录存在性或时间戳回滚。恢复失败记录阻塞，后续清理仍继续。

然后正常冷恢复，最多点击一次Home logout，确认Welcome；已退出则不再发logout。禁止pm clear、删除会话/偏好、反复DELETE或点击“重试本地清理”。最后关闭自身DNS relay，记录源指纹前后是否一致。源/环境/权限/会话/relay任一项未确认或几何失败都非零退出。SIGINT/SIGTERM在有界命令结束后走finally，force-kill不能保证清理；不宣称不可合作系统调用能硬取消。

输出`docs/测试报告/重构实施-20261101/android-scan-denied-layout-<run>.json`及两配置的安全PNG。最后只恢复基准环境，不另制造一次baseline“通过”用例或额外业务读取。

## 本次工具检查

```powershell
node --check docs/tools/verify_scan_denied_layout.mjs
node docs/tools/verify_scan_denied_layout.offline.mjs
```

均通过。offline脚本只从源码提取纯解析/恢复/身份函数，使用固定字符串与内存命令记录；不执行主工具、不连接ADB。覆盖CRCRLF、override/无override/未知及重复输出、原生Scan与Home/Picker身份区别、原无font删除/原font原样恢复，以及单项恢复失败仍尝试其余项。三个AppOps解析fixture均包含packageEntryPresent；实际UID-only ignore与CAMERA=false/两项USER_SENSITIVE flags向量覆盖缺包记录default→allow同效、记录差异单列、显式default不映射、UID变化/丢失或grant/flags不同均阻塞，并断言只写package模式、没有UID写或全包reset。此修订不代表原software工具的前置阻断或本矩阵已经实际重跑通过，也不改写其历史报告。

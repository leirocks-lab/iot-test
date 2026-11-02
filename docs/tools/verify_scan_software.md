# Android 扫码软件公开 fixture 验收工具

`verify_scan_software.mjs` 由 Root 停止 Gradle、独占 ADB 后运行。本工具交付阶段仅进行 Node 语法与静态安全检查，没有运行 ADB、修改模拟器权限、接触真实服务或取得 Android 扫码验收结果。

```powershell
node docs/tools/verify_scan_software.mjs --parent-run=<含扫码新APK的主回归runId> --fixture-run=2026-11-01T15-07-52.650Z --dns-upstream=<显式IPv4>
```

`--dns-upstream` 可省略；仅在该 AVD 显式使用现有 loopback DNS 测试环境时传入，复用真实 UDP 转发并在 finally 关闭，不修改任何 DNS、radio、显示、主机网络、代理或 TLS 设置。无需 env、密码或其他账户输入。拒绝未知参数，不下载依赖、不安装 APK、不执行 Gradle/Metro。

## 父证据与真实路径

只接受主 harness `--keep-session` 的 AUTH-04 通过父报告，固定验证包 `com.rowan.iot.dev.refactor`、emulator serial、ROWAN_API36/ROWAN_API_36 AVD、已完成启动。安装 APK SHA、父报告 sourceSha256、buildProvenance 的 artifact/sourceAfter/sourceUnchangedDuringBuild 必须与当前实际安装和 Android/RN 源码一致。使用新扫码 APK 的新 parent；不能用旧无扫码 APK 的成功记录代替。本工具结束再次记录 sourceFingerprint。

从 Welcome 冷恢复至同一已记录测试账号的 Home，打开 Home 添加菜单→扫一扫。准备系统权限弹窗仅改变本验证包 CAMERA 权限和 AppOp，不改其他包或系统权限全局。工具真实点击系统 `permission_deny_button`，确认原生“相机暂不可用”及相册入口仍可操作，然后依次通过真实 PhotoPicker 选择公开单码、白图和多码图，确认原生固定 unsupported/no-code/multiple-codes 文案，最后通过产品返回按钮回 Home。未注入 decoder，没有生产二维码解析、绑定、上传或设备控制调用。

真实登录会话只来自 parent，工具不重新登录。冷恢复、Home 读取、正常 logout 会经过现有真实原生服务；这不是“零网络”工具，但不发验证码、注册、关系修改、desired、控制、定时或 OTA 写入。

## 图片来源与选择边界

复用现有 `zxing-jvm` 成功公开 fixture 报告，要求 `passed=true`、ZXing 3.5.4、productionParser absent；只允许 normal.png、blank.png、multiple.png，文件 SHA256 必须等于本工具固定的公开 golden hashes 并与报告一致。没有任意路径/内容输入接口，不生成设备身份或二维码业务映射。

每张图片放在本次随机 nonce 独有目录 `DCIM/Camera/rowan-scan-<nonce>-<kind>/fixture.png`。预先要求当前云媒体提供方为空、Camera分类没有图片；否则阻塞，不触碰已有媒体。创建前必须不存在nonce目录，push后核验SHA，登记精确行并调用系统媒体扫描，读回字节数、非空宽高、非pending/非trashed。固定系统分类的依据见[Android16 ExternalDbFacade](https://android.googlesource.com/platform/packages/providers/MediaProvider/+/refs/heads/android16-release/src/com/android/providers/media/photopicker/data/ExternalDbFacade.java)：本地相册只包含预定义分类，任意nonce目录不会成为单独相册。`content`输出、行URI、图库XML、照片描述和二维码原文始终仅在内存，不输出/归档。

测试登记/查询/清理统一使用Android主共享卷`content://media/external_primary/images/media`，避免聚合卷别名和返回URI卷不一致；不接受任意卷输入。主共享卷语义依据[Android官方媒体存储文档](https://developer.android.com/training/data-storage/shared/media)。

必须由Scan页按钮启动系统PhotoPicker，点击固定Albums/相册tab，再精确匹配系统Camera/相机分类。打开后要求Camera标题和唯一可点击媒体缩略图；点击前再次确认无云提供方、整个Camera分类恰好一行且路径/hash属于本次nonce，同时本次bucket也只有该文件。每张图完成后立即清理，下一张要求分类重新为空。没有点全图库首图、固定媒体坐标、直接业务Intent、URI注入或绕过PhotoPicker的fallback。未知布局或分类不独占均阻塞。该受控AVD策略不适用于已有Camera照片或云提供方的设备。

每次点击都等待两次相同且处于屏内的 bounds。系统层级仅由安全 helper 临时读取，不存到报告或本地 XML；helper 自身负责移除远端临时脱敏 XML。可附加 `--screenshots`，仅在验证包扫码页、已拒绝相机且固定结果文案匹配时保存产品页PNG；不截图系统选择器、图库或账号。未设置该参数时不截图。不更改 wm/font/display，故显示恢复为“不变”。

## 权限与媒体 finally

变更前读取验证包 CAMERA granted、完整已识别 flags 和 Camera AppOp mode。只支持可精确恢复的 USER_SET/USER_FIXED 及两项 USER_SENSITIVE 标志；one-time/策略/其它未知 flags、未知 AppOp 形态在修改前阻塞。不修改敏感属性，只恢复用户可变两项 flags、原 grant 和原 AppOp；恢复后逐项对照，失败明确标阻塞。权限历史时间戳不会回退，也不声称全系统 permission controller 状态回滚。

包级CAMERA模式与`Uid mode`分别记录；绝不将UID模式写成包模式，也不执行UID写入或全包AppOp reset。Android16的CAMERA默认模式是allow，无包记录的default与重置后显式allow只在有效模式比较时等价，UID限制、grant及flags仍须一致，原始entry存在差异另记、不回退历史。依据[Android16 AppOpsManager](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/android16-release/core/java/android/app/AppOpsManager.java)。API36的`content insert/delete`可无文本回包，成功以本次精确行实际存在/删除后缺失核验，不依赖英文CLI文案。

finally先关闭本工具仍打开的系统PhotoPicker，再force-stop验证包并恢复权限，精确清理已登记行和nonce文件/目录；仅本工具创建的空DCIM/Camera父目录以rmdir清理。最后正常冷恢复/最多一次Home logout并确认Welcome，关闭DNS relay。不会pm clear、重复logout DELETE、递归删除、删除用户图片或夺取其他helper。insert回包丢失只按本次精确路径找回唯一行；无法确认所有权即保留并报阻塞。报告含本次生成相对路径及固定系统控件类别诊断，不含真实用户媒体路径、原始图库层级或MediaStore URI。

SIGINT/SIGTERM 在当前有界命令结束后进入 finally；force-kill 不能保证 JS 清理。权限恢复、媒体清理、正常 logout、source 一致性任何一项失败均退出非零。不可合作系统/ContentProvider 操作可能晚于本地等待，超时记录阻塞，不冒称硬取消完成。

## 输出与验收限制

报告保存到 `docs/测试报告/重构实施-20261101/android-scan-software-<run>.json`，仅固定阶段/错误码、parent/script/APK/source hashes、公开 fixture hash、权限安全枚举、已生成路径、清理及正常 logout 结果；不归档原始异常、CLI 输出、系统图库、账号、图片/原码或层级正文。

实时相机帧解码固定记为“未验收”：本批没有受控虚拟相机输入，不能用 PreviewView 存在、权限状态或相册 ZXing 成功冒充 CameraX 实时解码。工具退出成功仅表示必选软件路径及清理全部通过；不代表生产码解释/PAIR-06、真实相机、硬件、iOS、完整视觉或全业务验收通过。

# ZXing 3.5.4 独立JVM技术POC

仅验证Java17上ZXing core的公开静态图片解码和本地拒绝边界，不是Android生产扫码实现。`javase`仅供本工具生成PNG、读取BufferedImage；**不得加入Android生产依赖**。选型背景见[扫码软件批次核对](../../SDD/原生扫码软件批次与SDK选型核对.md)。

## 运行

在仓库根执行，首次显式下载：

```powershell
node docs/tools/zxing-jvm/probe.mjs --download
```

复用已下载缓存（不联网）：

```powershell
node docs/tools/zxing-jvm/probe.mjs
```

默认Java路径`D:/Android/Java/jdk-17.0.20.1+1`；其他机器可加`--jdk=<Java17根目录>`。拒绝非17运行时及未知参数，不接任意二维码文件或文本CLI输入。Java单进程堆上限96MiB、运行超时60秒；不是整个JVM进程RSS上限。不调用Gradle、ADB、Android应用或业务服务。

仅从官方Maven Central精确路径下载`com.google.zxing:core:3.5.4`和`com.google.zxing:javase:3.5.4`及同路径`.sha1`，不跟随重定向。每次含离线运行都检查sidecar；SHA1在此用于传输/缓存一致性核对，不作为签名信任证明，另记录SHA256供复核。来源：[core 3.5.4](https://repo.maven.apache.org/maven2/com/google/zxing/core/3.5.4/core-3.5.4.jar)、[javase 3.5.4](https://repo.maven.apache.org/maven2/com/google/zxing/javase/3.5.4/javase-3.5.4.jar)、[官方发布](https://github.com/zxing/zxing/releases/tag/zxing-3.5.4)。`--download`有网络行为；普通运行只读缓存依赖。

输出为`.cache/refactor/zxing-jvm/run-<UTC>/summary.json`、`poc.json`和本次公开fixtures；依赖缓存位于同目录`deps/`。报告包含JDK版本、jar来源/大小/SHA256/SHA1、脚本/Java源前后SHA256、全部图片/字节输入SHA256和逐项结果，不保存任意用户图片、路径或二维码原文。

## 公开输入与边界

工具内仅有以下公开内容，无账号、设备身份、凭据、URL或正式ROWAN编码：`ROWAN LOCAL QR SOFTWARE FIXTURE A`、`ROWAN LOCAL QR SOFTWARE FIXTURE B`、`{"sample":"public"}`、1025个`Q`。另生成纯白、部分擦除、截断PNG、宽图和全零超限字节文件。图片哈希记录于报告；固定公开文本的SHA256和UTF-8长度也记录于相应fixture。多码图由公开A/B拼接，默认日志不输出解码原文；`Decoded.toString()`脱敏。

本POC预算为输入1MiB、单边2048、最多4Mi像素、文本512 UTF-8字节。先读ImageIO尺寸再完整解码；输入过大/图像损坏/无二维码/多码分别返回固定状态。这里的数值仅是POC资源保护，**不是生产二维码字段长度协议，也不是已确定的Android图片策略**。大于文本预算的有效二维码先证明能解码，再由解释边界拒绝；多码不静默选第一个。所有合预算二维码均停在`unsupported_code`，没有生产parser、URL handler、产品查询、绑定或蓝牙客户端。

## 本次结果

有效记录：[2026-11-01T15-07-52.650Z摘要](../../../.cache/refactor/zxing-jvm/run-2026-11-01T15-07-52.650Z/summary.json)，exit0，**16/16通过**，Java Microsoft OpenJDK17.0.20.1+1。此轮不带`--download`，证明使用精确已校验缓存可离线复跑；此前显式官方下载及15项初跑成功。自查发现早期“破损图”擦除后与空图相同，已保留该初跑报告但不作为破损边界证据；当前fixture改为仅擦除下部、保留上部二维码像素，新增非空断言后重新执行通过。

| SHA256对象 | 值 |
| --- | --- |
| core-3.5.4.jar（610364B） | `71de5d89341b5fcf5dd89da7f44e84d825d0e084cdf3ec77c9abe26b0f0ceb13` |
| javase-3.5.4.jar（38108B，仅工具） | `1966831f473d72ff7720578419ab113f6417a97234a1710d2bccc650f5ae0c12` |
| probe.mjs（运行前后相同） | `84e6b6b00bb5bc90336c897e04c18330e9e51d1adccf7ada26571020fcb2e58f` |
| QrDecoderPoc.java（运行前后相同） | `a3d1ec9ef58fd6865571f24cda3466eeecff88211510aa162653213b3d794b9d` |
| normal.png | `08af3ffd005d0100f258abf04b96f9bb916b08062910266e104fc3a11738b593` |
| 公开A文本（33 UTF-8字节） | `a7a383ee5de6137dc88df301fa2036305da316b5ebb26de26086973d9185ab2f` |
| 当前damaged.png | `a104e4e4926067a189a8f4c50052fd3991be40e4ed9bab055b6587cab0dcb355` |

16项包括正常、90°旋转、空白、破损fixture非空及不可识别、截断PNG、多码、长文本能解码及预算拒绝、图像尺寸与字节预算、生产解释器缺失、空文本拒绝、多个候选不自动选择、未知JSON拒绝、toString脱敏。断言失败退出非零，不能把失败转成通过的unsupported结果。

此结果不证明Android的CameraX预览、YUV stride/旋转/释放、PhotoPicker URI处理、API24/36兼容、相机权限、APK依赖树/16KB对齐、iOS系统框架、弱光/运动/真实相机、多种生产二维码、PAIR-06或一次性绑定已通过。下一步仍需选定Android依赖并在Root窗口独立构建、模拟器/真机验证；生产码解释器保持缺失，不从fixture生成生产profile。

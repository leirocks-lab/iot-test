# 原生扫码软件批次与SDK选型核对

日期：2026-11-01。只读研究及实施建议，尚未向App新增依赖、编译、安装或运行扫码；后续独立JVM POC与AAR/POM只读核对分别记载，不混作App验收。本文不表示SDK已锁定、Android36已适配通过、生产码协议已确认或扫码绑定已验收。二维码与BLE生产协议的既有差异继续以[协议缺口核对](配网与扫码协议缺口核对.md)为准，不重复发起协议问题，不使用旧App自定义编码补缺。

## 范围与当前入口

2026-11-02实施推进：Android已加入CameraX 1.6.2及ZXing core 3.5.4，正式消费者编译与436项单元测试通过；iOS同步系统框架实现及29项新增测试定义。平台封装/视觉正在修订，扫码新包尚未安装验收；依赖锁和后续实际结果见[扫码软件验证](../测试报告/重构实施-20261101/原生扫码软件验证.md)。上段保留初始研究时点，不能将现在的编译结果扩展为相机、生产码或绑定通过。

唯一范围是[范围工作簿](../prd/智能家居物联网项目计划&需求范围.xlsx)，本次对照[逐项映射](重构范围逐项映射.md)中的原始行及单元格。表头与实际列错位的说明沿用原记录；不修改工作簿。

| 范围/工作簿行 | 原要求及本批可交付部分 | 仍不能据此完成的部分 |
| --- | --- | --- |
| S036 / 37 | 首页Add进入扫码、蓝牙发现、手动选择、推荐产品；原生添加入口与返回导航 | 不能把蓝牙按钮做成假扫描/假成功；BLE发现及配网另批，目录沿用已有原生能力 |
| S037 / 38 | 请求相机权限，取景、识别及本地初检；可先交付真实相机和拒绝状态 | 识别到二维码不等于已识别ROWAN设备身份 |
| S038 / 39 | 用户选择照片，本地识别，无法识别或权限/资源不可读有明确提示 | 系统选图不需要全相册读取授权；不能为复刻旧权限弹窗额外请求广泛权限 |
| S039 / 40 | 解析deviceId/productId/bindCode后补资料/绑定 | 生产编码未冻结；当前只交付解码器与拒绝未知码的边界，不生成这三种业务标识 |
| S040 / 41 | 区分格式错误、过期、不存在、无权限，不能进入成功页 | 本地只能证明未识别/不支持；没有协议和真实业务响应不能声称过期、设备不存在或已无权限 |
| S041 / 42 | 有效bindCode单次绑定及昵称后续 | 真实码解析、PAIR-06消费、身份/角色核验、未知结果核对与成功导航仍阻塞；不发码、不消费任何真实码 |

HTTP/App参考[V1.4](../prd/ROWAN公共App产品功能及API详细设计说明书_V1.4.docx)：5.2.2 ¶399–402明确取景、相册和格式校验是本地能力；¶427–435规定单次绑定和昵称；PAIR-06 ¶1949–2003为`PUT /api/app/device/{deviceId}/user`，分享绑定body必须有bindCode；¶5071明确二维码格式、过期策略和角色未冻结。段号按`word/document.xml`全部`w:p`一基计数，含表格。本批不涉及MQTT，不采用V1.6非MQTT内容。

目前[HomeActivity](../../android-as/app/src/main/kotlin/com/rowan/iot/features/home/HomeActivity.kt:50)的“添加设备”直接进入产品目录，尚非完整Add菜单。建议增加原生Add呈现层，将“扫一扫”与已有添加/目录入口接通；扫描页不要承载HTTP或蓝牙协议。蓝牙入口只导航到实际已实现页面，未实现时明确未可用，不能以占位页验收S046–S048。

视觉参考：[首页-添加](../ui/首页-添加.png)、[扫码进行中](../ui/扫一扫-进行中.png)、[扫码初始](../ui/扫一扫.png)、[无效提示](../ui/扫一扫-无效提示.png)、[设备识别](../ui/扫一扫-设备.png)。已观察本地Add为首页遮罩上的小菜单，扫码为返回/标题、中央取景框与扫描线、说明和底部“使用相册”。背景样机、品牌及照片只是设计参考，不能当运行设备。系统权限/选图弹窗遵循平台UI，不能伪造。线上蓝湖版本与精确图层标注仍待核对。

## Android候选与建议

本地宿主基线是minSdk24、compileSdk36、targetSdk36（[构建设置](../../android-as/build.gradle:4)），Views/ComponentActivity；`androidx.activity:activity:1.7.0`已存在（[依赖](../../android-as/app/build.gradle:69)）。初稿未下载制品；后续独立下载核对见下节，实际Gradle依赖树与Manifest合并仍未执行。

| 路线 | 精确候选依赖、官方下限 | 资源与取舍 |
| --- | --- | --- |
| A：CameraX + bundled ML Kit | `androidx.camera:camera-core/camera-camera2/camera-lifecycle/camera-view:1.6.2`；`com.google.mlkit:barcode-scanning:17.3.0`。ML Kit要求API23+；CameraX发布记录已将默认minSdk提高到23，宿主24满足数值下限 | Google Maven构建时下载；bundled模型随App分发，官方估计增加约2.4MB，首次识别不需等待模型下载。不要换成`play-services-mlkit-barcode-scanning:18.3.1`，后者依赖动态模型可用性；不要用Google code scanner替代定制取景页 |
| B：CameraX + ZXing core（本次推荐进入技术验证） | 同组CameraX `1.6.2`；`com.google.zxing:core:3.5.4`。ZXing官方说明3.4+要求Java8/Android API24+，与本工程min24相符 | ZXing core为Java JAR，POM仅列test依赖，不引入ZXing旧相机Activity、IntentIntegrator或javase模块，不下载识别模型。相机/相册都通过同一个native二维码解码适配器；旋转、YUV row/pixel stride、多码与图像缩放需自行正确处理 |

CameraX官方当前稳定表为1.6.2，正文该版本发布日期为2026-08-26；页面最近更新时间为2026-10-21，两者不是同一概念。不要照页面示例意外选入1.7.0-rc01。本表版本是研究候选；最终采用A或B均须先验证本工程的实际传递依赖、JDK/AGP/Kotlin兼容和APK运行，再写入正式依赖。来源：[CameraX发布记录](https://developer.android.com/jetpack/androidx/releases/camera?hl=en)。

ML Kit的打包/动态模型区别、版本、API下限和尺寸估计来自[Android条码文档](https://developers.google.com/ml-kit/vision/barcode-scanning/android)；17.3.0及16KB页支持更新可交叉核对[ML Kit发布记录](https://developers.google.com/ml-kit/release-notes#august_7_2024)。ZXing依据为[官方3.5.4发布](https://github.com/zxing/zxing/releases/tag/zxing-3.5.4)、[官方Android/Java要求](https://github.com/zxing/zxing/wiki/getting-started-developing)、[该tag的core POM](https://raw.githubusercontent.com/zxing/zxing/zxing-3.5.4/core/pom.xml)。推荐B是本项目减少模型/SDK引入的工程判断，不是官方对识别性能的背书；图像质量、速度需相同样本实际比较。

Android36兼容不能从minSdk或版本号推断。后续技术验证要实际检查完整传递依赖冲突、Release打包及API36相机/选图/后台返回；若走ML Kit还须检查新增native库及ABI/16KB对齐。即使走纯Java ZXing，RN宿主整体仍有native库，不能宣称整个APK天然16KB兼容。检查依据见[Android16KB页文档](https://developer.android.com/guide/practices/page-sizes)。构建资源需Google Maven及Maven Central可访问或具备已核验缓存；当前仅实际取得下列四组CameraX AAR/POM及独立JVM POC所用ZXing制品，其他传递制品/ML Kit的可下载性未验证，禁止把下载失败改成假识别结果。

## CameraX 1.6.2精确制品核对（追加）

2026-11-01直接下载官方Google Maven四组AAR/POM，均HTTP200，总AAR约2.57MB；未运行Gradle、ADB或任何App。来源与SHA完整记录在[downloads.json](../../.cache/refactor/camerax-artifacts/1.6.2/downloads.json)，提取结果见[metadata.json](../../.cache/refactor/camerax-artifacts/1.6.2/metadata.json)。下载只读官方公开制品，不涉及业务服务。AAR内读取`META-INF/com/android/build/gradle/aar-metadata.properties`、明文`AndroidManifest.xml`、`classes.jar`全部class major及`.kotlin_module`头；没有用网页“最新”文案替代制品事实。

| 模块（均1.6.2）及官方AAR/POM | AAR SHA256 | POM SHA256 |
| --- | --- | --- |
| [camera-core AAR](https://dl.google.com/dl/android/maven2/androidx/camera/camera-core/1.6.2/camera-core-1.6.2.aar) / [POM](https://dl.google.com/dl/android/maven2/androidx/camera/camera-core/1.6.2/camera-core-1.6.2.pom) | `ebd66f090414f4c12f23a55b5023aeee1b096da8a06c02a0b6fb3520c4ddadf6` | `cddb5bb0653654d8b7c2833484f4684d881dc7509411132e73a5fb4b167fd13c` |
| [camera-camera2 AAR](https://dl.google.com/dl/android/maven2/androidx/camera/camera-camera2/1.6.2/camera-camera2-1.6.2.aar) / [POM](https://dl.google.com/dl/android/maven2/androidx/camera/camera-camera2/1.6.2/camera-camera2-1.6.2.pom) | `5a55014ed96feda81a37799faf9f96150025a4434699d55caa1cdebf2ae07e20` | `23020a27494b69f7b77c3c1598923789bfada5c145d31d0893fae1ee895213df` |
| [camera-lifecycle AAR](https://dl.google.com/dl/android/maven2/androidx/camera/camera-lifecycle/1.6.2/camera-lifecycle-1.6.2.aar) / [POM](https://dl.google.com/dl/android/maven2/androidx/camera/camera-lifecycle/1.6.2/camera-lifecycle-1.6.2.pom) | `b7b701a3c6838bc7c4acd1372140e889fdf9681bf833ebfc638fdbe28ed5fa32` | `7562a6960db6bd8f46441c3467a2b51d33b98ece1c118ac30538dd6c54b49ce0` |
| [camera-view AAR](https://dl.google.com/dl/android/maven2/androidx/camera/camera-view/1.6.2/camera-view-1.6.2.aar) / [POM](https://dl.google.com/dl/android/maven2/androidx/camera/camera-view/1.6.2/camera-view-1.6.2.pom) | `2f258b88422b925717d2d1d1714d5572e48e2194336be227b35fc60000f6e166` | `c342ccc94ecaf4dbc9d9ef4b7d292eaeb2db266ee91e59229f232e13b180419d` |

四AAR结果相同：`minCompileSdk=36`、`minCompileSdkExtension=0`、`minAndroidGradlePluginVersion=8.9.1`、`coreLibraryDesugaringEnabled=false`；Manifest `minSdkVersion=23`；class major全部52（Java8字节码），`.kotlin_module`版本全部`[2,1,0]`。JDK17的只读`javap -v`另核对`ProcessCameraProvider`的`kotlin.Metadata mv=[2,1,0]`，证据为[metadata摘录](../../.cache/refactor/camerax-artifacts/1.6.2/ProcessCameraProvider-metadata.txt)。metadata版本不是编译器完整补丁版本，不能将其改写成“编译器2.1.0”。四POM均显式声明`kotlin-stdlib:2.1.20`。

本地root脚本声明Kotlin2.1.20；RN Gradle plugin的[版本目录](../../app-rn/node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml:2)提供AGP8.12.0、Kotlin2.1.20，当前工具JDK17。比较结论仅为：36满足36、8.12.0高于8.9.1、Kotlin同2.1 metadata系列及同stdlib补丁、JDK17可读major52，**没有发现这四个直接AAR要求提高工具链的证据**。因此本轮不升级工具链、不降级CameraX，也不额外下载旧稳定版制造不必要比较；如完整解析出现更高门槛，再以实际冲突制品选择兼容版本。

POM的完整直接依赖及scope保存在metadata.json；重要显式版本和下一步风险是：

| 来源 | 直接声明（保留原版本限定） | 需要后续实际解析的点 |
| --- | --- | --- |
| core | coroutines core/android1.9.0；core1.1.0；lifecycle-livedata2.1.0与livedata-core2.3.1；exifinterface1.4.2；tracing1.3.0；concurrent-futures及ktx1.1.0；JSpecify1.0.0 | App已有coroutines1.10.2，不能为CameraX盲目降级；最终选择与二进制兼容尚未解析 |
| camera2 | camera-core`[1.6.2]`；camera-camera2-pipe`[1.6.2]`；dagger2.59；atomicfu0.28.0；core-backported-fixes1.0.0；coroutines1.9.0 | pipe为明确额外传递AAR，本次未下载；Dagger为已编译库的runtime依赖，不意味着本App要新增注解处理插件 |
| lifecycle | camera-core`[1.6.2]`；lifecycle-common2.1.0；arch core-common2.2.0；tracing-ktx1.2.0；coroutines-android1.9.0 | 旧host已存在lifecycle/Activity依赖，最终版本由正式解析确认 |
| view | camera-core`[1.6.2]`；camera-video`[1.6.2]`；camera-lifecycle`[1.6.2]`；viewfinder-core1.5.1；fragment1.1.0；appcompat1.1.0；lifecycle-livedata/core2.3.1 | 即便只用PreviewView也会按POM带入video等传递依赖，不能声称只有四个AAR或自动排除它们 |

本次没有下载Gradle `.module`、全部传递AAR/JAR，也没有运行依赖冲突解析、D8/R8、Kotlin消费者编译或Manifest合并；POM只是声明，不是最终依赖树。没有可据此保证的全App可消费/可安装/可运行结论。下一窗口保持现工具链，用小范围Android SDK接入与真实构建核对这些剩余项；CameraX预览、URI/权限、API24/36运行与生产二维码parser仍按前述未验收边界处理。

## 权限、图片和生命周期的最小合同

Android扫码仅按需请求`CAMERA`，不连带麦克风、位置、蓝牙或存储权限；Manifest相机硬件声明设为非必需，让无相机设备仍能用选图。通过`RequestPermission`判断允许、拒绝和系统不再弹出请求等状态；首次`shouldShowRequestPermissionRationale=false`不能单独视为永久拒绝。用户拒绝后仍能返回/选图；设置入口由用户点击，不自动跳设置、不循环请求。每次恢复重新查询权限，区分设备无相机、权限拒绝和相机初始化失败。依据：[Android运行时权限](https://developer.android.com/training/permissions/requesting)。

选图用现有Activity1.7.0支持的`PickVisualMedia(ImageOnly)`单选；不支持picker时由contract退到`ACTION_OPEN_DOCUMENT`。该方案只访问用户选中的URI，不需要`READ_MEDIA_IMAGES`、`READ_MEDIA_VISUAL_USER_SELECTED`或旧存储读取权限来遍历相册。URI可读失败、取消、已撤销授权分别处理；只在当前操作内读取并关闭流，不长期持有授权、不复制到公开目录、不上传照片。系统可能从云媒体提供者取得用户选择的图像，“App本地解码”不等于“系统选择过程必然离线”。依据：[Photo picker官方文档](https://developer.android.com/training/data-storage/shared/photo-picker)。

建议数据边界为`QrImageDecoder`（图像→有界二维码候选）与`ProductionQrInterpreter`（候选→正式业务身份），二者不依赖页面或账号仓库。后者当前没有生产实现，默认只返回`unsupported_code`。会话协调绑定accountRevision、pageId、operationId；原始像素、URI、码内容和潜在bindCode不进日志、异常消息、savedInstanceState、证据层级或RN桥接。`toString`应脱敏。解码结果不作为身份、权限或已绑定证据。

相机绑定页面生命周期，分析单在途，采用`STRATEGY_KEEP_ONLY_LATEST`；不为每帧创建无界任务。所有路径释放`ImageProxy`，ML Kit异步路径在其完成/失败回调后再释放；ZXing同步路径在finally关闭，后台/离页解绑该页面use case并停止分析。图片工作在线程池进行，UI只发布固定状态。依据：[CameraX ImageAnalysis](https://developer.android.com/media/camera/camerax/analyze)。

工程预算应在实现时命名集中配置并测试：单张输入的读取字节数、解码像素上限、采样尺寸、候选数、码内容长度及处理时限；先探测尺寸再采样，避免直接完整解码超大位图。预算是内存/耗时保护，不是擅自冻结生产二维码字段长度。读取源没有可靠长度时按实际字节计数限额；不以扩展名/MIME为可信图像证明，损坏、旋转、非图片及解码失败给固定错误。多张照片不开放批处理；单图多码不静默任选，提示只保留一个码或重新选择。

进入系统picker时暂停相机并记录“等待选图”，不要在普通onStop处理中错误终结这一操作；回调仍须核对账号、页面和操作代次。真正后台、返回、销毁或账号变化取消后续并丢弃迟到结果；恢复前台只恢复新的取景，不保留旧码。结果页停扫，显式重试才开启下一轮，避免同一帧反复弹窗。

任意二维码的URL、deep-link、Wi-Fi文本、联系人、旧自定义JSON等均不能自动打开、联网、导入系统设置或上传。不要解析任意URL来请求产品API，不从二维码字段直接构建任意HTTP路径，不递归解Base64/URL来扩大接受集合。当前生产解释器空缺时，即便检测到二维码，也只显示“不支持的设备二维码，无法绑定”；不能一概叫“过期”，也不能展示识别成功/管理员/绑定成功。识别不到码为`no_code`，多码为`multiple_codes`；这些是本地状态，不冒充服务端业务错误。

## iOS同步设计

现宿主部署目标15.1，不能无条件使用iOS16引入的SwiftUI`PhotosPicker`。建议优先统一用`PHPickerViewController`单图、images过滤及item provider加载，或在iOS16+包一层`PhotosPicker`、15.1使用PHPicker的同一适配器；均不为选图申请全相册读取权限，不增加PhotoKit枚举/保存能力。官方依据：[Photos picker隐私与加载](https://developer.apple.com/documentation/photokit/selecting-photos-and-videos-in-ios)、[SwiftUI PhotosPicker示例的iOS16下限](https://developer.apple.com/documentation/photokit/bringing-photos-picker-to-your-swiftui-app)。云端素材可能异步下载，需取消/错误/迟到守卫。

实时扫码用系统AVFoundation，显式配置`AVCaptureMetadataOutput.metadataObjectTypes=[.qr]`并核对支持类型；仅请求video，相机使用说明写入`NSCameraUsageDescription`，区分notDetermined/authorized/denied/restricted。capture session串行队列启动/停止，MainActor更新UI；中断/后台后不能继续发布码。相册解码用Vision `VNDetectBarcodesRequest`限定QR，配置图像方向并接同一生产解释边界。依据：[相机授权](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media)、[AVFoundation元数据类型](https://developer.apple.com/documentation/avfoundation/avcapturemetadataoutput/metadataobjecttypes)、[Vision条码请求](https://developer.apple.com/documentation/vision/vndetectbarcodesrequest)。系统框架无需新增第三方识别SDK，仍需在实际macOS/Xcode构建并验证15.1可用性、actor隔离、权限和真机相机；Windows文档研究不是iOS运行通过。

## 可执行的小批次与验收层级

1. **纯边界TDD**：先写Android/iOS同意图测试，再RED→最小实现→GREEN。覆盖空/非码/多码、任意URL及旧自定义码一律unsupported、超限、取消、重复帧、旧账号和旧操作迟到、选图取消保留可用入口、零HTTP/零绑定/零蓝牙。生产解释器不注册，fixture不能进入生产支持表。
2. **SDK与原生页面技术批次**：单独验证选定的一组依赖；加入真实Add/Scan、取景、系统权限与单图选择、固定错误/重试/返回。新增稳定资源ID建议`add_scan`、`scan_title`、`scan_back`、`scan_album`、`scan_status`、`scan_retry`，供真实模拟器定位；布局按本地参考，不写扫描结果假数据。Android构建窗口和APK指纹由Root统一；iOS另跑Xcode检查。
3. **受控本地媒体验收**：使用只含无业务意义内容的测试QR图片验证系统picker→真实库解码→unsupported状态；无QR/损坏图/多QR、权限拒绝/恢复、无相机、旋转、后台、返回、重复点击、字体/小屏和迟到结果分别记录。模拟器虚拟/宿主摄像头能否提供图像需实测；注入decoder结果只能算状态机测试，不能冒充实时相机解码。相册页面截图可能含用户照片，证据只用测试媒体，不存系统相册层级/真实码内容。

这三个批次可先部分落实S036–S040的软件能力；S039生产身份解析、S040云端过期/不存在/权限错误和S041绑定/昵称/首页真实可见均保持未验收。不要为演示临时套用旧`rowan.device/v1`，不要自动PAIR-06、SHARE-01、MORE-04或失败补偿解绑。后续只有得到既有缺口中明确的生产协议与授权测试码，才能接入一次性消费、unknown不重放及真实成功核对；不据软件批次通过标记硬件/BLE/生产码验收通过。

旧实现可读参考：[qr.ts](../../app-rn-old/src/services/qr.ts:6)的App自定义四字段不是生产协议；[scan-flow.ts](../../app-rn-old/src/services/scan-flow.ts:80)已有“未配置正式parser则阻塞”的边界，以及取消/unknown状态，可借鉴测试意图；其真实ID展示和旧导航不约束新实现。旧工程资源、Expo相机/相册模块及依赖本批不改、不复用为新宿主权限实现。

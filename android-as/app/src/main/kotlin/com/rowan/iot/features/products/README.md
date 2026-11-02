# 原生添加设备目录

范围：S036/S042–S045，HTTP/App 仅依据 V1.4 PAIR-01/02/03。目录是云端产品元数据，不模拟蓝牙扫描、附近设备、连接成功或绑定，不依据型号猜连接/配网/云平台。

- `ProductCatalogService` 提供 categories/groups/detail；`HttpProductCatalog` 绑定 AccountService revision，生产读取前后核对同一账号快照，认证/安全读续期仍由 AccountService 统一管理。
- PAIR-01/03 的 brandId 由宿主工厂显式注入，可缺省，不默认 as；品类按稳定 value/category 客户端筛选，不增加 category query。PAIR-02 使用编码后的真实 ID 和 type=text，详情 ID 必须一致。
- 明确兼容 image/configType 的 String 或 Array、parameters 的 Object 或 key/value Array。V1.4 字段表与示例/实际只读结构记录不一致，兼容不等于契约已修订。类型错误、重复身份和不匹配详情拒绝，不强制转换为能力。
- 推荐区只显示 recommended=true；sort 升序，同值保留原序，缺失 sort 排到已排序项之后，缺失 recommended 保留 unknown。没有固定产品列表。
- Manager 使用页面调用方的结构化协程、Mutex 单次加载、StateFlow；35秒为工程读取截止时间，不是服务端保证。离开页面取消请求，拒绝不配合取消的迟到返回，不循环自动重试。详情只接收产品ID及原生账号 revision，不接受品牌、URL 或凭据；宿主工厂构造当前可信服务。

目录首次启动也必须携带 `ProductDetailsActivity.EXTRA_ACCOUNT_REVISION`，缺失拒绝；恢复时 saved revision 必须与启动 intent 一致，再与当前账号快照比对，不使用当前 revision 自动替代旧页面身份。详情复用同一原生修订常量。

视觉参考本地 lanhu_tianjiashebeisaomiaozhongyoutuijianbanben 与 lanhu_shouyetianjiashebei 的 #F2F2F2、白卡圆角12、三列/分类标题、14/12字号和 Shop。按小屏与字体缩放减列，内容高度自适应；没有复制系统栏、扫描动画或固定型号。旧 ProductCatalog/ProductThumbnail/资源仅作理解对照，本批无新增图片资源或把其他产品示例图当真图。

后续 UI 修复批次将云端图片改为页面内自动缩略图/详情大图，显示真实加载、失败与“重试图片”；没有固定产品图片兜底。卡片整体进入详情，删除重复的“产品详情”大按钮，Shop 仅为小文字入口；连接类型只显示已识别的 Wi-Fi/蓝牙用户文案，未知不猜，页面不展示 cloudPlatform/configType A/B/C 或品类编码。状态/导航栏使用浅底深色图标。品类仍用原生单选菜单，详情为原生图文/参数；完整蓝湖位置与尺寸、小屏/字体、图片服务可用性仍待实机对照，不能以早前只读链路通过计视觉通过。

`PublicProductImage.kt` 集中公共 HTTPS 下载，不在页面散落网络代码。复用锁定 ReactAndroid 已 api 导出的 OkHttp 4.9.2，不加 Gradle 依赖；创建独立 client，无应用拦截器、CookieJar.NO_COOKIES、Authenticator.NONE、proxyAuthenticator.NONE、无磁盘HTTP cache、无账号/租户头，不自动连接重试。最多3次重定向且逐跳验证HTTPS/userinfo；每张2MiB下载上限、20秒工程截止、最多4并发/同host2、32MP源尺寸上限、BitmapFactory先探尺寸再采样到最长边最多1024，8MiB内存LRU。失败/超限均不假成功，不打印URL；页面/图片detach取消下载，交付前再次核对generation及账号revision，旧页不得赋图。未提供图片显示真实缺失文案。Shop 仍仅用户手势外部HTTPS浏览，不带账号headers。

稳定测试入口：`products_card` 为整卡；`products_open_details` 为产品名称点击区域，可避开图片失败重试与Shop；`products_image` 为原生图片区域，`products_image_retry` 为实际失败重试入口。旧harness按“产品详情”按钮文字定位需改为此稳定ID。

15项离线测试先于生产实现提交 Root，统一 RED 确认缺新类型，再实现。该子任务未执行 Gradle、ADB、真实 HTTP 或读取环境/凭据；编译、GREEN与模拟器结果由 Root 统一记录，不能以本目录源码或 XML 静态检查代替。


图片实现参考 [Android大图采样](https://developer.android.com/topic/performance/graphics/load-bitmap)；独立transport隔离是为避免 [HttpURLConnection默认全局CookieHandler/Authenticator机制](https://developer.android.com/reference/java/net/HttpURLConnection)。本批未执行真实图片下载、Gradle、ADB或新的视觉验收；Root统一GREEN/模拟器记录为准。低影响UI不新增镜像单测，沿用15项URI/目录/会话行为测试。

# 设备更多只读页面

依据 `docs/SDD/设备更多与分享契约核对.md` 及 Root 确认的四 GET 契约。当前major 3保留这些只读语义，关闭RPC改为页面token；major 2相关日志/截图仍为历史证据。本批是 RN 源码、纯适配测试和 Codegen 检查，不是新 APK、真实接口或双端视觉验收。

## Native 输入

四方法均只接当前 observationId，不接任意设备/成员 ID：

- getDeviceMoreSummary → DeviceMoreSummary：deviceNickname/deviceName/productName/productCategory/seriesName/modelName/mcuVersion/wifiVersion/bindingRole。
- getDeviceMembers → DeviceMemberSummary[]：itemKey/nickname/bindingRole。
- getDeviceHelp → DeviceHelpArticle[]：itemKey/title/content/createdAt；Native 固定请求 type=text。
- getDeviceLocation → DeviceLocationSummary：assignment/roomName。

所有字段为必需 string，缺失文本由 Native 明确投影为空串；role 只识别 sa/mbr/obs，其他归一化 unknown，不推断写权限。未知版本展示未提供，不代入样例或推导 hasUpdate。DEVICE-02 当前版本仅作为元数据展示，与已有候选固件 GET 语义分开。

成员人数只计 sa+mbr；obs 单列不计入，unknown 另提示且不列入已识别人数。空昵称保留关系项并显示未设置昵称，不回退 email/mobile，不向 RN 传 userID。itemKey 只做列表 key，不携带用户原始身份、不去重合并冲突关系，也不成为写操作授权。

帮助文章纯 Text 展示，URL 外观的正文也不会自动打开，没有 Linking/WebView/外部 URI 方法。createdAt 仅展示 Native 原始时间文本，不造日期。房间 assignment 只识别 assigned/unassigned/unknown；真实 ROOM-02 缺 data/null 尚未确认是无房间，必须由 Native 返回 unknown，RN 显示所属房间暂不明确。畸形 DTO 不转空成功。

投影复制仅列明的字段并 freeze，列表超过 1000 项报错（本地安全限制，不是分页契约），拒绝空/重复本地 key。没有 mac、联系方式、raw JSON、URL 属性或凭据进入展示 state。

## 页面与生命周期

DeviceEntry 的更多入口只读取摘要，进入成员/帮助/房间时按需读取相应 GET。更多内复用既有定时、固件页面；子页返回更多，直接从设备进入的定时/固件仍返回设备。全部复用原 DeviceSessionController 的 observation；不重复 observe，不另外创建设备通信。

扩展现有 DeviceReadController：所有六类只读方法共享一个在途请求、一个最新目的地。页面/账号/设备/观察切换立即清除旧数据，晚结果不发布；后台与卸载逻辑沿用现有 generation 隔离、前台重新查询。页面卸载不宣称底层 HTTP 被撤回；Native 负责取消及在途额度。错误只采用固定用户文案，授权失效不显示缓存或提供同页盲重试。

没有重命名、房间移动、成员移除、自解绑、分享生成/二维码/扫码动作；这些写工作流仍待后续实现与权限/unknown 契约，不显示假成功入口。页面内不展示技术协议术语。

## 样式与 QA

已实际查看本地 `docs/ui/插件页-设备设置.png`（375×812）：#f1f1f1 背景、居中16标题、左右16边距、白色圆角卡片、约52高行及灰色详情文字。沿用布局基础，行高采用 minHeight 并允许文字换行/滚动。没有新插画。当前安全 DTO 没有已核验产品图片，未猜产品或复制示例酒柜图片；MAC 与写入口不进入本批。成员/帮助采用相同白卡与文字基础，蓝湖及双端像素核对仍待完成。

- 入口：rn-open-more；返回：rn-feature-back；原生关闭：rn-device-close。
- 更多：rn-more-loading/loaded/error/retry。
- 子入口：rn-more-open-members/help/location/schedules/firmware。
- 成员及帮助：rn-members-loading/loaded/empty/error/retry、rn-help-loading/loaded/empty/error/retry。
- 房间：rn-location-loading/loaded/error/retry；已解码结果另有 rn-location-assigned/unassigned/unknown。
- 定时及固件 IDs 继续见 ../device-readonly/README.md。

真实成员昵称/房间名称可能含用户数据，QA 不保存原始 hierarchy 或成员正文截图。loaded/empty 只在对应页面当前观察的响应完整解码后出现。

本批先观察缺投影模块/新 controller 分支的实际 RED，再完成16项新纯测试。检查及源码 hash 归档 `app-rn/.cache/verification/device-more/`；最终执行数以 summary.json 和完整日志为准。没有运行 Gradle/ADB/Metro、网络或 native mutation。原生签名与打包由 Root 统一；Windows 未编译 iOS。

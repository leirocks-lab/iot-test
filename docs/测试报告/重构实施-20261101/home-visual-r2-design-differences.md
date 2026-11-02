# Home本地设计核对与可还原范围

本稿先核本地资料，在线蓝湖工具访问受限、版本未捕获。export049/page.json记录version.status=not_captured、versionVerified=false，不认定最新版。首页.png及export156的design.png是413×106蓝色“首页”章节切片，不是布局；整页依据为首页(1).png / lanhu_shouye/design.png（375×812）。长按多选依据首页备份-长按编辑.png / lanhu_shouyebeifenzhanganbianji。哈希见design-sources.json。

| 项 | 本地精确来源 | 现状 | 本批缓存改动/限制 |
|---|---|---|---|
| 底色 | shouye CSS .page #F2F2F2 | Android已有/iOS grouped默认 | 两端明确相同浅灰 |
| 卡网格 | .grid_5 width343; .list-items_1 width166 height202 margin-right11 bottom10 | 灰色大按钮/原生单列表 | 按375画板16左右内边距、11列距、10行距、两等分白卡，最小202；宽度随真实viewport，允许字大扩高 |
| 卡面 | .list-items_1 background white radius12 shadow0,1,10,.04 | 系统按钮/UITableViewCell | 白卡/12圆角；原生字体14正文来自.text_16/.text_26，动态字体；系统字体fallback与阴影平台差异不声称pixel |
| 房间 | .text_3 16 black selected; .text_4 14 #333; .block_4 12×3 #231916 radius2 | 已有scroll tabs/24×2线 | 不改过滤owner，调字/下划线；48dp可触控比视觉文字更大，长名可横向滚动 |
| 多选 | 编辑CSS .text_2/18/4 16;取消#666/中心black/完成#186DAF | 逻辑已实现/大按钮 | 顶部文字/相同ID、原生checked语义；白卡右上圆选择标记，不代替Checkbox真状态；删除footer仍defaultdeny确认 |
| 正常footer | 整页截图Home/Add/Mine三个入口 | 首页大按钮堆叠 | 复用现有native Add/Mine，Home仅当前导航标识；正常footer和编辑删除footer互斥，不增业务 |
| 品牌logo | 截图ANTARCTIC STAR | 当前通用ROWAN/无权威brand-logo映射 | 不套示例品牌，用既有首页标题；这是明确未还原项 |
| 产品照片/在线点/PoweredOff/Cooling/电源 | 截图示例设备值与按钮 | HOME现只有id/nickname | 只渲染真实nickname，图片可留白；不伪造照片、在线状态、型号/电源，不新增通信 |
| 空/加载/失败/cleanup | 导出缺这些完整状态 | 真实状态已有 | 保留原文案、错误/缓存/重试/原注销guard，只调整排版，不画虚构UI状态 |
| 系统条 | 整页画板包含iOS status/home indicator | 系统真实insets | 不嵌截图/系统条，遵循真实安全区；各平台不同，不按812固定裁切 |

Flat visibleGroups.devices保原API顺序，两列不按每房间强制断行；房间名仍由tabs选择呈现。账号、唯一Home consumer、selection、native/RN打开链路不变。页面不写协议/字段/阻塞术语。无新域/HTTP/MQTT/产品字段/全局登录态。

拟实施仅Android HomeActivity.kt、iOS HomeViewController.swift两现有UI文件，外观小组件同文件private归属；不加依赖/SDK/PBX/图片资源，不动原fixture。低影响纯布局不写镜像单测：Root后续以现9场景真实SDK+四配置验证。Android卡根保Button/CheckBox+既有ID及nickname text，ui.labels/真实触控继续有效；几何必须区分真实offscreen可滚项与被触控48dp可见目标，不松选择确认或语义guard。iOS无Mac，缓存源码/定义不等于UIKit通过。

## R2 footer差异及生命周期复核

R1 Android footer目前是文字首页/我的及原生绘制“+”，iOS为SF Symbols house/person/plus；均不是本地图footer图标的精确资产复用，不宣称footer像素还原。export049 JSX把footer引用为单张376×88的image_9，包含多控件/底部系统home indicator，不能作为整个按钮或背景截图嵌入。旧工程home-selected.png(80×82)、my.png(80×80)、add.png(148×148)可作为候选资源，已原字节复制resource-candidates并记录来源SHA，但旧代码只是对照、尚无这些文件与export049分层icon的可核验来源对应，故R2不冒充“精确设计icon”接入，也不新增正式资源/PBX。

HomeSelection.appear仅修改active/inputEpoch，不保证发state；sync设置等价HomeSelectionState时didSet会去重。精确核对当前HomeRoomTabs后，不能把“初次HOME失败→Mine返回”描述成永久无重读：cancelLoad在!loaded时会标needsReloadOnAppear，返回通常会安排一次异步重读；loaded=true路径则leave重置selection后sync通常会emit。因此Root提出的是生命周期依赖缺口，本稿没有声称已实测永久footer丢失。问题在于viewWillAppear自身没有显式恢复，依赖selection或后续重读/OS通知间接安排外观，以及toolbar原基线仅在foreground通知时才记录。R2在viewWillAppear先显式捕获一次原toolbar基线并调用setNormalFooterVisible，再保原selection/core恢复。即使当下没状态emit、异步重读尚未执行或无didBecomeActive也确定恢复；权限/cleanup/account门仍由setNormalFooterVisible校验。foreground callback仅刷新，不负责初始化基线。

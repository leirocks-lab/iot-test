"""Rebuild the reviewed scope/source mapping. Does not touch the source inventory."""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path
from refactor_inventory import ROOT, SCOPE, paragraphs, scope_rows, API

HTTP = Path('docs/prd/ROWAN公共App产品功能及API详细设计说明书_V1.4.docx')
MQTT = Path('docs/prd/ROWAN_AS_App_Spec_V1.6_Corrected.docx')

# Explicit row decisions. UI expressions match exported page names, not scope authorization.
DECISIONS = r'''
1|基础框架|原生服务与RN契约|Startup|app-runtime,runtime-integration|^启动页$|三端工程启动、原生导航进入RN再返回；会话和设备服务仅由原生持有；本行缺少可量化业务细节，按已确认架构验证
2|启动|原生页面|Startup|app-runtime,onboarding|^启动页$|有会话与无会话各冷启动一次；品牌页后分别进入首页与账号入口，并反映网络与初始化失败
3|会话|原生服务|Startup|rowan,runtime-lifecycle|^启动页$|本地有效会话触发刷新；刷新失败返回登录并清理Token、MQTT凭证及用户缓存，旧账号事件不能再更新界面
4|地区|原生页面|Region|onboarding|^注册-地区选择器|注册前选择地区后提交携带该regionCode；已创建账号不能直接改地区，客服引导不新增客服后台
5|地区|原生页面|Region|onboarding|^注册-地区选择器|输入国家地区名称得到本地筛选结果，清空后恢复列表；选项用于注册与协议查询，不为搜索新增HTTP
6|协议|原生页面|Agreement|rowan|注册-隐私协议|不同regionCode加载适用隐私政策，正文未返回显示加载或错误；仅存在品牌内容差异时传brandId
7|协议|原生页面|Agreement|rowan|注册-隐私协议|协议正文由CONTENT-02返回；倒计时未结束、未滚动到底时不能完成阅读；完成后可勾选
8|协议|原生页面|Agreement|onboarding|注册-隐私协议|未读完或未勾选时注册提交被阻止；满足条件时本次协议版本进入注册请求
9|注册|原生页面|Auth|onboarding|^注册(-输入|$)|无效邮箱本地提示且不发验证码；有效邮箱允许下一步
10|注册|原生页面|Auth|rowan|^注册-.*验证码发送|发送请求accountType=email；发送中禁止重复提交；成功、频控与网络失败分别可见
11|注册|原生页面|Auth|onboarding|^注册-.*验证码|六位输入自动聚焦并展示错误；倒计时结束前不能重发，结束后可重发
12|注册|原生页面|Auth|rowan|^注册-.*验证码|分别返回验证码错误、过期和频繁，界面按服务端结果提示，不在本地宣称验证成功
13|注册|原生页面|Auth|onboarding|^注册(-输入|$)|密码格式或两次不一致时禁止下一步；合法时继续，确认密码不出现在HTTP请求字段
14|注册|原生页面|Auth|rowan|^注册(成功|$)|成功请求包含邮箱、密码、验证码、地区与协议版本；仅服务端成功后进入成功或登录流程
15|登录|原生页面|Auth|rowan|^登录(-输入|$)|正确凭据建立会话；账号不存在和密码错误使用统一提示，不暴露账号存在性
16|登录|原生页面|Auth|rowan|^登录|验证码登录请求verify=captcha，沿用获取与校验接口；密码登录与验证码登录不能串用请求状态
17|会话|原生服务|Auth|rowan,native-storage|^登录成功$|登录成功后安全持久化两种Token、到期与设置，重启可恢复；随后加载首页，普通日志无凭据
18|找回密码|原生页面|Auth|rowan|^登录-忘记密码|输入邮箱发送找回验证码，未注册或异常账号显示安全提示
19|找回密码|原生页面|Auth|rowan|^登录-(找回|忘记)密码|正确验证码可继续；错误、过期、重发与倒计时均有对应可见状态
20|找回密码|原生页面|Auth|rowan|^登录-忘记密码-.*新密码|确认密码不一致阻止提交；一致时仅提交账号、验证码和新密码
21|找回密码|原生页面|Auth|rowan|^登录-忘记密码-成功找回$|重置成功提示后回登录；不能自动复用重置前Token进入首页
22|会话|原生服务|Preferences|rowan,runtime-lifecycle|设置-个人信息-退出登录|注销成功返回账号入口，Token、MQTT凭证、订阅及用户缓存均清除
23|首页|原生页面|Home|rowan|^全局加载$|进入首页显示加载态，HOME-01完成后按房间分组渲染；失败有错误与重试，不以假设备填充
24|首页|原生页面|Home|rowan|^无设备$|空设备响应显示空态和添加入口，不出现虚拟设备卡片
25|首页|原生页面|Home|runtime-lifecycle|^无网络$|断网保留最后确认数据并显示网络提示；恢复后重新拉首页且恢复MQTT订阅
26|首页|原生页面|Home|rowan|^首页(\(1\))?$|切换房间页签只筛选已有HOME-01分组，不改变设备归属
27|首页|原生页面|Home|rowan|^首页\(1\)$|卡片昵称、产品图和房间来自HOME-01；实时状态随设备上报更新
28|首页|原生页面|Home|device-controls|^首页\(1\)$|设备上报在线与离线均更新卡片；离线操作不能显示成功，MQTT连接成功本身不等于设备在线
29|首页|原生页面|Home|device-controls|^首页\(1\)$|快速开关先显示发送中；只有匹配reported达到目标才确认成功，desired接受不冒充设备执行
30|设备入口|原生导航与RN页面|Device|runtime,device-settings|^设备页$|点击卡片携带设备标识进入RN，静态详情与MQTT凭证分别获取；无权限时停止进入可控状态
31|首页|原生页面|Home|rowan|首页备份-长按编辑|长按进入多选，可选中、取消并退出；退出后恢复普通点击行为
32|首页|原生页面|Home|device-unbind|首页备份-长按编辑|选择两台设备逐台解绑，一成功一失败时分别保留结果，不能整批显示成功
33|导航|原生页面|Home|app-runtime|^首页\(1\)$|点击Home进入设备与房间主界面，可进入添加设备
34|占位|原生页面|Home|app-runtime||Store仅保留导航占位，不形成商品、订单或支付功能
35|未冻结|原生页面|Mine|rowan|^我的(\(1\))?$|Mine可进入已明确的退出和偏好；完整页面未冻结，不凭导出图扩展个人信息、反馈等业务
36|添加入口|原生页面|Add|product-catalog|^首页-添加$|从Add打开扫码、蓝牙发现、手动产品与推荐入口，各入口可返回首页
37|扫码|原生页面与平台权限|Scan|scan-flow,qr|^扫一扫-进行中$|首次进入请求相机权限；允许后取景识别并做格式初检，拒绝有明确引导
38|扫码|原生页面与平台权限|Scan|scan-flow,qr|^扫一扫|相册选择二维码可解析；拒绝权限、图片不可识别均明确提示并可进入设置
39|扫码|原生页面|Scan|qr,scan-flow|^扫一扫-设备$|统一解析三种标识，格式合格才补产品详情并绑定；缺失或非法字段不发绑定
40|扫码|原生页面|Scan|qr,scan-flow|^扫一扫-无效提示$|分别测试格式错、过期、不存在与无权限，显示对应原因且不进入成功页
41|扫码绑定|原生页面|Scan|scan-flow,rowan|^设备添加成功提示$|有效bindCode首次绑定得到管理员，重复使用失败；成功后进入昵称设置
42|产品目录|原生页面|Add|product-catalog|^添加设备-扫描结束|品类名称显示服务端当前语言配置，筛选使用稳定value，不以翻译文本当ID
43|产品目录|原生页面|Add|product-catalog|^添加设备-扫描结束|产品列表按服务端配网方式、连接类型及云平台进入流程，不按型号硬编码
44|产品目录|原生页面|Add|product-catalog|^添加设备-扫描结束备份-上划$|recommended、sort、buyLink与connectType变化后推荐标识、排序和购买入口同步；仅已配置链接可用
45|产品目录|原生页面|Add|product-catalog|^添加设备-扫描结束|详情显示云端名称、型号、图片、参数、介绍及支持配网方式，缺能力不伪造
46|蓝牙发现|原生页面与BLE服务|Add|onboarding|^添加设备-(扫描中|蓝牙)|蓝牙权限拒绝、关闭、扫描中、排序及超时各有状态；扫描可取消，不创建虚拟发现结果
47|蓝牙发现|原生页面与BLE服务|Add|product-catalog|^添加设备-扫描扫到设备$|识别广播后按产品标识获取能力；未知设备不能仅凭名称套用产品流程
48|蓝牙发现|原生页面与BLE服务|Add|onboarding|^添加设备-(扫描失败|扫描时效结束)|超时无设备显示重试、手动及推荐；重试重新开始一次扫描
49|Wi-Fi配网|原生页面与网络服务|Add|wifi|^添加设备-扫描结束-.*5G|识别5GHz时引导2.4GHz；系统无法判断频段时提示并允许继续
50|Wi-Fi配网|原生页面与网络服务|Add|wifi|^添加设备-扫描结束-.*Wi-Fi|当前SSID可用则展示；无网络或权限不足提供设置入口；按双端能力降级
51|Wi-Fi配网|原生页面|Add|wifi|^添加设备-扫描结束-已连接输入密码$|密码显隐切换不丢输入；不合法阻止继续；日志与无关HTTP请求中无Wi-Fi密码
52|配网帮助|原生页面|Add|device-help|^添加设备-(扫描失败|扫描结束)|输入页及失败页按产品和语言加载帮助；只打开受信任链接，加载失败可返回配网
53|配网流程|原生配网服务|Add|onboarding|^添加设备-所有显示Wi-Fi配网-连接中|二期配网开始前获得认证、激活、绑定与OTA地址；缺失或非法地址阻止对应步骤
54|配网流程|原生配网服务|Add|onboarding|^添加设备-(所有显示Wi-Fi配网-连接中|蓝牙-连接中)|连接、认证、发送Wi-Fi、激活、绑定、证书与服务器连接各呈现统一阶段；失败码保留发生阶段
55|配网流程|原生配网服务|Add|onboarding|^添加设备-所有显示Wi-Fi配网-连接中|绑定未完成时轮询间隔至少2秒且有总超时；成功、取消或超时立即停止后续轮询
56|配网流程|原生页面|Add|onboarding|^添加设备-(扫描失败|蓝牙-添加失败)|注入网络失败显示网络所在阶段，提供重试、FAQ与返回，不误报硬件故障
57|配网结果|原生页面|Add|device-settings|^添加设备-配网成功|0与20字符边界按范围处理，超20阻止保存；跳过用产品默认名，成功保存才进入完成
58|配网结果|原生页面与MQTT服务|Add|runtime|^设备添加成功提示$|提示完成后真实HOME-01中可见新设备并建立会话；列表未返回不能用成功提示代替
59|设备初始化|RN页面与原生HTTP服务|Device|device-settings|^设备页-|进入设备页显示详情昵称、产品、版本及角色；实时属性不持续轮询DEVICE-02
60|设备初始化|RN页面与原生MQTT服务|Device|runtime|^设备页-|凭证成功后先订阅响应再请求完整影子；过期与拒绝有错误，不把MQTT连通当作设备在线
61|设备控制|RN页面与原生MQTT服务|Device|device-controls|^设备页-除湿机(-关机)?$|点击开关进入发送中，reported确认后更新；desired接受、拒绝和无回报分别处理
62|设备控制|RN页面与原生MQTT服务|Device|device-controls|^酒柜插件|切换C/F后温度显示与输入按用户偏好一致换算；下发合法产品温度值，回报才确认
63|设备控制|RN页面与原生MQTT服务|Device|device-controls|^设备页-(除湿机|加湿器)|目标湿度使用产品属性标识与范围，越界禁止下发；合法值等待回报
64|设备控制|RN页面与原生MQTT服务|Device|device-controls|^设备页-(除湿机|加湿器)|只显示该产品配置的模式枚举；切换等reported回报，不把其他产品枚举写入
65|设备控制|RN页面与原生MQTT服务|Device|device-controls|^酒柜插件|灯光与亮度按产品能力显示并下发，设备拒绝或无回报不能保持虚假成功
66|设备控制|RN页面与原生MQTT服务|Device|device-controls|酒柜插件页-童锁开|童锁回报更新锁定状态并限制冲突控件；可解除的操作仍按产品能力校验
67|设备控制|RN页面与原生MQTT服务|Device|device-controls|^设备页-(除湿机|加湿器)|静音设置失败或超时恢复最近确认值；具体产品是否有控件须按能力核对
68|维护|RN页面与原生MQTT服务|Device|device-maintenance|^设备页-除湿机上划|有维护能力产品显示设备上报时长，缺能力不显示虚构维护计数
69|维护|RN页面与原生MQTT服务|Device|device-maintenance|^设备页-除湿机上划|清洁重置需二次确认，取消不发消息；确认沿产品一次性动作字段下发并等结果，保留次数或流水语义
70|状态同步|RN页面与原生MQTT服务|Device|device-controls|^设备页-|reported快照与增量合并后运行、温湿度、目标及维护状态一致；首页与RN共享原生权威状态
71|告警|RN页面与原生MQTT服务|Device|device-events|^设备页-除湿机上划|显示原产品映射的故障上下文；无明确解除信号不自行清除告警，App不直接订阅云端notice
72|控制异常|RN页面与原生MQTT服务|Device|device-controls|^设备页-除湿机-离线|超时或设备离线结束发送中并恢复确认值，显示失败；后续迟到消息按会话和关联语义处理
73|控制异常|RN页面与原生MQTT服务|Device|runtime-lifecycle|^设备页-除湿机-离线|重连时过期凭证重新获取，恢复精确订阅后发一次全量get，不重复订阅造成双处理
74|定时|RN页面与原生HTTP服务|Schedules|rowan||一次与周期列表展示名称、时间、重复、启用及下次执行；空与加载失败状态明确
75|定时|RN页面与原生HTTP服务|Schedules|rowan||创建type=once携带时间、IANA时区和产品动作；服务成功后列表可见，App不本地承担到点执行
76|定时|RN页面与原生HTTP服务|Schedules|rowan||创建type=periodic携带起止时间、重复、星期、模式和动作；重新打开能读回一致配置
77|定时|RN页面与原生HTTP服务|Schedules|rowan||每天、工作日与自定义重复可选；周一序列化为1、周日为7，读取后还原同一星期集合
78|定时|RN页面与原生HTTP服务|Schedules|device-controls||产品不支持的模式与action阻止保存；合法产品动作不被跨产品硬编码替换
79|定时|RN页面与原生HTTP服务|Schedules|rowan||编辑已有日程后重新读取时间、时区、重复、模式与动作一致；失败保留草稿及原列表
80|定时|RN页面与原生HTTP服务|Schedules|rowan||启停请求仅修改enabled；服务端失败恢复原开关，不改变其他日程字段
81|定时|RN页面与原生HTTP服务|Schedules|rowan||删除取消不发请求；确认后服务成功才移除，失败保留行并提示
82|云端调度|服务端职责；RN接入|Schedules|rowan||客户端保存并读回IANA时区，展示服务端nextExecutionAt；跨夏令时样例需服务端联调证明，客户端不自建调度器
83|云端调度|服务端职责；客户端联调|Schedules|rowan||保存日程后关闭App，由云端到点触发；重新打开读取结果，设备执行需云端与硬件证据，不能模拟器单独验收
84|设备更多|RN页面与原生HTTP服务|More|device-settings|^插件页-设备设置-重命名|保存昵称后更多页、首页及设备页同步；失败保留已确认名称，超长有校验
85|设备房间|RN页面与原生HTTP服务|More|device-settings|^插件页-设备设置-选择房间$|当前房间从ROOM-02读取；绑定或解除成功后刷新归属，失败不虚假移动
86|设备分享|RN页面与原生HTTP服务|Share|device-share|^设置-设备分享|成员按云端角色展示，列表为空与无权限明确；全局分享中心图仅作视觉参考
87|设备分享|RN页面与原生HTTP服务|Share|device-share|^插件页-设备设置-设备二维码分享$|管理员生成包含deviceID与bindCode的二维码；非管理员不允许生成，失败不展示旧码为新码
88|扫码共享绑定|原生扫码与RN分享入口|Scan|device-share,scan-flow|^扫一扫-设备$|被分享者扫码单次bindCode完成绑定；角色按返回值，重复使用不成功
89|设备分享|RN页面与原生HTTP服务|Share|device-share|^设置-设备分享-(编辑|删除)|管理员移除普通成员后刷新列表；越权与成员关系失效时显示失败且不虚假删除
90|设备帮助|RN页面与原生HTTP服务|Help|device-help|^设置-(产品说明书|常见问题)|按deviceID加载设备帮助文本或受信任链接，空与失败可返回，不扩展全局知识库功能
91|固件|RN页面与原生升级服务|Ota|device-ota|MCU固件版本|MCU检查按云端版本与可升级标识显示，最新与新版本区分，不在客户端猜测版本
92|固件|RN页面与原生升级服务|Ota|device-ota|模组固件版本|Wi-Fi固件检查带设备认证；无权限失败，不显示其他设备版本
93|固件|RN页面与原生升级服务|Ota|device-ota|模组固件版本-发现新版本|创建成功展示任务已创建并跟踪任务，不直接显示升级完成；禁止重复创建并行任务
94|固件|RN页面与原生升级服务|Ota|device-ota|模组固件版本-升级完成|按任务ID查询进度，只有终态与设备结果才完成；范围OTA-04与V1.4查询OTA-05相冲突待确认
95|固件|RN页面与原生升级服务|Ota|device-ota|模组固件版本|可取消任务发取消请求并等确认；不可取消展示原因；范围OTA-05与V1.4取消OTA-04冲突待确认
96|解绑|RN页面与原生服务|More|device-unbind|^插件页-设备设置-删除设备$|确认解绑成功后取消设备MQTT订阅、清缓存并刷新首页；失败保留设备且提示
97|房间|原生页面|Rooms|rowan|^房间管理$|列表显示云端名称、默认标识及deviceCount，不再次遍历设备推算数量
98|房间|原生页面|AddRoom|rowan|^房间管理备-添加房间$|空名与重复名称不能新增；合法名称成功后列表可见，服务端错误有提示
99|房间|原生页面|Rooms|rowan|^房间管理-编辑名称$|修改后列表显示新名称；不存在与重名错误分别处理，失败保留原名
100|房间|原生页面|Rooms|rowan|^房间管理-编辑$|以最新列表整体提交排序，重新加载顺序一致；失败不宣称已保存
101|房间|原生页面|Rooms|rowan|^房间管理备-编辑-删除$|确认设备迁移或解除规则后整体保存删除结果；规则未冻结保留待核对，不自行清空设备归属
102|房间并发|原生页面与HTTP契约|Rooms|rowan|^房间管理-编辑$|两终端基于旧版本整体保存时应识别冲突，刷新最新列表避免覆盖；version/updatedAt字段落地需后端确认
103|设备房间|RN页面与原生HTTP服务|More|device-settings|^插件页-设备设置-选择房间$|从更多选择新房间保存成功后首页分组改变；失败保留原归属
104|偏好|原生页面与共享状态|Preferences|rowan|^设置-语言$|读取设置得到语言、通知、主题、壁纸、布局、温度与度量，缺失值按确认默认策略，不扩大页面范围
105|偏好|原生页面与共享状态|Preferences|rowan|^设置-语言$|简中、繁中、英文保存后原生与RN可见文本刷新；重开读取一致，失败有提示
106|偏好|原生页面与权限|Preferences|rowan||通知偏好保存且独立反映系统通知权限；系统拒绝时提供原生设置引导
107|偏好|原生页面与共享状态|Preferences|rowan||跟随系统、明亮、暗黑保存后主题生效；跟随系统时系统主题变化同步
108|偏好|原生页面与共享状态|Preferences|rowan||仅展示返回的壁纸配置并保存选中ID；缺配置不发明壁纸目录
109|未冻结|原生偏好契约|Preferences|rowan||保留并读写homeLayout字段；具体布局未定义，不从导出图生成额外布局方案
110|偏好|原生页面与RN共享状态|Preferences|rowan|^插件页-设备设置-选择温度单位$|C/F偏好保存后首页与设备页同步换算，重启一致；视觉图在设备更多不改变全局偏好所有权
111|偏好|原生页面与RN共享状态|Preferences|rowan||metric/imperial与温度单位一致保存；只更新某字段时其他未传字段保持原值，不被null清空
'''

def build():
    hp, mp = paragraphs(ROOT / HTTP), paragraphs(ROOT / MQTT)
    rows = scope_rows(ROOT / SCOPE)
    # API index is a five-column Word table; preserve exact method, path and heading.
    apis = {}
    for i in range(750, 1106):
        if API.fullmatch(hp[i]) and hp[i+2] in {'GET','POST','PUT','PATCH','DELETE'}:
            aid = hp[i]
            detail = next((j for j in range(1105,len(hp)) if hp[j].startswith(aid+' ')), None)
            section = next((hp[k] for k in range(detail or i,0,-1) if re.match(r'^8\.\d+\s',hp[k])), '第7章云端API索引')
            apis[aid] = {'id':aid,'method':hp[i+2],'path':hp[i+3], 'document':HTTP.as_posix(),
                'indexParagraph':i+1,'detailParagraph':detail+1 if detail is not None else None,
                'section':section,'title':hp[detail] if detail is not None else aid}
    ui = []
    archived_images=set()
    for p in sorted((ROOT/'docs/ui/lanhu/project/src/view').glob('*/page.json')):
        m = json.loads(p.read_text(encoding='utf8'))
        archived_images.add(Path(m.get('designImage',{}).get('sourcePath') or '').name)
        ui.append({'name':m['name'],'metadataPath':p.relative_to(ROOT).as_posix(),
            'imagePath':(p.parent/'design.png').relative_to(ROOT).as_posix() if (p.parent/'design.png').exists() else None,
            'onlineVersionVerified':False,'matchBasis':'已按范围内页面/状态名称关联本地导出；不等于线上版本或像素标注核实'})
    standalone_ui=[{'name':p.stem,'metadataPath':None,'imagePath':p.relative_to(ROOT).as_posix(),
        'onlineVersionVerified':False,'matchBasis':'根目录独立本地导出；未进入157项蓝湖元数据，版本与线上关系待核对'}
        for p in (ROOT/'docs/ui').glob('*.png') if p.name not in archived_images]
    # These are contextual references, not extra API calls for a local UI row.
    contextual = {4:['AUTH-03'],5:['AUTH-03','CONTENT-01','CONTENT-02'],8:['AUTH-03','CONTENT-01','CONTENT-02'],
        9:['AUTH-01'],11:['AUTH-01'],13:['AUTH-03'],17:['AUTH-04'],21:['AUTH-07'],24:['HOME-01'],28:['HOME-01'],
        33:['HOME-01'],35:['AUTH-06','USER-01','USER-02'],40:['PAIR-06'],48:['PAIR-01'],54:['PAIR-04','PAIR-05','PAIR-06'],
        56:['PAIR-07'],60:['DEVICE-01'],73:['DEVICE-01'],77:['TIMER-02','TIMER-03'],78:['TIMER-02','TIMER-03'],
        82:['TIMER-01','TIMER-02','TIMER-03'],83:['TIMER-02'],108:['USER-01','USER-02'],109:['USER-01','USER-02'],111:['USER-02']}
    # V1.4 business sections cited for rows without their own REST endpoint.
    sections = [(1,1,'AGENTS.md 架构与目录；SDD 架构方案'),(2,22,'5.1 启动、登录与注册；8.1 协议与内容；8.2 账号与认证'),
        (23,35,'5.2.1 首页状态与批量编辑'),(36,58,'5.2.2 扫一扫；5.2.3 蓝牙扫描与推荐产品；5.2.4 Wi-Fi 配网、绑定进度和昵称'),(59,73,'4.2 设备页控制说明；5.4 酒柜和空气类设备控制；V1.6第10章MQTT'),
        (74,83,'5.5 定时与日程；8.12 定时日程'),(84,96,'5.3 房间、单位偏好与设备更多'),
        (97,103,'5.3 房间、单位偏好与设备更多；8.7 房间管理'),(104,111,'5.3 房间、单位偏好与设备更多；8.11 用户偏好')]
    configs = {}
    for line in DECISIONS.strip().splitlines():
        head, outcome = line.rsplit('|',1)
        parts = head.split('|',5)+[outcome]
        assert len(parts)==7, line
        configs[int(parts[0])] = parts[1:]
    mqtt_rows = {3,22,25,27,28,29,30,58,96} | set(range(59,74)) | {83,94}
    controls = {29} | set(range(61,68)) | {69}
    items=[]
    for n,row in enumerate(rows,1):
        category,owner,screen,services,pattern,outcome=configs[n]
        if n in {27,28,29,33}: pattern=r'^首页$'
        if n in {94,95}:
            outcome = ('按任务ID通过V1.4 OTA-05查询进度，只有终态与设备结果才完成；保留范围表原OTA-04编号差异' if n==94 else '可取消任务通过V1.4 OTA-04取消并等确认；不可取消展示原因；保留范围表原OTA-05编号差异')
        direct=sorted(set(API.findall(row['requirement'])))
        ui_matches=[x for x in ui+standalone_ui if pattern and re.search(pattern,x['name'])]
        legacy_paths=[f'app-rn-old/src/screens/{screen}.tsx']+[f'app-rn-old/src/services/{s}.ts' for s in services.split(',')]
        if direct or contextual.get(n): legacy_paths.append('app-rn-old/src/services/rowan.ts')
        if n in mqtt_rows:
            legacy_paths += ['app-rn-old/src/protocol/classic-shadow.ts','app-rn-old/src/protocol/device-session.ts']
        if 46<=n<=56:
            legacy_paths += ['app-rn-old/src/protocol/native-ble.native.ts','app-rn-old/src/protocol/provision-0822.ts','app-rn-old/src/protocol/provision-0922.ts']
        legacy=[]
        for path in dict.fromkeys(legacy_paths):
            assert (ROOT/path).exists(),path
            content=(ROOT/path).read_text(encoding='utf8').splitlines()
            lines=[i+1 for i,s in enumerate(content) if re.search(r'export (?:default |async )?(?:class|function)|async (?:restore|login|logout|register|refresh|settings|updateSettings|schedules|createSchedule|updateSchedule|deleteSchedule|home|rooms|bind|device)|property/get|shadow/|publish|subscribe',s)]
            symbols={
                'AUTH-01':'sendCaptcha','AUTH-02':'checkCaptcha','AUTH-03':'register','AUTH-04':'login','AUTH-05':'refresh','AUTH-06':'logout','AUTH-07':'resetPassword',
                'CONTENT-01':'agreement','CONTENT-02':'agreement','HOME-01':'home','DEVICE-01':'mqtt','DEVICE-02':'device',
                'PAIR-01':'products','PAIR-02':'product','PAIR-03':'categories','PAIR-04':'connection','PAIR-05':'bindStatus','PAIR-06':'acceptShare','PAIR-07':'help',
                'MORE-01':'members','MORE-02':'unbind','MORE-03':'removeMember','MORE-04':'renameDevice','MORE-05':'help',
                'ROOM-01':'moveDevice','ROOM-02':'location','ROOM-03':'rooms','ROOM-04':'createRoom','ROOM-05':'renameRoom','ROOM-06':'saveRooms',
                'SHARE-01':'share','OTA-01':'firmware','OTA-02':'firmware','OTA-03':'startOta','OTA-04':'cancelOta','OTA-05':'otaTask',
                'TIMER-01':'schedules','TIMER-02':'saveSchedule','TIMER-03':'saveSchedule','TIMER-04':'enableSchedule','TIMER-05':'deleteSchedule',
                'USER-01':'settings','USER-02':'updateSettings'}
            relevant_symbols=sorted({symbols[aid] for aid in direct+contextual.get(n,[]) if aid in symbols})
            if n in {94,95}: relevant_symbols=['otaTask' if n==94 else 'cancelOta']
            if path.endswith('/rowan.ts'):
                if n==3: relevant_symbols+=['restore','clear']
                lines=[i+1 for i,s in enumerate(content) if any(re.search(r'\b(?:async |private async )'+re.escape(sym)+r'\(',s) for sym in relevant_symbols)]
            legacy.append({'path':path,'anchorLines':lines[:18] or [1],'symbols':relevant_symbols if path.endswith('/rowan.ts') else [],'role':'旧页面/服务/协议实现对照；不授权旧行为或额外业务'})
        ambiguities=[]
        if n==1: ambiguities.append('原始要求仅“基础框架搭建”，技术细节按已确认SDD；不可从此行推导远程发布平台范围。')
        if n in {34,35,109}: ambiguities.append('原始范围明确占位或未冻结；不得以PRD/UI额外页面补齐未授权业务。')
        if not ui_matches: ambiguities.append('157份本地UI中未找到本条专属状态图；关联功能与验收结果明确，视觉参数待蓝湖核对。')
        else: ambiguities.append('本地导出图与线上蓝湖版本、原始图层标注尚未核实；不能声明线上最新或像素还原通过。')
        if n in {62,63,64,65,66,67,68,69,70,71,78}:
            ambiguities.append('具体产品字段、范围、枚举、动作及告警映射须用原产品字典和真实报文冻结；示例JSON不得作为固件强制字段。')
        if n==101: ambiguities.append('删除房间后设备迁移/解除归属规则在范围中要求确认，不能自行选择。')
        if n==102: ambiguities.append('范围与V1.4建议version/updatedAt，但ROOM-06基础接口未冻结并发字段/错误码，需要后端确认。')
        if n in {77,78}: ambiguities.append('旧Schedules.tsx默认action={Power:1}仅作迁移对照，不能代替按产品能力校验的范围要求。')
        if n in {94,95}: ambiguities.append('范围表OTA-04/OTA-05用途与V1.4详细接口相反。用户于2026-11-01明确按V1.4正文绑定，仅记录范围表编号差异；不修改xlsx。S094使用OTA-05查询，S095使用OTA-04取消。')
        topics=[]
        if n in mqtt_rows:
            if n in {3,22,96}:
                topics=[{'role':'原生会话撤销/退订','topics':['$aws/things/{deviceID}/shadow/get/accepted','$aws/things/{deviceID}/shadow/get/rejected','$aws/things/{deviceID}/shadow/update/accepted','$aws/things/{deviceID}/shadow/update/rejected'],'section':'10.5 App订阅边界；异常与重连','paragraphs':[2371,2419,2420]}]
            elif n==83:
                topics=[{'role':'云端到点下发，App无需常驻；仅作客户端联调背景','topics':['$aws/things/{deviceID}/shadow/update'],'section':'10.4 T04；V1.4 8.12云端日程','paragraphs':[2280,2289,2293]}]
            elif n==94:
                topics=[{'role':'设备→云端上行；App经V1.4 OTA查询，不订阅业务OTA Topic','topics':['{productID}/{deviceID}/mcu/version','{productID}/{deviceID}/mcu/ota'],'section':'10.4 T11/T12','paragraphs':[2345,2350,2352,2358]}]
            else:
                topics=[{'role':'App发布get/控制desired；订阅Shadow响应并合并reported','topics':['$aws/things/{deviceID}/shadow/get','$aws/things/{deviceID}/shadow/get/accepted','$aws/things/{deviceID}/shadow/get/rejected','$aws/things/{deviceID}/shadow/update','$aws/things/{deviceID}/shadow/update/accepted','$aws/things/{deviceID}/shadow/update/rejected'],'section':'10.3三端Topic表；10.4 T01–T06；异常与重连','paragraphs':[2259,2266,2273,2280,2295,2306,2420]}]
                if n in controls | {60,70,71,73}:
                    ambiguities.append('原范围/V1.4使用property/set、property/update、property/get、service/call或事件的语义称谓；MQTT唯一依据V1.6第10章已替换为Classic Shadow及原产品动作字段，不能创建平行property/service/event Topic。')
                if n==71:
                    topics.append({'role':'设备notice→云端消费；App不直接订阅，客户端告警结果通道需确认','topics':['{productID}/{deviceID}/notice'],'section':'10.4 T08；10.5 App边界','paragraphs':[2324,2329,2371]})
                    ambiguities.append('V1.6禁止App订阅notice；原产品告警属性映射/已有消息结果通道尚需确认，不擅加REST告警接口。')
        references=[dict(apis[aid],relationship='原始范围显式引用') for aid in direct]
        for aid in contextual.get(n,[]):
            if aid not in direct: references.append(dict(apis[aid],relationship='相邻流程上下文；不代表本地交互新增HTTP请求'))
        if n in {94,95}:
            other='OTA-05' if n==94 else 'OTA-04'
            references.append(dict(apis[other],relationship='V1.4对应业务语义；用户已确认采用此接口',confirmationStatus='confirmed_user_2026-11-01'))
        section=next(s for a,b,s in sections if a<=n<=b)
        # Exact XML paragraph anchors permit reopening the unmodified source DOCX.
        business=[{'document':HTTP.as_posix(),'paragraph':i+1,'text':s} for i,s in enumerate(hp[:750])
            if row['title'] in s and len(row['title'])>2 and i>300][:5]
        row.update({'category':category,'owner':owner,'platforms':['Android','iOS']+(['共享RN'] if 'RN' in owner or 74<=n<=83 else []),
            'page':screen,'httpReferences':references,'httpBoundary':'无独立REST；仅本地交互或已列上下文' if not direct else '仅本条列出的已授权业务接口；HTTP由原生服务封装',
            'businessReferences':business,'businessSectionHint':section,
            'mqttReferences':[dict(t,document=MQTT.as_posix()) for t in topics],
            'uiReferences':ui_matches,'legacyReferences':legacy,
            'acceptanceScenarios':[{'id':row['id']+'-OBS','scenario':outcome,'expectedObservableOutcome':outcome,'status':'未验收','evidence':[]}],
            'sourceConfidence':{'scope':'已核对原始单元格','http':'V1.4 XML章节与索引已核对' if references else '本地/架构条目，无独立HTTP',
                'mqtt':'V1.6第10章已核对；具体产品报文待硬件联调' if topics else '不直接适用',
                'ui':'本地页面名称已关联；线上版本待核对' if ui_matches else '专属图缺失，待核对'},
            'ambiguities':ambiguities,'implementationStatus':'未据本映射判定','acceptanceStatus':'未验收'})
        row['verificationLayers']={
            'androidEmulator':'未验收：界面、输入、导航、权限及可注入异常；模拟结果不能替代设备执行',
            'ios':'未验收：独立构建、运行、视觉与平台能力验证',
            'realHTTP':'未验收：授权测试对象上验证请求与真实业务结果' if references else '本行无独立HTTP；上下文按相关条目验收',
            'hardware':'未验收：BLE扫描/配网与真实设备结果需手机和模组' if 46<=n<=58 else '未验收：真实设备属性、动作或升级结果' if n in controls or 60<=n<=73 or 91<=n<=95 else '无直接硬件验收点；云端/页面结果按本条场景验证',
            'cloudScheduler':'未验收：需云端nextExecutionAt/DST/离线App触发证据；不在本仓库创建后端' if n in {82,83} else '不直接适用'}
        if n in {94,95}:
            row['apiIDResolution']={'confirmationStatus':'confirmed_user_2026-11-01','preserveWorkbook':True,'originalScopeID':direct[0],'effectiveV14ID':'OTA-05' if n==94 else 'OTA-04','decision':'按V1.4正文绑定，仅记录范围表编号差异；不修改xlsx'}
        items.append(row)
    assert {x['id'] for x in items}=={f'S{i:03}' for i in range(1,112)}
    for item in items:
        for u in item['uiReferences']:
            if u['metadataPath']: assert (ROOT/u['metadataPath']).exists()
            if u['imagePath']: assert (ROOT/u['imagePath']).exists()
        for a in item['httpReferences']:
            assert hp[a['indexParagraph']-1]==a['id']
            assert hp[a['indexParagraph']+1]==a['method']
            assert hp[a['indexParagraph']+2]==a['path']
        for t in item['mqttReferences']:
            for topic in t['topics']: assert any(topic in s for s in mp),topic
    summary={'scopeItems':len(items),'uiExports':len(ui),'additionalStandaloneUIExports':len(standalone_ui),'itemsWithLocalUI':sum(bool(x['uiReferences']) for x in items),
        'itemsWithoutDedicatedLocalUI':sum(not x['uiReferences'] for x in items),
        'uniqueMatchedUIExports':len({u['metadataPath'] or u['imagePath'] for x in items for u in x['uiReferences']}),
        'itemsWithHTTPReferences':sum(bool(x['httpReferences']) for x in items),
        'itemsWithMQTTReferences':sum(bool(x['mqttReferences']) for x in items),
        'scopeVsHTTPIDConflicts':['S094','S095'],'scopeVsHTTPIDResolution':'两项均已获用户确认按V1.4正文绑定，原表未修改','onlineVersionVerified':0,'passedImplementationOrAcceptance':0}
    return {'schemaVersion':1,'reviewedOn':'2026-11-01','scope':SCOPE.as_posix(),
        'scopeSha256':hashlib.sha256((ROOT/SCOPE).read_bytes()).hexdigest(),
        'method':'原范围逐行保留；人工逐条分类/责任/场景，V1.4与V1.6第10章XML引用机械校验；UI按本地页名关联，未声称视觉/线上版本已验收',
        'cellSchema':{'A':'ID','B':'分组合并格向下承接','C':'流程','D':'标题','E':'原始要求','F':'优先级'},
        'headerDiscrepancy':'工作簿表头与实际A–F内容未完全对齐；采用实际物理单元格并保留sourceRow/sourceCells，不修改原表。',
        'sourceParagraphConvention':'paragraph为word/document.xml所有w:p按文档顺序1起计（包含表格）；不等同Word页码。API索引与详细章节均来源V1.4。',
        'boundaries':['范围唯一依据xlsx；PRD/UI/旧源码只补充范围内细节。','V1.6仅第10章MQTT有效；非MQTT内容不得覆盖V1.4。','157份UI不是157项已授权功能；图例可能仅关联视觉，不授权其额外交互。','S082/S083服务端职责仅跟踪客户端接入及云端联调，不授权新建后端。','本文件只核对来源；无实现通过、UI通过、接口通过或硬件验收结论。'],
        'summary':summary,'items':items,'unmatchedUIExports':[u for u in ui if u['metadataPath'] not in {v['metadataPath'] for x in items for v in x['uiReferences']}],
        'verification':{'all111IDsUnique':True,'referencedPathsExist':True,'apiIDMethodPathPresentInV14XML':True,'mqttTopicsPresentInV16XML':True}}

def main():
    data=build()
    (ROOT/'docs/SDD/重构范围映射核对.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    lines=['# 重构范围逐项映射（111项）','','日期：2026-11-01。仅为来源核对与验收场景索引，不表示实现、联调、视觉或硬件通过。完整原始单元格、精确引用及待核对项见 [核对JSON](重构范围映射核对.json)。','','唯一范围为 `docs/prd/智能家居物联网项目计划&需求范围.xlsx`。A为ID、B为合并分组、C流程、D标题、E要求、F优先级；原表头与内容不完全对齐，保留物理单元格，不改源表。HTTP/App取V1.4；MQTT取V1.6第10章。旧源码只作对照。JSON中的paragraph按DOCX XML全部w:p顺序从1计数（含表格），不是Word页码。','','所有UI均为本地导出关联；未核实蓝湖线上版本、图层标注或像素参数。未匹配专属图的项目保留视觉待核对。全局分享中心、个人资料、反馈、产品手册完整流程等导出不能自动扩展本表范围。','','需要明确处理的来源差异：','','- **S094/S095**：原范围写OTA-04查询、OTA-05取消；V1.4索引与详章相反：OTA-04为DELETE `/api/app/devices/{deviceID}/ota/task`取消，OTA-05为GET `/api/app/devices/{deviceID}/ota/task/{taskID}`查询。用户已于2026-11-01明确按V1.4正文绑定：S094使用OTA-05查询，S095使用OTA-04取消；仅记录原表编号差异，不修改xlsx。','- MQTT原范围/V1.4中的property/service/event称谓只保留业务语义。V1.6第10章明确用AWS Classic Shadow get/update及原产品动作字段替换，App不可创建平行property/set、service/call或event/post Topic。desired被云端接受不等于设备reported确认。','- S071中notice由云端消费，App不直接订阅；原产品告警映射及已有消息结果通道仍待确认，不新增REST接口。','- S101删除房间设备迁移规则、S102乐观锁字段/错误码、产品属性及一次性动作字典/真实报文仍待核对。','- S034 Store仅占位；S035 Mine完整页面、S109首页布局未冻结。S082/S083属于服务端，仅列客户端接入、夏令时及App离线执行联调，不新建后端。','','| 范围 / 原表行 | 类别 / 页面归属 | V1.4接口（完整方法路径见JSON） | MQTT | 本地UI名称（路径见JSON） | 具体可观察结果 |','| --- | --- | --- | --- | --- | --- |']
    for x in data['items']:
        direct=[a['id'] for a in x['httpReferences'] if a['relationship']=='原始范围显式引用']
        ctx=[a['id'] for a in x['httpReferences'] if a['relationship']!='原始范围显式引用']
        api=', '.join(direct) or '无独立REST'
        if ctx: api+='；上下文 '+', '.join(ctx)
        if x.get('apiIDResolution'): api+='；已确认实际绑定 '+x['apiIDResolution']['effectiveV14ID']
        ui='；'.join(u['name'] for u in x['uiReferences'][:3])
        if len(x['uiReferences'])>3:ui+=f' 等{len(x["uiReferences"])}图'
        if not ui:ui='专属图待核对'
        mqtt='V1.6 §10；详见JSON' if x['mqttReferences'] else '—'
        lines.append(f'| {x["id"]} / {x["sourceRow"]} {x["title"]} | {x["category"]} / {x["owner"]} / {x["page"]} | {api} | {mqtt} | {ui} | {x["acceptanceScenarios"][0]["expectedObservableOutcome"]} |')
    lines+=['','核对统计：`'+json.dumps(data['summary'],ensure_ascii=False)+'`。','','校验：S001–S111唯一且完整；所有本地引用路径存在；API编号、方法、路径真实出现在V1.4 XML索引；MQTT Topic真实出现在V1.6 XML。运行 `python docs/tools/refactor_scope_mapping.py` 可重建两份映射文件。实现与验收统计仍须使用实际代码、构建、设备及联调证据。']
    (ROOT/'docs/SDD/重构范围逐项映射.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
    print(json.dumps(data['summary'],ensure_ascii=False))

if __name__=='__main__':main()

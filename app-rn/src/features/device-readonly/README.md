# 定时与固件只读页面（当前major 3，保留major 2只读语义）

本批只通过当前native observation句柄读取已授权设备的定时摘要与可用固件信息。没有定时创建/编辑/启停/删除、OTA启动/取消、动作字典映射、HTTP/MQTT/BLE、登录态或存储。WineCabinet控制组件仍未接线，不把本页当完整控制或固件升级验收。

## 契约与数据

输入Spec为 `src/host/specs/NativeRowanHost.ts`，新方法：

- `getDeviceSchedules(observationId: string): Promise<Array<DeviceScheduleSummary>>`
- `getDeviceFirmware(observationId: string, kind: string): Promise<DeviceFirmwareOffer>`，kind仅mcu/wifi。

Summary只有itemKey/name/type/startTime/repeatType/weekdays/timeZone/nextExecutionAt/enabledState。itemKey仅作为当前观察下的FlatList展示键，不用作写操作授权；未知枚举显示未知，空weekdays不推导为每天。nextExecutionAt和timeZone直接展示native提供的服务端文本，不计算执行时间或改变时区语义。

FirmwareOffer只有kind/version/remark/deviceName。明确标为可用固件信息，不表示当前设备版本、hasUpdate、最新版判断、百分比或可取消性。未知字符串不默认0或样例版本。

适配器进行字段白名单复制、唯一展示键与weekday边界验证；数据脱离Native可变数组。兼容宿主意外多给的action/mode/raw/MAC字段不进入展示state。超过1000条列表作为本地安全边界报错，不截成假空列表；未来分页需要正式契约。

## 生命周期

DeviceEntry继续持有DeviceSessionController及其原生观察；新DeviceReadController不重复observe、不释放其他所有者的观察。页面请求键绑定feature/kind/device/observation/sessionRevision；正常设备revision更新不重复读取，HTTP只读元数据不把MQTT offline/unknown作为禁止条件，也不当作真实在线permit。

一个read controller最多一个Native GET在途及一个最新待请求目的地。切页/kind/观察会立即清旧数据，旧响应/旧错误按generation丢弃；中间排队目的地被覆盖。hide、background和dispose使本地等待失效，foreground按同句柄重新读取；没有API可撤回已经发出的Native HTTP，底层时限/权限/释放取消由Native实现。返回新页面可能等待旧Native调用结束，不能把本地丢弃宣称为HTTP取消。

仅loading结束且字段校验成功后出现loaded；空数组单独empty。错误只采用固定通用文案，forbidden/失效观察不给同页重试。retry与重新读取都只调用GET。页面渲染再核对当前requestKey，避免切Wi-Fi首帧误展示旧MCU loaded/error。Android硬件返回先回设备内部页，全局返回调用native closeDevice(pageSessionId)，只传当前组件初始props的页面token；缺token不调用RPC。

## QA IDs

- 入口：rn-open-schedules、rn-open-firmware。
- 内页返回：rn-feature-back；原生返回：rn-device-close。
- 定时：rn-schedules-loading / loaded / empty / error；读取或重试：rn-schedules-retry。
- 固件：rn-firmware-loading / loaded / error；读取或重试：rn-firmware-retry。
- kind选择：rn-firmware-mcu / rn-firmware-wifi。
- 当前页面：rn-firmware-kind-mcu / rn-firmware-kind-wifi。
- 当前成功结果：rn-firmware-result-mcu / rn-firmware-result-wifi。
- 当前错误结果：rn-firmware-error-mcu / rn-firmware-error-wifi。

kind专用result/error ID只在本轮对应kind完成时出现；不是仅切换选中标签即宣称读取完成。

## 样式与检查边界

本地参考：`docs/ui/插件页-设备设置- 模组固件版本-发现新版本.png`，375×812，灰底#f1f1f1、16字号居中标题、留白与灰说明文字。原图圆环显示current version且有升级按钮，本契约没有这些已确认数据/权限，因此没有复制圆环、样例1.0.02/5.0或升级按钮；以可用版本文本卡和黑色重新读取按钮承载真实GET。没有新插画或资源副本。定时尚未发现专用export，采用相同灰底/白卡/黑字列表基础，视觉细节待设计核对。未进行装机或截图视觉验收。

版本依据：[RN0.86 FlatList](https://reactnative.dev/docs/0.86/flatlist)、[AppState](https://reactnative.dev/docs/0.86/appstate)、[BackHandler](https://reactnative.dev/docs/0.86/backhandler)，仅使用已安装0.86.3核心primitives和现有依赖。

本批先观察controller/presentation缺模块RED，再实现20项新纯测试；完整套件含既有57项。最终lint/typecheck/Vitest单worker与Codegen parser日志位于app-rn/.cache/verification/device-readonly。Root的344项Android GREEN覆盖先冻结的Spec/业务源码；其后RN页面变更要由下一次Release打包和真实只读harness确认。iOS签名/实现由Root后续对齐，Windows未做iOS编译/运行验收。

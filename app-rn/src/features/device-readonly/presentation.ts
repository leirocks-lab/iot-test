import type {DeviceFirmwareOffer} from '../../host/specs/NativeRowanHost';
import type {DeviceSessionState} from '../../host/adapter/DeviceSessionController';
import type {DeviceReadBinding} from '../../host/adapter/DeviceReadController';
import type {ReadSchedule} from '../../host/adapter/DeviceReadModels';
export function readBindingFromSession(
  state: DeviceSessionState,
  expectedDeviceId: string,
): DeviceReadBinding | undefined {
  const s = state.snapshot;
  if (
    state.loading ||
    state.error ||
    !s ||
    s.deviceId !== expectedDeviceId ||
    !s.observationId ||
    s.phase === 'closed' ||
    ['forbidden', 'not_authenticated', 'session_changed', 'closed'].includes(
      s.errorCode,
    )
  ) {
    return;
  }
  return {
    deviceId: s.deviceId,
    observationId: s.observationId,
    sessionRevision: s.sessionRevision,
  };
}
export function scheduleLabels(value: ReadSchedule) {
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return {
    name: value.name || '未命名定时',
    enabled:
      value.enabledState === 'enabled'
        ? '已启用'
        : value.enabledState === 'disabled'
          ? '未启用'
          : '状态未知',
    type:
      value.type === 'once'
        ? '单次定时'
        : value.type === 'periodic'
          ? '周期定时'
          : '类型未知',
    startTime: value.startTime || '未提供',
    repeat:
      (
        {
          once: '仅一次',
          daily: '每天',
          weekdays: '工作日',
          custom: '自定义星期',
        } as Record<string, string>
      )[value.repeatType] ?? '重复方式未知',
    weekdays: value.weekdays.length
      ? value.weekdays.map((day) => weekdays[day - 1]).join('、')
      : '星期未提供',
    timeZone: value.timeZone || '时区未提供',
    nextExecutionAt: value.nextExecutionAt || '下次执行时间未提供',
  };
}
export function firmwareLabels(value: Readonly<DeviceFirmwareOffer>) {
  return {
    kind: value.kind === 'wifi' ? 'Wi-Fi 固件' : 'MCU 固件',
    version: value.version || '未提供可用版本',
    remark: value.remark || '暂无固件说明',
    deviceName: value.deviceName || '设备名称未提供',
  };
}

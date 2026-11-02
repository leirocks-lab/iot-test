import type {DeviceSessionState} from '../host/adapter/DeviceSessionController';
export type DeviceStatus = {
  title: string;
  message: string;
  busy: boolean;
  canRetry: boolean;
};
/** Fixed copy only; neither bridge phase nor raw errors are shown to users. */
export function deviceStatus(state: DeviceSessionState): DeviceStatus {
  const s = state.snapshot;
  const result: DeviceStatus = {
    title: s?.title || '设备',
    message: '暂无设备状态',
    busy: false,
    canRetry: false,
  };
  if (state.loading) {
    return {...result, message: '正在加载设备…', busy: true};
  }
  if (state.error === 'INCOMPATIBLE_HOST') {
    return {...result, message: '宿主版本不兼容，请更新应用后重试'};
  }
  if (
    state.error === 'AUTH_REQUIRED' ||
    s?.errorCode === 'not_authenticated' ||
    s?.errorCode === 'session_changed'
  ) {
    return {...result, message: '登录状态已变化，请返回首页'};
  }
  if (s?.errorCode === 'forbidden') {
    return {...result, message: '暂无此设备的访问权限，请返回首页'};
  }
  if (s?.phase === 'closed' || s?.errorCode === 'closed') {
    return {...result, message: '设备页面已结束，请返回首页'};
  }
  if (state.resyncing) {
    return {...result, message: '正在同步设备状态…', busy: true};
  }
  if (state.error) {
    return {
      ...result,
      message: '设备状态暂不可用，请返回后重试',
      canRetry: !!s,
    };
  }
  if (!s) {
    return result;
  }
  if (s.phase === 'authorizing') {
    return {...result, message: '正在确认设备访问权限…', busy: true};
  }
  if (s.phase === 'connecting') {
    return {...result, message: '正在连接设备…', busy: true};
  }
  if (s.phase === 'recovering') {
    return {
      ...result,
      message: '连接已断开，正在恢复设备状态…',
      canRetry: true,
    };
  }
  if (s.phase === 'failed' || s.errorCode) {
    return {...result, message: '设备状态暂不可用，请重试', canRetry: true};
  }
  if (s.phase === 'reading') {
    return {...result, message: '正在读取设备状态…', busy: true};
  }
  if (s.stale) {
    return {
      ...result,
      message: '设备状态需要更新，当前显示为上次记录',
      canRetry: true,
    };
  }
  if (!s.snapshotAvailable) {
    return {...result, message: '暂无设备状态', canRetry: true};
  }
  return {
    ...result,
    message:
      s.online === 'online'
        ? '设备在线'
        : s.online === 'offline'
          ? '设备离线'
          : '设备在线状态未知',
    canRetry: s.online !== 'online',
  };
}

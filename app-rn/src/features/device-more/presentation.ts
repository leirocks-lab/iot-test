import type {
  DeviceMemberSummary,
  DeviceMoreSummary,
  DeviceLocationSummary,
} from '../../host/specs/NativeRowanHost';
export function memberCounts(rows: readonly Readonly<DeviceMemberSummary>[]) {
  return rows.reduce(
    (counts, row) => {
      if (row.bindingRole === 'sa' || row.bindingRole === 'mbr') {
        counts.members++;
      } else if (row.bindingRole === 'obs') {
        counts.observers++;
      } else {
        counts.unknown++;
      }
      return counts;
    },
    {members: 0, observers: 0, unknown: 0},
  );
}
export const memberName = (member: Readonly<DeviceMemberSummary>) =>
  member.nickname || '未设置昵称';
export function roleLabel(role: string) {
  return (
    ({sa: '管理员', mbr: '普通成员', obs: '观察员'} as Record<string, string>)[
      role
    ] ?? '角色未知'
  );
}
export function locationLabel(location: Readonly<DeviceLocationSummary>) {
  if (location.assignment === 'unassigned') {
    return '未分配房间';
  }
  if (location.assignment === 'assigned') {
    return location.roomName || '房间名称未提供';
  }
  return '所属房间暂不明确';
}
export function moreLabels(summary: Readonly<DeviceMoreSummary>) {
  return {
    title:
      summary.deviceNickname ||
      summary.deviceName ||
      summary.productName ||
      '设备',
    productName: summary.productName || '未提供',
    modelName: summary.modelName || '未提供',
    seriesName: summary.seriesName || '未提供',
    category: summary.productCategory || '未提供',
    mcuVersion: summary.mcuVersion || '未提供',
    wifiVersion: summary.wifiVersion || '未提供',
    role: roleLabel(summary.bindingRole),
  };
}

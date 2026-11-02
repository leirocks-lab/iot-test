import {describe, expect, it} from 'vitest';
import {
  memberCounts,
  memberName,
  roleLabel,
  locationLabel,
  moreLabels,
} from '../../src/features/device-more/presentation';
import {
  pushReadPage,
  popReadPage,
} from '../../src/features/device-more/navigation';
describe('more read presentation', () => {
  it('excludes observers and unknown roles from the confirmed member count', () => {
    const rows = ['sa', 'mbr', 'obs', 'unknown'].map((bindingRole, i) => ({
      itemKey: String(i),
      nickname: '',
      bindingRole,
    }));
    expect(memberCounts(rows)).toEqual({
      members: 2,
      observers: 1,
      unknown: 1,
    });
    expect(memberName(rows[0])).toBe('未设置昵称');
    expect(roleLabel('unknown')).toBe('角色未知');
  });
  it('does not substitute an unknown room or firmware version with a default', () => {
    expect(locationLabel({assignment: 'unknown', roomName: ''})).toBe(
      '所属房间暂不明确',
    );
    expect(locationLabel({assignment: 'unassigned', roomName: ''})).toBe(
      '未分配房间',
    );
    const result = moreLabels({
      deviceNickname: '',
      deviceName: '',
      productName: '',
      productCategory: '',
      seriesName: '',
      modelName: '',
      mcuVersion: '',
      wifiVersion: '',
      bindingRole: 'unknown',
    });
    expect(result.title).toBe('设备');
    expect(result.mcuVersion).toBe('未提供');
    expect(result.modelName).toBe('未提供');
  });
  it('returns child pages to more and direct features to device without recreating an observation', () => {
    const more = pushReadPage([], {feature: 'more'});
    const child = pushReadPage(more, {feature: 'firmware', kind: 'mcu'});
    expect(pushReadPage(child, {feature: 'firmware', kind: 'wifi'})).toEqual([
      {feature: 'more'},
      {feature: 'firmware', kind: 'wifi'},
    ]);
    expect(popReadPage(child)).toEqual(more);
    expect(popReadPage([{feature: 'schedules'}])).toEqual([]);
  });
});

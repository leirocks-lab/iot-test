import {describe, expect, it} from 'vitest';
import {
  projectMoreSummary,
  projectMembers,
  projectHelp,
  projectLocation,
} from '../../src/host/adapter/DeviceMoreModels';

const summary = {
  deviceNickname: '',
  deviceName: '',
  productName: '产品',
  productCategory: '',
  seriesName: '',
  modelName: '',
  mcuVersion: '',
  wifiVersion: '',
  bindingRole: 'sa',
};
describe('more read DTO boundaries', () => {
  it('keeps absent metadata empty and whitelists the nine summary fields', () => {
    const result = projectMoreSummary({
      ...summary,
      mac: 'private',
      online: true,
      raw: {token: 'private'},
    });
    expect(result).toEqual(summary);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.mcuVersion).toBe('');
  });
  it('normalizes unknown roles without inventing a permission', () => {
    expect(
      projectMoreSummary({...summary, bindingRole: 'owner'}).bindingRole,
    ).toBe('unknown');
    expect(
      projectMembers([{itemKey: 'local', nickname: '', bindingRole: ''}])[0]
        .bindingRole,
    ).toBe('unknown');
  });
  it('keeps unnamed and separate conflicting relationship rows without contact fallback', () => {
    const rows = [
      {
        itemKey: 'local-1',
        nickname: '',
        bindingRole: 'sa',
        userID: 'same-private',
        email: 'private@example.test',
      },
      {
        itemKey: 'local-2',
        nickname: '',
        bindingRole: 'mbr',
        userID: 'same-private',
        mobile: 'private',
      },
    ];
    const result = projectMembers(rows);
    rows[0].nickname = 'changed';
    expect(result).toEqual([
      {itemKey: 'local-1', nickname: '', bindingRole: 'sa'},
      {itemKey: 'local-2', nickname: '', bindingRole: 'mbr'},
    ]);
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('requires arrays and unique nonempty local keys instead of turning bad responses into empty lists', () => {
    for (const bad of [
      undefined,
      {},
      [{itemKey: '', nickname: '', bindingRole: 'sa'}],
      [
        {itemKey: 'a', nickname: '', bindingRole: 'sa'},
        {itemKey: 'a', nickname: '', bindingRole: 'mbr'},
      ],
    ]) {
      expect(() => projectMembers(bad)).toThrow();
    }
    expect(projectMembers([])).toEqual([]);
  });
  it('retains text articles but drops raw IDs and URL fields', () => {
    const result = projectHelp([
      {
        itemKey: 'article',
        title: '',
        content: '文字 https://example.test',
        createdAt: '',
        id: 'private',
        url: 'private',
      },
    ]);
    expect(result).toEqual([
      {
        itemKey: 'article',
        title: '',
        content: '文字 https://example.test',
        createdAt: '',
      },
    ]);
    expect(projectHelp([])).toEqual([]);
    expect(() =>
      projectHelp([{itemKey: 'a', title: '', content: null, createdAt: ''}]),
    ).toThrow();
  });
  it('never turns missing location or an unknown assignment into unassigned', () => {
    expect(projectLocation({assignment: 'unknown', roomName: ''})).toEqual({
      assignment: 'unknown',
      roomName: '',
    });
    expect(
      projectLocation({assignment: 'new-status', roomName: ''}).assignment,
    ).toBe('unknown');
    expect(() => projectLocation(undefined)).toThrow();
    expect(() => projectLocation({})).toThrow();
    expect(
      projectLocation({assignment: 'unassigned', roomName: ''}).assignment,
    ).toBe('unassigned');
    expect(
      projectLocation({
        assignment: 'assigned',
        roomName: '客厅',
        id: 'private',
      }),
    ).toEqual({assignment: 'assigned', roomName: '客厅'});
  });
  it('rejects missing or wrongly typed required text and oversized lists', () => {
    expect(() =>
      projectMoreSummary({...summary, modelName: undefined}),
    ).toThrow();
    expect(() =>
      projectMembers([{itemKey: 'a', nickname: 7, bindingRole: 'sa'}]),
    ).toThrow();
    expect(() =>
      projectHelp(
        Array.from({length: 1001}, (_, i) => ({
          itemKey: String(i),
          title: '',
          content: '',
          createdAt: '',
        })),
      ),
    ).toThrow();
  });
});

import {describe, expect, it} from 'vitest';
import {buildWineCabinetViewModel, createControlIntent, nextNumericTarget, displayTemperature} from '../../src/features/device-control/view-model';
import type {WineCabinetInput, ControlCapability, CommandFeedback} from '../../src/features/device-control/types';

const context = {resourceId: 'resource-a', accountRevision: 3, connectionEpoch: 5};
const boolean = (bindingId: string, requiresPower = true): ControlCapability => ({
  kind: 'boolean', bindingId, permission: 'allowed', writable: true, requiresPower, conflictsWithChildLock: true,
});
const input = (): WineCabinetInput => ({
  context, title: '酒柜', connection: 'online', loading: false, temperatureUnit: 'F', canChangeTemperatureUnit: true,
  capabilities: {
    power: {...boolean('verified-power', false), conflictsWithChildLock: false},
    childLock: {...boolean('verified-lock', false), conflictsWithChildLock: false},
    light: boolean('verified-light'),
    leftTemperature: {kind: 'number', bindingId: 'verified-left-target', permission: 'allowed', writable: true,
      requiresPower: true, conflictsWithChildLock: true, min: 30, max: 60, step: 1, unit: '°F', temperatureUnit: 'F'},
    rightTemperature: {kind: 'number', bindingId: 'verified-right-target', permission: 'allowed', writable: true,
      requiresPower: true, conflictsWithChildLock: true, min: 30, max: 60, step: 1, unit: '°F', temperatureUnit: 'F'},
  },
  reported: {power: true, childLock: false, light: true, leftTemperature: 32, rightTemperature: 35},
  currentTemperature: {left: {value: 10, unit: 'C'}, right: {value: null, unit: 'F'}},
  operatingLabel: '制冷中', commands: [], alarms: [],
});
const feedback = (sequence: number, phase: CommandFeedback['phase'], target = 40): CommandFeedback => ({
  context, control: 'leftTemperature', sequence, phase, target,
});

describe('controlled wine cabinet adapter', () => {
  it('never invents zero, false or a field mapping for missing readings', () => {
    const data = input(); data.capabilities = null; data.reported = {};
    const vm = buildWineCabinetViewModel(data);
    expect(vm.mappingWarning).toContain('产品能力');
    expect(vm.controls.leftTemperature.valueText).toBe('--');
    expect(vm.controls.leftTemperature.value).toBeNull();
    expect(vm.controls.power.value).toBeNull();
    expect(vm.controls.power.disabled).toBe(true);
    expect(createControlIntent(data, 'power', true)).toBeNull();
  });
  it('uses only supplied normalized booleans, never guesses wire 1/0 meanings', () => {
    const data = input(); data.reported.power = 1;
    expect(buildWineCabinetViewModel(data).controls.power.value).toBeNull();
    expect(createControlIntent(data, 'power', false)).toBeNull();
  });
  it('keeps reported values while a newer target is waiting for confirmation', () => {
    const data = input(); data.commands = [feedback(1, 'targetReached', 34), feedback(2, 'cloudAccepted', 40)];
    const control = buildWineCabinetViewModel(data).controls.leftTemperature;
    expect(control.valueText).toBe('32');
    expect(control.pendingTargetText).toBe('40');
    expect(control.commandLabel).toContain('等待设备');
    expect(control.commandLabel).not.toContain('成功');
    expect(nextNumericTarget(data, 'leftTemperature', 1)).toBe(41);
  });
  it('chooses the highest target sequence regardless of callback arrival order', () => {
    const data = input(); data.commands = [feedback(5, 'sending', 39), feedback(4, 'targetReached', 40)];
    expect(buildWineCabinetViewModel(data).controls.leftTemperature.pendingTargetText).toBe('39');
    data.commands = [feedback(4, 'targetReached', 40), feedback(5, 'rejected', 39)];
    const vm = buildWineCabinetViewModel(data);
    expect(vm.controls.leftTemperature.pendingTargetText).toBeNull();
    expect(vm.controls.leftTemperature.commandLabel).toContain('失败');
    expect(vm.controls.leftTemperature.valueText).toBe('32');
  });
  it('does not accept old account, device or connection command feedback', () => {
    const data = input(); data.commands = [
      {...feedback(9, 'cloudAccepted'), context: {...context, accountRevision: 2}},
      {...feedback(10, 'cloudAccepted'), context: {...context, connectionEpoch: 4}},
      {...feedback(11, 'cloudAccepted'), context: {...context, resourceId: 'other'}},
    ];
    expect(buildWineCabinetViewModel(data).controls.leftTemperature.pendingTargetText).toBeNull();
  });
  it('does not report a confirmed command as success or synthesize its target as reported', () => {
    const data = input(); data.commands = [feedback(3, 'targetReached', 40)];
    const view = buildWineCabinetViewModel(data).controls.leftTemperature;
    expect(view.commandLabel).toBe('目标状态已到达');
    expect(view.valueText).toBe('32');
    expect(view.pendingTargetText).toBeNull();
  });
  it('ends spinners and restores only last reported display on unknown/rejected', () => {
    for (const phase of ['unknown', 'rejected'] as const) {
      const data = input(); data.commands = [feedback(3, phase)];
      const view = buildWineCabinetViewModel(data).controls.leftTemperature;
      expect(view.busy).toBe(false);
      expect(view.valueText).toBe('32');
      expect(view.pendingTargetText).toBeNull();
    }
  });
  it('disables conflict controls when child lock is confirmed and keeps unlock available', () => {
    const data = input(); data.reported.childLock = true;
    const vm = buildWineCabinetViewModel(data);
    expect(vm.controls.leftTemperature.disabledReason).toContain('童锁');
    expect(vm.controls.childLock.disabled).toBe(false);
    expect(createControlIntent(data, 'leftTemperature', 40)).toBeNull();
    expect(createControlIntent(data, 'childLock', false)?.value).toBe(false);
  });
  it('honors explicit power conflict flags and native permission', () => {
    const data = input(); data.reported.power = false;
    expect(buildWineCabinetViewModel(data).controls.light.disabledReason).toContain('关机');
    expect(buildWineCabinetViewModel(data).controls.power.disabled).toBe(false);
    data.capabilities!.power!.permission = 'denied';
    expect(createControlIntent(data, 'power', true)).toBeNull();
  });
  it('offline/loading/unknown connections never enable writes or render waiting as success', () => {
    for (const connection of ['offline', 'connecting', 'unknown'] as const) {
      const data = input(); data.connection = connection; data.commands = [feedback(3, 'cloudAccepted')];
      const vm = buildWineCabinetViewModel(data);
      expect(vm.controls.leftTemperature.disabled).toBe(true);
      expect(vm.controls.leftTemperature.busy).toBe(false);
      expect(vm.controls.leftTemperature.pendingTargetText).toBeNull();
      expect(createControlIntent(data, 'power', false)).toBeNull();
    }
    const data = input(); data.loading = true;
    expect(buildWineCabinetViewModel(data).statusLabel).toContain('加载');
    expect(createControlIntent(data, 'power', false)).toBeNull();
  });
  it('validates finite ranges, bounds, step alignment and unsupported temperature units', () => {
    const data = input();
    for (const value of [NaN, Infinity, 29, 61, 30.5, '40']) expect(createControlIntent(data, 'leftTemperature', value)).toBeNull();
    expect(createControlIntent(data, 'leftTemperature', 40)?.bindingId).toBe('verified-left-target');
    expect(nextNumericTarget(data, 'leftTemperature', -1)).toBe(31);
    data.reported.leftTemperature = 30;
    expect(nextNumericTarget(data, 'leftTemperature', -1)).toBeNull();
    data.temperatureUnit = 'C';
    expect(createControlIntent(data, 'leftTemperature', 40)).toBeNull();
    data.temperatureUnit = 'F';
    Object.assign(data.capabilities!.leftTemperature!, {step: 0});
    expect(buildWineCabinetViewModel(data).controls.leftTemperature.disabled).toBe(true);
  });
  it('rejects invalid numeric readings rather than coercing null/string to zero', () => {
    for (const value of [null, undefined, '', '32', NaN, Infinity, -1]) {
      const data = input(); data.reported.leftTemperature = value;
      expect(buildWineCabinetViewModel(data).controls.leftTemperature.valueText).toBe('--');
      expect(nextNumericTarget(data, 'leftTemperature', 1)).toBeNull();
    }
  });
  it('formats temperature only when both source and selected units are explicit', () => {
    expect(displayTemperature({value: 10, unit: 'C'}, 'F')).toBe('50');
    expect(displayTemperature({value: 50, unit: 'F'}, 'C')).toBe('10');
    expect(displayTemperature({value: null, unit: 'C'}, 'F')).toBe('--');
    expect(displayTemperature({value: '10', unit: 'C'}, 'F')).toBe('--');
    expect(displayTemperature({value: 10, unit: 'C'}, null)).toBe('--');
    expect(buildWineCabinetViewModel(input()).currentTemperature.right).toBe('--');
  });
  it('validates enum choices supplied by capability instead of inventing modes/colors', () => {
    const data = input(); data.capabilities!.mode = {kind: 'enum', bindingId: 'verified-mode', permission: 'allowed',
      writable: true, requiresPower: true, conflictsWithChildLock: true, choices: [{value: 'eco', label: '节能'}]};
    data.reported.mode = 'eco';
    expect(createControlIntent(data, 'mode', 'cool')).toBeNull();
    expect(createControlIntent(data, 'mode', 'eco')?.value).toBe('eco');
    expect(buildWineCabinetViewModel(data).controls.mode.valueText).toBe('节能');
  });
  it('preserves explicit alarm context and never infers recovery from missing messages', () => {
    const data = input(); data.alarms = [{id: 'e-1', code: 'E9', message: '传感器异常', occurredAt: '2026-11-01T12:00:00Z', active: null}];
    const vm = buildWineCabinetViewModel(data);
    expect(vm.alarms).toEqual(data.alarms);
    expect(vm.alarms[0].active).toBeNull();
  });
  it('does not mutate caller input and binds requests to full native context', () => {
    const data = input(); const before = JSON.stringify(data);
    const intent = createControlIntent(data, 'leftTemperature', 40);
    expect(intent).toEqual({context, control: 'leftTemperature', bindingId: 'verified-left-target', value: 40, unit: '°F'});
    expect(JSON.stringify(data)).toBe(before);
  });
  it('honors an explicit native disabled reason even when the capability is writable', () => {
    const data = input(); data.capabilities!.light!.disabledReason = '设备维护中';
    expect(buildWineCabinetViewModel(data).controls.light.disabledReason).toBe('设备维护中');
    expect(createControlIntent(data, 'light', false)).toBeNull();
  });
  it('does not resubmit a pending one-shot maintenance operation', () => {
    const data = input(); data.capabilities!.cleaningReset = {kind: 'action', bindingId: 'verified-reset',
      permission: 'allowed', writable: true, requiresPower: false, conflictsWithChildLock: false};
    expect(createControlIntent(data, 'cleaningReset', 'trigger', context)?.value).toBe('trigger');
    data.commands = [{context, control: 'cleaningReset', sequence: 1, target: 'trigger', phase: 'cloudAccepted'}];
    expect(createControlIntent(data, 'cleaningReset', 'trigger', context)).toBeNull();
  });
  it('rejects inconsistent semantic kinds and missing temperature unit metadata', () => {
    const data = input(); const temp = data.capabilities!.leftTemperature!;
    if (temp.kind !== 'number') {throw new Error('Invalid numeric test fixture');}
    data.capabilities!.power = temp;
    expect(createControlIntent(data, 'power', 40)).toBeNull();
    data.capabilities!.leftTemperature = {...temp, temperatureUnit: undefined};
    expect(createControlIntent(data, 'leftTemperature', 40)).toBeNull();
    expect(buildWineCabinetViewModel(data).controls.leftTemperature.unit).toBe('');
  });
  it('does not let an older sending duplicate restart terminal feedback for the same intent', () => {
    const data = input(); data.commands = [feedback(2, 'unknown'), feedback(2, 'sending')];
    expect(buildWineCabinetViewModel(data).controls.leftTemperature.busy).toBe(false);
    expect(buildWineCabinetViewModel(data).controls.leftTemperature.commandLabel).toContain('未知');
  });
  it('requires reset confirmation bound to the current device, account and connection', () => {
    const data = input(); data.capabilities!.cleaningReset = {kind: 'action', bindingId: 'verified-reset',
      permission: 'allowed', writable: true, requiresPower: false, conflictsWithChildLock: false};
    expect(createControlIntent(data, 'cleaningReset', 'trigger')).toBeNull();
    for (const old of [{...context, resourceId: 'old'}, {...context, accountRevision: 2}, {...context, connectionEpoch: 4}]) {
      expect(createControlIntent(data, 'cleaningReset', 'trigger', old)).toBeNull();
    }
    expect(createControlIntent(data, 'cleaningReset', 'trigger', context)?.value).toBe('trigger');
  });
});

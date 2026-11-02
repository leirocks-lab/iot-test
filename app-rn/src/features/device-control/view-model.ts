import type {
  CommandFeedback, ControlCapability, ControlId, ControlIntent, ControlValue, DeviceControlContext,
  TemperatureReading, TemperatureUnit, WineCabinetInput,
} from './types';

export const controlIds: readonly ControlId[] = ['power', 'childLock', 'light', 'lightColor', 'brightness',
  'leftTemperature', 'rightTemperature', 'targetHumidity', 'mode', 'mute', 'cleaningReset'];

export interface ControlViewModel {
  capability: ControlCapability | null;
  value: ControlValue | null;
  valueText: string;
  unit: string;
  disabled: boolean;
  disabledReason: string | null;
  pendingTargetText: string | null;
  busy: boolean;
  commandLabel: string | null;
  failed: boolean;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const sameContext = (a: DeviceControlContext, b: DeviceControlContext) => a.resourceId === b.resourceId &&
  a.accountRevision === b.accountRevision && a.connectionEpoch === b.connectionEpoch;
const contextValid = (value: DeviceControlContext) => !!value.resourceId.trim() &&
  Number.isSafeInteger(value.accountRevision) && value.accountRevision >= 0 &&
  Number.isSafeInteger(value.connectionEpoch) && value.connectionEpoch >= 0;
const pending = (command: CommandFeedback) => ['sending', 'sent', 'cloudAccepted'].includes(command.phase);
const phaseRank = {sending: 0, sent: 1, cloudAccepted: 2, targetReached: 3, rejected: 4, unknown: 5};
const numberText = (value: number) => Number(value.toPrecision(12)).toString();
const allowedKinds: Record<ControlId, readonly ControlCapability['kind'][]> = {
  power: ['boolean'], childLock: ['boolean'], light: ['boolean'], mute: ['boolean'],
  leftTemperature: ['number'], rightTemperature: ['number'], targetHumidity: ['number'],
  lightColor: ['enum'], mode: ['enum'], brightness: ['number', 'enum'], cleaningReset: ['action'],
};

function capabilityValid(capability: ControlCapability | null, input: WineCabinetInput, id: ControlId): boolean {
  if (!capability?.bindingId.trim()) {return false;}
  if (!allowedKinds[id].includes(capability.kind)) {return false;}
  if (capability.kind === 'number') {
    if (![capability.min, capability.max, capability.step].every(finite) || capability.min > capability.max || capability.step <= 0 || !capability.unit.trim()) {return false;}
    if (capability.temperatureUnit && capability.temperatureUnit !== input.temperatureUnit) {return false;}
    if (['leftTemperature', 'rightTemperature'].includes(id) &&
      (!capability.temperatureUnit || capability.unit !== `°${input.temperatureUnit}`)) {return false;}
  }
  if (capability.kind === 'enum') {
    const values = capability.choices.map(choice => choice.value);
    if (!values.length || values.some(value => typeof value !== 'string' && !finite(value)) || new Set(values).size !== values.length ||
      capability.choices.some(choice => !choice.label.trim())) {return false;}
  }
  return true;
}

function validValue(capability: ControlCapability, value: unknown, aligned: boolean): value is ControlValue {
  switch (capability.kind) {
    case 'boolean': return typeof value === 'boolean';
    case 'action': return value === 'trigger';
    case 'enum': return capability.choices.some(choice => choice.value === value);
    case 'number': {
      if (!finite(value) || value < capability.min - 1e-9 || value > capability.max + 1e-9) {return false;}
      const steps = (value - capability.min) / capability.step;
      return !aligned || Math.abs(steps - Math.round(steps)) < 1e-7;
    }
  }
}

function latestCommand(input: WineCabinetInput, id: ControlId): CommandFeedback | null {
  let latest: CommandFeedback | null = null;
  for (const command of input.commands) {
    if (command.control !== id || !sameContext(command.context, input.context) ||
      !Number.isSafeInteger(command.sequence) || command.sequence < 0) {continue;}
    if (!latest || command.sequence > latest.sequence ||
      (command.sequence === latest.sequence && phaseRank[command.phase] > phaseRank[latest.phase])) {latest = command;}
  }
  return latest;
}

function formatValue(value: ControlValue | null, capability: ControlCapability | null): string {
  if (value === null) {return '--';}
  if (capability?.kind === 'enum') {return capability.choices.find(choice => choice.value === value)?.label ?? '--';}
  if (typeof value === 'boolean') {return value ? '已开启' : '已关闭';}
  return typeof value === 'number' ? numberText(value) : value;
}

function controlModel(input: WineCabinetInput, id: ControlId): ControlViewModel {
  const capability = input.capabilities?.[id] ?? null;
  const mapped = capabilityValid(capability, input, id);
  const raw = input.reported[id];
  const value = mapped && capability && validValue(capability, raw, false) && capability.kind !== 'action' ? raw : null;
  let disabledReason: string | null = null;
  if (!contextValid(input.context)) {disabledReason = '设备会话无效';}
  else if (!mapped) {disabledReason = '产品能力映射未配置或单位范围无效';}
  else if (input.loading) {disabledReason = '正在加载设备状态';}
  else if (input.errorMessage) {disabledReason = input.errorMessage;}
  else if (input.connection !== 'online') {disabledReason = input.connection === 'offline' ? '设备已离线' : '等待设备连接';}
  else if (capability!.disabledReason?.trim()) {disabledReason = capability!.disabledReason;}
  else if (capability!.permission !== 'allowed' || !capability!.writable) {disabledReason = capability!.disabledReason || '没有控制权限';}
  else if (capability!.conflictsWithChildLock && input.reported.childLock !== false) {disabledReason = input.reported.childLock === true ? '童锁已开启' : '童锁状态未知';}
  else if (capability!.requiresPower && input.reported.power !== true) {disabledReason = input.reported.power === false ? '设备已关机' : '电源状态未知';}
  else if (value === null && capability!.kind !== 'action') {disabledReason = '等待设备确认状态';}
  const command = latestCommand(input, id);
  const online = input.connection === 'online' && !input.loading && !input.errorMessage;
  const waiting = !!(command && pending(command) && online);
  if (!disabledReason && waiting && capability?.kind === 'action') {disabledReason = '操作已提交，等待设备结果';}
  const target = command && capability && mapped && validValue(capability, command.target, true) ? command.target : null;
  const labels: Record<CommandFeedback['phase'], string> = {
    sending: '发送中', sent: '已发送，等待设备确认', cloudAccepted: '云端已接受，等待设备确认',
    targetReached: '目标状态已到达', rejected: '控制失败，保留设备确认值', unknown: '结果未知，保留设备确认值',
  };
  return {
    capability, value, valueText: formatValue(value, capability), unit: mapped && capability?.kind === 'number' ? capability.unit : '',
    disabled: disabledReason !== null, disabledReason,
    pendingTargetText: waiting && target !== null ? formatValue(target, capability) : null,
    busy: waiting, commandLabel: command ? (!online && pending(command) ? '连接中断，结果未知' : labels[command.phase]) : null,
    failed: !!(command && ['rejected', 'unknown'].includes(command.phase)),
  };
}

/** Unit conversion is only for explicitly labelled measurements. Native owns target/range conversion. */
export function displayTemperature(reading: TemperatureReading | undefined, unit: TemperatureUnit | null): string {
  if (!reading || !finite(reading.value) || !unit || !['C', 'F'].includes(reading.unit)) {return '--';}
  const value = reading.unit === unit ? reading.value : unit === 'F' ? reading.value * 9 / 5 + 32 : (reading.value - 32) * 5 / 9;
  return numberText(value);
}

export function buildWineCabinetViewModel(input: WineCabinetInput) {
  const controls = Object.fromEntries(controlIds.map(id => [id, controlModel(input, id)])) as Record<ControlId, ControlViewModel>;
  const statusLabel = input.loading ? '加载设备状态…' : input.errorMessage ? '设备状态不可用' :
    input.connection === 'offline' ? '已离线' : input.connection === 'connecting' ? '正在连接…' :
    input.connection !== 'online' ? '连接状态未知' : controls.power.value === false ? '已关机' :
    controls.power.value === true ? input.operatingLabel?.trim() || '运行状态未知' : '电源状态未知';
  return {
    title: input.title.trim() || '设备', statusLabel, controls,
    mappingWarning: !controlIds.some(id => capabilityValid(input.capabilities?.[id] ?? null, input, id)) ? '产品能力映射尚未配置，暂不能控制设备' : null,
    currentTemperature: {left: displayTemperature(input.currentTemperature.left, input.temperatureUnit), right: displayTemperature(input.currentTemperature.right, input.temperatureUnit)},
    alarms: input.alarms.map(alarm => ({...alarm})),
    lit: input.connection === 'online' && !input.loading && controls.power.value === true && controls.light.value === true,
    canChangeTemperatureUnit: contextValid(input.context) && input.canChangeTemperatureUnit && !input.loading && input.connection === 'online' && !input.errorMessage,
    cleaningUsageText: input.cleaningUsage && finite(input.cleaningUsage.value) && input.cleaningUsage.value >= 0 ?
      `${numberText(input.cleaningUsage.value)} ${input.cleaningUsage.unit}` : '--',
  };
}

/** A bounded, permission-checked user intent; no optimistic reported mutation or transport call. */
export function createControlIntent(input: WineCabinetInput, control: ControlId, value: unknown, confirmationContext?: DeviceControlContext): ControlIntent | null {
  const model = controlModel(input, control);
  if (model.disabled || !model.capability || !validValue(model.capability, value, true)) {return null;}
  if (model.capability.kind === 'action' && (!confirmationContext || !sameContext(confirmationContext, input.context))) {return null;}
  return {context: {...input.context}, control, bindingId: model.capability.bindingId, value,
    ...(model.capability.kind === 'number' ? {unit: model.capability.unit} : {})};
}

/** Repeated presses advance the latest pending target, while the main number stays reported. */
export function nextNumericTarget(input: WineCabinetInput, control: ControlId, direction: -1 | 1): number | null {
  const model = controlModel(input, control);
  if (model.disabled || model.capability?.kind !== 'number') {return null;}
  const command = latestCommand(input, control);
  const base = command && pending(command) && validValue(model.capability, command.target, true) ? command.target : model.value;
  if (!finite(base)) {return null;}
  const next = Number((model.capability.min + (Math.round((base - model.capability.min) / model.capability.step) + direction) * model.capability.step).toPrecision(14));
  return validValue(model.capability, next, true) ? next : null;
}

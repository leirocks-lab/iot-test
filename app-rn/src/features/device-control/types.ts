export type ControlId = 'power' | 'childLock' | 'light' | 'lightColor' | 'brightness' |
  'leftTemperature' | 'rightTemperature' | 'targetHumidity' | 'mode' | 'mute' | 'cleaningReset';
export type ControlValue = boolean | number | string;
export type TemperatureUnit = 'C' | 'F';

export interface DeviceControlContext {
  resourceId: string;
  accountRevision: number;
  connectionEpoch: number;
}

interface CapabilityBase {
  /** Opaque native binding ID from an explicitly verified product mapping, never a guessed wire name. */
  bindingId: string;
  permission: 'allowed' | 'denied' | 'unknown';
  writable: boolean;
  requiresPower: boolean;
  conflictsWithChildLock: boolean;
  disabledReason?: string;
}
export interface BooleanCapability extends CapabilityBase {kind: 'boolean'}
export interface NumberCapability extends CapabilityBase {
  kind: 'number'; min: number; max: number; step: number; unit: string;
  /** Native supplies target values, bounds and steps in this display unit after preference changes. */
  temperatureUnit?: TemperatureUnit;
}
export interface EnumCapability extends CapabilityBase {
  kind: 'enum'; choices: readonly {value: string | number; label: string; color?: string}[];
}
export interface ActionCapability extends CapabilityBase {kind: 'action'}
export type ControlCapability = BooleanCapability | NumberCapability | EnumCapability | ActionCapability;

export interface CommandFeedback {
  context: DeviceControlContext;
  control: ControlId;
  /** Native intent sequence, increasing per control; supplied callbacks can arrive out of order. */
  sequence: number;
  target: unknown;
  phase: 'sending' | 'sent' | 'cloudAccepted' | 'targetReached' | 'rejected' | 'unknown';
  message?: string;
}
export interface TemperatureReading {value: unknown; unit: TemperatureUnit}
export interface DeviceAlarm {
  id: string; code: string; message: string; occurredAt: string;
  /** null means recovery is unknown. An absent/new unrelated event cannot clear an alarm. */
  active: boolean | null;
}
export interface WineCabinetInput {
  context: DeviceControlContext;
  title: string;
  connection: 'online' | 'offline' | 'connecting' | 'unknown';
  loading: boolean;
  errorMessage?: string;
  temperatureUnit: TemperatureUnit | null;
  canChangeTemperatureUnit: boolean;
  capabilities: Partial<Record<ControlId, ControlCapability>> | null;
  /** Native-normalized semantic values. Native owns protocol field mapping, scaling and confirmation. */
  reported: Partial<Record<ControlId, unknown>>;
  currentTemperature: {left?: TemperatureReading; right?: TemperatureReading};
  operatingLabel?: string;
  commands: readonly CommandFeedback[];
  alarms: readonly DeviceAlarm[];
  cleaningUsage?: {label: string; value: unknown; unit: string};
}
export interface ControlIntent {
  context: DeviceControlContext;
  control: ControlId;
  bindingId: string;
  value: ControlValue;
  unit?: string;
}
/** Actions describe user intent only. The host revalidates context, permissions, capability and range. */
export interface WineCabinetActions {
  onBack(): void;
  onMore(): void;
  onControl(intent: ControlIntent): void;
  onTemperatureUnitChange(unit: TemperatureUnit): void;
  onRequestCleaningResetConfirmation(context: DeviceControlContext): void;
  onCancelCleaningResetConfirmation(): void;
  onReconnect?(): void;
}
export interface WineCabinetScreenProps {
  input: WineCabinetInput;
  actions: WineCabinetActions;
  /** Native container supplies insets; no second navigation/status bar or system gesture bar is drawn. */
  insets: {top: number; bottom: number};
  /** Confirmation must be tied to the context that the user actually reviewed. */
  confirmingCleaningReset: DeviceControlContext | null;
}

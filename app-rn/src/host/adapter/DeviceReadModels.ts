import type {
  DeviceFirmwareOffer,
  DeviceScheduleSummary,
} from '../specs/NativeRowanHost';
export type ReadSchedule = Readonly<
  Omit<DeviceScheduleSummary, 'weekdays'> & {weekdays: readonly number[]}
>;
export class InvalidReadResponse extends Error {}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidReadResponse();
  }
  return value as Record<string, unknown>;
};
const text = (value: Record<string, unknown>, key: string): string => {
  const field = value[key];
  if (typeof field !== 'string') {
    throw new InvalidReadResponse();
  }
  return field;
};
/** Whitelist copies also discard unexpected raw/action/MAC fields from an incompatible host. */
export function projectSchedules(input: unknown): readonly ReadSchedule[] {
  if (!Array.isArray(input) || input.length > 1000) {
    throw new InvalidReadResponse();
  }
  const seen = new Set<string>();
  return Object.freeze(
    input.map((value) => {
      const raw = object(value),
        itemKey = text(raw, 'itemKey');
      if (!itemKey || seen.has(itemKey)) {
        throw new InvalidReadResponse();
      }
      seen.add(itemKey);
      const days = raw.weekdays;
      if (
        !Array.isArray(days) ||
        days.length > 7 ||
        days.some((day) => !Number.isSafeInteger(day) || day < 1 || day > 7) ||
        new Set(days).size !== days.length
      ) {
        throw new InvalidReadResponse();
      }
      const type = text(raw, 'type'),
        repeat = text(raw, 'repeatType'),
        enabled = text(raw, 'enabledState');
      return Object.freeze({
        itemKey,
        name: text(raw, 'name'),
        type: ['once', 'periodic'].includes(type) ? type : 'unknown',
        startTime: text(raw, 'startTime'),
        repeatType: ['once', 'daily', 'weekdays', 'custom'].includes(repeat)
          ? repeat
          : 'unknown',
        weekdays: Object.freeze(days.map(Number)),
        timeZone: text(raw, 'timeZone'),
        nextExecutionAt: text(raw, 'nextExecutionAt'),
        enabledState: ['enabled', 'disabled'].includes(enabled)
          ? enabled
          : 'unknown',
      });
    }),
  );
}
export function projectFirmware(
  input: unknown,
  kind: 'mcu' | 'wifi',
): Readonly<DeviceFirmwareOffer> {
  const raw = object(input);
  if (raw.kind !== kind) {
    throw new InvalidReadResponse();
  }
  return Object.freeze({
    kind,
    version: text(raw, 'version'),
    remark: text(raw, 'remark'),
    deviceName: text(raw, 'deviceName'),
  });
}

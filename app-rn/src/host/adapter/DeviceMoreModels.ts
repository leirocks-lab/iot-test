import type {
  DeviceMoreSummary,
  DeviceMemberSummary,
  DeviceHelpArticle,
  DeviceLocationSummary,
} from '../specs/NativeRowanHost';
import {InvalidReadResponse} from './DeviceReadModels';
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidReadResponse();
  }
  return input as Record<string, unknown>;
}
function text(raw: Record<string, unknown>, field: string): string {
  const value = raw[field];
  if (typeof value !== 'string') {
    throw new InvalidReadResponse();
  }
  return value;
}
const role = (value: string) =>
  ['sa', 'mbr', 'obs'].includes(value) ? value : 'unknown';
function rows<T>(
  input: unknown,
  project: (raw: Record<string, unknown>, itemKey: string) => T,
): readonly T[] {
  // Local memory boundary, not a backend pagination contract. Never truncate into a false success.
  if (!Array.isArray(input) || input.length > 1000) {
    throw new InvalidReadResponse();
  }
  const keys = new Set<string>();
  return Object.freeze(
    input.map((inputRow) => {
      const raw = object(inputRow),
        itemKey = text(raw, 'itemKey');
      if (!itemKey || keys.has(itemKey)) {
        throw new InvalidReadResponse();
      }
      keys.add(itemKey);
      return Object.freeze(project(raw, itemKey));
    }),
  );
}
export function projectMoreSummary(
  input: unknown,
): Readonly<DeviceMoreSummary> {
  const raw = object(input);
  return Object.freeze({
    deviceNickname: text(raw, 'deviceNickname'),
    deviceName: text(raw, 'deviceName'),
    productName: text(raw, 'productName'),
    productCategory: text(raw, 'productCategory'),
    seriesName: text(raw, 'seriesName'),
    modelName: text(raw, 'modelName'),
    mcuVersion: text(raw, 'mcuVersion'),
    wifiVersion: text(raw, 'wifiVersion'),
    bindingRole: role(text(raw, 'bindingRole')),
  });
}
export function projectMembers(
  input: unknown,
): readonly Readonly<DeviceMemberSummary>[] {
  return rows(input, (raw, itemKey) => ({
    itemKey,
    nickname: text(raw, 'nickname'),
    bindingRole: role(text(raw, 'bindingRole')),
  }));
}
export function projectHelp(
  input: unknown,
): readonly Readonly<DeviceHelpArticle>[] {
  return rows(input, (raw, itemKey) => ({
    itemKey,
    title: text(raw, 'title'),
    content: text(raw, 'content'),
    createdAt: text(raw, 'createdAt'),
  }));
}
export function projectLocation(
  input: unknown,
): Readonly<DeviceLocationSummary> {
  const raw = object(input),
    assignment = text(raw, 'assignment');
  return Object.freeze({
    assignment: ['assigned', 'unassigned'].includes(assignment)
      ? assignment
      : 'unknown',
    roomName: text(raw, 'roomName'),
  });
}

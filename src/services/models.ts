export type Language = 'zh-CN' | 'zh-TW' | 'en';
export type Role = 'sa' | 'mbr' | 'obs';
export interface BindingResult { deviceID: string; userID: string; bindingRole: Role }
export interface Settings {
  language: Language; notification: boolean; theme: 'system' | 'light' | 'dark';
  wallpaper: { id: string; name: Record<Language, string>; image: string } | null;
  homeLayout: string; temperatureUnit: 'C' | 'F'; measurementSystem: 'metric' | 'imperial';
}
export interface Room { id: string; name: string; isDefault: boolean; deviceCount?: number }
export interface Product {
  id: string; name: string; category: string; seriesName: string; modelName: string;
  image: string; connectType: string; configType: string; recommended: boolean; sort: number;
  cloudPlatform: string; bluetooth: boolean; buyLink: string;
}
export interface Attribute {
  identifier: string; type: 'number' | 'boolean' | 'enum'; writable: boolean;
  min?: number; max?: number; step?: number; unit?: string; values?: readonly string[];
}
export interface ThingModel { version: string; attributes: Attribute[]; services: { identifier: string }[]; events: { identifier: string; level: string }[] }
export interface Device {
  id: string; name: string; mac: string; thingName: string; productID: string;
  mcuVersion: string; wifiVersion: string; activatedAt: string; online: boolean;
  protocol: 'AT' | '55AA'; properties: Record<string, number | string | boolean>;
  shadowVersion: number; shadowDesired?:Record<string,unknown>; members: Record<string, { role: Role; nickname: string; roomID: string | null }>;
}
export interface DeviceView {
  deviceNickname: string; online: boolean; bindingRole: Role; bindingAt: string;
  device: Omit<Device, 'members' | 'properties'>; product: Product;
}
export interface HomeGroup { room: { id: string | null; name: string }; devices: DeviceView[] }
export interface Session { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string; userID: string; setting: Settings }
export interface Schedule {
  id: string; type: 'once' | 'periodic'; name: string; enabled: boolean;
  startTime: string; endTime?: string; repeatType: 'once' | 'daily' | 'weekdays' | 'custom';
  weekdays: number[]; mode?: string; action: Record<string, number | string | boolean>;
  timeZone: string; nextExecutionAt?: string;
}
export type ScheduleInput = Omit<Schedule, 'id'> & { id?: string };
export interface ApiEnvelope<T> { code: number; message: string; success: boolean; data: T }
export class ApiError extends Error {
  constructor(public code: number, message: string) { super(message); this.name = 'ApiError'; }
}
export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

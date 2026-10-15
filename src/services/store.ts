import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { Device, KeyValueStorage, Product, Room, Schedule, Settings } from './models';
import { ApiError } from './models';

export class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); }
  async remove(key: string) { this.values.delete(key); }
}
export const digest = (value: string) => bytesToHex(sha256(new TextEncoder().encode(value)));
export const defaultSettings = (): Settings => ({ language: 'zh-CN', notification: true, theme: 'system', wallpaper: null, homeLayout: 'layout1', temperatureUnit: 'C', measurementSystem: 'metric' });
interface Account { id: string; email: string; passwordHash: string; regionCode: string; setting: Settings; rooms: Room[]; roomVersion: number }
interface Token { userID: string; expiresAt: number; refresh: boolean }
interface Captcha { code: string; kind: string; expiresAt: number; sentAt: number }
export interface MockState {
  schemaVersion: 1; generation?:string; sequence: number; accounts: Account[]; devices: Device[];
  tokens: Record<string, Token>; captchas: Record<string, Captcha>;
  binds: Record<string, { userID: string; deviceID: string; bindingRole: 'sa' | 'mbr' }>;
  shares: Record<string, { deviceID: string; expiresAt: number; usedBy?: string }>;
  schedules: Record<string, Schedule[]>;processedCommands?:Record<string,string[]>;
  tasks: Record<string, {
    deviceID: string;
    type: 'mcu' | 'wifi';
    firmwareID: string;
    result: 'updating' | 'success' | 'failed' | 'cancelled';
    polls: number;
    startedAt?: string;
    finishedAt?: string;
  }>;
}
export const products: Product[] = [
  { id:'prd_wine', name:'ROWAN Wine Cooler', category:'WineCooler', seriesName:'RW Series', modelName:'ADD6830', image:'', connectType:'wifi', configType:'B', recommended:true, sort:1, cloudPlatform:'aws', bluetooth:true, buyLink:'' },
  { id:'prd_humidity', name:'ROWAN Dehumidifier', category:'Dehumidifier', seriesName:'RW Series', modelName:'RW-DH01', image:'', connectType:'wifi', configType:'B', recommended:true, sort:2, cloudPlatform:'aws', bluetooth:true, buyLink:'' },
];
export function seedState(): MockState {
  const member = { user_demo: { role: 'sa' as const, nickname:'Living room cooler', roomID:'room_living' } };
  return { schemaVersion:1, generation:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, sequence:10,
    accounts:[{ id:'user_demo', email:'rowan@example.com', passwordHash:digest('mock-v1:Rowan@123'), regionCode:'US', setting:defaultSettings(), rooms:[{ id:'room_living', name:'Living room', isDefault:false }, { id:'room_kitchen', name:'Kitchen', isDefault:false }], roomVersion:1 }],
    devices:[{ id:'dev_wine', name:'Wine Cooler', mac:'80a036d51aac', thingName:'dev_wine', productID:'prd_wine', mcuVersion:'1.0.0', wifiVersion:'1.0.0', activatedAt:'2026-10-07T00:00:00Z', online:true, protocol:'AT', properties:{ Power:1, TargetTemperature:12, CurrentTemperature:14, Mode:'normal', Light:0, Brightness:50, ChildLock:0, Mute:false, CleanHours:120, Alarm:'' }, shadowVersion:1, members:member }], tokens:{}, captchas:{}, binds:{}, shares:{}, schedules:{}, tasks:{} };
}
export class MockDatabase {
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(public state: MockState, private storage: KeyValueStorage) {}
  static async open(storage: KeyValueStorage) {
    const raw = await storage.get('database');
    const state = raw ? JSON.parse(raw) as MockState : seedState();
    if (state.schemaVersion !== 1 || !Array.isArray(state.accounts) || !Array.isArray(state.devices)) throw new Error('Unsupported Mock schema');
    const db = new MockDatabase(state, storage); if (!raw) await db.persist(); return db;
  }
  id(prefix: string) { return `${prefix}_${++this.state.sequence}`; }
  async persist() { await this.storage.set('database', JSON.stringify(this.state)); }
  transact<T>(work: () => T | Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const before = JSON.stringify(this.state);
      try { const value = await work(); await this.persist(); return value; }
      catch (error) { this.state = JSON.parse(before) as MockState; throw error; }
    });
    this.queue = result.catch(() => undefined); return result;
  }
  async reset() { await this.transact(() => { this.state = seedState(); }); }
  account(id: string) { const a = this.state.accounts.find(a => a.id === id); if (!a) throw new ApiError(401,'登录已失效'); return a; }
  device(id: string, userID: string, write = false) {
    const d = this.state.devices.find(d => d.id === id);
    if (!d) throw new ApiError(404,'设备不存在');
    const member = d.members[userID];
    if (!member || write && member.role === 'obs') throw new ApiError(403,'没有设备权限');
    return d;
  }
  view(d: Device, userID: string) {
    const { members, properties, shadowDesired, ...device } = d;
    const member = members[userID];
    return { deviceNickname:member.nickname, online:d.online, bindingAt:d.activatedAt, bindingRole:member.role, device, product:products.find(p=>p.id===d.productID)! };
  }
}

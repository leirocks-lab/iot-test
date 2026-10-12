import { withBudget } from '../protocol/device';
import { ApiError, type DeviceView, type Room } from './models';
import type { RowanService } from './rowan';

type Location = Awaited<ReturnType<RowanService['location']>>;
type Members = Awaited<ReturnType<RowanService['members']>>;
export interface SettingsResource<T> { value: T | null; loading: boolean; error: string }
type SavePhase = 'idle' | 'saving' | 'checking' | 'unknown' | 'saved';
interface EditState<T> { draft: T; phase: SavePhase; error: string }
export interface DeviceSettingsState {
  device: SettingsResource<DeviceView>;
  rooms: SettingsResource<Room[]>;
  location: SettingsResource<Location>;
  members: SettingsResource<Members>;
  home: SettingsResource<true>;
  name: EditState<string>;
  room: EditState<string | null | undefined>;
  roomNeedsSelection: boolean;
}
const resource = <T>(): SettingsResource<T> => ({ value: null, loading: false, error: '' });
const initial = (): DeviceSettingsState => ({
  device: resource(), rooms: resource(), location: resource(), members: resource(), home: resource(),
  name: { draft: '', phase: 'idle', error: '' },
  room: { draft: undefined, phase: 'idle', error: '' }, roomNeedsSelection: false,
});
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const permissionError = (error: unknown) => error instanceof ApiError && [401,403,404,1341,1342,1381,1382,1391,1392,1401,1402].includes(error.code);
const definite = (error: unknown) => error instanceof ApiError && [400,401,403,404,1381,1382,1391,1392,1393,1431].includes(error.code);

/** Drafts never become confirmed values until a read verifies the write. */
export class DeviceSettingsFlow {
  state = initial();
  private active = false;
  private generation = 0;
  private owner?: string;
  private revision = -1;
  private listeners = new Set<() => void>();
  private controllers = new Map<string, AbortController>();
  private unsubscribe?: () => void;
  private pendingName?: { target: string; acknowledged: boolean };
  private pendingRoom?: { target: string | null; acknowledged: boolean };

  constructor(private service: RowanService, readonly deviceID: string, private budget = 10000) {}
  onChange(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private update(patch: Partial<DeviceSettingsState>) { this.state = { ...this.state, ...patch }; for (const listener of this.listeners) listener(); }
  private current(generation = this.generation) {
    return this.active && generation === this.generation && this.owner === this.service.session?.userID && this.revision === this.service.sessionRevision;
  }
  private check(generation: number) { if (!this.current(generation)) throw new ApiError(499, '设置上下文已变更'); }
  get busy() { return this.state.home.loading || ['saving','checking'].includes(this.state.name.phase) || ['saving','checking'].includes(this.state.room.phase); }
  get writable() { return this.current() && !!this.state.device.value && !this.state.device.loading && !this.state.device.error && this.state.device.value.bindingRole !== 'obs'; }

  async start() {
    this.stop();
    const owner = this.service.session?.userID;
    if (owner !== this.owner || this.revision !== this.service.sessionRevision) {
      this.pendingName = undefined; this.pendingRoom = undefined; this.state = initial();
    }
    this.owner = owner; this.revision = this.service.sessionRevision;
    if (!owner) { this.update({ device: { ...resource(), error: '请先登录' } }); return; }
    this.active = true;
    this.unsubscribe = this.service.onSessionChange(() => {
      if (!this.current()) { this.stop(); this.pendingName = undefined; this.pendingRoom = undefined; this.update(initial()); }
    });
    // Each read catches its own failure. An unavailable members endpoint cannot hide P1.
    await Promise.all([this.loadDevice(), this.loadRooms(), this.loadLocation(), this.loadMembers()]);
  }
  stop() {
    this.active = false; this.generation++; this.unsubscribe?.(); this.unsubscribe = undefined;
    for (const controller of this.controllers.values()) controller.abort(); this.controllers.clear();
    this.state = { ...this.state,
      device: { ...this.state.device, loading: false }, rooms: { ...this.state.rooms, loading: false },
      location: { ...this.state.location, loading: false }, members: { ...this.state.members, loading: false }, home: { ...this.state.home, loading: false },
      name: { ...this.state.name, draft: this.pendingName?.target ?? this.state.device.value?.deviceNickname ?? '', phase: this.pendingName ? 'unknown' : 'idle' },
      room: { ...this.state.room, draft: this.pendingRoom ? this.pendingRoom.target : this.state.location.value?.id, phase: this.pendingRoom ? 'unknown' : 'idle' },
    };
  }
  private async request<T>(key: string, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const generation = this.generation; this.check(generation);
    const controller = new AbortController(); this.controllers.get(key)?.abort(); this.controllers.set(key, controller);
    try {
      const result = await withBudget(work, this.budget, '等待服务响应超时，请核对结果', controller.signal);
      this.check(generation); return result;
    } finally { if (this.controllers.get(key) === controller) this.controllers.delete(key); }
  }
  private async read<K extends 'device'|'rooms'|'location'|'members'|'home'>(key: K, work: (signal: AbortSignal) => Promise<NonNullable<DeviceSettingsState[K]['value']>>, apply?: (value: NonNullable<DeviceSettingsState[K]['value']>) => void) {
    if (!this.current() || this.state[key].loading) return;
    const generation = this.generation;
    this.update({ [key]: { ...this.state[key], loading: true, error: '' } });
    try {
      const value = await this.request(key, work);
      this.update({ [key]: { value, loading: false, error: '' } }); apply?.(value);
    } catch (error) {
      if (this.current(generation)) {
        this.update({ [key]: { ...this.state[key], loading: false, error: message(error) } });
        if (key === 'device' || key === 'location') this.deny(error);
      }
    }
  }
  async loadDevice() {
    if (this.pendingName) return this.reconcileName();
    const oldName = this.state.device.value?.deviceNickname;
    await this.read('device', signal => this.service.device(this.deviceID, signal), value => {
      if (this.state.name.draft === oldName || oldName === undefined) this.update({ name: { ...this.state.name, draft: value.deviceNickname } });
    });
  }
  async loadRooms() { await this.read('rooms', async signal => (await this.service.rooms(signal)).rooms); }
  async loadLocation() {
    if (this.pendingRoom) return this.reconcileRoom();
    const oldRoom = this.state.location.value?.id;
    await this.read('location', signal => this.service.location(this.deviceID, signal), value => {
      if (this.state.room.draft === oldRoom || this.state.room.draft === undefined) this.update({ room: { ...this.state.room, draft: value.id } });
    });
  }
  async loadMembers() { await this.read('members', signal => this.service.members(this.deviceID, signal)); }
  editName(draft: string) { if (!this.busy && !this.pendingName) this.update({ name: { draft, phase: 'idle', error: '' } }); }
  cancelName() { if (!this.busy && !this.pendingName) this.update({ name: { draft: this.state.device.value?.deviceNickname ?? '', phase: 'idle', error: '' } }); }
  selectRoom(draft: string | null) {
    if (this.busy || this.pendingRoom || this.state.location.loading || this.state.rooms.loading || !this.state.location.value || !this.state.rooms.value || this.state.rooms.error) return;
    if (draft !== null && !this.state.rooms.value.some(room => room.id === draft)) return;
    this.update({ room: { draft, phase: 'idle', error: '' }, roomNeedsSelection: false });
  }
  cancelRoom() { if (!this.busy && !this.pendingRoom) this.update({ room: { draft: this.state.location.value?.id, phase: 'idle', error: '' }, roomNeedsSelection: false }); }

  async saveName() {
    if (this.busy || this.pendingName) return;
    const generation = this.generation, target = this.state.name.draft.trim();
    if (!this.writable) { this.update({ name: { ...this.state.name, error: '请先读取设备并确认修改权限' } }); return; }
    if (!target) { this.update({ name: { ...this.state.name, error: '设备昵称不能为空' } }); return; }
    if (target === this.state.device.value?.deviceNickname) { this.update({ name: { draft: target, phase: 'idle', error: '' } }); return; }
    this.pendingName = { target, acknowledged: false };
    this.update({ name: { ...this.state.name, phase: 'saving', error: '' } });
    try { await this.request('write', signal => this.service.renameDevice(this.deviceID, target, signal)); this.pendingName!.acknowledged = true; }
    catch (error) {
      if (!this.current(generation)) return;
      if (definite(error)) {
        this.pendingName = undefined; this.update({ name: { ...this.state.name, phase: 'idle', error: message(error) } }); this.deny(error); return;
      }
      this.update({ name: { ...this.state.name, phase: 'unknown', error: '保存结果未知，正在读取设备核对' } });
    }
    if (this.current(generation)) await this.reconcileName();
  }
  async reconcileName() {
    const pending = this.pendingName, generation = this.generation;
    if (!pending || !this.current() || this.state.name.phase === 'checking') return;
    this.update({ name: { ...this.state.name, phase: 'checking' }, device: { ...this.state.device, loading: true, error: '' } });
    try {
      const value = await this.request('device', signal => this.service.device(this.deviceID, signal));
      const matches = value.deviceNickname === pending.target;
      this.update({ device: { value, loading: false, error: '' } });
      if (!matches && pending.acknowledged) throw new ApiError(409, '保存已响应，设备详情尚未同步，请继续核对');
      this.pendingName = undefined;
      this.update({ name: { draft: matches ? value.deviceNickname : this.state.name.draft, phase: matches ? 'saved' : 'idle', error: matches ? '' : '云端昵称与提交值不同，已读取当前值；可手动重试保存' } });
      if (matches) await this.refreshHome();
    } catch (error) {
      if (!this.current(generation)) return;
      this.update({ device: { ...this.state.device, loading: false, error: message(error) }, name: { ...this.state.name, phase: 'unknown', error: message(error) } }); this.deny(error);
    }
  }
  async saveRoom() {
    if (this.busy || this.pendingRoom) return;
    const generation = this.generation, target = this.state.room.draft;
    if (!this.writable || this.state.location.loading || this.state.rooms.loading || !this.state.location.value || this.state.location.error || !this.state.rooms.value || this.state.rooms.error || this.state.roomNeedsSelection || target === undefined || target !== null && !this.state.rooms.value.some(room => room.id === target)) {
      this.update({ room: { ...this.state.room, error: '请读取当前归属及候选房间，并重新选择有效房间' } }); return;
    }
    if (target === this.state.location.value.id) return;
    this.pendingRoom = { target, acknowledged: false }; this.update({ room: { ...this.state.room, phase: 'saving', error: '' } });
    try { await this.request('write', signal => this.service.moveDevice(this.deviceID, target, signal)); this.pendingRoom!.acknowledged = true; }
    catch (error) {
      if (!this.current(generation)) return;
      if (definite(error)) {
        this.pendingRoom = undefined; this.update({ room: { ...this.state.room, phase: 'idle', error: message(error) } }); this.deny(error);
        if (error instanceof ApiError && [1393,1431].includes(error.code)) { this.update({ roomNeedsSelection: true }); await this.loadRooms(); }
        return;
      }
      this.update({ room: { ...this.state.room, phase: 'unknown', error: '保存结果未知，正在读取所属房间核对' } });
    }
    if (this.current(generation)) await this.reconcileRoom();
  }
  async reconcileRoom() {
    const pending = this.pendingRoom, generation = this.generation;
    if (!pending || !this.current() || this.state.room.phase === 'checking') return;
    this.update({ room: { ...this.state.room, phase: 'checking' }, location: { ...this.state.location, loading: true, error: '' } });
    try {
      const value = await this.request('location', signal => this.service.location(this.deviceID, signal));
      const matches = value.id === pending.target;
      this.update({ location: { value, loading: false, error: '' } });
      if (!matches && pending.acknowledged) throw new ApiError(409, '保存已响应，所属房间尚未同步，请继续核对');
      this.pendingRoom = undefined;
      this.update({ room: { draft: matches ? value.id : this.state.room.draft, phase: matches ? 'saved' : 'idle', error: matches ? '' : '云端归属与提交值不同，已读取当前值；可手动重试保存' } });
      if (matches) await this.refreshHome();
    } catch (error) {
      if (!this.current(generation)) return;
      this.update({ location: { ...this.state.location, loading: false, error: message(error) }, room: { ...this.state.room, phase: 'unknown', error: message(error) } }); this.deny(error);
    }
  }
  private deny(error: unknown) {
    if (permissionError(error)) this.update({ device: { ...this.state.device, error: message(error) } });
  }
  async refreshHome() {
    await this.read('home', async signal => {
      const groups = await this.service.home(signal);
      const group = groups.find(group => group.devices.some(device => device.device.id === this.deviceID));
      const device = group?.devices.find(device => device.device.id === this.deviceID);
      if (!device || this.state.name.phase === 'saved' && device.deviceNickname !== this.state.device.value?.deviceNickname || this.state.room.phase === 'saved' && (group?.room?.id ?? null) !== this.state.location.value?.id)
        throw new ApiError(409, '首页数据尚未同步，请重试刷新');
      return true;
    });
  }
}

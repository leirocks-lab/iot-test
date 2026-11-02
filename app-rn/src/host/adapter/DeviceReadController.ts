import type {
  DeviceFirmwareOffer,
  DeviceScheduleSummary,
  DeviceMoreSummary,
  DeviceMemberSummary,
  DeviceHelpArticle,
  DeviceLocationSummary,
} from '../specs/NativeRowanHost';
import {
  projectMoreSummary,
  projectMembers,
  projectHelp,
  projectLocation,
} from './DeviceMoreModels';
import {
  InvalidReadResponse,
  projectFirmware,
  projectSchedules,
  type ReadSchedule,
} from './DeviceReadModels';
export type DeviceReadPage =
  | {feature: 'schedules' | 'more' | 'members' | 'help' | 'location'}
  | {feature: 'firmware'; kind: 'mcu' | 'wifi'};
export type DeviceReadBinding = Readonly<{
  deviceId: string;
  observationId: string;
  sessionRevision: number;
}>;
export interface DeviceReadHost {
  getDeviceSchedules(
    observationId: string,
  ): Promise<Array<DeviceScheduleSummary>>;
  getDeviceFirmware(
    observationId: string,
    kind: string,
  ): Promise<DeviceFirmwareOffer>;
  getDeviceMoreSummary(observationId: string): Promise<DeviceMoreSummary>;
  getDeviceMembers(observationId: string): Promise<Array<DeviceMemberSummary>>;
  getDeviceHelp(observationId: string): Promise<Array<DeviceHelpArticle>>;
  getDeviceLocation(observationId: string): Promise<DeviceLocationSummary>;
}
export type DeviceReadState = Readonly<{
  requestKey: string;
  phase: 'idle' | 'loading' | 'ready' | 'error';
  error: '' | 'EXPIRED' | 'FORBIDDEN' | 'UNAVAILABLE' | 'INVALID_RESPONSE';
  schedules?: readonly ReadSchedule[];
  firmware?: Readonly<DeviceFirmwareOffer>;
  more?: Readonly<DeviceMoreSummary>;
  members?: readonly Readonly<DeviceMemberSummary>[];
  help?: readonly Readonly<DeviceHelpArticle>[];
  location?: Readonly<DeviceLocationSummary>;
}>;
function valid(
  binding: DeviceReadBinding | undefined,
): binding is DeviceReadBinding {
  return (
    !!binding &&
    typeof binding.deviceId === 'string' &&
    !!binding.deviceId &&
    typeof binding.observationId === 'string' &&
    !!binding.observationId &&
    Number.isSafeInteger(binding.sessionRevision) &&
    binding.sessionRevision >= 0
  );
}
export function readRequestKey(
  page: DeviceReadPage,
  binding: DeviceReadBinding | undefined,
): string {
  return valid(binding)
    ? JSON.stringify([
        page.feature,
        page.feature === 'firmware' ? page.kind : '',
        binding.deviceId,
        binding.observationId,
        binding.sessionRevision,
      ])
    : '';
}
const idle = (): DeviceReadState =>
  Object.freeze({requestKey: '', phase: 'idle', error: ''});
/** One native GET in flight, one latest destination. Owns no observation, transport or login. */
export class DeviceReadController {
  private disposed = false;
  private foreground = true;
  private generation = 0;
  private startedGeneration = -1;
  private inFlight = false;
  private target?: {
    page: DeviceReadPage;
    binding: DeviceReadBinding;
    key: string;
  };
  private value: DeviceReadState = idle();
  constructor(
    private readonly host: DeviceReadHost,
    private readonly changed: (state: DeviceReadState) => void,
  ) {}
  get state() {
    return this.value;
  }
  private publish(value: DeviceReadState) {
    if (!this.disposed) {
      this.value = Object.freeze(value);
      this.changed(this.value);
    }
  }
  show(page: DeviceReadPage, binding: DeviceReadBinding | undefined): void {
    if (this.disposed) {
      return;
    }
    const key = readRequestKey(page, binding);
    if (!key || !valid(binding)) {
      this.generation++;
      this.target = undefined;
      this.publish({requestKey: '', phase: 'error', error: 'EXPIRED'});
      return;
    }
    if (this.target?.key === key) {
      return;
    }
    this.generation++;
    this.target = {
      page: {...page},
      binding: Object.freeze({...binding}),
      key,
    };
    this.publish({
      requestKey: key,
      phase: this.foreground ? 'loading' : 'idle',
      error: '',
    });
    this.pump();
  }
  hide(): void {
    if (this.disposed) {
      return;
    }
    this.generation++;
    this.target = undefined;
    this.publish(idle());
  }
  setForeground(active: boolean): void {
    if (this.disposed || this.foreground === active) {
      return;
    }
    this.foreground = active;
    this.generation++;
    if (this.target) {
      this.publish({
        requestKey: this.target.key,
        phase: active ? 'loading' : 'idle',
        error: '',
      });
    } else {
      this.publish(idle());
    }
    this.pump();
  }
  retry(): void {
    if (
      this.disposed ||
      !this.foreground ||
      !this.target ||
      this.value.phase === 'loading' ||
      ['FORBIDDEN', 'EXPIRED'].includes(this.value.error)
    ) {
      return;
    }
    this.generation++;
    this.publish({requestKey: this.target.key, phase: 'loading', error: ''});
    this.pump();
  }
  private isCurrent(generation: number) {
    return (
      !this.disposed &&
      this.foreground &&
      this.generation === generation &&
      !!this.target
    );
  }
  private errorCode(error: unknown): DeviceReadState['error'] {
    if (error instanceof InvalidReadResponse) {
      return 'INVALID_RESPONSE';
    }
    let code: unknown;
    try {
      code =
        error && typeof error === 'object'
          ? (error as {code?: unknown}).code
          : undefined;
    } catch {
      code = undefined;
    }
    if (code === 'forbidden') {
      return 'FORBIDDEN';
    }
    if (
      ['not_authenticated', 'session_changed', 'closed'].includes(
        typeof code === 'string' ? code : '',
      )
    ) {
      return 'EXPIRED';
    }
    return 'UNAVAILABLE';
  }
  private fail(generation: number, key: string, error: unknown) {
    if (this.isCurrent(generation)) {
      this.publish({
        requestKey: key,
        phase: 'error',
        error: this.errorCode(error),
      });
    }
  }
  private pump(): void {
    if (
      this.disposed ||
      !this.foreground ||
      this.inFlight ||
      !this.target ||
      this.startedGeneration === this.generation
    ) {
      return;
    }
    const target = this.target,
      generation = this.generation;
    this.startedGeneration = generation;
    this.inFlight = true;
    let request: Promise<unknown>;
    try {
      const id = target.binding.observationId;
      switch (target.page.feature) {
        case 'schedules':
          request = this.host.getDeviceSchedules(id);
          break;
        case 'firmware':
          request = this.host.getDeviceFirmware(id, target.page.kind);
          break;
        case 'more':
          request = this.host.getDeviceMoreSummary(id);
          break;
        case 'members':
          request = this.host.getDeviceMembers(id);
          break;
        case 'help':
          request = this.host.getDeviceHelp(id);
          break;
        case 'location':
          request = this.host.getDeviceLocation(id);
          break;
      }
    } catch (error) {
      this.fail(generation, target.key, error);
      this.inFlight = false;
      this.pump();
      return;
    }
    Promise.resolve(request)
      .then((input) => {
        if (!this.isCurrent(generation)) {
          return;
        }
        if (target.page.feature === 'schedules') {
          this.publish({
            requestKey: target.key,
            phase: 'ready',
            error: '',
            schedules: projectSchedules(input),
          });
        } else if (target.page.feature === 'firmware') {
          this.publish({
            requestKey: target.key,
            phase: 'ready',
            error: '',
            firmware: projectFirmware(input, target.page.kind),
          });
        } else {
          const base = {
            requestKey: target.key,
            phase: 'ready' as const,
            error: '' as const,
          };
          switch (target.page.feature) {
            case 'more':
              this.publish({...base, more: projectMoreSummary(input)});
              break;
            case 'members':
              this.publish({...base, members: projectMembers(input)});
              break;
            case 'help':
              this.publish({...base, help: projectHelp(input)});
              break;
            case 'location':
              this.publish({...base, location: projectLocation(input)});
              break;
          }
        }
      })
      .catch((error) => {
        this.fail(generation, target.key, error);
      })
      .finally(() => {
        this.inFlight = false;
        this.pump();
      });
  }
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.generation++;
    this.target = undefined;
    this.value = idle();
  }
}

import type {DeviceSnapshot, HostContext} from '../specs/NativeRowanHost';
import {DeviceObservation} from './DeviceObservation';
export interface DeviceSessionHost {
  getContext(): Promise<HostContext>;
  observeDevice(deviceId: string): Promise<DeviceSnapshot>;
  getDeviceSnapshot(observationId: string): Promise<DeviceSnapshot>;
  retryObservation(observationId: string): void;
  acknowledgeDeviceEvent(observationId: string, revision: number): void;
  releaseObservation(observationId: string): void;
  closeDevice(pageSessionId: string): void;
  onDeviceChanged(listener: (snapshot: DeviceSnapshot) => void): {
    remove(): void;
  };
}
export type DeviceSessionState = Readonly<{
  snapshot?: Readonly<DeviceSnapshot>;
  selfUnbindVersion?: number;
  loading: boolean;
  resyncing: boolean;
  error:
    | ''
    | 'INCOMPATIBLE_HOST'
    | 'AUTH_REQUIRED'
    | 'CONTEXT_FAILED'
    | 'INVALID_SNAPSHOT'
    | 'OBSERVATION_FAILED'
    | 'RESYNC_FAILED'
    | 'RETRY_FAILED';
}>;
/** Owns observation handles only, never a connection. One controller is single-use. */
export class DeviceSessionController {
  private disposed = false;
  private started = false;
  private observation?: DeviceObservation;
  private handle?: string;
  private subscription?: {remove(): void};
  private syncing = false;
  private recoveryAttempts = 0;
  private value: DeviceSessionState = Object.freeze({
    loading: true,
    resyncing: false,
    error: '',
  });
  constructor(
    private readonly host: DeviceSessionHost,
    private readonly deviceId: string,
    private readonly changed: (value: DeviceSessionState) => void,
    private readonly bufferLimit = 128,
  ) {}
  get state() {
    return this.value;
  }
  private update(patch: Partial<DeviceSessionState>) {
    if (this.disposed) {
      return;
    }
    this.value = Object.freeze({...this.value, ...patch});
    this.changed(this.value);
  }
  start(): void {
    if (!this.started && !this.disposed) {
      this.started = true;
      this.initialize();
    }
  }
  private async initialize() {
    let context: HostContext;
    try {
      context = await this.host.getContext();
    } catch {
      this.update({loading: false, error: 'CONTEXT_FAILED'});
      return;
    }
    if (this.disposed) {
      return;
    }
    if (context.bridgeMajor !== 3) {
      this.update({loading: false, error: 'INCOMPATIBLE_HOST'});
      return;
    }
    if (
      !context.authenticated ||
      !Number.isSafeInteger(context.sessionRevision) ||
      !this.deviceId
    ) {
      this.update({loading: false, error: 'AUTH_REQUIRED'});
      return;
    }
    this.update({selfUnbindVersion: context.selfUnbindVersion === 1 ? 1 : 0});
    this.observation = new DeviceObservation(
      this.deviceId,
      context.sessionRevision,
      this.bufferLimit,
    );
    try {
      this.subscription = this.host.onDeviceChanged((s) => {
        // Receipt acknowledgement is independent of display eligibility. Even an old
        // observer/account event or an already queued post-dispose callback must unblock native.
        if (
          !s ||
          typeof s.observationId !== 'string' ||
          !s.observationId ||
          !Number.isSafeInteger(s.revision) ||
          s.revision < 0
        ) {
          return;
        }
        try {
          this.host.acknowledgeDeviceEvent(s.observationId, s.revision);
        } catch {
          // Detached bridge: preserve display processing and eventual handle release.
        }
        if (this.disposed) {
          return;
        }
        this.observation?.receive(s);
        if (!this.handle) {
          return;
        }
        this.update({snapshot: this.observation?.current});
        if (this.observation?.needsResync) {
          this.resynchronize();
        }
      });
      const initial = await this.host.observeDevice(this.deviceId);
      if (this.disposed) {
        this.release(initial.observationId);
        return;
      }
      try {
        this.observation.install(initial);
      } catch {
        this.release(initial.observationId);
        this.unsubscribe();
        this.observation.release();
        this.update({loading: false, error: 'INVALID_SNAPSHOT'});
        return;
      }
      this.handle = initial.observationId;
      this.update({
        loading: false,
        snapshot: this.observation.current,
        error: '',
      });
      if (this.observation.needsResync) {
        this.resynchronize();
      }
    } catch {
      this.unsubscribe();
      this.observation?.release();
      this.update({loading: false, error: 'OBSERVATION_FAILED'});
    }
  }
  private resynchronize(): void {
    if (this.disposed || this.syncing || !this.handle || !this.observation) {
      return;
    }
    // Prevent an unhealthy bridge from spinning promises forever. User retry resets this budget.
    if (this.recoveryAttempts >= 2) {
      this.update({error: 'RESYNC_FAILED', resyncing: false});
      return;
    }
    this.recoveryAttempts++;
    this.syncing = true;
    const handle = this.handle,
      observation = this.observation;
    observation.beginResync();
    this.update({resyncing: true});
    let request: Promise<DeviceSnapshot>;
    try {
      request = this.host.getDeviceSnapshot(handle);
    } catch {
      this.syncing = false;
      this.update({resyncing: false, error: 'RESYNC_FAILED'});
      return;
    }
    request
      .then((snapshot) => {
        if (
          this.disposed ||
          this.handle !== handle ||
          this.observation !== observation
        ) {
          return;
        }
        observation.resync(snapshot);
        this.syncing = false;
        this.update({
          snapshot: observation.current,
          resyncing: false,
          error: '',
        });
        if (observation.needsResync) {
          this.resynchronize();
        } else {
          this.recoveryAttempts = 0;
        }
      })
      .catch(() => {
        if (!this.disposed && this.handle === handle) {
          this.syncing = false;
          this.update({resyncing: false, error: 'RESYNC_FAILED'});
        }
      });
  }
  retry(): void {
    if (this.disposed || !this.handle || this.syncing) {
      return;
    }
    try {
      this.host.retryObservation(this.handle);
      this.recoveryAttempts = 0;
      this.update({error: ''});
      if (this.observation?.needsResync) {
        this.resynchronize();
      }
    } catch {
      this.update({error: 'RETRY_FAILED'});
    }
  }
  private release(handle: string) {
    if (typeof handle === 'string' && handle) {
      try {
        this.host.releaseObservation(handle);
      } catch {
        /* no raw native exception */
      }
    }
  }
  private unsubscribe() {
    const s = this.subscription;
    this.subscription = undefined;
    try {
      s?.remove();
    } catch {
      /* disposal remains idempotent */
    }
  }
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.unsubscribe();
    if (this.handle) {
      this.release(this.handle);
      this.handle = undefined;
    }
    this.observation?.release();
    this.value = Object.freeze({loading: false, resyncing: false, error: ''});
  }
}

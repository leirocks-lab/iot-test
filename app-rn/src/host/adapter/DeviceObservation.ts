import type {DeviceSnapshot} from '../specs/NativeRowanHost';
const phases = new Set([
  'authorizing',
  'connecting',
  'reading',
  'live',
  'recovering',
  'failed',
  'closed',
]);
/** A bounded display copy. Native owner versions and delivery sequences are distinct. */
export class DeviceObservation {
  private value?: Readonly<DeviceSnapshot>;
  private pending: DeviceSnapshot[] = [];
  private released = false;
  private syncing = false;
  private droppedThrough = -1;
  private initialOverflow = false;
  private preDropped = new Map<string, number>();
  private unknownOverflow = false;
  needsResync = false;
  constructor(
    private readonly deviceId: string,
    private readonly sessionRevision: number,
    private readonly bufferLimit = 128,
  ) {
    if (!Number.isSafeInteger(bufferLimit) || bufferLimit < 1) {
      throw new Error('Invalid observation buffer limit');
    }
  }
  get current() {
    return this.value;
  }
  private valid(s: DeviceSnapshot) {
    return (
      s.deviceId === this.deviceId &&
      s.sessionRevision === this.sessionRevision &&
      typeof s.observationId === 'string' &&
      s.observationId.length > 0 &&
      [s.revision, s.authorityRevision, s.connectionEpoch].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) &&
      typeof s.title === 'string' &&
      typeof s.productCategory === 'string' &&
      phases.has(s.phase) &&
      ['online', 'offline', 'unknown'].includes(s.online) &&
      typeof s.stale === 'boolean' &&
      typeof s.snapshotAvailable === 'boolean' &&
      typeof s.errorCode === 'string'
    );
  }
  private sameHandle(s: DeviceSnapshot) {
    return !this.value || s.observationId === this.value.observationId;
  }
  private notOlder(s: DeviceSnapshot) {
    return (
      !this.value ||
      (s.connectionEpoch >= this.value.connectionEpoch &&
        s.authorityRevision >= this.value.authorityRevision)
    );
  }
  private buffer(s: DeviceSnapshot) {
    if (
      this.pending.some(
        (p) => p.observationId === s.observationId && p.revision === s.revision,
      )
    ) {
      return;
    }
    if (this.pending.length >= this.bufferLimit) {
      if (this.value) {
        this.droppedThrough = Math.max(
          this.droppedThrough,
          s.revision,
          ...this.pending.map((p) => p.revision),
        );
      } else {
        this.initialOverflow = true;
        for (const dropped of [...this.pending, s]) {
          if (
            this.preDropped.has(dropped.observationId) ||
            this.preDropped.size < this.bufferLimit
          ) {
            this.preDropped.set(
              dropped.observationId,
              Math.max(
                this.preDropped.get(dropped.observationId) ?? -1,
                dropped.revision,
              ),
            );
          } else {
            this.unknownOverflow = true;
          }
        }
      }
      this.pending = [];
      this.needsResync = true;
      return;
    }
    this.pending.push({...s});
  }
  receive(s: DeviceSnapshot): void {
    if (
      this.released ||
      !this.valid(s) ||
      !this.sameHandle(s) ||
      !this.notOlder(s)
    ) {
      return;
    }
    if (this.value && s.revision <= this.value.revision) {
      return;
    }
    if (!this.value || this.syncing || this.needsResync) {
      this.buffer(s);
      return;
    }
    if (s.revision !== this.value.revision + 1) {
      this.needsResync = true;
      this.buffer(s);
      return;
    }
    this.value = Object.freeze({...s});
  }
  install(s: DeviceSnapshot): Readonly<DeviceSnapshot> {
    if (this.released || !this.valid(s) || !this.sameHandle(s)) {
      throw new Error('Invalid device snapshot context');
    }
    if (
      !this.notOlder(s) ||
      (this.value && s.revision <= this.value.revision)
    ) {
      return this.value!;
    }
    if (!this.value) {
      this.droppedThrough = this.unknownOverflow
        ? Number.MAX_SAFE_INTEGER
        : (this.preDropped.get(s.observationId) ?? -1);
      this.preDropped.clear();
    }
    this.value = Object.freeze({...s});
    this.replay();
    return this.value;
  }
  beginResync() {
    if (!this.released) {
      this.syncing = true;
    }
  }
  resync(s: DeviceSnapshot): void {
    if (this.released) {
      return;
    }
    this.syncing = false;
    if (
      !this.valid(s) ||
      !this.sameHandle(s) ||
      !this.notOlder(s) ||
      (this.value && s.revision < this.value.revision)
    ) {
      this.needsResync = true;
      return;
    }
    this.value = Object.freeze({...s});
    this.initialOverflow = false;
    if (s.revision >= this.droppedThrough) {
      this.droppedThrough = -1;
    }
    this.needsResync = this.initialOverflow || this.droppedThrough >= 0;
    this.replay();
  }
  private replay() {
    const pending = this.pending.sort((a, b) => a.revision - b.revision);
    this.pending = [];
    // A full snapshot covers prior gaps; initial overflow still requires an explicit resync.
    this.needsResync = this.initialOverflow || this.droppedThrough >= 0;
    for (const s of pending) {
      this.receive(s);
    }
  }
  release(): void {
    this.released = true;
    this.value = undefined;
    this.pending = [];
    this.preDropped.clear();
    this.syncing = false;
  }
}

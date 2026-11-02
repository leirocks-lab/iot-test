import type {DeviceSelfUnbindState} from '../specs/NativeRowanHost';

export type SelfUnbindBinding = Readonly<{
  observationId: string;
  sessionRevision: number;
}>;
export interface SelfUnbindHost {
  getDeviceSelfUnbindState(
    observationId: string,
  ): Promise<DeviceSelfUnbindState>;
  requestDeviceSelfUnbind(
    observationId: string,
    attemptId: string,
  ): Promise<DeviceSelfUnbindState>;
  cancelDeviceSelfUnbindConfirmation(
    observationId: string,
    attemptId: string,
  ): void;
}
export type SelfUnbindDisplay = Readonly<{
  supported: boolean;
  loading: boolean;
  requesting: boolean;
  error: '' | 'UNAVAILABLE' | 'INVALID_STATE';
  snapshot?: Readonly<DeviceSelfUnbindState>;
}>;
const statuses = new Set([
  'idle',
  'confirming',
  'cancelled',
  'preparing',
  'sending',
  'checking',
  'unknown',
  'confirmed_cleanup_pending',
  'already_absent_cleanup_pending',
  'confirmed',
  'already_absent',
  'historical_confirmed',
  'historical_already_absent',
  'rejected',
  'session_changed',
  'closed',
]);
const errors = new Set([
  '',
  'busy',
  'invalid_input',
  'storage_unavailable',
  'unknown_result',
  'session_changed',
  'forbidden',
  'not_authenticated',
  'not_found',
  'not_bound',
  'absence_observed',
  'cancelled',
  'unavailable',
  'closed',
  'timeout',
]);
let instance = 0;
/** Native owns confirmation and mutation. This class only owns one page's display requests. */
export class DeviceSelfUnbindController {
  private readonly instance = ++instance;
  private attemptSequence = 0;
  private generation = 0;
  private disposed = false;
  private foreground = true;
  private binding?: SelfUnbindBinding;
  private attempt?: string;
  private querying = false;
  private queryAgain = false;
  private value: SelfUnbindDisplay = Object.freeze({
    supported: false,
    loading: false,
    requesting: false,
    error: '',
  });
  constructor(
    private readonly host: SelfUnbindHost,
    private readonly changed: (state: SelfUnbindDisplay) => void,
  ) {}
  get state() {
    return this.value;
  }
  private publish(patch: Partial<SelfUnbindDisplay>) {
    if (!this.disposed) {
      this.value = Object.freeze({...this.value, ...patch});
      this.changed(this.value);
    }
  }
  show(binding: SelfUnbindBinding, supported: boolean) {
    if (this.disposed) {
      return;
    }
    if (
      this.binding?.observationId === binding.observationId &&
      this.binding.sessionRevision === binding.sessionRevision &&
      this.value.supported === supported
    ) {
      return;
    }
    if (
      !binding.observationId ||
      !Number.isSafeInteger(binding.sessionRevision) ||
      binding.sessionRevision < 0
    ) {
      this.hide();
      return;
    }
    this.hide();
    this.binding = {...binding};
    this.publish({supported, loading: false, error: ''});
    if (supported && this.foreground) {
      this.refresh();
    }
  }
  private cancel() {
    const attempt = this.attempt,
      binding = this.binding;
    this.attempt = undefined;
    if (attempt && binding) {
      try {
        this.host.cancelDeviceSelfUnbindConfirmation(
          binding.observationId,
          attempt,
        );
      } catch {
        /* Native still validates actual page at affirmative dispatch. */
      }
    }
  }
  hide() {
    this.cancel();
    this.generation++;
    this.binding = undefined;
    this.queryAgain = false;
    this.publish({
      supported: false,
      loading: false,
      requesting: false,
      error: '',
      snapshot: undefined,
    });
  }
  setForeground(active: boolean) {
    if (this.disposed || this.foreground === active) {
      return;
    }
    this.foreground = active;
    if (!active) {
      this.cancel();
      this.generation++;
      this.publish({requesting: false, loading: false});
    } else {
      this.refresh();
    }
  }
  private current(binding: SelfUnbindBinding, generation: number) {
    return (
      !this.disposed &&
      this.foreground &&
      generation === this.generation &&
      this.binding?.observationId === binding.observationId &&
      this.binding.sessionRevision === binding.sessionRevision
    );
  }
  private accept(
    value: DeviceSelfUnbindState,
    binding: SelfUnbindBinding,
    generation: number,
  ) {
    if (!this.current(binding, generation)) {
      return;
    }
    if (
      !value ||
      value.observationId !== binding.observationId ||
      value.sessionRevision !== binding.sessionRevision
    ) {
      this.publish({error: 'INVALID_STATE'});
      return;
    }
    if (
      !Number.isSafeInteger(value.revision) ||
      value.revision < 0 ||
      !statuses.has(value.status) ||
      !errors.has(value.errorCode) ||
      (value.canRequest &&
        ![
          'idle',
          'cancelled',
          'rejected',
          'historical_confirmed',
          'historical_already_absent',
        ].includes(value.status)) ||
      typeof value.canRequest !== 'boolean'
    ) {
      this.publish({error: 'INVALID_STATE'});
      return;
    }
    if (this.value.snapshot && value.revision < this.value.snapshot.revision) {
      return;
    }
    this.publish({
      snapshot: Object.freeze({
        observationId: value.observationId,
        sessionRevision: value.sessionRevision,
        revision: value.revision,
        status: value.status,
        errorCode: value.errorCode,
        canRequest: value.canRequest,
      }),
      error: '',
    });
  }
  refresh() {
    const binding = this.binding;
    if (
      this.disposed ||
      !this.foreground ||
      !binding ||
      !this.value.supported
    ) {
      return;
    }
    if (this.querying) {
      this.queryAgain = true;
      return;
    }
    this.querying = true;
    const generation = this.generation;
    this.publish({loading: true});
    Promise.resolve()
      .then(() => this.host.getDeviceSelfUnbindState(binding.observationId))
      .then(
        (value) => this.accept(value, binding, generation),
        () => {
          if (this.current(binding, generation)) {
            this.publish({error: 'UNAVAILABLE'});
          }
        },
      )
      .finally(() => {
        this.querying = false;
        if (this.current(binding, generation)) {
          this.publish({loading: false});
        }
        if (this.queryAgain) {
          this.queryAgain = false;
          this.refresh();
        }
      });
  }
  request() {
    const binding = this.binding;
    if (
      this.disposed ||
      !this.foreground ||
      !binding ||
      !this.value.supported ||
      this.attempt ||
      !this.value.snapshot?.canRequest ||
      !!this.value.error ||
      this.value.loading
    ) {
      return;
    }
    const generation = this.generation,
      attempt = `rn-${this.instance}-${++this.attemptSequence}`;
    this.attempt = attempt;
    this.publish({requesting: true, error: ''});
    let pending: Promise<DeviceSelfUnbindState>;
    try {
      pending = this.host.requestDeviceSelfUnbind(
        binding.observationId,
        attempt,
      );
    } catch {
      pending = Promise.reject(new Error('native request unavailable'));
    }
    Promise.resolve(pending)
      .then(
        (value) => {
          this.accept(value, binding, generation);
        },
        () => {
          if (this.current(binding, generation)) {
            this.publish({error: 'UNAVAILABLE'});
          }
        },
      )
      .finally(() => {
        if (this.attempt === attempt) {
          this.attempt = undefined;
          if (this.current(binding, generation)) {
            this.publish({requesting: false});
          }
        }
      });
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    this.hide();
    this.disposed = true;
  }
}
export function selfUnbindMessage(status: string): string {
  return (
    (
      {
        idle: '解除当前账号与此设备的关联',
        confirming: '请确认是否解除关联',
        cancelled: '已取消，本次未发送请求',
        preparing: '正在准备请求，请勿重复操作',
        sending: '请求处理中，请勿重复操作',
        checking: '正在核对原有请求',
        unknown: '结果尚不确定，请查询状态或返回首页核对；不会自动重新解绑',
        confirmed_cleanup_pending:
          '请求已接受，正在清理设备状态；请返回首页刷新',
        already_absent_cleanup_pending:
          '已确认当前关联不存在，正在清理设备状态',
        confirmed: '已解除当前账号与此设备的关联',
        already_absent: '当前账号与此设备的关联已不存在',
        historical_confirmed: '以前的解绑请求已完成，不代表本页执行了新请求',
        historical_already_absent: '以前的请求已核对为关联不存在',
        rejected: '请求未完成，请检查状态后重试',
        session_changed: '登录或页面已变化，请返回',
        closed: '设备页面已结束',
      } as Record<string, string>
    )[status] ?? '解绑状态暂不可用'
  );
}

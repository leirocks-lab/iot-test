import type { HttpClient, HttpRequest, HttpResponse } from "../lib/core";
import { withBudget } from "../protocol/device";
import { deviceMembers, helpArticles } from "./real-api-data";
import { productCategories, productData, productGroups } from "./product-data";
import {
  ApiError,
  type ApiEnvelope,
  type BindingResult,
  type DeviceView,
  type HomeGroup,
  type KeyValueStorage,
  type Language,
  type OtaCheck,
  type OtaTask,
  type OtaType,
  type Room,
  type Schedule,
  type ScheduleInput,
  type Session,
  type Settings,
  type ShareBinding,
  type ThingModel,
  type UserProfile,
} from "./models";

export class RowanService {
  session: Session | null = null;
  private epoch = 0;
  get sessionRevision() {
    return this.epoch;
  }
  private sessionListeners = new Set<() => void>();
  onSessionChange(listener: () => void) {
    this.sessionListeners.add(listener);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }
  private sessionChanged() {
    for (const listener of this.sessionListeners) listener();
  }
  async clearLocal() {
    await this.clear();
  }
  private refreshTask?: Promise<void>;
  private storageQueue: Promise<unknown> = Promise.resolve();
  private settingQueue: Promise<unknown> = Promise.resolve();
  constructor(
    private http: HttpClient,
    private storage: KeyValueStorage,
  ) {}
  get userID() {
    if (!this.session) throw new ApiError(401, "请先登录");
    return this.session.userID;
  }
  get language(): Language {
    return this.session?.setting.language ?? "zh-CN";
  }
  private persist(work: () => Promise<void>) {
    const result = this.storageQueue.then(work);
    this.storageQueue = result.catch(() => undefined);
    return result;
  }
  async restore() {
    const round = this.epoch;
    try {
      const raw = await this.storage.get("session");
      if (round !== this.epoch) return;
      if (!raw) return;
      const session = JSON.parse(raw) as Session;
      if (!session.accessToken || !session.refreshToken || !session.userID)
        throw new ApiError(401, "会话不完整");
      this.session = session;
      await this.refresh();
    } catch {
      if (round === this.epoch) await this.clear();
    }
  }
  private async response<T>(req: HttpRequest, retry = true): Promise<HttpResponse<ApiEnvelope<T>>> {
    const epoch = this.epoch;
    const response = await this.http.request<ApiEnvelope<T>>({
      ...req,
      headers: {
        "Accept-Language": this.language,
        ...(this.session ? { Authorization: "Bearer " + this.session.accessToken } : {}),
        ...req.headers,
      },
    });
    if (epoch !== this.epoch || req.signal?.aborted) throw new ApiError(499, "操作已取消");
    const data = response.data;
    if ((response.status === 401 || data.code === 401) && retry && this.session) {
      await this.refresh();
      return this.response<T>(req, false);
    }
    if (response.status >= 400 || !data.success || data.code !== 0)
      throw new ApiError(data.code || response.status, data.message || "服务异常");
    return response;
  }
  async request<T>(req: HttpRequest, retry = true): Promise<T> {
    return (await this.response<T>(req, retry)).data.data;
  }
  private async save(session: Session, round: number) {
    if (round !== this.epoch) throw new ApiError(499, "操作已取消");
    await this.persist(async () => {
      if (round !== this.epoch) throw new ApiError(499, "操作已取消");
      await this.storage.set("session", JSON.stringify(session));
    });
    if (round !== this.epoch) throw new ApiError(499, "操作已取消");
    this.session = session;
    this.sessionChanged();
  }
  async login(account: string, pin: string, verify: "password" | "captcha", signal?: AbortSignal) {
    if (!/^\S+@\S+\.\S+$/.test(account) || !pin)
      throw new ApiError(400, "请输入有效邮箱及密码/验证码");
    const round = ++this.epoch;
    this.refreshTask = undefined;
    const response = await this.http.request<ApiEnvelope<Session>>({
      method: "POST",
      path: "/api/app/session",
      body: { account, pin, verify, language: this.language },
      signal,
    });
    if (signal?.aborted || round !== this.epoch) throw new ApiError(499, "操作已取消");
    if (!response.data.success || response.status >= 400)
      throw new ApiError(response.data.code, response.data.message);
    const session = response.data.data;
    if (!session.accessToken || !session.refreshToken || !session.userID)
      throw new ApiError(500, "会话响应不完整");
    if (!session.setting) {
      if (signal?.aborted || round !== this.epoch) throw new ApiError(499, "操作已取消");
      const setting = await this.http.request<ApiEnvelope<Settings>>({
        method: "GET",
        path: "/api/app/user/setting",
        headers: {
          Authorization: "Bearer " + session.accessToken,
          "Accept-Language": this.language,
        },
        signal,
      });
      if (signal?.aborted || round !== this.epoch) throw new ApiError(499, "操作已取消");
      if (setting.status >= 400 || !setting.data.success || setting.data.code !== 0)
        throw new ApiError(
          setting.data.code || setting.status,
          setting.data.message || "用户设置读取失败",
        );
      if (!setting.data.data || typeof setting.data.data.language !== "string")
        throw new ApiError(502, "用户设置响应不完整");
      session.setting = setting.data.data;
    }
    await this.save(session, round);
  }
  cancelAuthentication() {
    this.epoch++;
    this.refreshTask = undefined;
  }
  async refresh() {
    if (this.refreshTask) return this.refreshTask;
    const current = this.session,
      round = this.epoch;
    if (!current) throw new ApiError(401, "请先登录");
    const task = (async () => {
      const response = await this.http.request<ApiEnvelope<Partial<Session>>>({
        method: "PATCH",
        path: "/api/app/session",
        body: { userID: current.userID, refreshToken: current.refreshToken },
      });
      if (round !== this.epoch) throw new ApiError(499, "会话已变更");
      if (!response.data.success || response.status >= 400) {
        await this.clear();
        throw new ApiError(401, "登录已失效");
      }
      if (!response.data.data.accessToken || !response.data.data.refreshToken)
        throw new ApiError(500, "刷新响应不完整");
      await this.save({ ...current, ...response.data.data, userID: current.userID }, round);
    })();
    this.refreshTask = task;
    try {
      await task;
    } catch (error) {
      if (round === this.epoch) await this.clear();
      throw error;
    } finally {
      if (this.refreshTask === task) this.refreshTask = undefined;
    }
  }
  private async clear() {
    this.epoch++;
    this.refreshTask = undefined;
    this.session = null;
    this.sessionChanged();
    await this.persist(() => this.storage.remove("session"));
  }
  async logout() {
    await this.request({ method: "DELETE", path: "/api/app/session" }, false);
    await this.clear();
  }
  async sendCaptcha(account: string, captchaType: "register" | "login" | "forget") {
    return this.request({
      method: "GET",
      path: "/api/app/captcha",
      query: { account, accountType: "email", captchaType, language: this.language },
    });
  }
  async checkCaptcha(account: string, code: string) {
    return this.request({
      method: "GET",
      path: "/api/app/captcha/" + encodeURIComponent(code),
      query: { account, accountType: "email" },
    });
  }
  async register(account: string, password: string, captcha: string, regionCode: string) {
    await this.request(
      {
        method: "PUT",
        path: "/api/app/user",
        body: { account, password, captcha, type: "email", regionCode, language: this.language },
      },
      false,
    );
  }
  async resetPassword(account: string, password: string, captcha: string) {
    await this.request(
      { method: "PATCH", path: "/api/app/user/password", body: { account, password, captcha } },
      false,
    );
  }
  async updateNickname(nickname: string) {
    return this.request({ method: "PATCH", path: "/api/app/user", body: { nickname } });
  }
  async updateEmail(account: string, captcha: string) {
    return this.request({ method: "PATCH", path: "/api/app/user", body: { account, captcha, type: "email" } });
  }
  async changePassword(oldPassword: string, password: string) {
    return this.request({ method: "PATCH", path: "/api/app/user/password", body: { oldPassword, password } });
  }
  async deleteAccount(password: string) {
    await this.request({ method: "DELETE", path: "/api/app/user", body: { password } }, false);
    await this.clear();
  }
  async config(platform: string, signal?: AbortSignal) {
    return this.request<{ configVersion: string }>({
      method: "GET",
      path: "/api/app/config",
      query: { brandId: "rowan", platform, appVersion: "1.0.0", language: this.language },
      signal,
    });
  }
  async startupConfig(platform: string) {
    const key = `startup.${platform}`;
    const valid = (value: unknown): value is { configVersion: string } =>
      !!value &&
      typeof value === "object" &&
      typeof (value as { configVersion?: unknown }).configVersion === "string" &&
      !!(value as { configVersion: string }).configVersion;
    try {
      const value = await withBudget(
        (signal) => this.config(platform, signal),
        10000,
        "启动配置请求超时",
      );
      if (!valid(value)) throw new ApiError(502, "启动配置响应不完整");
      try {
        await this.storage.set(key, JSON.stringify(value));
      } catch {
        /* Cache failure does not invalidate a successful server response. */
      }
      return value;
    } catch (error) {
      if (error instanceof ApiError && (error.code === 1802 || error.code === 499)) throw error;
      try {
        const raw = await this.storage.get(key);
        if (raw) {
          const cached: unknown = JSON.parse(raw);
          if (valid(cached)) return cached;
        }
      } catch {
        /* No usable cache: nonessential configuration must not block account entry. */
      }
      return null;
    }
  }
  async agreement(kind: "privacy" | "serviceTerms", regionCode: string) {
    return this.request<{ type: string; content: string }>({
      method: "GET",
      path: "/api/app/" + kind,
      query: { type: "text", brandId: "rowan", regionCode },
    });
  }
  async home(signal?: AbortSignal) {
    return this.request<HomeGroup[]>({ method: "GET", path: "/api/app/devices", signal });
  }
  async device(id: string, signal?: AbortSignal) {
    return this.request<DeviceView>({
      method: "GET",
      path: `/api/app/devices/${encodeURIComponent(id)}`,
      signal,
    });
  }
  async categories(signal?: AbortSignal, brandId?: string) {
    const data = await this.request<unknown>({
      method: "GET",
      path: "/api/app/products/category",
      ...(brandId ? { query: { brandId } } : {}),
      signal,
    });
    return productCategories(data);
  }

  async products(signal?: AbortSignal, brandId?: string) {
    const data = await this.request<unknown>({
      method: "GET",
      path: "/api/app/products",
      ...(brandId ? { query: { brandId } } : {}),
      signal,
    });
    return productGroups(data);
  }

  async product(id: string, signal?: AbortSignal) {
    const data = await this.request<unknown>({
      method: "GET",
      path: `/api/app/products/${encodeURIComponent(id)}`,
      query: { type: "text" },
      signal,
    });
    return productData(data);
  }
  async model(productID: string, signal?: AbortSignal) {
    return this.request<ThingModel>({
      method: "GET",
      path: `/api/app/products/${encodeURIComponent(productID)}/thing-model`,
      signal,
    });
  }
  async mqtt(id: string, signal?: AbortSignal) {
    return this.request<Record<string, string>>({
      method: "GET",
      path: `/api/app/devices/${encodeURIComponent(id)}/mqtt`,
      signal,
    });
  }
  async connection(signal?: AbortSignal) {
    return this.request<Record<string, string>>({
      method: "GET",
      path: "/api/app/device/connection",
      signal,
    });
  }
  async bindStatus(bindCode: string, signal?: AbortSignal) {
    return this.request<BindingResult>({
      method: "GET",
      path: "/api/app/device/bindStatus",
      query: { bindCode },
      signal,
    });
  }
  async renameDevice(id: string, nickname: string, signal?: AbortSignal) {
    return this.request({
      method: "PATCH",
      path: `/api/app/devices/${encodeURIComponent(id)}`,
      body: { nickname },
      signal,
    });
  }
  async unbind(id: string, signal?: AbortSignal) {
    return this.request(
      {
        method: "DELETE",
        path: `/api/app/devices/${encodeURIComponent(id)}/users/self`,
        signal,
      },
      false,
    );
  }
  async rooms(signal?: AbortSignal) {
    const response = await this.response<Room[]>({
      method: "GET",
      path: "/api/app/user/locations",
      signal,
    });
    return { rooms: response.data.data };
  }
  async createRoom(name: string) {
    return this.request({ method: "POST", path: "/api/app/user/locations", body: { name } });
  }
  async renameRoom(id: string, name: string) {
    return this.request({ method: "PATCH", path: `/api/app/user/locations/${id}`, body: { name } });
  }
  async saveRooms(rooms: readonly Room[], baseline: readonly Room[]) {
    const epoch = this.epoch;
    const active = () => {
      if (epoch !== this.epoch) throw new ApiError(499, "会话已变化，房间操作已取消");
    };
    const original = baseline.map((room) => ({ ...room })),
      next = rooms.map((room) => ({ ...room }));
    const valid = (room: Room) =>
      typeof room.version === "number" &&
      Number.isSafeInteger(room.version) &&
      room.version >= 0 &&
      typeof room.updatedAt === "string" &&
      room.updatedAt.endsWith("Z") &&
      Number.isFinite(Date.parse(room.updatedAt));
    if (!original.length || original.some((room) => !valid(room)))
      throw new ApiError(409, "房间版本缺失，请重新读取后编辑");
    if (
      !next.length ||
      new Set(next.map((room) => room.id)).size !== next.length ||
      next.some((room) => !original.some((old) => old.id === room.id && old.name === room.name))
    )
      throw new ApiError(400, "请基于完整房间列表排序或删除");
    const safeDeletion = (list: readonly Room[]) => {
      for (const room of list)
        if (
          !next.some((value) => value.id === room.id) &&
          (room.isDefault || room.deviceCount !== 0)
        )
          throw new ApiError(409, "房间内仍有设备、设备数未知或为默认房间");
    };
    safeDeletion(original);
    const latest = await this.rooms();
    active();
    if (
      latest.rooms.length !== original.length ||
      latest.rooms.some((room, index) => {
        const old = original[index];
        return (
          !old ||
          room.id !== old.id ||
          room.name !== old.name ||
          room.version !== old.version ||
          room.updatedAt !== old.updatedAt
        );
      })
    )
      throw new ApiError(409, "房间已变化，请刷新后重新编辑");
    safeDeletion(latest.rooms);
    await this.request({
      method: "PUT",
      path: "/api/app/user/locations",
      body: {
        rooms: next.map((room) => {
          const old = original.find((value) => value.id === room.id)!;
          return { id: room.id, name: room.name, version: old.version, updatedAt: old.updatedAt };
        }),
      },
    });
    active();
    const actual = await this.rooms();
    active();
    if (
      actual.rooms.length !== next.length ||
      actual.rooms.some(
        (room, index) => room.id !== next[index].id || room.name !== next[index].name,
      )
    )
      throw new ApiError(409, "保存结果待核对，请重新读取后编辑");
    return actual;
  }
  async moveDevice(id: string, roomID: string | null, signal?: AbortSignal) {
    return this.request({
      method: "PUT",
      path: `/api/app/devices/${encodeURIComponent(id)}/location`,
      body: { id: roomID },
      signal,
    });
  }
  async location(id: string, signal?: AbortSignal) {
    return this.request<{ id: string | null; name: string }>({
      method: "GET",
      path: `/api/app/devices/${encodeURIComponent(id)}/location`,
      signal,
    });
  }
  async settings() {
    return this.request<Settings>({ method: "GET", path: "/api/app/user/setting" });
  }
  async profile() {
    return this.request<UserProfile>({ method: "GET", path: "/api/app/user/profile" });
  }
  async updateSettings(patch: Partial<Settings>) {
    const round = this.epoch;
    const task = this.settingQueue.then(async () => {
      if (round !== this.epoch) throw new ApiError(499, "会话已变更");
      await this.request({ method: "PATCH", path: "/api/app/user/setting", body: patch });
      const setting = await this.settings();
      if (this.session) await this.save({ ...this.session, setting }, round);
      return setting;
    });
    this.settingQueue = task.catch(() => undefined);
    return task;
  }
  async schedules(id: string) {
    return this.request<Schedule[]>({ method: "GET", path: `/api/app/devices/${id}/schedules` });
  }
  async saveSchedule(id: string, input: ScheduleInput) {
    const { id: scheduleID, nextExecutionAt: _, ...body } = input;
    return this.request<Schedule>({
      method: scheduleID ? "PATCH" : "POST",
      path: `/api/app/devices/${id}/schedules${scheduleID ? "/" + scheduleID : ""}`,
      body,
    });
  }
  async enableSchedule(id: string, scheduleID: string, enabled: boolean) {
    return this.request({
      method: "PUT",
      path: `/api/app/devices/${id}/schedules/${scheduleID}/enabled`,
      body: { enabled },
    });
  }
  async deleteSchedule(id: string, scheduleID: string) {
    return this.request({
      method: "DELETE",
      path: `/api/app/devices/${id}/schedules/${scheduleID}`,
    });
  }
  async members(id: string, signal?: AbortSignal) {
    const data = await this.request<unknown>({
      method: "GET",
      path: `/api/app/devices/${encodeURIComponent(id)}/users`,
      signal,
    });
    return deviceMembers(data);
  }
  async removeMember(id: string, userID: string, signal?: AbortSignal) {
    return this.request({
      method: "DELETE",
      path: `/api/app/devices/${encodeURIComponent(id)}/users/${encodeURIComponent(userID)}`,
      signal,
    });
  }
  async share(id: string, signal?: AbortSignal): Promise<ShareBinding> {
    const data = await this.request<unknown>(
      {
        method: "GET",
        path: `/api/app/devices/${encodeURIComponent(id)}/bindCode`,
        signal,
      },
      false,
    );
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError(502, "设备分享响应结构不完整");
    }
    const value = data as Record<string, unknown>;
    if (
      value.deviceID !== id ||
      typeof value.bindCode !== "string" ||
      !value.bindCode.trim() ||
      typeof value.expiresAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value.expiresAt) ||
      !Number.isFinite(Date.parse(value.expiresAt))
    ) {
      throw new ApiError(502, "设备分享码或到期时间无效");
    }
    return {
      deviceID: value.deviceID,
      bindCode: value.bindCode,
      expiresAt: value.expiresAt,
    };
  }

  async acceptShare(id: string, bindCode: string, signal?: AbortSignal): Promise<BindingResult> {
    return this.request<BindingResult>(
      {
        method: "PUT",
        path: `/api/app/device/${encodeURIComponent(id)}/user`,
        body: { bindCode },
        signal,
      },
      false,
    );
  }
  async help(id: string, product = false, signal?: AbortSignal) {
    const path = product
      ? `/api/app/products/${encodeURIComponent(id)}/connectHelping`
      : `/api/app/devices/${encodeURIComponent(id)}/helping`;
    const data = await this.request<unknown>({
      method: "GET",
      path,
      query: { type: "text" },
      signal,
    });
    return helpArticles(data);
  }
  async firmware(id: string, type: OtaType, signal?: AbortSignal): Promise<OtaCheck> {
    const data = await this.request<unknown>({
      method: "GET",
      path: `/api/app/devices/${encodeURIComponent(id)}/ota/${type}`,
      signal,
    });
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError(502, "固件检查响应无效");
    }
    const value = data as Record<string, unknown>;
    const device = value.device as Record<string, unknown> | null;
    const firmware = value.firmware as Record<string, unknown> | null;
    if (
      typeof value.hasUpdate !== "boolean" ||
      device?.id !== id ||
      (value.hasUpdate &&
        (!firmware ||
          typeof firmware.id !== "string" ||
          !firmware.id ||
          typeof firmware.version !== "string" ||
          !firmware.version ||
          typeof firmware.remark !== "string")) ||
      (!value.hasUpdate && firmware !== null)
    ) {
      throw new ApiError(502, "固件检查响应与设备不匹配");
    }
    return {
      hasUpdate: value.hasUpdate,
      firmware: value.hasUpdate ? (firmware as unknown as OtaCheck["firmware"]) : null,
      deviceID: id,
    };
  }

  async startOta(id: string, type: OtaType, firmwareID: string, signal?: AbortSignal) {
    const data = await this.request<unknown>(
      {
        method: "PUT",
        path: `/api/app/devices/${encodeURIComponent(id)}/ota/task`,
        query: { type },
        body: { firmwareID },
        signal,
      },
      false,
    );
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      typeof (data as { taskID?: unknown }).taskID !== "string" ||
      !(data as { taskID: string }).taskID.trim()
    ) {
      throw new ApiError(502, "升级任务响应缺少 taskID");
    }
    return { taskID: (data as { taskID: string }).taskID };
  }

  async otaTask(id: string, taskID: string, signal?: AbortSignal): Promise<OtaTask> {
    const data = await this.request<unknown>({
      method: "GET",
      path: `/api/app/devices/${encodeURIComponent(id)}/ota/task/${encodeURIComponent(taskID)}`,
      signal,
    });
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError(502, "升级任务状态响应无效");
    }
    const value = data as Record<string, unknown>;
    const statuses = ["waiting", "downloading", "upgrading", "success", "failed", "cancelled"];
    const results = ["updating", "success", "failed", "cancelled"];
    if (
      !results.includes(String(value.result)) ||
      !statuses.includes(String(value.status)) ||
      typeof value.progress !== "number" ||
      !Number.isFinite(value.progress) ||
      value.progress < 0 ||
      value.progress > 100 ||
      typeof value.startedAt !== "string" ||
      !Number.isFinite(Date.parse(value.startedAt)) ||
      (value.result === "updating"
        ? !statuses.slice(0, 3).includes(String(value.status))
        : value.result !== value.status)
    ) {
      throw new ApiError(502, "升级任务状态字段无效");
    }
    return value as unknown as OtaTask;
  }

  async cancelOta(id: string, taskID: string, signal?: AbortSignal) {
    return this.request(
      {
        method: "DELETE",
        path: `/api/app/devices/${encodeURIComponent(id)}/ota/task`,
        body: { taskID },
        signal,
      },
      false,
    );
  }
  async preference(key: string, value?: string) {
    const scoped = `${this.userID}.${key}`;
    if (value !== undefined) await this.storage.set(scoped, value);
    return this.storage.get(scoped);
  }
}

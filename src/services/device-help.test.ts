import { describe, expect, it, vi } from "vitest";
import type { HttpFetcher } from "./http";
import { MockHttpClient } from "./http";
import { DeviceHelpFlow } from "./device-help";
import {
  ApiError,
  type ApiEnvelope,
  type HelpArticle,
  type Language,
  type Session,
} from "./models";
import { RealHttpClient } from "./real-http";
import { RowanService } from "./rowan";
import { MemoryStorage, MockDatabase, defaultSettings } from "./store";

const article = (content = "正文", id = "help_1"): HelpArticle => ({
  id,
  title: "设备帮助",
  content,
});

async function mockSetup() {
  const db = await MockDatabase.open(new MemoryStorage());
  const http = new MockHttpClient(db);
  const service = new RowanService(http, new MemoryStorage());
  await service.login("rowan@example.com", "Rowan@123", "password");
  return { db, http, service };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function flowService() {
  const listeners = new Set<() => void>();
  const help = vi.fn(
    async (
      _id: string,
      _product = false,
      _signal?: AbortSignal,
    ): Promise<HelpArticle[]> => [article()],
  );
  let revision = 0;
  const service = {
    session: { userID: "account-a" },
    get sessionRevision() {
      return revision;
    },
    help,
    onSessionChange(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as RowanService;
  return {
    service,
    help,
    changeAccount(userID: string) {
      service.session = { userID } as Session;
      revision++;
      for (const listener of listeners) listener();
    },
  };
}

describe("RF-0044 device manual and FAQ", () => {
  it.each([
    ["zh-CN", "设备使用帮助", "常见问题"],
    ["zh-TW", "裝置使用說明", "常見問題"],
    ["en", "Device help", "FAQ"],
  ] as const)(
    "reads authenticated text help in %s as ordered articles",
    async (language, first, second) => {
      const { http, service } = await mockSetup();
      service.session!.setting.language = language as Language;
      const request = vi.spyOn(http, "request");
      const result = await service.help("dev_wine");

      expect(result.map((item) => item.title)).toEqual([first, second]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          path: "/api/app/devices/dev_wine/helping",
          query: { type: "text" },
          headers: expect.objectContaining({
            Authorization: `Bearer ${service.session!.accessToken}`,
            "Accept-Language": language,
          }),
        }),
      );
    },
  );

  it("requires Bearer authentication and the text shape in Mock", async () => {
    const { http, service } = await mockSetup();
    const path = "/api/app/devices/dev_wine/helping";
    const missing = await http.request<ApiEnvelope<unknown>>({
      method: "GET",
      path,
      query: { type: "text" },
    });
    expect(missing.data.code).toBe(401);

    const wrongShape = await http.request<ApiEnvelope<unknown>>({
      method: "GET",
      path,
      query: { type: "url" },
      headers: { Authorization: `Bearer ${service.session!.accessToken}` },
    });
    expect(wrongShape.data.code).toBe(400);
  });

  it("preserves the source's missing-device and unbound errors", async () => {
    const { db, service } = await mockSetup();
    await expect(service.help("missing-device")).rejects.toMatchObject({
      code: 1451,
    });

    delete db.state.devices[0].members[service.userID];
    await expect(service.help("dev_wine")).rejects.toMatchObject({
      code: 1452,
    });
  });

  it("maps the deployed array response without opening or rewriting content", async () => {
    const fetcher = vi.fn<HttpFetcher>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          success: true,
          message: "成功",
          data: [
            article("https://outside.example.test/help"),
            article("文字", "help_2"),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new RealHttpClient(
      {
        apiBaseUrl: "https://platform.example.test",
        iotApiBaseUrl: "https://iot.example.test/module",
        tenantID: "42",
      },
      fetcher,
    );
    const service = new RowanService(client, new MemoryStorage());
    service.session = {
      userID: "user-a",
      accessToken: "token-a",
      refreshToken: "refresh-a",
      tokenType: "Bearer",
      expiresIn: 3600,
      setting: defaultSettings(),
    };
    const controller = new AbortController();
    const result = await service.help("dev_wine", false, controller.signal);

    expect(result.map((item) => item.content)).toEqual([
      "https://outside.example.test/help",
      "文字",
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "https://iot.example.test/module/app-api/devices/dev_wine/helping?type=text",
      expect.objectContaining({
        signal: controller.signal,
        headers: expect.objectContaining({
          Authorization: "Bearer token-a",
          "tenant-id": "42",
          "Accept-Language": "zh-CN",
        }),
      }),
    );

    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 0,
          success: true,
          message: "成功",
          data: [{ id: "help_broken", title: "坏数据", content: null }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    await expect(service.help("dev_wine")).rejects.toMatchObject({ code: 502 });
  });

  it("shows empty content distinctly from a failed read", async () => {
    const { service, help } = flowService();
    help.mockResolvedValueOnce([article("  "), article("", "help_2")]);
    const flow = new DeviceHelpFlow(service, "dev-a");

    await flow.start();
    expect(flow.state).toMatchObject({ value: [], error: "", loading: false });
    flow.stop();
  });

  it("retains same-device success on ordinary failure, then clears it for access loss", async () => {
    const { service, help } = flowService();
    const flow = new DeviceHelpFlow(service, "dev-a");
    await flow.start();
    const value = flow.state.value;

    help.mockRejectedValueOnce(new ApiError(503, "服务暂不可用"));
    await flow.load();
    expect(flow.state.value).toBe(value);
    expect(flow.state.error).toContain("服务暂不可用");

    help.mockRejectedValueOnce(new ApiError(1452, "没有设备权限"));
    await flow.load();
    expect(flow.state.value).toBeNull();
    expect(flow.state.error).toContain("没有设备权限");
    flow.stop();
  });

  it("ignores a late response after focus is lost", async () => {
    const { service, help } = flowService();
    const pending = deferred<HelpArticle[]>();
    help.mockImplementationOnce(() => pending.promise);
    const flow = new DeviceHelpFlow(service, "dev-a");
    const start = flow.start();
    const signal = help.mock.calls[0][2];
    expect(flow.state.loading).toBe(true);

    flow.stop();
    pending.resolve([article("old device")]);
    await start;
    expect(signal?.aborted).toBe(true);
    expect(flow.state.value).toBeNull();
  });

  it("clears same-page help when the account or session changes", async () => {
    const { service, help, changeAccount } = flowService();
    const flow = new DeviceHelpFlow(service, "dev-a");
    await flow.start();
    expect(flow.state.value?.[0].content).toBe("正文");

    changeAccount("account-b");
    expect(flow.state.value).toBeNull();
    expect(flow.state.active).toBe(false);

    help.mockResolvedValueOnce([article("new account")]);
    await flow.start();
    expect(flow.state.value?.[0].content).toBe("new account");
    flow.stop();
  });

  it("does not copy device A's pending result into device B", async () => {
    const { service, help } = flowService();
    const pending = deferred<HelpArticle[]>();
    help.mockImplementationOnce(() => pending.promise);
    help.mockResolvedValueOnce([article("device B")]);
    const first = new DeviceHelpFlow(service, "dev-a");
    const firstRead = first.start();
    first.stop();

    const second = new DeviceHelpFlow(service, "dev-b");
    await second.start();
    pending.resolve([article("device A")]);
    await firstRead;
    expect(first.state.value).toBeNull();
    expect(second.state.value?.[0].content).toBe("device B");
    second.stop();
  });

  it("ends a hung request with a visible timeout and allows retry", async () => {
    const { service, help } = flowService();
    help.mockImplementationOnce(
      () => new Promise<HelpArticle[]>(() => undefined),
    );
    const flow = new DeviceHelpFlow(service, "dev-a", 20);
    await flow.start();
    expect(flow.state.error).toContain("超时");
    expect(flow.state.loading).toBe(false);

    await flow.load();
    expect(flow.state.value?.[0].content).toBe("正文");
    flow.stop();
  });
});

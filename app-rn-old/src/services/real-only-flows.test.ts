import { afterEach, describe, expect, it, vi } from "vitest";
import type { HttpClient } from "../lib/core";
import { UnavailableDeviceTransport, type DeviceTransport } from "../protocol/device";
import { ControlledDeviceSession } from "../protocol/controlled-session";
import type { DeviceSession } from "../protocol/device-session";
import { Provisioner0822 } from "../protocol/provision-0822";
import { Provisioner0922 } from "../protocol/provision-0922";
import { MemoryStorage, defaultSettings } from "../test-support/settings-fixture";
import { ApiError, type DeviceView, type Product } from "./models";
import { RowanService } from "./rowan";
import { AddDeviceCoordinator, AddDeviceFlow, validateWifi } from "./onboarding";
import { QrScanFlow } from "./scan-flow";
import { DeviceShareFlow } from "./device-share";

const product: Product = {
  id: "actual-product",
  deviceProductID: "LF-WM05",
  name: "Backend product",
  modelName: "Actual01",
  seriesName: "Actual",
  category: "Other",
  image: "",
  configType: "B",
  connectType: "wifi",
  bluetooth: true,
  buyLink: "",
};
const view: DeviceView = {
  deviceNickname: "Backend device",
  bindingRole: "sa",
  bindingAt: "",
  device: { id: "actual-device" },
  product: { id: product.id },
};
function setup() {
  const http: HttpClient = {
    request: vi.fn().mockRejectedValue(new Error("No HTTP fixture configured")),
  };
  const service = new RowanService(http, new MemoryStorage());
  service.session = {
    userID: "actual-user",
    accessToken: "test-access",
    refreshToken: "test-refresh",
    expiresIn: 3600,
    tokenType: "bearer",
    setting: defaultSettings(),
  };
  vi.spyOn(service, "product").mockResolvedValue(product);
  vi.spyOn(service, "products").mockResolvedValue([
    { category: product.category, products: [product] },
  ]);
  vi.spyOn(service, "device").mockResolvedValue(view);
  return { service, http };
}
const candidate = {
  handle: "native-handle",
  mac: "aabbccddeeff",
  model: product.modelName,
  service: "0822",
  productID: product.id,
};
const contract = {
  profile: { factoryReply: new Uint8Array([1]), stageTimeout: 1000 },
  makeBindCode: vi.fn(async () => "issued-bind"),
  deviceToken: (token: string) => token,
  bindingTimeout: 1000,
  operationTimeout: 1000,
};
const wifi = {
  read: vi.fn(async () => ({
    connection: "wifi" as const,
    source: "system" as const,
    band: "2.4" as const,
    ssid: "Actual WiFi",
  })),
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("real-only device onboarding", () => {
  it("rejects unsupported platform scans without inventing discoveries", async () => {
    const { service } = setup(),
      flow = new AddDeviceFlow(service, new UnavailableDeviceTransport(), {});
    await expect(flow.scan()).rejects.toThrow();
    expect(flow.state.discovered).toEqual([]);
    flow.stop();
  });
  it("blocks missing provisioning contracts before reading addresses or writing BLE", async () => {
    const { service } = setup(),
      driver = new UnavailableDeviceTransport(),
      write = vi.spyOn(driver, "exchange"),
      connection = vi.spyOn(service, "connection");
    const flow = new AddDeviceFlow(service, driver, {});
    await flow.select(candidate);
    await expect(flow.provision("Actual WiFi", "pass")).rejects.toThrow("契约尚未配置");
    expect(write).not.toHaveBeenCalled();
    expect(connection).not.toHaveBeenCalled();
    expect(flow.state.binding).toBeUndefined();
    flow.stop();
  });
  it("does not substitute the catalog ID when the product list omits device productid", async () => {
    const { service } = setup();
    vi.spyOn(service, "products").mockResolvedValue([
      { category: product.category, products: [{ ...product, deviceProductID: undefined }] },
    ]);
    const connection = vi.spyOn(service, "connection");
    const runner = vi.spyOn(Provisioner0822.prototype, "run");
    const flow = new AddDeviceFlow(service, new UnavailableDeviceTransport(), {
      real: contract,
      wifi,
    });
    await flow.select(candidate);
    await expect(flow.provision("Actual WiFi", "pass")).rejects.toThrow(
      "产品列表未提供设备端 productid",
    );
    expect(connection).not.toHaveBeenCalled();
    expect(runner).not.toHaveBeenCalled();
    flow.stop();
  });
  it("uses issued bind codes and confirmed runner; reconciles uncertain results without another write", async () => {
    const { service } = setup();
    vi.spyOn(service, "connection").mockResolvedValue({
      certificationURL: "https://device.test/cert",
    });
    const binding = {
      deviceID: view.device.id,
      userID: service.userID,
      bindingRole: "sa" as const,
    };
    const status = vi
      .spyOn(service, "bindStatus")
      .mockRejectedValueOnce(new ApiError(0, "response lost"))
      .mockResolvedValue(binding);
    const runner = vi
      .spyOn(Provisioner0822.prototype, "run")
      .mockImplementation(async (_input, _status, signal, readBinding, onWrite) => {
        onWrite?.();
        return readBinding!(signal);
      });
    const flow = new AddDeviceFlow(service, new UnavailableDeviceTransport(), {
      real: contract,
      wifi,
    });
    await flow.select(candidate);
    await expect(flow.provision("Actual WiFi", "pass")).rejects.toThrow("response lost");
    expect(flow.state.stage).toBe("unknown");
    await expect(flow.provision("Actual WiFi", "pass")).rejects.toThrow("结果待确认");
    await flow.reconcile();
    expect(flow.state.binding).toEqual(binding);
    expect(status).toHaveBeenCalledTimes(2);
    expect(runner).toHaveBeenCalledOnce();
    expect(runner.mock.calls[0][0].productID).toBe("LF-WM05");
    expect(runner.mock.calls[0][0].bindCode).toBe("issued-bind");
    flow.stop();
  });
  it("does not accept a different system Wi-Fi or fabricate a binding", async () => {
    const { service } = setup(),
      flow = new AddDeviceFlow(service, new UnavailableDeviceTransport(), { real: contract, wifi });
    await flow.select(candidate);
    await expect(flow.provision("Other WiFi", "pass")).rejects.toThrow("Wi-Fi已变化");
    expect(flow.state.binding).toBeUndefined();
    flow.stop();
  });
  it.each([false, true])(
    "routes 0922 and confirms actual binding (manual SSID: %s)",
    async (manual) => {
      const { service } = setup(),
        driver = new UnavailableDeviceTransport();
      const flow = new AddDeviceFlow(service, driver, {
        environment: "development",
        wifi: manual
          ? {
              supportsManualSSID: true,
              read: vi.fn().mockRejectedValue(new Error("SSID unavailable")),
            }
          : wifi,
        real: { bindingTimeout: 1000, operationTimeout: 1000, deviceToken: (token) => token },
      });
      const legacy = { ...candidate, service: "00000922-0000-1000-8000-00805f9b34fb" };
      await flow.select(legacy);
      vi.spyOn(service, "connection").mockResolvedValue({
        certificationURL: "https://device.test/cert",
      });
      const bind = vi.spyOn(service, "bindStatus");
      const home = vi
        .spyOn(service, "home")
        .mockResolvedValue([
          {
            room: null,
            devices: [{ ...view, device: { id: view.device.id, mac: candidate.mac } }],
          },
        ]);
      const runner = vi
        .spyOn(Provisioner0922.prototype, "run")
        .mockImplementation(async (input, onStatus, signal, confirm, submitted) => {
          expect(input.ssid).toBe("Actual WiFi");
          expect(input.password).toBe("public-password");
          expect(input.service).toBe(legacy.service);
          expect(input.productID).toBe("LF-WM05");
          expect(input.bindCode).toBe("");
          submitted?.();
          onStatus("D0");
          expect(flow.state.binding).toBeUndefined();
          return confirm!(signal);
        });
      const runner0822 = vi.spyOn(Provisioner0822.prototype, "run");
      try {
        await flow.provision("Actual WiFi", "public-password", manual);
        expect(runner).toHaveBeenCalledOnce();
        expect(runner0822).not.toHaveBeenCalled();
        expect(bind).not.toHaveBeenCalled();
        expect(home).toHaveBeenCalledOnce();
        expect(flow.state).toMatchObject({ stage: "bound", binding: { deviceID: view.device.id } });
      } finally {
        flow.stop();
      }
    },
  );
  it("does not claim binding when HOME-01 has ambiguous MAC matches", async () => {
    const { service } = setup();
    const flow = new AddDeviceFlow(service, new UnavailableDeviceTransport(), {
      wifi,
      real: { bindingTimeout: 1000, operationTimeout: 1000, deviceToken: (token) => token },
    });
    await flow.select({ ...candidate, service: "0922" });
    vi.spyOn(service, "connection").mockResolvedValue({
      certificationURL: "https://device.test/cert",
    });
    vi.spyOn(service, "home").mockResolvedValue([
      {
        room: null,
        devices: ["first", "second"].map((id) => ({
          ...view,
          device: { id, mac: "aa:bb:cc:dd:ee:ff" },
        })),
      },
    ]);
    vi.spyOn(Provisioner0922.prototype, "run").mockImplementation(
      async (_input, _status, signal, confirm, submitted) => {
        submitted?.();
        return confirm!(signal);
      },
    );
    try {
      await expect(flow.provision("Actual WiFi", "public-password")).rejects.toMatchObject({
        code: 409,
      });
      expect(flow.state.stage).toBe("unknown");
      expect(flow.state.binding).toBeUndefined();
    } finally {
      flow.stop();
    }
  });
  it("keeps the firmware byte limits and explicit product password validation", () => {
    expect(() => validateWifi("wifi", "")).toThrow("密码");
    expect(() => validateWifi("wifi", "a".repeat(255))).toThrow("0822");
    const validate = vi.fn();
    validateWifi("wifi", "short", validate);
    expect(validate).toHaveBeenCalledWith("short");
  });
});

describe("add device entry from Home", () => {
  it("starts a fresh discovery after an ended scan and ignores its late callbacks", async () => {
    vi.useFakeTimers();
    const { service } = setup();
    const driver: DeviceTransport = new UnavailableDeviceTransport();
    const reports: Parameters<DeviceTransport["scan"]>[1][] = [];
    const scan = vi.spyOn(driver, "scan").mockImplementation(async (_signal, report) => {
      reports.push(report);
      report?.(candidate);
      return [candidate];
    });
    const coordinator = new AddDeviceCoordinator(service, driver, { scanTimeout: 1000 });
    const flow = coordinator.enterFromHome();
    const firstScan = flow.scan();
    await vi.advanceTimersByTimeAsync(1000);
    await firstScan;
    expect(flow.state.discovered).toEqual([candidate]);
    flow.stop();
    // Returning within the same add flow still preserves that round's discoveries.
    expect(coordinator.acquire().state.discovered).toEqual([candidate]);

    const next = coordinator.enterFromHome();
    expect(next.state).toMatchObject({ stage: "idle", message: "", error: "", discovered: [] });
    const nextCandidate = { ...candidate, mac: "112233445566", handle: "new-handle" };
    scan.mockImplementation(async (_signal, report) => {
      report?.(nextCandidate);
      return [nextCandidate];
    });
    const secondScan = next.scan();
    reports[0]?.(candidate);
    expect(next.state).toMatchObject({ stage: "scanning", discovered: [nextCandidate] });
    await vi.advanceTimersByTimeAsync(1000);
    await secondScan;
    expect(next.state.discovered).toEqual([nextCandidate]);
    expect(scan).toHaveBeenCalledTimes(2);
    coordinator.clear();
  });

  it.each([403, 61, 65])(
    "clears a previous scan failure (%s) on a new Home entry",
    async (code) => {
      const { service } = setup();
      const driver: DeviceTransport = new UnavailableDeviceTransport();
      const scan = vi.spyOn(driver, "scan").mockRejectedValue(new ApiError(code, "old scan error"));
      const coordinator = new AddDeviceCoordinator(service, driver, {});
      const flow = coordinator.enterFromHome();
      await expect(flow.scan()).rejects.toThrow("old scan error");
      flow.stop();
      expect(coordinator.acquire().state.error).toBe("old scan error");
      const next = coordinator.enterFromHome();
      expect(next.state).toMatchObject({
        stage: "idle",
        message: "",
        error: "",
        discovered: [],
      });
      expect(next.state.scanIssue).toBeUndefined();
      // Entry prepares a clean state; the focused search page starts the permission check/scan.
      expect(scan).toHaveBeenCalledOnce();
      coordinator.clear();
    },
  );

  it("clears a definite C3 failure and the selected device when entering from Home", async () => {
    const { service } = setup();
    vi.spyOn(service, "connection").mockResolvedValue({
      certificationURL: "https://device.test/cert",
    });
    const runner = vi
      .spyOn(Provisioner0822.prototype, "run")
      .mockImplementation(async (_input, onStatus, _signal, _readBinding, onWrite) => {
        onWrite?.();
        onStatus("C3");
        throw new ApiError(0xc3, "配网未完成（C3）");
      });
    const coordinator = new AddDeviceCoordinator(service, new UnavailableDeviceTransport(), {
      real: contract,
      wifi,
    });
    const flow = coordinator.enterFromHome();
    await flow.select(candidate);
    await expect(flow.provision("Actual WiFi", "pass")).rejects.toThrow("C3");
    flow.stop();
    expect(flow.state).toMatchObject({ stage: "failed", error: "配网未完成（C3）" });
    const next = coordinator.enterFromHome();
    expect(next.state).toMatchObject({
      stage: "idle",
      message: "",
      error: "",
      discovered: [],
    });
    expect(next.state.candidate).toBeUndefined();
    expect(next.state.product).toBeUndefined();
    expect(next.state.deviceStep).toBeUndefined();
    expect(next.state.deviceProgress).toBeUndefined();
    expect(runner).toHaveBeenCalledOnce();
    coordinator.clear();
  });

  it("resumes unknown and confirmed binding results without new scanning or provisioning", async () => {
    const { service } = setup();
    vi.spyOn(service, "connection").mockResolvedValue({
      certificationURL: "https://device.test/cert",
    });
    const binding = {
      deviceID: view.device.id,
      userID: service.userID,
      bindingRole: "sa" as const,
    };
    const status = vi
      .spyOn(service, "bindStatus")
      .mockRejectedValueOnce(new ApiError(0, "response lost"))
      .mockResolvedValue(binding);
    const runner = vi
      .spyOn(Provisioner0822.prototype, "run")
      .mockImplementation(async (_input, _status, signal, readBinding, onWrite) => {
        onWrite?.();
        return readBinding!(signal);
      });
    const driver = new UnavailableDeviceTransport();
    const scan = vi.spyOn(driver, "scan");
    const makeBindCode = vi.fn(async () => "original-bind-code");
    const coordinator = new AddDeviceCoordinator(service, driver, {
      real: { ...contract, makeBindCode },
      wifi,
    });
    const flow = coordinator.enterFromHome();
    await flow.select(candidate);
    await expect(flow.provision("Actual WiFi", "pass")).rejects.toThrow("response lost");
    flow.stop();
    const resumed = coordinator.enterFromHome();
    expect(resumed).toBe(flow);
    expect(resumed.state).toMatchObject({ stage: "unknown", candidate, error: "response lost" });
    await expect(resumed.scan()).rejects.toThrow("当前绑定结果");
    await expect(resumed.provision("Actual WiFi", "pass")).rejects.toThrow("结果待确认");
    await resumed.reconcile();
    const bound = coordinator.enterFromHome();
    expect(bound).toBe(flow);
    expect(bound.state).toMatchObject({ stage: "bound", binding, nickname: "pending" });
    await expect(bound.scan()).rejects.toThrow("当前绑定结果");
    await expect(bound.provision("Actual WiFi", "pass")).rejects.toThrow("已有绑定结果");
    expect(makeBindCode).toHaveBeenCalledOnce();
    expect(runner).toHaveBeenCalledOnce();
    expect(status).toHaveBeenCalledTimes(2);
    expect(status.mock.calls.map(([code]) => code)).toEqual([
      "original-bind-code",
      "original-bind-code",
    ]);
    expect(scan).not.toHaveBeenCalled();
    coordinator.clear();
  });

  it("protects an in-flight submission and ignores a late result when entering from Home", async () => {
    const { service } = setup();
    vi.spyOn(service, "connection").mockResolvedValue({
      certificationURL: "https://device.test/cert",
    });
    const binding = {
      deviceID: view.device.id,
      userID: service.userID,
      bindingRole: "sa" as const,
    };
    let resolve!: (result: typeof binding) => void;
    let signal: AbortSignal | undefined;
    vi.spyOn(Provisioner0822.prototype, "run").mockImplementation(
      async (_input, _status, budget, _readBinding, onWrite) => {
        signal = budget;
        onWrite?.();
        return new Promise<typeof binding>((done) => {
          resolve = done;
        });
      },
    );
    const coordinator = new AddDeviceCoordinator(service, new UnavailableDeviceTransport(), {
      real: contract,
      wifi,
    });
    const flow = coordinator.enterFromHome();
    await flow.select(candidate);
    const pending = flow.provision("Actual WiFi", "pass");
    const cancelled = expect(pending).rejects.toMatchObject({ code: 499 });
    await vi.waitFor(() => expect(resolve).toBeDefined());
    const resumed = coordinator.enterFromHome();
    expect(signal?.aborted).toBe(true);
    expect(resumed.state).toMatchObject({ stage: "unknown", candidate });
    expect(resumed.state.binding).toBeUndefined();
    resolve(binding);
    await cancelled;
    expect(resumed.state).toMatchObject({ stage: "unknown", busy: false });
    expect(resumed.state.binding).toBeUndefined();
    coordinator.clear();
  });
});

describe("real-only QR boundaries", () => {
  it("cannot parse or confirm a code without a supplied protocol", async () => {
    const { service } = setup(),
      flow = new QrScanFlow(service);
    flow.read(['{"version":"rowan-mock-v1","type":"product","productID":"demo"}']);
    expect(flow.state.phase).toBe("idle");
    expect(flow.state.error).toContain("协议尚未配置");
    await expect(flow.confirm()).rejects.toThrow("请先选择");
    expect(service.product).not.toHaveBeenCalled();
  });
  it("uses only the supplied parser and asks for selection when multiple identities remain", async () => {
    const { service } = setup(),
      flow = new QrScanFlow(service, (value) => ({ type: "device", deviceID: `${value}-device`, deviceProductID: value }));
    vi.mocked(service.products).mockResolvedValue([
      {
        category: product.category,
        products: [
          { ...product, id: "one-cloud", deviceProductID: "one" },
          { ...product, id: "two-cloud", deviceProductID: "two" },
        ],
      },
    ]);
    vi.mocked(service.product).mockResolvedValue({ ...product, id: "two-cloud", deviceProductID: "two" });
    flow.read(["one", "two", "one"]);
    expect(flow.state.choices).toHaveLength(2);
    await expect(flow.confirm()).rejects.toThrow("请先选择");
    flow.choose(1);
    expect(await flow.confirm()).toEqual({
      deviceID: "two-device",
      product: { ...product, id: "two-cloud", deviceProductID: "two" },
    });
    expect(service.product).toHaveBeenCalledWith("two-cloud", expect.any(AbortSignal));
  });
  it("maps a scanned device productId to the catalog id before showing its card", async () => {
    const { service } = setup();
    vi.mocked(service.products).mockResolvedValue([
      { category: product.category, products: [{ ...product, id: "prd_100" }] },
    ]);
    vi.mocked(service.product).mockResolvedValue({ ...product, id: "prd_100" });
    const accept = vi.spyOn(service, "acceptShare");
    const flow = new QrScanFlow(service, () => ({
      type: "device",
      deviceID: "dev_1900000000000004",
      deviceProductID: "LF-WM05",
    }));
    flow.read(["first-binding-device-code"]);
    expect(await flow.confirm()).toEqual({
      deviceID: "dev_1900000000000004",
      product: { ...product, id: "prd_100" },
    });
    expect(service.product).toHaveBeenCalledWith("prd_100", expect.any(AbortSignal));
    expect(accept).not.toHaveBeenCalled();
  });
  it("binds a scanned device once without bindCode and confirms HOME before completion", async () => {
    const { service, http } = setup();
    const identity = { type: "device" as const, deviceID: view.device.id, deviceProductID: "LF-WM05" };
    const flow = new QrScanFlow(service, () => identity);
    vi.mocked(http.request).mockResolvedValue({
      status: 200,
      headers: {},
      data: { code: 0, success: true, message: "", data: {
        deviceID: identity.deviceID, userID: service.userID, bindingRole: "sa",
      } },
    });
    vi.spyOn(service, "home").mockResolvedValue([{ room: null, devices: [view] }]);
    flow.read(["device-code"]);
    await flow.confirm();
    expect(await flow.bindScannedDevice()).toEqual({
      binding: { deviceID: identity.deviceID, userID: service.userID, bindingRole: "sa" },
    });
    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "PUT", path: `/api/app/device/${identity.deviceID}/user`,
    }));
    const write = vi.mocked(http.request).mock.calls[0][0];
    expect(write.body).toBeUndefined();
    await expect(flow.bindScannedDevice()).rejects.toThrow("勿重复提交");
    expect(http.request).toHaveBeenCalledOnce();
  });
  it("keeps a scanned card on a definite PAIR-06 failure", async () => {
    const { service } = setup();
    const bind = vi.spyOn(service, "bindFirstDevice").mockRejectedValue(new ApiError(403, "无权限绑定"));
    const flow = new QrScanFlow(service, () => ({
      type: "device", deviceID: view.device.id, deviceProductID: "LF-WM05",
    }));
    flow.read(["device-code"]);
    await flow.confirm();
    await expect(flow.bindScannedDevice()).rejects.toThrow("无权限绑定");
    expect(flow.state.phase).toBe("done");
    expect(bind).toHaveBeenCalledOnce();
  });
  it("reconciles an uncertain first binding by HOME without resubmitting PAIR-06", async () => {
    const { service } = setup();
    const bind = vi.spyOn(service, "bindFirstDevice").mockRejectedValue(new ApiError(0, "response lost"));
    vi.spyOn(service, "home")
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ room: null, devices: [view] }]);
    const flow = new QrScanFlow(service, () => ({
      type: "device", deviceID: view.device.id, deviceProductID: "LF-WM05",
    }));
    flow.read(["device-code"]);
    await flow.confirm();
    await expect(flow.bindScannedDevice()).rejects.toThrow("response lost");
    expect(flow.state.phase).toBe("unknown");
    await expect(flow.bindScannedDevice()).rejects.toThrow("勿重复提交");
    expect(await flow.reconcile()).toEqual({
      binding: { deviceID: view.device.id, userID: service.userID, bindingRole: "sa" },
    });
    expect(bind).toHaveBeenCalledOnce();
  });
  it("keeps a successful PAIR-06 response pending until HOME lists the device", async () => {
    const { service } = setup();
    const bind = vi.spyOn(service, "bindFirstDevice").mockResolvedValue({
      deviceID: view.device.id, userID: service.userID, bindingRole: "sa",
    });
    const home = vi.spyOn(service, "home")
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ room: null, devices: [view] }]);
    const flow = new QrScanFlow(service, () => ({
      type: "device", deviceID: view.device.id, deviceProductID: "LF-WM05",
    }));
    flow.read(["device-code"]);
    await flow.confirm();
    await expect(flow.bindScannedDevice()).rejects.toThrow("首页尚未显示");
    expect(flow.state.phase).toBe("unknown");
    expect(await flow.reconcile()).toMatchObject({ binding: { deviceID: view.device.id } });
    expect(bind).toHaveBeenCalledOnce();
    expect(home).toHaveBeenCalledTimes(2);
  });
  it("does not accept a PAIR-06 response for a different device or role", async () => {
    for (const response of [
      { deviceID: "other", userID: "actual-user", bindingRole: "sa" as const },
      { deviceID: view.device.id, userID: "actual-user", bindingRole: "mbr" as const },
    ]) {
      const { service } = setup();
      vi.spyOn(service, "bindFirstDevice").mockResolvedValue(response);
      const home = vi.spyOn(service, "home");
      const flow = new QrScanFlow(service, () => ({
        type: "device", deviceID: view.device.id, deviceProductID: "LF-WM05",
      }));
      flow.read(["device-code"]);
      await flow.confirm();
      await expect(flow.bindScannedDevice()).rejects.toThrow(
        response.deviceID === "other" ? "设备 ID 与二维码不一致" : "普通成员角色，首绑应为管理员",
      );
      expect(flow.state.phase).toBe("unknown");
      expect(home).not.toHaveBeenCalled();
    }
  });
  it("ignores a first-binding response from a prior login context", async () => {
    const { service } = setup();
    let resolve!: (binding: { deviceID: string; userID: string; bindingRole: "sa" }) => void;
    vi.spyOn(service, "bindFirstDevice").mockReturnValue(new Promise((done) => { resolve = done; }));
    const home = vi.spyOn(service, "home");
    const flow = new QrScanFlow(service, () => ({
      type: "device", deviceID: view.device.id, deviceProductID: "LF-WM05",
    }));
    flow.read(["device-code"]);
    await flow.confirm();
    const pending = flow.bindScannedDevice();
    await vi.waitFor(() => expect(resolve).toBeDefined());
    await service.clearLocal();
    resolve({ deviceID: view.device.id, userID: "actual-user", bindingRole: "sa" });
    await expect(pending).rejects.toMatchObject({ code: 499 });
    expect(flow.state.phase).toBe("unknown");
    expect(home).not.toHaveBeenCalled();
  });
  it("blocks missing or ambiguous device productid mappings before PAIR-02", async () => {
    for (const products of [
      [],
      [
        { ...product, id: "prd_100" },
        { ...product, id: "prd_101" },
      ],
    ]) {
      const { service } = setup();
      vi.mocked(service.products).mockResolvedValue([{ category: product.category, products }]);
      const flow = new QrScanFlow(service, () => ({
        type: "device",
        deviceID: "dev_1900000000000004",
        deviceProductID: "LF-WM05",
      }));
      flow.read(["first-binding-device-code"]);
      await expect(flow.confirm()).rejects.toThrow("产品");
      expect(service.product).not.toHaveBeenCalled();
    }
  });
  it("does not show a scanned device card when PAIR-02 disagrees with PAIR-01", async () => {
    const { service } = setup();
    vi.mocked(service.products).mockResolvedValue([
      { category: product.category, products: [{ ...product, id: "prd_100" }] },
    ]);
    vi.mocked(service.product).mockResolvedValue({ ...product, id: "another-cloud-product" });
    const accept = vi.spyOn(service, "acceptShare");
    const flow = new QrScanFlow(service, () => ({
      type: "device",
      deviceID: "dev_1900000000000004",
      deviceProductID: "LF-WM05",
    }));
    flow.read(["first-binding-device-code"]);
    await expect(flow.confirm()).rejects.toThrow("产品详情与二维码标识不一致");
    expect(flow.state.phase).toBe("choosing");
    expect(accept).not.toHaveBeenCalled();
  });
  it("reconciles a lost share response by reading HOME and never repeats the single-use code", async () => {
    const { service } = setup(),
      accept = vi.spyOn(service, "acceptShare").mockRejectedValue(new ApiError(0, "response lost"));
    vi.spyOn(service, "home")
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ room: null, devices: [view] }]);
    const flow = new QrScanFlow(service, () => ({
      type: "share",
      deviceID: view.device.id,
      bindCode: "issued-share",
    }));
    flow.read(["actual-qr"]);
    await expect(flow.confirm()).rejects.toThrow("response lost");
    expect(flow.state.phase).toBe("unknown");
    await expect(flow.confirm()).rejects.toThrow("勿重复确认");
    expect(await flow.reconcile()).toEqual({
      binding: { deviceID: view.device.id, userID: service.userID, bindingRole: "sa" },
    });
    expect(accept).toHaveBeenCalledOnce();
  });
  it("ignores late product results after leaving the scanner", async () => {
    const { service } = setup();
    let resolve!: (product: Product) => void;
    vi.mocked(service.product).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const flow = new QrScanFlow(service, () => ({
      type: "device",
      deviceID: "dev_1900000000000004",
      deviceProductID: "LF-WM05",
    }));
    flow.read(["actual"]);
    const result = flow.confirm();
    const rejected = expect(result).rejects.toMatchObject({ code: 499 });
    flow.stop();
    resolve(product);
    await rejected;
    expect(flow.state.phase).not.toBe("done");
  });
  it("does not generate a QR from a share response while serialization is unconfirmed", async () => {
    const { service } = setup();
    vi.spyOn(service, "share").mockResolvedValue({
      deviceID: view.device.id,
      bindCode: "issued-share",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const flow = new DeviceShareFlow(service, view.device.id);
    flow.start();
    await vi.waitFor(() => expect(flow.state.phase).toBe("unsupported"));
    expect(flow.state.qrValue).toBeUndefined();
    flow.stop();
  });
  it("blocks non-admin sharing before requesting a share code", async () => {
    const { service } = setup();
    vi.mocked(service.device).mockResolvedValue({ ...view, bindingRole: "mbr" });
    const share = vi.spyOn(service, "share");
    const flow = new DeviceShareFlow(service, view.device.id);
    flow.start();
    await vi.waitFor(() => expect(flow.state.phase).toBe("blocked"));
    expect(share).not.toHaveBeenCalled();
    flow.stop();
  });
});

describe("real-only capability gates", () => {
  it("never uses built-in product, maintenance or alarm mappings when none is supplied", async () => {
    const inner: DeviceSession = {
      ready: true,
      sending: false,
      confirmed: { relay: false },
      connect: vi.fn(async () => undefined),
      close: vi.fn(),
      command: vi.fn(),
      onChange: () => () => undefined,
    };
    const session = new ControlledDeviceSession(inner, async () => ({
      device: view,
      model: { version: "actual", attributes: [], services: [], events: [] },
    }));
    await session.connect();
    expect(session.controls).toBeUndefined();
    expect(session.maintenance).toBeUndefined();
    expect(session.controlError).toContain("尚未配置");
    expect(session.maintenanceError).toContain("尚未配置");
    expect(session.eventError).toContain("尚未配置");
    await expect(session.command({ relay: true })).rejects.toThrow("尚未配置");
    expect(inner.command).not.toHaveBeenCalled();
    session.close();
    expect(inner.close).toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { checkProvisionWifi, observeWifi, requireCurrentWifi } from "./wifi";
import { wifiGuidance } from "./network-policy";

describe("系统Wi-Fi事实与凭据守卫", () => {
  it("uses the actual frequency rather than guessing from the SSID", () => {
    const observed = observeWifi({
      type: "wifi",
      isConnected: true,
      details: { ssid: "Example-5G", frequency: 2457 },
    });
    expect(observed).toMatchObject({ ssid: "Example-5G", band: "2.4", connection: "wifi" });
  });
  it("allows unknown band with guidance and preserves the actual SSID", () => {
    const observed = observeWifi({
      type: "wifi",
      isConnected: true,
      details: { ssid: "actual-network", frequency: null },
    });
    expect(requireCurrentWifi(observed, "actual-network")).toBe("actual-network");
    expect(wifiGuidance(observed)).toContain("未知频段不作为失败依据");
  });
  it("distinguishes unknown SSID and disconnected network without inventing a name", () => {
    const wifi = observeWifi({
        type: "wifi",
        isConnected: true,
        details: { ssid: "<unknown ssid>" },
      }),
      offline = observeWifi({ type: "wifi", isConnected: false });
    expect(wifi.ssid).toBeUndefined();
    expect(wifiGuidance(wifi)).toContain("无法读取SSID");
    expect(wifiGuidance(offline)).toContain("未检测到");
    expect(() => requireCurrentWifi(wifi)).toThrow("无法读取");
    expect(() => requireCurrentWifi(offline)).toThrow("连接设备支持");
  });
  it("distinguishes permission guidance and known 5GHz from band uncertainty", () => {
    const wifi = observeWifi({
      type: "wifi",
      isConnected: true,
      details: { ssid: "network", frequency: 5180 },
    });
    expect(wifiGuidance(wifi)).toContain("5GHz");
    expect(wifiGuidance({ ...wifi, ssid: undefined, ssidAccess: "denied" })).toContain(
      "权限尚未授予",
    );
  });
  it("refuses credentials captured for a previous network", () => {
    const wifi = observeWifi({ type: "wifi", isConnected: true, details: { ssid: "changed" } });
    expect(() => requireCurrentWifi(wifi, "previous")).toThrow("已变化");
  });
  it("does not turn an unknown connection into a usable SSID", () => {
    const wifi = observeWifi({
      type: "wifi",
      isConnected: null,
      details: { ssid: "possibly-stale" },
    });
    expect(wifi.ssid).toBeUndefined();
    expect(() => requireCurrentWifi(wifi)).toThrow("无法读取");
  });
});

describe("iOS manual SSID guard", () => {
  const signal = () => new AbortController().signal;
  it("permits unavailable SSID only for an explicit supported manual path", async () => {
    const read = vi.fn().mockRejectedValue(new Error("SSID unavailable"));
    await expect(
      checkProvisionWifi({ read, supportsManualSSID: true }, " Target ", true, signal()),
    ).resolves.toBeUndefined();
    await expect(
      checkProvisionWifi({ read, supportsManualSSID: true }, "Target", false, signal()),
    ).rejects.toThrow("SSID unavailable");
    await expect(checkProvisionWifi({ read }, "Target", true, signal())).rejects.toThrow(
      "不支持手动",
    );
  });
  it("accepts a missing name but preserves known network guards", async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ connection: "wifi", band: "unknown", source: "system" });
    const reader = { read, supportsManualSSID: true };
    await expect(checkProvisionWifi(reader, "Target", true, signal())).resolves.toBeUndefined();
    read.mockResolvedValue({ connection: "wifi", band: "2.4", source: "system", ssid: "Other" });
    await expect(checkProvisionWifi(reader, "Target", true, signal())).rejects.toThrow(
      "Wi-Fi已变化",
    );
    read.mockResolvedValue({ connection: "wifi", band: "5", source: "system" });
    await expect(checkProvisionWifi(reader, "Target", true, signal())).rejects.toThrow("2.4GHz");
  });
  it("never treats cancellation as permission to send", async () => {
    const controller = new AbortController();
    controller.abort();
    const read = vi.fn().mockRejectedValue(new Error("cancelled"));
    await expect(
      checkProvisionWifi({ read, supportsManualSSID: true }, "Target", true, controller.signal),
    ).rejects.toThrow("cancelled");
  });
});

import { describe, expect, it } from "vitest";
import { observeWifi, requireCurrentWifi } from "./wifi";
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

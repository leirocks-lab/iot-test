import { describe, expect, it } from "vitest";
import { parseRowanCandidates, parseRowanDeviceCode, rowanCodeParser } from "./qr";

const deviceCode = JSON.stringify({
  type: "rowan.device",
  v: 1,
  deviceId: "dev_1900000000000004",
  productId: "LF-WM05",
});

describe("App first-binding device QR contract", () => {
  it("parses a specific device and device-side product ID without a share code", () => {
    expect(parseRowanDeviceCode(deviceCode)).toEqual({
      type: "device",
      deviceID: "dev_1900000000000004",
      deviceProductID: "LF-WM05",
    });
    expect(parseRowanCandidates([deviceCode, deviceCode], rowanCodeParser())).toEqual([
      { type: "device", deviceID: "dev_1900000000000004", deviceProductID: "LF-WM05" },
    ]);
  });

  it.each([
    "not-json",
    "[]",
    JSON.stringify({ type: "rowan.device", v: "1", deviceId: "dev_1", productId: "LF-WM05" }),
    JSON.stringify({ type: "rowan.device", v: 2, deviceId: "dev_1", productId: "LF-WM05" }),
    JSON.stringify({ type: "rowan.device", v: 1, deviceId: " ", productId: "LF-WM05" }),
    JSON.stringify({ type: "rowan.device", v: 1, deviceId: "dev_1", productId: " " }),
    JSON.stringify({ type: "rowan.device", v: 1, deviceID: "dev_1", productId: "LF-WM05" }),
    JSON.stringify({ type: "rowan.device", v: 1, deviceId: "dev_1", productid: "LF-WM05" }),
    JSON.stringify({ type: "rowan.device", v: 1, deviceId: "dev_1", productId: "LF-WM05", bindCode: "x" }),
    JSON.stringify({ type: "rowan.product", v: 1, productid: "LF-WM05" }),
  ])("rejects invalid device payload %s", (payload) => {
    expect(() => parseRowanDeviceCode(payload)).toThrow("无效的 ROWAN 设备二维码");
    expect(() => parseRowanCandidates([payload], rowanCodeParser())).toThrow(
      "图片中没有有效的 ROWAN 二维码",
    );
  });

  it("keeps a separately supplied share protocol independent", () => {
    const parse = rowanCodeParser((value) => {
      if (value !== "confirmed-share") throw new Error("unknown");
      return { type: "share", deviceID: "dev_1", bindCode: "issued" };
    });
    expect(parse(deviceCode)).toEqual({
      type: "device",
      deviceID: "dev_1900000000000004",
      deviceProductID: "LF-WM05",
    });
    expect(parse("confirmed-share")).toEqual({
      type: "share",
      deviceID: "dev_1",
      bindCode: "issued",
    });
  });

  it("never lets a share parser accept invalid or retired App code envelopes", () => {
    const parse = rowanCodeParser(() => ({ type: "share", deviceID: "dev_1", bindCode: "issued" }));
    expect(() => parse(JSON.stringify({ type: "rowan.device", v: 1, productId: "LF-WM05" })))
      .toThrow("无效的 ROWAN 设备二维码");
    expect(() => parse(JSON.stringify({ type: "rowan.product", v: 1, productid: "LF-WM05" })))
      .toThrow("无效的 ROWAN 设备二维码");
  });
});

import { bytesToHex } from "@noble/hashes/utils.js";
import { describe, expect, it } from "vitest";
import { utf8 } from "./ble";
import {
  appDigest0822,
  classify0822,
  decode0822,
  decodeDevice0822,
  encode0822,
  expectedAck0822,
  factoryReply0822,
  FrameStream0822,
  key0822,
  parseAdvertisement0822,
  verifyFactory0822,
} from "./ble-0822";
import { deviceFrame0822 } from "./ble-0822-test-fixture";

const mac = "aabbccddeeff",
  model = "Cheetah02",
  key = key0822(mac, model);
function advertisement() {
  const bytes = new Uint8Array(25);
  bytes.set([0x22, 0x08, 0x1c, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, model.length, ...utf8(model)]);
  return bytes;
}
describe("0822仿真固件独立codec", () => {
  it("checks both observed hardware reply CRC vectors with the device-side polynomial", () => {
    const hardwareKey = key0822("547af4c99f05", "RW-WC-01");
    const ack = deviceFrame0822(0x80, utf8("ok"), hardwareKey);
    const challenge = deviceFrame0822(0x0f, utf8("2D8B7FB91E6B5D61648E89307381B5E0"), hardwareKey);
    expect(ack.at(-1)).toBe(0x48);
    expect(challenge.at(-1)).toBe(0x8f);
    expect(decodeDevice0822(ack, hardwareKey)).toMatchObject({ command: 0x80, data: utf8("ok") });
    expect(decodeDevice0822(challenge, hardwareKey).command).toBe(0x0f);
    expect(() => decode0822(ack, hardwareKey)).toThrow("CRC");
    const corrupted = challenge.slice();
    corrupted[corrupted.length - 1] ^= 1;
    expect(() => decodeDevice0822(corrupted, hardwareKey)).toThrow("CRC");
  });
  it("uses the actual prefix/MAC offset, never inventing product identity or RSSI", () => {
    const device = parseAdvertisement0822({ handle: "native-id", manufacturer: advertisement() });
    expect(device).toMatchObject({ mac, model, handle: "native-id" });
    expect(device.productID).toBeUndefined();
    expect(device.rssi).toBeUndefined();
    const old = advertisement();
    old[1] = 0x09;
    expect(() => parseAdvertisement0822({ handle: "old", manufacturer: old })).toThrow();
    expect(() =>
      parseAdvertisement0822({ handle: "cropped", manufacturer: advertisement().slice(2) }),
    ).toThrow();
  });
  it("matches the raw 16-byte app digest against an independent SHA implementation", () => {
    expect(new TextDecoder().decode(key)).toBe("aabbccddeeffChee");
    const digest = appDigest0822("AA:BB:CC:DD:EE:FF", "CheetahIOT", model);
    expect(bytesToHex(digest)).toBe("c3aba06a106175d9db0b0cd729a82cfe");
    const frame = encode0822(0, digest, key);
    expect([...frame.slice(0, 3)]).toEqual([0xa5, 0x5a, 17]);
    expect(decode0822(frame, key).data).toEqual(digest);
  });
  it("verifies factory hex digest with leapfive rather than a Mock brand string", () => {
    const digest = "1de8128ecd34cc8abf28234e913e40ac";
    expect(verifyFactory0822(mac, utf8(digest))).toBe(true);
    expect(verifyFactory0822(mac, utf8(digest.toUpperCase()))).toBe(true);
    expect(verifyFactory0822(mac, utf8("a08f900a5f2e98df9d27b811252f81ba"))).toBe(false);
  });
  it("rejects CRC/LEN corruption and old application fragment prefixes", () => {
    const frame = encode0822(1, utf8("Test-2.4G"), key),
      bad = frame.slice();
    bad[bad.length - 1] ^= 1;
    expect(() => decode0822(bad, key)).toThrow("CRC");
    expect(() => decode0822(new Uint8Array([0, ...frame]), key)).toThrow();
    expect(() => decode0822(frame.slice(0, -1), key)).toThrow();
  });
  it("writes provisioning parameters with the firmware CRC while preserving handshake framing", () => {
    const ssid = utf8("Test-2.4G");
    const parameter = encode0822(1, ssid, key);
    expect(parameter).toEqual(deviceFrame0822(1, ssid, key));
    expect(decode0822(parameter, key)).toMatchObject({ command: 1, data: ssid });
    const handshake = encode0822(0, new Uint8Array(16), key);
    expect(decode0822(handshake, key).command).toBe(0);
    const factoryReply = encode0822(0x8f, new Uint8Array(), key);
    expect(decode0822(factoryReply, key).command).toBe(0x8f);
    expect(factoryReply).toEqual(deviceFrame0822(0x8f, new Uint8Array(), key));
  });
  it("accepts the maximum LEN only at sufficient MTU, without pretending to support long writes", () => {
    expect(encode0822(2, new Uint8Array(254), key, 517)).toHaveLength(259);
    expect(() => encode0822(2, new Uint8Array(254), key, 247)).toThrow("MTU");
    expect(() => encode0822(2, new Uint8Array(255), key, 517)).toThrow();
    expect(() => encode0822(1.5, new Uint8Array(), key)).toThrow();
  });
  it("preserves both 80 and 0F from split or coalesced notifications", () => {
    const a = encode0822(0x80, utf8("ok"), key),
      b = encode0822(0x0f, utf8("factory"), key),
      stream = new FrameStream0822();
    const together = new Uint8Array([...a, ...b]);
    expect(stream.push(together.slice(0, 4))).toEqual([]);
    expect(stream.push(together.slice(4)).map((f) => decode0822(f, key).command)).toEqual([
      0x80, 0x0f,
    ]);
  });
  it("requires explicit factory DATA, never assigning an undocumented ACK", () => {
    const frame = factoryReply0822(utf8("provided-test-payload"), key);
    expect(decode0822(frame, key)).toMatchObject({
      command: 0x8f,
      data: utf8("provided-test-payload"),
    });
    expect(expectedAck0822(0x8f)).toBeUndefined();
    expect(expectedAck0822(10)).toBe(0x8a);
  });
  it("classifies device/HTTP failures distinctly and does not equate F0 with cloud binding", () => {
    expect(classify0822(0xa4)).toMatchObject({ kind: "stage", status: "A4", outcome: "failure" });
    expect(classify0822(0xb8)).toMatchObject({ kind: "stage", status: "B8", outcome: "failure" });
    expect(classify0822(0xf0)).toEqual({ kind: "stage", status: "F0", outcome: "complete" });
    expect(classify0822(0x13).kind).toBe("failure");
    expect(classify0822(0x90).kind).toBe("failure");
  });
  it("bounds malformed notification streams and clears partial sensitive buffers", () => {
    const stream = new FrameStream0822();
    expect(() => stream.push(new Uint8Array(1025))).toThrow("限制");
    stream.push(new Uint8Array([0xa5, 0x5a, 8]));
    stream.clear();
    expect(stream.push(encode0822(0x82, utf8("public-test"), key))).toHaveLength(1);
  });
});

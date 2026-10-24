import { Buffer } from "buffer";
import { cbc } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ApiError } from "../services/models";
import { deriveKey, fragment, utf8, type DiscoveredDevice } from "./ble";

export const BLE_0922 = {
  service: "00000922-0000-1000-8000-00805f9b34fb",
  write: "0000aab1-0000-1000-8000-00805f9b34fb",
  notify: "0000aab2-0000-1000-8000-00805f9b34fb",
};
const iv = utf8("0000000000000000");

export function parseAdvertisement0922(input: {
  handle: string;
  manufacturer: Uint8Array;
  rssi?: number;
}): DiscoveredDevice {
  const data = input.manufacturer;
  if (data.length !== 25 || data[0] !== 0x22 || data[1] !== 0x09 || data[2] !== 0x1c)
    throw new ApiError(503, "广播不符合0922厂商数据布局");
  const length = data[9];
  if (length < 4 || length > 15 || 10 + length > data.length)
    throw new ApiError(503, "0922广播型号长度无效");
  let model: string;
  try {
    model = new TextDecoder("utf-8", { fatal: true }).decode(data.slice(10, 10 + length));
  } catch {
    throw new ApiError(503, "0922广播型号编码无效");
  }
  const mac = bytesToHex(data.slice(3, 9));
  deriveKey(mac, model);
  return {
    handle: input.handle,
    mac,
    model,
    service: BLE_0922.service,
    ...(input.rssi === undefined ? {} : { rssi: input.rssi }),
  };
}

export function cipherDigest0922(mac: string, series: string, model: string) {
  if (!series || !model) throw new ApiError(503, "实际产品系列及型号尚未提供");
  const normalized = mac.replaceAll(":", "").toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(normalized)) throw new ApiError(400, "0922设备MAC格式无效");
  return bytesToHex(sha256(utf8(`${normalized},${series},${model}`)).slice(0, 16));
}
export function encrypt0922(value: string, key: Uint8Array) {
  const plain = utf8(value);
  try {
    return utf8(Buffer.from(cbc(key, iv).encrypt(plain)).toString("base64"));
  } finally {
    plain.fill(0);
  }
}
export function decrypt0922(payload: Uint8Array, key: Uint8Array) {
  const base64 = new TextDecoder().decode(payload).replace(/\s/g, "");
  try {
    const plain = cbc(key, iv).decrypt(new Uint8Array(Buffer.from(base64, "base64")));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(plain);
    } finally {
      plain.fill(0);
    }
  } catch {
    throw new ApiError(0x63, "0922通知解密或编码失败");
  }
}
export function packets0922(payload: Uint8Array, mtu: number) {
  if (payload.length > 1024) throw new ApiError(400, "0922配网报文超过1024字节");
  try {
    return fragment(payload, mtu);
  } catch {
    throw new ApiError(503, "0922设备MTU无效");
  }
}

/** A 0922 notification is either one 0x00 packet or ordered 0x01/0x10/0x11 fragments. */
export class PacketStream0922 {
  private parts: Uint8Array[] = [];
  push(frame: Uint8Array): Uint8Array[] {
    if (!frame.length) throw new ApiError(0x63, "0922通知为空");
    const marker = frame[0],
      part = frame.slice(1);
    if (part.length > 1024) throw new ApiError(0x63, "0922通知超出1024字节");
    if (marker === 0) {
      this.clear();
      return [part];
    }
    if (marker === 1) {
      this.clear();
      this.parts.push(part);
      return [];
    }
    if ((marker !== 0x10 && marker !== 0x11) || !this.parts.length)
      throw new ApiError(0x63, "0922通知分片顺序无效");
    this.parts.push(part);
    const length = this.parts.reduce((sum, item) => sum + item.length, 0);
    if (length > 1024) {
      this.clear();
      throw new ApiError(0x63, "0922通知超出1024字节");
    }
    if (marker === 0x10) return [];
    const data = new Uint8Array(length);
    let offset = 0;
    for (const item of this.parts) {
      data.set(item, offset);
      offset += item.length;
    }
    this.clear();
    return [data];
  }
  clear() {
    for (const part of this.parts) part.fill(0);
    this.parts = [];
  }
}

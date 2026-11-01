import { sha256 } from "@noble/hashes/sha2.js";
import { ctr } from "@noble/ciphers/aes.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { ApiError } from "../services/models";
import { crc8, encodeFrame, utf8, type DiscoveredDevice } from "./ble";

export const BLE_0822 = {
  service: "00000822-0000-1000-8000-00805f9b34fb",
  write: "0000aab1-0000-1000-8000-00805f9b34fb",
  notify: "0000aab2-0000-1000-8000-00805f9b34fb",
};
export interface Frame0822 {
  command: number;
  data: Uint8Array;
}
function macString(mac: string) {
  const value = mac.replaceAll(":", "").toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(value)) throw new ApiError(400, "0822设备MAC格式无效");
  return value;
}
export function key0822(mac: string, model: string) {
  if (model.length < 4 || !/^[\x20-\x7e]+$/.test(model))
    throw new ApiError(503, "0822型号Key规则尚不支持该型号");
  return utf8(macString(mac) + model.slice(0, 4));
}
export function appDigest0822(mac: string, series: string, model: string) {
  if (!series || !model) throw new ApiError(503, "实际产品系列及型号尚未提供");
  return sha256(utf8(`${macString(mac)},${series},${model}`)).slice(0, 16);
}
export function verifyFactory0822(mac: string, data: Uint8Array) {
  const value = new TextDecoder().decode(data);
  if (!/^[0-9a-fA-F]{32}$/.test(value)) return false;
  const expected = sha256(utf8(`${macString(mac)},leapfive`)).slice(0, 16),
    actual = hexToBytes(value);
  return expected.every((byte, index) => byte === actual[index]);
}
export function parseAdvertisement0822(input: {
  handle: string;
  manufacturer: Uint8Array;
  rssi?: number;
}): DiscoveredDevice {
  const data = input.manufacturer;
  if (data.length !== 25 || data[0] !== 0x22 || data[1] !== 0x08 || data[2] !== 0x1c)
    throw new ApiError(503, "广播不符合当前0822完整厂商数据布局");
  const length = data[9];
  if (length < 4 || length > 15 || 10 + length > data.length)
    throw new ApiError(503, "0822广播型号长度无效");
  let model: string;
  try {
    model = new TextDecoder("utf-8", { fatal: true }).decode(data.slice(10, 10 + length));
  } catch {
    throw new ApiError(503, "0822广播型号编码无效");
  }
  const mac = bytesToHex(data.slice(3, 9));
  key0822(mac, model);
  return {
    handle: input.handle,
    mac,
    model,
    service: BLE_0822.service,
    ...(input.rssi !== undefined ? { rssi: input.rssi } : {}),
  };
}
export function encode0822(command: number, data: Uint8Array, key: Uint8Array, mtu?: number) {
  if (
    !Number.isInteger(command) ||
    command < 0 ||
    command > 255 ||
    data.length > 254 ||
    key.length !== 16
  )
    throw new ApiError(400, "0822帧字段超出协议范围");
  const frame = encodeFrame(command, data, key);
  if ((command >= 1 && command <= 10) || command === 0x8f) {
    const payload = new Uint8Array([command, ...data]);
    frame[frame.length - 1] = crcDevicePayload0822(payload);
    payload.fill(0);
  }
  if (mtu !== undefined && (!Number.isInteger(mtu) || mtu < 23 || frame.length > mtu - 3))
    throw new ApiError(503, "当前BLE MTU无法发送完整0822帧；长写规则尚未确认");
  return frame;
}
export function decode0822(frame: Uint8Array, key: Uint8Array): Frame0822 {
  if (key.length !== 16) throw new ApiError(400, "0822 Key长度无效");
  if (frame.length < 5 || frame[0] !== 0xa5 || frame[1] !== 0x5a || frame[2] !== frame.length - 4)
    throw new ApiError(0x63, "0822通知帧LEN或CRC校验失败");
  const plain = ctr(key, new Uint8Array(16)).decrypt(frame.slice(3, -1));
  try {
    const crc =
      (plain[0] >= 1 && plain[0] <= 10) || plain[0] === 0x8f
        ? crcDevicePayload0822(plain)
        : crc8(plain);
    if (crc !== frame[frame.length - 1]) throw new ApiError(0x63, "0822通知帧LEN或CRC校验失败");
    return { command: plain[0], data: plain.slice(1) };
  } finally {
    plain.fill(0);
  }
}
function crcDevicePayload0822(plain: Uint8Array) {
  let crc = 0;
  for (const byte of plain) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x80 ? ((crc << 1) ^ 0x31) & 0xff : (crc << 1) & 0xff;
  }
  return crc;
}
/** Firmware notifications use the observed non-reflected CRC-8/0x31 table. */
export function decodeDevice0822(frame: Uint8Array, key: Uint8Array): Frame0822 {
  if (key.length !== 16) throw new ApiError(400, "0822 Key长度无效");
  if (frame.length < 5 || frame[0] !== 0xa5 || frame[1] !== 0x5a || frame[2] !== frame.length - 4)
    throw new ApiError(0x63, "0822通知帧LEN或CRC校验失败");
  const plain = ctr(key, new Uint8Array(16)).decrypt(frame.slice(3, -1));
  try {
    const crc = crcDevicePayload0822(plain);
    if (crc !== frame[frame.length - 1]) throw new ApiError(0x63, "0822通知帧LEN或CRC校验失败");
    return { command: plain[0], data: plain.slice(1) };
  } finally {
    plain.fill(0);
  }
}
export function factoryReply0822(payload: Uint8Array, key: Uint8Array, mtu?: number) {
  // Firmware documentation leaves DATA unspecified. The caller must supply the confirmed payload.
  return encode0822(0x8f, payload, key, mtu);
}
export function expectedAck0822(command: number): number | undefined {
  return command === 0 ? 0x80 : command >= 1 && command <= 10 ? command + 0x80 : undefined;
}
export function classify0822(command: number) {
  if (command === 0x0f) return { kind: "challenge" as const };
  if (command >= 0x80 && command <= 0x8a) return { kind: "ack" as const };
  if (command >= 0xa0 && command <= 0xfe) {
    const group = command >>> 4,
      offset = command & 0x0f;
    const maximum = [4, 4, 7, 5, 5, 14][group - 10];
    const known =
      maximum !== undefined &&
      (offset <= maximum || (group >= 11 && group <= 14 && offset >= 8 && offset <= 11));
    if (known)
      return {
        kind: "stage" as const,
        status: command.toString(16).toUpperCase(),
        outcome:
          offset === 0
            ? ("complete" as const)
            : offset === 1
              ? ("progress" as const)
              : ("failure" as const),
      };
  }
  if (
    command === 0x63 ||
    command === 0x90 ||
    (command >= 0x70 && command <= 0x7f) ||
    (command >= 0x13 && command <= 0x1a)
  )
    return { kind: "failure" as const };
  return { kind: "other" as const };
}

/** Reassembles notification bytes, never adds application-level fragments to outgoing frames. */
export class FrameStream0822 {
  private buffer = new Uint8Array();
  push(chunk: Uint8Array): Uint8Array[] {
    if (this.buffer.length + chunk.length > 1024) {
      this.clear();
      throw new ApiError(0x63, "0822通知缓冲超出限制");
    }
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    this.buffer.fill(0);
    this.buffer = combined;
    const frames: Uint8Array[] = [];
    while (this.buffer.length >= 3) {
      if (this.buffer[0] !== 0xa5 || this.buffer[1] !== 0x5a) {
        this.buffer = this.buffer.slice(1);
        continue;
      }
      if (this.buffer[2] === 0) {
        this.clear();
        throw new ApiError(0x63, "0822通知LEN不能为0");
      }
      const length = this.buffer[2] + 4;
      if (this.buffer.length < length) break;
      frames.push(this.buffer.slice(0, length));
      const rest = this.buffer.slice(length);
      this.buffer.fill(0);
      this.buffer = rest;
    }
    return frames;
  }
  clear() {
    this.buffer.fill(0);
    this.buffer = new Uint8Array();
  }
}
